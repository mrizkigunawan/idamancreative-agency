# Panduan workspace agensi untuk pengenalan dan demo

Dokumen ini menjelaskan fungsi aplikasi, fitur, dan langkah penggunaannya. Bagian akhir memuat rancangan video stop motion untuk audiens Indonesia.

Tanggal peninjauan: 24 November 2026.

Dasar peninjauan: kode aplikasi di proyek ini, termasuk tampilan, proses penyimpanan, dan struktur datanya. Aplikasi belum diuji melalui penggunaan langsung di browser. Petunjuk berikut mengikuti alur yang tersedia dalam kode; keberhasilan layanan AI dan keluaran PDF masih perlu dicoba sebelum direkam.

## 1. Sistem ini sebenarnya apa

Workspace agensi adalah aplikasi web untuk mengelola pekerjaan agensi kreatif dan pengelolaan media sosial. Pengguna dapat mencatat calon klien, menyusun penawaran, mengatur pekerjaan konten, memantau target, dan mencatat keuangan dalam satu tempat.

Nama dan logo ruang kerja mengikuti pengaturan pada halaman profil. Sebelum dikonfigurasi, nama default yang digunakan adalah Agency Workspace. Nama produk komersialnya perlu ditetapkan pemilik jika ingin dipasarkan dengan merek tersendiri.

Contoh penggunaannya: agensi menangani tiga brand. Setiap brand punya kontak, paket layanan, jadwal produksi, dan rencana konten berbeda. Aplikasi menghubungkan catatan tersebut agar pengelola bisa melihat pekerjaan yang perlu diselesaikan.

Pengguna yang paling sesuai, berdasarkan fungsi yang tersedia:

- pemilik agensi kreatif yang mengelola beberapa klien;
- pengelola media sosial yang menangani pekerjaan bulanan;
- pekerja lepas yang membutuhkan catatan klien, konten, dan tagihan;
- studio produksi yang membutuhkan dokumen proyek dan inventaris peralatan.

Versi ini menyediakan satu akun admin per ruang kerja. Klien dapat meninjau rencana konten melalui tautan khusus. Belum terlihat fitur akun anggota tim dengan pembagian tugas dan hak akses masing-masing.

### Penjelasan singkat untuk calon pengguna

“Kelola klien, rencana konten, jadwal produksi, laporan, dan keuangan agensi dalam satu ruang kerja.”

Kalimat ini menjelaskan cakupan aplikasi tanpa menjanjikan hasil bisnis tertentu.

## 2. Istilah yang perlu dipahami

| Istilah di aplikasi | Arti praktis |
| --- | --- |
| Brand | Klien atau merek yang dikelola agensi. |
| SOW, singkatan dari scope of work | Lingkup dan target pekerjaan yang disepakati, misalnya jumlah Reels dan kunjungan produksi per bulan. |
| Retainer | Biaya layanan rutin bulanan dari klien. |
| PIC | Orang yang menjadi kontak utama klien. |
| Content plan | Rencana konten beserta jadwal dan bahan pengerjaannya. |
| Brief | Arahan untuk membuat konten. |
| Hook | Pembuka yang membantu menarik perhatian penonton. |
| CTA | Ajakan tindakan, misalnya menghubungi penjual atau menyimpan konten. |
| Pitching CRM | Catatan calon klien, penawaran, dan tindak lanjutnya. |
| Visit | Kunjungan ke lokasi klien, misalnya untuk pengambilan foto atau video. |

## 3. Fitur dan manfaatnya

### Menu utama

