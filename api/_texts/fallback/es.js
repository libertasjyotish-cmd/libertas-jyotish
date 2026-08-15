// Lectura de reserva usada cuando fallan las API externas (español).
module.exports = {
  luckyThemes: ['beber agua tibia', 'recibir el sol de la mañana', 'cuidar los aromas de tu casa', 'limpiar las zonas de agua del hogar', 'llevar algo amarillo', 'una lectura tranquila', 'tocar la tierra o las plantas'],
  luckyActions: ['apagar un rato las notificaciones y mirar hacia dentro', 'decirle a alguien una sola palabra de agradecimiento', 'ordenar tu escritorio durante cinco minutos', 'hacer diez respiraciones profundas', 'caminar un poco más despacio', 'soltar un plan innecesario', 'acostarte temprano'],
  luckyLine: (theme, action) => `✨ Tema de suerte de hoy: ${theme} | Acción para atraer fortuna: ${action}`,
  horoscope: ({ date, transitMoonSign, moonSign }) => `Tu fortuna de hoy (${date}). La Luna en tránsito recorre las cercanías de ${transitMoonSign}. El cielo de hoy despierta con suavidad la pasión que llevas dentro. En especial la energía de ${moonSign} arroja una luz amable sobre tu subconsciente y, avanzando paso a paso y sin prisa, podrás recibir una gran inspiración. Hoy haz de tu intuición tu mejor aliada.`,
  influence: ({ transitNakshatra }) => `La influencia astral que recibes hoy. La Luna en tránsito atraviesa el nakshatra ${transitNakshatra} y armoniza bellamente con la casa que rige tus emociones. Es una posición ideal para escuchar tu propia voz verdadera sin dejarte llevar por un comentario pasajero. Tener aunque sean cinco minutos de silencio es la clave para elevar tu fortuna al máximo.`,
  dashaSummary: ({ nakshatra }) => `Cómo vivir este periodo planetario. El nakshatra de la Luna en el instante de tu nacimiento, ${nakshatra}, aporta una rica nutrición a tu vida. Ahora estás en un ciclo de amor propio y de poner orden. Tus esfuerzos están a punto de dar fruto en silencio, así que cuídate y reconócete mucho.`,
  dashaTitle: 'Gran periodo actual: Maha Dasha de Júpiter',
  dashaDesc: 'Ha llegado un gran periodo de fortuna de unos dieciséis años en el que recibes con más fuerza las bendiciones de Júpiter, regente de la abundancia y la inteligencia. Al confiar en tu intuición y lanzarte a nuevos aprendizajes y a ampliar tus vínculos, el potencial escondido en el plano de tu destino florece a una velocidad asombrosa.',
  planetComments: [
    'Define el recipiente de tu alma, tu apariencia y la base de tu destino.',
    'La expresión personal y la creatividad alcanzan su máximo, y surge un liderazgo que ilumina con calidez a quienes te rodean.',
    'Emoción e intuición. Se forma una base interior cómoda e inquebrantable donde puedes ser plenamente tú.',
    'Capacidad de análisis y comunicación. Tu talento para trazar planes minuciosos está muy afinado.',
    'Relaciones, pareja y belleza. Se construyen vínculos armoniosos llenos de afecto.',
    'Trabajo, carrera y capacidad de acción. Una ejecución sobresaliente derriba de un golpe cualquier muro.',
    'Estudio, fortuna y expansión del espíritu. La sabiduría y la protección que te guían.',
    'Bases a largo plazo. Ordenar el karma, con profunda introspección y crecimiento en el mundo invisible.',
    'Una sed incansable de conocimiento y una gran adaptabilidad a las nuevas herramientas y tecnologías.',
    'Un despertar al mundo espiritual. Una intuición firme heredada de vidas pasadas.'
  ],
  kundaliReading: ({ moonSign }) => `Lectura precisa de tu kundali: en tu carta natal el lagna (casa 1) está en ${moonSign}, de modo que la dirección de tu alma es sumamente pura y apunta de lleno a la búsqueda de la verdad. Júpiter, el más luminoso de los nueve planetas, se encuentra en su propio signo en la afortunada casa 9, por lo que en tu vida actúa siempre una gran protección invisible. Aunque te veas en apuros por un tiempo, una coincidencia milagrosa o una persona que te apoye te sacarán adelante y te llevarán un paso más arriba: una posición realmente especial.`,
  detailedHoroscope: 'Informe detallado de aspectos de hoy: el ángulo entre Júpiter en tránsito y la Luna dibuja una armonía perfecta (un trígono de 120 grados). Es una posición muy auspiciosa en la que las comunicaciones, los sistemas o los malentendidos entre personas que estaban atascados se resuelven en un instante y sopla un viento claro como un cielo azul. Termina con confianza la tarea que tienes delante y avanza hacia su publicación. El universo te apoya al cien por cien.',
  lifetimeDasha: 'Historial vital de 108 divisiones: al leer el biorritmo de tu vida (el sistema de dashas), el periodo de Saturno, de esfuerzo y paciencia, ha quedado completamente atrás y se abre ahora la puerta dorada del periodo de Júpiter, de sabiduría y expansión. Durante los próximos años, las ideas que expreses, las obras que crees y los servicios que ofrezcas calarán hondo en muchas personas y te traerán un gran reconocimiento social y abundancia material. Como remedio, lleva accesorios de oro los jueves o pon flores amarillas en tu habitación.'
};
