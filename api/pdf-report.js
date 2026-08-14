// 完全鑑定書（PDF）API: /api/pdf-report
// 購入者のみ生成・閲覧できる。生成済みの鑑定書は保存し、再訪時は再生成しない。
const { verifySession } = require('./_auth');
const { getMemberRecord, getPdfReport, savePdfReport } = require('./_sheets');
const { fetchReportData } = require('./_astrology');
const { listGeminiModels } = require('./_gemini');
const { CHAPTER_IDS, generateChapters } = require('./_report');

const TOKYO = { lat: 35.6762, lon: 139.6503 };
// 1リクエストで生成する章数の上限。全13章を一度に生成すると実行時間上限とGeminiのレート制限に触れるため、
// 残りは pending として返し、画面側が続けて要求する。
const CHAPTERS_PER_REQUEST = 4;

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function geocode(city) {
  if (!city) return TOKYO;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'LibertasJyotishApp/2.0 (info@libertas-jyotish.com)' }
    });
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.error('Geocoding failed, using Tokyo fallback:', err?.message);
  }
  return TOKYO;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, session, dob, tob, city } = req.body || {};
  if (!email || !session) return res.status(400).json({ error: 'missing_credentials' });

  // 購入状態はサーバ側（Sheets）のみを正とする。クライアントの申告は一切信用しない。
  if (!verifySession(email, session)) return res.status(401).json({ error: 'invalid_session' });

  let member = null;
  try {
    member = await getMemberRecord(email);
  } catch (err) {
    console.error('Member lookup failed:', err?.message);
    return res.status(503).json({ error: 'member_lookup_failed' });
  }
  if (!member || !member.pdfPurchased) return res.status(403).json({ error: 'not_purchased' });

  const finalDob = dob || member.dob;
  const finalTob = tob || member.tob || '12:00';
  const finalCity = city || member.city;
  if (!finalDob || finalDob === '1970-01-01' || !finalCity) {
    return res.status(400).json({ error: 'missing_birth_data' });
  }

  let stored = null;
  try {
    stored = await getPdfReport(email);
  } catch (err) {
    console.error('Stored report lookup failed:', err?.message);
  }

  const missing = CHAPTER_IDS.filter((id) => !stored || !stored[id]);
  if (stored && stored.astro && !missing.length) {
    return res.status(200).json({
      source: 'stored',
      updated_at: stored.updated_at,
      astro: stored.astro,
      chapters: Object.fromEntries(CHAPTER_IDS.map((id) => [id, stored[id]]))
    });
  }

  // 星回りは1冊につき1回だけ取得する（Prokerala のクレジット消費を抑える）
  let astro = stored?.astro || null;
  if (!astro) {
    try {
      const { lat, lon } = await geocode(finalCity);
      astro = await fetchReportData({ dob: finalDob, tob: finalTob, lat, lon });
      astro.city = finalCity;
    } catch (err) {
      console.error('Prokerala report data failed:', err?.message);
      return res.status(503).json({ error: 'astrology_unavailable' });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'gemini_not_configured' });
  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : await listGeminiModels(apiKey);

  const batch = missing.slice(0, CHAPTERS_PER_REQUEST);
  const deferred = missing.slice(CHAPTERS_PER_REQUEST);
  const { chapters, failed } = await generateChapters(astro, batch, apiKey, models);

  try {
    await savePdfReport(email, { astro, ...chapters });
  } catch (err) {
    console.error('Report save failed:', err?.message);
  }

  const merged = {};
  for (const id of CHAPTER_IDS) {
    const value = chapters[id] || stored?.[id];
    if (value) merged[id] = value;
  }

  return res.status(200).json({
    source: 'generated',
    astro,
    chapters: merged,
    // 生成できなかった章は、次回の閲覧時に自動で補完される
    pending: [...failed.map((f) => f.id), ...deferred],
    pending_reason: failed.length ? failed[0].reason : null
  });
};
