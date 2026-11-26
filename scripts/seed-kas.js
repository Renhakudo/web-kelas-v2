#!/usr/bin/env node
// scripts/seed-kas.js
// Mengunggah data kas real dari data/kas.js ke koleksi Appwrite:
// cash_transactions dan cash_payments.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q, def = '') => new Promise((res) => {
  rl.question(`${q} ${def ? `[${def}] ` : ''}: `, (ans) => res(ans.trim() || def));
});

async function request(endpoint, apiKey, projectId, apiPath, method = 'GET', body = null) {
  const res = await fetch(`${endpoint}${apiPath}`, {
    method,
    headers: {
      'X-Appwrite-Project': projectId,
      'X-Appwrite-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  if (!res.ok && res.status !== 409) {
    throw new Error(`[${res.status}] ${json.message || text}`);
  }
  return { status: res.status, data: json };
}

async function main() {
  console.log('========================================================');
  console.log(' SEED DATA KAS REAL KE APPWRITE (kas SDT A.xlsx)');
  console.log('========================================================\n');

  const endpoint = await ask('1. Appwrite Endpoint', 'https://fra.cloud.appwrite.io/v1');
  const projectId = await ask('2. Project ID', '6ae2a1eb001089e29cbd');
  const apiKey = await ask('3. API Secret Key (Scope: documents.write)');
  const databaseId = await ask('4. Database ID', 'sdta_db');
  const cleanOld = (await ask('5. Hapus transaksi lama di Appwrite yang tidak ada di data/kas.js? (y/N)', 'N')).toLowerCase() === 'y';

  if (!projectId || !apiKey) {
    console.error('\n[Error] Project ID dan API Key wajib diisi!');
    rl.close();
    process.exit(1);
  }

  const sandbox = { window: { DATA: {} } };
  const kasCode = fs.readFileSync(path.join(__dirname, '..', 'data', 'kas.js'), 'utf8');
  vm.runInNewContext(kasCode, sandbox);
  const kas = sandbox.window.DATA.kas;

  try {
    if (cleanOld) {
      console.log('\n[0/2] Membersihkan dokumen lama di cash_transactions...');
      const keepIds = new Set((kas.transaksi || []).map((t) => t.transaction_id || t.id));
      const listRes = await request(
        endpoint,
        apiKey,
        projectId,
        `/databases/${databaseId}/collections/cash_transactions/documents?queries[]=${encodeURIComponent(JSON.stringify({ method: 'limit', values: [250] }))}`,
        'GET'
      );
      const existingDocs = (listRes.data && listRes.data.documents) || [];
      let deletedCount = 0;
      for (const doc of existingDocs) {
        if (!keepIds.has(doc.$id)) {
          await request(endpoint, apiKey, projectId, `/databases/${databaseId}/collections/cash_transactions/documents/${doc.$id}`, 'DELETE');
          console.log(`  - Dihapus dokumen lama: ${doc.$id} (${doc.keterangan || '-'})`);
          deletedCount++;
        }
      }
      console.log(`  ✓ Selesai membersihkan ${deletedCount} dokumen lama.`);
    }

    console.log('\n[1/2] Mengunggah mutasi transaksi kas...');
    for (const t of kas.transaksi || []) {
      const txId = t.transaction_id || t.id;
      const payload = {
        transaction_id: txId,
        tanggal: t.tanggal,
        jenis: t.jenis,
        kategori: t.kategori,
        nominal: Number(t.nominal),
        keterangan: t.keterangan,
        mahasiswa_nama: t.mahasiswa_nama || '',
        status: t.status || 'aktif',
        source: t.source || 'website',
        updated_at: t.updated_at || new Date().toISOString(),
        sync_status: 'pending'
      };
      const perms = ['read("users")', 'update("label:admin")', 'update("label:pengurus")', 'delete("label:admin")', 'delete("label:pengurus")'];
      const res = await request(endpoint, apiKey, projectId, `/databases/${databaseId}/collections/cash_transactions/documents`, 'POST', {
        documentId: txId,
        data: payload,
        permissions: perms
      });
      if (res.status === 409) {
        await request(endpoint, apiKey, projectId, `/databases/${databaseId}/collections/cash_transactions/documents/${txId}`, 'PATCH', {
          data: payload,
          permissions: perms
        });
      }
      console.log(`  ✓ ${txId}: ${t.keterangan} (Rp ${t.nominal})`);
    }

    console.log('\n[2/2] Mengunggah status iuran 24 mahasiswa...');
    const entries = Object.entries(kas.iuranMahasiswa || {});
    for (let i = 0; i < entries.length; i++) {
      const [nama, bulan] = entries[i];
      const docId = `pay-${String(i + 1).padStart(2, '0')}`;
      const nominalDibayar = Number(bulan) * (kas.nominalBulanan || 15000);
      const status = bulan >= (kas.targetBulan || 3) ? 'lunas' : 'belum_bayar';
      const payload = {
        user_id: nama,
        periode_bulan: 'TOTAL',
        nominal_dibayar: nominalDibayar,
        status
      };
      const perms = ['read("users")', 'update("label:admin")', 'update("label:pengurus")', 'delete("label:admin")'];
      const res = await request(endpoint, apiKey, projectId, `/databases/${databaseId}/collections/cash_payments/documents`, 'POST', {
        documentId: docId,
        data: payload,
        permissions: perms
      });
      if (res.status === 409) {
        await request(endpoint, apiKey, projectId, `/databases/${databaseId}/collections/cash_payments/documents/${docId}`, 'PATCH', {
          data: payload,
          permissions: perms
        });
      }
      console.log(`  ✓ ${nama}: ${bulan} bulan (Rp ${nominalDibayar})`);
    }

    console.log('\n✓ Data kas real selesai disinkronkan ke Appwrite Cloud!');
  } catch (err) {
    console.error('\n[Error]:', err.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
