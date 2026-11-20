# DEVELOPMENT BRIEF: WEBSITE KELAS SDT A

## 1. Project Overview

Saya ingin melanjutkan pengembangan website statis kelas 1 SDT A (Sains Data Terapan A), PENS, menjadi sebuah platform informasi dan manajemen kelas berbasis database dengan sistem autentikasi dan manajemen hak akses pengguna.

Website yang sudah ada menggunakan HTML, CSS, dan Vanilla JavaScript. Pertahankan teknologi, struktur, desain, dan komponen yang sudah ada selama masih layak digunakan.

Backend akan menggunakan **Appwrite Cloud (Free Plan)**, sedangkan frontend tetap menggunakan hosting yang sudah tersedia.

Prioritas utama:
- Ringan dan cepat.
- Sederhana, mudah digunakan, dan tidak berlebihan.
- Mobile-first, karena mayoritas pengguna mengakses melalui HP.
- Responsif di desktop.
- Aman dengan sistem autentikasi dan otorisasi yang benar.
- Semua fitur berfungsi dan terintegrasi dengan baik.
- Meminimalkan perubahan terhadap kode dan desain yang sudah ada.
- Tidak menggunakan layanan berbayar atau fitur yang membutuhkan biaya tambahan.

Website boleh dikunjungi publik untuk melihat informasi yang memang bersifat publik, tetapi hanya pengguna internal yang sudah login yang boleh melakukan perubahan data.

## 2. Instruksi Utama untuk Development

JANGAN langsung mengubah atau menulis ulang seluruh kode website.

Lakukan tahapan berikut:

1. Audit seluruh struktur folder dan file proyek.
2. Pelajari index.html, CSS, JavaScript, dan seluruh file data yang sudah ada.
3. Identifikasi semua fitur yang sudah tersedia dan bagaimana cara kerjanya.
4. Identifikasi fitur yang belum berfungsi, masih menggunakan data statis, atau membutuhkan integrasi database.
5. Pelajari kemungkinan konflik antara struktur lama dan sistem baru.
6. Rancang arsitektur backend Appwrite, struktur database, autentikasi, dan permission.
7. Buat rencana migrasi data dan pengembangan.
8. Sajikan hasil audit, rancangan sistem, dan tahapan pengerjaan terlebih dahulu.

**Jangan melakukan perubahan kode sebelum rencana dan arsitektur disampaikan dan mendapatkan persetujuan.**

Setelah disetujui, kerjakan secara bertahap. Jangan mengimplementasikan seluruh fitur sekaligus tanpa pengujian.

---

# 3. Sistem Autentikasi dan Manajemen Pengguna

Jumlah pengguna awal: 24 mahasiswa, terdiri dari tiga role.

Tidak ada fitur registrasi publik. Seluruh akun dibuat dan dikelola oleh admin.

### A. Admin

Admin memiliki akses penuh terhadap seluruh website.

Hak akses:
- Mengelola seluruh akun pengguna.
- Menambahkan dan menghapus akun.
- Mengedit identitas pengguna.
- Mengatur dan mengubah role.
- Reset password pengguna.
- Mengelola seluruh konten dan fitur.
- Mengakses seluruh dashboard pengelolaan.
- Mengelola konfigurasi sistem.

### B. Pengurus

Role ini digunakan oleh pengurus kelas, seperti:
- Ketua kelas.
- Wakil ketua.
- Sekretaris.
- Bendahara.
- Penanggung jawab mata kuliah.

Hak akses:
- Mengelola pengumuman.
- Mengelola tugas.
- Mengelola jadwal pengganti.
- Mengelola uang kas sesuai tanggung jawab.
- Mengelola tautan.
- Mengelola konten kelas lainnya sesuai kewenangan.

Pengurus juga dapat diberikan tanggung jawab khusus berdasarkan mata kuliah.

Contoh:
- Pengurus A bertanggung jawab atas mata kuliah 1.
- Pengurus B bertanggung jawab atas mata kuliah 2 dan 3.
- Pengurus C bertanggung jawab atas seluruh mata kuliah.

