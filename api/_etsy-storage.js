// 生成した鑑定書 PDF の保管（Vercel Blob）と、購入者に渡す期限付きダウンロード URL。
// Etsy API は購入者メールを返さないことがあるため、メール添付の代わりにリンクで納品できるようにする。
// Blob のパス名は推測不能な乱数を含め、公開 URL は台帳にのみ保存する。購入者には署名付きの自サイト URL だけを渡す。
const crypto = require('crypto');

const BLOB_API = 'https://blob.vercel-storage.com';
const LINK_TTL_DAYS = Number(process.env.ETSY_DOWNLOAD_TTL_DAYS || 90);
const SITE = (process.env.SITE_URL || 'https://www.libertas-jyotish.com').replace(/\/$/, '');

function signingKey() {
  const key = process.env.ETSY_DOWNLOAD_SECRET || process.env.CRON_SECRET;
  if (!key) throw new Error('ETSY_DOWNLOAD_SECRET (or CRON_SECRET) is not set');
  return key;
}

function sign(payload) {
  return crypto.createHmac('sha256', signingKey()).update(payload).digest('base64url');
}

async function storePdf(receiptId, filename, pdf) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  const nonce = crypto.randomBytes(16).toString('hex');
  const pathname = `etsy/${receiptId}/${nonce}/${filename}`;
  const res = await fetch(`${BLOB_API}/${pathname}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'x-api-version': '7',
      'x-content-type': 'application/pdf',
      'x-add-random-suffix': '0',
      'x-cache-control-max-age': '31536000'
    },
    body: pdf
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Blob ${res.status}: ${data.error?.message || data.message || 'upload failed'}`);
  return data.url;
}

// 購入者向け URL。t = receipt_id.expires(epoch秒).signature
function downloadUrl(receiptId, ttlDays = LINK_TTL_DAYS) {
  const expires = Math.floor(Date.now() / 1000) + ttlDays * 86400;
  const payload = `${receiptId}.${expires}`;
  return `${SITE}/api/etsy-download?t=${payload}.${sign(payload)}`;
}

// 戻り値: { receiptId } | null（不正・期限切れ）
function verifyToken(t) {
  const m = String(t || '').match(/^(\d+)\.(\d+)\.([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  const [, receiptId, expires, sig] = m;
  const expected = sign(`${receiptId}.${expires}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(expires) * 1000 < Date.now()) return null;
  return { receiptId };
}

module.exports = { storePdf, downloadUrl, verifyToken, LINK_TTL_DAYS };
