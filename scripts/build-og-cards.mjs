#!/usr/bin/env node
// 宿の解説ページ（/<lang>/guide/nakshatra-<slug>）のリンクプレビュー画像 1200×630 を作る。
// 中身はシェア用カード（js/share-card.js）を縦のまま左に置き、右に宿の名前と特徴を大きく書く。
// 作った画像は scripts/build-guide.mjs が og:image に使う。文言を変えたら作り直してコミットする。
//
//   CHROME_PATH=/path/to/chrome node scripts/build-og-cards.mjs [lang...]

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = process.argv.slice(2).length ? process.argv.slice(2) : ['ja', 'en', 'es', 'pt', 'fr', 'de', 'id', 'ar'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = createServer((req, res) => {
  let p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!existsSync(p) && existsSync(`${p}.html`)) p = `${p}.html`;
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((ok) => server.listen(0, ok));
const base = `http://127.0.0.1:${server.address().port}`;

const executablePath = process.env.CHROME_PATH || execSync('readlink -f "$(which google-chrome)"').toString().trim();
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });

try {
  for (const lang of LANGS) {
    const strings = JSON.parse(readFileSync(join(ROOT, 'locales', `${lang}.json`), 'utf8')).strings.share;
    const slugs = Object.keys(JSON.parse(readFileSync(join(ROOT, 'data', 'share-card', `${lang}.json`), 'utf8')));
    const page = await browser.newPage();
    await page.goto(`${base}/${lang}/guide/nakshatra-${slugs[0]}`, { waitUntil: 'networkidle0' });
    await page.addScriptTag({ url: '/js/share-card.js' });
    const outDir = join(ROOT, 'img', 'og', 'nakshatra', lang);
    mkdirSync(outDir, { recursive: true });
    for (const slug of slugs) {
      const dataUrl = await page.evaluate(async (slug, lang, strings) => {
        const { canvas: card, item } = await window.LJShareCard.render({ slug, lang, strings });
        const bg = await new Promise((ok, ng) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ng; i.src = '/img/bg-jyotish.jpg'; });
        const family = getComputedStyle(document.body).fontFamily || 'serif';
        const W = 1200, H = 630, rtl = lang === 'ar';
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const ctx = c.getContext('2d');
        const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
        ctx.drawImage(bg, (W - bg.naturalWidth * s) / 2, (H - bg.naturalHeight * s) / 2, bg.naturalWidth * s, bg.naturalHeight * s);
        ctx.fillStyle = 'rgba(12,26,31,.55)'; ctx.fillRect(0, 0, W, H);

        const ch = 600, cw = card.width * ch / card.height, cx = rtl ? W - 70 - cw : 70;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
        ctx.drawImage(card, cx, (H - ch) / 2, cw, ch);
        ctx.restore();

        const left = rtl ? 60 : cx + cw + 50, right = rtl ? cx - 50 : W - 60, mid = (left + right) / 2, maxW = right - left;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        if (rtl) ctx.direction = 'rtl';
        const line = (t, y, size, color, weight = 400, font = family) => {
          let z = size;
          do { ctx.font = `${weight} ${z}px ${font}`; } while (ctx.measureText(t).width > maxW && (z -= 2) > 14);
          ctx.fillStyle = color; ctx.fillText(t, mid, y);
          return z;
        };
        line(strings.label, 92, 30, '#e9cf93');
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 12;
        line(item.name, 150, 88, '#fff3cf', 700);
        ctx.restore();
        line(strings.index.replace('{n}', item.no), 268, 34, '#d4af37', 600);
        ctx.strokeStyle = 'rgba(212,175,55,.55)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(mid - 160, 330); ctx.lineTo(mid + 160, 330); ctx.stroke();

        let size = 32, lines;
        const wrap = () => {
          const out = [];
          item.trait.split('\n').forEach((para) => {
            const spaced = /\s/.test(para.trim());
            const units = spaced ? para.split(/\s+/) : Array.from(para);
            let cur = '';
            units.forEach((u) => {
              const next = cur ? (spaced ? `${cur} ${u}` : cur + u) : u;
              if (cur && ctx.measureText(next).width > maxW) { out.push(cur); cur = u; } else cur = next;
            });
            if (cur) out.push(cur);
          });
          return out;
        };
        do { ctx.font = `400 ${size}px ${family}`; lines = wrap(); } while (lines.length > 3 && (size -= 2) > 20);
        ctx.fillStyle = '#f5e9d0';
        lines.forEach((l, i) => ctx.fillText(l, mid, 356 + i * Math.round(size * 1.55)));
        line(strings.cta, 512, 28, '#e9cf93');
        line('LIBERTAS-JYOTISH.COM', 556, 24, '#d4af37', 600, "'Cinzel', serif");
        return c.toDataURL('image/jpeg', 0.72);
      }, slug, lang, strings);
      writeFileSync(join(outDir, `${slug}.jpg`), Buffer.from(dataUrl.split(',')[1], 'base64'));
    }
    await page.close();
    console.log(`${lang}: ${slugs.length}`);
  }
} finally {
  await browser.close();
  server.close();
}
