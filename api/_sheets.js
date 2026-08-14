// Google Sheets「会員データ」シートへの共通アクセス（CommonJS）
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SHEET_TITLE = '会員データ';

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
  const sheet = doc.sheetsByTitle[SHEET_TITLE];
  if (!sheet) {
    console.warn(`'${SHEET_TITLE}' sheet not found in spreadsheet.`);
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
