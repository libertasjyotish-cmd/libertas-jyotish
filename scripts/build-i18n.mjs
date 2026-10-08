#!/usr/bin/env node
// 言語別HTMLを templates/ と locales/ から生成する。
//
//   node scripts/build-i18n.mjs          … 全言語を生成
//   node scripts/build-i18n.mjs --check  … 生成物とコミット済みHTMLの差分を検査（CI用）
//
// テンプレート内で使える記法:
//   {{lang}} {{dir}}            … 言語コード / 表記方向
//   {{canonical}}               … そのページの正規URL
//   {{hreflang}}                … 全言語 + x-default の alternate リンク
//   {{fontHref}} {{fontFamily}} … 言語ごとのWebフォント指定
//   {{t.some.key}}              … locales/<lang>.json の文言（そのまま埋め込む）
//   {{t.some.key|js}}           … JavaScript の文字列リテラル内に埋め込む場合
//   {{t.some.key|tpl}}          … テンプレートリテラル（バッククォート）内に埋め込む場合
//   {{t.some.key|attr}}         … HTML属性値に埋め込む場合
//
//   {{>name}}                  … templates/partials/name.html を展開する
//
// 文言の中に %LANG% と書くと、その言語コードに置き換わる（文言内リンク用）。
//
// 文言が未翻訳の言語では、既定言語（ja）の文言をそのまま使って生成を続ける。

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toolsMenu } from './tools-menu.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE_DIR = join(ROOT, 'templates');
const LOCALE_DIR = join(ROOT, 'locales');
const BASE_LANG = 'ja';
// 検索エンジンに見せる正規のオリジン（apex は www へ 308 転送される）。
const SITE = 'https://www.libertas-jyotish.com';
// sitemap.xml に載せる（＝検索結果に出したい）ページ。全言語に存在し index 可のもの。
const SITEMAP_PAGES = [
  'index', 'products', 'pdf-purchase', 'yearly', 'career', 'palm-chart',
  'tools/moon-sign', 'tools/nakshatra', 'tools/dasha'
];
// {{pdfIntroJa}}: 生涯完全鑑定書（pdf-purchase）の商品説明ブロック。日本語のみ展開、他言語は空。
// {{robotsSaleJa}}: 販売ページの robots。日本は KOMOJU、他言語は Gumroad で年間運勢を販売中のため全言語 index 可。
const SALE_LANGS = new Set(['ja', 'en', 'es', 'pt', 'ar', 'id', 'fr', 'de']);
function buildRobotsSaleJa(lang) {
  return SALE_LANGS.has(lang) ? '' : '<meta name="robots" content="noindex,nofollow">';
}
// 解説記事（data/guide/<lang>.json）。
//   linked: true    … トップの記事一覧と共通メニューに載せる（サイト内から辿れる）
//   published: true … 上記に加えて sitemap.xml に載せる（検索エンジンに出す）
const GUIDE_DIR = join(ROOT, 'data/guide');
const GUIDE_SECTION = 'guide';
// 連作ページ（data/guide/<name>/<lang>.json）。build-guide.mjs の COLLECTION_DIRS と揃える。
const COLLECTION_DIRS = ['nakshatra', 'dasha'];

const PARTIAL_DIR = join(TEMPLATE_DIR, 'partials');
const PARTIAL = /\{\{>\s*([a-zA-Z0-9_-]+)\s*\}\}/g;
const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_.-]+)\s*(?:\|\s*(js|attr|tpl|json)\s*)?\}\}/g;

// フッターの言語切替。表示順と表記はここだけで管理する。
const LANG_SWITCH = [
  { lang: 'ja', label: '日本語', title: '日本語' },
  { lang: 'en', label: 'English', title: 'English' },
  { lang: 'es', label: 'Español', title: 'Español' },
  { lang: 'pt', label: 'Português', title: 'Português' },
  { lang: 'ar', label: 'العربية', title: 'العربية' },
  { lang: 'id', label: 'Indonesia', title: 'Bahasa Indonesia' },
  { lang: 'fr', label: 'Français', title: 'Français' },
  { lang: 'de', label: 'Deutsch', title: 'Deutsch' }
];

// index.html は言語ディレクトリ自体（/ja）を指す。
function pageUrl(lang, page) {
  return page === 'index' ? `${SITE}/${lang}` : `${SITE}/${lang}/${page}`;
}

// 同じページの各言語版を相互に示す。x-default は言語自動判定のページに向ける。
function defaultUrl(page) {
  return page === 'index' ? `${SITE}/` : `${SITE}/${page}`;
}

