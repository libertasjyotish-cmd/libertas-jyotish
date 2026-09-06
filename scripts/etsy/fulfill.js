// Etsy 注文の自動処理（GitHub Actions から定期実行）。
//   注文取得 → パーソナライズ解析 → 天体計算・章生成（既存 api/ モジュール）→ PDF → Resend で送付 → Etsy 注文を完了に更新
// 台帳（Google Sheets）で receipt_id ごとの状態を持ち、再実行しても二重生成・二重送信しない。
//
// 使い方:
//   node scripts/etsy/fulfill.js                 本番（Etsy から注文を取得）
//   node scripts/etsy/fulfill.js --receipts=path.json --out=dir --no-mail --no-sheets
//                                                ローカル検証（注文 JSON を与え、PDF をファイル出力）
const fs = require('fs');
const path = require('path');
const { fetchReportData } = require('../../api/_astrology');
const { listGeminiModels } = require('../../api/_gemini');
const { CHAPTER_IDS, generateChapters } = require('../../api/_report');
const { normalizeLang } = require('../../api/_terms');
const { geocodeBirthPlace } = require('../../api/_geocode');
const etsy = require('./_api');
const ledger = require('./_ledger');
const { parsePersonalization } = require('./_parse');
const { renderReportPdf } = require('./_pdf');
const mail = require('./_mail');

const CHAPTERS_PER_BATCH = 4;
const MAX_GENERATION_ROUNDS = 3;
const MAX_ATTEMPTS = 3;
const GENERATING_STALE_MS = 30 * 60 * 1000;

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const options = {
  receiptsFile: typeof args.receipts === 'string' ? args.receipts : null,
  outDir: typeof args.out === 'string' ? args.out : null,
  mail: !args['no-mail'],
  sheets: !args['no-sheets'],
  etsy: !args.receipts,
  gemini: !args['mock-report']
};

const log = (...parts) => console.log(new Date().toISOString(), ...parts);

// --no-sheets 時はメモリ上の台帳で代替する（ローカル検証用）
const memoryLedger = new Map();
const store = {
  async getState() { return options.sheets ? ledger.getState() : {}; },
  async setState(entries) { if (options.sheets) await ledger.setState(entries); },
  async findOrder(id) { return options.sheets ? ledger.findOrder(id) : memoryLedger.get(String(id)) || null; },
  async upsertOrder(id, fields) {
    if (options.sheets) return ledger.upsertOrder(id, fields);
    const prev = memoryLedger.get(String(id)) || { receipt_id: String(id), attempts: 0 };
    const next = { ...prev, ...fields, updated_at: new Date().toISOString() };
    memoryLedger.set(String(id), next);
    return next;
  }
};

function personalizationOf(receipt) {
  const parts = [];
  for (const tx of receipt.transactions || []) {
    if (tx.personalization) parts.push(tx.personalization);
    for (const v of tx.variations || []) {
      if (/personali[sz]ation/i.test(v.formatted_name || '') || v.property_id === 54) parts.push(v.formatted_value);
    }
  }
  if (!parts.length && receipt.message_from_buyer) parts.push(receipt.message_from_buyer);
  return parts.filter(Boolean).join('\n');
}

// 台帳に手入力された値（needs_info の後に運営者が補完したもの）を優先する
function resolveBirthData(receipt, order) {
  const personalization = personalizationOf(receipt);
  const parsed = parsePersonalization(personalization);
  const manual = order && (order.dob || order.place);
  return {
    personalization,
    dob: (order && order.dob) || parsed.dob,
    tob: (order && order.tob) || parsed.tob || (manual ? '12:00' : null),
    tobUnknown: order && order.tob_unknown ? order.tob_unknown === 'true' : parsed.tobUnknown || (manual && !(order && order.tob)),
    place: (order && order.place) || parsed.place,
    language: normalizeLang((order && order.language) || parsed.language || 'en'),
    missing: manual ? ['dob', 'place'].filter((k) => !((order && order[k]) || parsed[k])) : parsed.missing,
    notes: manual ? [] : parsed.notes
  };
}

