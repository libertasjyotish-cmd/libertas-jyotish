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

function normalizeYogas(yoga, rajaYoga, terms) {
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

  const merged = [...collect(yoga), ...collect(rajaYoga)].filter((y) => y.hasYoga && y.name);
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

  const [
    planetPosition, kundli, rajaYoga, yoga,
    sarva, sadeSati, chartD1, chartD9, chartD10
  ] = await Promise.all([
    callEndpoint(token, 'astrology/planet-position', base),
    callEndpoint(token, 'astrology/kundli/advanced', base),
    callEndpoint(token, 'astrology/raja-yoga', base),
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
    yogas: normalizeYogas(yoga, rajaYoga, terms),
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

module.exports = {
  fetchReportData,
  toJstIsoString,
  toJapaneseSign,
  toJapaneseNakshatra,
  SIGN_ORDER
};
