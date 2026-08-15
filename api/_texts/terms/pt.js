// ポルトガル語の表示語彙（完全鑑定書）。キーは計算用の内部表記（日本語 / Prokerala の英字キー）。

const SIGN = {
  牡羊座: 'Áries', 牡牛座: 'Touro', 双子座: 'Gêmeos', 蟹座: 'Câncer',
  獅子座: 'Leão', 乙女座: 'Virgem', 天秤座: 'Libra', 蠍座: 'Escorpião',
  射手座: 'Sagitário', 山羊座: 'Capricórnio', 水瓶座: 'Aquário', 魚座: 'Peixes'
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
  Sun: 'o Sol', Moon: 'a Lua', Mars: 'Marte', Mercury: 'Mercúrio',
  Jupiter: 'Júpiter', Venus: 'Vênus', Saturn: 'Saturno', Rahu: 'Rahu',
  Ketu: 'Ketu', Ascendant: 'Ascendente'
};

const DIGNITY = {
  exalted: 'Exaltado', ownsign: 'Signo próprio', own: 'Signo próprio', moolatrikona: 'Moolatrikona',
  greatfriend: 'Grande amigo', friend: 'Amistoso', neutral: 'Neutro',
  enemy: 'Inimigo', greatenemy: 'Grande inimigo', debilitated: 'Em queda'
};

const PLANET_DOMAIN = {
  Sun: { title: 'Vontade e realização pessoal', keywords: ['liderança', 'expressão de si', 'paternidade', 'projeção pública'] },
  Moon: { title: 'Emoção e segurança', keywords: ['empatia', 'imaginação', 'maternidade', 'ritmo diário'] },
  Mars: { title: 'Impulso e competição', keywords: ['execução', 'avanço decisivo', 'habilidade técnica', 'resistência'] },
  Mercury: { title: 'Intelecto e comunicação', keywords: ['linguagem', 'comércio', 'análise', 'raciocínio rápido'] },
  Jupiter: { title: 'Expansão e sabedoria', keywords: ['aprendizado', 'mentoria', 'confiança', 'receber a boa sorte'] },
  Venus: { title: 'Harmonia e beleza', keywords: ['estética', 'relações', 'prazer', 'as artes'] },
  Saturn: { title: 'Persistência e estrutura', keywords: ['paciência', 'responsabilidade', 'sistemas', 'o longo prazo'] },
  Rahu: { title: 'Expansão e desejo', keywords: ['campos novos', 'cruzar fronteiras', 'inovação', 'ambição'] },
  Ketu: { title: 'Soltar e aprofundar', keywords: ['investigação', 'intuição', 'especialização', 'desapego'] }
};

const STONE = {
  ルビー: 'Rubi', ガーネット: 'Granada', レッドスピネル: 'Espinélio vermelho',
  パール: 'Pérola', ムーンストーン: 'Pedra da lua',
  レッドコーラル: 'Coral vermelho', カーネリアン: 'Cornalina',
  エメラルド: 'Esmeralda', ペリドット: 'Peridoto', グリーンアゲート: 'Ágata verde',
  イエローサファイア: 'Safira amarela', シトリン: 'Citrino', トパーズ: 'Topázio',
  ダイヤモンド: 'Diamante', ホワイトサファイア: 'Safira branca', オパール: 'Opala',
  ブルーサファイア: 'Safira azul', アメジスト: 'Ametista', ラピスラズリ: 'Lápis-lazúli',
  ヘソナイト: 'Hessonita', スモーキークォーツ: 'Quartzo fumê',
  キャッツアイ: 'Olho de gato', タイガーアイ: 'Olho de tigre'
};

const METAL = {
  ゴールド: 'Ouro', シルバー: 'Prata', カッパー: 'Cobre', プラチナ: 'Platina'
};

const COLOR = {
  ディープルビー: 'Rubi profundo', パールホワイト: 'Branco pérola', コーラルレッド: 'Vermelho coral',
  エメラルドグリーン: 'Verde esmeralda', サフランイエロー: 'Amarelo açafrão',
  'アイボリー／ローズ': 'Marfim / rosa', ミッドナイトブルー: 'Azul meia-noite',
  スモークグレー: 'Cinza fumaça', アースブラウン: 'Marrom terra'
};

