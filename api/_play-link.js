// Play 定期購入を会員に紐づける処理と、Google 側の一時的な失敗で紐づけられなかった購入の自動再試行。
// 再試行は etsy-cron（10分ごと）から呼ばれる。1回あたり件数、1件あたり回数・期間に上限がある。
const { playEnabled, getSubscription, acknowledgeSubscription, subscriptionSummary } = require('./_play');
const { setPlaySubscription, setPlayPending, listPlayPending, bumpPlayPending, clearPlayPending } = require('./_sheets');

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
  if (!summary.acknowledged) await acknowledgeSubscription(summary.productId || productId, purchaseToken);
  return { ok: true, summary };
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

module.exports = { linkSubscription, savePending, retryPending, isTransient };
