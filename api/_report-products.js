// 年間運勢・相性鑑定の章定義（CommonJS）。生成の仕組み・安全規則は _report.js と共通。
// 章 id は台帳の列（summary, ch1〜ch12）に順番で対応させるため、どの商品も summary + ch1〜 の形にする。

const RELATION_JA = {
  romance: '恋愛・結婚のパートナー',
  friend: '友人',
  business: '仕事・ビジネスのパートナー',
  general: '種類を特定しない二人の関係'
};

const monthsCompact = (months) => months.map((m) => ({
  month: m.month,
  planets: m.planets.map((p) => ({ planet: p.name, sign: p.sign, house: p.houseFromMoon, area: p.houseFromMoonLabel, retrograde: p.retrograde }))
}));

const YEARLY_CHAPTERS = [
  {
    id: 'summary',
    title: 'この 1 年の見取り図',
    pick: (a) => ({
      period: a.period, moon: a.moon, ascendant: a.ascendant, currentDasha: a.dasha?.current,
      dashaChanges: a.dashaChanges, slowPlanetsNow: a.slowPlanetsNow, keyShifts: a.keyShifts, sadeSati: a.sadeSati
    }),
    schema: `{
      "catchphrase": "この 1 年のテーマを一文で（30文字以内）",
      "essence": "この 1 年の全体像（250文字程度。期間は確定データの年月のみ）",
      "themes": ["今年の主題（各30文字以内）", "", ""],
      "keyMonths": [{ "month": "確定データの YYYY-MM をそのまま", "text": "その月が節目になる理由（80文字以内）" }],
      "stance": "この 1 年を過ごす基本姿勢（150文字程度）"
    }`
  },
  {
    id: 'ch1',
    title: '第1章 いま流れている周期',
    pick: (a) => ({ currentDasha: a.dasha?.current, upcoming: a.dasha?.upcoming, dashaChanges: a.dashaChanges, strength: a.strength?.slice(0, 3) }),
    schema: `{
      "intro": "ダシャー（運気の周期）の考え方と、今年の周期の位置づけ（250文字程度）",
      "current": "現在の大周期・中周期が今年にもたらす主題（400文字程度）",
      "changes": [{ "month": "確定データの YYYY-MM をそのまま", "text": "その切り替わりで変わる空気と準備（150文字程度）" }],
      "closing": "周期の流れを味方にする心構え（150文字程度）"
    }`
  },
  {
    id: 'ch2',
    title: '第2章 今年の大きな星の動き',
    pick: (a) => ({ slowPlanetsNow: a.slowPlanetsNow, keyShifts: a.keyShifts, sadeSati: a.sadeSati, moon: a.moon }),
    schema: `{
      "intro": "木星・土星・ラーフ・ケートゥの位置が 1 年の背景を作るという説明（200文字程度）",
      "jupiter": "木星の位置（月から見たハウス）が広げてくれる領域（300文字程度）",
      "saturn": "土星の位置が鍛える領域と、サディサティの該当状況（300文字程度。該当が無ければその旨を短く）",
      "nodes": "ラーフ・ケートゥの軸が示す、追いかけるものと手放すもの（250文字程度）",
      "shifts": [{ "month": "確定データの YYYY-MM をそのまま", "text": "そのサイン移動が生活のどこに効くか（150文字程度）" }]
    }`
  },
  {
    id: 'ch3',
    title: '第3章 第1四半期（最初の 3 か月）',
    pick: (a) => ({ months: monthsCompact(a.quarters[0].months), currentDasha: a.dasha?.current }),
    schema: `{
      "overview": "この 3 か月の流れ（200文字程度）",
      "months": [{ "month": "確定データの YYYY-MM をそのまま", "theme": "月のテーマ（20文字以内）", "text": "その月の惑星配置（月から見たハウス）が生活のどの領域を動かすか（250文字程度）", "todo": "有効な行動ひとつ（40文字以内）" }]
    }`
  },
  {
    id: 'ch4',
    title: '第4章 第2四半期',
    pick: (a) => ({ months: monthsCompact(a.quarters[1].months), currentDasha: a.dasha?.current }),
    schema: `{
      "overview": "この 3 か月の流れ（200文字程度）",
      "months": [{ "month": "確定データの YYYY-MM をそのまま", "theme": "月のテーマ（20文字以内）", "text": "その月の惑星配置が生活のどの領域を動かすか（250文字程度）", "todo": "有効な行動ひとつ（40文字以内）" }]
    }`
  },
  {
    id: 'ch5',
    title: '第5章 第3四半期',
    pick: (a) => ({ months: monthsCompact(a.quarters[2].months), currentDasha: a.dasha?.current }),
    schema: `{
      "overview": "この 3 か月の流れ（200文字程度）",
      "months": [{ "month": "確定データの YYYY-MM をそのまま", "theme": "月のテーマ（20文字以内）", "text": "その月の惑星配置が生活のどの領域を動かすか（250文字程度）", "todo": "有効な行動ひとつ（40文字以内）" }]
    }`
  },
  {
    id: 'ch6',
    title: '第6章 第4四半期',
    pick: (a) => ({ months: monthsCompact(a.quarters[3].months), currentDasha: a.dasha?.current }),
    schema: `{
      "overview": "この 3 か月の流れ（200文字程度）",
      "months": [{ "month": "確定データの YYYY-MM をそのまま", "theme": "月のテーマ（20文字以内）", "text": "その月の惑星配置が生活のどの領域を動かすか（250文字程度）", "todo": "有効な行動ひとつ（40文字以内）" }]
    }`
  },
  {
    id: 'ch7',
    title: '第7章 テーマ別の 1 年（仕事・お金・人間関係・心身）',
    pick: (a) => ({
      slowPlanetsNow: a.slowPlanetsNow, keyShifts: a.keyShifts, currentDasha: a.dasha?.current,
      months: a.months.map((m) => ({ month: m.month, jupiter: m.planets.find((p) => p.key === 'Jupiter')?.houseFromMoonLabel, saturn: m.planets.find((p) => p.key === 'Saturn')?.houseFromMoonLabel, venus: m.planets.find((p) => p.key === 'Venus')?.houseFromMoonLabel, mars: m.planets.find((p) => p.key === 'Mars')?.houseFromMoonLabel }))
    }),
    schema: `{
      "work": "仕事・社会的な立場の 1 年の流れと、力を入れる時期（350文字程度。職種名は断定しない）",
      "money": "収入と支出の流れ、整えるべき時期（300文字程度。投資助言は書かない）",
      "relationships": "人間関係・パートナーシップの流れ（300文字程度）",
      "wellbeing": "心身のリズムと休息を優先したい時期（250文字程度。医療的な表現は書かない）"
    }`
  },
  {
    id: 'ch8',
    title: '第8章 この 1 年を最大限に活かすために',
    pick: (a) => ({ keyShifts: a.keyShifts, dashaChanges: a.dashaChanges, strength: a.strength?.slice(0, 3), period: a.period }),
    schema: `{
      "bestMonths": [{ "month": "確定データの YYYY-MM をそのまま", "text": "追い風になる理由と使い方（100文字以内）" }],
      "careMonths": [{ "month": "確定データの YYYY-MM をそのまま", "text": "慎重に進めたい理由と整え方（100文字以内）" }],
      "actions": ["今年の具体的な行動指針（各40文字以内）", "", ""],
      "closing": "1 年の終わりに向けたメッセージ（200文字程度）"
    }`
  }
];

