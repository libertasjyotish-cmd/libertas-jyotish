// 完全鑑定書（PDF）用の Prokerala 取得・正規化レイヤー（CommonJS）
// 鑑定書に載せる数値・期間・図はすべてここで確定させ、生成AIには一切計算させない。
const {
  SIGN_LORD, SIGN_ELEMENT, PLANET_JA, PLANET_DOMAIN, DIGNITY_SCORE, DIGNITY_JA,
  LIFE_STONE, PLANET_COLOR, PLANET_DIRECTION, WORK_STYLE, RHYTHM_BY_ELEMENT,
  HOUSE_DOMAIN, DASHA_SEASON, EXALTATION, DEBILITATION, OWN_SIGNS, MOOLATRIKONA,
  NATURAL_FRIENDS, NATURAL_ENEMIES, YOGA_JA, SADE_SATI_PHASE_JA
} = require('./_dictionaries');
const { createTerms } = require('./_terms');

const API_BASE = 'https://api.prokerala.com';

const SIGN_JA = {
  Aries: '牡羊座', Taurus: '牡牛座', Gemini: '双子座', Cancer: '蟹座',
  Leo: '獅子座', Virgo: '乙女座', Libra: '天秤座', Scorpio: '蠍座',
  Sagittarius: '射手座', Capricorn: '山羊座', Aquarius: '水瓶座', Pisces: '魚座'
};

const SIGN_SA_JA = {
  Mesha: '牡羊座', Vrishabha: '牡牛座', Vrushabha: '牡牛座', Mithuna: '双子座',
  Karka: '蟹座', Kataka: '蟹座', Karkata: '蟹座', Simha: '獅子座', Kanya: '乙女座',
  Tula: '天秤座', Thula: '天秤座', Vrischika: '蠍座', Vrishchika: '蠍座',
  Dhanu: '射手座', Dhanus: '射手座', Makara: '山羊座', Kumbha: '水瓶座', Meena: '魚座'
};

const NAKSHATRA_JA = {
  ashwini: 'アシュヴィニー', ashvini: 'アシュヴィニー', bharani: 'バラニー',
  krittika: 'クリッティカー', kritika: 'クリッティカー', rohini: 'ローヒニー',
  mrigashira: 'ムリガシラス', mrigashirsha: 'ムリガシラス', mrighashira: 'ムリガシラス',
  ardra: 'アールドラー', punarvasu: 'プナルヴァス', pushya: 'プシャ',
  ashlesha: 'アーシュレーシャ', aslesha: 'アーシュレーシャ', magha: 'マガー',
  purvaphalguni: 'プールヴァ・パールグニー', uttaraphalguni: 'ウッタラ・パールグニー',
  hasta: 'ハスタ', chitra: 'チトラ', swati: 'スヴァーティ', swathi: 'スヴァーティ',
  vishakha: 'ヴィシャーカー', visakha: 'ヴィシャーカー', anuradha: 'アヌラーダ',
  jyeshta: 'ジェーシュタ', jyeshtha: 'ジェーシュタ', mula: 'ムーラ', moola: 'ムーラ',
  purvaashadha: 'プールヴァ・アシャーダー', uttaraashadha: 'ウッタラ・アシャーダー',
  shravana: 'シュラヴァナ', dhanishta: 'ダニシュター', dhanishtha: 'ダニシュター',
  shatabhisha: 'シャタビシャ', satabhisha: 'シャタビシャ',
  purvabhadrapada: 'プールヴァ・バードラパダー', uttarabhadrapada: 'ウッタラ・バードラパダー',
  revati: 'レーヴァティー', abhijit: 'アビジット'
};

// 黄経から機械的に決まる27ナクシャトラ（各13°20′）
const NAKSHATRA_ORDER = [
  'アシュヴィニー', 'バラニー', 'クリッティカー', 'ローヒニー', 'ムリガシラス', 'アールドラー',
  'プナルヴァス', 'プシャ', 'アーシュレーシャ', 'マガー', 'プールヴァ・パールグニー',
  'ウッタラ・パールグニー', 'ハスタ', 'チトラ', 'スヴァーティ', 'ヴィシャーカー', 'アヌラーダ',
  'ジェーシュタ', 'ムーラ', 'プールヴァ・アシャーダー', 'ウッタラ・アシャーダー', 'シュラヴァナ',
  'ダニシュター', 'シャタビシャ', 'プールヴァ・バードラパダー', 'ウッタラ・バードラパダー', 'レーヴァティー'
];

const SIGN_ORDER = [
  '牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座',
  '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座'
];

function toJapaneseSign(sign) {
  if (!sign) return '';
  return SIGN_JA[sign] || SIGN_SA_JA[sign] || sign;
}

function toJapaneseNakshatra(name) {
  if (!name) return '';
  const key = String(name).toLowerCase().replace(/[^a-z]/g, '');
  return NAKSHATRA_JA[key] || name;
}

