// 星の出来事（逆行・順行・入宮・高揚・減衰・会合・日食・月食）を暦から計算し、日本語・英語の決まった文に組み立てる。
// Gemini は使わない。計算と文は SNS 動画（Jyotish_SNS_ShortMovie の sky-events / event-calendar / event-template-ja）と同じ。
const { Body, Ecliptic, GeoVector, SearchLunarEclipse, NextLunarEclipse, SearchGlobalSolarEclipse, NextGlobalSolarEclipse } = require('astronomy-engine');

const DAY = 86400000;
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const SIGN_JA = { Aries: '牡羊座', Taurus: '牡牛座', Gemini: '双子座', Cancer: '蟹座', Leo: '獅子座', Virgo: '乙女座', Libra: '天秤座', Scorpio: '蠍座', Sagittarius: '射手座', Capricorn: '山羊座', Aquarius: '水瓶座', Pisces: '魚座' };
const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
const normalize = (deg) => ((deg % 360) + 360) % 360;
const centuries = (d) => (d.getTime() - J2000) / (36525 * DAY);
// ラヒリのアヤナムシャ（J2000 の値＋歳差）
const ayanamsa = (d) => { const t = centuries(d); return 23.85322 + (5028.796195 * t + 1.1054348 * t * t) / 3600; };
const siderealLongitude = (body, d) => normalize(Ecliptic(GeoVector(body, d, true)).elon - ayanamsa(d));
// ラーフは平均交点
const siderealNode = (d) => { const t = centuries(d); return normalize(125.0445479 - 1934.1362891 * t + 0.0020754 * t * t - ayanamsa(d)); };
const signOf = (lon) => SIGNS[Math.floor(normalize(lon) / 30) % 12];

const BODIES = [['Mars', Body.Mars], ['Mercury', Body.Mercury], ['Jupiter', Body.Jupiter], ['Venus', Body.Venus], ['Saturn', Body.Saturn]];
const EXALT = { Mars: 'Capricorn', Mercury: 'Virgo', Jupiter: 'Cancer', Venus: 'Pisces', Saturn: 'Libra' };
const DEBIL = { Mars: 'Cancer', Mercury: 'Pisces', Jupiter: 'Capricorn', Venus: 'Virgo', Saturn: 'Aries' };
const CONJUNCTION_PAIRS = [['Jupiter', 'Saturn'], ['Jupiter', 'Rahu'], ['Jupiter', 'Ketu'], ['Saturn', 'Rahu'], ['Saturn', 'Ketu']];
const diff = (a, b) => ((a - b + 540) % 360) - 180;

