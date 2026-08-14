// Google Sheets「会員データ」シートへの共通アクセス（CommonJS）
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SHEET_TITLE = process.env.GOOGLE_SHEETS_MEMBER_TAB || '会員データ';

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

  if (!sheetId || !clientEmail || !privateKey) {
    console.warn('Google credentials missing. Skipping spreadsheet access.');
    return null;
  }

  const auth = new JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(sheetId, auth);
  await doc.loadInfo();

  const wanted = SHEET_TITLE.trim().toLowerCase();
  const sheets = doc.sheetsByIndex;
  const sheet =
    doc.sheetsByTitle[SHEET_TITLE] ||
    sheets.find(s => String(s.title || '').trim().toLowerCase() === wanted) ||
    // タブ名が違っていても、email/status 列を持つシートなら会員データとみなす
    (await findSheetWithMemberHeaders(sheets)) ||
    null;

  if (!sheet) {
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

module.exports = { getMemberSheet, setMemberStatus };
