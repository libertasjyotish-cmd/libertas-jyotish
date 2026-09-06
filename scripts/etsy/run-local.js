// Etsy 注文処理をローカルで検証する（Etsy API・Sheets・Resend に接続しない）。
//   node scripts/etsy/run-local.js --receipts=orders.json --out=dir [--mock-report=report.json] [--cycles=3] [--budget=50000]
// --mock-report を与えると Gemini を呼ばず、その JSON の章を返す。省略時は本物の Gemini/Prokerala を使う（要 API キー）。
const fs = require('fs');
const path = require('path');
const { runCycle } = require('../../api/_etsy-fulfill');
const { ORDER_HEADERS } = require('../../api/_etsy-ledger');

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
if (typeof args.receipts !== 'string') {
  console.error('usage: node scripts/etsy/run-local.js --receipts=orders.json [--out=dir] [--mock-report=report.json] [--cycles=N] [--budget=ms]');
  process.exit(1);
}

const rows = new Map();
const memoryStore = {
  async getState() { return {}; },
  async setState() {},
  async listOrders() { return [...rows.values()]; },
  async findOrder(id) { return rows.get(String(id)) || null; },
  async upsertOrder(id, fields) {
    const now = new Date().toISOString();
    const prev = rows.get(String(id)) || Object.fromEntries(ORDER_HEADERS.map((h) => [h, ''])) ;
    if (!prev.receipt_id) Object.assign(prev, { receipt_id: String(id), created_at: now, attempts: 0 });
    for (const [k, v] of Object.entries(fields)) prev[k] = v == null ? '' : (k === 'attempts' ? Number(v) : String(v));
    prev.updated_at = now;
    rows.set(String(id), prev);
    return { ...prev };
  }
};

let receipts = JSON.parse(fs.readFileSync(args.receipts, 'utf8'));
if (!Array.isArray(receipts)) receipts = receipts.results || [receipts];

// モック時は Prokerala も呼ばないよう、登録直後の行に astro を差し込む
let generate = null;
if (typeof args['mock-report'] === 'string') {
  const mock = JSON.parse(fs.readFileSync(args['mock-report'], 'utf8'));
  generate = async (astro, ids) => ({ chapters: Object.fromEntries(ids.map((id) => [id, mock.chapters[id]])), failed: [] });
  const upsert = memoryStore.upsertOrder;
  memoryStore.upsertOrder = (id, fields) => upsert(id, fields.status === 'new' && mock.astro ? { ...fields, astro: JSON.stringify(mock.astro) } : fields);
}

const outDir = typeof args.out === 'string' ? args.out : null;
const onPdf = outDir ? async (id, filename, pdf) => {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${id}-${filename}`), pdf);
} : null;

(async () => {
  const cycles = Number(args.cycles || 3);
  const budget = Number(args.budget || 50000);
  for (let i = 0; i < cycles; i += 1) {
    console.log(`--- cycle ${i + 1}`);
    const summary = await runCycle({ deadline: Date.now() + budget, store: memoryStore, receipts, mail: false, generate, onPdf });
    console.log(JSON.stringify(summary));
  }
  console.log('--- ledger');
  for (const row of rows.values()) {
    console.log(`${row.receipt_id}: ${row.status} attempts=${row.attempts} lang=${row.language} dob=${row.dob} tob=${row.tob} place=${row.place} err=${row.last_error}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
