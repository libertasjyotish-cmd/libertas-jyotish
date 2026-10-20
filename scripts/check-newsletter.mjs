// お知らせメール配信（api/_newsletter.js）の検査。シートと Resend は偽物で置き換え、実際には送らない。
//   npm run check:newsletter
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'check-secret';
const require = createRequire(import.meta.url);
const nl = require('../api/_newsletter.js');

function fakeRow(data, onSave) {
  return {
    data: { ...data },
    get(k) { return this.data[k]; },
    set(k, v) { this.data[k] = v; },
    assign(o) { Object.assign(this.data, o); },
    async save() { onSave && onSave(this.data); }
  };
}

function fakeSheets(members) {
  const logRows = [];
  const logSheet = {
    headerValues: ['campaign_id', 'email', 'status', 'attempts', 'updated_at', 'error'],
    async loadHeaderRow() {},
    async getRows() { return logRows; },
    async addRow(v) { const r = fakeRow(v); logRows.push(r); return r; }
  };
  const memberSheet = {
    _spreadsheet: { sheetsByTitle: { newsletter_log: logSheet } },
    async getRows() { return members.map((m) => fakeRow(m)); }
  };
  return { memberSheet, logRows };
}

// 送信先: 同意者だけ・重複とテスト用アドレスは除く・同意の無いログイン会員は入らない
const members = [
  { email: 'a@gmail.com', language: 'ja', newsletter_opt_in: 'yes', interest_A: 'yes' },
  { email: 'A@gmail.com ', language: 'ja', newsletter_opt_in: 'yes' },
  { email: 'b@gmail.com', language: 'en', newsletter_opt_in: 'yes' },
  { email: 'c@gmail.com', language: 'ja', newsletter_opt_in: 'no' },
  { email: 'd@gmail.com', language: 'ja' },
  { email: 'x@example.com', language: 'ja', newsletter_opt_in: 'yes' },
  { email: 'broken@gmil', language: 'ar', newsletter_opt_in: 'yes' }
];
const recipients = nl.collectRecipients(members.map((m) => fakeRow(m)));
assert.deepEqual(recipients.map((r) => r.email).sort(), ['a@gmail.com', 'b@gmail.com']);

