// Etsy 購入者向けの鑑定書ダウンロード。署名付きトークン（_etsy-storage.downloadUrl）を検証し、
// 台帳に記録された Blob の PDF をそのまま返す。Blob の URL 自体は購入者に見せない。
const { verifyToken } = require('./_etsy-storage');
const ledger = require('./_etsy-ledger');

module.exports = async function handler(req, res) {
  const token = verifyToken(req.query && req.query.t);
  if (!token) {
    res.status(403).setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('This download link is invalid or has expired. Please contact Libertas Jyotish via Etsy Messages.');
    return;
  }
  try {
    const order = await ledger.findOrder(token.receiptId);
    if (!order || !order.pdf_url) {
      res.status(404).setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Your report is not ready yet. Please try again later or contact us via Etsy Messages.');
      return;
    }
    const upstream = await fetch(order.pdf_url);
    if (!upstream.ok) throw new Error(`blob ${upstream.status}`);
    const pdf = Buffer.from(await upstream.arrayBuffer());
    const filename = `Libertas-Jyotish-Report-${order.dob || token.receiptId}.pdf`;
    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(pdf);
  } catch (err) {
    console.error('etsy-download failed:', err.message);
    res.status(500).setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Download failed. Please try again later or contact us via Etsy Messages.');
  }
};
