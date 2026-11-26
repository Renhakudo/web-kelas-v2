// Data kas real kelas Sains Data Terapan A (berdasarkan kas SDT A.xlsx).
// Menggunakan transaction_id kanonik per-bulan (iuran-<nrp>-<YYYY-MM>) agar sinkron 1-ke-1 dengan checkbox Sheet1.
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
      "id": "iuran-3326600006-2026-09",
      "transaction_id": "iuran-3326600006-2026-09",
      "tanggal": "2026-09-01",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 15000,
      "keterangan": "Iuran Kas - Alina Yusika Safitri (Sep 2026)",
      "mahasiswa_nama": "Alina Yusika Safitri",
      "status": "aktif",
      "source": "website",
      "updated_at": "2026-09-15T10:00:00.000Z"
    },
    {
      "id": "iuran-3326600001-2026-09",
      "transaction_id": "iuran-3326600001-2026-09",
      "tanggal": "2026-09-01",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 15000,
      "keterangan": "Iuran Kas - Rihana Shafira Azzalia (Sep 2026)",
      "mahasiswa_nama": "Rihana Shafira Azzalia",
      "status": "aktif",
      "source": "website",
      "updated_at": "2026-09-15T10:00:00.000Z"
    },
    {
      "id": "iuran-3326600024-2026-09",
      "transaction_id": "iuran-3326600024-2026-09",
      "tanggal": "2026-09-01",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 15000,
      "keterangan": "Iuran Kas - Ghazi Silkaputera Hanania (Sep 2026)",
      "mahasiswa_nama": "Ghazi Silkaputera Hanania",
      "status": "aktif",
      "source": "website",
      "updated_at": "2026-09-20T10:00:00.000Z"
    },
    {
      "id": "iuran-3326600024-2026-10",
      "transaction_id": "iuran-3326600024-2026-10",
      "tanggal": "2026-10-01",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 15000,
      "keterangan": "Iuran Kas - Ghazi Silkaputera Hanania (Okt 2026)",
      "mahasiswa_nama": "Ghazi Silkaputera Hanania",
      "status": "aktif",
      "source": "website",
      "updated_at": "2026-09-20T10:00:00.000Z"
    },
    {
      "id": "iuran-3326600024-2026-11",
      "transaction_id": "iuran-3326600024-2026-11",
      "tanggal": "2026-11-01",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 15000,
      "keterangan": "Iuran Kas - Ghazi Silkaputera Hanania (Nov 2026)",
      "mahasiswa_nama": "Ghazi Silkaputera Hanania",
      "status": "aktif",
      "source": "website",
      "updated_at": "2026-09-20T10:00:00.000Z"
    },
    {
      "id": "iuran-3326600024-2026-12",
      "transaction_id": "iuran-3326600024-2026-12",
      "tanggal": "2026-12-01",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 15000,
      "keterangan": "Iuran Kas - Ghazi Silkaputera Hanania (Des 2026)",
      "mahasiswa_nama": "Ghazi Silkaputera Hanania",
      "status": "aktif",
      "source": "website",
      "updated_at": "2026-09-20T10:00:00.000Z"
    },
    {
      "id": "iuran-3326600014-2026-09",
      "transaction_id": "iuran-3326600014-2026-09",
      "tanggal": "2026-09-01",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 15000,
      "keterangan": "Iuran Kas - Muhammad Hilmi Mu'Afa (Sep 2026)",
      "mahasiswa_nama": "Muhammad Hilmi Mu'Afa",
      "status": "aktif",
      "source": "website",
      "updated_at": "2026-09-25T10:00:00.000Z"
    },
    {
      "id": "iuran-3326600014-2026-10",
      "transaction_id": "iuran-3326600014-2026-10",
      "tanggal": "2026-10-01",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 15000,
      "keterangan": "Iuran Kas - Muhammad Hilmi Mu'Afa (Okt 2026)",
      "mahasiswa_nama": "Muhammad Hilmi Mu'Afa",
      "status": "aktif",
      "source": "website",
      "updated_at": "2026-09-25T10:00:00.000Z"
    },
    {
      "id": "iuran-3326600014-2026-11",
      "transaction_id": "iuran-3326600014-2026-11",
      "tanggal": "2026-11-01",
      "jenis": "masuk",
      "kategori": "Iuran Kas",
      "nominal": 15000,
      "keterangan": "Iuran Kas - Muhammad Hilmi Mu'Afa (Nov 2026)",
      "mahasiswa_nama": "Muhammad Hilmi Mu'Afa",
      "status": "aktif",
      "source": "website",
      "updated_at": "2026-09-25T10:00:00.000Z"
    },
    {
      "id": "trx-exp-row-6",
      "transaction_id": "trx-exp-row-6",
      "tanggal": "2026-10-02",
      "jenis": "keluar",
      "kategori": "ATK & Kelas",
      "nominal": 5500,
      "keterangan": "Print kertas attendence",
      "mahasiswa_nama": "",
      "status": "aktif",
      "source": "website",
      "updated_at": "2026-10-02T10:00:00.000Z"
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