async function generateReport({ dob, tob, place, language }) {
  const geo = await geocodeBirthPlace(place, language);
  if (!geo) throw Object.assign(new Error(`unknown_birthplace: ${place}`), { needsInfo: 'place' });

  const astro = await fetchReportData({ dob, tob, lat: geo.lat, lon: geo.lon, lang: language });
  astro.city = place;
  astro.geo_precision = geo.precision;
  if (geo.notice) astro.geo_notice = geo.notice;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : await listGeminiModels(apiKey);

  const chapters = {};
  let missing = [...CHAPTER_IDS];
  for (let round = 0; round < MAX_GENERATION_ROUNDS && missing.length; round += 1) {
    for (let i = 0; i < missing.length; i += CHAPTERS_PER_BATCH) {
      const batch = missing.slice(i, i + CHAPTERS_PER_BATCH);
      const result = await generateChapters(astro, batch, apiKey, models, { lang: language, timeoutMs: 60000 });
      Object.assign(chapters, result.chapters);
      if (result.failed.length) log(`  round ${round + 1}: ${result.failed.map((f) => `${f.id}(${f.reason})`).join(', ')} failed`);
    }
    missing = CHAPTER_IDS.filter((id) => !chapters[id]);
  }
  if (missing.length) throw new Error(`chapters_incomplete: ${missing.join(',')}`);
  return { astro, chapters };
}

const REVIEW_PAGE = `
  <h2 class="chapter-title">Thank you</h2>
  <p>This report was calculated from your exact birth data using the sidereal (Vedic) zodiac, and every interpretation
  is grounded in the positions shown in the chart pages. Read it slowly, return to it at the start of each Dasha period,
  and treat it as a map rather than a verdict: the chart shows tendencies, and your choices decide the outcome.</p>
  <p>If you have a question about a passage, reply to the delivery email. If the reading helped you, a short review on
  Etsy would mean a great deal and helps other seekers find this work.</p>
  <p class="disclaimer">Libertas Jyotish · www.libertas-jyotish.com · This report is for self-reflection and entertainment
  and is not medical, legal, financial or psychological advice.</p>`;

async function processReceipt(receipt, client, shopId) {
  const receiptId = receipt.receipt_id;
  const buyerEmail = receipt.buyer_email || '';
  const buyerName = receipt.name || '';
  const existing = await store.findOrder(receiptId);

  if (existing) {
    if (existing.status === ledger.STATUS.DELIVERED) {
      // 配信済みだが Etsy 側の完了更新が失敗していた場合の再試行
      if (client) await client.markShipped(shopId, receiptId).catch((err) => log(`  markShipped retry failed: ${err.message}`));
      return 'already_delivered';
    }
    if (existing.status === ledger.STATUS.NEEDS_INFO && !existing.dob && !existing.place) return 'waiting_for_buyer';
    if (existing.status === ledger.STATUS.GENERATING && Date.now() - Date.parse(existing.updated_at || 0) < GENERATING_STALE_MS) return 'in_progress';
    if (existing.status === ledger.STATUS.ERROR && existing.attempts >= MAX_ATTEMPTS) return 'gave_up';
  }

  const data = resolveBirthData(receipt, existing);
  const base = {
    transaction_id: (receipt.transactions || []).map((t) => t.transaction_id).join(','),
    buyer_email: buyerEmail,
    buyer_name: buyerName,
    personalization: data.personalization,
    dob: data.dob || '',
    tob: data.tob || '',
    tob_unknown: data.tobUnknown ? 'true' : 'false',
    place: data.place || '',
    language: data.language
  };

  if (!buyerEmail) {
    await store.upsertOrder(receiptId, { ...base, status: ledger.STATUS.ERROR, last_error: 'buyer_email_missing' });
    return 'error';
  }

  if (data.missing.length) {
    if (!existing || existing.status !== ledger.STATUS.NEEDS_INFO) {
      if (options.mail) await mail.sendNeedsInfo({ to: buyerEmail, name: buyerName, personalization: data.personalization, missing: data.missing, notes: data.notes });
      if (options.mail) await mail.notifyOwner(`Needs info: receipt ${receiptId}`, [`buyer: ${buyerName} <${buyerEmail}>`, `missing: ${data.missing.join(', ')}`, `input: ${data.personalization}`]);
    }
    await store.upsertOrder(receiptId, { ...base, status: ledger.STATUS.NEEDS_INFO, last_error: `missing:${data.missing.join(',')}` });
    return 'needs_info';
  }

  const attempts = (existing ? existing.attempts : 0) + 1;
  await store.upsertOrder(receiptId, { ...base, status: ledger.STATUS.GENERATING, attempts, last_error: '' });

  try {
    log(`  generating ${data.language} report (${data.dob} ${data.tob} ${data.place})`);
    const report = options.gemini ? await generateReport(data) : JSON.parse(fs.readFileSync(args['mock-report'], 'utf8'));
    const pdf = await renderReportPdf({ lang: data.language, report, extraHtml: REVIEW_PAGE });
    const filename = `Libertas-Jyotish-Report-${data.dob}.pdf`;
    log(`  pdf rendered: ${Math.round(pdf.length / 1024)} KB`);

    if (options.outDir) {
      fs.mkdirSync(options.outDir, { recursive: true });
      fs.writeFileSync(path.join(options.outDir, `${receiptId}-${filename}`), pdf);
    }

    let emailId = '';
    if (options.mail) {
      emailId = await mail.sendReport({
        to: buyerEmail,
        name: buyerName,
        pdf,
        filename,
        meta: { dob: data.dob, tob: data.tob, tobUnknown: data.tobUnknown, place: data.place, language: data.language }
      });
    }
    await store.upsertOrder(receiptId, { status: ledger.STATUS.DELIVERED, delivered_at: new Date().toISOString(), email_id: emailId });

    if (client) await client.markShipped(shopId, receiptId).catch((err) => log(`  markShipped failed (will retry next run): ${err.message}`));
    if (options.mail) await mail.notifyOwner(`Delivered: receipt ${receiptId}`, [`buyer: ${buyerName} <${buyerEmail}>`, `birth: ${data.dob} ${data.tob} ${data.place}`, `language: ${data.language}`, `pdf: ${Math.round(pdf.length / 1024)} KB`]);
    return 'delivered';
  } catch (err) {
    const message = String(err.message || err).slice(0, 500);
    log(`  failed: ${message}`);
    if (err.needsInfo) {
      if (options.mail) await mail.sendNeedsInfo({ to: buyerEmail, name: buyerName, personalization: data.personalization, missing: [err.needsInfo], notes: [] });
      await store.upsertOrder(receiptId, { status: ledger.STATUS.NEEDS_INFO, last_error: message });
      return 'needs_info';
    }
    await store.upsertOrder(receiptId, { status: ledger.STATUS.ERROR, last_error: message });
    if (options.mail && attempts >= MAX_ATTEMPTS) await mail.notifyOwner(`Gave up: receipt ${receiptId}`, [`buyer: ${buyerName} <${buyerEmail}>`, `error: ${message}`]);
    return 'error';
  }
}

