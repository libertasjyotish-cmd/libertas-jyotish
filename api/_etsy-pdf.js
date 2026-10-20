// 既存の鑑定書ページ（<lang>/pdf-report）を Chromium で開き、API 応答を差し込んで PDF 化する。
// ページと同一オリジンの静的ファイルは関数に同梱したファイルから返し、サイトのファイアウォールや通信状況に左右されないようにする。
// 描画ロジックはブラウザ版と共通なので、レイアウトや多言語・RTL の二重実装をしない。
// Vercel 上では @sparticuz/chromium、ローカルでは CHROME_PATH などのシステム Chrome を使う。
// puppeteer-core / @sparticuz/chromium は ESM のみなので import() で読み込む（Vercel の Node ランタイムは require(esm) 不可）。
const fs = require('fs');
const path = require('path');

const BASE_URL = (process.env.ETSY_REPORT_BASE_URL || 'https://www.libertas-jyotish.com').replace(/\/$/, '');

const ROOT = path.join(__dirname, '..');
const PAGE_TIMEOUT_MS = 60000;
const CONTENT_TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon' };

// BASE_URL 配下の URL を同梱ファイルに対応づける（cleanUrls なので拡張子なしは .html を探す）。無ければ null。
function localFile(url) {
  let parsed;
  try { parsed = new URL(url); } catch (err) { return null; }
  if (parsed.origin !== new URL(BASE_URL).origin) return null;
  const rel = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
  for (const candidate of [rel, `${rel}.html`]) {
    const file = path.resolve(ROOT, candidate);
    if (!file.startsWith(ROOT + path.sep)) continue;
    const type = CONTENT_TYPES[path.extname(file).toLowerCase()];
    if (type && fs.existsSync(file) && fs.statSync(file).isFile()) return { file, type };
  }
  return null;
}

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  `${process.env.HOME || ''}/.local/bin/google-chrome`
].filter(Boolean);

async function launchBrowser() {
  const { default: puppeteer } = await import('puppeteer-core');
  const local = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (local && !process.env.VERCEL) {
    return puppeteer.launch({
      executablePath: local,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
    });
  }
  const { default: chromium } = await import('@sparticuz/chromium');
  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    headless: true,
    args: [...chromium.args, '--font-render-hinting=none'],
    defaultViewport: { width: 1000, height: 1400 }
  });
}

// report: { astro, chapters } — /api/pdf-report の応答と同じ形。extraHtml は末尾ページ（レビュー依頼など）。
async function renderReportPdf({ lang, report, extraHtml = '' }) {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('lj_user_email', 'etsy@libertas-jyotish.com');
      localStorage.setItem('lj_session', 'etsy');
    });
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.url().includes('/api/pdf-report')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ source: 'stored', language: lang, astro: report.astro, chapters: report.chapters, pending: [] })
        });
        return;
      }
      const local = localFile(req.url());
      if (local) {
        req.respond({ status: 200, contentType: local.type, body: fs.readFileSync(local.file) });
        return;
      }
      req.continue();
    });

    const response = await page.goto(`${BASE_URL}/${lang}/pdf-report`, { waitUntil: 'networkidle0', timeout: PAGE_TIMEOUT_MS });
    if (!response || !response.ok()) throw new Error(`pdf page HTTP ${response ? response.status() : 'no response'}`);
    try {
      await page.waitForFunction(
        () => { const b = document.getElementById('book'); return b && b.style.display !== 'none' && b.children.length > 5; },
        { timeout: PAGE_TIMEOUT_MS }
      );
    } catch (err) {
      const status = await page.evaluate(() => (document.getElementById('status') || {}).textContent || '').catch(() => '');
      throw new Error(`pdf page not rendered: ${String(status).trim().slice(0, 200) || err.message}`);
    }
    if (extraHtml) {
      await page.evaluate((html) => {
        const book = document.getElementById('book');
        const section = document.createElement('section');
        section.className = 'page';
        section.innerHTML = html;
        book.appendChild(section);
      }, extraHtml);
    }
    // 章ページの薄い背景画像はページごとにビットマップとして埋め込まれ PDF が数十 MB になるため、表紙以外では外す
    await page.addStyleTag({ content: '.page:not(.cover)::before { background-image: none !important; }' });
    await page.evaluateHandle('document.fonts.ready');
    // 手相写真（Blob URL）は本文差し込み後に読み込まれるので、描画完了を待つ（失敗した画像は空のまま進める）
    await page.evaluate(() => Promise.all(
      Array.from(document.images).filter((img) => !img.complete).map((img) => new Promise((done) => { img.onload = done; img.onerror = done; }))
    ));
    // スマホ写真は原寸（数 MB）のまま PDF に埋め込まれるので、描画幅に合わせて縮小して差し替える
    await page.evaluate(() => {
      for (const img of document.querySelectorAll('.palm-photo img')) {
        if (!img.naturalWidth) continue;
        const scale = Math.min(1, 900 / img.naturalWidth);
        if (scale === 1) continue;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        img.src = canvas.toDataURL('image/jpeg', 0.82);
      }
    });
    await page.evaluate(() => Promise.all(
      Array.from(document.images).filter((img) => !img.complete).map((img) => new Promise((done) => { img.onload = done; img.onerror = done; }))
    ));
    await page.emulateMediaType('print');
    const pdf = await page.pdf({
      format: 'A5',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '11mm', right: '11mm', bottom: '11mm', left: '11mm' }
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => null);
  }
}

module.exports = { renderReportPdf, localFile };
