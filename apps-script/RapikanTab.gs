/**
 * SIM Komunitas – Rapikan tab spreadsheet
 * ---------------------------------------------------------------------------
 * Tambahkan file ini ke project "SIM Komunitas - API Portal Publik"
 * (klik + → Skrip → beri nama RapikanTab → tempel → Simpan), lalu jalankan:
 *
 *   rapikanTab()          → urutkan, beri warna, sembunyikan sheet yang jarang dibuka
 *   tampilkanSemuaTab()   → batalkan: tampilkan lagi semua sheet
 *
 * AMAN: tidak ada sheet yang dihapus, tidak ada sel data yang diubah.
 * Satu-satunya tambahan: isi sheet "Panduan" disalin menjadi CATATAN (note) di sel A1 sheet "Lokasi".
 * Memakai ID_SPREADSHEET dari file PortalPublik.gs di project yang sama.
 * Tidak memengaruhi web app; tidak perlu deployment baru.
 */

var TAB_INTI    = ['Form Responses 1', 'SIM Baru', 'SIM Perpanjangan', 'Bukti Teori', 'Lokasi', 'Usulan Lokasi'];
var TAB_LAPORAN = ['Rekap', 'Hasil Ujian Teori'];
var TAB_CETAK   = ['Cetak SIM Baru', 'Cetak SIM Perpanjangan'];
var TAB_ARSIP   = ['Arsip SIM Baru', 'Arsip Bukti Teori', 'Daftar di Lokasi', 'Panduan'];

var WARNA_TAB = { inti: '#34a853', laporan: '#4285f4', cetak: '#fbbc04', arsip: '#9aa0a6' };

function rapikanTab() {
  var ss = SpreadsheetApp.openById(ID_SPREADSHEET);
  var laporan = [];
  var urutan = [].concat(TAB_INTI, TAB_LAPORAN, TAB_CETAK, TAB_ARSIP);
  var kelompok = {};
  TAB_INTI.forEach(function (n) { kelompok[n] = 'inti'; });
  TAB_LAPORAN.forEach(function (n) { kelompok[n] = 'laporan'; });
  TAB_CETAK.forEach(function (n) { kelompok[n] = 'cetak'; });
  TAB_ARSIP.forEach(function (n) { kelompok[n] = 'arsip'; });

  // 1. Salin panduan menjadi catatan di Lokasi!A1 (sekali saja)
  var panduan = ss.getSheetByName('Panduan'), lokasi = ss.getSheetByName('Lokasi');
  if (panduan && lokasi) {
    var teks = panduan.getRange(1, 1, Math.max(1, panduan.getLastRow()), 1).getDisplayValues()
      .map(function (r) { return r[0]; }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    var sel = lokasi.getRange('A1'), lama = sel.getNote();
    if (teks && lama.indexOf('PANDUAN SHEET LOKASI') < 0) {
      sel.setNote((lama ? lama + '\n\n' : '') + teks);
      laporan.push('Panduan disalin sebagai catatan di Lokasi!A1 (arahkan kursor ke sel A1 untuk membaca).');
    }
  }

  // 2. Tampilkan semua sheet yang termasuk daftar tampil, supaya urutan bisa diatur
  urutan.forEach(function (n) { var sh = ss.getSheetByName(n); if (sh && sh.isSheetHidden()) sh.showSheet(); });

  // 3. Urutkan dan beri warna
  var posisi = 1;
  urutan.forEach(function (n) {
    var sh = ss.getSheetByName(n);
    if (!sh) { laporan.push('Dilewati (tidak ditemukan): ' + n); return; }
    ss.setActiveSheet(sh);
    ss.moveActiveSheet(posisi++);
    sh.setTabColor(WARNA_TAB[kelompok[n]]);
  });
  var lain = ss.getSheets().filter(function (sh) { return !kelompok[sh.getName()]; }).map(function (sh) { return sh.getName(); });
  if (lain.length) laporan.push('Sheet lain dibiarkan di urutan akhir tanpa diubah: ' + lain.join(', '));

  // 4. Sembunyikan sheet cetak & arsip
  [].concat(TAB_CETAK, TAB_ARSIP).forEach(function (n) {
    var sh = ss.getSheetByName(n);
    if (sh && !sh.isSheetHidden()) { sh.hideSheet(); laporan.push('Disembunyikan: ' + n); }
  });

  ss.setActiveSheet(ss.getSheetByName(TAB_INTI[0]) || ss.getSheets()[0]);
  console.log('SELESAI.\n' + laporan.join('\n') +
    '\n\nTab tampil: ' + ss.getSheets().filter(function (s) { return !s.isSheetHidden(); }).map(function (s) { return s.getName(); }).join(' · ') +
    '\nSheet tersembunyi bisa dibuka lewat menu Lihat → Sheet tersembunyi.');
}

/** Membatalkan penyembunyian: semua sheet tampil lagi (urutan & warna tetap). */
function tampilkanSemuaTab() {
  var ss = SpreadsheetApp.openById(ID_SPREADSHEET);
  ss.getSheets().forEach(function (sh) { if (sh.isSheetHidden()) sh.showSheet(); });
  console.log('Semua sheet ditampilkan kembali.');
}
