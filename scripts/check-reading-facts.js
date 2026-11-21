// 毎日の鑑定の照合（api/_reading-facts.js）が、根拠一覧にない配置・周期・日付を見つけ、正しい記述は通すことを確かめる。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { auditReading, stripFabricated } = require('../api/_reading-facts');

const file = path.resolve(__dirname, '../api/jyotish.js');
const m = new Module(file, null);
m.filename = file;
m.paths = Module._nodeModulePaths(path.dirname(file));
m._compile(`${fs.readFileSync(file, 'utf8')};module.exports.__t={readingFacts,buildAstrologyPrompt,composeReading};`, file);
const { readingFacts, buildAstrologyPrompt, composeReading } = m.exports.__t;

const P = (name, sign, degree, longitude, extra = {}) => ({ name, rasi: { name: sign }, degree, longitude, ...extra });
const natal = { data: { planet_position: [
  P('Ascendant', 'Capricorn', 10, 280), P('Moon', 'Capricorn', 14, 284), P('Sun', 'Sagittarius', 24, 264),
  P('Mercury', 'Sagittarius', 2, 242), P('Venus', 'Scorpio', 20, 230), P('Mars', 'Aquarius', 5, 305),
  P('Jupiter', 'Libra', 12, 192), P('Saturn', 'Pisces', 22, 352), P('Rahu', 'Aquarius', 28, 328), P('Ketu', 'Leo', 28, 148)
] } };
const transit = { data: { planet_position: [
  P('Moon', 'Pisces', 21, 351), P('Sun', 'Scorpio', 5, 215), P('Mercury', 'Scorpio', 20, 230), P('Venus', 'Libra', 25, 205),
  P('Mars', 'Sagittarius', 12, 252), P('Jupiter', 'Gemini', 20, 80, { is_retrograde: true }),
  P('Saturn', 'Pisces', 5, 335, { is_retrograde: true }), P('Rahu', 'Aquarius', 20, 320), P('Ketu', 'Leo', 20, 140)
] } };
const facts = readingFacts(natal, transit, '2026-11-22', '1970-01-09');
const audit = (text) => auditReading({ free_reading: { horoscope: text } }, facts, 'ja');

// 本番で 2026-11-22 に生成された正しい記述は通す
const grounded = [
  '現在は2037年1月まで続く土星期の只中にあり、人生の土台を築く時期です。2027年12月までの金星小周期は、成果を形にする場面を動かしています。',
  'ラグナから見て第3ハウスを巡る魚座の月が、あなたの社交の成果を素直に受け取る好機を生み出しています。',
  '逆行中の木星が双子座にあり、学び直しの機会を運びます。'
];
for (const t of grounded) assert.deepStrictEqual(audit(t), [], `正しい記述を誤りとした: ${t}`);

const fabricated = [
  ['今はラーフ期の只中です。', 'ラーフ期'],
  ['木星の小周期が始まりました。', '木星の小周期'],
  ['蠍座の火星が背中を押します。', '蠍座の火星'],
  ['月が第5ハウスに入り、恋の喜びが訪れます。', '月が第5ハウス'],
  ['12月3日頃に流れが変わります。', '12月3日'],
  ['2029年には大きく変わります。', '2029年'],
  ['逆行中の金星が過去の縁を呼び戻します。', '逆行中の金星'],
  ['ローヒニーの月が穏やかさを運びます。', 'ローヒニー']
];
for (const [t, quote] of fabricated) {
  const found = audit(t);
  assert.ok(found.some((f) => f.quote.includes(quote)), `作り話を見逃した: ${t} → ${JSON.stringify(found)}`);
}

const json = { free_reading: { horoscope: '交友の場で好機があります。今はラーフ期です。知人へ連絡を。' } };
assert.deepStrictEqual(stripFabricated(json, auditReading(json, facts, 'ja')), []);
assert.strictEqual(json.free_reading.horoscope, '交友の場で好機があります。知人へ連絡を。');
const empty = { free_reading: { horoscope: '今はラーフ期です。' } };
assert.deepStrictEqual(stripFabricated(empty, auditReading(empty, facts, 'ja')), ['free_reading.horoscope']);

const prompt = buildAstrologyPrompt(natal, transit, true, 'ja', 'all', null, '2026-11-22', '1970-01-09');
assert.ok(prompt.includes('【根拠一覧'), '根拠一覧がプロンプトにない');
assert.ok(prompt.includes('- 月: 魚座・ラグナから第3ハウス'), 'トランジットの月の行がない');
assert.ok(!prompt.includes('"longitude"'), '生の天体データがプロンプトに残っている');

// Gemini が使えない・照合で項目が空になったときの、コードだけで組み立てる鑑定も根拠一覧どおりであること
for (const paid of [false, true]) {
  for (const lang of ['ja', 'en']) {
    const c = composeReading(facts, paid, lang);
    for (const k of ['horoscope', 'influence', 'dasha_summary', 'lucky_element', 'premium_teaser']) assert.ok(c.free_reading[k], `${lang} ${k} が空`);
    assert.ok(c.dashaTitle && c.dashaDesc, 'dashaTitle/dashaDesc が空');
    if (paid) assert.ok(c.premium_reading.detailed_horoscope.includes(lang === 'ja' ? '【今日・今週の一手】' : '[Moves for today'), '有料の詳細がない');
    assert.deepStrictEqual(auditReading(c, facts, lang), [], `${lang} のコード鑑定が照合に通らない`);
  }
}
const ja = composeReading(facts, false, 'ja');
assert.ok(ja.free_reading.dasha_summary.includes('土星の大周期') && ja.free_reading.dasha_summary.includes('金星の小周期'), ja.free_reading.dasha_summary);
assert.ok(ja.free_reading.horoscope.includes('第3ハウス'), ja.free_reading.horoscope);

console.log('check-reading-facts: ok');
