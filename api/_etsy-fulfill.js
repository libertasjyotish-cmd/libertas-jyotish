// Etsy 注文の自動処理の本体。Vercel Cron（api/etsy-cron.js）から数分おきに呼ばれ、
// 関数の制限時間内で進められるところまで進めて台帳（Google Sheets）に保存し、次回に続きを行う。
//   注文取得 → パーソナライズ解析 → 天体計算 → 章を数個ずつ生成 → 揃ったら PDF → Resend → Etsy 注文を完了に更新
// 台帳は receipt_id ごとに 1 行。再実行しても二重生成・二重送信しない。
const { fetchReportData, fetchYearlyData, fetchCompatData, fetchCareerData, fetchPalmData, setRateLimitDeadline, useEndpointCache, settleEndpointCalls } = require('./_astrology');
const { listGeminiModels } = require('./_gemini');
const { CHAPTERS, CHAPTER_IDS, generateChapters } = require('./_report');
const { YEARLY_CHAPTERS, COMPAT_CHAPTERS, CAREER_CHAPTERS, compatChapterIdsFor } = require('./_report-products');
const { PALM_CHAPTERS, PALM_CHAPTER_IDS, PALM_VOICE } = require('./_report-palm');
const { analyzePalm, palmUnreadable } = require('./_palm');
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
const MIN_MS_FOR_VISION = 45000;
const PHOTO_RETENTION_DAYS = 30;
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
    if (/palm|kar-kundali|hasta|palmistry/i.test(title)) return 'palm';
    if (/career|vocation|profession|wealth|money|job/i.test(title)) return 'career';
  }
  return 'natal';
}

// パーソナライズ文から利き手を拾う（“Dominant hand: left” / “left-handed” / 「利き手: 左」）。不明は右。
function handOf(personalization) {
  const s = String(personalization || '');
  if (/(dominant\s*hand|hand)\s*[:：]?\s*left\b|\bleft[- ]handed\b|利き手\s*[:：]?\s*左|左利き/i.test(s)) return 'left';
  return 'right';
}

function chapterDefsFor(order) {
  if (order.product === 'yearly') return { defs: YEARLY_CHAPTERS, ids: YEARLY_CHAPTERS.map((c) => c.id) };
  if (order.product === 'compat') return { defs: COMPAT_CHAPTERS, ids: compatChapterIdsFor(order.relation || 'general') };
  if (order.product === 'career') return { defs: CAREER_CHAPTERS, ids: CAREER_CHAPTERS.map((c) => c.id) };
  if (order.product === 'palm') return { defs: PALM_CHAPTERS, ids: PALM_CHAPTER_IDS, voice: PALM_VOICE };
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
    hand: product === 'palm' ? handOf(personalization) : '',
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
  // 手相×出生図は写真が揃うまで待つ（アップロード案内は sendUploadLinks が送る）
  if (product === 'palm') {
    ctx.orders.push(await ctx.store.upsertOrder(receiptId, { ...base, status: STATUS.AWAITING_PHOTOS }));
    return 'awaiting_photos';
  }
  ctx.orders.push(await ctx.store.upsertOrder(receiptId, { ...base, status: STATUS.NEW }));
  return 'new';
}

// 写真待ちで案内未送の注文にアップロードリンクを送る（Etsy・サイト直販共通）。メールが無ければ運営者に Etsy メッセージ用の文面を送る。
async function sendUploadLinks(ctx) {
  let count = 0;
  for (const order of ctx.orders) {
    if (order.product !== 'palm' || order.status !== STATUS.AWAITING_PHOTOS || order.upload_mailed_at) continue;
    const language = normalizeLang(order.language || 'en');
    const url = storage.uploadUrl(order.receipt_id, language);
    try {
      if (ctx.mail) {
        if (order.buyer_email) await mail.sendUploadLink({ to: order.buyer_email, name: order.buyer_name, uploadUrl: url, language });
        else await mail.notifyOwner(`Etsy: send upload link via Etsy Messages (receipt ${order.receipt_id})`, [`buyer: ${order.buyer_name}`, `Etsy order: https://www.etsy.com/your/orders/sold/${order.receipt_id}`, '', 'Message to send on Etsy:', mail.uploadText({ name: order.buyer_name, uploadUrl: url })]);
      }
      order.upload_mailed_at = new Date().toISOString();
      await ctx.store.upsertOrder(order.receipt_id, { upload_mailed_at: order.upload_mailed_at });
      count += 1;
    } catch (err) {
      ctx.log(`  ${order.receipt_id}: upload link failed: ${err.message}`);
    }
  }
  return count;
}

