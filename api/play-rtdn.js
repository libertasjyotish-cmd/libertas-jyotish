// Google Play リアルタイム デベロッパー通知（RTDN）: POST /api/play-rtdn?token=<PLAY_RTDN_TOKEN>
// Cloud Pub/Sub の push サブスクリプションからここへ届く。Play Console → 収益化のセットアップ で
// トピックを指定し、Pub/Sub 側で push エンドポイントにこの URL（token 付き）を登録する。
// 定期購入の更新・解約・失効・払い戻しを Sheets の会員状態へ反映する。
// 通知の中身は信用せず、purchaseToken で Play Developer API を照会した結果だけを使う。
const { playEnabled, getSubscription, subscriptionSummary } = require('./_play');
const { findMemberByPlayToken, updatePlaySubscription, revokePdfPurchase } = require('./_sheets');

function decodeMessage(body) {
  const data = body && body.message && body.message.data;
  if (!data) return null;
  try {
    return JSON.parse(Buffer.from(String(data), 'base64').toString('utf8'));
  } catch (e) {
    return null;
  }
}

async function handleSubscription(note) {
  const token = note.purchaseToken;
  const email = await findMemberByPlayToken(token);
  // 初回購入（type 4）は play-verify 側で紐づくので、まだ会員行が無ければ後で verify が来る
  if (!email) return 'member_not_found';

  const summary = subscriptionSummary(await getSubscription(token));
  await updatePlaySubscription(email, {
    entitled: summary.entitled,
    renewing: summary.renewing,
    paidUntil: summary.expiryTime
  });
  return summary.entitled ? 'member_paid' : 'member_free';
}

// 買い切り（鑑定書）の払い戻しは voidedpurchases 通知で届く。トークンから会員は引けないため、
// 通知に含まれる orderId をログに残し、手動で確認できるようにする（頻度は極めて低い）。
async function handleVoided(note) {
  console.warn('play voided purchase:', JSON.stringify(note));
  const email = await findMemberByPlayToken(note.purchaseToken);
  if (email && note.productType === 1) {
    await revokePdfPurchase(email);
    return 'pdf_revoked';
  }
  return 'logged';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const expected = process.env.PLAY_RTDN_TOKEN || '';
  if (!expected || String(req.query.token || '') !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!playEnabled()) return res.status(503).json({ error: 'play_disabled' });

  const note = decodeMessage(req.body);
  if (!note) return res.status(400).json({ error: 'invalid_message' });

  try {
    let result = 'ignored';
    if (note.testNotification) result = 'test_ok';
    else if (note.subscriptionNotification) result = await handleSubscription(note.subscriptionNotification);
    else if (note.voidedPurchaseNotification) result = await handleVoided(note.voidedPurchaseNotification);
    // 200 以外を返すと Pub/Sub が再送する
    return res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error('play-rtdn failed:', err.message);
    return res.status(500).json({ error: 'processing_failed' });
  }
};
