// シェア用ナクシャトラカード（js/share-card.js）が描く文字を言語ごとに作る。
// 宿の名前は解説ページのデータ、支配星と度数の範囲は宿の番号から計算し、特徴の1行は data/share-card/traits.json の決まった文を使う。
// 使い方: node scripts/build-share-cards.mjs（--check で生成物が最新かだけを確かめる）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { createTerms } = require('../api/_terms');

const LANGS = ['ja', 'en', 'es', 'pt', 'fr', 'de', 'id', 'ar'];
const LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const LORD_JA = { Ketu: 'ケートゥ', Venus: '金星', Sun: '太陽', Moon: '月', Mars: '火星', Rahu: 'ラーフ', Jupiter: '木星', Saturn: '土星', Mercury: '水星' };
const SIGNS_JA = ['牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座', '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座'];
const SPAN = 40; // 1宿 = 13°20′ = 40 × 20′

const traits = JSON.parse(readFileSync(join(ROOT, 'data/share-card/traits.json'), 'utf8'));
const check = process.argv.includes('--check');
let stale = 0;

// 20′単位の黄経を「星座 度°分′」にする
function point(units, terms, end) {
  let sign = Math.floor(units / 90);
  let rest = units % 90;
  if (end && rest === 0) { sign -= 1; rest = 90; }
  const deg = Math.floor(rest / 3);
  const min = (rest % 3) * 20;
  return { sign: terms.sign(SIGNS_JA[sign]), text: `${deg}°${min ? `${min}′` : ''}` };
}

for (const lang of LANGS) {
  const terms = createTerms(lang);
  const guide = JSON.parse(readFileSync(join(ROOT, `data/guide/nakshatra/${lang}.json`), 'utf8'));
  const sep = lang === 'ja' ? '〜' : '–';
  const out = {};
  guide.items.forEach((item, i) => {
    const lord = LORDS[i % 9];
    const a = point(i * SPAN, terms, false);
    const b = point((i + 1) * SPAN, terms, true);
    // アラビア語の行（右から左）の中でも度数は左から右に並ぶよう、数字の部分を LRE…PDF で囲む
    if (lang === 'ar') { a.text = `\u202A${a.text}`; b.text = `${b.text}\u202C`; if (a.sign !== b.sign) { a.text += '\u202C'; b.text = `\u202A${b.text}`; } }
    const range = a.sign === b.sign ? `${a.sign} ${a.text}${sep}${b.text}` : `${a.sign} ${a.text}${sep}${b.sign} ${b.text}`;
    if (!traits[item.slug] || !traits[item.slug][lang]) throw new Error(`trait missing: ${item.slug} ${lang}`);
    out[item.slug] = { no: i + 1, name: item.name, lord: terms.planet(lord, LORD_JA[lord]), range, trait: traits[item.slug][lang] };
  });
  const file = join(ROOT, `data/share-card/${lang}.json`);
  const body = JSON.stringify(out, null, 1) + '\n';
  if (check) {
    if (!existsSync(file) || readFileSync(file, 'utf8') !== body) { console.error(`古い生成物: data/share-card/${lang}.json`); stale++; }
  } else writeFileSync(file, body);
}
if (check && stale) process.exit(1);
console.log(check ? 'シェアカードの生成物は最新です' : `生成しました: ${LANGS.length}言語 × 27宿`);