const DIRECTION = {
  東: 'Leste', 西: 'Oeste', 南: 'Sul', 北: 'Norte',
  北東: 'Nordeste', 北西: 'Noroeste', 南東: 'Sudeste', 南西: 'Sudoeste'
};

const ENVIRONMENT = {
  朝日の入る部屋: 'um quarto que recebe o sol da manhã',
  見晴らしの良い高所: 'um ponto alto com vista ampla',
  公的機関の集まる中心部: 'um centro com instituições públicas',
  水辺: 'algum lugar perto da água',
  静かな住宅地: 'um bairro residencial tranquilo',
  緑と余白のある空間: 'um espaço com verde e ar ao redor',
  日当たりの強い高層階: 'um andar alto bem ensolarado',
  活気ある市街地: 'uma área urbana movimentada',
  運動できる施設の近く: 'perto de lugares para se exercitar',
  '書斎・作業部屋': 'um escritório ou uma sala de trabalho',
  交通の結節点: 'um nó de transporte',
  商業と文教が混じる地域: 'uma região que mistura comércio e estudo',
  学びの場の近く: 'perto de lugares de aprendizado',
  歴史のある落ち着いた土地: 'um lugar assentado e com história',
  広く開けた空間: 'um espaço amplo e aberto',
  '美術館・劇場のある街': 'uma cidade com museus e teatros',
  手入れされた庭や公園: 'jardins e parques bem cuidados',
  心地よい内装の空間: 'um interior em que dá gosto ficar',
  落ち着いた郊外: 'um subúrbio calmo',
  重厚な建築のある土地: 'uma área de arquitetura sólida e consolidada',
  人の少ない静かな環境: 'um lugar tranquilo com pouca gente',
  再開発地区: 'um distrito em requalificação',
  多国籍な街: 'uma cidade multinacional',
  新しい技術が集まる場所: 'um lugar onde a tecnologia nova se concentra',
  自然に囲まれた土地: 'um lugar cercado de natureza',
  生活音の少ない場所: 'um lugar com pouco ruído de fundo',
  一人になれる空間: 'um espaço onde você pode ficar sozinho'
};

const WORK_STYLE = {
  導く: 'Liderar', 整える: 'Organizar', 伝える: 'Comunicar', 創る: 'Criar'
};

const WORK_DETAIL = {
  Sun: 'Você rende mais onde a responsabilidade é claramente sua: decisões, não comitês.',
  Moon: 'Você rende mais num papel que percebe como os outros estão e acalma o ambiente.',
  Mars: 'Você cresce em projetos curtos e decisivos e onde é preciso um avanço técnico.',
  Mercury: 'Seu valor dispara em trabalhos que envolvem linguagem, negociação e números.',
  Jupiter: 'Ensinar, aconselhar e receber responsabilidade por confiança combinam com você.',
  Venus: 'Você brilha onde se exigem ao mesmo tempo senso estético e trato com pessoas.',
  Saturn: 'Você se destaca no acúmulo de longo prazo, na sistematização e no controle de qualidade.',
  Rahu: 'Você é forte em terrenos inexplorados e na tentativa e erro de mercados novos.',
  Ketu: 'Combina com você um jeito de trabalhar que aprofunda uma única especialidade.'
};

const ELEMENT = { 火: 'fogo', 地: 'terra', 風: 'ar', 水: 'água' };

