// Stripe カスタマーポータル: /api/stripe-portal
// 会員がマイページから支払い方法の変更・サブスクの解約を自分で行うための入口。
// 解約後のステータス変更は /api/stripe-webhook が受け取る。
const { verifySession } = require('./_auth');
const { getMemberRecord } = require('./_sheets');

const RETURN_URL = 'https://www.libertas-jyotish.com/ja/mypage';

async function stripeRequest(path, apiKey, params) {
  const options = { method: params ? 'POST' : 'GET', headers: { Authorization: `Bearer ${apiKey}` } };
  if (params) {
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = new URLSearchParams(params).toString();
  }
  const res = await fetch(`https://api.stripe.com/v1${path}`, options);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error?.message || `Stripe ${path} failed (${res.status})`);
  }
  return body;
}

// 会員行に顧客IDが無い場合（Webhook で記録する前に契約した会員）はメールから引く
async function resolveCustomerId(member, email, apiKey) {
  if (member?.stripeCustomerId) return member.stripeCustomerId;
  const query = `email:'${String(email).trim().toLowerCase().replace(/'/g, "\\'")}'`;
  const found = await stripeRequest(`/customers/search?query=${encodeURIComponent(query)}&limit=1`, apiKey);
  return found?.data?.[0]?.id || null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, session } = req.body || {};
  if (!email || !session) return res.status(400).json({ error: 'missing_credentials' });
  if (!verifySession(email, session)) return res.status(401).json({ error: 'invalid_session' });

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    console.error('STRIPE_SECRET_KEY is not configured');
    return res.status(503).json({ error: 'portal_unavailable' });
  }

  let member = null;
  try {
    member = await getMemberRecord(email);
  } catch (err) {
    console.error('Member lookup failed:', err?.message);
    return res.status(503).json({ error: 'member_lookup_failed' });
  }

  try {
    const customerId = await resolveCustomerId(member, email, apiKey);
    if (!customerId) return res.status(404).json({ error: 'customer_not_found' });

    const portal = await stripeRequest('/billing_portal/sessions', apiKey, {
      customer: customerId,
      return_url: RETURN_URL
    });
    return res.status(200).json({ url: portal.url });
  } catch (err) {
    console.error('Failed to create billing portal session:', err?.message);
    return res.status(502).json({ error: 'portal_session_failed' });
  }
};
