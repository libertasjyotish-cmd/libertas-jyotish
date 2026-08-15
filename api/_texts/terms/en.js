// 英語の表示語彙（完全鑑定書）。キーは計算用の内部表記（日本語 / Prokerala の英字キー）。
// 他言語を追加するときは、このファイルを api/_texts/terms/<lang>.js にコピーして値だけを訳す。

const SIGN = {
  牡羊座: 'Aries', 牡牛座: 'Taurus', 双子座: 'Gemini', 蟹座: 'Cancer',
  獅子座: 'Leo', 乙女座: 'Virgo', 天秤座: 'Libra', 蠍座: 'Scorpio',
  射手座: 'Sagittarius', 山羊座: 'Capricorn', 水瓶座: 'Aquarius', 魚座: 'Pisces'
};

const NAKSHATRA = {
  アシュヴィニー: 'Ashwini', バラニー: 'Bharani', クリッティカー: 'Krittika',
  ローヒニー: 'Rohini', ムリガシラス: 'Mrigashira', アールドラー: 'Ardra',
  プナルヴァス: 'Punarvasu', プシャ: 'Pushya', アーシュレーシャ: 'Ashlesha',
  マガー: 'Magha', 'プールヴァ・パールグニー': 'Purva Phalguni',
  'ウッタラ・パールグニー': 'Uttara Phalguni', ハスタ: 'Hasta', チトラ: 'Chitra',
  スヴァーティ: 'Swati', ヴィシャーカー: 'Vishakha', アヌラーダ: 'Anuradha',
  ジェーシュタ: 'Jyeshtha', ムーラ: 'Mula', 'プールヴァ・アシャーダー': 'Purva Ashadha',
  'ウッタラ・アシャーダー': 'Uttara Ashadha', シュラヴァナ: 'Shravana',
  ダニシュター: 'Dhanishta', シャタビシャ: 'Shatabhisha',
  'プールヴァ・バードラパダー': 'Purva Bhadrapada',
  'ウッタラ・バードラパダー': 'Uttara Bhadrapada', レーヴァティー: 'Revati',
  アビジット: 'Abhijit'
};

const PLANET = {
  Sun: 'the Sun', Moon: 'the Moon', Mars: 'Mars', Mercury: 'Mercury',
  Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturn', Rahu: 'Rahu',
  Ketu: 'Ketu', Ascendant: 'Ascendant'
};

const DIGNITY = {
  exalted: 'Exalted', ownsign: 'Own sign', own: 'Own sign', moolatrikona: 'Moolatrikona',
  greatfriend: 'Great friend', friend: 'Friendly', neutral: 'Neutral',
  enemy: 'Enemy', greatenemy: 'Great enemy', debilitated: 'Debilitated'
};

const PLANET_DOMAIN = {
  Sun: { title: 'Will and self-realisation', keywords: ['leadership', 'self-expression', 'fatherhood', 'public standing'] },
  Moon: { title: 'Emotion and security', keywords: ['empathy', 'imagination', 'motherhood', 'daily rhythm'] },
  Mars: { title: 'Drive and competition', keywords: ['execution', 'breakthrough', 'technical skill', 'stamina'] },
  Mercury: { title: 'Intellect and communication', keywords: ['language', 'commerce', 'analysis', 'quick thinking'] },
  Jupiter: { title: 'Expansion and wisdom', keywords: ['learning', 'mentoring', 'trust', 'receiving fortune'] },
  Venus: { title: 'Harmony and beauty', keywords: ['aesthetics', 'relationships', 'pleasure', 'the arts'] },
  Saturn: { title: 'Persistence and structure', keywords: ['patience', 'responsibility', 'systems', 'the long game'] },
  Rahu: { title: 'Expansion and desire', keywords: ['new fields', 'crossing borders', 'innovation', 'ambition'] },
  Ketu: { title: 'Letting go and mastery', keywords: ['inquiry', 'intuition', 'specialisation', 'detachment'] }
};

