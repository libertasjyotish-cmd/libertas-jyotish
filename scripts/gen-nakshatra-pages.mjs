#!/usr/bin/env node
// ナクシャトラ27宿の個別解説を言語ごとに生成し data/guide/nakshatra/<lang>.json へ書く。
//
//   GEMINI_API_KEY=... node scripts/gen-nakshatra-pages.mjs [lang ...]   … 省略時は全言語
//   GEMINI_API_KEY=... node scripts/gen-nakshatra-pages.mjs ja --only=ashwini,bharani
//
// 支配星・星座・象徴・神格は下の FACTS で固定し、生成は文章だけに限る（事実が揺れないようにする）。
// 既存の宿は上書きしないので、失敗した宿だけ再実行すれば足りる。
// 生成後は node scripts/build-guide.mjs && node scripts/build-i18n.mjs を実行してコミットする。

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'data', 'guide', 'nakshatra');
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const KEY = process.env.GEMINI_API_KEY;

const LANG_NAMES = {
  ja: '日本語', en: 'English', es: 'español', pt: 'português do Brasil',
  ar: 'العربية', id: 'Bahasa Indonesia', fr: 'français', de: 'Deutsch'
};

// 伝統的に共有されている対応（Lahiri サイデリアル）。順序は黄経順。
const FACTS = [
  ['ashwini', 'Ashwini', 'Ketu', 'Aries 0°00–13°20', 'Ashwini Kumaras', "horse's head", 'beginnings, swift recovery'],
  ['bharani', 'Bharani', 'Venus', 'Aries 13°20–26°40', 'Yama', 'yoni (womb)', 'endurance, bearing weight'],
  ['krittika', 'Krittika', 'Sun', 'Aries 26°40 – Taurus 10°00', 'Agni', 'razor, flame', 'cutting through, purification'],
  ['rohini', 'Rohini', 'Moon', 'Taurus 10°00–23°20', 'Prajapati (Brahma)', 'ox cart', 'nurturing, abundance'],
  ['mrigashira', 'Mrigashira', 'Mars', 'Taurus 23°20 – Gemini 6°40', 'Soma (Chandra)', "deer's head", 'searching, sensitivity'],
  ['ardra', 'Ardra', 'Rahu', 'Gemini 6°40–20°00', 'Rudra', 'teardrop', 'storm, transformation'],
  ['punarvasu', 'Punarvasu', 'Jupiter', 'Gemini 20°00 – Cancer 3°20', 'Aditi', 'quiver of arrows', 'renewal, return'],
  ['pushya', 'Pushya', 'Saturn', 'Cancer 3°20–16°40', 'Brihaspati', "cow's udder, lotus", 'nourishing, trust'],
  ['ashlesha', 'Ashlesha', 'Mercury', 'Cancer 16°40–30°00', 'Nagas', 'coiled serpent', 'entwining, insight'],
  ['magha', 'Magha', 'Ketu', 'Leo 0°00–13°20', 'Pitris (ancestors)', 'royal throne', 'inheritance, authority'],
  ['purva-phalguni', 'Purva Phalguni', 'Venus', 'Leo 13°20–26°40', 'Bhaga', 'front legs of a bed', 'rest, enjoyment'],
  ['uttara-phalguni', 'Uttara Phalguni', 'Sun', 'Leo 26°40 – Virgo 10°00', 'Aryaman', 'back legs of a bed', 'contracts, partnership'],
  ['hasta', 'Hasta', 'Moon', 'Virgo 10°00–23°20', 'Savitar', 'open hand', 'craft, dexterity'],
  ['chitra', 'Chitra', 'Mars', 'Virgo 23°20 – Libra 6°40', 'Tvashtar', 'bright jewel', 'brilliance, design'],
  ['swati', 'Swati', 'Rahu', 'Libra 6°40–20°00', 'Vayu', 'young shoot in the wind', 'independence, flexibility'],
  ['vishakha', 'Vishakha', 'Jupiter', 'Libra 20°00 – Scorpio 3°20', 'Indragni', 'triumphal arch', 'purpose, ambition'],
  ['anuradha', 'Anuradha', 'Saturn', 'Scorpio 3°20–16°40', 'Mitra', 'lotus', 'devotion, friendship'],
  ['jyeshtha', 'Jyeshtha', 'Mercury', 'Scorpio 16°40–30°00', 'Indra', 'earring, umbrella', 'seniority, responsibility'],
  ['mula', 'Mula', 'Ketu', 'Sagittarius 0°00–13°20', 'Nirriti', 'bunch of roots', 'roots, investigation'],
  ['purva-ashadha', 'Purva Ashadha', 'Venus', 'Sagittarius 13°20–26°40', 'Apas', 'winnowing fan', 'victory, optimism'],
  ['uttara-ashadha', 'Uttara Ashadha', 'Sun', 'Sagittarius 26°40 – Capricorn 10°00', 'Vishwadevas', 'elephant tusk', 'persistence, achievement'],
  ['shravana', 'Shravana', 'Moon', 'Capricorn 10°00–23°20', 'Vishnu', 'ear, three footprints', 'listening, learning'],
  ['dhanishta', 'Dhanishta', 'Mars', 'Capricorn 23°20 – Aquarius 6°40', 'Vasus', 'drum, flute', 'wealth, rhythm'],
  ['shatabhisha', 'Shatabhisha', 'Rahu', 'Aquarius 6°40–20°00', 'Varuna', 'empty circle', 'healing, privacy'],
  ['purva-bhadrapada', 'Purva Bhadrapada', 'Jupiter', 'Aquarius 20°00 – Pisces 3°20', 'Aja Ekapada', 'front legs of a funeral cot', 'intensity, two faces'],
  ['uttara-bhadrapada', 'Uttara Bhadrapada', 'Saturn', 'Pisces 3°20–16°40', 'Ahirbudhnya', 'back legs of a funeral cot', 'depth, stability'],
  ['revati', 'Revati', 'Mercury', 'Pisces 16°40–30°00', 'Pushan', 'fish, drum', 'guidance, completion']
];

