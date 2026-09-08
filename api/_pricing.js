// 価格帯（T1/T2/T3）と決済事業者の解決（CommonJS）
// 国コードは Vercel が付与する x-vercel-ip-country。テーブルに無い国は既定の価格帯（T2）。
// 日本からの購入は KOMOJU（円建て）、それ以外は Gumroad（米ドル建て）で決済する。
const priceTiers = require('../data/price-tiers.json');

const CURRENCY = 'JPY';

// 商品 × 価格帯の金額（円・税込）。Gumroad 側の商品価格と必ず揃える。
const AMOUNTS = {
  premium: { T1: 980, T2: 550, T3: 380 },
  pdf: { T1: 8800, T2: 5980, T3: 3480 }
};

const KOMOJU_COUNTRIES = new Set(['JP']);

function resolveTier(country) {
  const entry = country && priceTiers.countries[country];
  return (entry && entry.tier) || priceTiers.defaultTier;
}

function komojuEnabled() {
  return Boolean(process.env.KOMOJU_SECRET_KEY);
}

function resolveProvider(country) {
  return komojuEnabled() && KOMOJU_COUNTRIES.has(country) ? 'komoju' : 'gumroad';
}

function countryFrom(req) {
  return String(req.headers['x-vercel-ip-country'] || '').trim().toUpperCase() || null;
}

module.exports = { CURRENCY, AMOUNTS, resolveTier, resolveProvider, countryFrom, komojuEnabled };
