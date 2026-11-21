// 日本語以外の言語で、根拠一覧の値だけから鑑定を組み立てる（Gemini が使えない・照合で項目が空になったとき）。
const { createTerms } = require('./_terms');

const ordEn = (n) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const LOCALE = { en: 'en-US', es: 'es-ES', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE', id: 'id-ID', ar: 'ar-u-nu-latn' };
const list = (xs, and) => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${and} ${xs[xs.length - 1]}`;

const T = {
  en: {
    house: (n) => `${ordEn(n)} house`, and: 'and',
    today: (s, k, h, m, area) => `Today the Moon is in ${s} (${k}), passing through the ${h} from your Lagna (${area}) and the ${m} from your natal Moon.`,
    good: 'This is a supportive position, so taking the first step yourself is likely to pay off.',
    caution: 'This position can be tiring, so dropping one plan today leaves you energy in reserve.',
    neutral: 'This position can make choices feel unclear, so decide on one criterion before you choose.',
    act: 'Pick one matter in this area of life today and start on it yourself.',
    joins: (xs) => `It joins your natal ${xs}.`, faces: (xs) => `It faces your natal ${xs}.`,
    ingress: (date, p, s, h) => `Around ${date}, ${p} moves into ${s}${h ? ` (the ${h} from your Lagna)` : ''}, the next turning point.`,
    natalMoon: (k) => `Your natal Moon is in ${k}.`, lagna: (s) => `Your Lagna is ${s}.`,
    dasha: (M, me, A, ae, N) => `You are in the ${M} Mahadasha (until ${me}), within the ${A} Antardasha (until ${ae}). A long-running situation is most likely to turn when this Antardasha ends in ${ae}; then the ${N} Antardasha begins.`,
    title: (M) => `${M} Mahadasha`,
    lucky: (k) => `Today's charm: the Moon in ${k}. Before an important conversation, pause for one breath before you speak.`,
    teaser: "This week's caution and tailwind days, and three concrete moves for this situation, are in the detailed report.",
    heads: ['[What is happening now]', '[Why you feel this now]', '[What lies ahead]', '[Caution and tailwind days]', '[Moves for today and this week]'],
    kinds: { good: 'tailwind day', caution: 'caution day' }, dayMoon: (h) => `the Moon in the ${h} from your Lagna`, steady: 'A steady week.',
    moveToday: 'Today: pick one matter and start on it yourself', moveGood: (d) => `${d}: a tailwind day, send the message you have been putting off`, moveWeek: 'This week: send the message you have been putting off', charm: (k) => `Today's charm: the Moon in ${k}`,
    placed: (p, s, h, r) => `${p} is in ${s}, the ${h} from your Lagna${r ? ' (retrograde)' : ''}.`, retro: 'retrograde'
  },
  es: {
    house: (n) => `casa ${n}`, and: 'y',
    today: (s, k, h, m, area) => `Hoy la Luna está en ${s} (${k}) y recorre la ${h} desde tu Lagna (${area}) y la ${m} desde tu Luna natal.`,
    good: 'Es una posición favorable: si das tú el primer paso, es probable que obtengas respuesta.',
    caution: 'Esta posición puede cansarte: quitar un plan hoy te deja energía de reserva.',
    neutral: 'Esta posición puede hacer que dudes al elegir: decide un solo criterio antes de escoger.',
    act: 'Elige hoy un solo asunto de este ámbito y empieza tú mismo.',
    joins: (xs) => `Se une a la posición natal de: ${xs}.`, faces: (xs) => `Está frente a la posición natal de: ${xs}.`,
    ingress: (date, p, s, h) => `Hacia el ${date}, ${p} entra en ${s}${h ? ` (la ${h} desde tu Lagna)` : ''}, el próximo punto de giro.`,
    natalMoon: (k) => `Tu Luna natal está en ${k}.`, lagna: (s) => `Tu Lagna es ${s}.`,
    dasha: (M, me, A, ae, N) => `Estás en la Mahadasha de ${M} (hasta ${me}), dentro de la Antardasha de ${A} (hasta ${ae}). Una situación que se alarga tiende a cambiar cuando termine esta Antardasha, en ${ae}; después empieza la Antardasha de ${N}.`,
    title: (M) => `Mahadasha de ${M}`,
    lucky: (k) => `Amuleto de hoy: la Luna en ${k}. Antes de una conversación importante, respira una vez antes de hablar.`,
    teaser: 'Los días de cautela y de viento a favor de esta semana, y tres pasos concretos para esta situación, están en el informe detallado.',
    heads: ['[Lo que te está pasando ahora]', '[Por qué lo sientes ahora]', '[Lo que viene]', '[Días de cautela y de viento a favor]', '[Pasos para hoy y esta semana]'],
    kinds: { good: 'día de viento a favor', caution: 'día de cautela' }, dayMoon: (h) => `la Luna en la ${h} desde tu Lagna`, steady: 'Una semana estable.',
    moveToday: 'Hoy: elige un solo asunto y empieza tú mismo', moveGood: (d) => `${d}: día de viento a favor, envía el mensaje que vienes posponiendo`, moveWeek: 'Esta semana: envía el mensaje que vienes posponiendo', charm: (k) => `Amuleto de hoy: la Luna en ${k}`,
    placed: (p, s, h, r) => `${p}: ${s}, ${h} desde tu Lagna${r ? ' (retrógrado)' : ''}.`, retro: 'retrógrado'
  },
  pt: {
    house: (n) => `casa ${n}`, and: 'e',
    today: (s, k, h, m, area) => `Hoje a Lua está em ${s} (${k}) e percorre a ${h} a partir do seu Lagna (${area}) e a ${m} a partir da sua Lua natal.`,
    good: 'É uma posição favorável: se você der o primeiro passo, é provável que tenha retorno.',
    caution: 'Esta posição pode cansar: tirar um compromisso hoje deixa energia de reserva.',
    neutral: 'Esta posição pode deixar as escolhas confusas: defina um único critério antes de escolher.',
    act: 'Escolha hoje um único assunto desta área e comece você mesmo.',
    joins: (xs) => `Ela se une à posição natal de: ${xs}.`, faces: (xs) => `Ela fica de frente para a posição natal de: ${xs}.`,
    ingress: (date, p, s, h) => `Por volta de ${date}, ${p} entra em ${s}${h ? ` (a ${h} a partir do seu Lagna)` : ''}, o próximo ponto de virada.`,
    natalMoon: (k) => `Sua Lua natal está em ${k}.`, lagna: (s) => `Seu Lagna é ${s}.`,
    dasha: (M, me, A, ae, N) => `Você está na Mahadasha de ${M} (até ${me}), dentro da Antardasha de ${A} (até ${ae}). Uma situação que se arrasta tende a mudar quando esta Antardasha terminar, em ${ae}; depois começa a Antardasha de ${N}.`,
    title: (M) => `Mahadasha de ${M}`,
    lucky: (k) => `Amuleto de hoje: a Lua em ${k}. Antes de uma conversa importante, respire uma vez antes de falar.`,
    teaser: 'Os dias de cautela e de vento a favor desta semana, e três passos concretos para esta situação, estão no relatório detalhado.',
    heads: ['[O que está acontecendo agora]', '[Por que você sente isso agora]', '[O que vem pela frente]', '[Dias de cautela e de vento a favor]', '[Passos para hoje e esta semana]'],
    kinds: { good: 'dia de vento a favor', caution: 'dia de cautela' }, dayMoon: (h) => `a Lua na ${h} a partir do seu Lagna`, steady: 'Uma semana estável.',
    moveToday: 'Hoje: escolha um único assunto e comece você mesmo', moveGood: (d) => `${d}: dia de vento a favor, envie a mensagem que você vem adiando`, moveWeek: 'Esta semana: envie a mensagem que você vem adiando', charm: (k) => `Amuleto de hoje: a Lua em ${k}`,
    placed: (p, s, h, r) => `${p}: ${s}, ${h} a partir do seu Lagna${r ? ' (retrógrado)' : ''}.`, retro: 'retrógrado'
  },
  fr: {
    house: (n) => `maison ${n}`, and: 'et',
    today: (s, k, h, m, area) => `Aujourd'hui, la Lune est en ${s} (${k}) et traverse la ${h} depuis votre Lagna (${area}) et la ${m} depuis votre Lune natale.`,
    good: "C'est une position favorable : si vous faites le premier pas, vous avez de bonnes chances d'obtenir une réponse.",
    caution: "Cette position peut fatiguer : retirer un projet aujourd'hui vous laisse de l'énergie en réserve.",
    neutral: 'Cette position peut brouiller vos choix : fixez un seul critère avant de choisir.',
    act: "Choisissez aujourd'hui un seul sujet dans ce domaine et lancez-vous vous-même.",
    joins: (xs) => `Elle rejoint la position natale de : ${xs}.`, faces: (xs) => `Elle fait face à la position natale de : ${xs}.`,
    ingress: (date, p, s, h) => `Vers le ${date}, ${p} entre en ${s}${h ? ` (la ${h} depuis votre Lagna)` : ''}, le prochain tournant.`,
    natalMoon: (k) => `Votre Lune natale est en ${k}.`, lagna: (s) => `Votre Lagna est ${s}.`,
    dasha: (M, me, A, ae, N) => `Vous êtes dans la Mahadasha de ${M} (jusqu'en ${me}), au sein de l'Antardasha de ${A} (jusqu'en ${ae}). Une situation qui dure a le plus de chances de tourner à la fin de cette Antardasha, en ${ae} ; ensuite commence l'Antardasha de ${N}.`,
    title: (M) => `Mahadasha de ${M}`,
    lucky: (k) => `Porte-bonheur du jour : la Lune en ${k}. Avant une conversation importante, prenez une respiration avant de parler.`,
    teaser: 'Les jours de prudence et de vent favorable de cette semaine, ainsi que trois gestes concrets pour cette situation, sont dans le rapport détaillé.',
    heads: ['[Ce qui se passe maintenant]', '[Pourquoi vous le ressentez maintenant]', '[Ce qui vous attend]', '[Jours de prudence et de vent favorable]', "[Gestes pour aujourd'hui et cette semaine]"],
    kinds: { good: 'jour de vent favorable', caution: 'jour de prudence' }, dayMoon: (h) => `la Lune dans la ${h} depuis votre Lagna`, steady: 'Une semaine stable.',
    moveToday: "Aujourd'hui : choisissez un seul sujet et lancez-vous vous-même", moveGood: (d) => `${d} : jour de vent favorable, envoyez le message que vous repoussez`, moveWeek: 'Cette semaine : envoyez le message que vous repoussez', charm: (k) => `Porte-bonheur du jour : la Lune en ${k}`,
    placed: (p, s, h, r) => `${p} : ${s}, ${h} depuis votre Lagna${r ? ' (rétrograde)' : ''}.`, retro: 'rétrograde'
  },
  de: {
    house: (n) => `${n}. Haus`, and: 'und',
    today: (s, k, h, m, area) => `Heute steht der Mond in ${s} (${k}) und läuft durch das ${h} von Ihrem Lagna aus (${area}) und das ${m} von Ihrem Geburtsmond aus.`,
    good: 'Das ist eine günstige Stellung: Wenn Sie den ersten Schritt machen, bekommen Sie wahrscheinlich eine Antwort.',
    caution: 'Diese Stellung kann ermüden: Streichen Sie heute einen Termin, dann bleibt Ihnen Kraft in Reserve.',
    neutral: 'Diese Stellung kann Entscheidungen unklar machen: Legen Sie vor der Wahl ein einziges Kriterium fest.',
    act: 'Wählen Sie heute ein einziges Anliegen aus diesem Bereich und fangen Sie selbst damit an.',
    joins: (xs) => `Er trifft auf die Geburtsposition von: ${xs}.`, faces: (xs) => `Er steht der Geburtsposition von ${xs} gegenüber.`,
    ingress: (date, p, s, h) => `Um den ${date} wechselt ${p} in ${s}${h ? ` (das ${h} von Ihrem Lagna aus)` : ''}, der nächste Wendepunkt.`,
    natalMoon: (k) => `Ihr Geburtsmond steht in ${k}.`, lagna: (s) => `Ihr Lagna ist ${s}.`,
    dasha: (M, me, A, ae, N) => `Sie befinden sich in der Mahadasha von ${M} (bis ${me}), innerhalb der Antardasha von ${A} (bis ${ae}). Eine lange andauernde Lage wendet sich am ehesten, wenn diese Antardasha im ${ae} endet; danach beginnt die Antardasha von ${N}.`,
    title: (M) => `Mahadasha von ${M}`,
    lucky: (k) => `Glücksbringer des Tages: der Mond in ${k}. Atmen Sie vor einem wichtigen Gespräch einmal durch, bevor Sie sprechen.`,
    teaser: 'Die Vorsichts- und Rückenwindtage dieser Woche sowie drei konkrete Schritte für diese Lage finden Sie im ausführlichen Bericht.',
    heads: ['[Was gerade geschieht]', '[Warum Sie es jetzt spüren]', '[Was vor Ihnen liegt]', '[Vorsichts- und Rückenwindtage]', '[Schritte für heute und diese Woche]'],
    kinds: { good: 'Rückenwindtag', caution: 'Vorsichtstag' }, dayMoon: (h) => `der Mond im ${h} von Ihrem Lagna aus`, steady: 'Eine ruhige Woche.',
    moveToday: 'Heute: ein einziges Anliegen wählen und selbst anfangen', moveGood: (d) => `${d}: Rückenwindtag, die aufgeschobene Nachricht senden`, moveWeek: 'Diese Woche: die aufgeschobene Nachricht senden', charm: (k) => `Glücksbringer des Tages: der Mond in ${k}`,
    placed: (p, s, h, r) => `${p}: ${s}, ${h} vom Lagna aus${r ? ' (rückläufig)' : ''}.`, retro: 'rückläufig'
  },
  id: {
    house: (n) => `rumah ke-${n}`, and: 'dan',
    today: (s, k, h, m, area) => `Hari ini Bulan berada di ${s} (${k}), melintasi ${h} dari Lagna Anda (${area}) dan ${m} dari Bulan kelahiran Anda.`,
    good: 'Ini posisi yang mendukung, jadi jika Anda mengambil langkah pertama, kemungkinan besar akan ada hasilnya.',
    caution: 'Posisi ini bisa melelahkan, jadi kurangi satu rencana hari ini agar tenaga tetap tersisa.',
    neutral: 'Posisi ini bisa membuat pilihan terasa kabur, jadi tetapkan satu kriteria sebelum memilih.',
    act: 'Pilih satu urusan di bidang ini hari ini dan mulailah sendiri.',
    joins: (xs) => `Ia bertemu dengan ${xs} kelahiran Anda.`, faces: (xs) => `Ia berhadapan dengan ${xs} kelahiran Anda.`,
    ingress: (date, p, s, h) => `Sekitar ${date}, ${p} masuk ke ${s}${h ? ` (${h} dari Lagna Anda)` : ''}, titik balik berikutnya.`,
    natalMoon: (k) => `Bulan kelahiran Anda berada di ${k}.`, lagna: (s) => `Lagna Anda adalah ${s}.`,
    dasha: (M, me, A, ae, N) => `Anda berada dalam Mahadasha ${M} (hingga ${me}), di dalam Antardasha ${A} (hingga ${ae}). Situasi yang berlarut-larut paling mungkin berubah saat Antardasha ini berakhir pada ${ae}; setelah itu dimulai Antardasha ${N}.`,
    title: (M) => `Mahadasha ${M}`,
    lucky: (k) => `Jimat hari ini: Bulan di ${k}. Sebelum percakapan penting, tarik napas sekali sebelum berbicara.`,
    teaser: 'Hari waspada dan hari angin baik minggu ini, serta tiga langkah konkret untuk situasi ini, ada di laporan lengkap.',
    heads: ['[Apa yang sedang terjadi]', '[Mengapa Anda merasakannya sekarang]', '[Apa yang menanti]', '[Hari waspada dan hari angin baik]', '[Langkah untuk hari ini dan minggu ini]'],
    kinds: { good: 'hari angin baik', caution: 'hari waspada' }, dayMoon: (h) => `Bulan di ${h} dari Lagna Anda`, steady: 'Minggu yang tenang.',
    moveToday: 'Hari ini: pilih satu urusan dan mulailah sendiri', moveGood: (d) => `${d}: hari angin baik, kirim pesan yang selama ini Anda tunda`, moveWeek: 'Minggu ini: kirim pesan yang selama ini Anda tunda', charm: (k) => `Jimat hari ini: Bulan di ${k}`,
    placed: (p, s, h, r) => `${p}: ${s}, ${h} dari Lagna${r ? ' (retrograde)' : ''}.`, retro: 'retrograde'
  },
  ar: {
    house: (n) => `البيت ${n}`, and: 'و',
    today: (s, k, h, m, area) => `اليوم القمر في ${s} (${k})، ويمر في ${h} من طالعك (${area}) وفي ${m} من قمر ميلادك.`,
    good: 'هذا وضع داعم، فإذا بادرت بالخطوة الأولى فالأرجح أن تجد تجاوبًا.',
    caution: 'هذا الوضع قد يكون مرهقًا، فإلغاء خطة واحدة اليوم يترك لك طاقة احتياطية.',
    neutral: 'هذا الوضع قد يجعل الاختيار غير واضح، فحدد معيارًا واحدًا قبل أن تختار.',
    act: 'اختر اليوم أمرًا واحدًا في هذا المجال وابدأ به بنفسك.',
    joins: (xs) => `ويلتقي مع موضع ${xs} في خريطة ميلادك.`, faces: (xs) => `ويقابل موضع ${xs} في خريطة ميلادك.`,
    ingress: (date, p, s, h) => `في حوالي ${date} ينتقل ${p} إلى ${s}${h ? ` (${h} من طالعك)` : ''}، وهي نقطة التحول التالية.`,
    natalMoon: (k) => `قمر ميلادك في ${k}.`, lagna: (s) => `طالعك هو ${s}.`,
    dasha: (M, me, A, ae, N) => `أنت في ماهاداشا ${M} (حتى ${me})، داخل أنتارداشا ${A} (حتى ${ae}). الوضع الذي يطول يُرجَّح أن يتغير عند انتهاء هذه الأنتارداشا في ${ae}، ثم تبدأ أنتارداشا ${N}.`,
    title: (M) => `ماهاداشا ${M}`,
    lucky: (k) => `تميمة اليوم: القمر في ${k}. قبل أي حديث مهم، خذ نفسًا واحدًا قبل أن تتكلم.`,
    teaser: 'أيام الحذر وأيام الرياح المواتية هذا الأسبوع، وثلاث خطوات عملية لهذا الوضع، تجدها في التقرير المفصل.',
    heads: ['[ما يحدث لك الآن]', '[لماذا تشعر بذلك الآن]', '[ما ينتظرك]', '[أيام الحذر وأيام الرياح المواتية]', '[خطوات اليوم وهذا الأسبوع]'],
    kinds: { good: 'يوم رياح مواتية', caution: 'يوم حذر' }, dayMoon: (h) => `القمر في ${h} من طالعك`, steady: 'أسبوع هادئ.',
    moveToday: 'اليوم: اختر أمرًا واحدًا وابدأ به بنفسك', moveGood: (d) => `${d}: يوم رياح مواتية، أرسل الرسالة التي تؤجلها`, moveWeek: 'هذا الأسبوع: أرسل الرسالة التي تؤجلها', charm: (k) => `تميمة اليوم: القمر في ${k}`,
    placed: (p, s, h, r) => `${p}: ${s}، ${h} من الطالع${r ? ' (متراجع)' : ''}.`, retro: 'متراجع'
  }
};

