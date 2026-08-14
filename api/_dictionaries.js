// 完全鑑定書（PDF）の「モノ・コト・場所」変換辞書（CommonJS）
// 生成AIには選ばせず、Prokerala の算出値からコード側で一意に決定する。
// 各項目は必ず「なぜそうなるか」を reason として持ち、鑑定書に根拠として表示する。

// 12星座 → 支配星（古典のルール。ラーフ・ケートゥは支配星を持たない）
const SIGN_LORD = {
  牡羊座: 'Mars', 牡牛座: 'Venus', 双子座: 'Mercury', 蟹座: 'Moon',
  獅子座: 'Sun', 乙女座: 'Mercury', 天秤座: 'Venus', 蠍座: 'Mars',
  射手座: 'Jupiter', 山羊座: 'Saturn', 水瓶座: 'Saturn', 魚座: 'Jupiter'
};

const PLANET_JA = {
  Sun: '太陽', Moon: '月', Mars: '火星', Mercury: '水星', Jupiter: '木星',
  Venus: '金星', Saturn: '土星', Rahu: 'ラーフ', Ketu: 'ケートゥ',
  Ascendant: 'アセンダント'
};

// 惑星が司る領域（第2章「最も強い星」の解説に使う）
const PLANET_DOMAIN = {
  Sun: { title: '意志と自己実現', keywords: ['リーダーシップ', '自己表現', '父性', '公的な立場'] },
  Moon: { title: '感情と安心', keywords: ['共感力', '想像力', '母性', '日常のリズム'] },
  Mars: { title: '行動力と競争', keywords: ['実行力', '突破力', '技術', '体力'] },
  Mercury: { title: '知性と伝達', keywords: ['言語', '商才', '分析', '機転'] },
  Jupiter: { title: '拡大と智慧', keywords: ['学び', '指導', '信頼', '幸運の受け皿'] },
  Venus: { title: '調和と美', keywords: ['美意識', '対人関係', '楽しみ', '芸術'] },
  Saturn: { title: '継続と構築', keywords: ['忍耐', '責任', '構造化', '長期戦'] },
  Rahu: { title: '拡張と欲求', keywords: ['新分野', '越境', '技術革新', '野心'] },
  Ketu: { title: '手放しと熟達', keywords: ['探究', '直感', '専門性', '無執着'] }
};

// 惑星の強さ（品位）を点数化する。planet-relationship / planet-position の dignity 表記に対応。
const DIGNITY_SCORE = {
  exalted: 100, ownsign: 85, own: 85, moolatrikona: 90,
  greatfriend: 75, friend: 65, neutral: 50,
  enemy: 35, greatenemy: 25, debilitated: 10
};

const DIGNITY_JA = {
  exalted: '高揚', ownsign: '自室', own: '自室', moolatrikona: '定座',
  greatfriend: '最良の友好', friend: '友好', neutral: '中立',
  enemy: '敵対', greatenemy: '強い敵対', debilitated: '減衰'
};

// ①【モノ】ライフストーン: 1室（ラグナ）の支配星に対応する石
const LIFE_STONE = {
  Sun: { stone: 'ルビー', alternatives: ['ガーネット', 'レッドスピネル'], metal: 'ゴールド' },
  Moon: { stone: 'パール', alternatives: ['ムーンストーン'], metal: 'シルバー' },
  Mars: { stone: 'レッドコーラル', alternatives: ['カーネリアン'], metal: 'カッパー' },
  Mercury: { stone: 'エメラルド', alternatives: ['ペリドット', 'グリーンアゲート'], metal: 'ゴールド' },
  Jupiter: { stone: 'イエローサファイア', alternatives: ['シトリン', 'トパーズ'], metal: 'ゴールド' },
  Venus: { stone: 'ダイヤモンド', alternatives: ['ホワイトサファイア', 'オパール'], metal: 'プラチナ' },
  Saturn: { stone: 'ブルーサファイア', alternatives: ['アメジスト', 'ラピスラズリ'], metal: 'シルバー' },
  Rahu: { stone: 'ヘソナイト', alternatives: ['スモーキークォーツ'], metal: 'シルバー' },
  Ketu: { stone: 'キャッツアイ', alternatives: ['タイガーアイ'], metal: 'シルバー' }
};

