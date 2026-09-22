// 「今日の空」ウィジェット用の共通データ（全訪問者共通・ログイン不要）。
// 現在時刻を 1 時間単位に丸め、ウッジャイン（インド標準子午線）を基準に Prokerala の
// planet-position を 1 回だけ取得して 1 時間キャッシュする（同一インスタンス内＋CDN）。
// 月相・ティティ・ナクシャトラは太陽・月の黄経から機械的に求め、生成AIは使わない。
const { getAccessToken, callEndpoint, NAKSHATRA_ORDER } = require('./_astrology');
const { createTerms, normalizeLang } = require('./_terms');
const { todayText, nakshatraSymbols, NAKSHATRA_DEITY } = require('./_texts/today');

const UJJAIN = '23.1765,75.7885';
const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
// 1 日あたりの平均移動量（度）。星座内の度数がこれ未満なら「今日、星座を移動」とみなす。
const DAILY_MOTION = { Sun: 1, Moon: 13.2, Mars: 0.55, Mercury: 1.4, Jupiter: 0.09, Venus: 1.2, Saturn: 0.035, Rahu: 0.053, Ketu: 0.053 };
const WEEKDAY_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
// 月から見た星座の位置（チャンドラ・バラ）: 1,3,6,7,10,11 番目が追い風、それ以外の中で 4,8,12 番目は感情が動きやすい
const MOON_GOOD = [0, 2, 5, 6, 9, 10];
const MOON_SENSITIVE = [3, 7, 11];

const norm = (x) => ((x % 360) + 360) % 360;
let cache = { key: '', data: null };

function roundedHourIso() {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  return d;
}

function normalizePositions(data) {
  const d = data?.data || {};
  const raw = d.planet_position || d.planets || d.planet_positions || [];
  const map = {};
  for (const p of Array.isArray(raw) ? raw : []) {
    if (!PLANETS.includes(p.name) || typeof p.longitude !== 'number') continue;
    map[p.name] = { longitude: norm(p.longitude), retro: !!p.is_retrograde };
  }
  return PLANETS.every((n) => map[n]) ? map : null;
}

async function fetchPositions(at) {
  const token = await getAccessToken();
  const data = await callEndpoint(token, 'astrology/planet-position', {
    datetime: at.toISOString().replace(/\.\d{3}Z$/, '+00:00'),
    coordinates: UJJAIN,
    ayanamsa: '1'
  });
  return normalizePositions(data);
}

function buildPayload(pos, at, lang) {
  const t = todayText(lang);
  const terms = createTerms(lang);
  const sun = pos.Sun.longitude;
  const moon = pos.Moon.longitude;
  const elong = norm(moon - sun); // 0=新月, 180=満月
  const tithiIndex = Math.floor(elong / 12); // 0..29
  const waxing = tithiIndex < 15;
  const inPaksha = tithiIndex % 15; // 0..14
  const tithiName = inPaksha === 14 ? (waxing ? t.purnima : t.amavasya) : t.tithiNames[inPaksha];
  const nakIndex = Math.floor(moon / (360 / 27));
  const nakJa = NAKSHATRA_ORDER[nakIndex];
  const moonSign = Math.floor(moon / 30);
  const weekday = at.getUTCDay(); // ウッジャイン基準の曜日は UTC+5:30 で判定
  const localDay = new Date(at.getTime() + 5.5 * 3600 * 1000).getUTCDay();

  const planets = PLANETS.map((name) => {
    const lon = pos[name].longitude;
    const sign = Math.floor(lon / 30);
    const degree = lon - sign * 30;
    return {
      key: name,
      name: t.planets[name],
      sign,
      signName: t.signs[sign],
      degree: Math.round(degree * 10) / 10,
      retro: pos[name].retro,
      entered: degree < DAILY_MOTION[name]
    };
  });

  const goodSigns = MOON_GOOD.map((h) => (moonSign - h + 12) % 12).map((s) => t.signs[s]);
  const sensitiveSigns = MOON_SENSITIVE.map((h) => (moonSign - h + 12) % 12).map((s) => t.signs[s]);
  const join = (arr) => arr.join(lang === 'ja' ? '・' : ', ');

  return {
    at: at.toISOString(),
    text: {
      title: t.title, subtitle: t.subtitle, moon: t.moon, tithi: t.tithi, nakshatra: t.nakshatra, deity: t.deity,
      symbol: t.symbol, vara: t.vara, chart: t.chart, retro: t.retro, entered: t.entered, updated: t.updated, source: t.source
    },
    moonPhase: {
      elongation: Math.round(elong * 10) / 10,
      illumination: Math.round((1 - Math.cos(elong * Math.PI / 180)) / 2 * 1000) / 1000,
      waxing,
      tithiNumber: inPaksha + 1,
      tithiName,
      paksha: waxing ? t.shukla : t.krishna
    },
    nakshatra: {
      index: nakIndex + 1,
      name: terms.nakshatra(nakJa),
      deity: NAKSHATRA_DEITY[nakIndex],
      symbol: nakshatraSymbols(lang)[nakIndex]
    },
    vara: { weekday: t.weekday[localDay], lord: t.planets[WEEKDAY_LORD[localDay]], lordKey: WEEKDAY_LORD[localDay], utcWeekday: weekday },
    moonSign: { index: moonSign, name: t.signs[moonSign], text: t.moonIn.replace('{sign}', t.signs[moonSign]) },
    moonNote: {
      good: t.moonGood.replace('{signs}', join(goodSigns)),
      sensitive: t.moonNote.replace('{signs}', join(sensitiveSigns)),
      goodSigns: MOON_GOOD.map((h) => (moonSign - h + 12) % 12),
      sensitiveSigns: MOON_SENSITIVE.map((h) => (moonSign - h + 12) % 12)
    },
    signs: t.signs,
    planets
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const lang = normalizeLang(req.query?.lang || 'ja');
  const at = roundedHourIso();
  const key = at.toISOString();
  try {
    if (cache.key !== key || !cache.data) {
      const pos = await fetchPositions(at);
      if (!pos) throw new Error('prokerala_unavailable');
      cache = { key, data: pos };
    }
    res.setHeader('Cache-Control', 'public, s-maxage=3600, max-age=600, stale-while-revalidate=1800');
    return res.status(200).json(buildPayload(cache.data, at, lang));
  } catch (err) {
    console.error('today failed:', err.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'unavailable' });
  }
};
