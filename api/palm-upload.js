// 手相×出生図（カル・クンダリ）の写真アップロード。
//   GET  /api/palm-upload?t=<token>  … 注文の状態（言語・利き手・受付可否）を返す
//   POST /api/palm-upload            … { t, hand, right, left }（画像は data:image/jpeg;base64 か素の base64）
// トークンは _etsy-storage.uploadToken の署名付き文字列で、決済確定後のメール／決済戻りでのみ渡す。
// 写真は Blob に保存し、台帳を new に進めて生成キューへ。原本は納品後 30 日で削除する（_etsy-fulfill）。
const { verifyUploadToken, storePhoto } = require('./_etsy-storage');
const ledger = require('./_etsy-ledger');

const MAX_BYTES = 2.5 * 1024 * 1024;
const MIN_BYTES = 20 * 1024;
const HANDS = new Set(['right', 'left']);
const ACCEPTING = new Set([ledger.STATUS.AWAITING_PHOTOS, ledger.STATUS.NEEDS_INFO]);

module.exports.config = { api: { bodyParser: { sizeLimit: '6mb' } } };

function decodeImage(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  const m = s.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/s);
  const b64 = m ? m[2] : s;
  let buf;
  try { buf = Buffer.from(b64.replace(/\s+/g, ''), 'base64'); } catch (err) { return null; }
  if (buf.length < MIN_BYTES || buf.length > MAX_BYTES) return null;
  // クライアントは canvas で JPEG に変換して送る。それ以外は受け付けない（Chromium レンダリング時の互換のため）。
  if (!(buf[0] === 0xff && buf[1] === 0xd8)) return null;
  return buf;
}

function publicState(order) {
  return {
    ok: true,
    receipt: order.receipt_id,
    language: order.language || 'en',
    hand: order.hand || '',
    accepting: ACCEPTING.has(order.status),
    uploaded: Boolean(order.photo_right && order.photo_left),
    status: order.status
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const body = req.method === 'POST' && typeof req.body === 'object' && req.body ? req.body : {};
  const token = verifyUploadToken(req.method === 'GET' ? req.query && req.query.t : body.t);
  if (!token) return res.status(403).json({ error: 'invalid_token' });

  let order;
  try {
    order = await ledger.findOrder(token.receiptId);
  } catch (err) {
    console.error('palm-upload ledger failed:', err.message);
    return res.status(500).json({ error: 'ledger_failed' });
  }
  if (!order || order.product !== 'palm') return res.status(404).json({ error: 'order_not_found' });

  if (req.method === 'GET') return res.status(200).json(publicState(order));
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!ACCEPTING.has(order.status)) return res.status(409).json({ error: 'not_accepting', status: order.status });

  const right = decodeImage(body.right);
  const left = decodeImage(body.left);
  if (!right || !left) return res.status(400).json({ error: 'invalid_image', fields: [!right && 'right', !left && 'left'].filter(Boolean) });
  const hand = HANDS.has(body.hand) ? body.hand : (order.hand || 'right');

  try {
    const [photoRight, photoLeft] = await Promise.all([
      storePhoto(order.receipt_id, 'right', right),
      storePhoto(order.receipt_id, 'left', left)
    ]);
    await ledger.upsertOrder(order.receipt_id, {
      hand,
      photo_right: photoRight,
      photo_left: photoLeft,
      palm: '',
      photos_deleted_at: '',
      status: ledger.STATUS.NEW,
      attempts: 0,
      last_error: ''
    });
    return res.status(200).json({ ok: true, uploaded: true });
  } catch (err) {
    console.error('palm-upload failed:', err.message);
    return res.status(500).json({ error: 'upload_failed' });
  }
};
