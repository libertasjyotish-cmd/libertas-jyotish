// 「Karma & Dharma — The Calling of This Lifetime（カルマとダルマ ― 今世の天命）」の章定義（summary＋8章）。
// 付章の根拠表はコードで描く（templates/pdf-report.html の karmaDataPage）ため章には含めない。
// 設計: docs/karma-dharma-report-design.md。前世・宿命の断定はせず「生まれ持った設計と課題」「力が発揮される方向」として書く。

// 語り口。安全規則（COMMON_RULES）に加えて、語の定義と禁止する方向を固定する。
const KARMA_VOICE = {
  ja: `【語り口】
これは「前世を当てる」書ではなく、出生図から「なぜこのような設計で生まれ、何を成すために生きるのか」を読み解く自己理解の書です。次を徹底してください。
1. 語の定義を固定する。カルマ＝「生まれ持った設計と、繰り返しやすい癖・課題」。ダルマ＝「その人の力が最も自然に発揮され、周囲に役立つ方向」。天命＝「今生で引き受けるとよい役割」。試練＝「鍛えられる領域と、その意味」。
2. 前世の出来事を事実として書かない（「前世であなたは〜だった」は禁止）。ケートゥは「すでに身についているもの」として現在形で書く。
3. 運命・宿命を絶対化しない。「〜する運命だ」「〜しなければ不幸になる」「逃れられない」「報い」「業が深い」「罰」「呪い」は使わない。
4. すべての読みに根拠となる配置を名指しで添える（例:「ケートゥが第4室」「アートマカーラカ＝金星、第9室で高揚」「カラカムシャは蠍座」）。根拠のない一般論は書かない。
5. 表現の型は「この配置は〜を示す」「〜と読む」「〜に寄る」。ただし資質・才能・生き方の主題は「あなたは〜です」と言い切ってよい。断定を避けるのは健康・寿命・医療・法律・投資・具体的な出来事の予言だけ。
6. ケートゥ・第8室・第12室・土星は「手放し」「深化」「熟成」「時間をかけて育つ」の語で扱い、「喪失」「不幸」「孤独な晩年」のような恐怖を煽る語は使わない。
7. 職業名・具体的な人物・出来事は断定せず、「役割の性質」「方向」「場面」で書く。収入・転職・独立の時期は書かない（別の鑑定書の領域）。
8. 各章は必ず救いで閉じる。課題の章も「その課題を通じて手に入る力」で終える。
9. 用語や伝統の一般説明は各項目 1 文以内。残りはこの人固有の読みに使う。語りは、古い寺院の占星術師が目の前の一人に静かに語りかけるように。品格とです・ます調は維持。
10. 【確定データ】にない配置を発明しない。文字数の目安は下限。`,
  en: `[Voice]
This is not a book that "reveals past lives". It reads, from the birth chart, why this person was designed this way and what they are here to do. Follow strictly:
1. Fix the definitions. Karma = "the design one is born with, and the patterns and tasks that tend to repeat". Dharma = "the direction in which this person's strength flows most naturally and serves others". Calling = "the role worth taking on in this lifetime". Trial = "the area that is being trained, and what it means".
2. Never state past-life events as fact ("in a past life you were..." is forbidden). Write Ketu as "what is already mastered", in the present tense.
3. Never make fate absolute. Do not use "you are destined to", "you must ... or you will suffer", "inescapable", "retribution", "heavy karma", "punishment", "curse".
4. Every reading names the placement it rests on (e.g. "Ketu in the 4th house", "Atmakaraka = Venus, exalted in the 9th", "Karakamsha in Scorpio"). No unsupported generalities.
5. Phrase as "this placement points to...", "this is read as...", "this leans toward...". Qualities, talents and life themes may be stated plainly ("you are..."). Reserve caution for health, lifespan, medical, legal, financial matters and predictions of specific events.
6. Treat Ketu, the 8th and 12th houses and Saturn with words of release, deepening, maturing and slow growth; never with fear ("loss", "misfortune", "lonely old age").
7. Do not name professions, specific people or events; write the nature of the role, the direction, the kind of scene. Do not write about income, job changes or timing of independence (those belong to other reports).
8. Close every chapter with relief: a chapter about a trial ends with the strength gained through it.
9. General explanation of a term or tradition: at most one sentence per field. Spend the rest on what is specific to this person, as an old temple astrologer speaking quietly to one person. Keep a dignified, polite register.
10. Never invent a placement absent from the confirmed data. Character counts are minimums.`
};

// 章生成後の追加フィルタ（既存 findViolations に加えて、宿命論・罰の語を弾く）
const KARMA_BANNED = {
  ja: [/前世で(あなた|貴方)は/, /(逃れられない|避けられない)運命/, /業が深/, /報いを受け/, /(罰|呪い)(が|を|です)/, /不幸になり/],
  latin: [/\bin (a|your) (past|previous) life you (were|was|did)\b/i, /\b(inescapable|unavoidable) (fate|destiny)\b/i, /\bretribution\b/i, /\bheavy karma\b/i, /\b(cursed|punish\w*)\b/i, /\bdoomed\b/i]
};
function findKarmaViolations(text, lang) {
  const patterns = lang === 'ja' ? KARMA_BANNED.ja : [...KARMA_BANNED.ja, ...KARMA_BANNED.latin];
  return patterns.filter((re) => re.test(text)).map((re) => re.source);
}

