// ドイツ語の表示語彙（完全鑑定書）。キーは en.js と同一。

const SIGN = {
  牡羊座: 'Widder', 牡牛座: 'Stier', 双子座: 'Zwillinge', 蟹座: 'Krebs',
  獅子座: 'Löwe', 乙女座: 'Jungfrau', 天秤座: 'Waage', 蠍座: 'Skorpion',
  射手座: 'Schütze', 山羊座: 'Steinbock', 水瓶座: 'Wassermann', 魚座: 'Fische'
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
  Sun: 'die Sonne', Moon: 'der Mond', Mars: 'Mars', Mercury: 'Merkur',
  Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturn', Rahu: 'Rahu',
  Ketu: 'Ketu', Ascendant: 'Aszendent'
};

const DIGNITY = {
  exalted: 'Erhöht', ownsign: 'Eigenes Zeichen', own: 'Eigenes Zeichen', moolatrikona: 'Moolatrikona',
  greatfriend: 'Starker Verbündeter (gedeiht)', friend: 'Verbündeter (unterstützt)', neutral: 'Ruhig (beständig)',
  enemy: 'Geprüft (wächst durch Anstrengung)', greatenemy: 'Durch Prüfungen geschmiedet', debilitated: 'Geschwächt (Raum für Wachstum)'
};

const PLANET_DOMAIN = {
  Sun: { title: 'Wille und Selbstverwirklichung', keywords: ['Führung', 'Selbstausdruck', 'Vaterschaft', 'Öffentliches Ansehen'] },
  Moon: { title: 'Emotion und Sicherheit', keywords: ['Empathie', 'Fantasie', 'Mutterschaft', 'Tagesrhythmus'] },
  Mars: { title: 'Antrieb und Wettbewerb', keywords: ['Ausführung', 'Durchbruch', 'Technische Fähigkeiten', 'Ausdauer'] },
  Mercury: { title: 'Intellekt und Kommunikation', keywords: ['Sprache', 'Handel', 'Analyse', 'Schnelles Denken'] },
  Jupiter: { title: 'Expansion und Weisheit', keywords: ['Lernen', 'Mentoring', 'Vertrauen', 'Glück empfangen'] },
  Venus: { title: 'Harmonie und Schönheit', keywords: ['Ästhetik', 'Beziehungen', 'Vergnügen', 'Die Künste'] },
  Saturn: { title: 'Ausdauer und Struktur', keywords: ['Geduld', 'Verantwortung', 'Systeme', 'Langfristiges Denken'] },
  Rahu: { title: 'Expansion und Verlangen', keywords: ['Neue Felder', 'Grenzen überschreiten', 'Innovation', 'Ehrgeiz'] },
  Ketu: { title: 'Loslassen und Meisterschaft', keywords: ['Forschung', 'Intuition', 'Spezialisierung', 'Loslösung'] }
};

const STONE = {
  ルビー: 'Rubin', ガーネット: 'Granat', レッドスピネル: 'Roter Spinell',
  パール: 'Perle', ムーンストーン: 'Mondstein',
  レッドコーラル: 'Rote Koralle', カーネリアン: 'Karneol',
  エメラルド: 'Smaragd', ペリドット: 'Peridot', グリーンアゲート: 'Grüner Achat',
  イエローサファイア: 'Gelber Saphir', シトリン: 'Citrin', トパーズ: 'Topas',
  ダイヤモンド: 'Diamant', ホワイトサファイア: 'Weißer Saphir', オパール: 'Opal',
  ブルーサファイア: 'Blauer Saphir', アメジスト: 'Amethyst', ラピスラズリ: 'Lapislazuli',
  ヘソナイト: 'Hessonit', スモーキークォーツ: 'Rauchquarz',
  キャッツアイ: 'Katzenauge', タイガーアイ: 'Tigerauge'
};

const METAL = {
  ゴールド: 'Gold', シルバー: 'Silber', カッパー: 'Kupfer', プラチナ: 'Platin'
};

