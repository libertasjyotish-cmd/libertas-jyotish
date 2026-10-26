// 「今週の空」メールの星の出来事の文（スペイン語・ポルトガル語・インドネシア語・フランス語・ドイツ語・アラビア語）。
// SNS リポジトリの src/lib/event-template-intl.ts（手書きの決まった文）を移植したもの。Gemini は使わない。
// 先頭の「¿」「¡」の後ろも大文字にする（スペイン語の疑問文）
const cap = (t) => t.replace(/^([¿¡]?)(.)/, (m, mark, c) => mark + c.toUpperCase());
const pairUp = (prev, next, join) =>
  cap([prev, next].filter(Boolean).join(join)) + (prev || next ? '.' : '');

const ES = {
  locale: 'es-ES',
  planet: { Mercury: 'Mercurio', Venus: 'Venus', Mars: 'Marte', Jupiter: 'Júpiter', Saturn: 'Saturno', Rahu: 'Rahu', Ketu: 'Ketu' },
  area: {
    Mercury: 'la palabra y el pensamiento', Venus: 'el amor y el dinero', Mars: 'la acción', Jupiter: 'el crecimiento y la suerte',
    Saturn: 'el deber y el esfuerzo', Rahu: 'los deseos intensos', Ketu: 'el desapego',
  },
  retroQ: {
    Mercury: '¿relees los mensajes importantes antes de enviarlos?',
    Venus: '¿quieres revisar cómo tratas a la gente y el dinero?',
    Mars: '¿te apresuras y no avanzas?',
    Jupiter: '¿dudas de si tu meta es la correcta?',
    Saturn: '¿te pesan tus responsabilidades?',
  },
  retroDo: {
    Mercury: 'relee antes de enviar y confirma lo prometido',
    Venus: 'vuelve a elegir a quién y en qué das tu tiempo',
    Mars: 'ordena tu método antes de empezar',
    Jupiter: 'revisa tus planes y elige dónde crecer',
    Saturn: 'revisa lo que asumiste y refuérzalo',
  },
  ingressQ: {
    Jupiter: '¿ves algo nuevo que quieres hacer crecer?',
    Saturn: '¿hay algo a lo que quieres dedicarte por años?',
    Rahu: '¿te atrae de repente algo nuevo?',
  },
  stay: { Jupiter: 'cerca de un año', Saturn: 'unos dos años y medio', Rahu: 'cerca de año y medio' },
  exaltQ: {
    Mercury: '¿tus ideas se ordenan con claridad?',
    Venus: '¿tus lazos con la gente y el dinero fluyen?',
    Mars: '¿tu energía se convierte en resultados?',
    Jupiter: '¿ves algo nuevo que quieres hacer crecer?',
    Saturn: '¿hay algo a lo que quieres dedicarte por años?',
  },
  debilQ: {
    Mercury: '¿te cuesta decidirte?',
    Venus: '¿la gente o el dinero te dejan insatisfecho?',
    Mars: '¿tu energía gira en vacío?',
    Jupiter: '¿sientes que tu crecimiento se estancó?',
    Saturn: '¿te pesan tus responsabilidades?',
  },
  debilDo: {
    Mercury: 'comprueba antes de concluir',
    Venus: 'vuelve a elegir lo que de verdad te llena',
    Mars: 'planifica en lugar de forzar',
    Jupiter: 'avanza paso a paso',
    Saturn: 'refuerza tus bases sin prisa',
  },
  since: (n) => `por primera vez en ${n} años, `,
  rarity: (prev, next) => pairUp(prev !== undefined ? `La última vez: ${prev}` : '', next !== undefined ? `la próxima: ${next}` : '', '; '),
  retro: (d, since, p, s, q, area, todo) => [
    `El ${d}, ${since}${p} entra en retrógrado en ${s}. ${cap(q)}`,
    `${p} rige ${area}. No es una pausa, es tiempo de reforzar: ${todo}.`,
  ],
  direct: (d, p, s, area) => [
    `El ${d}, ${p} vuelve a ir directo en ${s}. ¿Empieza a moverse algo que estaba parado?`,
    `Lo que revisaste sobre ${area} avanza ahora poco a poco.`,
  ],
  ingress: (d, since, p, s, q, area, stay) => [
    `El ${d}, ${since}${p} entra en ${s}. ${cap(q)}`,
    `${p} rige ${area} y se queda en ${s} ${stay}. Su efecto depende de la casa contada desde tu signo lunar.`,
  ],
  exalted: (d, since, p, s, q, area, stay) => [
    `El ${d}, ${since}${p} entra en ${s}, donde es más fuerte. ${cap(q)}`,
    `En la astrología védica, ${p} está exaltado en ${s}. ${stay ? `Durante ${stay}` : 'Mientras siga ahí'}, el planeta de ${area} da lo mejor de sí.`,
  ],
  debilitated: (d, since, p, s, q, todo) => [
    `El ${d}, ${since}${p} entra en ${s}, donde le cuesta mostrar su fuerza. ${cap(q)}`,
    `En la astrología védica, ${p} está en caída en ${s}. Mientras siga ahí, ${todo} y saldrás más fuerte.`,
  ],
  conjunction: (d, since, a, b, s, areaA, areaB) => [
    `El ${d}, ${since}${a} y ${b} se unen en ${s}. ¿Sientes que se acerca un gran cambio?`,
    `${a} rige ${areaA}; ${b}, ${areaB}. Cuando se unen en un signo, el rumbo de esos temas cambia.`,
  ],
  eclipse: (d, since, s, solar, kind) => [
    `El ${d}, ${since}hay un eclipse ${solar ? 'solar' : 'lunar'} ${{ total: 'total', annular: 'anular', partial: 'parcial' }[kind]} en ${s}. ${solar ? '¿Quieres dejar atrás una vieja forma de hacer las cosas?' : '¿Hay algo en tu corazón que quieres cerrar?'}`,
    `En la astrología védica, ${solar ? 'el Sol' : 'la Luna'} se une a Rahu y Ketu. Se cierra una etapa de ${solar ? 'tus metas' : 'tus sentimientos'}.`,
  ],
};