// 納品から 30 日経った手相写真の原本を Blob から消す。台帳には削除日時だけ残す。
async function deleteExpiredPhotos(ctx) {
  let count = 0;
  const cutoff = Date.now() - PHOTO_RETENTION_DAYS * 86400000;
  for (const order of ctx.orders) {
    if (order.product !== 'palm' || !isFinal(order) || order.photos_deleted_at) continue;
    if (!order.photo_right && !order.photo_left) continue;
    if (!order.delivered_at || Date.parse(order.delivered_at) > cutoff) continue;
    try {
      await ctx.deleteBlobs([order.photo_right, order.photo_left]);
      await ctx.store.upsertOrder(order.receipt_id, { photo_right: '', photo_left: '', photos_deleted_at: new Date().toISOString() });
      count += 1;
    } catch (err) {
      ctx.log(`  ${order.receipt_id}: photo delete failed: ${err.message}`);
    }
  }
  return count;
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
  const isPalm = order.product === 'palm';
  if (!order.dob || !order.place || (isCompat && (!order.dob_b || !order.place_b))) {
    await save({ status: STATUS.NEEDS_INFO, last_error: 'missing:dob/place (fill in and set status to new)' });
    return 'needs_info';
  }
  if (isPalm && (!order.photo_right || !order.photo_left)) {
    await save({ status: STATUS.AWAITING_PHOTOS, last_error: 'missing:photos' });
    return 'awaiting_photos';
  }
  const { defs, ids: chapterIds, voice = null } = chapterDefsFor(order);

  const attempts = order.status === STATUS.ERROR ? order.attempts + 1 : Math.max(order.attempts, 1);
  await save({ status: STATUS.GENERATING, attempts, last_error: '' });

  // Prokerala のレスポンスは Blob に逐次保存し（astro_cache）、レート制限で途中終了しても次回は残りだけ取る。
  const astroCache = parseJson(order.astro) ? null : (await storage.loadJson(order.astro_cache)) || {};
  const persistAstroCache = async () => {
    await settleEndpointCalls();
    if (!Object.keys(astroCache).length) return;
    const url = await storage.storeAstroCache(receiptId, astroCache);
    await save({ astro_cache: url });
    if (order.astro_cache) await ctx.deleteBlobs([order.astro_cache]).catch(() => null);
  };

  try {
    let astro = parseJson(order.astro);
    if (!astro) {
      useEndpointCache(astroCache);
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
          : isPalm ? await fetchPalmData(a)
          : await fetchReportData(a);
      }
      astro.city = order.place;
      astro.geo_precision = geo.precision;
      if (geo.notice) astro.geo_notice = geo.notice;
      useEndpointCache(null);
      await save({ astro: JSON.stringify(astro), astro_cache: '' });
      if (order.astro_cache) await ctx.deleteBlobs([order.astro_cache]).catch(() => null);
      ctx.log(`  ${receiptId}: astro ready (${order.product || 'natal'})`);
    }

    // 手相×出生図: 写真の特徴抽出（Vision）。結果は palm 列に保存して再実行でも再解析しない。
    // 両手とも判読不能なら撮り直しを依頼して needs_info（アップロード画面は needs_info でも受け付ける）。
    if (isPalm) {
      let palm = parseJson(order.palm);
      if (!palm) {
        if (remaining() < MIN_MS_FOR_VISION) {
          await save({ status: STATUS.NEW, last_error: 'pending:palm' });
          return 'in_progress';
        }
        const result = await ctx.analyze({ photoRight: order.photo_right, photoLeft: order.photo_left, hand: order.hand || 'right', timeoutMs: remaining() - 8000 });
        if (!result.palm) throw new Error(`palm_failed: ${result.reason}`);
        palm = result.palm;
        if (palmUnreadable(palm)) {
          const url = storage.uploadUrl(receiptId, language);
          if (ctx.mail) {
            if (order.buyer_email) await mail.sendUploadLink({ to: order.buyer_email, name: order.buyer_name, uploadUrl: url, language, retake: true });
            await mail.notifyOwner(`${ledger.isWebOrder(receiptId) ? 'Web' : 'Etsy'}: palm photos unreadable (receipt ${receiptId})`, [`buyer: ${order.buyer_name} <${order.buyer_email || 'no email — ask via Etsy Messages'}>`, `notes: ${palm.image_quality.notes}`, ...(order.buyer_email ? [] : ['', 'Message to send on Etsy:', mail.uploadText({ name: order.buyer_name, uploadUrl: url, retake: true })])]);
          }
          await save({ status: STATUS.NEEDS_INFO, last_error: 'unreadable_photos (retake requested)' });
          return 'needs_info';
        }
        await save({ palm: JSON.stringify(palm) });
        ctx.log(`  ${receiptId}: palm ready (${result.model || 'vision'})`);
      }
      astro.palm = palm;
      astro.hand = order.hand || 'right';
      astro.tob_unknown = order.tob_unknown;
    }

    const chapters = {};
    for (const id of chapterIds) {
      const value = parseJson(order[id]);
      if (value) chapters[id] = value;
    }
    let missing = chapterIds.filter((id) => !chapters[id]);

    while (missing.length && remaining() > MIN_MS_FOR_CHAPTERS) {
      const batch = missing.slice(0, CHAPTERS_PER_STEP);
      const result = await ctx.generate(astro, batch, language, remaining() - 8000, { chapters: defs, product: order.product || 'natal', voice });
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
      : isPalm ? `Libertas-Jyotish-Kar-Kundali-${order.dob}.pdf`
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
    useEndpointCache(null);
    if (err.code === 'prokerala_rate_limited') {
      await persistAstroCache();
      await save({ status: STATUS.NEW, attempts: order.attempts, last_error: `pending:${message}` });
      return 'in_progress';
    }
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

function geminiModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  let modelsPromise = null;
  return async () => {
    if (!modelsPromise) modelsPromise = process.env.GEMINI_MODEL ? Promise.resolve([process.env.GEMINI_MODEL]) : listGeminiModels(apiKey);
    return { apiKey, models: await modelsPromise };
  };
}

function defaultGenerate(models = geminiModels()) {
  return async (astro, ids, lang, timeoutMs, extra = {}) => {
    const { apiKey, models: list } = await models();
    return generateChapters(astro, ids, apiKey, list, { lang, timeoutMs: Math.max(10000, timeoutMs), ...extra });
  };
}

function defaultAnalyze(models = geminiModels()) {
  return async ({ photoRight, photoLeft, hand, timeoutMs }) => {
    const { apiKey, models: list } = await models();
    return analyzePalm({ photoRight, photoLeft, hand, apiKey, models: list, timeoutMs: Math.max(20000, timeoutMs) });
  };
}

// 1 回分の処理。deadline（epoch ms）までに終わるところまで進める。
// options: { store, receipts, mail, generate, analyze, onPdf, storePdf, deleteBlobs, log }（省略時は本番: Sheets・Etsy API・Gemini・Resend・Blob）
async function runCycle({ deadline, store = ledger, receipts = null, mail: sendMail = true, generate = null, analyze = null, onPdf = null, storePdf = storage.storePdf, deleteBlobs = storage.deleteBlobs, log = console.log }) {
  const models = generate && analyze ? null : geminiModels();
  const ctx = { deadline, store, mail: sendMail, generate: generate || defaultGenerate(models), analyze: analyze || defaultAnalyze(models), onPdf, storePdf, deleteBlobs, log, client: null, shopId: null, orders: [] };
  const summary = { registered: {}, processed: {}, shipped: 0, uploadLinks: 0, photosDeleted: 0 };
  setRateLimitDeadline(deadline);

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
  summary.uploadLinks = await sendUploadLinks(ctx);
  summary.photosDeleted = await deleteExpiredPhotos(ctx);

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
