// UAを偽装した自動巡回（ヘッドレスChrome等）をVercel WAFのBot Protectionで止める。
// 使い方: VERCEL_API_TOKEN=... node scripts/vercel-waf-bots.mjs [show|challenge|deny|off|events]
// 検証済みの検索エンジン・SNSプレビューは対象外で、未検証のボットだけが止まる。
// カスタムWAFルールはPro以上が必要なため、全プランで使えるマネージドルールを操作する。

const TOKEN = process.env.VERCEL_API_TOKEN;
const TEAM = process.env.VERCEL_TEAM_ID || 'team_svWoXa9D08BXfvA6DYrbciZC';
const PROJECT = process.env.VERCEL_PROJECT_ID || 'prj_yUaNweABt7JZTYbIcKln85myLZe1';

if (!TOKEN) {
  console.error('VERCEL_API_TOKEN が必要です');
  process.exit(1);
}

const query = `teamId=${TEAM}&projectId=${PROJECT}`;
const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function call(url, method, body) {
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const configUrl = `https://api.vercel.com/v1/security/firewall/config?${query}`;
const command = process.argv[2] || 'show';

if (command === 'show') {
  const config = await call(configUrl, 'GET');
  console.log(JSON.stringify(config?.active?.managedRules ?? {}, null, 2));
} else if (command === 'challenge' || command === 'deny' || command === 'off') {
  await call(configUrl, 'PATCH', {
    action: 'managedRules.update',
    id: 'bot_protection',
    value: command === 'off' ? { active: false, action: 'log' } : { active: true, action: command }
  });
  console.log(`bot_protection を ${command} にしました`);
} else if (command === 'events') {
  const events = await call(
    `https://api.vercel.com/v1/security/firewall/events?${query}&limit=100`,
    'GET'
  );
  const rows = events?.events || events?.data || [];
  const totals = new Map();
  for (const row of rows) {
    const key = [row.action, row.botName || row.bot_name || '(名前なし)', row.userAgent || ''].join(' | ');
    totals.set(key, (totals.get(key) || 0) + 1);
  }
  for (const [key, n] of [...totals].sort((a, b) => b[1] - a[1])) {
    console.log(String(n).padStart(5), key.slice(0, 140));
  }
} else {
  console.error('show | challenge | deny | off | events のいずれかを指定してください');
  process.exit(1);
}