const PT = {
  locale: 'pt-BR',
  planet: { Mercury: 'Mercúrio', Venus: 'Vênus', Mars: 'Marte', Jupiter: 'Júpiter', Saturn: 'Saturno', Rahu: 'Rahu', Ketu: 'Ketu' },
  area: {
    Mercury: 'a palavra e o pensamento', Venus: 'o amor e o dinheiro', Mars: 'a ação', Jupiter: 'o crescimento e a sorte',
    Saturn: 'o dever e o esforço', Rahu: 'os desejos intensos', Ketu: 'o desapego',
  },
  retroQ: {
    Mercury: 'você relê as mensagens importantes antes de enviar?',
    Venus: 'quer rever como lida com as pessoas e o dinheiro?',
    Mars: 'você corre e não sai do lugar?',
    Jupiter: 'está em dúvida se sua meta é a certa?',
    Saturn: 'suas responsabilidades pesam?',
  },
  retroDo: {
    Mercury: 'releia antes de enviar e confirme o combinado',
    Venus: 'escolha de novo com quem e em que gastar',
    Mars: 'organize seu método antes de começar',
    Jupiter: 'reveja seus planos e escolha onde crescer',
    Saturn: 'reveja o que assumiu e reforce',
  },
  ingressQ: {
    Jupiter: 'você vê algo novo que quer fazer crescer?',
    Saturn: 'existe algo a que quer se dedicar por anos?',
    Rahu: 'algo novo começou a te atrair de repente?',
  },
  stay: { Jupiter: 'cerca de um ano', Saturn: 'cerca de dois anos e meio', Rahu: 'cerca de um ano e meio' },
  exaltQ: {
    Mercury: 'suas ideias estão se organizando com clareza?',
    Venus: 'seus laços com pessoas e dinheiro fluem?',
    Mars: 'sua energia vira resultado?',
    Jupiter: 'você vê algo novo que quer fazer crescer?',
    Saturn: 'existe algo a que quer se dedicar por anos?',
  },
  debilQ: {
    Mercury: 'está difícil se decidir?',
    Venus: 'pessoas ou dinheiro te deixam insatisfeito?',
    Mars: 'sua energia gira em falso?',
    Jupiter: 'sente que seu crescimento travou?',
    Saturn: 'suas responsabilidades pesam?',
  },
  debilDo: {
    Mercury: 'confira antes de concluir',
    Venus: 'escolha de novo o que realmente te preenche',
    Mars: 'planeje em vez de forçar',
    Jupiter: 'avance passo a passo',
    Saturn: 'reforce suas bases sem pressa',
  },
  since: (n) => `pela primeira vez em ${n} anos, `,
  rarity: (prev, next) => pairUp(prev !== undefined ? `A última vez: ${prev}` : '', next !== undefined ? `a próxima: ${next}` : '', '; '),
  retro: (d, since, p, s, q, area, todo) => [
    `Em ${d}, ${since}${p} fica retrógrado em ${s}. ${cap(q)}`,
    `${p} rege ${area}. Não é uma parada, é tempo de reforço: ${todo}.`,
  ],
  direct: (d, p, s, area) => [
    `Em ${d}, ${p} volta a ficar direto em ${s}. Algo que estava parado começa a andar?`,
    `O que você revisou sobre ${area} avança agora aos poucos.`,
  ],
  ingress: (d, since, p, s, q, area, stay) => [
    `Em ${d}, ${since}${p} entra em ${s}. ${cap(q)}`,
    `${p} rege ${area} e fica em ${s} por ${stay}. O efeito depende da casa contada do seu signo lunar.`,
  ],
  exalted: (d, since, p, s, q, area, stay) => [
    `Em ${d}, ${since}${p} entra em ${s}, onde é mais forte. ${cap(q)}`,
    `Na astrologia védica, ${p} está exaltado em ${s}. ${stay ? `Por ${stay}` : 'Enquanto estiver lá'}, o planeta que rege ${area} dá o seu melhor.`,
  ],
  debilitated: (d, since, p, s, q, todo) => [
    `Em ${d}, ${since}${p} entra em ${s}, onde tem dificuldade de mostrar sua força. ${cap(q)}`,
    `Na astrologia védica, ${p} está em queda em ${s}. Enquanto estiver lá, ${todo} e você sai mais forte.`,
  ],
  conjunction: (d, since, a, b, s, areaA, areaB) => [
    `Em ${d}, ${since}${a} e ${b} se encontram em ${s}. Sente que uma grande mudança se aproxima?`,
    `${a} rege ${areaA}; ${b}, ${areaB}. Quando se encontram num signo, o rumo desses temas muda.`,
  ],
  eclipse: (d, since, s, solar, kind) => [
    `Em ${d}, ${since}acontece um eclipse ${solar ? 'solar' : 'lunar'} ${{ total: 'total', annular: 'anular', partial: 'parcial' }[kind]} em ${s}. ${solar ? 'Quer deixar para trás um jeito antigo de fazer as coisas?' : 'Existe algo no seu coração que quer encerrar?'}`,
    `Na astrologia védica, ${solar ? 'o Sol' : 'a Lua'} encontra Rahu e Ketu. Fecha-se uma etapa ${solar ? 'das suas metas' : 'dos seus sentimentos'}.`,
  ],
};