Buat sistem penugasan penanggung jawab mata kuliah yang fleksibel. Admin dapat menentukan dan mengubah penanggung jawab kapan saja.

Pengurus yang bertanggung jawab atas suatu mata kuliah dapat mengelola jadwal pengganti mata kuliah tersebut. Pengurus dengan kewenangan keuangan dapat mengelola uang kas.

### C. Mahasiswa

Role standar untuk seluruh mahasiswa kelas.

Hak akses:
- Melihat jadwal.
- Melihat pengumuman.
- Melihat daftar tugas.
- Melihat materi dan rangkuman.
- Melihat informasi uang kas.
- Melihat profil mahasiswa.
- Melihat tautan penting.
- Mengedit profil pribadi.
- Mengganti password.
- Menambahkan, mengedit, melengkapi, dan menghapus kontribusi rangkuman.

Mahasiswa tidak boleh mengubah data administrasi kelas seperti jadwal resmi, tugas, transaksi kas, atau pengumuman.

**Pengecualian penting: seluruh pengguna internal, apa pun rolenya, memiliki hak kontribusi penuh pada fitur rangkuman.**

### D. Sistem akun dan password

- Admin membuat seluruh 24 akun mahasiswa.
- Username menggunakan NIM atau identitas login yang disepakati.
- Sistem menghasilkan password acak yang berbeda untuk setiap pengguna.
- Admin dapat melihat atau membagikan kredensial awal saat akun dibuat.
- Tidak ada registrasi mandiri.
- Tidak perlu verifikasi email atau nomor telepon.
- Mahasiswa dapat mengganti password dengan memasukkan password lama dan password baru.
- Jika lupa password, mahasiswa menghubungi admin.
- Admin dapat melakukan reset password dan menghasilkan password sementara yang baru.

Gunakan Appwrite Authentication dengan mekanisme identitas login internal jika diperlukan.

Jangan menyimpan password dalam bentuk teks biasa di database.

Operasi administrasi akun yang membutuhkan hak istimewa harus dilakukan melalui Appwrite Functions atau mekanisme server-side yang aman.

Jangan pernah menempatkan Appwrite API Key atau secret key di frontend.

---

# 4. Pengembangan dan Integrasi Fitur

Pertahankan menu yang sudah ada:
- Jadwal
- Anggota
- Pengurus
- Tugas
- Rangkuman
- Bantuan

Menu lain seperti kas dan tautan tetap dipertahankan apabila sudah tersedia di frontend.

Pastikan setiap fitur benar-benar terhubung dengan Appwrite dan tidak lagi bergantung pada data statis apabila datanya seharusnya dinamis.

## A. Jadwal

Pertahankan sistem jadwal yang sudah ada, yaitu:
- Jadwal Senin sampai Jumat.
- Tampilan jadwal berdasarkan hari.
- Kalender bulanan.
- Informasi mata kuliah dan jadwal perkuliahan.

Tambahkan sistem jadwal pengganti atau reschedule.

### Mekanisme jadwal pengganti

Jadwal perkuliahan reguler merupakan jadwal permanen berdasarkan kurikulum atau jadwal resmi kampus.

Jangan mengubah jadwal reguler ketika terjadi reschedule.

Contoh:

Jadwal reguler:
- Senin, 08.00–09.40: Statistika Dasar.

Ada perubahan jadwal:
- Statistika Dasar pada Senin, 23 November 2026 dipindahkan ke Rabu, 25 November 2026.
- Jam pengganti: 13.00–14.40.

Sistem harus:
1. Menyimpan jadwal reguler sebagai jadwal utama.
2. Menyimpan jadwal pengganti sebagai data terpisah.
3. Menampilkan informasi perubahan jadwal dengan penanda khusus.
4. Menampilkan tanggal, jam, lokasi, dan keterangan perubahan.
5. Menampilkan informasi jadwal pengganti pada kalender dan jadwal harian.
6. Menyediakan informasi jadwal awal dan jadwal pengganti agar tidak membingungkan mahasiswa.
7. Memungkinkan pengurus yang bertanggung jawab atas mata kuliah tersebut menambahkan, mengedit, atau membatalkan reschedule.
8. Secara otomatis mengembalikan tampilan ke jadwal reguler setelah periode perubahan berakhir.

