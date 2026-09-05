#!/usr/bin/env node
// 解説記事ページを data/guide/ja.json から生成する。
//
//   node scripts/build-guide.mjs          … 生成
//   node scripts/build-guide.mjs --check  … 生成物とコミット済みHTMLの差分を検査（CI用）
//
// 現時点では日本語のみ。公開の可否は data/guide/ja.json の published で切り替える。
//   published: false … 各記事に noindex を付け、sitemap.xml とトップの記事一覧に載せない（原稿確認中）
//   published: true  … noindex を外し、sitemap.xml とトップの記事一覧に載せる（build-i18n.mjs 側で参照）
// 切り替え後は build-guide.mjs と build-i18n.mjs の両方を実行してコミットする。

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.libertas-jyotish.com';
const LANG = 'ja';
const SECTION = 'guide';
const SITE_NAME = 'Libertas Jyotish';
const OG_IMAGE = `${SITE}/img/og-image.jpg`;

const data = JSON.parse(readFileSync(join(ROOT, `data/guide/${LANG}.json`), 'utf8'));
const HUB_URL = `${SITE}/${LANG}/${SECTION}`;
const HOME_URL = `${SITE}/${LANG}`;

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function articleUrl(article) {
  return `${HUB_URL}/${article.slug}`;
}

function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

function head({ title, description, canonical, ogType, extra }) {
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${data.published ? '' : '<meta name="robots" content="noindex">\n'}<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="ja_JP">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${OG_IMAGE}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${OG_IMAGE}">
<link rel="icon" type="image/png" href="/img/libertas-logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Noto+Serif+JP:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/guide.css">
${extra}`;
}

function breadcrumbLd(items) {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url }))
  });
}

function breadcrumbNav(items) {
  const links = items.map((it, i) => (i === items.length - 1
    ? `<li aria-current="page">${esc(it.name)}</li>`
    : `<li><a href="${it.url.replace(SITE, '')}">${esc(it.name)}</a></li>`));
  return `<nav class="breadcrumb" aria-label="現在位置"><ol>${links.join('')}</ol></nav>`;
}

function header() {
  return `<header class="guide-header">
<a class="guide-brand" href="/${LANG}"><img src="/img/libertas-logo.png" alt="" width="28" height="28">${SITE_NAME}</a>
<nav class="guide-nav" aria-label="サイト内"><a href="/${LANG}/${SECTION}">解説記事</a><a href="/${LANG}#form-area">無料鑑定</a></nav>
</header>`;
}

function footer() {
  return `<footer class="guide-footer">
<a href="/${LANG}/legal">特定商取引法に基づく表記</a>
<a href="/${LANG}/legal#terms">利用規約</a>
<a href="/${LANG}/legal#privacy">プライバシーポリシー</a>
<a href="/${LANG}/legal#refund">返金ポリシー</a>
<p class="copyright">&copy; ${SITE_NAME} All Rights Reserved.</p>
</footer>`;
}

function cta() {
  return `<aside class="guide-cta">
<p class="guide-cta-title">自分のチャートで確かめる</p>
<p>生年月日・出生時刻・出生地を入力すると、月の星座・ナクシャトラ・上昇宮・現在のダシャーを無料で計算し、文章で読めます。</p>
<a class="guide-cta-btn" href="/${LANG}#form-area">無料鑑定をはじめる</a>
</aside>`;
}

function relatedList(current) {
  const others = data.articles.filter((a) => a.slug !== current.slug);
  const items = others.map((a) => `<li><a href="/${LANG}/${SECTION}/${a.slug}">${esc(a.h1)}</a></li>`).join('\n');
  return `<section class="related">\n<h2>ほかの解説記事</h2>\n<ul>\n${items}\n</ul>\n</section>`;
}

function sectionHtml(s) {
  const items = s.items ? `\n<ol class="guide-list">\n${s.items.map((it) => `<li>${esc(it)}</li>`).join('\n')}\n</ol>` : '';
  return `<section>\n<h2>${esc(s.heading)}</h2>\n<p>${esc(s.body)}</p>${items}\n</section>`;
}

function articlePage(article) {
  const canonical = articleUrl(article);
  const crumbs = [
    { name: 'トップ', url: HOME_URL },
    { name: '解説記事', url: HUB_URL },
    { name: article.h1, url: canonical }
  ];
  const ld = jsonLd({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    inLanguage: LANG,
    mainEntityOfPage: canonical,
    image: OG_IMAGE,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE, logo: { '@type': 'ImageObject', url: `${SITE}/img/libertas-logo.png` } }
  });

  return `<!DOCTYPE html>
<html lang="ja" dir="ltr">
<head>
${head({ title: article.title, description: article.description, canonical, ogType: 'article', extra: `${ld}\n${breadcrumbLd(crumbs)}` })}
</head>
<body>
${header()}
<main class="guide">
${breadcrumbNav(crumbs)}
<article>
<h1>${esc(article.h1)}</h1>
<p class="lead">${esc(article.lead)}</p>
${article.sections.map(sectionHtml).join('\n')}
<p class="note">この記事は、インド占星術の一般的な考え方を紹介する読み物です。将来の出来事を保証するものではなく、医療・法律・投資の助言に代わるものでもありません。</p>
</article>
${cta()}
${relatedList(article)}
</main>
${footer()}
</body>
</html>
`;
}

function hubPage() {
  const idx = data.index;
  const crumbs = [
    { name: 'トップ', url: HOME_URL },
    { name: '解説記事', url: HUB_URL }
  ];
  const ld = jsonLd({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: idx.title,
    description: idx.description,
    inLanguage: LANG,
    url: HUB_URL,
    hasPart: data.articles.map((a) => ({ '@type': 'Article', headline: a.title, url: articleUrl(a) }))
  });
  const items = data.articles
    .map((a) => `<li><a href="/${LANG}/${SECTION}/${a.slug}"><span class="guide-index-title">${esc(a.h1)}</span><span class="guide-index-desc">${esc(a.description)}</span></a></li>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ja" dir="ltr">
<head>
${head({ title: idx.title, description: idx.description, canonical: HUB_URL, ogType: 'website', extra: `${ld}\n${breadcrumbLd(crumbs)}` })}
</head>
<body>
${header()}
<main class="guide">
${breadcrumbNav(crumbs)}
<article>
<h1>${esc(idx.h1)}</h1>
<p class="lead">${esc(idx.lead)}</p>
<ul class="guide-index">
${items}
</ul>
</article>
${cta()}
</main>
${footer()}
</body>
</html>
`;
}

const outputs = [
  [join(ROOT, LANG, SECTION, 'index.html'), hubPage()],
  ...data.articles.map((article) => [join(ROOT, LANG, SECTION, `${article.slug}.html`), articlePage(article)])
];

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
