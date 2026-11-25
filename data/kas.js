// Data kas real kelas Sains Data Terapan A (berdasarkan kas SDT A.xlsx).
// Berisi nominal iuran bulanan, rekening pembayaran bendahara, transaksi real, dan status iuran.
window.DATA = window.DATA || {};
window.DATA.kas = {
  "nominalBulanan": 15000,
  "mulaiPeriode": "2026-09",
  "targetBulan": 3,
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
  "catatanPembayaran": "Format berita transfer: KAS_[NAMA]_[BULAN]. Kirim bukti transfer via WhatsApp ke Bendahara.",
  "transaksi": [
    {
      "id": "trx-real-01",
      "tanggal": "2026-09-15",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 15000,
      "keterangan": "Iuran Kas - Alina Yusika Safitri (Sep 2026)"
    },
    {
      "id": "trx-real-02",
      "tanggal": "2026-09-15",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 15000,
      "keterangan": "Iuran Kas - Rihana Shafira Azzalia (Sep 2026)"
    },
    {
      "id": "trx-real-03",
      "tanggal": "2026-09-20",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 60000,
      "keterangan": "Iuran Kas - Ghazi Silkaputera Hanania (Sep–Des 2026, 4 bulan)"
    },
    {
      "id": "trx-real-04",
      "tanggal": "2026-09-25",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 45000,
      "keterangan": "Iuran Kas - Muhammad Hilmi Mu'Afa (Sep–Nov 2026, 3 bulan)"
    },
    {
      "id": "trx-real-05",
      "tanggal": "2026-10-02",
      "jenis": "keluar",
      "kategori": "ATK & Kelas",
      "nominal": 5500,
      "keterangan": "Print kertas attendence"
    }
  ],
  "iuranMahasiswa": {
    "Abdullah Azzam Hibatullah": 0,
    "Saskia Tifani Amelia": 0,
    "Alina Yusika Safitri": 1,
    "Shasya Aurellia Azzahra": 0,
    "Rihana Shafira Azzalia": 1,
    "Fauzan Aqeelah Ghazi Rabbani": 0,
    "Ryandra Alifah Hafizd": 0,
    "Davin Zoe Akhmad": 0,
    "Atiyah Dinar Aliyah": 0,
    "Raditya Jeremia Kriswanto Putra": 0,
    "Christoper Natanael Partogi Panjaitan": 0,
    "Atika Meilinda": 0,
    "Favian Zada Putra": 0,
    "Afghan Yazid Ilmany": 0,
    "Arven Hael Viscaya Atjeh": 0,
    "Hants Immanuel Marito Hutauruk": 0,
    "Muhammad Hilmi Mu'Afa": 3,
    "Marvin Febrian Agyantra": 0,
    "Mohammad Aditya Arkoun": 0,
    "Nawfal Rayhan Subagyo": 0,
    "Sifa Luvena Taufiqah Palupi": 0,
    "Elyka Imelda Mayzananda": 0,
    "Tirta Prasetya Kusuma Wardana": 0,
    "Ghazi Silkaputera Hanania": 4
  }
};
