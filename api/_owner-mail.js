// 運営者向けの内部通知（注文処理の結果・ヘルスチェック・問い合わせ転送）。
// GMAIL_APP_PASSWORD があれば Gmail SMTP（libertasjyotish@gmail.com）で送り、Resend の日次枠を消費しない。
// 未設定なら従来どおり Resend（_etsy-mail.send）に落とす。
const nodemailer = require('nodemailer');

const GMAIL_USER = process.env.GMAIL_USER || 'libertasjyotish@gmail.com';
const OWNER_TO = process.env.ALERT_EMAIL_TO || process.env.ETSY_OWNER_EMAIL || GMAIL_USER;

function gmailConfigured() {
  return Boolean(process.env.GMAIL_APP_PASSWORD);
}

let transport = null;
function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
    });
  }
  return transport;
}

async function sendInternal({ to, subject, html, text, replyTo }) {
  const recipients = to || OWNER_TO;
  if (!gmailConfigured()) {
    const { send } = require('./_etsy-mail');
    return send({ to: recipients, subject, html: html || `<pre>${text || ''}</pre>`, replyTo });
  }
  const info = await getTransport().sendMail({
    from: `Libertas Jyotish <${GMAIL_USER}>`,
    to: recipients,
    replyTo: replyTo || undefined,
    subject,
    html,
    text
  });
  return info.messageId || '';
}

module.exports = { sendInternal, gmailConfigured, OWNER_TO };
