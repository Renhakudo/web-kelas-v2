// sync-utils.js
// Utilitas modular untuk validasi transaksi kas, resolusi konflik timestamp,
// verifikasi secret aman, serta retry dengan exponential backoff.
const crypto = require('crypto');

const VALID_JENIS = ['masuk', 'keluar'];
const VALID_STATUS = ['aktif', 'deleted'];
const VALID_SOURCE = ['website', 'sheets', 'sync'];

function timingSafeCompare(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  if (!sa || !sb) return false;
  const ba = Buffer.from(sa, 'utf8');
  const bb = Buffer.from(sb, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function normalizeIsoDate(val) {
  const s = String(val || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}

function normalizeIsoTimestamp(val) {
  const s = String(val || '').trim();
  const d = s ? new Date(s) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function validateTransaction(raw, defaultSource = 'website') {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Payload transaksi harus berupa objek JSON.' };
  }

  const transaction_id = String(raw.transaction_id || raw.$id || raw.id || '').trim().slice(0, 64);
  if (!transaction_id || !/^[a-zA-Z0-9_-]{3,64}$/.test(transaction_id)) {
    return { valid: false, error: 'transaction_id wajib diisi (3-64 karakter alfanumerik, - atau _).' };
  }

  const tanggal = normalizeIsoDate(raw.tanggal);
  if (!tanggal) {
    return { valid: false, error: `Format tanggal tidak valid untuk ${transaction_id}. Gunakan YYYY-MM-DD.` };
  }

  const jenis = String(raw.jenis || '').trim().toLowerCase();
  if (!VALID_JENIS.includes(jenis)) {
    return { valid: false, error: `Jenis transaksi "${jenis}" tidak valid (harus "masuk" atau "keluar").` };
  }

  const kategori = String(raw.kategori || 'Lainnya').trim().slice(0, 50) || 'Lainnya';
  const nominal = Number(raw.nominal);
  if (!Number.isFinite(nominal) || nominal < 0) {
    return { valid: false, error: `Nominal tidak valid untuk ${transaction_id}.` };
  }

  const keterangan = String(raw.keterangan || '').trim().slice(0, 255);
  if (!keterangan) {
    return { valid: false, error: `Keterangan wajib diisi untuk ${transaction_id}.` };
  }

  const mahasiswa_nama = String(raw.mahasiswa_nama || '').trim().slice(0, 100);
  const statusRaw = String(raw.status || 'aktif').trim().toLowerCase();
  const status = VALID_STATUS.includes(statusRaw) ? statusRaw : 'aktif';

  const sourceRaw = String(raw.source || defaultSource).trim().toLowerCase();
  const source = VALID_SOURCE.includes(sourceRaw) ? sourceRaw : defaultSource;

  const updated_at = normalizeIsoTimestamp(raw.updated_at || raw.$updatedAt);

  return {
    valid: true,
    data: {
      transaction_id,
      tanggal,
      jenis,
      kategori,
      nominal: Math.round(nominal),
      keterangan,
      mahasiswa_nama,
      status,
      source,
      updated_at
    }
  };
}

/**
 * Mengembalikan true jika incoming lebih baru atau sama dengan existing,
 * false jika existing di Appwrite lebih baru (mencegah overwrite data lebih baru).
 */
function isIncomingNewer(existingUpdatedAt, incomingUpdatedAt) {
  if (!existingUpdatedAt) return true;
  const exMs = Date.parse(existingUpdatedAt);
  const inMs = Date.parse(incomingUpdatedAt);
  if (Number.isNaN(exMs)) return true;
  if (Number.isNaN(inMs)) return false;
  return inMs >= exMs;
}

async function fetchWithRetry(url, options, maxRetries = 3, baseDelayMs = 400) {
  let lastErr = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      let json = {};
      try { json = JSON.parse(text); } catch {}
      if (res.ok) return { ok: true, status: res.status, data: json, raw: text };
      // Jangan retry untuk error 4xx (kecuali 429 rate limit)
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw new Error(`[HTTP ${res.status}] ${json.message || text}`);
      }
      lastErr = new Error(`[HTTP ${res.status}] ${json.message || text}`);
    } catch (err) {
      lastErr = err;
      if (err.message && /\[HTTP 4\d\d\]/.test(err.message) && !err.message.includes('429')) {
        throw err;
      }
    }
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
    }
  }
  throw lastErr || new Error('Gagal melakukan request setelah beberapa kali percobaan.');
}

module.exports = {
  timingSafeCompare,
  validateTransaction,
  isIncomingNewer,
  fetchWithRetry,
  normalizeIsoTimestamp
};