async function connectEtsy() {
  const state = await store.getState();
  const refreshToken = state.refresh_token || process.env.ETSY_REFRESH_TOKEN;
  if (!refreshToken) throw new Error('No Etsy refresh token. Run scripts/etsy/auth.js first.');

  const token = await etsy.refreshAccessToken(refreshToken);
  await store.setState({
    refresh_token: token.refresh_token,
    access_token: token.access_token,
    access_expires_at: new Date(Date.now() + (token.expires_in || 3600) * 1000).toISOString()
  });
  const client = etsy.createClient(token.access_token);

  let shopId = process.env.ETSY_SHOP_ID || state.shop_id;
  if (!shopId) {
    const me = await client.getMe();
    shopId = me.shop_id;
    if (!shopId) throw new Error('Could not determine shop_id from users/me');
    await store.setState({ shop_id: shopId });
  }
  return { client, shopId };
}

async function main() {
  let client = null;
  let shopId = null;
  let receipts;

  if (options.etsy) {
    ({ client, shopId } = await connectEtsy());
    receipts = await client.listOpenReceipts(shopId);
  } else {
    receipts = JSON.parse(fs.readFileSync(options.receiptsFile, 'utf8'));
    if (!Array.isArray(receipts)) receipts = receipts.results || [receipts];
  }
  log(`${receipts.length} open receipt(s)`);

  const summary = {};
  for (const receipt of receipts) {
    log(`receipt ${receipt.receipt_id}`);
    let outcome;
    try {
      outcome = await processReceipt(receipt, client, shopId);
    } catch (err) {
      outcome = 'error';
      log(`  unexpected: ${err.message}`);
    }
    log(`  → ${outcome}`);
    summary[outcome] = (summary[outcome] || 0) + 1;
  }
  log('summary', JSON.stringify(summary));
  if (summary.error) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
