// 完全鑑定書（PDF）の章別生成レイヤー（CommonJS）
// AI の役割は「コード側で確定した値を指定言語で意味づけする」ことだけ。
// 数値・年号・期間・惑星名・星座名・石・方位はすべて astro（計算値）から差し込み、AI には書かせない。
const { generateWithGemini } = require('./_gemini');
const { REMEDY_MODERN } = require('./_dictionaries');
const { createTerms } = require('./_terms');

const COMMON_RULES_JA = `
あなたは一流のインド占星術カウンセラーです。以下の【確定データ】だけに基づいて日本語の解説文を書いてください。

厳守事項:
1. 【確定データ】に無い惑星配置・度数・ハウス・星座・年号・日付・期間・固有名詞を書かないこと。
2. 具体的な日付（「◯月◯日」等）を書かないこと。時期は確定データに含まれる年月の区切りのみ使用すること。
3. サンスクリット語を単体で使わず、必ず現代日本語の説明を添えること。
4. 医療・投資・法律の助言に当たる表現（診断、治療、銘柄、税務、契約の可否の断定）を書かないこと。
5. 特定の食品・サプリ・健康法・観光地・寺社・企業名・職種名の断定を書かないこと。
6. 不安を煽らず、「調整期」「土台を整える時期」のように前向きかつ実務的に書くこと。
7. 文体は知性的で品格のある「です・ます」調に統一すること。
8. 指定した JSON スキーマのキーのみを出力すること。
`;

// 日本語以外は同じ安全規則を英語で与え、出力言語だけを差し替える（スキーマの説明文は日本語のまま共用する）
function commonRulesFor(outputLanguage) {
  return `
You are a first-class Vedic astrology counsellor. Write the commentary in ${outputLanguage}, based only on the confirmed data given below.

Strict rules:
1. Never write a planetary placement, degree, house, sign, year, date, period or proper noun that is not in the confirmed data.
2. Never write a specific calendar date ("3 March" etc.). For timing, use only the year boundaries contained in the confirmed data.
3. Never use a Sanskrit term on its own; always add a plain modern explanation.
4. Never give medical, investment or legal advice (diagnosis, treatment, named securities, tax, whether a contract is valid).
5. Never assert specific foods, supplements, health regimes, tourist spots, temples, company names or job titles.
6. Never induce fear; write constructively and practically ("a period of adjustment", "a time to build foundations").
7. Keep the register intelligent, dignified and polite.
8. Output only the keys of the given JSON schema.
9. The schema descriptions are written in Japanese, but every value must be written in ${outputLanguage}. Treat any "○○文字程度" length guide as an equivalent volume of text in ${outputLanguage}, not as a character count.
`;
}