// ①【モノ】勝負カラー（惑星の色属性）。hex は誌面のカラーチップに使う。
const PLANET_COLOR = {
  Sun: { name: 'ディープルビー', hex: '#9B1B30' },
  Moon: { name: 'パールホワイト', hex: '#F3F0E7' },
  Mars: { name: 'コーラルレッド', hex: '#C64C3C' },
  Mercury: { name: 'エメラルドグリーン', hex: '#1E7A5A' },
  Jupiter: { name: 'サフランイエロー', hex: '#D9A441' },
  Venus: { name: 'アイボリー／ローズ', hex: '#E4C7C0' },
  Saturn: { name: 'ミッドナイトブルー', hex: '#1F3A5F' },
  Rahu: { name: 'スモークグレー', hex: '#6E6A66' },
  Ketu: { name: 'アースブラウン', hex: '#7A5C3E' }
};

// ③【場所】惑星の方位属性（古典の方位対応）と、その方位で活きる環境の性質
const PLANET_DIRECTION = {
  Sun: { direction: '東', environment: ['朝日の入る部屋', '見晴らしの良い高所', '公的機関の集まる中心部'] },
  Moon: { direction: '北西', environment: ['水辺', '静かな住宅地', '緑と余白のある空間'] },
  Mars: { direction: '南', environment: ['日当たりの強い高層階', '活気ある市街地', '運動できる施設の近く'] },
  Mercury: { direction: '北', environment: ['書斎・作業部屋', '交通の結節点', '商業と文教が混じる地域'] },
  Jupiter: { direction: '北東', environment: ['学びの場の近く', '歴史のある落ち着いた土地', '広く開けた空間'] },
  Venus: { direction: '南東', environment: ['美術館・劇場のある街', '手入れされた庭や公園', '心地よい内装の空間'] },
  Saturn: { direction: '西', environment: ['落ち着いた郊外', '重厚な建築のある土地', '人の少ない静かな環境'] },
  Rahu: { direction: '南西', environment: ['再開発地区', '多国籍な街', '新しい技術が集まる場所'] },
  Ketu: { direction: '南西', environment: ['自然に囲まれた土地', '生活音の少ない場所', '一人になれる空間'] }
};

// ②【コト】1室・10室の支配星から導く働き方の型
const WORK_STYLE = {
  Sun: { type: '導く', detail: '責任の所在がはっきりした立場で力を発揮します。合議より決裁。' },
  Moon: { type: '整える', detail: '相手の状態を読み取り、場を安定させる役割で力を発揮します。' },
  Mars: { type: '導く', detail: '短期決戦のプロジェクト、技術的な突破が求められる場面で伸びます。' },
  Mercury: { type: '伝える', detail: '言語化・交渉・数字の扱いが絡む仕事で価値が跳ね上がります。' },
  Jupiter: { type: '伝える', detail: '教える・助言する・信頼を預かる仕事が最も自然な形です。' },
  Venus: { type: '創る', detail: '美意識と対人感覚が同時に問われる仕事で本領を発揮します。' },
  Saturn: { type: '整える', detail: '長期の積み上げ、仕組み化、品質管理で他を圧倒します。' },
  Rahu: { type: '創る', detail: '前例のない領域、新しい市場での試行錯誤に強さがあります。' },
  Ketu: { type: '整える', detail: '一点集中の専門性を深める働き方が合っています。' }
};

// ②【コト】月の星座（感情の性質）から導く生活リズムの整え方
const RHYTHM_BY_ELEMENT = {
  火: {
    morning: ['起床後すぐに体を動かす', '一日の目標を1つだけ書き出す', '朝の光を浴びる'],
    night: ['就寝2時間前から画面を減らす', '翌日の予定を3行で確認する', '温かい飲み物で体温を上げる'],
    focus: '午前中の前半に最も集中力が出ます。重い判断は午前に寄せてください。'
  },
  地: {
    morning: ['同じ時刻に起きる', '朝に机の上を整える', '外の空気に触れる'],
    night: ['入浴で体を温める', '持ち物を定位置に戻す', '就寝時刻を固定する'],
    focus: '午前後半から午後にかけて安定します。手順の決まった作業を積み上げると強い。'
  },
  風: {
    morning: ['起床後に軽く体を伸ばす', '思いついたことを書き留める', '短い散歩をする'],
    night: ['情報を入れるのをやめる時間を決める', '会話を振り返る', '読書で頭を静める'],
    focus: '短い集中を複数回に分けるほうが成果が出ます。長時間の単独作業は避けて。'
  },
  水: {
    morning: ['起きてすぐ水を飲む', '静かな時間を5分取る', '予定を詰めすぎない'],
    night: ['湯船に浸かる', '感情を書き出して手放す', '早めに照明を落とす'],
    focus: '夕方以降に感受性が高まります。創造的な作業は午後から夜に。'
  }
};

