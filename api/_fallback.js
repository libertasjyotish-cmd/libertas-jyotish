// 外部API障害時の退避鑑定を組み立てるレイヤー（CommonJS）
// 星座・ナクシャトラは日本語表記を内部キーとして選び、表示だけ言語別に変換する。
// 文面は api/fallback/<lang>.js に置く。未整備の言語は英語の文面で表示する。
const { createTerms, normalizeLang } = require('./_terms');

function load(require_) {
  try {
    return require_();
  } catch (err) {
    return null;
  }
}

const TEXT = {
  ja: require('./fallback/ja'),
  en: require('./fallback/en'),
  es: load(() => require('./fallback/es')),
  pt: load(() => require('./fallback/pt')),
  ar: load(() => require('./fallback/ar')),
  id: load(() => require('./fallback/id'))
};

const MOON_SIGNS = ['牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座', '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座'];
const NAKSHATRAS = ['アシュヴィニー', 'バラニー', 'クリッティカー', 'ローヒニー', 'ムリガシラス', 'アールドラー', 'プナルヴァス', 'プシャ', 'アーシュレーシャ', 'マガー', 'プールヴァ・パールグニー', 'ウッタラ・パールグニー', 'ハスタ', 'チトラ', 'スヴァーティ', 'ヴィシャーカー', 'アヌラーダ', 'ジェーシュタ', 'ムーラ', 'プールヴァ・アシャーダー', 'ウッタラ・アシャーダー', 'シュラヴァナ', 'ダニシュター', 'シャタビシャ', 'プールヴァ・バードラパダー', 'ウッタラ・バードラパダー', 'レーヴァティー'];

// 退避時の天体表。星座・ハウスは固定で、名称と説明だけ言語別に差し替える。
const PLANET_ROWS = [
  { key: 'Ascendant', ja: 'アセンダント', sign: null, house: '1' },
  { key: 'Sun', ja: '太陽', sign: '獅子座', house: '5' },
  { key: 'Moon', ja: '月', sign: null, house: '1' },
  { key: 'Mercury', ja: '水星', sign: '乙女座', house: '6' },
  { key: 'Venus', ja: '金星', sign: '天秤座', house: '7' },
  { key: 'Mars', ja: '火星', sign: '牡羊座', house: '10' },
  { key: 'Jupiter', ja: '木星', sign: '射手座', house: '9' },
  { key: 'Saturn', ja: '土星', sign: '山羊座', house: '12' },
  { key: 'Rahu', ja: 'ラーフ', sign: '双子座', house: '3' },
  { key: 'Ketu', ja: 'ケートゥ', sign: '射手座', house: '9' }
];

function textFor(lang) {
  return TEXT[lang] || TEXT.en;
}

// API 障害時の退避鑑定書。内容は実際の天体計算ではないため is_fallback で明示する。
function buildFallbackResponse(dob, isPaid, rawLang, helpers) {
  const lang = normalizeLang(rawLang);
  const t = createTerms(lang);
  const text = textFor(lang);
  const { siderealSunSign, toJstIsoString } = helpers;

  // 生年月日の日をベースに、27ナクシャトラを自動推定して変化を与える
  const day = parseInt(dob.split('-')[2]) || 15;
  const moonSignJa = MOON_SIGNS[day % 12];
  const nakshatraJa = NAKSHATRAS[day % 27];

  // 退避文面でも日付ごとにトランジット月の位置が変わるようにする（月は約2.25日で1星座進む）
  const todayJst = toJstIsoString(new Date()).slice(0, 10);
  const daysSinceEpoch = Math.floor(new Date(`${todayJst}T00:00:00+09:00`).getTime() / 86400000);
  const transitMoonSignJa = MOON_SIGNS[Math.floor(daysSinceEpoch / 2.25) % 12];
  const transitNakshatraJa = NAKSHATRAS[daysSinceEpoch % 27];

  const moonSign = t.sign(moonSignJa);
  const nakshatra = t.nakshatra(nakshatraJa);
  const transitMoonSign = t.sign(transitMoonSignJa);
  const transitNakshatra = t.nakshatra(transitNakshatraJa);
  const theme = text.luckyThemes[daysSinceEpoch % text.luckyThemes.length];
  const action = text.luckyActions[daysSinceEpoch % text.luckyActions.length];

  const response = {
    is_fallback: true,
    reading_date: todayJst,
    sunSign: t.sign(siderealSunSign(dob)),
    moonSign,
    nakshatra,
    free_reading: {
      horoscope: text.horoscope({ date: todayJst, transitMoonSign, moonSign }),
      influence: text.influence({ transitNakshatra }),
      dasha_summary: text.dashaSummary({ nakshatra }),
      lucky_element: text.luckyLine(theme, action)
    }
  };

  if (isPaid) {
    response.dashaTitle = text.dashaTitle;
    response.dashaDesc = text.dashaDesc;
    response.planets = PLANET_ROWS.map((row, i) => ({
      name: t.planet(row.key, row.ja),
      sign: row.sign ? t.sign(row.sign) : moonSign,
      house: row.house,
      comment: text.planetComments[i]
    }));
    response.premium_reading = {
      kundali_reading: text.kundaliReading({ moonSign }),
      detailed_horoscope: text.detailedHoroscope,
      lifetime_dasha: text.lifetimeDasha
    };
  }

  return response;
}

module.exports = { buildFallbackResponse };
