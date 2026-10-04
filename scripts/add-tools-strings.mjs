#!/usr/bin/env node
// 単機能ツール（/<lang>/tools/*）の文言を locales/ja.json へ追加し、他言語へ翻訳する。
//
//   node scripts/add-tools-strings.mjs            … ja の文言を追加
//   node scripts/add-tools-strings.mjs --translate … ja を元に他言語へ翻訳して追加
//
// 翻訳は Gemini を使い、既に値がある言語のキーは上書きしない（再実行しても無害）。
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALE_DIR = join(ROOT, 'locales');
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

const JA = {
  'tools.common.breadcrumbLabel': '現在位置',
  'tools.common.date': '生年月日',
  'tools.common.time': '出生時刻',
  'tools.common.timeNote': '（不明なら空欄。12:00で計算します）',
  'tools.common.place': '出生地',
  'tools.common.placePlaceholder': '例：東京都新宿区',
  'tools.common.submit': '無料で計算する',
  'tools.common.submitting': '計算しています…',
  'tools.common.resultHeading': '計算結果',
  'tools.common.labelMoonSign': '月星座',
  'tools.common.labelSunSign': '太陽星座（サイデリアル）',
  'tools.common.labelLagna': 'ラグナ（上昇星座）',
  'tools.common.labelNakshatra': 'ナクシャトラ',
  'tools.common.labelPada': 'パダ',
  'tools.common.labelNakshatraLord': '支配星',
  'tools.common.labelDasha': '現在のマハーダシャー',
  'tools.common.labelNextDasha': '次のマハーダシャー',
  'tools.common.padaValue': '第{pada}パダ',
  'tools.common.period': '{start}〜{end}',
  'tools.common.guideLink': '{name}の解説を読む',
  'tools.common.errorDate': '生年月日を入力してください。',
  'tools.common.errorPlace': '出生地を入力してください。',
  'tools.common.errorPlaceNotFound': '出生地を特定できませんでした。市区町村名や国名を加えてお試しください。',
  'tools.common.errorGeneric': '計算できませんでした。しばらくしてからもう一度お試しください。',
  'tools.common.disclaimer': 'このツールは伝統的な計算規則にもとづく天文計算の結果を表示するものです。将来の出来事を保証するものではなく、医療・法律・投資の助言に代わるものでもありません。',
  'tools.common.ctaTitle': '文章で読みたい場合',
  'tools.common.ctaBody': '無料鑑定では、ここで計算した月星座・ナクシャトラ・ダシャーをもとに、性質と現在の流れを文章でお読みいただけます。',
  'tools.common.ctaBtn': '無料鑑定をはじめる',
  'tools.common.productsTitle': 'さらに詳しく知るには',
  'tools.common.productsBody': '出生図の全体をもとに、章立てで読める鑑定書（PDF）です。',
  'tools.common.otherTools': 'ほかの計算ツール',

  'tools.moonSign.title': '月星座を無料で調べる｜インド占星術（サイデリアル）の計算ツール',
  'tools.moonSign.description': '生年月日・出生時刻・出生地から、インド占星術（ヴェーダ占星術）の月星座をサイデリアル方式で無料計算します。西洋占星術の太陽星座との違いも解説しています。',
  'tools.moonSign.h1': '月星座を調べる',
  'tools.moonSign.lead': 'インド占星術で最も重く見られるのは、太陽ではなく月の位置です。生年月日・出生時刻・出生地を入れると、サイデリアル方式（ラヒリ・アヤナムシャ）であなたの月星座を計算します。',
  'tools.moonSign.sectionTitle01': '月星座とは',
  'tools.moonSign.sectionBody01': '月星座（チャンドラ・ラーシ）は、生まれた瞬間に月が位置していた星座です。インド占星術では心の働きや感情の土台、日々の反応の癖を読む起点とされ、太陽星座よりも重視されます。相性や時期の判断もこの月の位置を基準に組み立てられるため、まず自分の月星座を知ることが出発点になります。',
  'tools.moonSign.sectionTitle02': '西洋占星術の星座と違う理由',
  'tools.moonSign.sectionBody02': '西洋占星術は春分点を基準にするトロピカル方式ですが、インド占星術は実際の星の位置を基準にするサイデリアル方式を用います。両者のずれ（アヤナムシャ）は現在およそ24度あるため、同じ生年月日でも星座が1つ前になることが珍しくありません。雑誌や占いサイトで見慣れた星座と違っても、計算方式が異なるためです。',
  'tools.moonSign.sectionTitle03': '計算に必要な情報',
  'tools.moonSign.sectionBody03': '月は2日半ほどで次の星座へ移るため、多くの場合は生年月日だけでも判定できますが、星座の境目に生まれた場合は出生時刻で結果が変わります。出生時刻が分からないときは12:00として計算します。出生地は時差の判定に使うため、市区町村までお入れいただくと精度が上がります。',

  'tools.nakshatra.title': 'ナクシャトラ（27宿）を無料で調べる｜インド占星術の計算ツール',
  'tools.nakshatra.description': '生年月日・出生時刻・出生地から、月のナクシャトラ（27宿）とパダ・支配星を無料計算します。結果から27宿それぞれの解説ページへ進めます。',
  'tools.nakshatra.h1': 'ナクシャトラを調べる',
  'tools.nakshatra.lead': '生年月日・出生時刻・出生地から、生まれたときに月が位置していたナクシャトラ（27宿）と、そのパダ・支配星を計算します。結果から、その宿の解説へ進めます。',
  'tools.nakshatra.sectionTitle01': 'ナクシャトラとは',
  'tools.nakshatra.sectionBody01': 'ナクシャトラは黄道を27に分けた区画で、月宿とも呼ばれます。12星座より細かい区分のため、同じ月星座の人でも性質の読み分けができます。インド占星術では、生まれたときに月があった宿を「自分のナクシャトラ」として扱い、性質の傾向や結婚の相性、時期の判断に用います。',
  'tools.nakshatra.sectionTitle02': 'パダと支配星',
  'tools.nakshatra.sectionBody02': '各ナクシャトラは4つのパダ（各3度20分）に分かれ、どのパダかによって読み方が変わります。また、27宿にはそれぞれ支配星（ケートゥ・金星・太陽・月・火星・ラーフ・木星・土星・水星の9惑星が3巡する並び）が割り当てられ、この支配星がヴィムショッタリ・ダシャーの起点になります。',
  'tools.nakshatra.sectionTitle03': '計算に必要な情報',
  'tools.nakshatra.sectionBody03': '月は1つの宿を約1日で通り過ぎ、パダは約6時間で切り替わります。そのため、宿を確かめるだけなら生年月日でも足りることが多いものの、パダまで正確に出すには出生時刻が必要です。出生時刻が分からないときは12:00として計算します。',

  'tools.dasha.title': '現在のダシャー期を無料で調べる｜ヴィムショッタリ・ダシャー計算',
  'tools.dasha.description': '生年月日・出生時刻・出生地から、ヴィムショッタリ・ダシャー（120年周期）のうち現在どの惑星期（マハーダシャー）にいるかを無料計算し、次の期への切り替わり年も表示します。',
  'tools.dasha.h1': '現在のダシャー期を調べる',
  'tools.dasha.lead': '出生時の月のナクシャトラを起点に、ヴィムショッタリ・ダシャー（合計120年）のうち現在どの惑星期にいるかと、次の期に切り替わる時期を計算します。',
  'tools.dasha.sectionTitle01': 'ダシャーとは',
  'tools.dasha.sectionBody01': 'ダシャーは、人生を惑星ごとの期間に区切って読むインド占星術の時間の体系です。最も広く使われるヴィムショッタリ・ダシャーでは、ケートゥ7年、金星20年、太陽6年、月10年、火星7年、ラーフ18年、木星16年、土星19年、水星17年の合計120年を1周期とし、この順番で生涯が進みます。',
  'tools.dasha.sectionTitle02': '計算の起点',
  'tools.dasha.sectionBody02': 'どの惑星期から人生が始まるかは、生まれたときに月があったナクシャトラの支配星で決まります。さらに、その宿をどこまで進んでいたかによって最初の期の残り年数が決まるため、生年月日だけでなく出生時刻と出生地が必要になります。出生時刻が分からないときは12:00として計算します。',
  'tools.dasha.sectionTitle03': '惑星期の読み方',
  'tools.dasha.sectionBody03': 'ある惑星期そのものが良い、悪いと決まっているわけではありません。その惑星が出生図でどの位置にあり、どの星と関係しているかによって現れ方が変わります。また、マハーダシャーの内側にはアンタルダシャーという小区分があり、同じ大きな期間の中でも時期ごとに主題が移っていきます。'
};

