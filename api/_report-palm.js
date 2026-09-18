// 手相×出生図 統合鑑定「カル・クンダリ」の章定義（8 章＋付章）。
// 出生図は確定データ、手相は Vision が「見た形」（_palm.js の固定スキーマ）。両者を混同させないため、
// 各章の確定データに palmRules を同梱し、手相側の記述は伝統的解釈・観察として書かせる。
const PALM_RULES = [
  '手相の観察（palm）は写真から機械的に読み取った「形」であり、伝統的なハスタ・サムドリカ（古典手相学）の対応表に基づく解釈として書く。「必ずこうなる」と断定しない。',
  '手相から健康・病気・寿命・妊娠・事故・死・寿命線の長短による余命を一切書かない。生命線は「生活の基礎体力・環境変化への適応」の伝統的象徴としてのみ扱う。',
  'palm で unclear / poor / absent とされた特徴は「今回の写真では判読できなかった」と正直に書き、推測で補わない。',
  '手相と出生図で示すものが一致した点、食い違った点を分けて書く。食い違いは「出生図が示す資質と、今の手が示す現在地の差」として前向きに扱う。',
  '個人の特定・年齢・性別・人種・肌の状態に触れない。'
].join('\n');

// 語り口。安全規則（COMMON_RULES）は維持したうえで、「説明」ではなく「この人への鑑定」を書かせる。
const PALM_VOICE = {
  ja: `【語り口】
これは教科書ではなく、目の前の一人に向けた鑑定書です。次を徹底してください。
1. 用語や伝統の一般説明は各項目 1 文以内。残りはすべて「あなたはこういう人です」というこの人固有の読みに使う。
2. すべての読みに、根拠となった確定データの具体的な特徴（例: 「心の線が木星丘まで伸び」「金星と太陽が 8 室」）を名指しで添える。根拠のない一般論は書かない。
3. 「でしょう」「とされています」「可能性があります」を乱用しない。資質・才能・気質・人生の主題は「あなたは〜です」と言い切る。断定を避けるのは健康・寿命・医療・法律・投資・具体的な出来事の予言だけ。
4. この人の「普通ではないところ」を必ず探して書く。強い惑星・珍しい配置・目立つ印・手と星の一致は「これは誰にでもあるものではありません」と価値を言語化する。弱い惑星は「だからこう苦しんできたはず」と当てて、ただし必ず活かし方を作る。
5. 各項目は【言い当て（あなたはこういう人）→根拠（星と手のどこから）→その才能・運命の使い方（指針）】の順で書く。指針は行動で結ぶ。
6. 語りは物語として面白く。限られた選ばれ方をした一人に、古い寺院の占星術師が目を見て語りかけるように。ただし品格とです・ます調は維持。
7. 【確定データ】にない配置・印・線を発明しない。unclear は正直に「今回の写真では読めなかった」とする。`,
  en: `[Voice]
This is not a textbook but a reading addressed to one person. Follow strictly:
1. General explanation of a term or tradition: at most one sentence per field. Spend the rest on what is specific to this person ("you are ...").
2. Every reading must name the concrete feature from the confirmed data it rests on (e.g. "your heart line runs up to the mount of Jupiter", "Venus and the Sun share the 8th house"). No unsupported generalities.
3. Do not hedge everything with "may", "is said to", "possibly". State qualities, talents, temperament and life themes plainly ("you are ..."). Reserve caution for health, lifespan, medical, legal, financial matters and predictions of specific events.
4. Always find and voice what is uncommon about this person: strong planets, rare placements, striking marks, agreement between hand and chart ("this is not something everyone has"). Weak planets: name the struggle they explain, then always give the way to use them.
5. Each field follows: the call (who you are) -> the evidence (where in the stars and the hand) -> how to use that talent or destiny (guidance ending in an action).
6. Tell it as a story, as an old temple astrologer speaking to one chosen person, while keeping a dignified, polite register.
7. Never invent a placement, mark or line absent from the confirmed data; unclear features are honestly "not readable in this photo".`
};

