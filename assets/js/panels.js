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
      // Tab keenam: kalender bulanan (tenggat tugas, UTS/UAS). day = "kalender" (bulan ini) atau "tahun-bulan"
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
      const rows = sesi.map((s, i) => {
        let state = "";
        if (day === hariIni) {
          if (nowM >= menit(s.mulai) && nowM < menit(s.selesai)) state = "now";
          else if (!nextFound && nowM < menit(s.mulai)) { state = "next"; nextFound = true; }
        }
        const status = state === "now" ? `<span class="tag now">Sedang berlangsung</span> ` : state === "next" ? `<span class="tag next">Berikutnya</span> ` : "";
        return `<li class="${state}" style="--i:${i}"><span class="snum" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span><span class="tblock">${esc(s.mulai)} - ${esc(s.selesai)}</span><div><h3>${esc(s.matkul)}</h3><p><span translate="no">${esc(s.dosen.join(" / "))}</span> \u00b7 ${esc(s.ruang)}</p><p>PJ: <span translate="no">${esc(s.pj)}</span></p>${status}<span class="tag ${s.jenis === "praktikum" ? "red" : ""}">${esc(s.jenis)}</span></div></li>`;
      }).join("");
      return {
        sub: day === hariIni ? `${day} \u00b7 hari ini` : day,
        html: `<div class="tabs" role="tablist" aria-label="Pilih hari">${tabs}</div><div role="tabpanel" id="jadwal-hari" aria-labelledby="tab-${day}">${sesi.length ? `<ul class="list sched">${rows}</ul>` : kosong("Tidak ada kuliah", `Belum ada sesi untuk hari ${esc(day)}.`)}</div>`,
        after: pasangTab
      };
    },

    // Kalender bulanan: hari ini, tenggat tugas, minggu UTS/UAS. ym = "tahun-bulan" (bulan 1-12)
    kalender(ym, rerender) {
      const [y, m] = (ym || `${now.getFullYear()}-${now.getMonth() + 1}`).split("-").map(Number);
      const sem = data.semester;
      const iso = (d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const tugas = (data.tugas.data || []).filter((p) => p.jenis === "tugas" && p.tenggat && p.tenggat.startsWith(iso(1).slice(0, 8)))
        .sort((a, b) => a.tenggat.localeCompare(b.tenggat));
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
        const kini = selisihHari(iso(d), now) === 0;
        if (u && (d === 1 || !ujian(d - 1))) baris.push([iso(d), `Minggu ${u}`, "Mulai tanggal ini sampai Jumat"]);
        tg.forEach((p) => baris.push([p.tenggat, p.judul, `Tenggat tugas \u00b7 ${p.matkul || ""}`]));
        const kelas = [kini && "kini", t.getDay() === 6 && "sab", t.getDay() === 0 && "min", u && "ujian", tg.length && "tugas"].filter(Boolean).join(" ");
        sel += `<li class="${kelas}"${kini ? ' aria-current="date"' : ""}>${d}<small>${u}</small>${tg.length ? `<span class="sr-only">, tenggat: ${esc(tg.map((p) => p.judul).join(", "))}</span>` : ""}</li>`;
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

    anggota() {
      if (data.anggota.error) return gagal(data.anggota.error);
      const sorted = [...data.anggota.data.mahasiswa].sort((a, b) => a.localeCompare(b, "id"));
      return {
        sub: `${sorted.length} mahasiswa`,
        html: `<label class="sr-only" for="cari">Cari nama</label><input class="search" id="cari" name="cari" type="search" placeholder="Cari nama mahasiswa\u2026" autocomplete="off" spellcheck="false"><p class="count" id="count" aria-live="polite"></p><ul class="people" id="people" translate="no"></ul>`,
        after(body) {
          const count = body.querySelector("#count"), list = body.querySelector("#people");
          const draw = (q = "") => {
            const hit = sorted.filter((n) => n.toLowerCase().includes(q.trim().toLowerCase()));
            count.textContent = q ? `${hit.length} dari ${sorted.length} nama` : `${sorted.length} nama, urut abjad`;
            list.innerHTML = hit.length
              ? hit.map((n, i) => `<li style="--i:${i}"><span class="initial" aria-hidden="true">${initials(n)}</span><span>${esc(n)}</span></li>`).join("")
              : `<li style="grid-column:1/-1;justify-content:center">Tidak ada nama yang cocok dengan "${esc(q)}"</li>`;
          };
          draw();
          body.querySelector("#cari").addEventListener("input", (e) => draw(e.target.value));
        }
      };
    },

    pengurus() {
      if (data.anggota.error) return gagal(data.anggota.error);
      const { dosenWali, pengurus } = data.anggota.data;
      // Gabungkan jabatan yang sama (mis. dua sekretaris) dalam satu kartu, urutan dipertahankan
      const grup = [];
      pengurus.forEach((p) => {
        const g = grup.find((x) => x.jabatan === p.jabatan);
        g ? g.nama.push(p.nama) : grup.push({ jabatan: p.jabatan, nama: [p.nama] });
      });
      const cards = grup.map((p, i) => `<div class="officer" style="--i:${i + 1}"><div class="num" aria-hidden="true">${ROMAWI[i] || i + 1}</div><p class="role">${esc(p.jabatan)}</p><p translate="no">${p.nama.map(esc).join("<br>")}</p></div>`).join("");
      return {
        sub: "Struktur organisasi kelas",
        html: `<div class="officer wali" style="--i:0"><div class="num" aria-hidden="true">0</div><p class="role">${esc(dosenWali.jabatan)}</p><p translate="no">${esc(dosenWali.nama)}</p></div><div class="officers">${cards}</div>`
      };
    },

    tugas() {
      if (data.tugas.error) return gagal(data.tugas.error);
      const list = data.tugas.data.filter((p) => p.jenis === "tugas");
      if (!list.length) return { sub: "Tugas dan tenggat", html: kosong("Belum ada tugas", 'Tambahkan item berjenis <code>"tugas"</code> beserta mata kuliah dan tenggat di <code>data/tugas.js</code>.') };
      const sisaHari = (t) => selisihHari(t, now);
      // Yang masih berjalan di atas (tenggat terdekat dulu), yang sudah lewat di bawah
      const sorted = [...list].sort((a, b) => {
        const sa = sisaHari(a.tenggat), sb = sisaHari(b.tenggat);
        if ((sa < 0) !== (sb < 0)) return sa < 0 ? 1 : -1;
        return sa < 0 ? sb - sa : sa - sb;
      });
      const rows = sorted.map((p, i) => {
        const h = sisaHari(p.tenggat);
        const label = h < 0 ? `<span class="tag done">Lewat</span>` : h === 0 ? `<span class="tag now">Hari ini</span>` : `<span class="tag due">H-${h}</span>`;
        return `<li class="${h < 0 ? "past" : ""}" style="--i:${i}"><span class="time">${tanggal(p.tenggat)}</span><div><h3>${esc(p.judul)}</h3><p>${esc(p.matkul || "")}</p><p>${esc(p.isi)}</p><p>${tautan(p.tautan, "Buka tautan")}</p>${label}</div></li>`;
      }).join("");
      return { sub: "Urut tenggat terdekat", html: `<ul class="list">${rows}</ul>` };
    },

    tautan() {
      if (data.tautan.error) return gagal(data.tautan.error);
      const rows = data.tautan.data.map((t, i) => {
        const a = tautan(t.url, t.judul);
        return a && `<li style="--i:${i}"><span class="time">${esc(t.kategori || "")}</span><div><h3>${a}</h3><p>${esc(t.keterangan || "")}</p></div></li>`;
      }).join("");
      if (!rows) return { sub: "Tautan penting kelas", html: kosong("Belum ada tautan", "Tambahkan tautan (LMS, Drive, formulir) di <code>data/tautan.js</code>.") };
      return { sub: "Dibuka di tab baru", html: `<ul class="list">${rows}</ul>` };
    },

    kas(subtab = "mutasi", rerender) {
      if (window.SDT && window.SDT.panelKas) {
        return window.SDT.panelKas(data, subtab, rerender);
      }
      return gagal("Modul pengelola kas belum siap.");
    }
  };
}

window.SDT = window.SDT || {};
Object.assign(window.SDT, { HARI, KULIAH, esc, gagal, makePanels, ringkas });
})();
