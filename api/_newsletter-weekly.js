// 毎週金曜20時（各言語の地域の現地時間）に送る「今週の空」メール（8言語）。
// 星の出来事は api/_sky-events.js の計算と決まった文から作り、Gemini は使わない。
// おすすめ鑑定書は6種類を週ごとに順番に入れ替える。価格は国で変わるので、日本語（日本向け）以外には入れない。
const { DAY, PLANET, SIGN_JA, ECLIPSE_KIND, jaDate, enDate, calendarEvents, eventScript } = require('./_sky-events');
const INTL = require('./_sky-events-intl');

const BASE_URL = (process.env.SITE_BASE_URL || 'https://www.libertas-jyotish.com').replace(/\/$/, '');
const MAX_EVENTS = 2;
// 出来事が無い週に「次の節目」を探す範囲
const LOOKAHEAD_DAYS = 180;
// 送信は金曜 11:00 UTC（20:00 JST）。対象は翌日の土曜から金曜までの7日間
const SEND_HOUR_UTC = 11;
// 言語ごとの配信時刻: その国・地域の金曜20時（夏時間は Intl で自動）
const SEND_LOCAL = {
  ja: { tz: 'Asia/Tokyo', hour: 20 },
  en: { tz: 'America/New_York', hour: 20 },
  es: { tz: 'America/Mexico_City', hour: 20 },
  pt: { tz: 'America/Sao_Paulo', hour: 20 },
  fr: { tz: 'Europe/Paris', hour: 20 },
  de: { tz: 'Europe/Berlin', hour: 20 },
  id: { tz: 'Asia/Jakarta', hour: 20 },
  ar: { tz: 'Asia/Riyadh', hour: 20 }
};
const REPORT_PATHS = ['/pdf-purchase', '/yearly', '/career', '/palm-chart', '/compat', '/karma'];

// スペイン語・ポルトガル語・インドネシア語・フランス語・ドイツ語・アラビア語の共通部分（日付・星の名前・件名）
function intlText(lang, t) {
  const P = INTL.PACKS[lang].planet;
  const date = (d) => ({ day: INTL.localDate(lang, d), full: INTL.localDate(lang, d, { weekday: 'short', month: 'long', day: 'numeric' }) });
  return {
    ...t,
    date,
    range: (a, b) => `${a.full} – ${b.full}`,
    // 出来事の文は「日付と出来事。問いかけ？」。ドイツ語の日付「25. Oktober」にも「. 」があるので最後の区切りで分ける
    sentence: (hook) => { const i = hook.lastIndexOf('. '); return [hook.slice(0, i), hook.slice(i + 2)]; },
    describe(e) {
      const s = INTL.signName(lang, e.sign);
      const T = t.titles;
      const eclipse = /^(solar|lunar)-eclipse-(\w+)$/.exec(e.type);
      if (eclipse) return { title: T.eclipse(eclipse[1] === 'solar', eclipse[2], s) };
      if (e.type === 'conjunction') {
        const [a, b] = e.planet.split('-').map((x) => P[x] || x);
        return { title: T.conjunction(a, b, s) };
      }
      const p = P[e.planet] || e.planet;
      if (e.type === 'retrograde') return { title: T.retro(p, s) };
      if (e.type === 'direct') return { title: T.direct(p, s) };
      const note = e.type === 'exalted' ? T.exalted : e.type === 'debilitated' ? T.debilitated : '';
      return { title: T.enter(p, s, note) };
    },
    subject: (lead) => `${t.label} ${lead}`,
    subjectNext: (c) => `${t.label} ${t.next}: ${c.day}${t.comma || ', '}${c.title}`,
    bullet: '- ',
    colon: ': '
  };
}

