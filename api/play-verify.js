// Google Play アプリ内課金の購入を検証して会員権を付与する: POST /api/play-verify
// body: { email, session, product: 'pdf'|'premium', purchaseToken }
// Android アプリ（TWA）内で PaymentRequest（https://play.google.com/billing）が完了した直後に呼ばれる。
// クライアントの申告は信用せず、Play Developer API でトークンを照会してから Sheets に書き、承認（acknowledge）する。
const { verifySession } = require('./_auth');
const {
  PLAY_PRODUCTS,
  playEnabled,
  getProductPurchase,
  acknowledgeProduct,
  getSubscription,
  acknowledgeSubscription,
  subscriptionSummary
} = require('./_play');
const { setPdfPurchased, setPlaySubscription } = require('./_sheets');
const { normalizeLang } = require('./_terms');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!playEnabled()) return res.status(503).json({ error: 'play_disabled' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const email = String(body.email || '').trim().toLowerCase();
  const product = String(body.product || '');
  const purchaseToken = String(body.purchaseToken || '').trim();
  const lang = normalizeLang(body.lang || 'ja');

  if (!email.includes('@') || !verifySession(email, body.session)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!PLAY_PRODUCTS[product]) return res.status(400).json({ error: 'invalid_product' });
  if (!purchaseToken) return res.status(400).json({ error: 'invalid_token' });

  const { id: productId, kind } = PLAY_PRODUCTS[product];
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (kind === 'inapp') {
      const purchase = await getProductPurchase(productId, purchaseToken);
      if (purchase.purchaseState !== 0) return res.status(402).json({ error: 'not_purchased' });
      if (!(await setPdfPurchased(email))) throw new Error('sheet_write_failed');
      if (purchase.acknowledgementState === 0) await acknowledgeProduct(productId, purchaseToken);
      return res.status(200).json({ ok: true, product, granted: 'pdf' });
    }

    const summary = subscriptionSummary(await getSubscription(purchaseToken));
    if (!summary.entitled) return res.status(402).json({ error: 'not_entitled', state: summary.state });
    const ok = await setPlaySubscription(email, {
      purchaseToken,
      paidUntil: summary.expiryTime,
      renewing: summary.renewing,
      language: lang
    });
    if (!ok) throw new Error('sheet_write_failed');
    if (!summary.acknowledged) await acknowledgeSubscription(summary.productId || productId, purchaseToken);
    return res.status(200).json({ ok: true, product, granted: 'premium', paid_until: summary.expiryTime });
  } catch (err) {
    console.error('play-verify failed:', product, err.message);
    // 400 系（トークン不正）は再試行しても直らないのでそのまま返す
    const status = err.status && err.status < 500 ? 400 : 502;
    return res.status(status).json({ error: 'verify_failed' });
  }
};
