// Google Sheets「会員データ」シートへの共通アクセス（CommonJS）
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SHEET_TITLE = process.env.GOOGLE_SHEETS_MEMBER_TAB || '会員データ';

// 直近の getMemberSheet() が失敗した理由。切り分け用に API 応答へ載せる。
let lastSheetIssue = 'none';
function getLastSheetIssue() {
  return lastSheetIssue;
}

// Vercel の環境変数に貼られた鍵は、囲みクォート付き・\n エスケープ・base64 のいずれもあり得る
function normalizePrivateKey(raw) {
  let key = String(raw).trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  if (!key.includes('BEGIN')) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf8');
      if (decoded.includes('BEGIN')) key = decoded;
    } catch (err) {
      // base64 ではない
    }
  }
  key = key.replace(/\\n/g, '\n');

  // 改行が空白に潰れて貼られていても復元できるよう、PEM を組み立て直す
  const pem = key.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  if (pem) {
    const body = pem[2].replace(/\s+/g, '');
    const wrapped = body.match(/.{1,64}/g) || [];
    key = `-----BEGIN ${pem[1]}-----\n${wrapped.join('\n')}\n-----END ${pem[1]}-----\n`;
  }
  return key;
}

async function findSheetWithMemberHeaders(sheets) {
  for (const s of sheets) {
    try {
      await s.loadHeaderRow();
      const headers = s.headerValues || [];
      if (headers.includes('email') && headers.includes('status')) return s;
    } catch (err) {
      // ヘッダー行が空のシートは対象外
    }
  }
  return null;
}