const ID = {
  locale: 'id-ID',
  planet: { Mercury: 'Merkurius', Venus: 'Venus', Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturnus', Rahu: 'Rahu', Ketu: 'Ketu' },
  area: {
    Mercury: 'kata dan pikiran', Venus: 'cinta dan uang', Mars: 'semangat dan tindakan', Jupiter: 'pertumbuhan dan keberuntungan',
    Saturn: 'tanggung jawab dan usaha', Rahu: 'keinginan kuat', Ketu: 'melepaskan',
  },
  retroQ: {
    Mercury: 'apakah Anda membaca ulang pesan penting sebelum mengirim?',
    Venus: 'apakah Anda ingin menata ulang urusan orang dan uang?',
    Mars: 'apakah Anda terburu-buru tetapi tidak maju?',
    Jupiter: 'apakah Anda ragu tujuan Anda sudah tepat?',
    Saturn: 'apakah tanggung jawab terasa berat?',
  },
  retroDo: {
    Mercury: 'baca ulang sebelum mengirim dan pastikan janji',
    Venus: 'pilih ulang orang dan pengeluaran yang penting',
    Mars: 'rapikan cara kerja sebelum mulai',
    Jupiter: 'tinjau rencana dan pilih arah tumbuh',
    Saturn: 'tinjau beban Anda dan perkuat',
  },
  ingressQ: {
    Jupiter: 'apakah terlihat hal baru yang ingin Anda kembangkan?',
    Saturn: 'adakah hal yang ingin Anda tekuni bertahun-tahun?',
    Rahu: 'apakah tiba-tiba Anda tertarik pada hal baru?',
  },
  stay: { Jupiter: 'sekitar setahun', Saturn: 'sekitar dua setengah tahun', Rahu: 'sekitar satu setengah tahun' },
  exaltQ: {
    Mercury: 'apakah pikiran Anda tertata dengan jernih?',
    Venus: 'apakah urusan orang dan uang terasa lancar?',
    Mars: 'apakah semangat Anda langsung jadi hasil?',
    Jupiter: 'apakah terlihat hal baru yang ingin Anda kembangkan?',
    Saturn: 'adakah hal yang ingin Anda tekuni bertahun-tahun?',
  },
  debilQ: {
    Mercury: 'apakah Anda sulit mengambil keputusan?',
    Venus: 'apakah urusan orang atau uang terasa kurang?',
    Mars: 'apakah semangat Anda berputar di tempat?',
    Jupiter: 'apakah perkembangan Anda terasa tersendat?',
    Saturn: 'apakah tanggung jawab terasa berat?',
  },
  debilDo: {
    Mercury: 'periksa lagi sebelum menyimpulkan',
    Venus: 'pilih ulang hal yang benar-benar memuaskan',
    Mars: 'susun langkah daripada memaksa',
    Jupiter: 'maju selangkah demi selangkah',
    Saturn: 'perkuat fondasi tanpa terburu-buru',
  },
  since: (n) => `pertama kali dalam ${n} tahun, `,
  rarity: (prev, next) => pairUp(prev !== undefined ? `Terakhir: ${prev}` : '', next !== undefined ? `berikutnya: ${next}` : '', ', '),
  retro: (d, since, p, s, q, area, todo) => [
    `Pada ${d}, ${since}${p} mulai retrograde di ${s}. ${cap(q)}`,
    `${p} adalah planet ${area}. Ini bukan masa berhenti, melainkan masa penguatan: ${todo}.`,
  ],
  direct: (d, p, s, area) => [
    `Pada ${d}, ${p} kembali maju di ${s}. Apakah hal yang tertahan mulai bergerak?`,
    `Urusan ${area} yang Anda tinjau kini mulai maju sedikit demi sedikit.`,
  ],
  ingress: (d, since, p, s, q, area, stay) => [
    `Pada ${d}, ${since}${p} masuk ke ${s}. ${cap(q)}`,
    `${p} adalah planet ${area} dan tinggal di ${s} ${stay}. Pengaruhnya tergantung rumah dari zodiak bulan Anda.`,
  ],
  exalted: (d, since, p, s, q, area, stay) => [
    `Pada ${d}, ${since}${p} masuk ke ${s}, tempat ia paling kuat. ${cap(q)}`,
    `Dalam astrologi Weda, ${p} berada dalam eksaltasi di ${s}. ${stay ? `Selama ${stay}` : 'Selama di sana'}, planet ${area} memberi yang terbaik.`,
  ],
  debilitated: (d, since, p, s, q, todo) => [
    `Pada ${d}, ${since}${p} masuk ke ${s}, tempat ia sulit menunjukkan kekuatan. ${cap(q)}`,
    `Dalam astrologi Weda, ${p} lemah di ${s}. Selama di sana, ${todo}, maka Anda kembali lebih kuat.`,
  ],
  conjunction: (d, since, a, b, s, areaA, areaB) => [
    `Pada ${d}, ${since}${a} dan ${b} bertemu di ${s}. Apakah Anda merasakan perubahan besar mendekat?`,
    `${a} adalah planet ${areaA}, ${b} planet ${areaB}. Saat keduanya bertemu, arah bidang itu berubah.`,
  ],
  eclipse: (d, since, s, solar, kind) => [
    `Pada ${d}, ${since}terjadi gerhana ${solar ? 'matahari' : 'bulan'} ${{ total: 'total', annular: 'cincin', partial: 'sebagian' }[kind]} di ${s}. ${solar ? 'Apakah Anda ingin melepas cara lama?' : 'Adakah hal di hati yang ingin Anda tutup?'}`,
    `Dalam astrologi Weda, ${solar ? 'Matahari' : 'Bulan'} bertemu Rahu dan Ketu. Satu babak ${solar ? 'tujuan hidup' : 'perasaan'} pun ditutup.`,
  ],
};

const FR = {
  locale: 'fr-FR',
  planet: { Mercury: 'Mercure', Venus: 'Vénus', Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturne', Rahu: 'Rahu', Ketu: 'Ketu' },
  area: {
    Mercury: 'des mots et de la pensée', Venus: "de l'amour et de l'argent", Mars: "de l'action", Jupiter: 'de la croissance et de la chance',
    Saturn: "du devoir et de l'effort", Rahu: 'des désirs forts', Ketu: 'du lâcher-prise',
  },
  retroQ: {
    Mercury: 'relisez-vous vos messages importants avant de les envoyer ?',
    Venus: "voulez-vous revoir votre rapport aux autres et à l'argent ?",
    Mars: 'vous précipitez-vous sans avancer ?',
    Jupiter: 'doutez-vous que votre objectif soit le bon ?',
    Saturn: 'vos responsabilités vous pèsent-elles ?',
  },
  retroDo: {
    Mercury: 'relisez avant d’envoyer et confirmez vos engagements',
    Venus: 'choisissez à nouveau les personnes et les dépenses qui comptent',
    Mars: 'préparez votre méthode avant de vous lancer',
    Jupiter: 'revoyez vos projets et choisissez où grandir',
    Saturn: 'revoyez ce que vous portez et renforcez-le',
  },
  ingressQ: {
    Jupiter: 'voyez-vous quelque chose de nouveau à faire grandir ?',
    Saturn: 'voulez-vous vous engager dans quelque chose pour des années ?',
    Rahu: 'êtes-vous soudain attiré par quelque chose de nouveau ?',
  },
  stay: { Jupiter: 'environ un an', Saturn: 'environ deux ans et demi', Rahu: 'environ un an et demi' },
  exaltQ: {
    Mercury: 'vos idées se mettent-elles en place avec clarté ?',
    Venus: "vos liens avec les autres et l'argent sont-ils fluides ?",
    Mars: 'votre énergie se transforme-t-elle en résultats ?',
    Jupiter: 'voyez-vous quelque chose de nouveau à faire grandir ?',
    Saturn: 'voulez-vous vous engager dans quelque chose pour des années ?',
  },
  debilQ: {
    Mercury: 'avez-vous du mal à vous décider ?',
    Venus: "les autres ou l'argent vous laissent-ils insatisfait ?",
    Mars: 'votre énergie tourne-t-elle à vide ?',
    Jupiter: "avez-vous l'impression de stagner ?",
    Saturn: 'vos responsabilités vous pèsent-elles ?',
  },
  debilDo: {
    Mercury: 'vérifiez avant de conclure',
    Venus: 'choisissez à nouveau ce qui vous comble vraiment',
    Mars: 'planifiez au lieu de forcer',
    Jupiter: 'avancez pas à pas',
    Saturn: 'renforcez vos bases sans vous presser',
  },
  since: (n) => `pour la première fois depuis ${n} ans, `,
  rarity: (prev, next) => pairUp(prev !== undefined ? `Dernière fois : ${prev}` : '', next !== undefined ? `prochaine : ${next}` : '', ', '),
  retro: (d, since, p, s, q, area, todo) => [
    `Le ${d}, ${since}${p} devient rétrograde en ${s}. ${cap(q)}`,
    `${p} est la planète ${area}. Ce n'est pas un arrêt, mais un temps de renforcement : ${todo}.`,
  ],
  direct: (d, p, s, area) => [
    `Le ${d}, ${p} redevient direct en ${s}. Ce qui était bloqué se remet-il en marche ?`,
    `Ce que vous avez revu dans le domaine ${area} avance maintenant pas à pas. Reprenez ce que vous aviez mis de côté.`,
  ],
  ingress: (d, since, p, s, q, area, stay) => [
    `Le ${d}, ${since}${p} entre en ${s}. ${cap(q)}`,
    `${p} est la planète ${area} et reste en ${s} ${stay}. Son effet dépend de la maison comptée depuis votre signe lunaire.`,
  ],
  exalted: (d, since, p, s, q, area, stay) => [
    `Le ${d}, ${since}${p} entre en ${s}, le signe où elle est la plus forte. ${cap(q)}`,
    `En astrologie védique, ${p} est en exaltation en ${s}. ${stay ? `Pendant ${stay}` : 'Tant qu’elle y reste'}, la planète ${area} donne le meilleur d'elle-même.`,
  ],
  debilitated: (d, since, p, s, q, todo) => [
    `Le ${d}, ${since}${p} entre en ${s}, où elle peine à montrer sa force. ${cap(q)}`,
    `En astrologie védique, ${p} est en chute en ${s}. Tant qu’elle y reste, ${todo}, et vous en sortirez plus fort.`,
  ],
  conjunction: (d, since, a, b, s, areaA, areaB) => [
    `Le ${d}, ${since}${a} et ${b} se rejoignent en ${s}. Sentez-vous venir un grand changement ?`,
    `${a} est la planète ${areaA}, ${b} celle ${areaB}. Quand elles se rejoignent, le cours de ces domaines change.`,
  ],
  eclipse: (d, since, s, solar, kind) => [
    `Le ${d}, ${since}une éclipse ${solar ? 'solaire' : 'lunaire'} ${{ total: 'totale', annular: 'annulaire', partial: 'partielle' }[kind]} a lieu en ${s}. ${solar ? 'Avez-vous envie de quitter une vieille façon de faire ?' : 'Y a-t-il dans votre cœur quelque chose à clore ?'}`,
    `En astrologie védique, ${solar ? 'le Soleil' : 'la Lune'} rejoint alors Rahu et Ketu. Un chapitre ${solar ? 'de vos objectifs' : 'de vos sentiments'} se referme.`,
  ],
};

const DE = {
  locale: 'de-DE',
  planet: { Mercury: 'Merkur', Venus: 'Venus', Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturn', Rahu: 'Rahu', Ketu: 'Ketu' },
  area: {
    Mercury: 'Worte und Denken', Venus: 'Liebe und Geld', Mars: 'Antrieb und Handeln', Jupiter: 'Wachstum und Glück',
    Saturn: 'Pflicht und Ausdauer', Rahu: 'starke Wünsche', Ketu: 'Loslassen',
  },
  retroQ: {
    Mercury: 'lesen Sie wichtige Nachrichten vor dem Senden noch einmal?',
    Venus: 'möchten Sie Ihren Umgang mit Menschen und Geld überdenken?',
    Mars: 'hetzen Sie und kommen nicht voran?',
    Jupiter: 'zweifeln Sie, ob Ihr Ziel das richtige ist?',
    Saturn: 'wiegen Ihre Pflichten schwer?',
  },
  retroDo: {
    Mercury: 'vor dem Senden lesen und Zusagen prüfen',
    Venus: 'Menschen und Ausgaben neu wählen, die zählen',
    Mars: 'die Vorgehensweise ordnen, bevor Sie loslegen',
    Jupiter: 'Pläne prüfen und neu wählen, wohin Sie wachsen',
    Saturn: 'Übernommenes prüfen und stärken',
  },
  ingressQ: {
    Jupiter: 'sehen Sie etwas Neues, das Sie wachsen lassen möchten?',
    Saturn: 'gibt es etwas, dem Sie sich jahrelang widmen möchten?',
    Rahu: 'zieht Sie plötzlich etwas Neues an?',
  },
  stay: { Jupiter: 'etwa ein Jahr', Saturn: 'etwa zweieinhalb Jahre', Rahu: 'etwa anderthalb Jahre' },
  exaltQ: {
    Mercury: 'ordnen sich Ihre Gedanken klar?',
    Venus: 'fühlen sich Beziehungen und Geld leicht an?',
    Mars: 'wird Ihr Antrieb direkt zu Ergebnissen?',
    Jupiter: 'sehen Sie etwas Neues, das Sie wachsen lassen möchten?',
    Saturn: 'gibt es etwas, dem Sie sich jahrelang widmen möchten?',
  },
  debilQ: {
    Mercury: 'fällt es Ihnen schwer, sich zu entscheiden?',
    Venus: 'lassen Menschen oder Geld Sie unzufrieden?',
    Mars: 'läuft Ihr Antrieb ins Leere?',
    Jupiter: 'haben Sie das Gefühl, nicht weiterzukommen?',
    Saturn: 'wiegen Ihre Pflichten schwer?',
  },
  debilDo: {
    Mercury: 'prüfen Sie, bevor Sie entscheiden',
    Venus: 'wählen Sie neu, was Sie wirklich erfüllt',
    Mars: 'planen Sie, statt zu drängen',
    Jupiter: 'gehen Sie Schritt für Schritt',
    Saturn: 'stärken Sie Ihr Fundament ohne Eile',
  },
  since: (n) => `zum ersten Mal seit ${n} Jahren `,
  rarity: (prev, next) => pairUp(prev !== undefined ? `Zuletzt: ${prev}` : '', next !== undefined ? `nächstes Mal: ${next}` : '', ', '),
  retro: (d, since, p, s, q, area, todo) => [
    `Am ${d} wird ${p} ${since}im Zeichen ${s} rückläufig. ${cap(q)}`,
    `${p} steht für ${area}. Das ist kein Stillstand, sondern eine Zeit der Stärkung: ${todo}.`,
  ],
  direct: (d, p, s, area) => [
    `Am ${d} wird ${p} im Zeichen ${s} wieder direkt. Kommt etwas, das stockte, in Bewegung?`,
    `Was Sie bei ${area} überprüft haben, kommt jetzt Schritt für Schritt voran. Nehmen Sie wieder auf, was Sie zurückgestellt hatten.`,
  ],
  ingress: (d, since, p, s, q, area, stay) => [
    `Am ${d} tritt ${p} ${since}ins Zeichen ${s}. ${cap(q)}`,
    `${p} steht für ${area} und bleibt ${stay} im Zeichen ${s}. Die Wirkung hängt vom Haus ab, gezählt von Ihrem Mondzeichen.`,
  ],
  exalted: (d, since, p, s, q, area, stay) => [
    `Am ${d} tritt ${p} ${since}ins Zeichen ${s}, das Zeichen seiner größten Kraft. ${cap(q)}`,
    `In der vedischen Astrologie ist ${p} im Zeichen ${s} erhöht. ${stay ? `${cap(stay)} lang` : 'Solange er dort steht,'} gibt der Planet für ${area} sein Bestes.`,
  ],
  debilitated: (d, since, p, s, q, todo) => [
    `Am ${d} tritt ${p} ${since}ins Zeichen ${s}, wo er seine Kraft schwer zeigt. ${cap(q)}`,
    `In der vedischen Astrologie steht ${p} im Zeichen ${s} im Fall. Solange er dort steht, ${todo}, dann werden Sie stärker.`,
  ],
  conjunction: (d, since, a, b, s, areaA, areaB) => [
    `Am ${d} treffen sich ${a} und ${b} ${since}im Zeichen ${s}. Spüren Sie, dass sich eine große Wende nähert?`,
    `${a} steht für ${areaA}, ${b} für ${areaB}. Treffen sie sich in einem Zeichen, ändert sich die Richtung dieser Bereiche.`,
  ],
  eclipse: (d, since, s, solar, kind) => [
    `Am ${d} gibt es ${since}eine ${{ total: 'totale', annular: 'ringförmige', partial: 'partielle' }[kind]} ${solar ? 'Sonnenfinsternis' : 'Mondfinsternis'} im Zeichen ${s}. ${solar ? 'Möchten Sie eine alte Gewohnheit loslassen?' : 'Gibt es etwas in Ihrem Herzen, das Sie abschließen möchten?'}`,
    `In der vedischen Astrologie trifft ${solar ? 'die Sonne' : 'der Mond'} dabei auf Rahu und Ketu. Ein Kapitel ${solar ? 'Ihrer Ziele' : 'Ihrer Gefühle'} schließt sich.`,
  ],
};

const AR = {
  locale: 'ar',
  planet: { Mercury: 'عطارد', Venus: 'الزهرة', Mars: 'المريخ', Jupiter: 'المشتري', Saturn: 'زحل', Rahu: 'راهو', Ketu: 'كيتو' },
  area: {
    Mercury: 'الكلام والتفكير', Venus: 'الحب والمال', Mars: 'الحماس والفعل', Jupiter: 'النمو والحظ',
    Saturn: 'المسؤولية والجهد', Rahu: 'الرغبات القوية', Ketu: 'التخلي',
  },
  retroQ: {
    Mercury: 'هل تعيد قراءة الرسائل المهمة قبل إرسالها؟',
    Venus: 'هل ترغب في مراجعة تعاملك مع الناس والمال؟',
    Mars: 'هل تستعجل ولا تتقدم؟',
    Jupiter: 'هل تشك في أن هدفك هو الصحيح؟',
    Saturn: 'هل تشعر بثقل مسؤولياتك؟',
  },
  retroDo: {
    Mercury: 'اقرأ قبل الإرسال وتأكد من وعودك',
    Venus: 'اختر من جديد الناس والنفقات المهمة',
    Mars: 'رتّب طريقتك قبل أن تبدأ',
    Jupiter: 'راجع خططك واختر اتجاه نموك',
    Saturn: 'راجع ما تحملته وقوِّه',
  },
  ingressQ: {
    Jupiter: 'هل ترى شيئًا جديدًا تريد تنميته؟',
    Saturn: 'هل هناك أمر تريد الالتزام به لسنوات؟',
    Rahu: 'هل يجذبك فجأة شيء جديد؟',
  },
  stay: { Jupiter: 'نحو عام', Saturn: 'نحو عامين ونصف', Rahu: 'نحو عام ونصف' },
  exaltQ: {
    Mercury: 'هل تترتب أفكارك بوضوح؟',
    Venus: 'هل تسير علاقاتك وأموالك بسهولة؟',
    Mars: 'هل يتحول حماسك إلى نتائج؟',
    Jupiter: 'هل ترى شيئًا جديدًا تريد تنميته؟',
    Saturn: 'هل هناك أمر تريد الالتزام به لسنوات؟',
  },
  debilQ: {
    Mercury: 'هل يصعب عليك اتخاذ القرار؟',
    Venus: 'هل يتركك الناس أو المال غير راضٍ؟',
    Mars: 'هل يدور حماسك في الفراغ؟',
    Jupiter: 'هل تشعر أن نموك توقف؟',
    Saturn: 'هل تشعر بثقل مسؤولياتك؟',
  },
  debilDo: {
    Mercury: 'تحقق قبل أن تحكم',
    Venus: 'اختر من جديد ما يرضيك حقًا',
    Mars: 'خطّط بدل أن تدفع بقوة',
    Jupiter: 'تقدّم خطوة بخطوة',
    Saturn: 'قوِّ أساسك دون عجلة',
  },
  since: (n) => `لأول مرة منذ ${n} عامًا، `,
  rarity: (prev, next) => pairUp(prev !== undefined ? `آخر مرة: ${prev}` : '', next !== undefined ? `المرة القادمة: ${next}` : '', '، '),
  retro: (d, since, p, s, q, area, todo) => [
    `في ${d}، ${since}يبدأ ${p} تراجعه في برج ${s}. ${q}`,
    `${p} كوكب ${area}. التراجع ليس توقفًا بل وقت تقوية: ${todo}.`,
  ],
  direct: (d, p, s, area) => [
    `في ${d}، يعود ${p} إلى السير المباشر في برج ${s}. هل بدأ ما كان متوقفًا يتحرك؟`,
    `ما راجعته في ${area} يتقدم الآن خطوة بخطوة.`,
  ],
  ingress: (d, since, p, s, q, area, stay) => [
    `في ${d}، ${since}يدخل ${p} برج ${s}. ${q}`,
    `${p} كوكب ${area}، ويبقى في ${s} ${stay}. أثره يتوقف على البيت المعدود من برجك القمري.`,
  ],
  exalted: (d, since, p, s, q, area, stay) => [
    `في ${d}، ${since}يدخل ${p} برج ${s}، حيث يكون في أقوى حالاته. ${q}`,
    `في التنجيم الفيدي، ${p} في شرفه في ${s}. ${stay ? `وطوال ${stay}` : 'وما دام هناك'} يعطي كوكب ${area} أفضل ما عنده.`,
  ],
  debilitated: (d, since, p, s, q, todo) => [
    `في ${d}، ${since}يدخل ${p} برج ${s}، حيث يصعب عليه إظهار قوته. ${q}`,
    `في التنجيم الفيدي، ${p} في هبوطه في ${s}. ما دام هناك، ${todo}، فتعود أقوى.`,
  ],
  conjunction: (d, since, a, b, s, areaA, areaB) => [
    `في ${d}، ${since}يلتقي ${a} و${b} في برج ${s}. هل تشعر بتغيير كبير يقترب؟`,
    `${a} كوكب ${areaA}، و${b} كوكب ${areaB}. حين يلتقيان يتغير مسار هذه المجالات.`,
  ],
  eclipse: (d, since, s, solar, kind) => [
    `في ${d}، ${since}يحدث ${solar ? 'كسوف' : 'خسوف'} ${{ total: 'كلي', annular: 'حلقي', partial: 'جزئي' }[kind]} في برج ${s}. ${solar ? 'هل ترغب في ترك طريقة قديمة؟' : 'هل في قلبك أمر تريد إنهاءه؟'}`,
    `في التنجيم الفيدي، يلتقي ${solar ? 'الشمس' : 'القمر'} عندها براهو وكيتو. فيُغلق فصل من ${solar ? 'أهدافك' : 'مشاعرك'}.`,
  ],
};


const SIGN_NAMES = {
  es: {
    aries: 'Aries',
    taurus: 'Tauro',
    gemini: 'Géminis',
    cancer: 'Cáncer',
    leo: 'Leo',
    virgo: 'Virgo',
    libra: 'Libra',
    scorpio: 'Escorpio',
    sagittarius: 'Sagitario',
    capricorn: 'Capricornio',
    aquarius: 'Acuario',
    pisces: 'Piscis',
  },
  pt: {
    aries: 'Áries',
    taurus: 'Touro',
    gemini: 'Gêmeos',
    cancer: 'Câncer',
    leo: 'Leão',
    virgo: 'Virgem',
    libra: 'Libra',
    scorpio: 'Escorpião',
    sagittarius: 'Sagitário',
    capricorn: 'Capricórnio',
    aquarius: 'Aquário',
    pisces: 'Peixes',
  },
  id: {
    aries: 'Aries',
    taurus: 'Taurus',
    gemini: 'Gemini',
    cancer: 'Cancer',
    leo: 'Leo',
    virgo: 'Virgo',
    libra: 'Libra',
    scorpio: 'Scorpio',
    sagittarius: 'Sagitarius',
    capricorn: 'Capricorn',
    aquarius: 'Aquarius',
    pisces: 'Pisces',
  },
  ar: {
    aries: 'الحمل',
    taurus: 'الثور',
    gemini: 'الجوزاء',
    cancer: 'السرطان',
    leo: 'الأسد',
    virgo: 'العذراء',
    libra: 'الميزان',
    scorpio: 'العقرب',
    sagittarius: 'القوس',
    capricorn: 'الجدي',
    aquarius: 'الدلو',
    pisces: 'الحوت',
  },
  fr: {
    aries: 'Bélier',
    taurus: 'Taureau',
    gemini: 'Gémeaux',
    cancer: 'Cancer',
    leo: 'Lion',
    virgo: 'Vierge',
    libra: 'Balance',
    scorpio: 'Scorpion',
    sagittarius: 'Sagittaire',
    capricorn: 'Capricorne',
    aquarius: 'Verseau',
    pisces: 'Poissons',
  },
  de: {
    aries: 'Widder',
    taurus: 'Stier',
    gemini: 'Zwillinge',
    cancer: 'Krebs',
    leo: 'Löwe',
    virgo: 'Jungfrau',
    libra: 'Waage',
    scorpio: 'Skorpion',
    sagittarius: 'Schütze',
    capricorn: 'Steinbock',
    aquarius: 'Wassermann',
    pisces: 'Fische',
  },
};

const PACKS = { es: ES, pt: PT, id: ID, fr: FR, de: DE, ar: AR };
const STATIONS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
const SLOW = ['Jupiter', 'Saturn', 'Rahu'];

const signName = (lang, sign) => (SIGN_NAMES[lang] && SIGN_NAMES[lang][String(sign).toLowerCase()]) || sign;
const localDate = (lang, d, opts = { month: 'long', day: 'numeric' }) => new Intl.DateTimeFormat(PACKS[lang].locale, { ...opts, timeZone: 'UTC' }).format(d);

// { hook, body }。決まった文が無い出来事は null
function buildEventTemplateIntl(lang, event, around) {
  const pack = PACKS[lang];
  if (!pack) return null;
  const d = localDate(lang, event.date);
  const y = event.date.getUTCFullYear();
  const prev = around.prev ? around.prev.date.getUTCFullYear() : undefined;
  const next = around.next ? around.next.date.getUTCFullYear() : undefined;
  const since = prev !== undefined && y - prev >= 8 ? pack.since(y - prev) : '';
  const line = pack.rarity(prev, next);
  const s = signName(lang, event.sign);
  const done = ([hook, body]) => ({ hook, body: line ? `${body} ${line}` : body });
  const eclipse = /^(solar|lunar)-eclipse-(\w+)$/.exec(event.type);
  if (eclipse) {
    const kind = eclipse[2];
    if (!['total', 'annular', 'partial'].includes(kind)) return null;
    return done(pack.eclipse(d, since, s, eclipse[1] === 'solar', kind));
  }
  if (event.type === 'conjunction') {
    const [a, b] = event.planet.split('-');
    if (!pack.planet[a] || !pack.planet[b]) return null;
    return done(pack.conjunction(d, since, pack.planet[a], pack.planet[b], s, pack.area[a], pack.area[b]));
  }
  const name = event.planet;
  const p = pack.planet[name];
  if (!p) return null;
  switch (event.type) {
    case 'retrograde':
      return STATIONS.includes(name) ? done(pack.retro(d, since, p, s, pack.retroQ[name], pack.area[name], pack.retroDo[name])) : null;
    case 'direct':
      return STATIONS.includes(name) ? done(pack.direct(d, p, s, pack.area[name])) : null;
    case 'ingress':
      return SLOW.includes(name) ? done(pack.ingress(d, since, p, s, pack.ingressQ[name], pack.area[name], pack.stay[name])) : null;
    case 'exalted':
      return STATIONS.includes(name) ? done(pack.exalted(d, since, p, s, pack.exaltQ[name], pack.area[name], SLOW.includes(name) ? pack.stay[name] : '')) : null;
    case 'debilitated':
      return STATIONS.includes(name) ? done(pack.debilitated(d, since, p, s, pack.debilQ[name], pack.debilDo[name])) : null;
    default:
      return null;
  }
}

module.exports = { PACKS, buildEventTemplateIntl, signName, localDate };
