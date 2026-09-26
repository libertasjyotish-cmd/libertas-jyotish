// フランス語の表示語彙（完全鑑定書）。キーは en.js と同一。

const SIGN = {
  牡羊座: 'Bélier', 牡牛座: 'Taureau', 双子座: 'Gémeaux', 蟹座: 'Cancer',
  獅子座: 'Lion', 乙女座: 'Vierge', 天秤座: 'Balance', 蠍座: 'Scorpion',
  射手座: 'Sagittaire', 山羊座: 'Capricorne', 水瓶座: 'Verseau', 魚座: 'Poissons'
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
  Sun: 'le Soleil', Moon: 'la Lune', Mars: 'Mars', Mercury: 'Mercure',
  Jupiter: 'Jupiter', Venus: 'Vénus', Saturn: 'Saturne', Rahu: 'Rahu',
  Ketu: 'Ketu', Ascendant: 'Ascendant'
};

const DIGNITY = {
  exalted: 'Exalté', ownsign: 'Propre signe', own: 'Propre signe', moolatrikona: 'Moolatrikona',
  greatfriend: 'Allié fort (prospère)', friend: 'Allié (soutenu)', neutral: 'Calme (stable)',
  enemy: 'Testé (grandit par l\'effort)', greatenemy: 'Forgé par les épreuves', debilitated: 'Débilité (marge de progression)'
};

const PLANET_DOMAIN = {
  Sun: { title: 'Volonté et réalisation de soi', keywords: ['leadership', 'expression de soi', 'paternité', 'statut public'] },
  Moon: { title: 'Émotion et sécurité', keywords: ['empathie', 'imagination', 'maternité', 'rythme quotidien'] },
  Mars: { title: 'Dynamisme et compétition', keywords: ['exécution', 'percée', 'compétence technique', 'endurance'] },
  Mercury: { title: 'Intellect et communication', keywords: ['langage', 'commerce', 'analyse', 'vivacité d\'esprit'] },
  Jupiter: { title: 'Expansion et sagesse', keywords: ['apprentissage', 'mentorat', 'confiance', 'réception de la fortune'] },
  Venus: { title: 'Harmonie et beauté', keywords: ['esthétique', 'relations', 'plaisir', 'les arts'] },
  Saturn: { title: 'Persévérance et structure', keywords: ['patience', 'responsabilité', 'systèmes', 'vision à long terme'] },
  Rahu: { title: 'Expansion et désir', keywords: ['nouveaux domaines', 'franchissement des frontières', 'innovation', 'ambition'] },
  Ketu: { title: 'Lâcher-prise et maîtrise', keywords: ['questionnement', 'intuition', 'spécialisation', 'détachement'] }
};

const STONE = {
  ルビー: 'Rubis', ガーネット: 'Grenat', レッドスピネル: 'Spinelle rouge',
  パール: 'Perle', ムーンストーン: 'Pierre de lune',
  レッドコーラル: 'Corail rouge', カーネリアン: 'Cornaline',
  エメラルド: 'Émeraude', ペリドット: 'Péridot', グリーンアゲート: 'Agate verte',
  イエローサファイア: 'Saphir jaune', シトリン: 'Citrine', トパーズ: 'Topaze',
  ダイヤモンド: 'Diamant', ホワイトサファイア: 'Saphir blanc', オパール: 'Opale',
  ブルーサファイア: 'Saphir bleu', アメジスト: 'Améthyste', ラピスラズリ: 'Lapis-lazuli',
  ヘソナイト: 'Hessonite', スモーキークォーツ: 'Quartz fumé',
  キャッツアイ: "Œil de chat", タイガーアイ: "Œil de tigre"
};

const METAL = {
  ゴールド: 'Or', シルバー: 'Argent', カッパー: 'Cuivre', プラチナ: 'Platine'
};

const COLOR = {
  ディープルビー: 'Rubis profond', パールホワイト: 'Blanc perle', コーラルレッド: 'Rouge corail',
  エメラルドグリーン: 'Vert émeraude', サフランイエロー: 'Jaune safran',
  'アイボリー／ローズ': 'Ivoire / rose', ミッドナイトブルー: 'Bleu nuit',
  スモークグレー: 'Gris fumé', アースブラウン: 'Brun terre'
};

