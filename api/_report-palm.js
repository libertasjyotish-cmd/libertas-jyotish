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
      "catchphrase": "この人の「魂の紋章」を一文で（30文字以内。手相と出生図の両方から）",
      "essence": "出生図（ラグナ・月・太陽・ナクシャトラ）と手の形・目立つ印から読む全体像（300文字程度）",
      "agreement": "出生図と手相が一致して示している主題（150文字程度）",
      "difference": "出生図と手相で違って見える点と、その前向きな読み方（150文字程度。無ければ「大きな食い違いは見られません」）",
      "photoNote": "写真の判読状況（不鮮明な箇所があれば正直に。80文字以内）"
    }`
  },
  {
    id: 'ch1',
    title: '第1章 魂の設計図（出生図が語るあなた）',
    pick: (a) => ({ ...chartCore(a), planets: a.planets, yogas: a.yogas?.slice(0, 5), boosters: a.boosters }),
    schema: `{
      "intro": "出生図とは何か、この章で読むこと（150文字程度）",
      "lagna": "ラグナ（上昇宮）と 1 室から読む、生まれ持った器と人生への向き合い方（300文字程度）",
      "moon": "月のサインとナクシャトラ、その神格から読む心の性質（300文字程度。神格は確定データのもののみ）",
      "atmakaraka": "アートマカーラカ（魂の指標星）が示す今生の学びの主題（250文字程度）",
      "story": "上記を織り合わせた、この人の「魂の物語」の序章（250文字程度）"
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
      "intro": "手の上に九つの惑星（ナヴァグラハ）が住むという古典手相学の考え方（200文字程度）",
      "planets": [{ "planet": "確定データの惑星名をそのまま（太陽・月・火星・水星・木星・金星・土星・ラーフ・ケートゥの 9 つ）", "onHand": "対応する丘・指・線が写真でどう見えたか（unclear なら判読不可と書く。80文字程度）", "inChart": "出生図でのその惑星の配置と品位（60文字程度）", "reading": "両者を合わせた読み（120文字程度）" }],
      "closing": "この人の手で最も存在感のある惑星と、その意味（150文字程度）"
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
      "intro": "「天（出生図）は与えられた資質、地（手）は今の使い方」という照合の考え方（200文字程度）",
      "matches": [{ "theme": "一致した主題（30文字以内）", "chart": "出生図側の根拠（80文字程度）", "hand": "手相側の根拠（80文字程度）", "meaning": "一致が意味すること（100文字程度）" }],
      "gaps": [{ "theme": "食い違った主題（30文字以内）", "chart": "出生図側（80文字程度）", "hand": "手相側（80文字程度）", "meaning": "差を前向きにどう読むか（100文字程度）" }],
      "hands": "利き手（現在・後天）と非利き手（生来・先天）の違いから読めること（200文字程度。asymmetry が空なら「両手に大きな差は見られません」）",
      "closing": "照合から見えた、この人の「今の立ち位置」（150文字程度）"
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
      "intro": "魚・蓮・法螺貝・三叉など、インドの古典で吉祥とされる印の伝統（200文字程度）",
      "found": [{ "mark": "確定データの印の種類（fish→魚、lotus→蓮、conch→法螺貝、trident→三叉、star→星、triangle→三角、square→四角、cross→十字、island→島、grille→格子、circle→円 と訳す）", "where": "位置（確定データの location を訳す）", "confidence": "high/medium/low を「はっきり／おそらく／かすかに」と訳す", "tradition": "その印の伝統的な意味（120文字程度。断定せず）" }],
      "none": "印が一つも見つからない場合の読み方（120文字程度。found が空でなければ空文字）",
      "deity": "出生ナクシャトラの神格と印の主題のつながり（150文字程度）",
      "closing": "しるしを「守りの記憶」としてどう持つか（120文字程度）"
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
      "intro": "サンチタ（蓄積）・プラーラブダ（現在に割り当てられた分）・クリヤマーナ（今つくっている）の三つのカルマの考え方（250文字程度）",
      "sanchita": "非利き手の主要線と出生図（アートマカーラカ）から読む、持って生まれた蓄積（250文字程度）",
      "prarabdha": "現在のダシャーと利き手の運命線・頭脳線から読む、いま割り当てられている課題（300文字程度）",
      "kriyamana": "これから自分で書き足していける部分。手は変わるという伝統的な見方（250文字程度）",
      "closing": "三つを一つの流れとして捉える言葉（120文字程度）"
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
      "bonds": { "chart": "縁・人との関わりを出生図（金星・月・7 室）から（200文字程度）", "hand": "感情線・金星丘・月丘の見え方から（150文字程度）", "advice": "縁の育て方（120文字程度）" },
      "work": { "chart": "仕事・社会での役割を出生図（太陽・土星・10 室）から（200文字程度）", "hand": "運命線・太陽線・土星丘・木星丘から（150文字程度。職種は断定しない）", "advice": "働き方の指針（120文字程度）" },
      "decisions": { "chart": "決断の癖を出生図（水星・火星・木星）から（200文字程度）", "hand": "頭脳線・親指・火星丘から（150文字程度）", "advice": "迷ったときの判断軸（120文字程度）" }
    }`
  },
  {
    id: 'ch7',
    title: '第7章 次の 12 か月（時の流れ）',
    pick: (a) => ({
      period: a.period, dashaChanges: a.dashaChanges, currentDasha: a.dasha?.current, keyShifts: a.keyShifts, sadeSati: a.sadeSati,
      months: (a.months || []).map((m) => ({ month: m.month, ...Object.fromEntries(m.planets.map((p) => [p.key, `L${p.houseFromLagna}/M${p.houseFromMoon}${p.retrograde ? ' R' : ''}`])) }))
    }),
    schema: `{
      "overview": "今後 12 か月の大きな流れ（250文字程度。期間は確定データの年月のみ）",
      "windows": [{ "month": "確定データの YYYY-MM をそのまま", "theme": "その月の主題（30文字以内）", "text": "根拠（木星・土星・ラーフ/ケートゥの月からのハウス、ダシャー切替）と過ごし方（150文字程度）" }],
      "handCheck": "この 12 か月のあとに手のどこを見直すとよいか（運命線・太陽線など。120文字程度）",
      "closing": "時の流れに乗る姿勢（120文字程度）"
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
      "intro": "古典手相学で「手は生き方とともに変わる」とされる考え方（200文字程度）",
      "watch": [{ "feature": "見直すとよい特徴（線・丘の名前。30文字以内）", "now": "今回の写真での見え方（60文字程度。unclear なら判読不可と）", "why": "なぜそこが変わりうるか（出生図の根拠を添えて 100文字程度）" }],
      "practice": ["日々の中で意識できること（各40文字以内）", "", ""],
      "retake": "次に写真を撮るおすすめの時期と撮り方（確定データの年月のみ。120文字程度）",
      "message": "締めの言葉。決断を迫らず、手を信じて進む背中を押す（200文字程度）"
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
      "intro": "出生時刻が不確かなときラグナがずれる可能性と、手相を補助線として使う伝統的な考え方（200文字程度）",
      "check": "手の形・指の長さ・丘の様子が、算出されたラグナの性質と整合しているか（250文字程度。整合しなくても断定はせず、確認の視点として）",
      "advice": "出生時刻を確かめる現実的な方法（母子手帳・出生証明など一般論。120文字程度）"
    }`
  }
];

const PALM_CHAPTER_IDS = PALM_CHAPTERS.map((c) => c.id);

module.exports = { PALM_CHAPTERS, PALM_CHAPTER_IDS, PALM_RULES, PLANET_MAP };
