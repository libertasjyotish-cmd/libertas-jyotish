// インドネシア語の表示語彙（完全鑑定書）。キーは計算用の内部表記（日本語 / Prokerala の英字キー）。

const SIGN = {
  牡羊座: 'Aries', 牡牛座: 'Taurus', 双子座: 'Gemini', 蟹座: 'Cancer',
  獅子座: 'Leo', 乙女座: 'Virgo', 天秤座: 'Libra', 蠍座: 'Scorpio',
  射手座: 'Sagitarius', 山羊座: 'Capricorn', 水瓶座: 'Aquarius', 魚座: 'Pisces'
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
  Sun: 'Matahari', Moon: 'Bulan', Mars: 'Mars', Mercury: 'Merkurius',
  Jupiter: 'Yupiter', Venus: 'Venus', Saturn: 'Saturnus', Rahu: 'Rahu',
  Ketu: 'Ketu', Ascendant: 'Ascendant'
};

const DIGNITY = {
  exalted: 'Eksaltasi', ownsign: 'Zodiak sendiri', own: 'Zodiak sendiri', moolatrikona: 'Moolatrikona',
  greatfriend: 'Sahabat karib', friend: 'Bersahabat', neutral: 'Netral',
  enemy: 'Bermusuhan', greatenemy: 'Musuh besar', debilitated: 'Debilitasi'
};

const PLANET_DOMAIN = {
  Sun: { title: 'Kehendak dan perwujudan diri', keywords: ['kepemimpinan', 'ekspresi diri', 'keayahan', 'kedudukan di mata publik'] },
  Moon: { title: 'Emosi dan rasa aman', keywords: ['empati', 'imajinasi', 'keibuan', 'ritme harian'] },
  Mars: { title: 'Dorongan dan persaingan', keywords: ['eksekusi', 'terobosan', 'keterampilan teknis', 'daya tahan'] },
  Mercury: { title: 'Nalar dan komunikasi', keywords: ['bahasa', 'perdagangan', 'analisis', 'kecepatan berpikir'] },
  Jupiter: { title: 'Perluasan dan kebijaksanaan', keywords: ['belajar', 'membimbing', 'kepercayaan', 'menerima keberuntungan'] },
  Venus: { title: 'Keselarasan dan keindahan', keywords: ['estetika', 'hubungan', 'kenikmatan', 'seni'] },
  Saturn: { title: 'Ketekunan dan struktur', keywords: ['kesabaran', 'tanggung jawab', 'sistem', 'jangka panjang'] },
  Rahu: { title: 'Perluasan dan hasrat', keywords: ['bidang baru', 'melampaui batas', 'inovasi', 'ambisi'] },
  Ketu: { title: 'Melepas dan mendalami', keywords: ['penyelidikan', 'intuisi', 'spesialisasi', 'kelepasan'] }
};

const STONE = {
  ルビー: 'Rubi', ガーネット: 'Garnet', レッドスピネル: 'Spinel merah',
  パール: 'Mutiara', ムーンストーン: 'Batu bulan',
  レッドコーラル: 'Karang merah', カーネリアン: 'Karnelian',
  エメラルド: 'Zamrud', ペリドット: 'Peridot', グリーンアゲート: 'Akik hijau',
  イエローサファイア: 'Safir kuning', シトリン: 'Sitrin', トパーズ: 'Topaz',
  ダイヤモンド: 'Berlian', ホワイトサファイア: 'Safir putih', オパール: 'Opal',
  ブルーサファイア: 'Safir biru', アメジスト: 'Kecubung', ラピスラズリ: 'Lapis lazuli',
  ヘソナイト: 'Hessonit', スモーキークォーツ: 'Kuarsa asap',
  キャッツアイ: 'Mata kucing', タイガーアイ: 'Mata harimau'
};

const METAL = {
  ゴールド: 'Emas', シルバー: 'Perak', カッパー: 'Tembaga', プラチナ: 'Platina'
};

const COLOR = {
  ディープルビー: 'Merah rubi pekat', パールホワイト: 'Putih mutiara', コーラルレッド: 'Merah karang',
  エメラルドグリーン: 'Hijau zamrud', サフランイエロー: 'Kuning safron',
  'アイボリー／ローズ': 'Gading / merah muda', ミッドナイトブルー: 'Biru tengah malam',
  スモークグレー: 'Abu-abu asap', アースブラウン: 'Cokelat tanah'
};

