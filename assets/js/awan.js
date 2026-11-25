// awan.js: adaptor penyimpanan rangkuman materi berbasis Appwrite Cloud.
// Menggantikan konfigurasi Firestore lama dengan koleksi 'summaries' dan 'summary_revisions'.
// Semua mahasiswa, pengurus, dan admin yang telah login berhak berkontribusi.
(function () {
  const SDT = window.SDT || {};
  const appwrite = SDT.appwrite || {};
  const isConfigured = Boolean(appwrite.isConfigured);

  class Galat extends Error {
    constructor(kode, pesan) {
      super(pesan);
      this.kode = kode;
    }
  }

  // Cek status sesi auth internal
  function getSesi() {
    const auth = SDT.auth;
    if (auth && auth.state && auth.state.isLoggedIn) {
      const user = auth.state.user || {};
      const profile = auth.state.profile || {};
      return {
        email: user.email || (profile.nim ? `${profile.nim}@student.pens.ac.id` : 'mahasiswa@student.pens.ac.id'),
        id: user.$id || profile.$id,
        nama: profile.nama_lengkap || user.name || 'Mahasiswa SDTA'
      };
    }
    return null;
  }

  // Muat semua rangkuman dari koleksi 'summaries' Appwrite
  async function muat() {
    if (!SDT.services) return {};
    try {
      return await SDT.services.loadAllSummaries();
    } catch (e) {
      console.warn("Gagal muat rangkuman dari awan:", e);
      throw new Galat("muat", "Rangkuman terbaru tidak bisa dimuat dari server.");
    }
  }

  // Ambil satu rangkuman
  async function ambil(id) {
    const all = await muat();
    return all[id] || null;
  }

  // Masuk / Login untuk penyuntingan
  async function masuk(identifier, sandi) {
    if (!SDT.auth) throw new Galat("masuk", "Modul autentikasi belum siap.");
    try {
      await SDT.auth.login(identifier, sandi);
      const s = getSesi();
      return s ? s.nama : identifier;
    } catch (e) {
      throw new Galat("masuk", e.message || "Gagal masuk.");
    }
  }

  function keluar() {
    if (SDT.auth) {
      SDT.auth.logout();
    }
  }

  // Simpan rangkuman beserta snapshot versi ke summary_revisions
  async function simpan(id, data, versi) {
    const sesi = getSesi();
    if (!sesi) {
      throw new Galat("sesi", "Silakan login terlebih dahulu untuk menyunting rangkuman.");
    }

    if (!SDT.services) {
      throw new Galat("simpan", "Layanan database belum siap.");
    }

    try {
      const profile = (SDT.auth && SDT.auth.state && SDT.auth.state.profile) || {
        nama_lengkap: sesi.nama,
        $id: sesi.id
      };
      const newVersi = await SDT.services.saveSummaryWithRevision(id, data, profile);
      return newVersi;
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("bentrok") || msg.includes("conflict")) {
        throw new Galat("bentrok", "Rangkuman ini baru saja diubah oleh mahasiswa lain.");
      }
      if (msg.includes("unauthorized") || msg.includes("scope") || msg.includes("izin")) {
        throw new Galat("izin", "Anda belum memiliki hak akses atau sesi login telah kedaluwarsa.");
      }
      throw new Galat("simpan", msg || "Gagal menyimpan ke server Appwrite.");
    }
  }

  window.SDT = window.SDT || {};
  window.SDT.awan = {
    aktif: isConfigured,
    muat,
    ambil,
    masuk,
    keluar,
    simpan,
    pengguna: () => {
      const s = getSesi();
      return s ? `${s.nama}` : null;
    }
  };
})();