// 章ごとの定義。data は astro から必要な部分だけを渡す（無関係な値をAIに見せない）。
const CHAPTERS = [
  {
    id: 'summary',
    title: '1枚でわかる、あなたの取扱説明書',
    pick: (a) => ({
      ascendant: a.ascendant, moon: a.moon, sun: a.sun, nakshatra: a.nakshatra,
      strongest: a.strength?.slice(0, 3), weakest: a.strength?.slice(-2),
      currentDasha: a.dasha?.current, boosters: a.boosters,
      topFields: a.ashtakavarga?.strongest
    }),
    schema: `{
      "catchphrase": "この方の本質を一文で表す見出し（30文字以内）",
      "essence": "本質の要約（200文字程度）",
      "weapons": ["武器となる資質（各30文字以内）", "", ""],
      "growth": ["伸びしろとなる領域（各30文字以内）", ""],
      "now": "現在の周期における過ごし方の要点（150文字程度）"
    }`
  },
  {
    id: 'ch1',
    title: '第1章 あなたという設計図',
    pick: (a) => ({ ascendant: a.ascendant, moon: a.moon, sun: a.sun, nakshatra: a.nakshatra, planets: a.planets }),
    schema: `{
      "lagna": "ラグナ（1室）が示す本質・気質・身体の傾向（500文字程度）",
      "moon": "月が示す感情・安心の条件・無意識の癖（500文字程度）",
      "sun": "太陽が示す人生の目的・自己実現の方向（400文字程度）",
      "integration": "三層（ラグナ・月・太陽）の噛み合わせと、そこから生まれる矛盾との付き合い方（400文字程度）"
    }`
  },
  {
    id: 'ch2',
    title: '第2章 あなたの中で最も強い星',
    pick: (a) => ({ strength: a.strength }),
    schema: `{
      "intro": "惑星の強弱が何を意味するかの導入（200文字程度）",
      "strong": [{ "planet": "確定データの惑星名をそのまま", "text": "その星が司る領域が人生でどう強みになるか（250文字程度）" }],
      "weak": [{ "planet": "確定データの惑星名をそのまま", "text": "欠点ではなく伸びしろとして、意識して補う方法（250文字程度）" }],
      "closing": "強弱の組み合わせから見た総括（200文字程度）"
    }`
  },
  {
    id: 'ch3',
    title: '第3章 持って生まれた強運の型',
    pick: (a) => ({
      yogas: (a.yogas || []).filter((y) => y.auspicious !== false).slice(0, 12),
      strongest: a.strength?.slice(0, 3)
    }),
    schema: `{
      "intro": "ヨーガ（吉配置）とは何かの説明（200文字程度）",
      "items": [{ "name": "確定データのヨーガ名をそのまま", "text": "この配置が人生のどの場面で効くか（200文字程度）" }],
      "closing": "該当が少ない場合は強い星の組み合わせから代替の強みを述べる（250文字程度）"
    }`
  },
  {
    id: 'ch4',
    title: '第4章 「モノ」— 石と色',
    pick: (a) => ({ mono: a.boosters?.mono, lagnaSign: a.boosters?.lagnaSign, lagnaLord: a.boosters?.lagnaLord }),
    schema: `{
      "stone": "確定データのライフストーンについて、身につけ方・使いどころ（350文字程度。石の名前は確定データのものだけ）",
      "support": "現在の周期を支える石の使い方（250文字程度。該当が無ければ空文字）",
      "color": "勝負カラーの取り入れ方（服・持ち物・空間）（300文字程度。色名は確定データのものだけ）",
      "note": "効果を保証するものではないという趣旨の但し書き（100文字程度）"
    }`
  },
  {
    id: 'ch5',
    title: '第5章 「コト」— 習慣と働き方',
    pick: (a) => ({ koto: a.boosters?.koto }),
    schema: `{
      "work": "確定データの働き方の型に沿った、力を発揮する仕事の進め方（400文字程度）",
      "morning": "朝の習慣の意味づけ（250文字程度。行動は確定データのものだけ）",
      "night": "夜の習慣の意味づけ（250文字程度。行動は確定データのものだけ）",
      "focus": "集中しやすい時間帯の活かし方（200文字程度）"
    }`
  },
  {
    id: 'ch6',
    title: '第6章 「場所」— 方位と環境',
    pick: (a) => ({ basho: a.boosters?.basho }),
    schema: `{
      "primary": "本来の方位・環境の性質と、住まいや作業場所の選び方（350文字程度。地名は書かない）",
      "career": "仕事で力が出る環境の性質（300文字程度。地名は書かない）",
      "rest": "回復に向く環境の性質（250文字程度。地名は書かない）"
    }`
  },
  {
    id: 'ch7',
    title: '第7章 天職と才能の使い道',
    pick: (a) => ({
      tenth: { sign: a.boosters?.tenthSign, lord: a.boosters?.tenthLord }, koto: a.boosters?.koto,
      sun: a.sun, mars: a.planets?.find((p) => p.key === 'Mars'), strongest: a.strength?.slice(0, 3)
    }),
    schema: `{
      "type": "働き方の型（創る／伝える／整える／導く のいずれか。確定データに従う）",
      "text": "その型がなぜ合うのか、才能をどう使うか（600文字程度。職種名は断定しない）",
      "environment": "力を発揮しやすい組織・役割の条件（300文字程度）",
      "caution": "消耗しやすい働き方と、その回避策（250文字程度）"
    }`
  },
  {
    id: 'ch8',
    title: '第8章 豊かさのルート',
    pick: (a) => ({ ashtakavarga: a.ashtakavarga }),
    schema: `{
      "intro": "分野別スコアの読み方（200文字程度）",
      "strong": "点数の高い分野をどう活かすか（350文字程度。数値は確定データのものだけ）",
      "weak": "点数の低い分野をどう補うか（350文字程度）",
      "money": "自力で稼ぐ経路と、人脈・仕組みで得る経路のどちらが厚いか（300文字程度。投資助言は書かない）",
      "spending": "支出が膨らみやすい条件と整え方（250文字程度）"
    }`
  },
  {
    id: 'ch9',
    title: '第9章 運命の地図（生涯年表）',
    pick: (a) => ({ timeline: a.dasha?.timeline, pastSwitches: a.dasha?.pastSwitches }),
    schema: `{
      "intro": "ダシャー（運気の大周期）の考え方（250文字程度）",
      "periods": [{ "lord": "確定データの支配星名をそのまま", "text": "その周期の性質と課題（150文字程度）" }],
      "past": "過去の切り替わりを振り返る視点（300文字程度。年は確定データのものだけ）"
    }`
  },
  {
    id: 'ch10',
    title: '第10章 いま立っている場所',
    pick: (a) => ({ current: a.dasha?.current, sadeSati: a.sadeSati }),
    schema: `{
      "text": "現在の大周期・中周期・小周期が重なって生まれている今の状況（500文字程度）",
      "todo": ["この時期に有効な行動（各40文字以内）", "", ""],
      "avoid": ["この時期に避けたい判断（各40文字以内）", ""]
    }`
  },
  {
    id: 'ch11',
    title: '第11章 これから訪れる黄金期',
    pick: (a) => ({ upcoming: a.dasha?.upcoming, strength: a.strength?.slice(0, 4), ashtakavarga: a.ashtakavarga?.strongest }),
    schema: `{
      "intro": "今後の周期の見取り図（250文字程度）",
      "periods": [{ "label": "確定データの「大周期／中周期」の組み合わせをそのまま", "text": "その期間の主題と準備（200文字程度）" }],
      "closing": "最も追い風になる時期に向けた準備（300文字程度）"
    }`
  },
  {
    id: 'ch12',
    title: '第12章 試練を土台に変える時期',
    pick: (a, terms) => ({ sadeSati: a.sadeSati, mangalDosha: a.mangalDosha, remedy: terms.remedy(REMEDY_MODERN) }),
    schema: `{
      "intro": "試練期を「調整期」として捉える視点（250文字程度）",
      "sadeSati": "サディサティの該当状況と過ごし方（400文字程度。期間は確定データのものだけ。該当が無ければその旨を短く）",
      "mangal": "マンガル・ドーシャの該当状況とエネルギーの使い道（300文字程度。該当が無ければその旨を短く）",
      "actions": ["現代版の具体行動（確定データの remedy から選び、言い換える。各40文字以内）"],
      "closing": "調整期の先にあるものについて（200文字程度）"
    }`
  }
];

