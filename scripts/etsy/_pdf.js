// 既存の鑑定書ページ（<lang>/pdf-report.html）を Chromium で開き、API 応答を差し込んで PDF 化する。
// 描画ロジックはブラウザ版と共通なので、レイアウトや多言語・RTL の二重実装をしない。
const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff'
};

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  `${process.env.HOME || ''}/.local/bin/google-chrome`
].filter(Boolean);

function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Chrome/Chromium not found. Set CHROME_PATH.');
  return found;
}

// Vercel の cleanUrls と同じ規則（/en/pdf-report → en/pdf-report.html）でリポジトリを配信する
function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let file = path.join(ROOT, urlPath);
      if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      else if (!path.extname(file) && fs.existsSync(`${file}.html`)) file = `${file}.html`;
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

// report: { astro, chapters } — /api/pdf-report の応答と同じ形。extraHtml は末尾ページ（レビュー依頼など）。
async function renderReportPdf({ lang, report, extraHtml = '' }) {
  const { server, port } = await startStaticServer();
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
  });
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
      req.continue();
    });

    await page.goto(`http://127.0.0.1:${port}/${lang}/pdf-report`, { waitUntil: 'networkidle0', timeout: 90000 });
    await page.waitForFunction(
      () => { const b = document.getElementById('book'); return b && b.style.display !== 'none' && b.children.length > 5; },
      { timeout: 60000 }
    );
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
    await page.emulateMediaType('print');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '14mm', right: '14mm', bottom: '14mm', left: '14mm' }
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => null);
    server.close();
  }
}

module.exports = { renderReportPdf };
