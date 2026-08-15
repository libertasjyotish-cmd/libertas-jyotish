// 国別価格帯マスター（data/price-tiers.json）の生成スクリプト。
// 出典: 世界銀行 一人当たりGNI(PPP, current international $) 指標 NY.GNP.PCAP.PP.CD
// 生成物はリポジトリに固定で持ち、実行時に外部APIは呼ばない。
// 更新したいときだけ `node scripts/build-price-tiers.js` を手動実行する。
const fs = require('fs');
const path = require('path');

const INDICATOR = 'NY.GNP.PCAP.PP.CD';
const OUT_FILE = path.join(__dirname, '..', 'data', 'price-tiers.json');

// 一人当たりGNI(PPP)の下限値で4段階に区分する。日本(約58,900)が基準の T2。
// factor は日本の価格を1.0としたときの推奨倍率。
const TIERS = [
  { tier: 'T1', min: 75000, factor: 1.5 },
  { tier: 'T2', min: 40000, factor: 1.0 },
  { tier: 'T3', min: 18000, factor: 0.6 },
  { tier: 'T4', min: 0, factor: 0.35 }
];

// データが無い国のフォールバック（基準国と同等に扱わないため中位に寄せる）。
const DEFAULT_TIER = 'T3';

function tierOf(gni) {
  if (!Number.isFinite(gni)) return DEFAULT_TIER;
  return TIERS.find((t) => gni >= t.min).tier;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function main() {
  const countries = await fetchJson('https://api.worldbank.org/v2/country?format=json&per_page=400');
  const indicator = await fetchJson(
    `https://api.worldbank.org/v2/country/all/indicator/${INDICATOR}?format=json&mrnev=1&per_page=400`
  );

  const gniByIso2 = new Map();
  for (const row of indicator[1]) {
    if (typeof row.value === 'number') gniByIso2.set(row.country.id, { gni: row.value, year: row.date });
  }

  const entries = {};
  for (const c of countries[1]) {
    if (c.region.value === 'Aggregates') continue;
    const iso2 = c.iso2Code.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(iso2)) continue;
    const data = gniByIso2.get(iso2);
    entries[iso2] = {
      name: c.name,
      tier: tierOf(data && data.gni),
      gniPpp: data ? Math.round(data.gni) : null,
      year: data ? data.year : null
    };
  }

  const sorted = Object.keys(entries).sort().reduce((acc, k) => { acc[k] = entries[k]; return acc; }, {});
  const output = {
    source: 'World Bank, GNI per capita PPP (current international $), indicator NY.GNP.PCAP.PP.CD',
    generatedAt: new Date().toISOString().slice(0, 10),
    thresholds: TIERS,
    defaultTier: DEFAULT_TIER,
    countries: sorted
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`);

  const counts = {};
  for (const v of Object.values(sorted)) counts[v.tier] = (counts[v.tier] || 0) + 1;
  console.log(`${Object.keys(sorted).length} countries ->`, counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
