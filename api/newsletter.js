// お知らせメール
//   GET  /api/newsletter?e=&t=&l=   … 配信停止の確認画面（リンク先読みで解除されないよう、解除はボタンの POST で行う）
//   POST /api/newsletter?e=&t=&l=   … 配信停止（メールソフトのワンクリック解除 List-Unsubscribe-Post もここに来る）
//   GET  /api/newsletter?run=1      … 期日の来たキャンペーンを送る（Vercel Cron 毎週金曜20時 JST＝日本語、土曜9/10時 JST＝英語・ニューヨークの金曜20時。CRON_SECRET 必須）
const { verifyUnsubToken, setOptIn, runCampaigns } = require('./_newsletter');
const { sendInternal } = require('./_owner-mail');
const { normalizeLang } = require('./_terms');

const PAGE = {
  ja: { title: 'メール配信の停止', ask: 'Libertas Jyotish からのお知らせメールを停止しますか？', button: '配信を停止する', done: 'お知らせメールの配信を停止しました。', invalid: 'リンクが正しくありません。お手数ですが info@libertas-jyotish.com までご連絡ください。', error: '処理に失敗しました。時間をおいてもう一度お試しください。', back: 'トップへ戻る' },
  en: { title: 'Unsubscribe', ask: 'Stop receiving news emails from Libertas Jyotish?', button: 'Unsubscribe', done: 'You have been unsubscribed from our news emails.', invalid: 'This link is not valid. Please contact info@libertas-jyotish.com.', error: 'Something went wrong. Please try again later.', back: 'Back to home' },
  es: { title: 'Darse de baja', ask: '¿Dejar de recibir novedades de Libertas Jyotish por correo?', button: 'Darse de baja', done: 'Te has dado de baja de nuestros correos de novedades.', invalid: 'Este enlace no es válido. Escríbenos a info@libertas-jyotish.com.', error: 'Se produjo un error. Inténtalo de nuevo más tarde.', back: 'Volver al inicio' },
  pt: { title: 'Cancelar inscrição', ask: 'Deixar de receber novidades da Libertas Jyotish por e-mail?', button: 'Cancelar inscrição', done: 'Sua inscrição nos e-mails de novidades foi cancelada.', invalid: 'Este link não é válido. Escreva para info@libertas-jyotish.com.', error: 'Ocorreu um erro. Tente novamente mais tarde.', back: 'Voltar ao início' },
  ar: { title: 'إلغاء الاشتراك', ask: 'هل تريد إيقاف رسائل الأخبار من Libertas Jyotish؟', button: 'إلغاء الاشتراك', done: 'تم إلغاء اشتراكك في رسائل الأخبار.', invalid: 'هذا الرابط غير صالح. يرجى مراسلة info@libertas-jyotish.com.', error: 'حدث خطأ. يرجى المحاولة لاحقًا.', back: 'العودة إلى الصفحة الرئيسية' },
  fr: { title: 'Se désabonner', ask: 'Ne plus recevoir les actualités de Libertas Jyotish par e-mail ?', button: 'Se désabonner', done: 'Vous êtes désabonné(e) de nos e-mails d’actualités.', invalid: 'Ce lien n’est pas valide. Écrivez-nous à info@libertas-jyotish.com.', error: 'Une erreur est survenue. Veuillez réessayer plus tard.', back: 'Retour à l’accueil' },
  de: { title: 'Abmelden', ask: 'Keine Neuigkeiten mehr von Libertas Jyotish per E-Mail erhalten?', button: 'Abmelden', done: 'Sie wurden von unseren Neuigkeiten-E-Mails abgemeldet.', invalid: 'Dieser Link ist ungültig. Bitte schreiben Sie an info@libertas-jyotish.com.', error: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.', back: 'Zur Startseite' },
  id: { title: 'Berhenti berlangganan', ask: 'Berhenti menerima email kabar dari Libertas Jyotish?', button: 'Berhenti berlangganan', done: 'Anda telah berhenti berlangganan email kabar kami.', invalid: 'Tautan ini tidak valid. Silakan hubungi info@libertas-jyotish.com.', error: 'Terjadi kesalahan. Silakan coba lagi nanti.', back: 'Kembali ke beranda' }
};

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function page(res, status, lang, body) {
  const p = PAGE[lang] || PAGE.en;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.status(status).send(`<!doctype html><html lang="${lang}"${lang === 'ar' ? ' dir="rtl"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(p.title)} | Libertas Jyotish</title></head>
<body style="font-family:Georgia,'Noto Serif',serif; background:#f6f1e7; color:#2C221E; margin:0; padding:40px 16px;">
<div style="max-width:480px; margin:0 auto; background:#fffdf9; border:1px solid rgba(139,107,27,0.35); border-radius:10px; padding:24px; text-align:center; line-height:1.7;">
<h1 style="font-size:1.2rem; color:#8B6B1B;">${esc(p.title)}</h1>
${body}
<p style="margin-top:20px;"><a href="/${lang}/" style="color:#8B6B1B;">${esc(p.back)}</a></p>
</div></body></html>`);
}

async function handleRun(req, res) {
  const secret = process.env.CRON_SECRET || '';
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!secret || supplied !== secret) return res.status(401).json({ error: 'unauthorized' });
  let summary;
  try {
    summary = await runCampaigns();
  } catch (err) {
    console.error('newsletter run failed:', err.message);
    return res.status(503).json({ error: 'run_failed', detail: err.message });
  }
  if (summary.sent || summary.failed) {
    const lines = [
      `送信: ${summary.sent}通 / 失敗: ${summary.failed}件 / 上限で今回送れなかった: ${summary.remaining}件`,
      `対象キャンペーン: ${summary.due.join(', ')}`,
      summary.stoppedBy === 'resend_rate_limit' ? 'Resend の送信上限に達したため、今回はここで止めました（決まった原稿の残りは翌週に送り、「今週の空」は翌週の号が届きます）。' : '',
      summary.remaining && summary.stoppedBy !== 'resend_rate_limit' ? '1回の送信上限（50通）に達したため、今回はここで止めました（決まった原稿の残りは翌週に送り、「今週の空」は翌週の号が届きます）。' : '',
      ...summary.gaveUp.map((g) => `3回失敗したため送信を断念: ${g.campaign} / ${g.email} / ${g.error}`)
    ].filter(Boolean);
    await sendInternal({ subject: `【お知らせメール】送信 ${summary.sent}通${summary.gaveUp.length ? ` / 断念 ${summary.gaveUp.length}件` : ''}`, text: lines.join('\n') })
      .catch((err) => console.error('newsletter owner notice failed:', err.message));
  }
  return res.status(200).json(summary);
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  if (q.run) return handleRun(req, res);

  const lang = normalizeLang(q.l);
  const p = PAGE[lang] || PAGE.en;
  const email = String(q.e || '').trim().toLowerCase();
  if (!email || !verifyUnsubToken(email, q.t)) return page(res, 400, lang, `<p>${esc(p.invalid)}</p>`);

  if (req.method === 'POST') {
    try {
      await setOptIn(email, false);
    } catch (err) {
      console.error('newsletter unsubscribe failed:', err.message);
      return page(res, 503, lang, `<p>${esc(p.error)}</p>`);
    }
    return page(res, 200, lang, `<p>${esc(p.done)}</p>`);
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const action = `/api/newsletter?${new URLSearchParams({ e: email, t: String(q.t), l: lang }).toString()}`;
  return page(res, 200, lang, `<p>${esc(p.ask)}</p><p style="font-size:0.85rem; color:#5A4E48;">${esc(email)}</p>
<form method="post" action="${esc(action)}"><button type="submit" style="background:#8B6B1B; color:#fff; border:none; border-radius:8px; padding:10px 24px; font-size:1rem; cursor:pointer;">${esc(p.button)}</button></form>`);
};
