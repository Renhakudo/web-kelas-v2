(function () {
// app.js (skrip biasa; dijalankan terakhir)
// Titik masuk situs: memuat data, membangun menu, membuka/menutup panel,
// kendali keyboard, dan tautan langsung ke panel (mis. index.html#jadwal).


const MENU = [
  { key: "jadwal", label: "Jadwal", desc: "Jadwal kuliah, tenggat, dan ujian", r: -16, x: 2 },
  { key: "anggota", label: "Anggota", desc: "Daftar mahasiswa", r: -12, x: 0 },
  { key: "pengurus", label: "Pengurus", desc: "Struktur organisasi", r: -7, x: 3.5 },
  { key: "tugas", label: "Tugas", desc: "Tugas dan tenggat", r: -2, x: 4 },
  { key: "kas", label: "Kas", desc: "Pengelola kas dan iuran kelas", r: 2, x: 2.5 },
  { key: "rangkuman", label: "Rangkuman", desc: "Rangkuman materi per minggu", r: 7, x: 1 },
  { key: "tautan", label: "Tautan", desc: "Tautan penting kelas", r: 12, x: 3.5 }
];

// Pengaturan, Kredit, dan Autentikasi dibuka dari tombol kanan atas, bukan dari menu
const PENGATURAN = { key: "pengaturan", label: "Pengaturan" };
const KREDIT = { key: "kredit", label: "Kredit" };
const MASUK = { key: "masuk", label: "Masuk" };
const PROFIL = { key: "profil", label: "Profil Saya" };

const $ = (s) => document.querySelector(s);
// Mengubah alamat (tautan langsung) tanpa memuat ulang. Di lingkungan tertentu
// (mis. pratinjau dalam iframe tertutup) peramban melarangnya; abaikan saja.
const setUrl = (url) => { try { history.replaceState(null, "", url); } catch {} };
const menuEl = $("#menu");
const panel = $("#panel");
const body = $("#panel-body");

// Hiasan latar tidak menunggu data
const { makePanels, ringkas, esc, fitWordmark, clock, initMusic } = window.SDT;
fitWordmark();
clock();
initMusic();

// ---------- Menu ----------
MENU.forEach((m, i) => {
  const li = document.createElement("li");
  li.style.setProperty("--i", i);
  // Tautan biasa: bisa dibuka di tab baru atau disalin; klik biasa membuka panel di tempat
  li.innerHTML = `<a class="item" href="#${m.key}" aria-haspopup="dialog" data-i="${i}" style="--r:${m.r}deg;--x:${m.x}vw"><span class="txt">${esc(m.label)}</span></a>`;
  menuEl.appendChild(li);
});
const items = [...menuEl.querySelectorAll(".item")];
let current = 0;
let lastOpener = null;
let panels = null; // diisi setelah data termuat
let pendingKey = null, pendingArg; // panel (dan tabnya) yang diminta sebelum data siap

function select(i, focus = true) {
  current = (i + items.length) % items.length;
  items.forEach((el, j) => {
    el.classList.toggle("on", j === current);
    el.setAttribute("aria-current", j === current ? "true" : "false");
  });
  $("#cmd-title").textContent = MENU[current].desc;
  $("#ghost").textContent = MENU[current].label;   // kata besar di latar ikut pilihan
  if (focus) items[current].focus({ preventScroll: true });
}

items.forEach((el, i) => {
  el.addEventListener("mouseenter", () => select(i, false));
  el.addEventListener("focus", () => { if (current !== i) select(i, false); });
  el.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // biarkan buka di tab baru
    e.preventDefault();
    select(i, false);
    openPanel(MENU[i].key, el);
  });
});

// ---------- Panel ----------
function show(key, arg) {
  const m = MENU.find((x) => x.key === key) ||
    (key === KREDIT.key ? KREDIT : key === MASUK.key ? MASUK : key === PROFIL.key ? PROFIL : PENGATURAN);
  $("#panel-title").textContent = m.label;
  $("#panel-head").dataset.ghost = m.label;
  fitTitle();
  if (!panels) {
    $("#panel-sub").textContent = "Memuat data\u2026";
    body.innerHTML = "";
    pendingKey = key; pendingArg = arg;
    return;
  }
  const view = panels[key](arg, (day) => {
    show(key, day);
    body.querySelector(`[data-day="${day}"]`)?.focus();
  });
  $("#panel-sub").textContent = view.sub || "";
  body.innerHTML = view.html;
  if (view.after) view.after(body);
}