const TEXT = {
  ja: {
    reports: [
      ['生涯完全鑑定書', '人生のテーマ、ダシャー周期、開運アドバイスを数十ページに渡る1冊の特別レポートにまとめてお届けします。'],
      ['年間運勢 鑑定書', 'ダシャーとトランジットから、今後12か月の流れ・転機・仕事恋愛金運健康の月別展望をまとめます。'],
      ['仕事運・金運・天職 鑑定書', '適職・才能・金運の器、転職・独立・早期退職（FIRE）の時期を、10室・アルタトリコーナ・ダシャーから読み解きます。'],
      ['カル・クンダリ（手相×出生図）', '出生図（天）と両手の写真（地）を、古典手相学ハスタ・サムドリカの作法で照合する完全型の鑑定。'],
      ['相性 鑑定書', '二人の出生図から、なぜ出逢ったのか・この縁の種類・どこまで深められるか・今後10年の流れを読み解きます。'],
      ['Karma & Dharma ― 今世の天命', '生まれ持ったカルマ（課題）とダルマ（使命）を、インド占星術の出生図から読み解く鑑定書。']
    ],
    points: [
      'その日の星が、あなたのどのハウスで何を起こすか（全文）',
      '今のダシャー（支配星の周期）の過ごし方',
      '今日・今週の具体的な行動3つ（曜日・相手・場面まで）',
      '今日の守り（インド神話にちなんだ、その日のふるまい）',
      '今週の注意日と追い風日（日付つき）',
      '9つの天体すべての配置表と一言解説'
    ],
    date: (d) => { const j = jaDate(d); return { day: j.label, full: `${j.label}（${j.weekday}）` }; },
    range: (a, b) => `${a.full}〜${b.full}`,
    sentence: (hook) => { const i = hook.indexOf('。'); return [hook.slice(0, i), hook.slice(i + 1)]; },
    describe(e) {
      const s = SIGN_JA[e.sign] || e.sign;
      const p = PLANET[e.planet];
      const eclipse = /^(solar|lunar)-eclipse-(\w+)$/.exec(e.type);
      if (eclipse) {
        const name = `${ECLIPSE_KIND[eclipse[2]]}${eclipse[1] === 'solar' ? '日食' : '月食'}`;
        return { title: `${s}で${name}`, noun: `${s}の${name}`, kind: name };
      }
      if (e.type === 'conjunction') {
        const [a, b] = e.planet.split('-').map((x) => PLANET[x]);
        return { title: `${a}と${b}が${s}で重なる`, noun: `${a}と${b}の重なり`, kind: '重なり' };
      }
      if (e.type === 'retrograde') return { title: `${p}が${s}で逆行`, noun: `${p}逆行`, kind: '逆行' };
      if (e.type === 'direct') return { title: `${p}が${s}で順行に戻る`, noun: `${p}の順行`, kind: '順行' };
      const note = e.type === 'exalted' ? '（高揚）' : e.type === 'debilitated' ? '（減衰）' : '';
      return { title: `${p}が${s}へ${note}`, noun: `${p}の${s}入り`, kind: '星の動き' };
    },
    subject: (lead) => `【今週の空】${lead}`,
    subjectNext: (c) => `【今週の空】次の節目は${c.day}、${c.title}`,
    subjectNone: '【今週の空】大きな星の動きのない一週間です',
    intro: 'こんばんは、インド占星術の Libertas Jyotish（リベルタス ジョーティシュ）です。今週の空の出来事をお届けします。',
    introNext: (range) => `こんばんは、インド占星術の Libertas Jyotish（リベルタス ジョーティシュ）です。${range}は、大きな星の動きはありません。次の節目をお知らせします。`,
    introNone: (range) => `こんばんは、インド占星術の Libertas Jyotish（リベルタス ジョーティシュ）です。${range}は、大きな星の動きはありません。`,
    heading: (kind) => `この${kind || '星の動き'}が、あなたのどの分野に効くか`,
    why: (noun) => `同じ${noun || '星の動き'}でも、仕事に出る人、お金に出る人、恋愛に出る人がいます。どこに出るかは、あなたの月星座から数えたハウスで決まります。プレミアム会員なら、あなたの出生図で毎日読み解いてお届けします。`,
    premiumTitle: 'プレミアム会員で毎日読めること',
    button: '月額550円でプレミアム会員になる',
    refund: 'マイページからいつでも解約できます。お支払いから30日以内なら返金いたします。',
    reportTitle: '今週のおすすめ鑑定書',
    more: '詳しく見る →',
    banner: (range) => `今週の空 ・ ${range}`,
    bullet: '・',
    colon: '：'
  },
  en: {
    reports: [
      ['Lifetime Report', 'Your life themes, dasha cycles and guidance for good fortune, gathered into a single special report of dozens of pages.'],
      ['Year Ahead Report', 'From dashas and transits: the arc of the next 12 months, turning points, and a month-by-month outlook for work, love, money and health.'],
      ['Career, Wealth & Calling Report', 'Discover your ideal vocation, talents, financial potential, and the timing for career transitions, independence, or early retirement (FIRE), interpreted through the 10th House, Artha Trikona, and Dashas.'],
      ['Kar-Kundali (Palm × Birth Chart)', 'Your birth chart (Heaven) and photos of both hands (Earth) read together by the classical Hasta Samudrika method — the complete form of a reading.'],
      ['Compatibility Report', 'From two birth charts: why you met, what kind of bond this is, how deep it can go, and how it unfolds over the next 10 years.'],
      ['Karma & Dharma — Your Life Purpose', 'A report that deciphers your innate Karma (challenges) and Dharma (mission) from your Vedic astrology birth chart (Janma Kundali).']
    ],
    points: [
      'What the day\'s planets do in each house of your chart (full reading)',
      'How to live your current dasha (planetary period)',
      'Three concrete actions for today and this week (down to the day, the person and the setting)',
      'Today\'s protection (how to act today, drawn from Indian mythology)',
      'This week\'s caution days and tailwind days, with dates',
      'All nine planets in one table, each with a short note'
    ],
    date: (d) => ({ day: enDate(d), full: enDate(d, { weekday: 'short', month: 'long', day: 'numeric' }) }),
    range: (a, b) => `${a.full} – ${b.full}`,
    sentence: (hook) => { const i = hook.indexOf('. '); return [hook.slice(0, i), hook.slice(i + 2)]; },
    describe(e) {
      const s = e.sign;
      const p = e.planet;
      const eclipse = /^(solar|lunar)-eclipse-(\w+)$/.exec(e.type);
      if (eclipse) {
        const name = `${eclipse[2]} ${eclipse[1]} eclipse`;
        return { title: `${name.charAt(0).toUpperCase()}${name.slice(1)} in ${s}`, noun: `${name} in ${s}`, kind: 'eclipse' };
      }
      if (e.type === 'conjunction') {
        const [a, b] = p.split('-');
        return { title: `${a} and ${b} meet in ${s}`, noun: `${a}–${b} conjunction`, kind: 'conjunction' };
      }
      if (e.type === 'retrograde') return { title: `${p} retrograde in ${s}`, noun: `${p} retrograde`, kind: 'retrograde' };
      if (e.type === 'direct') return { title: `${p} turns direct in ${s}`, noun: `${p} direct station`, kind: 'direct station' };
      const note = e.type === 'exalted' ? ' (exalted)' : e.type === 'debilitated' ? ' (debilitated)' : '';
      return { title: `${p} enters ${s}${note}`, noun: `${p} in ${s}`, kind: 'planetary shift' };
    },
    subject: (lead) => `[This Week's Sky] ${lead}`,
    subjectNext: (c) => `[This Week's Sky] Next turning point: ${c.day}, ${c.title}`,
    subjectNone: '[This Week\'s Sky] A quiet week in the sky',
    intro: 'Hello from Libertas Jyotish, Vedic astrology. Here is what happens in the sky this week.',
    introNext: (range) => `Hello from Libertas Jyotish, Vedic astrology. There are no major planetary events this week (${range}), so here is the next turning point.`,
    introNone: (range) => `Hello from Libertas Jyotish, Vedic astrology. There are no major planetary events this week (${range}).`,
    heading: (kind) => `Which part of your life this ${kind || 'planetary shift'} touches`,
    why: (noun) => `The same ${noun || 'planetary shift'} shows up in work for some people, and in money or love for others. Where it lands depends on the house counted from your Moon sign. As a Premium member, you get it read from your own birth chart, every day.`,
    premiumTitle: 'What Premium members read every day',
    button: 'Join Premium',
    refund: 'Cancel anytime from My Page. Refunds are available within 30 days of payment.',
    reportTitle: 'Report of the week',
    more: 'See details →',
    banner: (range) => `This Week's Sky · ${range}`,
    bullet: '- ',
    colon: ': '
  },
  es: intlText('es', {
    reports: [
      ["Informe Vitalicio", "Los temas de tu vida, tus ciclos de dasha y consejos para la buena fortuna, reunidos en un informe especial de decenas de páginas."],
      ["Informe del año", "Desde dashas y tránsitos: el arco de los próximos 12 meses, puntos de giro y perspectiva mensual de trabajo, amor, dinero y salud."],
      ["Informe de carrera, dinero y vocación", "Descifra tu vocación, talentos, capacidad financiera y los momentos clave para cambiar de empleo, independizarte o alcanzar el retiro temprano (FIRE) a través de la Casa 10, el Artha Trikona y los Dashas."],
      ["Kar-Kundali (palma × carta natal)", "Tu carta natal (el Cielo) y las fotos de tus dos manos (la Tierra), leídas juntas con el método clásico del Hasta Samudrika: la lectura en su forma completa."],
      ["Informe de compatibilidad", "A partir de dos cartas natales: por qué se encontraron, qué tipo de vínculo los une, hasta dónde puede llegar y cómo evoluciona en los próximos 10 años."],
      ["Karma y Dharma — tu propósito de vida", "Un informe que descifra tu Karma (tus retos) y tu Dharma (tu misión) innatos a partir de tu carta natal védica."]
    ],
    points: [
      "Lo que hacen los planetas del día en cada casa de tu carta (lectura completa)",
      "Cómo vivir tu dasha actual (periodo planetario)",
      "Tres acciones concretas para hoy y esta semana (con el día, la persona y la situación)",
      "Tu protección de hoy (cómo actuar hoy, inspirada en la mitología india)",
      "Los días de precaución y de viento a favor de esta semana, con fechas",
      "Los nueve planetas en una tabla, cada uno con una breve nota"
    ],
    titles: {
      retro: (p, s) => `${p} retrógrado en ${s}`,
      direct: (p, s) => `${p} vuelve a ir directo en ${s}`,
      enter: (p, s, note) => `${p} entra en ${s}${note}`,
      exalted: ' (exaltado)', debilitated: ' (en caída)',
      conjunction: (a, b, s) => `${a} y ${b} se unen en ${s}`,
      eclipse: (solar, kind, s) => `Eclipse ${solar ? 'solar' : 'lunar'} ${{ total: 'total', annular: 'anular', partial: 'parcial' }[kind]} en ${s}`
    },
    label: "[El cielo de esta semana]",
    next: "Próximo hito",
    subjectNone: "[El cielo de esta semana] Una semana tranquila en el cielo",
    intro: "Hola, te escribe Libertas Jyotish, astrología védica. Esto es lo que ocurre en el cielo esta semana.",
    introNext: (range) => `Hola, te escribe Libertas Jyotish, astrología védica. Esta semana (${range}) no hay grandes movimientos en el cielo, así que te contamos el próximo hito.`,
    introNone: (range) => `Hola, te escribe Libertas Jyotish, astrología védica. Esta semana (${range}) no hay grandes movimientos en el cielo.`,
    heading: () => "Qué parte de tu vida toca este movimiento del cielo",
    why: () => "Un mismo movimiento del cielo se nota en el trabajo para unas personas y en el dinero o el amor para otras. Dónde actúa depende de la casa contada desde tu signo lunar. Como miembro Premium, lo lees cada día a partir de tu propia carta natal.",
    premiumTitle: "Lo que leen cada día los miembros Premium",
    button: "Hazte miembro Premium",
    refund: "Puedes cancelar cuando quieras desde tu página de miembro. Reembolsamos dentro de los 30 días posteriores al pago.",
    reportTitle: "Informe de la semana",
    more: "Ver detalles →",
    banner: (range) => `El cielo de esta semana · ${range}`
  }),
  pt: intlText('pt', {
    reports: [
      ["Relatório Vitalício", "Os temas da sua vida, os seus ciclos de dasha e conselhos para a boa sorte, reunidos em um relatório especial de dezenas de páginas."],
      ["Relatório do ano", "De dashas e trânsitos: o arco dos próximos 12 meses, pontos de virada e perspectiva mensal de trabalho, amor, dinheiro e saúde."],
      ["Relatório de carreira, dinheiro e vocação", "Descubra sua vocação, talentos e potencial financeiro, além do momento certo para mudar de carreira, empreender ou antecipar a aposentadoria (FIRE), interpretados a partir da 10ª Casa, do Artha Trikona e dos Dashas."],
      ["Kar-Kundali (palma × mapa natal)", "O seu mapa natal (o Céu) e as fotos das suas duas mãos (a Terra), lidos juntos pelo método clássico do Hasta Samudrika: a leitura na sua forma completa."],
      ["Relatório de compatibilidade", "A partir de dois mapas natais: por que vocês se encontraram, que tipo de vínculo os une, até onde ele pode ir e como evolui nos próximos 10 anos."],
      ["Karma e Dharma — seu propósito de vida", "Um relatório que decifra o seu Karma (desafios) e o seu Dharma (missão) de nascença a partir do seu mapa natal védico."]
    ],
    points: [
      "O que os planetas do dia fazem em cada casa do seu mapa (leitura completa)",
      "Como viver o seu dasha atual (período planetário)",
      "Três ações concretas para hoje e esta semana (com o dia, a pessoa e a situação)",
      "A sua proteção de hoje (como agir hoje, inspirada na mitologia indiana)",
      "Os dias de cautela e de vento a favor desta semana, com datas",
      "Os nove planetas em uma tabela, cada um com uma nota curta"
    ],
    titles: {
      retro: (p, s) => `${p} retrógrado em ${s}`,
      direct: (p, s) => `${p} volta ao movimento direto em ${s}`,
      enter: (p, s, note) => `${p} entra em ${s}${note}`,
      exalted: ' (exaltado)', debilitated: ' (em queda)',
      conjunction: (a, b, s) => `${a} e ${b} se encontram em ${s}`,
      eclipse: (solar, kind, s) => `Eclipse ${solar ? 'solar' : 'lunar'} ${{ total: 'total', annular: 'anular', partial: 'parcial' }[kind]} em ${s}`
    },
    label: "[O céu desta semana]",
    next: "Próximo marco",
    subjectNone: "[O céu desta semana] Uma semana tranquila no céu",
    intro: "Olá, aqui é a Libertas Jyotish, astrologia védica. Veja o que acontece no céu esta semana.",
    introNext: (range) => `Olá, aqui é a Libertas Jyotish, astrologia védica. Nesta semana (${range}) não há grandes movimentos no céu, então contamos qual é o próximo marco.`,
    introNone: (range) => `Olá, aqui é a Libertas Jyotish, astrologia védica. Nesta semana (${range}) não há grandes movimentos no céu.`,
    heading: () => "Que parte da sua vida este movimento do céu toca",
    why: () => "Um mesmo movimento do céu aparece no trabalho para algumas pessoas e no dinheiro ou no amor para outras. Onde ele atua depende da casa contada a partir do seu signo lunar. Como membro Premium, você lê isso todos os dias a partir do seu próprio mapa natal.",
    premiumTitle: "O que os membros Premium leem todos os dias",
    button: "Torne-se membro Premium",
    refund: "Cancele quando quiser na sua página de membro. Reembolsamos em até 30 dias após o pagamento.",
    reportTitle: "Relatório da semana",
    more: "Ver detalhes →",
    banner: (range) => `O céu desta semana · ${range}`
  }),
  id: intlText('id', {
    reports: [
      ["Laporan Seumur Hidup", "Tema hidup, siklus dasha, dan saran untuk keberuntungan Anda, dirangkum dalam satu laporan istimewa setebal puluhan halaman."],
      ["Laporan Tahun Depan", "Dari dasha dan transit: alur 12 bulan ke depan, titik balik, dan pandangan bulanan untuk kerja, cinta, uang, dan kesehatan."],
      ["Laporan Karier, Keuangan & Panggilan Hidup", "Membaca karier yang cocok, bakat, kapasitas rezeki finansial, serta waktu untuk pindah kerja, mandiri, atau pensiun dini (FIRE) melalui Rumah ke-10, Artha Trikona, dan Dasha."],
      ["Kar-Kundali (Telapak × Peta Kelahiran)", "Peta kelahiran Anda (Langit) dan foto kedua telapak tangan (Bumi) dibaca bersama dengan metode klasik Hasta Samudrika — bentuk pembacaan yang paling lengkap."],
      ["Laporan Kecocokan", "Dari dua peta kelahiran: mengapa kalian bertemu, jenis ikatan ini, sejauh mana bisa diperdalam, dan alurnya dalam 10 tahun ke depan."],
      ["Karma & Dharma — Tujuan Hidup Anda", "Laporan yang membaca Karma (tantangan) dan Dharma (misi) bawaan Anda dari peta kelahiran astrologi Veda."]
    ],
    points: [
      "Apa yang dilakukan planet hari itu di setiap rumah peta Anda (pembacaan lengkap)",
      "Cara menjalani dasha Anda saat ini (periode planet)",
      "Tiga tindakan konkret untuk hari ini dan minggu ini (sampai hari, orang, dan situasinya)",
      "Perlindungan hari ini (cara bersikap hari ini, terinspirasi mitologi India)",
      "Hari waspada dan hari angin baik minggu ini, lengkap dengan tanggal",
      "Sembilan planet dalam satu tabel, masing-masing dengan catatan singkat"
    ],
    titles: {
      retro: (p, s) => `${p} retrograde di ${s}`,
      direct: (p, s) => `${p} kembali bergerak maju di ${s}`,
      enter: (p, s, note) => `${p} masuk ${s}${note}`,
      exalted: ' (eksaltasi)', debilitated: ' (debilitasi)',
      conjunction: (a, b, s) => `${a} dan ${b} bertemu di ${s}`,
      eclipse: (solar, kind, s) => `Gerhana ${solar ? 'matahari' : 'bulan'} ${{ total: 'total', annular: 'cincin', partial: 'sebagian' }[kind]} di ${s}`
    },
    label: "[Langit Minggu Ini]",
    next: "Titik balik berikutnya",
    subjectNone: "[Langit Minggu Ini] Minggu yang tenang di langit",
    intro: "Halo dari Libertas Jyotish, astrologi Veda. Inilah yang terjadi di langit minggu ini.",
    introNext: (range) => `Halo dari Libertas Jyotish, astrologi Veda. Minggu ini (${range}) tidak ada pergerakan planet yang besar, jadi kami sampaikan titik balik berikutnya.`,
    introNone: (range) => `Halo dari Libertas Jyotish, astrologi Veda. Minggu ini (${range}) tidak ada pergerakan planet yang besar.`,
    heading: () => "Bagian hidup Anda yang disentuh pergerakan langit ini",
    why: () => "Pergerakan langit yang sama bisa terasa di pekerjaan bagi sebagian orang, dan di keuangan atau cinta bagi yang lain. Di mana ia bekerja ditentukan oleh rumah yang dihitung dari zodiak bulan Anda. Sebagai anggota Premium, Anda membacanya setiap hari dari peta kelahiran Anda sendiri.",
    premiumTitle: "Yang dibaca anggota Premium setiap hari",
    button: "Jadi anggota Premium",
    refund: "Bisa berhenti kapan saja dari halaman anggota. Dana dikembalikan jika diminta dalam 30 hari setelah pembayaran.",
    reportTitle: "Laporan minggu ini",
    more: "Lihat detail →",
    banner: (range) => `Langit Minggu Ini · ${range}`
  }),
  fr: intlText('fr', {
    reports: [
      ["Rapport à vie", "Les thèmes de votre vie, vos cycles de dasha et des conseils pour la chance, réunis dans un rapport spécial de plusieurs dizaines de pages."],
      ["Rapport de l’année", "À partir des Dashas et des transits : la trajectoire des 12 prochains mois, les tournants décisifs et des perspectives mois par mois pour le travail, l'amour, l'argent et la santé."],
      ["Rapport carrière, argent et vocation", "Découvrez votre vocation, vos talents, votre potentiel financier, ainsi que les périodes clés pour changer d'emploi, devenir indépendant ou prendre une retraite anticipée (FIRE), décryptés à travers la 10e maison, l'Artha Trikona et les Dashas."],
      ["Kar-Kundali (paume × thème natal)", "Votre thème natal (le Ciel) et les photos de vos deux mains (la Terre), lus ensemble selon la méthode classique du Hasta Samudrika : la lecture dans sa forme complète."],
      ["Rapport de compatibilité", "À partir de deux thèmes natals : pourquoi vous vous êtes rencontrés, la nature de ce lien, jusqu’où il peut s’approfondir et son évolution sur les 10 prochaines années."],
      ["Karma et Dharma — votre mission de vie", "Un rapport qui déchiffre votre Karma (vos défis) et votre Dharma (votre mission) innés à partir de votre thème natal védique."]
    ],
    points: [
      "Ce que les planètes du jour font dans chaque maison de votre thème (lecture complète)",
      "Comment vivre votre dasha actuel (période planétaire)",
      "Trois actions concrètes pour aujourd’hui et cette semaine (jusqu’au jour, à la personne et à la situation)",
      "Votre protection du jour (comment agir aujourd’hui, inspirée de la mythologie indienne)",
      "Les jours de prudence et les jours porteurs de la semaine, avec leurs dates",
      "Les neuf planètes dans un tableau, chacune avec une courte note"
    ],
    titles: {
      retro: (p, s) => `${p} rétrograde en ${s}`,
      direct: (p, s) => `${p} redevient direct en ${s}`,
      enter: (p, s, note) => `${p} entre en ${s}${note}`,
      exalted: ' (exalté)', debilitated: ' (en chute)',
      conjunction: (a, b, s) => `${a} et ${b} se rejoignent en ${s}`,
      eclipse: (solar, kind, s) => `Éclipse ${solar ? 'solaire' : 'lunaire'} ${{ total: 'totale', annular: 'annulaire', partial: 'partielle' }[kind]} en ${s}`
    },
    label: "[Le ciel de la semaine]",
    next: "Prochain tournant",
    subjectNone: "[Le ciel de la semaine] Une semaine calme dans le ciel",
    intro: "Bonjour, ici Libertas Jyotish, astrologie védique. Voici ce qui se passe dans le ciel cette semaine.",
    introNext: (range) => `Bonjour, ici Libertas Jyotish, astrologie védique. Cette semaine (${range}), aucun grand mouvement dans le ciel : voici donc le prochain tournant.`,
    introNone: (range) => `Bonjour, ici Libertas Jyotish, astrologie védique. Cette semaine (${range}), aucun grand mouvement dans le ciel.`,
    heading: () => "Quel domaine de votre vie ce mouvement du ciel touche",
    why: () => "Un même mouvement du ciel se manifeste dans le travail pour certains, dans l’argent ou l’amour pour d’autres. Le domaine touché dépend de la maison comptée à partir de votre signe lunaire. En tant que membre Premium, vous le lisez chaque jour à partir de votre propre thème natal.",
    premiumTitle: "Ce que les membres Premium lisent chaque jour",
    button: "Devenir membre Premium",
    refund: "Résiliable à tout moment depuis votre page membre. Remboursement possible dans les 30 jours suivant le paiement.",
    reportTitle: "Le rapport de la semaine",
    more: "Voir le détail →",
    banner: (range) => `Le ciel de la semaine · ${range}`
  }),
  de: intlText('de', {
    reports: [
      ["Lebensbericht", "Ihre Lebensthemen, Dasha-Zyklen und Hinweise für Ihr Glück, zusammengefasst in einem besonderen Bericht von mehreren Dutzend Seiten."],
      ["Jahresbericht", "Aus Dashas und Transiten: Der Verlauf der nächsten 12 Monate, Wendepunkte und ein monatlicher Ausblick für Arbeit, Liebe, Geld und Gesundheit."],
      ["Bericht zu Beruf, Geld & Berufung", "Entschlüsseln Sie Berufung, Talente, finanzielles Potenzial sowie den richtigen Zeitpunkt für Jobwechsel, Selbstständigkeit und Vorruhestand (FIRE) anhand des 10. Hauses, des Artha-Trikona und der Dashas."],
      ["Kar-Kundali (Handfläche × Geburtshoroskop)", "Ihr Geburtshoroskop (der Himmel) und Fotos Ihrer beiden Hände (die Erde), gemeinsam gedeutet nach der klassischen Methode des Hasta Samudrika – die Deutung in ihrer vollständigen Form."],
      ["Kompatibilitätsbericht", "Aus zwei Geburtshoroskopen: warum Sie sich begegnet sind, welche Art von Verbindung Sie haben, wie weit sie sich vertiefen lässt und wie sie sich in den nächsten 10 Jahren entwickelt."],
      ["Karma & Dharma — Ihre Lebensaufgabe", "Ein Bericht, der Ihr angeborenes Karma (Aufgaben) und Dharma (Mission) aus Ihrem vedischen Geburtshoroskop entschlüsselt."]
    ],
    points: [
      "Was die Planeten des Tages in jedem Haus Ihres Horoskops bewirken (vollständige Deutung)",
      "Wie Sie Ihr aktuelles Dasha (Planetenperiode) gestalten",
      "Drei konkrete Schritte für heute und diese Woche (bis zum Wochentag, zur Person und zur Situation)",
      "Ihr Schutz für heute (wie Sie heute handeln, angelehnt an die indische Mythologie)",
      "Die Vorsichtstage und Rückenwindtage dieser Woche, mit Datum",
      "Alle neun Planeten in einer Tabelle, jeweils mit kurzer Notiz"
    ],
    titles: {
      retro: (p, s) => `${p} rückläufig im Zeichen ${s}`,
      direct: (p, s) => `${p} wird direktläufig im Zeichen ${s}`,
      enter: (p, s, note) => `${p} wechselt ins Zeichen ${s}${note}`,
      exalted: ' (erhöht)', debilitated: ' (im Fall)',
      conjunction: (a, b, s) => `${a} und ${b} treffen sich im Zeichen ${s}`,
      eclipse: (solar, kind, s) => `${{ total: 'Totale', annular: 'Ringförmige', partial: 'Partielle' }[kind]} ${solar ? 'Sonnenfinsternis' : 'Mondfinsternis'} im Zeichen ${s}`
    },
    label: "[Der Himmel dieser Woche]",
    next: "Nächster Wendepunkt",
    subjectNone: "[Der Himmel dieser Woche] Eine ruhige Woche am Himmel",
    intro: "Hallo, hier ist Libertas Jyotish, vedische Astrologie. Das geschieht diese Woche am Himmel.",
    introNext: (range) => `Hallo, hier ist Libertas Jyotish, vedische Astrologie. Diese Woche (${range}) gibt es keine großen Planetenbewegungen, deshalb hier der nächste Wendepunkt.`,
    introNone: (range) => `Hallo, hier ist Libertas Jyotish, vedische Astrologie. Diese Woche (${range}) gibt es keine großen Planetenbewegungen.`,
    heading: () => "Welchen Bereich Ihres Lebens diese Himmelsbewegung berührt",
    why: () => "Dieselbe Himmelsbewegung zeigt sich bei manchen im Beruf, bei anderen bei Geld oder Liebe. Wo sie wirkt, hängt vom Haus ab, gezählt von Ihrem Mondzeichen. Als Premium-Mitglied lesen Sie das jeden Tag aus Ihrem eigenen Geburtshoroskop.",
    premiumTitle: "Was Premium-Mitglieder jeden Tag lesen",
    button: "Premium-Mitglied werden",
    refund: "Jederzeit über Ihre Mitgliederseite kündbar. Innerhalb von 30 Tagen nach der Zahlung erstatten wir den Betrag.",
    reportTitle: "Bericht der Woche",
    more: "Details ansehen →",
    banner: (range) => `Der Himmel dieser Woche · ${range}`
  }),
  ar: intlText('ar', {
    reports: [
      ["تقرير العمر", "موضوعات حياتك ودورات الداشا ونصائح لجلب الحظ، مجموعة في تقرير خاص من عشرات الصفحات."],
      ["تقرير العام القادم", "من الداشا والعبور: مسار الأشهر الـ12 القادمة، نقاط التحول، ونظرة شهرية للعمل والحب والمال والصحة."],
      ["تقرير العمل والمال والرسالة", "نحلل المهنة الأنسب، والمواهب، وسعة الوفرة المالية، ومواعيد تغيير الوظيفة أو الاستقلال المهني أو التقاعد المبكر (FIRE)، استناداً إلى قراءة البيت العاشر، وأرثا تريكونا، وفترات الدشا."],
      ["كار-كوندالي (الكف × خريطة الميلاد)", "خريطة ميلادك (السماء) وصور كفّيك (الأرض) تُقرأ معًا وفق المنهج الكلاسيكي هاستا سامودريكا، في أكمل صور القراءة."],
      ["تقرير التوافق", "من خريطتَي ميلاد: لماذا التقيتما، ونوع هذه الرابطة، وإلى أي حد يمكن أن تتعمق، ومسارها في السنوات العشر القادمة."],
      ["كارما ودارما — رسالة حياتك", "تقرير يفك رموز الكارما (التحديات) والدارما (الرسالة) التي وُلدت بها، من خريطة ميلادك في التنجيم الفيدي."]
    ],
    points: [
      "ما تفعله كواكب اليوم في كل بيت من خريطتك (القراءة كاملة)",
      "كيف تعيش الداشا الحالية (الفترة الكوكبية)",
      "ثلاث خطوات محددة لليوم ولهذا الأسبوع (حتى اليوم والشخص والموقف)",
      "حمايتك لليوم (كيف تتصرف اليوم، مستوحاة من الأساطير الهندية)",
      "أيام الحذر وأيام الرياح المواتية لهذا الأسبوع، مع التواريخ",
      "الكواكب التسعة في جدول واحد، مع ملاحظة قصيرة لكل منها"
    ],
    titles: {
      retro: (p, s) => `تراجع ${p} في برج ${s}`,
      direct: (p, s) => `عودة ${p} إلى الحركة المباشرة في برج ${s}`,
      enter: (p, s, note) => `دخول ${p} برج ${s}${note}`,
      exalted: ' (في شرفه)', debilitated: ' (في هبوطه)',
      conjunction: (a, b, s) => `اقتران ${a} و${b} في برج ${s}`,
      eclipse: (solar, kind, s) => `${solar ? 'كسوف' : 'خسوف'} ${{ total: 'كلي', annular: 'حلقي', partial: 'جزئي' }[kind]} في برج ${s}`
    },
    label: "[سماء هذا الأسبوع]",
    comma: '، ',
    next: "المحطة التالية",
    subjectNone: "[سماء هذا الأسبوع] أسبوع هادئ في السماء",
    intro: "مرحبًا من Libertas Jyotish للتنجيم الفيدي. إليك ما يحدث في السماء هذا الأسبوع.",
    introNext: (range) => `مرحبًا من Libertas Jyotish للتنجيم الفيدي. لا توجد حركات كبيرة للكواكب هذا الأسبوع (${range})، لذلك نخبرك بالمحطة التالية.`,
    introNone: (range) => `مرحبًا من Libertas Jyotish للتنجيم الفيدي. لا توجد حركات كبيرة للكواكب هذا الأسبوع (${range}).`,
    heading: () => "أي جانب من حياتك تمسّه هذه الحركة في السماء",
    why: () => "الحركة نفسها في السماء تظهر في العمل عند بعض الناس، وفي المال أو الحب عند آخرين. ويتحدد موضع تأثيرها بالبيت المحسوب من برجك القمري. وبصفتك عضوًا مميزًا، تقرأ ذلك كل يوم من خريطة ميلادك أنت.",
    premiumTitle: "ما يقرؤه الأعضاء المميزون كل يوم",
    button: "انضم إلى العضوية المميزة",
    refund: "يمكنك الإلغاء في أي وقت من صفحة العضو، ونردّ المبلغ خلال 30 يومًا من الدفع.",
    reportTitle: "تقرير الأسبوع",
    more: "عرض التفاصيل ←",
    banner: (range) => `سماء هذا الأسبوع · ${range}`
  })
};

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// now 以前で最も新しい金曜の送信時刻
function sendTimeFor(now) {
  const d = new Date(now);
  let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), SEND_HOUR_UTC);
  t -= ((d.getUTCDay() - 5 + 7) % 7) * DAY;
  if (t > now) t -= 7 * DAY;
  return t;
}

