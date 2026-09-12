// KOMOJU ホストページからの戻り: GET /api/komoju-return?product=…&lang=…&session_id=…
// セッションをサーバー側で照会し、確定していれば会員シートへ即時反映してから完了ページへ送る。
// 反映の正はあくまで Webhook（/api/komoju-webhook）で、ここは購入直後の体験を良くするための先行反映。
const { AMOUNTS, resolveTier, countryFrom } = require('./_pricing');
const { getSession, createSubscription, getSubscription } = require('./_komoju');
const { setPdfPurchased, setKomojuSubscription, getMemberRecord } = require('./_sheets');
const { normalizeLang } = require('./_terms');
const { confirmWebOrder } = require('./_etsy-ledger');

const REPORT_PRODUCTS = new Set(['compat', 'yearly', 'career']);

function redirect(res, location) {
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = 302;
  res.setHeader('Location', location);
  return res.end();
}

function metaEmail(session) {
  const meta = (session && session.metadata) || {};
  return String(meta.email || session.email || '').trim().toLowerCase();
}

// premium: 保存されたカードで定期課金を開始する（初回はこの時点で即時課金）。
// 既に有効なサブスクがある会員には二重に作らない。
async function activateSubscription(session, { amount, lang }) {
  const email = metaEmail(session);
  const customerId = session.customer_id;
  if (!email || !customerId) return { ok: false, reason: 'missing_customer' };

  const member = await getMemberRecord(email);
  if (member && member.komojuSubscriptionId) {
    const existing = await getSubscription(member.komojuSubscriptionId).catch(() => null);
    if (existing && ['pending', 'active', 'retrying'].includes(existing.status)) {
      return { ok: true, reason: 'already_subscribed' };
    }
  }

  const sub = await createSubscription({ customerId, amount, email, product: 'premium' });
  if (!['pending', 'active'].includes(sub.status)) {
    return { ok: false, reason: `subscription_${sub.status}` };
  }
  await setKomojuSubscription(email, {
    customerId,
    subscriptionId: sub.id,
    paidUntil: sub.next_capture_at || '',
    language: lang
  });
  return { ok: true, reason: 'subscribed' };
}

module.exports = async (req, res) => {
  const product = req.query.product === 'premium' ? 'premium' : REPORT_PRODUCTS.has(req.query.product) ? req.query.product : 'pdf';
  const orderId = String(req.query.order || '');
  const lang = normalizeLang(req.query.lang || 'ja');
  const sessionId = String(req.query.session_id || '');
  const mypage = `/${lang}/mypage`;
  if (!sessionId) return redirect(res, `${mypage}?checkout=cancelled`);

  try {
    const session = await getSession(sessionId);
    if (session.status !== 'completed') {
      return redirect(res, `${mypage}?checkout=${session.status === 'cancelled' ? 'cancelled' : 'pending'}`);
    }

    if (product === 'premium') {
      const amount = AMOUNTS.premium[resolveTier(countryFrom(req))];
      const result = await activateSubscription(session, { amount, lang });
      if (!result.ok) {
        console.error('komoju-return subscription failed:', result.reason);
        return redirect(res, `${mypage}?checkout=error`);
      }
      return redirect(res, `${mypage}?c=1`);
    }

    // 個別鑑定書（サイト直販）: 台帳の行を決済確定にして生成キューへ。コンビニ等の入金待ちは Webhook が進める。
    if (REPORT_PRODUCTS.has(product)) {
      const payment = session.payment || {};
      const id = orderId || (session.metadata && session.metadata.order_id) || '';
      if (payment.status === 'captured' && id) await confirmWebOrder(id);
      return redirect(res, `/${lang}/reports?ordered=${payment.status === 'captured' ? 'paid' : 'pending'}`);
    }

    // pdf: カードは completed 時点で captured。コンビニ等は authorized（入金待ち）→ Webhook で captured。
    const payment = session.payment || {};
    if (payment.status === 'captured') {
      const email = metaEmail(session);
      if (email) await setPdfPurchased(email);
      return redirect(res, `/${lang}/pdf-success?c=1`);
    }
    return redirect(res, `/${lang}/pdf-success?pending=1`);
  } catch (err) {
    console.error('komoju-return failed:', err.message);
    return redirect(res, `${mypage}?checkout=error`);
  }
};
