// 年間運勢・仕事・カルマ・相性の購入前無料プレビュー: POST /api/report-preview
// 本人確認セッションが必要。新しく作るのは 4 商品の合計で 1 日 10 件、1 メール 1 日 3 件まで（保存済みの再表示は数えない）。
const { verifySession } = require('./_auth');
const { reserveReportPreview, saveReportPreview, getReportPreview } = require('./_sheets');
const { fetchYearlyData, fetchCareerData, fetchKarmaData, fetchCompatData } = require('./_astrology');
const { listGeminiModels } = require('./_gemini');
const { generateChapters } = require('./_report');
const { normalizeLang } = require('./_terms');
const { geocodeBirthPlace } = require('./_geocode');
const { PREVIEW_PRODUCTS, PREVIEW_LANGS, previewDefs, previewKey, isFresh } = require('./_report-preview');

const DAILY_LIMIT = 10;
const PER_EMAIL_LIMIT = 3;
const RELATIONS = new Set(['romance', 'friend', 'business', 'general']);

const str = (v, max = 200) => String(v == null ? '' : v).trim().slice(0, max);
function person(body, suffix) {
  const dob = str(body[`dob${suffix}`], 10);
  const unknown = body[`tob_unknown${suffix}`] === true || body[`tob_unknown${suffix}`] === 'true';
  const tob = unknown ? '' : str(body[`tob${suffix}`], 5);
  const place = str(body[`place${suffix}`], 120);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(dob) && (unknown || /^([01]\d|2[0-3]):[0-5]\d$/.test(tob)) && Boolean(place);
  return { dob, tob, place, ok };
}

function personCover(p) {
  return {
    dob: p?.birth?.dob || '', tob: p?.birth?.tob || '', city: p?.city || '',
    lagna: p?.ascendant?.sign || '', moon: p?.moon?.sign || '', nakshatra: p?.nakshatra || ''
  };
}

function responseBody(product, relation, astro, summary, source) {
  const { defs, ids } = previewDefs(product, relation);
  const toc = ids.map((id) => defs.find((c) => c.id === id)?.title).filter(Boolean);
  const persons = product === 'compat' ? [personCover(astro.personA), personCover(astro.personB)] : [personCover(astro)];
  return { source, summary, toc, cover: { product, period: astro.period || null, persons } };
}

async function fetchAstro(product, a, b, relation, lang) {
  const geo = await geocodeBirthPlace(a.place, lang);
  if (!geo) return { error: 'unknown_birthplace' };
  const base = { dob: a.dob, tob: a.tob || '12:00', lat: geo.lat, lon: geo.lon, lang };
  if (product === 'compat') {
    const geoB = await geocodeBirthPlace(b.place, lang);
    if (!geoB) return { error: 'unknown_birthplace' };
    const astro = await fetchCompatData({ a: base, b: { dob: b.dob, tob: b.tob || '12:00', lat: geoB.lat, lon: geoB.lon }, lang, relation });
    astro.personA.city = a.place;
    astro.personB.city = b.place;
    return { astro };
  }
  const fetcher = product === 'yearly' ? fetchYearlyData : product === 'career' ? fetchCareerData : fetchKarmaData;
  const astro = await fetcher(base);
  astro.city = a.place;
  astro.geo_precision = geo.precision;
  if (geo.notice) astro.geo_notice = geo.notice;
  return { astro };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  res.setHeader('Cache-Control', 'no-store');
  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const email = str(body.email).toLowerCase();
  const product = str(body.product, 20);
  const lang = normalizeLang(body.lang || 'ja');
  if (!PREVIEW_PRODUCTS.has(product) || !PREVIEW_LANGS.has(lang)) return res.status(404).json({ error: 'preview_unavailable' });
  if (!email || !body.session || !verifySession(email, body.session)) return res.status(401).json({ error: 'invalid_session' });

  const a = person(body, '');
  const b = product === 'compat' ? person(body, '_b') : null;
  const relation = product === 'compat' ? (RELATIONS.has(str(body.relation, 20)) ? str(body.relation, 20) : 'general') : '';
  if (!a.ok || (b && !b.ok)) return res.status(400).json({ error: 'missing_birth_data' });
  const key = previewKey({ email, product, lang, relation, a, b });

  try {
    const stored = await getReportPreview(key);
    if (stored && isFresh(stored.createdAt)) return res.status(200).json(responseBody(product, relation, stored.astro, stored.summary, 'stored'));
  } catch (err) {
    console.error('Report preview lookup failed:', err?.message);
    return res.status(503).json({ error: 'storage_unavailable' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'gemini_not_configured' });
  let slot;
  try {
    slot = await reserveReportPreview(email, key, product, { dailyLimit: DAILY_LIMIT, perEmailLimit: PER_EMAIL_LIMIT });
  } catch (err) {
    console.error('Report preview reservation failed:', err?.message);
    return res.status(503).json({ error: 'storage_unavailable' });
  }
  if (!slot.ok) return res.status(429).json({ error: slot.reason });

  let astro;
  try {
    const fetched = await fetchAstro(product, a, b, relation, lang);
    if (fetched.error) return res.status(400).json({ error: fetched.error });
    astro = fetched.astro;
  } catch (err) {
    console.error('Prokerala preview data failed:', err?.message);
    return res.status(503).json({ error: 'astrology_unavailable' });
  }
  const { defs, voice = null, extraViolations = null } = previewDefs(product, relation);
  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : await listGeminiModels(apiKey);
  const { chapters } = await generateChapters(astro, ['summary'], apiKey, models, { lang, chapters: defs, product, voice, extraViolations });
  if (!chapters.summary) return res.status(503).json({ error: 'preview_failed' });
  await saveReportPreview(slot.row, { astro, summary: chapters.summary }).catch((err) => console.error('Report preview save failed:', err?.message));
  return res.status(200).json(responseBody(product, relation, astro, chapters.summary, 'generated'));
};