// friday（その週の金曜を表す UTC 時刻）の暦日で、tz の現地 hour 時ちょうどの UTC 時刻
function localFridayAt(friday, { tz, hour }) {
  const d = new Date(friday);
  const target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  let t = target;
  for (let i = 0; i < 3; i += 1) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, Number(x.value)]));
    const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    if (wall === target) break;
    t -= wall - target;
  }
  return t;
}

function buildIssue(lang, { events, nextEvent, first, last, reportIndex }) {
  const T = TEXT[lang];
  const card = (e) => {
    const [lead, question] = T.sentence(eventScript(lang, e).hook);
    return { ...T.date(e.date), ...T.describe(e), lead, question, body: eventScript(lang, e).body };
  };
  const cards = (events.length ? events : nextEvent ? [nextEvent] : []).map(card);
  const range = T.range(T.date(first), T.date(last));
  const subject = events.length ? T.subject(cards[0].lead) : cards.length ? T.subjectNext(cards[0]) : T.subjectNone;
  const intro = events.length ? T.intro : cards.length ? T.introNext(range) : T.introNone(range);
  const heading = T.heading(cards[0] && cards[0].kind);
  const why = T.why(cards[0] && cards[0].noun);
  const [reportName, reportDesc] = T.reports[reportIndex];
  const reportUrl = `${BASE_URL}/${lang}${REPORT_PATHS[reportIndex]}`;
  const premiumUrl = `${BASE_URL}/${lang}/mypage#premium`;

  const cardHtml = (c, i) => `<div style="border:1px solid rgba(139,107,27,0.35); border-radius:8px; padding:14px 16px; background:#fbf6ea;${i ? ' margin-top:12px;' : ''}">
      <div style="color:#8B6B1B; font-size:13px;">${esc(c.full)}</div>
      <div style="font-size:18px; font-weight:600; margin:2px 0 8px;">${esc(c.title)}</div>
      <p style="margin:0 0 8px; font-weight:600;">${esc(c.question)}</p>
      <p style="margin:0; font-size:15px;">${esc(c.body)}</p>
    </div>`;
  const html = `<div style="padding:22px 22px 6px;">
    <p style="margin:0 0 14px;">${esc(intro)}</p>
    ${cards.map(cardHtml).join('\n    ')}
    <h3 style="color:#8B6B1B; font-size:17px; margin:26px 0 6px; font-weight:600;">${esc(heading)}</h3>
    <p style="margin:0 0 12px; font-size:15px;">${esc(why)}</p>
    <div style="border:2px solid #C9A227; border-radius:10px; padding:16px 18px; background:#fffaf0;">
      <div style="font-size:16px; font-weight:700; color:#2C221E; margin-bottom:8px;">${esc(T.premiumTitle)}</div>
      <div style="font-size:15px; line-height:1.9;">
        ${T.points.map((x) => `✦ ${esc(x)}`).join('<br>\n        ')}
      </div>
      <div style="text-align:center; margin:16px 0 6px;">
        <a href="${esc(premiumUrl)}" style="display:inline-block; background:#8B6B1B; color:#fff; text-decoration:none; padding:12px 26px; border-radius:24px; font-weight:700;">${esc(T.button)}</a>
      </div>
      <div style="text-align:center; font-size:12px; color:#7a6a58;">${esc(T.refund)}</div>
    </div>
    <h3 style="color:#8B6B1B; font-size:17px; margin:26px 0 8px; font-weight:600;">${esc(T.reportTitle)}</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;"><tr>
      <td style="width:110px; vertical-align:top; padding-${lang === 'ar' ? 'left' : 'right'}:12px;"><a href="${esc(reportUrl)}"><img src="${BASE_URL}/img/report-cover.jpg" width="110" alt="" style="display:block; border-radius:6px;"></a></td>
      <td style="vertical-align:top; font-size:15px;">
        <div style="font-weight:700;">${esc(reportName)}</div>
        <div style="font-size:14px; margin:4px 0 8px;">${esc(reportDesc)}</div>
        <a href="${esc(reportUrl)}" style="color:#8B6B1B; font-weight:700;">${esc(T.more)}</a>
      </td>
    </tr></table>
  </div>`;

  const text = [
    intro,
    ...cards.map((c) => `\n■ ${c.full}　${c.title}\n${c.question}\n${c.body}`),
    `\n■ ${heading}\n${why}`,
    `\n■ ${T.premiumTitle}\n${T.points.map((x) => `${T.bullet}${x}`).join('\n')}\n${T.button}${T.colon}${premiumUrl}\n${T.refund}`,
    `\n■ ${T.reportTitle}\n${reportName}\n${reportDesc}\n${reportUrl}`
  ].join('\n');

  return { subject, html, text, banner: T.banner(range) };
}

