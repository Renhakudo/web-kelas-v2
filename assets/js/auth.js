// auth.js
// Manajemen autentikasi, sesi, dan hak akses pengguna (RBAC) untuk Website Kelas SDT A.
(function () {
  const SDT = window.SDT || {};
  const appwrite = SDT.appwrite || {};
  const isConfigured = appwrite.isConfigured;

  const DEV_STORAGE_KEY = "sdta_dev_auth_session";

  // State autentikasi global
  const state = {
    user: null,          // Objek user Appwrite Auth atau dev user
    profile: null,       // Dokumen profil dari koleksi 'profiles'
    isLoggedIn: false,
    role: "public",      // "admin" | "pengurus" | "mahasiswa" | "public"
    isDevSim: false,     // True jika berjalan dalam mode simulasi dev
    ready: false         // True setelah pemeriksaan sesi awal selesai
  };

  const listeners = [];
  function notify() {
    listeners.forEach((fn) => {
      try { fn(state); } catch (e) { console.error("Error pada auth listener:", e); }
    });
  }

  function onAuthChange(fn) {
    if (typeof fn === "function") {
      listeners.push(fn);
      if (state.ready) {
        try { fn(state); } catch (e) {}
      }
    }
  }

  // Profil default untuk simulasi dev saat Project ID belum terhubung
  const DEV_PROFILES = {
    admin: {
      id: "usr-3326600016",
      nim: "3326600016",
      nama_lengkap: "Mohammad Aditya Arkoun",
      role: "admin",
      jabatan: "Pengembang & Admin",
      bio: "Frontend and core feature developer kelas SDT A. Admin sistem.",
      minat: ["Data Science", "Web Development", "UI/UX"],
      matkul_pj: ["all"]
    },
    pengurus: {
      id: "usr-3326600001",
      nim: "3326600001",
      nama_lengkap: "Rihana Shafira Azzalia",
      role: "pengurus",
      jabatan: "Bendahara",
      bio: "Bendahara kelas SDT A. Mengelola iuran dan keuangan kelas.",
      minat: ["Statistika", "Finance", "Machine Learning"],
      matkul_pj: []
    },
    pj_matkul: {
      id: "usr-3326600024",
      nim: "3326600024",
      nama_lengkap: "Ghazi Silkaputera Hanania",
      role: "pengurus",
      jabatan: "PJ Matkul Jaringan",
      bio: "Penanggung jawab mata kuliah Workshop Sistem Operasi & Jaringan.",
      minat: ["Networking", "Cyber Security", "Linux"],
      matkul_pj: ["jaringan", "soj"]
    },
    mahasiswa: {
      id: "usr-3326600003",
      nim: "3326600003",
      nama_lengkap: "Davin Zoe Akhmad",
      role: "mahasiswa",
      jabatan: "Mahasiswa",
      bio: "Mahasiswa Sains Data Terapan A PENS.",
      minat: ["Data Analytics", "Python", "Deep Learning"],
      matkul_pj: []
    }
  };

  // Inisialisasi status sesi saat halaman dimuat
  async function init() {
    if (isConfigured && appwrite.account) {
      try {
        const u = await appwrite.account.get();
        state.user = u;
        state.isLoggedIn = true;
        state.isDevSim = false;

        // Ambil profil dari database Appwrite
        try {
          const p = await appwrite.databases.getDocument(
            appwrite.config.databaseId,
            appwrite.config.collections.profiles,
            u.$id
          );
          state.profile = p;
          state.role = p.role || "mahasiswa";
        } catch (dbErr) {
          // Jika dokumen profil belum dibuat, buat profil minimal dari data Auth
          state.profile = {
            nim: u.email.split("@")[0],
            nama_lengkap: u.name || "Mahasiswa SDTA",
            role: "mahasiswa"
          };
          state.role = "mahasiswa";
        }
      } catch (authErr) {
        // Tidak ada sesi aktif
        state.user = null;
        state.profile = null;
        state.isLoggedIn = false;
        state.role = "public";
      }
    } else {
      // Periksa apakah ada sesi dev simulation tersimpan
      try {
        const savedDev = localStorage.getItem(DEV_STORAGE_KEY);
        if (savedDev && DEV_PROFILES[savedDev]) {
          const dev = DEV_PROFILES[savedDev];
          state.user = { $id: dev.id, name: dev.nama_lengkap, email: `${dev.nim}@student.pens.ac.id` };
          state.profile = dev;
          state.isLoggedIn = true;
          state.role = dev.role;
          state.isDevSim = true;
        }
      } catch (e) {}
    }

    state.ready = true;
    notify();
  }

  // Login
  async function login(identifier, password) {
    const raw = String(identifier || "").trim();
    if (!raw) throw new Error("Harap masukkan NIM atau Email.");
    if (!password) throw new Error("Harap masukkan kata sandi.");

    // Format email: jika hanya angka NIM, otomatis jadikan format email mahasiswa
    const email = /^\d+$/.test(raw) ? `${raw}@student.pens.ac.id` : raw;

    if (isConfigured && appwrite.account) {
      try {
        await appwrite.account.createEmailPasswordSession(email, password);
        await init();
        return state.profile;
      } catch (err) {
        throw new Error(appwrite.terjemahkanError(err));
      }
    } else {
      // Mode simulasi jika Appwrite belum dihubungkan Project ID
      throw new Error("Proyek Appwrite Cloud belum dihubungkan. Masukkan Project ID di data/appwrite-config.js atau gunakan tombol simulasi dev di bawah.");
    }
  }

  // Simulasi login untuk kebutuhan pengujian dev
  function devLogin(devType) {
    if (!DEV_PROFILES[devType]) return;
    const dev = DEV_PROFILES[devType];
    state.user = { $id: dev.id, name: dev.nama_lengkap, email: `${dev.nim}@student.pens.ac.id` };
    state.profile = dev;
    state.isLoggedIn = true;
    state.role = dev.role;
    state.isDevSim = true;
    try { localStorage.setItem(DEV_STORAGE_KEY, devType); } catch (e) {}
    notify();
    return dev;
  }

  // Logout
  async function logout() {
    if (isConfigured && appwrite.account && !state.isDevSim) {
      try {
        await appwrite.account.deleteSession("current");
      } catch (e) {
        console.warn("Gagal menghapus sesi cloud:", e);
      }
    }
    try { localStorage.removeItem(DEV_STORAGE_KEY); } catch (e) {}
    state.user = null;
    state.profile = null;
    state.isLoggedIn = false;
    state.role = "public";
    state.isDevSim = false;
    notify();
  }

  // Ganti kata sandi
  async function changePassword(oldPassword, newPassword) {
    if (state.isDevSim) {
      return "Kata sandi simulasi berhasil diubah (mode dev).";
    }
    if (!isConfigured || !appwrite.account) {
      throw new Error("Appwrite belum dikonfigurasi.");
    }
    try {
      await appwrite.account.updatePassword(newPassword, oldPassword);
      return "Kata sandi Anda berhasil diperbarui.";
    } catch (err) {
      throw new Error(appwrite.terjemahkanError(err));
    }
  }

  // Perbarui profil sendiri
  async function updateProfile(updateData) {
    if (state.isDevSim) {
      Object.assign(state.profile, updateData);
      notify();
      return state.profile;
    }
    if (!isConfigured || !appwrite.databases || !state.user) {
      throw new Error("Koneksi database tidak tersedia.");
    }
    try {
      const updated = await appwrite.databases.updateDocument(
        appwrite.config.databaseId,
        appwrite.config.collections.profiles,
        state.user.$id,
        updateData
      );
      state.profile = updated;
      notify();
      return updated;
    } catch (err) {
      throw new Error(appwrite.terjemahkanError(err));
    }
  }

  // Helper Hak Akses (RBAC)
  function hasRole(reqRole) {
    if (!state.isLoggedIn) return false;
    if (state.role === "admin") return true; // Admin memiliki semua hak
    if (reqRole === "pengurus") return state.role === "pengurus";
    if (reqRole === "mahasiswa") return state.role === "pengurus" || state.role === "mahasiswa";
    return false;
  }

  function isSubjectPJ(subjectCodeOrId) {
    if (!state.isLoggedIn) return false;
    if (state.role === "admin") return true;
    if (state.role !== "pengurus") return false;
    const list = (state.profile && state.profile.matkul_pj) || [];
    return list.includes("all") || list.includes(subjectCodeOrId);
  }

  function canManageCash() {
    if (!state.isLoggedIn) return false;
    if (state.role === "admin") return true;
    if (state.role === "pengurus") {
      const jabatan = (state.profile && state.profile.jabatan) || "";
      return jabatan.toLowerCase().includes("bendahara");
    }
    return false;
  }

  window.SDT = window.SDT || {};
  window.SDT.auth = {
    state,
    init,
    login,
    devLogin,
    logout,
    changePassword,
    updateProfile,
    hasRole,
    isSubjectPJ,
    canManageCash,
    onAuthChange,
    DEV_PROFILES
  };

  // Jalankan inisialisasi awal saat skrip dimuat
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
