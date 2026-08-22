// 訪問者の国に応じた決済リンクと価格表示を返す: /api/checkout-links
// 国コードは Vercel が付与する x-vercel-ip-country を使う。
// 決済事業者は環境変数 CHECKOUT_PROVIDER で切り替える（未設定なら現行の Gumroad）。
const priceTiers = require('../data/price-tiers.json');
const currencyRates = require('../data/currency-rates.json');
const fastspring = require('../data/fastspring-prices.json');

// 価格帯ごとの Gumroad 商品リンク。商品を作り直したらここだけ更新する。
const LINKS = {
  premium: {
    T1: 'https://libertajyoti.gumroad.com/l/plan-t1',
    T2: 'https://libertajyoti.gumroad.com/l/plan-t2',
    T3: 'https://libertajyoti.gumroad.com/l/plan-t3'
  },
  pdf: {
    T1: 'https://libertajyoti.gumroad.com/l/report-t1',
    T2: 'https://libertajyoti.gumroad.com/l/report-t2',
    T3: 'https://libertajyoti.gumroad.com/l/report-t3'
  }
};

// 表示用の価格ラベル（日本語）。リンクの金額と必ず揃える。
const LABELS = {
  premium: { T1: '月額 980円（米ドル決済）', T2: '月額 550円（米ドル決済）', T3: '月額 380円（米ドル決済）' },
  pdf: { T1: '買い切り 8,800円（米ドル決済）', T2: '買い切り 5,980円（米ドル決済）', T3: '買い切り 3,480円（米ドル決済）' }
};

// 日本語以外のページは、この金額を閲覧言語の書式に整形して表示する。
const CURRENCY = 'JPY';
const AMOUNTS = {
  premium: { T1: 980, T2: 550, T3: 380 },
  pdf: { T1: 8800, T2: 5980, T3: 3480 }
};

// 円以外の国には現地通貨の概算額を添える（確定額はGumroadの決済画面）。
// レート表は data/currency-rates.json（scripts/build-currency-rates.js で更新）。
const ZERO_DECIMAL = new Set(currencyRates.zeroDecimal);

function roundApprox(value, currency) {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (ZERO_DECIMAL.has(currency)) {
    const unit = value >= 100000 ? 1000 : value >= 10000 ? 100 : value >= 1000 ? 10 : 1;
    return Math.round(value / unit) * unit;
  }
  if (value >= 100) return Math.round(value / 10) * 10;
  if (value >= 10) return Math.round(value);
  return Math.round(value * 10) / 10;
}

function approxFor(country, tier) {
  const currency = country && currencyRates.countries[country];
  const rate = currency && currencyRates.perJpy[currency];
  if (!currency || currency === CURRENCY || !Number.isFinite(rate)) return null;
  const premium = roundApprox(AMOUNTS.premium[tier] * rate, currency);
  const pdf = roundApprox(AMOUNTS.pdf[tier] * rate, currency);
  if (premium === null || pdf === null) return null;
  return { currency, premium, pdf };
}

function resolveTier(country) {
  const entry = country && priceTiers.countries[country];
  return (entry && entry.tier) || priceTiers.defaultTier;
}

function gumroadPayload(country) {
  const tier = resolveTier(country);
  return {
    provider: 'gumroad',
    country,
    tier,
    links: { premium: LINKS.premium[tier], pdf: LINKS.pdf[tier] },
    labels: { premium: LABELS.premium[tier], pdf: LABELS.pdf[tier] },
    currency: CURRENCY,
    amounts: { premium: AMOUNTS.premium[tier], pdf: AMOUNTS.pdf[tier] },
    approx: approxFor(country, tier)
  };
}

// FastSpring は購入者の国から決済通貨を自動で決める。
// 価格を手入力した通貨だけサイト側でも同じ金額を表示し、それ以外は金額を出さない
// （自動換算のため確定額が決済画面でしか分からない）。
function fastspringPayload(country) {
  const storefront = process.env.FASTSPRING_STOREFRONT || '';
  const products = {
    premium: process.env.FASTSPRING_PATH_PREMIUM || 'membership-monthly',
    premium_annual: process.env.FASTSPRING_PATH_PREMIUM_ANNUAL || 'membership-annual',
    pdf: process.env.FASTSPRING_PATH_PDF || 'complete-reading'
  };
  const currency = (country && fastspring.countries[country]) || fastspring.defaultCurrency;
  const priced = fastspring.prices[currency] || null;

  return {
    provider: 'fastspring',
    country,
    storefront,
    products,
    accountUrl: process.env.FASTSPRING_ACCOUNT_URL || '',
    currency: priced ? currency : null,
    amounts: priced,
    zeroDecimal: fastspring.zeroDecimal
  };
}

module.exports = (req, res) => {
  const country = String(req.headers['x-vercel-ip-country'] || '').trim().toUpperCase() || null;
  const provider = String(process.env.CHECKOUT_PROVIDER || 'gumroad').trim().toLowerCase();

  // 国ごとに内容が変わるため共有キャッシュには載せない。
  res.setHeader('Cache-Control', 'private, max-age=3600');
  return res.status(200).json(provider === 'fastspring' ? fastspringPayload(country) : gumroadPayload(country));
};