const COLOR = {
  ディープルビー: 'Tiefes Rubinrot', パールホワイト: 'Perlweiß', コーラルレッド: 'Korallenrot',
  エメラルドグリーン: 'Smaragdgrün', サフランイエロー: 'Safrangelb',
  'アイボリー／ローズ': 'Elfenbein / Rosé', ミッドナイトブルー: 'Mitternachtsblau',
  スモークグレー: 'Rauchgrau', アースブラウン: 'Erdbraun'
};

const DIRECTION = {
  東: 'Osten', 西: 'Westen', 南: 'Süden', 北: 'Norden',
  北東: 'Nordosten', 北西: 'Nordwesten', 南東: 'Südosten', 南西: 'Südwesten'
};

const ENVIRONMENT = {
  朝日の入る部屋: 'ein Raum, der die Morgensonne einfängt',
  見晴らしの良い高所: 'eine Anhöhe mit weitem Blick',
  公的機関の集まる中心部: 'ein zentrales Viertel mit öffentlichen Einrichtungen',
  水辺: 'ein Ort in der Nähe von Wasser',
  静かな住宅地: 'eine ruhige Wohngegend',
  緑と余白のある空間: 'ein Raum mit viel Grün und Platz zum Atmen',
  日当たりの強い高層階: 'ein sonniges oberes Stockwerk',
  活気ある市街地: 'ein lebendiges Stadtviertel',
  運動できる施設の近く: 'ein Ort in der Nähe von Sportanlagen',
  '書斎・作業部屋': 'ein Arbeitszimmer oder Büro',
  交通の結節点: 'ein Verkehrsknotenpunkt',
  商業と文教が混じる地域: 'ein Viertel, das Handel und Bildung verbindet',
  学びの場の近く: 'ein Ort in der Nähe von Bildungseinrichtungen',
  歴史のある落ち着いた土地: 'eine gewachsene Gegend mit Geschichte',
  広く開けた空間: 'ein weiter, offener Raum',
  '美術館・劇場のある街': 'eine Stadt mit Museen und Theatern',
  手入れされた庭や公園: 'gepflegte Gärten und Parks',
  心地よい内装の空間: 'ein Innenraum mit angenehmer Atmosphäre',
  落ち着いた郊外: 'ein ruhiger Vorort',
  重厚な建築のある土地: 'eine Gegend mit solider, etablierter Architektur',
  人の少ない静かな環境: 'ein ruhiger Ort mit wenigen Menschen',
  再開発地区: 'ein Stadtentwicklungsgebiet',
  多国籍な街: 'eine multinationale Stadt',
  新しい技術が集まる場所: 'ein Ort, an dem neue Technologien zusammenkommen',
  自然に囲まれた土地: 'ein von Natur umgebener Ort',
  生活音の少ない場所: 'ein Ort mit wenig Hintergrundlärm',
  一人になれる空間: 'ein Raum, in dem Sie allein sein können'
};

const WORK_STYLE = {
  導く: 'Führen', 整える: 'Organisieren', 伝える: 'Kommunizieren', 創る: 'Erschaffen'
};

const WORK_DETAIL = {
  Sun: 'Sie erbringen Ihre beste Leistung dort, wo die Verantwortung klar bei Ihnen liegt – Entscheidungen statt Komitees.',
  Moon: 'Sie erbringen Ihre beste Leistung in einer Rolle, in der Sie die Stimmung anderer lesen und den Raum beruhigen.',
  Mars: 'Sie wachsen in kurzen, entscheidenden Projekten und überall dort, wo ein technischer Durchbruch erforderlich ist.',
  Mercury: 'Ihr Wert steigt bei Arbeiten, die Sprache, Verhandlungen und Zahlen beinhalten.',
  Jupiter: 'Lehren, Beraten und das Vertrauen in Ihre Verantwortung passen am natürlichsten zu Ihnen.',
  Venus: 'Sie blühen dort auf, wo sowohl ästhetisches Gespür als auch Menschenkenntnis gefragt sind.',
  Saturn: 'Sie übertreffen andere in langfristigem Aufbau, Systematisierung und Qualitätskontrolle.',
  Rahu: 'Sie sind stark in unerforschten Gebieten und beim Ausprobieren neuer Märkte.',
  Ketu: 'Eine Arbeitsweise, die eine fokussierte Spezialisierung vertieft, passt zu Ihnen.'
};

