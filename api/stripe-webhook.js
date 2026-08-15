// Stripe Webhook: 決済完了を受けて会員ステータスを paid に昇格する（サブスク）／
// 買い切り（mode=payment）は完全鑑定書の購入として記録する／
// サブスク終了（解約・未払い）を受けて paid を free に戻す
// Stripe ダッシュボードで https://<domain>/api/stripe-webhook を登録し、
// checkout.session.completed / checkout.session.async_payment_succeeded / invoice.paid /
// customer.subscription.deleted / customer.subscription.updated を送信する。
const crypto = require('crypto');
const { setMemberStatus, setPdfPurchased, downgradeMember } = require('./_sheets');

// 署名検証には生のリクエストボディが必要なため、Vercel の自動パースを無効化する
module.exports.config = { api: { bodyParser: false } };

const TOLERANCE_SEC = 300;

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Stripe-Signature: t=<timestamp>,v1=<hmac>,v1=<hmac>...
function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;

  let timestamp = null;
  const signatures = [];
  for (const part of signatureHeader.split(',')) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1' && value) signatures.push(value);
  }
  if (!timestamp || !signatures.length) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp, 10));
  if (!Number.isFinite(age) || age > TOLERANCE_SEC) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody.toString('utf8')}`)
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');

  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, 'utf8');
    return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
  });
}

// サブスクは 顧客ID しか載らないイベントがあるため、会員行を引く手掛かりを取り出す
function extractCustomerId(object) {
  const customer = object?.customer;
  if (typeof customer === 'string') return customer;
  return customer?.id || null;
}

function extractEmail(object) {
  return (
    object?.customer_details?.email ||
    object?.customer_email ||
    object?.receipt_email ||
    object?.metadata?.email ||
    null
  );
}

// 既存会員は stripe_customer_id 未記録のことがあるため、鍵があれば Stripe 側からメールを引く
async function fetchCustomerEmail(customerId) {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey || !customerId) return null;
  try {
    const res = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) return null;
    const customer = await res.json();
    return customer?.email || null;
  } catch (err) {
    console.error('Failed to fetch Stripe customer:', err.message);
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured.');
    return res.status(500).json({ error: 'Server is not configured.' });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    console.error('Failed to read raw body:', err.message);
    return res.status(400).json({ error: 'Invalid body' });
  }

  if (!verifyStripeSignature(rawBody, req.headers['stripe-signature'], secret)) {
    console.error('Stripe signature verification failed.');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const paidEvents = [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'invoice.paid'
  ];
  const endedEvents = ['customer.subscription.deleted', 'customer.subscription.updated'];

  if (!paidEvents.includes(event.type) && !endedEvents.includes(event.type)) {
    return res.status(200).json({ received: true, ignored: event.type });
  }

  const object = event.data?.object || {};

  if (endedEvents.includes(event.type)) {
    // 期末解約の予約（cancel_at_period_end）はまだ利用期間が残っているので降格しない。
    // 実際に課金が止まる canceled / unpaid になった時点で無料に戻す。
    const ended = ['canceled', 'unpaid', 'incomplete_expired'].includes(object.status);
    if (!ended) {
      return res.status(200).json({ received: true, ignored: `subscription_${object.status}` });
    }

    const customerId = extractCustomerId(object);
    const email = extractEmail(object) || (await fetchCustomerEmail(customerId));
    const result = await downgradeMember({ email, customerId }).catch((err) => {
      console.error('Failed to downgrade member:', err.message);
      return { updated: false, reason: 'error' };
    });

    if (!result.updated) {
      if (result.reason === 'member_not_found') {
        console.error(`Stripe ${event.type}: no member row for customer ${customerId}`);
        return res.status(200).json({ received: true, skipped: result.reason });
      }
      // シート未接続などは Stripe にリトライさせる
      return res.status(500).json({ error: 'Failed to downgrade status', reason: result.reason });
    }

    console.log(`Stripe ${event.type}: ${result.reason} for customer ${customerId}`);
    return res.status(200).json({ received: true, result: result.reason });
  }
  // 非同期決済は checkout.session.completed 時点では未入金のことがある
  if (event.type === 'checkout.session.completed' && object.payment_status && object.payment_status !== 'paid') {
    return res.status(200).json({ received: true, pending: object.payment_status });
  }

  const email = extractEmail(object);
  if (!email) {
    console.error(`No email found on ${event.type} (${event.id})`);
    return res.status(200).json({ received: true, skipped: 'no_email' });
  }

  // 買い切り（完全鑑定書）とサブスクは別の権利。mode で振り分ける。
  const isOneTime = object.mode === 'payment';

  try {
    const updated = isOneTime
      ? await setPdfPurchased(email)
      : await setMemberStatus(email, 'paid', extractCustomerId(object));
    if (!updated) {
      // シート未接続などで反映できていない場合、200 を返すと失敗が誰にも見えなくなる
      console.error(`Stripe ${event.type}: member sheet unavailable, purchase not recorded.`);
      return res.status(500).json({ error: 'Member sheet unavailable' });
    }
    console.log(`Stripe ${event.type}: ${isOneTime ? 'pdf_purchased=true' : 'status=paid'} for ${email}`);
  } catch (err) {
    console.error('Failed to update member record:', err.message);
    // Stripe にリトライさせる
    return res.status(500).json({ error: 'Failed to update status' });
  }

  return res.status(200).json({ received: true });
};
