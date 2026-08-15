// Pembacaan cadangan yang dipakai saat API eksternal gagal (Bahasa Indonesia).
module.exports = {
  luckyThemes: ['minum air hangat', 'berjemur di matahari pagi', 'menata aroma ruangan', 'membersihkan area air di rumah', 'mengenakan sesuatu berwarna kuning', 'membaca dengan tenang', 'menyentuh tanah atau tanaman'],
  luckyActions: ['mematikan notifikasi sejenak dan menengok ke dalam diri', 'mengucapkan satu kata terima kasih kepada seseorang', 'merapikan meja selama lima menit saja', 'menarik napas dalam sepuluh kali', 'berjalan sedikit lebih pelan', 'melepaskan satu rencana yang tidak perlu', 'tidur lebih awal'],
  luckyLine: (theme, action) => `✨ Tema keberuntungan hari ini: ${theme} | Tindakan pembawa rezeki: ${action}`,
  horoscope: ({ date, transitMoonSign, moonSign }) => `Peruntungan Anda hari ini (${date}). Bulan transit sedang bergerak di sekitar ${transitMoonSign}. Langit hari ini perlahan membangunkan gairah di dalam diri Anda. Energi ${moonSign} khususnya memancarkan cahaya lembut pada alam bawah sadar Anda, dan dengan melangkah setahap demi setahap tanpa tergesa, Anda dapat menerima inspirasi yang besar. Jadikan intuisi Anda sekutu terbaik hari ini.`,
  influence: ({ transitNakshatra }) => `Pengaruh bintang yang Anda terima hari ini. Bulan transit melintasi nakshatra ${transitNakshatra} dan berpadu indah dengan rumah yang menguasai emosi Anda. Ini posisi ideal untuk mendengarkan suara sejati Anda, bukan terbawa oleh sepatah ucapan orang lain. Lima menit keheningan pun menjadi kunci untuk mengangkat keberuntungan Anda setinggi mungkin.`,
  dashaSummary: ({ nakshatra }) => `Cara menjalani periode planet ini. Nakshatra Bulan pada saat Anda lahir, ${nakshatra}, memberi kesuburan yang kaya bagi hidup Anda. Kini Anda berada dalam siklus mencintai diri dan membenahi hal-hal di sekitar. Usaha Anda selama ini hampir berbuah dengan tenang, jadi hargai dan pujilah diri Anda sebanyak mungkin.`,
  dashaTitle: 'Periode besar saat ini: Maha Dasha Jupiter',
  dashaDesc: 'Telah tiba masa keberuntungan besar sekitar enam belas tahun, saat Anda menerima berkah terkuat dari Jupiter, penguasa kelimpahan dan kecerdasan. Dengan memercayai intuisi dan terjun ke pembelajaran baru serta memperluas jejaring, potensi yang tersimpan dalam rancangan takdir Anda mekar dengan kecepatan luar biasa.',
  planetComments: [
    'Menentukan wadah jiwa, penampilan, dan dasar takdir Anda secara sempurna.',
    'Ekspresi diri dan kreativitas mencapai puncaknya, dan muncul kepemimpinan yang menghangatkan sekitar.',
    'Emosi dan intuisi. Terbentuk fondasi batin yang nyaman dan kokoh tempat Anda paling menjadi diri sendiri.',
    'Kemampuan analisis dan komunikasi. Kepiawaian menyusun rencana yang cermat sangat terasah.',
    'Relasi, kemitraan, dan keindahan. Terjalin hubungan harmonis yang penuh kasih.',
    'Pekerjaan, karier, dan daya gerak. Eksekusi yang menonjol merobohkan tembok setinggi apa pun dalam sekali pukul.',
    'Ilmu, keberuntungan, dan pemekaran jiwa. Kebijaksanaan dan perlindungan yang menuntun Anda.',
    'Fondasi jangka panjang. Membereskan karma, dengan perenungan mendalam dan pertumbuhan di dunia tak kasatmata.',
    'Rasa haus akan pengetahuan yang tak pernah padam, serta daya adaptasi tinggi pada alat dan teknologi digital baru.',
    'Kebangkitan pada dunia spiritual. Intuisi kuat yang diwarisi dari kehidupan sebelumnya.'
  ],
  kundaliReading: ({ moonSign }) => `Pembacaan kundali yang cermat: dalam bagan kelahiran Anda, lagna (rumah 1) berada di ${moonSign}, sehingga arah jiwa Anda sangat murni dan lurus menuju pencarian kebenaran. Jupiter, yang paling bercahaya di antara sembilan planet, berada di zodiaknya sendiri pada rumah 9 yang beruntung, sehingga perlindungan besar yang tak terlihat selalu bekerja dalam hidup Anda. Sekalipun Anda sempat terdesak, sebuah kebetulan ajaib atau seseorang yang mendukung pasti menolong dan mengangkat Anda selangkah lebih tinggi — sebuah posisi yang istimewa.`,
  detailedHoroscope: 'Laporan rinci aspek hari ini: sudut antara Jupiter transit dan Bulan membentuk harmoni sempurna (trine 120 derajat). Ini posisi sangat baik saat komunikasi, sistem, atau salah paham antarorang yang tersendat terurai dalam sekejap, dan angin jernih berembus seperti langit biru yang membentang. Selesaikan pekerjaan di depan Anda dengan percaya diri lalu lanjutkan ke perilisan. Semesta mendukung Anda seratus persen.',
  lifetimeDasha: 'Rekam jejak seumur hidup dalam 108 bagian: membaca bioritme hidup Anda (sistem dasha), periode Saturnus yang penuh usaha dan kesabaran telah sepenuhnya berlalu, dan kini pintu emas periode Jupiter — kebijaksanaan dan pemekaran — mulai terbuka. Dalam beberapa tahun ke depan, gagasan yang Anda sampaikan, karya yang Anda ciptakan, dan layanan yang Anda tawarkan akan menyentuh dalam hati banyak orang serta membawa penghargaan sosial yang tinggi dan kelimpahan materi. Sebagai remedi, kenakan aksesori emas setiap Kamis atau letakkan bunga kuning di kamar Anda.'
};
