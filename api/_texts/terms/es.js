// スペイン語の表示語彙（完全鑑定書）。キーは計算用の内部表記（日本語 / Prokerala の英字キー）。

const SIGN = {
  牡羊座: 'Aries', 牡牛座: 'Tauro', 双子座: 'Géminis', 蟹座: 'Cáncer',
  獅子座: 'Leo', 乙女座: 'Virgo', 天秤座: 'Libra', 蠍座: 'Escorpio',
  射手座: 'Sagitario', 山羊座: 'Capricornio', 水瓶座: 'Acuario', 魚座: 'Piscis'
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
  Sun: 'el Sol', Moon: 'la Luna', Mars: 'Marte', Mercury: 'Mercurio',
  Jupiter: 'Júpiter', Venus: 'Venus', Saturn: 'Saturno', Rahu: 'Rahu',
  Ketu: 'Ketu', Ascendant: 'Ascendente'
};

const DIGNITY = {
  exalted: 'Exaltado', ownsign: 'Signo propio', own: 'Signo propio', moolatrikona: 'Moolatrikona',
  greatfriend: 'Gran amigo', friend: 'Amistoso', neutral: 'Neutral',
  enemy: 'Enemigo', greatenemy: 'Gran enemigo', debilitated: 'En caída'
};

const PLANET_DOMAIN = {
  Sun: { title: 'Voluntad y realización personal', keywords: ['liderazgo', 'expresión de uno mismo', 'paternidad', 'proyección pública'] },
  Moon: { title: 'Emoción y seguridad', keywords: ['empatía', 'imaginación', 'maternidad', 'ritmo diario'] },
  Mars: { title: 'Impulso y competición', keywords: ['ejecución', 'avance decisivo', 'destreza técnica', 'resistencia'] },
  Mercury: { title: 'Intelecto y comunicación', keywords: ['lenguaje', 'comercio', 'análisis', 'agilidad mental'] },
  Jupiter: { title: 'Expansión y sabiduría', keywords: ['aprendizaje', 'mentoría', 'confianza', 'recibir fortuna'] },
  Venus: { title: 'Armonía y belleza', keywords: ['estética', 'relaciones', 'disfrute', 'las artes'] },
  Saturn: { title: 'Constancia y estructura', keywords: ['paciencia', 'responsabilidad', 'sistemas', 'el largo plazo'] },
  Rahu: { title: 'Expansión y deseo', keywords: ['campos nuevos', 'cruzar fronteras', 'innovación', 'ambición'] },
  Ketu: { title: 'Soltar y dominar', keywords: ['indagación', 'intuición', 'especialización', 'desapego'] }
};

const STONE = {
  ルビー: 'Rubí', ガーネット: 'Granate', レッドスピネル: 'Espinela roja',
  パール: 'Perla', ムーンストーン: 'Piedra de luna',
  レッドコーラル: 'Coral rojo', カーネリアン: 'Cornalina',
  エメラルド: 'Esmeralda', ペリドット: 'Peridoto', グリーンアゲート: 'Ágata verde',
  イエローサファイア: 'Zafiro amarillo', シトリン: 'Citrino', トパーズ: 'Topacio',
  ダイヤモンド: 'Diamante', ホワイトサファイア: 'Zafiro blanco', オパール: 'Ópalo',
  ブルーサファイア: 'Zafiro azul', アメジスト: 'Amatista', ラピスラズリ: 'Lapislázuli',
  ヘソナイト: 'Hesonita', スモーキークォーツ: 'Cuarzo ahumado',
  キャッツアイ: 'Ojo de gato', タイガーアイ: 'Ojo de tigre'
};

const METAL = {
  ゴールド: 'Oro', シルバー: 'Plata', カッパー: 'Cobre', プラチナ: 'Platino'
};

const COLOR = {
  ディープルビー: 'Rubí intenso', パールホワイト: 'Blanco perla', コーラルレッド: 'Rojo coral',
  エメラルドグリーン: 'Verde esmeralda', サフランイエロー: 'Amarillo azafrán',
  'アイボリー／ローズ': 'Marfil / rosa', ミッドナイトブルー: 'Azul medianoche',
  スモークグレー: 'Gris humo', アースブラウン: 'Marrón tierra'
};

