#!/usr/bin/env node
// scripts/setup-appwrite.js
// Skrip otomatisasi pembuatan Database, Koleksi, Atribut, dan Storage Bucket di Appwrite Cloud.
// Menggunakan native fetch (Node.js 18+), tanpa perlu install npm module.

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (q, def = '') => new Promise((res) => {
  rl.question(`${q} ${def ? `[${def}] ` : ''}: `, (ans) => res(ans.trim() || def));
});

async function request(endpoint, apiKey, projectId, path, method = 'GET', body = null) {
  const url = `${endpoint}${path}`;
  const headers = {
    'X-Appwrite-Project': projectId,
    'X-Appwrite-Key': apiKey,
    'Content-Type': 'application/json'
  };

  const res = await fetch(url, {
    method,
    headers,
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
  console.log(' SETUP DATABASE & KOLEKSI APPWRITE: KELAS SDT A PENS');
  console.log('========================================================\n');

  const endpoint = await ask('1. Appwrite Endpoint', 'https://fra.cloud.appwrite.io/v1');
  const projectId = await ask('2. Project ID');
  const apiKey = await ask('3. API Secret Key (dari Appwrite Console > API Keys)');
  let databaseId = await ask('4. Database ID', 'sdta_db');

  if (!projectId || !apiKey) {
    console.error('\n[Error] Project ID dan API Key wajib diisi!');
    rl.close();
    process.exit(1);
  }

  try {
    console.log(`\n[1/4] Memeriksa Database "${databaseId}"...`);
    // Cek dulu apakah database dengan ID tersebut sudah ada
    let dbExists = false;
    try {
      const checkDb = await request(endpoint, apiKey, projectId, `/databases/${databaseId}`, 'GET');
      if (checkDb.status === 200) {
        dbExists = true;
        console.log(`  -> Database "${databaseId}" ditemukan, langsung digunakan.`);
      }
    } catch (e) {
      // Jika 404 berarti belum ada, kita coba buat baru
    }

    if (!dbExists) {
      try {
        const dbRes = await request(endpoint, apiKey, projectId, '/databases', 'POST', {
          databaseId,
          name: 'SDT A Class Database',
          enabled: true
        });
        if (dbRes.status === 409) {
          console.log(`  -> Database "${databaseId}" sudah ada.`);
        } else {
          console.log(`  -> Berhasil membuat database "${databaseId}".`);
        }
      } catch (err) {
        // Jika limit database tercapai (403), ambil database yang sudah ada di proyek
        if (err.message && (err.message.includes('403') || err.message.toLowerCase().includes('maximum number of databases'))) {
          console.log('  -> Limit pembuatan database baru tercapai pada plan ini.');
          console.log('  -> Mencari database yang sudah tersedia di proyek Anda...');
          const listDb = await request(endpoint, apiKey, projectId, '/databases', 'GET');
          const dbs = (listDb.data && listDb.data.databases) || [];
          if (dbs.length > 0) {
            const existingDb = dbs[0];
            databaseId = existingDb.$id;
            console.log(`  -> Otomatis beralih menggunakan database yang ada: "${existingDb.name}" (ID: ${databaseId})`);
            console.log(`     (Harap pastikan databaseId di data/appwrite-config.js juga menggunakan "${databaseId}")`);
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    // Definisi 13 Koleksi beserta Permission berbasis RBAC Appwrite Labels (admin, pengurus)
    const collections = [
      { id: 'profiles', name: 'Profil Mahasiswa', perms: ['read("any")', 'create("label:admin")', 'update("label:admin")', 'delete("label:admin")'] },
      { id: 'subjects', name: 'Mata Kuliah', perms: ['read("any")', 'create("label:admin")', 'update("label:admin")', 'delete("label:admin")'] },
      { id: 'default_schedules', name: 'Jadwal Reguler', perms: ['read("any")', 'create("label:admin")', 'update("label:admin")', 'delete("label:admin")'] },
      { id: 'schedule_overrides', name: 'Jadwal Pengganti', perms: ['read("any")', 'create("label:admin")', 'create("label:pengurus")', 'update("label:admin")', 'update("label:pengurus")', 'delete("label:admin")', 'delete("label:pengurus")'] },
      { id: 'assignments', name: 'Tugas Kuliah', perms: ['read("any")', 'create("label:admin")', 'create("label:pengurus")', 'update("label:admin")', 'update("label:pengurus")', 'delete("label:admin")', 'delete("label:pengurus")'] },
      { id: 'cash_settings', name: 'Pengaturan Kas', perms: ['read("users")', 'create("label:admin")', 'update("label:admin")'] },
      { id: 'cash_month_settings', name: 'Aturan Skip Bulan Kas', perms: ['read("users")', 'create("label:admin")', 'create("label:pengurus")', 'update("label:admin")', 'update("label:pengurus")', 'delete("label:admin")', 'delete("label:pengurus")'] },
      { id: 'cash_payments', name: 'Iuran Mahasiswa', perms: ['read("users")', 'create("label:admin")', 'create("label:pengurus")', 'update("label:admin")', 'update("label:pengurus")', 'delete("label:admin")'] },
      { id: 'cash_transactions', name: 'Mutasi Transaksi Kas', perms: ['read("users")', 'create("label:admin")', 'create("label:pengurus")', 'update("label:admin")', 'update("label:pengurus")', 'delete("label:admin")', 'delete("label:pengurus")'] },
      { id: 'summaries', name: 'Rangkuman Materi', perms: ['read("any")', 'create("users")', 'update("users")', 'delete("label:admin")'] },
      { id: 'summary_revisions', name: 'Riwayat Revisi Rangkuman', perms: ['read("users")', 'create("users")'] },
      { id: 'links', name: 'Tautan Kelas', perms: ['read("any")', 'create("label:admin")', 'create("label:pengurus")', 'update("label:admin")', 'update("label:pengurus")', 'delete("label:admin")', 'delete("label:pengurus")'] },
      { id: 'activity_logs', name: 'Log Aktivitas Sistem', perms: ['read("label:admin")', 'create("users")'] }
    ];

    console.log(`\n[2/4] Membuat & Menyelaraskan ${collections.length} Koleksi...`);
    for (const c of collections) {
      process.stdout.write(`  - Koleksi: ${c.id.padEnd(22)}`);
      const colRes = await request(endpoint, apiKey, projectId, `/databases/${databaseId}/collections`, 'POST', {
        collectionId: c.id,
        name: c.name,
        permissions: c.perms,
        documentSecurity: true,
        enabled: true
      });
      if (colRes.status === 409) {
        try {
          await request(endpoint, apiKey, projectId, `/databases/${databaseId}/collections/${c.id}`, 'PUT', {
            name: c.name,
            permissions: c.perms,
            documentSecurity: true,
            enabled: true
          });
          console.log('[Diselaraskan]');
        } catch {
          console.log('[Sudah Ada]');
        }
      } else {
        console.log('[Sukses]');
      }
    }

    // Definisi Atribut Inti Koleksi
    console.log(`\n[3/4] Mendaftarkan Atribut Utama Koleksi...`);

    const attributes = [
      // profiles
      { col: 'profiles', type: 'string', key: 'nim', size: 30, req: true },
      { col: 'profiles', type: 'string', key: 'nama_lengkap', size: 100, req: true },
      { col: 'profiles', type: 'string', key: 'role', size: 20, req: false, def: 'mahasiswa' },
      { col: 'profiles', type: 'string', key: 'jabatan', size: 50, req: false },
      { col: 'profiles', type: 'string', key: 'bio', size: 500, req: false },
      { col: 'profiles', type: 'string', key: 'foto_id', size: 100, req: false },
      { col: 'profiles', type: 'string', key: 'minat', size: 50, req: false, array: true },
      { col: 'profiles', type: 'string', key: 'matkul_pj', size: 50, req: false, array: true },
      { col: 'profiles', type: 'string', key: 'github_url', size: 255, req: false },
      { col: 'profiles', type: 'string', key: 'linkedin_url', size: 255, req: false },
      { col: 'profiles', type: 'string', key: 'instagram_url', size: 255, req: false },
      { col: 'profiles', type: 'string', key: 'website_url', size: 255, req: false },

      // assignments
      { col: 'assignments', type: 'string', key: 'judul', size: 150, req: true },
      { col: 'assignments', type: 'string', key: 'subject_id', size: 50, req: true },
      { col: 'assignments', type: 'string', key: 'deskripsi', size: 2000, req: false },
      { col: 'assignments', type: 'string', key: 'deadline', size: 50, req: true },
      { col: 'assignments', type: 'string', key: 'status', size: 20, req: false, def: 'aktif' },
      { col: 'assignments', type: 'string', key: 'link_pengumpulan', size: 500, req: false },

      // cash_transactions
      { col: 'cash_transactions', type: 'string', key: 'transaction_id', size: 64, req: false },
      { col: 'cash_transactions', type: 'string', key: 'tanggal', size: 30, req: true },
      { col: 'cash_transactions', type: 'string', key: 'jenis', size: 20, req: true },
      { col: 'cash_transactions', type: 'string', key: 'kategori', size: 50, req: true },
      { col: 'cash_transactions', type: 'integer', key: 'nominal', req: true, min: 0 },
      { col: 'cash_transactions', type: 'string', key: 'keterangan', size: 255, req: true },
      { col: 'cash_transactions', type: 'string', key: 'mahasiswa_nama', size: 100, req: false },
      { col: 'cash_transactions', type: 'string', key: 'status', size: 20, req: false, def: 'aktif' },
      { col: 'cash_transactions', type: 'string', key: 'source', size: 20, req: false, def: 'website' },
      { col: 'cash_transactions', type: 'string', key: 'updated_at', size: 40, req: false },
      { col: 'cash_transactions', type: 'string', key: 'sync_status', size: 20, req: false, def: 'pending' },
      { col: 'cash_transactions', type: 'string', key: 'created_by', size: 60, req: false },

      // cash_payments
      { col: 'cash_payments', type: 'string', key: 'user_id', size: 50, req: true },
      { col: 'cash_payments', type: 'string', key: 'periode_bulan', size: 20, req: true },
      { col: 'cash_payments', type: 'integer', key: 'nominal_dibayar', req: true, min: 0 },
      { col: 'cash_payments', type: 'string', key: 'status', size: 20, req: false, def: 'lunas' },

      // summaries
      { col: 'summaries', type: 'string', key: 'subject_id', size: 50, req: true },
      { col: 'summaries', type: 'integer', key: 'minggu_ke', req: true },
      { col: 'summaries', type: 'string', key: 'judul', size: 150, req: true },
      { col: 'summaries', type: 'string', key: 'isi', size: 50000, req: false },
      { col: 'summaries', type: 'string', key: 'penulis_nama', size: 100, req: false },
      { col: 'summaries', type: 'string', key: 'penulis_id', size: 50, req: false },

      // links
      { col: 'links', type: 'string', key: 'judul', size: 100, req: true },
      { col: 'links', type: 'string', key: 'url', size: 500, req: true },
      { col: 'links', type: 'string', key: 'kategori', size: 50, req: false, def: 'Akademik' },
      { col: 'links', type: 'string', key: 'keterangan', size: 255, req: false },

      // schedule_overrides
      { col: 'schedule_overrides', type: 'string', key: 'subject_id', size: 120, req: true },
      { col: 'schedule_overrides', type: 'string', key: 'tanggal_awal', size: 30, req: false },
      { col: 'schedule_overrides', type: 'string', key: 'tanggal_pengganti', size: 30, req: false },
      { col: 'schedule_overrides', type: 'string', key: 'mulai_pengganti', size: 15, req: false },
      { col: 'schedule_overrides', type: 'string', key: 'selesai_pengganti', size: 15, req: false },
      { col: 'schedule_overrides', type: 'string', key: 'ruang_pengganti', size: 150, req: false },
      { col: 'schedule_overrides', type: 'string', key: 'tipe_perubahan', size: 30, req: false, def: 'pindah_jadwal' },
      { col: 'schedule_overrides', type: 'string', key: 'keterangan', size: 500, req: false },
      { col: 'schedule_overrides', type: 'string', key: 'status', size: 20, req: false, def: 'aktif' },
      { col: 'schedule_overrides', type: 'string', key: 'created_by', size: 50, req: false },

      // summary_revisions
      { col: 'summary_revisions', type: 'string', key: 'summary_id', size: 60, req: true },
      { col: 'summary_revisions', type: 'string', key: 'isi_snapshot', size: 50000, req: false },
      { col: 'summary_revisions', type: 'string', key: 'edited_by', size: 60, req: false },
      { col: 'summary_revisions', type: 'string', key: 'edited_by_nama', size: 100, req: false },
      { col: 'summary_revisions', type: 'string', key: 'catatan_perubahan', size: 255, req: false },

      // cash_month_settings
      { col: 'cash_month_settings', type: 'string', key: 'periode_bulan', size: 20, req: true },
      { col: 'cash_month_settings', type: 'boolean', key: 'is_skipped', req: false, def: true },
      { col: 'cash_month_settings', type: 'string', key: 'alasan', size: 255, req: false },

      // activity_logs
      { col: 'activity_logs', type: 'string', key: 'user_id', size: 60, req: false },
      { col: 'activity_logs', type: 'string', key: 'user_nama', size: 100, req: false },
      { col: 'activity_logs', type: 'string', key: 'kategori', size: 30, req: false },
      { col: 'activity_logs', type: 'string', key: 'aksi', size: 50, req: false },
      { col: 'activity_logs', type: 'string', key: 'detail', size: 500, req: false }
    ];

    for (const attr of attributes) {
      const path = `/databases/${databaseId}/collections/${attr.col}/attributes/${attr.type}`;
      const isRequired = attr.def !== undefined ? false : Boolean(attr.req);
      const payload = {
        key: attr.key,
        required: isRequired,
        array: Boolean(attr.array)
      };
      if (attr.type === 'string') {
        payload.size = attr.size || 255;
        if (attr.def !== undefined) payload.default = attr.def;
      } else if (attr.type === 'integer') {
        if (attr.min !== undefined) payload.min = attr.min;
      } else if (attr.type === 'boolean') {
        if (attr.def !== undefined) payload.default = Boolean(attr.def);
      }

      try {
        await request(endpoint, apiKey, projectId, path, 'POST', payload);
        console.log(`  + [${attr.col}] Atribut "${attr.key}" dibuat.`);
      } catch (e) {
        if (e.message && (e.message.includes('409') || e.message.toLowerCase().includes('already exists'))) {
          // Atribut sudah ada
        } else {
          console.log(`  ! [${attr.col}] Gagal atribut "${attr.key}": ${e.message}`);
        }
      }
    }

    // Tunggu beberapa detik agar Appwrite selesai memproses status atribut menjadi 'available'
    console.log('\n  -> Menunggu sinkronisasi atribut Appwrite...');
    await new Promise((r) => setTimeout(r, 4000));

    // Buat indeks unik untuk transaction_id pada cash_transactions agar lookup upsert cepat
    try {
      await request(endpoint, apiKey, projectId, `/databases/${databaseId}/collections/cash_transactions/indexes`, 'POST', {
        key: 'idx_transaction_id',
        type: 'unique',
        attributes: ['transaction_id']
      });
      console.log('  + [cash_transactions] Indeks unik "idx_transaction_id" dibuat.');
    } catch (idxErr) {
      if (!String(idxErr.message || '').includes('409') && !String(idxErr.message || '').toLowerCase().includes('already exists')) {
        console.log(`  ! [cash_transactions] Info indeks transaction_id: ${idxErr.message}`);
      }
    }

    // Storage Bucket: Gunakan 1 bucket terpadu untuk semua file (foto profil, lampiran, bukti kas)
    // agar kompatibel dengan limit Free Plan Appwrite (1 bucket per project).
    console.log(`\n[4/4] Memeriksa Storage Bucket...`);
    const singleBucketId = 'sdta_storage';
    let bucketExists = false;

    // Cek apakah bucket sdta_storage sudah ada
    try {
      const checkB = await request(endpoint, apiKey, projectId, `/storage/buckets/${singleBucketId}`, 'GET');
      if (checkB.status === 200) {
        bucketExists = true;
        console.log(`  -> Bucket "${singleBucketId}" ditemukan, langsung digunakan.`);
      }
    } catch (e) {}

    if (!bucketExists) {
      try {
        const bRes = await request(endpoint, apiKey, projectId, '/storage/buckets', 'POST', {
          bucketId: singleBucketId,
          name: 'Penyimpanan Berkas SDT A',
          permissions: ['read("any")', 'create("users")', 'update("users")', 'delete("users")'],
          maximumFileSize: 10000000, // 10MB
          allowedFileExtensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
          enabled: true
        });
        if (bRes.status === 409) {
          console.log(`  -> Bucket "${singleBucketId}" sudah ada.`);
        } else {
          console.log(`  -> Berhasil membuat bucket terpadu "${singleBucketId}".`);
        }
      } catch (err) {
        // Jika limit bucket tercapai (403), gunakan bucket yang sudah ada di proyek
        if (err.message && (err.message.includes('403') || err.message.toLowerCase().includes('maximum number of buckets') || err.message.toLowerCase().includes('limit'))) {
          console.log('  -> Limit pembuatan bucket baru tercapai pada plan ini.');
          console.log('  -> Mengambil bucket yang sudah tersedia di proyek Anda...');
          const listB = await request(endpoint, apiKey, projectId, '/storage/buckets', 'GET');
          const buckets = (listB.data && listB.data.buckets) || [];
          if (buckets.length > 0) {
            const existingB = buckets[0];
            console.log(`  -> Otomatis menggunakan bucket yang ada: "${existingB.name}" (ID: ${existingB.$id})`);
          } else {
            console.log('  -> Lewati pembuatan bucket.');
          }
        } else {
          console.log(`  -> Info bucket: ${err.message}`);
        }
      }
    }

    console.log('\n========================================================');
    console.log(' SETUP APPWRITE SELESAI DENGAN SUKSES! ');
    console.log('========================================================');
    console.log(`\nLangkah selanjutnya:\n1. Masukkan Project ID "${projectId}" ke berkas "data/appwrite-config.js".`);
    console.log('2. Jalankan "node scripts/create-users.js" untuk mendaftarkan 24 mahasiswa.');

  } catch (err) {
    console.error('\n[Error Fatal]:', err.message);
  } finally {
    rl.close();
  }
}

main();
