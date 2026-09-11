// Google Play Billing（Android アプリ内課金）の購入検証・承認（CommonJS）
// Play Developer API（androidpublisher v3）をサービスアカウントで呼ぶ。
// 必要な環境変数:
//   PLAY_PACKAGE_NAME            com.libertas_jyotish.app
//   PLAY_SERVICE_ACCOUNT_EMAIL   Play Console の「API アクセス」で招待したサービスアカウント
//   PLAY_PRIVATE_KEY             同サービスアカウントの秘密鍵（改行は \n）
//   （未設定なら Sheets 用の GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY を流用する）
const { JWT } = require('google-auth-library');

const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

// Play Console に登録する商品 ID。checkout の product（pdf/premium）と対応させる。
const PLAY_PRODUCTS = {
  pdf: { id: 'report_pdf', kind: 'inapp' },
  premium: { id: 'premium_monthly', kind: 'subs' }
};

function packageName() {
  return process.env.PLAY_PACKAGE_NAME || 'com.libertas_jyotish.app';
}

function playEnabled() {
  return Boolean(
    (process.env.PLAY_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) &&
    (process.env.PLAY_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY)
  );
}

let client = null;
function authClient() {
  if (client) return client;
  const email = process.env.PLAY_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.PLAY_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('play_credentials_missing');
  client = new JWT({ email, key, scopes: [SCOPE] });
  return client;
}

async function request(method, path, body) {
  const url = `${API}/${encodeURIComponent(packageName())}${path}`;
  const res = await authClient().request({
    url,
    method,
    data: body,
    validateStatus: () => true
  });
  if (res.status >= 400) {
    const msg = (res.data && res.data.error && res.data.error.message) || `http_${res.status}`;
    const err = new Error(`play_api_${res.status}: ${msg}`);
    err.status = res.status;
    throw err;
  }
  return res.data;
}

// 買い切り商品の購入状態。purchaseState 0 = 購入済み、acknowledgementState 0 = 未承認。
async function getProductPurchase(productId, token) {
  return request('GET', `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`);
}

async function acknowledgeProduct(productId, token) {
  return request('POST', `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`, {});
}

// 定期購入（v2）。subscriptionState と lineItems[].expiryTime を使う。
async function getSubscription(token) {
  return request('GET', `/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`);
}

async function acknowledgeSubscription(productId, token) {
  return request('POST', `/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`, {});
}

const ACTIVE_SUB_STATES = new Set([
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  'SUBSCRIPTION_STATE_CANCELED' // 解約予約中は expiryTime まで利用可
]);

function subscriptionSummary(sub) {
  const items = Array.isArray(sub.lineItems) ? sub.lineItems : [];
  const expiry = items.map(i => i.expiryTime).filter(Boolean).sort().pop() || '';
  const productId = (items[0] && items[0].productId) || '';
  const state = sub.subscriptionState || '';
  return {
    productId,
    state,
    expiryTime: expiry,
    // 有料として扱うか（期限切れ・停止・払い戻しは false）
    entitled: ACTIVE_SUB_STATES.has(state) && (!expiry || Date.parse(expiry) > Date.now()),
    // 自動更新が続くか（解約予約・期限切れは false）
    renewing: state === 'SUBSCRIPTION_STATE_ACTIVE' || state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
    acknowledged: sub.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'
  };
}

module.exports = {
  PLAY_PRODUCTS,
  packageName,
  playEnabled,
  getProductPurchase,
  acknowledgeProduct,
  getSubscription,
  acknowledgeSubscription,
  subscriptionSummary
};
