// メール認証を通過した端末に発行するセッション（CommonJS）
// 形式: <expiry(ms)>:<hmac(email:expiry)>
// 購入者限定コンテンツは、クライアントの申告ではなくこのセッションで本人確認する。
const crypto = require('crypto');

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function issueSession(email) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !email) return null;
  const expiry = Date.now() + SESSION_TTL_MS;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${String(email).trim().toLowerCase()}:${expiry}`)
    .digest('hex');
  return `${expiry}:${signature}`;
}

function verifySession(email, session) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !email || !session) return false;

  const [expiryStr, signature] = String(session).split(':');
  const expiry = parseInt(expiryStr, 10);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${String(email).trim().toLowerCase()}:${expiry}`)
    .digest('hex');
  const actualBuf = Buffer.from(String(signature || ''), 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

module.exports = { issueSession, verifySession };
