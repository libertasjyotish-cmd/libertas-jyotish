// Etsy OAuth の redirect_uri。認可コードを画面に表示するだけで、トークン交換はローカルの
// scripts/etsy/auth.js が行う（シークレットをサーバー側に置かないため）。
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

module.exports = function handler(req, res) {
  const { code, state, error, error_description: description } = req.query || {};
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Cache-Control', 'no-store');

  const body = error
    ? `<h1>Authorization failed</h1><p>${esc(error)}: ${esc(description || '')}</p>`
    : code
      ? `<h1>Etsy authorization received</h1>
         <p>Copy the code below and hand it to the fulfillment setup (it expires in a few minutes).</p>
         <p><label>code<br><textarea readonly rows="3" cols="80" onclick="this.select()">${esc(code)}</textarea></label></p>
         <p><label>state<br><input readonly size="40" value="${esc(state)}" onclick="this.select()"></label></p>`
      : `<h1>Etsy callback</h1><p>No authorization code in the request.</p>`;

  res.status(200).send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<title>Etsy authorization – Libertas Jyotish</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 20px;color:#2C221E;background:#FFFDF7}h1{color:#8B6B1B}textarea,input{font-family:monospace;font-size:14px;width:100%}</style>
</head><body>${body}</body></html>`);
};