Reschedule hanya berlaku pada tanggal atau periode tertentu, bukan mengubah jadwal permanen.

Perhatikan juga kemungkinan:
- Jadwal pengganti berada di minggu berbeda.
- Perubahan jam tanpa perubahan hari.
- Perkuliahan dibatalkan.
- Perkuliahan dipindahkan ke online.
- Beberapa mata kuliah memiliki perubahan jadwal bersamaan.

Pastikan sistem tidak menampilkan jadwal reguler dan pengganti secara membingungkan atau menghitung keduanya sebagai dua perkuliahan berbeda.

## B. Anggota dan Profil Mahasiswa

Kembangkan menu anggota menjadi direktori profil seluruh mahasiswa.

Tampilan:
- Daftar nama mahasiswa.
- Foto profil opsional.
- Nama lengkap.
- NIM.
- Informasi singkat.

Ketika nama mahasiswa diklik, tampilkan panel profil dari sisi kanan (side drawer), bukan membuka halaman baru.

Informasi profil:
- Nama.
- NIM.
- Foto profil.
- Bio singkat.
- Minat atau bidang yang disukai.
- Link GitHub.
- LinkedIn.
- Instagram.
- Website pribadi atau portofolio.
- Informasi tambahan yang relevan.

Setiap mahasiswa hanya boleh mengedit profilnya sendiri.

Admin dapat mengelola seluruh profil.

Buat tampilan profil yang sederhana, menarik, dan tidak terlalu ramai.

Pastikan informasi pribadi yang tidak perlu tidak ditampilkan kepada publik.

## C. Pengurus

Tampilkan struktur kepengurusan kelas.

Informasi:
- Foto.
- Nama.
- Jabatan.
- Deskripsi tanggung jawab.
- Periode kepengurusan.

Sediakan pengelolaan struktur pengurus oleh admin.

Pertimbangkan sistem periode agar riwayat kepengurusan sebelumnya tetap tersimpan dan dapat dilihat kembali.

## D. Tugas

Admin dan pengurus berwenang mengelola tugas.

Informasi setiap tugas:
- Nama tugas.
- Mata kuliah.
- Deskripsi.
- Dosen (opsional).
- Tanggal diberikan.
- Deadline.
- Link pengumpulan atau referensi.
- Status.

Fitur:
- Menambahkan tugas.
- Mengedit tugas.
- Menghapus tugas.
- Mengubah deadline.
- Mengubah detail tugas.
- Menampilkan tugas berdasarkan mata kuliah.
- Mengurutkan berdasarkan deadline.
- Menandai tugas yang mendekati deadline.

Tugas yang sudah melewati deadline tidak perlu ditampilkan sebagai tugas aktif.

Namun, jangan langsung menghapus data secara permanen. Simpan sebagai arsip atau status kedaluwarsa agar dokumentasi tetap tersedia.

Mahasiswa dapat melihat seluruh tugas tanpa mengubah data tugas.

## E. Uang Kas

Kembangkan fitur uang kas sesuai desain frontend yang sudah ada.

Ketentuan:
- Iuran kas Rp15.000 per mahasiswa per bulan.
- Perhitungan dimulai September 2026.
- Terdapat pencatatan pembayaran setiap mahasiswa.
- Terdapat pencatatan pemasukan.
- Terdapat pencatatan pengeluaran.
- Terdapat saldo kas.
- Terdapat riwayat transaksi.
- Terdapat laporan keuangan.

Fitur pengelolaan:
1. Menambahkan pembayaran kas.
2. Mengubah detail pembayaran.
3. Menghapus atau membatalkan transaksi dengan pencatatan yang jelas.
4. Menambahkan pengeluaran.
5. Mengedit detail pengeluaran.
6. Melihat siapa yang sudah dan belum membayar.
7. Melihat total pemasukan dan pengeluaran.
8. Melihat saldo akhir.
9. Melihat laporan per bulan.
10. Mengekspor laporan ke CSV.

### Mekanisme skip bulan

Tambahkan opsi untuk melewati bulan tertentu, misalnya saat libur semester.

