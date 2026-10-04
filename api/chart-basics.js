// 単機能ツール（/<lang>/tools/moon-sign・nakshatra・dasha）が使う軽量API。
// 生年月日・出生時刻・出生地から、月星座・ナクシャトラ・現在のダシャー期だけを返す。
// 計算は鑑定書と同じ _astrology.js（Prokerala）を再利用し、AIは使わない。
// Prokerala の呼び出し回数を抑えるため、同じ出生データの結果は一定時間メモリに残す。
const { fetchChartBasics } = require('./_astrology');
const { normalizeLang } = require('./_terms');
const { geocodeBirthPlace } = require('./_geocode');

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map();

function cached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function store(key, data) {
  cache.set(key, { at: Date.now(), data });
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (err) {
      return {};
    }
  }
  return req.body;
}

function normalizeDob(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (date.getUTCMonth() + 1 !== Number(mo) || date.getUTCDate() !== Number(d)) return null;
  if (Number(y) < 1900 || Number(y) > new Date().getUTCFullYear()) return null;
  return `${y}-${mo}-${d}`;
}

function normalizeTob(value) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value || '').trim());
  if (!m) return '12:00';
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return '12:00';
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  res.setHeader('Cache-Control', 'no-store');

  const body = readBody(req);
  const lang = normalizeLang(body.lang || 'ja');
  const dob = normalizeDob(body.dob);
  const tob = normalizeTob(body.tob);
  const place = String(body.place || '').trim().slice(0, 120);

  if (!dob) return res.status(400).json({ error: 'invalid_date' });
  if (!place) return res.status(400).json({ error: 'invalid_place' });

  const key = `${dob}|${tob}|${place.toLowerCase()}|${lang}`;
  const hit = cached(key);
  if (hit) return res.status(200).json(hit);

  try {
    const geo = await geocodeBirthPlace(place, lang);
    if (!geo) return res.status(422).json({ error: 'place_not_found' });

    const basics = await fetchChartBasics({ dob, tob, lat: geo.lat, lon: geo.lon, lang });
    const payload = {
      ...basics,
      geo: { precision: geo.precision, notice: geo.notice || null },
      timeProvided: Boolean(body.tob)
    };
    store(key, payload);
    return res.status(200).json(payload);
  } catch (err) {
    console.error('chart-basics failed:', err && err.message);
    return res.status(503).json({ error: 'unavailable' });
  }
};