const CHAPTER_IDS = CHAPTERS.map((c) => c.id);

// 医療・投資・法律に踏み込む表現、および日付の名指しを検出する
const BANNED_PATTERNS = [
  /\d+月\d+日/,
  /(治療|診断|処方|完治|服用|投薬)/,
  /(銘柄|株式投資|仮想通貨|必ず儲|利回り|元本)/,
  /(訴訟|告訴|違法|合法)/
];

// ラテン文字の言語向け。日付の名指しと、医療・投資・法務に踏み込む語を検出する
const BANNED_PATTERNS_LATIN = [
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/i,
  /\b(diagnos\w*|prescrib\w*|prescription|medication|medical treatment)\b/i,
  /\b(stock pick\w*|ticker|cryptocurrenc\w*|guaranteed returns?)\b/i,
  /\b(lawsuit|prosecut\w*|illegal|legally binding)\b/i
];

function findViolations(text, lang) {
  const patterns = lang === 'ja' ? BANNED_PATTERNS : [...BANNED_PATTERNS, ...BANNED_PATTERNS_LATIN];
  return patterns.filter((re) => re.test(text)).map((re) => re.source);
}

// signKey / nakshatraKey は計算用の内部キー（常に日本語表記）なので、AI には見せない
function stripInternalKeys(value) {
  if (Array.isArray(value)) return value.map(stripInternalKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !key.endsWith('Key'))
        .map(([key, v]) => [key, stripInternalKeys(v)])
    );
  }
  return value;
}

function buildPrompt(chapter, astro, terms) {
  const rules = terms.lang === 'ja' ? COMMON_RULES_JA : commonRulesFor(terms.outputLanguage);
  return `${rules}
【章】${terms.chapterTitle(chapter.id, chapter.title)}

【確定データ（JSON）】
${JSON.stringify(stripInternalKeys(chapter.pick(astro, terms)), null, 1)}

【出力スキーマ】
${chapter.schema}`;
}

// 章を並列生成する。1章が失敗しても他章は返し、未生成の章は次回リクエストで補完する。
async function generateChapters(astro, ids, apiKey, models, { lang, timeoutMs = 40000 } = {}) {
  const terms = createTerms(lang);
  const targets = CHAPTERS.filter((c) => ids.includes(c.id));
  const results = await Promise.all(targets.map(async (chapter) => {
    const result = await generateWithGemini(apiKey, models, buildPrompt(chapter, astro, terms), timeoutMs);
    if (!result.json) return { id: chapter.id, ok: false, reason: result.reason };

    const violations = findViolations(JSON.stringify(result.json), terms.lang);
    if (violations.length) {
      console.warn(`Chapter ${chapter.id} contains banned expressions: ${violations.join(', ')}`);
      return { id: chapter.id, ok: false, reason: 'banned_expression' };
    }
    const title = terms.chapterTitle(chapter.id, chapter.title);
    return { id: chapter.id, ok: true, value: { title, ...result.json } };
  }));

  const chapters = {};
  const failed = [];
  for (const r of results) {
    if (r.ok) chapters[r.id] = r.value;
    else failed.push({ id: r.id, reason: r.reason });
  }
  return { chapters, failed };
}

module.exports = { CHAPTERS, CHAPTER_IDS, generateChapters };
