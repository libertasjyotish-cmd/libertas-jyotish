// アクセス増加が人間かボットかを、ダッシュボードを開かずに判定する。
// 使い方: VERCEL_API_TOKEN=... node scripts/vercel-traffic.mjs [時間数=24] [内訳...]
// 内訳の既定は bot_name / bot_category / client_user_agent / request_path / client_ip_country。
// 参照: Vercel Observability Query API (POST /v2/observability/query)

const TOKEN = process.env.VERCEL_API_TOKEN;
const TEAM = process.env.VERCEL_TEAM_ID || 'team_svWoXa9D08BXfvA6DYrbciZC';
const PROJECT = process.env.VERCEL_PROJECT_ID || 'prj_yUaNweABt7JZTYbIcKln85myLZe1';

if (!TOKEN) {
  console.error('VERCEL_API_TOKEN が必要です');
  process.exit(1);
}

const hours = Number(process.argv[2] || 24);
const dimensions = process.argv.length > 3
  ? process.argv.slice(3)
  : ['bot_name', 'bot_category', 'client_user_agent', 'request_path', 'client_ip_country'];

const endTime = new Date();
const startTime = new Date(endTime.getTime() - hours * 3600 * 1000);

async function totalsBy(dimension) {
  const res = await fetch(`https://api.vercel.com/v2/observability/query?teamId=${TEAM}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metric: 'vercel.request.count',
      scope: { type: 'project', ownerId: TEAM, projectIds: [PROJECT] },
      aggregation: 'sum',
      groupBy: [dimension],
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      limit: 50
    })
  });
  if (!res.ok) throw new Error(`${dimension}: ${res.status} ${await res.text()}`);
  const { data } = await res.json();
  const totals = new Map();
  for (const row of data) {
    const key = row[dimension] === '' ? '(なし)' : row[dimension];
    totals.set(key, (totals.get(key) || 0) + (row.vercel_request_count_sum || 0));
  }
  return [...totals].sort((a, b) => b[1] - a[1]);
}

for (const dimension of dimensions) {
  const rows = await totalsBy(dimension);
  const sum = rows.reduce((acc, [, n]) => acc + n, 0);
  console.log(`\n=== ${dimension}（直近${hours}時間 / 合計 ${sum} リクエスト）`);
  for (const [key, n] of rows.slice(0, 15)) {
    console.log(`${String(n).padStart(7)}  ${((n / sum) * 100).toFixed(1).padStart(5)}%  ${String(key).slice(0, 110)}`);
  }
}
