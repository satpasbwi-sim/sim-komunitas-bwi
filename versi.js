/* Penentu versi portal – dimuat di <head> agar tidak ada kedipan tampilan.
   Versi A (bawaan): SIM Baru & Perpanjangan  → https://satpasbwi-sim.github.io/sim-komunitas-bwi/
   Versi B: khusus Perpanjangan               → …/sim-komunitas-bwi/?versi=perpanjangan  (atau …/perpanjangan/)
   Elemen ber-atribut data-hanya="A" / "B" hanya tampil pada versi itu (lihat style.css). */
(function () {
  var v = '';
  try { v = (new URLSearchParams(location.search).get('versi') || '').toLowerCase(); } catch (e) { /* browser lama */ }
  var versi = (v === 'b' || v === 'perpanjangan') ? 'B' : 'A';
  document.documentElement.setAttribute('data-versi', versi);
  window.SIMKOM_VERSI = versi;
  if (versi === 'B') {
    var m = document.querySelector('link[rel="manifest"]');
    if (m) m.setAttribute('href', 'manifest-perpanjangan.webmanifest');
    document.title = 'SIM Perpanjangan Komunitas Banyuwangi';
  }
})();
