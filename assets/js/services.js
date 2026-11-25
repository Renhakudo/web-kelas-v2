// services.js
// Layanan integrasi database Appwrite Cloud, Storage, dan sinkronisasi data kelas SDT A.
// Menyediakan graceful fallback ke data lokal bila offline atau belum terhubung.
(function () {
  const SDT = window.SDT || {};
  const appwrite = SDT.appwrite || {};
  const isConfigured = appwrite.isConfigured;
  const config = appwrite.config || {};
  const dbId = config.databaseId || 'sdta_db';
  const cols = config.collections || {};
  const bucketId = (config.buckets && config.buckets.default) || 'sdta_storage';

  // Base list of 24 students with official NRP mapping
  const BASE_NIM = 3326600001;
  function getLocalFallbackProfiles() {
    const rawList = (window.DATA && window.DATA.anggota && window.DATA.anggota.mahasiswa) || [];
    const pengurus = (window.DATA && window.DATA.anggota && window.DATA.anggota.pengurus) || [];
    const ADMIN_NAMES = ['Mohammad Aditya Arkoun', "Muhammad Hilmi Mu'Afa"];

    return rawList.map((nama, idx) => {
      const nim = String(BASE_NIM + idx);
      const pengurusMatch = pengurus.find((p) => p.nama === nama);
      let role = 'mahasiswa';
      let jabatan = 'Mahasiswa';

      if (pengurusMatch) {
        role = 'pengurus';
        jabatan = pengurusMatch.jabatan;
      }
      if (ADMIN_NAMES.includes(nama)) {
        role = 'admin';
      }

      return {
        $id: `usr-${nim}`,
        nim,
        nama_lengkap: nama,
        role,
        jabatan,
        bio: `${jabatan} - Kelas Sains Data Terapan A PENS.`,
        minat: ['Data Science', 'Machine Learning'],
        matkul_pj: nama.includes('Hilmi') ? ['Agama'] : [],
        github_url: '',
        linkedin_url: '',
        instagram_url: '',
        website_url: '',
        foto_id: ''
      };
    });
  }

  // Cache memory sederhana
  const cache = {
    profiles: null,
    overrides: null,
    assignments: null,
    links: null,
    summaries: null
  };

  // ==========================================
  // 1. PROFIL MAHASISWA & ANGGOTA
  // ==========================================
  async function listProfiles(forceRefresh = false) {
    if (cache.profiles && !forceRefresh) return cache.profiles;

    if (isConfigured && appwrite.databases) {
      try {
        const queries = [
          window.Appwrite.Query.limit(100),
          window.Appwrite.Query.orderAsc('nim')
        ];
        const res = await appwrite.databases.listDocuments(dbId, cols.profiles || 'profiles', queries);
        if (res.documents && res.documents.length > 0) {
          cache.profiles = res.documents;
          return res.documents;
        }
      } catch (err) {
        console.warn('Gagal memuat profil dari Appwrite, menggunakan data lokal:', err);
      }
    }

    cache.profiles = getLocalFallbackProfiles();
    return cache.profiles;
  }

  async function getProfileByNimOrId(identifier) {
    const list = await listProfiles();
    return list.find((p) => p.$id === identifier || p.nim === identifier || p.nama_lengkap.toLowerCase() === identifier.toLowerCase());
  }

  async function updateProfile(docId, updateData) {
    if (!isConfigured || !appwrite.databases) {
      // Dev mode local update
      const list = await listProfiles();
      const p = list.find((x) => x.$id === docId);
      if (p) Object.assign(p, updateData);
      return p || updateData;
    }

    try {
      const res = await appwrite.databases.updateDocument(
        dbId,
        cols.profiles || 'profiles',
        docId,
        updateData
      );
      // Update cache
      if (cache.profiles) {
        const idx = cache.profiles.findIndex((p) => p.$id === docId);
        if (idx >= 0) cache.profiles[idx] = res;
      }
      return res;
    } catch (err) {
      throw new Error(appwrite.terjemahkanError(err));
    }
  }

  // Upload foto ke Appwrite Storage
  async function uploadAvatar(file) {
    if (!isConfigured || !appwrite.storage) {
      throw new Error('Penyimpanan Appwrite Storage belum dikonfigurasi.');
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('Ukuran foto maksimal 2 MB.');
    }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      throw new Error('Format foto harus berupa JPG, PNG, atau WebP.');
    }

    try {
      const fileId = window.Appwrite.ID.unique();
      const res = await appwrite.storage.createFile(
        bucketId,
        fileId,
        file,
        [
          window.Appwrite.Permission.read(window.Appwrite.Role.any()),
          window.Appwrite.Permission.write(window.Appwrite.Role.users()),
          window.Appwrite.Permission.delete(window.Appwrite.Role.users())
        ]
      );
      return res;
    } catch (err) {
      throw new Error(appwrite.terjemahkanError(err));
    }
  }

  function getAvatarViewUrl(fotoId) {
    if (!fotoId || !isConfigured || !appwrite.storage) return null;
    try {
      return appwrite.storage.getFileView(bucketId, fotoId).href;
    } catch {
      return null;
    }
  }

  // ==========================================
  // 2. JADWAL PENGGANTI (SCHEDULE OVERRIDES)
  // ==========================================
  async function listScheduleOverrides(forceRefresh = false) {
    if (cache.overrides && !forceRefresh) return cache.overrides;

    if (isConfigured && appwrite.databases) {
      try {
        const res = await appwrite.databases.listDocuments(
          dbId,
          cols.schedule_overrides || 'schedule_overrides',
          [window.Appwrite.Query.limit(50), window.Appwrite.Query.orderDesc('$createdAt')]
        );
        cache.overrides = res.documents || [];
        return cache.overrides;
      } catch (err) {
        console.warn('Gagal memuat reschedule dari Appwrite:', err);
      }
    }
    cache.overrides = [];
    return cache.overrides;
  }

  async function createScheduleOverride(data) {
    if (!isConfigured || !appwrite.databases) {
      const item = Object.assign({ $id: 'dev-' + Date.now(), $createdAt: new Date().toISOString() }, data);
      cache.overrides = cache.overrides || [];
      cache.overrides.unshift(item);
      return item;
    }
    try {
      const res = await appwrite.databases.createDocument(
        dbId,
        cols.schedule_overrides || 'schedule_overrides',
        window.Appwrite.ID.unique(),
        data,
        [
          window.Appwrite.Permission.read(window.Appwrite.Role.any()),
          window.Appwrite.Permission.write(window.Appwrite.Role.users()),
          window.Appwrite.Permission.delete(window.Appwrite.Role.users())
        ]
      );
      if (cache.overrides) cache.overrides.unshift(res);
      return res;
    } catch (err) {
      throw new Error(appwrite.terjemahkanError(err));
    }
  }

  async function deleteScheduleOverride(id) {
    if (isConfigured && appwrite.databases) {
      try {
        await appwrite.databases.deleteDocument(dbId, cols.schedule_overrides || 'schedule_overrides', id);
      } catch (err) {
        throw new Error(appwrite.terjemahkanError(err));
      }
    }
    if (cache.overrides) {
      cache.overrides = cache.overrides.filter((o) => o.$id !== id);
    }
  }

  // ==========================================
  // 3. TUGAS (ASSIGNMENTS)
  // ==========================================
  async function listAssignments(forceRefresh = false) {
    if (cache.assignments && !forceRefresh) return cache.assignments;

    if (isConfigured && appwrite.databases) {
      try {
        const res = await appwrite.databases.listDocuments(
          dbId,
          cols.assignments || 'assignments',
          [window.Appwrite.Query.limit(100), window.Appwrite.Query.orderAsc('deadline')]
        );
        if (res.documents && res.documents.length > 0) {
          cache.assignments = res.documents;
          return cache.assignments;
        }
      } catch (err) {
        console.warn('Gagal memuat tugas dari Appwrite, periksa koneksi:', err);
      }
    }

    // Fallback ke data/tugas.js
    const staticTugas = (window.DATA && window.DATA.tugas) || [];
    cache.assignments = staticTugas.map((t, idx) => ({
      $id: `static-${idx}`,
      judul: t.judul,
      subject_id: t.matkul || 'Umum',
      deskripsi: t.isi || '',
      deadline: t.tenggat || '',
      status: 'aktif',
      link_pengumpulan: t.tautan || ''
    }));
    return cache.assignments;
  }

  async function createAssignment(data) {
    if (!isConfigured || !appwrite.databases) {
      const item = Object.assign({ $id: 'dev-' + Date.now(), status: 'aktif' }, data);
      cache.assignments = cache.assignments || [];
      cache.assignments.push(item);
      return item;
    }
    try {
      const res = await appwrite.databases.createDocument(
        dbId,
        cols.assignments || 'assignments',
        window.Appwrite.ID.unique(),
        data,
        [
          window.Appwrite.Permission.read(window.Appwrite.Role.any()),
          window.Appwrite.Permission.write(window.Appwrite.Role.users()),
          window.Appwrite.Permission.delete(window.Appwrite.Role.users())
        ]
      );
      if (cache.assignments) cache.assignments.push(res);
      return res;
    } catch (err) {
      throw new Error(appwrite.terjemahkanError(err));
    }
  }

  async function updateAssignment(id, data) {
    if (isConfigured && appwrite.databases) {
      try {
        const res = await appwrite.databases.updateDocument(
          dbId,
          cols.assignments || 'assignments',
          id,
          data
        );
        if (cache.assignments) {
          const idx = cache.assignments.findIndex((x) => x.$id === id);
          if (idx >= 0) cache.assignments[idx] = res;
        }
        return res;
      } catch (err) {
        throw new Error(appwrite.terjemahkanError(err));
      }
    }
    if (cache.assignments) {
      const a = cache.assignments.find((x) => x.$id === id);
      if (a) Object.assign(a, data);
      return a;
    }
  }

  async function deleteAssignment(id) {
    if (isConfigured && appwrite.databases) {
      try {
        await appwrite.databases.deleteDocument(dbId, cols.assignments || 'assignments', id);
      } catch (err) {
        throw new Error(appwrite.terjemahkanError(err));
      }
    }
    if (cache.assignments) {
      cache.assignments = cache.assignments.filter((x) => x.$id !== id);
    }
  }

  // ==========================================
  // 4. TAUTAN PENTING (LINKS)
  // ==========================================
  async function listLinks(forceRefresh = false) {
    if (cache.links && !forceRefresh) return cache.links;

    if (isConfigured && appwrite.databases) {
      try {
        const res = await appwrite.databases.listDocuments(
          dbId,
          cols.links || 'links',
          [window.Appwrite.Query.limit(100), window.Appwrite.Query.orderAsc('kategori')]
        );
        if (res.documents && res.documents.length > 0) {
          cache.links = res.documents;
          return cache.links;
        }
      } catch (err) {
        console.warn('Gagal memuat links dari Appwrite:', err);
      }
    }

    const staticLinks = (window.DATA && window.DATA.tautan) || [];
    cache.links = staticLinks.map((l, i) => ({
      $id: `link-${i}`,
      judul: l.judul,
      url: l.url,
      kategori: l.kategori || 'Akademik',
      keterangan: l.keterangan || ''
    }));
    return cache.links;
  }

  async function createLink(data) {
    if (!isConfigured || !appwrite.databases) {
      const item = Object.assign({ $id: 'link-' + Date.now() }, data);
      cache.links = cache.links || [];
      cache.links.push(item);
      return item;
    }
    try {
      const res = await appwrite.databases.createDocument(
        dbId,
        cols.links || 'links',
        window.Appwrite.ID.unique(),
        data,
        [
          window.Appwrite.Permission.read(window.Appwrite.Role.any()),
          window.Appwrite.Permission.write(window.Appwrite.Role.users()),
          window.Appwrite.Permission.delete(window.Appwrite.Role.users())
        ]
      );
      if (cache.links) cache.links.push(res);
      return res;
    } catch (err) {
      throw new Error(appwrite.terjemahkanError(err));
    }
  }

  async function deleteLink(id) {
    if (isConfigured && appwrite.databases) {
      try {
        await appwrite.databases.deleteDocument(dbId, cols.links || 'links', id);
      } catch (err) {
        throw new Error(appwrite.terjemahkanError(err));
      }
    }
    if (cache.links) {
      cache.links = cache.links.filter((l) => l.$id !== id);
    }
  }

  // ==========================================
  // 5. RANGKUMAN & VERSION HISTORY
  // ==========================================
  async function loadAllSummaries() {
    if (isConfigured && appwrite.databases) {
      try {
        const res = await appwrite.databases.listDocuments(
          dbId,
          cols.summaries || 'summaries',
          [window.Appwrite.Query.limit(100)]
        );
        const map = {};
        (res.documents || []).forEach((doc) => {
          const key = `${doc.subject_id}__${doc.minggu_ke}`;
          map[key] = {
            id: doc.$id,
            judul: doc.judul,
            penulis: doc.penulis_nama || 'Mahasiswa SDTA',
            penulis_id: doc.penulis_id,
            isi: doc.isi || '',
            versi: doc.$updatedAt || doc.$createdAt
          };
        });
        return map;
      } catch (e) {
        console.warn('Gagal memuat rangkuman dari Appwrite:', e);
      }
    }
    return {};
  }

  async function saveSummaryWithRevision(docKey, { judul, penulis, isi }, userProfile) {
    const [subjectId, mingguStr] = docKey.split('__');
    const mingguKe = parseInt(mingguStr, 10) || 1;

    if (!isConfigured || !appwrite.databases) {
      return new Date().toISOString();
    }

    try {
      // 1. Cek apakah dokumen summary sudah ada
      let existing = null;
      try {
        const listRes = await appwrite.databases.listDocuments(
          dbId,
          cols.summaries || 'summaries',
          [
            window.Appwrite.Query.equal('subject_id', subjectId),
            window.Appwrite.Query.equal('minggu_ke', mingguKe),
            window.Appwrite.Query.limit(1)
          ]
        );
        if (listRes.documents.length > 0) existing = listRes.documents[0];
      } catch (e) {}

      let summaryDoc = null;
      const dataPayload = {
        subject_id: subjectId,
        minggu_ke: mingguKe,
        judul: judul || `Minggu ${mingguKe}`,
        isi: isi || '',
        penulis_nama: penulis || (userProfile && userProfile.nama_lengkap) || 'Mahasiswa',
        penulis_id: (userProfile && userProfile.$id) || (userProfile && userProfile.nim) || 'anon'
      };

      if (existing) {
        summaryDoc = await appwrite.databases.updateDocument(
          dbId,
          cols.summaries || 'summaries',
          existing.$id,
          dataPayload
        );
      } else {
        summaryDoc = await appwrite.databases.createDocument(
          dbId,
          cols.summaries || 'summaries',
          window.Appwrite.ID.unique(),
          dataPayload,
          [
            window.Appwrite.Permission.read(window.Appwrite.Role.any()),
            window.Appwrite.Permission.write(window.Appwrite.Role.users()),
            window.Appwrite.Permission.delete(window.Appwrite.Role.users())
          ]
        );
      }

      // 2. Simpan Activity Log & Snapshot Revisi ke summary_revisions
      try {
        await appwrite.databases.createDocument(
          dbId,
          cols.summary_revisions || 'summary_revisions',
          window.Appwrite.ID.unique(),
          {
            summary_id: summaryDoc.$id,
            isi_snapshot: isi,
            edited_by: (userProfile && userProfile.$id) || 'anon',
            edited_by_nama: (userProfile && userProfile.nama_lengkap) || penulis || 'Mahasiswa',
            catatan_perubahan: `Penyuntingan rangkuman ${subjectId} M${mingguKe}`
          },
          [
            window.Appwrite.Permission.read(window.Appwrite.Role.users()),
            window.Appwrite.Permission.write(window.Appwrite.Role.users())
          ]
        );
      } catch (revErr) {
        console.warn('Gagal mencatat revision log:', revErr);
      }

      return summaryDoc.$updatedAt || new Date().toISOString();
    } catch (err) {
      throw new Error(appwrite.terjemahkanError(err));
    }
  }

  async function listSummaryRevisions(summaryId) {
    if (!isConfigured || !appwrite.databases || !summaryId) return [];
    try {
      const res = await appwrite.databases.listDocuments(
        dbId,
        cols.summary_revisions || 'summary_revisions',
        [
          window.Appwrite.Query.equal('summary_id', summaryId),
          window.Appwrite.Query.limit(25),
          window.Appwrite.Query.orderDesc('$createdAt')
        ]
      );
      return res.documents || [];
    } catch {
      return [];
    }
  }

  // ==========================================
  // 6. UANG KAS (TRANSAKSI, IURAN, SKIP BULAN)
  // ==========================================
  async function listCashTransactions() {
    if (!isConfigured || !appwrite.databases) return null;
    try {
      const res = await appwrite.databases.listDocuments(
        dbId,
        cols.cash_transactions || 'cash_transactions',
        [window.Appwrite.Query.limit(200), window.Appwrite.Query.orderDesc('tanggal')]
      );
      return res.documents || [];
    } catch (err) {
      console.warn('Gagal memuat cash_transactions:', err);
      return null;
    }
  }

  async function createCashTransaction(data) {
    if (!isConfigured || !appwrite.databases) return null;
    try {
      return await appwrite.databases.createDocument(
        dbId,
        cols.cash_transactions || 'cash_transactions',
        window.Appwrite.ID.unique(),
        data,
        [
          window.Appwrite.Permission.read(window.Appwrite.Role.any()),
          window.Appwrite.Permission.write(window.Appwrite.Role.users()),
          window.Appwrite.Permission.delete(window.Appwrite.Role.users())
        ]
      );
    } catch (err) {
      throw new Error(appwrite.terjemahkanError(err));
    }
  }

  async function deleteCashTransaction(id) {
    if (!isConfigured || !appwrite.databases || !id) return;
    try {
      await appwrite.databases.deleteDocument(dbId, cols.cash_transactions || 'cash_transactions', id);
    } catch (err) {
      throw new Error(appwrite.terjemahkanError(err));
    }
  }

  async function listCashPayments() {
    if (!isConfigured || !appwrite.databases) return null;
    try {
      const res = await appwrite.databases.listDocuments(
        dbId,
        cols.cash_payments || 'cash_payments',
        [window.Appwrite.Query.limit(200)]
      );
      return res.documents || [];
    } catch (err) {
      console.warn('Gagal memuat cash_payments:', err);
      return null;
    }
  }

  async function upsertCashPayment(userId, periodeBulan, nominalDibayar, status = 'lunas') {
    if (!isConfigured || !appwrite.databases) return null;
    try {
      const existing = await appwrite.databases.listDocuments(
        dbId,
        cols.cash_payments || 'cash_payments',
        [
          window.Appwrite.Query.equal('user_id', userId),
          window.Appwrite.Query.equal('periode_bulan', periodeBulan),
          window.Appwrite.Query.limit(1)
        ]
      );
      const payload = {
        user_id: userId,
        periode_bulan: periodeBulan,
        nominal_dibayar: Number(nominalDibayar || 0),
        status
      };
      if (existing.documents && existing.documents.length > 0) {
        return await appwrite.databases.updateDocument(
          dbId,
          cols.cash_payments || 'cash_payments',
          existing.documents[0].$id,
          payload
        );
      }
      return await appwrite.databases.createDocument(
        dbId,
        cols.cash_payments || 'cash_payments',
        window.Appwrite.ID.unique(),
        payload,
        [
          window.Appwrite.Permission.read(window.Appwrite.Role.users()),
          window.Appwrite.Permission.write(window.Appwrite.Role.users()),
          window.Appwrite.Permission.delete(window.Appwrite.Role.users())
        ]
      );
    } catch (err) {
      throw new Error(appwrite.terjemahkanError(err));
    }
  }

  async function listCashMonthSettings() {
    if (!isConfigured || !appwrite.databases) return null;
    try {
      const res = await appwrite.databases.listDocuments(
        dbId,
        cols.cash_month_settings || 'cash_month_settings',
        [window.Appwrite.Query.limit(50), window.Appwrite.Query.orderAsc('periode_bulan')]
      );
      return res.documents || [];
    } catch (err) {
      console.warn('Gagal memuat cash_month_settings:', err);
      return null;
    }
  }

  async function createCashMonthSetting(periodeBulan, alasan) {
    if (!isConfigured || !appwrite.databases) return null;
    try {
      return await appwrite.databases.createDocument(
        dbId,
        cols.cash_month_settings || 'cash_month_settings',
        window.Appwrite.ID.unique(),
        { periode_bulan: periodeBulan, is_skipped: true, alasan: alasan || 'Libur Semester' },
        [
          window.Appwrite.Permission.read(window.Appwrite.Role.any()),
          window.Appwrite.Permission.write(window.Appwrite.Role.users()),
          window.Appwrite.Permission.delete(window.Appwrite.Role.users())
        ]
      );
    } catch (err) {
      throw new Error(appwrite.terjemahkanError(err));
    }
  }

  async function deleteCashMonthSetting(id) {
    if (!isConfigured || !appwrite.databases || !id) return;
    try {
      await appwrite.databases.deleteDocument(dbId, cols.cash_month_settings || 'cash_month_settings', id);
    } catch (err) {
      throw new Error(appwrite.terjemahkanError(err));
    }
  }

  // ==========================================
  // 7. AUDIT LOG GLOBAL
  // ==========================================
  async function logActivity(kategori, aksi, detail) {
    if (!isConfigured || !appwrite.databases) return;
    const auth = window.SDT && window.SDT.auth;
    if (!auth || !auth.state || !auth.state.isLoggedIn) return;
    const user = auth.state.user || {};
    const profile = auth.state.profile || {};
    try {
      await appwrite.databases.createDocument(
        dbId,
        cols.activity_logs || 'activity_logs',
        window.Appwrite.ID.unique(),
        {
          user_id: user.$id || profile.$id || 'unknown',
          user_nama: profile.nama_lengkap || user.name || 'Pengguna',
          kategori: String(kategori || 'sistem'),
          aksi: String(aksi || 'update'),
          detail: String(detail || '').slice(0, 500)
        },
        [
          window.Appwrite.Permission.read(window.Appwrite.Role.users()),
          window.Appwrite.Permission.write(window.Appwrite.Role.users())
        ]
      );
    } catch (e) {
      console.warn('Activity log skip:', e.message);
    }
  }

  async function adminResetPassword(targetUserId) {
    const funcId = config.functions && config.functions.adminResetPassword;
    if (!isConfigured || !appwrite.functions || !funcId) {
      throw new Error('FUNCTION_NOT_CONFIGURED');
    }
    try {
      const exec = await appwrite.functions.createExecution(
        funcId,
        JSON.stringify({ targetUserId }),
        false
      );
      let body = {};
      try { body = JSON.parse(exec.responseBody || '{}'); } catch {}
      if (exec.status === 'failed' || body.ok === false) {
        throw new Error(body.message || 'Eksekusi Function reset password gagal.');
      }
      return body;
    } catch (err) {
      throw new Error(appwrite.terjemahkanError(err));
    }
  }

  // ==========================================
  // EXPORT KE GLOBAL NAMESPACE
  // ==========================================
  window.SDT = window.SDT || {};
  window.SDT.services = {
    // Profil
    listProfiles,
    getProfileByNimOrId,
    updateProfile,
    uploadAvatar,
    getAvatarViewUrl,
    adminResetPassword,
    // Reschedule
    listScheduleOverrides,
    createScheduleOverride,
    deleteScheduleOverride,
    // Tugas
    listAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    // Tautan
    listLinks,
    createLink,
    deleteLink,
    // Rangkuman
    loadAllSummaries,
    saveSummaryWithRevision,
    listSummaryRevisions,
    // Kas
    listCashTransactions,
    createCashTransaction,
    deleteCashTransaction,
    listCashPayments,
    upsertCashPayment,
    listCashMonthSettings,
    createCashMonthSetting,
    deleteCashMonthSetting,
    // Audit
    logActivity
  };
})();
