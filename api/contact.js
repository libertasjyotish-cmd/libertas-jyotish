// お問い合わせフォーム: POST /api/contact
// 運営宛（CONTACT_TO / ETSY_OWNER_EMAIL）に Resend で転送し、送信者に自動返信を送る。
const { send } = require('./_etsy-mail');
const { normalizeLang } = require('./_terms');

const TO = process.env.CONTACT_TO || process.env.ETSY_OWNER_EMAIL || 'info@libertas-jyotish.com';
const TOPICS = new Set(['order', 'payment', 'cancel', 'account', 'other']);

const ACK = {
  ja: { subject: '【Libertas Jyotish】お問い合わせを受け付けました', body: 'お問い合わせありがとうございます。内容を確認のうえ、通常2営業日以内に担当者よりご返信いたします。このメールは自動送信です。', label: 'お問い合わせ内容' },
  en: { subject: '[Libertas Jyotish] We received your message', body: 'Thank you for contacting us. We will reply within 2 business days. This is an automated confirmation.', label: 'Your message' },
  es: { subject: '[Libertas Jyotish] Hemos recibido tu mensaje', body: 'Gracias por contactarnos. Responderemos en un plazo de 2 días hábiles. Este es un mensaje automático.', label: 'Tu mensaje' },
  pt: { subject: '[Libertas Jyotish] Recebemos sua mensagem', body: 'Obrigado pelo contato. Responderemos em até 2 dias úteis. Esta é uma confirmação automática.', label: 'Sua mensagem' },
  ar: { subject: '[Libertas Jyotish] تم استلام رسالتك', body: 'شكرًا لتواصلك معنا. سنرد خلال يومي عمل. هذه رسالة تأكيد آلية.', label: 'رسالتك' },
  fr: { subject: '[Libertas Jyotish] Nous avons bien reçu votre message', body: 'Merci de nous avoir contactés. Nous vous répondrons sous 2 jours ouvrés. Ceci est une confirmation automatique.', label: 'Votre message' },
  de: { subject: '[Libertas Jyotish] Wir haben Ihre Nachricht erhalten', body: 'Vielen Dank für Ihre Nachricht. Wir antworten innerhalb von 2 Werktagen. Dies ist eine automatische Bestätigung.', label: 'Ihre Nachricht' },
  id: { subject: '[Libertas Jyotish] Pesan Anda telah kami terima', body: 'Terima kasih telah menghubungi kami. Kami akan membalas dalam 2 hari kerja. Ini adalah konfirmasi otomatis.', label: 'Pesan Anda' }
};

const rate = new Map();
function limited(ip) {
  const now = Date.now();
  const hits = (rate.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  hits.push(now);
  rate.set(ip, hits);
  return hits.length > 5;
}

function str(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const body = readBody(req);

  if (str(body.website, 10)) return res.status(200).json({ ok: true });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ error: 'rate_limited' });

  const email = str(body.email, 200).toLowerCase();
  const message = str(body.message, 4000);
  const name = str(body.name, 80);
  const orderId = str(body.orderId, 80);
  const topic = TOPICS.has(body.topic) ? body.topic : 'other';
  const lang = normalizeLang(body.lang || 'ja');
  const page = str(body.page, 300);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'invalid_email' });
  if (message.length < 10) return res.status(400).json({ error: 'invalid_message' });

  const row = (label, value) => `<tr><td style="padding:3px 12px 3px 0; color:#7a6a58; white-space:nowrap;">${label}</td><td>${esc(value)}</td></tr>`;
  const ownerHtml = `<div style="font-family:Georgia,serif; max-width:600px; line-height:1.7; color:#2C221E;">
    <h2 style="color:#8B6B1B;">お問い合わせ（${esc(topic)}）</h2>
    <table style="font-size:14px; border-collapse:collapse;">
      ${row('Name', name || '-')}${row('Email', email)}${row('Topic', topic)}${row('Order ID', orderId || '-')}${row('Lang', lang)}${row('Page', page || '-')}${row('IP', ip || '-')}
    </table>
    <pre style="white-space:pre-wrap; font-family:inherit; background:#fffdf9; border:1px solid rgba(139,107,27,0.35); border-radius:8px; padding:12px; margin-top:12px;">${esc(message)}</pre>
  </div>`;

  try {
    await send({ to: TO, replyTo: email, subject: `[Contact/${topic}] ${name || email}`, html: ownerHtml });
  } catch (err) {
    console.error('contact: owner mail failed:', err.message);
    return res.status(502).json({ error: 'mail_failed' });
  }

  const ack = ACK[lang] || ACK.en;
  const ackHtml = `<div style="font-family:Georgia,serif; max-width:560px; margin:0 auto; padding:24px; border:1px solid rgba(139,107,27,0.35); border-radius:10px; background:#fffdf9; color:#2C221E; line-height:1.7;">
    <h2 style="color:#8B6B1B; text-align:center;">Libertas Jyotish</h2>
    <p>${esc(ack.body)}</p>
    <p style="font-size:13px; color:#7a6a58; margin-top:16px;">${esc(ack.label)}:</p>
    <pre style="white-space:pre-wrap; font-family:inherit; font-size:13px; background:#fff; border:1px solid rgba(139,107,27,0.25); border-radius:8px; padding:12px;">${esc(message)}</pre>
  </div>`;
  try {
    await send({ to: email, subject: ack.subject, html: ackHtml });
  } catch (err) {
    console.error('contact: ack mail failed:', err.message);
  }

  return res.status(200).json({ ok: true });
};
