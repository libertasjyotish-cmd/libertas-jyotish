// Google Play アプリ内課金の購入を検証して会員権を付与する: POST /api/play-verify
// body: { email, session, product: 'pdf'|'premium', purchaseToken }
//       { product: 'yearly'|'career'|'palm'|'compat', order, purchaseToken } … 個別鑑定書（report-order の台帳行を確定）
// Android アプリ（TWA）内で PaymentRequest（https://play.google.com/billing）が完了した直後に呼ばれる。
// クライアントの申告は信用せず、Play Developer API でトークンを照会してから Sheets に書き、承認（acknowledge）する。
const { verifySession } = require('./_auth');
const { PLAY_PRODUCTS, playEnabled, getProductPurchase, acknowledgeProduct, consumeProduct } = require('./_play');
const { linkSubscription, linkPdf, savePending, isTransient } = require('./_play-link');
const { normalizeLang } = require('./_terms');
const ledger = require('./_etsy-ledger');
const storage = require('./_etsy-storage');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!playEnabled()) return res.status(503).json({ error: 'play_disabled' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const email = String(body.email || '').trim().toLowerCase();
  const product = String(body.product || '');
  const purchaseToken = String(body.purchaseToken || '').trim();
  const lang = normalizeLang(body.lang || 'ja');

  if (!PLAY_PRODUCTS[product]) return res.status(400).json({ error: 'invalid_product' });
  if (!purchaseToken) return res.status(400).json({ error: 'invalid_token' });
  const { id: productId, kind, order: needsOrder } = PLAY_PRODUCTS[product];
  if (!needsOrder && (!email.includes('@') || !verifySession(email, body.session))) {
    console.warn('play-verify unauthorized', { product, hasEmail: email.includes('@'), hasSession: Boolean(body.session) });
    return res.status(401).json({ error: 'unauthorized' });
  }
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (needsOrder) {
      const orderId = String(body.order || '').trim();
      const order = orderId && ledger.isWebOrder(orderId) ? await ledger.findOrder(orderId) : null;
      if (!order || order.product !== product) return res.status(404).json({ error: 'order_not_found' });
      const purchase = await getProductPurchase(productId, purchaseToken);
      if (purchase.purchaseState !== 0) return res.status(402).json({ error: 'not_purchased' });
      // 同じ購入トークンを別の注文に使い回せないよう、確定時に台帳へ Play の注文番号を残す
      const ref = `play:${purchase.orderId || purchaseToken.slice(0, 40)}`;
      if (order.status === ledger.STATUS.AWAITING_PAYMENT) {
        await ledger.upsertOrder(orderId, { transaction_id: ref });
        await ledger.confirmWebOrder(orderId);
      } else if (order.transaction_id !== ref) {
        return res.status(409).json({ error: 'order_already_paid' });
      }
      if (purchase.consumptionState !== 1) {
        await consumeProduct(productId, purchaseToken).catch(async (e) => {
          console.error('play consume failed:', product, e.message);
          if (purchase.acknowledgementState === 0) await acknowledgeProduct(productId, purchaseToken);
        });
      }
      const uploadUrl = product === 'palm' ? storage.uploadUrl(orderId, order.language || lang) : null;
      return res.status(200).json({ ok: true, product, order: orderId, uploadUrl });
    }
    if (kind === 'inapp') {
      let r;
      try {
        r = await linkPdf(email, purchaseToken, { language: lang });
      } catch (err) {
        if (!isTransient(err) || !(await savePending(email, purchaseToken, lang, 'pdf'))) throw err;
        console.warn('play-verify pending:', product, err.message);
        return res.status(202).json({ ok: false, pending: true, product });
      }
      if (!r.ok) return res.status(402).json({ error: 'not_purchased' });
      return res.status(200).json({ ok: true, product, granted: 'pdf' });
    }

    let linked;
    try {
      linked = await linkSubscription(email, purchaseToken, { productId, language: lang });
    } catch (err) {
      // 本人確認は済んでいるので、Google 側の一時的な失敗なら購入を保存し、cron で自動的に紐づけ直す
      if (!isTransient(err) || !(await savePending(email, purchaseToken, lang))) throw err;
      console.warn('play-verify pending:', product, err.message);
      return res.status(202).json({ ok: false, pending: true, product });
    }
    if (!linked.ok) {
      console.warn('play-verify not_entitled', { product, state: linked.state });
      return res.status(402).json({ error: 'not_entitled', state: linked.state });
    }
    return res.status(200).json({ ok: true, product, granted: 'premium', paid_until: linked.summary.expiryTime });
  } catch (err) {
    console.error('play-verify failed:', product, err.message);
    // 400 系（トークン不正）は再試行しても直らないのでそのまま返す
    const status = err.status && err.status < 500 ? 400 : 502;
    // 画面に出して原因を特定できるよう、短い理由だけ返す（トークン・メールは含めない）
    const reason = err.status ? `play_${err.status}` : String(err.message || 'unknown').replace(/[^\w .:-]/g, '').slice(0, 60);
    return res.status(status).json({ error: 'verify_failed', reason });
  }
};
