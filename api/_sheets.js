// Google Sheets「会員データ」シートへの共通アクセス（CommonJS）
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SHEET_TITLE = process.env.GOOGLE_SHEETS_MEMBER_TAB || '会員データ';

// 直近の getMemberSheet() が失敗した理由。切り分け用に API 応答へ載せる。
let lastSheetIssue = 'none';
function getLastSheetIssue() {
  return lastSheetIssue;
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

async function getMemberSheet() {
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
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(sheetId, auth);
  try {
    await doc.loadInfo();
  } catch (err) {
    const status = err?.response?.status;
    lastSheetIssue = status ? `load_info_${status}` : 'load_info_error';
    console.error(`Google Sheets loadInfo failed (${lastSheetIssue}):`, err?.message);
    return null;
  }

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
async function setMemberStatus(email, status) {
  if (!email) return false;
  const sheet = await getMemberSheet();
  if (!sheet) return false;

  const normalized = String(email).trim().toLowerCase();
  const rows = await sheet.getRows();
  const row = rows.find(r => String(r.get('email') || '').trim().toLowerCase() === normalized);
  const nowStr = new Date().toISOString();

  if (row) {
    row.set('status', status);
    row.set('updated_at', nowStr);
    await row.save();
  } else {
    await sheet.addRow({
      email: email,
      status: status,
      auth_provider: 'stripe',
      created_at: nowStr,
      updated_at: nowStr,
      language: 'ja'
    });
  }
  return true;
}

module.exports = { getMemberSheet, setMemberStatus, getLastSheetIssue };