// Judul panel dikecilkan bila tidak muat, agar tombol Tutup tidak terdorong keluar layar
function fitTitle() {
  const t = $("#panel-title");
  t.style.fontSize = "";
  let size = parseFloat(getComputedStyle(t).fontSize);
  while (t.scrollWidth > t.clientWidth + 1 && size > 14) { size -= 1; t.style.fontSize = size + "px"; }
}
addEventListener("resize", () => document.body.classList.contains("open") && fitTitle());
if (document.fonts) document.fonts.ready.then(() => document.body.classList.contains("open") && fitTitle());

function openPanel(key, opener) {
  // Rangkuman punya tampilan sendiri (kartu tarot), bukan panel geser
  if (key === "rangkuman") { closePanel(); window.KS.open(""); return; }
  lastOpener = opener || items[MENU.findIndex((m) => m.key === key)];
  show(key);
  document.body.classList.add("open");
  menuEl.setAttribute("inert", "");
  if (location.hash !== "#" + key) setUrl("#" + key);
  setTimeout(() => (body.querySelector(".tab[aria-selected='true'], .search, .switch") || $("#close")).focus(), 60);
}

function closePanel() {
  if (!document.body.classList.contains("open")) return;
  document.body.classList.remove("open");
  menuEl.removeAttribute("inert");
  setUrl(location.pathname + location.search);
  if (lastOpener) lastOpener.focus({ preventScroll: true });
}

$("#close").addEventListener("click", closePanel);
$("#backdrop").addEventListener("click", closePanel);

// ---------- Tautan langsung: index.html#jadwal ----------
function fromHash() {
  const key = location.hash.slice(1);
  if (key === "rangkuman" || key.startsWith("rangkuman/")) {
    select(MENU.findIndex((m) => m.key === "rangkuman"), false);
    closePanel(); // panel lain tidak boleh tertinggal di atas Rangkuman
    window.KS.open(key.split("/").slice(1).join("/"));
    return;
  }
  if (key === PENGATURAN.key) { openPanel(key, settingsBtn); return; }
  if (key === KREDIT.key || key === "credit") { openPanel(KREDIT.key, creditsBtn); return; }
  if (key === "masuk" || key === "login") {
    const isLog = window.SDT.auth && window.SDT.auth.state && window.SDT.auth.state.isLoggedIn;
    openPanel(isLog ? PROFIL.key : MASUK.key, authBtn);
    return;
  }
  if (key === "profil" || key === "profile" || key === "akun") {
    openPanel(PROFIL.key, authBtn);
    return;
  }
  // Tautan lama #kalender: kalender kini tab di panel Jadwal
  if (key === "kalender") { select(0, false); openPanel("jadwal"); show("jadwal", "kalender"); return; }
  if (key === "kas" || key.startsWith("kas/")) {
    const sub = key.split("/")[1] || "mutasi";
    select(MENU.findIndex((m) => m.key === "kas"), false);
    openPanel("kas");
    show("kas", sub);
    return;
  }
  const i = MENU.findIndex((m) => m.key === key);
  if (i >= 0) { select(i, false); openPanel(key); }
}
addEventListener("hashchange", fromHash);

// ---------- Keyboard ----------
document.addEventListener("keydown", (e) => {
  const open = document.body.classList.contains("open");
  if (e.key === "Escape") { closePanel(); return; }
  if (open) {
    if (e.key === "Tab") { // jaga fokus tetap di dalam panel
      const f = [...panel.querySelectorAll("button:not([tabindex='-1']), input, summary, a[href]")];
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    return;
  }
  if (e.target.closest && e.target.closest("input, textarea")) return;
  if (["ArrowDown", "s", "S"].includes(e.key)) { e.preventDefault(); select(current + 1); }
  if (["ArrowUp", "w", "W"].includes(e.key)) { e.preventDefault(); select(current - 1); }
  if (e.key === "m" || e.key === "M") setelan("gerak", !document.body.classList.contains("gerak"));
});

// ---------- Pengaturan: sakelar yang diingat peramban; semuanya mati secara bawaan ----------
// Setiap sakelar memasang/melepas satu kelas pada <body>; tampilannya diatur CSS.
const SETELAN = [
  { kelas: "gerak", label: "Animasi latar", ket: "Gelembung, cahaya, dan serpihan bergerak. Biarkan mati bila situs terasa berat. Tombol M di Beranda." },
  { kelas: "ringan", label: "Mode ringan", ket: "Menyembunyikan efek cahaya air agar lebih lancar di perangkat lama." },
  { kelas: "navy", label: "Panel biru tua", ket: "Warna panel lebih gelap, biru tua." }
];
function setelan(kelas, on) {
  document.body.classList.toggle(kelas, on);
  try { localStorage.setItem("setelan-" + kelas, on ? "1" : "0"); } catch {}
}
SETELAN.forEach((s) => {
  let on = false;
  let saved = null;
  try { saved = localStorage.getItem("setelan-" + s.kelas); } catch {}
  on = saved === null ? s.kelas === "ringan" && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4) : saved === "1";
  document.body.classList.toggle(s.kelas, on);
});
const settingsBtn = $("#settings");
const creditsBtn = $("#credits");
const authBtn = $("#auth-btn");