const STONE = {
  ルビー: 'Ruby', ガーネット: 'Garnet', レッドスピネル: 'Red spinel',
  パール: 'Pearl', ムーンストーン: 'Moonstone',
  レッドコーラル: 'Red coral', カーネリアン: 'Carnelian',
  エメラルド: 'Emerald', ペリドット: 'Peridot', グリーンアゲート: 'Green agate',
  イエローサファイア: 'Yellow sapphire', シトリン: 'Citrine', トパーズ: 'Topaz',
  ダイヤモンド: 'Diamond', ホワイトサファイア: 'White sapphire', オパール: 'Opal',
  ブルーサファイア: 'Blue sapphire', アメジスト: 'Amethyst', ラピスラズリ: 'Lapis lazuli',
  ヘソナイト: 'Hessonite', スモーキークォーツ: 'Smoky quartz',
  キャッツアイ: "Cat's eye", タイガーアイ: "Tiger's eye"
};

const METAL = {
  ゴールド: 'Gold', シルバー: 'Silver', カッパー: 'Copper', プラチナ: 'Platinum'
};

const COLOR = {
  ディープルビー: 'Deep ruby', パールホワイト: 'Pearl white', コーラルレッド: 'Coral red',
  エメラルドグリーン: 'Emerald green', サフランイエロー: 'Saffron yellow',
  'アイボリー／ローズ': 'Ivory / rose', ミッドナイトブルー: 'Midnight blue',
  スモークグレー: 'Smoke grey', アースブラウン: 'Earth brown'
};

const DIRECTION = {
  東: 'East', 西: 'West', 南: 'South', 北: 'North',
  北東: 'North-east', 北西: 'North-west', 南東: 'South-east', 南西: 'South-west'
};

const ENVIRONMENT = {
  朝日の入る部屋: 'a room that catches the morning sun',
  見晴らしの良い高所: 'high ground with a wide view',
  公的機関の集まる中心部: 'a central district with public institutions',
  水辺: 'somewhere near water',
  静かな住宅地: 'a quiet residential area',
  緑と余白のある空間: 'a space with greenery and room to breathe',
  日当たりの強い高層階: 'a sunny upper floor',
  活気ある市街地: 'a lively urban district',
  運動できる施設の近く: 'somewhere near places to exercise',
  '書斎・作業部屋': 'a study or workroom',
  交通の結節点: 'a transport hub',
  商業と文教が混じる地域: 'an area that mixes commerce and learning',
  学びの場の近く: 'somewhere near places of learning',
  歴史のある落ち着いた土地: 'a settled area with history',
  広く開けた空間: 'a wide, open space',
  '美術館・劇場のある街': 'a town with museums and theatres',
  手入れされた庭や公園: 'well-kept gardens and parks',
  心地よい内装の空間: 'an interior that feels good to be in',
  落ち着いた郊外: 'a calm suburb',
  重厚な建築のある土地: 'an area with solid, established architecture',
  人の少ない静かな環境: 'a quiet place with few people',
  再開発地区: 'a redevelopment district',
  多国籍な街: 'a multinational town',
  新しい技術が集まる場所: 'a place where new technology gathers',
  自然に囲まれた土地: 'a place surrounded by nature',
  生活音の少ない場所: 'a place with little background noise',
  一人になれる空間: 'a space where you can be alone'
};

const WORK_STYLE = {
  導く: 'Lead', 整える: 'Organise', 伝える: 'Communicate', 創る: 'Create'
};

const WORK_DETAIL = {
  Sun: 'You perform best where responsibility is clearly yours — decisions rather than committees.',
  Moon: 'You perform best in a role that reads how others are doing and steadies the room.',
  Mars: 'You grow in short, decisive projects and wherever a technical breakthrough is needed.',
  Mercury: 'Your value jumps in work involving language, negotiation and numbers.',
  Jupiter: 'Teaching, advising and being trusted with responsibility suit you most naturally.',
  Venus: 'You come into your own where aesthetic sense and people skills are both required.',
  Saturn: 'You outclass others in long accumulation, systematisation and quality control.',
  Rahu: 'You are strong in uncharted areas and in trial and error in new markets.',
  Ketu: 'A way of working that deepens one focused specialism suits you.'
};

