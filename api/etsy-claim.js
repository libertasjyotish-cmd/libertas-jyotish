// Etsy 購入者の自己受取。注文番号（receipt_id）と出生日で台帳を照合し、鑑定書の状態と
// 署名付きダウンロード URL を返す。Etsy Messages の手送りに依存せず購入者側で完結させる。
// 出生データが読めなかった注文（needs_info）は、購入者がこの API 経由で不足分を補完すると
// 台帳を更新して自動的に生成を再開する（Etsy はこちらから購入者へ連絡する手段が無いため）。
const ledger = require('./_etsy-ledger');
const storage = require('./_etsy-storage');
const { parseDate } = require('./_etsy-parse');
const { normalizeLang } = require('./_terms');
const { geocodeBirthPlace } = require('./_geocode');

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

function normalizeTob(raw) {
  const m = String(raw || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m || +m[1] > 23 || +m[2] > 59) return '';
  return `${String(+m[1]).padStart(2, '0')}:${m[2]}`;
}

function clean(raw, max = 120) {
  return String(raw || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

// 補完が必要な項目。値が空のもの＋地名検索に失敗した出生地。
function missingFields(order) {
  const compat = order.product === 'compat';
  const missing = [];
  if (!order.dob) missing.push('dob');
  if (!order.tob && order.tob_unknown !== 'true') missing.push('tob');
  if (!order.place || /^unknown_birthplace/.test(order.last_error || '')) missing.push('place');
  if (compat) {
    if (!order.dob_b) missing.push('dob_b');
    if (!order.tob_b && order.tob_unknown_b !== 'true') missing.push('tob_b');
    if (!order.place_b || /unknown_birthplace/.test(order.last_error || '')) missing.push('place_b');
  }
  return missing;
}

function fieldsOf(order) {
  return {
    dob: order.dob || '',
    tob: order.tob || '',
    tob_unknown: order.tob_unknown === 'true',
    place: order.place || '',
    language: order.language || 'en',
    dob_b: order.dob_b || '',
    tob_b: order.tob_b || '',
    tob_unknown_b: order.tob_unknown_b === 'true',
    place_b: order.place_b || ''
  };
}

function stateOf(order) {
  if (order.pdf_url) return 'ready';
  if (order.status === ledger.STATUS.NEEDS_INFO) return 'needs_info';
  if (order.status === ledger.STATUS.AWAITING_PHOTOS) return 'awaiting_photos';
  if (order.status === ledger.STATUS.ERROR) return 'error';
  return 'preparing';
}

function respond(res, receiptId, order) {
  const state = stateOf(order);
  const product = order.product || 'natal';
  const language = normalizeLang(order.language || 'en');
  const out = { ok: true, state, product, language };
  if (state === 'ready') out.url = storage.downloadUrl(receiptId, CLAIM_TTL_DAYS);
  if (state === 'needs_info') {
    out.missing = missingFields(order);
    out.fields = fieldsOf(order);
    out.place_unresolved = /^unknown_birthplace/.test(order.last_error || '');
  }
  if (state === 'awaiting_photos') out.upload = storage.uploadUrl(receiptId, language);
  res.status(200).json(out);
}

// 購入者が送った補完データを台帳に反映し、生成キューに戻す
function completion(body, order) {
  const compat = order.product === 'compat';
  const f = body.fields && typeof body.fields === 'object' ? body.fields : {};
  const dob = normalizeDob(f.dob) || order.dob || '';
  const tobUnknown = f.tob_unknown === true || f.tob_unknown === 'true';
  const tob = tobUnknown ? '12:00' : normalizeTob(f.tob) || order.tob || '';
  const place = clean(f.place) || order.place || '';
  const language = f.language ? normalizeLang(f.language) : normalizeLang(order.language || 'en');
  const update = { dob, tob, tob_unknown: tobUnknown ? 'true' : 'false', place, language };
  const errors = [];
  if (!dob) errors.push('dob');
  if (!tob) errors.push('tob');
  if (!place) errors.push('place');
  if (compat) {
    const dobB = normalizeDob(f.dob_b) || order.dob_b || '';
    const tobUnknownB = f.tob_unknown_b === true || f.tob_unknown_b === 'true';
    const tobB = tobUnknownB ? '12:00' : normalizeTob(f.tob_b) || order.tob_b || '';
    const placeB = clean(f.place_b) || order.place_b || '';
    Object.assign(update, { dob_b: dobB, tob_b: tobB, tob_unknown_b: tobUnknownB ? 'true' : 'false', place_b: placeB });
    if (!dobB) errors.push('dob_b');
    if (!tobB) errors.push('tob_b');
    if (!placeB) errors.push('place_b');
  }
  return { update, errors };
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
    // 出生日が読めなかった注文は台帳側が空なので、注文番号だけで照合し入力された出生日を採る
    const dobOpen = !order?.dob && order?.status === ledger.STATUS.NEEDS_INFO;
    if (!order || ledger.isWebOrder(receiptId) || (!dobOpen && String(order.dob || '') !== dob)) {
      res.status(404).json({ ok: false, error: 'not_found' });
      return;
    }
    if (body.action === 'complete') {
      if (order.status !== ledger.STATUS.NEEDS_INFO) {
        respond(res, receiptId, order);
        return;
      }
      const { update, errors } = completion({ ...body, fields: { ...(body.fields || {}), dob: body.fields?.dob || dob } }, order);
      if (errors.length) {
        res.status(400).json({ ok: false, error: 'missing_fields', missing: errors });
        return;
      }
      // 出生地はこの場で地図検索し、見つからなければ即座に再入力を求める（cron 待ちで往復させない）
      const unresolved = [];
      const placeChecks = [['place', update.place]];
      if (order.product === 'compat') placeChecks.push(['place_b', update.place_b]);
      for (const [key, value] of placeChecks) {
        if (!(await geocodeBirthPlace(value, update.language))) unresolved.push({ field: key, value });
      }
      if (unresolved.length) {
        res.status(400).json({ ok: false, error: 'place_not_found', missing: unresolved.map((u) => u.field), places: unresolved.map((u) => u.value) });
        return;
      }
      const status = order.product === 'palm' && (!order.photo_right || !order.photo_left) ? ledger.STATUS.AWAITING_PHOTOS : ledger.STATUS.NEW;
      const saved = await ledger.upsertOrder(receiptId, { ...update, status, attempts: 0, last_error: '' });
      respond(res, receiptId, saved || { ...order, ...update, status });
      return;
    }
    respond(res, receiptId, order);
  } catch (err) {
    console.error('etsy-claim failed:', err.message);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
};