const DIRECTION = {
  東: 'Est', 西: 'Ouest', 南: 'Sud', 北: 'Nord',
  北東: 'Nord-est', 北西: 'Nord-ouest', 南東: 'Sud-est', 南西: 'Sud-ouest'
};

const ENVIRONMENT = {
  朝日の入る部屋: 'une pièce baignée par le soleil du matin',
  見晴らしの良い高所: 'une hauteur offrant une vue dégagée',
  公的機関の集まる中心部: 'un quartier central avec des institutions publiques',
  水辺: 'un lieu près de l\'eau',
  静かな住宅地: 'un quartier résidentiel calme',
  緑と余白のある空間: 'un espace verdoyant où l\'on respire',
  日当たりの強い高層階: 'un étage élevé et ensoleillé',
  活気ある市街地: 'un quartier urbain animé',
  運動できる施設の近く: 'un lieu proche d\'installations sportives',
  '書斎・作業部屋': 'un bureau ou un espace de travail',
  交通の結節点: 'un carrefour de transports',
  商業と文教が混じる地域: 'un quartier mêlant commerce et éducation',
  学びの場の近く: 'un lieu proche d\'espaces d\'apprentissage',
  歴史のある落ち着いた土地: 'un quartier établi et chargé d\'histoire',
  広く開けた空間: 'un grand espace ouvert',
  '美術館・劇場のある街': 'une ville avec des musées et des théâtres',
  手入れされた庭や公園: 'des jardins et parcs bien entretenus',
  心地よい内装の空間: 'un intérieur où l\'on se sent bien',
  落ち着いた郊外: 'une banlieue paisible',
  重厚な建築のある土地: 'un quartier à l\'architecture solide et établie',
  人の少ない静かな環境: 'un endroit calme et peu fréquenté',
  再開発地区: 'un quartier en redéveloppement',
  多国籍な街: 'une ville cosmopolite',
  新しい技術が集まる場所: 'un lieu concentrant les nouvelles technologies',
  自然に囲まれた土地: 'un lieu entouré de nature',
  生活音の少ない場所: 'un endroit avec peu de bruit de fond',
  一人になれる空間: 'un espace où vous pouvez être seul'
};

const WORK_STYLE = {
  導く: 'Diriger', 整える: 'Organiser', 伝える: 'Communiquer', 創る: 'Créer'
};

const WORK_DETAIL = {
  Sun: 'Vous donnez le meilleur de vous-même lorsque la responsabilité vous incombe clairement — dans la prise de décision plutôt que dans les comités.',
  Moon: 'Vous excellez dans un rôle qui perçoit l\'état d\'esprit des autres et apaise l\'atmosphère.',
  Mars: 'Vous vous épanouissez dans des projets courts et décisifs, et partout où une percée technique est nécessaire.',
  Mercury: 'Votre valeur grimpe en flèche dans les travaux impliquant le langage, la négociation et les chiffres.',
  Jupiter: 'L\'enseignement, le conseil et les responsabilités de confiance vous conviennent le plus naturellement.',
  Venus: 'Vous donnez votre pleine mesure là où le sens de l\'esthétique et les compétences relationnelles sont tous deux requis.',
  Saturn: 'Vous surpassez les autres dans l\'accumulation à long terme, la systématisation et le contrôle qualité.',
  Rahu: 'Vous êtes fort dans les domaines inexplorés et dans les essais et erreurs sur de nouveaux marchés.',
  Ketu: 'Une méthode de travail qui approfondit une spécialité ciblée vous convient parfaitement.'
};

const ELEMENT = { 火: 'feu', 地: 'terre', 風: 'air', 水: 'eau' };

