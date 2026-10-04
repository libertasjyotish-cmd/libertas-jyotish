// 単機能ツールページ（/<lang>/tools/...）が本番で動くかを実ブラウザで確認する。
// Bot Protection が curl を弾くため、起動済み Chrome に CDP で繋いで確認する。
// 使い方: node scripts/check-tools-live.mjs [origin] [lang...]
import puppeteer from 'puppeteer-core';

const CDP = process.env.CDP_URL || 'http://localhost:29229';
const origin = process.argv[2] || 'https://www.libertas-jyotish.com';
const langs = process.argv.slice(3).length ? process.argv.slice(3) : ['ja'];
const TOOLS = ['moon-sign', 'nakshatra', 'dasha'];
const SAMPLE = { date: '1985-07-14', time: '09:30', place: { ja: '東京', en: 'Tokyo' } };

const browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: { width: 1280, height: 1600 } });
const page = await browser.newPage();
let failed = 0;

for (const lang of langs) {
  for (const tool of TOOLS) {
    const url = `${origin}/${lang}/tools/${tool}`;
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const h1 = await page.$eval('h1', (el) => el.textContent.trim()).catch(() => '(なし)');
    await page.type('#tool-place', SAMPLE.place[lang] || SAMPLE.place.en);
    await page.$eval('#tool-date', (el, v) => { el.value = v; }, SAMPLE.date);
    await page.$eval('#tool-time', (el, v) => { el.value = v; }, SAMPLE.time);
    await page.click('#tool-submit');
    const ok = await page
      .waitForFunction(() => {
        const r = document.getElementById('tool-result');
        const s = document.getElementById('tool-status');
        return (r && !r.hidden) || (s && !s.hidden && s.classList.contains('is-error'));
      }, { timeout: 60000 })
      .then(() => true)
      .catch(() => false);
    const values = await page.$$eval('#tool-values div', (rows) =>
      rows.map((r) => `${r.querySelector('dt').textContent}: ${r.querySelector('dd').textContent}`)
    ).catch(() => []);
    const guide = await page.$eval('#tool-guide a', (a) => a.getAttribute('href')).catch(() => null);
    const error = await page.$eval('#tool-status.is-error', (el) => el.textContent).catch(() => null);
    const pass = ok && !error && values.length > 0;
    if (!pass) failed += 1;
    console.log(`${pass ? 'OK  ' : 'NG  '} ${url} [${res.status()}] h1=${h1}`);
    if (values.length) console.log(`     ${values.join(' / ')}${guide ? ` / guide=${guide}` : ''}`);
    if (error) console.log(`     error: ${error}`);
  }
}

await page.close();
browser.disconnect();
process.exit(failed ? 1 : 0);