function toJstIsoString(date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.toISOString().slice(0, 19)}+09:00`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getAccessToken() {
  const clientId = process.env.PROKERALA_CLIENT_ID;
  const clientSecret = process.env.PROKERALA_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('prokerala_not_configured');

  const res = await fetchWithTimeout(`${API_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })
  }, 10000);
  if (!res.ok) throw new Error(`prokerala_token_${res.status}`);
  const data = await res.json();
  return data.access_token;
}

// 失敗したエンドポイントがあっても鑑定書全体を落とさない（該当章だけ省略する）
async function callEndpoint(token, path, params, asText = false) {
  const url = `${API_BASE}/v2/${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${token}` } }, 20000);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Prokerala ${path} failed ${res.status}: ${body.slice(0, 200)}`);
    return null;
  }
  return asText ? await res.text() : await res.json();
}

function nakshatraFromLongitude(longitude) {
  if (typeof longitude !== 'number') return '';
  const index = Math.floor((((longitude % 360) + 360) % 360) / (360 / 27));
  return NAKSHATRA_ORDER[index] || '';
}

// 計算に使うキー（signKey / nakshatraKey）は日本語表記のまま固定し、表示用の値だけを言語別に解決する
function normalizePlanets(planetPosition, terms) {
  const d = planetPosition?.data || {};
  const raw = d.planet_position || d.planets || d.planet_positions || [];
  if (!Array.isArray(raw)) return [];

  const base = raw.map((p) => {
    const signKey = toJapaneseSign(p.rasi?.name || p.sign?.name || p.sign || p.zodiac || '');
    const nakshatraKey = p.nakshatra?.name
      ? toJapaneseNakshatra(p.nakshatra.name)
      : nakshatraFromLongitude(p.longitude);
    return {
      key: p.name,
      name: terms.planet(p.name, PLANET_JA[p.name] || p.name),
      signKey,
      sign: terms.sign(signKey),
      nakshatraKey,
      nakshatra: terms.nakshatra(nakshatraKey),
      degree: typeof p.degree === 'number' ? Math.round(p.degree * 100) / 100 : null,
      retrograde: Boolean(p.is_retrograde)
    };
  });

  // Prokerala の position は「牡羊座から数えたサイン番号」なので、ラグナ基準のハウスに変換する
  const ascIndex = SIGN_ORDER.indexOf(base.find((p) => p.key === 'Ascendant')?.signKey || '');
  return base.map((p) => {
    const signIndex = SIGN_ORDER.indexOf(p.signKey);
    const house = ascIndex >= 0 && signIndex >= 0 ? ((signIndex - ascIndex + 12) % 12) + 1 : null;
    return { ...p, house };
  });
}

// 品位は古典の高揚・減衰・自室・定座・友敵の表からコード側で確定させる（生成AIには判定させない）
function dignityOf(planetKey, sign) {
  if (!sign) return '';
  if (EXALTATION[planetKey] === sign) return 'exalted';
  if (DEBILITATION[planetKey] === sign) return 'debilitated';
  if (MOOLATRIKONA[planetKey] === sign) return 'moolatrikona';
  if ((OWN_SIGNS[planetKey] || []).includes(sign)) return 'own';
  const lord = SIGN_LORD[sign];
  if (!lord || !NATURAL_FRIENDS[planetKey]) return 'neutral';
  if (NATURAL_FRIENDS[planetKey].includes(lord)) return 'friend';
  if ((NATURAL_ENEMIES[planetKey] || []).includes(lord)) return 'enemy';
  return 'neutral';
}

function normalizeDignity(planets, terms) {
  return planets
    .filter((p) => p.key !== 'Ascendant')
    .map((p) => {
      const dignity = dignityOf(p.key, p.signKey);
      const score = DIGNITY_SCORE[dignity] ?? 50;
      return {
        key: p.key,
        name: p.name,
        sign: p.sign,
        house: p.house,
        dignity: terms.dignity(dignity, DIGNITY_JA[dignity] || '中立'),
        nakshatra: p.nakshatra,
        retrograde: p.retrograde,
        score,
        domain: PLANET_DOMAIN[p.key] ? terms.planetDomain(p.key, PLANET_DOMAIN[p.key]) : null
      };
    })
    .sort((a, b) => b.score - a.score);
}

const YOGA_GROUP_JA = {
  'major yogas': '主要なヨーガ',
  'chandra yogas': '月のヨーガ',
  'soorya yogas': '太陽のヨーガ',
  'surya yogas': '太陽のヨーガ',
  'nabhasa yogas': 'ナバサ・ヨーガ',
  'raja yogas': 'ラージャ・ヨーガ（社会的成功の配置）',
  'dhana yogas': 'ダナ・ヨーガ（財の配置）',
  'other yogas': 'その他のヨーガ',
  'inauspicious yogas': '調整が必要な配置'
};

function isAuspiciousGroup(name) {
  return !/inauspicious|dosha/i.test(String(name || ''));
}

function normalizeYogas(yoga, extra, terms) {
  const collect = (payload) => {
    const groups = payload?.data?.yoga_details || payload?.data?.yogas || [];
    const out = [];
    if (!Array.isArray(groups)) return out;
    for (const g of groups) {
      const list = g.yoga_list || g.yogas || [];
      if (Array.isArray(list) && list.length) {
        for (const y of list) {
          out.push({
            group: terms.yogaGroup(g.name, YOGA_GROUP_JA[String(g.name || '').toLowerCase()] || g.name || ''),
            name: terms.yogaName(y.name, YOGA_JA[String(y.name || '').toLowerCase()] || y.name || ''),
            nameEn: y.name || '',
            description: y.description || '',
            auspicious: isAuspiciousGroup(g.name),
            hasYoga: y.has_yoga !== false
          });
        }
      } else if (g.name) {
        out.push({
          group: '',
          name: terms.yogaName(g.name, YOGA_JA[String(g.name).toLowerCase()] || g.name),
          nameEn: g.name,
          description: g.description || '',
          auspicious: true,
          hasYoga: true
        });
      }
    }
    return out;
  };

  const merged = [...collect(yoga), ...collect(extra)].filter((y) => y.hasYoga && y.name);
  const seen = new Set();
  return merged.filter((y) => {
    const key = String(y.nameEn || y.name).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// サルヴァアシュタカヴァルガ: ハウスごとの点数（合計337点）。平均28点との差で強弱を判定する。
function normalizeAshtakavarga(sarva, ascendantSign, terms) {
  const houses = sarva?.data?.sarvashtakavarga?.prastara?.houses
    || sarva?.data?.sarvashtakavarga?.houses
    || sarva?.data?.houses
    || [];
  if (!Array.isArray(houses) || !houses.length) return null;

  const ascIndex = SIGN_ORDER.indexOf(ascendantSign);
  const rows = houses.map((h, i) => {
    const rasi = toJapaneseSign(h.rasi?.name || h.rasi || '');
    let houseNo = h.house?.number || (typeof h.house === 'number' ? h.house : null);
    if (!houseNo && ascIndex >= 0 && rasi) {
      const idx = SIGN_ORDER.indexOf(rasi);
      houseNo = idx >= 0 ? ((idx - ascIndex + 12) % 12) + 1 : i + 1;
    }
    const domainJa = HOUSE_DOMAIN.find((d) => d.house === houseNo) || HOUSE_DOMAIN[i] || null;
    const domain = domainJa ? terms.houseDomain(houseNo, domainJa) : null;
    return {
      house: houseNo || i + 1,
      sign: terms.sign(rasi),
      score: Number(h.score) || 0,
      label: domain?.label || '',
      note: domain?.note || ''
    };
  }).sort((a, b) => a.house - b.house);

  const average = 28; // 337点 ÷ 12ハウス
  return {
    average,
    houses: rows.map((r) => ({ ...r, diff: r.score - average })),
    strongest: [...rows].sort((a, b) => b.score - a.score).slice(0, 3),
    weakest: [...rows].sort((a, b) => a.score - b.score).slice(0, 2)
  };
}

// ヴィムショッタリー・ダシャー。現在地の特定と、今後15年の抽出まで行う。
function normalizeDasha(kundli, terms) {
  const periods = kundli?.data?.dasha_periods || [];
  if (!Array.isArray(periods) || !periods.length) return null;

  const now = Date.now();
  const toYear = (s) => String(s || '').slice(0, 10);
  const lordName = (key) => terms.planet(key, PLANET_JA[key] || key);
  const timeline = periods.map((p) => ({
    lord: p.name,
    lordJa: lordName(p.name),
    season: terms.dashaSeason(p.name, DASHA_SEASON[p.name] || ''),
    start: toYear(p.start),
    end: toYear(p.end),
    isCurrent: new Date(p.start).getTime() <= now && now < new Date(p.end).getTime()
  }));

  const currentRaw = periods.find((p) => new Date(p.start).getTime() <= now && now < new Date(p.end).getTime());
  let current = null;
  if (currentRaw) {
    const antar = (currentRaw.antardasha || []).find(
      (a) => new Date(a.start).getTime() <= now && now < new Date(a.end).getTime()
    );
    const praty = antar
      ? (antar.pratyantardasha || []).find(
        (p) => new Date(p.start).getTime() <= now && now < new Date(p.end).getTime()
      )
      : null;
    current = {
      maha: { lord: currentRaw.name, lordJa: lordName(currentRaw.name), start: toYear(currentRaw.start), end: toYear(currentRaw.end) },
      antar: antar ? { lord: antar.name, lordJa: lordName(antar.name), start: toYear(antar.start), end: toYear(antar.end) } : null,
      pratyantar: praty ? { lord: praty.name, lordJa: lordName(praty.name), start: toYear(praty.start), end: toYear(praty.end) } : null,
      season: terms.dashaSeason(currentRaw.name, DASHA_SEASON[currentRaw.name] || '')
    };
  }

  // 今後15年に含まれる中周期（アンタルダシャー）を切り出す
  const horizon = now + 15 * 365.25 * 86400000;
  const upcoming = [];
  for (const p of periods) {
    for (const a of p.antardasha || []) {
      const start = new Date(a.start).getTime();
      const end = new Date(a.end).getTime();
      if (end > now && start < horizon) {
        upcoming.push({
          maha: lordName(p.name),
          antar: lordName(a.name),
          mahaKey: p.name,
          antarKey: a.name,
          start: toYear(a.start),
          end: toYear(a.end)
        });
      }
    }
  }

  // 過去の大周期の切り替わり（第9章「答え合わせ」に使う）
  const pastSwitches = timeline
    .filter((t) => new Date(t.start).getTime() < now)
    .map((t) => ({ year: t.start.slice(0, 4), lordJa: t.lordJa, season: t.season }));

  return { timeline, current, upcoming: upcoming.slice(0, 12), pastSwitches };
}

function normalizeSadeSati(sadeSati, terms) {
  const d = sadeSati?.data;
  if (!d) return null;
  const phaseJa = (phase) => SADE_SATI_PHASE_JA[String(phase || '').toLowerCase()] || phase || '';
  const phaseName = (phase) => terms.sadeSatiPhase(phase, phaseJa(phase));
  const transits = (d.transits || []).map((t) => ({
    phase: phaseName(t.phase),
    sign: terms.sign(toJapaneseSign(t.saturn_sign || '')),
    start: String(t.start?.date || t.start || '').slice(0, 10),
    end: String(t.end?.date || t.end || '').slice(0, 10),
    retrograde: t.is_retrograde === true || t.is_retrograde === 'true'
  }));
  return {
    active: Boolean(d.is_in_sade_sati),
    phase: phaseName(d.transit_phase),
    transits
  };
}

// 【モノ・コト・場所】をラグナ支配星などから一意に決定する（AIには選ばせない）
function buildBoosters(planets, dasha, terms) {
  const asc = planets.find((p) => p.key === 'Ascendant');
  const ascSignKey = asc?.signKey || '';
  const lagnaLord = SIGN_LORD[ascSignKey] || null;
  const moon = planets.find((p) => p.key === 'Moon');
  const elementKey = SIGN_ELEMENT[moon?.signKey] || '地';
  const tenthSignKey = ascSignKey ? SIGN_ORDER[(SIGN_ORDER.indexOf(ascSignKey) + 9) % 12] : '';
  const tenthLord = SIGN_LORD[tenthSignKey] || null;
  const currentLord = dasha?.current?.maha?.lord || null;

  const stone = lagnaLord ? LIFE_STONE[lagnaLord] : null;
  const supportStone = currentLord ? LIFE_STONE[currentLord] : null;
  const planetName = (key) => terms.planet(key, PLANET_JA[key] || key);
  const ascSign = terms.sign(ascSignKey);
  const tenthSign = terms.sign(tenthSignKey);
  const workStyle = (key, reason) => ({
    type: terms.workStyleType(WORK_STYLE[key].type),
    detail: terms.workStyleDetail(key, WORK_STYLE[key].detail),
    reason
  });
  const place = (key, reason) => ({
    direction: terms.direction(PLANET_DIRECTION[key].direction),
    environment: terms.environment(PLANET_DIRECTION[key].environment),
    reason
  });
  const color = (key) => (key
    ? { name: terms.color(PLANET_COLOR[key].name), hex: PLANET_COLOR[key].hex }
    : null);

  return {
    lagnaSign: ascSign,
    lagnaLord: lagnaLord ? planetName(lagnaLord) : '',
    tenthSign,
    tenthLord: tenthLord ? planetName(tenthLord) : '',
    mono: {
      lifeStone: stone
        ? {
          stone: terms.stone(stone.stone),
          alternatives: terms.stones(stone.alternatives),
          metal: terms.metal(stone.metal),
          reason: terms.reason.lifeStone(ascSign, planetName(lagnaLord))
        }
        : null,
      supportStone: supportStone && currentLord !== lagnaLord
        ? {
          stone: terms.stone(supportStone.stone),
          reason: terms.reason.supportStone(
            planetName(currentLord), dasha?.current?.maha?.start, dasha?.current?.maha?.end
          )
        }
        : null,
      colors: {
        main: color(lagnaLord),
        support: color(currentLord),
        reason: lagnaLord ? terms.reason.color(planetName(lagnaLord)) : ''
      }
    },
    koto: {
      workStyle: tenthLord
        ? workStyle(tenthLord, terms.reason.workStyle(tenthSign, planetName(tenthLord)))
        : null,
      selfStyle: lagnaLord
        ? workStyle(lagnaLord, terms.reason.selfStyle(planetName(lagnaLord)))
        : null,
      rhythm: {
        ...terms.rhythm(elementKey, RHYTHM_BY_ELEMENT[elementKey]),
        reason: terms.reason.rhythm(terms.sign(moon?.signKey || ''), terms.element(elementKey))
      }
    },
    basho: {
      primary: lagnaLord
        ? place(lagnaLord, terms.reason.direction1st(planetName(lagnaLord)))
        : null,
      career: tenthLord
        ? place(tenthLord, terms.reason.direction10th(planetName(tenthLord)))
        : null,
      rest: moon?.signKey
        ? place('Moon', terms.reason.directionRest())
        : null
    }
  };
}

// 鑑定書1冊分のデータを一括取得する。個々の失敗は null として扱い、該当章のみ省略する。
async function fetchReportData({ dob, tob, lat, lon, lang }) {
  const terms = createTerms(lang);
  const token = await getAccessToken();
  const time = tob && tob.length === 5 ? `${tob}:00` : (tob || '12:00:00');
  const datetime = `${dob}T${time}+09:00`;
  const coordinates = `${lat},${lon}`;
  const base = { datetime, coordinates, ayanamsa: 1 };

  const chartParams = (type) => ({
    ...base, chart_type: type, chart_style: 'north-indian', format: 'svg'
  });

  // raja-yoga（Advanced Raja Yoga）は1回20,000クレジットで鑑定書1冊の消費の95%を占めるため呼ばない。
  // ラージャヨーガを含む主要ヨーガは kundli/advanced と yoga の yoga_details から得られる。
  const [
    planetPosition, kundli, yoga,
    sarva, sadeSati, chartD1, chartD9, chartD10
  ] = await Promise.all([
    callEndpoint(token, 'astrology/planet-position', base),
    callEndpoint(token, 'astrology/kundli/advanced', base),
    callEndpoint(token, 'astrology/yoga', base),
    callEndpoint(token, 'astrology/sarvashtakavarga', base),
    callEndpoint(token, 'astrology/sade-sati/advanced', base),
    callEndpoint(token, 'astrology/chart', chartParams('rasi'), true),
    callEndpoint(token, 'astrology/chart', chartParams('navamsa'), true),
    callEndpoint(token, 'astrology/chart', chartParams('dasamsa'), true)
  ]);

  if (!planetPosition) throw new Error('prokerala_position_failed');

  const planets = normalizePlanets(planetPosition, terms);
  const asc = planets.find((p) => p.key === 'Ascendant');
  const dasha = normalizeDasha(kundli, terms);
  const birthDetails = kundli?.data?.nakshatra_details || null;
  const birthNakshatra = birthDetails?.nakshatra?.name
    ? toJapaneseNakshatra(birthDetails.nakshatra.name)
    : planets.find((p) => p.key === 'Moon')?.nakshatraKey || '';

  return {
    generated_at: toJstIsoString(new Date()),
    lang: terms.lang,
    birth: { dob, tob: tob || '12:00', lat, lon },
    planets,
    ascendant: asc ? { sign: asc.sign, degree: asc.degree } : null,
    moon: planets.find((p) => p.key === 'Moon') || null,
    sun: planets.find((p) => p.key === 'Sun') || null,
    nakshatra: terms.nakshatra(birthNakshatra),
    nakshatraPada: birthDetails?.nakshatra?.pada || null,
    strength: normalizeDignity(planets, terms),
    yogas: normalizeYogas(yoga, kundli, terms),
    ashtakavarga: normalizeAshtakavarga(sarva, asc?.signKey || '', terms),
    dasha,
    sadeSati: normalizeSadeSati(sadeSati, terms),
    mangalDosha: kundli?.data?.mangal_dosha
      ? { hasDosha: Boolean(kundli.data.mangal_dosha.has_dosha), description: kundli.data.mangal_dosha.description || '' }
      : null,
    boosters: buildBoosters(planets, dasha, terms),
    charts: { d1: chartD1 || null, d9: chartD9 || null, d10: chartD10 || null }
  };
}

// --- 年間運勢（Year Ahead） ---
// 今後 12 か月の各月初の惑星位置を取得し、出生の月・ラグナから見たハウスに変換する。
// 期間の区切り（月）と惑星名・サイン・ハウスはここで確定し、AI は意味づけだけを行う。
const TRANSIT_PLANETS = ['Sun', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const SLOW_PLANETS = ['Jupiter', 'Saturn', 'Rahu', 'Ketu'];

function monthStartsFrom(now, count) {
  const out = [];
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  for (let i = 1; i <= count; i += 1) {
    const d = new Date(Date.UTC(y, m + i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

function houseFrom(baseSignKey, signKey) {
  const a = SIGN_ORDER.indexOf(baseSignKey);
  const b = SIGN_ORDER.indexOf(signKey);
  return a >= 0 && b >= 0 ? ((b - a + 12) % 12) + 1 : null;
}

function houseLabel(house, terms) {
  const ja = HOUSE_DOMAIN.find((h) => h.house === house);
  if (!ja) return '';
  const resolved = terms.houseDomain(house, ja);
  return resolved && resolved.label ? resolved.label : ja.label;
}

// 期間内に切り替わる中周期・小周期を月単位で列挙する
function dashaChangesWithin(kundli, startMonth, endMonth, terms) {
  const periods = kundli?.data?.dasha_periods || [];
  const lordName = (key) => terms.planet(key, PLANET_JA[key] || key);
  const toMonth = (s) => String(s || '').slice(0, 7);
  const changes = [];
  const inWindow = (s) => { const mth = toMonth(s); return mth >= startMonth && mth <= endMonth; };
  for (const p of periods) {
    if (inWindow(p.start)) changes.push({ level: 'maha', month: toMonth(p.start), lord: lordName(p.name), lordKey: p.name });
    for (const a of p.antardasha || []) {
      if (inWindow(a.start)) changes.push({ level: 'antar', month: toMonth(a.start), maha: lordName(p.name), lord: lordName(a.name), lordKey: a.name });
    }
  }
  return changes.sort((x, y) => x.month.localeCompare(y.month));
}

async function fetchYearlyData({ dob, tob, lat, lon, lang }) {
  const terms = createTerms(lang);
  const token = await getAccessToken();
  const time = tob && tob.length === 5 ? `${tob}:00` : (tob || '12:00:00');
  const coordinates = `${lat},${lon}`;
  const base = { datetime: `${dob}T${time}+09:00`, coordinates, ayanamsa: 1 };
  const months = monthStartsFrom(new Date(), 12);

  const [planetPosition, kundli, sadeSati, ...monthly] = await Promise.all([
    callEndpoint(token, 'astrology/planet-position', base),
    callEndpoint(token, 'astrology/kundli/advanced', base),
    callEndpoint(token, 'astrology/sade-sati/advanced', base),
    ...months.map((ym) => callEndpoint(token, 'astrology/planet-position', { datetime: `${ym}-01T12:00:00+09:00`, coordinates, ayanamsa: 1 }))
  ]);
  if (!planetPosition) throw new Error('prokerala_position_failed');
  if (monthly.filter(Boolean).length < 10) throw new Error('prokerala_transit_failed');

  const natal = normalizePlanets(planetPosition, terms);
  const asc = natal.find((p) => p.key === 'Ascendant');
  const moon = natal.find((p) => p.key === 'Moon');
  const dasha = normalizeDasha(kundli, terms);

  const monthsOut = months.map((ym, i) => {
    const planets = normalizePlanets(monthly[i] || { data: {} }, terms)
      .filter((p) => TRANSIT_PLANETS.includes(p.key))
      .map((p) => {
        const fromMoon = moon ? houseFrom(moon.signKey, p.signKey) : null;
        const fromLagna = asc ? houseFrom(asc.signKey, p.signKey) : null;
        return {
          key: p.key, name: p.name, sign: p.sign, signKey: p.signKey, retrograde: p.retrograde,
          houseFromMoon: fromMoon, houseFromMoonLabel: houseLabel(fromMoon, terms),
          houseFromLagna: fromLagna, houseFromLagnaLabel: houseLabel(fromLagna, terms)
        };
      });
    return { month: ym, planets };
  });

  // 遅い惑星（木星・土星・ラーフ・ケートゥ）のサイン移動＝その年の大きな節目
  const keyShifts = [];
  for (const key of SLOW_PLANETS) {
    let prev = null;
    for (const m of monthsOut) {
      const p = m.planets.find((x) => x.key === key);
      if (!p) continue;
      if (prev && prev.signKey !== p.signKey) {
        keyShifts.push({ month: m.month, planet: p.name, planetKey: key, from: prev.sign, to: p.sign, houseFromMoon: p.houseFromMoon, houseFromMoonLabel: p.houseFromMoonLabel });
      }
      prev = p;
    }
  }

  const slowNow = monthsOut[0].planets.filter((p) => SLOW_PLANETS.includes(p.key));
  return {
    generated_at: toJstIsoString(new Date()),
    lang: terms.lang,
    product: 'yearly',
    birth: { dob, tob: tob || '12:00', lat, lon },
    period: { start: months[0], end: months[months.length - 1] },
    ascendant: asc ? { sign: asc.sign, degree: asc.degree } : null,
    moon: moon || null,
    sun: natal.find((p) => p.key === 'Sun') || null,
    planets: natal,
    strength: normalizeDignity(natal, terms),
    dasha: dasha ? { current: dasha.current, upcoming: dasha.upcoming.slice(0, 4) } : null,
    dashaChanges: dashaChangesWithin(kundli, months[0], months[months.length - 1], terms),
    sadeSati: normalizeSadeSati(sadeSati, terms),
    slowPlanetsNow: slowNow,
    keyShifts,
    months: monthsOut,
    quarters: [0, 3, 6, 9].map((i) => ({ index: i / 3 + 1, months: monthsOut.slice(i, i + 3) }))
  };
}

// --- 相性鑑定（Compatibility） ---
// アシュタクータ（36点法）は Prokerala の kundli-matching で確定させる。向きは girl=A / boy=B。
function personSummary(planets, kundli, terms) {
  const asc = planets.find((p) => p.key === 'Ascendant');
  const moon = planets.find((p) => p.key === 'Moon');
  const details = kundli?.data?.nakshatra_details || null;
  const nakKey = details?.nakshatra?.name ? toJapaneseNakshatra(details.nakshatra.name) : (moon?.nakshatraKey || '');
  return {
    ascendant: asc ? { sign: asc.sign, degree: asc.degree } : null,
    moon: moon || null,
    sun: planets.find((p) => p.key === 'Sun') || null,
    mercury: planets.find((p) => p.key === 'Mercury') || null,
    venus: planets.find((p) => p.key === 'Venus') || null,
    mars: planets.find((p) => p.key === 'Mars') || null,
    saturn: planets.find((p) => p.key === 'Saturn') || null,
    rahu: planets.find((p) => p.key === 'Rahu') || null,
    ketu: planets.find((p) => p.key === 'Ketu') || null,
    nakshatra: terms.nakshatra(nakKey),
    strength: normalizeDignity(planets, terms).slice(0, 3),
    mangalDosha: kundli?.data?.mangal_dosha ? { hasDosha: Boolean(kundli.data.mangal_dosha.has_dosha) } : null,
    currentDasha: normalizeDasha(kundli, terms)?.current || null,
    planets
  };
}

const KOOTA = {
  varna: { ja: 'ヴァルナ（価値観の階層）', en: 'Varna (hierarchy of values)', max: 1 },
  vasya: { ja: 'ヴァシャ（引き合う力）', en: 'Vasya (mutual attraction)', max: 2 },
  tara: { ja: 'ターラー（運の相互作用）', en: 'Tara (interplay of fortune)', max: 3 },
  yoni: { ja: 'ヨーニ（本能的な相性）', en: 'Yoni (instinctive compatibility)', max: 4 },
  graha_maitri: { ja: 'グラハ・マイトリ（心の友好）', en: 'Graha Maitri (friendship of minds)', max: 5 },
  gana: { ja: 'ガナ（気質の型）', en: 'Gana (temperament type)', max: 6 },
  bhakoot: { ja: 'バクート（生活と感情の同調）', en: 'Bhakoot (harmony of life and emotion)', max: 7 },
  nadi: { ja: 'ナーディ（体質と生命力）', en: 'Nadi (constitution and vitality)', max: 8 }
};

function normalizeMatching(matching, terms) {
  const d = matching?.data || {};
  const gm = d.guna_milan || d.ashtakoota || d.koota || d;
  const rawKootas = gm.kootas || gm.koota || gm.guna || [];
  const kootas = (Array.isArray(rawKootas) ? rawKootas : Object.entries(rawKootas).map(([k, v]) => ({ id: k, ...(typeof v === 'object' ? v : { points: v }) })))
    .map((k) => {
      const id = String(k.id || k.name || k.koota || '').toLowerCase().replace(/[\s-]+/g, '_').replace('grahamaitri', 'graha_maitri').replace('bhakut', 'bhakoot');
      const dict = KOOTA[id] || { ja: k.name || id, en: k.name || id, max: k.maximum_points ?? k.max_points ?? null };
      return {
        id,
        name: terms.lang === 'ja' ? dict.ja : dict.en,
        points: Number(k.points ?? k.obtained_points ?? k.score ?? 0),
        max: Number(k.maximum_points ?? k.max_points ?? dict.max ?? 0),
        description: k.description || ''
      };
    });
  const total = Number(gm.total_points ?? gm.obtained_points ?? gm.total ?? kootas.reduce((s, k) => s + k.points, 0));
  const max = Number(gm.maximum_points ?? gm.max_points ?? 36);
  return {
    total,
    max,
    ratio: max ? Math.round((total / max) * 100) : null,
    band: total >= 28 ? 'excellent' : total >= 24 ? 'very_good' : total >= 18 ? 'good' : 'needs_care',
    kootas,
    mangalDosha: d.mangal_dosha_compatibility || d.mangal_dosha || null,
    message: d.message?.description || d.message || ''
  };
}

async function fetchCompatData({ a, b, lang, relation = 'general' }) {
  const terms = createTerms(lang);
  const token = await getAccessToken();
  const dt = (p) => `${p.dob}T${p.tob && p.tob.length === 5 ? `${p.tob}:00` : (p.tob || '12:00:00')}+09:00`;
  const baseOf = (p) => ({ datetime: dt(p), coordinates: `${p.lat},${p.lon}`, ayanamsa: 1 });

  const months = monthStartsFrom(new Date(), 12);
  const [posA, kundliA, posB, kundliB, matching, ...monthly] = await Promise.all([
    callEndpoint(token, 'astrology/planet-position', baseOf(a)),
    callEndpoint(token, 'astrology/kundli/advanced', baseOf(a)),
    callEndpoint(token, 'astrology/planet-position', baseOf(b)),
    callEndpoint(token, 'astrology/kundli/advanced', baseOf(b)),
    callEndpoint(token, 'astrology/kundli-matching/advanced', {
      girl_dob: dt(a), girl_coordinates: `${a.lat},${a.lon}`,
      boy_dob: dt(b), boy_coordinates: `${b.lat},${b.lon}`, ayanamsa: 1
    }),
    ...months.map((ym) => callEndpoint(token, 'astrology/planet-position', { datetime: `${ym}-01T12:00:00+09:00`, coordinates: `${a.lat},${a.lon}`, ayanamsa: 1 }))
  ]);
  if (!posA || !posB) throw new Error('prokerala_position_failed');
  if (!matching) throw new Error('prokerala_matching_failed');

  const planetsA = normalizePlanets(posA, terms);
  const planetsB = normalizePlanets(posB, terms);
  const moonA = planetsA.find((p) => p.key === 'Moon');
  const moonB = planetsB.find((p) => p.key === 'Moon');
  const ascA = planetsA.find((p) => p.key === 'Ascendant');
  const ascB = planetsB.find((p) => p.key === 'Ascendant');

  // 相手の主要惑星が自分のどのハウスに入るか（月基準・ラグナ基準）
  const overlay = (mine, theirs) => ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].map((key) => {
    const p = theirs.find((x) => x.key === key);
    if (!p) return null;
    const h = mine ? houseFrom(mine.signKey, p.signKey) : null;
    return { planet: p.name, planetKey: key, sign: p.sign, house: h, houseLabel: houseLabel(h, terms) };
  }).filter(Boolean);

  // 関係が動く時期: 木星・土星・ラーフ・ケートゥ・金星が二人それぞれの月から何室を通るか（月初値）と、二人のダシャー切替
  const TIMING_PLANETS = ['Jupiter', 'Saturn', 'Rahu', 'Ketu', 'Venus'];
  const timeline = months.map((ym, i) => {
    const transit = normalizePlanets(monthly[i] || { data: {} }, terms).filter((p) => TIMING_PLANETS.includes(p.key));
    return {
      month: ym,
      planets: transit.map((p) => ({
        planet: p.name, planetKey: p.key, sign: p.sign, retrograde: p.retrograde,
        houseFromMoonA: moonA ? houseFrom(moonA.signKey, p.signKey) : null,
        houseFromMoonB: moonB ? houseFrom(moonB.signKey, p.signKey) : null
      }))
    };
  });
  const first = months[0];
  const last = months[months.length - 1];
  const dashaChanges = [
    ...dashaChangesWithin(kundliA, first, last, terms).map((c) => ({ ...c, person: 'A' })),
    ...dashaChangesWithin(kundliB, first, last, terms).map((c) => ({ ...c, person: 'B' }))
  ].sort((x, y) => x.month.localeCompare(y.month));

  // 縁の要素: 相手の月・太陽・金星が自分の月から見て 1/5/7/9/11 室（縦・結び目のハウス）にあるか、ラーフ・ケートゥ軸が相手の月・太陽に重なるか
  const KARMIC_HOUSES = { 1: 'union', 5: 'affection', 7: 'partnership', 9: 'guidance', 11: 'friendship', 4: 'home', 10: 'work', 6: 'service', 8: 'transformation', 12: 'letting_go', 2: 'resources', 3: 'communication' };
  const bond = (mine, theirs, label) => theirs
    .filter((p) => ['Moon', 'Sun', 'Venus'].includes(p.key))
    .map((p) => {
      const h = mine ? houseFrom(mine.signKey, p.signKey) : null;
      return { from: label, planet: p.name, planetKey: p.key, house: h, houseLabel: houseLabel(h, terms), theme: KARMIC_HOUSES[h] || null };
    });
  const nodeAxis = (nodes, theirs, label) => nodes
    .filter(Boolean)
    .flatMap((n) => theirs.filter((p) => ['Moon', 'Sun'].includes(p.key) && p.signKey === n.signKey).map((p) => ({ node: n.name, nodeKey: n.key, of: label, touches: p.name, touchesKey: p.key, sign: p.sign })));
  const karmic = {
    bondsAonB: bond(moonB, planetsA, 'A'),
    bondsBonA: bond(moonA, planetsB, 'B'),
    nodeContacts: [
      ...nodeAxis([planetsA.find((p) => p.key === 'Rahu'), planetsA.find((p) => p.key === 'Ketu')], planetsB, 'A'),
      ...nodeAxis([planetsB.find((p) => p.key === 'Rahu'), planetsB.find((p) => p.key === 'Ketu')], planetsA, 'B')
    ],
    sameNakshatra: Boolean(moonA && moonB && moonA.nakshatraKey && moonA.nakshatraKey === moonB.nakshatraKey),
    saturnOnMoon: [
      ...(moonB && planetsA.find((p) => p.key === 'Saturn' && p.signKey === moonB.signKey) ? ['A_saturn_on_B_moon'] : []),
      ...(moonA && planetsB.find((p) => p.key === 'Saturn' && p.signKey === moonA.signKey) ? ['B_saturn_on_A_moon'] : [])
    ]
  };

  return {
    generated_at: toJstIsoString(new Date()),
    lang: terms.lang,
    product: 'compat',
    relation,
    period: { start: first, end: last },
    timeline,
    dashaChanges,
    karmic,
    personA: { label: a.label || 'A', birth: { dob: a.dob, tob: a.tob || '12:00' }, ...personSummary(planetsA, kundliA, terms) },
    personB: { label: b.label || 'B', birth: { dob: b.dob, tob: b.tob || '12:00' }, ...personSummary(planetsB, kundliB, terms) },
    matching: normalizeMatching(matching, terms),
    moonDistance: moonA && moonB ? houseFrom(moonA.signKey, moonB.signKey) : null,
    lagnaDistance: ascA && ascB ? houseFrom(ascA.signKey, ascB.signKey) : null,
    overlayAonB: overlay(moonB, planetsA),
    overlayBonA: overlay(moonA, planetsB)
  };
}

module.exports = {
  fetchReportData,
  fetchYearlyData,
  fetchCompatData,
  toJstIsoString,
  toJapaneseSign,
  toJapaneseNakshatra,
  nakshatraFromLongitude,
  SIGN_ORDER
};