const ELEMENT = { 火: 'fire', 地: 'earth', 風: 'air', 水: 'water' };

const RHYTHM = {
  火: {
    morning: ['move your body as soon as you wake', 'write down a single goal for the day', 'get some morning light'],
    night: ['cut down screens two hours before bed', 'check tomorrow in three lines', 'warm up with a hot drink'],
    focus: 'Your concentration peaks in the early morning. Put heavy decisions before noon.'
  },
  地: {
    morning: ['wake at the same time', 'tidy your desk in the morning', 'step outside for fresh air'],
    night: ['warm up with a bath', 'put your things back where they belong', 'keep a fixed bedtime'],
    focus: 'You steady from late morning into the afternoon. Stacking well-defined tasks is your strength.'
  },
  風: {
    morning: ['stretch lightly after waking', 'note down whatever comes to mind', 'take a short walk'],
    night: ['set a time to stop taking in information', 'look back on your conversations', 'quiet your mind with reading'],
    focus: 'Several short bursts of focus work better for you than one long solo stretch.'
  },
  水: {
    morning: ['drink water as soon as you wake', 'take five quiet minutes', 'avoid over-packing your schedule'],
    night: ['soak in the bath', 'write feelings down and let them go', 'dim the lights early'],
    focus: 'Your sensitivity rises after late afternoon. Keep creative work for afternoon and evening.'
  }
};

const HOUSE_DOMAIN = [
  { house: 1, label: 'Self and body', note: 'vitality, first impressions, the drive behind your whole life' },
  { house: 2, label: 'Wealth and speech', note: 'earning by your own hand, savings, how you speak' },
  { house: 3, label: 'Initiative and siblings', note: 'courage, self-expression, short journeys' },
  { house: 4, label: 'Home and foundations', note: 'where you live, inner stability, property' },
  { house: 5, label: 'Creativity and learning', note: 'ideas, children, instinct for investment' },
  { house: 6, label: 'Health and overcoming', note: 'diligence, competition, managing your condition' },
  { house: 7, label: 'Relationships and contracts', note: 'partners, deals, joint ventures' },
  { house: 8, label: 'Transformation and inheritance', note: 'turning points, inheritance, deep inquiry' },
  { house: 9, label: 'Fortune and beliefs', note: 'luck at your back, scholarship, distant places' },
  { house: 10, label: 'Work and society', note: 'profession, reputation, social standing' },
  { house: 11, label: 'Gains and networks', note: 'growing income, allies, achievement' },
  { house: 12, label: 'Release and rest', note: 'expenditure, inner life, abroad, recuperation' }
];

const DASHA_SEASON = {
  Sun: 'planting your flag', Moon: 'nurturing', Mars: 'clearing the way',
  Mercury: 'broadening', Jupiter: 'bearing fruit', Venus: 'savouring',
  Saturn: 'building the ground', Rahu: 'crossing borders', Ketu: 'stripping away'
};

const YOGA_GROUP = {
  'major yogas': 'Major yogas',
  'chandra yogas': 'Lunar yogas',
  'soorya yogas': 'Solar yogas',
  'surya yogas': 'Solar yogas',
  'nabhasa yogas': 'Nabhasa yogas',
  'raja yogas': 'Raja yogas (placements for worldly success)',
  'dhana yogas': 'Dhana yogas (placements for wealth)',
  'other yogas': 'Other yogas',
  'inauspicious yogas': 'Placements that need adjusting'
};

