// main.js — Appwrite Function Hub untuk Two-Way Sync Kas <-> Google Sheets.
// Menjaga Appwrite sebagai Single Source of Truth dengan mekanisme loop guard (source),
// conflict resolution (updated_at), soft delete (status), retry, dan audit logging.
//
// Environment Variables yang harus disetel di Appwrite Console > Function Settings:
// - APPWRITE_API_KEY          : API Key Appwrite (scope: databases.read, databases.write)
// - APPWRITE_DATABASE_ID      : ID Database (default: sdta_db)
// - GAS_WEBHOOK_URL           : URL Web App Google Apps Script (https://script.google.com/macros/s/.../exec)
// - GAS_WEBHOOK_SECRET        : Secret acak bersama antara Appwrite Function & Google Apps Script
// - SYNC_WEBHOOK_SECRET       : Secret acak untuk memverifikasi request masuk dari Google Apps Script
const { timingSafeCompare, validateTransaction, isIncomingNewer, fetchWithRetry, normalizeIsoTimestamp } = require('./sync-utils');

async function appwriteReq(endpoint, projectId, apiKey, apiPath, method = 'GET', body = null) {
  return fetchWithRetry(
    `${endpoint}${apiPath}`,
    {
      method,
      headers: {
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : null
    },
    3,
    300
  );
}

async function findTxByTransactionId(endpoint, projectId, apiKey, dbId, txId) {
  const q = encodeURIComponent(JSON.stringify({ method: 'equal', attribute: 'transaction_id', values: [txId] }));
  const res = await appwriteReq(
    endpoint,
    projectId,
    apiKey,
    `/databases/${dbId}/collections/cash_transactions/documents?queries[]=${q}&queries[]=${encodeURIComponent(JSON.stringify({ method: 'limit', values: [1] }))}`,
    'GET'
  );
  if (res.data && Array.isArray(res.data.documents) && res.data.documents.length > 0) {
    return res.data.documents[0];
  }
  // Fallback: cek berdasarkan $id dokumen
  try {
    const byId = await appwriteReq(endpoint, projectId, apiKey, `/databases/${dbId}/collections/cash_transactions/documents/${encodeURIComponent(txId)}`, 'GET');
    return byId.data || null;
  } catch {
    return null;
  }
}

async function writeActivityLog(endpoint, projectId, apiKey, dbId, userId, userName, aksi, detail) {
  try {
    await appwriteReq(endpoint, projectId, apiKey, `/databases/${dbId}/collections/activity_logs/documents`, 'POST', {
      documentId: 'unique()',
      data: {
        user_id: String(userId || 'sync-system').slice(0, 60),
        user_nama: String(userName || 'Two-Way Sync').slice(0, 100),
        kategori: 'kas_sync',
        aksi: String(aksi || 'sync').slice(0, 50),
        detail: String(detail || '').slice(0, 500)
      },
      permissions: ['read("label:admin")']
    });
  } catch {
    // Logging tidak boleh menggagalkan proses sinkronisasi utama
  }
}

async function pushToGas(gasUrl, gasSecret, action, payload) {
  if (!gasUrl || !gasSecret) {
    throw new Error('GAS_WEBHOOK_URL atau GAS_WEBHOOK_SECRET belum dikonfigurasi di environment Function.');
  }
  const gasRes = await fetchWithRetry(
    gasUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: gasSecret,
        action,
        sent_at: new Date().toISOString(),
        ...payload
      })
    },
    3,
    500
  );
  if (gasRes.data && gasRes.data.ok === false) {
    throw new Error(`Google Apps Script menolak request: ${gasRes.data.message || 'Unknown GAS error'}`);
  }
  if (!gasRes.data || typeof gasRes.data.ok !== 'boolean') {
    throw new Error('Respons Google Apps Script bukan JSON valid (pastikan deployment Web App disetel Anyone & versi terbaru).');
  }
  return gasRes;
}

