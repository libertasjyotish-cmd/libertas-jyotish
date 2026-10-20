// 毎週金曜20時（日本時間）に送る「今週の空」メール（日本語・英語）。
// 星の出来事は api/_sky-events.js の計算と決まった文から作り、Gemini は使わない。
// おすすめ鑑定書は6種類を週ごとに順番に入れ替える。価格は国で変わるので、日本語（日本向け）以外には入れない。
const { DAY, PLANET, SIGN_JA, ECLIPSE_KIND, jaDate, enDate, calendarEvents, eventScript } = require('./_sky-events');

const BASE_URL = (process.env.SITE_BASE_URL || 'https://www.libertas-jyotish.com').replace(/\/$/, '');
const MAX_EVENTS = 2;
// 出来事が無い週に「次の節目」を探す範囲
const LOOKAHEAD_DAYS = 180;
// 送信は金曜 11:00 UTC（20:00 JST）。対象は翌日の土曜から金曜までの7日間
const SEND_HOUR_UTC = 11;
const REPORT_PATHS = ['/pdf-purchase', '/yearly', '/career', '/palm-chart', '/compat', '/karma'];

const TEXT = {
  ja: {
    reports: [
      ['生涯完全鑑定書', '人生のテーマ、ダシャー周期、開運アドバイスを数十ページに渡る1冊の特別レポートにまとめてお届けします。'],
      ['年間運勢 鑑定書', 'ダシャーとトランジットから、今後12か月の流れ・転機・仕事恋愛金運健康の月別展望をまとめます。'],
      ['仕事運・金運・天職 鑑定書', '適職・才能・金運の器、転職・独立・早期退職（FIRE）の時期を、10室・アルタトリコーナ・ダシャーから読み解きます。'],
      ['カル・クンダリ（手相×出生図）', '出生図（天）と両手の写真（地）を、古典手相学ハスタ・サムドリカの作法で照合する完全型の鑑定。'],
      ['相性 鑑定書', '二人の出生図から、なぜ出逢ったのか・この縁の種類・どこまで深められるか・今後10年の流れを読み解きます。'],
      ['Karma & Dharma ― 今世の天命', '生まれ持ったカルマ（課題）とダルマ（使命）を、インド占星術の出生図から読み解く鑑定書。']
    ],
    points: [
      'その日の星が、あなたのどのハウスで何を起こすか（全文）',
      '今のダシャー（支配星の周期）の過ごし方',
      '今日・今週の具体的な行動3つ（曜日・相手・場面まで）',
      '今日の守り（インド神話にちなんだ、その日のふるまい）',
      '翌日以降の流れと、時間帯ごとの吉凶',
      '9つの天体すべての配置表と一言解説'
    ],
    date: (d) => { const j = jaDate(d); return { day: j.label, full: `${j.label}（${j.weekday}）` }; },
    range: (a, b) => `${a.full}〜${b.full}`,
    sentence: (hook) => { const i = hook.indexOf('。'); return [hook.slice(0, i), hook.slice(i + 1)]; },
    describe(e) {
      const s = SIGN_JA[e.sign] || e.sign;
      const p = PLANET[e.planet];
      const eclipse = /^(solar|lunar)-eclipse-(\w+)$/.exec(e.type);
      if (eclipse) {
        const name = `${ECLIPSE_KIND[eclipse[2]]}${eclipse[1] === 'solar' ? '日食' : '月食'}`;
        return { title: `${s}で${name}`, noun: `${s}の${name}`, kind: name };
      }
      if (e.type === 'conjunction') {
        const [a, b] = e.planet.split('-').map((x) => PLANET[x]);
        return { title: `${a}と${b}が${s}で重なる`, noun: `${a}と${b}の重なり`, kind: '重なり' };
      }
      if (e.type === 'retrograde') return { title: `${p}が${s}で逆行`, noun: `${p}逆行`, kind: '逆行' };
      if (e.type === 'direct') return { title: `${p}が${s}で順行に戻る`, noun: `${p}の順行`, kind: '順行' };
      const note = e.type === 'exalted' ? '（高揚）' : e.type === 'debilitated' ? '（減衰）' : '';
      return { title: `${p}が${s}へ${note}`, noun: `${p}の${s}入り`, kind: '星の動き' };
    },
    subject: (lead) => `【今週の空】${lead}`,
    subjectNext: (c) => `【今週の空】次の節目は${c.day}、${c.title}`,
    subjectNone: '【今週の空】大きな星の動きのない一週間です',
    intro: 'こんばんは、インド占星術の Libertas Jyotish（リベルタス ジョーティシュ）です。今週の空の出来事をお届けします。',
    introNext: (range) => `こんばんは、インド占星術の Libertas Jyotish（リベルタス ジョーティシュ）です。${range}は、大きな星の動きはありません。次の節目をお知らせします。`,
    introNone: (range) => `こんばんは、インド占星術の Libertas Jyotish（リベルタス ジョーティシュ）です。${range}は、大きな星の動きはありません。`,
    heading: (kind) => `この${kind || '星の動き'}が、あなたのどの分野に効くか`,
    why: (noun) => `同じ${noun || '星の動き'}でも、仕事に出る人、お金に出る人、恋愛に出る人がいます。どこに出るかは、あなたの月星座から数えたハウスで決まります。プレミアム会員なら、あなたの出生図で毎日読み解いてお届けします。`,
    premiumTitle: 'プレミアム会員で毎日読めること',
    button: '月額550円でプレミアム会員になる',
    refund: 'マイページからいつでも解約できます。お支払いから30日以内なら返金いたします。',
    reportTitle: '今週のおすすめ鑑定書',
    more: '詳しく見る →',
    banner: (range) => `今週の空 ・ ${range}`,
    bullet: '・',
    colon: '：'
  },
  en: {
    reports: [
      ['Lifetime Report', 'Your life themes, dasha cycles and guidance for good fortune, gathered into a single special report of dozens of pages.'],
      ['Year Ahead Report', 'From dashas and transits: the arc of the next 12 months, turning points, and a month-by-month outlook for work, love, money and health.'],
      ['Career, Wealth & Calling Report', 'Discover your ideal vocation, talents, financial potential, and the timing for career transitions, independence, or early retirement (FIRE), interpreted through the 10th House, Artha Trikona, and Dashas.'],
      ['Kar-Kundali (Palm × Birth Chart)', 'Your birth chart (Heaven) and photos of both hands (Earth) read together by the classical Hasta Samudrika method — the complete form of a reading.'],
      ['Compatibility Report', 'From two birth charts: why you met, strengths and frictions, and when the relationship shifts over the next 12 months.'],
      ['Karma & Dharma — Your Life Purpose', 'A report that deciphers your innate Karma (challenges) and Dharma (mission) from your Vedic astrology birth chart (Janma Kundali).']
    ],
    points: [
      'What the day\'s planets do in each house of your chart (full reading)',
      'How to live your current dasha (planetary period)',
      'Three concrete actions for today and this week (down to the day, the person and the setting)',
      'Today\'s protection (how to act today, drawn from Indian mythology)',
      'The days ahead, and the good and difficult hours of each day',
      'All nine planets in one table, each with a short note'
    ],
    date: (d) => ({ day: enDate(d), full: enDate(d, { weekday: 'short', month: 'long', day: 'numeric' }) }),
    range: (a, b) => `${a.full} – ${b.full}`,
    sentence: (hook) => { const i = hook.indexOf('. '); return [hook.slice(0, i), hook.slice(i + 2)]; },
    describe(e) {
      const s = e.sign;
      const p = e.planet;
      const eclipse = /^(solar|lunar)-eclipse-(\w+)$/.exec(e.type);
      if (eclipse) {
        const name = `${eclipse[2]} ${eclipse[1]} eclipse`;
        return { title: `${name.charAt(0).toUpperCase()}${name.slice(1)} in ${s}`, noun: `${name} in ${s}`, kind: 'eclipse' };
      }
      if (e.type === 'conjunction') {
        const [a, b] = p.split('-');
        return { title: `${a} and ${b} meet in ${s}`, noun: `${a}–${b} conjunction`, kind: 'conjunction' };
      }
      if (e.type === 'retrograde') return { title: `${p} retrograde in ${s}`, noun: `${p} retrograde`, kind: 'retrograde' };
      if (e.type === 'direct') return { title: `${p} turns direct in ${s}`, noun: `${p} direct station`, kind: 'direct station' };
      const note = e.type === 'exalted' ? ' (exalted)' : e.type === 'debilitated' ? ' (debilitated)' : '';
      return { title: `${p} enters ${s}${note}`, noun: `${p} in ${s}`, kind: 'planetary shift' };
    },
    subject: (lead) => `[This Week's Sky] ${lead}`,
    subjectNext: (c) => `[This Week's Sky] Next turning point: ${c.day}, ${c.title}`,
    subjectNone: '[This Week\'s Sky] A quiet week in the sky',
    intro: 'Hello from Libertas Jyotish, Vedic astrology. Here is what happens in the sky this week.',
    introNext: (range) => `Hello from Libertas Jyotish, Vedic astrology. There are no major planetary events this week (${range}), so here is the next turning point.`,
    introNone: (range) => `Hello from Libertas Jyotish, Vedic astrology. There are no major planetary events this week (${range}).`,
    heading: (kind) => `Which part of your life this ${kind || 'planetary shift'} touches`,
    why: (noun) => `The same ${noun || 'planetary shift'} shows up in work for some people, and in money or love for others. Where it lands depends on the house counted from your Moon sign. As a Premium member, you get it read from your own birth chart, every day.`,
    premiumTitle: 'What Premium members read every day',
    button: 'Join Premium',
    refund: 'Cancel anytime from My Page. Refunds are available within 30 days of payment.',
    reportTitle: 'Report of the week',
    more: 'See details →',
    banner: (range) => `This Week's Sky · ${range}`,
    bullet: '- ',
    colon: ': '
  }
};

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// now 以前で最も新しい金曜の送信時刻
function sendTimeFor(now) {
  const d = new Date(now);
  let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), SEND_HOUR_UTC);
  t -= ((d.getUTCDay() - 5 + 7) % 7) * DAY;
  if (t > now) t -= 7 * DAY;
  return t;
}

