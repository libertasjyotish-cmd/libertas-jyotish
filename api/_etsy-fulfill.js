// Etsy 注文の自動処理の本体。Vercel Cron（api/etsy-cron.js）から数分おきに呼ばれ、
// 関数の制限時間内で進められるところまで進めて台帳（Google Sheets）に保存し、次回に続きを行う。
//   注文取得 → パーソナライズ解析 → 天体計算 → 章を数個ずつ生成 → 揃ったら PDF → Resend → Etsy 注文を完了に更新
// 台帳は receipt_id ごとに 1 行。再実行しても二重生成・二重送信しない。
const { fetchReportData, fetchYearlyData, fetchCompatData, fetchCareerData } = require('./_astrology');
const { listGeminiModels } = require('./_gemini');
const { CHAPTERS, CHAPTER_IDS, generateChapters } = require('./_report');
const { YEARLY_CHAPTERS, COMPAT_CHAPTERS, CAREER_CHAPTERS, compatChapterIdsFor } = require('./_report-products');
const { normalizeLang } = require('./_terms');
const { geocodeBirthPlace } = require('./_geocode');
const etsy = require('./_etsy-api');
const ledger = require('./_etsy-ledger');
const { parsePersonalization, parseCompatPersonalization } = require('./_etsy-parse');
const { renderReportPdf } = require('./_etsy-pdf');
const mail = require('./_etsy-mail');
const storage = require('./_etsy-storage');

const CHAPTERS_PER_STEP = 3;
const MAX_ATTEMPTS = 5;
const IN_PROGRESS_LOCK_MS = 2 * 60 * 1000;
const MIN_MS_FOR_CHAPTERS = 25000;
const MIN_MS_FOR_PDF = 30000;
const { STATUS } = ledger;

const REVIEW_PAGE = `
  <h2 class="chapter-title">Thank you</h2>
  <p>This report was calculated from your exact birth data using the sidereal (Vedic) zodiac, and every interpretation
  is grounded in the positions shown in the chart pages. Read it slowly, return to it at the start of each Dasha period,
  and treat it as a map rather than a verdict: the chart shows tendencies, and your choices decide the outcome.</p>
  <p>If you have a question about a passage, reply to the delivery email. If the reading helped you, a short review on
  Etsy would mean a great deal and helps other seekers find this work.</p>
  <p class="disclaimer">Libertas Jyotish · www.libertas-jyotish.com · This report is for self-reflection and entertainment
  and is not medical, legal, financial or psychological advice.</p>`;

// サイト直販（KOMOJU）向け: Etsy レビューの依頼を含めない
const WEB_THANKS_PAGE = REVIEW_PAGE.replace(/If the reading helped you,[^<]*/, 'If the reading helped you, sharing www.libertas-jyotish.com with a friend helps other seekers find this work.');

// 商品種別: natal（出生図）/ yearly（年間運勢）/ compat（相性）/ career（仕事・適職・金運）。
// ETSY_LISTING_PRODUCTS="<listing_id>:yearly,<listing_id>:compat,<listing_id>:career" で明示し、無ければ商品名から推定する。
function listingProducts() {
  const map = {};
  for (const pair of String(process.env.ETSY_LISTING_PRODUCTS || '').split(',')) {
    const [id, product] = pair.split(':').map((s) => s && s.trim());
    if (id && product) map[id] = product;
  }
  return map;
}

function productOf(receipt) {
  const map = listingProducts();
  for (const tx of receipt.transactions || []) {
    const mapped = map[String(tx.listing_id)];
    if (mapped) return mapped;
    const title = String(tx.title || '');
    if (/compatib|synastry|relationship|couple/i.test(title)) return 'compat';
    if (/year[- ]?ahead|yearly|annual|12[- ]month|forecast/i.test(title)) return 'yearly';
    if (/career|vocation|profession|wealth|money|job/i.test(title)) return 'career';
  }
  return 'natal';
}