function buildHreflang(page) {
  const links = LANG_SWITCH.map((entry) => `<link rel="alternate" hreflang="${entry.lang}" href="${pageUrl(entry.lang, page)}">`);
  links.push(`<link rel="alternate" hreflang="x-default" href="${defaultUrl(page)}">`);
  return links.join('\n');
}

function loadGuide(lang) {
  const path = join(GUIDE_DIR, `${lang}.json`);
  if (!existsSync(path)) return null;
  return readJson(path);
}

function linkedGuide(lang) {
  const guide = loadGuide(lang);
  return guide && (guide.linked || guide.published) ? guide : null;
}

function publishedGuide(lang) {
  const guide = loadGuide(lang);
  return guide && guide.published ? guide : null;
}

// 共通メニュー（js/site-menu.js）へ渡す解説記事のリンク先。記事の無い言語では空文字。
function buildGuideMenu(lang) {
  const guide = linkedGuide(lang);
  if (!guide) return '';
  const intro = guide.articles.find((a) => a.slug === guide.index.introSlug) || guide.articles[0];
  return `,
  guide: {
    hub: '/${lang}/${GUIDE_SECTION}',
    hubLabel: ${JSON.stringify(guide.index.menuLabel || guide.index.h1)},
    intro: '/${lang}/${GUIDE_SECTION}/${intro.slug}',
    introLabel: ${JSON.stringify(intro.menuLabel || intro.h1)},
    groupLabel: ${JSON.stringify(guide.index.menuGroup || '')}
  }`;
}

// 共通メニューへ渡す単機能ツールのリンク先。対象外の言語では空文字。
function buildToolsMenu(lang, strings) {
  const tools = toolsMenu(lang, (key) => lookup(strings, key));
  if (!tools) return '';
  const items = tools.items.map(
    (item) => `      { href: '${item.href}', label: ${JSON.stringify(item.label)} }`
  );
  return `,
  tools: {
    groupLabel: ${JSON.stringify(tools.groupLabel)},
    items: [
${items.join(',\n')}
    ]
  }`;
}

// 記事は言語ごとに独立しており、他言語版が無いので hreflang は付けない。
function buildGuideSitemapUrls() {
  const urls = [];
  for (const entry of LANG_SWITCH) {
    const guide = publishedGuide(entry.lang);
    if (!guide) continue;
    const base = `${SITE}/${entry.lang}/${GUIDE_SECTION}`;
    urls.push(`  <url>\n    <loc>${base}</loc>\n  </url>`);
    for (const article of guide.articles) {
      urls.push(`  <url>\n    <loc>${base}/${article.slug}</loc>\n  </url>`);
    }
    for (const name of COLLECTION_DIRS) {
      const path = join(GUIDE_DIR, name, `${entry.lang}.json`);
      if (!existsSync(path)) continue;
      const col = readJson(path);
      for (const item of col.items) {
        urls.push(`  <url>\n    <loc>${base}/${col.slugPrefix}-${item.slug}</loc>\n  </url>`);
      }
    }
  }
  return urls;
}

// トップの「解説記事」一覧。linked でない・記事の無い言語では空文字（枠ごと出さない）。
function buildGuideLinks(lang) {
  const guide = linkedGuide(lang);
  if (!guide) return '';
  const items = guide.articles
    .map((a) => `<li><a href="/${lang}/${GUIDE_SECTION}/${a.slug}">${escapeAttr(a.h1)}</a></li>`)
    .join('\n');
  return `<div class="about-block guide-links">\n<h3 class="about-h3">${escapeAttr(guide.index.h1)}</h3>\n<ul>\n${items}\n</ul>\n<p class="guide-links-more"><a href="/${lang}/${GUIDE_SECTION}">${escapeAttr(guide.index.more)}</a></p>\n</div>`;
}

// 一部の言語でだけ公開しているページ（他言語は準備中）。
const SITEMAP_LANG_PAGES = { compat: ['ja'] };
const COMPAT_LANGS = new Set(SITEMAP_LANG_PAGES.compat);

function buildCompatProductItem(lang, strings) {
  const label = escapeAttr(lookup(strings, 'menu.compat'));
  if (COMPAT_LANGS.has(lang)) return `<li><a href="/${lang}/compat">${label}</a></li>`;
  return `<li><span class="soon">${label}<span class="tag">${escapeAttr(lookup(strings, 'menu.calendarNote'))}</span></span></li>`;
}