Contoh:
- September: wajib membayar Rp15.000.
- Oktober: wajib membayar Rp15.000.
- November: wajib membayar Rp15.000.
- Desember: dilewati karena libur semester.
- Januari: dilewati karena libur semester.
- Februari: iuran kembali aktif.

Bulan yang dilewati:
- Tidak menambah tagihan.
- Tidak dianggap menunggak.
- Tidak memengaruhi perhitungan kewajiban pembayaran.
- Memiliki keterangan alasan skip.

Admin atau pengurus yang berwenang dapat mengatur periode tersebut.

### Integrasi spreadsheet

Saya ingin kemungkinan sinkronisasi laporan kas ke Google Sheets sebagai backup dan rekap tambahan.

Namun, jangan sampai integrasi ini menjadi ketergantungan utama.

Prioritas:
1. Database Appwrite tetap menjadi sumber data utama.
2. Ekspor CSV tetap berfungsi.
3. Evaluasi integrasi Google Sheets menggunakan API atau Appwrite Functions.
4. Jangan menaruh kredensial Google atau secret di frontend.
5. Jika integrasi terlalu kompleks atau membutuhkan layanan berbayar, cukup siapkan rancangan untuk pengembangan berikutnya.

Pastikan setiap transaksi memiliki identitas unik agar sinkronisasi tidak menghasilkan data ganda.

## F. Rangkuman

Fitur rangkuman memiliki hak kontribusi khusus.

**Seluruh mahasiswa, pengurus, dan admin dapat berkontribusi pada seluruh rangkuman tanpa pembatasan berdasarkan mata kuliah.**

Fitur:
- Menambahkan rangkuman.
- Mengedit rangkuman.
- Menghapus rangkuman.
- Melengkapi rangkuman yang sudah ada.
- Mengelompokkan berdasarkan mata kuliah.
- Mengelompokkan berdasarkan pertemuan atau topik.
- Menambahkan judul dan isi.
- Menambahkan link referensi.
- Mendukung format teks yang rapi.
- Mendukung penambahan gambar atau file jika diperlukan.

### Activity Log

Ini merupakan fitur penting.

Catat setiap aktivitas:
- Siapa yang membuat rangkuman.
- Siapa yang mengedit.
- Siapa yang menghapus.
- Waktu perubahan.
- Rangkuman yang diubah.
- Informasi perubahan apabila memungkinkan.

Buat riwayat kontribusi agar mahasiswa bisa mengetahui siapa yang berkontribusi.

Pertimbangkan sistem version history atau riwayat revisi agar rangkuman yang terhapus atau salah edit dapat dipulihkan.

Hindari penghapusan permanen tanpa mekanisme pemulihan.

## G. Tautan

Kembangkan menu tautan menjadi pusat kumpulan link penting kelas.

Contoh kategori:
- Akademik.
- Materi perkuliahan.
- Tugas dan pengumpulan.
- Event dan kegiatan.
- Dokumentasi.
- Organisasi.
- Tools dan aplikasi.
- Lainnya.

Fitur:
- Menambahkan tautan.
- Mengedit tautan.
- Menghapus tautan.
- Menambahkan deskripsi.
- Mengatur kategori.
- Mengatur urutan.
- Menampilkan ikon atau identitas sumber jika memungkinkan.
- Pencarian dan filter berdasarkan kategori.

Admin dan pengurus dapat mengelola tautan, sedangkan mahasiswa dapat melihat dan mengaksesnya.

---

# 5. Fitur Publik dan Internal

Website dapat dikunjungi siapa saja tanpa login.

Pengunjung publik hanya memiliki akses membaca informasi yang memang ditetapkan sebagai publik.

Pengunjung publik:
- Dapat melihat informasi umum kelas.
- Dapat melihat jadwal.
- Dapat melihat informasi pengurus dan anggota yang memang dipublikasikan.
- Dapat melihat rangkuman yang ditetapkan publik.
- Dapat melihat tautan publik.
- Tidak dapat mengedit, menambahkan, atau menghapus data.
- Tidak dapat mengakses dashboard administrasi.
- Tidak dapat mengakses data keuangan personal atau informasi sensitif mahasiswa.

