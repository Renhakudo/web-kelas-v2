// appwrite-client.js
// Inisialisasi dan wrapper SDK Appwrite Cloud untuk Website Kelas SDT A.
(function () {
  const config = (window.DATA && window.DATA.appwrite) || {};
  const isConfigured = Boolean(config.endpoint && config.projectId);

  let client = null;
  let account = null;
  let databases = null;
  let storage = null;
  let functions = null;

  if (isConfigured && window.Appwrite) {
    try {
      client = new window.Appwrite.Client()
        .setEndpoint(config.endpoint)
        .setProject(config.projectId);

      account = new window.Appwrite.Account(client);
      databases = new window.Appwrite.Databases(client);
      storage = new window.Appwrite.Storage(client);
      functions = new window.Appwrite.Functions(client);
    } catch (err) {
      console.warn("Gagal inisialisasi Appwrite Client:", err);
    }
  }

  // Pesan kesalahan umum Appwrite diterjemahkan ke Bahasa Indonesia yang ramah
  const PESAN_ERROR = {
    "user_invalid_credentials": "NIM/Email atau kata sandi tidak sesuai. Periksa kembali dan coba lagi.",
    "user_not_found": "Akun tidak ditemukan. Pastikan NIM atau email sudah terdaftar.",
    "user_blocked": "Akun ini dinonaktifkan oleh administrator.",
    "password_recently_used": "Kata sandi baru tidak boleh sama dengan kata sandi sebelumnya.",
    "password_invalid": "Kata sandi minimal 8 karakter.",
    "user_already_exists": "Akun dengan identitas ini sudah terdaftar.",
    "user_session_already_exists": "Anda sudah memiliki sesi aktif.",
    "general_rate_limit_exceeded": "Terlalu banyak percobaan. Harap tunggu beberapa menit sebelum mencoba lagi.",
    "general_unauthorized_scope": "Anda tidak memiliki hak akses untuk melakukan aksi ini.",
    "document_not_found": "Data yang dicari tidak ditemukan di database."
  };

  function terjemahkanError(err) {
    if (!err) return "Terjadi kesalahan tidak diketahui.";
    if (typeof err === "string") return err;
    const type = err.type || "";
    if (PESAN_ERROR[type]) return PESAN_ERROR[type];
    return err.message || "Gagal menghubungi server Appwrite.";
  }

  window.SDT = window.SDT || {};
  window.SDT.appwrite = {
    isConfigured,
    config,
    client,
    account,
    databases,
    storage,
    functions,
    terjemahkanError
  };
})();
