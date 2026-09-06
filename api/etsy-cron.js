// Vercel Cron から呼ばれる Etsy 注文処理のエントリポイント（vercel.json の crons）。
// Vercel は CRON_SECRET を Authorization: Bearer で付けて呼ぶ。手動実行は ?key=<CRON_SECRET> でも可。
const { runCycle } = require('./_etsy-fulfill');

const MAX_DURATION_S = 60;
const SAFETY_MS = 8000;

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET || '';
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || (req.query && req.query.key) || '';
  if (!secret || supplied !== secret) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const deadline = Date.now() + MAX_DURATION_S * 1000 - SAFETY_MS;
  try {
    const summary = await runCycle({ deadline });
    res.status(200).json({ ok: true, ...summary });
  } catch (err) {
    console.error('etsy-cron failed:', err.message);
    res.status(500).json({ ok: false, error: String(err.message || err).slice(0, 300) });
  }
};