const DIRECTION = {
  東: 'Este', 西: 'Oeste', 南: 'Sur', 北: 'Norte',
  北東: 'Noreste', 北西: 'Noroeste', 南東: 'Sureste', 南西: 'Suroeste'
};

const ENVIRONMENT = {
  朝日の入る部屋: 'una habitación que recibe el sol de la mañana',
  見晴らしの良い高所: 'un lugar elevado con vistas amplias',
  公的機関の集まる中心部: 'un centro urbano con instituciones públicas',
  水辺: 'algún sitio cerca del agua',
  静かな住宅地: 'una zona residencial tranquila',
  緑と余白のある空間: 'un espacio con verde y aire alrededor',
  日当たりの強い高層階: 'una planta alta muy soleada',
  活気ある市街地: 'un barrio urbano con vida',
  運動できる施設の近く: 'cerca de sitios donde hacer ejercicio',
  '書斎・作業部屋': 'un estudio o un cuarto de trabajo',
  交通の結節点: 'un nudo de transporte',
  商業と文教が混じる地域: 'una zona que mezcla comercio y estudio',
  学びの場の近く: 'cerca de lugares de aprendizaje',
  歴史のある落ち着いた土地: 'un lugar asentado y con historia',
  広く開けた空間: 'un espacio amplio y despejado',
  '美術館・劇場のある街': 'una ciudad con museos y teatros',
  手入れされた庭や公園: 'jardines y parques bien cuidados',
  心地よい内装の空間: 'un interior en el que se está a gusto',
  落ち着いた郊外: 'unas afueras tranquilas',
  重厚な建築のある土地: 'una zona de arquitectura sólida y consolidada',
  人の少ない静かな環境: 'un lugar tranquilo con poca gente',
  再開発地区: 'un distrito en remodelación',
  多国籍な街: 'una ciudad multinacional',
  新しい技術が集まる場所: 'un lugar donde se concentra la tecnología nueva',
  自然に囲まれた土地: 'un lugar rodeado de naturaleza',
  生活音の少ない場所: 'un lugar con poco ruido de fondo',
  一人になれる空間: 'un espacio donde puedas estar a solas'
};

const WORK_STYLE = {
  導く: 'Liderar', 整える: 'Ordenar', 伝える: 'Comunicar', 創る: 'Crear'
};

const WORK_DETAIL = {
  Sun: 'Rindes al máximo donde la responsabilidad es claramente tuya: decisiones, no comités.',
  Moon: 'Rindes al máximo en un papel que percibe cómo están los demás y calma el ambiente.',
  Mars: 'Creces en proyectos cortos y decisivos y allí donde hace falta un avance técnico.',
  Mercury: 'Tu valor se dispara en trabajos con lenguaje, negociación y números.',
  Jupiter: 'Enseñar, asesorar y recibir responsabilidad por confianza son lo que más te encaja.',
  Venus: 'Te creces donde se piden a la vez sentido estético y trato con la gente.',
  Saturn: 'Destacas en la acumulación a largo plazo, la sistematización y el control de calidad.',
  Rahu: 'Eres fuerte en terrenos inexplorados y en el ensayo y error de mercados nuevos.',
  Ketu: 'Te va una forma de trabajar que profundiza en una sola especialidad.'
};

const ELEMENT = { 火: 'fuego', 地: 'tierra', 風: 'aire', 水: 'agua' };