function chapterDefsFor(order) {
  if (order.product === 'yearly') return { defs: YEARLY_CHAPTERS, ids: YEARLY_CHAPTERS.map((c) => c.id) };
  if (order.product === 'compat') return { defs: COMPAT_CHAPTERS, ids: compatChapterIdsFor(order.relation || 'general') };
  if (order.product === 'career') return { defs: CAREER_CHAPTERS, ids: CAREER_CHAPTERS.map((c) => c.id) };
  return { defs: CHAPTERS, ids: CHAPTER_IDS };
}

function personalizationOf(receipt) {
  const parts = [];
  for (const tx of receipt.transactions || []) {
    if (tx.personalization) parts.push(tx.personalization);
    for (const v of tx.variations || []) {
      if (/personali[sz]ation/i.test(v.formatted_name || '') || v.property_id === 54) parts.push(v.formatted_value);
    }
  }
  if (!parts.length && receipt.message_from_buyer) parts.push(receipt.message_from_buyer);
  return parts.filter(Boolean).join('\n');
}

// 新しい注文を台帳に登録する。既存行には触らない（運営者の手修正を上書きしないため）。
async function registerReceipt(receipt, ctx) {
  const receiptId = receipt.receipt_id;
  const existing = ctx.orders.find((o) => o.receipt_id === String(receiptId));
  if (existing) return isFinal(existing) ? 'already_delivered' : 'known';

  const buyerName = receipt.name || '';
  const personalization = personalizationOf(receipt);
  const product = productOf(receipt);
  const compat = product === 'compat' ? parseCompatPersonalization(personalization) : null;
  const parsed = compat ? { ...compat.a, language: compat.language, email: compat.email, missing: compat.missing, notes: compat.notes } : parsePersonalization(personalization);
  // Etsy API は buyer_email を返さないことが多い。入力欄にメールがあればそれを使い、無ければリンク納品（Etsy メッセージ）にする
  const buyerEmail = receipt.buyer_email || parsed.email || '';
  const base = {
    product,
    relation: compat ? compat.relation : '',
    delivery: buyerEmail ? 'email' : 'etsy_message',
    transaction_id: (receipt.transactions || []).map((t) => t.transaction_id).join(','),
    buyer_email: buyerEmail,
    buyer_name: buyerName,
    personalization,
    dob: parsed.dob || '',
    tob: parsed.tob || '',
    tob_unknown: parsed.tobUnknown ? 'true' : 'false',
    place: parsed.place || '',
    dob_b: compat ? compat.b.dob || '' : '',
    tob_b: compat ? compat.b.tob || '' : '',
    tob_unknown_b: compat && compat.b.tobUnknown ? 'true' : 'false',
    place_b: compat ? compat.b.place || '' : '',
    language: normalizeLang(parsed.language || 'en')
  };

  if (parsed.missing.length) {
    if (ctx.mail) {
      if (buyerEmail) await mail.sendNeedsInfo({ to: buyerEmail, name: buyerName, personalization, missing: parsed.missing, notes: parsed.notes });
      await mail.notifyOwner(`Etsy: needs info (receipt ${receiptId})`, [
        `buyer: ${buyerName} <${buyerEmail || 'no email — ask via Etsy Messages'}>`,
        `missing: ${parsed.missing.join(', ')}`,
        `input: ${personalization}`,
        ...(buyerEmail ? [] : ['', 'Message to send on Etsy:', mail.needsInfoText({ name: buyerName, missing: parsed.missing, notes: parsed.notes })])
      ]);
    }
    ctx.orders.push(await ctx.store.upsertOrder(receiptId, { ...base, status: STATUS.NEEDS_INFO, last_error: `missing:${parsed.missing.join(',')}` }));
    return 'needs_info';
  }
  ctx.orders.push(await ctx.store.upsertOrder(receiptId, { ...base, status: STATUS.NEW }));
  return 'new';
}

function isFinal(order) {
  return order.status === STATUS.DELIVERED || order.status === STATUS.READY;
}

function isPending(order) {
  if (order.status === STATUS.NEW) return true;
  if (order.status === STATUS.GENERATING) return Date.now() - Date.parse(order.updated_at || 0) > IN_PROGRESS_LOCK_MS;
  if (order.status === STATUS.ERROR) return order.attempts < MAX_ATTEMPTS;
  return false;
}

function parseJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (err) { return null; }
}

// 1 件の注文を制限時間内で進める。戻り値はこの呼び出しで到達した段階。
async function advanceOrder(order, ctx) {
  const receiptId = order.receipt_id;
  const language = normalizeLang(order.language || 'en');
  const tob = order.tob || '12:00';
  const tobUnknown = order.tob_unknown === 'true' || !order.tob;
  const remaining = () => ctx.deadline - Date.now();
  const save = (fields) => ctx.store.upsertOrder(receiptId, fields);

  const isCompat = order.product === 'compat';
  if (!order.dob || !order.place || (isCompat && (!order.dob_b || !order.place_b))) {
    await save({ status: STATUS.NEEDS_INFO, last_error: 'missing:dob/place (fill in and set status to new)' });
    return 'needs_info';
  }
  const { defs, ids: chapterIds } = chapterDefsFor(order);

  const attempts = order.status === STATUS.ERROR ? order.attempts + 1 : Math.max(order.attempts, 1);
  await save({ status: STATUS.GENERATING, attempts, last_error: '' });

  try {
    let astro = parseJson(order.astro);
    if (!astro) {
      const needsInfo = async (place, missingKey) => {
        if (ctx.mail) {
          if (order.buyer_email) await mail.sendNeedsInfo({ to: order.buyer_email, name: order.buyer_name, personalization: order.personalization, missing: [missingKey], notes: [] });
          await mail.notifyOwner(`Etsy: needs info (receipt ${receiptId})`, [`buyer: ${order.buyer_name} <${order.buyer_email || 'no email — ask via Etsy Messages'}>`, `unknown birthplace: ${place}`]);
        }
        await save({ status: STATUS.NEEDS_INFO, last_error: `unknown_birthplace: ${place}` });
        return 'needs_info';
      };
      const geo = await geocodeBirthPlace(order.place, language);
      if (!geo) return needsInfo(order.place, isCompat ? 'a.place' : 'place');
      const a = { dob: order.dob, tob, lat: geo.lat, lon: geo.lon, lang: language };
      if (isCompat) {
        const geoB = await geocodeBirthPlace(order.place_b, language);
        if (!geoB) return needsInfo(order.place_b, 'b.place');
        const b = { dob: order.dob_b, tob: order.tob_b || '12:00', lat: geoB.lat, lon: geoB.lon };
        astro = await fetchCompatData({ a, b, lang: language, relation: order.relation || 'general' });
        astro.personA.city = order.place;
        astro.personB.city = order.place_b;
      } else {
        astro = order.product === 'yearly' ? await fetchYearlyData(a)
          : order.product === 'career' ? await fetchCareerData(a)
          : await fetchReportData(a);
      }
      astro.city = order.place;
      astro.geo_precision = geo.precision;
      if (geo.notice) astro.geo_notice = geo.notice;
      await save({ astro: JSON.stringify(astro) });
      ctx.log(`  ${receiptId}: astro ready (${order.product || 'natal'})`);
    }

    const chapters = {};
    for (const id of chapterIds) {
      const value = parseJson(order[id]);
      if (value) chapters[id] = value;
    }
    let missing = chapterIds.filter((id) => !chapters[id]);

    while (missing.length && remaining() > MIN_MS_FOR_CHAPTERS) {
      const batch = missing.slice(0, CHAPTERS_PER_STEP);
      const result = await ctx.generate(astro, batch, language, remaining() - 8000, { chapters: defs, product: order.product || 'natal' });
      const saved = {};
      for (const [id, value] of Object.entries(result.chapters)) {
        chapters[id] = value;
        saved[id] = JSON.stringify(value);
      }
      if (Object.keys(saved).length) await save(saved);
      if (result.failed.length) ctx.log(`  ${receiptId}: failed ${result.failed.map((f) => `${f.id}(${f.reason})`).join(', ')}`);
      const before = missing.length;
      missing = chapterIds.filter((id) => !chapters[id]);
      if (missing.length === before) throw new Error(`chapters_failed: ${result.failed.map((f) => f.id).join(',') || batch.join(',')}`);
    }
    // 時間内に終わらない分は new に戻して次回に続きを行う（generating は実行中ロックの意味）
    if (missing.length) {
      await save({ status: STATUS.NEW, last_error: `pending:${missing.join(',')}` });
      return 'in_progress';
    }
    if (remaining() < MIN_MS_FOR_PDF) {
      await save({ status: STATUS.NEW, last_error: 'pending:pdf' });
      return 'in_progress';
    }

    const pdf = await renderReportPdf({ lang: language, report: { astro, chapters }, extraHtml: ledger.isWebOrder(receiptId) ? WEB_THANKS_PAGE : REVIEW_PAGE });
    const filename = order.product === 'yearly' ? `Libertas-Jyotish-Year-Ahead-${order.dob}.pdf`
      : order.product === 'compat' ? `Libertas-Jyotish-Compatibility-${order.dob}-${order.dob_b}.pdf`
      : order.product === 'career' ? `Libertas-Jyotish-Career-${order.dob}.pdf`
      : `Libertas-Jyotish-Report-${order.dob}.pdf`;
    ctx.log(`  ${receiptId}: pdf ${Math.round(pdf.length / 1024)} KB`);
    if (ctx.onPdf) await ctx.onPdf(receiptId, filename, pdf);

    const pdfUrl = ctx.storePdf ? await ctx.storePdf(receiptId, filename, pdf) : '';
    const downloadUrl = pdfUrl ? storage.downloadUrl(receiptId) : '';
    await save({ pdf_url: pdfUrl, download_url: downloadUrl });
    const meta = { product: order.product || 'natal', dob: order.dob, tob, tobUnknown, place: order.place, dobB: order.dob_b, tobB: order.tob_b, placeB: order.place_b, language, downloadUrl };
    const summary = [`buyer: ${order.buyer_name} <${order.buyer_email || 'no email'}>`, `product: ${meta.product}`, `birth: ${order.dob} ${tob} ${order.place}`, ...(isCompat ? [`birth B: ${order.dob_b} ${order.tob_b || '12:00'} ${order.place_b}`] : []), `language: ${language}`, `pdf: ${Math.round(pdf.length / 1024)} KB`, `link: ${downloadUrl || '(not stored)'}`];

    if (order.buyer_email) {
      let emailId = '';
      if (ctx.mail) emailId = await mail.sendReport({ to: order.buyer_email, name: order.buyer_name, pdf, filename, meta });
      await save({ status: STATUS.DELIVERED, delivered_at: new Date().toISOString(), email_id: emailId, last_error: '' });
      if (ctx.mail) await mail.notifyOwner(`${ledger.isWebOrder(receiptId) ? 'Web' : 'Etsy'}: delivered (receipt ${receiptId})`, summary);
      return 'delivered';
    }

    // 購入者メールが無い注文: リンクを運営者に送り、Etsy メッセージで購入者へ貼ってもらう
    if (!downloadUrl) throw new Error('no buyer email and PDF storage unavailable');
    await save({ status: STATUS.READY, delivered_at: new Date().toISOString(), last_error: '' });
    if (ctx.mail) {
      await mail.notifyOwner(`Etsy: ready — send link via Etsy Messages (receipt ${receiptId})`, [
        ...summary, '', `Etsy order: https://www.etsy.com/your/orders/sold/${receiptId}`, '', 'Message to send on Etsy:',
        mail.deliveryText({ name: order.buyer_name, ...meta })
      ]);
    }
    return 'ready';
  } catch (err) {
    const message = String(err.message || err).slice(0, 500);
    ctx.log(`  ${receiptId}: failed: ${message}`);
    await save({ status: STATUS.ERROR, last_error: message });
    if (ctx.mail && attempts >= MAX_ATTEMPTS) await mail.notifyOwner(`Etsy: gave up (receipt ${receiptId})`, [`buyer: ${order.buyer_name} <${order.buyer_email}>`, `error: ${message}`]);
    return 'error';
  }
}

