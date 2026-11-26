/**
 * Google Apps Script — Two-Way Sync Langsung pada Sheet1 (Original) <-> Appwrite Cloud
 *
 * Bendahara/Admin cukup bekerja langsung di "Sheet1" seperti biasa:
 *   - Centang / hapus centang checkbox iuran mahasiswa (C9:K32: Sep..Mei)
 *   - Tambah / ubah / hapus baris pada tabel LAPORAN PENGELUARAN (P6:R100)
 *
 * Metadata teknis sinkronisasi (transaction_id pengeluaran, updated_at, sync_status)
 * disimpan di sheet tersembunyi "_Sync_Meta" sehingga tampilan Sheet1 tetap bersih.
 *
 * Script Properties (Project Settings -> Script Properties):
 *   1. APPWRITE_FUNCTION_URL : https://fra.cloud.appwrite.io/v1/functions/<FUNCTION_ID>/executions
 *   2. APPWRITE_PROJECT_ID   : 6ae2a1eb001089e29cbd
 *   3. SYNC_WEBHOOK_SECRET   : Secret webhook masuk ke Appwrite Function
 *   4. GAS_WEBHOOK_SECRET    : Secret webhook masuk ke Google Apps Script
 */

var MAIN_SHEET_NAME = 'Sheet1';
var META_SHEET_NAME = '_Sync_Meta';

// Daftar 9 bulan pada Sheet1 kolom C (3) sampai K (11)
var MONTH_COLS = [
  { col: 3, periode: '2026-09', label: 'Sep 2026' },
  { col: 4, periode: '2026-10', label: 'Okt 2026' },
  { col: 5, periode: '2026-11', label: 'Nov 2026' },
  { col: 6, periode: '2026-12', label: 'Des 2026' },
  { col: 7, periode: '2027-01', label: 'Jan 2027' },
  { col: 8, periode: '2027-02', label: 'Feb 2027' },
  { col: 9, periode: '2027-03', label: 'Mar 2027' },
  { col: 10, periode: '2027-04', label: 'Apr 2027' },
  { col: 11, periode: '2027-05', label: 'Mei 2027' }
];

// Pemetaan resmi 24 mahasiswa (NRP konsisten dengan data/anggota.js & Appwrite)
var STUDENTS = [
  { nrp: '3326600001', nama: 'Rihana Shafira Azzalia' },
  { nrp: '3326600002', nama: 'Ryandra Alifah Hafizd' },
  { nrp: '3326600003', nama: 'Davin Zoe Akhmad' },
  { nrp: '3326600004', nama: 'Atiyah Dinar Aliyah' },
  { nrp: '3326600005', nama: 'Raditya Jeremia Kriswanto Putra' },
  { nrp: '3326600006', nama: 'Alina Yusika Safitri' },
  { nrp: '3326600007', nama: 'Shasya Aurellia Azzahra' },
  { nrp: '3326600008', nama: 'Christoper Natanael Partogi Panjaitan' },
  { nrp: '3326600009', nama: 'Atika Meilinda' },
  { nrp: '3326600010', nama: 'Favian Zada Putra' },
  { nrp: '3326600011', nama: 'Afghan Yazid Ilmany' },
  { nrp: '3326600012', nama: 'Arven Hael Viscaya Atjeh' },
  { nrp: '3326600013', nama: 'Hants Immanuel Marito Hutauruk' },
  { nrp: '3326600014', nama: "Muhammad Hilmi Mu'Afa" },
  { nrp: '3326600015', nama: 'Marvin Febrian Agyantra' },
  { nrp: '3326600016', nama: 'Mohammad Aditya Arkoun' },
  { nrp: '3326600017', nama: 'Nawfal Rayhan Subagyo' },
  { nrp: '3326600018', nama: 'Saskia Tifani Amelia' },
  { nrp: '3326600019', nama: 'Sifa Luvena Taufiqah Palupi' },
  { nrp: '3326600020', nama: 'Elyka Imelda Mayzananda' },
  { nrp: '3326600021', nama: 'Tirta Prasetya Kusuma Wardana' },
  { nrp: '3326600022', nama: 'Fauzan Aqeelah Ghazi Rabbani' },
  { nrp: '3326600023', nama: 'Abdullah Azzam Hibatullah' },
  { nrp: '3326600024', nama: 'Ghazi Silkaputera Hanania' }
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('💰 Kas SDT A Sync')
    .addItem('1. Setup Sheet1 & Trigger Otomatis', 'setupKasSyncSheet')
    .addItem('2. Kirim Ulang Antrean Gagal / Pending', 'syncAllPendingToAppwrite')
    .addItem('3. Tarik Semua Data dari Appwrite ke Sheet1', 'pullAllFromAppwrite')
    .addToUi();
}

