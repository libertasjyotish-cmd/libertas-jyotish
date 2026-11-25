// Etsy 注文の台帳と OAuth トークンを Google Sheets に保存する。
// 注文は receipt_id で 1 行。ポーリングの再実行で二重生成・二重送信しないための状態を持つ。
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const sheetBlob = require('./_sheet-blob');

const STATE_TAB = process.env.GOOGLE_SHEETS_ETSY_STATE_TAB || 'Etsy設定';
const ORDER_TAB = process.env.GOOGLE_SHEETS_ETSY_ORDER_TAB || 'Etsy注文';

// 章は Cron の 1 回分ずつ生成して行に貯める（/api/pdf-report と同じ分割方式）
const REPORT_FIELDS = ['astro', 'summary', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'ch10', 'ch11', 'ch12'];
const ORDER_HEADERS = [
  'receipt_id', 'transaction_id', 'buyer_email', 'buyer_name', 'personalization',
  'dob', 'tob', 'tob_unknown', 'place', 'language',
  'product', 'relation', 'dob_b', 'tob_b', 'tob_unknown_b', 'place_b',
  'status', 'attempts', 'last_error', 'created_at', 'updated_at', 'delivered_at', 'email_id', 'shipped',
  'pdf_url', 'download_url', 'delivery',
  'hand', 'photo_right', 'photo_left', 'palm', 'upload_mailed_at', 'photos_deleted_at', 'astro_cache',
  ...REPORT_FIELDS
];
// 長文になる列。シートには Blob の参照だけを置き、処理直前に hydrateOrder で本文に戻す。
const LONG_FIELDS = [...REPORT_FIELDS, 'palm'];

// status の遷移: new → generating → delivered / needs_info / error
// サイト直販（receipt_id が web- で始まる行）は awaiting_payment で登録し、決済確定で new に進む。
// 手相×出生図（product=palm）は決済確定後 awaiting_photos で写真を待ち、アップロードで new に進む。
// needs_info の行は運営者が dob/tob/place/language を補完して status を new に戻すと再処理される
const STATUS = {
  AWAITING_PAYMENT: 'awaiting_payment',
  AWAITING_PHOTOS: 'awaiting_photos',
  REFUNDED: 'refunded',
  NEW: 'new',
  GENERATING: 'generating',
  DELIVERED: 'delivered',
  READY: 'ready',
  NEEDS_INFO: 'needs_info',
  ERROR: 'error'
};

let docPromise = null;

function normalizePrivateKey(raw) {
  let key = String(raw).trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1);
  if (!key.includes('BEGIN')) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf8');
      if (decoded.includes('BEGIN')) key = decoded;
    } catch (err) {
      // base64 ではない
    }
  }
  key = key.replace(/\\n/g, '\n');
  const pem = key.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  if (pem) {
    const body = pem[2].replace(/\s+/g, '');
    key = `-----BEGIN ${pem[1]}-----\n${(body.match(/.{1,64}/g) || []).join('\n')}\n-----END ${pem[1]}-----\n`;
  }
  return key;
}

