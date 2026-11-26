LAPORAN AUDIT & BLUEPRINT ARSITEKTUR: WEBSITE KELAS SDT A

Dokumen Rujukan: DEV.md
Target Platform: Appwrite Cloud (Free Plan) + Frontend Vanilla JS (HTML5, CSS3, ES6+)
Status Dokumen: Fase 1 Selesai (Menunggu Persetujuan Pengguna Sebelum Modifikasi Kode)

1. Ringkasan Kondisi Website Saat Ini

Website kelas 1 Sains Data Terapan A (SDT A) PENS saat ini merupakan aplikasi berbasis static web dengan arsitektur murni Vanilla JavaScript, tanpa bundler, tanpa framework (React/Vue), dan memiliki desain visual bertema Persona 3 Reload / neo-stylized yang unik dan berkinerja tinggi.

Karakteristik Teknis Eksisting
Struktur Antarmuka: Halaman tunggal (index.html) dengan menu bertumpuk miring (skewed stacked menu), panel geser dari kanan (side drawer dialog), dan antarmuka khusus bergaya kartu tarot untuk Rangkuman.
Sistem Data Eksisting: Sepenuhnya tersimpan di dalam berkas skrip data/*.js yang dimuat secara synchronous/defer ke dalam namespace global window.DATA.
State Management: Sebagian fitur (Pengaturan & Kas) menggunakan localStorage peramban untuk mengingat preferensi dan simulasi mutasi/iuran.
Keamanan Eksisting: Dilindungi Content Security Policy (CSP) ketat pada index.html yang melarang skrip inline (script-src 'self').
Backend Eksisting: Terdapat modul assets/js/awan.js yang dirancang untuk REST API Firebase Firestore, namun konfigurasinya di data/sunting.js kosong (""), sehingga fitur penyimpanan cloud saat ini non-aktif.
2. Matriks Audit Fitur: Kondisi Eksisting vs Target DEV.md
Fitur / Menu	Kondisi Saat Ini (Frontend)	Kebutuhan Target DEV.md	Kesenjangan (Gap)
Autentikasi & Akun	Tidak ada login. Semua orang dianggap publik atau simulasi lokal.	Login session Appwrite, 24 akun mahasiswa, 3 role (Admin, Pengurus, Mahasiswa), tanpa registrasi publik, reset password oleh admin.	Kritis / Belum Ada: Butuh modul Auth Appwrite, modal/form login, penanganan session, manajemen akun.
Jadwal Kuliah	Membaca data/jadwal.js (Senin–Jumat) & kalender bulanan statis.	Jadwal reguler tetap di database + Sistem Jadwal Pengganti (Reschedule) terpisah per mata kuliah dengan izin kelola oleh PJ Matkul/Pengurus.	Sebagian: Tampilan reguler sudah ada, butuh database jadwal & sub-sistem reschedule fleksibel.
Anggota & Profil	Daftar 24 nama urut abjad dengan filter pencarian dan inisial avatar (data/anggota.js).	Direktori profil mahasiswa, side drawer profil (NIM, foto, bio, minat, tautan GitHub/LinkedIn/IG/web), mahasiswa bisa edit profil sendiri, admin kelola semua.	Sebagian: Tampilan list ada, butuh side drawer profil, form edit profil, dan upload foto via Appwrite Storage.
Pengurus	Kartu pengurus kelas (Dosen Wali, Komti, Wacomti, Sekre, Bendahara) + Tim Pengembang Web.	Terhubung ke database, pengelolaan pengurus oleh admin, riwayat periode kepengurusan, penugasan PJ Mata Kuliah fleksibel.	Sebagian: Visual kartu sudah ada, butuh persistensi database, periode kepengurusan, dan relasi PJ Matkul.
Tugas	UI daftar tugas dan kalkulasi deadline (H-x) ada di panels.js, tapi data/tugas.js kosong.	CRUD tugas oleh Admin & Pengurus (berdasarkan matkul), filter matkul, deadline, arsip otomatis tugas kedaluwarsa (tidak dihapus permanen).	Sebagian: Renderer UI sudah siap, butuh CRUD modal, integrasi database, dan sistem arsip tugas lewat deadline.
Uang Kas	Prototype frontend lengkap (assets/js/kas.js) dengan iuran mingguan Rp5.000 di localStorage, cetak pesan WA, dan ekspor CSV.	Iuran bulanan Rp15.000/bulan mulai September 2026, mekanisme skip bulan (libur semester), pencatatan transaksi masuk/keluar, pelaporan keuangan, dan opsi Google Sheets sync.	Penyesuaian Model: Ubah model mingguan ke model bulanan + skip bulan, migrasi dari localStorage ke collection Appwrite.
Rangkuman Materi	Tampilan kartu tarot interaktif, parser teks ala Notion, modul edit UI siap namun awan.js (Firebase) tidak aktif.	Seluruh pengguna internal (mahasiswa, pengurus, admin) dapat menulis/mengedit seluruh rangkuman. Dilengkapi Activity Log & Riwayat Revisi (Version History).	Penggantian Backend: Alihkan koneksi cloud dari Firebase ke Appwrite, buat collection revisi & log kontribusi.
Tautan Penting	Renderer kategori ada di panels.js, namun berkas data/tautan.js kosong.	CRUD tautan oleh Admin & Pengurus, kategorisasi (Akademik, Materi, Tugas, Tools), pencarian & pengurutan. Mahasiswa read-only.	Sebagian: Renderer UI ada, butuh form CRUD dan database collection.
3. Rekomendasi Arsitektur Appwrite (Free Plan)

Appwrite Cloud Free Tier menyediakan kuota yang sangat memadai untuk skala 1 kelas perkuliahan (24 mahasiswa):

Bandwidth: 10 GB/bulan (cukup untuk traffic web internal).
Database Reads/Writes: Ratusan ribu operasi per bulan (24 mahasiswa hanya memerlukan < 1%).
Storage: 2 GB (sangat luas untuk foto profil terkompresi dan lampiran tugas/rangkuman).
Functions: 750.000 eksekusi/bulan (digunakan untuk server-side administrative tasks).
Pola Integrasi Frontend (Tanpa Build Tool)

Situs ini tidak menggunakan Webpack/Vite. Agar tetap mematuhi prinsip mobile-first, lightweight, and CSP-compliant, integrasi Appwrite akan dilakukan dengan:

Menyimpan berkas Appwrite Web SDK (v16+) secara lokal di assets/js/vendor/appwrite.js (sehingga tetap bekerja offline/standalone tanpa melanggar CSP script-src 'self').
Membuat modul penghubung assets/js/appwrite-client.js yang menginisialisasi Client, Account, Databases, dan Storage.
Memperbarui CSP index.html pada arahan connect-src agar mengizinkan https://cloud.appwrite.io.
Menyediakan Appwrite Function (Node.js) untuk aksi administratif sensitif (pembuatan 24 akun awal secara batch, reset password acak oleh admin) sehingga API Secret Key tidak pernah bocor ke frontend.
4. Rancangan Struktur Database (Appwrite Collections)

Database ID: sdta_db

Rincian 12 Koleksi Inti
1. profiles

Menyimpan identitas lengkap dan hak akses mahasiswa.

$id: String (sama dengan $id akun Auth Appwrite)
nim: String (10-12 karakter, unik, indeks)
nama_lengkap: String (wajib)
role: Enum [admin, pengurus, mahasiswa] (wajib, default: mahasiswa)
foto_id: String (File ID Appwrite Storage, opsional)
bio: String (maks 250 karakter, opsional)
minat: String Array (maks 5 tag, opsional)
github_url: String URL (opsional)
linkedin_url: String URL (opsional)
instagram_url: String URL (opsional)
website_url: String URL (opsional)
matkul_pj: String Array (daftar Kode/ID matkul yang ditugaskan kepada pengurus ini)
2. subjects (Mata Kuliah)

Daftar mata kuliah aktif semester berjalan.

kode: String (unik, contoh: SDTA-01)
nama: String (contoh: Statistika Dasar)
dosen: String Array
ruang_default: String
pj_user_ids: String Array (User ID pengurus penanggung jawab)
3. default_schedules (Jadwal Reguler)

Jadwal permanen mingguan (Senin–Jumat). Tidak boleh diubah saat ada reschedule.

hari: Enum [Senin, Selasa, Rabu, Kamis, Jumat]
subject_id: String (relasi ke subjects)
mulai: String (contoh: 08.00)
selesai: String (contoh: 09.40)
ruang: String
jenis: Enum [kuliah, praktikum]
4. schedule_overrides (Jadwal Pengganti / Reschedule)

Data perubahan jadwal sementara per tanggal tertentu.

subject_id: String (relasi ke subjects)
tanggal_awal: Date (tanggal kuliah yang diganti)
tanggal_pengganti: Date (tanggal pelaksanaan baru)
mulai_pengganti: String
selesai_pengganti: String
ruang_pengganti: String
tipe_perubahan: Enum [pindah_jadwal, dibatalkan, online]
keterangan: String (contoh: "Dosen tugas luar kota, dipindah ke Lab SAW 07.01")
status: Enum [aktif, selesai, dibatalkan]
created_by: String (User ID pengurus PJ)
5. assignments (Tugas)

Pencatatan tugas perkuliahan dan deadline.

judul: String (wajib)
subject_id: String (relasi ke subjects)
deskripsi: String
dosen: String
tanggal_diberikan: Date
deadline: DateTime (wajib, ISO 8601)
link_pengumpulan: String URL
status: Enum [aktif, arsip] (otomatis/manual masuk arsip setelah melewati deadline)
created_by: String (User ID)
6. cash_settings (Konfigurasi Kas Kelas)
nominal_bulanan: Integer (default: 15000)
mulai_periode: String (contoh: 2026-09)
rekening_data: String JSON (data nomor rekening dan nama bendahara)
catatan_transfer: String
7. cash_month_settings (Aturan Skip Bulan Kas)

Mekanisme melepaskan kewajiban bayar pada bulan libur semester.

periode_bulan: String (format: YYYY-MM, contoh: 2026-12)
is_skipped: Boolean (default: true)
alasan: String (contoh: "Libur Semester Ganjil")
8. cash_payments (Kartu Iuran Mahasiswa)

Catatan status pembayaran kas per mahasiswa per bulan aktif.

user_id: String (relasi ke profiles)
periode_bulan: String (format: YYYY-MM)
nominal_dibayar: Integer
tanggal_bayar: Date
status: Enum [lunas, kurang, belum_bayar]
catatan: String
verified_by: String (User ID Bendahara)
9. cash_transactions (Buku Mutasi Kas & Two-Way Sync)

Catatan pembukuan uang masuk dan keluar secara rinci serta metadata sinkronisasi dua arah ke Google Sheets.

transaction_id: String (unik, terindeks, identitas pencocokan lintas platform)
tanggal: Date (YYYY-MM-DD)
jenis: Enum [masuk, keluar]
kategori: String (contoh: Iuran Kas, ATK & Kelas, Fotokopi Modul, Konsumsi, Sosial)
nominal: Integer
keterangan: String
mahasiswa_nama: String (opsional, identitas mahasiswa terkait)
status: Enum [aktif, deleted] (soft delete agar sinkronisasi tetap konsisten)
source: Enum [website, sheets, sync] (pencegahan infinite synchronization loop)
updated_at: DateTime ISO 8601 (resolusi konflik Last-Write-Wins)
sync_status: Enum [pending, synced, failed]
created_by: String (User ID)
10. summaries (Rangkuman Materi)

Konten catatan perkuliahan per minggu.

subject_id: String (relasi ke subjects)
minggu_ke: Integer (1–16)
judul: String
isi: String (format Markdown / Notion-like syntax)
status: Enum [draft, lengkap, contoh]
penulis_id: String (User ID)
penulis_nama: String
is_public: Boolean (default: true)
11. summary_revisions (Activity Log & Version History Rangkuman)

Menjamin tidak ada kehilangan data akibat revisi atau penghapusan rangkuman.

summary_id: String
aksi: Enum [create, update, delete, restore]
isi_snapshot: String (backup teks lengkap sebelum perubahan)
edited_by: String (User ID)
edited_by_nama: String
catatan_perubahan: String
12. links (Pusat Tautan Penting)
judul: String
url: String URL
kategori: Enum [Akademik, Materi, Tugas, Event, Dokumentasi, Tools, Lainnya]
keterangan: String
urutan: Integer
is_public: Boolean
13. activity_logs (Audit Log Sistem Global)
user_id: String
user_nama: String
kategori: String [jadwal, tugas, kas, profil, akun]
aksi: String
detail: String
5. Rancangan Autentikasi dan Manajemen Role
Tiga Tingkatan Pengguna (RBAC)
Role: Admin (Administrator Kelas)
Jumlah: 1–2 akun (misal: Komti & Web Master).
Hak Istimewa: Kelola semua akun 24 mahasiswa, atur role, reset password, atur penugasan PJ Matkul, kelola konfigurasi uang kas & bulan libur, kelola seluruh data jadwal, tugas, tautan, dan profil.
Role: Pengurus (Perangkat Kelas & PJ Matkul)
Jumlah: Komti, Wacomti, Sekretaris, Bendahara, dan para Penanggung Jawab Mata Kuliah.
Hak Istimewa:
Bendahara: Kelola uang kas (pembayaran mahasiswa, mutasi, skip bulan).
PJ Mata Kuliah: Menambah dan mengubah jadwal pengganti (reschedule) dan tugas khusus untuk mata kuliah yang menjadi tanggung jawabnya.
Sekretaris / Pengurus Umum: Mengelola tautan dan pengumuman kelas.
Role: Mahasiswa (Seluruh Anggota Kelas)
Jumlah: 24 mahasiswa kelas SDT A.
Hak Istimewa: Melihat jadwal (reguler & pengganti), tugas aktif & arsip, status iuran kas pribadi & kelas, direktori anggota. Mengedit profil pribadi (bio, medsos, foto).
Kewenangan Khusus: Seluruh mahasiswa memiliki hak kontribusi penuh untuk menambah, mengedit, dan melengkapi seluruh Rangkuman Materi mata kuliah apa pun.
Pengunjung Publik (Tanpa Login)
Akses read-only terbatas untuk informasi umum, jadwal kuliah resmi, susunan pengurus, dan tautan publik. Tidak dapat melihat data pribadi sensitif atau rincian keuangan perseorangan.
Skema Pembuatan & Pengelolaan Akun
Format Username / Email: Menggunakan identitas mahasiswa PENS (contoh: nim@student.pens.ac.id atau identitas login unik).
Pembuatan Akun Batch: Dilakukan oleh Admin sekali jalan melalui skrip Appwrite Function yang menghasilkan password acak unik untuk 24 mahasiswa.
Credential Handout: Admin mendapatkan daftar akun dan password sementara untuk dibagikan secara privat kepada masing-masing mahasiswa.
Ganti Password Mandiri: Mahasiswa yang sudah login dapat mengganti password dengan memvalidasi password lama dan memasukkan password baru.
Lupa Password: Tidak menggunakan reset email publik; mahasiswa melapor ke Admin, lalu Admin memicu reset password sementara melalui dashboard.
6. Rancangan Permission & Keamanan Data (Security Rules)

Appwrite menerapkan keamanan pada tingkat Collection dan Document (Document-Level Security):

Koleksi	Read Access	Create Access	Update Access	Delete Access
profiles	Any (publik terbatas)	Admin via Server/Function	User:owner (profil sendiri) & Role:admin	Role:admin
subjects	Any	Role:admin	Role:admin	Role:admin
default_schedules	Any	Role:admin	Role:admin	Role:admin
schedule_overrides	Any	Role:admin & Role:pengurus (PJ Matkul)	Role:admin & Pembuat (PJ Matkul)	Role:admin & Pembuat
assignments	Any	Role:admin & Role:pengurus	Role:admin & Role:pengurus	Role:admin
cash_settings	Users (internal)	Role:admin	Role:admin	None
cash_month_settings	Users (internal)	Role:admin & Bendahara	Role:admin & Bendahara	Role:admin
cash_payments	Users (internal)	Role:admin & Bendahara	Role:admin & Bendahara	Role:admin
cash_transactions	Users (internal)	Role:admin & Bendahara	Role:admin & Bendahara	Role:admin
summaries	Any (jika publik) / Users	Users (seluruh mahasiswa)	Users (seluruh mahasiswa)	Users / Role:admin
summary_revisions	Users	Users (otomatis sistem)	None (Append-only)	None
links	Any	Role:admin & Role:pengurus	Role:admin & Role:pengurus	Role:admin
activity_logs	Role:admin	Users (via Appwrite trigger)	None (Append-only)	None
7. Analisis Risiko & Strategi Mitigasi
Risiko Pemblokiran Content Security Policy (CSP)
Masalah: Header CSP pada index.html saat ini mengunci koneksi hanya ke Firestore.
Mitigasi: Perbarui baris <meta http-equiv="Content-Security-Policy"> dengan menambahkan https://cloud.appwrite.io pada connect-src saat integrasi dimulai.
Risiko Akses Tanpa Server / Klik Ganda Langsung (file://)
Masalah: Pengujian file statis secara lokal via file:// terkadang mengalami pembatasan CORS saat memanggil API cloud.
Mitigasi: Menyiapkan petunjuk dev server lokal ringan (seperti Python http.server atau Node.js serve) dan memastikan Appwrite Client Web Platform Domain menyertakan localhost dan *.
Risiko Kebocoran Kredensial Admin
Masalah: Fitur admin (seperti pembuatan akun masal atau reset password) membutuhkan API Key server Appwrite.
Mitigasi: Dilarang keras meletakkan API Secret Key di frontend. Seluruh operasi pembuatan akun dan reset password dijalankan via Appwrite Function yang terlindungi session admin.
Risiko Bentrok Data Kas (Mingguan vs Bulanan)
Masalah: Frontend yang baru kita buat menggunakan skema iuran mingguan Rp5.000, sedangkan DEV.md mewajibkan iuran bulanan Rp15.000 dengan fitur skip bulan.
Mitigasi: Seluruh logika penghitungan di assets/js/kas.js akan disesuaikan dengan mulus mengadopsi model bulanan (September 2026 dst.) dan mekanisme penandaan bulan libur tanpa merusak tata letak visual Persona 3 Reload yang sudah rapi.
Risiko Konflik Penyuntingan Rangkuman Bersamaan
Masalah: Karena seluruh 24 mahasiswa bisa mengedit rangkuman, dua orang berpotensi mengedit minggu yang sama dalam waktu bersamaan.
Mitigasi: Menggunakan mekanisme Optimistic Concurrency Control (memeriksa $updatedAt sebelum menyimpan). Jika versi dokumen telah berubah, tampilkan peringatan bentrok dan simpan naskah ke riwayat revisi (summary_revisions) agar tulisan tidak hilang.
8. Roadmap Pengerjaan Bertahap (Fase 1 s/d Fase 6)
Urutan Pelaksanaan Rinci
Fase 2: Setup Backend Appwrite
Menyiapkan Project Appwrite Cloud.
Menyiapkan berkas lokal Appwrite SDK di assets/js/vendor/appwrite.js dan inisialisasi client.
Membuat Database sdta_db dan 12 koleksi beserta atribut dan permissions.
Menyiapkan Bucket Storage untuk foto profil dan bukti kas.
Fase 3: Autentikasi & Akun (24 Akun Mahasiswa)
Membuat modal login di pojok antarmuka.
Integrasi login, logout, dan session persistence.
Skrip pembuatan 24 akun dan pengelompokan role (admin, pengurus, mahasiswa).
Fitur ganti password mahasiswa dan reset password admin.
Fase 4: Integrasi Fitur Utama (Secara Berurutan)
4.1 Profil Mahasiswa: Side drawer profil detail, upload foto, edit profil sendiri.
4.2 Jadwal & Reschedule: Pembacaan jadwal reguler, sistem penandaan reschedule tanggal berjalan oleh PJ Matkul.
4.3 Tugas: CRUD tugas, filter matkul, auto-archive tugas lewat deadline.
4.4 Rangkuman: Editor materi, Activity Log kontributor, dan Version History.
4.5 Uang Kas: Penyesuaian iuran Rp15.000/bulan mulai September 2026 (data real dari kas SDT A.xlsx), skip bulan libur, CRUD transaksi (tambah, edit, soft delete), export CSV, dan Two-Way Sync langsung ke checkbox `C9:K32` & tabel `LAPORAN PENGELUARAN` (`O5:R100`) pada `Sheet1` (dengan `_Sync_Meta` tersembunyi) melalui Appwrite Function `functions/kas-sync-sheets` + Google Apps Script `scripts/google-apps-script/Code.gs`.
4.6 Tautan & Pengurus: CRUD tautan berdasarkan kategori, penugasan PJ Matkul pengurus.
Fase 5 & 6: Penyempurnaan, Pengujian & Siap Rilis
Pengujian permission setiap role.
Pengujian responsivitas mobile vs desktop.
Pengujian graceful offline / fallback handling.
Pengujian unit/integrasi mock Two-Way Sync Kas (`scripts/test-kas-sync.js`) dan panduan deployment (`scripts/google-apps-script/README.md`).

IMPORTANT

Keputusan Diperlukan Sebelum Melangkah ke Fase 2:

Apakah rancangan struktur database (12 koleksi) dan pembagian role di atas sudah sesuai dengan ekspektasi Anda?
Apakah Anda sudah memiliki Project ID dan Endpoint Appwrite Cloud yang ingin digunakan, atau apakah kita perlu menyiapkan konfigurasi environment terlebih dahulu?

Mohon konfirmasikan agar kita dapat melanjutkan implementasi kode ke Fase 2 (Setup Backend) dan Fase 3 (Authentication) secara bertahap!