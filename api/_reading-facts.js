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
  year: /((?:19|20)\d\d)\s?年|\b((?:19|20)\d\d)\b/g,
  dateJa: /(\d{1,2})月(\d{1,2})日/g,
  dateSlash: /(?<![\d/])(\d{1,2})\/(\d{1,2})(?![\d/])/g,
  signOfPlanet: new RegExp(`${SG}(?:に(?:ある|いる|位置する|在住する|滞在する|入った|入る|移った))?の${PL}`, 'g'),
  planetInSign: new RegExp(`${PL}(?:が|は)(?:今日|現在|いま|本日)?、?${SG}`, 'g'),
  planetHouse: new RegExp(`${PL}(?:が|は|の)?、?(?:ラグナから(?:見て)?|出生の月から(?:見て)?|月から(?:見て)?)?(?:の)?第(\\d{1,2})ハウス`, 'g'),
  housePlanet: new RegExp(`第(\\d{1,2})ハウス(?:に|を|で|の)([^。、「」]{0,10}?)${PL}`, 'g'),
  retro: new RegExp(`${PL}(?:の|が|は)?逆行|逆行(?:中|している)の${PL}`, 'g')
};

// ---- 日本語以外：語彙ファイルの星座・天体・ナクシャトラ名と、各言語のハウス・逆行・周期の書き方で照合する ----
const TERMS = {};
const termsOf = (lang) => {
  if (!(lang in TERMS)) { try { TERMS[lang] = require(`./_texts/terms/${lang}`); } catch (e) { TERMS[lang] = null; } }
  return TERMS[lang];
};
const TITHIS_EN = [
  ['Pratipada', 'Prathama'], ['Dwitiya', 'Dvitiya'], ['Tritiya', 'Trtiya'], ['Chaturthi'], ['Panchami'], ['Shashthi', 'Shashti', 'Sashti'], ['Saptami'],
  ['Ashtami'], ['Navami'], ['Dashami', 'Dasami'], ['Ekadashi', 'Ekadasi'], ['Dwadashi', 'Dvadashi', 'Dwadasi'], ['Trayodashi', 'Trayodasi'],
  ['Chaturdashi', 'Chaturdasi'], ['Purnima', 'Pournami', 'Poornima'], ['Amavasya', 'Amavasi']
];
const ORD_WORDS = {
  en: [['first'], ['second'], ['third'], ['fourth'], ['fifth'], ['sixth'], ['seventh'], ['eighth'], ['ninth'], ['tenth'], ['eleventh'], ['twelfth']],
  es: [['primera'], ['segunda'], ['tercera'], ['cuarta'], ['quinta'], ['sexta'], ['séptima'], ['octava'], ['novena'], ['décima'], ['undécima', 'onceava', 'decimoprimera'], ['duodécima', 'doceava', 'decimosegunda']],
  pt: [['primeira'], ['segunda'], ['terceira'], ['quarta'], ['quinta'], ['sexta'], ['sétima'], ['oitava'], ['nona'], ['décima'], ['décima primeira'], ['décima segunda']],
  fr: [['première'], ['deuxième', 'seconde'], ['troisième'], ['quatrième'], ['cinquième'], ['sixième'], ['septième'], ['huitième'], ['neuvième'], ['dixième'], ['onzième'], ['douzième']],
  de: [['erste[nmrs]?'], ['zweite[nmrs]?'], ['dritte[nmrs]?'], ['vierte[nmrs]?'], ['fünfte[nmrs]?'], ['sechste[nmrs]?'], ['siebte[nmrs]?'], ['achte[nmrs]?'], ['neunte[nmrs]?'], ['zehnte[nmrs]?'], ['elfte[nmrs]?'], ['zwölfte[nmrs]?']],
  id: [['pertama', 'satu'], ['kedua', 'dua'], ['ketiga', 'tiga'], ['keempat', 'empat'], ['kelima', 'lima'], ['keenam', 'enam'], ['ketujuh', 'tujuh'], ['kedelapan', 'delapan'], ['kesembilan', 'sembilan'], ['kesepuluh', 'sepuluh'], ['kesebelas', 'sebelas'], ['kedua belas', 'dua belas']],
  ar: [['الأول'], ['الثاني'], ['الثالث'], ['الرابع'], ['الخامس'], ['السادس'], ['السابع'], ['الثامن'], ['التاسع'], ['العاشر'], ['الحادي عشر'], ['الثاني عشر']]
};
// ハウスの書き方（数字か序数語のどちらかを捕まえる）
const HOUSE_RE = {
  en: (w) => `(?:(\\d{1,2})(?:st|nd|rd|th)?|(${w}))\\s+house|\\bhouse\\s+(\\d{1,2})\\b`,
  es: (w) => `\\bcasa\\s+(?:n[úu]mero\\s+)?(\\d{1,2})|(?:(\\d{1,2})\\.?\\s?[ªºa°]?|(${w}))\\s+casa`,
  pt: (w) => `\\bcasa\\s+(?:n[úu]mero\\s+)?(\\d{1,2})|(?:(\\d{1,2})\\.?\\s?[ªºa°]?|(${w}))\\s+casa`,
  fr: (w) => `\\bmaison\\s+(\\d{1,2})|(?:(\\d{1,2})\\s?(?:e|ème|ᵉ|eme)|(${w}))\\s+maison`,
  de: (w) => `(?:(\\d{1,2})\\.\\s?|(${w})\\s+)Haus|\\bHaus\\s+(\\d{1,2})\\b`,
  id: (w) => `\\brumah\\s+(?:ke-?\\s?)?(?:(\\d{1,2})|(${w}))(?![\\p{L}\\d])`,
  ar: (w) => `(?:البيت|المنزل)\\s+(?:رقم\\s+)?(?:(\\d{1,2})|(${w}))`
};
const RETRO_RE = {
  en: 'retrograde|\\bRx\\b', es: 'retr[óo]grad[oa]s?|retrogradaci[óo]n', pt: 'retr[óo]grad[oa]s?|retrograda[çc][ãa]o',
  fr: 'r[ée]trogrades?|r[ée]trogradation', de: 'r[üu]ckl[äa]ufig\\p{L}*|retrograd\\p{L}*', id: 'retrograd\\p{L}*|bergerak mundur', ar: 'متراجع|تراجع|رجعي|الرجوع'
};
const PERIOD_RE = {
  en: { w: 'period|cycle', of: 'of' }, es: { w: 'periodo|período|ciclo', of: 'de(?:l)?' }, pt: { w: 'período|ciclo', of: 'de|do|da' },
  fr: { w: 'période|cycle', of: "de|du|d'" }, de: { w: 'Periode|Phase|Zyklus', of: 'des|der|von' }, id: { w: 'periode|masa|siklus', of: '' }, ar: { w: 'فترة|دورة|مرحلة', of: '' }
};
const MAJOR = /ماها|maha|major|mayor|maior|majeur|principal|gro(?:ß|ss)|haupt|utama|besar|الكبر|الرئيس/i;
const MINOR = /أنتار|antar|bhukti|minor|menor|mineur|unter|kecil|sub|secund|second|الصغر|الفرعي/i;
const LOCALE = { en: 'en-US', es: 'es-ES', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE', id: 'id-ID', ar: 'ar' };

const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stripArticle = (x) => x.replace(/^(?:the|el|la|le|o|a|der|die|das)\s+/i, '');
const LEX = {};
function lexicon(lang) {
  if (LEX[lang]) return LEX[lang];
  const local = termsOf(lang) || {};
  const en = termsOf('en') || {};
  const planets = new Map();
  for (const t of [en, local]) for (const [k, v] of Object.entries(t.PLANET || {})) { planets.set(stripArticle(v), k); planets.set(v, k); }
  for (const k of PLANETS_EN) planets.set(k, k);
  planets.set('Lagna', 'Ascendant');
  const signs = new Map();
  const naks = new Map();
  for (const t of [en, local]) {
    for (const [ja, v] of Object.entries(t.SIGN || {})) signs.set(v, ja);
    for (const [ja, v] of Object.entries(t.NAKSHATRA || {})) if (NAKSHATRAS_JA.includes(ja)) naks.set(v, ja);
  }
  const months = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2026, i, 15)).toLocaleDateString(LOCALE[lang] || 'en-US', { month: 'long', timeZone: 'UTC' }));
  const B = lang === 'ar' ? ['', ''] : ['(?<![\\p{L}])', '(?![\\p{L}])'];
  const words = (xs) => `${B[0]}(${[...xs].sort((a, b) => b.length - a.length).map(esc).join('|')})${B[1]}`;
  const ord = ORD_WORDS[lang] || ORD_WORDS.en;
  const ordAlt = ord.flat().sort((a, b) => b.length - a.length).join('|');
  const P = PERIOD_RE[lang] || PERIOD_RE.en;
  const pl = words(planets.keys());
  const monthAlt = months.map(esc).join('|');
  LEX[lang] = {
    planets, signs, naks, months,
    planetRe: new RegExp(pl, 'gu'),
    signRe: new RegExp(words(signs.keys()), 'gu'),
    nakRe: new RegExp(words(naks.keys()), 'gu'),
    tithiRe: new RegExp(`(?<![\\p{L}])(${TITHIS_EN.flat().join('|')})(?![\\p{L}])`, 'giu'),
    houseRe: new RegExp((HOUSE_RE[lang] || HOUSE_RE.en)(ordAlt), 'giu'),
    ordNum: (w) => ord.findIndex((alts) => alts.some((a) => new RegExp(`^(?:${a})$`, 'iu').test(w))) + 1,
    retroRe: new RegExp(RETRO_RE[lang] || RETRO_RE.en, 'giu'),
    // 周期名：dasha/bhukti と、「period of Saturn」「Saturn period」のように天体名に直接付いた周期の語
    dashaRe: new RegExp(`(?:maha|antar)?[\\s-]?(?:dasha|dasa|daśā)|ماهاداشا|أنتارداشا|داشا|bhukti|(?:${P.w})\\s+(?:(?:${P.of || '(?!)'})\\s*)?(?=${pl})|(?<=${pl}(?:'s)?[\\s-]+)(?:${P.w})`, 'giu'),
    dateRe: new RegExp(`(\\d{1,2})(?:\\.|º|er|ᵉʳ)?\\s*(?:de\\s+)?(${monthAlt})|(${monthAlt})\\s+(\\d{1,2})(?!\\d)`, 'giu')
  };
  return LEX[lang];
}

