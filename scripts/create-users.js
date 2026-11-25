#!/usr/bin/env node
// scripts/create-users.js
// Mendaftarkan 24 akun mahasiswa kelas SDT A ke Appwrite Auth dan membuat dokumen 'profiles'.
// Menghasilkan berkas 'kredensial-mahasiswa-rahasia.csv' untuk dibagikan privat oleh Admin ke mahasiswa.

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (q, def = '') => new Promise((res) => {
  rl.question(`${q} ${def ? `[${def}] ` : ''}: `, (ans) => res(ans.trim() || def));
});

// Generator password acak yang aman dan mudah dibaca
function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz';
  const nums = '23456789';
  const syms = '#$%&';
  let p = 'Sdta';
  for (let i = 0; i < 4; i++) p += nums[Math.floor(Math.random() * nums.length)];
  for (let i = 0; i < 2; i++) p += chars[Math.floor(Math.random() * chars.length)];
  p += syms[Math.floor(Math.random() * syms.length)];
  return p;
}

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

// Baca data anggota dari data/anggota.js
function loadAnggota() {
  const anggotaPath = path.join(__dirname, '..', 'data', 'anggota.js');
  const code = fs.readFileSync(anggotaPath, 'utf8');
  const fakeWindow = { DATA: {} };
  eval(`(function(window){ ${code} })(fakeWindow);`);
  return fakeWindow.DATA.anggota || {};
}

async function main() {
  console.log('========================================================');
  console.log(' PEMBUATAN 24 AKUN MAHASISWA SDT A (APPWRITE AUTH)');
  console.log('========================================================\n');

  const endpoint = await ask('1. Appwrite Endpoint', 'https://fra.cloud.appwrite.io/v1');
  const projectId = await ask('2. Project ID');
  const apiKey = await ask('3. API Secret Key (Admin/Server Key)');
  const databaseId = await ask('4. Database ID', 'sdta_db');

  if (!projectId || !apiKey) {
    console.error('\n[Error] Project ID dan API Key wajib diisi!');
    rl.close();
    process.exit(1);
  }

  const anggota = loadAnggota();
  const mahasiswaList = anggota.mahasiswa || [];
  const pengurusList = anggota.pengurus || [];

  if (!mahasiswaList.length) {
    console.error('\n[Error] Daftar mahasiswa tidak ditemukan di data/anggota.js');
    rl.close();
    process.exit(1);
  }

  console.log(`\nMemproses ${mahasiswaList.length} mahasiswa dari data/anggota.js...\n`);

  // Identifikasi role
  // Admin: Mohammad Aditya Arkoun & Muhammad Hilmi Mu'Afa
  const ADMIN_NAMES = [
    'Mohammad Aditya Arkoun',
    "Muhammad Hilmi Mu'Afa"
  ];

  const credentials = [];
  let baseNimNumber = 3326600001; // Format NRP SDT A: 3326600001 s/d 3326600024

  for (let i = 0; i < mahasiswaList.length; i++) {
    const nama = mahasiswaList[i];
    const nrp = String(baseNimNumber + i);
    const email = `${nrp}@student.pens.ac.id`;
    const password = generatePassword();

    // Tentukan role & jabatan (struktur kelas dari data/anggota.js)
    let role = 'mahasiswa';
    let jabatan = 'Mahasiswa';
    const pengurusMatch = pengurusList.find((p) => p.nama === nama);

    if (pengurusMatch) {
      role = 'pengurus';
      jabatan = pengurusMatch.jabatan;
    }
    if (ADMIN_NAMES.includes(nama)) {
      role = 'admin';
      // Jabatan struktur kelas tetap sesuai peran di kelas (tidak menimpa menjadi Komandan Tingkat)
    }

    process.stdout.write(`[${i + 1}/${mahasiswaList.length}] NRP ${nrp} - ${nama.padEnd(35)} (${role.toUpperCase()})... `);

    try {
      // 1. Buat User di Appwrite Auth (ID akun = nrp langsung agar konsisten)
      let userId = `usr-${nrp}`;

      const userRes = await request(endpoint, apiKey, projectId, '/users', 'POST', {
        userId,
        email,
        password,
        name: nama
      });

      if (userRes.status === 409) {
        // User auth sudah ada, perbarui passwordnya agar sesuai dengan yang dicatat
        try {
          await request(endpoint, apiKey, projectId, `/users/${userId}/password`, 'PATCH', { password });
        } catch (e) {}
      } else {
        userId = userRes.data.$id || userId;
      }

      // 1b. Tetapkan label role Appwrite Auth ('admin' | 'pengurus' | 'mahasiswa') untuk RBAC backend
      try {
        await request(endpoint, apiKey, projectId, `/users/${userId}/labels`, 'PUT', {
          labels: [role]
        });
      } catch (e) {}

      // 2. Buat dokumen profil di koleksi 'profiles' (jika sudah ada, lakukan update + perketat permission)
      const matkulPj = nama.includes('Hilmi') ? ['Agama'] : [];
      const profData = {
        nim: nrp,
        nama_lengkap: nama,
        role,
        jabatan,
        bio: `${jabatan} - Kelas Sains Data Terapan A PENS.`,
        minat: ['Data Science', 'Machine Learning'],
        matkul_pj: matkulPj
      };

      const profPerms = [
        'read("any")',
        `update("user:${userId}")`,
        'update("label:admin")',
        'delete("label:admin")'
      ];

      try {
        const docRes = await request(endpoint, apiKey, projectId, `/databases/${databaseId}/collections/profiles/documents`, 'POST', {
          documentId: userId,
          data: profData,
          permissions: profPerms
        });

        if (docRes.status === 409) {
          await request(endpoint, apiKey, projectId, `/databases/${databaseId}/collections/profiles/documents/${userId}`, 'PATCH', {
            data: profData,
            permissions: profPerms
          });
        }
      } catch (docErr) {
        console.log(`\n    [Peringatan Dokumen Profil]: ${docErr.message}`);
        console.log(`    (Akun Auth berhasil dibuat, silakan periksa koleksi 'profiles' di Appwrite)`);
      }

      console.log('✓ Akun & Password Siap');
      credentials.push({ no: i + 1, nrp, username: nrp, nama, role, jabatan, email, password });
    } catch (err) {
      console.log(`! Gagal Auth: ${err.message}`);
      credentials.push({ no: i + 1, nrp, username: nrp, nama, role, jabatan, email, password: `(Gagal: ${err.message})` });
    }
  }

  // Tulis ke berkas CSV
  const csvPath = path.join(__dirname, '..', 'kredensial-mahasiswa-rahasia.csv');
  let csvContent = '\uFEFFNo,Username (NRP),Nama Mahasiswa,Role,Jabatan,Email Login,Kata Sandi Sementara\r\n';
  credentials.forEach((c) => {
    csvContent += `"${c.no}","${c.username}","${c.nama.replace(/"/g, '""')}","${c.role}","${c.jabatan}","${c.email}","${c.password}"\r\n`;
  });

  fs.writeFileSync(csvPath, csvContent, 'utf8');

  console.log('\n========================================================');
  console.log(' PEMBUATAN AKUN SELESAI!');
  console.log('========================================================');
  console.log(`\nBerkas kredensial login telah disimpan di:`);
  console.log(`-> ${csvPath}`);
  console.log('\nPERINGATAN KEAMANAN:');
  console.log('Berkas ini berisi kata sandi sementara akun mahasiswa.');
  console.log('Admin dapat membagikan kredensial ini secara privat kepada masing-masing mahasiswa.');
  console.log('Jangan mempublikasikan berkas ini ke GitHub publik.');

  rl.close();
}

main();
