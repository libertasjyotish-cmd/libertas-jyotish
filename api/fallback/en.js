// Stand-in reading used when the external APIs fail (English).
module.exports = {
  luckyThemes: ['drinking warm water', 'taking in the morning sun', 'setting a pleasant scent', 'cleaning the water areas of your home', 'wearing something yellow', 'quiet reading', 'touching soil or plants'],
  luckyActions: ['turning notifications off for a while and looking inward', 'telling someone a single word of thanks', 'tidying your desk for just five minutes', 'taking ten deep breaths', 'walking a little more slowly', 'letting go of one unnecessary plan', 'going to bed early'],
  luckyLine: (theme, action) => `✨ Today's lucky theme: ${theme} | Action for good fortune: ${action}`,
  horoscope: ({ date, transitMoonSign, moonSign }) => `Your fortune for today (${date}). The transiting Moon is travelling close to ${transitMoonSign}. Today's sky is quietly stirring the passion inside you. The energy of ${moonSign} in particular casts a gentle light on your subconscious, and by moving forward one step at a time, without hurrying, you can receive a great deal of inspiration. Let your intuition be your closest ally today.`,
  influence: ({ transitNakshatra }) => `The stellar influence you receive today. The transiting Moon is passing through the nakshatra ${transitNakshatra} and forming a beautiful harmony with the house that governs your emotions. This is an ideal placement for listening to your own true voice rather than being swayed by a passing remark. Even five minutes of quiet time is the key to lifting your fortune to its highest point.`,
  dashaSummary: ({ nakshatra }) => `How to spend this planetary period. The Moon's nakshatra at the moment of your birth, ${nakshatra}, brings a rich sense of nourishment to your life. You are now in a cycle of self-care and putting things in order. Your efforts so far are just about to bear fruit quietly, so give yourself plenty of appreciation and praise.`,
  dashaTitle: 'Current major period: Jupiter Maha Dasha',
  dashaDesc: 'A great fortunate period of roughly sixteen years has come around, in which you receive the strongest blessings of Jupiter, ruler of abundance and wisdom. By trusting your intuition and throwing yourself into new learning and wider connections, the potential hidden in your destiny blueprint unfolds at a remarkable speed.',
  planetComments: [
    'Defines the vessel of your soul, your appearance, and the foundation of your destiny.',
    'Self-expression and creativity are maximised, and a leadership that warmly lights up those around you comes through.',
    'Emotion and intuition. A comfortable, unshakeable inner foundation where you can be most yourself.',
    'Analytical ability and communication. Your power to draw up meticulous plans is exceptionally sharp.',
    'Relationships, partnership, and beauty. Harmonious bonds full of affection are built.',
    'Work, career, and drive. Outstanding execution knocks down even the highest wall in one blow.',
    'Learning, fortune, and the expansion of the spirit. The wisdom and protection that guide you.',
    'Long-term foundations. Settling karma, with deep introspection and growth in the unseen world.',
    'An untiring thirst for knowledge, and a strong adaptability to new digital tools and technologies.',
    'An awakening to the spiritual world. Firm intuition inherited from past lives.'
  ],
  kundaliReading: ({ moonSign }) => `Detailed kundali reading: in your birth chart the lagna (1st house) is placed in ${moonSign}, so the direction of your soul is extremely pure and points straight at the pursuit of truth. Jupiter, the most radiant of the nine planets, sits in its own sign in the fortunate 9th house, so a great unseen protection is always at work in your life. Even if you fall into difficulty for a while, a miraculous coincidence or a supporter will surely lift you out and take you one step higher — a special placement indeed.`,
  detailedHoroscope: "Today's detailed aspect report: the angle between transiting Jupiter and the Moon draws a perfect harmony (a trine of 120 degrees). This is a highly auspicious placement in which stalled communication, systems, or misunderstandings between people are resolved in an instant, and a clear wind blows through like a wide blue sky. Finish the task in front of you with confidence and move on to release. The universe supports you one hundred per cent.",
  lifetimeDasha: 'Lifetime chart of 108 divisions: reading the biorhythm of your life (the dasha system), the Saturn period of effort and endurance has completely passed, and the golden door of the Jupiter period of wisdom and expansion is now opening. Over the coming years, the ideas you voice, the work you create, and the services you offer will reach deep into many hearts and bring you both high social regard and material abundance. As a remedy, wear gold accessories on Thursdays, or place yellow flowers in your room.'
};