const RHYTHM = {
  火: {
    morning: ['mexa o corpo assim que acordar', 'anote um único objetivo do dia', 'tome um pouco de luz da manhã'],
    night: ['reduza as telas duas horas antes de dormir', 'revise o dia seguinte em três linhas', 'aqueça-se com uma bebida quente'],
    focus: 'Sua concentração atinge o pico logo cedo. Deixe as decisões pesadas para antes do meio-dia.'
  },
  地: {
    morning: ['acorde sempre no mesmo horário', 'arrume a mesa pela manhã', 'saia para tomar ar'],
    night: ['aqueça-se com um banho', 'devolva cada coisa ao seu lugar', 'mantenha um horário fixo para dormir'],
    focus: 'Você se estabiliza do fim da manhã até a tarde. Encadear tarefas bem definidas é o seu forte.'
  },
  風: {
    morning: ['alongue-se um pouco ao levantar', 'anote o que vier à cabeça', 'dê uma caminhada curta'],
    night: ['defina uma hora para parar de receber informação', 'reveja suas conversas', 'acalme a mente com leitura'],
    focus: 'Vários blocos curtos de concentração funcionam melhor para você do que um longo sozinho.'
  },
  水: {
    morning: ['beba água assim que acordar', 'tire cinco minutos em silêncio', 'evite lotar a agenda'],
    night: ['relaxe num banho demorado', 'escreva o que sente e deixe ir', 'diminua as luzes cedo'],
    focus: 'Sua sensibilidade sobe a partir do fim da tarde. Reserve o trabalho criativo para a tarde e a noite.'
  }
};

const HOUSE_DOMAIN = [
  { house: 1, label: 'Eu e corpo', note: 'vitalidade, primeira impressão, o impulso que atravessa toda a sua vida' },
  { house: 2, label: 'Riqueza e fala', note: 'ganhar com as próprias mãos, poupança, o seu jeito de falar' },
  { house: 3, label: 'Iniciativa e irmãos', note: 'coragem, expressão própria, viagens curtas' },
  { house: 4, label: 'Lar e alicerces', note: 'onde você mora, estabilidade interior, propriedades' },
  { house: 5, label: 'Criatividade e aprendizado', note: 'ideias, filhos, instinto para investir' },
  { house: 6, label: 'Saúde e superação', note: 'constância, competição, cuidado com o seu estado' },
  { house: 7, label: 'Relações e contratos', note: 'parceiros, acordos, empreendimentos conjuntos' },
  { house: 8, label: 'Transformação e herança', note: 'pontos de virada, herança, investigação profunda' },
  { house: 9, label: 'Fortuna e crenças', note: 'a sorte que o empurra, estudo, lugares distantes' },
  { house: 10, label: 'Trabalho e sociedade', note: 'profissão, reputação, posição social' },
  { house: 11, label: 'Ganhos e redes', note: 'renda que cresce, aliados, conquistas' },
  { house: 12, label: 'Soltar e descansar', note: 'gastos, vida interior, o exterior, recuperação' }
];

const DASHA_SEASON = {
  Sun: 'fincar a sua bandeira', Moon: 'nutrir', Mars: 'abrir caminho',
  Mercury: 'ampliar', Jupiter: 'dar frutos', Venus: 'saborear',
  Saturn: 'firmar o terreno', Rahu: 'cruzar fronteiras', Ketu: 'desapegar'
};

const YOGA_GROUP = {
  'major yogas': 'Yogas principais',
  'chandra yogas': 'Yogas lunares',
  'soorya yogas': 'Yogas solares',
  'surya yogas': 'Yogas solares',
  'nabhasa yogas': 'Yogas nabhasa',
  'raja yogas': 'Raja yogas (posições de sucesso mundano)',
  'dhana yogas': 'Dhana yogas (posições de riqueza)',
  'other yogas': 'Outros yogas',
  'inauspicious yogas': 'Posições que pedem ajuste'
};

const SADE_SATI_PHASE = {
  rising: 'Fase 1 (preparação: Saturno transita o signo anterior à sua Lua)',
  peak: 'Fase 2 (auge: Saturno transita o mesmo signo da sua Lua)',
  setting: 'Fase 3 (conclusão: Saturno transita o signo seguinte à sua Lua)',
  'small panoti': 'Pequeno Panoti (Saturno transita a casa 4 a partir da sua Lua: período de ajuste)',
  'ashtama sani': 'Ashtama Shani (Saturno transita a casa 8 a partir da sua Lua: período de reestruturação)'
};