const DIRECTION = {
  東: 'Timur', 西: 'Barat', 南: 'Selatan', 北: 'Utara',
  北東: 'Timur laut', 北西: 'Barat laut', 南東: 'Tenggara', 南西: 'Barat daya'
};

const ENVIRONMENT = {
  朝日の入る部屋: 'ruangan yang menerima cahaya matahari pagi',
  見晴らしの良い高所: 'tempat tinggi dengan pandangan luas',
  公的機関の集まる中心部: 'pusat kota tempat lembaga publik berkumpul',
  水辺: 'tempat di dekat air',
  静かな住宅地: 'kawasan permukiman yang tenang',
  緑と余白のある空間: 'ruang dengan pepohonan dan kelegaan',
  日当たりの強い高層階: 'lantai atas yang banyak sinar matahari',
  活気ある市街地: 'kawasan kota yang ramai',
  運動できる施設の近く: 'dekat tempat berolahraga',
  '書斎・作業部屋': 'ruang baca atau ruang kerja',
  交通の結節点: 'simpul transportasi',
  商業と文教が混じる地域: 'kawasan yang memadukan perdagangan dan pendidikan',
  学びの場の近く: 'dekat tempat menuntut ilmu',
  歴史のある落ち着いた土地: 'kawasan mapan yang bersejarah',
  広く開けた空間: 'ruang luas dan terbuka',
  '美術館・劇場のある街': 'kota dengan museum dan gedung teater',
  手入れされた庭や公園: 'taman dan kebun yang terawat',
  心地よい内装の空間: 'ruang dengan interior yang nyaman',
  落ち着いた郊外: 'pinggiran kota yang tenang',
  重厚な建築のある土地: 'kawasan dengan bangunan kukuh dan mapan',
  人の少ない静かな環境: 'tempat sepi dengan sedikit orang',
  再開発地区: 'kawasan yang sedang dibangun kembali',
  多国籍な街: 'kota multinasional',
  新しい技術が集まる場所: 'tempat berkumpulnya teknologi baru',
  自然に囲まれた土地: 'tempat yang dikelilingi alam',
  生活音の少ない場所: 'tempat dengan sedikit kebisingan',
  一人になれる空間: 'ruang tempat Anda bisa menyendiri'
};

const WORK_STYLE = {
  導く: 'Memimpin', 整える: 'Menata', 伝える: 'Menyampaikan', 創る: 'Mencipta'
};

const WORK_DETAIL = {
  Sun: 'Anda paling produktif ketika tanggung jawab jelas ada di tangan Anda: keputusan, bukan rapat panitia.',
  Moon: 'Anda paling produktif dalam peran yang membaca keadaan orang lain dan menenangkan suasana.',
  Mars: 'Anda tumbuh dalam proyek pendek yang menentukan dan di tempat yang membutuhkan terobosan teknis.',
  Mercury: 'Nilai Anda melonjak dalam pekerjaan yang melibatkan bahasa, negosiasi, dan angka.',
  Jupiter: 'Mengajar, memberi nasihat, dan dipercaya memegang tanggung jawab paling cocok untuk Anda.',
  Venus: 'Anda bersinar ketika cita rasa estetis dan kemampuan bergaul dibutuhkan sekaligus.',
  Saturn: 'Anda unggul dalam akumulasi jangka panjang, penyusunan sistem, dan pengendalian mutu.',
  Rahu: 'Anda kuat di wilayah yang belum terpetakan dan dalam coba-coba di pasar baru.',
  Ketu: 'Cara kerja yang mendalami satu bidang khusus cocok untuk Anda.'
};

const ELEMENT = { 火: 'api', 地: 'tanah', 風: 'udara', 水: 'air' };

