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
10. 【確定データ】にない配置を発明しない。文字数の目安は下限（必ず超える）。
11. 読者に「自分は特別な設計で生まれてきた」と感じさせる。配置の希少さ・組み合わせの妙（高揚・自室・特定ハウスへの集中・ヨーガ・カーラカの関係など、確定データにあるものだけ）を名指しして「これは誰にでもある配置ではありません」と伝える。根拠のない褒め言葉、確定データにない希少性の主張は禁止。
12. 神話・神格・惑星の物語（ナクシャトラの神格、惑星の神話的性格）を、この人の配置に重ねて語り、読んでいて心が躍るスピリチュアルな手触りを与える。ただし物語は「配置の意味を伝える比喩」として使い、事実の予言にはしない。
13. 抽象で終えない。使命・資質・課題は必ず「日常のどんな場面で、誰に対して、どんな振る舞いとして現れるか」「明日から何をすればその力が動き出すか」まで具体的に描く（職業名は書かなくてよいが、場面・役割・行為は具体的に）。`,
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
10. Never invent a placement absent from the confirmed data. Character counts are minimums (always exceed them).
11. Let the reader feel "I was born with a special design". Name the rarity and the elegance of the actual combinations (exaltation, own sign, concentration in a house, yogas, the relation of the karakas — only what is in the confirmed data) and say plainly "this is not a placement everyone has". No praise without evidence, no claims of rarity absent from the data.
12. Weave myth — the deity of the nakshatra, the mythic character of the planets — over this person's placements so the reading carries a thrilling, spiritual texture. Myth is a metaphor that conveys the meaning of a placement, never a prediction of fact.
13. Never stop at abstraction. For every calling, gift and task, describe in which everyday scenes it appears, toward whom, as what behavior, and what to do from tomorrow so that the strength starts moving (no profession names needed, but scenes, roles and actions must be concrete).`
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
    pick: (a) => ({ ...core(a), karakamsha: a.karakamsha, rahu: a.nodes?.rahu, ketu: a.nodes?.ketu, currentDasha: a.dasha?.current, strongest: a.strength?.slice(0, 3), yogas: a.yogas?.slice(0, 5) }),
    schema: `{
      "catchphrase": "この人の生まれ方を一文で（30文字以内）",
      "rarity": "冒頭のフック。この出生図が「誰にでもある設計ではない」ことを、確定データにある配置の組み合わせ（高揚・自室・カーラカの関係・節点軸・ヨーガなど）を名指しして伝え、読者に『自分は特別な設計で生まれた』と感じさせる（400文字以上。確定データにない希少性は書かない）",
      "essence": "ラグナ・アートマカーラカ・ラーフ／ケートゥ軸から読む「この生の設計」の全体像（500文字以上。前世の断定はしない）",
      "karmaTheme": "生まれ持った課題（繰り返しやすい癖）を一言で（40文字以内）",
      "dharmaTheme": "力が最も自然に発揮され、周囲に役立つ方向を一言で（40文字以内）",
      "callingLine": "今世の使命を、日常の場面が目に浮かぶ一文で（60文字以内）",
      "gifts": ["生まれ持った資質（各40文字以内。根拠の配置を括弧で添える）", "", "", "", ""],
      "howToRead": "この書の読み方と、読み終えたときに読者が手にしているもの（200文字以上）"
    }`
  },
  {
    id: 'ch1',
    title: '第1章 何者として生まれたか（ラグナとアートマカーラカ）',
    pick: (a) => ({ ascendant: a.ascendant, lagnaLord: a.lagnaLord, atmakaraka: a.atmakaraka, karakamsha: a.karakamsha, strongest: a.strength?.slice(0, 3), nakshatra: a.nakshatra, nakshatraDeity: a.nakshatraDeity }),
    schema: `{
      "intro": "アートマカーラカ（7惑星のうち度数が最も進んだ惑星＝魂の目的を担う星）の考え方（150文字程度）",
      "text": "ラグナとその支配星、アートマカーラカの惑星・ハウス・品位、カラカムシャ（アートマカーラカが D9 で入るサイン）から、この人が何者として生まれ、どんな舞台に立つ設計かを読む（700文字以上）",
      "myth": "アートマカーラカの惑星が神話で担う役割（例: 金星＝アスラの師シュクラ、土星＝太陽の子シャニ…）と、この人の配置を重ねた物語（350文字以上。比喩として語り、予言にしない）",
      "coreDesire": "この生で満たしたい根源の欲求（300文字以上）",
      "inDailyLife": "その設計が日常でどう現れているか——家庭・仕事・人間関係のそれぞれで、読者が『確かに自分だ』と頷く具体的な場面を3つ以上（400文字以上）",
      "shadow": "アートマカーラカの惑星が未熟なときに出やすい癖と、その癖が熟したときの姿（250文字以上）"
    }`
  },
  {
    id: 'ch2',
    title: '第2章 持って生まれたカルマ（ケートゥ）',
    pick: (a) => ({ ketu: a.nodes?.ketu, twelfth: a.houses?.[12], fourth: a.houses?.[4], moon: a.moon }),
    schema: `{
      "intro": "ケートゥ＝「すでに身についているもの・意識せずできること」の読み方（150文字程度。前世の断定はしない）",
      "mastered": "ケートゥのハウス・サイン・ナクシャトラ・ディスポジターから、この人が生まれつき得意で、努力なくできること（450文字以上）",
      "proof": "その『持ち込んだ力』が人生ですでに現れているはずの場面——周囲から当たり前のように頼られること、初めてなのに知っていたような感覚——を具体的に描き、読者が思い当たるように書く（350文字以上）",
      "pattern": "そこに戻りたがる癖・同じ場面を繰り返しやすい状況（400文字以上。責めずに描く）",
      "release": "握らないほうがよいもの（300文字以上。「捨てる」ではなく「握らない」「委ねる」の語調）",
      "useIt": "この身についた力を、今生の使命のためにどう使い直すか——具体的な行為として（300文字以上）"
    }`
  },
  {
    id: 'ch3',
    title: '第3章 今生の課題と試練（ラーフと土星）',
    pick: (a) => ({ rahu: a.nodes?.rahu, saturn: a.saturn, sixth: a.houses?.[6], eighth: a.houses?.[8] }),
    schema: `{
      "intro": "ラーフ＝未熟だが伸ばす方向、土星＝時間をかけて鍛えられる領域、という読み方（150文字程度）",
      "rahu": "ラーフのハウス・サイン・ナクシャトラ・ディスポジターから、この生で伸ばすべき領域と、それが「飢え・憧れ・過剰」として現れる形（550文字以上）",
      "rahuScenes": "ラーフの渇きが日常に顔を出す具体的な場面を3つ（各60文字以上）とその場面での良い向き合い方",
      "saturn": "土星のハウス・品位・アスペクトするハウスから、時間をかけて育てる課題と、「遅れ」が持つ意味（500文字以上。恐怖を煽らない）",
      "trials": ["人生で繰り返しやすい試練の型（各50文字以内）", "", ""],
      "whyThisTrial": "なぜこの魂にこの試練が用意されているのか——第1章の設計と結び付けて、試練が使命の訓練であることを示す（350文字以上）",
      "gift": "その試練を越えたときに手に入る力と、それが周囲の誰を助けるか（300文字以上）"
    }`
  },
  {
    id: 'ch4',
    title: '第4章 試練が来る時期と、その意味（サデサティとダシャー）',
    pick: (a) => ({ sadeSati: a.sadeSati, current: a.dasha?.current, pastSwitches: a.dasha?.pastSwitches, upcoming: a.dasha?.upcoming?.slice(0, 6), nodeAndSaturnDashas: a.dashaByLord, rahu: a.nodes?.rahu, saturn: a.saturn }),
    schema: `{
      "intro": "時期を「何を学ぶ期間か」で読む考え方（200文字程度。年月は確定データのもののみ。日付は年単位で書き、○月○日の表記は使わない）",
      "past": "過去の大周期の切り替わりとサデサティの期間に、何が鍛えられたと読めるか（450文字以上。出来事は断定せず「〜が主題だった時期」と書く）",
      "now": "現在のダシャー（およびサデサティ該当なら）が、第3章の課題とどう関わるか、いま日常で何が起きやすいか（500文字以上）",
      "nowActions": ["この時期に意識して行うとよい具体的な行為（各50文字以内）", "", ""],
      "coming": [{ "lord": "確定データの支配星名をそのまま", "years": "確定データの開始年〜終了年", "text": "その期に主題になりやすい学びと、人生のどの領域で動きが起こりやすいか（250文字以上）" }],
      "meaning": "時期を恐れず使う姿勢（300文字以上）"
    }`
  },
  {
    id: 'ch5',
    title: '第5章 使命の方向（ダルマとカルマの家）',
    pick: (a) => ({ ninth: a.houses?.[9], tenth: a.houses?.[10], amatyakaraka: a.amatyakaraka, jupiter: planet(a, 'Jupiter'), yogas: a.yogas?.slice(0, 5), ashtakavarga: a.ashtakavarga }),
    schema: `{
      "intro": "第9室＝信念と導き（ダルマ）、第10室＝世に返す行為（カルマ）の読み方（150文字程度）",
      "ninth": "第9室の支配星・在住惑星・品位から、何を信じ、何を学び、何を伝える人か（500文字以上）",
      "tenth": "第10室の支配星・在住惑星・品位から、世の中でどんな役割を担うと力が出るか（500文字以上。職業名は書かない。収入・転職には触れない）",
      "amatya": "アマティヤカーラカ（度数が2番目の惑星＝使命を支える力）が示す、使命を現実にする手段（300文字以上）",
      "yogas": "確定データにあるヨーガ（惑星の組み合わせ）が示す、この人に与えられた特別な『後押し』（300文字以上。ヨーガが無い場合は、第9・10室の支配星の品位・配置の強みを同じ分量で書く）",
      "roles": ["役割の性質（各40文字以内。例: 人を結ぶ・型を整える・未知を開く）", "", "", ""],
      "missionScenes": [{ "where": "使命が現れる場面（家庭／職場／地域／学び／創作／誰かの危機 など）", "text": "その場面でこの人が自然にとる振る舞いと、周囲に起こる変化（150文字以上）" }],
      "firstMoves": ["明日から始められる、使命の方向へ踏み出す小さな行為（各50文字以内）", "", ""]
    }`
  },
  {
    id: 'ch6',
    title: '第6章 自分にしかできないこと（カラカムシャと三角座）',
    pick: (a) => ({ karakamsha: a.karakamsha, navamsa: a.navamsa, dharmaTrikona: a.dharmaTrikona, atmakaraka: a.atmakaraka, amatyakaraka: a.amatyakaraka, karakaRelation: a.karakaRelation }),
    schema: `{
      "intro": "ナヴァムシャ（D9）とカラカムシャで見る「魂の舞台」の考え方（150文字程度）",
      "unique": "カラカムシャのサイン・そこから見た第1・5・9・10の惑星、ダルマ・トリコーナ（第1・5・9室）の在住・支配星から、他の人には替えがたいこの人固有の組み合わせ（600文字以上。『この組み合わせは誰にでもあるものではない』と根拠つきで伝える）",
      "combination": "アートマカーラカとアマティヤカーラカの関係（同座・対向・ハウス関係）が示す「目的と手段」のかみ合い（350文字以上）",
      "onlyYou": "この人にしかできない貢献を、受け取る相手の目線から描く——誰が、どんな瞬間に、この人の存在に救われるか（400文字以上）",
      "signs": ["自分の道に乗っているときに現れるサイン（各40文字以内）", "", "", ""],
      "offTrack": ["道から外れているときに現れるサイン（各40文字以内）", "", ""]
    }`
  },
  {
    id: 'ch7',
    title: '第7章 「生きている」と感じる瞬間（月・第5室・ナクシャトラ）',
    pick: (a) => ({ moon: a.moon, moonDignity: a.strength?.find((s) => s.key === 'Moon')?.dignity || null, nakshatra: a.nakshatra, nakshatraPada: a.nakshatraPada, nakshatraDeity: a.nakshatraDeity, fifth: a.houses?.[5], fourth: a.houses?.[4], venus: planet(a, 'Venus') }),
    schema: `{
      "intro": "月＝魂が安らぎ、喜ぶ場所、という読み方（150文字程度）",
      "joy": "月のサイン・ハウス・品位、第5室、金星から、生きていると感じる場面・行為・関係の性質（550文字以上）",
      "deity": "出生ナクシャトラの神格の神話を物語として語り、それがこの人の「喜びの型」「守られ方」をどう示すか（450文字以上。神格名は確定データのもの。心が躍る語りで）",
      "drain": "逆に生気を失いやすい条件（300文字以上。恐怖を煽らない）",
      "practices": ["日々の中で喜びに戻る小さな行為（各40文字以内）", "", "", ""],
      "sacredHabit": "この人の月とナクシャトラに合う『自分だけの儀式』の提案——曜日・時間帯・場所・行為を具体的に（250文字以上。確定データの惑星・神格に基づく）"
    }`
  },
  {
    id: 'ch8',
    title: '第8章 今世で成すべきこと（総括）',
    pick: (a) => ({ ...core(a), karakamsha: a.karakamsha, rahu: a.nodes?.rahu, ketu: a.nodes?.ketu, saturn: a.saturn, ninth: a.houses?.[9], tenth: a.houses?.[10], currentDasha: a.dasha?.current }),
    schema: `{
      "calling": "この生の天命（今生で引き受けるとよい役割）を、本書の根拠（アートマカーラカ・カラカムシャ・節点軸・第9/10室）を束ねて（600文字以上。運命の強制ではなく招きとして）",
      "lifeMap": "その天命が人生の各領域（家庭・仕事・学び・人間関係・内面）でどう形になるか、具体像を一領域ずつ（500文字以上）",
      "avoid": "迷いやすい脇道（ケートゥに戻る癖・ラーフの過剰）（300文字以上）",
      "firstStep": "現在のダシャーで踏み出す最初の一歩（350文字以上。時期は確定データの年のみ）",
      "oneYear": "この一歩を続けた一年後に、日常のどこが変わっているか（300文字以上。出来事の予言ではなく姿勢と場面の変化として）",
      "message": "『あなたは特別な設計で生まれてきた』と、この書の根拠を一つ二つ名指しして肯定し、背中を押す締めの言葉（350文字以上）"
    }`
  }
];
const KARMA_CHAPTER_IDS = KARMA_CHAPTERS.map((c) => c.id);

module.exports = { KARMA_CHAPTERS, KARMA_CHAPTER_IDS, KARMA_VOICE, findKarmaViolations };
