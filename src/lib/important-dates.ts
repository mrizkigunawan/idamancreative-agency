export type ImportantDate = {
  date: string
  title: string
  note: string
  storyIdea: string
}

const annualDates = (year: string): ImportantDate[] => [
  { date: `${year}-01-01`, title: 'Tahun Baru Masehi', note: 'Momen untuk menyambut awal tahun dan menyusun resolusi.', storyIdea: 'Buat story ucapan tahun baru dengan tone dan warna brand.' },
  { date: `${year}-02-14`, title: 'Hari Valentine', note: 'Perayaan kasih sayang dan apresiasi.', storyIdea: 'Buat story apresiasi pelanggan, pasangan, atau komunitas dengan gaya yang sesuai brand.' },
  { date: `${year}-03-08`, title: 'Hari Perempuan Internasional', note: 'Peringatan tentang kontribusi dan kesetaraan perempuan.', storyIdea: 'Angkat cerita perempuan di balik brand atau komunitas secara autentik.' },
  { date: `${year}-04-21`, title: 'Hari Kartini', note: 'Peringatan perjuangan dan peran perempuan Indonesia.', storyIdea: 'Tampilkan sosok inspiratif atau tim perempuan dengan kutipan singkat.' },
  { date: `${year}-05-01`, title: 'Hari Buruh Internasional', note: 'Apresiasi bagi pekerja dan tim yang menjaga usaha tetap berjalan.', storyIdea: 'Buat story apresiasi tim atau proses kerja di balik produk.' },
  { date: `${year}-05-02`, title: 'Hari Pendidikan Nasional', note: 'Momentum untuk mengangkat pembelajaran dan pengetahuan.', storyIdea: 'Bagikan tips singkat atau pelajaran yang relevan dengan bidang brand.' },
  { date: `${year}-06-01`, title: 'Hari Lahir Pancasila', note: 'Peringatan dasar negara dan semangat kebinekaan.', storyIdea: 'Gunakan pesan kebersamaan dan keberagaman dengan visual yang inklusif.' },
  { date: `${year}-07-23`, title: 'Hari Anak Nasional', note: 'Peringatan hak, perlindungan, dan kesejahteraan anak.', storyIdea: 'Gunakan visual ceria dan pesan yang ramah keluarga jika relevan dengan brand.' },
  { date: `${year}-08-17`, title: 'Hari Kemerdekaan Indonesia', note: 'Peringatan Proklamasi Kemerdekaan Republik Indonesia.', storyIdea: 'Buat story merah putih atau aktivitas komunitas dengan gaya khas brand.' },
  { date: `${year}-09-09`, title: 'Hari Olahraga Nasional', note: 'Momentum untuk merayakan gerak, kebugaran, dan sportivitas.', storyIdea: 'Bagikan rutinitas aktif atau ajakan bergerak yang sesuai dengan audiens.' },
  { date: `${year}-10-02`, title: 'Hari Batik Nasional', note: 'Apresiasi terhadap batik sebagai warisan budaya Indonesia.', storyIdea: 'Tampilkan detail motif, proses, atau kolaborasi lokal secara kontekstual.' },
  { date: `${year}-10-28`, title: 'Hari Sumpah Pemuda', note: 'Peringatan persatuan dan peran generasi muda.', storyIdea: 'Angkat cerita anak muda, kolaborasi, atau komunitas di sekitar brand.' },
  { date: `${year}-11-10`, title: 'Hari Pahlawan', note: 'Peringatan jasa para pahlawan dan nilai perjuangan.', storyIdea: 'Ceritakan sosok inspiratif atau nilai pantang menyerah yang selaras dengan brand.' },
  { date: `${year}-11-25`, title: 'Hari Guru Nasional', note: 'Apresiasi untuk guru dan pendidik.', storyIdea: 'Bagikan ucapan terima kasih atau cerita tentang sosok yang mengajarkan sesuatu.' },
  { date: `${year}-12-22`, title: 'Hari Ibu', note: 'Momentum untuk mengapresiasi ibu dan figur pengasuh.', storyIdea: 'Buat story ucapan yang hangat dan personal, hindari asumsi tentang setiap keluarga.' },
  { date: `${year}-12-25`, title: 'Hari Raya Natal', note: 'Perayaan Natal bagi umat Kristiani.', storyIdea: 'Buat ucapan hangat dan inklusif; sesuaikan dengan audiens dan identitas brand.' },
]

