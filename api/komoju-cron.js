// 日次: 解約済みで paid_until を過ぎた KOMOJU 会員を無料へ戻す（Vercel Cron）
// Vercel は CRON_SECRET を Authorization: Bearer で付けて呼ぶ。手動実行は ?key=<CRON_SECRET> でも可。
const { expireKomojuMembers } = require('./_sheets');

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET || '';
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || (req.query && req.query.key) || '';
  if (!secret || supplied !== secret) return res.status(401).json({ error: 'unauthorized' });

  try {
    const expired = await expireKomojuMembers();
    return res.status(200).json({ ok: true, expired: expired.length });
  } catch (err) {
    console.error('komoju-cron failed:', err.message);
    return res.status(500).json({ error: 'cron_failed' });
  }
};