const relationOf = (a) => RELATION_JA[a.relation] || RELATION_JA.general;
const person = (p) => ({ label: p.label, ascendant: p.ascendant, moon: p.moon, sun: p.sun, nakshatra: p.nakshatra, strength: p.strength });

const COMPAT_CHAPTERS = [
  {
    id: 'summary',
    title: '二人の関係の見取り図',
    pick: (a) => ({
      relation: relationOf(a), personA: person(a.personA), personB: person(a.personB),
      moonDistance: a.moonDistance, lagnaDistance: a.lagnaDistance,
      matching: a.relation === 'romance' ? { total: a.matching.total, max: a.matching.max, band: a.matching.band } : undefined
    }),
    schema: `{
      "catchphrase": "この二人の関係を一文で表す見出し（30文字以内）",
      "essence": "関係の本質（250文字程度。関係の種類に沿って書く。性別には触れない）",
      "strengths": ["二人の強み（各30文字以内）", "", ""],
      "growth": ["育てていける領域（各30文字以内）", ""],
      "stance": "この関係を良くする基本姿勢（150文字程度）"
    }`
  },
  {
    id: 'ch1',
    title: '第1章 それぞれの設計図',
    pick: (a) => ({ relation: relationOf(a), personA: person(a.personA), personB: person(a.personB) }),
    schema: `{
      "personA": "A の本質（ラグナ・月・太陽から。300文字程度）",
      "personB": "B の本質（ラグナ・月・太陽から。300文字程度）",
      "contrast": "二人の気質の似ている点と異なる点（300文字程度）"
    }`
  },
  {
    id: 'ch2',
    title: '第2章 心の噛み合わせ（月と月）',
    pick: (a) => ({ relation: relationOf(a), moonA: a.personA.moon, moonB: a.personB.moon, moonDistance: a.moonDistance, nakshatraA: a.personA.nakshatra, nakshatraB: a.personB.nakshatra }),
    schema: `{
      "intro": "月同士の位置関係（何番目のサインか）が感情の相性を示すという説明（200文字程度）",
      "text": "二人の月の関係から見た、安心の与え方・受け取り方（400文字程度）",
      "care": "感情がすれ違いやすい場面と、その整え方（250文字程度）"
    }`
  },
  {
    id: 'ch3',
    title: '第3章 相手が自分にもたらすもの',
    pick: (a) => ({ relation: relationOf(a), overlayAonB: a.overlayAonB, overlayBonA: a.overlayBonA }),
    schema: `{
      "intro": "相手の惑星が自分のどのハウス（領域）に入るかを見るという説明（200文字程度）",
      "aToB": "A の主要な惑星が B の生活のどの領域を動かすか（350文字程度。惑星名・領域は確定データのものだけ）",
      "bToA": "B の主要な惑星が A の生活のどの領域を動かすか（350文字程度）",
      "balance": "与えるものと受け取るものの釣り合い（200文字程度）"
    }`
  },
  {
    id: 'ch4',
    title: '第4章 会話と価値観（水星・太陽・木星）',
    pick: (a) => ({ relation: relationOf(a), A: { sun: a.personA.sun, mercury: a.personA.mercury, jupiter: a.personA.planets?.find((p) => p.key === 'Jupiter') }, B: { sun: a.personB.sun, mercury: a.personB.mercury, jupiter: a.personB.planets?.find((p) => p.key === 'Jupiter') } }),
    schema: `{
      "communication": "話し方・考え方の型の違いと、伝わりやすい伝え方（350文字程度）",
      "values": "大切にしているもの・判断基準の重なりと差（300文字程度）",
      "tips": ["すれ違いを防ぐ具体的な工夫（各40文字以内）", "", ""]
    }`
  },
  {
    id: 'ch5',
    title: '第5章 行動と情熱（火星・金星）',
    pick: (a) => ({ relation: relationOf(a), A: { mars: a.personA.mars, venus: a.personA.venus }, B: { mars: a.personB.mars, venus: a.personB.venus } }),
    schema: `{
      "energy": "行動のテンポ・決断の仕方の相性（300文字程度）",
      "affection": "関係の種類に沿った「好意・信頼の示し方」の相性（300文字程度。恋愛以外では友情・協働の温度感として書く）",
      "friction": "衝突しやすいパターンと、その収め方（250文字程度）"
    }`
  },
  {
    id: 'ch6',
    title: '第6章 責任と長続きの条件（土星）',
    pick: (a) => ({ relation: relationOf(a), saturnA: a.personA.saturn, saturnB: a.personB.saturn, mangalA: a.personA.mangalDosha, mangalB: a.personB.mangalDosha, dashaA: a.personA.currentDasha, dashaB: a.personB.currentDasha }),
    schema: `{
      "commitment": "責任の引き受け方・約束への姿勢の相性（300文字程度）",
      "timing": "二人が今それぞれどの周期にいて、関係にどう影響するか（300文字程度）",
      "longevity": "関係を長く続けるための土台（250文字程度）"
    }`
  },
  {
    id: 'ch7',
    title: '第7章 この関係を育てるために',
    pick: (a) => ({ relation: relationOf(a), moonDistance: a.moonDistance, overlayAonB: a.overlayAonB.slice(0, 3), overlayBonA: a.overlayBonA.slice(0, 3), band: a.matching.band }),
    schema: `{
      "roles": "二人の自然な役割分担（300文字程度。関係の種類に沿って書く）",
      "rituals": ["関係を良く保つ習慣・約束ごと（各40文字以内）", "", ""],
      "whenHard": "うまくいかない時期の乗り越え方（250文字程度）",
      "closing": "二人へのメッセージ（200文字程度）"
    }`
  },
  {
    id: 'ch8',
    title: '第8章 伝統的な相性指標（36 点法）',
    pick: (a) => ({ relation: relationOf(a), matching: a.matching }),
    schema: `{
      "intro": "36 点法（アシュタクータ）とは何か、結婚向けの伝統指標であり関係の種類によっては参考程度に読むこと（200文字程度）",
      "total": "合計点の読み方（150文字程度。点数は確定データのものだけ）",
      "items": [{ "name": "確定データの項目名をそのまま", "text": "その項目の点数が示すこと（120文字程度）" }],
      "closing": "点数に振り回されないための視点（150文字程度）"
    }`
  }
];

// 36 点法（第8章）は結婚向けの伝統指標なので、恋愛・結婚以外の関係では省く
function compatChapterIdsFor(relation) {
  return COMPAT_CHAPTERS.filter((c) => c.id !== 'ch8' || relation === 'romance').map((c) => c.id);
}

module.exports = { YEARLY_CHAPTERS, COMPAT_CHAPTERS, compatChapterIdsFor, RELATION_JA };