function getDoc() {
  if (!docPromise) {
    docPromise = (async () => {
      const sheetId = process.env.GOOGLE_SHEETS_ID;
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY;
      if (!sheetId || !clientEmail || !privateKey) {
        throw new Error('GOOGLE_SHEETS_ID / GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY are required');
      }
      const auth = new JWT({
        email: clientEmail,
        key: normalizePrivateKey(privateKey),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      const doc = new GoogleSpreadsheet(sheetId, auth);
      await doc.loadInfo();
      return doc;
    })();
  }
  return docPromise;
}

async function getOrCreateSheet(title, headers) {
  const doc = await getDoc();
  const existing = doc.sheetsByTitle[title];
  if (!existing) {
    return doc.addSheet({ title, headerValues: headers, gridProperties: { rowCount: 1000, columnCount: headers.length } });
  }
  await existing.loadHeaderRow().catch(() => null);
  const current = existing.headerValues || [];
  const missing = headers.filter((h) => !current.includes(h));
  if (missing.length) {
    const next = [...current, ...missing];
    if ((existing.columnCount || 0) < next.length) await existing.resize({ rowCount: existing.rowCount, columnCount: next.length });
    await existing.setHeaderRow(next);
  }
  return existing;
}

// --- OAuth トークン（key/value） ---
async function getState() {
  const sheet = await getOrCreateSheet(STATE_TAB, ['key', 'value', 'updated_at']);
  const rows = await sheet.getRows();
  const state = {};
  for (const row of rows) state[row.get('key')] = row.get('value') || '';
  return state;
}

async function setState(entries) {
  const sheet = await getOrCreateSheet(STATE_TAB, ['key', 'value', 'updated_at']);
  const rows = await sheet.getRows();
  const nowStr = new Date().toISOString();
  for (const [key, value] of Object.entries(entries)) {
    const row = rows.find((r) => r.get('key') === key);
    if (row) {
      row.set('value', String(value));
      row.set('updated_at', nowStr);
      await row.save();
    } else {
      await sheet.addRow({ key, value: String(value), updated_at: nowStr });
    }
  }
}

// --- 注文台帳 ---
async function loadOrders() {
  const sheet = await getOrCreateSheet(ORDER_TAB, ORDER_HEADERS);
  const rows = await sheet.getRows();
  return { sheet, rows };
}

function rowToOrder(row) {
  const out = {};
  for (const h of ORDER_HEADERS) out[h] = row.get(h) || '';
  out.attempts = Number(out.attempts || 0);
  return out;
}

async function toCellValues(id, fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    const text = value == null ? '' : String(value);
    out[key] = LONG_FIELDS.includes(key) ? await sheetBlob.externalize(text, `sheets/etsy/${id}`) : text;
  }
  return out;
}

async function upsertOrder(receiptId, fields) {
  const { sheet, rows } = await loadOrders();
  const id = String(receiptId);
  const nowStr = new Date().toISOString();
  const values = await toCellValues(id, fields);
  const row = rows.find((r) => String(r.get('receipt_id')) === id);
  if (row) {
    const before = Object.keys(values).map((key) => row.get(key) || '');
    for (const [key, value] of Object.entries(values)) row.set(key, value);
    row.set('updated_at', nowStr);
    await row.save();
    await sheetBlob.deleteReplaced(before, Object.values(values));
    return rowToOrder(row);
  }
  const payload = { receipt_id: id, created_at: nowStr, updated_at: nowStr, attempts: '0', ...values };
  const added = await sheet.addRow(payload);
  return rowToOrder(added);
}

// Blob 参照になっている長文列を本文に戻す（章の生成・PDF 化の直前に 1 件だけ呼ぶ）
async function hydrateOrder(order) {
  const out = { ...order };
  await Promise.all(LONG_FIELDS.map(async (field) => { out[field] = await sheetBlob.resolve(order[field]); }));
  return out;
}

// 既存行の長文セルを Blob に移す。冪等で、1 回あたり maxRows 行まで（Cron ごとに少しずつ進む）。
async function externalizeLongCells({ maxRows = 20 } = {}) {
  const { rows } = await loadOrders();
  let moved = 0;
  for (const row of rows) {
    if (moved >= maxRows) break;
    const id = String(row.get('receipt_id') || '');
    const long = LONG_FIELDS.filter((f) => {
      const v = row.get(f) || '';
      return v.length > sheetBlob.MAX_INLINE_CHARS && !sheetBlob.isRef(v);
    });
    if (!id || !long.length) continue;
    for (const field of long) row.set(field, await sheetBlob.externalize(row.get(field), `sheets/etsy/${id}`));
    await row.save();
    moved += 1;
  }
  return moved;
}

async function findOrder(receiptId) {
  const { rows } = await loadOrders();
  const row = rows.find((r) => String(r.get('receipt_id')) === String(receiptId));
  return row ? rowToOrder(row) : null;
}

async function listOrders() {
  const { rows } = await loadOrders();
  return rows.map(rowToOrder);
}

const WEB_PREFIX = 'web-';
const isWebOrder = (receiptId) => String(receiptId).startsWith(WEB_PREFIX);

// サイト直販の決済確定: awaiting_payment の行だけ new に進める（return と Webhook の両方から呼ばれても一度だけ）。
async function confirmWebOrder(orderId) {
  if (!isWebOrder(orderId)) return 'not_web_order';
  const order = await findOrder(orderId);
  if (!order) return 'not_found';
  if (order.status !== STATUS.AWAITING_PAYMENT) return 'already_confirmed';
  const next = order.product === 'palm' ? STATUS.AWAITING_PHOTOS : STATUS.NEW;
  await upsertOrder(orderId, { status: next, last_error: '' });
  const names = { yearly: '年間運勢', career: '仕事運・金運・天職', palm: '手相×出生図', compat: '相性', karma: 'カルマとダルマ' };
  await require('./_owner-mail').notifySale(`${names[order.product] || order.product} 鑑定書の購入`, [
    `email: ${order.buyer_email}`, `product: ${order.product}`, `order: ${orderId}`,
    `via: ${order.personalization || ''}`, `language: ${order.language || ''}`
  ]);
  return 'confirmed';
}

// 返金・不正判定: 生成途中なら止め、納品済みなら台帳に記録だけ残す（ダウンロード URL の失効は手動）。
async function refundWebOrder(orderId) {
  if (!isWebOrder(orderId)) return 'not_web_order';
  const order = await findOrder(orderId);
  if (!order) return 'not_found';
  await upsertOrder(orderId, { status: STATUS.REFUNDED, last_error: `refunded (was ${order.status})` });
  return 'refunded';
}

module.exports = { STATUS, WEB_PREFIX, isWebOrder, confirmWebOrder, refundWebOrder, ORDER_HEADERS, REPORT_FIELDS, getState, setState, upsertOrder, findOrder, listOrders, hydrateOrder, externalizeLongCells };
