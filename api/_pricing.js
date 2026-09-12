// 価格帯（T1/T2/T3）と決済事業者の解決（CommonJS）
// 国コードは Vercel が付与する x-vercel-ip-country。テーブルに無い国は既定の価格帯（T2）。
// 日本からの購入は KOMOJU（円建て）、それ以外は Gumroad（米ドル建て）で決済する。
const priceTiers = require('../data/price-tiers.json');

const CURRENCY = 'JPY';

// 商品 × 価格帯の金額（円・税込）。Gumroad 側の商品価格と必ず揃える。
const AMOUNTS = {
  premium: { T1: 980, T2: 550, T3: 380 },
  pdf: { T1: 8800, T2: 5980, T3: 3480 },
  // 個別鑑定書（相性・年間運勢・仕事）。Etsy の米ドル価格（$69 / $49 / $49）と概ね揃える。
  compat: { T1: 9800, T2: 6800, T3: 3980 },
  yearly: { T1: 6800, T2: 4800, T3: 2980 },
  career: { T1: 6800, T2: 4800, T3: 2980 }
};

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

function resolveProvider(country) {
  return komojuEnabled() && KOMOJU_COUNTRIES.has(country) ? 'komoju' : 'gumroad';
}

function countryFrom(req) {
  return String(req.headers['x-vercel-ip-country'] || '').trim().toUpperCase() || null;
}

module.exports = { CURRENCY, AMOUNTS, resolveTier, resolveProvider, countryFrom, komojuEnabled };