| Menu | Fungsi yang tersedia | Manfaat bagi pengguna |
| --- | --- | --- |
| Beranda | Ringkasan bulanan, grafik arus kas, progres konten per brand, jadwal konten, visit, dan pengingat. | Melihat pekerjaan dan kondisi usaha dari satu halaman. |
| Kalender & Visit | Kalender posting dan kunjungan, filter brand/platform/status, agenda, serta hari penting dan ide Story. | Menyusun jadwal dan melihat kegiatan yang berdekatan. |
| Brand & SOW | Profil klien, platform yang dikelola, retainer, target Reels/Feed/Story/visit, serta status aktif atau nonaktif. | Menjaga catatan layanan setiap klien. |
| Content Planner | Pratinjau feed Instagram, pengaturan urutan konten, penyuntingan cepat, dan rancangan profil Instagram. | Meninjau susunan visual sebelum publikasi. |
| Pitching CRM | Kontak prospek, estimasi nilai layanan, tahap penawaran, tanggal tindak lanjut, dokumen, dan perubahan prospek menjadi brand. | Mencatat peluang klien baru dan langkah berikutnya. |
| Keuangan | Pemasukan, pengeluaran, piutang, tagihan belum dibayar, invoice PDF, laporan PDF, dan pintasan WhatsApp. | Melihat uang yang sudah diterima serta pembayaran yang masih ditunggu. |
| Inventaris | Catatan peralatan, jumlah, harga beli, nomor seri, kondisi, lokasi, status, dan nota. | Menyimpan riwayat dan keadaan perlengkapan kerja. |

### Fitur dalam ruang kerja setiap brand

Setelah membuka satu brand, pengguna menemukan tab berikut:

| Tab | Isi |
| --- | --- |
| Profil & SOW | Kontak klien, panduan brand, retainer, dan perbandingan target dengan catatan pekerjaan bulan terpilih. |
| Content Hub | Daftar konten, perubahan status, statistik konten, Feed Planner, dan Profile Planner. |
| Links & Assets | Tautan akun sosial, template Canva, tautan lain, serta unggahan dokumen PDF brand. |
| Catatan | Permintaan tambahan, acara, tindak lanjut, tanggal pengingat, dan penanda selesai. |
| Dokumen | Offering Letter dan Work Agreement untuk layanan bulanan atau proyek produksi, dengan pratinjau dan unduhan PDF. |
| Analisa & Laporan | Metrik akun per platform, ringkasan, grafik, lampiran gambar, temuan, dan rencana bulan berikutnya. |

### Fitur pendukung

Fitur lain yang tersedia:

- tautan tinjauan content plan yang berlaku 30 hari dan dapat dinonaktifkan;
- komentar klien melalui tautan tersebut, tanpa akun admin;
- rancangan profil Instagram: foto, nama akun, bio, highlight, dan hingga tiga konten tersemat;
- umpan balik AI atas cover Instagram yang sudah diunggah;
- penggantian nama dan logo ruang kerja untuk tampilan serta dokumen keluaran;
- pengubahan profil pribadi dan kata sandi admin;
- pemuatan data contoh ketika seluruh tabel data operasional masih kosong.

Tautan Canva dan akun sosial membuka layanan di luar aplikasi. Menyimpan tautan belum berarti aplikasi terhubung ke akun tersebut.

## 4. Alur kerja dari awal sampai akhir

Alur lengkapnya:

Calon klien → penawaran → kesepakatan → brand dan SOW → rencana konten → produksi dan tinjauan → publikasi → laporan dan pencatatan pembayaran.

Pengguna yang sudah memiliki klien bisa langsung mulai dari pembuatan brand. Inventaris dan keuangan dapat dikelola selama pekerjaan berjalan.

### Langkah 1 — Masuk ke ruang kerja

1. Buka alamat aplikasi yang diberikan pemilik atau pengembang.
2. Masukkan email dan kata sandi admin.
3. Pilih **Masuk ke workspace**.
4. Periksa bulan yang sedang ditampilkan di Beranda.

Jika aplikasi belum memiliki admin, pengelola instalasi memberikan tautan aktivasi pribadi yang berlaku selama 30 menit. Buka tautan tersebut, isi nama dan kata sandi minimal delapan karakter, lalu pilih **Aktifkan workspace**. Email pemilik sudah terisi dan tidak dapat diganti. Akun langsung masuk ke workspace setelah aktivasi berhasil. Jika tautan kedaluwarsa atau hilang, minta tautan pengganti; tautan lama otomatis tidak berlaku. Pembuatan akun berikutnya ditutup setelah admin pertama dibuat.

### Langkah 2 — Sesuaikan identitas agensi