const SIGN_ELEMENT = {
  牡羊座: '火', 獅子座: '火', 射手座: '火',
  牡牛座: '地', 乙女座: '地', 山羊座: '地',
  双子座: '風', 天秤座: '風', 水瓶座: '風',
  蟹座: '水', 蠍座: '水', 魚座: '水'
};

// 12ハウスが司る人生の分野（サルヴァアシュタカヴァルガのスコア表示に使う）
const HOUSE_DOMAIN = [
  { house: 1, label: '自分・身体', note: '体力、第一印象、人生全体の推進力' },
  { house: 2, label: '財・言葉', note: '自力で稼ぐ力、蓄え、話し方' },
  { house: 3, label: '行動・兄弟', note: '勇気、発信、短い移動' },
  { house: 4, label: '家庭・土台', note: '住まい、心の安定、不動産' },
  { house: 5, label: '創造・学び', note: '企画力、子ども、投資の勘' },
  { house: 6, label: '健康・克服', note: '勤勉さ、競争、体調管理' },
  { house: 7, label: '対人・契約', note: 'パートナー、取引、共同事業' },
  { house: 8, label: '変容・継承', note: '転機、相続、深い探究' },
  { house: 9, label: '幸運・信条', note: '運の後押し、学問、遠方' },
  { house: 10, label: '仕事・社会', note: '職業、評価、社会的な立場' },
  { house: 11, label: '利得・人脈', note: '収入の拡大、仲間、達成' },
  { house: 12, label: '手放し・休息', note: '出費、内面、海外、休養' }
];

// 第12章：古典の対策を、現代日本で実行できる行動に読み替える対応表
const REMEDY_MODERN = {
  sade_sati: {
    title: '基盤を組み直す調整期',
    actions: [
      '契約・サブスク・人間関係を棚卸しし、不要なものを手放す',
      '睡眠と運動の習慣を固定し、体力の土台を作る',
      '新規拡大よりも、既存の仕組みの整備に時間を配分する',
      '周囲への還元（寄付・後進の支援）を小さく続ける'
    ]
  },
  mangal_dosha: {
    title: '強い推進力の使い道を決める時期',
    actions: [
      '高強度の運動を週2〜3回、決まった曜日に入れる',
      '論争や勝ち負けの場から距離を置き、開発・制作にエネルギーを回す',
      '重要な交渉は、体調と睡眠が整っている日に設定する'
    ]
  },
  kaal_sarp: {
    title: '一点に絞って進める時期',
    actions: [
      '同時進行を減らし、優先順位の1位だけに資源を集中する',
      '長期の目標を紙に書き、定期的に見返す',
      '生活のリズムを一定に保つ'
    ]
  },
  // 古典のレメディ → 現代版の読み替え（第12章の注釈として掲載）
  classical_to_modern: [
    { classical: '黒ごま・ウラド豆の寄付', modern: '社会的なチャリティへの寄付、黒色の衣服を意識的に取り入れる' },
    { classical: '聖なる川での沐浴', modern: '自然塩を入れた入浴、名水地や温泉での休養' },
    { classical: '寺院への参拝', modern: '静かな場所で10分間、思考を止める時間を作る' }
  ]
};

// 古典の高揚・減衰・自室・定座。品位はこの表からコード側で確定させる。
const EXALTATION = {
  Sun: '牡羊座', Moon: '牡牛座', Mars: '山羊座', Mercury: '乙女座',
  Jupiter: '蟹座', Venus: '魚座', Saturn: '天秤座', Rahu: '牡牛座', Ketu: '蠍座'
};

const DEBILITATION = {
  Sun: '天秤座', Moon: '蠍座', Mars: '蟹座', Mercury: '魚座',
  Jupiter: '山羊座', Venus: '乙女座', Saturn: '牡羊座', Rahu: '蠍座', Ketu: '牡牛座'
};

const OWN_SIGNS = {
  Sun: ['獅子座'], Moon: ['蟹座'], Mars: ['牡羊座', '蠍座'],
  Mercury: ['双子座', '乙女座'], Jupiter: ['射手座', '魚座'],
  Venus: ['牡牛座', '天秤座'], Saturn: ['山羊座', '水瓶座']
};

const MOOLATRIKONA = {
  Sun: '獅子座', Moon: '牡牛座', Mars: '牡羊座', Mercury: '乙女座',
  Jupiter: '射手座', Venus: '天秤座', Saturn: '水瓶座'
};

