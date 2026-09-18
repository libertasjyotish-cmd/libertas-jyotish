// 生成した鑑定書 PDF の保管（Vercel Blob）と、購入者に渡す期限付きダウンロード URL。
// Etsy API は購入者メールを返さないことがあるため、メール添付の代わりにリンクで納品できるようにする。
// Blob のパス名は推測不能な乱数を含め、公開 URL は台帳にのみ保存する。購入者には署名付きの自サイト URL だけを渡す。
const crypto = require('crypto');

const BLOB_API = 'https://blob.vercel-storage.com';
const LINK_TTL_DAYS = Number(process.env.ETSY_DOWNLOAD_TTL_DAYS || 90);
const UPLOAD_TTL_DAYS = 60;
const SITE = (process.env.SITE_URL || 'https://www.libertas-jyotish.com').replace(/\/$/, '');

function signingKey() {
  const key = process.env.ETSY_DOWNLOAD_SECRET || process.env.CRON_SECRET;
  if (!key) throw new Error('ETSY_DOWNLOAD_SECRET (or CRON_SECRET) is not set');
  return key;
}

function sign(payload) {
  return crypto.createHmac('sha256', signingKey()).update(payload).digest('base64url');
}

function blobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  return token;
}

async function putBlob(pathname, body, contentType) {
  const res = await fetch(`${BLOB_API}/${pathname}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${blobToken()}`,
      'x-api-version': '7',
      'x-content-type': contentType,
      'x-add-random-suffix': '0',
      'x-cache-control-max-age': '31536000'
    },
    body
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Blob ${res.status}: ${data.error?.message || data.message || 'upload failed'}`);
  return data.url;
}

async function storePdf(receiptId, filename, pdf) {
  const nonce = crypto.randomBytes(16).toString('hex');
  return putBlob(`etsy/${receiptId}/${nonce}/${filename}`, pdf, 'application/pdf');
}

// 手相写真（JPEG）。鑑定後 30 日で deleteBlobs で消す。
async function storePhoto(receiptId, side, jpeg) {
  const nonce = crypto.randomBytes(16).toString('hex');
  return putBlob(`palm/${receiptId}/${nonce}/${side}.jpg`, jpeg, 'image/jpeg');
}

async function deleteBlobs(urls) {
  const targets = urls.filter(Boolean);
  if (!targets.length) return;
  const res = await fetch(`${BLOB_API}/delete`, {
    method: 'POST',
    headers: { authorization: `Bearer ${blobToken()}`, 'x-api-version': '7', 'content-type': 'application/json' },
    body: JSON.stringify({ urls: targets })
  });
  if (!res.ok) throw new Error(`Blob delete ${res.status}`);
}

// 購入者向け URL。t = receipt_id.expires(epoch秒).signature
function downloadUrl(receiptId, ttlDays = LINK_TTL_DAYS) {
  const expires = Math.floor(Date.now() / 1000) + ttlDays * 86400;
  const payload = `${receiptId}.${expires}`;
  return `${SITE}/api/etsy-download?t=${payload}.${sign(payload)}`;
}

// 戻り値: { receiptId } | null（不正・期限切れ）
function verifyToken(t) {
  const m = String(t || '').match(/^([\w-]+)\.(\d+)\.([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  const [, receiptId, expires, sig] = m;
  const expected = sign(`${receiptId}.${expires}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(expires) * 1000 < Date.now()) return null;
  return { receiptId };
}

// 手相写真のアップロード画面への URL。t = up.receipt_id.expires.signature（ダウンロード用とは接頭語で区別）
function uploadToken(receiptId, ttlDays = UPLOAD_TTL_DAYS) {
  const expires = Math.floor(Date.now() / 1000) + ttlDays * 86400;
  const payload = `up.${receiptId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function uploadUrl(receiptId, lang = 'en') {
  return `${SITE}/${lang}/palm-upload?t=${uploadToken(receiptId)}`;
}

function verifyUploadToken(t) {
  const m = String(t || '').match(/^up\.([\w-]+)\.(\d+)\.([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  const [, receiptId, expires, sig] = m;
  const expected = sign(`up.${receiptId}.${expires}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(expires) * 1000 < Date.now()) return null;
  return { receiptId };
}

module.exports = { storePdf, storePhoto, deleteBlobs, downloadUrl, verifyToken, uploadToken, uploadUrl, verifyUploadToken, LINK_TTL_DAYS, UPLOAD_TTL_DAYS };
