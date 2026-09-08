// KOMOJU 月額会員の解約: POST /api/komoju-cancel { email, session }
// ログイン済み（lj_session）の本人のみ。KOMOJU 側のサブスクを削除し、次回請求日（paid_until）までは有料のまま残す。
const { verifySession } = require('./_auth');
const { deleteSubscription, getSubscription } = require('./_komoju');
const { getMemberRecord, updateKomojuSubscription } = require('./_sheets');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const email = String(body.email || '').trim().toLowerCase();
  if (!email.includes('@') || !verifySession(email, body.session)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const member = await getMemberRecord(email);
    if (!member || member.billing !== 'komoju' || !member.komojuSubscriptionId) {
      return res.status(404).json({ error: 'no_komoju_subscription' });
    }

    const sub = await getSubscription(member.komojuSubscriptionId).catch(() => null);
    const paidUntil = (sub && sub.next_capture_at) || member.paidUntil || '';
    if (sub && sub.status !== 'deleted') await deleteSubscription(member.komojuSubscriptionId);

    await updateKomojuSubscription(email, { subscriptionId: '', paidUntil });
    return res.status(200).json({ ok: true, paid_until: paidUntil });
  } catch (err) {
    console.error('komoju-cancel failed:', err.message);
    return res.status(502).json({ error: 'cancel_failed' });
  }
};