// 惑星同士の自然的な friend / enemy（古典の定説。中立はどちらにも含めない）
const NATURAL_FRIENDS = {
  Sun: ['Moon', 'Mars', 'Jupiter'],
  Moon: ['Sun', 'Mercury'],
  Mars: ['Sun', 'Moon', 'Jupiter'],
  Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'],
  Venus: ['Mercury', 'Saturn'],
  Saturn: ['Mercury', 'Venus']
};

const NATURAL_ENEMIES = {
  Sun: ['Venus', 'Saturn'],
  Moon: [],
  Mars: ['Mercury'],
  Mercury: ['Moon'],
  Jupiter: ['Mercury', 'Venus'],
  Venus: ['Sun', 'Moon'],
  Saturn: ['Sun', 'Moon', 'Mars']
};

// ヨーガ名の日本語表記（Prokerala は英語で返すため、鑑定書では日本語を併記する）
const YOGA_JA = {
  'gajakesari yoga': 'ガジャケーサリ・ヨーガ',
  'raja yoga': 'ラージャ・ヨーガ',
  'sunapha yoga': 'スナファ・ヨーガ',
  'anapha yoga': 'アナファ・ヨーガ',
  'durudhara yoga': 'ドゥルダラ・ヨーガ',
  'duradhara yoga': 'ドゥルダラ・ヨーガ',
  'vesi yoga': 'ヴェーシ・ヨーガ',
  'vasi yoga': 'ヴァーシ・ヨーガ',
  'ubhayachari yoga': 'ウバヤチャーリ・ヨーガ',
  'daridra yoga': 'ダリドラ・ヨーガ',
  'kemadruma yoga': 'ケーマドゥルマ・ヨーガ',
  'chandra mangala yoga': 'チャンドラ・マンガラ・ヨーガ',
  'adhi yoga': 'アディ・ヨーガ',
  'budha aditya yoga': 'ブダ・アーディティヤ・ヨーガ',
  'dhana yoga': 'ダナ・ヨーガ',
  'vipreet raja yoga': 'ヴィパリータ・ラージャ・ヨーガ',
  'viparita raja yoga': 'ヴィパリータ・ラージャ・ヨーガ',
  'neecha bhanga raja yoga': 'ニーチャバンガ・ラージャ・ヨーガ',
  'panch mahapurusha yoga': 'パンチャ・マハープルシャ・ヨーガ',
  'ruchaka yoga': 'ルチャカ・ヨーガ',
  'bhadra yoga': 'バドラ・ヨーガ',
  'hamsa yoga': 'ハンサ・ヨーガ',
  'malavya yoga': 'マーラヴィヤ・ヨーガ',
  'sasa yoga': 'シャシャ・ヨーガ',
  'parivartana yoga': 'パリヴァルタナ・ヨーガ',
  'lakshmi yoga': 'ラクシュミー・ヨーガ',
  'saraswati yoga': 'サラスヴァティー・ヨーガ'
};

// サディサティ／土星通過フェーズの日本語表記
const SADE_SATI_PHASE_JA = {
  'rising': '第1段階（準備期・月の1つ手前のサインを土星が通過）',
  'peak': '第2段階（本番期・月と同じサインを土星が通過）',
  'setting': '第3段階（仕上げ期・月の次のサインを土星が通過）',
  'small panoti': '小パノーティ（月から4室を土星が通過する調整期）',
  'ashtama sani': 'アシュタマ・シャニ（月から8室を土星が通過する再編期）'
};

// 大周期（マハーダシャー）支配星ごとの季節メタファー（巻頭サマリー用）
const DASHA_SEASON = {
  Sun: '旗を立てる期',
  Moon: '育てる期',
  Mars: '切り拓く期',
  Mercury: '広げる期',
  Jupiter: '実らせる期',
  Venus: '味わう期',
  Saturn: '土をつくる期',
  Rahu: '越境する期',
  Ketu: '削ぎ落とす期'
};

module.exports = {
  SIGN_LORD,
  SIGN_ELEMENT,
  PLANET_JA,
  PLANET_DOMAIN,
  DIGNITY_SCORE,
  DIGNITY_JA,
  LIFE_STONE,
  PLANET_COLOR,
  PLANET_DIRECTION,
  WORK_STYLE,
  RHYTHM_BY_ELEMENT,
  HOUSE_DOMAIN,
  REMEDY_MODERN,
  DASHA_SEASON,
  EXALTATION,
  DEBILITATION,
  OWN_SIGNS,
  MOOLATRIKONA,
  NATURAL_FRIENDS,
  NATURAL_ENEMIES,
  YOGA_JA,
  SADE_SATI_PHASE_JA
};