// 本文: 配信停止リンク・運営者情報・ワンクリック解除ヘッダーが必ず付く
const mail = nl.buildMail({ email: 'a@gmail.com', lang: 'ja', content: { subject: 'S', html: '<p>本文</p>', text: '本文' } });
assert.match(mail.html, /api\/newsletter\?e=a%40gmail\.com&amp;t=[0-9a-f]{32}&amp;l=ja/);
assert.match(mail.html, /\/ja\/legal/);
assert.match(mail.text, /配信停止はこちら: https:\/\//);
assert.equal(mail.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
assert.ok(nl.verifyUnsubToken('A@gmail.com', nl.unsubToken('a@gmail.com')));
assert.ok(!nl.verifyUnsubToken('b@gmail.com', nl.unsubToken('a@gmail.com')));

// 期日: 予定前・8日以上過ぎたものは送らない
const now = Date.parse('2026-11-01T12:00:00Z');
const camp = (id, sendAfter, extra = {}) => ({ id, sendAfter, langs: { ja: { subject: 'S', html: '<p>x</p>', text: 'x' } }, ...extra });
assert.deepEqual(nl.dueCampaigns([camp('future', '2026-11-02T00:00:00Z'), camp('old', '2026-10-20T00:00:00Z'), camp('now', '2026-11-01T00:00:00Z')], now).map((c) => c.id), ['now']);

// 実行: 言語の無い宛先は飛ばし、送信済みは二度送らない
{
  const { memberSheet, logRows } = fakeSheets(members);
  const sent = [];
  const mailer = async (m) => { sent.push(m.to); };
  const s1 = await nl.runCampaigns({ now, campaigns: [camp('c1', '2026-11-01T00:00:00Z')], mailer, gap: 0, memberSheet });
  assert.deepEqual(sent, ['a@gmail.com']);
  assert.equal(s1.sent, 1);
  const s2 = await nl.runCampaigns({ now, campaigns: [camp('c1', '2026-11-01T00:00:00Z')], mailer, gap: 0, memberSheet });
  assert.equal(s2.sent, 0);
  assert.equal(logRows.length, 1);
}

// 関心テーマ指定: interest_A の人だけ
{
  const { memberSheet } = fakeSheets([...members, { email: 'e@gmail.com', language: 'ja', newsletter_opt_in: 'yes' }]);
  const sent = [];
  await nl.runCampaigns({ now, campaigns: [camp('c2', '2026-11-01T00:00:00Z', { interests: ['A'] })], mailer: async (m) => { sent.push(m.to); }, gap: 0, memberSheet });
  assert.deepEqual(sent, ['a@gmail.com']);
}

// 失敗: 1宛先3回で断念し、4回目は送らない。失敗しても次の宛先は送る
{
  const list = [{ email: 'bad@gmail.com', language: 'ja', newsletter_opt_in: 'yes' }, { email: 'ok@gmail.com', language: 'ja', newsletter_opt_in: 'yes' }];
  const { memberSheet } = fakeSheets(list);
  let badCalls = 0;
  const mailer = async (m) => { if (m.to === 'bad@gmail.com') { badCalls += 1; throw new Error('Resend 422: invalid'); } };
  const results = [];
  for (let i = 0; i < 5; i += 1) results.push(await nl.runCampaigns({ now, campaigns: [camp('c3', '2026-11-01T00:00:00Z')], mailer, gap: 0, memberSheet }));
  assert.equal(badCalls, nl.MAX_ATTEMPTS);
  assert.equal(results[0].sent, 1);
  assert.equal(results[2].gaveUp.length, 1);
  assert.equal(results[4].failed + results[4].sent, 0);
}

// 上限: 1回 MAX_PER_RUN 通まで、Resend 429 ならその回は打ち切り
{
  const many = Array.from({ length: nl.MAX_PER_RUN + 5 }, (_, i) => ({ email: `u${i}@gmail.com`, language: 'ja', newsletter_opt_in: 'yes' }));
  const { memberSheet } = fakeSheets(many);
  let calls = 0;
  const s = await nl.runCampaigns({ now, campaigns: [camp('c4', '2026-11-01T00:00:00Z')], mailer: async () => { calls += 1; }, gap: 0, memberSheet });
  assert.equal(calls, nl.MAX_PER_RUN);
  assert.equal(s.remaining, 5);
  const { memberSheet: m2 } = fakeSheets(many);
  let calls2 = 0;
  const s2 = await nl.runCampaigns({ now, campaigns: [camp('c5', '2026-11-01T00:00:00Z')], mailer: async () => { calls2 += 1; if (calls2 === 2) throw new Error('Resend 429: rate limit'); }, gap: 0, memberSheet: m2 });
  assert.equal(calls2, 2);
  assert.equal(s2.stoppedBy, 'resend_rate_limit');
}

// キャンペーン定義: 各言語に subject / html / text がそろっていること
const campaigns = JSON.parse(readFileSync(new URL('../data/newsletter/campaigns.json', import.meta.url), 'utf8'));
const ids = new Set();
for (const c of campaigns) {
  assert.ok(c.id && !ids.has(c.id), `campaign id が空か重複: ${c.id}`);
  ids.add(c.id);
  assert.ok(Number.isFinite(Date.parse(c.sendAfter)), `${c.id}: sendAfter が日時ではありません`);
  for (const [lang, v] of Object.entries(c.langs || {})) {
    assert.ok(v.subject && v.html && v.text, `${c.id}/${lang}: subject・html・text のどれかが空です`);
  }
}

console.log(`お知らせメールの検査に合格しました（キャンペーン ${campaigns.length} 件）`);