// 配信済みで Etsy 側の完了更新が済んでいない注文を更新する
async function markShippedIfNeeded(ctx) {
  if (!ctx.client) return 0;
  let count = 0;
  for (const order of ctx.orders) {
    if (!isFinal(order) || order.shipped === 'true' || ledger.isWebOrder(order.receipt_id)) continue;
    try {
      await ctx.client.markShipped(ctx.shopId, order.receipt_id);
      await ctx.store.upsertOrder(order.receipt_id, { shipped: 'true' });
      count += 1;
    } catch (err) {
      ctx.log(`  ${order.receipt_id}: markShipped failed: ${err.message}`);
    }
  }
  return count;
}

async function connectEtsy(store) {
  const state = await store.getState();
  const refreshToken = state.refresh_token || process.env.ETSY_REFRESH_TOKEN;
  if (!refreshToken) throw new Error('No Etsy refresh token. Run scripts/etsy/auth.js first.');

  const token = await etsy.refreshAccessToken(refreshToken);
  await store.setState({
    refresh_token: token.refresh_token,
    access_expires_at: new Date(Date.now() + (token.expires_in || 3600) * 1000).toISOString()
  });
  const client = etsy.createClient(token.access_token);

  let shopId = process.env.ETSY_SHOP_ID || state.shop_id;
  if (!shopId) {
    const me = await client.getMe();
    shopId = me.shop_id;
    if (!shopId) throw new Error('Could not determine shop_id from users/me');
    await store.setState({ shop_id: shopId });
  }
  return { client, shopId };
}