const ELEMENT = { 火: 'Feuer', 地: 'Erde', 風: 'Luft', 水: 'Wasser' };

const RHYTHM = {
  火: {
    morning: ['bewegen Sie Ihren Körper gleich nach dem Aufwachen', 'schreiben Sie ein einziges Ziel für den Tag auf', 'tanken Sie etwas Morgenlicht'],
    night: ['reduzieren Sie die Bildschirmzeit zwei Stunden vor dem Schlafengehen', 'planen Sie den morgigen Tag in drei Zeilen', 'wärmen Sie sich mit einem heißen Getränk auf'],
    focus: 'Ihre Konzentration erreicht am frühen Morgen ihren Höhepunkt. Treffen Sie wichtige Entscheidungen vor dem Mittag.'
  },
  地: {
    morning: ['wachen Sie zur gleichen Zeit auf', 'räumen Sie morgens Ihren Schreibtisch auf', 'gehen Sie an die frische Luft'],
    night: ['wärmen Sie sich mit einem Bad auf', 'legen Sie Ihre Dinge dorthin zurück, wo sie hingehören', 'halten Sie eine feste Schlafenszeit ein'],
    focus: 'Sie stabilisieren sich vom späten Vormittag bis in den Nachmittag. Das Abarbeiten klar definierter Aufgaben ist Ihre Stärke.'
  },
  風: {
    morning: ['dehnen Sie sich leicht nach dem Aufwachen', 'notieren Sie alles, was Ihnen in den Sinn kommt', 'machen Sie einen kurzen Spaziergang'],
    night: ['legen Sie eine Zeit fest, ab der Sie keine neuen Informationen mehr aufnehmen', 'lassen Sie Ihre Gespräche Revue passieren', 'beruhigen Sie Ihren Geist durch Lesen'],
    focus: 'Mehrere kurze Konzentrationsphasen funktionieren für Sie besser als eine lange, ununterbrochene Arbeitsphase.'
  },
  水: {
    morning: ['trinken Sie Wasser gleich nach dem Aufwachen', 'nehmen Sie sich fünf ruhige Minuten', 'vermeiden Sie einen überfüllten Terminplan'],
    night: ['nehmen Sie ein entspannendes Bad', 'schreiben Sie Ihre Gefühle auf und lassen Sie sie los', 'dimmen Sie frühzeitig das Licht'],
    focus: 'Ihre Sensibilität steigt ab dem späten Nachmittag. Heben Sie sich kreative Arbeit für den Nachmittag und Abend auf.'
  }
};

const HOUSE_DOMAIN = [
  { house: 1, label: 'Selbst und Körper', note: 'Vitalität, erste Eindrücke, der Antrieb hinter Ihrem gesamten Leben' },
  { house: 2, label: 'Reichtum und Sprache', note: 'Eigener Verdienst, Ersparnisse, wie Sie sprechen' },
  { house: 3, label: 'Initiative und Geschwister', note: 'Mut, Selbstausdruck, kurze Reisen' },
  { house: 4, label: 'Zuhause und Fundamente', note: 'Wo Sie leben, innere Stabilität, Eigentum' },
  { house: 5, label: 'Kreativität und Lernen', note: 'Ideen, Kinder, Instinkt für Investitionen' },
  { house: 6, label: 'Gesundheit und Bewältigung', note: 'Fleiß, Wettbewerb, Umgang mit Ihrer Verfassung' },
  { house: 7, label: 'Beziehungen und Verträge', note: 'Partner, Geschäfte, gemeinsame Unternehmungen' },
  { house: 8, label: 'Transformation und Erbe', note: 'Wendepunkte, Erbschaft, tiefgründige Forschung' },
  { house: 9, label: 'Glück und Glauben', note: 'Rückenwind, Gelehrsamkeit, ferne Orte' },
  { house: 10, label: 'Arbeit und Gesellschaft', note: 'Beruf, Ruf, gesellschaftliches Ansehen' },
  { house: 11, label: 'Gewinne und Netzwerke', note: 'Wachsendes Einkommen, Verbündete, Errungenschaften' },
  { house: 12, label: 'Loslassen und Ruhe', note: 'Ausgaben, Innenleben, Ausland, Erholung' }
];

