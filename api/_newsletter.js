// お知らせメール（同意者だけに送る宣伝メール）の共通処理。
// 同意は会員シートの newsletter_opt_in = yes のみ。ログイン用メールアドレスの登録は同意とみなさない。
// 送信済みは別タブ newsletter_log に 1 宛先 1 行で残し、同じキャンペーンを二重に送らない。
const crypto = require('crypto');
// シート・Resend は使う時に読み込む（npm install 無しの CI でも検査できるように）
const getMemberSheet = (...a) => require('./_sheets').getMemberSheet(...a);
const send = (...a) => require('./_etsy-mail').send(...a);
const { normalizeLang } = require('./_terms');

const BASE_URL = (process.env.SITE_BASE_URL || 'https://www.libertas-jyotish.com').replace(/\/$/, '');
const LOG_TAB = 'newsletter_log';
const LOG_HEADERS = ['campaign_id', 'email', 'status', 'attempts', 'updated_at', 'error'];
const OPT_HEADERS = ['newsletter_opt_in', 'newsletter_updated_at'];
// 送信は週1回（金曜20時 JST）。Resend 無料枠（1日100通）は認証コード・鑑定書配送と共用なので、1回の実行で送るのは50通まで。
// 超えた分は翌週の実行で送る（毎週作る「今週の空」は週ごとに別のメールなので、残りの人には翌週の号が届く）。
// 上限で止まる人が毎週同じにならないよう、宛先の順番はキャンペーンごとに入れ替える。
const MAX_PER_RUN = 50;
const MAX_ATTEMPTS = 3;
const SEND_GAP_MS = 300;
// 関数の上限300秒に届く前に打ち切る（残りは翌週）
const RUN_DEADLINE_MS = 240 * 1000;
// 予定日から8日を過ぎたキャンペーンは送らない（週1回の実行で、直後の回と上限超えの残りを送る翌週の回だけが拾う）
const CAMPAIGN_WINDOW_MS = 8 * 24 * 60 * 60 * 1000;
const TEST_DOMAINS = /(^|\.)(example\.(com|org|net)|test\.com|test|invalid|localhost)$/i;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isSendable(email) {
  const e = normalizeEmail(email);
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e)) return false;
  return !TEST_DOMAINS.test(e.split('@')[1]);
}

function unsubToken(email) {
  const secret = process.env.AUTH_SECRET || '';
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(`newsletter-unsub:${normalizeEmail(email)}`).digest('hex').slice(0, 32);
}