async function getSpreadsheet() {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  lastSheetIssue = 'none';

  const missing = [];
  if (!sheetId) missing.push('GOOGLE_SHEETS_ID');
  if (!clientEmail) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  if (!privateKey) missing.push('GOOGLE_PRIVATE_KEY');
  if (missing.length) {
    lastSheetIssue = `env_missing:${missing.join(',')}`;
    console.warn(`Google credentials missing: ${missing.join(', ')}`);
    return null;
  }

  const auth = new JWT({
    email: clientEmail,
    key: normalizePrivateKey(privateKey),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(sheetId, auth);
  try {
    await doc.loadInfo();
  } catch (err) {
    const status = err?.response?.status;
    const code = String(err?.message || 'unknown')
      .replace(/[^a-zA-Z0-9 _:.-]/g, '')
      .slice(0, 60);
    lastSheetIssue = status ? `load_info_${status}` : `load_info_error:${code}`;
    console.error(`Google Sheets loadInfo failed (${lastSheetIssue}):`, err?.message);
    return null;
  }
  return doc;
}

async function getMemberSheet() {
  const doc = await getSpreadsheet();
  if (!doc) return null;

  const wanted = SHEET_TITLE.trim().toLowerCase();
  const sheets = doc.sheetsByIndex;
  const sheet =
    doc.sheetsByTitle[SHEET_TITLE] ||
    sheets.find(s => String(s.title || '').trim().toLowerCase() === wanted) ||
    // タブ名が違っていても、email/status 列を持つシートなら会員データとみなす
    (await findSheetWithMemberHeaders(sheets)) ||
    null;

  if (!sheet) {
    lastSheetIssue = 'tab_not_found';
    console.warn(
      `'${SHEET_TITLE}' sheet not found. Available tabs: ${sheets.map(s => s.title).join(', ')}`
    );
    return null;
  }
  return sheet;
}

// 決済完了時などにステータスのみを更新する。行が無ければ最小限の行を作成する。
// customerId を渡すと、解約時に顧客IDから会員行を引けるよう記録する。
async function setMemberStatus(email, status, customerId) {
  if (!email) return false;
  const sheet = await getMemberSheet();
  if (!sheet) return false;
  if (customerId) await ensureColumns(sheet, ['stripe_customer_id']);

  const normalized = String(email).trim().toLowerCase();
  const rows = await sheet.getRows();
  const row = rows.find(r => String(r.get('email') || '').trim().toLowerCase() === normalized);
  const nowStr = new Date().toISOString();

  if (row) {
    row.set('status', status);
    if (customerId) row.set('stripe_customer_id', customerId);
    row.set('updated_at', nowStr);
    await row.save();
  } else {
    await sheet.addRow({
      email: email,
      status: status,
      auth_provider: 'stripe',
      stripe_customer_id: customerId || '',
      created_at: nowStr,
      updated_at: nowStr,
      language: 'ja'
    });
  }
  return true;
}

// サブスク解約時に有料権限を外す。買い切り（pdf_purchased）は購入済みの権利なので残す。
// 解約イベントにメールが含まれないことがあるため、顧客IDでも会員行を引けるようにする。
async function downgradeMember({ email, customerId }) {
  const sheet = await getMemberSheet();
  if (!sheet) return { updated: false, reason: 'sheet_unavailable' };

  const normalizedEmail = normalizeEmail(email);
  const normalizedCustomer = String(customerId || '').trim();
  const rows = await sheet.getRows();
  const row =
    (normalizedCustomer
      ? rows.find(r => String(r.get('stripe_customer_id') || '').trim() === normalizedCustomer)
      : null) ||
    (normalizedEmail ? rows.find(r => normalizeEmail(r.get('email')) === normalizedEmail) : null);

  if (!row) return { updated: false, reason: 'member_not_found' };
  if (String(row.get('status') || '').trim().toLowerCase() !== 'paid') {
    return { updated: true, reason: 'already_free' };
  }

  row.set('status', 'free');
  row.set('updated_at', new Date().toISOString());
  await row.save();
  return { updated: true, reason: 'downgraded' };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function findMemberRow(email) {
  const sheet = await getMemberSheet();
  if (!sheet) return null;
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const rows = await sheet.getRows();
  const matched = rows.filter(r => normalizeEmail(r.get('email')) === normalized);
  return matched.find(r => String(r.get('status') || '').trim().toLowerCase() === 'paid') || matched[0] || null;
}

// 会員行の生データ（PDF購入フラグの判定に使う）
async function getMemberRecord(email) {
  const row = await findMemberRow(email);
  if (!row) return null;
  return {
    email: row.get('email'),
    status: String(row.get('status') || 'free').trim().toLowerCase(),
    dob: row.get('dob') || '',
    tob: row.get('tob') || '',
    city: row.get('city') || '',
    language: row.get('language') || 'ja',
    pdfPurchased: String(row.get('pdf_purchased') || '').trim().toLowerCase() === 'true',
    pdfPurchasedAt: row.get('pdf_purchased_at') || ''
  };
}

// PDF購入用の列が無いシートでも動くよう、必要なヘッダーを足しておく
async function ensureColumns(sheet, columns) {
  await sheet.loadHeaderRow().catch(() => null);
  const headers = sheet.headerValues || [];
  const missing = columns.filter(c => !headers.includes(c));
  if (missing.length) await sheet.setHeaderRow([...headers, ...missing]);
}

// 買い切り決済（mode=payment）の完了を記録する。会員行が無ければ最小限の行を作る。
async function setPdfPurchased(email) {
  if (!email) return false;
  const sheet = await getMemberSheet();
  if (!sheet) return false;
  await ensureColumns(sheet, ['pdf_purchased', 'pdf_purchased_at']);

  const nowStr = new Date().toISOString();
  const row = await findMemberRow(email);
  if (row) {
    row.set('pdf_purchased', 'true');
    row.set('pdf_purchased_at', nowStr);
    row.set('updated_at', nowStr);
    await row.save();
  } else {
    await sheet.addRow({
      email: email,
      status: 'free',
      auth_provider: 'stripe',
      pdf_purchased: 'true',
      pdf_purchased_at: nowStr,
      created_at: nowStr,
      updated_at: nowStr,
      language: 'ja'
    });
  }
  return true;
}

// 鑑定書は1セルに収まらないため、専用タブに章ごとの列で保存する。
const REPORT_SHEET_TITLE = process.env.GOOGLE_SHEETS_REPORT_TAB || 'PDF鑑定書';
const CELL_LIMIT = 45000; // Google Sheets の1セル上限（50,000文字）に対する安全域
const CHUNKS_PER_FIELD = 2;
const REPORT_FIELDS = [
  'astro', 'summary', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6',
  'ch7', 'ch8', 'ch9', 'ch10', 'ch11', 'ch12'
];

function reportHeaders() {
  const headers = ['email', 'updated_at'];
  for (const field of REPORT_FIELDS) {
    for (let i = 1; i <= CHUNKS_PER_FIELD; i += 1) headers.push(`${field}_${i}`);
  }
  return headers;
}

async function getReportSheet() {
  const doc = await getSpreadsheet();
  if (!doc) return null;
  const existing = doc.sheetsByTitle[REPORT_SHEET_TITLE];
  if (existing) {
    await existing.loadHeaderRow().catch(() => null);
    const headers = existing.headerValues || [];
    const missing = reportHeaders().filter(h => !headers.includes(h));
    if (missing.length) {
      const next = [...headers, ...missing];
      if ((existing.columnCount || 0) < next.length) await existing.resize({ rowCount: existing.rowCount, columnCount: next.length });
      await existing.setHeaderRow(next);
    }
    return existing;
  }
  const headerValues = reportHeaders();
  return doc.addSheet({
    title: REPORT_SHEET_TITLE,
    headerValues,
    gridProperties: { rowCount: 1000, columnCount: headerValues.length }
  });
}

function writeChunks(target, field, value) {
  const text = value == null ? '' : String(value);
  for (let i = 0; i < CHUNKS_PER_FIELD; i += 1) {
    target[`${field}_${i + 1}`] = text.slice(i * CELL_LIMIT, (i + 1) * CELL_LIMIT);
  }
  if (text.length > CELL_LIMIT * CHUNKS_PER_FIELD) {
    console.warn(`Report field ${field} exceeds storage capacity (${text.length} chars) and was truncated.`);
  }
}

function readChunks(row, field) {
  let text = '';
  for (let i = 1; i <= CHUNKS_PER_FIELD; i += 1) text += row.get(`${field}_${i}`) || '';
  return text;
}

// 保存済みの鑑定書を取得する（再訪時に再生成しないため）
async function getPdfReport(email) {
  const sheet = await getReportSheet();
  if (!sheet) return null;
  const normalized = normalizeEmail(email);
  const rows = await sheet.getRows();
  const row = rows.find(r => normalizeEmail(r.get('email')) === normalized);
  if (!row) return null;

  const report = { updated_at: row.get('updated_at') || '' };
  for (const field of REPORT_FIELDS) {
    const text = readChunks(row, field);
    if (!text) continue;
    try {
      report[field] = JSON.parse(text);
    } catch (err) {
      console.warn(`Stored report field ${field} is not valid JSON, ignoring.`);
    }
  }
  return report;
}

// 章単位で追記保存する。既存の章は保持し、渡された章だけ更新する。
async function savePdfReport(email, partial) {
  const sheet = await getReportSheet();
  if (!sheet) return false;
  const normalized = normalizeEmail(email);
  const rows = await sheet.getRows();
  const row = rows.find(r => normalizeEmail(r.get('email')) === normalized);
  const nowStr = new Date().toISOString();

  if (row) {
    row.set('updated_at', nowStr);
    for (const field of REPORT_FIELDS) {
      if (!(field in partial)) continue;
      const chunks = {};
      writeChunks(chunks, field, JSON.stringify(partial[field]));
      for (const [key, value] of Object.entries(chunks)) row.set(key, value);
    }
    await row.save();
    return true;
  }

  const payload = { email: email, updated_at: nowStr };
  for (const field of REPORT_FIELDS) {
    writeChunks(payload, field, field in partial ? JSON.stringify(partial[field]) : '');
  }
  await sheet.addRow(payload);
  return true;
}

module.exports = {
  getMemberSheet,
  setMemberStatus,
  downgradeMember,
  getLastSheetIssue,
  getMemberRecord,
  setPdfPurchased,
  getPdfReport,
  savePdfReport,
  REPORT_FIELDS
};