const DASHA_SEASON = {
  Sun: 'Ihre Flagge hissen', Moon: 'Nähren und Pflegen', Mars: 'Den Weg freimachen',
  Mercury: 'Den Horizont erweitern', Jupiter: 'Früchte tragen', Venus: 'Genießen',
  Saturn: 'Das Fundament bauen', Rahu: 'Grenzen überschreiten', Ketu: 'Sich vom Überflüssigen befreien'
};

const YOGA_GROUP = {
  'major yogas': 'Haupt-Yogas',
  'chandra yogas': 'Mond-Yogas',
  'soorya yogas': 'Sonnen-Yogas',
  'surya yogas': 'Sonnen-Yogas',
  'nabhasa yogas': 'Nabhasa-Yogas',
  'raja yogas': 'Raja-Yogas (Konstellationen für weltlichen Erfolg)',
  'dhana yogas': 'Dhana-Yogas (Konstellationen für Reichtum)',
  'other yogas': 'Andere Yogas',
  'inauspicious yogas': 'Konstellationen, die Anpassung erfordern'
};

const SADE_SATI_PHASE = {
  rising: 'Phase 1 (Vorbereitung – Saturn durchquert das Zeichen vor Ihrem Mond)',
  peak: 'Phase 2 (Höhepunkt – Saturn durchquert dasselbe Zeichen wie Ihr Mond)',
  setting: 'Phase 3 (Abschluss – Saturn durchquert das Zeichen nach Ihrem Mond)',
  'small panoti': 'Kleine Panoti (Saturn durchquert das 4. Haus von Ihrem Mond – eine Zeit der Anpassung)',
  'ashtama sani': 'Ashtama Shani (Saturn durchquert das 8. Haus von Ihrem Mond – eine Zeit der Umstrukturierung)'
};

const REMEDY = {
  sade_sati: {
    title: 'Eine Zeit, um Ihre Fundamente neu aufzubauen',
    actions: [
      'Überprüfen Sie Verträge, Abonnements und Beziehungen und lassen Sie los, was Sie nicht mehr brauchen',
      'Bringen Sie Ihre Schlaf- und Bewegungsgewohnheiten in Ordnung, um Ihre körperliche Basis zu stärken',
      'Verbringen Sie Zeit damit, bestehende Systeme aufzuräumen, anstatt in neue zu expandieren',
      'Geben Sie weiterhin im Kleinen etwas zurück (Spenden, Unterstützung von Menschen, die nach Ihnen kommen)'
    ]
  },
  mangal_dosha: {
    title: 'Eine Zeit, um zu wählen, wohin Ihr Antrieb fließt',
    actions: [
      'Planen Sie hochintensives Training an zwei oder drei festen Tagen pro Woche ein',
      'Treten Sie von Streitigkeiten und Wettbewerben zurück und stecken Sie diese Energie in den Aufbau und das Erschaffen',
      'Planen Sie wichtige Verhandlungen für Tage, an denen Sie ausgeruht und gesund sind'
    ]
  },
  kaal_sarp: {
    title: 'Eine Zeit, um sich auf eine Sache zu beschränken',
    actions: [
      'Reduzieren Sie parallele Arbeiten und konzentrieren Sie Ihre Ressourcen nur auf Ihre oberste Priorität',
      'Schreiben Sie langfristige Ziele auf Papier und überprüfen Sie diese regelmäßig',
      'Halten Sie den Rhythmus Ihres Alltags konstant'
    ]
  },
  classical_to_modern: [
    { classical: 'Spenden von schwarzem Sesam und Urad Dal', modern: 'An eine Wohltätigkeitsorganisation spenden und bewusst Schwarz tragen' },
    { classical: 'Baden in einem heiligen Fluss', modern: 'Baden mit Natursalz, Ausruhen in einer heißen Quelle oder an einem Ort, der für sein Wasser bekannt ist' },
    { classical: 'Besuch eines Tempels', modern: 'Sich zehn Minuten an einem ruhigen Ort nehmen und das Denken abschalten' }
  ]
};

