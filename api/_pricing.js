// 価格帯（T1/T2/T3）と決済事業者の解決（CommonJS）
// 国コードは Vercel が付与する x-vercel-ip-country。テーブルに無い国は既定の価格帯（T2）。
// 日本からの購入は KOMOJU（円建て）、それ以外は Gumroad（米ドル建て）で決済する。
// 日本で KOMOJU が未接続のときは Gumroad に流さず「準備中」（provider: null）。
const priceTiers = require('../data/price-tiers.json');

const CURRENCY = { komoju: 'JPY', gumroad: 'USD' };

// KOMOJU（日本）の商品 × 価格帯の金額（円・税込）。
const AMOUNTS = {
  premium: { T1: 980, T2: 550, T3: 380 },
  pdf: { T1: 8800, T2: 5980, T3: 3480 },
  // 個別鑑定書（相性・年間運勢・仕事）。Etsy の米ドル価格（値引き後 $69 / $49 / $49）と概ね揃える。
  compat: { T1: 9800, T2: 6800, T3: 3980 },
  yearly: { T1: 6800, T2: 4800, T3: 2980 },
  career: { T1: 6800, T2: 4800, T3: 2980 },
  // 手相×出生図 統合鑑定「カル・クンダリ」。Etsy の米ドル価格 $89 と揃える。
  palm: { T1: 12800, T2: 8900, T3: 4980 },
  // Karma & Dharma（今世の天命）。生涯完全鑑定書と同額。
  karma: { T1: 8800, T2: 5980, T3: 3480 }
};

// Gumroad（日本以外）の金額（米ドル）。Gumroad 側の商品価格（plan-t*/report-t*）と必ず揃える。
const USD_AMOUNTS = {
  premium: { T1: 6.99, T2: 3.99, T3: 2.49 },
  pdf: { T1: 59, T2: 39, T3: 23 },
  // 個別鑑定書のうち Gumroad 側で公開済みの商品だけ（未公開の商品はここに載せない＝海外は 503）。
  compat: { T1: 69, T2: 46, T3: 27 },
  yearly: { T1: 49, T2: 33, T3: 19 },
  career: { T1: 49, T2: 33, T3: 19 },
  palm: { T1: 89, T2: 59, T3: 33 },
  karma: { T1: 59, T2: 39, T3: 23 }
};

// Gumroad の商品ページ（個別鑑定書）。注文 ID は URL パラメータで渡し、Ping の url_params で受け取る。
const GUMROAD_REPORT_LINKS = {
  compat: {
    T1: 'https://libertajyoti.gumroad.com/l/compat-tier1',
    T2: 'https://libertajyoti.gumroad.com/l/compat-tier2',
    T3: 'https://libertajyoti.gumroad.com/l/compat-t3'
  },
  yearly: {
    T1: 'https://libertajyoti.gumroad.com/l/yearly-t1',
    T2: 'https://libertajyoti.gumroad.com/l/yearly-t2',
    T3: 'https://libertajyoti.gumroad.com/l/yearly-t3'
  },
  career: {
    T1: 'https://libertajyoti.gumroad.com/l/career-t1',
    T2: 'https://libertajyoti.gumroad.com/l/career-t2',
    T3: 'https://libertajyoti.gumroad.com/l/career-t3'
  },
  palm: {
    T1: 'https://libertajyoti.gumroad.com/l/palm-t1',
    T2: 'https://libertajyoti.gumroad.com/l/palm-t2',
    T3: 'https://libertajyoti.gumroad.com/l/palm-t3'
  },
  karma: {
    T1: 'https://libertajyoti.gumroad.com/l/karma-t1',
    T2: 'https://libertajyoti.gumroad.com/l/karma-t2',
    T3: 'https://libertajyoti.gumroad.com/l/karma-t3'
  }
};

function amountsFor(provider) {
  return provider === 'gumroad' ? USD_AMOUNTS : AMOUNTS;
}

const KOMOJU_COUNTRIES = new Set(['JP']);

function resolveTier(country) {
  const entry = country && priceTiers.countries[country];
  return (entry && entry.tier) || priceTiers.defaultTier;
}

// TEST 鍵（sk_test_…）では本番の購入導線を開かない。E2E 検証時のみ KOMOJU_ALLOW_TEST=1 で解放する。
function komojuEnabled() {
  const key = process.env.KOMOJU_SECRET_KEY || '';
  if (!key) return false;
  return key.startsWith('sk_live_') || process.env.KOMOJU_ALLOW_TEST === '1';
}

// 'komoju' | 'gumroad' | null（日本で KOMOJU 未接続＝販売停止）
function resolveProvider(country) {
  if (KOMOJU_COUNTRIES.has(country)) return komojuEnabled() ? 'komoju' : null;
  return 'gumroad';
}

function saleAvailable(product, provider) {
  return provider !== null && !!amountsFor(provider)[product];
}

function countryFrom(req) {
  return String(req.headers['x-vercel-ip-country'] || '').trim().toUpperCase() || null;
}

module.exports = { CURRENCY, AMOUNTS, USD_AMOUNTS, GUMROAD_REPORT_LINKS, amountsFor, resolveTier, resolveProvider, saleAvailable, countryFrom, komojuEnabled };
