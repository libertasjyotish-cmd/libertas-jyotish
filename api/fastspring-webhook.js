// FastSpring webhooks: /api/fastspring-webhook?token=<FASTSPRING_WEBHOOK_TOKEN>
// 月額・年額会員の課金／失効と、完全鑑定書（買い切り）の購入／返金を会員シートへ反映する。
// 1回のPOSTに複数イベントが入る（events 配列）ため、1件ずつ適用してから 200 を返す。
// 認証は2通り: FastSpring の HMAC SHA256 署名（X-FS-Signature）と、URL に付けた秘密トークン。
// 署名は生のリクエストボディに対して計算されるため、本文が既にパース済みの環境では
// トークンだけで判定する。どちらも通らない場合は 401 を返す。
const crypto = require('crypto');
const { setMemberStatus, setPdfPurchased, revokePdfPurchase, downgradeMember } = require('./_sheets');

const REPORT_PATH = process.env.FASTSPRING_PATH_PDF || 'complete-reading';
const MEMBERSHIP_PATHS = [
  process.env.FASTSPRING_PATH_PREMIUM || 'membership-monthly',
  process.env.FASTSPRING_PATH_PREMIUM_ANNUAL || 'membership-annual'
];

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8');
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function signatureMatches(rawBody, header, secret) {
  if (!rawBody || !rawBody.length || !header || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  return timingSafeEqualStr(header, expected);
}

function requestToken(req) {
  return new URL(req.url, 'https://localhost').searchParams.get('token') || '';
}

// 会員の紐づけキーは購入時のメールアドレス。
// 購入導線で本人確認済みのアドレスを tags.lj_email として渡している。
function extractEmail(data) {
  if (!data) return null;
  return (
    (data.tags && data.tags.lj_email) ||
    (data.account && data.account.contact && data.account.contact.email) ||
    (data.customer && data.customer.email) ||
    (data.contact && data.contact.email) ||
    null
  );
}

// 注文は複数商品を含みうるので、商品パスで会員と鑑定書を見分ける。
function productKinds(data) {
  const paths = [];
  if (data && Array.isArray(data.items)) {
    for (const item of data.items) if (item && item.product) paths.push(String(item.product));
  }
  if (data && data.product) paths.push(String(data.product));

  return {
    report: paths.some((path) => path === REPORT_PATH),
    membership: paths.some((path) => MEMBERSHIP_PATHS.includes(path))
  };
}

async function grant(email, kinds) {
  if (kinds.report && !(await setPdfPurchased(email))) throw new Error('member_sheet_unavailable');
  if (kinds.membership && !(await setMemberStatus(email, 'paid'))) throw new Error('member_sheet_unavailable');
  return kinds.report || kinds.membership;
}

async function revoke(email, kinds) {
  if (kinds.report && !(await revokePdfPurchase(email))) throw new Error('member_sheet_unavailable');
  if (kinds.membership || !kinds.report) {
    const result = await downgradeMember({ email });
    if (!result.updated && result.reason !== 'member_not_found') throw new Error(result.reason || 'downgrade_failed');
  }
  return true;
}

async function applyEvent(event) {
  const data = event && event.data;
  const email = extractEmail(data);
  if (!email) return 'no_email';

  switch (event.type) {
    // 買い切り・サブスク初回とも order.completed が届く。サブスクの継続課金は charge.completed。
    case 'order.completed':
    case 'subscription.activated':
    case 'subscription.charge.completed':
    case 'subscription.uncanceled':
    case 'subscription.resumed': {
      const kinds = productKinds(data);
      // サブスク系イベントは商品パスを含まないことがあるため、会員として扱う。
      if (!kinds.report && !kinds.membership) kinds.membership = event.type !== 'order.completed';
      return (await grant(email, kinds)) ? 'applied' : 'unknown_product';
    }
    // 解約の申し出は期末まで利用できるため、ここでは権利を外さない（deactivated で外す）。
    case 'subscription.canceled':
    case 'subscription.paused':
      return 'ignored';
    case 'subscription.deactivated': {
      await revoke(email, { report: false, membership: true });
      return 'applied';
    }
    case 'return.created':
    case 'chargeback.created': {
      const kinds = productKinds(data);
      await revoke(email, kinds);
      return 'applied';
    }
    default:
      return 'ignored';
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.FASTSPRING_WEBHOOK_SECRET || '';
  const token = process.env.FASTSPRING_WEBHOOK_TOKEN || '';
  if (!secret && !token) {
    console.error('FASTSPRING_WEBHOOK_SECRET / FASTSPRING_WEBHOOK_TOKEN are not configured.');
    return res.status(500).json({ error: 'Server is not configured.' });
  }

  const rawBody = await readRawBody(req);
  const signed = signatureMatches(rawBody, req.headers['x-fs-signature'], secret);
  const tokenOk = Boolean(token) && timingSafeEqualStr(requestToken(req), token);
  if (!signed && !tokenOk) {
    console.error('FastSpring webhook rejected: signature and token both invalid.');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload = req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : null;
  if (!payload) {
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const events = Array.isArray(payload.events) ? payload.events : [];
  const results = [];
  for (const event of events) {
    try {
      results.push({ id: event && event.id, type: event && event.type, result: await applyEvent(event) });
    } catch (err) {
      // 5xx を返すと FastSpring が再送する（イベントIDは同じなので二重適用にはならない）。
      console.error(`Failed to apply FastSpring ${event && event.type}:`, err.message);
      return res.status(500).json({ error: 'Failed to update status' });
    }
  }

  console.log('FastSpring webhook applied:', JSON.stringify(results));
  return res.status(200).json({ received: true, events: results.length });
};