const UI_PROMPT = (lang) => `Translate these UI labels for a page about the 27 nakshatras of Indian (Vedic) astrology into ${LANG_NAMES[lang]}.
Return JSON only: {"listHeading": "...", "factsHeading": "...", "listLead": "..."}
- listHeading: heading above a list of links to all 27 nakshatra articles, e.g. "The 27 nakshatras, one by one".
- factsHeading: heading of a short data block (ruling planet, sign, symbol, deity).
- listLead: one sentence telling the reader to pick their own moon nakshatra from the list.
Natural wording in ${LANG_NAMES[lang]}, no transliteration of English, no quotes inside values.`;

const ARTICLE_PROMPT = (lang, f) => {
  const [slug, name, lord, sign, deity, symbol, keywords] = f;
  return `Write a web article in ${LANG_NAMES[lang]} about the nakshatra "${name}" in Indian (Vedic) astrology, for readers who found the page by searching that nakshatra's name.

Fixed facts (do not change, do not add others):
- ruling planet: ${lord}
- sidereal position: ${sign}
- deity: ${deity}
- symbol: ${symbol}
- traditional keywords: ${keywords}

Return JSON only, with this shape:
{
  "name": "the nakshatra's name written naturally in ${LANG_NAMES[lang]}",
  "title": "page title, under 60 characters, must contain the name",
  "description": "meta description, 120-155 characters",
  "h1": "heading, contains the name",
  "lead": "2 sentences introducing this nakshatra",
  "sections": [
    {"heading": "...", "body": "the fixed facts in prose, 2-3 sentences"},
    {"heading": "...", "body": "inner tendencies when the Moon is in this nakshatra, 4-5 sentences"},
    {"heading": "...", "body": "how this shows up with other people, 3-4 sentences"},
    {"heading": "...", "body": "work and the way of moving that suits it, 3-4 sentences"},
    {"heading": "...", "body": "what tends to come up during the ${lord} dasha period, 3 sentences"}
  ]
}

Rules:
- In Indian astrology the nakshatra is read from the MOON's position at birth, not the Sun sign of western astrology. Say so naturally where it fits.
- Describe tendencies, never predict events, never promise outcomes, never give medical, legal or financial advice.
- No hype, no "you must", no fear ("if you don't ... you will lose"), no fortune-telling certainty: use wording like "tends to", "is traditionally read as".
- Do not mention this site, prices, products, links or any call to action.
- Plain prose, no markdown, no lists, no emoji. Write every heading in ${LANG_NAMES[lang]}.`;
};

if (!KEY) {
  console.error('GEMINI_API_KEY が必要です');
  process.exit(1);
}

async function gemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' }
      })
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
      return JSON.parse(text);
    }
    const body = await res.text();
    if (res.status < 500 && res.status !== 429) throw new Error(`Gemini ${res.status} ${body.slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, attempt * 4000));
  }
  throw new Error('Gemini がリトライ上限まで失敗しました');
}

function validate(article, lang, slug) {
  const problems = [];
  if (!article.title || article.title.length > 70) problems.push('title の長さ');
  if (!article.description || article.description.length < 80) problems.push('description が短い');
  if (!Array.isArray(article.sections) || article.sections.length !== 5) problems.push('sections が5つでない');
  for (const s of article.sections || []) {
    if (!s.heading || !s.body) problems.push('見出しか本文が空');
  }
  if (problems.length) throw new Error(`${lang}/${slug}: ${problems.join('・')}`);
}

const langs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const targets = langs.length ? langs : Object.keys(LANG_NAMES);

mkdirSync(OUT_DIR, { recursive: true });

for (const lang of targets) {
  const path = join(OUT_DIR, `${lang}.json`);
  const data = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { parent: 'nakshatra', slugPrefix: 'nakshatra', ui: null, items: [] };
  if (!data.ui) {
    data.ui = await gemini(UI_PROMPT(lang));
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  }
  for (const f of FACTS) {
    const [slug] = f;
    if (only && !only.has(slug)) continue;
    if (data.items.some((it) => it.slug === slug) && !only) continue;
    const article = await gemini(ARTICLE_PROMPT(lang, f));
    validate(article, lang, slug);
    const item = {
      slug,
      latin: f[1],
      lord: f[2],
      name: article.name,
      title: article.title,
      description: article.description,
      h1: article.h1,
      lead: article.lead,
      sections: article.sections.map((s) => ({ heading: s.heading, body: s.body }))
    };
    const at = data.items.findIndex((it) => it.slug === slug);
    if (at >= 0) data.items[at] = item;
    else data.items.push(item);
    data.items.sort((a, b) => FACTS.findIndex((x) => x[0] === a.slug) - FACTS.findIndex((x) => x[0] === b.slug));
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
    console.log(`${lang}/${slug} 生成`);
  }
}