const core = (a) => ({
  ascendant: a.ascendant, lagnaLord: a.lagnaLord, moon: a.moon, sun: a.sun,
  nakshatra: a.nakshatra, nakshatraPada: a.nakshatraPada, nakshatraDeity: a.nakshatraDeity,
  atmakaraka: a.atmakaraka, amatyakaraka: a.amatyakaraka
});
const planet = (a, k) => a.planets?.find((p) => p.key === k) || null;

const KARMA_CHAPTERS = [
  {
    id: 'summary',
    title: '魂の設計図（見取り図）',
    pick: (a) => ({ ...core(a), karakamsha: a.karakamsha, rahu: a.nodes?.rahu, ketu: a.nodes?.ketu, currentDasha: a.dasha?.current }),
    schema: `{
      "catchphrase": "この人の生まれ方を一文で（30文字以内）",
      "essence": "ラグナ・アートマカーラカ・ラーフ／ケートゥ軸から読む「この生の設計」の全体像（300文字程度。前世の断定はしない）",
      "karmaTheme": "生まれ持った課題（繰り返しやすい癖）を一言で（40文字以内）",
      "dharmaTheme": "力が最も自然に発揮され、周囲に役立つ方向を一言で（40文字以内）",
      "gifts": ["生まれ持った資質（各30文字以内）", "", ""]
    }`
  },
  {
    id: 'ch1',
    title: '第1章 何者として生まれたか（ラグナとアートマカーラカ）',
    pick: (a) => ({ ascendant: a.ascendant, lagnaLord: a.lagnaLord, atmakaraka: a.atmakaraka, karakamsha: a.karakamsha, strongest: a.strength?.slice(0, 3) }),
    schema: `{
      "intro": "アートマカーラカ（7惑星のうち度数が最も進んだ惑星＝魂の目的を担う星）の考え方（150文字程度）",
      "text": "ラグナとその支配星、アートマカーラカの惑星・ハウス・品位、カラカムシャ（アートマカーラカが D9 で入るサイン）から、この人が何者として生まれ、どんな舞台に立つ設計かを読む（500文字程度）",
      "coreDesire": "この生で満たしたい根源の欲求（200文字程度）",
      "shadow": "アートマカーラカの惑星が未熟なときに出やすい癖と、その癖が熟したときの姿（150文字程度）"
    }`
  },
  {
    id: 'ch2',
    title: '第2章 持って生まれたカルマ（ケートゥ）',
    pick: (a) => ({ ketu: a.nodes?.ketu, twelfth: a.houses?.[12], fourth: a.houses?.[4], moon: a.moon }),
    schema: `{
      "intro": "ケートゥ＝「すでに身についているもの・意識せずできること」の読み方（150文字程度。前世の断定はしない）",
      "mastered": "ケートゥのハウス・サイン・ナクシャトラ・ディスポジターから、この人が生まれつき得意で、努力なくできること（300文字程度）",
      "pattern": "そこに戻りたがる癖・同じ場面を繰り返しやすい状況（300文字程度。責めずに描く）",
      "release": "握らないほうがよいもの（200文字程度。「捨てる」ではなく「握らない」「委ねる」の語調）"
    }`
  },
  {
    id: 'ch3',
    title: '第3章 今生の課題と試練（ラーフと土星）',
    pick: (a) => ({ rahu: a.nodes?.rahu, saturn: a.saturn, sixth: a.houses?.[6], eighth: a.houses?.[8] }),
    schema: `{
      "intro": "ラーフ＝未熟だが伸ばす方向、土星＝時間をかけて鍛えられる領域、という読み方（150文字程度）",
      "rahu": "ラーフのハウス・サイン・ナクシャトラ・ディスポジターから、この生で伸ばすべき領域と、それが「飢え・憧れ・過剰」として現れる形（400文字程度）",
      "saturn": "土星のハウス・品位・アスペクトするハウスから、時間をかけて育てる課題と、「遅れ」が持つ意味（350文字程度。恐怖を煽らない）",
      "trials": ["人生で繰り返しやすい試練の型（各40文字以内）", "", ""],
      "gift": "その試練を越えたときに手に入る力（200文字程度）"
    }`
  },
  {
    id: 'ch4',
    title: '第4章 試練が来る時期と、その意味（サデサティとダシャー）',
    pick: (a) => ({ sadeSati: a.sadeSati, current: a.dasha?.current, pastSwitches: a.dasha?.pastSwitches, upcoming: a.dasha?.upcoming?.slice(0, 6), nodeAndSaturnDashas: a.dashaByLord, rahu: a.nodes?.rahu, saturn: a.saturn }),
    schema: `{
      "intro": "時期を「何を学ぶ期間か」で読む考え方（200文字程度。年月は確定データのもののみ）",
      "past": "過去の大周期の切り替わりとサデサティの期間に、何が鍛えられたと読めるか（300文字程度。出来事は断定せず「〜が主題だった時期」と書く）",
      "now": "現在のダシャー（およびサデサティ該当なら）が、第3章の課題とどう関わるか（350文字程度）",
      "coming": [{ "lord": "確定データの支配星名をそのまま", "text": "その期に主題になりやすい学び（150文字程度。年は確定データのもの）" }],
      "meaning": "時期を恐れず使う姿勢（200文字程度）"
    }`
  },
  {
    id: 'ch5',
    title: '第5章 使命の方向（ダルマとカルマの家）',
    pick: (a) => ({ ninth: a.houses?.[9], tenth: a.houses?.[10], amatyakaraka: a.amatyakaraka, jupiter: planet(a, 'Jupiter'), yogas: a.yogas?.slice(0, 5), ashtakavarga: a.ashtakavarga }),
    schema: `{
      "intro": "第9室＝信念と導き（ダルマ）、第10室＝世に返す行為（カルマ）の読み方（150文字程度）",
      "ninth": "第9室の支配星・在住惑星・品位から、何を信じ、何を学び、何を伝える人か（350文字程度）",
      "tenth": "第10室の支配星・在住惑星・品位から、世の中でどんな役割を担うと力が出るか（350文字程度。職業名は書かない。収入・転職には触れない）",
      "amatya": "アマティヤカーラカ（度数が2番目の惑星＝使命を支える力）が示す、使命を現実にする手段（200文字程度）",
      "roles": ["役割の性質（各40文字以内。例: 人を結ぶ・型を整える・未知を開く）", "", ""]
    }`
  },
  {
    id: 'ch6',
    title: '第6章 自分にしかできないこと（カラカムシャと三角座）',
    pick: (a) => ({ karakamsha: a.karakamsha, navamsa: a.navamsa, dharmaTrikona: a.dharmaTrikona, atmakaraka: a.atmakaraka, amatyakaraka: a.amatyakaraka, karakaRelation: a.karakaRelation }),
    schema: `{
      "intro": "ナヴァムシャ（D9）とカラカムシャで見る「魂の舞台」の考え方（150文字程度）",
      "unique": "カラカムシャのサイン・そこから見た第1・5・9・10の惑星、ダルマ・トリコーナ（第1・5・9室）の在住・支配星から、他の人には替えがたいこの人固有の組み合わせ（400文字程度）",
      "combination": "アートマカーラカとアマティヤカーラカの関係（同座・対向・ハウス関係）が示す「目的と手段」のかみ合い（250文字程度）",
      "signs": ["自分の道に乗っているときに現れるサイン（各40文字以内）", "", ""]
    }`
  },
  {
    id: 'ch7',
    title: '第7章 「生きている」と感じる瞬間（月・第5室・ナクシャトラ）',
    pick: (a) => ({ moon: a.moon, moonDignity: a.strength?.find((s) => s.key === 'Moon')?.dignity || null, nakshatra: a.nakshatra, nakshatraPada: a.nakshatraPada, nakshatraDeity: a.nakshatraDeity, fifth: a.houses?.[5], fourth: a.houses?.[4], venus: planet(a, 'Venus') }),
    schema: `{
      "intro": "月＝魂が安らぎ、喜ぶ場所、という読み方（150文字程度）",
      "joy": "月のサイン・ハウス・品位、第5室、金星から、生きていると感じる場面・行為・関係の性質（400文字程度）",
      "deity": "出生ナクシャトラの神格の物語が示す「喜びの型」（250文字程度。神格名は確定データのもの）",
      "drain": "逆に生気を失いやすい条件（200文字程度。恐怖を煽らない）",
      "practices": ["日々の中で喜びに戻る小さな行為（各40文字以内）", "", ""]
    }`
  },
  {
    id: 'ch8',
    title: '第8章 今世で成すべきこと（総括）',
    pick: (a) => ({ ...core(a), karakamsha: a.karakamsha, rahu: a.nodes?.rahu, ketu: a.nodes?.ketu, saturn: a.saturn, ninth: a.houses?.[9], tenth: a.houses?.[10], currentDasha: a.dasha?.current }),
    schema: `{
      "calling": "この生の天命（今生で引き受けるとよい役割）を、本書の根拠（アートマカーラカ・カラカムシャ・節点軸・第9/10室）を束ねて一段落で（400文字程度。運命の強制ではなく招きとして）",
      "avoid": "迷いやすい脇道（ケートゥに戻る癖・ラーフの過剰）（200文字程度）",
      "firstStep": "現在のダシャーで踏み出す最初の一歩（250文字程度。時期は確定データの年のみ）",
      "message": "決めつけず、しかし背中を押す締めの言葉（200文字程度）"
    }`
  }
];
const KARMA_CHAPTER_IDS = KARMA_CHAPTERS.map((c) => c.id);

module.exports = { KARMA_CHAPTERS, KARMA_CHAPTER_IDS, KARMA_VOICE, findKarmaViolations };