Pengguna internal yang sudah login mendapatkan hak akses berdasarkan role.

Jangan membuat sistem SEO, sitemap, atau optimasi indeks Google sebagai prioritas. Website ini ditujukan untuk kebutuhan internal kelas.

Gunakan permission Appwrite yang benar agar pembatasan akses tidak hanya mengandalkan tampilan frontend.

---

# 6. Backend dan Database Appwrite

Gunakan Appwrite Cloud Free.

Rancang struktur database yang efisien dan mudah dikembangkan.

Pertimbangkan collection atau tabel berikut:

- profiles
- announcements
- subjects
- default_schedules
- schedule_overrides
- assignments
- materials
- summaries
- summary_revisions
- cash_payments
- cash_transactions
- cash_month_settings
- links
- committees
- committee_periods
- activity_logs

Struktur final harus disesuaikan berdasarkan hasil audit website, jangan membuat tabel yang tidak diperlukan.

Tentukan:
- Relasi antardata.
- Primary identifier.
- Field wajib dan opsional.
- Permission setiap tabel.
- Permission setiap dokumen.
- Validasi data.
- Strategi penghapusan dan pengarsipan.
- Strategi backup dan migrasi.

Jangan membuat terlalu banyak tabel apabila beberapa data dapat dikelola secara lebih sederhana.

Gunakan Appwrite Storage untuk file atau gambar yang memang diperlukan.

---

# 7. Keamanan dan Stabilitas

Prioritaskan keamanan meskipun website hanya digunakan oleh satu kelas.

Ketentuan:
- Tidak ada registrasi publik.
- Tidak ada akses tulis anonim.
- Gunakan session authentication Appwrite.
- Terapkan validasi input di frontend dan backend.
- Terapkan permission sesuai role dan kewenangan.
- Lindungi seluruh operasi administratif.
- Jangan mempercayai role yang dikirim dari frontend.
- Jangan menyimpan password secara manual.
- Jangan mengekspos API key rahasia.
- Cegah akses dan manipulasi data yang tidak berwenang.
- Gunakan HTTPS.
- Tangani session kedaluwarsa.
- Tangani error jaringan dan kegagalan API.
- Berikan feedback ketika operasi berhasil atau gagal.

Pastikan mahasiswa tidak bisa memanipulasi request untuk mendapatkan hak admin atau pengurus.

Buat sistem activity log untuk perubahan data penting.

---

# 8. UI/UX dan Desain

Pertahankan identitas visual website yang sekarang.

Jangan melakukan redesign besar-besaran tanpa alasan yang jelas.

Prinsip desain:
- Minimalis.
- Bersih.
- Modern.
- Konsisten.
- Tidak terlalu banyak dekorasi.
- Navigasi mudah dipahami.
- Mobile-first.
- Responsif untuk desktop.
- Loading cepat.
- Interaksi sederhana.

Pastikan:
- Semua menu berfungsi.
- Tombol tidak sekadar dekorasi.
- Modal dan side drawer bekerja dengan baik.
- Form memiliki validasi.
- Ada loading state.
- Ada empty state.
- Ada error state.
- Ada konfirmasi sebelum penghapusan.
- Tampilan tidak overflow di layar HP.
- Ukuran teks dan tombol nyaman digunakan di HP.

Hindari library atau framework besar yang tidak diperlukan.

---

# 9. Tahapan Pengerjaan

Lakukan pengembangan dengan urutan berikut.

### Fase 1: Audit dan Perencanaan
- Audit seluruh file.
- Identifikasi fitur yang sudah ada.
- Identifikasi data statis.
- Identifikasi komponen yang perlu dipertahankan.
- Buat rancangan database.
- Buat rancangan role dan permission.
- Buat rancangan autentikasi.
- Susun roadmap.

Output: laporan audit dan development plan.

### Fase 2: Setup Backend
- Membuat project Appwrite.
- Menghubungkan SDK.
- Membuat database.
- Membuat tabel dan struktur data.
- Mengatur permission.
- Mengatur Storage.
- Menyiapkan Functions yang dibutuhkan.

