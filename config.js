/* =========================================================================
   PENGATURAN PORTAL SIM KOMUNITAS — ubah di sini, tidak perlu menyentuh app.js
   ========================================================================= */
window.SIMKOM = {
  // URL Web App dari apps-script/PortalPublik.gs (berakhiran /exec).
  // Kosongkan bila belum di-deploy: portal tetap jalan memakai JADWAL_CADANGAN tanpa angka kuota,
  // dan fitur Cek Status menampilkan petunjuk menghubungi petugas.
  API_URL: 'https://script.google.com/macros/s/AKfycbzQ6zt8PMdWfBiBzeTPcjTPHTeNz9ewWqmV2IxDDKCXuP4mXrj1c3DfXgm0GWmeuwcl/exec',

  // Formulir pendaftaran (Google Form).
  FORM_URL: 'https://docs.google.com/forms/d/1j1uq_Icfur-kvcN8V1mTYfZWPPHFWyh3rSmIWg_EQyM/viewform',

  // Halaman kirim bukti ujian teori (sudah ada di Buku Digital). Kode lokasi ditambahkan otomatis.
  BUKTI_URL: 'https://satpasbwi-sim.github.io/bukusimbwi/bukti/?lok=',

  // Buku Digital SIM Satpas Banyuwangi: bank soal & halaman persiapan ujian teori E-AVIS.
  BUKU_URL: 'https://satpasbwi-sim.github.io/bukusimbwi/',
  BUKU_TEORI: 'https://satpasbwi-sim.github.io/bukusimbwi/#b5-1',
  BUKU_KOMUNITAS: 'https://satpasbwi-sim.github.io/bukusimbwi/#b-komunitas',
  SOAL_URL: 'https://satpasbwi-sim.github.io/bukusimbwi/simulasi/soal-eavis.json',

  // WhatsApp layanan Satpas (format internasional tanpa +).
  WA: '6285233900100',
  WA_TAMPIL: '0852-3390-0100',

  // Dipakai bila API_URL kosong atau server tidak menjawab. Samakan dengan JADWAL di PortalPublik.gs.
  JADWAL_CADANGAN: [
    { kode: 'BBPVP-MUNCAR', nama: 'BBPVP Muncar', ket: 'SIM Masuk Desa · Masyarakat Kec. Muncar', ikon: '🏘️',
      tanggal: '2026-11-03', mulai: '08:00', selesai: '15:00', dibuka: false },
    { kode: 'UNIBA', nama: 'UNIBA', ket: 'SIM Masuk Kampus · Universitas PGRI Banyuwangi', ikon: '🎓',
      tanggal: '2026-11-05', mulai: '08:00', selesai: '15:00', dibuka: true }
  ],

  // Tarif PNBP resmi (PP No. 76 Tahun 2020). Dibayar di loket resmi / BRIVA, bukan ke perorangan.
  PNBP: { baru: { C: 100000, A: 120000 }, perpanjangan: { C: 75000, A: 80000 } },
  USIA_MIN: { C: 17, A: 17 }
};
