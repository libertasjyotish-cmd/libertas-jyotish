// Play 定期購入を会員に紐づける処理と、Google 側の一時的な失敗で紐づけられなかった購入の自動再試行。
// 再試行は etsy-cron（10分ごと）から呼ばれる。1回あたり件数、1件あたり回数・期間に上限がある。
const { playEnabled, getSubscription, acknowledgeSubscription, subscriptionSummary, listVoidedPurchases, getProductPurchase, acknowledgeProduct } = require('./_play');
const {
  setPlaySubscription,
  setPlayPending,
  listPlayPending,
  bumpPlayPending,
  clearPlayPending,
  listPlayMembers,
  updatePlaySubscription,
  revokePdfByPlayTokens,
  setPdfPurchased
} = require('./_sheets');

const OWNER = process.env.ETSY_OWNER_EMAIL || 'info@libertas-jyotish.com';
const SYNC_MAX_PER_RUN = 200;

const MAX_PER_RUN = 10;
// 未承認の購入は3日で Google が自動返金するので、保存から3日以内に最大12回だけ、間隔を広げて試す
// （保存からの経過分: 10分, 30分, 1h, 2h, 4h, 7h, 11h, 17h, 25h, 37h, 49h, 61h）
const RETRY_AFTER_MIN = [10, 30, 60, 120, 240, 420, 660, 1020, 1500, 2220, 2940, 3660];
const MAX_ATTEMPTS = RETRY_AFTER_MIN.length;
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

// 権限の反映待ち・Google 側の障害など、時間をおけば通る失敗か
function isTransient(err) {
  const s = err && err.status;
  return !s || s === 401 || s === 403 || s === 408 || s === 429 || s >= 500;
}

async function linkSubscription(email, purchaseToken, { productId, language } = {}) {
  const summary = subscriptionSummary(await getSubscription(purchaseToken));
  if (!summary.entitled) return { ok: false, state: summary.state };
  const ok = await setPlaySubscription(email, {
    purchaseToken,
    paidUntil: summary.expiryTime,
    renewing: summary.renewing,
    language
  });
  if (!ok) throw new Error('sheet_write_failed');
  if (!summary.acknowledged) {
    await acknowledgeSubscription(summary.productId || productId, purchaseToken);
    // 未承認＝初めての紐づけ。マイページを開くたびの再確認では送らない
    await notifyOwner('新しい定期購入', [
      `email: ${email}`,
      `product: ${summary.productId || productId || ''}`,
      `language: ${language || ''}`,
      `paid_until: ${summary.expiryTime || ''}`
    ]);
  }
  return { ok: true, summary };
}

async function notifyOwner(subject, lines) {
  try {
    const { sendInternal } = require('./_owner-mail');
    await sendInternal({ to: OWNER, subject: `[Google Play] ${subject}`, text: lines.join('\n') });
  } catch (e) {
    console.error('play owner mail failed:', e.message);
  }
}

// 毎日、Play 会員全員の状態を Google に照会して、更新・解約・返金・失効を会員シートへ反映する。
// RTDN（Pub/Sub）の設定に頼らない。1件の失敗は次の会員を止めない。
async function syncPlayMembers({ deadline } = {}) {
  if (!playEnabled()) return { skipped: 'play_disabled' };
  const all = await listPlayMembers();
  // 上限を超える人数でも全員に順番が回るよう、日ごとに開始位置をずらす
  const start = all.length > SYNC_MAX_PER_RUN ? (Math.floor(Date.now() / 864e5) * SYNC_MAX_PER_RUN) % all.length : 0;
  const members = [...all.slice(start), ...all.slice(0, start)].slice(0, SYNC_MAX_PER_RUN);
  const result = { members: all.length, checked: 0, changed: 0, revoked: 0, errors: 0 };
  const revoked = [];
  const cache = new Map();
  for (const m of members) {
    if (deadline && Date.now() > deadline) break;
    try {
      if (!cache.has(m.token)) cache.set(m.token, querySubscription(m.token));
      const q = await cache.get(m.token);
      const next = { ...q, paidUntil: q.paidUntil || m.paidUntil };
      result.checked++;
      const wasPaid = m.status === 'paid';
      if (wasPaid === next.entitled && m.renewing === next.renewing && m.paidUntil === next.paidUntil) continue;
      await updatePlaySubscription(m.email, { entitled: next.entitled, renewing: next.renewing, paidUntil: next.paidUntil });
      result.changed++;
      if (wasPaid && !next.entitled) {
        result.revoked++;
        revoked.push(`${m.email} (${next.state})`);
      }
    } catch (err) {
      result.errors++;
      result.lastError = String(err.message || err).slice(0, 120);
    }
  }
  if (revoked.length) await notifyOwner('会員が無料に戻りました（解約・返金・失効）', revoked);
  result.pdfRevoked = await revokeVoidedPdf().catch((e) => {
    result.errors++;
    result.lastError = String(e.message || e).slice(0, 120);
    return 0;
  });
  return result;
}

