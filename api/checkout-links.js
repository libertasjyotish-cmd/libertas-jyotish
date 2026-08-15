// 訪問者の国に応じた Stripe 決済リンクを返す: /api/checkout-links
// 国コードは Vercel が付与する x-vercel-ip-country を使い、data/price-tiers.json で価格帯に変換する。
// 判定できない国・テーブルに無い国は既定の価格帯（T2）にフォールバックする。
const priceTiers = require('../data/price-tiers.json');

// 価格帯ごとの Payment Link。Stripe で新しいリンクを作ったらここだけ更新する。
const LINKS = {
  premium: {
    T1: 'https://buy.stripe.com/14A3cxeyXegb8ogcCP24003',
    T2: 'https://buy.stripe.com/dRmaEZ0I73Bx6g8auH24000',
    T3: 'https://buy.stripe.com/3cIfZjaiH5JF33WbyL24002'
  },
  pdf: {
    T1: 'https://buy.stripe.com/cNi00l62r8VRfQI0U724004',
    T2: 'https://buy.stripe.com/3cI14paiHegb480fP124001',
    T3: 'https://buy.stripe.com/aFa8wRfD12xteME8mz24005'
  }
};

// 表示用の価格ラベル（税込・日本語）。リンクの金額と必ず揃える。
const LABELS = {
  premium: { T1: '月額 750円（税込）', T2: '月額 500円（税込）', T3: '月額 300円（税込）' },
  pdf: { T1: '買い切り 7,480円（税込）', T2: '買い切り 4,980円（税込）', T3: '買い切り 2,980円（税込）' }
};

// 日本語以外のページは、この金額を閲覧言語の書式に整形して表示する。
const CURRENCY = 'JPY';
const AMOUNTS = {
  premium: { T1: 750, T2: 500, T3: 300 },
  pdf: { T1: 7480, T2: 4980, T3: 2980 }
};

function resolveTier(country) {
  const entry = country && priceTiers.countries[country];
  return (entry && entry.tier) || priceTiers.defaultTier;
}

module.exports = (req, res) => {
  const country = String(req.headers['x-vercel-ip-country'] || '').trim().toUpperCase() || null;
  const tier = resolveTier(country);

  // 国ごとに内容が変わるため共有キャッシュには載せない。
  res.setHeader('Cache-Control', 'private, max-age=3600');
  return res.status(200).json({
    country,
    tier,
    links: { premium: LINKS.premium[tier], pdf: LINKS.pdf[tier] },
    labels: { premium: LABELS.premium[tier], pdf: LABELS.pdf[tier] },
    currency: CURRENCY,
    amounts: { premium: AMOUNTS.premium[tier], pdf: AMOUNTS.pdf[tier] }
  });
};