function scanSkyEvents(start, end) {
  const out = [];
  const prev = {};
  let prevNode = -1;
  for (let t = start.getTime(); t < end.getTime(); t += DAY) {
    const d = new Date(t);
    const lons = {};
    for (const [name, body] of BODIES) {
      const lon = siderealLongitude(body, d);
      lons[name] = lon;
      const p = prev[name];
      if (p) {
        const dir = Math.sign(diff(lon, p.lon));
        if (signOf(lon) !== signOf(p.lon)) {
          const sign = signOf(lon);
          out.push({ date: d, type: 'ingress', planet: name, sign });
          if (EXALT[name] === sign) out.push({ date: d, type: 'exalted', planet: name, sign });
          if (DEBIL[name] === sign) out.push({ date: d, type: 'debilitated', planet: name, sign });
        }
        if (p.dir !== 0 && dir !== 0 && dir !== p.dir) out.push({ date: d, type: dir < 0 ? 'retrograde' : 'direct', planet: name, sign: signOf(lon) });
        prev[name] = { lon, dir: dir || p.dir };
      } else prev[name] = { lon, dir: 0 };
    }
    const rahu = siderealNode(d);
    if (prevNode >= 0 && signOf(rahu) !== signOf(prevNode)) out.push({ date: d, type: 'ingress', planet: 'Rahu', sign: signOf(rahu) });
    prevNode = rahu;
    lons.Rahu = rahu;
    lons.Ketu = (rahu + 180) % 360;
    for (const [a, b] of CONJUNCTION_PAIRS) {
      const key = `__${a}-${b}`;
      const gap = Math.abs(diff(lons[a], lons[b]));
      if (prev[key] && prev[key].lon > 1 && gap <= 1) out.push({ date: d, type: 'conjunction', planet: `${a}-${b}`, sign: signOf(lons[a]) });
      prev[key] = { lon: gap, dir: 0 };
    }
  }
  for (let e = SearchLunarEclipse(start); e.peak.date < end; e = NextLunarEclipse(e.peak)) {
    if (e.kind !== 'penumbral') out.push({ date: e.peak.date, type: `lunar-eclipse-${e.kind}`, planet: 'Moon', sign: signOf(siderealLongitude(Body.Moon, e.peak.date)) });
  }
  for (let e = SearchGlobalSolarEclipse(start); e.peak.date < end; e = NextGlobalSolarEclipse(e.peak)) {
    out.push({ date: e.peak.date, type: `solar-eclipse-${e.kind}`, planet: 'Sun', sign: signOf(siderealLongitude(Body.Sun, e.peak.date)) });
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// 1回の滞在の長さ（逆行で同じ点を行き来しても1回と数える）
const stayGap = (planet) => (planet.includes('-') ? 1 : planet === 'Saturn' ? 3 : /Jupiter|Rahu/.test(planet) ? 1.5 : 0.5) * 365.25 * DAY;

function isReentry(event, pool) {
  if (!['ingress', 'exalted', 'debilitated', 'conjunction'].includes(event.type)) return false;
  const t = event.date.getTime();
  return pool.some((w) => w.type === event.type && w.planet === event.planet && w.sign === event.sign && w.date.getTime() < t && w.date.getTime() >= t - stayGap(event.planet));
}

function sameEventNeighbours(event, pool) {
  const gap = stayGap(event.planet);
  const same = pool.filter((w) => w.type === event.type && w.planet === event.planet && w.sign === event.sign);
  return {
    prev: same.filter((w) => w.date.getTime() < event.date.getTime() - gap).pop(),
    next: same.find((w) => w.date.getTime() > event.date.getTime() + gap)
  };
}

// 前回・次回を探せるよう前後60年を1度だけ計算して持っておく
let cache;
function poolFor(date) {
  const y = date.getUTCFullYear();
  if (!cache || cache.year !== y) cache = { year: y, pool: scanSkyEvents(new Date(Date.UTC(y - 60, 0, 1)), new Date(Date.UTC(y + 60, 0, 1))) };
  return cache.pool;
}

const PLANET = { Mercury: '水星', Venus: '金星', Mars: '火星', Jupiter: '木星', Saturn: '土星', Rahu: 'ラーフ', Ketu: 'ケートゥ' };
const AREA = {
  Mercury: '言葉や連絡、考えごと', Venus: '愛情やお金、楽しみ', Mars: 'やる気や行動', Jupiter: '成長や学び、幸運',
  Saturn: '責任や努力、時間をかけて築くもの', Rahu: '強い望みや新しい挑戦', Ketu: '手放すことや心の探究'
};
const RETRO_Q = {
  Mercury: '大事な連絡を、送る前に読み返していますか？', Venus: '人やお金との付き合い方を、見直したくなっていませんか？',
  Mars: '焦って動いて、空回りしていませんか？', Jupiter: '今の目標がこのままでいいか、迷っていませんか？', Saturn: '責任を、重く感じていませんか？'
};
const RETRO_DO = {
  Mercury: '送る前に読み返し、約束を確かめ直す', Venus: '本当に大切な人やお金の使い方を選び直す', Mars: '勢いで始めず、やり方を整え直す',
  Jupiter: '計画を見直し、伸ばす方向を選び直す', Saturn: '引き受けたことを見直し、土台を補強する'
};
const INGRESS_Q = { Jupiter: '新しく伸ばしたいことが、見えてきていませんか？', Saturn: '腰を据えて取り組みたいことが、ありませんか？', Rahu: '急に惹かれ始めたものが、ありませんか？' };
const FAST_EXALT_Q = { Mercury: '考えが、すっきりまとまっていませんか？', Venus: '人やお金との縁を、心地よく感じていませんか？', Mars: 'やる気が、まっすぐ形になっていませんか？' };
const FAST_DEBIL_Q = { Mercury: '考えがまとまらず、迷っていませんか？', Venus: '人やお金のことで、物足りなさを感じていませんか？', Mars: 'やる気が、空回りしていませんか？' };
const FAST_DEBIL_DO = { Mercury: '結論を急がず確かめ直す', Venus: '本当に心が満たされるものを選び直す', Mars: '勢いより段取りを整える' };
const STAY = { Jupiter: '約1年', Saturn: '約2年半', Rahu: '約1年半' };
const ECLIPSE_KIND = { total: '皆既', annular: '金環', partial: '部分' };

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];
// 日本の暦日
function jaDate(d) {
  const j = new Date(d.getTime() + 9 * 3600000);
  return { y: j.getUTCFullYear(), label: `${j.getUTCMonth() + 1}月${j.getUTCDate()}日`, weekday: WEEKDAY_JA[j.getUTCDay()] };
}

function rarity(event, around) {
  const y = jaDate(event.date).y;
  const prev = around.prev ? jaDate(around.prev.date).y : undefined;
  const next = around.next ? jaDate(around.next.date).y : undefined;
  const since = prev !== undefined && y - prev >= 8 ? `${y - prev}年ぶりに、` : '';
  const parts = [prev !== undefined ? `前回は${prev}年` : '', next !== undefined ? `次は${next}年` : ''].filter(Boolean);
  return { since, line: parts.length ? `${parts.join('、')}です。` : '' };
}

// { hook, body }。決まった文の無い種類は null（送らない）
function buildEventTemplateJa(event, around) {
  const { label } = jaDate(event.date);
  const { since, line } = rarity(event, around);
  const p = PLANET[event.planet];
  const s = SIGN_JA[event.sign] || event.sign;
  const eclipse = /^(solar|lunar)-eclipse-(\w+)$/.exec(event.type);
  if (eclipse) {
    const kind = ECLIPSE_KIND[eclipse[2]];
    if (!kind) return null;
    const solar = eclipse[1] === 'solar';
    const name = `${kind}${solar ? '日食' : '月食'}`;
    return {
      hook: `${label}、${since}${s}で${name}が起きます。${solar ? '続けてきたやり方を、手放したくなっていませんか？' : '心の中で、区切りをつけたいことはありませんか？'}`,
      body: `インド占星術では、食は${solar ? '太陽' : '月'}が影の星ラーフ・ケートゥと重なる時です。${solar ? '目標や生き方' : '気持ちや人との関係'}に区切りがつき、古いやり方を手放す節目になります。${line}`
    };
  }
  const pair = event.type === 'conjunction' ? event.planet.split('-') : [];
  if (pair.length === 2) {
    const [a, b] = pair;
    if (!PLANET[a] || !PLANET[b]) return null;
    return {
      hook: `${label}、${since}${PLANET[a]}と${PLANET[b]}が${s}で重なります。大きな流れが変わる気配を、感じていませんか？`,
      body: `${PLANET[a]}は${AREA[a]}、${PLANET[b]}は${AREA[b]}の星です。二つが同じ星座で重なる時は、その分野の流れが切り替わる節目になります。${line}`
    };
  }
  if (!p) return null;
  switch (event.type) {
    case 'retrograde':
      if (!RETRO_Q[event.planet]) return null;
      return {
        hook: `${label}、${since}${p}が${s}で逆行に入ります。${RETRO_Q[event.planet]}`,
        body: `${p}は${AREA[event.planet]}の星です。逆行は止まる時ではなく、${RETRO_DO[event.planet]}ことで前より良くする再強化期間です。${line}`
      };
    case 'direct':
      if (!RETRO_Q[event.planet]) return null;
      return {
        hook: `${label}、${p}が${s}で順行に戻ります。止まっていたことが、動き出していませんか？`,
        body: `逆行の間に見直してきた${AREA[event.planet]}が、ここから少しずつ前に進み始めます。${line}`
      };
    case 'ingress':
      if (!INGRESS_Q[event.planet]) return null;
      return {
        hook: `${label}、${since}${p}が${s}に入ります。${INGRESS_Q[event.planet]}`,
        body: `${p}は${AREA[event.planet]}の星で、ここから${STAY[event.planet]}${s}にとどまります。月星座から数えたハウスによって、効く分野が変わります。${line}`
      };
    case 'exalted':
      if (FAST_EXALT_Q[event.planet]) {
        return {
          hook: `${label}、${since}${p}が、最も力を発揮する${s}に入ります。${FAST_EXALT_Q[event.planet]}`,
          body: `インド占星術では、${s}は${p}が高揚する星座です。${AREA[event.planet]}の星が、この星座にいる間、いちばん素直に力を届けます。${line}`
        };
      }
      if (!['Jupiter', 'Saturn'].includes(event.planet)) return null;
      return {
        hook: `${label}、${since}${p}が、最も力を発揮する${s}に入ります。${INGRESS_Q[event.planet]}`,
        body: `インド占星術では、${s}は${p}が高揚する星座です。${AREA[event.planet]}の星が、いちばん素直に力を届ける配置が${STAY[event.planet]}続きます。${line}`
      };
    case 'debilitated':
      if (event.planet === 'Saturn') {
        return {
          hook: `${label}、${since}土星が、力を出しにくい${s}に入ります。責任を、重く感じていませんか？`,
          body: `インド占星術では、${s}は土星が減衰する星座です。焦らず土台を固め直すと、前より強い形をつくれる再強化期間です。${line}`
        };
      }
      if (event.planet === 'Jupiter') {
        return {
          hook: `${label}、${since}木星が、力を出しにくい${s}に入ります。伸び悩みを感じていませんか？`,
          body: `インド占星術では、${s}は木星が減衰する星座です。大きく広げるより、地道な積み重ねを選び直すと、確かな成長につながる時期になります。${line}`
        };
      }
      if (FAST_DEBIL_Q[event.planet]) {
        return {
          hook: `${label}、${since}${p}が、力を出しにくい${s}に入ります。${FAST_DEBIL_Q[event.planet]}`,
          body: `インド占星術では、${s}は${p}が減衰する星座です。この間は、${FAST_DEBIL_DO[event.planet]}再強化期間です。${line}`
        };
      }
      return null;
    default:
      return null;
  }
}

// 英語（SNS 動画の event-template-intl.ts の EN と同じ文）。日付は UTC の暦日
const EN = {
  area: { Mercury: 'words and thinking', Venus: 'love and money', Mars: 'drive and action', Jupiter: 'growth and luck', Saturn: 'duty and effort', Rahu: 'strong desires', Ketu: 'letting go' },
  retroQ: {
    Mercury: 'are you rereading important messages before sending them?', Venus: 'do you want to rethink how you handle people and money?',
    Mars: 'are you rushing and getting nowhere?', Jupiter: 'are you unsure your goal is the right one?', Saturn: 'do your responsibilities feel heavy?'
  },
  retroDo: {
    Mercury: 'reread before sending and confirm promises', Venus: 'choose again the people and spending that matter', Mars: 'set up your method before you start',
    Jupiter: 'review your plans and choose where to grow', Saturn: 'review what you took on and reinforce it'
  },
  ingressQ: { Jupiter: 'can you see something new you want to grow?', Saturn: 'is there something you want to commit to for years?', Rahu: 'are you suddenly drawn to something new?' },
  stay: { Jupiter: 'about a year', Saturn: 'about two and a half years', Rahu: 'about a year and a half' },
  exaltQ: {
    Mercury: 'are your thoughts falling clearly into place?', Venus: 'do your ties with people and money feel easy?', Mars: 'is your drive turning straight into results?',
    Jupiter: 'can you see something new you want to grow?', Saturn: 'is there something you want to commit to for years?'
  },
  debilQ: {
    Mercury: 'are you struggling to make up your mind?', Venus: 'do people or money leave you feeling unfulfilled?', Mars: 'is your drive spinning its wheels?',
    Jupiter: 'do you feel your growth has stalled?', Saturn: 'do your responsibilities feel heavy?'
  },
  debilDo: {
    Mercury: 'check again instead of rushing to conclusions', Venus: 'choose again what truly fulfils you', Mars: 'plan the steps instead of pushing',
    Jupiter: 'choose steady progress over big expansion', Saturn: 'rebuild your foundations without hurrying'
  }
};
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const STATIONS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
const SLOW = ['Jupiter', 'Saturn', 'Rahu'];

function enDate(d, opts = { month: 'long', day: 'numeric' }) {
  return new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(d);
}

function buildEventTemplateEn(event, around) {
  const d = enDate(event.date);
  const y = event.date.getUTCFullYear();
  const prev = around.prev ? around.prev.date.getUTCFullYear() : undefined;
  const next = around.next ? around.next.date.getUTCFullYear() : undefined;
  const since = prev !== undefined && y - prev >= 8 ? `for the first time in ${y - prev} years, ` : '';
  const parts = [prev !== undefined ? `Last time: ${prev}` : '', next !== undefined ? `next: ${next}` : ''].filter(Boolean);
  const line = parts.length ? `${cap(parts.join(', '))}.` : '';
  const s = event.sign;
  const done = ([hook, body]) => ({ hook, body: line ? `${body} ${line}` : body });
  const eclipse = /^(solar|lunar)-eclipse-(\w+)$/.exec(event.type);
  if (eclipse) {
    const kind = eclipse[2];
    if (!['total', 'annular', 'partial'].includes(kind)) return null;
    const solar = eclipse[1] === 'solar';
    return done([
      `On ${d}, ${since}a ${kind} ${solar ? 'solar' : 'lunar'} eclipse falls in ${s}. ${solar ? 'Do you want to let go of an old way of doing things?' : 'Is there something in your heart you want to close?'}`,
      `In Vedic astrology, an eclipse is when the ${solar ? 'Sun' : 'Moon'} meets Rahu and Ketu. It closes a chapter of ${solar ? 'your goals' : 'your feelings and relationships'}.`
    ]);
  }
  if (event.type === 'conjunction') {
    const [a, b] = event.planet.split('-');
    if (!EN.area[a] || !EN.area[b]) return null;
    return done([
      `On ${d}, ${since}${a} and ${b} meet in ${s}. Do you sense a big change of direction coming?`,
      `${a} rules ${EN.area[a]}, ${b} rules ${EN.area[b]}. When they meet in one sign, the flow of those areas turns.`
    ]);
  }
  const p = event.planet;
  if (!EN.area[p]) return null;
  switch (event.type) {
    case 'retrograde':
      if (!STATIONS.includes(p)) return null;
      return done([`On ${d}, ${since}${p} turns retrograde in ${s}. ${cap(EN.retroQ[p])}`, `${p} rules ${EN.area[p]}. A retrograde is not a standstill but a time to rebuild: ${EN.retroDo[p]}.`]);
    case 'direct':
      if (!STATIONS.includes(p)) return null;
      return done([`On ${d}, ${p} turns direct in ${s}. Is something that was stuck starting to move?`, `The ${EN.area[p]} you reviewed during the retrograde now move forward, step by step. Restart what you had put on hold.`]);
    case 'ingress':
      if (!SLOW.includes(p)) return null;
      return done([`On ${d}, ${since}${p} enters ${s}. ${cap(EN.ingressQ[p])}`, `${p} rules ${EN.area[p]} and stays in ${s} for ${EN.stay[p]}. Where it acts depends on the house counted from your Moon sign.`]);
    case 'exalted': {
      if (!STATIONS.includes(p)) return null;
      const stay = SLOW.includes(p) ? EN.stay[p] : '';
      return done([`On ${d}, ${since}${p} enters ${s}, the sign where it is strongest. ${cap(EN.exaltQ[p])}`, `In Vedic astrology, ${p} is exalted in ${s}. ${stay ? `For ${stay}` : 'While it is there'}, the planet of ${EN.area[p]} gives its best.`]);
    }
    case 'debilitated':
      if (!STATIONS.includes(p)) return null;
      return done([`On ${d}, ${since}${p} enters ${s}, where it struggles to show its strength. ${cap(EN.debilQ[p])}`, `In Vedic astrology, ${p} is debilitated in ${s}. While it is there, ${EN.debilDo[p]}, and you come back stronger.`]);
    default:
      return null;
  }
}

// 水星・金星・火星のただの入宮は数週間ごとに起きるので出来事にしない
const FAST = new Set(['Mercury', 'Venus', 'Mars']);
const inScope = (e) => !(FAST.has(e.planet) && e.type === 'ingress');

// [start, end) の出来事（決まった文があるものだけ、1回1件）
function calendarEvents(start, end, pool = poolFor(start)) {
  const events = pool.filter((e) => e.date >= start && e.date < end && inScope(e));
  // 高揚・減衰は同じ日の入宮でもあるので、珍しいほうの1回だけにする
  const shadowed = (e) => e.type === 'ingress' && events.some((o) => o !== e && o.planet === e.planet && o.sign === e.sign && o.date.getTime() === e.date.getTime());
  return events.filter((e) => !shadowed(e) && !isReentry(e, pool) && buildEventTemplateJa(e, {}) !== null);
}

// { hook, body }（lang は ja / en）
function eventScript(lang, event) {
  const around = sameEventNeighbours(event, poolFor(event.date));
  return lang === 'en' ? buildEventTemplateEn(event, around) : buildEventTemplateJa(event, around);
}

module.exports = { DAY, PLANET, SIGN_JA, ECLIPSE_KIND, jaDate, enDate, calendarEvents, eventScript, scanSkyEvents };