const CHAPTER_TITLE = {
  summary: 'Ihre Bedienungsanleitung auf einer Seite',
  ch1: 'Kapitel 1 — Der Bauplan, der Sie sind',
  ch2: 'Kapitel 2 — Der stärkste Planet in Ihnen',
  ch3: 'Kapitel 3 — Die Form des Glücks, mit dem Sie geboren wurden',
  ch4: 'Kapitel 4 — Objekte: Steine und Farben',
  ch5: 'Kapitel 5 — Handlungen: Gewohnheiten und wie Sie arbeiten',
  ch6: 'Kapitel 6 — Orte: Richtung und Umgebung',
  ch7: 'Kapitel 7 — Ihre Berufung und wie Sie Ihre Talente nutzen',
  ch8: 'Kapitel 8 — Ihr Weg zum Überfluss',
  ch9: 'Kapitel 9 — Die Landkarte Ihres Lebens (Lebenszeitachse)',
  ch10: 'Kapitel 10 — Wo Sie gerade stehen',
  ch11: 'Kapitel 11 — Die goldene Zeit, die vor Ihnen liegt',
  ch12: 'Kapitel 12 — Prüfungen in Fundamente verwandeln',
  yearly_summary: 'Ihr Jahr auf einen Blick',
  yearly_ch1: 'Kapitel 1 — Der Zyklus, in dem Sie sich jetzt befinden',
  yearly_ch2: 'Kapitel 2 — Die großen Planetenbewegungen des Jahres',
  yearly_ch3: 'Kapitel 3 — Erstes Quartal (die ersten drei Monate)',
  yearly_ch4: 'Kapitel 4 — Zweites Quartal',
  yearly_ch5: 'Kapitel 5 — Drittes Quartal',
  yearly_ch6: 'Kapitel 6 — Viertes Quartal',
  yearly_ch7: 'Kapitel 7 — Das Jahr nach Themen: Arbeit, Geld, Beziehungen, Wohlbefinden',
  yearly_ch8: 'Kapitel 8 — Ein Jahr für Veränderungen oder ein Jahr der Vorbereitung? Das Timing Ihrer großen Entscheidungen',
  yearly_ch9: 'Kapitel 9 — Das Beste aus diesem Jahr machen',
  compat_summary: 'Ihre Beziehung auf einen Blick',
  compat_ch1: 'Kapitel 1 — Zwei Baupläne',
  compat_ch2: 'Kapitel 2 — Wie Ihre Herzen zusammenpassen (Mond und Mond)',
  compat_ch3: 'Kapitel 3 — Was jeder von Ihnen dem anderen bringt',
  compat_ch4: 'Kapitel 4 — Gespräche und Werte (Merkur, Sonne, Jupiter)',
  compat_ch5: 'Kapitel 5 — Antrieb und Wärme (Mars und Venus)',
  compat_ch6: 'Kapitel 6 — Verantwortung und Durchhaltevermögen (Saturn)',
  compat_ch7: 'Kapitel 7 — Die Bedeutung dieser Bindung (warum Sie sich getroffen haben)',
  compat_ch8: 'Kapitel 8 — Wann sich die Beziehung bewegt (die nächsten 12 Monate)',
  compat_ch9: 'Kapitel 9 — Diese Beziehung pflegen',
  compat_ch10: 'Kapitel 10 — Die traditionelle Kompatibilitätsbewertung (36 Punkte)',
  career_summary: 'Ihre Berufung auf einen Blick',
  career_ch1: 'Kapitel 1 — Die Form Ihrer Berufung (10. Haus und sein Herrscher)',
  career_ch2: 'Kapitel 2 — Talente und Fähigkeiten (3., 5. Haus und Ihr stärkster Planet)',
  career_ch3: 'Kapitel 3 — Angestellt oder selbstständig? (6., 7. und 10. Haus)',
  career_ch4: 'Kapitel 4 — Ihr Geldmuster (2., 11. Haus und Ashtakavarga)',
  career_ch5: 'Kapitel 5 — Die Zyklen Ihres Arbeitslebens (Dasha)',
  career_ch6: 'Kapitel 6 — Wann sich Ihre Karriere bewegt (die nächsten 12 Monate)',
  career_ch7: 'Kapitel 7 — Ein Aktionsplan für Ihre Berufung',
  palm_summary: 'Ihre Kar-Kundali auf einen Blick',
  palm_ch1: 'Kapitel 1 — Der Bauplan der Seele (was Ihr Geburtshoroskop sagt)',
  palm_ch2: 'Kapitel 2 — Die Planetenkarte auf Ihrer Hand (Navagraha, Berge, Finger und Linien)',
  palm_ch3: 'Kapitel 3 — Himmel und Erde im Vergleich (wo Horoskop und Handfläche übereinstimmen oder abweichen)',
  palm_ch4: 'Kapitel 4 — Gegebener Bauplan und gegenwärtige Position (worauf die Lücke Sie hinweist)',
  palm_ch5: 'Kapitel 5 — Heilige Zeichen (glückverheißende Zeichen)',
  palm_ch6: 'Kapitel 6 — Die drei Karmas (angesammelt, zugeteilt, in der Entstehung)',
  palm_ch7: 'Kapitel 7 — Bindungen, Arbeit und Entscheidungen',
  palm_ch8: 'Kapitel 8 — Die nächsten 12 Monate',
  palm_ch9: 'Kapitel 9 — Hände verändern sich (eine Praxis der Beobachtung)',
  palm_ch10: 'Anhang — Hinweise, wenn die Geburtszeit ungewiss ist',
  karma_summary: 'Der Bauplan Ihrer Seele auf einen Blick',
  karma_ch1: 'Kapitel 1 — Wer Sie zu sein geboren wurden (Lagna und Atmakaraka)',
  karma_ch2: 'Kapitel 2 — Das Karma, mit dem Sie geboren wurden (Ketu)',
  karma_ch3: 'Kapitel 3 — Die Aufgaben und Prüfungen dieses Lebens (Rahu und Saturn)',
  karma_ch4: 'Kapitel 4 — Wann die Prüfungen kommen und was sie bedeuten (Sade Sati und Dasha)',
  karma_ch5: 'Kapitel 5 — Die Richtung Ihrer Berufung (die Häuser von Dharma und Karma)',
  karma_ch6: 'Kapitel 6 — Was nur Sie tun können (Karakamsha und die Trigone)',
  karma_ch7: 'Kapitel 7 — Die Momente, in denen Sie sich lebendig fühlen (Mond, 5. Haus, Nakshatra)',
  karma_ch8: 'Kapitel 8 — Was Sie hier erfüllen sollen (Zusammenfassung)'
};

