// sitemap.xml の全 URL を IndexNow（Bing / Yandex / Seznam / Naver 等が共有）へ通知する。
// 使い方: npm run indexnow            → sitemap.xml の全 URL
//         node scripts/indexnow-submit.mjs https://www.libertas-jyotish.com/ja/yearly ...  → 指定 URL のみ
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'www.libertas-jyotish.com';
const KEY = '3ec1608e78814639b25c22c6671af233';
const ENDPOINT = 'https://api.indexnow.org/IndexNow';

const args = process.argv.slice(2);
const urls = args.length
  ? args
  : [...readFileSync(join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

const own = urls.filter((u) => u.startsWith(`https://${HOST}/`));
if (!own.length) {
  console.error('[indexnow] no URLs to submit');
  process.exit(1);
}

for (let i = 0; i < own.length; i += 10000) {
  const batch = own.slice(i, i + 10000);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `https://${HOST}/${KEY}.txt`,
      urlList: batch
    })
  });
  console.log(`[indexnow] ${batch.length} URLs → HTTP ${res.status} ${res.statusText}`);
  if (!res.ok) {
    console.error(await res.text());
    process.exit(1);
  }
}