1. Buka tombol profil di kanan atas, lalu pilih **Edit profil** untuk membuka halaman profil. Dropdown menampilkan nama dan email akun dengan dua aksi: **Edit profil** dan **Keluar**. Pada ponsel, tombol profil berada di samping tombol menu.
2. Isi nama tampilan dan foto profil jika diperlukan.
3. Sesuaikan nama brand ruang kerja dan logo agensi.
4. Pilih **Simpan semua perubahan**.

Halaman tetap terbuka setelah perubahan disimpan. Gunakan **Kembali ke workspace** untuk kembali bekerja. Penggantian kata sandi tersedia di bagian **Keamanan akun** pada halaman profil.

Bagian **Tampilan workspace** menyediakan aksen Biru, Teal, Violet, dan Grafit serta mode Terang, Gelap, atau Ikuti sistem. Pratinjau berubah langsung; simpan semua perubahan agar pilihan diterapkan pada workspace. Jika meninggalkan halaman tanpa menyimpan, tampilan kembali ke pengaturan tersimpan. Laporan cetak tetap menggunakan latar terang.

Nama brand ruang kerja adalah identitas agensi dan digunakan pada halaman masuk, judul halaman, dokumen, laporan, serta tautan tinjauan. Nama penanggung jawab menjadi penanda tangan dokumen; jika kosong, nama workspace digunakan. Teks template mengikuti nama terbaru, sedangkan teks kustom tetap dipertahankan. Data klien dibuat melalui menu Brand & SOW.

### Langkah 3 — Catat calon klien

1. Buka **Pitching CRM** dan pilih **Tambah prospek**.
2. Isi nama brand, PIC, kontak, dan estimasi retainer.
3. Catat rencana SOW dan informasi hasil pembicaraan.
4. Pilih tahap prospek sesuai keadaan: Prospek, Pitching / Meeting, Sent Proposal, Negosiasi, Won, atau Lost.
5. Isi tanggal follow-up dan aksi berikutnya.
6. Pilih **Simpan perubahan**.

Tanggal tindak lanjut membantu menandai prospek yang terlambat ditangani. Pintasan WhatsApp membuka percakapan untuk nomor kontak yang sesuai.

### Langkah 4 — Siapkan penawaran dan perjanjian

1. Pada baris prospek, pilih ikon dokumen untuk membuka Dokumen Pitching.
2. Pilih **Offering Letter Bulanan** atau **Offering Letter Produksi**.
3. Isi rincian layanan, jumlah hasil kerja, biaya, jadwal, dan ketentuan pembayaran.
4. Sesuaikan isi dokumen bila diperlukan.
5. Buka pratinjau dan periksa bagian yang masih bertanda “Lengkapi”.
6. Simpan dokumen dan unduh PDF untuk disampaikan kepada calon klien.
7. Setelah kesepakatan tercapai, buat Work Agreement yang sesuai. Dokumen penawaran tersimpan juga menyediakan aksi untuk membuat agreement.
8. Perbarui status dokumen sesuai perkembangan yang sebenarnya.

Tersedia template layanan bulanan, proyek produksi, dan kerangka kosong. Pilihan English version menerjemahkan naskah template; teks yang ditulis sendiri tetap perlu disesuaikan pengguna.

Status “Ditandatangani” merupakan catatan status. Kode yang ditinjau belum menunjukkan layanan tanda tangan elektronik.

### Langkah 5 — Buat brand dan target pekerjaan

1. Dari Pitching CRM, pilih ikon panah pada prospek untuk mengubahnya menjadi brand. Alternatifnya, buka **Brand & SOW** lalu pilih **Brand Baru**.
2. Periksa nama, industri, PIC, nomor WhatsApp, akun sosial, dan alamat.
3. Pilih platform yang dikelola.
4. Isi retainer bulanan dan panduan brand.
5. Isi target Reels, Feed, Story, dan Visit per bulan.
6. Pilih **Simpan perubahan**.

Saat prospek diubah menjadi brand melalui alur ini, dokumennya dipindahkan ke brand baru. Catatan prospek kemudian dihapus dari daftar prospek. Memilih status Won saja belum menjalankan perpindahan tersebut.

Contoh fiktif untuk demo: Kedai Pagi memiliki target empat Reels, empat Feed, delapan Story, dan dua visit per bulan. Angka ini hanya contoh penggunaan.

