// Etsy 購入者の自己受取。注文番号（receipt_id）と出生日で台帳を照合し、鑑定書の状態と
// 署名付きダウンロード URL を返す。Etsy Messages の手送りに依存せず購入者側で完結させる。
const ledger = require('./_etsy-ledger');
const storage = require('./_etsy-storage');
const { parseDate } = require('./_etsy-parse');

const CLAIM_TTL_DAYS = 7;

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (err) { return {}; }
}

function normalizeDob(raw) {
  const text = String(raw || '').trim();
  const parsed = parseDate(text) || parseDate(`${text} `);
  if (parsed && parsed.value) return parsed.value;
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? text : '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }
  const body = readBody(req);
  const receiptId = String(body.receipt || '').replace(/[^\d]/g, '');
  const dob = normalizeDob(body.dob);
  if (!receiptId || !dob) {
    res.status(400).json({ ok: false, error: 'invalid_input' });
    return;
  }
  try {
    const order = await ledger.findOrder(receiptId);
    if (!order || ledger.isWebOrder(receiptId) || String(order.dob || '') !== dob) {
      res.status(404).json({ ok: false, error: 'not_found' });
      return;
    }
    if (order.pdf_url) {
      res.status(200).json({
        ok: true,
        state: 'ready',
        product: order.product || 'natal',
        language: order.language || 'en',
        url: storage.downloadUrl(receiptId, CLAIM_TTL_DAYS)
      });
      return;
    }
    const state = order.status === ledger.STATUS.NEEDS_INFO ? 'needs_info'
      : order.status === ledger.STATUS.AWAITING_PHOTOS ? 'awaiting_photos'
        : order.status === ledger.STATUS.ERROR ? 'error'
          : 'preparing';
    res.status(200).json({ ok: true, state, product: order.product || 'natal' });
  } catch (err) {
    console.error('etsy-claim failed:', err.message);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
};