/**
 * Menyiapkan hidden sheet _Sync_Meta, memastikan C4 menjumlahkan pengeluaran sampai R100,
 * serta memasang installable onEdit trigger pada Spreadsheet.
 */
function setupKasSyncSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  if (!mainSheet) {
    throw new Error('Sheet "' + MAIN_SHEET_NAME + '" tidak ditemukan.');
  }

  // Pastikan formula total pengeluaran menjangkau sampai baris 100
  var c4Formula = String(mainSheet.getRange('C4').getFormula() || '');
  if (!c4Formula || c4Formula.toUpperCase().indexOf('R20') !== -1) {
    mainSheet.getRange('C4').setFormula('=SUM(R6:R100)');
  }

  // Buat atau pastikan sheet tersembunyi _Sync_Meta ada
  getOrCreateMetaSheet_(ss);

  // Pasang installable onEdit trigger (hapus duplikat lama dulu)
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onEditInstalled') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('onEditInstalled').forSpreadsheet(ss).onEdit().create();
  SpreadsheetApp.getUi().alert('Setup selesai! Anda cukup mencentang checkbox & mengisi tabel pengeluaran di "' + MAIN_SHEET_NAME + '".');
}

function getOrCreateMetaSheet_(ss) {
  var meta = ss.getSheetByName(META_SHEET_NAME);
  if (!meta) {
    meta = ss.insertSheet(META_SHEET_NAME);
    meta.getRange(1, 1, 1, 6).setValues([['transaction_id', 'target_type', 'sheet_row', 'updated_at', 'sync_status', 'last_error']]);
    meta.hideSheet();
  }
  return meta;
}

function getSyncConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    functionUrl: props.getProperty('APPWRITE_FUNCTION_URL') || '',
    projectId: props.getProperty('APPWRITE_PROJECT_ID') || '',
    syncSecret: props.getProperty('SYNC_WEBHOOK_SECRET') || '',
    gasSecret: props.getProperty('GAS_WEBHOOK_SECRET') || ''
  };
}

function resolveStudent_(rawName) {
  var q = String(rawName || '').trim().toLowerCase();
  if (!q) return null;
  for (var i = 0; i < STUDENTS.length; i++) {
    if (STUDENTS[i].nama.toLowerCase() === q) return STUDENTS[i];
  }
  // Pencocokan awalan/parsial (mis. "Nawfal Rayhan" -> "Nawfal Rayhan Subagyo", "Elyka Imelda" -> "Elyka Imelda Mayzananda")
  for (var j = 0; j < STUDENTS.length; j++) {
    var cand = STUDENTS[j].nama.toLowerCase();
    if (cand.indexOf(q) === 0 || q.indexOf(cand) === 0 || cand.indexOf(q) !== -1) {
      return STUDENTS[j];
    }
  }
  return null;
}

function findStudentRowInSheet1_(sheet, studentName) {
  var target = resolveStudent_(studentName);
  var names = sheet.getRange('B9:B32').getValues();
  for (var i = 0; i < names.length; i++) {
    var rowStudent = resolveStudent_(names[i][0]);
    if (target && rowStudent && rowStudent.nrp === target.nrp) {
      return i + 9;
    }
    if (String(names[i][0] || '').trim().toLowerCase() === String(studentName || '').trim().toLowerCase()) {
      return i + 9;
    }
  }
  return -1;
}

function normalizeDateCell_(val) {
  if (!val) return '';
  if (Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime())) {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
  }
  var s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var d = new Date(s);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
  }
  return '';
}