// 惑星ごとの伝統的な対応（丘・指・線）。出力言語に依存しない固定表。
const PLANET_MAP = {
  Sun: { mount: 'sun', finger: 'ring', line: 'sun' },
  Moon: { mount: 'moon', finger: null, line: null },
  Mars: { mount: 'mars_upper/mars_lower', finger: null, line: null },
  Mercury: { mount: 'mercury', finger: 'little', line: 'mercury' },
  Jupiter: { mount: 'jupiter', finger: 'index', line: null },
  Venus: { mount: 'venus', finger: 'thumb', line: 'life (encircles venus)' },
  Saturn: { mount: 'saturn', finger: 'middle', line: 'fate' },
  Rahu: { mount: '(shadow: grille/island marks)', finger: null, line: null },
  Ketu: { mount: '(shadow: cross/island marks)', finger: null, line: null }
};

const handOf = (a, side) => a.palm?.hands?.[side] || null;
const dominant = (a) => (a.hand === 'left' ? 'left' : 'right');
const other = (a) => (dominant(a) === 'left' ? 'right' : 'left');

const chartCore = (a) => ({
  ascendant: a.ascendant, moon: a.moon, sun: a.sun, nakshatra: a.nakshatra, nakshatraPada: a.nakshatraPada,
  strength: a.strength?.slice(0, 4), atmakaraka: a.atmakaraka, nakshatraDeity: a.nakshatraDeity
});

const planetsForMap = (a) => (a.planets || []).filter((p) => p.key !== 'Ascendant').map((p) => ({
  planet: p.name, key: p.key, sign: p.sign, house: p.house, retrograde: p.retrograde,
  dignity: (a.strength || []).find((s) => s.key === p.key)?.dignity || null,
  palmCorrespondence: PLANET_MAP[p.key] || null
}));

const natalByHouse = (a) => (a.planets || [])
  .filter((p) => p.key !== 'Ascendant')
  .map((p) => ({ planet: p.name, key: p.key, sign: p.sign, house: p.house }));

// 各月のトランジット天体に、同じ星座にある出生天体（触れる天体）を添える。
// 例: 土星が出生の土星の星座へ戻る（サターン・リターン）、ラーフが出生の月の上を通る、など個人固有の重なりを Gemini に渡す。
function monthsWithTouches(a) {
  const natal = natalByHouse(a);
  return (a.months || []).map((m) => ({
    month: m.month,
    transits: m.planets.map((p) => {
      const touches = natal.filter((n) => n.sign === p.sign).map((n) => ({
        natalPlanet: n.planet, natalHouse: n.house, ...(n.key === p.key ? { return: true } : {})
      }));
      return {
        planet: p.name, sign: p.sign, houseFromLagna: p.houseFromLagna, houseFromMoon: p.houseFromMoon,
        ...(p.retrograde ? { retrograde: true } : {}), ...(touches.length ? { touches } : {})
      };
    })
  }));
}