function defaultGenerate() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  let modelsPromise = null;
  return async (astro, ids, lang, timeoutMs, extra = {}) => {
    if (!modelsPromise) modelsPromise = process.env.GEMINI_MODEL ? Promise.resolve([process.env.GEMINI_MODEL]) : listGeminiModels(apiKey);
    return generateChapters(astro, ids, apiKey, await modelsPromise, { lang, timeoutMs: Math.max(10000, timeoutMs), ...extra });
  };
}

// 1 回分の処理。deadline（epoch ms）までに終わるところまで進める。
// options: { store, receipts, mail, generate, onPdf, log }（省略時は本番: Sheets・Etsy API・Gemini・Resend）
async function runCycle({ deadline, store = ledger, receipts = null, mail: sendMail = true, generate = null, onPdf = null, storePdf = storage.storePdf, log = console.log }) {
  const ctx = { deadline, store, mail: sendMail, generate: generate || defaultGenerate(), onPdf, storePdf, log, client: null, shopId: null, orders: [] };
  const summary = { registered: {}, processed: {}, shipped: 0 };

  if (!receipts) {
    ({ client: ctx.client, shopId: ctx.shopId } = await connectEtsy(store));
    receipts = await ctx.client.listOpenReceipts(ctx.shopId);
  }
  ctx.orders = await store.listOrders();
  log(`${receipts.length} open receipt(s), ${ctx.orders.length} ledger row(s)`);

  for (const receipt of receipts) {
    const outcome = await registerReceipt(receipt, ctx);
    summary.registered[outcome] = (summary.registered[outcome] || 0) + 1;
  }

  summary.shipped = await markShippedIfNeeded(ctx);

  const pending = ctx.orders.filter(isPending).sort((a, b) => Date.parse(a.created_at || 0) - Date.parse(b.created_at || 0));
  for (const order of pending) {
    if (deadline - Date.now() < MIN_MS_FOR_CHAPTERS) break;
    log(`receipt ${order.receipt_id} (${order.status})`);
    const outcome = await advanceOrder(order, ctx);
    log(`  → ${outcome}`);
    summary.processed[outcome] = (summary.processed[outcome] || 0) + 1;
  }
  if (summary.processed.delivered || summary.processed.ready) summary.shipped += await markShippedIfNeeded({ ...ctx, orders: await store.listOrders() });
  return summary;
}

module.exports = { runCycle, personalizationOf, productOf };