function isNewerTimestamp_(existingIso, incomingIso) {
  if (!existingIso) return true;
  var exMs = Date.parse(existingIso);
  var inMs = Date.parse(incomingIso);
  if (isNaN(exMs)) return true;
  if (isNaN(inMs)) return false;
  return inMs >= exMs;
}

/**
 * Webhook masuk dari Appwrite Function `kas-sync-sheets` (Website/Appwrite -> Sheet1).
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  var props = PropertiesService.getScriptProperties();

  try {
    var cfg = getSyncConfig_();
    var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!cfg.gasSecret || payload.secret !== cfg.gasSecret) {
      return jsonResponse_({ ok: false, message: 'Unauthorized webhook secret' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(MAIN_SHEET_NAME);
    if (!sheet) {
      return jsonResponse_({ ok: false, message: 'Sheet1 tidak ditemukan' });
    }
    var meta = getOrCreateMetaSheet_(ss);

    props.setProperty('SYNCING_FROM_APPWRITE', String(Date.now()));

    var action = payload.action || 'upsert_transaction';
    if (action === 'export_all') {
      var exported = exportSheet1AsTransactions_(sheet, meta);
      return jsonResponse_({ ok: true, transactions: exported });
    }

    var items = [];
    if (action === 'upsert_batch' && Array.isArray(payload.transactions)) {
      items = payload.transactions;
    } else if (payload.transaction) {
      items = [payload.transaction];
    }

    var results = applyTransactionsToSheet1_(sheet, meta, items);
    return jsonResponse_({ ok: true, results: results });
  } catch (err) {
    return jsonResponse_({ ok: false, message: String(err && err.message ? err.message : err) });
  } finally {
    props.deleteProperty('SYNCING_FROM_APPWRITE');
    lock.releaseLock();
  }
}

/**
 * Installable trigger saat Bendahara mengubah checkbox iuran (C9:K32)
 * atau tabel pengeluaran (P6:R100) langsung pada Sheet1.
 */