const PALM_CHAPTERS = [
  {
    id: 'summary',
    title: 'あなたのカル・クンダリ（要約）',
    pick: (a) => ({
      palmRules: PALM_RULES, ...chartCore(a), dominantHand: dominant(a),
      imageQuality: a.palm?.image_quality, handShape: { right: handOf(a, 'right')?.hand_shape, left: handOf(a, 'left')?.hand_shape },
      marks: { right: handOf(a, 'right')?.marks, left: handOf(a, 'left')?.marks }, currentDasha: a.dasha?.current
    }),
    schema: `{
      "catchphrase": "この人の「魂の紋章」を一文で（30文字以内。手相と出生図の両方から。段違いに印象的な言葉で）",
      "essence": "「あなたはこういう人です」と言い切る全体像。ラグナ・月・太陽・ナクシャトラ・手の形・目立つ印のうち、この人を最も特徴づける 3 点を名指しで根拠にして（350文字程度）",
      "rare": "この人にしかないもの。珍しい配置・強い惑星・手の印・星と手の一致のうち一つを選び、なぜそれが誰にでもあるものではないか（200文字程度）",
      "talents": ["この人の才能を一つづつ。「〜の才能：根拠の特徴」の形（呄40文字以内）", "", ""],
      "agreement": "出生図と手相が同じことを語っている主題と、それがこの人の人生にどう現れているか（150文字程度）",
      "difference": "出生図と手相で違って見える点＝「与えられた資質と、まだ使い切っていない資質」の差として（150文字程度。無ければ「大きな食い違いは見られません」）",
      "compass": "この鑑定書全体を貫く、この人への指針を一文で（60文字以内）",
      "photoNote": "写真の判読状況（不鮮明な箇所があれば正直に。80文字以内）"
    }`
  },
  {
    id: 'ch1',
    title: '第1章 魂の設計図（出生図が語るあなた）',
    pick: (a) => ({ ...chartCore(a), planets: a.planets, yogas: a.yogas?.slice(0, 5), boosters: a.boosters }),
    schema: `{
      "intro": "この章で何を言い当てるかを一文で予告（80文字以内。出生図の一般説明は不要）",
      "lagna": "ラグナ（上昇宮）とその支配星の配置から、この人の器・第一印象・人生への向き合い方を言い当てる。「あなたは〜」で始め、根拠を名指し（300文字程度）",
      "moon": "月のサイン・ナクシャトラ・神格から、この人の心の癖・満たされるもの・人には見せない面を言い当てる（300文字程度。神格は確定データのもののみ）",
      "planets": [{ "planet": "この人を最も特徴づける惑星 3 つ（強い・珍しい・弱いのいずれかで選ぶ）", "placement": "サイン・ハウス・品位（確定データのみ）", "reading": "それがこの人の才能・気質・人生にどう現れるかを言い切り、使い方を一つ（150文字程度）" }],
      "atmakaraka": "アートマカーラカ（魂の指標星）から、今生でこの人が何をやりとげるために生まれたかを一つの使命として言い当てる（250文字程度）",
      "story": "上記を織り合わせた「魂の物語」の序章。この人がどんな役を耀って生まれたかを、物語の語りで（250文字程度）"
    }`
  },
  {
    id: 'ch2',
    title: '第2章 手の上の惑星マップ（九曜と丘・指・線）',
    pick: (a) => ({
      palmRules: PALM_RULES, dominantHand: dominant(a), planets: planetsForMap(a),
      palm: { right: handOf(a, 'right'), left: handOf(a, 'left') }
    }),
    schema: `{
      "intro": "手の上に九つの惑星（ナヴァグラハ）が住むという考え方を一文で、続けてこの人の手で何が一番目を引いたか（150文字程度）",
      "planets": [{ "planet": "確定データの惑星名をそのまま（太陽・月・火星・水星・木星・金星・土星・ラーフ・ケートゥの 9 つ）", "onHand": "対応する丘・指・線が写真でどう見えたか（unclear なら判読不可と書く。80文字程度）", "inChart": "出生図でのその惑星の配置と品位（60文字程度）", "reading": "両者を合わせて、この人の中でその惑星がどう働いているかを言い当てる（「あなたの〜はここから来ています」の形。120文字程度）" }],
      "closing": "この人の手と星で最も存在感のある惑星を一つ名指しし、それがこの人の「武器」であることと使い方（180文字程度）"
    }`
  },
  {
    id: 'ch3',
    title: '第3章 天と地の照合（出生図と手相の一致・不一致）',
    pick: (a) => ({
      palmRules: PALM_RULES, dominantHand: dominant(a), strength: a.strength, ascendant: a.ascendant, moon: a.moon, atmakaraka: a.atmakaraka,
      palm: { right: handOf(a, 'right'), left: handOf(a, 'left') }, asymmetry: a.palm?.asymmetry, unclear: a.palm?.unclear
    }),
    schema: `{
      "intro": "「天（出生図）は与えられた資質、地（手）は今の使い方」を一文で、続けてこの人の天と地の照合結果の総評（一致が多いのか、だけでなく何を意味するのか。150文字程度）",
      "matches": [{ "theme": "一致した主題（30文字以内）", "chart": "出生図側の根拠（80文字程度）", "hand": "手相側の根拠（80文字程度）", "meaning": "天と地が重なったということは、この人においてその資質がどこまで本物か。言い切る（120文字程度）" }],
      "gaps": [{ "theme": "食い違った主題（30文字以内）", "chart": "出生図側（80文字程度）", "hand": "手相側（80文字程度）", "meaning": "「与えられているのにまだ使っていない力」として名指しし、使い始める方法を一つ（120文字程度）" }],
      "hands": "利き手（現在・後天）と非利き手（生来・先天）の違いから、この人が生まれてから今までに何を変えてきたかを言い当てる（200文字程度。asymmetry が空なら「両手に大きな差は見られません」とし、それが意味することを書く）",
      "closing": "照合から見えた「あなたの今の立ち位置」と、次に踏み出すべき一歩（150文字程度）"
    }`
  },
  {
    id: 'ch4',
    title: '第4章 聖なるしるし（吉祥の印）',
    pick: (a) => ({
      palmRules: PALM_RULES, marks: { right: handOf(a, 'right')?.marks || [], left: handOf(a, 'left')?.marks || [] },
      nakshatraDeity: a.nakshatraDeity, nakshatra: a.nakshatra, strongest: a.strength?.slice(0, 2)
    }),
    schema: `{
      "intro": "魚・蓮・法螺貝・三叉など吉祥の印の伝統を一文で、続けてこの人の手に何があったか（あるいは無かったか）を語りのように（150文字程度）",
      "found": [{ "mark": "確定データの印の種類（fish→魚、lotus→蓮、conch→法螺貝、trident→三叉、star→星、triangle→三角、square→四角、cross→十字、island→島、grille→格子、circle→円 と訳す）", "where": "位置（確定データの location を訳す）", "confidence": "high/medium/low を「はっきり／おそらく／かすかに」と訳す", "tradition": "その印の伝統的な意味を一文で、続けてこの人の出生図のどの資質と呂応しているかを名指しで（150文字程度。具体的な出来事は断定しない）" }],
      "none": "印が一つも見つからない場合: それは欠落ではなく、この人の守りは代わりにどこ（強い惑星・神格）にあるか（150文字程度。found が空でなければ空文字）",
      "deity": "出生ナクシャトラの神格がこの人に授けた性質と、手の印の主題とのつながり。「あなたは〜の神に見守られて生まれた」という語り（180文字程度）",
      "closing": "この人にとっての「守りの記憶」を一つの言葉にして持たせる（120文字程度）"
    }`
  },
  {
    id: 'ch5',
    title: '第5章 三つのカルマ（蓄積・現在・創造）',
    pick: (a) => ({
      palmRules: PALM_RULES, dasha: { current: a.dasha?.current, upcoming: a.dasha?.upcoming?.slice(0, 2) }, atmakaraka: a.atmakaraka, sadeSati: a.sadeSati,
      lines: { dominant: handOf(a, dominant(a))?.lines, other: handOf(a, other(a))?.lines }, dominantHand: dominant(a)
    }),
    schema: `{
      "intro": "三つのカルマ（蓄積・現在・創造）の考え方を二文以内で、続けてこの人のカルマの全体像を一言で（150文字程度）",
      "sanchita": "非利き手の主要線とアートマカーラカから、この人が持って生まれたもの（才能・課題・魂の癖）を言い当てる。「あなたは〜を抱いて生まれてきた」の形で（250文字程度）",
      "prarabdha": "現在のダシャーと利き手の運命線・頭脳線から、いまこの人の人生で起きていることの正体と、この時期に与えられている課題を言い当てる（300文字程度）",
      "kriyamana": "この人がこれから自分で書き足せる部分。具体的にどの資質をどう使えば手（運命線・太陽線など）が変わるか、行動で示す（250文字程度）",
      "closing": "三つを一つの流れとして、この人の人生を一文の物語に（120文字程度）"
    }`
  },
  {
    id: 'ch6',
    title: '第6章 縁・仕事・決断（三つの領域）',
    pick: (a) => ({
      palmRules: PALM_RULES, planets: (a.planets || []).filter((p) => ['Venus', 'Moon', 'Sun', 'Saturn', 'Mercury', 'Jupiter', 'Mars'].includes(p.key)),
      boosters: a.boosters, strength: a.strength?.slice(0, 4),
      lines: handOf(a, dominant(a))?.lines, mounts: handOf(a, dominant(a))?.mounts, fingers: handOf(a, dominant(a))?.finger_lengths
    }),
    schema: `{
      "bonds": { "verdict": "この人の愛し方・人との結び方を一文で言い切る（60文字以内）", "chart": "金星・月・7 室の配置を名指しして、どういう人を引き寄せ、どういう関係で満たされ、どこでつまずきやすいか（200文字程度）", "hand": "感情線・金星丘・月丘の見え方がこの人の愛の現在形をどう裏付けるか（150文字程度）", "advice": "縁を育てるためにこの人だけがすべきことを一つ、行動で（120文字程度）" },
      "work": { "verdict": "この人が社会で担うべき役割を一文で言い切る（60文字以内。職種名ではなく役割で）", "chart": "太陽・土星・10 室・アートマカーラカを名指しして、この人の才能が最も輝く場面と、評価されにくい場面（200文字程度）", "hand": "運命線・太陽線・土星丘・木星丘から、その才能が今どこまで形になっているか（150文字程度。職種は断定しない）", "advice": "働き方の指針を一つ、行動で（120文字程度）" },
      "decisions": { "verdict": "この人の決断の型を一文で言い切る（60文字以内）", "chart": "水星・火星・木星の配置を名指しして、この人が迷うときの癖と、当たるときの判断の形（200文字程度）", "hand": "頭脳線・親指・火星丘から見える、この人の意志の強さと考え方の形（150文字程度）", "advice": "迷ったときにこの人が使うべき判断軸を一つ（120文字程度）" }
    }`
  },
  {
    id: 'ch7',
    title: '第7章 次の 12 か月（時の流れ）',
    pick: (a) => ({
      period: a.period, dashaChanges: a.dashaChanges, currentDasha: a.dasha?.current, keyShifts: a.keyShifts,
      sadeSati: a.sadeSati?.active ? { active: true, phase: a.sadeSati.phase } : { active: false },
      natal: { ascendant: a.ascendant, moon: a.moon, sun: a.sun, atmakaraka: a.atmakaraka, strongest: a.strength?.slice(0, 2), planetsByHouse: natalByHouse(a) },
      months: monthsWithTouches(a),
      lines: { fate: handOf(a, dominant(a))?.lines?.fate, sun: handOf(a, dominant(a))?.lines?.sun, head: handOf(a, dominant(a))?.lines?.head }
    }),
    schema: `{
      "overview": "今後 12 か月をこの人のための一年として名付け（「○○の一年」）、なぜそう呼ぶかを、月から見た木星・土星・ラーフ/ケートゥの位置と、months[].transits[].touches に出ている「出生天体との重なり」（return は回帰）（例: 土星が出生の土星のいる牡羊座へ帰る、ラーフが出生の月の上を通る）を名指しして語る（250文字程度。期間は確定データの年月のみ）",
      "months": [{ "month": "確定データの YYYY-MM を 12 か月ぶん、順にすべて", "title": "その月にこの人へ付ける見出し（20文字以内。「調整期」のような一般語ではなく、「独立へ動く月」「縁が結び直される月」のように、この人の人生で何が動くかを言い切る）", "text": "この月の空でこの人にだけ起きること: どの天体が出生図のどのハウス・どの天体（touches）に触れるか→人生のどの領域（縁・仕事・家・心・学び・お金の姿勢など）が動くか→その月にこの人がすべき行動を一つ（120文字程度。turning に挙げる転機の月には「ここで動く月です」と読者の背中を押す一文を必ず入れ、それ以外の月には使わない。動きの少ない月は「仕込みの月」として前月からの続きで何を積むかを書く）" }],
      "turning": [{ "month": "YYYY-MM", "why": "keyShifts・touches のうち、この人にとって特別な意味を持つ移動（出生天体との重なり、ダシャー切替）を名指しして、なぜこの月が転機かを「この月、あなたは〜へ動きます」と言い切る（120文字程度。予言ではなく、何を始める・決める・手放す月かを示す）" }],
      "best": "この 12 か月で最も追い風が吹く月（YYYY-MM）と、そこでこの人が何を仕掛けるべきか（120文字程度）",
      "careful": "最も慎重に進むべき月（YYYY-MM）と、その月に守るべきこと一つ（100文字程度。不安を煽らず、恐怖表現なし）",
      "handCheck": "この 12 か月のあとに手のどこが変わっているはずか（lines の運命線・太陽線・頭脳線の現状を名指しして。120文字程度）",
      "closing": "この一年をどう生きるか、この人だけに向けた言葉（120文字程度）"
    }`
  },
  {
    id: 'ch8',
    title: '第8章 手は変わる（定点観測のすすめ）',
    pick: (a) => ({
      palmRules: PALM_RULES, dominantHand: dominant(a), lines: handOf(a, dominant(a))?.lines, mounts: handOf(a, dominant(a))?.mounts,
      unclear: a.palm?.unclear, upcoming: a.dasha?.upcoming?.slice(0, 2), strongest: a.strength?.slice(0, 2)
    }),
    schema: `{
      "intro": "「手は生き方とともに変わる」を一文で、続けてこの人の手はこれからどう変わっていくと読むか（150文字程度）",
      "watch": [{ "feature": "見直すとよい特徴（線・丘の名前。30文字以内）", "now": "今回の写真での見え方（60文字程度。unclear なら判読不可と）", "why": "この人がどう生きるとそこがどう変わるか（出生図の根拠を添えて 100文字程度）" }],
      "practice": ["この人の星と手に合わせた日々の具体的な行動（各40文字以内。一般的な健康法は不可）", "", ""],
      "retake": "次に写真を撮るおすすめの時期と撮り方（確定データの年月のみ。120文字程度）",
      "message": "締めの言葉。この鑑定書で言い当てたこの人の最大の資質をもう一度名指しし、それを信じて進む背中を押す（200文字程度）"
    }`
  },
  {
    id: 'ch9',
    title: '付章 出生時刻が不確かな場合の手がかり',
    pick: (a) => ({
      palmRules: PALM_RULES, tobUnknown: a.tob_unknown === 'true' || a.tobUnknown === true, ascendant: a.ascendant, moon: a.moon,
      handShape: { right: handOf(a, 'right')?.hand_shape, left: handOf(a, 'left')?.hand_shape }, fingers: handOf(a, dominant(a))?.finger_lengths, mounts: handOf(a, dominant(a))?.mounts
    }),
    schema: `{
      "intro": "出生時刻が不確かなときラグナがずれる可能性と、手相を補助線として使う考え方（100文字程度）",
      "check": "手の形・指の長さ・丘の様子が、算出されたラグナの性質と整合しているか（250文字程度。整合しなくても断定はせず、確認の視点として）",
      "advice": "出生時刻を確かめる現実的な方法（母子手帳・出生証明など一般論。120文字程度）"
    }`
  }
];

const PALM_CHAPTER_IDS = PALM_CHAPTERS.map((c) => c.id);

module.exports = { PALM_CHAPTERS, PALM_CHAPTER_IDS, PALM_RULES, PALM_VOICE, PLANET_MAP };