function buildIssue(lang, { events, nextEvent, first, last, reportIndex }) {
  const T = TEXT[lang];
  const card = (e) => {
    const [lead, question] = T.sentence(eventScript(lang, e).hook);
    return { ...T.date(e.date), ...T.describe(e), lead, question, body: eventScript(lang, e).body };
  };
  const cards = (events.length ? events : nextEvent ? [nextEvent] : []).map(card);
  const range = T.range(T.date(first), T.date(last));
  const subject = events.length ? T.subject(cards[0].lead) : cards.length ? T.subjectNext(cards[0]) : T.subjectNone;
  const intro = events.length ? T.intro : cards.length ? T.introNext(range) : T.introNone(range);
  const heading = T.heading(cards[0] && cards[0].kind);
  const why = T.why(cards[0] && cards[0].noun);
  const [reportName, reportDesc] = T.reports[reportIndex];
  const reportUrl = `${BASE_URL}/${lang}${REPORT_PATHS[reportIndex]}`;
  const premiumUrl = `${BASE_URL}/${lang}/mypage#premium`;

  const cardHtml = (c, i) => `<div style="border:1px solid rgba(139,107,27,0.35); border-radius:8px; padding:14px 16px; background:#fbf6ea;${i ? ' margin-top:12px;' : ''}">
      <div style="color:#8B6B1B; font-size:13px;">${esc(c.full)}</div>
      <div style="font-size:18px; font-weight:600; margin:2px 0 8px;">${esc(c.title)}</div>
      <p style="margin:0 0 8px; font-weight:600;">${esc(c.question)}</p>
      <p style="margin:0; font-size:15px;">${esc(c.body)}</p>
    </div>`;
  const html = `<div style="padding:22px 22px 6px;">
    <p style="margin:0 0 14px;">${esc(intro)}</p>
    ${cards.map(cardHtml).join('\n    ')}
    <h3 style="color:#8B6B1B; font-size:17px; margin:26px 0 6px; font-weight:600;">${esc(heading)}</h3>
    <p style="margin:0 0 12px; font-size:15px;">${esc(why)}</p>
    <div style="border:2px solid #C9A227; border-radius:10px; padding:16px 18px; background:#fffaf0;">
      <div style="font-size:16px; font-weight:700; color:#2C221E; margin-bottom:8px;">${esc(T.premiumTitle)}</div>
      <div style="font-size:15px; line-height:1.9;">
        ${T.points.map((x) => `✦ ${esc(x)}`).join('<br>\n        ')}
      </div>
      <div style="text-align:center; margin:16px 0 6px;">
        <a href="${esc(premiumUrl)}" style="display:inline-block; background:#8B6B1B; color:#fff; text-decoration:none; padding:12px 26px; border-radius:24px; font-weight:700;">${esc(T.button)}</a>
      </div>
      <div style="text-align:center; font-size:12px; color:#7a6a58;">${esc(T.refund)}</div>
    </div>
    <h3 style="color:#8B6B1B; font-size:17px; margin:26px 0 8px; font-weight:600;">${esc(T.reportTitle)}</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;"><tr>
      <td style="width:110px; vertical-align:top; padding-right:12px;"><a href="${esc(reportUrl)}"><img src="${BASE_URL}/img/report-cover.jpg" width="110" alt="" style="display:block; border-radius:6px;"></a></td>
      <td style="vertical-align:top; font-size:15px;">
        <div style="font-weight:700;">${esc(reportName)}</div>
        <div style="font-size:14px; margin:4px 0 8px;">${esc(reportDesc)}</div>
        <a href="${esc(reportUrl)}" style="color:#8B6B1B; font-weight:700;">${esc(T.more)}</a>
      </td>
    </tr></table>
  </div>`;

  const text = [
    intro,
    ...cards.map((c) => `\n■ ${c.full}　${c.title}\n${c.question}\n${c.body}`),
    `\n■ ${heading}\n${why}`,
    `\n■ ${T.premiumTitle}\n${T.points.map((x) => `${T.bullet}${x}`).join('\n')}\n${T.button}${T.colon}${premiumUrl}\n${T.refund}`,
    `\n■ ${T.reportTitle}\n${reportName}\n${reportDesc}\n${reportUrl}`
  ].join('\n');

  return { subject, html, text, banner: T.banner(range) };
}