const REASON = {
  lifeStone: (sign, planet) => `Ihr Lagna (1. Haus) ist ${sign}, und sein Herrscher ist ${planet}`,
  supportStone: (planet, start, end) => `Der Herrscher Ihrer aktuellen Hauptperiode ist ${planet} (${start}–${end})`,
  color: (planet) => `Die Farbe, die ${planet} zugeordnet ist, dem Herrscher Ihres 1. Hauses`,
  workStyle: (sign, planet) => `Ihr 10. Haus (Arbeit) ist ${sign}, und sein Herrscher ist ${planet}`,
  selfStyle: (planet) => `Der Herrscher Ihres 1. Hauses ist ${planet}`,
  rhythm: (sign, element) => `Ihr Mond steht in ${sign}, einem ${element}-Zeichen`,
  direction1st: (planet) => `Die Richtung, die ${planet} zugeordnet ist, dem Herrscher Ihres 1. Hauses`,
  direction10th: (planet) => `Die Richtung, die ${planet} zugeordnet ist, dem Herrscher Ihres 10. Hauses`,
  directionRest: () => 'Die Richtung, die dem Mond zugeordnet ist (Ruhe und Erholung)'
};

module.exports = {
  SIGN, NAKSHATRA, PLANET, DIGNITY, PLANET_DOMAIN, STONE, METAL, COLOR,
  DIRECTION, ENVIRONMENT, WORK_STYLE, WORK_DETAIL, ELEMENT, RHYTHM, HOUSE_DOMAIN,
  DASHA_SEASON, YOGA_GROUP, SADE_SATI_PHASE, REMEDY, CHAPTER_TITLE, REASON
};
