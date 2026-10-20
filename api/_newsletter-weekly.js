// 毎週金曜20時（日本時間）に送る「今週の空」メール（日本語）。
// 星の出来事は api/_sky-events.js の計算と決まった文から作り、Gemini は使わない。
// おすすめ鑑定書は6種類を週ごとに順番に入れ替える。
const { DAY, PLANET, SIGN_JA, ECLIPSE_KIND, jaDate, calendarEvents, eventScriptJa } = require('./_sky-events');

const BASE_URL = (process.env.SITE_BASE_URL || 'https://www.libertas-jyotish.com').replace(/\/$/, '');
const MAX_EVENTS = 2;
// 出来事が無い週に「次の節目」を探す範囲
const LOOKAHEAD_DAYS = 180;
// 送信は金曜 11:00 UTC（20:00 JST）。対象は翌日の土曜から金曜までの7日間（日本時間）
const SEND_HOUR_UTC = 11;
const PREMIUM_PRICE_JA = '550円';

const REPORTS_JA = [
  { name: '生涯完全鑑定書', path: '/ja/pdf-purchase', desc: '人生のテーマ、ダシャー周期、開運アドバイスを数十ページに渡る1冊の特別レポートにまとめてお届けします。' },
  { name: '年間運勢 鑑定書', path: '/ja/yearly', desc: 'ダシャーとトランジットから、今後12か月の流れ・転機・仕事恋愛金運健康の月別展望をまとめます。' },
  { name: '仕事運・金運・天職 鑑定書', path: '/ja/career', desc: '適職・才能・金運の器、転職・独立・早期退職（FIRE）の時期を、10室・アルタトリコーナ・ダシャーから読み解きます。' },
  { name: 'カル・クンダリ（手相×出生図）', path: '/ja/palm-chart', desc: '出生図（天）と両手の写真（地）を、古典手相学ハスタ・サムドリカの作法で照合する完全型の鑑定。' },
  { name: '相性 鑑定書', path: '/ja/compat', desc: '二人の出生図から、なぜ出逢ったのか・この縁の種類・どこまで深められるか・今後10年の流れを読み解きます。' },
  { name: 'Karma & Dharma ― 今世の天命', path: '/ja/karma', desc: '生まれ持ったカルマ（課題）とダルマ（使命）を、インド占星術の出生図から読み解く鑑定書。' }
];

const PREMIUM_POINTS_JA = [
  'その日の星が、あなたのどのハウスで何を起こすか（全文）',
  '今のダシャー（支配星の周期）の過ごし方',
  '今日・今週の具体的な行動3つ（曜日・相手・場面まで）',
  '今日の守り（インド神話にちなんだ、その日のふるまい）',
  '翌日以降の流れと、時間帯ごとの吉凶',
  '9つの天体すべての配置表と一言解説'
];

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

// カードの見出し・件名用の短い名前と、「同じ〇〇でも」「この〇〇が」に入る言葉
function describe(e) {
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
}

function card(e) {
  const script = eventScriptJa(e);
  const { label, weekday } = jaDate(e.date);
  const cut = script.hook.indexOf('。');
  return { e, label, weekday, ...describe(e), lead: script.hook.slice(0, cut), question: script.hook.slice(cut + 1), body: script.body };
}