function weeklyCampaign(now = Date.now()) {
  const sendAt = sendTimeFor(now);
  const start = new Date(sendAt + 4 * 3600000); // 土曜 0:00 JST
  const end = new Date(start.getTime() + 7 * DAY);
  // 表示用の土曜・金曜（UTC の暦日でも日本時間の暦日でも同じ日になる時刻）
  const first = new Date(start.getTime() + 9 * 3600000);
  const last = new Date(first.getTime() + 6 * DAY);
  const events = calendarEvents(start, end).slice(0, MAX_EVENTS);
  const nextEvent = events.length ? null : calendarEvents(end, new Date(end.getTime() + LOOKAHEAD_DAYS * DAY))[0];
  const reportIndex = Math.floor(start.getTime() / (7 * DAY)) % REPORT_PATHS.length;
  const week = { events, nextEvent, first, last, reportIndex };
  return {
    id: `weekly-${new Date(start.getTime() + 9 * 3600000).toISOString().slice(0, 10)}`,
    sendAfter: new Date(sendAt).toISOString(),
    weekly: true,
    langs: Object.fromEntries(Object.keys(TEXT).map((l) => [l, buildIssue(l, week)]))
  };
}

module.exports = { weeklyCampaign, sendTimeFor, REPORT_PATHS, TEXT };
