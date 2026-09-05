#!/usr/bin/env node
// 解説記事ページを data/guide/<lang>.json から生成する（data/guide にある言語すべて）。
//
//   node scripts/build-guide.mjs          … 生成
//   node scripts/build-guide.mjs --check  … 生成物とコミット済みHTMLの差分を検査（CI用）
//
// 公開の段階は各言語の data/guide/<lang>.json の 2 つのフラグで切り替える。
//   linked: true     … トップの記事一覧と共通メニューに載せる（サイト内から辿れる。build-i18n.mjs 側で参照）
//   published: true  … noindex を外し、sitemap.xml に載せる（検索エンジンに出す）
// 切り替え後は build-guide.mjs と build-i18n.mjs の両方を実行してコミットする。
// 記事本文以外の共通文言（パンくず・CTA・フッター・注意書き）は各 JSON の ui に持つ。

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.libertas-jyotish.com';
const SECTION = 'guide';
const SITE_NAME = 'Libertas Jyotish';
const OG_IMAGE = `${SITE}/img/og-image.jpg`;
const GUIDE_DIR = join(ROOT, 'data', 'guide');

const LANGS = readdirSync(GUIDE_DIR).filter((n) => n.endsWith('.json')).map((n) => n.replace(/\.json$/, '')).sort();
const GUIDES = Object.fromEntries(LANGS.map((lang) => [lang, JSON.parse(readFileSync(join(GUIDE_DIR, `${lang}.json`), 'utf8'))]));

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

// 同じ記事（slug）が存在する言語だけ hreflang を張る。x-default は英語があれば英語、なければ日本語。
function alternates(slug) {
  const langs = LANGS.filter((l) => (slug ? GUIDES[l].articles.some((a) => a.slug === slug) : true));
  const path = (l) => `${SITE}/${l}/${SECTION}${slug ? `/${slug}` : ''}`;
  const links = langs.map((l) => `<link rel="alternate" hreflang="${l}" href="${path(l)}">`);
  const def = langs.includes('en') ? 'en' : langs[0];
  links.push(`<link rel="alternate" hreflang="x-default" href="${path(def)}">`);
  return links.join('\n');
}

function makeBuilder(LANG) {
  const data = GUIDES[LANG];
  const locale = JSON.parse(readFileSync(join(ROOT, `locales/${LANG}.json`), 'utf8'));
  const ui = data.ui;
  const HUB_URL = `${SITE}/${LANG}/${SECTION}`;
  const HOME_URL = `${SITE}/${LANG}`;
  const dir = locale.meta.dir || 'ltr';

  function articleUrl(article) {
    return `${HUB_URL}/${article.slug}`;
  }

  function head({ title, description, canonical, ogType, slug, extra }) {
    return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${data.published ? '' : '<meta name="robots" content="noindex">\n'}<link rel="canonical" href="${canonical}">
${alternates(slug)}
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="${locale.meta.ogLocale}">
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
<link href="${locale.meta.fontHref}" rel="stylesheet">
<link rel="stylesheet" href="/css/site-menu.css">
<link rel="stylesheet" href="/css/guide.css">
<style>body{font-family:${locale.meta.fontFamily};}</style>
<script defer src="/js/site-menu.js"></script>
${extra}`;
  }

  // 共通ヘッダー（js/site-menu.js）に渡す文言。トップ等の templates/partials/i18n-globals.html と同じ形。
  function i18nGlobals() {
    const menu = {};
    for (const [key, value] of Object.entries(locale.strings)) {
      if (key.startsWith('menu.')) menu[key.slice(5)] = value;
    }
    const intro = data.articles.find((a) => a.slug === data.index.introSlug) || data.articles[0];
    const globals = {
      lang: LANG,
      menu,
      guide: {
        hub: `/${LANG}/${SECTION}`,
        hubLabel: data.index.menuLabel || data.index.h1,
        intro: `/${LANG}/${SECTION}/${intro.slug}`,
        introLabel: intro.menuLabel || intro.h1,
        groupLabel: data.index.menuGroup || ''
      }
    };
    return `<script>window.LJ_I18N = ${JSON.stringify(globals).replace(/</g, '\\u003c')};</script>`;
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
    return `<nav class="breadcrumb" aria-label="${esc(ui.breadcrumbLabel)}"><ol>${links.join('')}</ol></nav>`;
  }

  function header() {
    return `${i18nGlobals()}
<header class="site-header" data-site-header></header>`;
  }

  function footer() {
    return `<footer class="guide-footer">
<a href="/${LANG}/legal">${esc(ui.footerLegal)}</a>
<a href="/${LANG}/legal#terms">${esc(ui.footerTerms)}</a>
<a href="/${LANG}/legal#privacy">${esc(ui.footerPrivacy)}</a>
<a href="/${LANG}/legal#refund">${esc(ui.footerRefund)}</a>
<p class="copyright">&copy; ${SITE_NAME} All Rights Reserved.</p>
</footer>`;
  }

  function cta() {
    return `<aside class="guide-cta">
<p class="guide-cta-title">${esc(ui.ctaTitle)}</p>
<p>${esc(ui.ctaBody)}</p>
<a class="guide-cta-btn" href="/${LANG}#form-area">${esc(ui.ctaButton)}</a>
</aside>`;
  }

  function relatedList(current) {
    const others = data.articles.filter((a) => a.slug !== current.slug);
    const items = others.map((a) => `<li><a href="/${LANG}/${SECTION}/${a.slug}">${esc(a.h1)}</a></li>`).join('\n');
    return `<section class="related">\n<h2>${esc(ui.relatedHeading)}</h2>\n<ul>\n${items}\n</ul>\n</section>`;
  }

  function sectionHtml(s) {
    const items = s.items ? `\n<ol class="guide-list">\n${s.items.map((it) => `<li>${esc(it)}</li>`).join('\n')}\n</ol>` : '';
    return `<section>\n<h2>${esc(s.heading)}</h2>\n<p>${esc(s.body)}</p>${items}\n</section>`;
  }

  function articlePage(article) {
    const canonical = articleUrl(article);
    const crumbs = [
      { name: ui.crumbHome, url: HOME_URL },
      { name: ui.crumbHub, url: HUB_URL },
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
<html lang="${LANG}" dir="${dir}">
<head>
${head({ title: article.title, description: article.description, canonical, ogType: 'article', slug: article.slug, extra: `${ld}\n${breadcrumbLd(crumbs)}` })}
</head>
<body>
${header()}
<main class="guide">
${breadcrumbNav(crumbs)}
<article>
<h1>${esc(article.h1)}</h1>
<p class="lead">${esc(article.lead)}</p>
${article.sections.map(sectionHtml).join('\n')}
<p class="note">${esc(ui.disclaimer)}</p>
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
      { name: ui.crumbHome, url: HOME_URL },
      { name: ui.crumbHub, url: HUB_URL }
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
<html lang="${LANG}" dir="${dir}">
<head>
${head({ title: idx.title, description: idx.description, canonical: HUB_URL, ogType: 'website', slug: null, extra: `${ld}\n${breadcrumbLd(crumbs)}` })}
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

  return [
    [join(ROOT, LANG, SECTION, 'index.html'), hubPage()],
    ...data.articles.map((article) => [join(ROOT, LANG, SECTION, `${article.slug}.html`), articlePage(article)])
  ];
}

const outputs = LANGS.flatMap(makeBuilder);

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
  console.log(`生成物は最新です（${LANGS.length}言語 × ${outputs.length / LANGS.length}ページ）`);
} else {
  console.log(`生成しました: ${LANGS.length}言語 × ${outputs.length / LANGS.length}ページ`);
}
