// Resend 経由のメール送信。Etsy の購入者は英語圏が大半なので本文は英語、鑑定書本体は選択言語で作る。
const FROM = process.env.ETSY_MAIL_FROM || 'Libertas Jyotish <info@libertas-jyotish.com>';
const OWNER = process.env.ETSY_OWNER_EMAIL || 'info@libertas-jyotish.com';
const { LINK_TTL_DAYS } = require('./_etsy-storage');

const LANGUAGE_NAMES = { en: 'English', ja: '日本語 (Japanese)', es: 'Español', pt: 'Português', ar: 'العربية (Arabic)', id: 'Bahasa Indonesia', fr: 'Français', de: 'Deutsch' };

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function wrap(inner) {
  return `<div style="font-family:Georgia,'Noto Serif',serif; max-width:560px; margin:0 auto; padding:24px; border:1px solid rgba(139,107,27,0.35); border-radius:10px; background:#fffdf9; color:#2C221E; line-height:1.7;">
    <h2 style="color:#8B6B1B; text-align:center; border-bottom:1px dashed rgba(139,107,27,0.3); padding-bottom:10px; font-weight:600;">Libertas Jyotish</h2>
    ${inner}
    <p style="font-size:12px; color:#7a6a58; border-top:1px dashed rgba(139,107,27,0.3); padding-top:10px; margin-top:24px;">
      This report is for self-reflection and entertainment. It is not medical, legal, financial or psychological advice.
      Sent by Libertas Jyotish for your Etsy order. Replies to this email reach us directly.
    </p>
  </div>`;
}

