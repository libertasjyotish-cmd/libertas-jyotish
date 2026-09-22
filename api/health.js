// 外部APIと注文台帳の健全性をまとめて確認する（GET /api/health）。
// 認証: Authorization: Bearer <CRON_SECRET> もしくは ?key=<CRON_SECRET>
// ?alert=1 を付けると、異常があるときだけ運営者へメールを送る（日次の監視から呼ぶ）。
const { listOrders, STATUS } = require('./_etsy-ledger');
const { getMemberSheet, getLastSheetIssue } = require('./_sheets');
const { listGeminiModels } = require('./_gemini');
const { send } = require('./_etsy-mail');

const TIMEOUT_MS = 10000;
// 決済済みなのに納品へ進んでいない注文を「滞留」とみなすまでの猶予。
const STALE_ORDER_HOURS = Number(process.env.HEALTH_STALE_ORDER_HOURS || 6);

// 未設定だと機能ごと止まる環境変数。決済・鑑定書・認証のどれが落ちるかを名前で示す。
const REQUIRED_ENV = {
  astrology: ['PROKERALA_CLIENT_ID', 'PROKERALA_CLIENT_SECRET'],
  reading: ['GEMINI_API_KEY'],
  members: ['GOOGLE_SHEETS_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY'],
  auth: ['AUTH_SECRET'],
  mail: ['RESEND_API_KEY'],
  komoju: ['KOMOJU_SECRET_KEY', 'KOMOJU_WEBHOOK_SECRET'],
  gumroad: ['GUMROAD_PING_TOKEN'],
  storage: ['BLOB_READ_WRITE_TOKEN'],
  cron: ['CRON_SECRET']
};

async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// 1 項目分の疎通確認。落ちた理由を文字列で残し、他の確認は続行する。
async function probe(name, fn) {
  const startedAt = Date.now();
  try {
    const detail = await fn();
    return { name, ok: true, detail: detail || 'ok', ms: Date.now() - startedAt };
  } catch (err) {
    return { name, ok: false, detail: err.message || String(err), ms: Date.now() - startedAt };
  }
}

function envProbe() {
  const missing = [];
  for (const [group, names] of Object.entries(REQUIRED_ENV)) {
    for (const name of names) {
      if (!process.env[name]) missing.push(`${group}:${name}`);
    }
  }
  if (missing.length) throw new Error(`missing env ${missing.join(', ')}`);
  return `${Object.values(REQUIRED_ENV).flat().length} vars set`;
}

// 天体計算の入口。ここが落ちると無料鑑定も鑑定書も作れない。
async function prokeralaProbe() {
  const res = await fetchWithTimeout('https://api.prokerala.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.PROKERALA_CLIENT_ID || '',
      client_secret: process.env.PROKERALA_CLIENT_SECRET || ''
    })
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const data = await res.json();
  if (!data.access_token) throw new Error('token missing in response');
  return 'token issued';
}

// 鑑定文生成。キー失効とモデル廃止のどちらでもここで分かる。
async function geminiProbe() {
  const models = await listGeminiModels(process.env.GEMINI_API_KEY || '');
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${models[0]}:generateContent?key=${process.env.GEMINI_API_KEY || ''}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'ok と1語だけ返してください' }] }] })
    }
  );
  if (!res.ok) throw new Error(`${models[0]} ${res.status}`);
  return models[0];
}

// 会員データ。ここが落ちるとログインと購読状態の反映が止まる。
async function sheetsProbe() {
  const sheet = await getMemberSheet();
  if (!sheet) throw new Error(`member sheet unavailable (${getLastSheetIssue()})`);
  return `${sheet.title} / ${sheet.rowCount} rows`;
}

// 認証コードと鑑定書の配信に使うメール基盤。
async function resendProbe() {
  const res = await fetchWithTimeout('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY || ''}` }
  });
  if (!res.ok) throw new Error(`domains ${res.status}`);
  return 'api key valid';
}