Output: backend siap digunakan.

### Fase 3: Authentication dan User Management
- Login.
- Logout.
- Session persistence.
- Ganti password.
- Reset password oleh admin.
- Pembuatan 24 akun.
- Role management.
- Permission testing.

Output: sistem akun dan autentikasi berfungsi.

### Fase 4: Integrasi Fitur Utama
Urutan:
1. Profil dan anggota.
2. Jadwal dan reschedule.
3. Tugas.
4. Rangkuman dan activity log.
5. Uang kas.
6. Tautan.
7. Pengurus.

Output: seluruh fitur terhubung ke database.

### Fase 5: Penyempurnaan
- Dashboard personal.
- Notifikasi.
- Pencarian.
- Kalender.
- Pengelolaan file.
- Backup dan ekspor.

Prioritaskan fitur yang paling penting. Fitur tambahan tidak boleh menghambat stabilitas fitur utama.

### Fase 6: Testing dan Deployment
- Pengujian seluruh role.
- Pengujian permission.
- Pengujian seluruh CRUD.
- Pengujian jadwal pengganti.
- Pengujian perhitungan kas.
- Pengujian reset password.
- Pengujian tampilan mobile dan desktop.
- Pengujian session.
- Pengujian error dan jaringan.
- Pengujian deployment Vercel.

Pastikan tidak ada fitur lama yang rusak setelah integrasi.

---

# 10. Standar Hasil Akhir

Website dianggap berhasil apabila:

1. Seluruh 24 akun dapat login.
2. Tidak ada registrasi publik.
3. Ketiga role memiliki hak akses sesuai ketentuan.
4. Admin dapat mengelola akun dan seluruh fitur.
5. Pengurus hanya dapat mengelola fitur sesuai kewenangannya.
6. Mahasiswa dapat melihat informasi dan mengelola profil sendiri.
7. Semua pengguna internal dapat berkontribusi pada rangkuman.
8. Jadwal pengganti tidak mengubah jadwal reguler permanen.
9. Jadwal kembali ke kondisi reguler setelah periode reschedule.
10. Tugas yang melewati deadline masuk arsip, bukan hilang permanen.
11. Uang kas menghitung kewajiban dan skip bulan dengan benar.
12. Activity log mencatat perubahan penting.
13. Data tersimpan di Appwrite dan tidak hilang saat halaman di-refresh.
14. Pengunjung publik hanya memiliki akses baca terhadap informasi publik.
15. Seluruh fitur bekerja di HP dan desktop.
16. Tidak ada error kritis atau kebocoran kredensial.
17. Website tetap ringan dan mudah dipelihara.

---

## 11. Instruksi Penutup untuk AI Coding Agent

Bertindaklah sebagai senior full-stack developer yang bertanggung jawab atas pengembangan dan pemeliharaan proyek ini.

Jangan membuat asumsi sembarangan terhadap struktur kode yang sudah ada.

Jangan menghapus fitur lama hanya karena ingin membuat implementasi baru.

Jangan melakukan refactoring besar jika tidak benar-benar diperlukan.

Utamakan solusi yang paling sederhana, aman, efisien, dan mudah dipahami.

Jika ada kebutuhan teknis yang belum jelas, sampaikan terlebih dahulu dan berikan rekomendasi sebelum mengambil keputusan.

**TUGAS PERTAMA:**

Lakukan audit menyeluruh terhadap proyek yang tersedia.

Kemudian hasilkan:
1. Ringkasan kondisi website saat ini.
2. Daftar fitur yang sudah berfungsi dan belum berfungsi.
3. Rekomendasi arsitektur Appwrite.
4. Rancangan database.
5. Rancangan autentikasi dan role.
6. Rancangan permission.
7. Identifikasi risiko dan potensi konflik.
8. Roadmap pengerjaan berdasarkan prioritas.

Jangan mengubah kode terlebih dahulu. Tunggu persetujuan saya terhadap hasil audit dan rancangan sebelum memulai implementasi.

Tujuan akhirnya adalah membangun website kelas SDT A yang benar-benar dapat digunakan, bukan sekadar demo atau tampilan frontend.