const datedObservances: Record<string, ImportantDate[]> = {
  '2026': [
    { date: '2026-01-16', title: 'Isra Mikraj', note: 'Peringatan Isra Mikraj Nabi Muhammad SAW.', storyIdea: 'Siapkan ucapan yang santun dan informatif; hindari visual yang tidak sesuai konteks.' },
    { date: '2026-01-17', title: 'Siwa Ratri', note: 'Hari suci umat Hindu.', storyIdea: 'Gunakan ucapan yang hormat dan visual yang tenang; cek konteks lokal sebelum publikasi.' },
    { date: '2026-02-17', title: 'Tahun Baru Imlek', note: 'Tahun Baru Imlek 2577 Kongzili.', storyIdea: 'Gunakan simbol dan warna dengan sensitif; fokus pada harapan dan kebersamaan.' },
    { date: '2026-03-19', title: 'Hari Suci Nyepi', note: 'Tahun Baru Saka 1948; hari hening bagi umat Hindu, khususnya di Bali.', storyIdea: 'Siapkan ucapan hening dan reflektif sebelum Nyepi; hormati aturan dan tradisi setempat.' },
    { date: '2026-03-21', title: 'Idul Fitri', note: 'Hari Raya Idul Fitri 1447 H; tanggal libur nasional 21–22 Maret.', storyIdea: 'Buat story ucapan dan silaturahmi; jadwalkan konten lebih awal menjelang libur.' },
    { date: '2026-04-03', title: 'Wafat Yesus Kristus', note: 'Peringatan Jumat Agung bagi umat Kristiani.', storyIdea: 'Gunakan pesan yang khidmat dan visual sederhana.' },
    { date: '2026-04-04', title: 'Hari Raya Saraswati', note: 'Hari suci umat Hindu untuk menghormati ilmu pengetahuan.', storyIdea: 'Angkat tema belajar dan kebijaksanaan dengan visual yang menghormati tradisi.' },
    { date: '2026-04-05', title: 'Paskah', note: 'Perayaan Kebangkitan Yesus Kristus.', storyIdea: 'Buat ucapan penuh harapan dengan tone yang sesuai audiens.' },
    { date: '2026-04-08', title: 'Hari Raya Pagerwesi', note: 'Hari suci umat Hindu Bali.', storyIdea: 'Gunakan pesan reflektif dan pastikan konteks budaya dikonfirmasi.' },
    { date: '2026-05-14', title: 'Kenaikan Yesus Kristus', note: 'Hari raya umat Kristiani.', storyIdea: 'Siapkan ucapan yang santun dan desain yang tidak terlalu promosi.' },
    { date: '2026-05-27', title: 'Idul Adha', note: 'Hari Raya Idul Adha 1447 H.', storyIdea: 'Siapkan ucapan yang menghormati makna berbagi dan kepedulian.' },
    { date: '2026-05-31', title: 'Hari Raya Waisak', note: 'Hari Raya Waisak 2570 BE.', storyIdea: 'Gunakan visual damai dan pesan tentang welas asih serta kebijaksanaan.' },
    { date: '2026-06-17', title: 'Hari Raya Galungan', note: 'Hari suci umat Hindu Bali; tanggal 2026 tercantum pada kalender resmi.', storyIdea: 'Siapkan ucapan dengan hormat; penjor dan unsur adat perlu digunakan secara kontekstual.' },
    { date: '2026-06-27', title: 'Hari Raya Kuningan', note: 'Rangkaian Galungan bagi umat Hindu Bali.', storyIdea: 'Buat ucapan singkat dan hangat; hindari penggunaan simbol sakral sebagai dekorasi semata.' },
    { date: '2026-08-25', title: 'Maulid Nabi Muhammad SAW', note: 'Peringatan kelahiran Nabi Muhammad SAW.', storyIdea: 'Gunakan pesan santun dan informatif yang sesuai identitas brand.' },
    { date: '2026-10-31', title: 'Hari Raya Saraswati', note: 'Hari suci umat Hindu untuk menghormati ilmu pengetahuan.', storyIdea: 'Angkat tema belajar dan kebijaksanaan dengan visual yang menghormati tradisi.' },
    { date: '2026-11-04', title: 'Hari Raya Pagerwesi', note: 'Hari suci umat Hindu Bali.', storyIdea: 'Gunakan pesan reflektif dan pastikan konteks budaya dikonfirmasi.' },
    { date: '2026-11-08', title: 'Hari Deepavali', note: 'Perayaan cahaya bagi umat Hindu dan komunitas India.', storyIdea: 'Gunakan pesan harapan dan cahaya secara inklusif, sesuai audiens brand.' },
  ],
  '2027': [
    { date: '2027-01-05', title: 'Isra Mikraj', note: 'Peringatan Isra Mikraj Nabi Muhammad SAW 1448 H.', storyIdea: 'Siapkan ucapan yang santun dan informatif; hindari visual yang tidak sesuai konteks.' },
    { date: '2027-01-06', title: 'Siwa Ratri', note: 'Hari suci umat Hindu.', storyIdea: 'Gunakan ucapan yang hormat dan visual yang tenang; cek konteks lokal sebelum publikasi.' },
    { date: '2027-01-13', title: 'Hari Raya Galungan', note: 'Hari suci umat Hindu Bali.', storyIdea: 'Siapkan ucapan dengan hormat; gunakan unsur adat secara kontekstual.' },
    { date: '2027-01-23', title: 'Hari Raya Kuningan', note: 'Rangkaian Galungan bagi umat Hindu Bali.', storyIdea: 'Buat ucapan singkat dan hangat; hindari penggunaan simbol sakral sebagai dekorasi semata.' },
    { date: '2027-02-06', title: 'Tahun Baru Imlek', note: 'Tahun Baru Imlek 2578 Kongzili.', storyIdea: 'Gunakan simbol dan warna dengan sensitif; fokus pada harapan dan kebersamaan.' },
    { date: '2027-03-08', title: 'Hari Suci Nyepi', note: 'Tahun Baru Saka 1949; hari hening bagi umat Hindu, khususnya di Bali.', storyIdea: 'Siapkan ucapan hening dan reflektif sebelum Nyepi; hormati aturan dan tradisi setempat.' },
    { date: '2027-03-10', title: 'Idul Fitri', note: 'Hari Raya Idul Fitri 1448 H; mengikuti kalender libur nasional 10–11 Maret.', storyIdea: 'Buat story ucapan dan silaturahmi; jadwalkan konten lebih awal menjelang libur.' },
    { date: '2027-03-26', title: 'Wafat Yesus Kristus', note: 'Peringatan Jumat Agung bagi umat Kristiani.', storyIdea: 'Gunakan pesan yang khidmat dan visual sederhana.' },
    { date: '2027-03-28', title: 'Paskah', note: 'Perayaan Kebangkitan Yesus Kristus.', storyIdea: 'Buat ucapan penuh harapan dengan tone yang sesuai audiens.' },
    { date: '2027-05-06', title: 'Kenaikan Yesus Kristus', note: 'Hari raya umat Kristiani.', storyIdea: 'Siapkan ucapan yang santun dan desain yang tidak terlalu promosi.' },
    { date: '2027-05-17', title: 'Idul Adha', note: 'Hari Raya Idul Adha 1448 H menurut kalender libur nasional 2027.', storyIdea: 'Siapkan ucapan yang menghormati makna berbagi dan kepedulian.' },
    { date: '2027-05-20', title: 'Hari Raya Waisak', note: 'Hari Raya Waisak 2571 BE.', storyIdea: 'Gunakan visual damai dan pesan tentang welas asih serta kebijaksanaan.' },
    { date: '2027-06-06', title: 'Tahun Baru Islam', note: '1 Muharam 1449 H menurut kalender libur nasional 2027.', storyIdea: 'Buat ucapan reflektif tentang awal baru dengan desain yang sederhana.' },
    { date: '2027-08-11', title: 'Hari Raya Galungan', note: 'Hari suci umat Hindu Bali.', storyIdea: 'Siapkan ucapan dengan hormat; gunakan unsur adat secara kontekstual.' },
    { date: '2027-08-15', title: 'Maulid Nabi Muhammad SAW', note: 'Peringatan kelahiran Nabi Muhammad SAW.', storyIdea: 'Gunakan pesan santun dan informatif yang sesuai identitas brand.' },
    { date: '2027-08-21', title: 'Hari Raya Kuningan', note: 'Rangkaian Galungan bagi umat Hindu Bali.', storyIdea: 'Buat ucapan singkat dan hangat; hindari penggunaan simbol sakral sebagai dekorasi semata.' },
    { date: '2027-10-25', title: 'Hari Raya Saraswati', note: 'Hari suci umat Hindu untuk menghormati ilmu pengetahuan.', storyIdea: 'Angkat tema belajar dan kebijaksanaan dengan visual yang menghormati tradisi.' },
    { date: '2027-12-25', title: 'Hari Raya Saraswati', note: 'Hari suci umat Hindu untuk menghormati ilmu pengetahuan.', storyIdea: 'Angkat tema belajar dan kebijaksanaan dengan visual yang menghormati tradisi.' },
    { date: '2027-12-26', title: 'Isra Mikraj', note: 'Peringatan Isra Mikraj Nabi Muhammad SAW 1449 H.', storyIdea: 'Siapkan ucapan yang santun dan informatif; hindari visual yang tidak sesuai konteks.' },
  ],
}

export function getImportantDates(month: string): ImportantDate[] {
  const year = month.slice(0, 4)
  return [...annualDates(year), ...(datedObservances[year] ?? [])]
    .filter((item) => item.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
}
