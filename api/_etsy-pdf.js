// 既存の鑑定書ページ（<lang>/pdf-report）を Chromium で開き、API 応答を差し込んで PDF 化する。
// 描画ロジックはブラウザ版と共通なので、レイアウトや多言語・RTL の二重実装をしない。
// Vercel 上では @sparticuz/chromium、ローカルでは CHROME_PATH などのシステム Chrome を使う。
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const BASE_URL = (process.env.ETSY_REPORT_BASE_URL || 'https://www.libertas-jyotish.com').replace(/\/$/, '');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  `${process.env.HOME || ''}/.local/bin/google-chrome`
].filter(Boolean);

async function launchBrowser() {
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
      req.continue();
    });

    await page.goto(`${BASE_URL}/${lang}/pdf-report`, { waitUntil: 'networkidle0', timeout: 40000 });
    await page.waitForFunction(
      () => { const b = document.getElementById('book'); return b && b.style.display !== 'none' && b.children.length > 5; },
      { timeout: 20000 }
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
  }
}

module.exports = { renderReportPdf };