const RHYTHM = {
  火: {
    morning: ['mueve el cuerpo nada más despertar', 'anota un único objetivo del día', 'toma algo de luz matinal'],
    night: ['reduce las pantallas dos horas antes de dormir', 'repasa el día siguiente en tres líneas', 'entra en calor con una bebida caliente'],
    focus: 'Tu concentración alcanza el pico a primera hora. Deja las decisiones pesadas para antes del mediodía.'
  },
  地: {
    morning: ['despiértate siempre a la misma hora', 'ordena tu mesa por la mañana', 'sal a tomar el aire'],
    night: ['entra en calor con un baño', 'devuelve cada cosa a su sitio', 'mantén una hora fija para acostarte'],
    focus: 'Te estabilizas desde media mañana hasta la tarde. Encadenar tareas bien definidas es tu fuerte.'
  },
  風: {
    morning: ['estírate un poco al levantarte', 'apunta lo que se te venga a la cabeza', 'da un paseo corto'],
    night: ['fija una hora para dejar de recibir información', 'repasa tus conversaciones', 'calma la mente leyendo'],
    focus: 'Varios tramos cortos de concentración te funcionan mejor que uno largo en solitario.'
  },
  水: {
    morning: ['bebe agua nada más despertar', 'tómate cinco minutos en silencio', 'evita llenar demasiado la agenda'],
    night: ['date un buen baño', 'escribe lo que sientes y suéltalo', 'baja las luces pronto'],
    focus: 'Tu sensibilidad sube a partir del final de la tarde. Reserva el trabajo creativo para la tarde y la noche.'
  }
};

const HOUSE_DOMAIN = [
  { house: 1, label: 'Yo y cuerpo', note: 'vitalidad, primera impresión, el impulso que recorre toda tu vida' },
  { house: 2, label: 'Riqueza y palabra', note: 'ganar con tus propias manos, ahorro, tu forma de hablar' },
  { house: 3, label: 'Iniciativa y hermanos', note: 'valentía, expresión propia, viajes cortos' },
  { house: 4, label: 'Hogar y cimientos', note: 'dónde vives, estabilidad interior, propiedades' },
  { house: 5, label: 'Creatividad y aprendizaje', note: 'ideas, hijos, instinto para invertir' },
  { house: 6, label: 'Salud y superación', note: 'constancia, competencia, cuidado de tu estado' },
  { house: 7, label: 'Relaciones y contratos', note: 'pareja, acuerdos, proyectos conjuntos' },
  { house: 8, label: 'Transformación y herencia', note: 'puntos de inflexión, herencia, indagación profunda' },
  { house: 9, label: 'Fortuna y creencias', note: 'la suerte que te empuja, estudio, lugares lejanos' },
  { house: 10, label: 'Trabajo y sociedad', note: 'profesión, reputación, posición social' },
  { house: 11, label: 'Ganancias y redes', note: 'ingresos que crecen, aliados, logros' },
  { house: 12, label: 'Soltar y descansar', note: 'gasto, vida interior, el extranjero, recuperación' }
];

const DASHA_SEASON = {
  Sun: 'plantar tu bandera', Moon: 'cuidar y nutrir', Mars: 'abrir camino',
  Mercury: 'ampliar', Jupiter: 'dar fruto', Venus: 'saborear',
  Saturn: 'asentar el terreno', Rahu: 'cruzar fronteras', Ketu: 'desprenderse'
};

const YOGA_GROUP = {
  'major yogas': 'Yogas principales',
  'chandra yogas': 'Yogas lunares',
  'soorya yogas': 'Yogas solares',
  'surya yogas': 'Yogas solares',
  'nabhasa yogas': 'Yogas nabhasa',
  'raja yogas': 'Raja yogas (posiciones de éxito mundano)',
  'dhana yogas': 'Dhana yogas (posiciones de riqueza)',
  'other yogas': 'Otros yogas',
  'inauspicious yogas': 'Posiciones que conviene ajustar'
};

const SADE_SATI_PHASE = {
  rising: 'Fase 1 (preparación: Saturno transita el signo anterior a tu Luna)',
  peak: 'Fase 2 (culminación: Saturno transita el mismo signo que tu Luna)',
  setting: 'Fase 3 (cierre: Saturno transita el signo posterior a tu Luna)',
  'small panoti': 'Pequeño Panoti (Saturno transita la casa 4 desde tu Luna: periodo de ajuste)',
  'ashtama sani': 'Ashtama Shani (Saturno transita la casa 8 desde tu Luna: periodo de reestructuración)'
};

