// Leitura de reserva usada quando as APIs externas falham (português).
module.exports = {
  luckyThemes: ['beber água morna', 'tomar o sol da manhã', 'cuidar dos aromas da casa', 'limpar as áreas de água da casa', 'usar algo amarelo', 'uma leitura tranquila', 'tocar a terra ou as plantas'],
  luckyActions: ['desligar as notificações por um tempo e olhar para dentro', 'dizer a alguém uma única palavra de agradecimento', 'arrumar a sua mesa por apenas cinco minutos', 'fazer dez respirações profundas', 'caminhar um pouco mais devagar', 'abrir mão de um compromisso desnecessário', 'dormir mais cedo'],
  luckyLine: (theme, action) => `✨ Tema de sorte de hoje: ${theme} | Ação para atrair a fortuna: ${action}`,
  horoscope: ({ date, transitMoonSign, moonSign }) => `A sua fortuna de hoje (${date}). A Lua em trânsito percorre as proximidades de ${transitMoonSign}. O céu de hoje desperta com delicadeza a paixão que existe em você. Em especial, a energia de ${moonSign} lança uma luz suave sobre o seu subconsciente e, avançando passo a passo, sem pressa, você poderá receber uma grande inspiração. Hoje, faça da sua intuição a sua maior aliada.`,
  influence: ({ transitNakshatra }) => `A influência astral que você recebe hoje. A Lua em trânsito atravessa o nakshatra ${transitNakshatra} e harmoniza-se lindamente com a casa que rege as suas emoções. É uma posição ideal para ouvir a sua verdadeira voz sem se deixar levar por um comentário passageiro. Ter mesmo que cinco minutos de silêncio é a chave para elevar a sua sorte ao máximo.`,
  dashaSummary: ({ nakshatra }) => `Como viver este período planetário. O nakshatra da Lua no instante do seu nascimento, ${nakshatra}, traz uma rica nutrição à sua vida. Você está agora num ciclo de amor-próprio e de organização. Os seus esforços estão prestes a dar frutos silenciosamente, portanto acolha-se e reconheça-se bastante.`,
  dashaTitle: 'Grande período atual: Maha Dasha de Júpiter',
  dashaDesc: 'Chegou um grande período de sorte de cerca de dezesseis anos, em que você recebe com mais força as bênçãos de Júpiter, regente da abundância e da inteligência. Ao confiar na sua intuição e mergulhar em novos aprendizados e em ampliar os seus vínculos, o potencial escondido na planta do seu destino floresce numa velocidade surpreendente.',
  planetComments: [
    'Define o recipiente da sua alma, a sua aparência e a base do seu destino.',
    'A expressão pessoal e a criatividade atingem o máximo, e surge uma liderança que ilumina com calor quem está ao seu redor.',
    'Emoção e intuição. Forma-se uma base interior confortável e inabalável, onde você pode ser plenamente você.',
    'Capacidade de análise e comunicação. O seu talento para traçar planos minuciosos está muito afiado.',
    'Relacionamentos, parceria e beleza. Constroem-se laços harmoniosos e cheios de afeto.',
    'Trabalho, carreira e capacidade de ação. Uma execução notável derruba de um golpe qualquer muro.',
    'Estudo, sorte e expansão do espírito. A sabedoria e a proteção que o guiam.',
    'Bases de longo prazo. A organização do carma, com profunda introspecção e crescimento no mundo invisível.',
    'Uma sede incansável de conhecimento e uma grande adaptabilidade a novas ferramentas e tecnologias.',
    'Um despertar para o mundo espiritual. Uma intuição firme herdada de vidas passadas.'
  ],
  kundaliReading: ({ moonSign }) => `Leitura precisa do seu kundali: no seu mapa natal o lagna (casa 1) está em ${moonSign}, de modo que a direção da sua alma é extremamente pura e aponta diretamente para a busca da verdade. Júpiter, o mais luminoso dos nove planetas, encontra-se no seu próprio signo na afortunada casa 9, por isso uma grande proteção invisível age sempre na sua vida. Mesmo que você passe por um aperto temporário, uma coincidência milagrosa ou alguém que o apoie certamente o resgatará e o levará um passo mais alto: uma posição realmente especial.`,
  detailedHoroscope: 'Relatório detalhado dos aspectos de hoje: o ângulo entre Júpiter em trânsito e a Lua desenha uma harmonia perfeita (um trígono de 120 graus). É uma posição muito auspiciosa em que comunicações, sistemas ou mal-entendidos entre pessoas que estavam travados se resolvem num instante e sopra um vento claro como um céu azul. Conclua com confiança a tarefa à sua frente e siga para a publicação. O universo apoia você cem por cento.',
  lifetimeDasha: 'Histórico de vida em 108 divisões: ao ler o biorritmo da sua vida (o sistema de dashas), o período de Saturno, de esforço e paciência, ficou completamente para trás, e abre-se agora a porta dourada do período de Júpiter, de sabedoria e expansão. Nos próximos anos, as ideias que você expressar, as obras que criar e os serviços que oferecer tocarão fundo muitas pessoas e trarão grande reconhecimento social e abundância material. Como remédio, use acessórios de ouro às quintas-feiras ou coloque flores amarelas no seu quarto.'
};