const RHYTHM = {
  火: {
    morning: ['bougez votre corps dès le réveil', 'écrivez un seul objectif pour la journée', 'prenez la lumière du matin'],
    night: ['réduisez les écrans deux heures avant le coucher', 'préparez demain en trois lignes', 'réchauffez-vous avec une boisson chaude'],
    focus: 'Votre concentration culmine tôt le matin. Prenez les décisions lourdes avant midi.'
  },
  地: {
    morning: ['réveillez-vous à la même heure', 'rangez votre bureau le matin', 'sortez prendre l\'air'],
    night: ['réchauffez-vous avec un bain', 'remettez vos affaires à leur place', 'gardez une heure de coucher fixe'],
    focus: 'Vous vous stabilisez de la fin de matinée jusqu\'à l\'après-midi. Enchaîner des tâches bien définies est votre point fort.'
  },
  風: {
    morning: ['étirez-vous légèrement après le réveil', 'notez tout ce qui vous vient à l\'esprit', 'faites une courte promenade'],
    night: ['fixez une heure pour arrêter d\'absorber des informations', 'repensez à vos conversations', 'apaisez votre esprit par la lecture'],
    focus: 'Plusieurs courtes périodes de concentration fonctionnent mieux pour vous qu\'une longue session en solitaire.'
  },
  水: {
    morning: ['buvez de l\'eau dès le réveil', 'prenez cinq minutes de calme', 'évitez de surcharger votre emploi du temps'],
    night: ['détendez-vous dans un bain', 'écrivez vos sentiments et laissez-les aller', 'tamisez les lumières tôt'],
    focus: 'Votre sensibilité augmente après la fin de l\'après-midi. Gardez le travail créatif pour l\'après-midi et la soirée.'
  }
};

const HOUSE_DOMAIN = [
  { house: 1, label: 'Le soi et le corps', note: 'vitality, premières impressions, le moteur de toute votre vie' },
  { house: 2, label: 'Richesse et parole', note: 'gagner sa vie par soi-même, épargne, façon de s\'exprimer' },
  { house: 3, label: 'Initiative et fratrie', note: 'courage, expression de soi, courts voyages' },
  { house: 4, label: 'Foyer et fondations', note: 'lieu de vie, stabilité intérieure, propriété' },
  { house: 5, label: 'Créativité et apprentissage', note: 'idées, enfants, instinct pour l\'investissement' },
  { house: 6, label: 'Santé et dépassement', note: 'diligence, compétition, gestion de votre condition' },
  { house: 7, label: 'Relations et contrats', note: 'partenaires, accords, coentreprises' },
  { house: 8, label: 'Transformation et héritage', note: 'tournants, héritage, questionnement profond' },
  { house: 9, label: 'Fortune et croyances', note: 'la chance de votre côté, érudition, contrées lointaines' },
  { house: 10, label: 'Travail et société', note: 'profession, réputation, statut social' },
  { house: 11, label: 'Gains et réseaux', note: 'croissance des revenus, alliés, accomplissement' },
  { house: 12, label: 'Libération et repos', note: 'dépenses, vie intérieure, étranger, récupération' }
];

const DASHA_SEASON = {
  Sun: 'planter votre drapeau', Moon: 'nourrir', Mars: 'ouvrir la voie',
  Mercury: 'élargir', Jupiter: 'porter ses fruits', Venus: 'savourer',
  Saturn: 'préparer le terrain', Rahu: 'franchir les frontières', Ketu: 'se dépouiller'
};

const YOGA_GROUP = {
  'major yogas': 'Yogas majeurs',
  'chandra yogas': 'Yogas lunaires',
  'soorya yogas': 'Yogas solaires',
  'surya yogas': 'Yogas solaires',
  'nabhasa yogas': 'Yogas Nabhasa',
  'raja yogas': 'Raja yogas (placements pour le succès matériel)',
  'dhana yogas': 'Dhana yogas (placements pour la richesse)',
  'other yogas': 'Autres yogas',
  'inauspicious yogas': 'Placements nécessitant un ajustement'
};

const SADE_SATI_PHASE = {
  rising: 'Phase 1 (préparation — Saturne transite le signe précédant votre Lune)',
  peak: 'Phase 2 (apogée — Saturne transite le même signe que votre Lune)',
  setting: 'Phase 3 (achèvement — Saturne transite le signe suivant votre Lune)',
  'small panoti': 'Petite Panoti (Saturne transite le 4ème signe depuis votre Lune — une période d\'ajustement)',
  'ashtama sani': 'Ashtama Shani (Saturne transite le 8ème signe depuis votre Lune — une période de restructuration)'
};

