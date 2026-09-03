#!/usr/bin/env node
// 解説ページ（ナクシャトラ）を data/guide/*.json から生成する。
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
const SECTION = 'nakshatra';

const data = JSON.parse(readFileSync(join(ROOT, 'data/guide/nakshatra.ja.json'), 'utf8'));

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout({ path, title, description, body }) {
  const canonical = `${SITE}/${LANG}/${path}`;
  return `<!DOCTYPE html>
<html lang="ja" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Libertas Jyotish">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
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
${body}
</main>
</body>
</html>
`;
}

function indexPage() {
  const listed = new Map(data.items.map((item) => [item.name, item]));
  const rows = data.names
    .map((name, i) => {
      const item = listed.get(name);
      const label = `${String(i + 1).padStart(2, '0')}. ${name}`;
      return item
        ? `<li><a href="/${LANG}/${SECTION}/${item.slug}">${esc(label)}</a><span>${esc(item.summary)}</span></li>`
        : `<li><span class="pending">${esc(label)}</span><span>準備中</span></li>`;
    })
    .join('\n');

  return layout({
    path: SECTION,
    title: data.meta.title,
    description: data.meta.description,
    body: `<article>
<h1>${esc(data.meta.heading)}</h1>
<p class="lead">${esc(data.meta.lead)}</p>
<h2>${esc(data.meta.listHeading)}</h2>
<ul class="nakshatra-list">
${rows}
</ul>
<p class="note">${esc(data.meta.note)}</p>
</article>`
  });
}

function detailPage(item) {
  const title = `${item.name}（${item.sanskrit}）の意味と性格 | Libertas Jyotish`;
  const description = `${item.name}は${item.sign}に位置し、支配星は${item.ruler}、象徴は${item.symbol}。${item.summary}`;
  const facts = [
    ['支配星', item.ruler],
    ['象徴', item.symbol],
    ['神格', item.deity],
    ['位置', item.sign]
  ]
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
    .join('\n');
  const sections = item.sections
    .map((s) => `<section>\n<h2>${esc(s.heading)}</h2>\n<p>${esc(s.body)}</p>\n</section>`)
    .join('\n');

  return layout({
    path: `${SECTION}/${item.slug}`,
    title,
    description,
    body: `<article>
<h1>${esc(item.name)}<span class="sanskrit">${esc(item.sanskrit)}</span></h1>
<p class="lead">${esc(item.summary)}</p>
<dl class="facts">
${facts}
</dl>
${sections}
<p class="note">${esc(data.meta.note)}</p>
</article>`
  });
}

const outputs = [[join(ROOT, LANG, SECTION, 'index.html'), indexPage()]];
for (const item of data.items) {
  outputs.push([join(ROOT, LANG, SECTION, `${item.slug}.html`), detailPage(item)]);
}

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
