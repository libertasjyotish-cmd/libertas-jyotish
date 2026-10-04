#!/usr/bin/env node
// ヴィムショッタリ・ダシャーの9惑星期の個別解説を言語ごとに生成し data/guide/dasha/<lang>.json へ書く。
//
//   GEMINI_API_KEY=... node scripts/gen-dasha-pages.mjs [lang ...]   … 省略時は全言語
//   GEMINI_API_KEY=... node scripts/gen-dasha-pages.mjs ja --only=ketu,venus
//
// 年数・支配するナクシャトラ・伝統的な主題は下の FACTS で固定し、生成は文章だけに限る。
// 既存の惑星期は上書きしないので、失敗した分だけ再実行すれば足りる。
// 生成後は node scripts/build-guide.mjs && node scripts/build-i18n.mjs を実行してコミットする。

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'data', 'guide', 'dasha');
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const KEY = process.env.GEMINI_API_KEY;

const LANG_NAMES = {
  ja: '日本語', en: 'English', es: 'español', pt: 'português do Brasil',
  ar: 'العربية', id: 'Bahasa Indonesia', fr: 'français', de: 'Deutsch'
};

// ヴィムショッタリ・ダシャーの順序と年数（合計120年）。ナクシャトラは各惑星が支配する3宿。
const FACTS = [
  ['ketu', 'Ketu', 7, 'Ashwini, Magha, Mula', 'detachment, letting go, inner search'],
  ['venus', 'Venus', 20, 'Bharani, Purva Phalguni, Purva Ashadha', 'relationships, comfort, art and money'],
  ['sun', 'Sun', 6, 'Krittika, Uttara Phalguni, Uttara Ashadha', 'position, recognition, responsibility'],
  ['moon', 'Moon', 10, 'Rohini, Hasta, Shravana', 'feelings, home, care and connection'],
  ['mars', 'Mars', 7, 'Mrigashira, Chitra, Dhanishta', 'drive, competition, decisive action'],
  ['rahu', 'Rahu', 18, 'Ardra, Swati, Shatabhisha', 'expansion into the unfamiliar, ambition, foreign matters'],
  ['jupiter', 'Jupiter', 16, 'Punarvasu, Vishakha, Purva Bhadrapada', 'learning, growth, teaching and belief'],
  ['saturn', 'Saturn', 19, 'Pushya, Anuradha, Uttara Bhadrapada', 'endurance, structure, slow and lasting work'],
  ['mercury', 'Mercury', 17, 'Ashlesha, Jyeshtha, Revati', 'communication, analysis, trade and skill']
];

const UI_PROMPT = (lang) => `Translate these UI labels for a page about the nine planetary periods (Vimshottari dasha) of Indian (Vedic) astrology into ${LANG_NAMES[lang]}.
Return JSON only: {"listHeading": "...", "factsHeading": "...", "listLead": "..."}
- listHeading: heading above a list of links to the nine dasha articles, e.g. "The nine dasha periods, one by one".
- factsHeading: heading of a short data block (length in years, the nakshatras the planet rules).
- listLead: one sentence telling the reader to pick the dasha period they are currently in.
Natural wording in ${LANG_NAMES[lang]}, no transliteration of English, no quotes inside values.`;

const ARTICLE_PROMPT = (lang, f) => {
  const [slug, name, years, nakshatras, themes] = f;
  return `Write a web article in ${LANG_NAMES[lang]} about the "${name} dasha" (${name} mahadasha) in Indian (Vedic) astrology, for readers who found the page by searching that period's name.

Fixed facts (do not change, do not add others):
- length: ${years} years
- part of the Vimshottari dasha cycle of 120 years in total
- the nakshatras ${name} rules: ${nakshatras}
- traditional themes of the period: ${themes}

Return JSON only, with this shape:
{
  "name": "the period's name written naturally in ${LANG_NAMES[lang]}",
  "title": "page title, under 60 characters, must contain the name",
  "description": "meta description, 120-155 characters",
  "h1": "heading, contains the name",
  "lead": "2 sentences introducing this period",
  "sections": [
    {"heading": "...", "body": "the fixed facts in prose, 2-3 sentences"},
    {"heading": "...", "body": "what this period tends to bring to the fore, 4-5 sentences"},
    {"heading": "...", "body": "how it tends to show up in work and in relationships, 3-4 sentences"},
    {"heading": "...", "body": "how the period is traditionally read as unfolding from its beginning to its end, and why sub-periods (antardasha) change the texture, 3-4 sentences"},
    {"heading": "...", "body": "how a reader finds out which dasha they are in: it is calculated from the Moon's nakshatra at birth, so the birth date, exact time and place are needed, 3 sentences"}
  ]
}

Rules:
- The dasha sequence starts from the nakshatra the MOON occupied at birth, not from the Sun sign of western astrology. Say so naturally where it fits.
- Describe tendencies, never predict events, never promise outcomes, never give medical, legal or financial advice.
- Never call a period good or bad in itself; a planet's period is traditionally read together with that planet's placement in the chart.
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
  const data = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { parent: 'dasha', slugPrefix: 'dasha', ui: null, items: [] };
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
      lord: f[1],
      years: f[2],
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
