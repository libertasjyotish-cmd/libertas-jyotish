// 国別の通貨と円換算レートのマスター（data/currency-rates.json）の生成スクリプト。
// 出典: 国→通貨 https://github.com/mledoze/countries 、レート https://open.er-api.com（日次更新）
// 生成物はリポジトリに固定で持ち、実行時に外部APIは呼ばない（表示は概算で、確定額はGumroadの決済画面）。
// レートを更新したいときだけ `node scripts/build-currency-rates.js` を手動実行する。
const fs = require('fs');
const path = require('path');

const COUNTRIES_URL = 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json';
const RATES_URL = 'https://open.er-api.com/v6/latest/JPY';
const OUT_FILE = path.join(__dirname, '..', 'data', 'currency-rates.json');

// 小数を使わない通貨（円と同じく最小単位が1のもの）。概算の丸めに使う。
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'ISK', 'HUF', 'PYG', 'RWF', 'UGX', 'VUV', 'XAF', 'XOF', 'XPF', 'KMF', 'DJF', 'GNF', 'MGA', 'BIF']);

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function main() {
  const [countries, rates] = await Promise.all([fetchJson(COUNTRIES_URL), fetchJson(RATES_URL)]);
  if (rates.result !== 'success') throw new Error('レート取得に失敗しました');

  const currencyByCountry = {};
  const used = new Set();
  const skipped = [];
  for (const c of countries) {
    const iso2 = c.cca2;
    const currency = Object.keys(c.currencies || {})[0];
    if (!iso2 || !currency) continue;
    if (!Number.isFinite(rates.rates[currency])) {
      skipped.push(`${iso2}:${currency}`);
      continue;
    }
    currencyByCountry[iso2] = currency;
    used.add(currency);
  }

  const perJpy = {};
  for (const currency of [...used].sort()) {
    perJpy[currency] = rates.rates[currency];
  }

  const out = {
    source: 'currency: mledoze/countries, rates: open.er-api.com (JPY base)',
    note: '表示は概算。確定額はGumroadの決済画面で購入者の通貨により決まる。',
    generatedAt: new Date().toISOString().slice(0, 10),
    ratesUpdatedAt: rates.time_last_update_utc,
    zeroDecimal: [...ZERO_DECIMAL].sort(),
    perJpy,
    countries: Object.fromEntries(Object.keys(currencyByCountry).sort().map((k) => [k, currencyByCountry[k]]))
  };

  fs.writeFileSync(OUT_FILE, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`${Object.keys(out.countries).length}か国 / ${Object.keys(perJpy).length}通貨を書き出しました`);
  if (skipped.length) console.log(`レート無しで除外: ${skipped.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