### Langkah 6 — Lengkapi bahan kerja klien

1. Buka brand lalu pilih **Links & Assets**.
2. Tambahkan judul dan tautan akun sosial, template Canva, atau bahan kerja lain.
3. Pilih **Simpan tautan**.
4. Unggah PDF panduan atau strategi brand jika tersedia.
5. Buka **Catatan** untuk menyimpan permintaan tambahan dan tindak lanjut.
6. Isi tanggal pengingat bila diperlukan, lalu tandai catatan selesai setelah dikerjakan.

### Langkah 7 — Buat rencana konten

1. Buka brand, lalu pilih **Content Hub** → **Daftar Konten**.
2. Pilih bulan yang ingin direncanakan dan tekan **Tambah konten**.
3. Isi judul, format, tanggal tayang, platform, dan status awal.
4. Lengkapi pilar konten dan tahap pemasaran jika diperlukan.
5. Tambahkan referensi, brief pembicaraan, rincian pengambilan gambar, caption, ajakan tindakan, dan tagar.
6. Unggah cover jika tersedia. Simpan informasi khusus tim pada Notes internal.
7. Pilih **Simpan perubahan**.

Format yang tersedia mencakup Reels, Carousel, Single Post, Feed, Story, TikTok Video, Video, dan Lainnya.

Status membantu menjelaskan tahap pengerjaan:

| Status | Makna |
| --- | --- |
| Ideation | Ide masih disiapkan. |
| Scheduling | Jadwal tayang ditetapkan. |
| Brief Ready | Arahan siap digunakan untuk produksi. |
| Editing | Konten sedang dikerjakan. |
| Approval | Konten menunggu persetujuan. |
| Uploaded | Konten sudah dipublikasikan. |

Pengguna memperbarui status sendiri. Perubahan status bukan bukti bahwa aplikasi telah mengunggah konten.

### Langkah 8 — Susun tampilan Instagram

1. Buka **Content Planner** → **Feed Planner**.
2. Pilih brand Instagram dan bulan yang ingin ditinjau.
3. Pastikan konten sudah ditandai untuk platform Instagram.
4. Pilih kartu untuk mengubah judul, tanggal, status, atau cover.
5. Seret kartu untuk mencoba susunan feed.
6. Periksa urutan dan tanggal, lalu pilih **Simpan susunan**.
7. Buka **Profile Planner** untuk menyiapkan foto, nama akun, bio, highlight, serta konten tersemat.
8. Simpan rancangan profil setelah diperiksa.

Menyimpan susunan feed dapat menukar tanggal konten mengikuti urutan baru. Periksa kembali kalender sesudahnya. Rancangan profil tidak langsung mengubah profil Instagram asli.

Jika ingin meminta masukan AI tentang cover, unggah dan simpan gambar cover terlebih dahulu. Penilaian visual membutuhkan layanan AI vision yang aktif.

### Langkah 9 — Minta tinjauan klien

1. Buka daftar konten brand atau Feed Planner pada bulan yang dipilih.
2. Pilih **Bagikan semua konten**.
3. Salin tautan dan kirim sendiri kepada klien melalui saluran komunikasi yang digunakan.
4. Klien membuka tautan untuk melihat rencana konten tanpa akun admin.
5. Klien mengisi nama dan komentar, lalu memilih **Kirim masukan**.
6. Admin membuka **Kelola link** → **Lihat komentar** untuk membaca masukan.
7. Perbarui konten dan statusnya setelah meninjau masukan.

Tautan berlaku 30 hari dan dapat dinonaktifkan. Siapa pun yang memiliki tautan dapat membukanya selama masih berlaku. Komentar klien tidak otomatis mengubah status konten menjadi disetujui.

### Langkah 10 — Atur posting dan kunjungan produksi

1. Buka **Kalender & Visit** dan pilih bulan.
2. Gunakan tab **Posting** untuk melihat jadwal konten.
3. Pilih brand atau item agenda untuk membuka detail. Gunakan filter platform, brand, atau status sesuai kebutuhan.
4. Ubah tanggal melalui detail konten. Kartu kalender dengan satu posting juga dapat diseret ke tanggal lain.
5. Buka tab **Visit**, lalu pilih **Jadwalkan visit**.
6. Isi brand, tanggal, jam, lokasi, dan agenda kunjungan.
7. Simpan perubahan dan periksa jadwalnya.

