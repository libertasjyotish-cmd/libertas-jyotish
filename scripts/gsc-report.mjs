#!/usr/bin/env node
// Google検索での表示回数・クリック・順位をSearch Console APIで集計する。
// 使い方: GOOGLE_SERVICE_ACCOUNT_JSON=... node scripts/gsc-report.mjs [日数]
// 事前にSearch Consoleでサービスアカウントを「制限付きユーザー」として追加しておく。

import { JWT } from 'google-auth-library';

const SITE = process.env.GSC_SITE_URL || 'sc-domain:libertas-jyotish.com';
const DAYS = Number(process.argv[2] || 28);
const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

if (!raw) {
  console.error('GOOGLE_SERVICE_ACCOUNT_JSON が必要です');
  process.exit(1);
}

const creds = JSON.parse(raw);
const auth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
});

const day = (d) => d.toISOString().slice(0, 10);
const endDate = day(new Date());
const startDate = day(new Date(Date.now() - DAYS * 86400000));

async function query(dimensions, rowLimit = 25) {
  const url =
    `https://searchconsole.googleapis.com/webmasters/v3/sites/` +
    `${encodeURIComponent(SITE)}/searchAnalytics/query`;
  const res = await auth.request({
    url,
    method: 'POST',
    data: { startDate, endDate, dimensions, rowLimit }
  });
  return res.data.rows || [];
}

function show(rows) {
  if (!rows.length) {
    console.log('  （データなし）');
    return;
  }
  for (const row of rows) {
    const keys = (row.keys || ['合計']).join(' | ');
    console.log(
      '  ' + keys.padEnd(52).slice(0, 52),
      'クリック', String(row.clicks).padStart(4),
      '表示', String(row.impressions).padStart(5),
      '平均順位', (row.position || 0).toFixed(1).padStart(5)
    );
  }
}

const lang = (rows) => {
  const totals = new Map();
  for (const row of rows) {
    const key = (row.keys[0].match(/libertas-jyotish\.com\/([a-z]{2})(\/|$)/) || [, '(ルート)'])[1];
    const cur = totals.get(key) || { clicks: 0, impressions: 0 };
    cur.clicks += row.clicks;
    cur.impressions += row.impressions;
    totals.set(key, cur);
  }
  return [...totals]
    .sort((a, b) => b[1].impressions - a[1].impressions)
    .map(([key, v]) => ({ keys: [key], ...v, position: 0 }));
};

console.log(`${startDate} 〜 ${endDate}（Search Consoleは2〜3日遅れて確定）`);
console.log('■ 合計');
show(await query([]));
console.log('■ 検索語（表示回数順）');
show(await query(['query'], 30));
console.log('■ ページ');
const pages = await query(['page'], 100);
show(pages.slice(0, 25));
console.log('■ 言語別');
show(lang(pages));
console.log('■ 国別');
show(await query(['country'], 15));
