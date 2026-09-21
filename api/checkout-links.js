// 訪問者の国に応じた決済先（Gumroad リンク or KOMOJU）と価格を返す: /api/checkout-links
// 価格帯・決済事業者の解決は api/_pricing.js。
const currencyRates = require('../data/currency-rates.json');
const { CURRENCY, amountsFor, resolveTier, resolveProvider, saleAvailable, countryFrom } = require('./_pricing');

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

// 表示用の価格ラベル（日本語ページ用）。金額は _pricing の AMOUNTS / USD_AMOUNTS と必ず揃える。
const LABELS = {
  gumroad: {
    premium: { T1: '月額 US$6.99（米ドル決済）', T2: '月額 US$3.99（米ドル決済）', T3: '月額 US$2.49（米ドル決済）' },
    pdf: { T1: '買い切り US$59（米ドル決済）', T2: '買い切り US$39（米ドル決済）', T3: '買い切り US$23（米ドル決済）' }
  },
  komoju: {
    premium: { T1: '月額 980円（税込）', T2: '月額 550円（税込）', T3: '月額 380円（税込）' },
    pdf: { T1: '買い切り 8,800円（税込）', T2: '買い切り 5,980円（税込）', T3: '買い切り 3,480円（税込）' }
  }
};

// 決済通貨（USD/JPY）以外の国には現地通貨の概算額を添える（確定額は決済画面）。
// レート表は data/currency-rates.json（scripts/build-currency-rates.js で更新、円基準）。
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

function approxFor(country, tier, provider) {
  if (!provider) return null;
  const base = CURRENCY[provider];
  const amounts = amountsFor(provider);
  const currency = country && currencyRates.countries[country];
  const perJpy = currency && currencyRates.perJpy[currency];
  const basePerJpy = currencyRates.perJpy[base];
  if (!currency || currency === base || !Number.isFinite(perJpy) || !Number.isFinite(basePerJpy)) return null;
  const rate = perJpy / basePerJpy;
  const premium = roundApprox(amounts.premium[tier] * rate, currency);
  const pdf = roundApprox(amounts.pdf[tier] * rate, currency);
  if (premium === null || pdf === null) return null;
  return { currency, premium, pdf };
}

module.exports = (req, res) => {
  const country = countryFrom(req);
  const tier = resolveTier(country);
  const provider = resolveProvider(country);
  // 日本で KOMOJU 未接続（provider: null）は販売停止。表示用の金額は KOMOJU（円）のものを返す。
  const labelProvider = provider || 'komoju';
  const amounts = amountsFor(labelProvider);

  // 国ごとに内容が変わるため共有キャッシュには載せない。
  res.setHeader('Cache-Control', 'private, max-age=3600');
  return res.status(200).json({
    country,
    tier,
    provider,
    available: { premium: saleAvailable('premium', provider), pdf: saleAvailable('pdf', provider) },
    links: { premium: LINKS.premium[tier], pdf: LINKS.pdf[tier] },
    labels: { premium: LABELS[labelProvider].premium[tier], pdf: LABELS[labelProvider].pdf[tier] },
    currency: CURRENCY[labelProvider],
    amounts: { premium: amounts.premium[tier], pdf: amounts.pdf[tier] },
    approx: approxFor(country, tier, provider)
  });
};