const SADE_SATI_PHASE = {
  rising: 'Phase 1 (preparation — Saturn transits the sign before your Moon)',
  peak: 'Phase 2 (peak — Saturn transits the same sign as your Moon)',
  setting: 'Phase 3 (completion — Saturn transits the sign after your Moon)',
  'small panoti': 'Small Panoti (Saturn transits the 4th from your Moon — a period of adjustment)',
  'ashtama sani': 'Ashtama Shani (Saturn transits the 8th from your Moon — a period of restructuring)'
};

const REMEDY = {
  sade_sati: {
    title: 'A period for rebuilding your foundations',
    actions: [
      'take stock of contracts, subscriptions and relationships, and let go of what you do not need',
      'fix your sleep and exercise habits to rebuild physical ground',
      'spend time tidying existing systems rather than expanding into new ones',
      'keep giving back in small ways (donations, supporting people coming up behind you)'
    ]
  },
  mangal_dosha: {
    title: 'A period for choosing where your drive goes',
    actions: [
      'put high-intensity exercise in on two or three fixed days a week',
      'step back from arguments and contests, and put that energy into building and making',
      'schedule important negotiations for days when you are rested and well'
    ]
  },
  kaal_sarp: {
    title: 'A period for narrowing to one thing',
    actions: [
      'reduce parallel work and concentrate resources on your top priority only',
      'write long-term goals on paper and revisit them regularly',
      'keep the rhythm of your daily life steady'
    ]
  },
  classical_to_modern: [
    { classical: 'donating black sesame and urad dal', modern: 'donating to a charity, and deliberately wearing black' },
    { classical: 'bathing in a sacred river', modern: 'bathing with natural salt, resting at a hot spring or somewhere known for its water' },
    { classical: 'visiting a temple', modern: 'taking ten minutes somewhere quiet with your thinking switched off' }
  ]
};

const CHAPTER_TITLE = {
  summary: 'Your owner’s manual, on one page',
  ch1: 'Chapter 1 — The blueprint that is you',
  ch2: 'Chapter 2 — The strongest planet within you',
  ch3: 'Chapter 3 — The shape of the fortune you were born with',
  ch4: 'Chapter 4 — Objects: stones and colours',
  ch5: 'Chapter 5 — Actions: habits and how you work',
  ch6: 'Chapter 6 — Places: direction and environment',
  ch7: 'Chapter 7 — Your calling and how to use your talents',
  ch8: 'Chapter 8 — Your route to abundance',
  ch9: 'Chapter 9 — The map of your life (lifetime timeline)',
  ch10: 'Chapter 10 — Where you stand right now',
  ch11: 'Chapter 11 — The golden period ahead',
  ch12: 'Chapter 12 — Turning trials into foundations'
};

const REASON = {
  lifeStone: (sign, planet) => `Your lagna (1st house) is ${sign}, and its lord is ${planet}`,
  supportStone: (planet, start, end) => `The lord of your current major period is ${planet} (${start}–${end})`,
  color: (planet) => `The colour attributed to ${planet}, lord of your 1st house`,
  workStyle: (sign, planet) => `Your 10th house (work) is ${sign}, and its lord is ${planet}`,
  selfStyle: (planet) => `The lord of your 1st house is ${planet}`,
  rhythm: (sign, element) => `Your Moon is in ${sign}, a ${element} sign`,
  direction1st: (planet) => `The direction attributed to ${planet}, lord of your 1st house`,
  direction10th: (planet) => `The direction attributed to ${planet}, lord of your 10th house`,
  directionRest: () => 'The direction attributed to the Moon (rest and recovery)'
};

module.exports = {
  SIGN, NAKSHATRA, PLANET, DIGNITY, PLANET_DOMAIN, STONE, METAL, COLOR,
  DIRECTION, ENVIRONMENT, WORK_STYLE, WORK_DETAIL, ELEMENT, RHYTHM, HOUSE_DOMAIN,
  DASHA_SEASON, YOGA_GROUP, SADE_SATI_PHASE, REMEDY, CHAPTER_TITLE, REASON
};
