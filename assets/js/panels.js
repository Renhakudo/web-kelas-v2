// Dimuat sebagai skrip biasa agar situs bisa dibuka tanpa server.
(function () {
// panels.js
// Mengubah data JSON menjadi isi panel. Setiap fungsi mengembalikan
// { sub, html, after? }: sub = keterangan di bawah judul, html = isi,
// after = dijalankan setelah html dipasang (untuk memasang event).

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const KULIAH = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initials = (n) => n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const menit = (hm) => { const [h, m] = hm.split(".").map(Number); return h * 60 + m; };
const tanggal = (iso) => FORMAT_TANGGAL.format(new Date(iso + "T00:00:00"));
// Selisih hari dari hari ini ke tanggal iso (negatif = sudah lewat)
const selisihHari = (iso, now) => Math.round((new Date(iso + "T00:00:00") - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
// Minggu kuliah ke berapa untuk suatu tanggal (1 = minggu pertama semester)
const mingguKe = (sem, d) => Math.floor(-selisihHari(sem.mulai, d) / 7) + 1;
const FORMAT_BULAN = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });
const FORMAT_LENGKAP = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
// Tautan hanya dibuat untuk alamat http(s); selain itu diabaikan
const tautan = (url, label) => /^https?:\/\//i.test(url || "") ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : "";
const kosong = (judul, isi) => `<div class="empty"><b>${judul}</b><p>${isi}</p></div>`;

function gagal(pesan) {
  return { sub: "Terjadi masalah", html: `<div class="error" role="alert"><b>Data belum bisa ditampilkan</b><p>${esc(pesan)}</p><p>Coba muat ulang halaman. Bila tetap gagal, minta pengurus kelas memeriksa berkas di folder <code>data/</code>.</p></div>` };
}

// Ringkasan untuk Beranda: [label, teks] kuliah berikutnya, tenggat terdekat, minggu kuliah
function ringkas(data, semester, now = new Date()) {
  const out = [];
  const nowM = now.getHours() * 60 + now.getMinutes();
  const jadwal = data.jadwal.data;
  for (let k = 0; jadwal && k <= 7; k++) {
    const hari = HARI[(now.getDay() + k) % 7];
    const s = (jadwal[hari] || []).find((x) => k > 0 || menit(x.selesai) > nowM);
    if (!s) continue;
    const jalan = k === 0 && menit(s.mulai) <= nowM;
    out.push([jalan ? "Sekarang" : k === 0 ? "Berikutnya" : k === 1 ? "Besok" : hari, `${s.matkul} \u00b7 ${jalan ? "sampai " + s.selesai : s.mulai} \u00b7 ${s.ruang}`]);
    break;
  }
  const tugas = (data.tugas.data || []).filter((p) => p.jenis === "tugas" && selisihHari(p.tenggat, now) >= 0)
    .sort((a, b) => a.tenggat.localeCompare(b.tenggat))[0];
  if (tugas) { const h = selisihHari(tugas.tenggat, now); out.push(["Tugas", `${tugas.judul} \u00b7 ${h ? "H-" + h : "hari ini"}`]); }
  if (semester) {
    const w = mingguKe(semester, now);
    if (w >= 1 && w <= semester.minggu) {
      const [nama, ke] = w <= semester.uts ? ["UTS", semester.uts] : ["UAS", semester.uas];
      const h = selisihHari(semester.mulai, now) + 7 * (ke - 1);
      out.push([`Minggu ${w}/${semester.minggu}`, h > 0 ? `${nama} H-${h}` : `${nama} minggu ini`]);
    }
  }
  return out;
}

function makePanels(data, now = new Date()) {
  const hariIni = HARI[now.getDay()];
  const hariAktif = KULIAH.includes(hariIni) ? hariIni : "Senin";

  return {
    jadwal(day = hariAktif, rerender) {
      if (data.jadwal.error) return gagal(data.jadwal.error);
      const jadwal = data.jadwal.data;
      const services = window.SDT && window.SDT.services;
      const auth = window.SDT && window.SDT.auth;
      const kal = /^(kalender|\d{4}-\d+)$/.test(day);

      const tabs = KULIAH.map((d) => `<button class="tab" role="tab" type="button" id="tab-${d}" data-day="${d}" aria-selected="${d === day}" aria-controls="jadwal-hari" tabindex="${d === day ? 0 : -1}"><span><b>${d.slice(0, 3)}</b><small>${(jadwal[d] || []).length} sesi</small></span></button>`).join("")
        + `<button class="tab" role="tab" type="button" id="tab-kalender" data-day="kalender" aria-label="Kalender" aria-selected="${kal}" aria-controls="jadwal-hari" tabindex="${kal ? 0 : -1}"><span><b>Kal</b><small>Bulan</small></span></button>`;
      
      const pasangTab = (body) => {
        const tabEls = [...body.querySelectorAll(".tab")];
        tabEls.forEach((t, i) => {
          t.addEventListener("click", () => rerender(t.dataset.day));
          t.addEventListener("keydown", (e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            const n = tabEls[(i + (e.key === "ArrowRight" ? 1 : -1) + tabEls.length) % tabEls.length];
            rerender(n.dataset.day);
          });
        });
      };

      if (kal) {
        const k = this.kalender(day === "kalender" ? undefined : day, rerender);
        return {
          sub: k.sub,
          html: `<div class="tabs" role="tablist" aria-label="Pilih hari">${tabs}</div><div role="tabpanel" id="jadwal-hari" aria-labelledby="tab-kalender">${k.html}</div>`,
          after(body) { pasangTab(body); k.after(body); }
        };
      }

      const nowM = now.getHours() * 60 + now.getMinutes();
      let nextFound = false;
      const sesi = jadwal[day] || [];
      const overrides = (services && window.SDT.services_cache && window.SDT.services_cache.overrides) || [];

      const rows = sesi.map((s, i) => {
        let state = "";
        if (day === hariIni) {
          if (nowM >= menit(s.mulai) && nowM < menit(s.selesai)) state = "now";
          else if (!nextFound && nowM < menit(s.mulai)) { state = "next"; nextFound = true; }
        }
        const status = state === "now" ? `<span class="tag now">Sedang berlangsung</span> ` : state === "next" ? `<span class="tag next">Berikutnya</span> ` : "";

        // Reschedule override check (hanya tampilkan selama tanggal pengganti/awal belum lewat)
        const ovr = overrides.find((o) => {
          const refDate = o.tanggal_pengganti || o.tanggal_awal;
          if (refDate && selisihHari(refDate, now) < 0) return false;
          return o.subject_id && (o.subject_id.toLowerCase().includes(s.matkul.toLowerCase()) || s.matkul.toLowerCase().includes(o.subject_id.toLowerCase()));
        });
        let ovrBadge = "";
        let ovrNotice = "";
        if (ovr) {
          const tipe = ovr.tipe_perubahan || "pindah_jadwal";
          const awalStr = ovr.tanggal_awal ? `${tanggal(ovr.tanggal_awal)} → ` : "";
          const baruStr = ovr.tanggal_pengganti ? tanggal(ovr.tanggal_pengganti) : "";
          if (tipe === "pindah_jadwal") {
            ovrBadge = `<span class="reschedule-badge">⚠️ RESCHEDULE: ${esc(awalStr)}${esc(baruStr)} ${esc(ovr.mulai_pengganti || '')}-${esc(ovr.selesai_pengganti || '')}</span>`;
            ovrNotice = `<div class="reschedule-notice"><b>Jadwal Pengganti:</b> ${ovr.tanggal_awal ? `Sesi ${esc(tanggal(ovr.tanggal_awal))} dipindah ke ${esc(baruStr)} ` : ''}di ${esc(ovr.ruang_pengganti || 'Lab')} (${esc(ovr.keterangan || 'Penyesuaian dosen')})</div>`;
          } else if (tipe === "online") {
            ovrBadge = `<span class="reschedule-badge online">🌐 KULIAH DARING (${esc(baruStr)})</span>`;
            ovrNotice = `<div class="reschedule-notice"><b>Kuliah Daring:</b> ${esc(ovr.ruang_pengganti || 'Tautan akan dibagikan')} (${esc(ovr.keterangan || '')})</div>`;
          } else if (tipe === "dibatalkan") {
            ovrBadge = `<span class="reschedule-badge batal">❌ PERKULIAHAN DIBATALKAN</span>`;
            ovrNotice = `<div class="reschedule-notice"><b>Dibatalkan${ovr.tanggal_awal ? ` (${esc(tanggal(ovr.tanggal_awal))})` : ''}:</b> ${esc(ovr.keterangan || 'Tidak ada perkuliahan pada tanggal ini.')}</div>`;
          }
        }

        const canReschedule = auth && (auth.hasRole("admin") || (auth.isSubjectPJ && (auth.isSubjectPJ(s.matkul) || auth.isSubjectPJ(s.pj))));

        return `<li class="${state}" style="--i:${i}">
          <span class="snum" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
          <span class="tblock">${esc(s.mulai)} - ${esc(s.selesai)}</span>
          <div>
            <h3>${esc(s.matkul)}</h3>
            <p><span translate="no">${esc(s.dosen.join(" / "))}</span> \u00b7 ${esc(s.ruang)}</p>
            <p>PJ: <span translate="no">${esc(s.pj)}</span></p>
            ${status}<span class="tag ${s.jenis === "praktikum" ? "red" : ""}">${esc(s.jenis)}</span>
            ${ovrBadge}
            ${ovrNotice}
            ${canReschedule ? `
              <div style="margin-top:.5rem;display:flex;gap:.4rem;flex-wrap:wrap;">
                <button type="button" class="task-action-btn btn-open-reschedule" data-matkul="${esc(s.matkul)}" data-ruang="${esc(s.ruang)}">
                  <span>⚙️ Ajukan Reschedule</span>
                </button>
                ${ovr ? `<button type="button" class="task-action-btn btn-del-reschedule" data-id="${esc(ovr.$id)}" style="color:#ff8591;"><span>✕ Batalkan Reschedule</span></button>` : ""}
              </div>
            ` : ""}
          </div>
        </li>`;
      }).join("");

      return {
        sub: day === hariIni ? `${day} \u00b7 hari ini` : day,
        html: `
          <div class="tabs" role="tablist" aria-label="Pilih hari">${tabs}</div>

          <div class="kas-form-card" id="form-reschedule-box" style="display:none;margin-bottom:1.25rem;">
            <h3 style="font:italic 900 1.15rem var(--display);color:var(--aqua);margin:0 0 .85rem;text-transform:uppercase;">Ajukan Jadwal Pengganti (Reschedule)</h3>
            <form class="auth-form" id="form-reschedule-new">
              <input type="hidden" id="rs-matkul">
              <div class="auth-field">
                <label>Mata Kuliah</label>
                <div id="rs-matkul-display" style="font:700 .9rem var(--display);color:var(--paper);padding:.4rem 0;"></div>
              </div>
              <div class="auth-field">
                <label for="rs-tipe">Tipe Perubahan</label>
                <select class="auth-input" id="rs-tipe">
                  <option value="pindah_jadwal">Pindah Hari / Jam / Ruang</option>
                  <option value="online">Kuliah Daring (Online)</option>
                  <option value="dibatalkan">Perkuliahan Diliburkan / Dibatalkan</option>
                </select>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;">
                <div class="auth-field">
                  <label for="rs-tgl-awal">Tanggal Kuliah Awal</label>
                  <input type="date" id="rs-tgl-awal" class="auth-input" value="${new Date().toISOString().slice(0, 10)}">
                </div>
                <div class="auth-field">
                  <label for="rs-tgl-pengganti">Tanggal Pengganti</label>
                  <input type="date" id="rs-tgl-pengganti" class="auth-input" value="${new Date().toISOString().slice(0, 10)}">
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;">
                <div class="auth-field">
                  <label for="rs-jam-mulai">Jam Mulai</label>
                  <input type="text" id="rs-jam-mulai" class="auth-input" placeholder="08.00" value="08.00">
                </div>
                <div class="auth-field">
                  <label for="rs-jam-selesai">Jam Selesai</label>
                  <input type="text" id="rs-jam-selesai" class="auth-input" placeholder="09.40" value="09.40">
                </div>
              </div>
              <div class="auth-field">
                <label for="rs-ruang">Ruang / Tautan Online</label>
                <input type="text" id="rs-ruang" class="auth-input" placeholder="contoh: Lab SAW 07.01 atau link Zoom">
              </div>
              <div class="auth-field">
                <label for="rs-ket">Alasan / Keterangan Perubahan</label>
                <input type="text" id="rs-ket" class="auth-input" placeholder="contoh: Dosen tugas dinas luar kota">
              </div>
              <div style="display:flex;gap:.5rem;margin-top:.5rem;">
                <button type="submit" class="btn-p3" id="btn-save-rs"><span>Simpan Reschedule</span></button>
                <button type="button" class="btn-p3 btn-subtle" id="btn-cancel-rs"><span>Batal</span></button>
              </div>
            </form>
          </div>

          <div role="tabpanel" id="jadwal-hari" aria-labelledby="tab-${day}">${sesi.length ? `<ul class="list sched">${rows}</ul>` : kosong("Tidak ada kuliah", `Belum ada sesi untuk hari ${esc(day)}.`)}</div>
        `,
        after(body) {
          pasangTab(body);

          // Preload schedule overrides
          if (services && services.listScheduleOverrides && (!window.SDT.services_cache || !window.SDT.services_cache.overrides)) {
            services.listScheduleOverrides().then((ovrs) => {
              window.SDT.services_cache = window.SDT.services_cache || {};
              window.SDT.services_cache.overrides = ovrs;
              if (ovrs.length) rerender(day);
            }).catch(() => {});
          }

          const formBox = body.querySelector("#form-reschedule-box");
          const form = body.querySelector("#form-reschedule-new");
          body.querySelectorAll(".btn-open-reschedule").forEach((b) => b.addEventListener("click", () => {
            if (formBox) {
              body.querySelector("#rs-matkul").value = b.dataset.matkul;
              body.querySelector("#rs-matkul-display").textContent = b.dataset.matkul;
              body.querySelector("#rs-ruang").value = b.dataset.ruang || "";
              formBox.style.display = "block";
              formBox.scrollIntoView({ behavior: "smooth" });
            }
          }));

          body.querySelector("#btn-cancel-rs")?.addEventListener("click", () => {
            if (formBox) formBox.style.display = "none";
          });

          body.querySelectorAll(".btn-del-reschedule").forEach((b) => b.addEventListener("click", async () => {
            if (!confirm("Batalkan jadwal pengganti ini dan kembalikan ke jadwal reguler?")) return;
            try {
              await services.deleteScheduleOverride(b.dataset.id);
              if (window.SDT.services_cache && window.SDT.services_cache.overrides) {
                window.SDT.services_cache.overrides = window.SDT.services_cache.overrides.filter((o) => o.$id !== b.dataset.id);
              }
              rerender(day);
            } catch (err) {
              alert("Gagal membatalkan reschedule: " + err.message);
            }
          }));

          if (form && services) {
            form.addEventListener("submit", async (e) => {
              e.preventDefault();
              const saveBtn = body.querySelector("#btn-save-rs");
              saveBtn.disabled = true;
              try {
                const created = await services.createScheduleOverride({
                  subject_id: body.querySelector("#rs-matkul").value,
                  tipe_perubahan: body.querySelector("#rs-tipe").value,
                  tanggal_awal: body.querySelector("#rs-tgl-awal").value,
                  tanggal_pengganti: body.querySelector("#rs-tgl-pengganti").value,
                  mulai_pengganti: body.querySelector("#rs-jam-mulai").value,
                  selesai_pengganti: body.querySelector("#rs-jam-selesai").value,
                  ruang_pengganti: body.querySelector("#rs-ruang").value,
                  keterangan: body.querySelector("#rs-ket").value,
                  status: 'aktif',
                  created_by: (auth && auth.state && auth.state.user && auth.state.user.$id) || 'pengurus'
                });
                window.SDT.services_cache = window.SDT.services_cache || {};
                window.SDT.services_cache.overrides = window.SDT.services_cache.overrides || [];
                if (created && !window.SDT.services_cache.overrides.some((o) => o.$id === created.$id)) {
                  window.SDT.services_cache.overrides.unshift(created);
                }
                services.logActivity("jadwal", "reschedule", `${created.subject_id} -> ${created.tanggal_pengganti}`);
                alert("Jadwal pengganti berhasil disimpan!");
                rerender(day);
              } catch (err) {
                alert("Gagal menyimpan reschedule: " + err.message);
                saveBtn.disabled = false;
              }
            });
            const btnResetAdm = body.querySelector("#btn-reset-pw-adm");
            const admResetRes = body.querySelector("#adm-reset-result");
            if (btnResetAdm && admResetRes) {
              btnResetAdm.addEventListener("click", async () => {
                const docId = selMember.value;
                const target = memberProfiles.find((m) => m.$id === docId);
                if (!docId || !target) return;
                if (!confirm(`Reset kata sandi untuk ${target.nama_lengkap} (${target.nim})?`)) return;
                admResetRes.classList.remove("show");
                admErr.classList.remove("show");
                btnResetAdm.disabled = true;
                try {
                  const res = await services.adminResetPassword(docId);
                  admResetRes.innerHTML = `Kata sandi sementara baru untuk <b>${esc(target.nama_lengkap)}</b>: <code style="user-select:all;">${esc(res.temporaryPassword)}</code>`;
                  admResetRes.classList.add("show");
                  services.logActivity("akun", "reset_password", `Admin mereset password ${target.nim}`);
                } catch (err) {
                  if (err.message === "FUNCTION_NOT_CONFIGURED") {
                    admResetRes.innerHTML = `Function cloud belum disetel. Jalankan perintah berikut di terminal admin:<br><code style="user-select:all;">node scripts/reset-password.js ${esc(target.nim)}</code>`;
                    admResetRes.classList.add("show");
                  } else {
                    admErr.textContent = err.message || "Gagal mereset kata sandi.";
                    admErr.classList.add("show");
                  }
                } finally {
                  btnResetAdm.disabled = false;
                }
              });
            }
          }
        }
      };
    },

    // Kalender bulanan: hari ini, tenggat tugas, minggu UTS/UAS. ym = "tahun-bulan" (bulan 1-12)
    kalender(ym, rerender) {
      const [y, m] = (ym || `${now.getFullYear()}-${now.getMonth() + 1}`).split("-").map(Number);
      const sem = data.semester;
      const iso = (d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const tugas = (data.tugas.data || []).filter((p) => p.jenis === "tugas" && p.tenggat && p.tenggat.startsWith(iso(1).slice(0, 8)))
        .sort((a, b) => a.tenggat.localeCompare(b.tenggat));
      const overrides = ((window.SDT.services_cache && window.SDT.services_cache.overrides) || [])
        .filter((o) => o.tanggal_pengganti && o.tanggal_pengganti.startsWith(iso(1).slice(0, 8)));
      // Ujian hanya pada hari kuliah (Senin-Jumat) di minggu UTS/UAS
      const ujian = (d) => {
        const t = new Date(y, m - 1, d), w = sem && t.getDay() % 6 ? mingguKe(sem, t) : 0;
        return w && w === sem.uts ? "UTS" : w && w === sem.uas ? "UAS" : "";
      };
      const jumlah = new Date(y, m, 0).getDate();
      const geser = (new Date(y, m - 1, 1).getDay() + 6) % 7;   // kolom pertama = Senin
      const kepala = [...HARI.slice(1), HARI[0]].map((h) => `<li class="hd" aria-hidden="true">${h.slice(0, 3)}</li>`).join("");
      let sel = `<li class="off" aria-hidden="true"></li>`.repeat(geser);
      const baris = [];   // daftar di bawah kalender
      for (let d = 1; d <= jumlah; d++) {
        const t = new Date(y, m - 1, d), u = ujian(d), tg = tugas.filter((p) => p.tenggat === iso(d));
        const ovs = overrides.filter((o) => o.tanggal_pengganti === iso(d));
        const kini = selisihHari(iso(d), now) === 0;
        if (u && (d === 1 || !ujian(d - 1))) baris.push([iso(d), `Minggu ${u}`, "Mulai tanggal ini sampai Jumat"]);
        tg.forEach((p) => baris.push([p.tenggat, p.judul, `Tenggat tugas \u00b7 ${p.matkul || ""}`]));
        ovs.forEach((o) => baris.push([o.tanggal_pengganti, `Reschedule: ${o.subject_id}`, `${o.mulai_pengganti || ""}-${o.selesai_pengganti || ""} \u00b7 ${o.ruang_pengganti || ""} (${o.keterangan || o.tipe_perubahan})`]));
        const kelas = [kini && "kini", t.getDay() === 6 && "sab", t.getDay() === 0 && "min", (u || ovs.length) && "ujian", tg.length && "tugas"].filter(Boolean).join(" ");
        const badgeTxt = u || (ovs.length ? "RSC" : "");
        sel += `<li class="${kelas}"${kini ? ' aria-current="date"' : ""}>${d}<small>${badgeTxt}</small>${tg.length ? `<span class="sr-only">, tenggat: ${esc(tg.map((p) => p.judul).join(", "))}</span>` : ""}</li>`;
      }
      const daftar = baris.length
        ? `<ul class="list">${baris.map(([tgl, judul, ket], i) => `<li style="--i:${i}"><span class="time">${tanggal(tgl)}</span><div><h3>${esc(judul)}</h3><p>${esc(ket)}</p></div></li>`).join("")}</ul>`
        : `<p class="count">Tidak ada tenggat atau ujian bulan ini</p>`;
      const pindah = (k) => { const t = new Date(y, m - 1 + k, 1); return `${t.getFullYear()}-${t.getMonth() + 1}`; };
      return {
        sub: `Hari ini: ${FORMAT_LENGKAP.format(now)}`,
        html: `<div class="cal-nav"><button type="button" class="cal-prev" data-ym="${pindah(-1)}" aria-label="Bulan sebelumnya">&lt;</button><b aria-live="polite">${FORMAT_BULAN.format(new Date(y, m - 1, 1))}</b><button type="button" class="cal-next" data-ym="${pindah(1)}" aria-label="Bulan berikutnya">&gt;</button></div><ol class="cal">${kepala}${sel}</ol>${daftar}`,
        after(body) {
          body.querySelectorAll(".cal-nav button").forEach((b) => b.addEventListener("click", () => {
            rerender(b.dataset.ym);
            body.querySelector("." + b.className).focus();   // fokus tetap di tombol yang sama setelah digambar ulang
          }));
        }
      };
    },

    anggota(selectedNim, rerender) {
      if (data.anggota.error) return gagal(data.anggota.error);
      const rawList = [...data.anggota.data.mahasiswa];
      const sorted = [...rawList].sort((a, b) => a.localeCompare(b, "id"));
      const services = window.SDT && window.SDT.services;
      const auth = window.SDT && window.SDT.auth;

      // Jika ada selectedNim, tampilkan SIDE DRAWER DETAIL PROFIL MAHASISWA
      if (selectedNim) {
        const nimStr = String(selectedNim);
        let profile = null;
        if (services && window.SDT.services_cache && window.SDT.services_cache.profiles) {
          profile = window.SDT.services_cache.profiles.find((p) => p.nim === nimStr || p.$id === nimStr || p.nama_lengkap === nimStr);
        }
        if (!profile) {
          const idx = sorted.findIndex((n) => n === nimStr);
          const nama = idx >= 0 ? sorted[idx] : nimStr;
          const originalIdx = rawList.indexOf(nama);
          const computedNim = originalIdx >= 0 ? String(3326600001 + originalIdx) : nimStr;
          profile = {
            $id: `usr-${computedNim}`,
            nim: computedNim,
            nama_lengkap: nama,
            role: (nama.includes("Arkoun") || nama.includes("Hilmi")) ? "admin" : nama.includes("Azzam") ? "pengurus" : "mahasiswa",
            jabatan: nama.includes("Azzam") ? "Komandan Tingkat" : "Mahasiswa",
            bio: "Mahasiswa Sains Data Terapan A PENS.",
            minat: ["Data Science", "Machine Learning"],
            matkul_pj: nama.includes("Hilmi") ? ["Agama"] : [],
            github_url: "",
            linkedin_url: "",
            instagram_url: "",
            website_url: "",
            foto_id: ""
          };
        }

        const isOwner = auth && auth.state && auth.state.profile && (auth.state.profile.nim === profile.nim || (auth.state.user && auth.state.user.$id === profile.$id));
        const isAdmin = auth && auth.hasRole && auth.hasRole("admin");
        const canEdit = isOwner || isAdmin;
        const avatarUrl = services && services.getAvatarViewUrl ? services.getAvatarViewUrl(profile.foto_id) : null;

        const html = `
          <div style="margin-bottom:1rem;">
            <button type="button" class="btn-p3 btn-subtle" id="btn-back-anggota">
              <span>&larr; Kembali ke Daftar</span>
            </button>
          </div>

          <div class="profile-detail-card" id="view-profile-card">
            <div class="profile-detail-top">
              <div class="profile-avatar-lg">
                ${avatarUrl ? `<img src="${esc(avatarUrl)}" alt="${esc(profile.nama_lengkap)}">` : `<span>${initials(profile.nama_lengkap)}</span>`}
              </div>
              <div class="profile-detail-names">
                <span class="nim-tag">NRP ${esc(profile.nim)}</span>
                <h3>${esc(profile.nama_lengkap)}</h3>
                <div class="profile-badge-row">
                  <span class="p-badge ${esc(profile.role)}">${esc(profile.role || 'mahasiswa')}</span>
                  <span class="p-badge">${esc(profile.jabatan || 'Mahasiswa')}</span>
                </div>
              </div>
            </div>

            <div class="profile-bio-box">
              ${esc(profile.bio || "Belum ada bio yang ditulis.")}
            </div>

            ${(profile.minat && profile.minat.length) ? `
              <div style="margin-bottom:.6rem;"><strong style="font:700 .68rem var(--mono);text-transform:uppercase;color:var(--text-dim);letter-spacing:.08em;">Minat &amp; Bidang Keahlian:</strong></div>
              <div class="profile-tags-cloud">
                ${profile.minat.map((m) => `<span class="profile-tag-item">${esc(m)}</span>`).join("")}
              </div>
            ` : ""}

            ${(profile.matkul_pj && profile.matkul_pj.length && profile.matkul_pj[0] !== "") ? `
              <div style="margin-bottom:.6rem;"><strong style="font:700 .68rem var(--mono);text-transform:uppercase;color:var(--text-dim);letter-spacing:.08em;">PJ Mata Kuliah:</strong></div>
              <div class="profile-tags-cloud">
                ${profile.matkul_pj.map((pj) => `<span class="profile-tag-item" style="color:var(--foam);">${esc(pj)}</span>`).join("")}
              </div>
            ` : ""}

            <div style="margin-top:1rem;margin-bottom:.5rem;"><strong style="font:700 .68rem var(--mono);text-transform:uppercase;color:var(--text-dim);letter-spacing:.08em;">Tautan &amp; Jejaring:</strong></div>
            <div class="profile-links-row">
              ${profile.github_url ? `<a class="profile-link-btn" href="${esc(profile.github_url)}" target="_blank" rel="noopener"><span>🐙 GitHub</span></a>` : ""}
              ${profile.linkedin_url ? `<a class="profile-link-btn" href="${esc(profile.linkedin_url)}" target="_blank" rel="noopener"><span>💼 LinkedIn</span></a>` : ""}
              ${profile.instagram_url ? `<a class="profile-link-btn" href="${esc(profile.instagram_url)}" target="_blank" rel="noopener"><span>📸 Instagram</span></a>` : ""}
              ${profile.website_url ? `<a class="profile-link-btn" href="${esc(profile.website_url)}" target="_blank" rel="noopener"><span>🌐 Website</span></a>` : ""}
              ${(!profile.github_url && !profile.linkedin_url && !profile.instagram_url && !profile.website_url) ? `<p style="font-size:.78rem;color:var(--text-dim);margin:0;">Belum ada tautan media sosial.</p>` : ""}
            </div>

            ${canEdit ? `
              <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--edge-soft);">
                <button type="button" class="btn-p3" id="btn-toggle-edit-profile">
                  <span>✏️ Sunting Profil Ini</span>
                </button>
              </div>
            ` : ""}
          </div>

          ${canEdit ? `
            <div class="profile-detail-card" id="form-edit-profile-card" style="display:none;">
              <h3 style="font:italic 900 1.25rem var(--display);color:var(--aqua);margin:0 0 1rem;text-transform:uppercase;">Sunting Profil Mahasiswa</h3>
              
              <div class="auth-error" id="edit-prof-err"></div>
              <div class="auth-success" id="edit-prof-succ"></div>

              <form class="auth-form" id="form-prof-edit">
                <div class="auth-field">
                  <label for="ep-avatar">Foto Profil Baru (Maks 2MB, JPG/PNG/WebP)</label>
                  <input type="file" id="ep-avatar" accept="image/jpeg,image/png,image/webp" class="auth-input" style="padding:.4rem;">
                </div>
                <div class="auth-field">
                  <label for="ep-bio">Bio Singkat</label>
                  <textarea class="auth-textarea" id="ep-bio">${esc(profile.bio || '')}</textarea>
                </div>
                <div class="auth-field">
                  <label for="ep-minat">Minat / Keahlian (Pisahkan dengan koma)</label>
                  <input type="text" class="auth-input" id="ep-minat" value="${esc((profile.minat || []).join(', '))}">
                </div>
                ${isAdmin ? `
                  <div class="auth-field">
                    <label for="ep-jabatan">Jabatan (Khusus Admin)</label>
                    <input type="text" class="auth-input" id="ep-jabatan" value="${esc(profile.jabatan || 'Mahasiswa')}">
                  </div>
                ` : ""}
                <div class="auth-field">
                  <label for="ep-github">GitHub URL</label>
                  <input type="url" class="auth-input" id="ep-github" placeholder="https://github.com/..." value="${esc(profile.github_url || '')}">
                </div>
                <div class="auth-field">
                  <label for="ep-linkedin">LinkedIn URL</label>
                  <input type="url" class="auth-input" id="ep-linkedin" placeholder="https://linkedin.com/in/..." value="${esc(profile.linkedin_url || '')}">
                </div>
                <div class="auth-field">
                  <label for="ep-instagram">Instagram URL</label>
                  <input type="url" class="auth-input" id="ep-instagram" placeholder="https://instagram.com/..." value="${esc(profile.instagram_url || '')}">
                </div>
                <div class="auth-field">
                  <label for="ep-website">Website Pribadi</label>
                  <input type="url" class="auth-input" id="ep-website" placeholder="https://..." value="${esc(profile.website_url || '')}">
                </div>
                <div style="display:flex;gap:.5rem;margin-top:.5rem;">
                  <button type="submit" class="btn-p3" id="btn-save-prof"><span>Simpan Perubahan</span></button>
                  <button type="button" class="btn-p3 btn-subtle" id="btn-cancel-prof"><span>Batal</span></button>
                </div>
              </form>
            </div>
          ` : ""}
        `;

        return {
          sub: `Profil ${profile.nama_lengkap}`,
          html,
          after(b) {
            b.querySelector("#btn-back-anggota")?.addEventListener("click", () => rerender(null));
            const toggleBtn = b.querySelector("#btn-toggle-edit-profile");
            const formCard = b.querySelector("#form-edit-profile-card");
            const cancelBtn = b.querySelector("#btn-cancel-prof");
            const form = b.querySelector("#form-prof-edit");
            const errEl = b.querySelector("#edit-prof-err");
            const succEl = b.querySelector("#edit-prof-succ");
            const saveBtn = b.querySelector("#btn-save-prof");

            if (toggleBtn && formCard) {
              toggleBtn.addEventListener("click", () => {
                formCard.style.display = "block";
                formCard.scrollIntoView({ behavior: "smooth" });
              });
            }
            if (cancelBtn && formCard) {
              cancelBtn.addEventListener("click", () => {
                formCard.style.display = "none";
              });
            }
            if (form) {
              form.addEventListener("submit", async (e) => {
                e.preventDefault();
                errEl.classList.remove("show");
                succEl.classList.remove("show");
                saveBtn.disabled = true;
                saveBtn.querySelector("span").textContent = "Menyimpan…";

                try {
                  let fotoId = profile.foto_id;
                  const fileInput = b.querySelector("#ep-avatar");
                  if (fileInput && fileInput.files && fileInput.files[0]) {
                    const uploaded = await services.uploadAvatar(fileInput.files[0]);
                    fotoId = uploaded.$id;
                  }

                  const minatArr = b.querySelector("#ep-minat").value.split(",").map((s) => s.trim()).filter(Boolean);
                  const updatePayload = {
                    bio: b.querySelector("#ep-bio").value.trim(),
                    minat: minatArr,
                    github_url: b.querySelector("#ep-github").value.trim(),
                    linkedin_url: b.querySelector("#ep-linkedin").value.trim(),
                    instagram_url: b.querySelector("#ep-instagram").value.trim(),
                    website_url: b.querySelector("#ep-website").value.trim(),
                    foto_id: fotoId
                  };
                  if (isAdmin && b.querySelector("#ep-jabatan")) {
                    updatePayload.jabatan = b.querySelector("#ep-jabatan").value.trim();
                  }

                  if (isOwner && auth && auth.updateProfile) {
                    const updated = await auth.updateProfile(updatePayload);
                    if (window.SDT.services_cache && window.SDT.services_cache.profiles) {
                      const idx = window.SDT.services_cache.profiles.findIndex((x) => x.$id === profile.$id);
                      if (idx >= 0 && updated) window.SDT.services_cache.profiles[idx] = updated;
                    }
                  } else {
                    await services.updateProfile(profile.$id, updatePayload);
                  }

                  succEl.textContent = "Profil berhasil disimpan!";
                  succEl.classList.add("show");
                  setTimeout(() => {
                    rerender(profile.nim);
                  }, 800);
                } catch (err) {
                  errEl.textContent = err.message || "Gagal menyimpan profil.";
                  errEl.classList.add("show");
                  saveBtn.disabled = false;
                  saveBtn.querySelector("span").textContent = "Simpan Perubahan";
                }
              });
            }
          }
        };
      }

      // Default: List 24 Mahasiswa
      return {
        sub: `${sorted.length} mahasiswa · Klik nama untuk profil`,
        html: `<label class="sr-only" for="cari">Cari nama atau NRP</label><input class="search" id="cari" name="cari" type="search" placeholder="Cari nama atau NRP mahasiswa\u2026" autocomplete="off" spellcheck="false"><p class="count" id="count" aria-live="polite"></p><ul class="people" id="people" translate="no"></ul>`,
        after(body) {
          const count = body.querySelector("#count"), list = body.querySelector("#people");
          if (services && services.listProfiles) {
            services.listProfiles().then((pList) => {
              window.SDT.services_cache = window.SDT.services_cache || {};
              window.SDT.services_cache.profiles = pList;
            }).catch(() => {});
          }

          const draw = (q = "") => {
            const hit = sorted.filter((n, i) => {
              const origIdx = rawList.indexOf(n);
              const nrp = String(3326600001 + (origIdx >= 0 ? origIdx : i));
              const query = q.trim().toLowerCase();
              return n.toLowerCase().includes(query) || nrp.includes(query);
            });
            count.textContent = q ? `${hit.length} dari ${sorted.length} nama` : `${sorted.length} nama, urut abjad (klik untuk melihat profil)`;
            list.innerHTML = hit.length
              ? hit.map((n, i) => {
                  const origIdx = rawList.indexOf(n);
                  const nrp = String(3326600001 + (origIdx >= 0 ? origIdx : i));
                  return `<li style="--i:${i}" tabindex="0" data-nim="${nrp}" role="button" aria-label="Buka profil ${esc(n)}">
                    <span class="initial" aria-hidden="true">${initials(n)}</span>
                    <div>
                      <span>${esc(n)}</span>
                      <small class="nim-hint">NRP ${nrp}</small>
                    </div>
                  </li>`;
                }).join("")
              : `<li style="grid-column:1/-1;justify-content:center">Tidak ada nama yang cocok dengan "${esc(q)}"</li>`;
          };
          draw();
          body.querySelector("#cari").addEventListener("input", (e) => draw(e.target.value));

          list.addEventListener("click", (e) => {
            const li = e.target.closest("li[data-nim]");
            if (li) rerender(li.dataset.nim);
          });
          list.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              const li = e.target.closest("li[data-nim]");
              if (li) {
                e.preventDefault();
                rerender(li.dataset.nim);
              }
            }
          });
        }
      };
    },

    pengurus(period = "2026/2027", rerender) {
      if (data.anggota.error) return gagal(data.anggota.error);
      const { dosenWali, pengurus, pengembang } = data.anggota.data;
      const services = window.SDT && window.SDT.services;
      const liveProfiles = (window.SDT.services_cache && window.SDT.services_cache.profiles) || [];
      const TUGAS_POKOK = {
        "Komandan Tingkat": "Koordinasi kelas, komunikasi dosen & jurusan, serta penanggung jawab umum.",
        "Wakil Komandan Tingkat": "Mendampingi Komti serta mengoordinasikan agenda harian kelas.",
        "Sekretaris": "Administrasi presensi, notulensi, arsip surat, dan dokumentasi kegiatan.",
        "Bendahara": "Pengelolaan uang kas bulanan, buku mutasi, dan laporan keuangan kelas."
      };

      const isArsip = period === "2025/2026";
      // Gabungkan data pengurus statis dengan pembaruan role/jabatan live dari Appwrite profiles (untuk periode aktif)
      const activeList = (!isArsip && liveProfiles.length)
        ? liveProfiles
            .filter((m) => m.role === "pengurus" || (m.jabatan && m.jabatan !== "Mahasiswa" && !m.jabatan.includes("Web Master")))
            .map((m) => ({
              jabatan: m.jabatan || "Pengurus",
              nama: m.nama_lengkap,
              nim: m.nim,
              matkul_pj: m.matkul_pj || []
            }))
        : pengurus.map((p) => ({ jabatan: p.jabatan, nama: p.nama, nim: null, matkul_pj: [] }));

      const sourceList = activeList.length ? activeList : pengurus;
      const grup = [];
      sourceList.forEach((p) => {
        const g = grup.find((x) => x.jabatan === p.jabatan);
        const item = { nama: p.nama, nim: p.nim };
        g ? g.members.push(item) : grup.push({ jabatan: p.jabatan, members: [item] });
      });

      const cards = isArsip
        ? `<div class="empty" style="grid-column:1/-1;"><b>Arsip Kepengurusan 2025/2026</b><p>Periode perdana pembentukan kelas 1 SDT A dimulai pada semester ganjil 2026/2027.</p></div>`
        : grup.map((p, i) => `
            <div class="officer" style="--i:${i + 1}">
              <div class="num" aria-hidden="true">${ROMAWI[i] || i + 1}</div>
              <p class="role">${esc(p.jabatan)}</p>
              <p translate="no">${p.members.map((m) => m.nim
                ? `<a href="#anggota/${esc(m.nim)}" style="color:inherit;text-decoration:underline dotted;">${esc(m.nama)}</a>`
                : esc(m.nama)).join("<br>")}</p>
              ${TUGAS_POKOK[p.jabatan] ? `<small style="display:block;margin-top:.45rem;font-size:.72rem;color:var(--text-dim);line-height:1.35;">${esc(TUGAS_POKOK[p.jabatan])}</small>` : ""}
            </div>
          `).join("");

      // Daftar PJ Mata Kuliah dari jadwal & profil live
      const jadwalData = (data.jadwal && data.jadwal.data) || {};
      const pjRows = [];
      KULIAH.forEach((hari) => {
        (jadwalData[hari] || []).forEach((s) => {
          if (s.matkul && s.pj) pjRows.push({ matkul: s.matkul, pj: s.pj, hari });
        });
      });

      const devList = pengembang || [
        { peran: "Frontend & Core Feature", nama: ["Mohammad Aditya Arkoun"], ket: "Arsitektur antarmuka, tata letak interaktif, sistem menu, dan fitur inti website." },
        { peran: "Backend & Database", nama: ["Muhammad Hilmi Mu'Afa"], ket: "Struktur data, integrasi database & penyimpanan, serta arsitektur backend." },
        { peran: "Ideas & Support", nama: ["Davin Zoe Akhmad", "Ryandra Alifah Hafizd"], ket: "Konseptualisasi ide, pengujian fitur, dan dukungan pengembangan." }
      ];
      const devCards = devList.map((d, i) => {
        const cls = i === 0 ? "fe" : i === 1 ? "be" : "ideas";
        const avatars = d.nama.map((n) => `<div class="dev-avatar-row"><span class="dev-avatar" aria-hidden="true">${initials(n)}</span><span translate="no" style="font-weight:600;">${esc(n)}</span></div>`).join("");
        return `<div class="dev-card ${cls}" style="--i:${i}"><div><span class="dev-role-badge">${esc(d.peran)}</span><div style="margin-top:.6rem;">${avatars}</div></div><p class="dev-desc">${esc(d.ket)}</p></div>`;
      }).join("");

      return {
        sub: `Struktur organisasi kelas · Periode ${esc(period)}`,
        html: `
          <div class="task-header-row" style="margin-bottom:1rem;">
            <div class="task-tabs" role="tablist" aria-label="Periode kepengurusan">
              <button type="button" class="task-tab" data-period="2026/2027" aria-selected="${!isArsip}"><span>2026/2027 (Aktif)</span></button>
              <button type="button" class="task-tab" data-period="2025/2026" aria-selected="${isArsip}"><span>2025/2026 (Arsip)</span></button>
            </div>
          </div>
          <div class="officer wali" style="--i:0"><div class="num" aria-hidden="true">0</div><p class="role">${esc(dosenWali.jabatan)}</p><p translate="no">${esc(dosenWali.nama)}</p></div>
          <div class="officers">${cards}</div>
          ${(!isArsip && pjRows.length) ? `
            <div class="dev-team-section">
              <div class="dev-team-head">
                <h3 class="dev-team-title">Penanggung Jawab Mata Kuliah</h3>
                <p class="dev-team-sub">Koordinator jadwal &amp; komunikasi dosen per mata kuliah</p>
              </div>
              <ul class="list">${pjRows.map((x, idx) => `<li style="--i:${idx}"><span class="time">${esc(x.hari)}</span><div><h3>${esc(x.matkul)}</h3><p>PJ: <b translate="no">${esc(x.pj)}</b></p></div></li>`).join("")}</ul>
            </div>
          ` : ""}
          <div class="dev-team-section"><div class="dev-team-head"><h3 class="dev-team-title">Tim Pengembang Website</h3><p class="dev-team-sub">Mahasiswa yang membangun &amp; merancang situs ini</p></div><div class="dev-cards">${devCards}</div></div>
        `,
        after(body) {
          body.querySelectorAll("[data-period]").forEach((btn) => {
            btn.addEventListener("click", () => rerender(btn.dataset.period));
          });
          if (services && services.listProfiles && !liveProfiles.length) {
            services.listProfiles().then((list) => {
              if (list && list.length) {
                window.SDT.services_cache = window.SDT.services_cache || {};
                window.SDT.services_cache.profiles = list;
                rerender(period);
              }
            }).catch(() => {});
            const btnResetAdm = body.querySelector("#btn-reset-pw-adm");
            const admResetRes = body.querySelector("#adm-reset-result");
            if (btnResetAdm && admResetRes) {
              btnResetAdm.addEventListener("click", async () => {
                const docId = selMember.value;
                const target = memberProfiles.find((m) => m.$id === docId);
                if (!docId || !target) return;
                if (!confirm(`Reset kata sandi untuk ${target.nama_lengkap} (${target.nim})?`)) return;
                admResetRes.classList.remove("show");
                admErr.classList.remove("show");
                btnResetAdm.disabled = true;
                try {
                  const res = await services.adminResetPassword(docId);
                  admResetRes.innerHTML = `Kata sandi sementara baru untuk <b>${esc(target.nama_lengkap)}</b>: <code style="user-select:all;">${esc(res.temporaryPassword)}</code>`;
                  admResetRes.classList.add("show");
                  services.logActivity("akun", "reset_password", `Admin mereset password ${target.nim}`);
                } catch (err) {
                  if (err.message === "FUNCTION_NOT_CONFIGURED") {
                    admResetRes.innerHTML = `Function cloud belum disetel. Jalankan perintah berikut di terminal admin:<br><code style="user-select:all;">node scripts/reset-password.js ${esc(target.nim)}</code>`;
                    admResetRes.classList.add("show");
                  } else {
                    admErr.textContent = err.message || "Gagal mereset kata sandi.";
                    admErr.classList.add("show");
                  }
                } finally {
                  btnResetAdm.disabled = false;
                }
              });
            }
          }
        }
      };
    },

    tugas(activeTab = "aktif", rerender) {
      const services = window.SDT && window.SDT.services;
      const auth = window.SDT && window.SDT.auth;
      const canManage = auth && (auth.hasRole("admin") || auth.hasRole("pengurus"));
      const isArsip = activeTab === "arsip";

      return {
        sub: isArsip ? "Dokumentasi tugas yang telah lewat" : "Tugas aktif dan tenggat terdekat",
        html: `
          <div class="task-header-row">
            <div class="task-tabs" role="tablist">
              <button type="button" class="task-tab" id="tt-aktif" aria-selected="${!isArsip}"><span>Tugas Aktif</span></button>
              <button type="button" class="task-tab" id="tt-arsip" aria-selected="${isArsip}"><span>Arsip Tugas</span></button>
            </div>
            ${canManage ? `<button type="button" class="btn-p3" id="btn-tambah-tugas" style="padding:.35rem .75rem;font-size:.78rem;"><span>+ Tambah Tugas</span></button>` : ""}
          </div>

          ${canManage ? `
            <div class="kas-form-card" id="form-tugas-box" style="display:none;margin-bottom:1.25rem;">
              <h3 id="form-tugas-title" style="font:italic 900 1.15rem var(--display);color:var(--aqua);margin:0 0 .85rem;text-transform:uppercase;">Tambah Tugas Baru</h3>
              <form class="auth-form" id="form-tugas-new">
                <input type="hidden" id="tg-edit-id" value="">
                <div class="auth-field">
                  <label for="tg-judul">Judul Tugas</label>
                  <input type="text" id="tg-judul" class="auth-input" required placeholder="contoh: Laporan Praktikum Jaringan M05">
                </div>
                <div class="auth-field">
                  <label for="tg-matkul">Mata Kuliah</label>
                  <input type="text" id="tg-matkul" class="auth-input" required placeholder="contoh: Workshop Sistem Operasi dan Jaringan">
                </div>
                <div class="auth-field">
                  <label for="tg-deadline">Tenggat (Deadline)</label>
                  <input type="datetime-local" id="tg-deadline" class="auth-input" required>
                </div>
                <div class="auth-field">
                  <label for="tg-link">Tautan Pengumpulan / LMS (Opsional)</label>
                  <input type="url" id="tg-link" class="auth-input" placeholder="https://online.mis.pens.ac.id/...">
                </div>
                <div class="auth-field">
                  <label for="tg-desc">Deskripsi &amp; Petunjuk</label>
                  <textarea id="tg-desc" class="auth-textarea" placeholder="Rincian ketentuan tugas..."></textarea>
                </div>
                <div style="display:flex;gap:.5rem;margin-top:.5rem;">
                  <button type="submit" class="btn-p3" id="btn-save-tugas"><span>Simpan Tugas</span></button>
                  <button type="button" class="btn-p3 btn-subtle" id="btn-cancel-tugas"><span>Batal</span></button>
                </div>
              </form>
            </div>
          ` : ""}

          <div class="auth-field" style="margin-bottom:.75rem;">
            <label for="filter-tugas-matkul" class="sr-only">Filter Mata Kuliah</label>
            <select id="filter-tugas-matkul" class="auth-input" style="padding:.45rem .7rem;font-size:.82rem;">
              <option value="all">Semua Mata Kuliah</option>
            </select>
          </div>

          <div id="tugas-content-placeholder">
            <p class="count" id="count-tugas">Memuat tugas...</p>
            <ul class="list" id="tugas-list"></ul>
          </div>
        `,
        after(body) {
          body.querySelector("#tt-aktif")?.addEventListener("click", () => rerender("aktif"));
          body.querySelector("#tt-arsip")?.addEventListener("click", () => rerender("arsip"));

          const formBox = body.querySelector("#form-tugas-box");
          const newForm = body.querySelector("#form-tugas-new");
          const editIdInput = body.querySelector("#tg-edit-id");
          const formTitle = body.querySelector("#form-tugas-title");
          body.querySelector("#btn-tambah-tugas")?.addEventListener("click", () => {
            if (!formBox) return;
            if (editIdInput) editIdInput.value = "";
            if (formTitle) formTitle.textContent = "Tambah Tugas Baru";
            if (newForm) newForm.reset();
            formBox.style.display = formBox.style.display === "none" ? "block" : "none";
          });
          body.querySelector("#btn-cancel-tugas")?.addEventListener("click", () => {
            if (formBox) formBox.style.display = "none";
            if (editIdInput) editIdInput.value = "";
          });

          if (newForm && services) {
            newForm.addEventListener("submit", async (e) => {
              e.preventDefault();
              const saveBtn = body.querySelector("#btn-save-tugas");
              saveBtn.disabled = true;
              try {
                const deadlineVal = body.querySelector("#tg-deadline").value;
                const payload = {
                  judul: body.querySelector("#tg-judul").value.trim(),
                  subject_id: body.querySelector("#tg-matkul").value.trim(),
                  deadline: deadlineVal ? new Date(deadlineVal).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                  link_pengumpulan: body.querySelector("#tg-link").value.trim(),
                  deskripsi: body.querySelector("#tg-desc").value.trim()
                };
                const editId = editIdInput ? editIdInput.value : "";
                if (editId) {
                  await services.updateAssignment(editId, payload);
                  services.logActivity("tugas", "update", payload.judul);
                } else {
                  payload.status = 'aktif';
                  await services.createAssignment(payload);
                  services.logActivity("tugas", "create", payload.judul);
                }
                rerender(activeTab);
              } catch (err) {
                alert("Gagal menyimpan tugas: " + err.message);
                saveBtn.disabled = false;
              }
            });
          }

          const countEl = body.querySelector("#count-tugas");
          const listEl = body.querySelector("#tugas-list");
          const matkulFilter = body.querySelector("#filter-tugas-matkul");
          const sisaHari = (t) => selisihHari(t, now);
          let loadedItems = [];

          const renderItems = (items) => {
            loadedItems = items;
            const selectedMatkul = matkulFilter ? matkulFilter.value : "all";
            const listFiltered = items.filter((p) => {
              const h = sisaHari(p.deadline);
              const matchTab = isArsip ? (h < 0 || p.status === 'arsip') : (h >= 0 && p.status !== 'arsip');
              const matchMatkul = selectedMatkul === "all" || (p.subject_id || "") === selectedMatkul;
              return matchTab && matchMatkul;
            }).sort((a, b) => {
              const sa = sisaHari(a.deadline), sb = sisaHari(b.deadline);
              return isArsip ? sb - sa : sa - sb;
            });

            countEl.textContent = `${listFiltered.length} ${isArsip ? 'tugas dalam arsip' : 'tugas aktif'}`;
            if (!listFiltered.length) {
              listEl.innerHTML = `<li style="grid-column:1/-1;justify-content:center;padding:2rem;">${isArsip ? "Belum ada tugas yang diarsipkan." : "Tidak ada tugas aktif saat ini. Semua beres!"}</li>`;
              return;
            }

            listEl.innerHTML = listFiltered.map((p, i) => {
              const h = sisaHari(p.deadline);
              const label = h < 0 ? `<span class="tag done">Lewat</span>` : h === 0 ? `<span class="tag now">Hari ini</span>` : `<span class="tag due">H-${h}</span>`;
              return `<li class="${h < 0 ? "past" : ""}" style="--i:${i}">
                <span class="time">${tanggal(p.deadline)}</span>
                <div>
                  <h3>${esc(p.judul)}</h3>
                  <p><b style="color:var(--aqua);">${esc(p.subject_id || "")}</b></p>
                  <p>${esc(p.deskripsi || "")}</p>
                  ${p.link_pengumpulan ? `<p>${tautan(p.link_pengumpulan, "Buka Tautan Pengumpulan")}</p>` : ""}
                  ${label}
                  ${canManage ? `
                    <div class="task-action-btns">
                      <button type="button" class="task-action-btn btn-edit-task" data-id="${esc(p.$id)}">✏️ Edit</button>
                      <button type="button" class="task-action-btn btn-archive-task" data-id="${esc(p.$id)}">${isArsip ? 'Aktifkan Kembali' : 'Arsipkan'}</button>
                      <button type="button" class="task-action-btn btn-del-task" data-id="${esc(p.$id)}" style="color:#ff8591;">Hapus</button>
                    </div>
                  ` : ""}
                </div>
              </li>`;
            }).join("");

            listEl.querySelectorAll(".btn-edit-task").forEach((b) => b.addEventListener("click", () => {
              const item = loadedItems.find((x) => x.$id === b.dataset.id);
              if (!item || !formBox) return;
              if (editIdInput) editIdInput.value = item.$id;
              if (formTitle) formTitle.textContent = "Edit Tugas";
              body.querySelector("#tg-judul").value = item.judul || "";
              body.querySelector("#tg-matkul").value = item.subject_id || "";
              body.querySelector("#tg-deadline").value = item.deadline ? `${item.deadline.slice(0, 10)}T23:59` : "";
              body.querySelector("#tg-link").value = item.link_pengumpulan || "";
              body.querySelector("#tg-desc").value = item.deskripsi || "";
              formBox.style.display = "block";
              formBox.scrollIntoView({ behavior: "smooth" });
            }));
            listEl.querySelectorAll(".btn-archive-task").forEach((b) => b.addEventListener("click", async () => {
              try {
                await services.updateAssignment(b.dataset.id, { status: isArsip ? 'aktif' : 'arsip' });
                rerender(activeTab);
              } catch (e) { alert(e.message); }
            }));
            listEl.querySelectorAll(".btn-del-task").forEach((b) => b.addEventListener("click", async () => {
              if (confirm("Hapus tugas ini secara permanen?")) {
                try {
                  await services.deleteAssignment(b.dataset.id);
                  rerender(activeTab);
                } catch (e) { alert(e.message); }
              }
            }));
          };

          if (matkulFilter) {
            matkulFilter.addEventListener("change", () => renderItems(loadedItems));
          }

          if (services && services.listAssignments) {
            services.listAssignments().then((res) => {
              if (matkulFilter) {
                const subjects = [...new Set(res.map((x) => x.subject_id).filter(Boolean))].sort();
                subjects.forEach((s) => {
                  const opt = document.createElement("option");
                  opt.value = s;
                  opt.textContent = s;
                  matkulFilter.appendChild(opt);
                });
              }
              renderItems(res);
            }).catch(() => {
              renderItems([]);
            });
          } else {
            renderItems([]);
            const btnResetAdm = body.querySelector("#btn-reset-pw-adm");
            const admResetRes = body.querySelector("#adm-reset-result");
            if (btnResetAdm && admResetRes) {
              btnResetAdm.addEventListener("click", async () => {
                const docId = selMember.value;
                const target = memberProfiles.find((m) => m.$id === docId);
                if (!docId || !target) return;
                if (!confirm(`Reset kata sandi untuk ${target.nama_lengkap} (${target.nim})?`)) return;
                admResetRes.classList.remove("show");
                admErr.classList.remove("show");
                btnResetAdm.disabled = true;
                try {
                  const res = await services.adminResetPassword(docId);
                  admResetRes.innerHTML = `Kata sandi sementara baru untuk <b>${esc(target.nama_lengkap)}</b>: <code style="user-select:all;">${esc(res.temporaryPassword)}</code>`;
                  admResetRes.classList.add("show");
                  services.logActivity("akun", "reset_password", `Admin mereset password ${target.nim}`);
                } catch (err) {
                  if (err.message === "FUNCTION_NOT_CONFIGURED") {
                    admResetRes.innerHTML = `Function cloud belum disetel. Jalankan perintah berikut di terminal admin:<br><code style="user-select:all;">node scripts/reset-password.js ${esc(target.nim)}</code>`;
                    admResetRes.classList.add("show");
                  } else {
                    admErr.textContent = err.message || "Gagal mereset kata sandi.";
                    admErr.classList.add("show");
                  }
                } finally {
                  btnResetAdm.disabled = false;
                }
              });
            }
          }
        }
      };
    },

    tautan(filterCat = "Semua", rerender) {
      const services = window.SDT && window.SDT.services;
      const auth = window.SDT && window.SDT.auth;
      const canManage = auth && (auth.hasRole("admin") || auth.hasRole("pengurus"));
      const CATEGORIES = ["Semua", "Akademik", "Materi", "Tugas", "Event", "Tools", "Dokumentasi", "Lainnya"];

      return {
        sub: "Pusat kumpulan tautan dan portal penting kelas",
        html: `
          <div class="links-filter-row">
            ${CATEGORIES.map((cat) => `
              <button type="button" class="links-filter-chip ${cat === filterCat ? 'active' : ''}" data-cat="${esc(cat)}">
                <span>${esc(cat)}</span>
              </button>
            `).join("")}
          </div>

          ${canManage ? `
            <div style="margin-bottom:1rem;">
              <button type="button" class="btn-p3" id="btn-tambah-tautan" style="font-size:.78rem;padding:.35rem .75rem;">
                <span>+ Tambah Tautan Baru</span>
              </button>
            </div>

            <div class="kas-form-card" id="form-tautan-box" style="display:none;margin-bottom:1.25rem;">
              <h3 style="font:italic 900 1.15rem var(--display);color:var(--aqua);margin:0 0 .85rem;text-transform:uppercase;">Tambah Tautan Baru</h3>
              <form class="auth-form" id="form-tautan-new">
                <div class="auth-field">
                  <label for="lt-judul">Judul Tautan / Sumber</label>
                  <input type="text" id="lt-judul" class="auth-input" required placeholder="contoh: Google Drive Materi Statistika">
                </div>
                <div class="auth-field">
                  <label for="lt-url">Alamat URL (http/https)</label>
                  <input type="url" id="lt-url" class="auth-input" required placeholder="https://drive.google.com/...">
                </div>
                <div class="auth-field">
                  <label for="lt-cat">Kategori</label>
                  <select class="auth-input" id="lt-cat">
                    <option value="Akademik">Akademik</option>
                    <option value="Materi">Materi</option>
                    <option value="Tugas">Tugas</option>
                    <option value="Event">Event</option>
                    <option value="Tools">Tools</option>
                    <option value="Dokumentasi">Dokumentasi</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div class="auth-field">
                  <label for="lt-desc">Keterangan Singkat</label>
                  <input type="text" id="lt-desc" class="auth-input" placeholder="contoh: Folder slide kuliah dan rekaman zoom">
                </div>
                <div style="display:flex;gap:.5rem;margin-top:.5rem;">
                  <button type="submit" class="btn-p3" id="btn-save-link"><span>Simpan Tautan</span></button>
                  <button type="button" class="btn-p3 btn-subtle" id="btn-cancel-link"><span>Batal</span></button>
                </div>
              </form>
            </div>
          ` : ""}

          <div id="tautan-container">
            <p class="count" id="count-tautan">Memuat tautan...</p>
            <ul class="list" id="tautan-list"></ul>
          </div>
        `,
        after(body) {
          body.querySelectorAll(".links-filter-chip").forEach((b) => b.addEventListener("click", () => {
            rerender(b.dataset.cat);
          }));

          const formBox = body.querySelector("#form-tautan-box");
          body.querySelector("#btn-tambah-tautan")?.addEventListener("click", () => {
            if (formBox) formBox.style.display = formBox.style.display === "none" ? "block" : "none";
          });
          body.querySelector("#btn-cancel-link")?.addEventListener("click", () => {
            if (formBox) formBox.style.display = "none";
          });

          const form = body.querySelector("#form-tautan-new");
          if (form && services) {
            form.addEventListener("submit", async (e) => {
              e.preventDefault();
              const saveBtn = body.querySelector("#btn-save-link");
              saveBtn.disabled = true;
              try {
                await services.createLink({
                  judul: body.querySelector("#lt-judul").value.trim(),
                  url: body.querySelector("#lt-url").value.trim(),
                  kategori: body.querySelector("#lt-cat").value,
                  keterangan: body.querySelector("#lt-desc").value.trim()
                });
                rerender(filterCat);
              } catch (err) {
                alert("Gagal menyimpan tautan: " + err.message);
                saveBtn.disabled = false;
              }
            });
          }

          const countEl = body.querySelector("#count-tautan");
          const listEl = body.querySelector("#tautan-list");

          const renderItems = (items) => {
            const filtered = items.filter((t) => filterCat === "Semua" || (t.kategori || "Lainnya").toLowerCase() === filterCat.toLowerCase());
            countEl.textContent = `${filtered.length} tautan ${filterCat !== 'Semua' ? `kategori ${filterCat}` : 'tersedia'}`;
            if (!filtered.length) {
              listEl.innerHTML = `<li style="grid-column:1/-1;justify-content:center;padding:2rem;">Belum ada tautan untuk kategori "${esc(filterCat)}".</li>`;
              return;
            }
            listEl.innerHTML = filtered.map((t, i) => {
              const a = tautan(t.url, t.judul);
              return `<li style="--i:${i}">
                <span class="time">${esc(t.kategori || "Umum")}</span>
                <div>
                  <h3>${a}</h3>
                  <p>${esc(t.keterangan || "")}</p>
                  ${canManage ? `
                    <div class="task-action-btns">
                      <button type="button" class="task-action-btn btn-del-link" data-id="${esc(t.$id)}" style="color:#ff8591;">Hapus</button>
                    </div>
                  ` : ""}
                </div>
              </li>`;
            }).join("");

            listEl.querySelectorAll(".btn-del-link").forEach((b) => b.addEventListener("click", async () => {
              if (confirm("Hapus tautan ini?")) {
                try {
                  await services.deleteLink(b.dataset.id);
                  rerender(filterCat);
                } catch (e) { alert(e.message); }
              }
            }));
          };

          if (services && services.listLinks) {
            services.listLinks().then(renderItems).catch(() => renderItems([]));
          } else {
            renderItems([]);
            const btnResetAdm = body.querySelector("#btn-reset-pw-adm");
            const admResetRes = body.querySelector("#adm-reset-result");
            if (btnResetAdm && admResetRes) {
              btnResetAdm.addEventListener("click", async () => {
                const docId = selMember.value;
                const target = memberProfiles.find((m) => m.$id === docId);
                if (!docId || !target) return;
                if (!confirm(`Reset kata sandi untuk ${target.nama_lengkap} (${target.nim})?`)) return;
                admResetRes.classList.remove("show");
                admErr.classList.remove("show");
                btnResetAdm.disabled = true;
                try {
                  const res = await services.adminResetPassword(docId);
                  admResetRes.innerHTML = `Kata sandi sementara baru untuk <b>${esc(target.nama_lengkap)}</b>: <code style="user-select:all;">${esc(res.temporaryPassword)}</code>`;
                  admResetRes.classList.add("show");
                  services.logActivity("akun", "reset_password", `Admin mereset password ${target.nim}`);
                } catch (err) {
                  if (err.message === "FUNCTION_NOT_CONFIGURED") {
                    admResetRes.innerHTML = `Function cloud belum disetel. Jalankan perintah berikut di terminal admin:<br><code style="user-select:all;">node scripts/reset-password.js ${esc(target.nim)}</code>`;
                    admResetRes.classList.add("show");
                  } else {
                    admErr.textContent = err.message || "Gagal mereset kata sandi.";
                    admErr.classList.add("show");
                  }
                } finally {
                  btnResetAdm.disabled = false;
                }
              });
            }
          }
        }
      };
    },

    kas(subtab = "mutasi", rerender) {
      if (window.SDT && window.SDT.panelKas) {
        return window.SDT.panelKas(data, subtab, rerender);
      }
      return gagal("Modul pengelola kas belum siap.");
    },

    kredit() {
      const devList = (data.anggota && data.anggota.data && data.anggota.data.pengembang) || [
        { peran: "Frontend & Core Feature", nama: ["Mohammad Aditya Arkoun"], ket: "Arsitektur antarmuka, tata letak interaktif, sistem navigasi menu, pemutar musik, dan fitur inti website." },
        { peran: "Backend & Database", nama: ["Muhammad Hilmi Mu'Afa"], ket: "Struktur data, integrasi database & penyimpanan, serta arsitektur backend." },
        { peran: "Ideas & Support", nama: ["Davin Zoe Akhmad", "Ryandra Alifah Hafizd"], ket: "Konseptualisasi ide, pengujian fitur, evaluasi kebutuhan kelas, dan dukungan pengembangan." }
      ];
      const cards = devList.map((d, i) => {
        const cls = i === 0 ? "fe" : i === 1 ? "be" : "ideas";
        const avatars = d.nama.map((n) => `<div class="dev-avatar-row"><span class="dev-avatar" aria-hidden="true">${initials(n)}</span><span translate="no" style="font-weight:600;">${esc(n)}</span></div>`).join("");
        return `<div class="dev-card ${cls}" style="--i:${i}"><div><span class="dev-role-badge">${esc(d.peran)}</span><div style="margin-top:.6rem;">${avatars}</div></div><p class="dev-desc">${esc(d.ket)}</p></div>`;
      }).join("");

      return {
        sub: "Tim pengembang website kelas",
        html: `
          <div class="dev-team-head" style="margin-bottom:1.25rem;">
            <h3 class="dev-team-title" style="font-size:1.6rem;">Kredit Pembuatan Website</h3>
            <p class="dev-team-sub">Dirancang dan dibangun oleh mahasiswa Sains Data Terapan A</p>
          </div>
          <div class="dev-cards">${cards}</div>
          <div class="credits-footer">
            <p>Sains Data Terapan A &bull; Politeknik Elektronika Negeri Surabaya</p>
            <span>Dibuat dengan dedikasi untuk memudahkan kegiatan dan perkuliahan seluruh rekan kelas.</span>
          </div>
        `
      };
    },

    masuk(arg, rerender) {
      const auth = window.SDT && window.SDT.auth;
      if (auth && auth.state && auth.state.isLoggedIn) {
        return this.profil(arg, rerender);
      }

      const isConfigured = window.SDT && window.SDT.appwrite && window.SDT.appwrite.isConfigured;

      const html = `
        <div class="auth-card">
          <h3>Autentikasi Internal Kelas SDT A</h3>
          <p>Masuk menggunakan NIM atau Email kampus untuk mengakses hak akses pengurus dan profil.</p>

          ${!isConfigured ? `
            <div class="auth-notice" style="margin-bottom:1.2rem; padding:.85rem 1rem; background:rgba(84,237,234,.08); border:1px solid var(--edge);">
              <b style="color:var(--aqua); display:block; margin-bottom:.3rem;">Mode Simulasi Pengembang (Dev Mode)</b>
              <p style="font-size:.8rem; color:var(--text-dim); margin:0 0 .6rem;">Proyek Appwrite Cloud belum dihubungkan di <code>data/appwrite-config.js</code>. Anda dapat menguji seluruh hak akses (RBAC) dengan tombol simulasi instan di bawah:</p>
              <div style="display:flex; gap:.4rem; flex-wrap:wrap;">
                <button type="button" class="kas-btn kas-btn-sm" data-dev-login="admin"><span>Simulasi Admin (Arkoun)</span></button>
                <button type="button" class="kas-btn kas-btn-sm" data-dev-login="pengurus"><span>Simulasi Bendahara (Rihana)</span></button>
                <button type="button" class="kas-btn kas-btn-sm" data-dev-login="pj_matkul"><span>Simulasi PJ Matkul (Ghazi)</span></button>
                <button type="button" class="kas-btn kas-btn-sm kas-btn-outline" data-dev-login="mahasiswa"><span>Simulasi Mahasiswa (Davin)</span></button>
              </div>
            </div>
          ` : ''}

          <div class="auth-error" id="login-error"></div>

          <form id="form-login" class="auth-form" novalidate>
            <div class="auth-field">
              <label for="login-identitas">NRP (Username) atau Email Mahasiswa</label>
              <input class="auth-input" id="login-identitas" type="text" placeholder="contoh: 3326600016" autocomplete="username" required>
            </div>
            <div class="auth-field">
              <label for="login-password">Kata Sandi</label>
              <input class="auth-input" id="login-password" type="password" placeholder="Masukkan kata sandi akun" autocomplete="current-password" required>
            </div>
            <button type="submit" class="kas-btn kas-btn-primary" id="btn-submit-login" style="margin-top:.4rem;">
              <span>Masuk ke Kelas SDT A</span>
            </button>
          </form>

          <p style="margin:1.2rem 0 0; font-size:.76rem; color:var(--text-dim); line-height:1.4;">
            <b>Catatan Akun:</b> Tidak ada registrasi mandiri. Akun dibuat dan dikelola oleh Admin kelas. Jika Anda lupa kata sandi, hubungi Admin atau Komandan Tingkat untuk reset kata sandi sementara.
          </p>
        </div>
      `;

      return {
        sub: "Akses Pengguna Internal",
        html,
        after(body) {
          const form = body.querySelector("#form-login");
          const errBox = body.querySelector("#login-error");
          const btnSubmit = body.querySelector("#btn-submit-login");

          body.querySelectorAll("[data-dev-login]").forEach((b) => {
            b.addEventListener("click", () => {
              auth.devLogin(b.dataset.devLogin);
              rerender("profil");
            });
          });

          if (form) {
            form.addEventListener("submit", async (e) => {
              e.preventDefault();
              errBox.classList.remove("show");
              errBox.textContent = "";

              const identitas = body.querySelector("#login-identitas").value;
              const password = body.querySelector("#login-password").value;

              btnSubmit.disabled = true;
              btnSubmit.querySelector("span").textContent = "Memverifikasi...";

              try {
                await auth.login(identitas, password);
                rerender("profil");
              } catch (err) {
                errBox.textContent = err.message || "Gagal masuk. Periksa kembali kredensial Anda.";
                errBox.classList.add("show");
                btnSubmit.disabled = false;
                btnSubmit.querySelector("span").textContent = "Masuk ke Kelas SDT A";
              }
            });
            const btnResetAdm = body.querySelector("#btn-reset-pw-adm");
            const admResetRes = body.querySelector("#adm-reset-result");
            if (btnResetAdm && admResetRes) {
              btnResetAdm.addEventListener("click", async () => {
                const docId = selMember.value;
                const target = memberProfiles.find((m) => m.$id === docId);
                if (!docId || !target) return;
                if (!confirm(`Reset kata sandi untuk ${target.nama_lengkap} (${target.nim})?`)) return;
                admResetRes.classList.remove("show");
                admErr.classList.remove("show");
                btnResetAdm.disabled = true;
                try {
                  const res = await services.adminResetPassword(docId);
                  admResetRes.innerHTML = `Kata sandi sementara baru untuk <b>${esc(target.nama_lengkap)}</b>: <code style="user-select:all;">${esc(res.temporaryPassword)}</code>`;
                  admResetRes.classList.add("show");
                  services.logActivity("akun", "reset_password", `Admin mereset password ${target.nim}`);
                } catch (err) {
                  if (err.message === "FUNCTION_NOT_CONFIGURED") {
                    admResetRes.innerHTML = `Function cloud belum disetel. Jalankan perintah berikut di terminal admin:<br><code style="user-select:all;">node scripts/reset-password.js ${esc(target.nim)}</code>`;
                    admResetRes.classList.add("show");
                  } else {
                    admErr.textContent = err.message || "Gagal mereset kata sandi.";
                    admErr.classList.add("show");
                  }
                } finally {
                  btnResetAdm.disabled = false;
                }
              });
            }
          }
        }
      };
    },

    profil(arg, rerender) {
      const auth = window.SDT && window.SDT.auth;
      if (!auth || !auth.state || !auth.state.isLoggedIn) {
        return this.masuk(arg, rerender);
      }

      const p = auth.state.profile || {};
      const u = auth.state.user || {};
      const role = auth.state.role || "mahasiswa";
      const isSim = auth.state.isDevSim;

      const roleBadge = role === "admin"
        ? '<span class="tag red">ADMINISTRATOR</span>'
        : role === "pengurus"
        ? '<span class="tag now">PENGURUS KELAS</span>'
        : '<span class="tag">MAHASISWA</span>';

      const matkulInfo = p.matkul_pj && p.matkul_pj.length
        ? `<p style="margin:.4rem 0 0; font-size:.76rem; color:var(--aqua);">Penanggung Jawab Matkul: <b>${esc(p.matkul_pj.join(", "))}</b></p>`
        : '';

      const services = window.SDT && window.SDT.services;
      const avatarUrl = (services && services.getAvatarViewUrl) ? services.getAvatarViewUrl(p.foto_id) : null;

      const html = `
        <div class="profile-card">
          <div class="profile-head">
            <div class="profile-avatar">${avatarUrl ? `<img src="${esc(avatarUrl)}" alt="${esc(p.nama_lengkap || u.name || 'Mahasiswa')}">` : initials(p.nama_lengkap || u.name || "M")}</div>
            <div class="profile-info">
              <h3>${esc(p.nama_lengkap || u.name || "Mahasiswa")}</h3>
              <p>NIM: <b>${esc(p.nim || u.email || "-")}</b> &bull; ${roleBadge}</p>
              ${p.jabatan ? `<p style="color:var(--foam); font-size:.78rem;">Jabatan: ${esc(p.jabatan)}</p>` : ''}
              ${matkulInfo}
              ${isSim ? '<span style="display:inline-block; font-size:.65rem; color:#ffb3ba; margin-top:.2rem;">[Mode Simulasi Dev Aktif]</span>' : ''}
            </div>
          </div>

          <div style="display:flex; gap:.5rem; margin-top:.8rem; flex-wrap:wrap;">
            <button type="button" class="kas-btn kas-btn-sm" id="btn-logout" style="border-color:rgba(255,32,51,.6); color:#ff8591;">
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>

        <!-- Bagian 1: Perbarui Profil Pribadi -->
        <div class="auth-card">
          <h4 class="profile-section-title">Informasi Pribadi &amp; Profil</h4>
          <p>Informasi ini ditampilkan pada direktori profil mahasiswa saat nama Anda diklik.</p>
          <div class="auth-success" id="prof-success">Profil Anda berhasil diperbarui!</div>
          <div class="auth-error" id="prof-error"></div>

          <form id="form-edit-profil" class="auth-form" novalidate>
            <div class="auth-field">
              <label for="prof-avatar">Foto Profil Baru (Maks 2MB, JPG/PNG/WebP)</label>
              <input class="auth-input" id="prof-avatar" type="file" accept="image/jpeg,image/png,image/webp" style="padding:.4rem;">
            </div>
            <div class="auth-field">
              <label for="prof-bio">Bio Singkat</label>
              <textarea class="auth-textarea" id="prof-bio" placeholder="Tulis bio singkat tentang Anda...">${esc(p.bio || "")}</textarea>
            </div>
            <div class="auth-field">
              <label for="prof-minat">Minat &amp; Bidang Favorit (Pisahkan dengan koma)</label>
              <input class="auth-input" id="prof-minat" type="text" value="${esc((p.minat || []).join(", "))}" placeholder="contoh: Data Analytics, Python, NLP">
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:.75rem;">
              <div class="auth-field">
                <label for="prof-github">GitHub URL</label>
                <input class="auth-input" id="prof-github" type="url" value="${esc(p.github_url || "")}" placeholder="https://github.com/username">
              </div>
              <div class="auth-field">
                <label for="prof-linkedin">LinkedIn URL</label>
                <input class="auth-input" id="prof-linkedin" type="url" value="${esc(p.linkedin_url || "")}" placeholder="https://linkedin.com/in/username">
              </div>
              <div class="auth-field">
                <label for="prof-ig">Instagram URL</label>
                <input class="auth-input" id="prof-ig" type="url" value="${esc(p.instagram_url || "")}" placeholder="https://instagram.com/username">
              </div>
              <div class="auth-field">
                <label for="prof-web">Website / Portofolio</label>
                <input class="auth-input" id="prof-web" type="url" value="${esc(p.website_url || "")}" placeholder="https://web-pribadi.com">
              </div>
            </div>
            <button type="submit" class="kas-btn kas-btn-primary" id="btn-save-profile" style="margin-top:.4rem; justify-self:start;">
              <span>Simpan Perubahan Profil</span>
            </button>
          </form>
        </div>

        <!-- Bagian 2: Ganti Kata Sandi -->
        <div class="auth-card">
          <h4 class="profile-section-title">Ganti Kata Sandi</h4>
          <p>Gunakan kombinasi kata sandi baru yang aman (minimal 8 karakter).</p>
          <div class="auth-success" id="pw-success">Kata sandi berhasil diperbarui!</div>
          <div class="auth-error" id="pw-error"></div>

          <form id="form-change-password" class="auth-form" novalidate>
            <div class="auth-field">
              <label for="pw-lama">Kata Sandi Lama</label>
              <input class="auth-input" id="pw-lama" type="password" placeholder="Masukkan kata sandi lama Anda" required>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:.75rem;">
              <div class="auth-field">
                <label for="pw-baru">Kata Sandi Baru</label>
                <input class="auth-input" id="pw-baru" type="password" minlength="8" placeholder="Minimal 8 karakter" required>
              </div>
              <div class="auth-field">
                <label for="pw-konfirm">Konfirmasi Kata Sandi Baru</label>
                <input class="auth-input" id="pw-konfirm" type="password" minlength="8" placeholder="Ketik ulang kata sandi baru" required>
              </div>
            </div>
            <button type="submit" class="kas-btn kas-btn-outline" id="btn-save-pw" style="margin-top:.4rem; justify-self:start;">
              <span>Perbarui Kata Sandi</span>
            </button>
          </form>
        </div>

        ${role === "admin" ? `
          <!-- Bagian 3: Panel Admin (Kelola Role, Jabatan & PJ Matkul) -->
          <div class="auth-card" id="admin-role-panel">
            <h4 class="profile-section-title" style="color:#ff8591;">Panel Admin: Kelola Role &amp; PJ Matkul</h4>
            <p>Tetapkan hak akses (Admin / Pengurus / Mahasiswa), jabatan kelas, dan penugasan Penanggung Jawab Mata Kuliah.</p>
            <div class="auth-success" id="adm-success">Data anggota berhasil diperbarui!</div>
            <div class="auth-error" id="adm-error"></div>
            <form id="form-admin-role" class="auth-form">
              <div class="auth-field">
                <label for="adm-member">Pilih Mahasiswa (24 Anggota)</label>
                <select class="auth-input" id="adm-member" required>
                  <option value="">Memuat daftar mahasiswa...</option>
                </select>
              </div>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:.75rem;">
                <div class="auth-field">
                  <label for="adm-role">Role Akses</label>
                  <select class="auth-input" id="adm-role">
                    <option value="mahasiswa">Mahasiswa</option>
                    <option value="pengurus">Pengurus</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div class="auth-field">
                  <label for="adm-jabatan">Jabatan Kelas</label>
                  <input class="auth-input" id="adm-jabatan" type="text" placeholder="contoh: Bendahara / PJ Matkul">
                </div>
              </div>
              <div class="auth-field">
                <label for="adm-matkul-pj">Matkul PJ (Pisahkan dengan koma, atau "all")</label>
                <input class="auth-input" id="adm-matkul-pj" type="text" placeholder="contoh: Matematika 1, Statistika Dasar">
              </div>
              <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.4rem;">
                <button type="submit" class="kas-btn kas-btn-primary" id="btn-save-adm">
                  <span>Simpan Role &amp; Penugasan</span>
                </button>
                <button type="button" class="kas-btn kas-btn-outline" id="btn-reset-pw-adm" style="border-color:rgba(255,32,51,.6);color:#ff8591;">
                  <span>🔑 Reset Password Sementara</span>
                </button>
              </div>
              <div class="auth-success" id="adm-reset-result" style="margin-top:.5rem;"></div>
            </form>
          </div>
        ` : ""}
      `;

      return {
        sub: `Akun: ${esc(p.nama_lengkap || "Pengguna")} \u00b7 ${role.toUpperCase()}`,
        html,
        after(body) {
          body.querySelector("#btn-logout")?.addEventListener("click", async () => {
            if (confirm("Apakah Anda yakin ingin keluar dari akun?")) {
              await auth.logout();
              rerender("masuk");
            }
          });

          const formProf = body.querySelector("#form-edit-profil");
          const profSuccess = body.querySelector("#prof-success");
          const profError = body.querySelector("#prof-error");
          const btnProf = body.querySelector("#btn-save-profile");

          if (formProf) {
            formProf.addEventListener("submit", async (e) => {
              e.preventDefault();
              profSuccess.classList.remove("show");
              profError.classList.remove("show");

              const bio = body.querySelector("#prof-bio").value.trim();
              const minatStr = body.querySelector("#prof-minat").value.trim();
              const minat = minatStr ? minatStr.split(",").map((s) => s.trim()).filter(Boolean) : [];
              const github_url = body.querySelector("#prof-github").value.trim();
              const linkedin_url = body.querySelector("#prof-linkedin").value.trim();
              const instagram_url = body.querySelector("#prof-ig").value.trim();
              const website_url = body.querySelector("#prof-web").value.trim();

              btnProf.disabled = true;
              btnProf.querySelector("span").textContent = "Menyimpan...";

              try {
                let fotoId = p.foto_id;
                const avatarInput = body.querySelector("#prof-avatar");
                if (avatarInput && avatarInput.files && avatarInput.files[0] && services && services.uploadAvatar) {
                  const uploaded = await services.uploadAvatar(avatarInput.files[0]);
                  fotoId = uploaded.$id;
                }
                const payload = { bio, minat, github_url, linkedin_url, instagram_url, website_url };
                if (fotoId !== undefined) payload.foto_id = fotoId;
                await auth.updateProfile(payload);
                profSuccess.classList.add("show");
                btnProf.disabled = false;
                btnProf.querySelector("span").textContent = "Simpan Perubahan Profil";
                if (avatarInput && avatarInput.files && avatarInput.files[0]) rerender("profil");
              } catch (err) {
                profError.textContent = err.message || "Gagal memperbarui profil.";
                profError.classList.add("show");
                btnProf.disabled = false;
                btnProf.querySelector("span").textContent = "Simpan Perubahan Profil";
              }
            });
          }

          const formPw = body.querySelector("#form-change-password");
          const pwSuccess = body.querySelector("#pw-success");
          const pwError = body.querySelector("#pw-error");
          const btnPw = body.querySelector("#btn-save-pw");

          if (formPw) {
            formPw.addEventListener("submit", async (e) => {
              e.preventDefault();
              pwSuccess.classList.remove("show");
              pwError.classList.remove("show");

              const lama = body.querySelector("#pw-lama").value;
              const baru = body.querySelector("#pw-baru").value;
              const konfirm = body.querySelector("#pw-konfirm").value;

              if (baru.length < 8) {
                pwError.textContent = "Kata sandi baru minimal 8 karakter.";
                pwError.classList.add("show");
                return;
              }
              if (baru !== konfirm) {
                pwError.textContent = "Konfirmasi kata sandi baru tidak cocok.";
                pwError.classList.add("show");
                return;
              }

              btnPw.disabled = true;
              btnPw.querySelector("span").textContent = "Memperbarui...";

              try {
                await auth.changePassword(lama, baru);
                pwSuccess.classList.add("show");
                formPw.reset();
                btnPw.disabled = false;
                btnPw.querySelector("span").textContent = "Perbarui Kata Sandi";
              } catch (err) {
                pwError.textContent = err.message || "Gagal memperbarui kata sandi.";
                pwError.classList.add("show");
                btnPw.disabled = false;
                btnPw.querySelector("span").textContent = "Perbarui Kata Sandi";
              }
            });
          }

          // Panel Admin: Kelola Role & PJ Matkul
          const services = window.SDT && window.SDT.services;
          const admForm = body.querySelector("#form-admin-role");
          if (admForm && services && role === "admin") {
            const selMember = body.querySelector("#adm-member");
            const inpRole = body.querySelector("#adm-role");
            const inpJab = body.querySelector("#adm-jabatan");
            const inpPj = body.querySelector("#adm-matkul-pj");
            const admSucc = body.querySelector("#adm-success");
            const admErr = body.querySelector("#adm-error");
            const btnAdm = body.querySelector("#btn-save-adm");
            let memberProfiles = [];

            const fillFields = (id) => {
              const target = memberProfiles.find((m) => m.$id === id);
              if (!target) return;
              inpRole.value = target.role || "mahasiswa";
              inpJab.value = target.jabatan || "Mahasiswa";
              inpPj.value = Array.isArray(target.matkul_pj) ? target.matkul_pj.join(", ") : "";
            };

            services.listProfiles().then((list) => {
              memberProfiles = list || [];
              selMember.innerHTML = memberProfiles.map((m) => `<option value="${esc(m.$id)}">${esc(m.nim)} - ${esc(m.nama_lengkap)} (${esc(m.role)})</option>`).join("");
              if (memberProfiles.length) fillFields(memberProfiles[0].$id);
            }).catch(() => {});

            selMember.addEventListener("change", () => fillFields(selMember.value));

            admForm.addEventListener("submit", async (e) => {
              e.preventDefault();
              admSucc.classList.remove("show");
              admErr.classList.remove("show");
              const docId = selMember.value;
              if (!docId) return;
              btnAdm.disabled = true;
              btnAdm.querySelector("span").textContent = "Menyimpan...";
              try {
                const pjArr = inpPj.value.split(",").map((s) => s.trim()).filter(Boolean);
                await services.updateProfile(docId, {
                  role: inpRole.value,
                  jabatan: inpJab.value.trim() || "Mahasiswa",
                  matkul_pj: pjArr
                });
                const updated = memberProfiles.find((m) => m.$id === docId);
                if (updated) {
                  updated.role = inpRole.value;
                  updated.jabatan = inpJab.value.trim() || "Mahasiswa";
                  updated.matkul_pj = pjArr;
                }
                services.logActivity("akun", "update_role", `${docId} -> ${inpRole.value} (${inpJab.value})`);
                admSucc.classList.add("show");
              } catch (err) {
                admErr.textContent = err.message || "Gagal memperbarui role anggota.";
                admErr.classList.add("show");
              } finally {
                btnAdm.disabled = false;
                btnAdm.querySelector("span").textContent = "Simpan Role & Penugasan";
              }
            });
            const btnResetAdm = body.querySelector("#btn-reset-pw-adm");
            const admResetRes = body.querySelector("#adm-reset-result");
            if (btnResetAdm && admResetRes) {
              btnResetAdm.addEventListener("click", async () => {
                const docId = selMember.value;
                const target = memberProfiles.find((m) => m.$id === docId);
                if (!docId || !target) return;
                if (!confirm(`Reset kata sandi untuk ${target.nama_lengkap} (${target.nim})?`)) return;
                admResetRes.classList.remove("show");
                admErr.classList.remove("show");
                btnResetAdm.disabled = true;
                try {
                  const res = await services.adminResetPassword(docId);
                  admResetRes.innerHTML = `Kata sandi sementara baru untuk <b>${esc(target.nama_lengkap)}</b>: <code style="user-select:all;">${esc(res.temporaryPassword)}</code>`;
                  admResetRes.classList.add("show");
                  services.logActivity("akun", "reset_password", `Admin mereset password ${target.nim}`);
                } catch (err) {
                  if (err.message === "FUNCTION_NOT_CONFIGURED") {
                    admResetRes.innerHTML = `Function cloud belum disetel. Jalankan perintah berikut di terminal admin:<br><code style="user-select:all;">node scripts/reset-password.js ${esc(target.nim)}</code>`;
                    admResetRes.classList.add("show");
                  } else {
                    admErr.textContent = err.message || "Gagal mereset kata sandi.";
                    admErr.classList.add("show");
                  }
                } finally {
                  btnResetAdm.disabled = false;
                }
              });
            }
          }
        }
      };
    }
  };
}

window.SDT = window.SDT || {};
Object.assign(window.SDT, { HARI, KULIAH, esc, gagal, makePanels, ringkas });
})();
