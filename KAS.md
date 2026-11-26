Implementasikan fitur **Two-Way Synchronization (sinkronisasi dua arah)** antara fitur kas pada website kelas dan Google Sheets.

**Konteks teknologi:**

- Frontend: Vanilla JavaScript.
- Backend dan database: Appwrite.
- Spreadsheet: Google Sheets.
- Integrasi menggunakan Google Apps Script dan Appwrite Functions/API sesuai kebutuhan.

**Tujuan utama:**

Pastikan data kas selalu tersinkronisasi secara otomatis dari kedua platform:

1. Perubahan data melalui website (tambah, edit, atau hapus transaksi) otomatis diperbarui di Google Sheets.
2. Perubahan data melalui Google Sheets (tambah, edit, atau hapus transaksi) otomatis diperbarui di Appwrite sehingga website menampilkan data terbaru.

**Ketentuan implementasi:**

- Pertahankan struktur, desain, dan fungsionalitas website yang sudah ada. Jangan merombak fitur kas yang sudah berjalan.
- Jadikan Appwrite sebagai _single source of truth_ untuk penyimpanan dan konsistensi data.
- Gunakan ID transaksi unik (`transaction_id`) sebagai identitas utama untuk mencocokkan data di kedua platform, bukan berdasarkan nominal atau keterangan.
- Terapkan mekanisme upsert agar sinkronisasi tidak menghasilkan transaksi duplikat.
- Sinkronkan seluruh atribut transaksi, termasuk jenis transaksi, kategori, nominal, tanggal, keterangan, dan identitas mahasiswa jika tersedia.
- Tangani penghapusan menggunakan mekanisme soft delete atau status transaksi agar perubahan tidak hilang dari sinkronisasi.
- Cegah infinite synchronization loop dengan mekanisme penanda sumber perubahan (`source`) dan identifikasi perubahan yang berasal dari proses sinkronisasi.
- Tangani konflik perubahan secara aman menggunakan timestamp `updated_at`, termasuk perubahan bersamaan.
- Pastikan proses sinkronisasi memiliki validasi, error handling, logging, dan mekanisme retry jika terjadi kegagalan.
- Jaga keamanan kredensial. Jangan pernah mengekspos Appwrite API Key maupun kredensial Google di frontend. Gunakan environment variables atau secret management pada backend.
- Pertimbangkan batas kuota API Google dan Appwrite serta efisiensi sinkronisasi.

**Alur yang diharapkan:**

Website → Appwrite → Appwrite Function → Google Sheets.

Google Sheets → Google Apps Script → Appwrite Function → Appwrite Database → Website.

**Instruksi pengerjaan:**

Sebelum melakukan perubahan, pelajari terlebih dahulu struktur proyek, implementasi fitur kas saat ini, skema database Appwrite, dan konfigurasi deployment. Identifikasi pendekatan integrasi yang paling sesuai dengan arsitektur yang sudah ada.

Implementasikan secara modular, aman, dan mudah dipelihara. Jangan mengarang konfigurasi, ID database, collection, atau kredensial yang belum tersedia. Jika membutuhkan informasi atau akses eksternal yang belum tersedia, jelaskan secara spesifik apa yang diperlukan.

Setelah implementasi, sertakan dokumentasi konfigurasi Google Apps Script, Appwrite Functions, environment variables, deployment, dan langkah pengujian sinkronisasi dua arah. Pastikan seluruh operasi CRUD dan penanganan konflik telah diuji.
