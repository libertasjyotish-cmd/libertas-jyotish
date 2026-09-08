// KOMOJU ホストページへ誘導する: GET /api/komoju-checkout?product=pdf|premium&email=…&lang=ja
// セッションをサーバー側で作り、KOMOJU の決済ページ（session_url）へ 302 で送る。
// 会員権は決済完了後に Webhook / return で email に紐づけるため、email はここで必須。
const { AMOUNTS, resolveTier, countryFrom, komojuEnabled } = require('./_pricing');
const { createSession } = require('./_komoju');
const { normalizeLang } = require('./_terms');

const PRODUCTS = new Set(['pdf', 'premium']);

function siteOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  if (!komojuEnabled()) return res.status(503).json({ error: 'komoju_disabled' });

  const product = String(req.query.product || '');
  const email = String(req.query.email || '').trim().toLowerCase();
  const lang = normalizeLang(req.query.lang || 'ja');
  if (!PRODUCTS.has(product)) return res.status(400).json({ error: 'invalid_product' });
  if (!email.includes('@')) return res.status(400).json({ error: 'invalid_email' });

  const tier = resolveTier(countryFrom(req));
  const amount = AMOUNTS[product][tier];
  const origin = siteOrigin(req);
  const returnUrl = `${origin}/api/komoju-return?product=${product}&lang=${lang}`;

  try {
    const session = await createSession({
      product,
      amount,
      email,
      lang,
      returnUrl,
      externalCustomerId: email
    });
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 302;
    res.setHeader('Location', session.session_url);
    return res.end();
  } catch (err) {
    console.error('komoju-checkout failed:', err.message);
    res.statusCode = 302;
    res.setHeader('Location', `/${lang}/mypage?checkout=error`);
    return res.end();
  }
};
