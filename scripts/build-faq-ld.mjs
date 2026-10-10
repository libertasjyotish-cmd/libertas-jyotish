// 商品ページ（yearly / career / palm-chart、全言語）の「よくある質問」(dl.pc-faq) を
// そのまま FAQPage の JSON-LD として <head> に埋め込む。文章の追加・変更はしない。
//   node scripts/build-faq-ld.mjs          … 生成（既存ブロックは置き換え）
//   node scripts/build-faq-ld.mjs --check  … 生成結果と差があれば exit 1
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.libertas-jyotish.com';
const PAGES = ['yearly', 'career', 'palm-chart', 'compat', 'karma'];
const LANGS = readdirSync(join(ROOT, 'locales')).filter((n) => n.endsWith('.json')).map((n) => n.replace(/\.json$/, ''));
const MARK = 'data-faq-ld';
const BLOCK = new RegExp(`<script type="application/ld\\+json" ${MARK}>[\\s\\S]*?</script>\\n`);

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function extractFaq(html) {
  const dl = html.match(/<dl class="pc-faq">([\s\S]*?)<\/dl>/);
  if (!dl) return [];
  const items = [];
  const re = /<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g;
  let m;
  while ((m = re.exec(dl[1]))) {
    const q = stripTags(m[1]).replace(/^(Q\.|Q:|Q|س\.|P\.|F\.|T\.)\s*/i, "");
    const a = stripTags(m[2]);
    if (q && a) items.push({ q, a });
  }
  return items;
}

function buildBlock(lang, page, items) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE}/${lang}/${page}#faq`,
    inLanguage: lang,
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a }
    }))
  };
  return `<script type="application/ld+json" ${MARK}>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

const check = process.argv.includes('--check');
let changed = 0;
for (const lang of LANGS) {
  for (const page of PAGES) {
    const path = join(ROOT, lang, `${page}.html`);
    if (!existsSync(path)) continue;
    const html = readFileSync(path, 'utf8');
    const items = extractFaq(html);
    if (!items.length) { console.warn(`[faq-ld] no FAQ in ${lang}/${page}.html`); continue; }
    const block = buildBlock(lang, page, items);
    let next = html.replace(BLOCK, '');
    next = next.replace('</head>', `${block}\n</head>`);
    if (next !== html) {
      changed++;
      if (check) console.log(`[faq-ld] stale: ${lang}/${page}.html`);
      else { writeFileSync(path, next); console.log(`[faq-ld] ${lang}/${page}.html (${items.length} Q&A)`); }
    }
  }
}
if (check && changed) { console.error(`[faq-ld] ${changed} file(s) out of date. Run: npm run build:faq`); process.exit(1); }
if (check) console.log('[faq-ld] OK');
