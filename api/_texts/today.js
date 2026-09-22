// 「今日の空」ウィジェット（/api/today）の表示文言。ナクシャトラの神格はサンスクリット名で共通。
// 象徴（symbol）・ティティ・曜日支配星・UI ラベルは言語別。無い言語は英語で補う。

const NAKSHATRA_DEITY = [
  'Ashwini Kumaras', 'Yama', 'Agni', 'Brahma', 'Soma', 'Rudra', 'Aditi', 'Brihaspati', 'Nagas',
  'Pitris', 'Bhaga', 'Aryaman', 'Savitar', 'Tvashtar', 'Vayu', 'Indra-Agni', 'Mitra', 'Indra',
  'Nirriti', 'Apas', 'Vishvadevas', 'Vishnu', 'Vasus', 'Varuna', 'Aja Ekapada', 'Ahir Budhnya', 'Pushan'
];

const NAKSHATRA_SYMBOL = {
  ja: ['馬の頭', '女陰（創造の門）', '剃刀・炎', '牛車', '鹿の頭', '涙のしずく', '矢筒', '牛の乳房・蓮', '巻きついた蛇',
    '王座', '寝台の前脚', '寝台の後脚', '開いた手', '輝く真珠', '風に揺れる若芽', '祝祭の門', '蓮の花', '円い護符',
    '束ねた根', '扇・象牙', '象の牙・小さな寝台', '三つの足跡', '太鼓', '空の円・千の花', '剣・二つの顔の男', '水中の蛇', '魚・太鼓'],
  en: ['Horse\'s head', 'Yoni (gateway of creation)', 'Razor, flame', 'Ox cart', 'Deer\'s head', 'Teardrop', 'Quiver of arrows', 'Cow\'s udder, lotus', 'Coiled serpent',
    'Royal throne', 'Front legs of a bed', 'Back legs of a bed', 'Open hand', 'Shining pearl', 'Young shoot in the wind', 'Festive gateway', 'Lotus flower', 'Round talisman',
    'Bundle of roots', 'Fan, elephant tusk', 'Elephant tusk, small cot', 'Three footprints', 'Drum', 'Empty circle, thousand flowers', 'Sword, two-faced man', 'Serpent in the deep', 'Fish, drum'],
  es: ['Cabeza de caballo', 'Yoni (puerta de la creación)', 'Navaja, llama', 'Carro de bueyes', 'Cabeza de ciervo', 'Lágrima', 'Carcaj de flechas', 'Ubre de vaca, loto', 'Serpiente enroscada',
    'Trono real', 'Patas delanteras de una cama', 'Patas traseras de una cama', 'Mano abierta', 'Perla brillante', 'Brote joven al viento', 'Arco festivo', 'Flor de loto', 'Talismán redondo',
    'Manojo de raíces', 'Abanico, colmillo de elefante', 'Colmillo de elefante, pequeño catre', 'Tres huellas', 'Tambor', 'Círculo vacío, mil flores', 'Espada, hombre de dos rostros', 'Serpiente de las profundidades', 'Pez, tambor'],
  pt: ['Cabeça de cavalo', 'Yoni (portal da criação)', 'Navalha, chama', 'Carro de bois', 'Cabeça de cervo', 'Lágrima', 'Aljava de flechas', 'Úbere de vaca, lótus', 'Serpente enrolada',
    'Trono real', 'Pés dianteiros de uma cama', 'Pés traseiros de uma cama', 'Mão aberta', 'Pérola brilhante', 'Broto jovem ao vento', 'Portal festivo', 'Flor de lótus', 'Talismã redondo',
    'Feixe de raízes', 'Leque, marfim de elefante', 'Marfim de elefante, pequeno catre', 'Três pegadas', 'Tambor', 'Círculo vazio, mil flores', 'Espada, homem de duas faces', 'Serpente das profundezas', 'Peixe, tambor'],
  ar: ['رأس حصان', 'يوني (بوابة الخلق)', 'شفرة، لهب', 'عربة ثيران', 'رأس غزال', 'قطرة دمع', 'جعبة سهام', 'ضرع بقرة، لوتس', 'أفعى ملتفة',
    'عرش ملكي', 'القدمان الأماميتان لسرير', 'القدمان الخلفيتان لسرير', 'يد مفتوحة', 'لؤلؤة متألقة', 'برعم يافع في الريح', 'بوابة احتفالية', 'زهرة لوتس', 'تعويذة مستديرة',
    'حزمة جذور', 'مروحة، ناب فيل', 'ناب فيل، سرير صغير', 'ثلاث خطوات', 'طبل', 'دائرة خالية، ألف زهرة', 'سيف، رجل بوجهين', 'أفعى الأعماق', 'سمكة، طبل'],
  id: ['Kepala kuda', 'Yoni (gerbang penciptaan)', 'Pisau cukur, nyala api', 'Pedati sapi', 'Kepala rusa', 'Tetesan air mata', 'Wadah anak panah', 'Ambing sapi, lotus', 'Ular melingkar',
    'Singgasana raja', 'Kaki depan ranjang', 'Kaki belakang ranjang', 'Tangan terbuka', 'Mutiara bercahaya', 'Tunas muda tertiup angin', 'Gerbang perayaan', 'Bunga lotus', 'Jimat bundar',
    'Ikatan akar', 'Kipas, gading gajah', 'Gading gajah, dipan kecil', 'Tiga jejak kaki', 'Genderang', 'Lingkaran kosong, seribu bunga', 'Pedang, pria bermuka dua', 'Ular di kedalaman', 'Ikan, genderang'],
  fr: ['Tête de cheval', 'Yoni (porte de la création)', 'Rasoir, flamme', 'Char à bœufs', 'Tête de cerf', 'Larme', 'Carquois de flèches', 'Pis de vache, lotus', 'Serpent enroulé',
    'Trône royal', 'Pieds avant d\'un lit', 'Pieds arrière d\'un lit', 'Main ouverte', 'Perle brillante', 'Jeune pousse dans le vent', 'Porche de fête', 'Fleur de lotus', 'Talisman rond',
    'Faisceau de racines', 'Éventail, défense d\'éléphant', 'Défense d\'éléphant, petit lit', 'Trois empreintes', 'Tambour', 'Cercle vide, mille fleurs', 'Épée, homme à deux visages', 'Serpent des profondeurs', 'Poisson, tambour'],
  de: ['Pferdekopf', 'Yoni (Tor der Schöpfung)', 'Rasiermesser, Flamme', 'Ochsenkarren', 'Hirschkopf', 'Träne', 'Pfeilköcher', 'Kuheuter, Lotos', 'Zusammengerollte Schlange',
    'Königsthron', 'Vorderbeine eines Bettes', 'Hinterbeine eines Bettes', 'Offene Hand', 'Leuchtende Perle', 'Junger Spross im Wind', 'Festliches Tor', 'Lotosblüte', 'Rundes Amulett',
    'Wurzelbündel', 'Fächer, Elefantenstoßzahn', 'Elefantenstoßzahn, kleine Liege', 'Drei Fußspuren', 'Trommel', 'Leerer Kreis, tausend Blüten', 'Schwert, Mann mit zwei Gesichtern', 'Schlange der Tiefe', 'Fisch, Trommel']
};

