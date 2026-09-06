// Etsy Open API v3 クライアント（CommonJS）。OAuth2 のトークン更新と、注文処理に必要な最小限のエンドポイントだけを持つ。
const TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';
const API_BASE = 'https://openapi.etsy.com/v3/application';
const AUTHORIZE_URL = 'https://www.etsy.com/oauth/connect';

// 注文の読み取り・完了更新と、購入者メールの取得に必要なスコープ
const SCOPES = ['transactions_r', 'transactions_w', 'email_r', 'shops_r'];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} is not set`);
  return value;
}

async function fetchJson(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (err) { data = { raw: text }; }
    if (!res.ok) {
      const detail = data && (data.error_description || data.error || data.raw);
      throw new Error(`Etsy API ${res.status} ${url.replace(API_BASE, '')}: ${detail || 'unknown error'}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function buildAuthorizeUrl({ redirectUri, state, codeChallenge }) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: requireEnv('ETSY_API_KEY'),
    redirect_uri: redirectUri,
    scope: SCOPES.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });
  return `${AUTHORIZE_URL}?${params}`;
}

async function exchangeCode({ code, redirectUri, codeVerifier }) {
  return fetchJson(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: requireEnv('ETSY_API_KEY'),
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier
    })
  });
}

// リフレッシュトークンは更新ごとに新しいものが返るので、呼び出し側で必ず保存し直す
async function refreshAccessToken(refreshToken) {
  return fetchJson(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: requireEnv('ETSY_API_KEY'),
      refresh_token: refreshToken
    })
  });
}

// 個人アプリ（Personal Access）では x-api-key に "keystring:shared_secret" を要求される
function apiKeyHeader() {
  const key = requireEnv('ETSY_API_KEY');
  const secret = process.env.ETSY_SHARED_SECRET;
  return secret ? `${key}:${secret}` : key;
}

function createClient(accessToken) {
  const headers = {
    'x-api-key': apiKeyHeader(),
    Authorization: `Bearer ${accessToken}`
  };
  return {
    getMe() {
      return fetchJson(`${API_BASE}/users/me`, { headers });
    },
    // 支払い済みかつ未完了（未発送）の注文だけを取る。デジタル商品も完了処理は「発送済み」で表す。
    async listOpenReceipts(shopId) {
      const results = [];
      let offset = 0;
      for (;;) {
        const params = new URLSearchParams({ was_paid: 'true', was_shipped: 'false', limit: '100', offset: String(offset) });
        const data = await fetchJson(`${API_BASE}/shops/${shopId}/receipts?${params}`, { headers });
        results.push(...(data.results || []));
        offset += 100;
        if (!data.results || data.results.length < 100 || offset >= (data.count || 0)) break;
      }
      return results;
    },
    markShipped(shopId, receiptId) {
      return fetchJson(`${API_BASE}/shops/${shopId}/receipts/${receiptId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ was_shipped: 'true' })
      });
    }
  };
}

module.exports = { SCOPES, buildAuthorizeUrl, exchangeCode, refreshAccessToken, createClient };