const toAsciiDigits = (x) => x.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0));

// 文中の日付（11/23・11月23日・各言語の「23 de noviembre」「November 23」など）
function datesIn(s, lang) {
  const out = [];
  for (const m of s.matchAll(RE.dateSlash)) out.push({ mo: Number(m[1]), da: Number(m[2]), m });
  for (const m of s.matchAll(RE.dateJa)) out.push({ mo: Number(m[1]), da: Number(m[2]), m });
  if (lang && lang !== 'ja') {
    const L = lexicon(lang);
    for (const m of s.matchAll(L.dateRe)) {
      const name = (m[2] || m[3]).toLowerCase();
      out.push({ mo: L.months.findIndex((x) => x.toLowerCase() === name) + 1, da: Number(m[1] || m[4]), m });
    }
  }
  return out;
}

// 位置 [a, b) に最も近い天体名（max 字以内）
function nearestPlanet(hits, a, b, max = 40) {
  let best = null;
  for (const h of hits) {
    const dist = h.end <= a ? a - h.end : h.start >= b ? h.start - b : 0;
    if (dist <= max && (!best || dist < best.dist)) best = { ...h, dist };
  }
  return best;
}

function findIntl(s, orig, facts, lang, add, checkDasha) {
  const L = lexicon(lang);
  const JA = (key) => (key === 'Ascendant' ? 'Ascendant' : PLANETS_JA[PLANETS_EN.indexOf(key)]);
  const hits = [...s.matchAll(L.planetRe)].map((m) => ({ key: L.planets.get(m[1]), start: m.index, end: m.index + m[0].length }));
  const span = (h, m) => { const a = Math.min(h.start, m.index); const b = Math.max(h.end, m.index + m[0].length); return [orig.slice(a, b), a]; };
  const flag = (h, m, why) => { const [q, i] = span(h, m); add(q, why, i); };
  const where = (ja) => bodies(facts, ja, s, lang).map((p) => `${p.sign}・第${p.house}ハウス`).join('／') || 'なし';
  for (const m of s.matchAll(L.signRe)) {
    const h = nearestPlanet(hits, m.index, m.index + m[0].length);
    if (!h) continue;
    const sign = L.signs.get(m[1]);
    const ja = JA(h.key);
    const ok = ja === 'Ascendant' ? facts.asc === sign
      : bodies(facts, ja, s, lang).some((p) => p.sign === sign) || facts.ingresses.some((x) => x.ja === ja && x.nextSign === sign);
    if (!ok) flag(h, m, ja === 'Ascendant' ? `根拠一覧ではラグナは ${facts.asc}` : `根拠一覧では${ja}は ${where(ja)}`);
  }
  for (const m of s.matchAll(L.houseRe)) {
    const num = m.slice(1).find((x) => x && /^\d+$/.test(x));
    const word = m.slice(1).find((x) => x && !/^\d+$/.test(x));
    const n = num ? Number(num) : L.ordNum(word);
    if (!n) continue;
    const h = nearestPlanet(hits, m.index, m.index + m[0].length);
    if (!h || h.key === 'Ascendant') continue;
    const ja = JA(h.key);
    const ok = bodies(facts, ja, s, lang).some((p) => p.house === n || p.houseFromMoon === n) || facts.ingresses.some((x) => x.ja === ja && x.house === n) || facts.lords[n] === ja;
    if (!ok) flag(h, m, `根拠一覧では${ja}は ${where(ja)}、第${n}ハウスの支配星は${facts.lords[n] || '不明'}`);
  }
  for (const m of s.matchAll(L.retroRe)) {
    const h = nearestPlanet(hits, m.index, m.index + m[0].length, 30);
    if (!h || h.key === 'Ascendant') continue;
    const ja = JA(h.key);
    if (!bodies(facts, ja, s, lang).some((p) => p.retro)) flag(h, m, `根拠一覧では${ja}は逆行していない`);
  }
  for (const m of s.matchAll(L.dashaRe)) {
    const h = nearestPlanet(hits, m.index, m.index + m[0].length, 25);
    if (!h || h.key === 'Ascendant') continue;
    const around = s.slice(Math.max(0, m.index - 20), m.index + m[0].length + 20);
    const kind = MAJOR.test(m[0]) ? 'Maha' : MINOR.test(m[0]) ? 'Antar' : MAJOR.test(around) ? 'Maha' : MINOR.test(around) ? 'Antar' : 'dasha';
    const [q, i] = span(h, m);
    checkDasha(JA(h.key), kind, q, i);
  }
  const naks = new Set([...facts.natal, ...facts.transit].map((p) => p.nakshatra).filter(Boolean));
  for (const m of s.matchAll(L.nakRe)) {
    if (!naks.has(L.naks.get(m[1]))) add(m[0], `根拠一覧にないナクシャトラ（使えるのは ${[...naks].join('・')}）`, m.index);
  }
  for (const m of s.matchAll(L.tithiRe)) {
    const i = TITHIS_EN.findIndex((alts) => alts.some((a) => a.toLowerCase() === m[1].toLowerCase()));
    if (!facts.tithi || !facts.tithi.includes(TITHIS_JA[i])) add(m[0], `今日のティティは ${facts.tithi || '不明'}`, m.index);
  }
}