function onEditInstalled(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  if (sheet.getName() !== MAIN_SHEET_NAME) return;

  var props = PropertiesService.getScriptProperties();
  var syncingSince = Number(props.getProperty('SYNCING_FROM_APPWRITE') || 0);
  if (syncingSince && Date.now() - syncingSince < 3000) return;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;

  try {
    var ss = sheet.getParent();
    var meta = getOrCreateMetaSheet_(ss);
    var startRow = e.range.getRow();
    var endRow = startRow + e.range.getNumRows() - 1;
    var startCol = e.range.getColumn();
    var endCol = startCol + e.range.getNumColumns() - 1;
    var nominalKas = Number(sheet.getRange('C2').getValue()) || 15000;
    var batch = [];

    // 1. Cek perubahan pada Checkbox Iuran Mahasiswa (C9:K32)
    for (var r = Math.max(9, startRow); r <= Math.min(32, endRow); r++) {
      var rawNama = sheet.getRange(r, 2).getValue();
      var student = resolveStudent_(rawNama);
      if (!student) continue;

      for (var c = Math.max(3, startCol); c <= Math.min(11, endCol); c++) {
        var monthInfo = MONTH_COLS[c - 3];
        var cellVal = sheet.getRange(r, c).getValue();
        var isChecked = (cellVal === true || cellVal === 1 || String(cellVal).toUpperCase() === 'TRUE');
        var txId = 'iuran-' + student.nrp + '-' + monthInfo.periode;
        var nowIso = new Date().toISOString();

        var txObj = {
          transaction_id: txId,
          tanggal: monthInfo.periode + '-01',
          jenis: 'masuk',
          kategori: 'Iuran Kas',
          nominal: nominalKas,
          keterangan: 'Iuran Kas - ' + student.nama + ' (' + monthInfo.label + ')',
          mahasiswa_nama: student.nama,
          status: isChecked ? 'aktif' : 'deleted',
          source: 'sheets',
          updated_at: nowIso
        };
        upsertMetaRecord_(meta, txId, 'iuran', r, nowIso, 'pending', '');
        batch.push(txObj);
      }
    }

    // 2. Cek perubahan pada Tabel LAPORAN PENGELUARAN (P6:R100 -> col 16..18)
    if (endCol >= 16 && startCol <= 18 && endRow >= 6) {
      for (var er = Math.max(6, startRow); er <= Math.min(100, endRow); er++) {
        var rowExp = sheet.getRange(er, 16, 1, 3).getValues()[0]; // P, Q, R
        var tglIso = normalizeDateCell_(rowExp[0]);
        var jenisPengeluaran = String(rowExp[1] || '').trim();
        var jumlah = Number(rowExp[2] || 0);
        var existingMeta = findMetaBySheetRow_(meta, 'expense', er);

        // Jika seluruh P, Q, R dikosongkan dan sebelumnya ada record -> soft delete
        if (!tglIso && !jenisPengeluaran && !jumlah) {
          if (existingMeta && existingMeta.transaction_id) {
            var delIso = new Date().toISOString();
            upsertMetaRecord_(meta, existingMeta.transaction_id, 'expense', er, delIso, 'pending', '');
            batch.push({
              transaction_id: existingMeta.transaction_id,
              tanggal: normalizeDateCell_(new Date()),
              jenis: 'keluar',
              kategori: 'ATK & Kelas',
              nominal: 0,
              keterangan: 'Dihapus dari Sheet1',
              mahasiswa_nama: '',
              status: 'deleted',
              source: 'sheets',
              updated_at: delIso
            });
          }
          continue;
        }

        // Tunggu sampai minimal Keterangan dan Jumlah terisi valid (tanggal default hari ini jika belum diisi)
        if (!jenisPengeluaran || isNaN(jumlah) || jumlah <= 0) {
          continue;
        }
        if (!tglIso) {
          tglIso = normalizeDateCell_(new Date());
        }

        var expTxId = (existingMeta && existingMeta.transaction_id) || ('trx-exp-row-' + er);
        var expIso = new Date().toISOString();
        upsertMetaRecord_(meta, expTxId, 'expense', er, expIso, 'pending', '');
        batch.push({
          transaction_id: expTxId,
          tanggal: tglIso,
          jenis: 'keluar',
          kategori: 'ATK & Kelas',
          nominal: Math.round(jumlah),
          keterangan: jenisPengeluaran,
          mahasiswa_nama: '',
          status: 'aktif',
          source: 'sheets',
          updated_at: expIso
        });
      }
    }

    if (batch.length > 0) {
      var pushResult = pushBatchToAppwrite_(meta, batch);
      if (pushResult.ok) {
        ss.toast('Tersinkron otomatis ke Appwrite & Web (' + batch.length + ' perubahan).', 'Kas SDT A Sync', 3);
      } else {
        ss.toast('Gagal auto-sync ke Appwrite: ' + pushResult.error, 'Kas SDT A Sync', 8);
      }
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Mengirim ulang seluruh antrean gagal/pending ke Appwrite (atau membaca ulang Sheet1).
 */
function syncAllPendingToAppwrite() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MAIN_SHEET_NAME);
  var meta = getOrCreateMetaSheet_(ss);
  var all = exportSheet1AsTransactions_(sheet, meta);
  if (all.length > 0) {
    pushBatchToAppwrite_(meta, all);
  }
  SpreadsheetApp.getUi().alert('Sinkronisasi ' + all.length + ' data dari Sheet1 ke Appwrite selesai.');
}

/**
 * Menarik semua data terbaru dari Appwrite (Single Source of Truth) dan memperbarui checkbox & tabel Sheet1.
 */
function pullAllFromAppwrite() {
  var cfg = getSyncConfig_();
  var missing = [];
  if (!cfg.functionUrl) missing.push('APPWRITE_FUNCTION_URL');
  if (!cfg.projectId) missing.push('APPWRITE_PROJECT_ID');
  if (!cfg.syncSecret) missing.push('SYNC_WEBHOOK_SECRET');
  if (missing.length > 0) {
    var existingKeys = PropertiesService.getScriptProperties().getKeys();
    throw new Error(
      'Script Properties belum terbaca: ' + missing.join(', ') +
      '. Key yang tersimpan saat ini: [' + existingKeys.join(', ') + ']'
    );
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  var props = PropertiesService.getScriptProperties();

  try {
    props.setProperty('SYNCING_FROM_APPWRITE', String(Date.now()));
    var res = callAppwriteFunction_(cfg, { action: 'export_for_sheets', secret: cfg.syncSecret });
    var txs = (res && res.transactions) || [];
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(MAIN_SHEET_NAME);
    var meta = getOrCreateMetaSheet_(ss);
    applyTransactionsToSheet1_(sheet, meta, txs, true);
  } finally {
    props.deleteProperty('SYNCING_FROM_APPWRITE');
    lock.releaseLock();
  }
}

function applyTransactionsToSheet1_(sheet, meta, items, forceOverwrite) {
  var results = [];
  var nominalKas = Number(sheet.getRange('C2').getValue()) || 15000;

  for (var i = 0; i < items.length; i++) {
    var tx = items[i] || {};
    var txId = String(tx.transaction_id || tx.$id || '').trim();
    if (!txId) continue;
    var incomingTs = tx.updated_at || tx.$updatedAt || new Date().toISOString();
    var existingMeta = findMetaByTxId_(meta, txId);
    if (!forceOverwrite && existingMeta && !isNewerTimestamp_(existingMeta.updated_at, incomingTs)) {
      results.push({ transaction_id: txId, action: 'skipped_conflict_sheet_newer' });
      continue;
    }

    var status = String(tx.status || 'aktif').toLowerCase();

    // A. Transaksi Iuran per bulan (iuran-<nrp>-<YYYY-MM>) atau Iuran Kas mahasiswa
    var iuranMatch = txId.match(/^iuran-(\d{8,14})-(\d{4}-\d{2})$/);
    if (iuranMatch) {
      var nrp = iuranMatch[1];
      var periode = iuranMatch[2];
      var studentObj = null;
      for (var s = 0; s < STUDENTS.length; s++) {
        if (STUDENTS[s].nrp === nrp) { studentObj = STUDENTS[s]; break; }
      }
      var colIdx = -1;
      for (var m = 0; m < MONTH_COLS.length; m++) {
        if (MONTH_COLS[m].periode === periode) { colIdx = MONTH_COLS[m].col; break; }
      }
      if (studentObj && colIdx > 0) {
        var rowIdx = findStudentRowInSheet1_(sheet, studentObj.nama);
        if (rowIdx > 0) {
          sheet.getRange(rowIdx, colIdx).setValue(status !== 'deleted');
          upsertMetaRecord_(meta, txId, 'iuran', rowIdx, incomingTs, 'synced', '');
          results.push({ transaction_id: txId, action: 'updated_checkbox' });
          continue;
        }
      }
    }

    // Legacy / bulk Iuran Kas transaction (mis. trx-real-01..04 dengan mahasiswa_nama)
    if (tx.jenis === 'masuk' && tx.mahasiswa_nama && status !== 'deleted') {
      var stuRow = findStudentRowInSheet1_(sheet, tx.mahasiswa_nama);
      if (stuRow > 0) {
        var monthsPaid = Math.min(MONTH_COLS.length, Math.max(0, Math.round(Number(tx.nominal || 0) / nominalKas)));
        for (var k = 0; k < monthsPaid; k++) {
          sheet.getRange(stuRow, MONTH_COLS[k].col).setValue(true);
        }
        upsertMetaRecord_(meta, txId, 'iuran', stuRow, incomingTs, 'synced', '');
        results.push({ transaction_id: txId, action: 'updated_bulk_checkboxes' });
        continue;
      }
    }

    // B. Transaksi Pengeluaran -> Tabel LAPORAN PENGELUARAN (O..R baris 6..100)
    if (tx.jenis === 'keluar') {
      var rowFromIdMatch = txId.match(/^trx-exp-row-(\d+)$/);
      var expRow = (existingMeta && existingMeta.sheet_row) ? Number(existingMeta.sheet_row) : (rowFromIdMatch ? Number(rowFromIdMatch[1]) : -1);
      if (status === 'deleted') {
        // Hanya hapus baris jika memang dipetakan ke baris spesifik (jangan hapus via fuzzy match keterangan)
        if (expRow >= 6) {
          sheet.getRange(expRow, 16, 1, 3).clearContent();
          upsertMetaRecord_(meta, txId, 'expense', expRow, incomingTs, 'synced', '');
        }
        results.push({ transaction_id: txId, action: 'cleared_expense_row' });
      } else {
        if (expRow < 6) {
          expRow = findExpenseRowForTx_(sheet, meta, txId, tx.keterangan, tx.tanggal);
        }
        if (expRow < 6) {
          expRow = findFirstEmptyExpenseRow_(sheet);
        }
        sheet.getRange(expRow, 15).setValue(expRow - 5); // Kolom O: NO
        sheet.getRange(expRow, 16).setValue(normalizeDateCell_(tx.tanggal));
        sheet.getRange(expRow, 17).setValue(String(tx.keterangan || ''));
        sheet.getRange(expRow, 18).setValue(Number(tx.nominal || 0));
        upsertMetaRecord_(meta, txId, 'expense', expRow, incomingTs, 'synced', '');
        results.push({ transaction_id: txId, action: 'upserted_expense_row' });
      }
    }
  }
  return results;
}

function exportSheet1AsTransactions_(sheet, meta) {
  var out = [];
  var nominalKas = Number(sheet.getRange('C2').getValue()) || 15000;

  // 1. Export status checkbox C9:K32
  var names = sheet.getRange('B9:B32').getValues();
  var grid = sheet.getRange('C9:K32').getValues();
  for (var i = 0; i < names.length; i++) {
    var stu = resolveStudent_(names[i][0]);
    if (!stu) continue;
    for (var m = 0; m < MONTH_COLS.length; m++) {
      var val = grid[i][m];
      var checked = (val === true || val === 1 || String(val).toUpperCase() === 'TRUE');
      var txId = 'iuran-' + stu.nrp + '-' + MONTH_COLS[m].periode;
      var ex = findMetaByTxId_(meta, txId);
      if (checked || ex) {
        out.push({
          transaction_id: txId,
          tanggal: MONTH_COLS[m].periode + '-01',
          jenis: 'masuk',
          kategori: 'Iuran Kas',
          nominal: nominalKas,
          keterangan: 'Iuran Kas - ' + stu.nama + ' (' + MONTH_COLS[m].label + ')',
          mahasiswa_nama: stu.nama,
          status: checked ? 'aktif' : 'deleted',
          source: 'sheets',
          updated_at: (ex && ex.updated_at) || new Date().toISOString()
        });
      }
    }
  }

  // 2. Export baris pengeluaran P6:R100
  var expRows = sheet.getRange('P6:R100').getValues();
  for (var r = 0; r < expRows.length; r++) {
    var sheetRow = r + 6;
    var tgl = normalizeDateCell_(expRows[r][0]);
    var ket = String(expRows[r][1] || '').trim();
    var jml = Number(expRows[r][2] || 0);
    if (!tgl || !ket || isNaN(jml) || jml <= 0) continue;
    var mRec = findMetaBySheetRow_(meta, 'expense', sheetRow);
    var eTxId = (mRec && mRec.transaction_id) || ('trx-exp-row-' + sheetRow);
    out.push({
      transaction_id: eTxId,
      tanggal: tgl,
      jenis: 'keluar',
      kategori: 'ATK & Kelas',
      nominal: Math.round(jml),
      keterangan: ket,
      mahasiswa_nama: '',
      status: 'aktif',
      source: 'sheets',
      updated_at: (mRec && mRec.updated_at) || new Date().toISOString()
    });
  }

  return out;
}

function findExpenseRowForTx_(sheet, meta, txId, keterangan, tanggal) {
  var expRows = sheet.getRange('P6:R100').getValues();
  var normKet = String(keterangan || '').trim().toLowerCase();
  var normTgl = normalizeDateCell_(tanggal);
  for (var i = 0; i < expRows.length; i++) {
    var rKet = String(expRows[i][1] || '').trim().toLowerCase();
    var rTgl = normalizeDateCell_(expRows[i][0]);
    if (rKet && rKet === normKet && (!normTgl || rTgl === normTgl)) {
      return i + 6;
    }
  }
  return -1;
}

function findFirstEmptyExpenseRow_(sheet) {
  var expRows = sheet.getRange('P6:R100').getValues();
  for (var i = 0; i < expRows.length; i++) {
    if (!expRows[i][0] && !expRows[i][1] && !expRows[i][2]) {
      return i + 6;
    }
  }
  return 100;
}

function findMetaByTxId_(meta, txId) {
  var last = meta.getLastRow();
  if (last <= 1) return null;
  var rows = meta.getRange(2, 1, last - 1, 6).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0] || '') === txId) {
      return { metaRow: i + 2, transaction_id: rows[i][0], target_type: rows[i][1], sheet_row: rows[i][2], updated_at: rows[i][3], sync_status: rows[i][4] };
    }
  }
  return null;
}

