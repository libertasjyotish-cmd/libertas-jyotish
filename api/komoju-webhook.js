// KOMOJU Webhook: POST /api/komoju-webhook
// ダッシュボード（管理 → Webhook）にこの URL と秘密トークン（KOMOJU_WEBHOOK_SECRET）を登録する。
// 購読イベント: payment.captured / payment.refunded / payment.cancelled / payment.expired /
//               subscription.captured / subscription.failed / subscription.suspended / subscription.deleted
// 署名は生のリクエストボディに対する HMAC なので、Vercel の自動パースを切って自前で読む。
const { verifyWebhookSignature } = require('./_komoju');
const {
  setPdfPurchased,
  revokePdfPurchase,
  setKomojuSubscription,
  updateKomojuSubscription,
  downgradeMember,
  getMemberRecord
} = require('./_sheets');
const { confirmWebOrder, refundWebOrder } = require('./_etsy-ledger');

const REPORT_PRODUCTS = new Set(['compat', 'yearly', 'career']);

module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function metaOf(obj) {
  return (obj && obj.metadata) || {};
}

function emailOf(obj) {
  const meta = metaOf(obj);
  const customer = obj && obj.customer;
  const fromCustomer = customer && typeof customer === 'object' ? customer.email : null;
  return String(meta.email || fromCustomer || obj.email || '').trim().toLowerCase() || null;
}

function customerIdOf(sub) {
  const c = sub && sub.customer;
  return typeof c === 'string' ? c : (c && c.id) || '';
}

// シートへの書き込みに失敗（false）したら 5xx を返して KOMOJU に再送させる。
function assertWritten(ok) {
  if (!ok) throw new Error('sheet_write_failed');
}

// 買い切り（鑑定書）は payment.* を見る。定期課金の決済は subscription.* 側で扱うので、
// metadata.product が pdf のものだけを対象にする。
async function handlePayment(type, payment) {
  const meta = metaOf(payment);
  if (REPORT_PRODUCTS.has(meta.product)) return handleReportPayment(type, meta.order_id);
  if (meta.product !== 'pdf') return 'ignored';
  const email = emailOf(payment);
  if (!email) return 'no_email';
  switch (type) {
    case 'payment.captured':
      assertWritten(await setPdfPurchased(email));
      return 'pdf_granted';
    case 'payment.refunded':
    case 'payment.marked.as.fraud':
      assertWritten(await revokePdfPurchase(email));
      return 'pdf_revoked';
    default:
      return 'ignored';
  }
}

// 個別鑑定書（サイト直販）は台帳の行を進めるだけ。生成・納品は etsy-cron。
async function handleReportPayment(type, orderId) {
  if (!orderId) return 'no_order';
  switch (type) {
    case 'payment.captured':
      return `report_${await confirmWebOrder(orderId)}`;
    case 'payment.refunded':
    case 'payment.marked.as.fraud':
      return `report_${await refundWebOrder(orderId)}`;
    default:
      return 'ignored';
  }
}

async function handleSubscription(type, sub) {
  const email = emailOf(sub);
  if (!email) return 'no_email';
  switch (type) {
    case 'subscription.created':
    case 'subscription.captured':
      assertWritten(await setKomojuSubscription(email, {
        customerId: customerIdOf(sub),
        subscriptionId: sub.id,
        paidUntil: sub.next_capture_at || ''
      }));
      return 'member_paid';
    case 'subscription.failed':
      // 24 時間後に再試行される。paid_until まではそのまま利用可。
      return 'retrying';
    case 'subscription.suspended': {
      await updateKomojuSubscription(email, { subscriptionId: '' });
      await downgradeMember({ email });
      return 'member_suspended';
    }
    case 'subscription.deleted': {
      // 解約（自サイト or ダッシュボード）。paid_until までは利用可能にし、期限切れは komoju-cron が落とす。
      const member = await getMemberRecord(email);
      const paidUntil = (member && member.paidUntil) || sub.next_capture_at || '';
      await updateKomojuSubscription(email, { subscriptionId: '', paidUntil });
      if (!paidUntil || Date.parse(paidUntil) <= Date.now()) await downgradeMember({ email });
      return 'member_cancelled';
    }
    default:
      return 'ignored';
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const raw = await readRawBody(req);
  if (!verifyWebhookSignature(raw, req.headers['x-komoju-signature'])) {
    return res.status(401).json({ error: 'invalid_signature' });
  }

  let event;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch (e) {
    return res.status(400).json({ error: 'invalid_json' });
  }

  const type = String(event.type || req.headers['x-komoju-event'] || '');
  const data = event.data || {};
  try {
    let result = 'ignored';
    if (type === 'ping') result = 'pong';
    else if (type.startsWith('payment.')) result = await handlePayment(type, data);
    else if (type.startsWith('subscription.')) result = await handleSubscription(type, data);
    return res.status(200).json({ ok: true, type, result });
  } catch (err) {
    console.error('komoju-webhook failed:', type, err.message);
    // 5xx を返すと KOMOJU が再送する
    return res.status(500).json({ error: 'processing_failed' });
  }
};