function buildSitemap() {
  const urls = [];
  for (const [page, langs] of Object.entries(SITEMAP_LANG_PAGES)) {
    for (const lang of langs) urls.push(`  <url>\n    <loc>${pageUrl(lang, page)}</loc>\n  </url>`);
  }
  for (const page of SITEMAP_PAGES) {
    for (const entry of LANG_SWITCH) {
      const alternates = LANG_SWITCH.map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt.lang}" href="${pageUrl(alt.lang, page)}"/>`);
      urls.push([
        '  <url>',
        `    <loc>${pageUrl(entry.lang, page)}</loc>`,
        ...alternates,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${defaultUrl(page)}"/>`,
        '  </url>'
      ].join('\n'));
    }
  }
  urls.push(...buildGuideSitemapUrls());
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    ''
  ].join('\n');
}

function buildLangSwitcher(current) {
  const links = LANG_SWITCH.map((entry) => {
    const cls = entry.lang === current ? 'lang-link is-current' : 'lang-link';
    return `<a class="${cls}" href="/${entry.lang}" hreflang="${entry.lang}" lang="${entry.lang}" title="${entry.title}" aria-label="${entry.title}"><img class="lang-globe" src="/img/globe.svg" alt="" width="20" height="20"><span class="lang-code">${entry.label}</span></a>`;
  });
  return `<nav class="lang-switch" aria-label="Language">\n${links.join('\n')}\n</nav>\n<script>document.querySelectorAll('.lang-switch a').forEach(function(a){a.addEventListener('click',function(){document.cookie='lj_lang='+a.getAttribute('hreflang')+';path=/;max-age=31536000;samesite=lax';});});</script>`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// templates/ 直下と1階層下（templates/tools/ など）のテンプレートを集める。partials は除く。
function listTemplates(dir, prefix = '') {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  const out = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === 'partials') continue;
      out.push(...listTemplates(join(dir, entry.name), `${prefix}${entry.name}/`));
    } else if (entry.name.endsWith('.html')) {
      out.push(`${prefix}${entry.name}`);
    }
  }
  return out;
}