const RHYTHM = {
  火: {
    morning: ['gerakkan tubuh begitu bangun', 'tuliskan satu tujuan untuk hari ini', 'berjemurlah sebentar di cahaya pagi'],
    night: ['kurangi layar dua jam sebelum tidur', 'tinjau esok hari dalam tiga baris', 'hangatkan diri dengan minuman hangat'],
    focus: 'Konsentrasi Anda memuncak pada pagi buta. Letakkan keputusan berat sebelum tengah hari.'
  },
  地: {
    morning: ['bangunlah pada jam yang sama', 'rapikan meja pada pagi hari', 'keluarlah menghirup udara segar'],
    night: ['hangatkan diri dengan berendam', 'kembalikan barang ke tempatnya', 'pertahankan jam tidur yang tetap'],
    focus: 'Anda mantap sejak menjelang siang hingga sore. Menumpuk tugas yang jelas batasnya adalah kekuatan Anda.'
  },
  風: {
    morning: ['lakukan peregangan ringan setelah bangun', 'catat apa pun yang terlintas', 'berjalanlah sebentar'],
    night: ['tetapkan waktu berhenti menyerap informasi', 'renungkan percakapan Anda hari itu', 'tenangkan pikiran dengan membaca'],
    focus: 'Beberapa sesi fokus yang pendek lebih cocok bagi Anda daripada satu sesi panjang sendirian.'
  },
  水: {
    morning: ['minum air begitu bangun', 'ambil lima menit hening', 'jangan menjejalkan terlalu banyak jadwal'],
    night: ['berendamlah dengan santai', 'tuliskan perasaan Anda lalu lepaskan', 'redupkan lampu lebih awal'],
    focus: 'Kepekaan Anda meningkat setelah sore menjelang. Simpan pekerjaan kreatif untuk sore dan malam.'
  }
};

const HOUSE_DOMAIN = [
  { house: 1, label: 'Diri dan tubuh', note: 'daya hidup, kesan pertama, dorongan yang menggerakkan seluruh hidup Anda' },
  { house: 2, label: 'Harta dan tutur kata', note: 'penghasilan dari tangan sendiri, tabungan, cara Anda berbicara' },
  { house: 3, label: 'Inisiatif dan saudara', note: 'keberanian, ekspresi diri, perjalanan dekat' },
  { house: 4, label: 'Rumah dan fondasi', note: 'tempat tinggal, ketenangan batin, properti' },
  { house: 5, label: 'Kreativitas dan pembelajaran', note: 'gagasan, anak, naluri berinvestasi' },
  { house: 6, label: 'Kesehatan dan pengatasan', note: 'ketekunan, persaingan, menjaga kondisi' },
  { house: 7, label: 'Hubungan dan kontrak', note: 'pasangan, kesepakatan, usaha bersama' },
  { house: 8, label: 'Transformasi dan warisan', note: 'titik balik, warisan, penyelidikan mendalam' },
  { house: 9, label: 'Keberuntungan dan keyakinan', note: 'keberuntungan yang mendorong, keilmuan, tempat jauh' },
  { house: 10, label: 'Pekerjaan dan masyarakat', note: 'profesi, reputasi, kedudukan sosial' },
  { house: 11, label: 'Perolehan dan jaringan', note: 'penghasilan yang bertumbuh, sekutu, pencapaian' },
  { house: 12, label: 'Pelepasan dan istirahat', note: 'pengeluaran, kehidupan batin, luar negeri, pemulihan' }
];

const DASHA_SEASON = {
  Sun: 'menancapkan bendera', Moon: 'merawat', Mars: 'membuka jalan',
  Mercury: 'memperluas', Jupiter: 'memetik buah', Venus: 'menikmati',
  Saturn: 'memadatkan fondasi', Rahu: 'melampaui batas', Ketu: 'menanggalkan'
};

const YOGA_GROUP = {
  'major yogas': 'Yoga utama',
  'chandra yogas': 'Yoga bulan',
  'soorya yogas': 'Yoga matahari',
  'surya yogas': 'Yoga matahari',
  'nabhasa yogas': 'Yoga nabhasa',
  'raja yogas': 'Raja yoga (posisi keberhasilan duniawi)',
  'dhana yogas': 'Dhana yoga (posisi kekayaan)',
  'other yogas': 'Yoga lainnya',
  'inauspicious yogas': 'Posisi yang perlu disesuaikan'
};

const SADE_SATI_PHASE = {
  rising: 'Fase 1 (persiapan: Saturnus melintasi zodiak sebelum Bulan Anda)',
  peak: 'Fase 2 (puncak: Saturnus melintasi zodiak yang sama dengan Bulan Anda)',
  setting: 'Fase 3 (penuntasan: Saturnus melintasi zodiak setelah Bulan Anda)',
  'small panoti': 'Panoti Kecil (Saturnus melintasi rumah ke-4 dari Bulan Anda: masa penyesuaian)',
  'ashtama sani': 'Ashtama Shani (Saturnus melintasi rumah ke-8 dari Bulan Anda: masa penataan ulang)'
};

