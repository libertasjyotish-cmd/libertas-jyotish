// Google Play の商品価格を PWA の価格帯（api/_pricing.js の AMOUNTS / USD_AMOUNTS × data/price-tiers.json）と同一にする。
//   node scripts/play-prices.mjs [--apply] [--token=<access token>]
// 既定は差分表示のみ。--apply で Play Developer API（oneTimeProducts.patch allowMissing / subscriptions.patch）に書き込む。
// トークンは PLAY_ACCESS_TOKEN か --token、無ければ gcloud auth print-access-token（androidpublisher スコープ）を使う。
// 日本は円（JP の価格帯の AMOUNTS）、その他の国は price-tiers の価格帯の USD 金額を Play の pricing:convertRegionPrices で現地通貨に換算する。
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { AMOUNTS, USD_AMOUNTS, resolveTier } = require('../api/_pricing.js');
const { PLAY_PRODUCTS } = require('../api/_play.js');

const PACKAGE = 'com.libertas_jyotish.app';
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;
const APPLY = process.argv.includes('--apply');
const LISTINGS = {
  pdf: { title: '生涯完全鑑定書', description: '出生図にもとづく完全版の個人鑑定書PDF（約55ページ）。性格・仕事・恋愛・金運・健康・ダシャー（運勢の時期）を網羅。' },
  yearly: { title: '年間運勢カレンダー', description: 'お申し込みの翌月から12か月の運勢と、行動ごとに実行する月・避ける月を示す鑑定書PDF。' },
  career: { title: '仕事運・金運・天職 鑑定書', description: '向く仕事・力が出る条件・評価のされ方・金運を出生図から読み解く鑑定書PDF（約55ページ）。' },
  palm: { title: 'カル・クンダリ（手相×出生図）', description: '両手の手相写真と出生図を照合する統合鑑定書PDF（約55ページ）。' },
  compat: { title: '相性鑑定書（二人分）', description: '二人の出生図から、なぜ出逢ったのか・縁の種類・今後10年の流れを読み解く鑑定書PDF（55ページ以上）。' }
};