Kalender juga menyediakan catatan hari penting Indonesia dan Bali beserta ide Story. Periksa kembali tanggal yang akan disebut dalam materi publikasi.

### Langkah 11 — Catat publikasi dan hasil konten

1. Publikasikan konten melalui platform media sosial atau alat publikasi yang digunakan agensi.
2. Buka Content Hub dan ubah status konten menjadi **Uploaded** setelah benar-benar tayang.
3. Pilih ikon statistik pada konten yang sudah Uploaded.
4. Isi views, likes, komentar, shares, dan saves berdasarkan data platform.
5. Simpan dan periksa progres pekerjaan di Beranda atau Profil & SOW.

Konten Uploaded dihitung sebagai konten tayang. Pada rincian SOW, Carousel dan Single Post masuk kelompok Feed. Angka Visit menghitung jadwal yang tercatat pada bulan tersebut; belum terlihat status penyelesaian kunjungan tersendiri.

### Langkah 12 — Susun laporan bulanan

1. Buka brand → **Analisa & Laporan**, lalu pilih bulan.
2. Pilih platform yang akan dilaporkan.
3. Isi followers awal, followers akhir, dan views untuk setiap platform. Ketiga angka ini wajib untuk finalisasi.
4. Lengkapi reach, kunjungan profil, klik tautan, interaksi, serta data penjualan jika relevan.
5. Pilih **Simpan draft**. Setelah laporan tersimpan, tambahkan gambar pendukung jika diperlukan.
6. Isi ringkasan, temuan, dan rencana bulan berikutnya. Tombol **Buat draft analisis** membantu merangkum angka yang dimasukkan.
7. Pilih **Pratinjau / Simpan PDF** untuk meninjau hasil melalui dialog cetak browser.
8. Simpan sebagai PDF jika ingin membagikannya.
9. Setelah data utama lengkap dan pratinjau dibuka, pilih **Tandai final**.

Jumlah konten tayang mengikuti content plan. Metrik akun tetap perlu diambil dari analitik platform dan dimasukkan pengguna. Biarkan kolom kosong jika datanya belum tersedia; isi 0 hanya jika nilainya memang nol.

Tombol Buat draft analisis pada laporan memakai perhitungan dan aturan di aplikasi.

### Langkah 13 — Catat tagihan dan pembayaran

1. Buka **Keuangan** → **Catat transaksi**.
2. Pilih jenis income untuk pemasukan atau expense untuk pengeluaran.
3. Untuk pemasukan, pilih brand atau isi klien manual.
4. Tambahkan rincian jasa/barang, jumlah, dan harga satuan. Aplikasi menghitung total pemasukan dari rincian tersebut.
5. Periksa rekening tujuan pembayaran, tanggal, kategori, dan catatan.
6. Pilih **Belum Dibayar** untuk tagihan yang belum lunas, lalu simpan.
7. Unduh invoice PDF dari transaksi pemasukan. Pintasan **Tagih** membuka WhatsApp dengan teks pengingat yang perlu dikirim pengguna.
8. Setelah pembayaran diterima, edit transaksi dan ubah status menjadi **Lunas**.
9. Gunakan **Unduh laporan PDF** untuk menyimpan ringkasan keuangan.

Ringkasan laba rugi memakai pemasukan dan pengeluaran yang berstatus Lunas. Piutang serta pengeluaran belum dibayar ditampilkan terpisah. Nilai retainer pada profil brand tidak otomatis menjadi transaksi atau invoice bulanan.

### Langkah 14 — Catat peralatan kerja

1. Buka **Inventaris** dan pilih aksi tambah barang.
2. Isi nama, kategori, merek, model, nomor seri, jumlah, dan harga beli.
3. Lengkapi tempat pembelian, kondisi, status, serta lokasi penyimpanan.
4. Lampirkan nota jika tersedia, lalu simpan.
5. Perbarui status ketika barang disimpan, perlu ditingkatkan, dijual, terjual, atau rusak.