function composeReadingIntl(f, isPaid, rawLang) {
  const terms = createTerms(rawLang);
  const lang = T[terms.lang] ? terms.lang : 'en';
  const L = T[lang];
  const loc = LOCALE[lang];
  const sign = (x) => terms.sign(x) || x;
  const nak = (x) => terms.nakshatra(x) || x;
  const planet = (key) => terms.planet(key, key);
  const bare = (key) => planet(key).replace(/^(?:the|el|la|le|o|a|der|die|das)\s+/i, '');
  const ym = (ms) => new Date(ms).toLocaleDateString(loc, { year: 'numeric', month: 'long', timeZone: 'UTC' });
  const [ty, tm] = String(f.todayStr || '').split('-').map(Number);
  const md = (date) => {
    const [mo, da] = String(date).split('/').map(Number);
    const y = (ty || new Date().getUTCFullYear()) + (tm && mo < tm ? 1 : 0);
    return new Date(Date.UTC(y, mo - 1, da)).toLocaleDateString(loc, { month: 'long', day: 'numeric', timeZone: 'UTC' });
  };
  const area = (h) => { const d = terms.houseDomain(h, ''); return d && d.label ? d.label : ''; };
  const t = f.today;
  const d = f.dasha;
  const ing = f.ingresses[0];
  const nakName = t ? t.nakshatra : f.natalMoonNakshatra;

  let horoscope;
  let influence;
  if (t) {
    horoscope = [L.today(sign(t.sign), nak(t.nakshatra), L.house(t.house), L.house(t.houseFromMoon), area(t.house)), L[t.kind] || L.neutral, L.act].join(' ');
    influence = [
      t.conjunctKeys && t.conjunctKeys.length ? L.joins(list(t.conjunctKeys.map(bare), L.and)) : '',
      t.oppositeKeys && t.oppositeKeys.length ? L.faces(list(t.oppositeKeys.map(bare), L.and)) : '',
      ing ? L.ingress(md(ing.date), planet(ing.name), sign(ing.nextSign), ing.house ? L.house(ing.house) : '') : ''
    ].filter(Boolean).join(' ') || L.lagna(sign(f.asc));
  } else {
    horoscope = `${L.natalMoon(nak(f.natalMoonNakshatra))} ${L.act}`;
    influence = L.lagna(sign(f.asc));
  }
  const dashaText = d
    ? L.dasha(bare(d.mahaLord), ym(d.mahaEndMs), bare(d.antarLord), ym(d.antarEndMs), bare(d.nextLord))
    : `${L.lagna(sign(f.asc))} ${L.natalMoon(nak(f.natalMoonNakshatra))}`;
  const out = {
    dashaTitle: d ? L.title(bare(d.mahaLord)) : '',
    dashaDesc: dashaText,
    free_reading: { horoscope, influence, dasha_summary: dashaText, lucky_element: L.lucky(nak(nakName)), premium_teaser: L.teaser },
    planets: f.natal.map(p => ({ name: bare(p.name), sign: sign(p.sign), house: String(p.house), comment: `${sign(p.sign)}, ${L.house(p.house)}${p.retro ? `, ${L.retro}` : ''}` }))
  };
  if (isPaid) {
    const days = f.week.filter(x => x.kind !== 'neutral')
      .map(x => `・${md(x.date)}: ${L.kinds[x.kind]}${x.fromLagna ? ` (${L.dayMoon(L.house(x.fromLagna))})` : ''}`).join('\n');
    const firstGood = f.week.slice(1).find(x => x.kind === 'good');
    const moves = [`・${L.moveToday}`, `・${firstGood ? L.moveGood(md(firstGood.date)) : L.moveWeek}`, `・${L.charm(nak(nakName))}`].join('\n');
    const H = L.heads;
    out.premium_reading = {
      kundali_reading: f.natal.map(p => L.placed(bare(p.name), sign(p.sign), L.house(p.house), p.retro)).join(' '),
      detailed_horoscope: `${H[0]}\n${horoscope}\n${H[1]}\n${influence}\n${H[2]}\n${dashaText}\n${H[3]}\n${days || L.steady}\n${H[4]}\n${moves}`
    };
  }
  return out;
}

module.exports = { composeReadingIntl, COMPOSE_LANGS: Object.keys(T) };