async function querySubscription(token) {
  try {
    const s = subscriptionSummary(await getSubscription(token));
    // 紐づけ時の承認が何かの理由で漏れていても、3日以内の自動返金を防ぐ
    if (s.entitled && !s.acknowledged && s.productId) await acknowledgeSubscription(s.productId, token);
    return { entitled: s.entitled, renewing: s.renewing, paidUntil: s.expiryTime, state: s.state };
  } catch (err) {
    // 410: 期限切れから時間がたち Google 側で照会できなくなった購入
    if (err.status !== 410) throw err;
    return { entitled: false, renewing: false, paidUntil: '', state: 'gone' };
  }
}

// 生涯鑑定書（Play）の払い戻しを反映する（RTDN の代わりに過去30日の取り消し一覧を毎日照合）
async function revokeVoidedPdf() {
  const voided = await listVoidedPurchases();
  if (!voided.length) return 0;
  const emails = await revokePdfByPlayTokens(voided.map(v => v.purchaseToken));
  if (emails.length) await notifyOwner('生涯鑑定書の払い戻しを反映しました', emails);
  // 個別鑑定書を含む全ての払い戻しを、毎日の実行で1回ずつ知らせる（直近24時間分）
  const recent = voided.filter(v => Number(v.voidedTimeMillis) > Date.now() - 864e5);
  if (recent.length) {
    await notifyOwner('Google Play で払い戻しがありました', recent.map(v => `order: ${v.orderId || ''} (reason ${v.voidedReason ?? ''}, source ${v.voidedSource ?? ''})`));
  }
  return emails.length;
}

// 生涯鑑定書（買い切り）の購入を照会し、閲覧権を付けて承認する
async function linkPdf(email, purchaseToken, { language } = {}) {
  const purchase = await getProductPurchase('report_pdf', purchaseToken);
  if (purchase.purchaseState !== 0) return { ok: false };
  if (!(await setPdfPurchased(email, { playToken: purchaseToken }))) throw new Error('sheet_write_failed');
  if (purchase.acknowledgementState === 0) {
    await acknowledgeProduct('report_pdf', purchaseToken);
    await notifyOwner('新しい生涯鑑定書の購入', [`email: ${email}`, 'product: report_pdf', `language: ${language || ''}`]);
  }
  return { ok: true };
}

async function savePending(email, purchaseToken, language, product = 'premium') {
  return setPlayPending(email, { purchaseToken, language, product }).catch((e) => {
    console.error('play pending save failed:', e.message);
    return false;
  });
}

async function retryPending({ deadline } = {}) {
  if (!playEnabled()) return { skipped: 'play_disabled' };
  const list = await listPlayPending();
  const result = { pending: list.length, linked: 0, dropped: 0, waiting: 0 };
  // 失敗中の購入が上限件数を超えても全件に順番が回るよう、10分ごとの実行のたびに開始位置をずらす
  const ageOf = (p) => Date.now() - Date.parse(p.since || '');
  const expired = (p) => !(ageOf(p) < MAX_AGE_MS) || p.attempts >= MAX_ATTEMPTS;
  const due = list.filter(p => expired(p) || ageOf(p) >= RETRY_AFTER_MIN[p.attempts] * 6e4);
  result.notDue = list.length - due.length;
  const start = due.length > MAX_PER_RUN ? (Math.floor(Date.now() / 6e5) * MAX_PER_RUN) % due.length : 0;
  const batch = [...due.slice(start), ...due.slice(0, start)].slice(0, MAX_PER_RUN);
  for (const p of batch) {
    if (deadline && Date.now() > deadline) break;
    // 1件の失敗（Sheets の書き込み失敗を含む）で残りを止めない
    try {
      if (expired(p)) {
        await clearPlayPending(p.email);
        result.dropped++;
        continue;
      }
      try {
        const r = p.product === 'pdf'
          ? await linkPdf(p.email, p.token, { language: p.lang })
          : await linkSubscription(p.email, p.token, { productId: 'premium_monthly', language: p.lang });
        if (r.ok) result.linked++;
        else result.dropped++;
        await clearPlayPending(p.email);
      } catch (err) {
        if (isTransient(err)) {
          await bumpPlayPending(p.email, p.attempts + 1);
          result.waiting++;
          result.lastError = String(err.message || err).slice(0, 120);
        } else {
          await clearPlayPending(p.email);
          result.dropped++;
        }
      }
    } catch (err) {
      console.error('play pending item failed:', err.message);
      result.errors = (result.errors || 0) + 1;
    }
  }
  return result;
}

module.exports = { linkSubscription, linkPdf, savePending, retryPending, syncPlayMembers, isTransient, notifyOwner };
