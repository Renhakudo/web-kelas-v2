# Panduan Setup Two-Way Sync Kas SDT A <-> Google Sheets (`Sheet1`)

Bendahara/Admin cukup bekerja langsung di **`Sheet1`** seperti biasa (mencentang checkbox iuran `Sep`–`Mei` dan mengisi tabel `LAPORAN PENGELUARAN`). Tidak perlu mengisi tab manual terpisah. Metadata teknis disimpan di sheet tersembunyi `_Sync_Meta`.

- **Website → Appwrite → `Sheet1`:** Tambah/edit/hapus transaksi di Mutasi atau klik `+1`/`-1`/`Lunas` di Tab Iuran otomatis menyalakan/mematikan checkbox atau mengisi baris pengeluaran di `Sheet1`.
- **`Sheet1` → Appwrite → Website:** Centang/hapus centang checkbox di `C9:K32` atau tambah/ubah/hapus baris pengeluaran di `P6:R100` otomatis masuk ke Appwrite (`cash_transactions`) dan tampil di Website.

---

## 1. Perbarui Skema & Data Awal Appwrite (WAJIB!)
Jalankan berurutan dari root proyek agar 7 atribut sinkronisasi terbaru (`transaction_id`, `mahasiswa_nama`, `status`, `source`, `updated_at`, `sync_status`, `created_by`), permission label, dan data real masuk ke Appwrite:
```bash
node scripts/setup-appwrite.js
node scripts/create-users.js
node scripts/seed-kas.js
```

---

## 2. Deploy / Update Appwrite Function (`functions/kas-sync-sheets`)
1. Unggah ulang arsip terbaru `functions/kas-sync-sheets.tar.gz` di **Appwrite Console → Functions → `kas-sync-sheets`** (pastikan **Entrypoint** = `src/main.js`, **Execute role** = `any`).
2. Pada tab **Settings → Events**, pastikan ada 3 DB event:
   - `databases.sdta_db.collections.cash_transactions.documents.*.create`
   - `databases.sdta_db.collections.cash_transactions.documents.*.update`
   - `databases.sdta_db.collections.cash_transactions.documents.*.delete`
3. Pastikan **Environment Variables** lengkap:
   - `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID` (`sdta_db`), `GAS_WEBHOOK_URL`, `GAS_WEBHOOK_SECRET`, `SYNC_WEBHOOK_SECRET`.
4. Salin **Function ID** ke `functions.kasSyncSheets` di [data/appwrite-config.js](../../data/appwrite-config.js).

---

## 3. Setup Google Apps Script (`scripts/google-apps-script/Code.gs`)
1. Buka Google Sheets kas kelas (`kas SDT A.xlsx` yang sudah diimpor ke Google Sheets dengan `Sheet1`).
2. Buka **Extensions → Apps Script** dan tempel seluruh isi [Code.gs](./Code.gs), lalu simpan (`Ctrl+S`).
3. Di **Project Settings → Script Properties**, isi keempat properti lalu klik **Save script properties**:
   - `APPWRITE_FUNCTION_URL`: `https://fra.cloud.appwrite.io/v1/functions/<FUNCTION_ID>/executions`
   - `APPWRITE_PROJECT_ID`: `6ae2a1eb001089e29cbd`
   - `SYNC_WEBHOOK_SECRET`: *(sama dengan env di Appwrite Function)*
   - `GAS_WEBHOOK_SECRET`: *(sama dengan env di Appwrite Function)*
4. **Deploy → New deployment → Web app** (`Execute as: Me`, `Who has access: Anyone`) dan salin URL `/exec`-nya ke `GAS_WEBHOOK_URL` pada Appwrite Function.
5. Reload Google Sheets → buka menu **💰 Kas SDT A Sync → 1. Setup Sheet1 & Trigger Otomatis**, lalu jalankan **3. Tarik Semua Data dari Appwrite ke Sheet1**.
