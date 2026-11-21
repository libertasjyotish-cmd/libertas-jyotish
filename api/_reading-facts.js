// 毎日の鑑定で Gemini が書いた星の配置・周期・日付を、コードで計算した根拠一覧と照合する。
// 根拠一覧にない配置（別の星座・ハウス・逆行・ナクシャトラ・ティティ）や、作った周期名・年・日付を見つける。

const PLANETS_JA = ['ケートゥ', 'ラーフ', '土星', '木星', '火星', '金星', '水星', '太陽', '月'];
const PLANETS_EN = ['Ketu', 'Rahu', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Sun', 'Moon'];
const SIGNS_JA = ['牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座', '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座'];
const SIGN_LORD_JA = ['火星', '金星', '水星', '月', '太陽', '水星', '金星', '火星', '木星', '土星', '土星', '木星'];
const NAKSHATRAS_JA = [
  'アシュヴィニー', 'バラニー', 'クリッティカー', 'ローヒニー', 'ムリガシラス', 'アールドラー', 'プナルヴァス', 'プシャ',
  'アーシュレーシャ', 'マガー', 'プールヴァ・パールグニー', 'ウッタラ・パールグニー', 'ハスタ', 'チトラ', 'スヴァーティ',
  'ヴィシャーカー', 'アヌラーダ', 'ジェーシュタ', 'ムーラ', 'プールヴァ・アシャーダー', 'ウッタラ・アシャーダー', 'シュラヴァナ',
  'ダニシュター', 'シャタビシャ', 'プールヴァ・バードラパダー', 'ウッタラ・バードラパダー', 'レーヴァティー'
];
const TITHIS_JA = [
  'プラティパダ', 'ドヴィティーヤ', 'トリティーヤ', 'チャトゥルティー', 'パンチャミー', 'シャシュティー', 'サプタミー',
  'アシュタミー', 'ナヴァミー', 'ダシャミー', 'エーカーダシー', 'ドヴァーダシー', 'トラヨーダシー', 'チャトゥルダシー',
  'プールニマー', 'アマーヴァスヤー'
];

const alt = (list) => [...list].sort((a, b) => b.length - a.length).join('|');
const PL = `(${alt(PLANETS_JA)})(?![星座曜日末間初光])`;
const SG = `(${alt(SIGNS_JA)})`;
const NAK_RE = new RegExp(alt(NAKSHATRAS_JA), 'g');
const TITHI_RE = new RegExp(alt(TITHIS_JA), 'g');

const RE = {
  dashaJa: new RegExp(`(${alt(PLANETS_JA)})(?:の)?(大周期|小周期|マハー・?ダシャー|アンタル・?ダシャー|ダシャー|周期|期(?![待間限日末限]))`, 'g'),
  dashaEn: new RegExp(`\\b(${PLANETS_EN.join('|')})\\s+(Maha\\s?dasha|Mahadasha|Antar\\s?dasha|Antardasha|Bhukti|dasha|period)\\b`, 'gi'),
  year: /((?:19|20)\d\d)\s?年|\b((?:19|20)\d\d)\b/g,
  dateJa: /(\d{1,2})月(\d{1,2})日/g,
  dateSlash: /(?<![\d/])(\d{1,2})\/(\d{1,2})(?![\d/])/g,
  signOfPlanet: new RegExp(`${SG}(?:に(?:ある|いる|位置する|在住する|滞在する|入った|入る|移った))?の${PL}`, 'g'),
  planetInSign: new RegExp(`${PL}(?:が|は)(?:今日|現在|いま|本日)?、?${SG}`, 'g'),
  planetHouse: new RegExp(`${PL}(?:が|は|の)?、?(?:ラグナから(?:見て)?|出生の月から(?:見て)?|月から(?:見て)?)?(?:の)?第(\\d{1,2})ハウス`, 'g'),
  housePlanet: new RegExp(`第(\\d{1,2})ハウス(?:に|を|で|の)([^。、「」]{0,10}?)${PL}`, 'g'),
  retro: new RegExp(`${PL}(?:の|が|は)?逆行|逆行(?:中|している)の${PL}`, 'g')
};

// 今週の日別の月の位置は、その日付を書いた文の中でだけ根拠として認める
function bodies(facts, ja, text) {
  const week = (facts.weekMoons || []).filter((w) => {
    const [mo, da] = w.date.split('/');
    return new RegExp(`(?<![\\d/])${mo}/${da}(?![\\d/])|(?<!\\d)${mo}月${da}日`).test(text);
  });
  return [...facts.natal, ...facts.transit, ...week].filter((p) => p.ja === ja);
}

// facts: { natal, transit: [{ ja, sign, house, houseFromMoon, nakshatra, retro }], lords: {1..12: 惑星名},
//          tithi, dasha: { maha, antar: { ja, startYear, endYear }, next } | null, ingresses: [{ ja, month, day, nextSign, house }],
//          weekDates: [[month, day]], years: [数値] }
function findFabrications(text, facts, lang) {
  const out = [];
  const add = (quote, why) => out.push({ quote, why });
  const s = String(text || '');
  const d = facts.dasha;

  const checkDasha = (lord, kind, quote) => {
    if (!d) return add(quote, 'ダシャーのデータがないので、周期の名前は書けない');
    const isMaha = /大周期|マハー|Maha/i.test(kind) || kind === '期';
    const isAntar = /小周期|アンタル|Antar|Bhukti/i.test(kind);
    const ok = isMaha ? lord === d.maha.ja
      : isAntar ? lord === d.antar.ja || lord === d.next
      : lord === d.maha.ja || lord === d.antar.ja;
    if (!ok) add(quote, `正しくは${d.maha.ja}の大周期（${d.maha.startYear}〜${d.maha.endYear}年）の中の${d.antar.ja}の小周期（〜${d.antar.endYear}年）`);
  };

  const allowedYears = new Set(facts.years || []);
  for (const m of s.matchAll(RE.year)) {
    const y = Number(m[1] || m[2]);
    if (!allowedYears.has(y)) add(m[0], `根拠一覧にない年（使える年: ${[...allowedYears].join('・')}）`);
  }
  const allowedDates = [...(facts.weekDates || []), ...(facts.ingresses || []).map((x) => [x.month, x.day])];
  const dateOk = (mo, da) => allowedDates.some(([m2, d2]) => m2 === mo && Math.abs(d2 - da) <= 1);
  for (const re of [RE.dateJa, RE.dateSlash]) {
    for (const m of s.matchAll(re)) {
      if (!dateOk(Number(m[1]), Number(m[2]))) add(m[0], '根拠一覧（今週の日付・次の節目）にない日付');
    }
  }

  if (lang === 'ja') {
    for (const m of s.matchAll(RE.dashaJa)) {
      if (m[1] === '月' && /周期|期/.test(m[2]) && !/大周期|小周期|ダシャー/.test(m[2])) continue;
      checkDasha(m[1], m[2], m[0]);
    }
    const where = (ja) => bodies(facts, ja, s).map((p) => `${p.sign}・第${p.house}ハウス`).join('／') || 'なし';
    for (const m of s.matchAll(RE.signOfPlanet)) {
      const [, sign, ja] = m;
      const ok = bodies(facts, ja, s).some((p) => p.sign === sign) || facts.ingresses.some((x) => x.ja === ja && x.nextSign === sign);
      if (!ok) add(m[0], `根拠一覧では${ja}は ${where(ja)}`);
    }
    for (const m of s.matchAll(RE.planetInSign)) {
      const [, ja, sign] = m;
      const ok = bodies(facts, ja, s).some((p) => p.sign === sign) || facts.ingresses.some((x) => x.ja === ja && x.nextSign === sign);
      if (!ok) add(m[0], `根拠一覧では${ja}は ${where(ja)}`);
    }
    for (const m of s.matchAll(RE.planetHouse)) {
      const ja = m[1];
      const n = Number(m[2]);
      const ok = bodies(facts, ja, s).some((p) => p.house === n || p.houseFromMoon === n) || facts.ingresses.some((x) => x.ja === ja && x.house === n);
      if (!ok) add(m[0], `根拠一覧では${ja}は ${where(ja)}`);
    }
    for (const m of s.matchAll(RE.housePlanet)) {
      const n = Number(m[1]);
      const ja = m[3];
      const ok = /支配/.test(m[2])
        ? facts.lords[n] === ja
        : bodies(facts, ja, s).some((p) => p.house === n || p.houseFromMoon === n) || facts.ingresses.some((x) => x.ja === ja && x.house === n) || facts.lords[n] === ja;
      if (!ok) add(m[0], `根拠一覧では${ja}は ${where(ja)}、第${n}ハウスの支配星は${facts.lords[n] || '不明'}`);
    }
    for (const m of s.matchAll(RE.retro)) {
      const ja = m[1] || m[2];
      if (!bodies(facts, ja, s).some((p) => p.retro)) add(m[0], `根拠一覧では${ja}は逆行していない`);
    }
    const naks = new Set([...facts.natal, ...facts.transit].map((p) => p.nakshatra).filter(Boolean));
    for (const m of s.matchAll(NAK_RE)) {
      if (!naks.has(m[0])) add(m[0], `根拠一覧にないナクシャトラ（使えるのは ${[...naks].join('・')}）`);
    }
    for (const m of s.matchAll(TITHI_RE)) {
      if (!facts.tithi || !facts.tithi.includes(m[0])) add(m[0], `今日のティティは ${facts.tithi || '不明'}`);
    }
  } else {
    for (const m of s.matchAll(RE.dashaEn)) {
      const ja = PLANETS_JA[PLANETS_EN.findIndex((e) => e.toLowerCase() === m[1].toLowerCase())];
      checkDasha(ja, m[2], m[0]);
    }
  }
  const seen = new Set();
  return out.filter((x) => (seen.has(x.quote) ? false : seen.add(x.quote)));
}

const SKIP_KEYS = new Set(['moonSign', 'sunSign', 'nakshatra', 'generated_by', 'gemini_meta', 'planets']);

// 鑑定 JSON の文章項目をすべて照合し、項目名つきで返す
function auditReading(json, facts, lang) {
  const found = [];
  const walk = (v, path) => {
    if (typeof v === 'string') {
      for (const sentence of v.match(/[^。．.!?！？؟\n]+[。．.!?！？؟]*/g) || []) {
        for (const f of findFabrications(sentence, facts, lang)) found.push({ ...f, path });
      }
    } else if (v && typeof v === 'object') {
      for (const [k, child] of Object.entries(v)) if (!SKIP_KEYS.has(k)) walk(child, path ? `${path}.${k}` : k);
    }
  };
  walk(json, '');
  return found;
}

// 照合で引っかかった文だけを取り除き、取り除いて空になった項目のパスを返す。
function stripFabricated(json, found) {
  const emptied = [];
  const SENT = /[^。．.!?！？؟\n]+[。．.!?！？؟]*\n?/g;
  for (const { path, quote } of found) {
    const keys = path.split('.');
    let obj = json;
    for (const k of keys.slice(0, -1)) obj = obj && obj[k];
    const last = keys[keys.length - 1];
    if (!obj || typeof obj[last] !== 'string') continue;
    const kept = (obj[last].match(SENT) || []).filter((x) => !x.includes(quote)).join('');
    obj[last] = kept.trim();
    if (!obj[last] && !emptied.includes(path)) emptied.push(path);
  }
  return emptied;
}

module.exports = { findFabrications, auditReading, stripFabricated, SIGNS_JA, SIGN_LORD_JA };