function verifyUnsubToken(email, token) {
  const expected = unsubToken(email);
  const actual = String(token || '');
  if (!expected || actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function unsubscribeUrl(email, lang) {
  const q = new URLSearchParams({ e: normalizeEmail(email), t: unsubToken(email), l: normalizeLang(lang) });
  return `${BASE_URL}/api/newsletter?${q.toString()}`;
}

// 特定電子メール法の表示事項（送信者・配信停止の方法・運営者情報への案内・連絡先）
const FOOTER = {
  ja: { why: 'このメールは、インド占星術 Libertas Jyotish（リベルタス ジョーティシュ）でお知らせの受信に同意された方にお送りしています。', top: 'サイトトップ', stop: '配信停止', info: '運営者情報', brand: 'Libertas Jyotish（リベルタス ジョーティシュ）', sub: 'リベルタス ジョーティシュ ・ インド占星術' },
  en: { why: 'You are receiving this because you agreed to receive news from Libertas Jyotish.', top: 'Home', stop: 'Unsubscribe', info: 'Operator information (address and contact)' },
  es: { why: 'Recibes este correo porque aceptaste recibir novedades de Libertas Jyotish.', top: 'Inicio', stop: 'Darse de baja', info: 'Información del operador (dirección y contacto)' },
  pt: { why: 'Você recebe este e-mail porque aceitou receber novidades da Libertas Jyotish.', top: 'Início', stop: 'Cancelar inscrição', info: 'Informações do operador (endereço e contato)' },
  ar: { why: 'تصلك هذه الرسالة لأنك وافقت على تلقي أخبار Libertas Jyotish.', top: 'الصفحة الرئيسية', stop: 'إلغاء الاشتراك', info: 'معلومات المشغّل (العنوان ووسيلة التواصل)' },
  fr: { why: 'Vous recevez cet e-mail car vous avez accepté de recevoir les actualités de Libertas Jyotish.', top: 'Accueil', stop: 'Se désabonner', info: "Informations sur l'exploitant (adresse et contact)" },
  de: { why: 'Sie erhalten diese E-Mail, weil Sie dem Empfang von Neuigkeiten von Libertas Jyotish zugestimmt haben.', top: 'Startseite', stop: 'Abmelden', info: 'Angaben zum Betreiber (Anschrift und Kontakt)' },
  id: { why: 'Anda menerima email ini karena telah setuju menerima kabar dari Libertas Jyotish.', top: 'Beranda', stop: 'Berhenti berlangganan', info: 'Informasi pengelola (alamat dan kontak)' }
};

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function buildMail({ email, lang, content }) {
  const l = normalizeLang(lang);
  const f = FOOTER[l] || FOOTER.en;
  const unsub = unsubscribeUrl(email, l);
  const legal = `${BASE_URL}/${l}/legal`;
  const dir = l === 'ar' ? ' dir="rtl"' : '';
  const top = `${BASE_URL}/${l}/`;
  const brand = f.brand || 'Libertas Jyotish';
  const banner = content.banner ? `\n        <div style="color:#d9cbb0; font-size:13px; margin-top:4px;">${esc(content.banner)}</div>` : '';
  const html = `<div${dir} style="font-family:Georgia,'Noto Serif JP','Noto Serif',serif; max-width:560px; margin:0 auto; border:1px solid rgba(139,107,27,0.35); border-radius:10px; overflow:hidden; background:#fffdf9; color:#2C221E; line-height:1.8;">
    <a href="${esc(top)}" style="display:block; text-decoration:none;">
      <div style="background:#2C221E; text-align:center; padding:22px 16px 18px;">
        <img src="${BASE_URL}/img/libertas-logo.png" width="110" height="110" alt="Libertas Jyotish" style="display:block; margin:0 auto 8px;">
        <div style="color:#E8C766; font-size:20px; letter-spacing:2px;">Libertas Jyotish</div>${f.sub ? `\n        <div style="color:#E8C766; font-size:13px; letter-spacing:1px; margin-top:2px;">${esc(f.sub)}</div>` : ''}${banner}
      </div>
    </a>
    ${content.html}
    <p style="font-size:12px; color:#7a6a58; border-top:1px dashed rgba(139,107,27,0.3); padding:12px 22px 18px; margin:24px 0 0;">
      ${esc(f.why)}<br>
      <a href="${esc(top)}" style="color:#7a6a58;">${esc(f.top)}</a> ・ <a href="${esc(unsub)}" style="color:#7a6a58;">${esc(f.stop)}</a> ・ <a href="${esc(legal)}" style="color:#7a6a58;">${esc(f.info)}</a><br>
      ${esc(brand)} ・ info@libertas-jyotish.com
    </p>
  </div>`;
  const text = `${content.text || ''}\n\n--\n${f.why}\n${f.top}: ${top}\n${f.stop}: ${unsub}\n${f.info}: ${legal}\n${brand} / info@libertas-jyotish.com\n`;
  return {
    subject: content.subject,
    html,
    text,
    headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
  };
}

async function ensureHeaders(sheet, wanted) {
  await sheet.loadHeaderRow().catch(() => null);
  const current = sheet.headerValues || [];
  const missing = wanted.filter((h) => !current.includes(h));
  if (!missing.length) return;
  const next = [...current, ...missing];
  if ((sheet.columnCount || 0) < next.length) await sheet.resize({ rowCount: sheet.rowCount, columnCount: next.length });
  await sheet.setHeaderRow(next);
}

// 会員行の同意状態を書き換える。会員行が無いアドレスは false（同意だけの行は作らない）。
async function setOptIn(email, optIn) {
  const sheet = await getMemberSheet();
  if (!sheet) throw new Error('sheet_unavailable');
  await ensureHeaders(sheet, OPT_HEADERS);
  const target = normalizeEmail(email);
  const rows = (await sheet.getRows()).filter((r) => normalizeEmail(r.get('email')) === target);
  if (!rows.length) return false;
  const now = new Date().toISOString();
  for (const row of rows) {
    row.set('newsletter_opt_in', optIn ? 'yes' : 'no');
    row.set('newsletter_updated_at', now);
    await row.save();
  }
  return true;
}

async function getOptIn(email) {
  const sheet = await getMemberSheet();
  if (!sheet) throw new Error('sheet_unavailable');
  const target = normalizeEmail(email);
  const rows = (await sheet.getRows()).filter((r) => normalizeEmail(r.get('email')) === target);
  return rows.some((r) => r.get('newsletter_opt_in') === 'yes');
}

function loadCampaigns() {
  try {
    return require('../data/newsletter/campaigns.json');
  } catch (err) {
    return [];
  }
}

// 決まった原稿（campaigns.json）と、その週の「今週の空」（星の計算から自動で作る）
function currentCampaigns(now) {
  const list = [...loadCampaigns()];
  try {
    list.push(require('./_newsletter-weekly').weeklyCampaign(now));
  } catch (err) {
    console.error('[newsletter] weekly build failed', err.message);
  }
  return list;
}

function dueCampaigns(campaigns, now) {
  return campaigns.filter((c) => {
    const at = Date.parse(c.sendAfter);
    return c.id && c.langs && Number.isFinite(at) && at <= now && now - at < CAMPAIGN_WINDOW_MS;
  });
}

// 同意者（重複・テスト用アドレスを除く）を { email, lang, interests } で返す
function collectRecipients(rows) {
  const byEmail = new Map();
  for (const row of rows) {
    const email = normalizeEmail(row.get('email'));
    if (!email) continue;
    const entry = byEmail.get(email) || { email, lang: '', optIn: false, interests: new Set() };
    if (row.get('newsletter_opt_in') === 'yes') entry.optIn = true;
    if (!entry.lang && row.get('language')) entry.lang = normalizeLang(row.get('language'));
    for (const k of ['A', 'B', 'C', 'D']) if (row.get(`interest_${k}`) === 'yes') entry.interests.add(k);
    byEmail.set(email, entry);
  }
  return [...byEmail.values()].filter((r) => r.optIn && isSendable(r.email)).map((r) => ({ ...r, lang: r.lang || 'ja' }));
}

function matches(campaign, recipient) {
  if (!campaign.langs[recipient.lang]) return false;
  const wanted = Array.isArray(campaign.interests) ? campaign.interests : [];
  return !wanted.length || wanted.some((k) => recipient.interests.has(k));
}

async function getLogSheet(memberSheet) {
  const doc = memberSheet._spreadsheet;
  let sheet = doc.sheetsByTitle[LOG_TAB];
  if (!sheet) sheet = await doc.addSheet({ title: LOG_TAB, headerValues: LOG_HEADERS });
  else await ensureHeaders(sheet, LOG_HEADERS);
  return sheet;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 期日の来たキャンペーンを同意者へ送る。1回あたり MAX_PER_RUN 通・1宛先 MAX_ATTEMPTS 回まで。
// Resend の上限（429）に当たったらその回は打ち切り、翌週の実行で続きから送る。
async function runCampaigns({ now = Date.now(), campaigns, mailer = send, gap = SEND_GAP_MS, deadline = Date.now() + RUN_DEADLINE_MS, memberSheet: givenSheet } = {}) {
  const due = dueCampaigns(campaigns || currentCampaigns(now), now);
  const summary = { due: due.map((c) => c.id), sent: 0, failed: 0, gaveUp: [], remaining: 0, stoppedBy: null };
  if (!due.length) return summary;

  const memberSheet = givenSheet || (await getMemberSheet());
  if (!memberSheet) throw new Error('sheet_unavailable');
  const recipients = collectRecipients(await memberSheet.getRows());
  const logSheet = await getLogSheet(memberSheet);
  const logRows = await logSheet.getRows();
  const log = new Map(logRows.map((r) => [`${r.get('campaign_id')}|${normalizeEmail(r.get('email'))}`, r]));

  let budget = MAX_PER_RUN;
  for (const campaign of due) {
    const order = (x) => crypto.createHash('sha1').update(`${campaign.id}|${x.email}`).digest('hex');
    for (const r of recipients.filter((x) => matches(campaign, x)).sort((a, b) => (order(a) < order(b) ? -1 : 1))) {
      const key = `${campaign.id}|${r.email}`;
      const row = log.get(key);
      const attempts = row ? Number(row.get('attempts') || 0) : 0;
      if (row && (row.get('status') === 'sent' || attempts >= MAX_ATTEMPTS)) continue;
      if (!summary.stoppedBy && Date.now() > deadline) summary.stoppedBy = 'time_limit';
      if (budget <= 0 || summary.stoppedBy) { summary.remaining += 1; continue; }
      budget -= 1;

      const mail = buildMail({ email: r.email, lang: r.lang, content: campaign.langs[r.lang] });
      let status = 'sent';
      let error = '';
      try {
        await mailer({ to: r.email, ...mail });
        summary.sent += 1;
      } catch (err) {
        error = String(err.message || err).slice(0, 200);
        if (/Resend 429/.test(error)) summary.stoppedBy = 'resend_rate_limit';
        status = 'failed';
        summary.failed += 1;
        if (attempts + 1 >= MAX_ATTEMPTS) summary.gaveUp.push({ campaign: campaign.id, email: r.email, error });
      }
      const values = { campaign_id: campaign.id, email: r.email, status, attempts: String(attempts + 1), updated_at: new Date().toISOString(), error };
      if (row) {
        row.assign(values);
        await row.save();
      } else {
        log.set(key, await logSheet.addRow(values));
      }
      if (gap) await sleep(gap);
    }
  }
  return summary;
}

module.exports = {
  isSendable,
  unsubToken,
  verifyUnsubToken,
  unsubscribeUrl,
  buildMail,
  setOptIn,
  getOptIn,
  collectRecipients,
  dueCampaigns,
  runCampaigns,
  currentCampaigns,
  MAX_PER_RUN,
  MAX_ATTEMPTS
};
