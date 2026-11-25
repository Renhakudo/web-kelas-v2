#!/usr/bin/env node
// scripts/reset-password.js
// Utilitas Admin untuk mereset kata sandi sementara mahasiswa di Appwrite Auth.
// Penggunaan: node scripts/reset-password.js [NRP]
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q, def = '') => new Promise((res) => {
  rl.question(`${q} ${def ? `[${def}] ` : ''}: `, (ans) => res(ans.trim() || def));
});

function generatePassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';
  const bytes = crypto.randomBytes(len);
  let pw = 'Sdt';
  for (let i = 0; i < len - 3; i++) {
    pw += chars[bytes[i] % chars.length];
  }
  return pw;
}

async function main() {
  console.log('========================================================');
  console.log(' RESET KATA SANDI MAHASISWA SDT A (ADMIN CLI)');
  console.log('========================================================\n');

  const argNrp = process.argv[2] || '';
  const endpoint = await ask('1. Appwrite Endpoint', 'https://fra.cloud.appwrite.io/v1');
  const projectId = await ask('2. Project ID', '6ae2a1eb001089e29cbd');
  const apiKey = await ask('3. API Secret Key (Scope: users.write)');
  const nrp = await ask('4. NRP Mahasiswa (contoh: 3326600003)', argNrp);

  if (!projectId || !apiKey || !nrp) {
    console.error('\n[Error] Project ID, API Key, dan NRP wajib diisi!');
    rl.close();
    process.exit(1);
  }

  const userId = nrp.startsWith('usr-') ? nrp : `usr-${nrp}`;
  const tempPassword = generatePassword(10);

  try {
    const res = await fetch(`${endpoint}/users/${encodeURIComponent(userId)}/password`, {
      method: 'PATCH',
      headers: {
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: tempPassword })
    });
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch {}
    if (!res.ok) {
      throw new Error(`[${res.status}] ${json.message || text}`);
    }
    console.log('\n✓ Kata sandi berhasil direset!');
    console.log(`  User ID             : ${userId}`);
    console.log(`  Kata Sandi Sementara: ${tempPassword}`);
    console.log('\nBagikan kata sandi sementara ini secara privat kepada mahasiswa terkait.');
  } catch (err) {
    console.error('\n[Gagal Reset Password]:', err.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
