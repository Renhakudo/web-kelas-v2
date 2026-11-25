// Appwrite Cloud Function (Node.js 18+): Reset Password oleh Admin Kelas SDT A.
// Env variables required in Appwrite Function Settings:
// - APPWRITE_FUNCTION_API_KEY (atau APPWRITE_API_KEY dengan scope users.write & databases.read)
// - APPWRITE_DATABASE_ID (default: sdta_db)
const crypto = require('crypto');

function genPassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';
  const bytes = crypto.randomBytes(len);
  let out = 'Sdt';
  for (let i = 0; i < len - 3; i++) out += chars[bytes[i] % chars.length];
  return out;
}

module.exports = async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || req.headers['x-appwrite-key'];
  const callerId = req.headers['x-appwrite-user-id'];
  const dbId = process.env.APPWRITE_DATABASE_ID || 'sdta_db';

  if (!callerId) {
    return res.json({ ok: false, message: 'Unauthorized: Sesi login diperlukan.' }, 401);
  }
  if (!apiKey || !projectId) {
    error('Missing APPWRITE_API_KEY or APPWRITE_FUNCTION_PROJECT_ID');
    return res.json({ ok: false, message: 'Konfigurasi server Function belum lengkap.' }, 500);
  }

  const headers = {
    'X-Appwrite-Project': projectId,
    'X-Appwrite-Key': apiKey,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Verifikasi di database Appwrite bahwa pemanggil benar-benar role: admin
    const profRes = await fetch(`${endpoint}/databases/${dbId}/collections/profiles/documents/${encodeURIComponent(callerId)}`, { headers });
    if (!profRes.ok) {
      return res.json({ ok: false, message: 'Profil admin tidak ditemukan.' }, 403);
    }
    const callerProfile = await profRes.json();
    if (callerProfile.role !== 'admin') {
      return res.json({ ok: false, message: 'Forbidden: Hanya Admin yang dapat mereset kata sandi.' }, 403);
    }

    // 2. Parse targetUserId dari body
    let body = {};
    try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch {}
    const targetUserId = String(body.targetUserId || '').trim();
    if (!targetUserId || !/^usr-\d{8,14}$/.test(targetUserId)) {
      return res.json({ ok: false, message: 'Parameter targetUserId tidak valid.' }, 400);
    }

    // 3. Generate & update password sementara di Appwrite Auth
    const temporaryPassword = genPassword(10);
    const pwRes = await fetch(`${endpoint}/users/${encodeURIComponent(targetUserId)}/password`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ password: temporaryPassword })
    });
    if (!pwRes.ok) {
      const txt = await pwRes.text();
      return res.json({ ok: false, message: `Gagal reset password: ${txt}` }, pwRes.status);
    }

    log(`Admin ${callerId} mereset kata sandi ${targetUserId}`);
    return res.json({ ok: true, targetUserId, temporaryPassword }, 200);
  } catch (err) {
    error(err.message);
    return res.json({ ok: false, message: err.message || 'Kesalahan server internal.' }, 500);
  }
};
