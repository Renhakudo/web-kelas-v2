#!/usr/bin/env node
// scripts/test-kas-sync.js
// Pengujian unit dan integrasi modul Two-Way Sync Kas <-> Google Sheets (tanpa kredensial asli).
const assert = require('assert');
const { validateTransaction, isIncomingNewer, timingSafeCompare } = require('../functions/kas-sync-sheets/src/sync-utils');
const handler = require('../functions/kas-sync-sheets/src/main');

async function runTests() {
  console.log('=== PENGUJIAN TWO-WAY SYNC KAS <-> GOOGLE SHEETS ===\n');

  // 1. Validasi payload & sanitasi
  const good = validateTransaction({
    transaction_id: 'trx-test-01',
    tanggal: '2026-11-26',
    jenis: 'MASUK',
    kategori: 'Iuran Kas',
    nominal: 15000,
    keterangan: 'Iuran Nov',
    mahasiswa_nama: 'Davin Zoe Akhmad',
    status: 'aktif',
    updated_at: '2026-11-26T04:00:00.000Z'
  });
  assert.strictEqual(good.valid, true);
  assert.strictEqual(good.data.jenis, 'masuk');
  assert.strictEqual(good.data.nominal, 15000);

  const badNominal = validateTransaction({
    transaction_id: 'trx-bad',
    tanggal: '2026-11-26',
    jenis: 'masuk',
    nominal: -500,
    keterangan: 'Negatif'
  });
  assert.strictEqual(badNominal.valid, false);
  console.log('✓ Test 1: Validasi & sanitasi transaksi lulus.');

  // 2. Timestamp conflict check & timingSafeCompare
  assert.strictEqual(isIncomingNewer('2026-11-26T04:00:00.000Z', '2026-11-26T05:00:00.000Z'), true);
  assert.strictEqual(isIncomingNewer('2026-11-26T05:00:00.000Z', '2026-11-26T04:00:00.000Z'), false);
  assert.strictEqual(timingSafeCompare('secret-abc', 'secret-abc'), true);
  assert.strictEqual(timingSafeCompare('secret-abc', 'secret-xyz'), false);
  console.log('✓ Test 2: Resolusi konflik timestamp & timingSafeCompare lulus.');

  // Mock Appwrite DB + GAS Webhook Server in-memory
  const dbDocs = {};
  const logs = [];
  let gasCalls = [];
  let gasFailOnce = false;

  const origFetch = global.fetch;
  global.fetch = async (url, opts = {}) => {
    const method = (opts.method || 'GET').toUpperCase();
    const body = opts.body ? JSON.parse(opts.body) : null;

    if (url.startsWith('https://mock-gas.local/exec')) {
      gasCalls.push(body);
      if (gasFailOnce) {
        gasFailOnce = false;
        return new Response(JSON.stringify({ ok: false, message: 'Temporary 503' }), { status: 503 });
      }
      return new Response(JSON.stringify({ ok: true, action: body.action }), { status: 200 });
    }

    if (url.includes('/collections/profiles/documents/usr-admin')) {
      return new Response(JSON.stringify({ $id: 'usr-admin', role: 'admin', nama_lengkap: 'Aditya' }), { status: 200 });
    }
    if (url.includes('/collections/profiles/documents/usr-mhs')) {
      return new Response(JSON.stringify({ $id: 'usr-mhs', role: 'mahasiswa', nama_lengkap: 'Mahasiswa' }), { status: 200 });
    }
    if (url.includes('/collections/activity_logs/documents') && method === 'POST') {
      logs.push(body.data);
      return new Response(JSON.stringify({ $id: 'log-1', ...body.data }), { status: 201 });
    }
    if (url.includes('/collections/cash_transactions/documents')) {
      if (method === 'GET' && url.includes('queries')) {
        const match = decodeURIComponent(url).match(/"values":\["([^"]+)"\]/);
        const txId = match ? match[1] : null;
        const docs = txId
          ? Object.values(dbDocs).filter((d) => d.transaction_id === txId)
          : Object.values(dbDocs);
        return new Response(JSON.stringify({ documents: docs }), { status: 200 });
      }
      const docIdMatch = url.match(/\/documents\/([^/?]+)$/);
      const docId = docIdMatch ? docIdMatch[1] : null;
      if (method === 'GET' && docId) {
        return dbDocs[docId]
          ? new Response(JSON.stringify(dbDocs[docId]), { status: 200 })
          : new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
      }
      if (method === 'POST') {
        const id = body.documentId === 'unique()' ? 'doc-' + Date.now() : body.documentId;
        dbDocs[id] = { $id: id, ...body.data };
        return new Response(JSON.stringify(dbDocs[id]), { status: 201 });
      }
      if (method === 'PATCH' && docId) {
        dbDocs[docId] = { ...(dbDocs[docId] || {}), ...body.data };
        return new Response(JSON.stringify(dbDocs[docId]), { status: 200 });
      }
    }
    return new Response(JSON.stringify({ message: 'Unhandled mock route: ' + url }), { status: 404 });
  };

  process.env.APPWRITE_FUNCTION_API_ENDPOINT = 'https://mock-appwrite.local/v1';
  process.env.APPWRITE_FUNCTION_PROJECT_ID = 'proj-test';
  process.env.APPWRITE_API_KEY = 'secret-key-test';
  process.env.APPWRITE_DATABASE_ID = 'sdta_db';
  process.env.GAS_WEBHOOK_URL = 'https://mock-gas.local/exec';
  process.env.GAS_WEBHOOK_SECRET = 'gas-secret-123';
  process.env.SYNC_WEBHOOK_SECRET = 'sync-secret-456';

  const makeRes = () => ({
    statusCode: 200,
    payload: null,
    json(data, code = 200) {
      this.payload = data;
      this.statusCode = code;
      return this;
    }
  });

  try {
    // 3. DB Event dari Website -> Google Sheets (dengan retry otomatis saat 503)
    dbDocs['trx-web-01'] = {
      $id: 'trx-web-01',
      transaction_id: 'trx-web-01',
      tanggal: '2026-11-26',
      jenis: 'masuk',
      kategori: 'Iuran Kas',
      nominal: 15000,
      keterangan: 'Iuran dari Website',
      status: 'aktif',
      source: 'website',
      updated_at: '2026-11-26T04:00:00.000Z',
      sync_status: 'pending'
    };
    gasFailOnce = true;
    const r3 = makeRes();
    await handler({
      req: {
        headers: { 'x-appwrite-event': 'databases.sdta_db.collections.cash_transactions.documents.trx-web-01.create' },
        body: dbDocs['trx-web-01']
      },
      res: r3,
      log: () => {},
      error: () => {}
    });
    assert.strictEqual(r3.statusCode, 200);
    assert.strictEqual(r3.payload.action, 'pushed_to_sheets');
    assert.strictEqual(gasCalls.length, 2); // 1 fail 503 + 1 retry sukses
    assert.strictEqual(dbDocs['trx-web-01'].sync_status, 'synced');
    console.log('✓ Test 3: DB Event Website -> Sheets + retry 503 + update sync_status lulus.');

    // 4. Pencegahan Infinite Loop (origin: 'sheets' & self-update sync_status='synced' dilewati)
    gasCalls = [];
    const r4 = makeRes();
    await handler({
      req: {
        headers: { 'x-appwrite-event': 'databases.sdta_db.collections.cash_transactions.documents.trx-gs-01.update' },
        body: { ...dbDocs['trx-web-01'], transaction_id: 'trx-gs-01', source: 'sheets', sync_status: 'pending' }
      },
      res: r4,
      log: () => {},
      error: () => {}
    });
    assert.strictEqual(r4.payload.skipped, true);
    assert.strictEqual(gasCalls.length, 0);

    const r4b = makeRes();
    await handler({
      req: {
        headers: { 'x-appwrite-event': 'databases.sdta_db.collections.cash_transactions.documents.trx-web-01.update' },
        body: { ...dbDocs['trx-web-01'], sync_status: 'synced' }
      },
      res: r4b,
      log: () => {},
      error: () => {}
    });
    assert.strictEqual(r4b.payload.skipped, true);
    assert.strictEqual(gasCalls.length, 0);
    console.log('✓ Test 4: Loop prevention (origin "sheets" & self-update "synced" dilewati) lulus.');

    // 5. Webhook Sheets -> Appwrite (Create + Upsert + Conflict Prevention)
    const r5a = makeRes();
    await handler({
      req: {
        headers: { 'x-sync-secret': 'sync-secret-456' },
        body: {
          action: 'upsert_from_sheets',
          transaction: {
            transaction_id: 'trx-gs-99',
            tanggal: '2026-11-26',
            jenis: 'keluar',
            kategori: 'ATK & Kelas',
            nominal: 12000,
            keterangan: 'Beli spidol via Sheets',
            status: 'aktif',
            updated_at: '2026-11-26T06:00:00.000Z'
          }
        }
      },
      res: r5a,
      log: () => {},
      error: () => {}
    });
    assert.strictEqual(r5a.payload.results[0].action, 'created_in_appwrite');
    assert.strictEqual(dbDocs['trx-gs-99'].source, 'sheets');

    // Conflict: incoming older than existing (05:00 < 06:00)
    const r5b = makeRes();
    await handler({
      req: {
        headers: { 'x-sync-secret': 'sync-secret-456' },
        body: {
          action: 'upsert_from_sheets',
          transaction: {
            transaction_id: 'trx-gs-99',
            tanggal: '2026-11-26',
            jenis: 'keluar',
            kategori: 'ATK & Kelas',
            nominal: 99999,
            keterangan: 'Edit lama',
            status: 'aktif',
            updated_at: '2026-11-26T05:00:00.000Z'
          }
        }
      },
      res: r5b,
      log: () => {},
      error: () => {}
    });
    assert.strictEqual(r5b.payload.results[0].action, 'skipped_conflict_appwrite_newer');
    assert.strictEqual(dbDocs['trx-gs-99'].nominal, 12000);

    // Soft delete dari Sheets -> Appwrite
    const r5c = makeRes();
    await handler({
      req: {
        headers: { 'x-sync-secret': 'sync-secret-456' },
        body: {
          action: 'upsert_from_sheets',
          transaction: {
            transaction_id: 'trx-gs-99',
            tanggal: '2026-11-26',
            jenis: 'keluar',
            kategori: 'ATK & Kelas',
            nominal: 12000,
            keterangan: 'Beli spidol via Sheets',
            status: 'deleted',
            updated_at: '2026-11-26T07:00:00.000Z'
          }
        }
      },
      res: r5c,
      log: () => {},
      error: () => {}
    });
    assert.strictEqual(r5c.payload.results[0].action, 'updated_in_appwrite');
    assert.strictEqual(dbDocs['trx-gs-99'].status, 'deleted');
    console.log('✓ Test 5: Sheets -> Appwrite Create, Upsert, Conflict Guard, dan Soft Delete lulus.');

    // 6. Penolakan autentikasi/autorisasi (401 & 403)
    const r6a = makeRes();
    await handler({
      req: { headers: { 'x-sync-secret': 'wrong-secret' }, body: { action: 'upsert_from_sheets' } },
      res: r6a,
      log: () => {},
      error: () => {}
    });
    assert.strictEqual(r6a.statusCode, 401);

    const r6b = makeRes();
    await handler({
      req: { headers: { 'x-appwrite-user-id': 'usr-mhs' }, body: { action: 'push_all' } },
      res: r6b,
      log: () => {},
      error: () => {}
    });
    assert.strictEqual(r6b.statusCode, 403);
    console.log('✓ Test 6: Penolakan secret salah (401) & non-bendahara (403) lulus.');

    console.log('\nSEMUA PENGUJIAN UNIT & INTEGRASI MOCK TWO-WAY SYNC LULUS!');
  } finally {
    global.fetch = origFetch;
  }
}

runTests().catch((err) => {
  console.error('\n[TEST GAGAL]:', err);
  process.exit(1);
});