// 日本向け決済。鍵失効・LIVE/TEST 取り違えをここで検知する。
async function komojuProbe() {
  const key = process.env.KOMOJU_SECRET_KEY || '';
  const res = await fetchWithTimeout('https://komoju.com/api/v1/payments?limit=1', {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`, Accept: 'application/json' }
  });
  if (!res.ok) throw new Error(`payments ${res.status}`);
  return key.startsWith('sk_live_') ? 'live key' : 'test key';
}

// グローバル決済。Ping は署名されないため、受け口が生きていることと商品リンクを確認する。
async function gumroadProbe() {
  const base = process.env.SITE_URL || 'https://www.libertas-jyotish.com';
  const res = await fetchWithTimeout(`${base}/api/gumroad-webhook`, { method: 'POST' });
  // トークン無しの POST は 401。200 が返るなら検証が効いていない。
  if (res.status !== 401) throw new Error(`webhook returned ${res.status} for an unauthenticated POST`);
  const links = await fetchWithTimeout(`${base}/api/checkout-links?lang=en`);
  if (!links.ok) throw new Error(`checkout-links ${links.status}`);
  const data = await links.json();
  const urls = JSON.stringify(data);
  if (!urls.includes('gumroad.com')) throw new Error('no gumroad url in checkout links');
  return 'webhook guarded, links present';
}

function hoursSince(value) {
  const at = Date.parse(value || '');
  if (!Number.isFinite(at)) return null;
  return (Date.now() - at) / 3600000;
}

// 台帳の滞留。API 疎通が正常でも、決済後の処理が止まっていればここに出る。
async function ordersProbe() {
  const orders = await listOrders();
  const errored = orders.filter((o) => o.status === STATUS.ERROR);
  const needsInfo = orders.filter((o) => o.status === STATUS.NEEDS_INFO);
  const stale = orders.filter((o) => {
    if (![STATUS.NEW, STATUS.GENERATING].includes(o.status)) return false;
    const age = hoursSince(o.updated_at || o.created_at);
    return age !== null && age > STALE_ORDER_HOURS;
  });
  const summary = `total ${orders.length}, error ${errored.length}, needs_info ${needsInfo.length}, stale ${stale.length}`;
  if (errored.length || stale.length) {
    const ids = [...errored, ...stale].slice(0, 10).map((o) => `${o.receipt_id}(${o.status})`);
    throw new Error(`${summary} — ${ids.join(', ')}`);
  }
  return summary;
}

async function notifyOwnerOfFailures(failed) {
  const to = process.env.ALERT_EMAIL_TO || process.env.CONTACT_TO || process.env.ETSY_OWNER_EMAIL;
  if (!to) return false;
  const lines = failed.map((c) => `- ${c.name}: ${c.detail}`);
  await send({
    to,
    subject: `[Libertas Jyotish] アプリ側の異常 ${failed.length} 件`,
    html: `<p>日次ヘルスチェックで異常を検出しました。</p><pre>${lines.join('\n')}</pre>`
  });
  return true;
}

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET || '';
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || (req.query && req.query.key) || '';
  if (!secret || supplied !== secret) return res.status(401).json({ error: 'unauthorized' });

  const checks = await Promise.all([
    probe('env', envProbe),
    probe('prokerala', prokeralaProbe),
    probe('gemini', geminiProbe),
    probe('sheets', sheetsProbe),
    probe('resend', resendProbe),
    probe('komoju', komojuProbe),
    probe('gumroad', gumroadProbe),
    probe('orders', ordersProbe)
  ]);

  const failed = checks.filter((c) => !c.ok);
  let alerted = false;
  if (failed.length && req.query && req.query.alert) {
    try {
      alerted = await notifyOwnerOfFailures(failed);
    } catch (err) {
      console.error('health alert mail failed:', err.message);
    }
  }

  return res.status(failed.length ? 503 : 200).json({
    ok: failed.length === 0,
    checked_at: new Date().toISOString(),
    failed: failed.map((c) => c.name),
    alerted,
    checks
  });
};