function weeklyCampaign(now = Date.now()) {
  const sendAt = sendTimeFor(now);
  const start = new Date(sendAt + 4 * 3600000); // 土曜 0:00 JST
  const end = new Date(start.getTime() + 7 * DAY);
  const last = new Date(end.getTime() - DAY);
  const events = calendarEvents(start, end).slice(0, MAX_EVENTS);
  const nextEvent = events.length ? null : calendarEvents(end, new Date(end.getTime() + LOOKAHEAD_DAYS * DAY))[0];
  const cards = (events.length ? events : nextEvent ? [nextEvent] : []).map(card);
  const report = REPORTS_JA[Math.floor(start.getTime() / (7 * DAY)) % REPORTS_JA.length];
  const s = jaDate(start);
  const l = jaDate(last);
  const range = `${s.label}（${s.weekday}）〜${l.label}（${l.weekday}）`;

  let subject;
  let intro;
  if (events.length) {
    subject = `【今週の空】${cards[0].lead}`;
    intro = 'こんばんは、インド占星術の Libertas Jyotish（リベルタス ジョーティシュ）です。今週の空の出来事をお届けします。';
  } else if (cards.length) {
    subject = `【今週の空】次の節目は${cards[0].label}、${cards[0].title}`;
    intro = `こんばんは、インド占星術の Libertas Jyotish（リベルタス ジョーティシュ）です。${range}は、大きな星の動きはありません。次の節目をお知らせします。`;
  } else {
    subject = '【今週の空】大きな星の動きのない一週間です';
    intro = `こんばんは、インド占星術の Libertas Jyotish（リベルタス ジョーティシュ）です。${range}は、大きな星の動きはありません。`;
  }

  const lead = cards[0];
  const heading = lead ? `この${lead.kind}が、あなたのどの分野に効くか` : '星の動きが、あなたのどの分野に効くか';
  const why = `同じ${lead ? lead.noun : '星の動き'}でも、仕事に出る人、お金に出る人、恋愛に出る人がいます。どこに出るかは、あなたの月星座から数えたハウスで決まります。プレミアム会員なら、あなたの出生図で毎日読み解いてお届けします。`;
  const premiumUrl = `${BASE_URL}/ja/mypage#premium`;
  const reportUrl = `${BASE_URL}${report.path}`;
  const button = `月額${PREMIUM_PRICE_JA}でプレミアム会員になる`;
  const refund = 'マイページからいつでも解約できます。お支払いから30日以内なら返金いたします。';

  const cardHtml = (c, i) => `<div style="border:1px solid rgba(139,107,27,0.35); border-radius:8px; padding:14px 16px; background:#fbf6ea;${i ? ' margin-top:12px;' : ''}">
      <div style="color:#8B6B1B; font-size:13px;">${esc(c.label)}（${esc(c.weekday)}）</div>
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
      <div style="font-size:16px; font-weight:700; color:#2C221E; margin-bottom:8px;">プレミアム会員で毎日読めること</div>
      <div style="font-size:15px; line-height:1.9;">
        ${PREMIUM_POINTS_JA.map((x) => `✦ ${esc(x)}`).join('<br>\n        ')}
      </div>
      <div style="text-align:center; margin:16px 0 6px;">
        <a href="${esc(premiumUrl)}" style="display:inline-block; background:#8B6B1B; color:#fff; text-decoration:none; padding:12px 26px; border-radius:24px; font-weight:700;">${esc(button)}</a>
      </div>
      <div style="text-align:center; font-size:12px; color:#7a6a58;">${esc(refund)}</div>
    </div>
    <h3 style="color:#8B6B1B; font-size:17px; margin:26px 0 8px; font-weight:600;">今週のおすすめ鑑定書</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;"><tr>
      <td style="width:110px; vertical-align:top; padding-right:12px;"><a href="${esc(reportUrl)}"><img src="${BASE_URL}/img/report-cover.jpg" width="110" alt="" style="display:block; border-radius:6px;"></a></td>
      <td style="vertical-align:top; font-size:15px;">
        <div style="font-weight:700;">${esc(report.name)}</div>
        <div style="font-size:14px; margin:4px 0 8px;">${esc(report.desc)}</div>
        <a href="${esc(reportUrl)}" style="color:#8B6B1B; font-weight:700;">詳しく見る →</a>
      </td>
    </tr></table>
  </div>`;

  const text = [
    intro,
    ...cards.map((c) => `\n■ ${c.label}（${c.weekday}）　${c.title}\n${c.question}\n${c.body}`),
    `\n■ ${heading}\n${why}`,
    `\n■ プレミアム会員で毎日読めること\n${PREMIUM_POINTS_JA.map((x) => `・${x}`).join('\n')}\n${button}：${premiumUrl}\n${refund}`,
    `\n■ 今週のおすすめ鑑定書\n${report.name}\n${report.desc}\n${reportUrl}`
  ].join('\n');

  return {
    id: `weekly-${new Date(start.getTime() + 9 * 3600000).toISOString().slice(0, 10)}`,
    sendAfter: new Date(sendAt).toISOString(),
    weekly: true,
    langs: { ja: { subject, html, text, banner: `今週の空 ・ ${range}` } }
  };
}

module.exports = { weeklyCampaign, sendTimeFor, REPORTS_JA };