const REMEDY = {
  sade_sati: {
    title: 'Un periodo para reconstruir tus cimientos',
    actions: [
      'revisa contratos, suscripciones y relaciones, y suelta lo que no necesitas',
      'ordena tu sueño y tu ejercicio para recuperar base física',
      'dedica el tiempo a poner en orden lo que ya tienes en lugar de abrir cosas nuevas',
      'sigue devolviendo algo en pequeño (donaciones, apoyar a quienes vienen detrás)'
    ]
  },
  mangal_dosha: {
    title: 'Un periodo para elegir a dónde va tu empuje',
    actions: [
      'coloca ejercicio intenso dos o tres días fijos por semana',
      'apártate de discusiones y pulsos, y lleva esa energía a construir y crear',
      'programa las negociaciones importantes para días en que estés descansado y bien'
    ]
  },
  kaal_sarp: {
    title: 'Un periodo para reducirlo todo a una sola cosa',
    actions: [
      'reduce los frentes abiertos y concentra recursos solo en tu prioridad principal',
      'escribe tus metas a largo plazo en papel y vuelve a ellas con regularidad',
      'mantén estable el ritmo de tu vida diaria'
    ]
  },
  classical_to_modern: [
    { classical: 'donar sésamo negro y urad dal', modern: 'donar a una causa y vestir de negro a propósito' },
    { classical: 'bañarse en un río sagrado', modern: 'bañarse con sal natural, descansar en un balneario o en un lugar conocido por sus aguas' },
    { classical: 'visitar un templo', modern: 'tomarte diez minutos en un sitio tranquilo con la cabeza apagada' }
  ]
};

const CHAPTER_TITLE = {
  summary: 'Tu manual de instrucciones, en una página',
  ch1: 'Capítulo 1 — El plano que eres tú',
  ch2: 'Capítulo 2 — El planeta más fuerte dentro de ti',
  ch3: 'Capítulo 3 — La forma de la fortuna con la que naciste',
  ch4: 'Capítulo 4 — Objetos: piedras y colores',
  ch5: 'Capítulo 5 — Acciones: hábitos y formas de trabajar',
  ch6: 'Capítulo 6 — Lugares: dirección y entorno',
  ch7: 'Capítulo 7 — Tu vocación y cómo usar tus talentos',
  ch8: 'Capítulo 8 — Tu ruta hacia la abundancia',
  ch9: 'Capítulo 9 — El mapa de tu vida (línea temporal vital)',
  ch10: 'Capítulo 10 — Dónde te encuentras ahora',
  ch11: 'Capítulo 11 — El periodo dorado que llega',
  ch12: 'Capítulo 12 — Convertir las pruebas en cimientos'
};

const REASON = {
  lifeStone: (sign, planet) => `Tu lagna (casa 1) está en ${sign}, y su regente es ${planet}`,
  supportStone: (planet, start, end) => `El regente de tu periodo mayor actual es ${planet} (${start}–${end})`,
  color: (planet) => `El color atribuido a ${planet}, regente de tu casa 1`,
  workStyle: (sign, planet) => `Tu casa 10 (trabajo) está en ${sign}, y su regente es ${planet}`,
  selfStyle: (planet) => `El regente de tu casa 1 es ${planet}`,
  rhythm: (sign, element) => `Tu Luna está en ${sign}, un signo de ${element}`,
  direction1st: (planet) => `La dirección atribuida a ${planet}, regente de tu casa 1`,
  direction10th: (planet) => `La dirección atribuida a ${planet}, regente de tu casa 10`,
  directionRest: () => 'La dirección atribuida a la Luna (descanso y recuperación)'
};

module.exports = {
  SIGN, NAKSHATRA, PLANET, DIGNITY, PLANET_DOMAIN, STONE, METAL, COLOR,
  DIRECTION, ENVIRONMENT, WORK_STYLE, WORK_DETAIL, ELEMENT, RHYTHM, HOUSE_DOMAIN,
  DASHA_SEASON, YOGA_GROUP, SADE_SATI_PHASE, REMEDY, CHAPTER_TITLE, REASON
};