Untuk pembelian baru yang perlu masuk ke keuangan, buat expense berkategori Inventaris. Formulir ini menyimpan detail barang sekaligus ke Inventaris. Total pengeluarannya dihitung dari harga per unit dikalikan jumlah.

### Langkah 15 — Arsipkan klien yang berhenti

1. Buka **Brand & SOW**, lalu pilih brand.
2. Pilih **Nonaktifkan** jika layanan berhenti sementara atau selesai.
3. Gunakan filter Nonaktif untuk mencari kembali catatannya.
4. Pilih **Aktifkan kembali** ketika kerja sama berlanjut.

Menonaktifkan brand mempertahankan konten dan laporan lama. Pembuatan konten baru melalui alur normal dibatasi sampai brand aktif kembali. Tindakan hapus permanen berbeda dari penonaktifan.

## 5. Batas fitur yang perlu dijaga saat promosi

Gunakan penjelasan berikut agar materi iklan sesuai kemampuan yang terlihat dalam kode:

| Topik | Penjelasan yang tepat |
| --- | --- |
| Publikasi media sosial | Aplikasi mencatat rencana dan status. Belum terlihat pengiriman posting otomatis ke Instagram, TikTok, atau platform lain. |
| Analitik | Pengguna memasukkan angka dari platform. Belum terlihat sinkronisasi otomatis statistik akun. |
| Persetujuan klien | Klien memberi masukan melalui tautan. Admin mengelola perubahan dan status konten. |
| AI | Membantu menilai cover Instagram. Hasilnya perlu diperiksa dan tidak menjamin viral atau penjualan. |
| Analisis tautan video | Ada fungsi analisis referensi di sisi server, tetapi belum terlihat terhubung ke menu saat ini. |
| Dokumen | Aplikasi membuat dan menyimpan dokumen PDF serta statusnya. Belum terlihat layanan tanda tangan elektronik. |
| Pembayaran | Aplikasi mencatat status pembayaran dan membuat invoice. Belum terlihat pemeriksaan mutasi bank atau pembayaran otomatis. |
| Akuntansi | Ringkasan berbasis kas dan catatan transaksi. Jangan menjanjikan pembukuan, pajak, atau penyusutan aset lengkap. |
| Tim | Tersedia satu akun admin per ruang kerja. Belum terlihat akun dan hak akses terpisah untuk setiap anggota. |
| Produk komersial | Harga langganan, paket pelanggan, dan pendaftaran banyak agensi belum dapat ditentukan dari proyek ini. |

## 6. Rancangan video stop motion

### Fokus video pertama

Tampilkan satu alur yang mudah diikuti: buat brand → rencanakan konten → susun feed → minta masukan → catat publikasi → buat laporan.

Alur ini memperlihatkan hubungan antarfitur. CRM, dokumen, keuangan, dan inventaris dapat mendapat video lanjutan agar layar tidak terlalu padat.

### Contoh urutan adegan 75 detik

Gunakan satu brand fiktif, misalnya Kedai Pagi. Durasi berikut adalah usulan penyuntingan, bukan hasil pengujian waktu pengerjaan aplikasi.

| Waktu | Adegan dan gerakan | Teks atau narasi |
| --- | --- | --- |
| 0–6 detik | Kartu “klien”, “ide”, “jadwal”, dan “laporan” bergerak masuk ke tampilan aplikasi. | “Pekerjaan agensi tersebar di banyak catatan?” |
| 6–12 detik | Tampilkan Beranda dan sorot progres brand serta agenda. | “Satukan catatan klien dan pekerjaan konten di satu ruang kerja.” |
| 12–20 detik | Buka Brand & SOW. Isi contoh profil dan target, lalu simpan. | “Mulai dari profil klien dan target pekerjaan bulanan.” |
| 20–30 detik | Tambahkan konten. Tampilkan judul, tanggal, brief, dan caption secara bergantian. | “Siapkan ide, arahan produksi, caption, dan jadwal tayang.” |
| 30–39 detik | Susun kartu cover di Feed Planner, lalu simpan susunan. | “Tinjau tampilan feed dan periksa kembali tanggal posting.” |
| 39–48 detik | Buat tautan tinjauan. Beralih ke halaman klien dan tampilkan komentar contoh. | “Bagikan rencana konten agar klien bisa memberi masukan.” |
| 48–55 detik | Tampilkan agenda posting dan jadwal visit. | “Lihat jadwal konten dan kunjungan produksi.” |
| 55–62 detik | Sisipkan keterangan bahwa publikasi dilakukan di platform, lalu ubah status ke Uploaded. | “Setelah tayang di media sosial, perbarui status dan catat hasilnya.” |
| 62–70 detik | Tampilkan data laporan, kemudian pratinjau PDF. | “Susun laporan bulanan dari data yang sudah kamu catat.” |
| 70–75 detik | Kembali ke Beranda dan tampilkan nama produk. | “Kenali alur kerja [nama workspace].” |

