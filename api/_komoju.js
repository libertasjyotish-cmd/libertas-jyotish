// KOMOJU REST API の薄いラッパー（CommonJS）
// 秘密鍵は KOMOJU_SECRET_KEY（TEST 鍵 sk_test_… / LIVE 鍵 sk_live_…）。ダッシュボードの鍵を差し替えるだけで切り替わる。
const crypto = require('crypto');

const API_BASE = 'https://komoju.com/api/v1';

// 日本向けに申請した決済手段。TEST 環境では全手段が有効なので、ここで本番と同じ並びに絞る。
const PAYMENT_TYPES = {
  pdf: ['credit_card', 'konbini', 'paypay'],
  premium: ['credit_card'] // 定期課金はカードのみ
};

const PRODUCT_NAMES = {
  pdf: { ja: '生涯総合鑑定書（PDF）', en: 'Lifetime Comprehensive Report (PDF)' },
  premium: { ja: 'プレミアム会員（月額）', en: 'Premium Membership (monthly)' }
};

function productName(product, lang) {
  const names = PRODUCT_NAMES[product] || {};
  return names[lang] || names.en || product;
}

function secretKey() {
  return process.env.KOMOJU_SECRET_KEY || '';
}

async function komojuFetch(path, { method = 'GET', body } = {}) {
  const key = secretKey();
  if (!key) throw new Error('KOMOJU_SECRET_KEY is not set');
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { /* 非 JSON 応答 */ }
  if (!res.ok) {
    const msg = (json && json.error && json.error.message) || text || res.statusText;
    const err = new Error(`KOMOJU ${method} ${path} failed (${res.status}): ${msg}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

// ホストページのセッションを作る。pdf は都度払い、premium はカード保存のみ（課金はサブスク作成時）。
function createSession({ product, amount, email, lang, returnUrl, externalCustomerId }) {
  const common = {
    currency: 'JPY',
    email,
    return_url: returnUrl,
    default_locale: lang === 'ja' ? 'ja' : 'en',
    payment_types: PAYMENT_TYPES[product],
    external_customer_id: externalCustomerId,
    metadata: { product, email, lang }
  };
  if (product === 'premium') {
    return komojuFetch('/sessions', { method: 'POST', body: { ...common, mode: 'customer' } });
  }
  return komojuFetch('/sessions', {
    method: 'POST',
    body: {
      ...common,
      mode: 'payment',
      amount,
      line_items: [{ description: productName(product, lang), amount, quantity: 1 }]
    }
  });
}

function getSession(id) {
  return komojuFetch(`/sessions/${encodeURIComponent(id)}`);
}

function createSubscription({ customerId, amount, email, product }) {
  return komojuFetch('/subscriptions', {
    method: 'POST',
    body: { customer: customerId, amount, currency: 'JPY', period: 'monthly', metadata: { product, email } }
  });
}

function getSubscription(id) {
  return komojuFetch(`/subscriptions/${encodeURIComponent(id)}`);
}

function deleteSubscription(id) {
  return komojuFetch(`/subscriptions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// Webhook の X-Komoju-Signature（HMAC-SHA256 of raw body）を検証する
function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.KOMOJU_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(String(signature), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = {
  createSession,
  getSession,
  createSubscription,
  getSubscription,
  deleteSubscription,
  verifyWebhookSignature,
  productName
};