function lookup(obj, path) {
  if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function escapeJsonString(value) {
  return JSON.stringify(String(value)).slice(1, -1).replace(/</g, '\\u003c');
}

// 文字列リテラルの引用符種別に依らず安全にするため、3種の引用符と ${ をすべて退避する。
function escapeJs(value) {
  return JSON.stringify(String(value)).slice(1, -1).replace(/'/g, "\\'").replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function escapeTemplate(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// partial の中の partial（tool-page → i18n-globals）も展開するため、残らなくなるまで繰り返す。
function expandPartials(template) {
  for (let depth = 0; PARTIAL.test(template); depth += 1) {
    PARTIAL.lastIndex = 0;
    if (depth > 10) throw new Error('partial の入れ子が深すぎます（循環参照の可能性）');
    template = template.replace(PARTIAL, (match, name) => readFileSync(join(PARTIAL_DIR, `${name}.html`), 'utf8').replace(/\n$/, ''));
  }
  PARTIAL.lastIndex = 0;
  return template;
}

function render(template, locale, base, context) {
  const missing = [];
  template = expandPartials(template);
  const output = template.replace(PLACEHOLDER, (match, path, filter) => {
    let value;
    // {{tool.*}}: 共通 partial（tool-page）から、そのページのツールの文言を引く。
    // 例：tools/moon-sign.html の {{tool.h1}} → {{t.tools.moonSign.h1}}
    if (path.startsWith('tool.')) {
      if (!context.tool) throw new Error(`${context.name}: {{tool.*}} は templates/tools/ 以下でのみ使えます`);
      path = `t.tools.${context.tool}.${path.slice(5)}`;
    }
    if (path.startsWith('t.')) {
      const key = path.slice(2);
      value = lookup(locale.strings, key);
      if (value === undefined) {
        value = lookup(base.strings, key);
        if (value === undefined) throw new Error(`${context.name}: 文言キー ${key} が ${BASE_LANG} にも存在しません`);
        missing.push(key);
      }
      value = String(value).split('%LANG%').join(locale.meta.lang);
    } else if (path === 'langSwitcher') {
      value = buildLangSwitcher(locale.meta.lang);
    } else if (path === 'guideLinks') {
      value = buildGuideLinks(locale.meta.lang);
    } else if (path === 'guideMenu') {
      value = buildGuideMenu(locale.meta.lang);
    } else if (path === 'toolsMenu') {
      value = buildToolsMenu(locale.meta.lang, locale.strings);
    } else if (path === 'pdfIntroJa') {
      // 生涯完全鑑定書の商品説明（言語別 partial）。
      value = expandPartials(`{{>pdf-intro-${locale.meta.lang}}}`);
    } else if (path === 'compatProductItem') {
      value = buildCompatProductItem(locale.meta.lang, locale.strings);
    } else if (path === 'robotsSaleJa') {
      value = buildRobotsSaleJa(locale.meta.lang);
    } else if (path === 'page') {
      // {{page}}: そのページのパス（例 tools/moon-sign）。単機能ツールが自分の種別をJSへ渡すのに使う。
      value = context.page;
    } else if (path === 'canonical') {
      value = pageUrl(locale.meta.lang, context.page);
    } else if (path === 'hreflang') {
      value = buildHreflang(context.page);
    } else {
      value = locale.meta[path] ?? base.meta[path];
      if (value === undefined) throw new Error(`${context.name}: メタ情報 ${path} が未定義です`);
    }
    if (filter === 'js') return escapeJs(value);
    if (filter === 'tpl') return escapeTemplate(value);
    if (filter === 'attr') return escapeAttr(value);
    if (filter === 'json') return escapeJsonString(value);
    return String(value);
  });
  return { output, missing };
}

function main() {
  const check = process.argv.includes('--check');
  const templates = listTemplates(TEMPLATE_DIR);
  const langs = readdirSync(LOCALE_DIR).filter((name) => name.endsWith('.json')).map((name) => name.replace(/\.json$/, '')).sort();
  const base = readJson(join(LOCALE_DIR, `${BASE_LANG}.json`));

  const stale = [];
  for (const lang of langs) {
    const locale = readJson(join(LOCALE_DIR, `${lang}.json`));
    const outDir = join(ROOT, lang);
    if (!check && !existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const missingKeys = new Set();
    for (const name of templates) {
      const template = readFileSync(join(TEMPLATE_DIR, name), 'utf8');
      const page = name.replace(/\.html$/, '');
      const toolMatch = /^tools\/(.+)$/.exec(page);
      const tool = toolMatch ? toolMatch[1].replace(/-([a-z])/g, (m, c) => c.toUpperCase()) : null;
      const { output, missing } = render(template, locale, base, { name: `${lang}/${name}`, page, tool });
      missing.forEach((key) => missingKeys.add(key));

      const outPath = join(outDir, name);
      if (!check) mkdirSync(dirname(outPath), { recursive: true });
      if (check) {
        const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : null;
        if (current !== output) stale.push(`${lang}/${name}`);
      } else {
        writeFileSync(outPath, output);
      }
    }
    if (missingKeys.size) {
      console.warn(`[${lang}] 未翻訳 ${missingKeys.size} 件（${BASE_LANG} の文言で生成）: ${[...missingKeys].slice(0, 5).join(', ')}${missingKeys.size > 5 ? ' …' : ''}`);
    }
  }

  // 共通メニューの文言表（js/site-menu.js 内の生成ブロック）。手書きページの古い埋め込み文言より優先される。
  const menuPath = join(ROOT, 'js', 'site-menu.js');
  const menuSrc = readFileSync(menuPath, 'utf8');
  const menuTable = {};
  for (const lang of langs) {
    const locale = readJson(join(LOCALE_DIR, `${lang}.json`));
    menuTable[lang] = {};
    for (const [key, value] of Object.entries(locale.strings || {})) {
      if (key.startsWith('menu.')) menuTable[lang][key.slice(5)] = value;
    }
  }
  const menuBlock = `/* MENU_I18N:start (generated by scripts/build-i18n.mjs) */\n  const MENU_I18N = ${JSON.stringify(menuTable)};\n  /* MENU_I18N:end */`;
  const menuOut = menuSrc.replace(/\/\* MENU_I18N:start[\s\S]*?MENU_I18N:end \*\//, () => menuBlock);
  if (!/MENU_I18N:start/.test(menuSrc)) throw new Error('js/site-menu.js に MENU_I18N ブロックがありません');

  if (check) {
    if (menuOut !== menuSrc) stale.push('js/site-menu.js');
    if (stale.length) {
      console.error(`テンプレートと生成物が一致しません。node scripts/build-i18n.mjs を実行してコミットしてください:\n  ${stale.join('\n  ')}`);
      process.exit(1);
    }
    const sitemapPath = join(ROOT, 'sitemap.xml');
    if (!existsSync(sitemapPath) || readFileSync(sitemapPath, 'utf8') !== buildSitemap()) {
      console.error('sitemap.xml が最新ではありません。node scripts/build-i18n.mjs を実行してコミットしてください');
      process.exit(1);
    }
    console.log(`生成物は最新です（${langs.length}言語 × ${templates.length}ページ）`);
    return;
  }
  writeFileSync(menuPath, menuOut);
  writeFileSync(join(ROOT, 'sitemap.xml'), buildSitemap());
  console.log(`生成しました: ${langs.length}言語 × ${templates.length}ページ + sitemap.xml`);
}

main();
