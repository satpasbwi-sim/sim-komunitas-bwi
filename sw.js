/* Service worker – SIM Komunitas Banyuwangi (PWA)
   Cakupan: /sim-komunitas-bwi/ saja. Nama cache diawali "simkom-" supaya tidak mengganggu
   cache Buku Digital (/bukusimbwi/) yang berbagi origin satpasbwi-sim.github.io.

   Strategi:
   - Halaman, config.js, app.js, style.css  → jaringan dulu (selalu versi terbaru), cadangan dari cache bila offline
   - Gambar, ikon, PDF, font, bank soal      → cache dulu, diperbarui diam-diam di belakang
   - Apps Script (kuota, cek status, usulan) → selalu jaringan, TIDAK disimpan (data pribadi & angka langsung)
   Naikkan VERSI bila daftar PRECACHE berubah. */
var VERSI = 'simkom-v10';
var CACHE = VERSI + '-inti';
var PRECACHE = [
  './', 'index.html', 'style.css', 'app.js', 'config.js', 'versi.js', 'manifest.webmanifest', 'manifest-perpanjangan.webmanifest',
  'perpanjangan/', 'perpanjangan/index.html',
  'img/ikon-192.png', 'img/ikon-512.png', 'img/ikon-maskable-512.png', 'img/ikon-apple-180.png',
  'img/logo-lantas-baru.webp', 'img/sampul-lengkap-1000.webp', 'img/sampul-perpanjangan-1000.webp', 'img/qr-portal.svg',
  'unduhan/ketentuan-sim-komunitas.html', 'unduhan/Ketentuan-Peserta-SIM-Komunitas-Banyuwangi.pdf'
];
var SOAL = 'https://satpasbwi-sim.github.io/bukusimbwi/simulasi/soal-eavis.json';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(PRECACHE.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); }))
      .then(function () { return c.add(SOAL).catch(function () {}); });
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (nama) {
    return Promise.all(nama.filter(function (n) { return n.indexOf('simkom-') === 0 && n.indexOf(VERSI) !== 0; })
      .map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (e) { if (e.data === 'pakai-versi-baru') self.skipWaiting(); });

function jaringanDulu(req) {
  return fetch(req).then(function (res) {
    if (res && res.ok) { var salin = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, salin); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (r) {
      return r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error());
    });
  });
}

function cacheDulu(req) {
  return caches.match(req).then(function (r) {
    var segar = fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { var salin = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, salin); }); }
      return res;
    }).catch(function () { return r || Response.error(); });
    return r || segar;
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return;           // data langsung: jangan disentuh
  var lingkup = new URL(self.registration.scope);
  if (url.origin === lingkup.origin && url.pathname.indexOf(lingkup.pathname) === 0) {
    if (req.mode === 'navigate' || /\.(html|js|css|webmanifest)$/.test(url.pathname) || url.pathname === lingkup.pathname) {
      e.respondWith(jaringanDulu(req));
    } else {
      e.respondWith(cacheDulu(req));
    }
    return;
  }
  if (req.url === SOAL || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) e.respondWith(cacheDulu(req));
});
