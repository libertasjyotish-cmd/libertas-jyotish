// Vercel Cron から呼ばれる Etsy 注文処理のエントリポイント（vercel.json の crons）。
// Vercel は CRON_SECRET を Authorization: Bearer で付けて呼ぶ。手動実行は ?key=<CRON_SECRET> でも可。
// ?retry=<receipt_id> を付けると、その注文を new に戻して（章・PDF は保持）再処理する。
// ?regen=<receipt_id> は章を消して（天体データ・写真は保持）文面から作り直し、再納品する。&vision=1 を足すと手相の解析もやり直す。&astro=1 は天体データも作り直す（Prokerala 応答は Blob キャッシュから）。
// ?reparse=<receipt_id> は保存済みのパーソナライズ文を現行パーサで読み直し、揃えば new に戻す（needs_info の復旧用）。
const { runCycle } = require('./_etsy-fulfill');
const { parsePersonalization } = require('./_etsy-parse');
const ledger = require('./_etsy-ledger');

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
    const retry = req.query && req.query.retry;
    if (retry && await ledger.findOrder(retry)) await ledger.upsertOrder(retry, { status: ledger.STATUS.NEW, attempts: 0, last_error: '' });
    const reparse = req.query && req.query.reparse;
    if (reparse) {
      const order = await ledger.findOrder(reparse);
      if (order && order.personalization) {
        const parsed = parsePersonalization(order.personalization);
        if (!parsed.missing.length) {
          await ledger.upsertOrder(reparse, {
            dob: parsed.dob, tob: parsed.tob, tob_unknown: parsed.tobUnknown ? 'true' : 'false', place: parsed.place, language: parsed.language,
            status: ledger.STATUS.NEW, attempts: 0, last_error: ''
          });
        }
      }
    }
    const regen = req.query && req.query.regen;
    if (regen && await ledger.findOrder(regen)) {
      const cleared = Object.fromEntries(ledger.REPORT_FIELDS.filter((f) => f !== 'astro').map((f) => [f, '']));
      if (req.query.vision) cleared.palm = '';
      if (req.query.astro) cleared.astro = '';
      await ledger.upsertOrder(regen, { ...cleared, status: ledger.STATUS.NEW, attempts: 0, last_error: '', pdf_url: '', download_url: '' });
    }
    const summary = await runCycle({ deadline });
    res.status(200).json({ ok: true, ...summary });
  } catch (err) {
    console.error('etsy-cron failed:', err.message);
    res.status(500).json({ ok: false, error: String(err.message || err).slice(0, 300) });
  }
};