function token() {
  const arg = process.argv.find(a => a.startsWith('--token='));
  if (arg) return arg.slice(8);
  if (process.env.PLAY_ACCESS_TOKEN) return process.env.PLAY_ACCESS_TOKEN;
  return execFileSync('gcloud', ['auth', 'print-access-token', '--scopes=https://www.googleapis.com/auth/androidpublisher']).toString().trim();
}
const TOKEN = token();
async function call(method, path, body) {
  const res = await fetch(API + path, { method, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}
const convertCache = {};
async function convert(usd) {
  if (!convertCache[usd]) {
    const units = Math.floor(usd), nanos = Math.round((usd - units) * 1e9);
    convertCache[usd] = await call('POST', '/pricing:convertRegionPrices', { price: { currencyCode: 'USD', units: String(units), nanos } });
  }
  return convertCache[usd];
}
function money(p) { return `${p.currencyCode} ${p.units || 0}${p.nanos ? '.' + String(p.nanos).padStart(9, '0').replace(/0+$/, '') : ''}`; }

// 地域ごとの価格: JP は円の価格帯どおり、他は price-tiers の価格帯の USD を換算
async function regionalPrices(product) {
  const regions = Object.keys((await convert(USD_AMOUNTS[product].T2)).convertedRegionPrices);
  const out = {};
  for (const region of regions) {
    const tier = resolveTier(region);
    if (region === 'JP') { out.JP = { currencyCode: 'JPY', units: String(AMOUNTS[product][tier]) }; continue; }
    const conv = (await convert(USD_AMOUNTS[product][tier])).convertedRegionPrices[region];
    out[region] = conv.price;
  }
  return out;
}

async function syncOneTime(product, existing) {
  const id = PLAY_PRODUCTS[product].id;
  const prices = await regionalPrices(product);
  const current = existing && existing.purchaseOptions[0];
  const diff = Object.entries(prices).filter(([r, p]) => {
    const c = current && (current.regionalPricingAndAvailabilityConfigs || []).find(x => x.regionCode === r);
    return !c || money(c.price) !== money(p);
  });
  console.log(`${id}: ${existing ? 'update' : 'CREATE'} ${diff.length} region price changes`, diff.slice(0, 6).map(([r, p]) => `${r}=${money(p)}`).join(' '));
  if (!APPLY) return;
  const usdT2 = (await convert(USD_AMOUNTS[product].T2));
  const body = {
    packageName: PACKAGE, productId: id,
    listings: [{ languageCode: 'ja-JP', ...LISTINGS[product] }],
    taxAndComplianceSettings: (existing && existing.taxAndComplianceSettings) || {},
    purchaseOptions: [{
      purchaseOptionId: 'buy', state: 'ACTIVE',
      buyOption: { legacyCompatible: true },
      newRegionsConfig: { usdPrice: { currencyCode: 'USD', units: String(Math.floor(USD_AMOUNTS[product].T2)), nanos: Math.round((USD_AMOUNTS[product].T2 % 1) * 1e9) }, eurPrice: usdT2.convertedRegionPrices.DE.price, availability: 'AVAILABLE' },
      regionalPricingAndAvailabilityConfigs: Object.entries(prices).map(([regionCode, price]) => ({ regionCode, price, availability: 'AVAILABLE' })),
      taxAndComplianceSettings: (current && current.taxAndComplianceSettings) || { withdrawalRightType: 'WITHDRAWAL_RIGHT_DIGITAL_CONTENT' }
    }]
  };
  const ver = (existing && existing.regionsVersion && existing.regionsVersion.version) || usdT2.regionVersion.version;
  await call('PATCH', `/onetimeproducts/${id}?allowMissing=true&updateMask=listings,purchaseOptions,taxAndComplianceSettings&regionsVersion.version=${encodeURIComponent(ver)}`, body);
  console.log(`${id}: written`);
}

async function syncSubscription(existing) {
  const prices = await regionalPrices('premium');
  const plan = existing.basePlans[0];
  const diff = Object.entries(prices).filter(([r, p]) => { const c = plan.regionalConfigs.find(x => x.regionCode === r); return !c || money(c.price) !== money(p); });
  console.log(`premium_monthly/${plan.basePlanId}: ${diff.length} region price changes`, diff.slice(0, 6).map(([r, p]) => `${r}=${money(p)}`).join(' '));
  if (!APPLY || !diff.length) return;
  plan.regionalConfigs = Object.entries(prices).map(([regionCode, price]) => ({ regionCode, price, newSubscriberAvailability: true }));
  const ver = (existing.regionsVersion && existing.regionsVersion.version) || (await convert(USD_AMOUNTS.premium.T2)).regionVersion.version;
  await call('PATCH', `/subscriptions/premium_monthly?updateMask=basePlans&regionsVersion.version=${encodeURIComponent(ver)}`, { packageName: PACKAGE, productId: 'premium_monthly', basePlans: existing.basePlans });
  // 既存加入者への価格移行（初回の値上げ移行は Play Console からしか開始できないため、失敗しても新規加入者の価格は反映済み）
  try {
    await call('POST', `/subscriptions/premium_monthly/basePlans/${plan.basePlanId}:migratePrices`, {
      packageName: PACKAGE, productId: 'premium_monthly', basePlanId: plan.basePlanId,
      regionsVersion: { version: ver },
      regionalPriceMigrations: Object.keys(prices).map(regionCode => ({ regionCode, oldestAllowedPriceVersionTime: new Date().toISOString(), priceIncreaseType: 'PRICE_INCREASE_TYPE_OPT_OUT' }))
    });
  } catch (e) { console.log('premium_monthly: existing-subscriber migration skipped —', e.message.slice(0, 160)); return; }
  console.log('premium_monthly: written + migrated');
}

const otp = (await call('GET', '/oneTimeProducts')).oneTimeProducts || [];
for (const product of ['pdf', 'yearly', 'career', 'palm', 'compat']) {
  await syncOneTime(product, otp.find(p => p.productId === PLAY_PRODUCTS[product].id));
}
const subs = (await call('GET', '/subscriptions')).subscriptions || [];
await syncSubscription(subs.find(s => s.productId === 'premium_monthly'));
if (!APPLY) console.log('dry run — add --apply to write');
