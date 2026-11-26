// kas.js: Logika frontend fitur Pengelola Kas Kelas Sains Data Terapan A
(function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const initials = (n) => n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const rupiah = (num) => "Rp " + Number(num || 0).toLocaleString("id-ID");
  const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const tanggal = (iso) => {
    try {
      return FORMAT_TANGGAL.format(new Date(iso + "T00:00:00"));
    } catch {
      return iso;
    }
  };

  const STORAGE_KEY = "sdta_kas_state_v3";

  // Memuat state tersimpan atau inisialisasi dari data default
  function getState(kasData, anggotaData) {
    let saved = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (e) {
      console.warn("Gagal membaca kas dari localStorage:", e);
    }

    const mhsList = (anggotaData && anggotaData.data && anggotaData.data.mahasiswa) || [];
    const baseKas = (kasData && kasData.data) || {};

    if (!saved) {
      // Inisialisasi awal model bulanan (Rp15.000 / bulan mulai Sep 2026)
      const iuranInit = Object.assign({}, baseKas.iuranMahasiswa || {});
      mhsList.forEach((nama) => {
        if (iuranInit[nama] === undefined) {
          iuranInit[nama] = 0;
        }
      });

      saved = {
        nominalBulanan: baseKas.nominalBulanan || 15000,
        mulaiPeriode: baseKas.mulaiPeriode || "2026-09",
        targetBulan: baseKas.targetBulan || 3,
        skipBulan: [
          { periode: "2026-12", alasan: "Libur Semester Ganjil" },
          { periode: "2027-01", alasan: "Libur Semester Ganjil" }
        ],
        transaksi: (baseKas.transaksi || []).slice(),
        iuranMahasiswa: iuranInit
      };
    } else {
      saved.nominalBulanan = saved.nominalBulanan || 15000;
      saved.targetBulan = saved.targetBulan || 3;
      saved.skipBulan = saved.skipBulan || [
        { periode: "2026-12", alasan: "Libur Semester Ganjil" },
        { periode: "2027-01", alasan: "Libur Semester Ganjil" }
      ];
      saved.iuranMahasiswa = saved.iuranMahasiswa || {};
      mhsList.forEach((nama) => {
        if (saved.iuranMahasiswa[nama] === undefined) {
          saved.iuranMahasiswa[nama] = 0;
        }
      });
    }

    return saved;
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Gagal menyimpan kas ke localStorage:", e);
    }
  }

  function resetState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  // Tampilkan toast
  function showToast(msg) {
    let toast = document.querySelector("#kas-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "kas-toast";
      toast.className = "kas-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove("show");
    }, 2600);
  }

  // Salin ke papan klip
  function copyText(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg);
      }).catch(() => {
        fallbackCopy(text, successMsg);
      });
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast(successMsg);
    } catch {
      showToast("Gagal menyalin teks.");
    }
    document.body.removeChild(ta);
  }

  const activeTransaksi = (state) => (state.transaksi || []).filter((t) => t.status !== "deleted");

  // Komponen Ringkasan Saldo (Header Kas)
  function renderSummary(state, totalMhs, totalLunas) {
    const active = activeTransaksi(state);
    const totalMasuk = active
      .filter((t) => t.jenis === "masuk")
      .reduce((acc, t) => acc + Number(t.nominal || 0), 0);
    const totalKeluar = active
      .filter((t) => t.jenis === "keluar")
      .reduce((acc, t) => acc + Number(t.nominal || 0), 0);
    const saldo = totalMasuk - totalKeluar;
    const persenLunas = totalMhs ? Math.round((totalLunas / totalMhs) * 100) : 100;
    const nominalBln = state.nominalBulanan || 15000;

    return `
      <div class="kas-summary" aria-label="Ringkasan Kas">
        <div class="kas-card main">
          <span class="kas-card-label">Saldo Kas Saat Ini</span>
          <div class="kas-card-val">${rupiah(saldo)}</div>
          <p class="kas-card-sub">Iuran ${rupiah(nominalBln)} / bulan (Mulai Sep 2026)</p>
        </div>
        <div class="kas-card in">
          <span class="kas-card-label">Total Pemasukan</span>
          <div class="kas-card-val">+${rupiah(totalMasuk)}</div>
          <p class="kas-card-sub">${active.filter((t) => t.jenis === "masuk").length} transaksi</p>
        </div>
        <div class="kas-card out">
          <span class="kas-card-label">Total Pengeluaran</span>
          <div class="kas-card-val">-${rupiah(totalKeluar)}</div>
          <p class="kas-card-sub">${active.filter((t) => t.jenis === "keluar").length} transaksi</p>
        </div>
        <div class="kas-card rate">
          <span class="kas-card-label">Kepatuhan Iuran</span>
          <div class="kas-card-val">${persenLunas}%</div>
          <p class="kas-card-sub">${totalLunas} dari ${totalMhs} mhs lunas</p>
        </div>
      </div>
    `;
  }

  // Komponen Subtabs
  const TABS = [
    { id: "mutasi", label: "Mutasi", sub: "Catatan Kas" },
    { id: "iuran", label: "Iuran", sub: "Mahasiswa" },
    { id: "rekening", label: "Bayar", sub: "Rekening" },
    { id: "laporan", label: "Laporan", sub: "Statistik" }
  ];

  function renderTabs(activeTab) {
    return `
      <div class="kas-tabs tabs" role="tablist" aria-label="Menu Kas">
        ${TABS.map((t) => `
          <button class="tab" role="tab" type="button" data-subtab="${t.id}" data-day="${t.id}"
            id="tab-kas-${t.id}"
            aria-selected="${t.id === activeTab}"
            aria-controls="kas-panel-body"
            tabindex="${t.id === activeTab ? 0 : -1}">
            <span><b>${esc(t.label)}</b><small>${esc(t.sub)}</small></span>
          </button>
        `).join("")}
      </div>
    `;
  }

  // ================= TAB 1: MUTASI TRANSAKSI =================
  function renderTabMutasi(state, canManage = false, mhsList = []) {
    const list = activeTransaksi(state).slice().sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    const appwriteCfg = (window.SDT && window.SDT.appwrite && window.SDT.appwrite.config) || {};
    const hasSyncFunc = Boolean(appwriteCfg.functions && appwriteCfg.functions.kasSyncSheets);

    return `
      <div class="kas-toolbar">
        <div class="kas-chips" role="group" aria-label="Filter transaksi">
          <button type="button" class="kas-chip active" data-filter="semua"><span>Semua</span></button>
          <button type="button" class="kas-chip" data-filter="masuk"><span>Pemasukan (+)</span></button>
          <button type="button" class="kas-chip" data-filter="keluar"><span>Pengeluaran (-)</span></button>
        </div>
        <div class="kas-actions" style="display:flex;gap:.4rem;flex-wrap:wrap;">
          <button type="button" class="kas-btn kas-btn-sm kas-btn-outline" id="btn-refresh-kas" title="Muat ulang data terbaru dari Appwrite">
            <span>↻ Muat Ulang</span>
          </button>
          ${canManage && hasSyncFunc ? `
            <button type="button" class="kas-btn kas-btn-sm kas-btn-outline" id="btn-sync-sheets" title="Sinkronisasi dua arah dengan Google Sheets">
              <span>☁️ Sync Sheets</span>
            </button>
          ` : ""}
          ${canManage ? `
            <button type="button" class="kas-btn kas-btn-primary" id="btn-toggle-form">
              <span>+ Catat Transaksi</span>
            </button>
          ` : ""}
        </div>
      </div>

      <!-- Form Catat / Edit Transaksi (sembunyi bawaan) -->
      ${canManage ? `
        <div class="kas-form-card" id="form-transaksi" style="display:none;" aria-hidden="true">
          <div class="kas-form-head">
            <h3 id="trx-form-title">Catat Transaksi Kas Baru</h3>
            <button type="button" class="kas-btn kas-btn-sm kas-btn-outline" id="btn-batal-form"><span>Tutup</span></button>
          </div>
          <input type="hidden" id="trx-edit-id" value="">
          <div class="kas-form-grid">
            <div class="kas-field">
              <label for="trx-jenis">Jenis Transaksi</label>
              <select class="kas-select" id="trx-jenis">
                <option value="masuk">Pemasukan (+)</option>
                <option value="keluar">Pengeluaran (-)</option>
              </select>
            </div>
            <div class="kas-field">
              <label for="trx-kategori">Kategori</label>
              <select class="kas-select" id="trx-kategori">
                <option value="Iuran Kas">Iuran Kas</option>
                <option value="ATK & Kelas">ATK &amp; Kelas</option>
                <option value="Fotokopi & Modul">Fotokopi &amp; Modul</option>
                <option value="Konsumsi">Konsumsi</option>
                <option value="Sosial & Apresiasi">Sosial &amp; Apresiasi</option>
                <option value="Kegiatan Kelas">Kegiatan Kelas</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div class="kas-field">
              <label for="trx-nominal">Nominal (Rp)</label>
              <input class="kas-input" id="trx-nominal" type="number" min="0" step="500" placeholder="contoh: 15000" required>
            </div>
            <div class="kas-field">
              <label for="trx-tanggal">Tanggal</label>
              <input class="kas-input" id="trx-tanggal" type="date" value="${new Date().toISOString().slice(0, 10)}" required>
            </div>
            <div class="kas-field">
              <label for="trx-mahasiswa">Identitas Mahasiswa (Opsional)</label>
              <select class="kas-select" id="trx-mahasiswa">
                <option value="">-- Umum / Non-Mahasiswa --</option>
                ${mhsList.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("")}
              </select>
            </div>
            <div class="kas-field">
              <label for="trx-ket">Keterangan / Keperluan</label>
              <input class="kas-input" id="trx-ket" type="text" placeholder="contoh: Iuran Kas Sep 2026 / Print kertas" required>
            </div>
          </div>
          <div class="kas-form-foot">
            <button type="button" class="kas-btn kas-btn-primary" id="btn-simpan-trx"><span>Simpan Transaksi</span></button>
          </div>
        </div>
      ` : ""}

      <input class="search" id="cari-trx" type="search" placeholder="Cari keterangan, kategori, atau nama mahasiswa\u2026" autocomplete="off" spellcheck="false">
      ${state.lastSyncError ? `
        <div class="auth-error show" id="kas-sync-alert" style="margin:.6rem 0;">
          <b>Catatan Sinkronisasi:</b> ${esc(state.lastSyncError)}
        </div>
      ` : ""}
      <p class="count" id="count-trx" aria-live="polite">${list.length} transaksi aktif tercatat</p>

      <ul class="kas-trx-list" id="trx-items">
        ${renderTrxItems(list, canManage)}
      </ul>
    `;
  }

  function renderTrxItems(list, canManage = false) {
    if (!list.length) {
      return `<li style="padding: 2rem; text-align: center; color: var(--text-dim);">Tidak ada transaksi yang cocok.</li>`;
    }
    return list.map((t, i) => {
      const isMasuk = t.jenis === "masuk";
      const srcTag = t.source === "sheets" ? `<span class="kas-badge" style="background:rgba(77,251,167,.15);color:#4dfba7;font-size:.6rem;margin-left:.3rem;">Sheets</span>` : "";
      const syncTag = t.appwrite_saved === false
        ? `<span class="kas-badge out" style="font-size:.6rem;margin-left:.3rem;">Lokal (Belum di Cloud)</span>`
        : t.sync_status === "failed"
        ? `<span class="kas-badge out" style="font-size:.6rem;margin-left:.3rem;">Sync Gagal</span>`
        : t.sync_status === "synced"
        ? `<span class="kas-badge in" style="font-size:.6rem;margin-left:.3rem;">Synced</span>`
        : t.sync_status === "pending"
        ? `<span class="kas-badge" style="background:rgba(255,213,79,.15);color:#ffd54f;font-size:.6rem;margin-left:.3rem;">Pending</span>`
        : "";
      return `
        <li class="kas-trx-item ${isMasuk ? 'in' : 'out'}" data-jenis="${esc(t.jenis)}" data-id="${esc(t.id)}" style="--i:${i}">
          <div class="kas-trx-date">
            <span>${tanggal(t.tanggal)}</span>
            <span class="kas-badge ${isMasuk ? 'in' : 'out'}">${isMasuk ? 'Masuk' : 'Keluar'}</span>
          </div>
          <div class="kas-trx-desc">
            <h4>${esc(t.keterangan)}${srcTag}${syncTag}</h4>
            <p>${esc(t.kategori)}${t.mahasiswa_nama ? ` &bull; <b style="color:var(--aqua);">${esc(t.mahasiswa_nama)}</b>` : ""}</p>
          </div>
          <div class="kas-trx-amount ${isMasuk ? 'in' : 'out'}">
            ${isMasuk ? '+' : '-'}${rupiah(t.nominal)}
          </div>
          ${canManage ? `
            <div style="display:flex;gap:.35rem;">
              <button type="button" class="kas-btn-del kas-btn-edit" data-edit="${esc(t.id)}" style="border-color:var(--aqua);color:var(--aqua);" title="Edit transaksi">Edit</button>
              <button type="button" class="kas-btn-del" data-del="${esc(t.id)}" title="Hapus transaksi (soft delete)" aria-label="Hapus transaksi ${esc(t.keterangan)}">Hapus</button>
            </div>
          ` : ""}
        </li>
      `;
    }).join("");
  }

  // ================= TAB 2: IURAN MAHASISWA =================
  function renderTabIuran(state, mhsList, canManage = false) {
    const target = state.targetBulan || 3;
    const nominal = state.nominalBulanan || 15000;
    const targetRp = target * nominal;
    const skipList = state.skipBulan || [];

    return `
      <!-- Bar Kontrol Target Bulan & Skip -->
      <div class="kas-target-bar">
        <div class="kas-target-info">
          <h3>Target Tagihan: ${target} Bulan Aktif (Sep 2026 - Nov 2026)</h3>
          <p>Kewajiban kas per mahasiswa: <b>${rupiah(targetRp)}</b> (${target} bulan \u00d7 ${rupiah(nominal)}/bln)</p>
          ${skipList.length ? `
            <div style="margin-top:.4rem;display:flex;gap:.35rem;flex-wrap:wrap;align-items:center;">
              <small style="font:700 .65rem var(--mono);color:var(--text-dim);text-transform:uppercase;">Bulan Libur (Skip):</small>
              ${skipList.map((s) => `<span class="kas-badge out" style="font-size:.62rem;">${esc(s.periode)} (${esc(s.alasan)})</span>`).join("")}
            </div>
          ` : ""}
        </div>
        <div class="kas-actions">
          ${canManage ? `
            <div class="kas-target-stepper" title="Ubah target bulan kas">
              <button type="button" class="kas-stepper-btn" id="btn-target-dec" aria-label="Kurangi target bulan">&minus;</button>
              <span class="kas-stepper-val" id="val-target-minggu">${target} Bln</span>
              <button type="button" class="kas-stepper-btn" id="btn-target-inc" aria-label="Tambah target bulan">+</button>
            </div>
            <button type="button" class="kas-btn kas-btn-outline" id="btn-toggle-skip-modal">
              <span>🏖️ Atur Skip Bulan</span>
            </button>
          ` : ""}
          <button type="button" class="kas-btn kas-btn-wa" id="btn-salin-wa">
            <span>&#128203; Salin Tagihan WhatsApp</span>
          </button>
        </div>
      </div>

      ${canManage ? `
        <div class="kas-form-card" id="form-skip-box" style="display:none;margin-bottom:1.25rem;" aria-hidden="true">
          <div class="kas-form-head">
            <h3>Pengaturan Bulan Libur / Skip Iuran</h3>
            <button type="button" class="kas-btn kas-btn-sm kas-btn-outline" id="btn-tutup-skip"><span>Tutup</span></button>
          </div>
          <p style="font:500 .8rem var(--sans);color:var(--text-dim);margin:0 0 1rem;">Bulan yang dilewati (misal libur semester) tidak menambah tagihan atau dianggap menunggak.</p>
          <div class="kas-skip-grid">
            <div class="kas-field">
              <label for="sk-periode">Periode (YYYY-MM)</label>
              <input type="text" id="sk-periode" class="kas-input" placeholder="contoh: 2026-12">
            </div>
            <div class="kas-field">
              <label for="sk-alasan">Keterangan / Alasan</label>
              <input type="text" id="sk-alasan" class="kas-input" placeholder="contoh: Libur Semester Ganjil">
            </div>
            <button type="button" class="kas-btn kas-btn-primary" id="btn-tambah-skip" style="height:2.4rem;">
              <span>+ Tambah Skip</span>
            </button>
          </div>
          <div id="skip-items-list" style="display:flex;flex-wrap:wrap;gap:.4rem;">
            ${skipList.map((s, idx) => `
              <span class="kas-badge out" style="display:inline-flex;align-items:center;gap:.4rem;padding:.3rem .6rem;">
                <b>${esc(s.periode)}</b>: ${esc(s.alasan)}
                <button type="button" class="btn-del-skip" data-idx="${idx}" data-id="${esc(s.$id || '')}" style="background:none;border:none;color:#ff8591;cursor:pointer;font-weight:900;" aria-label="Hapus skip ${esc(s.periode)}">&times;</button>
              </span>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <div class="kas-toolbar">
        <div class="kas-chips" role="group" aria-label="Filter status iuran">
          <button type="button" class="kas-chip active" data-filter-iuran="semua"><span>Semua (${mhsList.length})</span></button>
          <button type="button" class="kas-chip" data-filter-iuran="lunas"><span id="chip-lunas-txt">Lunas</span></button>
          <button type="button" class="kas-chip" data-filter-iuran="nunggak"><span id="chip-nunggak-txt">Menunggak</span></button>
        </div>
      </div>

      <input class="search" id="cari-mhs-iuran" type="search" placeholder="Cari nama mahasiswa\u2026" autocomplete="off" spellcheck="false">
      <p class="count" id="count-iuran" aria-live="polite"></p>

      <div class="kas-iuran-grid" id="iuran-grid">
        ${renderIuranCards(state, mhsList, "semua", "", canManage)}
      </div>
    `;
  }

  function renderIuranCards(state, mhsList, filter = "semua", query = "", canManage = false) {
    const target = state.targetBulan || 3;
    const nominal = state.nominalBulanan || 15000;

    const filtered = mhsList.filter((nama) => {
      const bayar = state.iuranMahasiswa[nama] || 0;
      const isLunas = bayar >= target;
      if (filter === "lunas" && !isLunas) return false;
      if (filter === "nunggak" && isLunas) return false;
      if (query && !nama.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });

    if (!filtered.length) {
      return `<div style="grid-column: 1 / -1; padding: 2.5rem 1rem; text-align: center; color: var(--text-dim);" class="empty"><b>Tidak ada data</b><p>Tidak ada mahasiswa dengan kriteria filter yang dipilih.</p></div>`;
    }

    return filtered.map((nama, i) => {
      const bayar = state.iuranMahasiswa[nama] || 0;
      const terbayarRp = bayar * nominal;
      const isLunas = bayar >= target;
      const kurangBulan = Math.max(0, target - bayar);
      const kurangRp = kurangBulan * nominal;
      const persen = Math.min(100, Math.round((bayar / (target || 1)) * 100));

      return `
        <div class="kas-mhs-card ${isLunas ? 'lunas' : 'nunggak'}" style="--i:${i}" data-nama="${esc(nama)}">
          <div class="kas-mhs-head">
            <span class="initial" aria-hidden="true">${initials(nama)}</span>
            <div class="kas-mhs-name" title="${esc(nama)}">${esc(nama)}</div>
            <span class="kas-mhs-status ${isLunas ? 'lunas' : 'nunggak'}">
              ${isLunas ? 'LUNAS' : `KURANG ${rupiah(kurangRp)}`}
            </span>
          </div>

          <div class="kas-mhs-progress">
            <div class="kas-progress-labels">
              <span>Bulan ke-<b>${bayar}</b> dari ${target}</span>
              <span>${rupiah(terbayarRp)} (${persen}%)</span>
            </div>
            <div class="kas-bar-bg" role="progressbar" aria-valuenow="${persen}" aria-valuemin="0" aria-valuemax="100">
              <div class="kas-bar-fill" style="width: ${persen}%"></div>
            </div>
          </div>

          ${canManage ? `
            <div class="kas-mhs-controls">
              <button type="button" class="kas-btn-micro" data-act="dec" data-nama="${esc(nama)}" title="Kurangi 1 bulan bayar">&minus;1</button>
              <button type="button" class="kas-btn-micro" data-act="inc" data-nama="${esc(nama)}" title="Tambah 1 bulan bayar">+1</button>
              <button type="button" class="kas-btn-micro lunas-btn" data-act="lunas" data-nama="${esc(nama)}" title="Tandai langsung lunas">Lunas</button>
            </div>
          ` : ""}
        </div>
      `;
    }).join("");
  }
  // ================= TAB 3: CARA BAYAR & REKENING =================
  function renderTabRekening(kasData) {
    const rekList = (kasData && kasData.data && kasData.data.rekening) || [
      { metode: "BCA", nomor: "8290381928", atasNama: "Rihana Shafira Azzalia", keterangan: "Transfer BCA / Antar-Bank" },
      { metode: "Mandiri", nomor: "1420019283741", atasNama: "Fauzan Aqeelah Ghazi Rabbani", keterangan: "Livin' Mandiri / BI-Fast" },
      { metode: "DANA / GoPay", nomor: "081234567890", atasNama: "Rihana Shafira Azzalia", keterangan: "E-Wallet" }
    ];

    return `
      <!-- Kartu Rekening Bendahara -->
      <div class="kas-rek-grid">
        ${rekList.map((r, i) => `
          <div class="kas-rek-card" style="--i:${i}">
            <div>
              <div class="kas-rek-badge"><span>${esc(r.metode)}</span></div>
              <div class="kas-rek-num">${esc(r.nomor)}</div>
              <p class="kas-rek-holder">a.n ${esc(r.atasNama)}</p>
              <p style="margin:0 0 .8rem; font-size:.78rem; color:var(--text-dim);">${esc(r.keterangan)}</p>
            </div>
            <button type="button" class="kas-btn kas-btn-sm" data-copy-rek="${esc(r.nomor)}" data-metode="${esc(r.metode)}">
              <span>&#128203; Salin Nomor Rekening</span>
            </button>
          </div>
        `).join("")}
      </div>

      <!-- Mockup QRIS Kelas -->
      <div class="kas-qris-card">
        <div class="kas-qris-visual">
          <!-- Stylized Mock QR Code -->
          <svg viewBox="0 0 100 100" fill="currentColor">
            <!-- Frame boxes -->
            <rect x="5" y="5" width="28" height="28" fill="#000"/>
            <rect x="9" y="9" width="20" height="20" fill="#fff"/>
            <rect x="13" y="13" width="12" height="12" fill="#000"/>

            <rect x="67" y="5" width="28" height="28" fill="#000"/>
            <rect x="71" y="9" width="20" height="20" fill="#fff"/>
            <rect x="75" y="13" width="12" height="12" fill="#000"/>

            <rect x="5" y="67" width="28" height="28" fill="#000"/>
            <rect x="9" y="71" width="20" height="20" fill="#fff"/>
            <rect x="13" y="75" width="12" height="12" fill="#000"/>

            <!-- Decorative data dots -->
            <rect x="38" y="8" width="6" height="6" fill="#000"/>
            <rect x="48" y="14" width="6" height="6" fill="#000"/>
            <rect x="56" y="8" width="6" height="6" fill="#000"/>
            <rect x="38" y="24" width="6" height="6" fill="#000"/>
            <rect x="50" y="26" width="8" height="8" fill="#000"/>

            <rect x="8" y="38" width="6" height="6" fill="#000"/>
            <rect x="18" y="44" width="8" height="6" fill="#000"/>
            <rect x="28" y="38" width="6" height="8" fill="#000"/>

            <rect x="40" y="40" width="20" height="20" fill="#0d3fe6"/>
            <rect x="44" y="44" width="12" height="12" fill="#fff"/>
            <rect x="47" y="47" width="6" height="6" fill="#0d3fe6"/>

            <rect x="68" y="40" width="8" height="6" fill="#000"/>
            <rect x="80" y="46" width="12" height="8" fill="#000"/>
            <rect x="70" y="58" width="6" height="8" fill="#000"/>
            <rect x="84" y="60" width="8" height="8" fill="#000"/>

            <rect x="40" y="66" width="6" height="10" fill="#000"/>
            <rect x="50" y="72" width="10" height="8" fill="#000"/>
            <rect x="42" y="84" width="14" height="8" fill="#000"/>
            <rect x="66" y="76" width="10" height="6" fill="#000"/>
            <rect x="80" y="80" width="12" height="12" fill="#000"/>
          </svg>
        </div>
        <div class="kas-qris-info">
          <h3>QRIS Kas Kelas SDTA</h3>
          <p>Dapat dipindai menggunakan seluruh aplikasi Mobile Banking (BCA, Mandiri, BRI, BNI) dan E-Wallet (GoPay, OVO, Dana, ShopeePay).</p>
          <p style="margin-top:.5rem; font:500 .72rem var(--mono); color:var(--aqua);">NMID: ID102026SDTA01 &bull; STANDAR PEMBAYARAN NASIONAL</p>
        </div>
      </div>

      <!-- Petunjuk Pembayaran -->
      <div class="kas-guide-box">
        <h4>Tata Cara &amp; Konfirmasi Pembayaran Kas</h4>
        <ol>
          <li>Pilih salah satu metode transfer di atas (BCA, Mandiri, atau E-Wallet).</li>
          <li>Masukkan nominal sesuai jumlah minggu yang ingin dibayar (contoh: 4 minggu = <code>Rp 20.000</code>).</li>
          <li>Cantumkan berita transfer dengan format: <code>KAS_[NAMA]_[MINGGU]</code> (contoh: <code>KAS_DAVIN_M5-M8</code>).</li>
          <li>Kirimkan bukti transfer / tangkapan layar ke WhatsApp salah satu Bendahara Kelas:
            <ul style="margin:.3rem 0; padding-left:1.2rem; list-style:square;">
              <li><b>Rihana Shafira Azzalia</b> (Bendahara 1)</li>
              <li><b>Fauzan Aqeelah Ghazi Rabbani</b> (Bendahara 2)</li>
            </ul>
          </li>
          <li>Bendahara akan memperbarui status iuran kamu di daftar kas kelas ini.</li>
        </ol>
      </div>
    `;
  }

  // ================= TAB 4: LAPORAN & STATISTIK =================
  function renderTabLaporan(state, mhsList) {
    const active = activeTransaksi(state);
    const target = state.targetBulan || 3;
    const nominal = state.nominalBulanan || 15000;
    const targetPerMhs = target * nominal;
    const totalTargetKelas = mhsList.length * targetPerMhs;

    const totalMasuk = active
      .filter((t) => t.jenis === "masuk")
      .reduce((acc, t) => acc + Number(t.nominal || 0), 0);
    const totalKeluar = active
      .filter((t) => t.jenis === "keluar")
      .reduce((acc, t) => acc + Number(t.nominal || 0), 0);
    const saldo = totalMasuk - totalKeluar;

    // Hitung tunggakan total
    let totalTunggakan = 0;
    mhsList.forEach((nama) => {
      const bayar = state.iuranMahasiswa[nama] || 0;
      if (bayar < target) {
        totalTunggakan += (target - bayar) * nominal;
      }
    });

    // Breakdown per kategori pengeluaran
    const catMap = {};
    active
      .filter((t) => t.jenis === "keluar")
      .forEach((t) => {
        const cat = t.kategori || "Lainnya";
        catMap[cat] = (catMap[cat] || 0) + Number(t.nominal || 0);
      });

    const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    return `
      <div class="kas-stats-section">
        <!-- Rincian Pengeluaran per Kategori -->
        <div class="kas-stats-card">
          <h3>Distribusi Pengeluaran Kas</h3>
          ${categories.length ? `
            <div class="kas-cat-bars">
              ${categories.map(([cat, amount]) => {
                const pct = totalKeluar > 0 ? Math.round((amount / totalKeluar) * 100) : 0;
                return `
                  <div class="kas-cat-row">
                    <div class="kas-cat-head">
                      <b>${esc(cat)}</b>
                      <span>${rupiah(amount)} (${pct}%)</span>
                    </div>
                    <div class="kas-cat-bar-bg">
                      <div class="kas-cat-bar-fill" style="width: ${pct}%"></div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          ` : `<p style="color:var(--text-dim); margin:0;">Belum ada pengeluaran kas yang tercatat.</p>`}
        </div>

        <!-- Tabel Ringkasan Finansial -->
        <div class="kas-stats-card">
          <h3>Ringkasan Akuntansi Kelas</h3>
          <table class="kas-summary-table">
            <tbody>
              <tr>
                <td>Total Pemasukan Kas</td>
                <td style="color:#4dfba7;">+${rupiah(totalMasuk)}</td>
              </tr>
              <tr>
                <td>Total Pengeluaran Kas</td>
                <td style="color:#ff8591;">-${rupiah(totalKeluar)}</td>
              </tr>
              <tr>
                <td>Saldo Bersih Kas Saat Ini</td>
                <td style="color:var(--aqua); font-size:1.05rem;">${rupiah(saldo)}</td>
              </tr>
              <tr>
                <td>Target Kas Terkumpul (Bln 1 - Bln ${target})</td>
                <td>${rupiah(totalTargetKelas)}</td>
              </tr>
              <tr>
                <td>Total Tunggakan Iuran Mahasiswa</td>
                <td style="color:#ffb3ba;">${rupiah(totalTunggakan)}</td>
              </tr>
              <tr>
                <td>Estimasi Saldo jika Seluruh Mahasiswa Lunas</td>
                <td>${rupiah(saldo + totalTunggakan)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Aksi Manajemen & Ekspor -->
        <div class="kas-stats-card" style="display:flex; flex-wrap:wrap; gap:.75rem; justify-content:space-between; align-items:center;">
          <div>
            <h4 style="margin:0 0 .25rem; font:italic 900 1rem var(--display); text-transform:uppercase; color:var(--paper);">Ekspor &amp; Cadangan Data</h4>
            <p style="margin:0; font-size:.8rem; color:var(--text-dim);">Unduh berkas laporan format CSV untuk Excel atau Google Sheets.</p>
          </div>
          <div style="display:flex; gap:.6rem; flex-wrap:wrap;">
            <button type="button" class="kas-btn" id="btn-ekspor-csv">
              <span>&#128229; Unduh Laporan CSV</span>
            </button>
            <button type="button" class="kas-btn kas-btn-outline" id="btn-reset-data" style="border-color:rgba(255,32,51,.5); color:#ff8591;">
              <span>&#128257; Reset ke Data Bawaan</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ================= GENERATOR FORMAT WHATSAPP =================
  function generateWaRecap(state, mhsList) {
    const active = activeTransaksi(state);
    const target = state.targetBulan || 3;
    const nominal = state.nominalBulanan || 15000;
    const targetRp = target * nominal;

    const totalMasuk = active
      .filter((t) => t.jenis === "masuk")
      .reduce((acc, t) => acc + Number(t.nominal || 0), 0);
    const totalKeluar = active
      .filter((t) => t.jenis === "keluar")
      .reduce((acc, t) => acc + Number(t.nominal || 0), 0);
    const saldo = totalMasuk - totalKeluar;

    const tunggakanList = [];
    let lunasCount = 0;

    mhsList.forEach((nama) => {
      const bayar = state.iuranMahasiswa[nama] || 0;
      if (bayar >= target) {
        lunasCount++;
      } else {
        const kurang = target - bayar;
        tunggakanList.push({
          nama,
          kurang,
          kurangRp: kurang * nominal,
          terbayar: bayar
        });
      }
    });

    let text = `📢 *REKAP KAS KELAS SAINS DATA TERAPAN A*\n`;
    text += `🗓️ Target: *Bulan ke-${target} (Mulai Sep 2026)* (${rupiah(targetRp)} / orang)\n`;
    text += `💰 Saldo Kas Saat Ini: *${rupiah(saldo)}*\n`;
    text += `✅ Mahasiswa Lunas: *${lunasCount} dari ${mhsList.length} orang*\n\n`;

    if (tunggakanList.length === 0) {
      text += `🎉 *Luar biasa! Seluruh mahasiswa sudah lunas sampai Bulan ke-${target}!* 🥳\n\n`;
    } else {
      text += `⚠️ *DAFTAR MAHASISWA MENUNGGAK (${tunggakanList.length} orang):*\n`;
      tunggakanList.forEach((m, idx) => {
        text += `${idx + 1}. *${m.nama}* (Kurang ${m.kurang} bln \u2192 *${rupiah(m.kurangRp)}*)\n`;
      });
      text += `\n`;
    }

    text += `💳 *METODE PEMBAYARAN:*\n`;
    text += `\u2022 BCA: *8290381928* (a.n Rihana Shafira Azzalia)\n`;
    text += `\u2022 Mandiri: *1420019283741* (a.n Fauzan Aqeelah Ghazi Rabbani)\n`;
    text += `\u2022 DANA/GoPay: *081234567890* (a.n Rihana Shafira Azzalia)\n\n`;
    text += `📌 *Catatan:* Cantumkan berita \`KAS_[NAMA]_[BULAN]\` dan kirimkan bukti transfer ke WhatsApp Bendahara ya. Terima kasih banyak atas kerjasamanya! 🙏✨`;

    return text;
  }

  // ================= GENERATOR CSV =================
  function generateCsv(state, mhsList) {
    const target = state.targetBulan || 3;
    const nominal = state.nominalBulanan || 15000;

    let csv = "LAPORAN KAS SAINS DATA TERAPAN A\r\n";
    csv += `Tanggal Unduh,${new Date().toISOString().slice(0, 10)}\r\n\r\n`;

    csv += "BAGIAN 1: MUTASI TRANSAKSI\r\n";
    csv += "ID Transaksi,Tanggal,Jenis,Kategori,Mahasiswa,Keterangan,Nominal,Sumber,Updated At\r\n";
    activeTransaksi(state).forEach((t) => {
      const nom = (t.jenis === "keluar" ? "-" : "+") + t.nominal;
      const txId = t.transaction_id || t.id;
      const mhs = (t.mahasiswa_nama || "").replace(/"/g, '""');
      csv += `"${txId}","${t.tanggal}","${t.jenis}","${t.kategori}","${mhs}","${t.keterangan.replace(/"/g, '""')}","${nom}","${t.source || 'website'}","${t.updated_at || ''}"\r\n`;
    });

    csv += "\r\nBAGIAN 2: STATUS IURAN MAHASISWA\r\n";
    csv += `Nama Mahasiswa,Bulan Terbayar,Target Bulan,Nominal Terbayar,Sisa Tunggakan,Status\r\n`;
    mhsList.forEach((nama) => {
      const bayar = state.iuranMahasiswa[nama] || 0;
      const terbayarRp = bayar * nominal;
      const sisaBulan = Math.max(0, target - bayar);
      const sisaRp = sisaBulan * nominal;
      const status = bayar >= target ? "LUNAS" : "MENUNGGAK";
      csv += `"${nama.replace(/"/g, '""')}",${bayar},${target},${terbayarRp},${sisaRp},"${status}"\r\n`;
    });

    return csv;
  }

  // ================= MAIN FUNCTION: panelKas =================
  function panelKas(data, subtab = "mutasi", rerender) {
    if (data.kas && data.kas.error) {
      return window.SDT.gagal(data.kas.error);
    }

    const mhsList = (data.anggota && data.anggota.data && data.anggota.data.mahasiswa) || [];
    const state = getState(data.kas, data.anggota);
    const auth = window.SDT && window.SDT.auth;
    const canManage = Boolean(auth && (auth.hasRole("admin") || (auth.canManageCash && auth.canManageCash())));

    // Hitung status lunas untuk ringkasan
    let totalLunas = 0;
    const targetBln = state.targetBulan || 3;
    mhsList.forEach((n) => {
      if ((state.iuranMahasiswa[n] || 0) >= targetBln) totalLunas++;
    });

    const activeTab = ["mutasi", "iuran", "rekening", "laporan"].includes(subtab) ? subtab : "mutasi";

    let tabHtml = "";
    if (activeTab === "mutasi") {
      tabHtml = renderTabMutasi(state, canManage, mhsList);
    } else if (activeTab === "iuran") {
      tabHtml = renderTabIuran(state, mhsList, canManage);
    } else if (activeTab === "rekening") {
      tabHtml = renderTabRekening(data.kas);
    } else if (activeTab === "laporan") {
      tabHtml = renderTabLaporan(state, mhsList);
    }

    const html = `
      ${renderSummary(state, mhsList.length, totalLunas)}
      ${renderTabs(activeTab)}
      <div role="tabpanel" id="kas-panel-body" aria-labelledby="tab-kas-${activeTab}">
        ${tabHtml}
      </div>
    `;

    return {
      sub: "Pengelola kas dan iuran kelas",
      html,
      after(body) {
        const services = window.SDT && window.SDT.services;
        const appwrite = window.SDT && window.SDT.appwrite;
        window.SDT._kasActiveTab = activeTab;
        window.SDT._kasRerender = rerender;
        window.SDT._kasDefaultData = data;

        const pullLatestFromAppwrite = () => {
          if (!services) return Promise.resolve(false);
          const curState = getState(
            (window.SDT._kasDefaultData && window.SDT._kasDefaultData.kas) || data.kas,
            (window.SDT._kasDefaultData && window.SDT._kasDefaultData.anggota) || data.anggota
          );
          return Promise.all([
            services.listCashTransactions(),
            services.listCashMonthSettings(),
            services.listCashPayments()
          ]).then(([trxDocs, skipDocs, payDocs]) => {
            let changed = false;
            if (Array.isArray(payDocs) && payDocs.length > 0) {
              const nomBln = curState.nominalBulanan || 15000;
              payDocs.forEach((p) => {
                if (p.user_id && p.periode_bulan === "TOTAL") {
                  curState.iuranMahasiswa[p.user_id] = Math.round(Number(p.nominal_dibayar || 0) / nomBln);
                  changed = true;
                }
              });
            }
            if (Array.isArray(trxDocs) && trxDocs.length > 0) {
              // Pertahankan transaksi lokal yang belum sempat tersimpan ke Cloud agar tidak hilang saat Muat Ulang
              const unsavedLocal = (curState.transaksi || []).filter((t) => t.appwrite_saved === false);
              const cloudTxs = trxDocs.map((d) => ({
                id: d.$id,
                transaction_id: d.transaction_id || d.$id,
                tanggal: d.tanggal,
                jenis: d.jenis,
                kategori: d.kategori,
                nominal: d.nominal,
                keterangan: d.keterangan,
                mahasiswa_nama: d.mahasiswa_nama || "",
                status: d.status || "aktif",
                source: d.source || "website",
                updated_at: d.updated_at || d.$updatedAt || "",
                sync_status: d.sync_status || "synced",
                appwrite_saved: true
              }));
              const merged = [...cloudTxs];
              unsavedLocal.forEach((loc) => {
                if (!merged.some((c) => c.transaction_id === loc.transaction_id || c.id === loc.id)) {
                  merged.unshift(loc);
                }
              });
              curState.transaksi = merged;

              // Rekonsiliasi hitung bulan iuran dari transaksi Iuran Kas aktif (termasuk centang/hapus centang dari Sheet1)
              const nomBln = curState.nominalBulanan || 15000;
              const iuranTotals = {};
              merged.forEach((t) => {
                if (t.mahasiswa_nama && (t.kategori === "Iuran Kas" || String(t.transaction_id || "").startsWith("iuran-"))) {
                  if (iuranTotals[t.mahasiswa_nama] === undefined) {
                    iuranTotals[t.mahasiswa_nama] = 0;
                  }
                  if (t.status !== "deleted" && t.jenis === "masuk") {
                    iuranTotals[t.mahasiswa_nama] += Number(t.nominal || 0);
                  }
                }
              });
              Object.entries(iuranTotals).forEach(([nama, totalRp]) => {
                curState.iuranMahasiswa[nama] = Math.round(totalRp / nomBln);
              });
              changed = true;
            }
            if (Array.isArray(skipDocs) && skipDocs.length > 0) {
              curState.skipBulan = skipDocs.filter((s) => s.is_skipped !== false).map((s) => ({
                $id: s.$id,
                periode: s.periode_bulan,
                alasan: s.alasan || "Libur Semester"
              }));
              changed = true;
            }
            if (changed) {
              saveState(curState);
              const formCardEl = document.getElementById("form-transaksi");
              const formOpen = Boolean(formCardEl && formCardEl.style.display !== "none");
              if (!formOpen && document.getElementById("kas-panel-body") && typeof window.SDT._kasRerender === "function") {
                window.SDT._kasRerender(window.SDT._kasActiveTab || "mutasi");
              }
            }
            return changed;
          }).catch(() => false);
        };

        // Sinkronisasi awal saat panel Kas dibuka (sekali per sesi)
        if (services && !window.SDT._kasSynced) {
          window.SDT._kasSynced = true;
          pullLatestFromAppwrite();
        }

        // Appwrite Realtime: otomatis perbarui tampilan web saat ada perubahan dari Google Sheets / admin lain
        if (appwrite && appwrite.client && typeof appwrite.client.subscribe === "function" && !window.SDT._kasRealtimeUnsub) {
          try {
            const dbId = (appwrite.config && appwrite.config.databaseId) || "sdta_db";
            const colId = (appwrite.config && appwrite.config.collections && appwrite.config.collections.cash_transactions) || "cash_transactions";
            let rtTimer = null;
            window.SDT._kasRealtimeUnsub = appwrite.client.subscribe(
              `databases.${dbId}.collections.${colId}.documents`,
              (response) => {
                const payload = response && response.payload;
                // Abaikan patch status internal ('synced' dari website) agar tidak rerender ganda
                if (payload && payload.source === "website" && payload.sync_status === "synced") return;
                clearTimeout(rtTimer);
                rtTimer = setTimeout(() => {
                  pullLatestFromAppwrite();
                }, 450);
              }
            );
          } catch (rtErr) {
            console.warn("Realtime kas subscribe dilewati:", rtErr);
          }
        }

        // Pasang event listener ganti tab
        const tabBtns = body.querySelectorAll(".kas-tabs .tab");
        tabBtns.forEach((btn, i) => {
          btn.addEventListener("click", () => rerender(btn.dataset.subtab));
          btn.addEventListener("keydown", (e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            const nextIdx = (i + (e.key === "ArrowRight" ? 1 : -1) + tabBtns.length) % tabBtns.length;
            rerender(tabBtns[nextIdx].dataset.subtab);
          });
        });

        // ----------------- TAB: MUTASI -----------------
        if (activeTab === "mutasi") {
          const btnToggle = body.querySelector("#btn-toggle-form");
          const formCard = body.querySelector("#form-transaksi");
          const formTitle = body.querySelector("#trx-form-title");
          const editIdInput = body.querySelector("#trx-edit-id");
          const btnBatal = body.querySelector("#btn-batal-form");
          const btnSimpan = body.querySelector("#btn-simpan-trx");
          const btnRefresh = body.querySelector("#btn-refresh-kas");
          const btnSyncSheets = body.querySelector("#btn-sync-sheets");
          const cariInput = body.querySelector("#cari-trx");
          const chipBtns = body.querySelectorAll(".kas-chips .kas-chip");
          const trxItemsContainer = body.querySelector("#trx-items");
          const countTrx = body.querySelector("#count-trx");

          let currentFilter = "semua";

          if (btnRefresh && services) {
            btnRefresh.addEventListener("click", () => {
              window.SDT._kasSynced = false;
              showToast("Memuat data kas terbaru dari Appwrite...");
              rerender("mutasi");
            });
          }

          if (btnSyncSheets && services && services.invokeKasSync) {
            btnSyncSheets.addEventListener("click", async () => {
              btnSyncSheets.disabled = true;
              btnSyncSheets.querySelector("span").textContent = "Menyinkronkan...";
              try {
                const pullRes = await services.invokeKasSync("pull_from_sheets");
                const pushRes = await services.invokeKasSync("push_all");
                if (pullRes.skipped || pushRes.skipped) {
                  showToast("Appwrite Function kasSyncSheets belum dikonfigurasi.");
                } else {
                  window.SDT._kasSynced = false;
                  showToast(`Sync selesai (+${pullRes.createdCount || 0} baru, ~${pullRes.updatedCount || 0} ubah dari Sheets).`);
                  rerender("mutasi");
                }
              } catch (err) {
                showToast("Gagal sinkronisasi Sheets: " + err.message);
              } finally {
                btnSyncSheets.disabled = false;
                btnSyncSheets.querySelector("span").textContent = "☁️ Sync Sheets";
              }
            });
          }

          if (btnToggle && formCard) {
            btnToggle.addEventListener("click", () => {
              const open = formCard.style.display !== "none";
              if (open) {
                formCard.style.display = "none";
                formCard.setAttribute("aria-hidden", "true");
                btnToggle.querySelector("span").textContent = "+ Catat Transaksi";
              } else {
                if (editIdInput) editIdInput.value = "";
                if (formTitle) formTitle.textContent = "Catat Transaksi Kas Baru";
                if (body.querySelector("#trx-mahasiswa")) body.querySelector("#trx-mahasiswa").value = "";
                if (body.querySelector("#trx-nominal")) body.querySelector("#trx-nominal").value = "";
                if (body.querySelector("#trx-ket")) body.querySelector("#trx-ket").value = "";
                formCard.style.display = "block";
                formCard.setAttribute("aria-hidden", "false");
                btnToggle.querySelector("span").textContent = "Tutup Formulir";
                setTimeout(() => body.querySelector("#trx-nominal")?.focus(), 50);
              }
            });
          }

          if (btnBatal && formCard && btnToggle) {
            btnBatal.addEventListener("click", () => {
              if (editIdInput) editIdInput.value = "";
              formCard.style.display = "none";
              formCard.setAttribute("aria-hidden", "true");
              btnToggle.querySelector("span").textContent = "+ Catat Transaksi";
            });
          }

          if (btnSimpan) {
            btnSimpan.addEventListener("click", async () => {
              const editId = editIdInput ? editIdInput.value.trim() : "";
              const jenis = body.querySelector("#trx-jenis").value;
              const kategori = body.querySelector("#trx-kategori").value;
              const nominal = Number(body.querySelector("#trx-nominal").value);
              const tanggalVal = body.querySelector("#trx-tanggal").value;
              const mhsNama = (body.querySelector("#trx-mahasiswa")?.value || "").trim();
              const keterangan = (body.querySelector("#trx-ket").value || "").trim();

              if (Number.isNaN(nominal) || nominal <= 0) {
                alert("Harap masukkan nominal transaksi yang valid.");
                body.querySelector("#trx-nominal").focus();
                return;
              }
              if (!keterangan) {
                alert("Harap isi keterangan keperluan transaksi.");
                body.querySelector("#trx-ket").focus();
                return;
              }

              const nowIso = new Date().toISOString();
              btnSimpan.disabled = true;

              if (editId) {
                const existingItem = state.transaksi.find((x) => x.id === editId);
                const txId = (existingItem && existingItem.transaction_id) || editId;
                const updatedPayload = {
                  transaction_id: txId,
                  tanggal: tanggalVal || new Date().toISOString().slice(0, 10),
                  jenis,
                  kategori,
                  nominal,
                  keterangan,
                  mahasiswa_nama: mhsNama,
                  status: "aktif",
                  source: "website",
                  updated_at: nowIso,
                  sync_status: "pending"
                };

                state.lastSyncError = "";
                try {
                  if (services && services.updateCashTransaction) {
                    const updated = await services.updateCashTransaction(editId, updatedPayload);
                    updatedPayload.appwrite_saved = true;
                    if (updated && updated._legacySchemaFallback) {
                      state.lastSyncError = "Kolom sync di Appwrite belum diperbarui. Jalankan: node scripts/setup-appwrite.js";
                    }
                    services.logActivity("kas", "update_transaction", `${txId}: ${rupiah(nominal)} - ${keterangan}`);
                    const syncRes = await services.invokeKasSync("push_transaction", { transaction: updatedPayload });
                    if (syncRes && syncRes.ok) updatedPayload.sync_status = "synced";
                  }
                } catch (err) {
                  if (updatedPayload.appwrite_saved !== true) updatedPayload.appwrite_saved = false;
                  updatedPayload.sync_status = "failed";
                  state.lastSyncError = err.message;
                  showToast("Gagal sinkronisasi: " + err.message);
                }

                if (existingItem) Object.assign(existingItem, updatedPayload);
                saveState(state);
                showToast(updatedPayload.appwrite_saved === false ? "Disimpan lokal (gagal simpan ke Appwrite)." : "Transaksi berhasil diperbarui!");
                rerender("mutasi");
                return;
              }

              const txId = `trx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
              const newTrx = {
                id: txId,
                transaction_id: txId,
                tanggal: tanggalVal || new Date().toISOString().slice(0, 10),
                jenis,
                kategori,
                nominal,
                keterangan,
                mahasiswa_nama: mhsNama,
                status: "aktif",
                source: "website",
                updated_at: nowIso,
                sync_status: "pending",
                appwrite_saved: true
              };

              state.lastSyncError = "";
              let savedToAppwrite = false;
              try {
                if (services && services.createCashTransaction) {
                  const created = await services.createCashTransaction(newTrx);
                  if (created && created.$id) {
                    newTrx.id = created.$id;
                    savedToAppwrite = true;
                  }
                  if (created && created._legacySchemaFallback) {
                    state.lastSyncError = "Atribut sync Appwrite belum lengkap. Jalankan: node scripts/setup-appwrite.js";
                  }
                  services.logActivity("kas", "create_transaction", `${jenis}: ${rupiah(nominal)} - ${keterangan}`);
                  const syncRes = await services.invokeKasSync("push_transaction", { transaction: newTrx });
                  if (syncRes && syncRes.ok) newTrx.sync_status = "synced";
                }
              } catch (err) {
                newTrx.appwrite_saved = savedToAppwrite;
                newTrx.sync_status = "failed";
                state.lastSyncError = (savedToAppwrite ? "Tersimpan di Appwrite, namun sync ke Sheets gagal: " : "Gagal simpan ke Appwrite: ") + err.message;
                showToast(state.lastSyncError);
              }

              state.transaksi.unshift(newTrx);
              saveState(state);
              if (!state.lastSyncError) showToast("Transaksi berhasil dicatat!");
              rerender("mutasi");
            });
          }

          // Pasang filter chip
          const applyFilter = () => {
            const q = (cariInput?.value || "").toLowerCase().trim();
            const active = activeTransaksi(state);
            const filtered = active.filter((t) => {
              if (currentFilter === "masuk" && t.jenis !== "masuk") return false;
              if (currentFilter === "keluar" && t.jenis !== "keluar") return false;
              if (q && !t.keterangan.toLowerCase().includes(q) && !t.kategori.toLowerCase().includes(q) && !(t.mahasiswa_nama || "").toLowerCase().includes(q)) return false;
              return true;
            });
            if (trxItemsContainer) trxItemsContainer.innerHTML = renderTrxItems(filtered, canManage);
            if (countTrx) countTrx.textContent = `${filtered.length} dari ${active.length} transaksi aktif`;
            pasangTrxRowActions();
          };

          chipBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
              chipBtns.forEach((b) => b.classList.remove("active"));
              btn.classList.add("active");
              currentFilter = btn.dataset.filter;
              applyFilter();
            });
          });

          if (cariInput) {
            cariInput.addEventListener("input", applyFilter);
          }

          const pasangTrxRowActions = () => {
            body.querySelectorAll(".kas-btn-edit").forEach((btn) => {
              btn.addEventListener("click", () => {
                const id = btn.dataset.edit;
                const item = state.transaksi.find((x) => x.id === id);
                if (!item || !formCard) return;
                if (editIdInput) editIdInput.value = item.id;
                if (formTitle) formTitle.textContent = "Edit Transaksi Kas";
                body.querySelector("#trx-jenis").value = item.jenis || "masuk";
                body.querySelector("#trx-kategori").value = item.kategori || "Lainnya";
                body.querySelector("#trx-nominal").value = item.nominal || 0;
                body.querySelector("#trx-tanggal").value = item.tanggal || "";
                if (body.querySelector("#trx-mahasiswa")) body.querySelector("#trx-mahasiswa").value = item.mahasiswa_nama || "";
                body.querySelector("#trx-ket").value = item.keterangan || "";
                formCard.style.display = "block";
                formCard.setAttribute("aria-hidden", "false");
                formCard.scrollIntoView({ behavior: "smooth" });
              });
            });

            body.querySelectorAll(".kas-btn-del:not(.kas-btn-edit)").forEach((btn) => {
              btn.addEventListener("click", async () => {
                const id = btn.dataset.del;
                const item = state.transaksi.find((x) => x.id === id);
                if (!item) return;
                if (confirm(`Hapus catatan transaksi (soft delete): "${item.keterangan}" (${rupiah(item.nominal)})?`)) {
                  const nowIso = new Date().toISOString();
                  item.status = "deleted";
                  item.source = "website";
                  item.updated_at = nowIso;
                  try {
                    if (services && services.softDeleteCashTransaction) {
                      await services.softDeleteCashTransaction(id);
                      services.logActivity("kas", "soft_delete_transaction", `${item.transaction_id || id}: ${item.keterangan}`);
                      await services.invokeKasSync("push_transaction", {
                        transaction: {
                          transaction_id: item.transaction_id || id,
                          tanggal: item.tanggal,
                          jenis: item.jenis,
                          kategori: item.kategori,
                          nominal: item.nominal,
                          keterangan: item.keterangan,
                          mahasiswa_nama: item.mahasiswa_nama || "",
                          status: "deleted",
                          source: "website",
                          updated_at: nowIso
                        }
                      });
                    }
                  } catch (err) {
                    console.warn("Gagal soft-delete di Appwrite/Sheets:", err);
                  }
                  saveState(state);
                  showToast("Transaksi ditandai terhapus (soft delete).");
                  rerender("mutasi");
                }
              });
            });
          };
          pasangTrxRowActions();
        }

        // ----------------- TAB: IURAN -----------------
        if (activeTab === "iuran") {
          const btnDec = body.querySelector("#btn-target-dec");
          const btnInc = body.querySelector("#btn-target-inc");
          const btnSalinWa = body.querySelector("#btn-salin-wa");
          const btnToggleSkip = body.querySelector("#btn-toggle-skip-modal");
          const btnTutupSkip = body.querySelector("#btn-tutup-skip");
          const formSkipBox = body.querySelector("#form-skip-box");
          const btnTambahSkip = body.querySelector("#btn-tambah-skip");
          const cariInput = body.querySelector("#cari-mhs-iuran");
          const chipBtns = body.querySelectorAll(".kas-chips .kas-chip");
          const grid = body.querySelector("#iuran-grid");
          const countIuran = body.querySelector("#count-iuran");

          if (btnToggleSkip && formSkipBox) {
            btnToggleSkip.addEventListener("click", () => {
              const open = formSkipBox.style.display !== "none";
              formSkipBox.style.display = open ? "none" : "block";
              formSkipBox.setAttribute("aria-hidden", String(open));
            });
          }
          if (btnTutupSkip && formSkipBox) {
            btnTutupSkip.addEventListener("click", () => {
              formSkipBox.style.display = "none";
              formSkipBox.setAttribute("aria-hidden", "true");
            });
          }
          if (btnTambahSkip) {
            btnTambahSkip.addEventListener("click", async () => {
              const periode = (body.querySelector("#sk-periode")?.value || "").trim();
              const alasan = (body.querySelector("#sk-alasan")?.value || "").trim() || "Libur Semester";
              if (!/^\d{4}-\d{2}$/.test(periode)) {
                alert("Format periode harus YYYY-MM, contoh: 2026-12");
                return;
              }
              const entry = { periode, alasan };
              try {
                if (services && services.createCashMonthSetting) {
                  const doc = await services.createCashMonthSetting(periode, alasan);
                  if (doc && doc.$id) entry.$id = doc.$id;
                }
              } catch (err) {
                console.warn("Skip bulan sync:", err);
              }
              state.skipBulan = state.skipBulan || [];
              if (!state.skipBulan.some((x) => x.periode === periode)) {
                state.skipBulan.push(entry);
              }
              saveState(state);
              showToast(`Bulan ${periode} ditandai sebagai libur (skip).`);
              rerender("iuran");
            });
          }
          body.querySelectorAll(".btn-del-skip").forEach((b) => {
            b.addEventListener("click", async () => {
              const idx = Number(b.dataset.idx);
              const docId = b.dataset.id;
              try {
                if (services && services.deleteCashMonthSetting && docId) {
                  await services.deleteCashMonthSetting(docId);
                }
              } catch {}
              state.skipBulan.splice(idx, 1);
              saveState(state);
              showToast("Aturan skip bulan dihapus.");
              rerender("iuran");
            });
          });

          let currentFilter = "semua";

          // Perbarui hitungan badge chip
          const updateCounts = () => {
            const target = state.targetBulan || 3;
            let lunas = 0, nunggak = 0;
            mhsList.forEach((nama) => {
              const b = state.iuranMahasiswa[nama] || 0;
              if (b >= target) lunas++; else nunggak++;
            });
            const chipLunas = body.querySelector("#chip-lunas-txt");
            const chipNunggak = body.querySelector("#chip-nunggak-txt");
            if (chipLunas) chipLunas.textContent = `Lunas (${lunas})`;
            if (chipNunggak) chipNunggak.textContent = `Menunggak (${nunggak})`;
            if (countIuran) {
              const q = (cariInput?.value || "").trim();
              countIuran.textContent = q ? `Menampilkan hasil pencarian "${q}"` : `${mhsList.length} mahasiswa kelas SDTA`;
            }
          };
          updateCounts();

          const applyIuranFilter = () => {
            const q = (cariInput?.value || "").trim();
            if (grid) {
              grid.innerHTML = renderIuranCards(state, mhsList, currentFilter, q, canManage);
              pasangMhsControls();
            }
            updateCounts();
          };

          chipBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
              chipBtns.forEach((b) => b.classList.remove("active"));
              btn.classList.add("active");
              currentFilter = btn.dataset.filterIuran;
              applyIuranFilter();
            });
          });

          if (cariInput) {
            cariInput.addEventListener("input", applyIuranFilter);
          }

          // Stepper Target Bulan
          if (btnDec) {
            btnDec.addEventListener("click", () => {
              if (state.targetBulan > 1) {
                state.targetBulan -= 1;
                saveState(state);
                rerender("iuran");
              }
            });
          }
          if (btnInc) {
            btnInc.addEventListener("click", () => {
              if (state.targetBulan < 24) {
                state.targetBulan += 1;
                saveState(state);
                rerender("iuran");
              }
            });
          }

          // Salin format WA
          if (btnSalinWa) {
            btnSalinWa.addEventListener("click", () => {
              const waText = generateWaRecap(state, mhsList);
              copyText(waText, "Format tagihan WhatsApp berhasil disalin!");
            });
          }

          // Pasang tombol kontrol mahasiswa (+1, -1, Lunas) -> sinkron juga dengan checkbox Sheet1
          const MONTH_SERIES = [
            { periode: "2026-09", label: "Sep 2026" },
            { periode: "2026-10", label: "Okt 2026" },
            { periode: "2026-11", label: "Nov 2026" },
            { periode: "2026-12", label: "Des 2026" },
            { periode: "2027-01", label: "Jan 2027" },
            { periode: "2027-02", label: "Feb 2027" },
            { periode: "2027-03", label: "Mar 2027" },
            { periode: "2027-04", label: "Apr 2027" },
            { periode: "2027-05", label: "Mei 2027" }
          ];
          const pasangMhsControls = () => {
            body.querySelectorAll(".kas-btn-micro").forEach((btn) => {
              btn.addEventListener("click", async () => {
                const act = btn.dataset.act;
                const nama = btn.dataset.nama;
                const target = state.targetBulan || 3;
                const prevVal = state.iuranMahasiswa[nama] || 0;
                let val = prevVal;

                if (act === "inc") val = Math.min(MONTH_SERIES.length, val + 1);
                else if (act === "dec") val = Math.max(0, val - 1);
                else if (act === "lunas") val = target;

                state.iuranMahasiswa[nama] = val;
                saveState(state);

                const nomBln = state.nominalBulanan || 15000;
                const mhsIdx = mhsList.indexOf(nama);
                const nrp = mhsIdx >= 0 ? String(3326600001 + mhsIdx) : "";

                if (services && services.upsertCashPayment) {
                  services.upsertCashPayment(
                    nama,
                    "TOTAL",
                    val * nomBln,
                    val >= target ? "lunas" : "belum_bayar"
                  ).catch(() => {});
                }

                // Sinkronkan perubahan bulan ke cash_transactions (iuran-<nrp>-<periode>) agar checkbox Sheet1 ikut berubah
                if (nrp && services && services.upsertCashTransaction) {
                  const nowIso = new Date().toISOString();
                  const minM = Math.min(prevVal, val);
                  const maxM = Math.max(prevVal, val);
                  for (let idx = minM; idx < maxM && idx < MONTH_SERIES.length; idx++) {
                    const mInfo = MONTH_SERIES[idx];
                    const txId = `iuran-${nrp}-${mInfo.periode}`;
                    const isActive = idx < val;
                    const txPayload = {
                      id: txId,
                      transaction_id: txId,
                      tanggal: `${mInfo.periode}-01`,
                      jenis: "masuk",
                      kategori: "Iuran Kas",
                      nominal: nomBln,
                      keterangan: `Iuran Kas - ${nama} (${mInfo.label})`,
                      mahasiswa_nama: nama,
                      status: isActive ? "aktif" : "deleted",
                      source: "website",
                      updated_at: nowIso,
                      sync_status: "pending"
                    };
                    const localIdx = state.transaksi.findIndex((t) => t.transaction_id === txId || t.id === txId);
                    if (localIdx >= 0) Object.assign(state.transaksi[localIdx], txPayload);
                    else state.transaksi.unshift(txPayload);
                    services.upsertCashTransaction(txPayload)
                      .then(() => services.invokeKasSync && services.invokeKasSync("push_transaction", { transaction: txPayload }))
                      .then((syncRes) => {
                        if (syncRes && syncRes.ok) {
                          txPayload.sync_status = "synced";
                          txPayload.appwrite_saved = true;
                          saveState(state);
                        }
                      })
                      .catch((err) => {
                        txPayload.sync_status = "failed";
                        saveState(state);
                        showToast("Iuran tersimpan lokal, namun gagal auto-sync: " + (err && err.message ? err.message : "Cek koneksi/Function"));
                      });
                  }
                  saveState(state);
                }

                applyIuranFilter();
                const summaryEl = body.querySelector(".kas-summary");
                if (summaryEl) {
                  let lunas = 0;
                  mhsList.forEach((n) => { if ((state.iuranMahasiswa[n] || 0) >= target) lunas++; });
                  summaryEl.outerHTML = renderSummary(state, mhsList.length, lunas);
                }
              });
            });
          };
          pasangMhsControls();
        }

        // ----------------- TAB: REKENING -----------------
        if (activeTab === "rekening") {
          body.querySelectorAll("[data-copy-rek]").forEach((btn) => {
            btn.addEventListener("click", () => {
              const no = btn.dataset.copyRek;
              const metode = btn.dataset.metode || "Rekening";
              copyText(no, `Nomor ${metode} (${no}) disalin ke clipboard!`);
            });
          });
        }

        // ----------------- TAB: LAPORAN -----------------
        if (activeTab === "laporan") {
          const btnCsv = body.querySelector("#btn-ekspor-csv");
          const btnReset = body.querySelector("#btn-reset-data");

          if (btnCsv) {
            btnCsv.addEventListener("click", () => {
              const csvContent = generateCsv(state, mhsList);
              const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `laporan-kas-sdta-${new Date().toISOString().slice(0, 10)}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              showToast("Laporan CSV berhasil diunduh!");
            });
          }

          if (btnReset) {
            btnReset.addEventListener("click", () => {
              if (confirm("Apakah kamu yakin ingin mereset seluruh data kas ke data awal bawaan? Perubahan yang disimpan di peramban ini akan terhapus.")) {
                resetState();
                showToast("Data kas telah direset ke bawaan.");
                rerender("mutasi");
              }
            });
          }
        }
      }
    };
  }

  window.SDT = window.SDT || {};
  window.SDT.panelKas = panelKas;
})();
