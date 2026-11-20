// Data kas kelas Sains Data Terapan A.
// Berisi nominal iuran mingguan, rekening pembayaran bendahara, transaksi awal, dan status iuran.
// Ubah hanya bagian di dalam tanda = ... ; teks diapit tanda kutip ganda, antar-item dipisah koma.
window.DATA = window.DATA || {};
window.DATA.kas = {
  "nominalMingguan": 5000,
  "targetMinggu": 8,
  "rekening": [
    {
      "metode": "BCA",
      "nomor": "8290381928",
      "atasNama": "Rihana Shafira Azzalia",
      "keterangan": "Transfer sesama BCA / Antar-Bank"
    },
    {
      "metode": "Mandiri",
      "nomor": "1420019283741",
      "atasNama": "Fauzan Aqeelah Ghazi Rabbani",
      "keterangan": "Livin' Mandiri / BI-Fast"
    },
    {
      "metode": "DANA / GoPay",
      "nomor": "081234567890",
      "atasNama": "Rihana Shafira Azzalia",
      "keterangan": "E-Wallet (Bebas biaya admin sesama app)"
    }
  ],
  "catatanPembayaran": "Format berita transfer: KAS_[NAMA]_[MINGGU]. Kirim bukti transfer via WhatsApp ke Bendahara.",
  "transaksi": [
    {
      "id": "trx-01",
      "tanggal": "2026-08-28",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 120000,
      "keterangan": "Iuran Kas Minggu 1 (24 mahasiswa)"
    },
    {
      "id": "trx-02",
      "tanggal": "2026-09-02",
      "jenis": "keluar",
      "kategori": "ATK & Kelas",
      "nominal": 35000,
      "keterangan": "Beli spidol whiteboard Snowman (3 pcs) & penghapus"
    },
    {
      "id": "trx-03",
      "tanggal": "2026-09-05",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 120000,
      "keterangan": "Iuran Kas Minggu 2 (24 mahasiswa)"
    },
    {
      "id": "trx-04",
      "tanggal": "2026-09-12",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 115000,
      "keterangan": "Iuran Kas Minggu 3 (23 mahasiswa)"
    },
    {
      "id": "trx-05",
      "tanggal": "2026-09-18",
      "jenis": "keluar",
      "kategori": "Fotokopi & Modul",
      "nominal": 48000,
      "keterangan": "Cetak modul praktikum Statistika Dasar & lembar kerja"
    },
    {
      "id": "trx-06",
      "tanggal": "2026-09-26",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 110000,
      "keterangan": "Iuran Kas Minggu 4 & susulan mgg 3"
    },
    {
      "id": "trx-07",
      "tanggal": "2026-10-08",
      "jenis": "keluar",
      "kategori": "Konsumsi",
      "nominal": 65000,
      "keterangan": "Snack & air mineral rapat evaluasi tengah semester"
    },
    {
      "id": "trx-08",
      "tanggal": "2026-10-15",
      "jenis": "keluar",
      "kategori": "Sosial & Apresiasi",
      "nominal": 50000,
      "keterangan": "Buket bunga & ucapan apresiasi dosen pembina kelas"
    },
    {
      "id": "trx-09",
      "tanggal": "2026-10-25",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 120000,
      "keterangan": "Iuran Kas Minggu 5-6 gabungan"
    },
    {
      "id": "trx-10",
      "tanggal": "2026-11-05",
      "jenis": "keluar",
      "kategori": "ATK & Kelas",
      "nominal": 25000,
      "keterangan": "Isi ulang tinta spidol & lakban perlengkapan kelas"
    },
    {
      "id": "trx-11",
      "tanggal": "2026-11-12",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 95000,
      "keterangan": "Iuran Kas Minggu 7 (19 mahasiswa)"
    }
  ],
  "iuranMahasiswa": {
    "Abdullah Azzam Hibatullah": 8,
    "Saskia Tifani Amelia": 8,
    "Alina Yusika Safitri": 8,
    "Shasya Aurellia Azzahra": 8,
    "Rihana Shafira Azzalia": 8,
    "Fauzan Aqeelah Ghazi Rabbani": 8,
    "Ryandra Alifah Hafizd": 8,
    "Davin Zoe Akhmad": 7,
    "Atiyah Dinar Aliyah": 8,
    "Raditya Jeremia Kriswanto Putra": 6,
    "Christoper Natanael Partogi Panjaitan": 8,
    "Atika Meilinda": 7,
    "Favian Zada Putra": 8,
    "Afghan Yazid Ilmany": 6,
    "Arven Hael Viscaya Atjeh": 7,
    "Hants Immanuel Marito Hutauruk": 8,
    "Muhammad Hilmi Mu'Afa": 8,
    "Marvin Febrian Agyantra": 7,
    "Mohammad Aditya Arkoun": 6,
    "Nawfal Rayhan Subagyo": 8,
    "Sifa Luvena Taufiqah Palupi": 8,
    "Elyka Imelda Mayzananda": 8,
    "Tirta Prasetya Kusuma Wardana": 7,
    "Ghazi Silkaputera Hanania": 8
  }
};