settingsBtn.addEventListener("click", () => openPanel(PENGATURAN.key, settingsBtn));
if (creditsBtn) creditsBtn.addEventListener("click", () => openPanel(KREDIT.key, creditsBtn));
if (authBtn) {
  authBtn.addEventListener("click", () => {
    const isLog = window.SDT.auth && window.SDT.auth.state && window.SDT.auth.state.isLoggedIn;
    openPanel(isLog ? PROFIL.key : MASUK.key, authBtn);
  });
}

// Reaktif: perbarui tombol auth di pojok kanan atas saat status login berubah
if (window.SDT && window.SDT.auth && window.SDT.auth.onAuthChange) {
  window.SDT.auth.onAuthChange((st) => {
    if (!authBtn) return;
    const labelSpan = authBtn.querySelector("span");
    if (!labelSpan) return;
    if (st.isLoggedIn && st.profile) {
      authBtn.classList.add("logged-in");
      const shortName = (st.profile.nama_lengkap || "User").split(" ")[0];
      const roleCls = st.role === "admin" ? "admin" : "";
      labelSpan.innerHTML = `&#128100; ${esc(shortName)}<span class="role-pill ${roleCls}">${esc(st.role.toUpperCase())}</span>`;
    } else {
      authBtn.classList.remove("logged-in");
      labelSpan.innerHTML = "Masuk";
    }
  });
}
const teks = (on) => (on ? "Nyala" : "Mati");
function panelPengaturan() {
  return {
    sub: "Disimpan di peramban ini",
    html: `
      <ul class="list set">${SETELAN.map((s, i) => `<li style="--i:${i}"><div><h3 id="set-${s.kelas}">${s.label}</h3><p>${s.ket}</p></div><button type="button" class="switch" role="switch" data-kelas="${s.kelas}" aria-labelledby="set-${s.kelas}" aria-checked="${document.body.classList.contains(s.kelas)}">${teks(document.body.classList.contains(s.kelas))}</button></li>`).join("")}</ul>
      <div class="set-credits-box">
        <div>
          <h3 class="set-credits-title">Kredit Pembuat Website</h3>
          <p class="set-credits-desc">Dikembangkan oleh mahasiswa Sains Data Terapan A</p>
        </div>
        <button type="button" class="kas-btn kas-btn-sm" id="btn-goto-credits"><span>Lihat Tim Pengembang &rarr;</span></button>
      </div>
    `,
    after(el) {
      el.querySelectorAll(".switch").forEach((b) => b.addEventListener("click", () => {
        const on = b.getAttribute("aria-checked") !== "true";
        setelan(b.dataset.kelas, on);
        b.setAttribute("aria-checked", String(on));
        b.textContent = teks(on);
      }));
      el.querySelector("#btn-goto-credits")?.addEventListener("click", () => {
        openPanel(KREDIT.key, creditsBtn);
      });
    }
  };
}

select(0, false);
fromHash();

// ---------- Data (dari data/*.js) ----------
const DATA = window.DATA || {};
const ambil = (k) => DATA[k]
  ? { data: DATA[k], error: null }
  : { data: null, error: `Berkas data/${k}.js tidak terbaca. Mungkin ada salah ketik (koma atau tanda kutip) atau berkasnya terhapus.` };
const kelas = ambil("kelas");
if (kelas.data && kelas.data.nama) document.title = kelas.data.nama;
const semua = { kelas, jadwal: ambil("jadwal"), anggota: ambil("anggota"), tugas: ambil("tugas"), tautan: ambil("tautan"), kas: ambil("kas"), semester: DATA.rangkuman && DATA.rangkuman.semester };
panels = makePanels(semua);
panels.pengaturan = panelPengaturan;
// Ringkasan hari ini di bawah jam; diperbarui tiap menit
const gambarRingkas = () => { $("#today").innerHTML = ringkas(semua, semua.semester).map(([a, b]) => `<span><b>${esc(a)}</b>${esc(b)}</span>`).join(""); };
gambarRingkas();
setInterval(gambarRingkas, 60000);
if (pendingKey && document.body.classList.contains("open")) show(pendingKey, pendingArg);
pendingKey = null;
})();
