#!/usr/bin/env node
// 解説記事ページを data/guide/ja.json から生成する。
//
//   node scripts/build-guide.mjs          … 生成
//   node scripts/build-guide.mjs --check  … 生成物とコミット済みHTMLの差分を検査（CI用）
//
// 現時点では日本語のみ。サイト内からはリンクせず sitemap にも載せない（原稿確認中のため）。

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.libertas-jyotish.com';
const LANG = 'ja';
const SECTION = 'guide';

const data = JSON.parse(readFileSync(join(ROOT, 'data/guide/ja.json'), 'utf8'));

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function page(article) {
  const canonical = `${SITE}/${LANG}/${SECTION}/${article.slug}`;
  const sections = article.sections
    .map((s) => `<section>\n<h2>${esc(s.heading)}</h2>\n<p>${esc(s.body)}</p>\n</section>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ja" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(article.title)}</title>
<meta name="description" content="${esc(article.description)}">
<meta name="robots" content="noindex">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Libertas Jyotish">
<meta property="og:title" content="${esc(article.title)}">
<meta property="og:description" content="${esc(article.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/img/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/img/libertas-logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Noto+Serif+JP:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/guide.css">
</head>
<body>
<main class="guide">
<article>
<h1>${esc(article.h1)}</h1>
<p class="lead">${esc(article.lead)}</p>
${sections}
<p class="note">この記事は、インド占星術の一般的な考え方を紹介する読み物です。将来の出来事を保証するものではなく、医療・法律・投資の助言に代わるものでもありません。</p>
</article>
</main>
</body>
</html>
`;
}

const outputs = data.articles.map((article) => [
  join(ROOT, LANG, SECTION, `${article.slug}.html`),
  page(article)
]);

const check = process.argv.includes('--check');
let stale = 0;
for (const [file, html] of outputs) {
  if (check) {
    const current = existsSync(file) ? readFileSync(file, 'utf8') : null;
    if (current !== html) {
      console.error(`差分があります: ${file}`);
      stale += 1;
    }
    continue;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

if (check) {
  if (stale) process.exit(1);
  console.log(`生成物は最新です（${outputs.length}ページ）`);
} else {
  console.log(`生成しました: ${outputs.length}ページ`);
}
