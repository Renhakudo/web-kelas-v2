// Rangkuman materi per mata kuliah per minggu.
// semester.mulai : Senin minggu pertama kuliah
// semester.minggu: jumlah minggu satu semester (termasuk UTS dan UAS)
// semester.uts / semester.uas: minggu ke berapa ujian berlangsung (tidak punya rangkuman)
// simbol         : gambar di kartu tarot: kurva, kurung, integral, alir, jaringan, buku, lima, tunas
// julukan        : tulisan kecil di bawah gambar kartu (boleh dikosongkan)
// jenis              : "teori" atau "praktikum"
// grup               : sama untuk pasangan teori-praktikum; satu kartu, lalu pilih kiri (Teori) / kanan (Praktikum)
//
// Cara menulis isi (mirip Notion), di dalam tanda ` ... `:
//   ## Judul bagian        ### Subjudul
//   - poin                 1. poin bernomor
//   - [ ] tugas            - [x] tugas selesai
//   > kutipan              ! kotak catatan (callout)
//   + Judul bagian yang bisa dibuka-tutup
//     (baris isinya diawali dua spasi)
//   ---  garis pemisah     **tebal**  *miring*  `kode`
window.DATA = window.DATA || {};
window.DATA.rangkuman = {
  semester: { mulai: "2026-08-24", minggu: 16, uts: 8, uas: 16 },
  matkul: [
    {
      id: "statistika-dasar", julukan: "Sang Penafsir", grup: "statistika", simbol: "kurva", nama: "Statistika Dasar", jenis: "teori", dosen: "Ronny Susetyoko",
      minggu: {
        "1": {
          judul: "Pengantar statistika dan jenis data", penulis: "Contoh", status: "contoh",
          isi: `
! Contoh isi. Ganti dengan rangkuman kelas.

## Dua cabang statistika
- **Statistika deskriptif** merangkum dan menyajikan data: tabel, grafik, ukuran pemusatan.
- **Statistika inferensial** menarik kesimpulan tentang populasi dari sampel.

## Populasi dan sampel
Populasi adalah seluruh objek yang ingin diteliti. Sampel adalah bagian populasi yang benar-benar diamati.

> Sampel yang baik mewakili populasinya; cara pengambilannya sama pentingnya dengan ukurannya.

## Skala pengukuran
1. **Nominal**: kategori tanpa urutan (golongan darah).
2. **Ordinal**: kategori berurutan (tingkat kepuasan).
3. **Interval**: selisih bermakna, tanpa nol mutlak (suhu Celsius).
4. **Rasio**: punya nol mutlak (berat, tinggi).

+ Kenapa skala penting?
  Skala menentukan ukuran dan uji statistik yang boleh dipakai. Rata-rata, misalnya, tidak bermakna untuk data nominal.

---
- [x] Baca bab 1 buku pegangan
- [ ] Kerjakan latihan skala pengukuran
`
        },
        "2": {
          judul: "Ukuran pemusatan", penulis: "Contoh", status: "contoh",
          isi: `
! Contoh isi. Ganti dengan rangkuman kelas.

## Rata-rata, median, modus
- **Rata-rata** peka terhadap pencilan.
- **Median** lebih tahan untuk data yang miring.
- **Modus** satu-satunya ukuran pemusatan untuk data nominal.
`
        },
        "3": {
          judul: "Ukuran penyebaran", penulis: "Contoh", status: "contoh",
          isi: `
! Contoh isi. Ganti dengan rangkuman kelas.

## Seberapa menyebar datanya?
- **Jangkauan** = nilai terbesar - nilai terkecil. Mudah, tapi hanya memakai dua nilai.
- **Varians** dan **simpangan baku** mengukur jarak rata-rata data dari rata-ratanya.
`
        }
      }
    },
    {
      id: "praktikum-statistika-dasar", julukan: "Sang Penafsir", grup: "statistika", simbol: "kurva", nama: "Praktikum Statistika Dasar", jenis: "praktikum", dosen: "Ronny Susetyoko",
      minggu: {
        "1": {
          judul: "Mengenal lembar kerja dan data", penulis: "Contoh", status: "contoh",
          isi: `
! Contoh isi. Ganti dengan rangkuman kelas.

## Yang dikerjakan
1. Membuka berkas data contoh.
2. Merapikan nama kolom dan tipe data.
3. Menghitung rata-rata dan median tiap kolom angka.

+ Kesalahan yang sering terjadi
  - Angka tersimpan sebagai teks, sehingga tidak bisa dihitung.
  - Baris kosong di tengah data ikut terhitung.
`
        }
      }
    },
    {
      id: "pemrograman-1", julukan: "Sang Perakit", grup: "pemrograman", simbol: "kurung", nama: "Pemrograman 1", jenis: "teori", dosen: "Dian Septiani Santoso",
      minggu: {
        "1": {
          judul: "Variabel, tipe data, dan masukan-keluaran", penulis: "Contoh", status: "contoh",
          isi: `
! Contoh isi. Ganti dengan rangkuman kelas.

## Variabel dan tipe data
Variabel menyimpan nilai. Tipe data menentukan operasi yang bisa dilakukan, misalnya \`int\`, \`float\`, dan \`str\`.

## Masukan pengguna
Masukan dari pengguna dibaca sebagai teks. Ubah dulu tipenya sebelum dihitung, misalnya dengan \`int(...)\`.
`
        }
      }
    },
    { id: "praktikum-pemrograman-1", julukan: "Sang Perakit", grup: "pemrograman", simbol: "kurung", nama: "Praktikum Pemrograman 1", jenis: "praktikum", dosen: "Dian Septiani Santoso", minggu: {} },
    {
      id: "workshop-sistem-operasi", julukan: "Sang Penghubung", simbol: "jaringan", nama: "Workshop Sistem Operasi dan Jaringan", jenis: "praktikum", dosen: "Yesta Medya Mahardhika",
      minggu: {
        "9": {
          judul: "Bash Shell Scripting 2: otomatisasi tugas dengan skrip", penulis: "Mohammad Aditya Arkoun",
          isi: `
! Rangkuman praktikum M9 (Bash Shell Scripting 2). Delapan skrip dibuat dan dijalankan: monitor sistem, ETL log, penjadwal tugas, backup, pemantau log, pembersihan otomatis, manajemen user, dan network scanner.

## Pola skrip otomasi
- Pecah pekerjaan menjadi fungsi kecil, lalu panggil dari \`main\`.
- Catat setiap langkah ke log supaya hasilnya bisa diperiksa kembali.
- Periksa hasil perintah (\`$?\`) dan jangan melaporkan berhasil kalau sebenarnya gagal.

## Skrip dan fungsinya
1. \`monitor_system.sh\`: baca CPU, memori, disk, dan load average, bandingkan dengan ambang batas, lalu catat alert.
2. \`etl_log.sh\`: Extract, Transform, Load log web server menjadi CSV dan ringkasan.
3. \`task_scheduler.sh\`: simpan tugas di file, jalankan dengan \`--run\`, dan buat laporan.
4. \`backup.sh\`: arsip \`tar.gz\` dengan log dan penghapusan backup lama.
5. \`realtime_log.sh\`: pantau log yang terus bertambah dengan \`tail -f\`.
6. \`auto_clean.sh\`: bersihkan file temporary dan log, dengan laporan sebelum dan sesudah.
7. \`user_mgmt.sh\`: tambah, hapus, backup, dan daftar user.
8. \`network_scanner.sh\`: pindai host dan port, simpan CSV, lalu bandingkan dengan hasil sebelumnya.

## Ide yang perlu diingat
### Membaca log web server dengan awk
Pada log berformat combined, kolom pertama adalah IP, kolom keenam metode HTTP, dan kolom kesembilan kode status. Hitung kemunculan dengan \`sort | uniq -c | sort -nr\`.

### Format cron
Lima kolom: menit, jam, tanggal, bulan, hari dalam minggu. Contoh \`0 2 * * *\` berarti jam 02.00 setiap hari.

### Pantau log real-time
\`tail -f\` menampilkan sepuluh baris terakhir lebih dulu. Pakai \`tail -n 0 -f\` kalau hanya ingin baris baru, dan \`grep --line-buffered\` supaya hasil filter langsung tampil.

### Hak akses
- Skrip yang mengubah sistem, seperti \`useradd\` dan \`userdel\`, harus dijalankan dengan \`sudo\`.
- Tanpa \`sudo\`, \`find\` tidak bisa menghapus file di \`/var/log\`.

+ Kesalahan yang ditemui saat praktikum
  - \`etl_log.sh\`: satu baris kosong di file log ikut terhitung sebagai request, jadi total menjadi 10 padahal datanya 9. Saring dengan \`grep -v '^$'\`.
  - \`task_scheduler.sh\`: command \`echo (hallo)\` gagal dengan exit code 2 karena tanda kurung dibaca sebagai sintaks. Tulis \`echo hallo\`. Jadwal juga harus terdiri dari lima kolom.
  - \`auto_clean.sh\`: ringkasan menyebut file dihapus, tetapi ukuran \`/var/log\` tidak berubah karena dijalankan tanpa \`sudo\` dan pesan error disembunyikan oleh \`2>/dev/null\`.
  - \`backup.sh\`: gagal kalau folder sumber tidak ada. Pastikan sumbernya ada sebelum menjalankan.
  - \`Permission denied\`: beri izin eksekusi dengan \`chmod +x skrip.sh\`.
  - \`[[: not found\`: skrip dijalankan oleh \`sh\`. Jalankan dengan \`./skrip.sh\` (baris pertama \`#!/bin/bash\`) atau \`bash skrip.sh\`.
  - \`syntax error near unexpected token\`: tanda \`<\` dan \`>\` di contoh perintah hanya penanda isian, jangan diketik.

+ Tips dari modul
  - Debug dengan \`bash -x skrip.sh\`, atau \`set -x\` sampai \`set +x\` di dalam skrip.
  - Pengaman: \`set -euo pipefail\`.
  - Selalu kutip variabel, misalnya \`"$file"\`.
  - Bersihkan file sementara dengan \`trap cleanup EXIT\`.
  - Baca file besar dengan \`while IFS= read -r line\`.

---
- [ ] Coba \`etl_log.sh\` dengan log yang punya baris kosong, lalu perbaiki.
- [ ] Tambahkan tugas ke \`task_scheduler.sh\` dengan jadwal \`* * * * *\` dan command \`echo hallo\`.
- [ ] Jalankan \`auto_clean.sh\` dengan \`sudo\` dan bandingkan angka sebelum dan sesudah.
`
        }
      }
    },
    { id: "matematika-1", julukan: "Sang Penghitung", simbol: "integral", nama: "Matematika 1", jenis: "teori", dosen: "Ira Prasetyaningrum", minggu: {} },
    { id: "logika-algoritma", julukan: "Sang Perancang", simbol: "alir", nama: "Logika dan Algoritma", jenis: "teori", dosen: "Nana Ramadjianti", minggu: {} },
    { id: "agama", julukan: "Sang Penuntun", simbol: "buku", nama: "Agama", jenis: "teori", dosen: "Imamul Arifin", minggu: {} },
    { id: "pancasila", julukan: "Sang Pemersatu", simbol: "lima", nama: "Pancasila", jenis: "teori", dosen: "Moh. Zikky / Haryadi Amran Darwito", minggu: {} },
    { id: "pengembangan-karakter", julukan: "Sang Penumbuh", simbol: "tunas", nama: "Pengembangan Karakter", jenis: "teori", dosen: "Isbat Uzzin Nadhori / Nalussa'ada", minggu: {} }
  ]
};