function findMetaBySheetRow_(meta, targetType, sheetRow) {
  var last = meta.getLastRow();
  if (last <= 1) return null;
  var rows = meta.getRange(2, 1, last - 1, 6).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][1]) === targetType && Number(rows[i][2]) === Number(sheetRow)) {
      return { metaRow: i + 2, transaction_id: rows[i][0], target_type: rows[i][1], sheet_row: rows[i][2], updated_at: rows[i][3], sync_status: rows[i][4] };
    }
  }
  return null;
}

function upsertMetaRecord_(meta, txId, targetType, sheetRow, updatedAt, syncStatus, lastError) {
  var existing = findMetaByTxId_(meta, txId);
  var vals = [[txId, targetType, sheetRow, updatedAt, syncStatus, lastError || '']];
  if (existing) {
    meta.getRange(existing.metaRow, 1, 1, 6).setValues(vals);
  } else {
    meta.appendRow(vals[0]);
  }
}

function pushBatchToAppwrite_(meta, batch) {
  var cfg = getSyncConfig_();
  if (!cfg.functionUrl || !cfg.projectId || !cfg.syncSecret) {
    for (var i = 0; i < batch.length; i++) {
      upsertMetaRecord_(meta, batch[i].transaction_id, 'sync', 0, batch[i].updated_at, 'failed', 'Script Properties belum diisi');
    }
    return { ok: false, error: 'Script Properties belum diisi lengkap' };
  }
  try {
    callAppwriteFunctionWithRetry_(cfg, {
      action: 'upsert_from_sheets',
      secret: cfg.syncSecret,
      transactions: batch
    }, 3);
    for (var j = 0; j < batch.length; j++) {
      var ex = findMetaByTxId_(meta, batch[j].transaction_id);
      upsertMetaRecord_(meta, batch[j].transaction_id, (ex && ex.target_type) || 'sync', (ex && ex.sheet_row) || 0, batch[j].updated_at, 'synced', '');
    }
    return { ok: true };
  } catch (err) {
    var msg = String(err && err.message ? err.message : err).slice(0, 200);
    for (var k = 0; k < batch.length; k++) {
      var ex2 = findMetaByTxId_(meta, batch[k].transaction_id);
      upsertMetaRecord_(meta, batch[k].transaction_id, (ex2 && ex2.target_type) || 'sync', (ex2 && ex2.sheet_row) || 0, batch[k].updated_at, 'failed', msg);
    }
    return { ok: false, error: msg };
  }
}

function callAppwriteFunctionWithRetry_(cfg, payload, maxRetries) {
  var lastErr = null;
  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return callAppwriteFunction_(cfg, payload);
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) Utilities.sleep(400 * Math.pow(2, attempt - 1));
    }
  }
  throw lastErr;
}

function callAppwriteFunction_(cfg, payload) {
  var execBody = {
    body: JSON.stringify(payload),
    async: false,
    headers: { 'x-sync-secret': cfg.syncSecret }
  };
  var resp = UrlFetchApp.fetch(cfg.functionUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Appwrite-Project': cfg.projectId },
    payload: JSON.stringify(execBody),
    muteHttpExceptions: true
  });
  var code = resp.getResponseCode();
  var json = JSON.parse(resp.getContentText() || '{}');
  if (code >= 400) {
    throw new Error('Appwrite HTTP ' + code + ': ' + (json.message || resp.getContentText()));
  }
  if (json.responseBody) {
    var inner = JSON.parse(json.responseBody);
    if (inner.ok === false) throw new Error(inner.message || 'Function error');
    return inner;
  }
  return json;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