Ajakan penutup dapat diganti menjadi “Hubungi kami untuk demo” setelah pemilik menentukan kontak dan cara layanan diberikan.

### Persiapan sebelum merekam

1. Siapkan ruang kerja demo berisi data fiktif, cover contoh, dan angka analitik contoh.
2. Gunakan satu bulan yang sama di Beranda, Content Hub, Feed Planner, dan laporan.
3. Siapkan satu konten lengkap agar langkah penting terlihat tanpa merekam seluruh proses mengetik.
4. Siapkan satu jadwal visit dan satu komentar klien contoh.
5. Lengkapi angka laporan dan coba pratinjau PDF sebelum merekam.
6. Jika menampilkan AI, coba layanannya lebih dahulu. Rekam jawaban yang sudah ditinjau faktanya.
7. Gunakan data demo untuk menunjukkan pengisian formulir.
8. Periksa hasil rekaman sebelum dibagikan, termasuk nominal, gambar, dan rincian klien.

Gunakan alat perekam layar atau ambil gambar tiap tahap, lalu susun menjadi stop motion.

Jangan tampilkan kata sandi, tautan aktivasi, nomor rekening asli, atau tautan tinjauan klien sungguhan. Data contoh bawaan hanya bisa dimuat pada ruang kerja kosong; gunakan contoh fiktif yang sudah diperiksa untuk materi publik.

## 7. Catatan sumber untuk pemilik proyek

Bagian ini membantu memeriksa ulang penjelasan jika aplikasi berubah:

| Sumber | Bagian yang diperiksa |
| --- | --- |
| [Tampilan utama dan formulir](src/routes/index.tsx) | Navigasi, Beranda, brand, kalender, prospek, keuangan, AI, formulir, profil. |
| [Perencana konten](src/components/content-planner.tsx) | Susunan feed, perubahan tanggal, profil Instagram, serta pengelolaan tautan tinjauan. |
| [Halaman berbagi content plan](src/routes/api/content-plan-share.ts) | Isi yang dilihat klien, komentar, masa berlaku, dan pencabutan tautan. |
| [Laporan bulanan](src/components/monthly-report.tsx) | Input metrik, perhitungan, lampiran, pratinjau cetak, dan syarat finalisasi. |
| [Dokumen klien](src/components/client-documents.tsx) | Template penawaran, perjanjian, status, dan keluaran PDF. |
| [Inventaris](src/components/inventory-view.tsx) | Detail barang dan unggahan nota. |
| [Proses server](src/lib/server.ts) | Penyimpanan data, AI, konversi dokumen prospek, dan hubungan keuangan dengan inventaris. |
| [Struktur data](src/lib/schema.ts) | Hubungan brand, konten, prospek, laporan, dokumen, dan transaksi. |
| [Akses admin](src/lib/auth.ts) dan [petunjuk proyek](README.md) | Setup admin pertama dan pembatasan pendaftaran. |
| [Skill bahasa-indonesia-plain](https://gist.github.com/orepras/3e1ca8974fc51d11825f142fa6a66635) | Acuan bahasa untuk dokumen ini. |

README masih menyebut alur analisis referensi yang tidak terlihat di menu saat ini. Penjelasan penggunaan dalam dokumen ini mengikuti kode antarmuka yang ditinjau.