const REMEDY = {
  sade_sati: {
    title: 'Masa untuk membangun kembali fondasi Anda',
    actions: [
      'tinjau kontrak, langganan, dan hubungan, lalu lepaskan yang tidak Anda perlukan',
      'perbaiki kebiasaan tidur dan olahraga untuk memulihkan dasar fisik',
      'gunakan waktu untuk membenahi yang sudah ada, bukan membuka hal baru',
      'teruslah memberi dalam skala kecil (donasi, mendukung yang datang sesudah Anda)'
    ]
  },
  mangal_dosha: {
    title: 'Masa untuk memilih ke mana dorongan Anda disalurkan',
    actions: [
      'jadwalkan olahraga berintensitas tinggi pada dua atau tiga hari tetap tiap pekan',
      'mundurlah dari perdebatan dan perebutan, lalu salurkan energi itu untuk membangun dan berkarya',
      'atur negosiasi penting pada hari ketika Anda cukup beristirahat dan sehat'
    ]
  },
  kaal_sarp: {
    title: 'Masa untuk menyempit pada satu hal',
    actions: [
      'kurangi pekerjaan yang berjalan sejajar dan pusatkan sumber daya hanya pada prioritas utama',
      'tuliskan tujuan jangka panjang di atas kertas dan tinjau secara berkala',
      'jaga agar ritme kehidupan harian Anda tetap stabil'
    ]
  },
  classical_to_modern: [
    { classical: 'menyedekahkan wijen hitam dan urad dal', modern: 'berdonasi untuk kegiatan sosial dan sengaja mengenakan warna hitam' },
    { classical: 'mandi di sungai suci', modern: 'mandi dengan garam alami, beristirahat di pemandian air panas atau tempat yang terkenal dengan airnya' },
    { classical: 'berkunjung ke kuil', modern: 'mengambil sepuluh menit di tempat sunyi dengan pikiran yang dimatikan' }
  ]
};

const CHAPTER_TITLE = {
  summary: 'Buku panduan tentang diri Anda, dalam satu halaman',
  ch1: 'Bab 1 — Rancangan yang bernama Anda',
  ch2: 'Bab 2 — Planet terkuat di dalam diri Anda',
  ch3: 'Bab 3 — Bentuk keberuntungan yang Anda bawa sejak lahir',
  ch4: 'Bab 4 — Benda: batu dan warna',
  ch5: 'Bab 5 — Tindakan: kebiasaan dan cara bekerja',
  ch6: 'Bab 6 — Tempat: arah dan lingkungan',
  ch7: 'Bab 7 — Panggilan hidup dan cara memakai bakat Anda',
  ch8: 'Bab 8 — Jalan Anda menuju keberlimpahan',
  ch9: 'Bab 9 — Peta hidup Anda (garis waktu kehidupan)',
  ch10: 'Bab 10 — Di mana Anda berdiri sekarang',
  ch11: 'Bab 11 — Masa keemasan yang akan datang',
  ch12: 'Bab 12 — Mengubah ujian menjadi fondasi'
};

const REASON = {
  lifeStone: (sign, planet) => `Lagna Anda (rumah 1) berada di ${sign}, dan penguasanya adalah ${planet}`,
  supportStone: (planet, start, end) => `Penguasa periode besar Anda saat ini adalah ${planet} (${start}–${end})`,
  color: (planet) => `Warna yang dikaitkan dengan ${planet}, penguasa rumah 1 Anda`,
  workStyle: (sign, planet) => `Rumah 10 Anda (pekerjaan) berada di ${sign}, dan penguasanya adalah ${planet}`,
  selfStyle: (planet) => `Penguasa rumah 1 Anda adalah ${planet}`,
  rhythm: (sign, element) => `Bulan Anda berada di ${sign}, zodiak berunsur ${element}`,
  direction1st: (planet) => `Arah yang dikaitkan dengan ${planet}, penguasa rumah 1 Anda`,
  direction10th: (planet) => `Arah yang dikaitkan dengan ${planet}, penguasa rumah 10 Anda`,
  directionRest: () => 'Arah yang dikaitkan dengan Bulan (istirahat dan pemulihan)'
};

module.exports = {
  SIGN, NAKSHATRA, PLANET, DIGNITY, PLANET_DOMAIN, STONE, METAL, COLOR,
  DIRECTION, ENVIRONMENT, WORK_STYLE, WORK_DETAIL, ELEMENT, RHYTHM, HOUSE_DOMAIN,
  DASHA_SEASON, YOGA_GROUP, SADE_SATI_PHASE, REMEDY, CHAPTER_TITLE, REASON
};
