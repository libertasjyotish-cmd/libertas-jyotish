// 完全鑑定書（PDF）の表示語彙を言語別に解決するレイヤー（CommonJS）
// 計算とデータ構造は日本語表記を内部キーとして維持し、ここで表示言語へ変換する。
// 日本語のときは恒等変換になるため、既存の出力は変わらない。
// 語彙は api/terms/<lang>.js に1ファイルずつ置く。未整備の言語は英語の語彙で表示する。

// AI に渡す出力言語の指定（プロンプト本体は日本語のまま、言語だけを切り替える）
const OUTPUT_LANGUAGE = {
  ja: '日本語',
  en: 'English',
  es: 'Spanish (español)',
  pt: 'Portuguese (português)',
  ar: 'Arabic (العربية)',
  id: 'Indonesian (Bahasa Indonesia)'
};

const REASON_JA = {
  lifeStone: (sign, planet) => `ラグナ（1室）が${sign}で、その支配星が${planet}であるため`,
  supportStone: (planet, start, end) => `現在の大周期の支配星が${planet}であるため（${start}〜${end}）`,
  color: (planet) => `1室支配星${planet}の色属性`,
  workStyle: (sign, planet) => `10室（仕事）が${sign}で、その支配星が${planet}であるため`,
  selfStyle: (planet) => `1室支配星が${planet}であるため`,
  rhythm: (sign, element) => `月が${sign}（${element}のサイン）にあるため`,
  direction1st: (planet) => `1室支配星${planet}の方位属性`,
  direction10th: (planet) => `10室支配星${planet}の方位属性`,
  directionRest: () => '月（休息・回復）の方位属性'
};


const SUPPORTED_LANGS = ['ja', 'en', 'es', 'pt', 'ar', 'id'];

// 語彙ファイルが無い言語は英語で表示する（require を静的に並べ、欠けていても落とさない）
function load(require_) {
  try {
    return require_();
  } catch (err) {
    return null;
  }
}

const VOCAB = {
  en: require('./terms/en'),
  es: load(() => require('./terms/es')),
  pt: load(() => require('./terms/pt')),
  ar: load(() => require('./terms/ar')),
  id: load(() => require('./terms/id'))
};

// 対応外の値は日本語に倒す（言語は表示・生成にのみ影響し、計算値は変えない）
function normalizeLang(lang) {
  const value = String(lang || '').toLowerCase().slice(0, 2);
  return SUPPORTED_LANGS.includes(value) ? value : 'ja';
}

function pick(map, key, fallback) {
  const value = map[key];
  return value === undefined ? (fallback === undefined ? key : fallback) : value;
}

// 表示語彙の解決器。日本語では入力をそのまま返す。
function createTerms(rawLang) {
  const lang = normalizeLang(rawLang);
  const ja = lang === 'ja';
  const v = VOCAB[lang] || VOCAB.en;
  const en = VOCAB.en;
  // その言語に無いカテゴリだけ英語で補う（部分的な語彙ファイルも許容する）
  const map = (name) => v[name] || en[name];
  const list = (values, m) => (Array.isArray(values) ? values.map((x) => pick(m, x)) : values);

  return {
    lang,
    outputLanguage: OUTPUT_LANGUAGE[lang],
    sign: (x) => (ja || !x ? x : pick(map('SIGN'), x)),
    nakshatra: (x) => (ja || !x ? x : pick(map('NAKSHATRA'), x)),
    planet: (key, japanese) => (ja ? japanese : pick(map('PLANET'), key, japanese)),
    dignity: (key, japanese) => (ja ? japanese : pick(map('DIGNITY'), key, japanese)),
    planetDomain: (key, japanese) => (ja ? japanese : map('PLANET_DOMAIN')[key] || japanese),
    stone: (x) => (ja || !x ? x : pick(map('STONE'), x)),
    stones: (x) => (ja ? x : list(x, map('STONE'))),
    metal: (x) => (ja || !x ? x : pick(map('METAL'), x)),
    color: (x) => (ja || !x ? x : pick(map('COLOR'), x)),
    direction: (x) => (ja || !x ? x : pick(map('DIRECTION'), x)),
    environment: (x) => (ja ? x : list(x, map('ENVIRONMENT'))),
    workStyleType: (x) => (ja || !x ? x : pick(map('WORK_STYLE'), x)),
    workStyleDetail: (key, japanese) => (ja ? japanese : pick(map('WORK_DETAIL'), key, japanese)),
    element: (x) => (ja || !x ? x : pick(map('ELEMENT'), x)),
    rhythm: (element, japanese) => (ja ? japanese : map('RHYTHM')[element] || japanese),
    houseDomain: (house, japanese) => (ja ? japanese : map('HOUSE_DOMAIN').find((h) => h.house === house) || japanese),
    dashaSeason: (key, japanese) => (ja ? japanese : pick(map('DASHA_SEASON'), key, japanese)),
    yogaGroup: (rawName, japanese) => (ja ? japanese : pick(map('YOGA_GROUP'), String(rawName || '').toLowerCase(), rawName || japanese)),
    yogaName: (nameEn, japanese) => (ja ? japanese : (nameEn || japanese)),
    sadeSatiPhase: (rawPhase, japanese) => (ja ? japanese : pick(map('SADE_SATI_PHASE'), String(rawPhase || '').toLowerCase(), japanese)),
    remedy: (japanese) => (ja ? japanese : map('REMEDY')),
    chapterTitle: (id, japanese) => (ja ? japanese : pick(map('CHAPTER_TITLE'), id, japanese)),
    reason: ja ? REASON_JA : map('REASON')
  };
}

module.exports = { createTerms, normalizeLang, SUPPORTED_LANGS, OUTPUT_LANGUAGE };