const REMEDY = {
  sade_sati: {
    title: 'Une période pour reconstruire vos fondations',
    actions: [
      'faites le point sur vos contrats, abonnements et relations, et laissez aller ce dont vous n\'avez plus besoin',
      'corrigez vos habitudes de sommeil et d\'exercice pour reconstruire votre base physique',
      'passez du temps à mettre de l\'ordre dans les systèmes existants plutôt que de vous lancer dans de nouveaux',
      'continuez à redonner par de petits gestes (dons, soutien à ceux qui vous suivent)'
    ]
  },
  mangal_dosha: {
    title: 'Une période pour choisir où diriger votre énergie',
    actions: [
      'prévoyez des exercices à haute intensité deux ou trois jours fixes par semaine',
      'prenez du recul face aux disputes et aux concours, et investissez cette énergie dans la construction et la création',
      'planifiez les négociations importantes les jours où vous êtes reposé et en forme'
    ]
  },
  kaal_sarp: {
    title: 'Une période pour se concentrer sur une seule chose',
    actions: [
      'réduisez le travail en parallèle et concentrez vos ressources uniquement sur votre priorité absolue',
      'écrivez vos objectifs à long terme sur papier et revoyez-les régulièrement',
      'maintenez le rythme de votre vie quotidienne stable'
    ]
  },
  classical_to_modern: [
    { classical: 'faire don de sésame noir et de lentilles urad', modern: 'faire un don à une association caritative et porter délibérément du noir' },
    { classical: 'se baigner dans une rivière sacrée', modern: 'prendre un bain au sel naturel, se reposer dans une source thermale ou un lieu réputé pour son eau' },
    { classical: 'visiter un temple', modern: 'prendre dix minutes dans un endroit calme en déconnectant ses pensées' }
  ]
};

const CHAPTER_TITLE = {
  summary: 'Votre mode d\'emploi, en une page',
  ch1: 'Chapitre 1 — Le plan qui vous définit',
  ch2: 'Chapitre 2 — La planète la plus forte en vous',
  ch3: 'Chapitre 3 — La forme de la fortune avec laquelle vous êtes né',
  ch4: 'Chapitre 4 — Objets : pierres et couleurs',
  ch5: 'Chapitre 5 — Actions : habitudes et méthodes de travail',
  ch6: 'Chapitre 6 — Lieux : direction et environnement',
  ch7: 'Chapitre 7 — Votre vocation et comment utiliser vos talents',
  ch8: 'Chapitre 8 — Votre chemin vers l\'abondance',
  ch9: 'Chapitre 9 — La carte de votre vie (chronologie de toute une vie)',
  ch10: 'Chapitre 10 — Où vous en êtes en ce moment',
  ch11: 'Chapitre 11 — La période dorée à venir',
  ch12: 'Chapitre 12 — Transformer les épreuves en fondations',
  yearly_summary: 'Votre année en un coup d\'œil',
  yearly_ch1: 'Chapitre 1 — Le cycle dans lequel vous vous trouvez actuellement',
  yearly_ch2: 'Chapitre 2 — Les grands mouvements planétaires de l\'année',
  yearly_ch3: 'Chapitre 3 — Premier trimestre (les trois premiers mois)',
  yearly_ch4: 'Chapitre 4 — Deuxième trimestre',
  yearly_ch5: 'Chapitre 5 — Troisième trimestre',
  yearly_ch6: 'Chapitre 6 — Quatrième trimestre',
  yearly_ch7: 'Chapitre 7 — L\'année par thème : travail, argent, relations, bien-être',
  yearly_ch8: 'Chapitre 8 — Une année pour agir ou une année pour se préparer ? Le timing de vos grandes décisions',
  yearly_ch9: 'Chapitre 9 — Tirer le meilleur parti de cette année',
  compat_summary: 'Votre relation en un coup d\'œil',
  compat_ch1: 'Chapitre 1 — Deux plans de vie',
  compat_ch2: 'Chapitre 2 — Comment vos cœurs s\'accordent (Lune et Lune)',
  compat_ch3: 'Chapitre 3 — Ce que chacun apporte à l\'autre',
  compat_ch4: 'Chapitre 4 — Conversation et valeurs (Mercure, Soleil, Jupiter)',
  compat_ch5: 'Chapitre 5 — Dynamisme et chaleur (Mars et Vénus)',
  compat_ch6: 'Chapitre 6 — Responsabilité et endurance (Saturne)',
  compat_ch7: 'Chapitre 7 — Le sens de ce lien (pourquoi vous vous êtes rencontrés)',
  compat_ch8: 'Chapitre 8 — Quand la relation évolue (les 12 prochains mois)',
  compat_ch9: 'Chapitre 9 — Nourrir cette relation',
  compat_ch10: 'Chapitre 10 — Le score de compatibilité traditionnel (36 points)',
  career_summary: 'Votre vocation en un coup d\'œil',
  career_ch1: 'Chapitre 1 — La forme de votre vocation (10ème maison et son maître)',
  career_ch2: 'Chapitre 2 — Talents et compétences (3ème, 5ème maisons et votre planète la plus forte)',
  career_ch3: 'Chapitre 3 — Salarié ou indépendant ? (6ème, 7ème et 10ème maisons)',
  career_ch4: 'Chapitre 4 — Votre modèle financier (2ème, 11ème maisons et Ashtakavarga)',
  career_ch5: 'Chapitre 5 — Les cycles de votre vie professionnelle (Dasha)',
  career_ch6: 'Chapitre 6 — Quand votre carrière évolue (les 12 prochains mois)',
  career_ch7: 'Chapitre 7 — Un plan d\'action vers votre vocation',
  palm_summary: 'Votre Kar-Kundali en un coup d\'œil',
  palm_ch1: 'Chapitre 1 — Le plan de l\'âme (ce que dit votre thème astral)',
  palm_ch2: 'Chapitre 2 — La carte des planètes sur votre main (Navagraha, monts, doigts et lignes)',
  palm_ch3: 'Chapitre 3 — Le ciel et la terre comparés (où le thème et la paume s\'accordent ou diffèrent)',
  palm_ch4: 'Chapitre 4 — Plan initial et position actuelle (ce que l\'écart vous indique)',
  palm_ch5: 'Chapitre 5 — Marques sacrées (signes de bon augure)',
  palm_ch6: 'Chapitre 6 — Les trois karmas (accumulé, alloué, en devenir)',
  palm_ch7: 'Chapitre 7 — Liens, travail et décisions',
  palm_ch8: 'Chapitre 8 — Les 12 prochains mois',
  palm_ch9: 'Chapitre 9 — Les mains changent (une pratique d\'observation)',
  palm_ch10: 'Appendice — Indices lorsque l\'heure de naissance est incertaine',
  karma_summary: 'Le plan de votre âme en un coup d\'œil',
  karma_ch1: 'Chapitre 1 — Qui vous êtes né pour être (Lagna et Atmakaraka)',
  karma_ch2: 'Chapitre 2 — Le karma avec lequel vous êtes né (Ketu)',
  karma_ch3: 'Chapitre 3 — Les tâches et épreuves de cette vie (Rahu et Saturne)',
  karma_ch4: 'Chapitre 4 — Quand viennent les épreuves, et ce qu\'elles signifient (Sade Sati et Dasha)',
  karma_ch5: 'Chapitre 5 — La direction de votre appel (les maisons du Dharma et du Karma)',
  karma_ch6: 'Chapitre 6 — Ce que vous seul pouvez faire (Karakamsha et les trigones)',
  karma_ch7: 'Chapitre 7 — Les moments où vous vous sentez vivant (Lune, maison 5, Nakshatra)',
  karma_ch8: 'Chapitre 8 — Ce que vous êtes venu accomplir (synthèse)'
};

