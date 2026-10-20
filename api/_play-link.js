// Play 定期購入を会員に紐づける処理と、Google 側の一時的な失敗で紐づけられなかった購入の自動再試行。
// 再試行は etsy-cron（10分ごと）から呼ばれる。1回あたり件数、1件あたり回数・期間に上限がある。
const { playEnabled, getSubscription, acknowledgeSubscription, subscriptionSummary } = require('./_play');
const {
  setPlaySubscription,
  setPlayPending,
  listPlayPending,
  bumpPlayPending,
  clearPlayPending,
  listPlayMembers,
  updatePlaySubscription
} = require('./_sheets');

const OWNER = process.env.ETSY_OWNER_EMAIL || 'info@libertas-jyotish.com';
const SYNC_MAX_PER_RUN = 200;

const MAX_PER_RUN = 10;
const MAX_ATTEMPTS = 600;
const MAX_AGE_MS = 4 * 24 * 60 * 60 * 1000;

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
  const members = await listPlayMembers();
  const result = { members: members.length, checked: 0, changed: 0, revoked: 0, errors: 0 };
  const revoked = [];
  for (const m of members.slice(0, SYNC_MAX_PER_RUN)) {
    if (deadline && Date.now() > deadline) break;
    try {
      let next;
      try {
        const s = subscriptionSummary(await getSubscription(m.token));
        next = { entitled: s.entitled, renewing: s.renewing, paidUntil: s.expiryTime || m.paidUntil, state: s.state };
      } catch (err) {
        // 410: 期限切れから時間がたち Google 側で照会できなくなった購入
        if (err.status !== 410) throw err;
        next = { entitled: false, renewing: false, paidUntil: m.paidUntil, state: 'gone' };
      }
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
  return result;
}

async function savePending(email, purchaseToken, language) {
  return setPlayPending(email, { purchaseToken, language }).catch((e) => {
    console.error('play pending save failed:', e.message);
    return false;
  });
}

async function retryPending({ deadline } = {}) {
  if (!playEnabled()) return { skipped: 'play_disabled' };
  const list = await listPlayPending();
  const result = { pending: list.length, linked: 0, dropped: 0, waiting: 0 };
  for (const p of list.slice(0, MAX_PER_RUN)) {
    if (deadline && Date.now() > deadline) break;
    const age = Date.now() - Date.parse(p.since || '');
    if (!(age < MAX_AGE_MS) || p.attempts >= MAX_ATTEMPTS) {
      await clearPlayPending(p.email);
      result.dropped++;
      continue;
    }
    try {
      const r = await linkSubscription(p.email, p.token, { productId: 'premium_monthly', language: p.lang });
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
  }
  return result;
}

module.exports = { linkSubscription, savePending, retryPending, syncPlayMembers, isTransient };
