// 完全鑑定書（PDF）API: /api/pdf-report
// 購入者のみ生成・閲覧できる。生成済みの鑑定書は保存し、再訪時は再生成しない。
const { verifySession } = require('./_auth');
const { getMemberRecord, getPdfReport, savePdfReport, reservePdfPreview } = require('./_sheets');
const { fetchReportData } = require('./_astrology');
const { listGeminiModels } = require('./_gemini');
const { CHAPTER_IDS, generateChapters } = require('./_report');
const { normalizeLang } = require('./_terms');
const { geocodeBirthPlace } = require('./_geocode');
// 1リクエストで生成する章数の上限。全13章を一度に生成すると実行時間上限とGeminiのレート制限に触れるため、
// 残りは pending として返し、画面側が続けて要求する。
const CHAPTERS_PER_REQUEST = 4;
// 購入前の無料プレビュー（要約章のみ）。新しく作る件数だけを数え、保存済みの再表示は数えない。
const PREVIEW_LANGS = ['ja'];
const PREVIEW_DAILY_LIMIT = 100;
const PREVIEW_PER_EMAIL_LIMIT = 3;
const BODY_CHAPTERS = CHAPTER_IDS.filter((id) => id !== 'summary');

const sameBirth = (astro, dob, tob, city) => Boolean(astro?.birth) && astro.birth.dob === dob
  && String(astro.birth.tob || '12:00').slice(0, 5) === String(tob || '12:00').slice(0, 5)
  && String(astro.city || '').trim() === String(city || '').trim();

async function fetchAstro(dob, tob, city, lang) {
  const geo = await geocodeBirthPlace(city, lang);
  if (!geo) return { error: 'unknown_birthplace', status: 400 };
  try {
    const astro = await fetchReportData({ dob, tob, lat: geo.lat, lon: geo.lon, lang });
    astro.city = city;
    astro.geo_precision = geo.precision;
    if (geo.notice) astro.geo_notice = geo.notice;
    return { astro };
  } catch (err) {
    console.error('Prokerala report data failed:', err?.message);
    return { error: 'astrology_unavailable', status: 503 };
  }
}

const previewBody = (summary, astro) => ({
  summary,
  dasha: astro?.dasha?.current?.maha || null,
  cover: {
    dob: astro?.birth?.dob || '', tob: astro?.birth?.tob || '', city: astro?.city || '',
    lagna: astro?.ascendant?.sign || '', moon: astro?.moon?.sign || '', nakshatra: astro?.nakshatra || ''
  }
});

async function handlePreview(res, { email, member, dob, tob, city, lang }) {
  if (!PREVIEW_LANGS.includes(lang)) return res.status(404).json({ error: 'preview_unavailable' });
  if (member?.pdfPurchased) return res.status(200).json({ purchased: true });
  if (!dob || !city) return res.status(400).json({ error: 'missing_birth_data' });

  let stored = null;
  try {
    stored = await getPdfReport(email, lang);
  } catch (err) {
    console.error('Stored report lookup failed:', err?.message);
    return res.status(503).json({ error: 'storage_unavailable' });
  }
  const same = sameBirth(stored?.astro, dob, tob, city);
  // 本編の章がある行（返金・取消後など）は上書きしない
  if (stored?.summary && (same || BODY_CHAPTERS.some((id) => stored[id]))) {
    return res.status(200).json({ source: 'stored', ...previewBody(stored.summary, stored.astro) });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'gemini_not_configured' });

  let slot = null;
  try {
    slot = await reservePdfPreview(email, { dailyLimit: PREVIEW_DAILY_LIMIT, perEmailLimit: PREVIEW_PER_EMAIL_LIMIT });
  } catch (err) {
    console.error('Preview reservation failed:', err?.message);
    return res.status(503).json({ error: 'storage_unavailable' });
  }
  if (!slot.ok) return res.status(429).json({ error: slot.reason });

  let astro = same ? stored.astro : null;
  if (!astro) {
    const fetched = await fetchAstro(dob, tob, city, lang);
    if (fetched.error) return res.status(fetched.status).json({ error: fetched.error });
    astro = fetched.astro;
  }
  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : await listGeminiModels(apiKey);
  const { chapters } = await generateChapters(astro, ['summary'], apiKey, models, { lang });
  if (!chapters.summary) {
    // 星回りだけは残し、次に試した時に Prokerala を呼び直さない
    await savePdfReport(email, lang, { astro }).catch((err) => console.error('Report save failed:', err?.message));
    return res.status(503).json({ error: 'preview_failed' });
  }
  try {
    await savePdfReport(email, lang, { astro, summary: chapters.summary });
  } catch (err) {
    console.error('Report save failed:', err?.message);
  }
  return res.status(200).json({ source: 'generated', ...previewBody(chapters.summary, astro) });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, session, dob, tob, city, language, preview } = req.body || {};
  const lang = normalizeLang(language);
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
  if (preview) return handlePreview(res, { email, member, dob, tob: tob || '12:00', city, lang });
  if (!member || !member.pdfPurchased) return res.status(403).json({ error: 'not_purchased' });

  const finalDob = dob || member.dob;
  const finalTob = tob || member.tob || '12:00';
  const finalCity = city || member.city;
  if (!finalDob || finalDob === '1970-01-01' || !finalCity) {
    return res.status(400).json({ error: 'missing_birth_data' });
  }

  let stored = null;
  try {
    stored = await getPdfReport(email, lang);
  } catch (err) {
    console.error('Stored report lookup failed:', err?.message);
  }

  // 購入前の無料プレビューで別の出生データの要約だけが保存されていた場合は、購入時のデータで作り直す
  if (stored?.astro && !BODY_CHAPTERS.some((id) => stored[id]) && !sameBirth(stored.astro, finalDob, finalTob, finalCity)) stored = null;

  const missing = CHAPTER_IDS.filter((id) => !stored || !stored[id]);
  if (stored && stored.astro && !missing.length) {
    return res.status(200).json({
      source: 'stored',
      language: lang,
      updated_at: stored.updated_at,
      astro: stored.astro,
      chapters: Object.fromEntries(CHAPTER_IDS.map((id) => [id, stored[id]]))
    });
  }

  // 星回りは1冊につき1回だけ取得する（Prokerala のクレジット消費を抑える）
  let astro = stored?.astro || null;
  if (!astro) {
    const fetched = await fetchAstro(finalDob, finalTob, finalCity, lang);
    if (fetched.error) return res.status(fetched.status).json({ error: fetched.error });
    astro = fetched.astro;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'gemini_not_configured' });
  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : await listGeminiModels(apiKey);

  const batch = missing.slice(0, CHAPTERS_PER_REQUEST);
  const deferred = missing.slice(CHAPTERS_PER_REQUEST);
  const { chapters, failed } = await generateChapters(astro, batch, apiKey, models, { lang });

  try {
    await savePdfReport(email, lang, { astro, ...chapters });
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
    language: lang,
    astro,
    chapters: merged,
    // 生成できなかった章は、次回の閲覧時に自動で補完される
    pending: [...failed.map((f) => f.id), ...deferred],
    pending_reason: failed.length ? failed[0].reason : null
  });
};
