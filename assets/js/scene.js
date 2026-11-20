// scene.js (skrip biasa agar situs bisa dibuka tanpa server)
// Hiasan latar: tulisan vertikal miring, garis batas lempeng putih yang sejajar
// dengan tulisan, jam dan tanggal.
(function () {

const EXTRA_TILT = (10 * Math.PI) / 180;  // tambahan kemiringan dari sudut dasar lempeng
const EDGE_GAP = 76;                       // jarak tetap kolom abu-abu ke garis batas (tempat pemutar musik)
const LENGTH = 0.98;                       // panjang tulisan relatif terhadap panjang garis miring

// Geometri terakhir yang dihitung; dipakai juga oleh pemutar musik
let geo = null;

// Lebar lempeng bawaan CSS: clamp(7rem, 30vw, 30rem)
const baseWidth = () => Math.min(Math.max(112, innerWidth * 0.3), 480);

function slabGeometry() {
  if (geo) return geo;
  // Sebelum dihitung (atau di ponsel): pakai bentuk bawaan CSS
  const W = document.querySelector(".slab").getBoundingClientRect().width, H = innerHeight;
  const run = W * 0.38;
  return { W, H, tilt: Math.atan(run / H), edgeAt: (y) => W - run * (y / H) };
}

function layout() {
  const wm = document.querySelector(".wordmark");
  const slab = document.querySelector(".slab");
  const clockEl = document.querySelector(".clock");
  if (!wm || !slab) return;

  if (innerWidth <= 760) {                 // ponsel: kembali ke bentuk bawaan CSS, tulisan tegak
    geo = null;
    window.SDT.wordmark = null;
    slab.style.cssText = "";
    if (clockEl) clockEl.style.left = "";
    wm.style.cssText = "";
    wm.style.fontSize = "100px";
    wm.style.fontSize = (100 * innerHeight * 1.04) / wm.offsetHeight + "px";
    return;
  }

  const H = innerHeight, W0 = baseWidth();
  // Satu sudut untuk tulisan, garis batas, dan pemutar musik
  const phi = Math.atan((W0 * 0.38) / H) + EXTRA_TILT;
  const tan = Math.tan(phi);
  // Garis batas melewati titik tengah tepi lempeng bawaan, lalu dimiringkan sebesar phi
  const mid = W0 * 0.81;
  const edgeAt = (y) => mid + (H / 2 - y) * tan;

  // Lempeng putih mengikuti garis batas baru
  const top = edgeAt(0), bottom = Math.max(0, edgeAt(H));
  slab.style.width = top + "px";
  slab.style.clipPath = `polygon(0 0, 100% 0, ${(bottom / top) * 100}% 100%, 0 100%)`;

  // Tulisan: panjang mengikuti garis miring, tepi kanan kolom abu-abu sejajar garis batas
  wm.style.cssText = "font-size:100px;left:0;top:0;transform:none";
  wm.style.fontSize = (100 * (H / Math.cos(phi)) * LENGTH) / wm.offsetHeight + "px";
  const w = wm.offsetWidth, h = wm.offsetHeight;
  const cx = mid - EDGE_GAP - (w / 2) / Math.cos(phi);
  wm.style.left = cx - w / 2 + "px";
  wm.style.top = H / 2 - h / 2 + "px";
  wm.style.transform = `rotate(${180 + (phi * 180) / Math.PI}deg)`;

  // Jam: sedikit di kanan ujung bawah garis batas
  if (clockEl) clockEl.style.left = edgeAt(H * 0.9) + innerWidth * 0.025 + "px";

  geo = { W: top, H, tilt: phi, edgeAt };
  window.SDT.wordmark = {
    phi, gap: EDGE_GAP,
    rightAt: (y) => edgeAt(y) - EDGE_GAP
  };
}

function fitWordmark() {
  layout();
  addEventListener("resize", layout);
  if (document.fonts) document.fonts.ready.then(layout);
}

// Fase bulan: 0 = bulan baru, 0.5 = purnama (perkiraan dari panjang rata-rata satu siklus)
const moonPhase = (t) => { const p = ((t - Date.UTC(2000, 0, 6, 18, 14)) / 864e5 / 29.530588853) % 1; return p < 0 ? p + 1 : p; };
function moonPath(p) {
  const right = p < 0.5, thin = p < 0.25 || p > 0.75;   // sisi terang di kanan saat bulan membesar
  const rx = Math.abs(Math.cos(2 * Math.PI * p)).toFixed(3);
  return `M0-1A1 1 0 0 ${right ? 1 : 0} 0 1A${rx} 1 0 0 ${thin === right ? 0 : 1} 0-1`;
}

function clock() {
  const time = document.getElementById("clock-time");
  const date = document.getElementById("clock-date");
  if (!time) return;
  const fmt = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  const moon = document.getElementById("moon");
  let last = "";
  const show = () => {
    const t = new Date();
    const key = t.getHours() + ":" + t.getMinutes();
    if (key === last) return;
    last = key;
    time.textContent = String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0");
    date.textContent = fmt.format(t);
    if (moon) moon.innerHTML = `<circle r="1" fill="rgba(4,18,96,.55)" stroke="#fff" stroke-width=".12"/><path d="${moonPath(moonPhase(t))}" fill="#fff"/>`;
    document.body.classList.toggle("dark-hour", t.getHours() === 0);
  };
  show();
  setInterval(show, 1000);
}

window.SDT = window.SDT || {};
Object.assign(window.SDT, { fitWordmark, clock, slabGeometry, moonPhase });
})();