// 今週の日別の月の位置は、その日付を書いた文の中でだけ根拠として認める
function bodies(facts, ja, text, lang = 'ja') {
  const dates = datesIn(text, lang);
  const week = (facts.weekMoons || []).filter((w) => {
    const [mo, da] = w.date.split('/').map(Number);
    return dates.some((x) => x.mo === mo && x.da === da);
  });
  return [...facts.natal, ...facts.transit, ...week].filter((p) => p.ja === ja);
}

// facts: { natal, transit: [{ ja, sign, house, houseFromMoon, nakshatra, retro }], lords: {1..12: 惑星名},
//          tithi, dasha: { maha, antar: { ja, startYear, endYear }, next } | null, ingresses: [{ ja, month, day, nextSign, house }],
//          weekDates: [[month, day]], years: [数値] }
function findFabrications(text, facts, lang) {
  const out = [];
  const orig = String(text || '');
  const s = toAsciiDigits(orig);
  const add = (quote, why, at) => out.push({ quote: at === undefined ? quote : orig.slice(at, at + quote.length), why });
  const d = facts.dasha;

  const checkDasha = (lord, kind, quote, at) => {
    if (!d) return add(quote, 'ダシャーのデータがないので、周期の名前は書けない', at);
    const isMaha = /大周期|マハー|Maha/i.test(kind) || kind === '期';
    const isAntar = /小周期|アンタル|Antar|Bhukti/i.test(kind);
    const ok = isMaha ? lord === d.maha.ja
      : isAntar ? lord === d.antar.ja || lord === d.next
      : lord === d.maha.ja || lord === d.antar.ja;
    if (!ok) add(quote, `正しくは${d.maha.ja}の大周期（${d.maha.startYear}〜${d.maha.endYear}年）の中の${d.antar.ja}の小周期（〜${d.antar.endYear}年）`, at);
  };

  const allowedYears = new Set(facts.years || []);
  for (const m of s.matchAll(RE.year)) {
    const y = Number(m[1] || m[2]);
    if (!allowedYears.has(y)) add(m[0], `根拠一覧にない年（使える年: ${[...allowedYears].join('・')}）`, m.index);
  }
  const allowedDates = [...(facts.weekDates || []), ...(facts.ingresses || []).map((x) => [x.month, x.day])];
  const dateOk = (mo, da) => allowedDates.some(([m2, d2]) => m2 === mo && Math.abs(d2 - da) <= 1);
  for (const { mo, da, m } of datesIn(s, lang)) {
    if (!dateOk(mo, da)) add(m[0], '根拠一覧（今週の日付・次の節目）にない日付', m.index);
  }

  if (lang === 'ja') {
    for (const m of s.matchAll(RE.dashaJa)) {
      if (m[1] === '月' && /周期|期/.test(m[2]) && !/大周期|小周期|ダシャー/.test(m[2])) continue;
      checkDasha(m[1], m[2], m[0]);
    }
    const where = (ja) => bodies(facts, ja, s, lang).map((p) => `${p.sign}・第${p.house}ハウス`).join('／') || 'なし';
    for (const m of s.matchAll(RE.signOfPlanet)) {
      const [, sign, ja] = m;
      const ok = bodies(facts, ja, s, lang).some((p) => p.sign === sign) || facts.ingresses.some((x) => x.ja === ja && x.nextSign === sign);
      if (!ok) add(m[0], `根拠一覧では${ja}は ${where(ja)}`);
    }
    for (const m of s.matchAll(RE.planetInSign)) {
      const [, ja, sign] = m;
      const ok = bodies(facts, ja, s, lang).some((p) => p.sign === sign) || facts.ingresses.some((x) => x.ja === ja && x.nextSign === sign);
      if (!ok) add(m[0], `根拠一覧では${ja}は ${where(ja)}`);
    }
    for (const m of s.matchAll(RE.planetHouse)) {
      const ja = m[1];
      const n = Number(m[2]);
      const ok = bodies(facts, ja, s, lang).some((p) => p.house === n || p.houseFromMoon === n) || facts.ingresses.some((x) => x.ja === ja && x.house === n);
      if (!ok) add(m[0], `根拠一覧では${ja}は ${where(ja)}`);
    }
    for (const m of s.matchAll(RE.housePlanet)) {
      const n = Number(m[1]);
      const ja = m[3];
      const ok = /支配/.test(m[2])
        ? facts.lords[n] === ja
        : bodies(facts, ja, s, lang).some((p) => p.house === n || p.houseFromMoon === n) || facts.ingresses.some((x) => x.ja === ja && x.house === n) || facts.lords[n] === ja;
      if (!ok) add(m[0], `根拠一覧では${ja}は ${where(ja)}、第${n}ハウスの支配星は${facts.lords[n] || '不明'}`);
    }
    for (const m of s.matchAll(RE.retro)) {
      const ja = m[1] || m[2];
      if (!bodies(facts, ja, s, lang).some((p) => p.retro)) add(m[0], `根拠一覧では${ja}は逆行していない`);
    }
    const naks = new Set([...facts.natal, ...facts.transit].map((p) => p.nakshatra).filter(Boolean));
    for (const m of s.matchAll(NAK_RE)) {
      if (!naks.has(m[0])) add(m[0], `根拠一覧にないナクシャトラ（使えるのは ${[...naks].join('・')}）`);
    }
    for (const m of s.matchAll(TITHI_RE)) {
      if (!facts.tithi || !facts.tithi.includes(m[0])) add(m[0], `今日のティティは ${facts.tithi || '不明'}`);
    }
  } else {
    findIntl(s, orig, facts, lang, add, checkDasha);
  }
  const seen = new Set();
  return out.filter((x) => (seen.has(x.quote) ? false : seen.add(x.quote)));
}

