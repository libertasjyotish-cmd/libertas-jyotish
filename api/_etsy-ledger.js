// Etsy 注文の台帳と OAuth トークンを Google Sheets に保存する。
// 注文は receipt_id で 1 行。ポーリングの再実行で二重生成・二重送信しないための状態を持つ。
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const STATE_TAB = process.env.GOOGLE_SHEETS_ETSY_STATE_TAB || 'Etsy設定';
const ORDER_TAB = process.env.GOOGLE_SHEETS_ETSY_ORDER_TAB || 'Etsy注文';

// 章は Cron の 1 回分ずつ生成して行に貯める（/api/pdf-report と同じ分割方式）
const REPORT_FIELDS = ['astro', 'summary', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'ch10', 'ch11', 'ch12'];
const ORDER_HEADERS = [
  'receipt_id', 'transaction_id', 'buyer_email', 'buyer_name', 'personalization',
  'dob', 'tob', 'tob_unknown', 'place', 'language',
  'status', 'attempts', 'last_error', 'created_at', 'updated_at', 'delivered_at', 'email_id', 'shipped',
  'pdf_url', 'download_url', 'delivery',
  ...REPORT_FIELDS
];

// status の遷移: new → generating → delivered / needs_info / error
// needs_info の行は運営者が dob/tob/place/language を補完して status を new に戻すと再処理される
const STATUS = {
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

async function upsertOrder(receiptId, fields) {
  const { sheet, rows } = await loadOrders();
  const id = String(receiptId);
  const nowStr = new Date().toISOString();
  const row = rows.find((r) => String(r.get('receipt_id')) === id);
  if (row) {
    for (const [key, value] of Object.entries(fields)) row.set(key, value == null ? '' : String(value));
    row.set('updated_at', nowStr);
    await row.save();
    return rowToOrder(row);
  }
  const payload = { receipt_id: id, created_at: nowStr, updated_at: nowStr, attempts: '0' };
  for (const [key, value] of Object.entries(fields)) payload[key] = value == null ? '' : String(value);
  const added = await sheet.addRow(payload);
  return rowToOrder(added);
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

module.exports = { STATUS, ORDER_HEADERS, REPORT_FIELDS, getState, setState, upsertOrder, findOrder, listOrders };