const REASON = {
  lifeStone: (sign, planet) => `Votre lagna (1ère maison) est en ${sign}, et son maître est ${planet}`,
  supportStone: (planet, start, end) => `Le maître de votre période majeure actuelle est ${planet} (${start}–${end})`,
  color: (planet) => `La couleur attribuée à ${planet}, maître de votre 1ère maison`,
  workStyle: (sign, planet) => `Votre 10ème maison (travail) est en ${sign}, et son maître est ${planet}`,
  selfStyle: (planet) => `Le maître de votre 1ère maison est ${planet}`,
  rhythm: (sign, element) => `Votre Lune est en ${sign}, un signe de l'élément ${element}`,
  direction1st: (planet) => `La direction attribuée à ${planet}, maître de votre 1ère maison`,
  direction10th: (planet) => `La direction attribuée à ${planet}, maître de votre 10ème maison`,
  directionRest: () => 'La direction attribuée à la Lune (repos et récupération)'
};

module.exports = {
  SIGN, NAKSHATRA, PLANET, DIGNITY, PLANET_DOMAIN, STONE, METAL, COLOR,
  DIRECTION, ENVIRONMENT, WORK_STYLE, WORK_DETAIL, ELEMENT, RHYTHM, HOUSE_DOMAIN,
  DASHA_SEASON, YOGA_GROUP, SADE_SATI_PHASE, REMEDY, CHAPTER_TITLE, REASON
};