// 文の区切り。「5. Haus」「3. Dezember」のような1〜2桁の数字の後の点では区切らない
const SENTENCE = /(?:[^。．.!?！？؟\n]|(?<=(?<!\d)\d{1,2})\.(?=\s?(?:\p{Ll}|Haus|Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)))+[。．.!?！？؟]*\s*/gu;

const SKIP_KEYS = new Set(['moonSign', 'sunSign', 'nakshatra', 'generated_by', 'gemini_meta', 'planets']);

// 鑑定 JSON の文章項目をすべて照合し、項目名つきで返す
function auditReading(json, facts, lang) {
  const found = [];
  const walk = (v, path) => {
    if (typeof v === 'string') {
      for (const sentence of v.match(SENTENCE) || []) {
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
  for (const { path, quote } of found) {
    const keys = path.split('.');
    let obj = json;
    for (const k of keys.slice(0, -1)) obj = obj && obj[k];
    const last = keys[keys.length - 1];
    if (!obj || typeof obj[last] !== 'string') continue;
    const kept = (obj[last].match(SENTENCE) || []).filter((x) => !x.includes(quote)).join('');
    obj[last] = kept.trim();
    if (!obj[last] && !emptied.includes(path)) emptied.push(path);
  }
  return emptied;
}

module.exports = { findFabrications, auditReading, stripFabricated, SIGNS_JA, SIGN_LORD_JA };