async function send({ to, subject, html, attachments, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      reply_to: replyTo || OWNER,
      subject,
      html,
      attachments
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${data.message || 'unknown error'}`);
  return data.id || '';
}

const PRODUCT_NAMES = {
  natal: 'Vedic astrology birth chart report',
  yearly: 'Vedic astrology year-ahead forecast',
  compat: 'Vedic astrology compatibility report',
  career: 'Vedic astrology career & wealth report',
  palm: 'Kar-Kundali (Vedic palm & birth chart) report'
};

// 手相×出生図: 写真のアップロード案内。日本語注文（サイト直販）は日本語、それ以外は英語。
// retake=true は判読できなかったときの撮り直し依頼。
const UPLOAD_TIPS = {
  en: ['Bright natural light, palm open, camera directly above.', 'Include fingertips to wrist in the frame.', 'Avoid shadows across the lines (no flash needed).'],
  ja: ['明るい自然光の下で、手のひらを開いて真上から。', '指先から手首まで全体が入るように。', '線に影がかからないように（フラッシュは不要）。']
};

function uploadHtml({ name, uploadUrl, language, retake }) {
  const ja = language === 'ja';
  const tips = UPLOAD_TIPS[ja ? 'ja' : 'en'].map((t) => `<li>${esc(t)}</li>`).join('');
  if (ja) {
    return wrap(`
      <p>${esc(name || 'お客さま')} さま</p>
      <p>${retake ? 'お送りいただいた写真が不鮮明で、線や丘を判読できませんでした。お手数ですが、下記のポイントをご確認のうえ両手の写真をもう一度お送りください（追加料金はございません）。' : 'カル・クンダリ（手相×出生図 統合鑑定）をご購入いただきありがとうございます。鑑定を始めるには、両手の写真 2 枚が必要です。'}</p>
      <p style="text-align:center; margin:20px 0;"><a href="${esc(uploadUrl)}" style="display:inline-block; padding:12px 26px; background:#8B6B1B; color:#fff; text-decoration:none; border-radius:6px;">写真をアップロードする</a></p>
      <p style="font-size:13px; color:#7a6a58;">ボタンが開かない場合はこちら: <a href="${esc(uploadUrl)}">${esc(uploadUrl)}</a><br>（このリンクはご注文専用です。他の方に共有しないでください）</p>
      <ul style="font-size:14px;">${tips}</ul>
      <p style="font-size:14px;">写真は鑑定のみに使用し、原本は納品後 30 日で自動削除します。本人確認や生体認証には使いません。アップロード後 24 時間以内に PDF をメールでお届けします。</p>
      <p>Libertas Jyotish</p>`);
  }
  return wrap(`
    <p>Dear ${esc(name || 'friend')},</p>
    <p>${retake ? 'The photos you sent were too unclear for us to read the lines and mounts. Could you please send both palms again, following the tips below? There is no extra charge.' : 'Thank you for ordering the Kar-Kundali (Vedic palm & birth chart) report. To begin your reading we need two photos: your right palm and your left palm.'}</p>
    <p style="text-align:center; margin:20px 0;"><a href="${esc(uploadUrl)}" style="display:inline-block; padding:12px 26px; background:#8B6B1B; color:#fff; text-decoration:none; border-radius:6px;">Upload your palm photos</a></p>
    <p style="font-size:13px; color:#7a6a58;">If the button does not open: <a href="${esc(uploadUrl)}">${esc(uploadUrl)}</a><br>(This link is private to your order. Please do not share it.)</p>
    <ul style="font-size:14px;">${tips}</ul>
    <p style="font-size:14px;">Photos are used only for this reading; the originals are deleted automatically 30 days after delivery and are never used for identification or biometric matching. Your PDF will arrive by email within 24 hours of upload.</p>
    <p>With gratitude,<br>Libertas Jyotish</p>`);
}

// Etsy メッセージに貼るアップロード案内（購入者メールが取れない注文用）
function uploadText({ name, uploadUrl, retake }) {
  return [
    `Dear ${name || 'friend'},`,
    '',
    retake
      ? 'The photos you sent were too unclear for us to read the lines and mounts. Could you please upload both palms again (no extra charge)?'
      : 'Thank you for ordering the Kar-Kundali (Vedic palm & birth chart) report. To begin, please upload a photo of your right palm and your left palm here:',
    uploadUrl,
    '',
    ...UPLOAD_TIPS.en.map((t) => `- ${t}`),
    '',
    'Photos are used only for this reading and deleted automatically 30 days after delivery. Your PDF will follow within 24 hours of upload.',
    '',
    'With gratitude,',
    'Libertas Jyotish'
  ].join('\n');
}

function deliveryHtml({ name, product, dob, tob, tobUnknown, place, dobB, tobB, placeB, language, downloadUrl }) {
  const row = (label, value) => `<tr><td style="padding:3px 12px 3px 0; color:#7a6a58;">${label}</td><td>${esc(value)}</td></tr>`;
  const personB = product === 'compat' ? `${row('Date of birth (B)', dobB)}${row('Time of birth (B)', tobB || '12:00 (unknown)')}${row('Place of birth (B)', placeB)}` : '';
  const aLabel = product === 'compat' ? ' (A)' : '';
  return wrap(`
    <p>Dear ${esc(name || 'friend')},</p>
    <p>Thank you for your order. Your personalized ${PRODUCT_NAMES[product] || PRODUCT_NAMES.natal} is attached to this email as a PDF.</p>
    ${downloadUrl ? `<p style="font-size:14px;">You can also download it here (link valid for ${LINK_TTL_DAYS} days): <a href="${esc(downloadUrl)}">${esc(downloadUrl)}</a></p>` : ''}
    <table style="font-size:14px; border-collapse:collapse; margin:12px 0;">
      ${row(`Date of birth${aLabel}`, dob)}
      ${row(`Time of birth${aLabel}`, `${tob}${tobUnknown ? ' (unknown — calculated at noon)' : ''}`)}
      ${row(`Place of birth${aLabel}`, place)}
      ${personB}
      ${row('Report language', LANGUAGE_NAMES[language] || language)}
    </table>
    ${tobUnknown ? '<p style="font-size:14px;">Because the birth time was not provided, the ascendant and house positions are approximate. The Moon sign, nakshatra and Dasha timeline remain reliable. If you later learn your birth time, reply to this email and we will re-issue the report at no charge.</p>' : ''}
    <p>If anything in the birth data above is wrong, simply reply to this email and we will correct and resend the report.</p>
    <p>If the report resonates with you, a short review on Etsy would help other seekers find this reading. Thank you.</p>
    <p>With gratitude,<br>Libertas Jyotish</p>`);
}

const MISSING_LABELS = {
  dob: 'your date of birth (please write it as YYYY-MM-DD, e.g. 1990-05-14)',
  tob: 'your time of birth in 24-hour format (e.g. 14:35), or write "unknown"',
  place: 'your place of birth (city and country)',
  'a.dob': 'date of birth of person A (YYYY-MM-DD, e.g. 1990-05-14)',
  'a.tob': 'time of birth of person A in 24-hour format (e.g. 14:35), or write "unknown"',
  'a.place': 'place of birth of person A (city and country)',
  'b.dob': 'date of birth of person B (YYYY-MM-DD, e.g. 1990-05-14)',
  'b.tob': 'time of birth of person B in 24-hour format (e.g. 14:35), or write "unknown"',
  'b.place': 'place of birth of person B (city and country)'
};

const NOTE_KEY = (n) => n.replace(/^[ab]\./, '');
const NOTE_LABELS = {
  date_ambiguous_day_month: 'The date you entered could be read as either day/month or month/day, so please write it as YYYY-MM-DD.',
  time_needs_am_pm: 'The time you entered could be morning or afternoon, so please add AM/PM or use 24-hour format.'
};

function needsInfoHtml({ name, personalization, missing, notes }) {
  const items = missing.map((m) => `<li>${esc(MISSING_LABELS[m] || m)}</li>`).join('');
  const hints = notes.map((n) => `<p style="font-size:14px;">${esc(NOTE_LABELS[NOTE_KEY(n)] || n)}</p>`).join('');
  return wrap(`
    <p>Dear ${esc(name || 'friend')},</p>
    <p>Thank you for your order. Before we can calculate your chart we need one more detail. Please reply to this email with:</p>
    <ul>${items}</ul>
    ${hints}
    <p style="font-size:14px; color:#7a6a58;">What you entered at checkout: <em>${esc(personalization || '(empty)')}</em></p>
    <p>As soon as we hear from you, your report will be prepared and sent within one business day.</p>
    <p>With gratitude,<br>Libertas Jyotish</p>`);
}

// Etsy メッセージに貼るプレーンテキスト（購入者メールが取れない注文用）
function deliveryText({ name, product, dob, tob, tobUnknown, place, dobB, tobB, placeB, language, downloadUrl }) {
  const aLabel = product === 'compat' ? ' (A)' : '';
  return [
    `Dear ${name || 'friend'},`,
    '',
    `Thank you for your order. Your personalized ${PRODUCT_NAMES[product] || PRODUCT_NAMES.natal} (PDF) is ready.`,
    `Download (valid for ${LINK_TTL_DAYS} days): ${downloadUrl}`,
    '',
    `Date of birth${aLabel}: ${dob}`,
    `Time of birth${aLabel}: ${tob}${tobUnknown ? ' (unknown - calculated at noon)' : ''}`,
    `Place of birth${aLabel}: ${place}`,
    ...(product === 'compat' ? [`Date of birth (B): ${dobB}`, `Time of birth (B): ${tobB || '12:00 (unknown)'}`, `Place of birth (B): ${placeB}`] : []),
    `Report language: ${LANGUAGE_NAMES[language] || language}`,
    '',
    ...(tobUnknown ? ['Because the birth time was not provided, the ascendant and house positions are approximate. The Moon sign, nakshatra and Dasha timeline remain reliable. If you later learn your birth time, message us and we will re-issue the report at no charge.', ''] : []),
    'If anything in the birth data above is wrong, just reply here and we will correct and resend the report.',
    'If the report resonates with you, a short review would help other seekers find this reading. Thank you.',
    '',
    'With gratitude,',
    'Libertas Jyotish'
  ].join('\n');
}

function needsInfoText({ name, missing, notes }) {
  return [
    `Dear ${name || 'friend'},`,
    '',
    'Thank you for your order. Before we can calculate your chart we need one more detail. Please reply with:',
    ...missing.map((m) => `- ${MISSING_LABELS[m] || m}`),
    ...notes.map((n) => NOTE_LABELS[NOTE_KEY(n)] || n),
    '',
    'As soon as we hear from you, your report will be prepared and sent within one business day.',
    '',
    'With gratitude,',
    'Libertas Jyotish'
  ].join('\n');
}

async function sendReport({ to, name, pdf, filename, meta }) {
  return send({
    to,
    subject: 'Your Vedic Astrology Report from Libertas Jyotish',
    html: deliveryHtml({ name, ...meta }),
    attachments: [{ filename, content: pdf.toString('base64') }]
  });
}

async function sendUploadLink({ to, name, uploadUrl, language, retake = false }) {
  const ja = language === 'ja';
  return send({
    to,
    subject: ja
      ? (retake ? '【カル・クンダリ】手の写真の撮り直しのお願い' : '【カル・クンダリ】両手の写真をお送りください')
      : (retake ? 'Kar-Kundali: please re-take your palm photos' : 'Kar-Kundali: please upload your palm photos'),
    html: uploadHtml({ name, uploadUrl, language, retake })
  });
}

async function sendNeedsInfo({ to, name, personalization, missing, notes }) {
  return send({
    to,
    subject: 'One more detail needed for your Vedic Astrology Report',
    html: needsInfoHtml({ name, personalization, missing, notes })
  });
}

// 運営者向け通知。購入者情報の要約と結果だけを送る（鑑定書本文は添えない）。
async function notifyOwner(subject, lines) {
  return send({
    to: OWNER,
    subject: `[Etsy] ${subject}`,
    html: `<pre style="font-family:monospace; font-size:13px; white-space:pre-wrap;">${esc(lines.join('\n'))}</pre>`
  });
}

module.exports = { send, sendReport, sendNeedsInfo, sendUploadLink, notifyOwner, deliveryText, needsInfoText, uploadText, LANGUAGE_NAMES };