const REMEDY = {
  sade_sati: {
    title: 'Um período para reconstruir os seus alicerces',
    actions: [
      'revise contratos, assinaturas e relações, e solte o que não é necessário',
      'ajuste o sono e o exercício para recuperar base física',
      'dedique o tempo a organizar o que já existe em vez de abrir frentes novas',
      'continue retribuindo em pequenas doses (doações, apoiar quem vem depois)'
    ]
  },
  mangal_dosha: {
    title: 'Um período para escolher onde colocar o seu ímpeto',
    actions: [
      'coloque exercício intenso em dois ou três dias fixos por semana',
      'afaste-se de discussões e disputas e leve essa energia para construir e criar',
      'marque negociações importantes para dias em que você esteja descansado e bem'
    ]
  },
  kaal_sarp: {
    title: 'Um período para reduzir tudo a uma coisa só',
    actions: [
      'reduza as frentes paralelas e concentre recursos apenas na sua prioridade principal',
      'escreva as metas de longo prazo no papel e volte a elas com regularidade',
      'mantenha estável o ritmo da sua vida diária'
    ]
  },
  classical_to_modern: [
    { classical: 'doar gergelim preto e urad dal', modern: 'doar a uma causa e vestir preto de propósito' },
    { classical: 'banhar-se num rio sagrado', modern: 'banhar-se com sal natural, descansar numa estância termal ou num lugar conhecido pelas águas' },
    { classical: 'visitar um templo', modern: 'tirar dez minutos num lugar silencioso com a cabeça desligada' }
  ]
};

const CHAPTER_TITLE = {
  summary: 'O seu manual de instruções, em uma página',
  ch1: 'Capítulo 1 — A planta que é você',
  ch2: 'Capítulo 2 — O planeta mais forte dentro de você',
  ch3: 'Capítulo 3 — O formato da fortuna com que você nasceu',
  ch4: 'Capítulo 4 — Objetos: pedras e cores',
  ch5: 'Capítulo 5 — Ações: hábitos e formas de trabalhar',
  ch6: 'Capítulo 6 — Lugares: direção e ambiente',
  ch7: 'Capítulo 7 — A sua vocação e como usar os seus talentos',
  ch8: 'Capítulo 8 — O seu caminho para a abundância',
  ch9: 'Capítulo 9 — O mapa da sua vida (linha do tempo)',
  ch10: 'Capítulo 10 — Onde você está agora',
  ch11: 'Capítulo 11 — O período dourado que vem pela frente',
  ch12: 'Capítulo 12 — Transformar provações em alicerces'
};

const REASON = {
  lifeStone: (sign, planet) => `O seu lagna (casa 1) está em ${sign}, e o seu regente é ${planet}`,
  supportStone: (planet, start, end) => `O regente do seu período maior atual é ${planet} (${start}–${end})`,
  color: (planet) => `A cor atribuída a ${planet}, regente da sua casa 1`,
  workStyle: (sign, planet) => `A sua casa 10 (trabalho) está em ${sign}, e o seu regente é ${planet}`,
  selfStyle: (planet) => `O regente da sua casa 1 é ${planet}`,
  rhythm: (sign, element) => `A sua Lua está em ${sign}, um signo de ${element}`,
  direction1st: (planet) => `A direção atribuída a ${planet}, regente da sua casa 1`,
  direction10th: (planet) => `A direção atribuída a ${planet}, regente da sua casa 10`,
  directionRest: () => 'A direção atribuída à Lua (descanso e recuperação)'
};

module.exports = {
  SIGN, NAKSHATRA, PLANET, DIGNITY, PLANET_DOMAIN, STONE, METAL, COLOR,
  DIRECTION, ENVIRONMENT, WORK_STYLE, WORK_DETAIL, ELEMENT, RHYTHM, HOUSE_DOMAIN,
  DASHA_SEASON, YOGA_GROUP, SADE_SATI_PHASE, REMEDY, CHAPTER_TITLE, REASON
};