module.exports = async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || req.headers['x-appwrite-key'];
  const dbId = process.env.APPWRITE_DATABASE_ID || 'sdta_db';
  const gasUrl = process.env.GAS_WEBHOOK_URL || '';
  const gasSecret = process.env.GAS_WEBHOOK_SECRET || '';
  const syncSecret = process.env.SYNC_WEBHOOK_SECRET || '';

  if (!projectId || !apiKey) {
    error('Missing APPWRITE_FUNCTION_PROJECT_ID or APPWRITE_API_KEY');
    return res.json({ ok: false, message: 'Konfigurasi server Appwrite Function belum lengkap.' }, 500);
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.json({ ok: false, message: 'Body JSON tidak valid.' }, 400);
  }

  const eventHeader = String(req.headers['x-appwrite-event'] || '');
  const callerId = String(req.headers['x-appwrite-user-id'] || '');
  const incomingSecret = String(req.headers['x-sync-secret'] || body.secret || '');

  try {
    // =========================================================================
    // JALUR 1: EVENT DATABASE OTOMATIS (Website/Appwrite -> Google Sheets)
    // =========================================================================
    if (eventHeader.includes('.collections.cash_transactions.documents.')) {
      const isDeleteEvent = eventHeader.endsWith('.delete');
      const docSource = String(body.source || 'website').toLowerCase();

      // PENCEGAHAN LOOP:
      // 1. Jika perubahan berasal dari Google Sheets, jangan dorong balik ke Sheets.
      // 2. Jika event .update berasal dari function ini sendiri yang baru saja menyetel sync_status = 'synced', lewati.
      if (docSource === 'sheets' && !isDeleteEvent) {
        log(`Skip push ke Sheets untuk ${body.transaction_id || body.$id}: origin adalah "sheets".`);
        return res.json({ ok: true, skipped: true, reason: 'loop_prevention_origin_sheets' }, 200);
      }
      if (eventHeader.endsWith('.update') && String(body.sync_status || '').toLowerCase() === 'synced') {
        log(`Skip push ulang untuk ${body.transaction_id || body.$id}: sync_status sudah "synced".`);
        return res.json({ ok: true, skipped: true, reason: 'loop_prevention_already_synced' }, 200);
      }

      const txPayload = {
        transaction_id: body.transaction_id || body.$id,
        tanggal: body.tanggal,
        jenis: body.jenis,
        kategori: body.kategori,
        nominal: body.nominal,
        keterangan: body.keterangan,
        mahasiswa_nama: body.mahasiswa_nama || '',
        status: isDeleteEvent ? 'deleted' : (body.status || 'aktif'),
        source: 'website',
        updated_at: normalizeIsoTimestamp(body.updated_at || body.$updatedAt)
      };

      const check = validateTransaction(txPayload, 'website');
      if (!check.valid) {
        log(`Skip invalid DB event payload: ${check.error}`);
        return res.json({ ok: false, message: check.error }, 400);
      }

      try {
        await pushToGas(gasUrl, gasSecret, 'upsert_transaction', { transaction: check.data });
        if (!isDeleteEvent && body.$id) {
          await appwriteReq(endpoint, projectId, apiKey, `/databases/${dbId}/collections/cash_transactions/documents/${body.$id}`, 'PATCH', {
            data: { sync_status: 'synced' }
          });
        }
        log(`DB Event tersinkron ke Sheets: ${check.data.transaction_id}`);
        return res.json({ ok: true, action: 'pushed_to_sheets', transaction_id: check.data.transaction_id }, 200);
      } catch (pushErr) {
        error(`Gagal push DB Event ke Sheets: ${pushErr.message}`);
        if (!isDeleteEvent && body.$id) {
          await appwriteReq(endpoint, projectId, apiKey, `/databases/${dbId}/collections/cash_transactions/documents/${body.$id}`, 'PATCH', {
            data: { sync_status: 'failed' }
          }).catch(() => {});
        }
        return res.json({ ok: false, message: pushErr.message }, 502);
      }
    }

    // =========================================================================
    // JALUR 2: WEBHOOK MASUK DARI GOOGLE APPS SCRIPT (Sheets -> Appwrite)
    // =========================================================================
    if (!callerId && syncSecret && timingSafeCompare(incomingSecret, syncSecret)) {
      const action = String(body.action || 'upsert_from_sheets');

      if (action === 'export_for_sheets') {
        const listRes = await appwriteReq(
          endpoint,
          projectId,
          apiKey,
          `/databases/${dbId}/collections/cash_transactions/documents?queries[]=${encodeURIComponent(JSON.stringify({ method: 'limit', values: [250] }))}`,
          'GET'
        );
        const docs = (listRes.data && listRes.data.documents) || [];
        return res.json({ ok: true, count: docs.length, transactions: docs }, 200);
      }

      const items = Array.isArray(body.transactions)
        ? body.transactions
        : (body.transaction ? [body.transaction] : []);

      if (!items.length) {
        return res.json({ ok: false, message: 'Tidak ada data transaksi untuk disinkronkan.' }, 400);
      }

      const results = [];
      for (const rawItem of items) {
        const check = validateTransaction(rawItem, 'sheets');
        if (!check.valid) {
          results.push({ transaction_id: rawItem && rawItem.transaction_id, ok: false, error: check.error });
          continue;
        }
        const tx = check.data;
        tx.source = 'sheets'; // Kunci penanda sumber agar tidak loop balik ke Sheets

        const existing = await findTxByTransactionId(endpoint, projectId, apiKey, dbId, tx.transaction_id);
        if (existing) {
          const existingTs = existing.updated_at || existing.$updatedAt;
          if (!isIncomingNewer(existingTs, tx.updated_at)) {
            results.push({ transaction_id: tx.transaction_id, ok: true, action: 'skipped_conflict_appwrite_newer' });
            continue;
          }
          await appwriteReq(
            endpoint,
            projectId,
            apiKey,
            `/databases/${dbId}/collections/cash_transactions/documents/${existing.$id}`,
            'PATCH',
            {
              data: {
                transaction_id: tx.transaction_id,
                tanggal: tx.tanggal,
                jenis: tx.jenis,
                kategori: tx.kategori,
                nominal: tx.nominal,
                keterangan: tx.keterangan,
                mahasiswa_nama: tx.mahasiswa_nama,
                status: tx.status,
                source: 'sheets',
                updated_at: tx.updated_at,
                sync_status: 'synced'
              }
            }
          );
          results.push({ transaction_id: tx.transaction_id, ok: true, action: 'updated_in_appwrite' });
        } else {
          const safeDocId = /^[a-zA-Z0-9._-]{1,36}$/.test(tx.transaction_id) ? tx.transaction_id : 'unique()';
          await appwriteReq(
            endpoint,
            projectId,
            apiKey,
            `/databases/${dbId}/collections/cash_transactions/documents`,
            'POST',
            {
              documentId: safeDocId,
              data: {
                transaction_id: tx.transaction_id,
                tanggal: tx.tanggal,
                jenis: tx.jenis,
                kategori: tx.kategori,
                nominal: tx.nominal,
                keterangan: tx.keterangan,
                mahasiswa_nama: tx.mahasiswa_nama,
                status: tx.status,
                source: 'sheets',
                updated_at: tx.updated_at,
                sync_status: 'synced',
                created_by: 'google-sheets'
              },
              permissions: [
                'read("users")',
                'update("label:admin")',
                'update("label:pengurus")',
                'delete("label:admin")',
                'delete("label:pengurus")'
              ]
            }
          );
          results.push({ transaction_id: tx.transaction_id, ok: true, action: 'created_in_appwrite' });
        }
      }

      await writeActivityLog(endpoint, projectId, apiKey, dbId, 'google-sheets', 'Google Sheets Sync', 'pull_from_sheets', `Menyinkronkan ${results.length} baris dari Google Sheets.`);
      log(`Sheets -> Appwrite selesai: ${JSON.stringify(results)}`);
      return res.json({ ok: true, results }, 200);
    }

    // =========================================================================
    // JALUR 3: EKSEKUSI LANGSUNG DARI WEBSITE OLEH ADMIN / BENDAHARA
    // =========================================================================
    if (!callerId) {
      return res.json({ ok: false, message: 'Unauthorized: Sesi login atau secret webhook valid diperlukan.' }, 401);
    }

    const profRes = await appwriteReq(endpoint, projectId, apiKey, `/databases/${dbId}/collections/profiles/documents/${encodeURIComponent(callerId)}`, 'GET');
    const callerProfile = profRes.data || {};
    const isAdmin = callerProfile.role === 'admin';
    const isBendahara = callerProfile.role === 'pengurus' && String(callerProfile.jabatan || '').toLowerCase().includes('bendahara');

    if (!isAdmin && !isBendahara) {
      return res.json({ ok: false, message: 'Forbidden: Hanya Admin atau Bendahara yang dapat memicu sinkronisasi kas.' }, 403);
    }

    const action = String(body.action || 'push_transaction');

    if (action === 'push_transaction') {
      const check = validateTransaction(body.transaction, 'website');
      if (!check.valid) return res.json({ ok: false, message: check.error }, 400);
      await pushToGas(gasUrl, gasSecret, 'upsert_transaction', { transaction: check.data });
      const existing = await findTxByTransactionId(endpoint, projectId, apiKey, dbId, check.data.transaction_id);
      if (existing) {
        await appwriteReq(endpoint, projectId, apiKey, `/databases/${dbId}/collections/cash_transactions/documents/${existing.$id}`, 'PATCH', {
          data: { sync_status: 'synced' }
        });
      }
      return res.json({ ok: true, action: 'pushed_to_sheets', transaction_id: check.data.transaction_id }, 200);
    }

    if (action === 'push_all') {
      const listRes = await appwriteReq(
        endpoint,
        projectId,
        apiKey,
        `/databases/${dbId}/collections/cash_transactions/documents?queries[]=${encodeURIComponent(JSON.stringify({ method: 'limit', values: [250] }))}`,
        'GET'
      );
      const docs = (listRes.data && listRes.data.documents) || [];
      const txs = docs.map((d) => ({
        transaction_id: d.transaction_id || d.$id,
        tanggal: d.tanggal,
        jenis: d.jenis,
        kategori: d.kategori,
        nominal: d.nominal,
        keterangan: d.keterangan,
        mahasiswa_nama: d.mahasiswa_nama || '',
        status: d.status || 'aktif',
        source: 'website',
        updated_at: normalizeIsoTimestamp(d.updated_at || d.$updatedAt)
      }));

      await pushToGas(gasUrl, gasSecret, 'upsert_batch', { transactions: txs });
      for (const d of docs) {
        if (d.sync_status !== 'synced') {
          await appwriteReq(endpoint, projectId, apiKey, `/databases/${dbId}/collections/cash_transactions/documents/${d.$id}`, 'PATCH', {
            data: { sync_status: 'synced', transaction_id: d.transaction_id || d.$id }
          }).catch(() => {});
        }
      }
      await writeActivityLog(endpoint, projectId, apiKey, dbId, callerId, callerProfile.nama_lengkap, 'push_all_sheets', `Mendorong ${txs.length} transaksi ke Google Sheets.`);
      return res.json({ ok: true, action: 'pushed_all', count: txs.length }, 200);
    }

    if (action === 'pull_from_sheets') {
      const gasRes = await pushToGas(gasUrl, gasSecret, 'export_all', {});
      const sheetTxs = (gasRes.data && Array.isArray(gasRes.data.transactions)) ? gasRes.data.transactions : [];
      let updatedCount = 0;
      let createdCount = 0;
      let conflictCount = 0;

      for (const raw of sheetTxs) {
        const check = validateTransaction(raw, 'sheets');
        if (!check.valid) continue;
        const tx = check.data;
        const existing = await findTxByTransactionId(endpoint, projectId, apiKey, dbId, tx.transaction_id);
        if (existing) {
          const exTs = existing.updated_at || existing.$updatedAt;
          if (!isIncomingNewer(exTs, tx.updated_at)) {
            conflictCount++;
            continue;
          }
          await appwriteReq(endpoint, projectId, apiKey, `/databases/${dbId}/collections/cash_transactions/documents/${existing.$id}`, 'PATCH', {
            data: {
              tanggal: tx.tanggal,
              jenis: tx.jenis,
              kategori: tx.kategori,
              nominal: tx.nominal,
              keterangan: tx.keterangan,
              mahasiswa_nama: tx.mahasiswa_nama,
              status: tx.status,
              source: 'sheets',
              updated_at: tx.updated_at,
              sync_status: 'synced'
            }
          });
          updatedCount++;
        } else {
          const safeDocId = /^[a-zA-Z0-9._-]{1,36}$/.test(tx.transaction_id) ? tx.transaction_id : 'unique()';
          await appwriteReq(endpoint, projectId, apiKey, `/databases/${dbId}/collections/cash_transactions/documents`, 'POST', {
            documentId: safeDocId,
            data: { ...tx, source: 'sheets', sync_status: 'synced', created_by: 'google-sheets' },
            permissions: ['read("users")', 'update("label:admin")', 'update("label:pengurus")', 'delete("label:admin")', 'delete("label:pengurus")']
          });
          createdCount++;
        }
      }
      await writeActivityLog(endpoint, projectId, apiKey, dbId, callerId, callerProfile.nama_lengkap, 'pull_from_sheets', `Tarik dari Sheets: +${createdCount} baru, ~${updatedCount} update, ${conflictCount} dilewati (Appwrite lebih baru).`);
      return res.json({ ok: true, action: 'pulled_from_sheets', createdCount, updatedCount, conflictCount }, 200);
    }

    return res.json({ ok: false, message: `Aksi "${action}" tidak dikenali.` }, 400);
  } catch (err) {
    error(`Sync Error: ${err.message}`);
    return res.json({ ok: false, message: err.message || 'Kesalahan sinkronisasi.' }, 500);
  }
};