function weeklyCampaign(now = Date.now()) {
  const sendAt = sendTimeFor(now);
  const start = new Date(sendAt + 4 * 3600000); // 土曜 0:00 JST
  const end = new Date(start.getTime() + 7 * DAY);
  // 表示用の土曜・金曜（UTC の暦日でも日本時間の暦日でも同じ日になる時刻）
  const first = new Date(start.getTime() + 9 * 3600000);
  const last = new Date(first.getTime() + 6 * DAY);
  const events = calendarEvents(start, end).slice(0, MAX_EVENTS);
  const nextEvent = events.length ? null : calendarEvents(end, new Date(end.getTime() + LOOKAHEAD_DAYS * DAY))[0];
  const reportIndex = Math.floor(start.getTime() / (7 * DAY)) % REPORT_PATHS.length;
  const week = { events, nextEvent, first, last, reportIndex };
  return {
    id: `weekly-${new Date(start.getTime() + 9 * 3600000).toISOString().slice(0, 10)}`,
    sendAfter: new Date(sendAt).toISOString(),
    weekly: true,
    langs: Object.fromEntries(Object.keys(TEXT).map((l) => [l, {
      ...buildIssue(l, week),
      sendAfter: new Date(SEND_LOCAL[l] ? localFridayAt(sendAt, SEND_LOCAL[l]) : sendAt).toISOString()
    }]))
  };
}

module.exports = { weeklyCampaign, sendTimeFor, localFridayAt, REPORT_PATHS, TEXT };