function localeFile(lang) {
  return join(LOCALE_DIR, `${lang}.json`);
}

function read(lang) {
  return JSON.parse(readFileSync(localeFile(lang), 'utf8'));
}

function write(lang, data) {
  writeFileSync(localeFile(lang), `${JSON.stringify(data, null, 2)}\n`);
}

async function translate(lang, entries) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY が未設定です');
  const prompt = [
    `次の日本語のUI文言とSEO本文を ${lang} に翻訳してください。`,
    '条件:',
    '- JSONのキーは変更せず、値だけを翻訳する。',
    '- {pada} {start} {end} {name} のような波括弧の変数はそのまま残す。',
    '- インド占星術（ヴェーダ占星術）の専門用語は、その言語で一般に使われる表記にする。',
    '- 将来の出来事を保証する表現、医療・法律・投資の助言になる表現は使わない。',
    '- 出力はJSONのみ。',
    '',
    JSON.stringify(entries, null, 2)
  ].join('\n');

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
    })
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  const parsed = JSON.parse(text);
  const missing = Object.keys(entries).filter((k) => typeof parsed[k] !== 'string' || !parsed[k].trim());
  if (missing.length) throw new Error(`${lang}: 翻訳が欠けています: ${missing.slice(0, 3).join(', ')}`);
  return parsed;
}

async function main() {
  const ja = read('ja');
  for (const [key, value] of Object.entries(JA)) ja.strings[key] = value;
  write('ja', ja);
  console.log(`ja: ${Object.keys(JA).length} 件`);

  if (!process.argv.includes('--translate')) return;

  const langs = readdirSync(LOCALE_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.replace(/\.json$/, ''))
    .filter((lang) => lang !== 'ja')
    .sort();

  for (const lang of langs) {
    const locale = read(lang);
    const pending = Object.fromEntries(Object.entries(JA).filter(([key]) => !locale.strings[key]));
    if (!Object.keys(pending).length) {
      console.log(`${lang}: 追加なし`);
      continue;
    }
    const translated = await translate(lang, pending);
    for (const [key, value] of Object.entries(translated)) locale.strings[key] = value;
    write(lang, locale);
    console.log(`${lang}: ${Object.keys(pending).length} 件`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