// ティティ名（1〜15 は両パクシャ共通。15 番目は白分ならプールニマー、黒分ならアマーヴァスヤー）
const TITHI = ['Pratipada', 'Dvitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dvadashi', 'Trayodashi', 'Chaturdashi'];
const TITHI_JA = ['プラティパダ', 'ドヴィティーヤ', 'トリティーヤ', 'チャトゥルティー', 'パンチャミー', 'シャシュティー', 'サプタミー', 'アシュタミー', 'ナヴァミー', 'ダシャミー', 'エーカーダシー', 'ドヴァーダシー', 'トラヨーダシー', 'チャトゥルダシー'];

const UI = {
  ja: {
    title: '今日の空', subtitle: 'ヴェーダの暦（パンチャーンガ）と、いま天にある九つの惑星',
    moon: '月', tithi: 'ティティ（月齢）', nakshatra: '今日のナクシャトラ', deity: '神格', symbol: '象徴', vara: '曜日の支配星',
    shukla: '白分（満ちていく月）', krishna: '黒分（欠けていく月）', purnima: 'プールニマー（満月）', amavasya: 'アマーヴァスヤー（新月）',
    chart: '今日のトランジット（南インド式）', retro: '逆行', entered: '今日、星座を移動', moonIn: '月は{sign}にあります',
    moonNote: '月星座が{signs}の人は、今日は気持ちの動きが大きい日。', moonGood: '月星座が{signs}の人には、追い風の一日。',
    updated: '{time} 時点', source: 'ウッジャイン（インド標準子午線）基準・サイデリアル（ラヒリ）',
    basis: '曜日・ティティ・ナクシャトラはインド標準時、曜日はウッジャインの日の出で切り替わります（日本の深夜〜早朝は前日の曜日）',
    weekday: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
    planets: { Sun: '太陽', Moon: '月', Mars: '火星', Mercury: '水星', Jupiter: '木星', Venus: '金星', Saturn: '土星', Rahu: 'ラーフ', Ketu: 'ケートゥ' },
    signs: ['牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座', '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座'],
    tithiNames: TITHI_JA
  },
  en: {
    title: 'Today\'s Sky', subtitle: 'The Vedic almanac (Panchanga) and where the nine planets stand right now',
    moon: 'Moon', tithi: 'Tithi (lunar day)', nakshatra: 'Today\'s Nakshatra', deity: 'Deity', symbol: 'Symbol', vara: 'Ruler of the day',
    shukla: 'Shukla Paksha (waxing)', krishna: 'Krishna Paksha (waning)', purnima: 'Purnima (full Moon)', amavasya: 'Amavasya (new Moon)',
    chart: 'Today\'s transits (South Indian chart)', retro: 'retrograde', entered: 'changed sign today', moonIn: 'The Moon is in {sign}',
    moonNote: 'If your Moon sign is {signs}, emotions run high today.', moonGood: 'If your Moon sign is {signs}, the day carries a tailwind.',
    updated: 'as of {time}', source: 'Ujjain meridian · sidereal (Lahiri)',
    basis: 'Weekday, tithi and nakshatra follow Indian Standard Time; the Vedic weekday changes at sunrise in Ujjain, not at midnight',
    weekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    planets: { Sun: 'Sun', Moon: 'Moon', Mars: 'Mars', Mercury: 'Mercury', Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturn', Rahu: 'Rahu', Ketu: 'Ketu' },
    signs: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'],
    tithiNames: TITHI
  },
  es: {
    title: 'El cielo de hoy', subtitle: 'El almanaque védico (Panchanga) y la posición actual de los nueve planetas',
    moon: 'Luna', tithi: 'Tithi (día lunar)', nakshatra: 'Nakshatra de hoy', deity: 'Deidad', symbol: 'Símbolo', vara: 'Regente del día',
    shukla: 'Shukla Paksha (creciente)', krishna: 'Krishna Paksha (menguante)', purnima: 'Purnima (Luna llena)', amavasya: 'Amavasya (Luna nueva)',
    chart: 'Tránsitos de hoy (carta del sur de India)', retro: 'retrógrado', entered: 'cambió de signo hoy', moonIn: 'La Luna está en {sign}',
    moonNote: 'Si tu signo lunar es {signs}, hoy las emociones se intensifican.', moonGood: 'Si tu signo lunar es {signs}, el día trae viento a favor.',
    updated: 'a las {time}', source: 'Meridiano de Ujjain · sideral (Lahiri)',
    basis: 'Día, tithi y nakshatra siguen la hora estándar de India; el día védico cambia al amanecer en Ujjain, no a medianoche',
    weekday: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    planets: { Sun: 'Sol', Moon: 'Luna', Mars: 'Marte', Mercury: 'Mercurio', Jupiter: 'Júpiter', Venus: 'Venus', Saturn: 'Saturno', Rahu: 'Rahu', Ketu: 'Ketu' },
    signs: ['Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo', 'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'],
    tithiNames: TITHI
  },
  pt: {
    title: 'O céu de hoje', subtitle: 'O almanaque védico (Panchanga) e onde estão agora os nove planetas',
    moon: 'Lua', tithi: 'Tithi (dia lunar)', nakshatra: 'Nakshatra de hoje', deity: 'Divindade', symbol: 'Símbolo', vara: 'Regente do dia',
    shukla: 'Shukla Paksha (crescente)', krishna: 'Krishna Paksha (minguante)', purnima: 'Purnima (Lua cheia)', amavasya: 'Amavasya (Lua nova)',
    chart: 'Trânsitos de hoje (mapa do sul da Índia)', retro: 'retrógrado', entered: 'mudou de signo hoje', moonIn: 'A Lua está em {sign}',
    moonNote: 'Se o seu signo lunar é {signs}, as emoções ficam à flor da pele hoje.', moonGood: 'Se o seu signo lunar é {signs}, o dia traz vento a favor.',
    updated: 'às {time}', source: 'Meridiano de Ujjain · sideral (Lahiri)',
    basis: 'Dia, tithi e nakshatra seguem o horário padrão da Índia; o dia védico muda ao nascer do sol em Ujjain, não à meia-noite',
    weekday: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
    planets: { Sun: 'Sol', Moon: 'Lua', Mars: 'Marte', Mercury: 'Mercúrio', Jupiter: 'Júpiter', Venus: 'Vênus', Saturn: 'Saturno', Rahu: 'Rahu', Ketu: 'Ketu' },
    signs: ['Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem', 'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'],
    tithiNames: TITHI
  },
  ar: {
    title: 'سماء اليوم', subtitle: 'التقويم الفيدي (بانتشانغا) ومواقع الكواكب التسعة الآن',
    moon: 'القمر', tithi: 'تيثي (اليوم القمري)', nakshatra: 'ناكشاترا اليوم', deity: 'الإله', symbol: 'الرمز', vara: 'حاكم اليوم',
    shukla: 'شوكلا باكشا (القمر المتزايد)', krishna: 'كريشنا باكشا (القمر المتناقص)', purnima: 'بورنيما (البدر)', amavasya: 'أمافاسيا (المحاق)',
    chart: 'عبور اليوم (خريطة جنوب الهند)', retro: 'تراجعي', entered: 'انتقل إلى برج جديد اليوم', moonIn: 'القمر في {sign}',
    moonNote: 'إذا كان برجك القمري {signs}، فالمشاعر قوية اليوم.', moonGood: 'إذا كان برجك القمري {signs}، فاليوم يحمل ريحًا مواتية.',
    updated: 'حتى {time}', source: 'خط زوال أوجين · فلكي (لاهيري)',
    basis: 'يتبع اليوم والتيثي والنكشترا التوقيت الهندي؛ ويتغير اليوم الفيدي عند شروق الشمس في أوجين وليس عند منتصف الليل',
    weekday: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    planets: { Sun: 'الشمس', Moon: 'القمر', Mars: 'المريخ', Mercury: 'عطارد', Jupiter: 'المشتري', Venus: 'الزهرة', Saturn: 'زحل', Rahu: 'راهو', Ketu: 'كيتو' },
    signs: ['الحمل', 'الثور', 'الجوزاء', 'السرطان', 'الأسد', 'العذراء', 'الميزان', 'العقرب', 'القوس', 'الجدي', 'الدلو', 'الحوت'],
    tithiNames: TITHI
  },
  id: {
    title: 'Langit Hari Ini', subtitle: 'Almanak Veda (Panchanga) dan posisi sembilan planet saat ini',
    moon: 'Bulan', tithi: 'Tithi (hari lunar)', nakshatra: 'Nakshatra hari ini', deity: 'Dewa', symbol: 'Simbol', vara: 'Penguasa hari',
    shukla: 'Shukla Paksha (bulan membesar)', krishna: 'Krishna Paksha (bulan mengecil)', purnima: 'Purnima (bulan purnama)', amavasya: 'Amavasya (bulan baru)',
    chart: 'Transit hari ini (bagan India Selatan)', retro: 'retrograde', entered: 'berpindah zodiak hari ini', moonIn: 'Bulan berada di {sign}',
    moonNote: 'Jika zodiak Bulan Anda {signs}, emosi terasa lebih kuat hari ini.', moonGood: 'Jika zodiak Bulan Anda {signs}, hari ini membawa angin segar.',
    updated: 'per {time}', source: 'Meridian Ujjain · sideris (Lahiri)',
    basis: 'Hari, tithi, dan nakshatra mengikuti Waktu Standar India; hari Veda berganti saat matahari terbit di Ujjain, bukan tengah malam',
    weekday: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    planets: { Sun: 'Matahari', Moon: 'Bulan', Mars: 'Mars', Mercury: 'Merkurius', Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturnus', Rahu: 'Rahu', Ketu: 'Ketu' },
    signs: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagitarius', 'Capricorn', 'Aquarius', 'Pisces'],
    tithiNames: TITHI
  },
  fr: {
    title: 'Le ciel d\'aujourd\'hui', subtitle: 'L\'almanach védique (Panchanga) et la position actuelle des neuf planètes',
    moon: 'Lune', tithi: 'Tithi (jour lunaire)', nakshatra: 'Nakshatra du jour', deity: 'Divinité', symbol: 'Symbole', vara: 'Maître du jour',
    shukla: 'Shukla Paksha (croissante)', krishna: 'Krishna Paksha (décroissante)', purnima: 'Purnima (pleine Lune)', amavasya: 'Amavasya (nouvelle Lune)',
    chart: 'Transits du jour (carte sud-indienne)', retro: 'rétrograde', entered: 'a changé de signe aujourd\'hui', moonIn: 'La Lune est en {sign}',
    moonNote: 'Si votre signe lunaire est {signs}, les émotions sont vives aujourd\'hui.', moonGood: 'Si votre signe lunaire est {signs}, la journée porte le vent en poupe.',
    updated: 'à {time}', source: 'Méridien d\'Ujjain · sidéral (Lahiri)',
    basis: 'Jour, tithi et nakshatra suivent l\'heure standard de l\'Inde ; le jour védique change au lever du soleil à Ujjain, pas à minuit',
    weekday: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
    planets: { Sun: 'Soleil', Moon: 'Lune', Mars: 'Mars', Mercury: 'Mercure', Jupiter: 'Jupiter', Venus: 'Vénus', Saturn: 'Saturne', Rahu: 'Rahu', Ketu: 'Ketu' },
    signs: ['Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge', 'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'],
    tithiNames: TITHI
  },
  de: {
    title: 'Der Himmel heute', subtitle: 'Der vedische Almanach (Panchanga) und der aktuelle Stand der neun Planeten',
    moon: 'Mond', tithi: 'Tithi (Mondtag)', nakshatra: 'Nakshatra des Tages', deity: 'Gottheit', symbol: 'Symbol', vara: 'Tagesherrscher',
    shukla: 'Shukla Paksha (zunehmend)', krishna: 'Krishna Paksha (abnehmend)', purnima: 'Purnima (Vollmond)', amavasya: 'Amavasya (Neumond)',
    chart: 'Transite heute (südindisches Horoskop)', retro: 'rückläufig', entered: 'heute Zeichenwechsel', moonIn: 'Der Mond steht in {sign}',
    moonNote: 'Ist Ihr Mondzeichen {signs}, gehen die Gefühle heute hoch.', moonGood: 'Ist Ihr Mondzeichen {signs}, hat der Tag Rückenwind.',
    updated: 'Stand {time}', source: 'Meridian von Ujjain · siderisch (Lahiri)',
    basis: 'Wochentag, Tithi und Nakshatra folgen der indischen Standardzeit; der vedische Wochentag wechselt mit dem Sonnenaufgang in Ujjain, nicht um Mitternacht',
    weekday: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    planets: { Sun: 'Sonne', Moon: 'Mond', Mars: 'Mars', Mercury: 'Merkur', Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturn', Rahu: 'Rahu', Ketu: 'Ketu' },
    signs: ['Widder', 'Stier', 'Zwillinge', 'Krebs', 'Löwe', 'Jungfrau', 'Waage', 'Skorpion', 'Schütze', 'Steinbock', 'Wassermann', 'Fische'],
    tithiNames: TITHI
  }
};

function todayText(lang) {
  return UI[lang] || UI.en;
}

function nakshatraSymbols(lang) {
  return NAKSHATRA_SYMBOL[lang] || NAKSHATRA_SYMBOL.en;
}

module.exports = { todayText, nakshatraSymbols, NAKSHATRA_DEITY };
