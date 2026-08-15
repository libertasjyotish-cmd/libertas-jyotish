#!/usr/bin/env node
// 言語別HTMLを templates/ と locales/ から生成する。
//
//   node scripts/build-i18n.mjs          … 全言語を生成
//   node scripts/build-i18n.mjs --check  … 生成物とコミット済みHTMLの差分を検査（CI用）
//
// テンプレート内で使える記法:
//   {{lang}} {{dir}}            … 言語コード / 表記方向
//   {{fontHref}} {{fontFamily}} … 言語ごとのWebフォント指定
//   {{t.some.key}}              … locales/<lang>.json の文言（そのまま埋め込む）
//   {{t.some.key|js}}           … JavaScript の文字列リテラル内に埋め込む場合
//   {{t.some.key|tpl}}          … テンプレートリテラル（バッククォート）内に埋め込む場合
//   {{t.some.key|attr}}         … HTML属性値に埋め込む場合
//
// 文言が未翻訳の言語では、既定言語（ja）の文言をそのまま使って生成を続ける。

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE_DIR = join(ROOT, 'templates');
const LOCALE_DIR = join(ROOT, 'locales');
const BASE_LANG = 'ja';

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_.-]+)\s*(?:\|\s*(js|attr|tpl)\s*)?\}\}/g;

// フッターの言語切替。表示順と表記はここだけで管理する。
const LANG_SWITCH = [
  { lang: 'ja', label: '日本語', title: '日本語' },
  { lang: 'en', label: 'English', title: 'English' },
  { lang: 'es', label: 'Español', title: 'Español' },
  { lang: 'pt', label: 'Português', title: 'Português' },
  { lang: 'ar', label: 'العربية', title: 'العربية' },
  { lang: 'id', label: 'Indonesia', title: 'Bahasa Indonesia' }
];

function buildLangSwitcher(current) {
  const links = LANG_SWITCH.map((entry) => {
    const cls = entry.lang === current ? 'lang-link is-current' : 'lang-link';
    return `<a class="${cls}" href="/${entry.lang}" hreflang="${entry.lang}" lang="${entry.lang}" title="${entry.title}" aria-label="${entry.title}"><img class="lang-globe" src="/img/globe.svg" alt="" width="20" height="20"><span class="lang-code">${entry.label}</span></a>`;
  });
  return `<nav class="lang-switch" aria-label="Language">\n${links.join('\n')}\n</nav>`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function lookup(obj, path) {
  if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
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

function render(template, locale, base, context) {
  const missing = [];
  const output = template.replace(PLACEHOLDER, (match, path, filter) => {
    let value;
    if (path.startsWith('t.')) {
      const key = path.slice(2);
      value = lookup(locale.strings, key);
      if (value === undefined) {
        value = lookup(base.strings, key);
        if (value === undefined) throw new Error(`${context}: 文言キー ${key} が ${BASE_LANG} にも存在しません`);
        missing.push(key);
      }
    } else if (path === 'langSwitcher') {
      value = buildLangSwitcher(locale.meta.lang);
    } else {
      value = locale.meta[path] ?? base.meta[path];
      if (value === undefined) throw new Error(`${context}: メタ情報 ${path} が未定義です`);
    }
    if (filter === 'js') return escapeJs(value);
    if (filter === 'tpl') return escapeTemplate(value);
    if (filter === 'attr') return escapeAttr(value);
    return String(value);
  });
  return { output, missing };
}

function main() {
  const check = process.argv.includes('--check');
  const templates = readdirSync(TEMPLATE_DIR).filter((name) => name.endsWith('.html')).sort();
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
      const { output, missing } = render(template, locale, base, `${lang}/${name}`);
      missing.forEach((key) => missingKeys.add(key));

      const outPath = join(outDir, name);
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

  if (check) {
    if (stale.length) {
      console.error(`テンプレートと生成物が一致しません。node scripts/build-i18n.mjs を実行してコミットしてください:\n  ${stale.join('\n  ')}`);
      process.exit(1);
    }
    console.log(`生成物は最新です（${langs.length}言語 × ${templates.length}ページ）`);
    return;
  }
  console.log(`生成しました: ${langs.length}言語 × ${templates.length}ページ`);
}

main();
