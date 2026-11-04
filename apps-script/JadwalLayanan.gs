/**
 * SIM Komunitas – Jadwal Layanan & persetujuan Usulan Lokasi ("satu klik")
 * ---------------------------------------------------------------------------
 * File kedua di project "SIM Komunitas - API Portal Publik" (memakai ID_SPREADSHEET, SHEET_USULAN,
 * JADWAL, ZONA dari PortalPublik.gs).
 *
 * PEMASANGAN (sekali):
 *   1. Tambahkan file ini ke project (+ → Skrip → JadwalLayanan), tempel, Simpan.
 *   2. Jalankan pasangJadwalLayanan() → Izinkan.
 *      - membuat sheet "Jadwal Layanan" (diisi jadwal yang sudah ada)
 *      - menambah kolom persetujuan + kotak centang "Setujui ✔" di sheet "Usulan Lokasi"
 *      - memasang pemicu saat sheet diedit
 *   3. Terapkan → Kelola deployment → ✏️ → Versi baru (portal mulai membaca sheet Jadwal Layanan).
 *
 * CARA PAKAI PETUGAS:
 *   Usulan Lokasi → isi "Tanggal layanan (disetujui)" (+ jam & kuota bila perlu) → centang "Setujui ✔".
 *   Otomatis: baris baru di "Jadwal Layanan" (status "Segera dibuka") & di sheet "Lokasi" (QR bukti teori),
 *   status usulan menjadi "Dijadwalkan", dan muncul tautan "💬 Kirim WhatsApp" ke penanggung jawab.
 *   Setelah lokasi ditambahkan ke Google Form, ubah status di "Jadwal Layanan" menjadi "Buka".
 *   Portal ikut berubah paling lambat ±1 menit.
 */

var SHEET_JADWAL = 'Jadwal Layanan';
var SHEET_LOKASI_QR = 'Lokasi';
var PORTAL_URL = 'https://satpasbwi-sim.github.io/sim-komunitas-bwi/';
var PDF_KETENTUAN = PORTAL_URL + 'unduhan/Ketentuan-Peserta-SIM-Komunitas-Banyuwangi.pdf';
var BUKTI_URL = 'https://satpasbwi-sim.github.io/bukusimbwi/bukti/?lok=';
var HARI_LABEL_BARU = 3;   // lokasi yang baru ditambahkan diberi label "BARU" di portal selama 3 hari

var KOLOM_JADWAL = ['Kode', 'Nama tempat', 'Keterangan', 'Ikon', 'Tanggal layanan', 'Jam mulai', 'Jam selesai',
  'Teks cocok di formulir', 'Kuota SIM Baru', 'Kuota Perpanjangan', 'Status', 'Link Google Maps', 'Ditambahkan', 'Sumber'];
var STATUS_JADWAL = ['Segera dibuka', 'Buka', 'Tutup', 'Sembunyikan'];
var KOLOM_SETUJU = ['Tanggal layanan (disetujui)', 'Jam mulai', 'Jam selesai', 'Kuota SIM Baru', 'Kuota Perpanjangan',
  'Kode lokasi', 'Link Google Maps', 'Setujui ✔', 'Kabari penanggung jawab'];
var IKON_JENIS = { 'Pondok Pesantren': ['🕌', 'SIM Masuk Pesantren'], 'Kampus': ['🎓', 'SIM Masuk Kampus'],
  'Sekolah': ['🏫', 'SIM Masuk Sekolah'], 'Desa / Kelurahan': ['🏘️', 'SIM Masuk Desa'],
  'Instansi / Perusahaan': ['🏢', 'SIM Masuk Instansi'], 'Lainnya': ['📍', 'SIM Komunitas'] };

// ---------- Pemasangan ------------------------------------------------------
function pasangJadwalLayanan() {
  var ss = SpreadsheetApp.openById(ID_SPREADSHEET), laporan = [];

  // 1. Sheet Jadwal Layanan
  var sj = ss.getSheetByName(SHEET_JADWAL);
  if (!sj) {
    sj = ss.insertSheet(SHEET_JADWAL);
    sj.getRange(1, 1, 1, KOLOM_JADWAL.length).setValues([KOLOM_JADWAL]).setFontWeight('bold')
      .setBackground('#1f3864').setFontColor('#ffffff').setWrap(true);
    sj.setFrozenRows(1);
    var awal = JADWAL.map(function (j) {
      var t = j.tanggal.split('-');
      return [j.kode, j.nama, j.ket, j.ikon, new Date(+t[0], t[1] - 1, +t[2]), j.mulai, j.selesai, j.cocok,
        j.kuota.baru, j.kuota.perpanjangan, j.dibuka ? 'Buka' : 'Tutup', '', '', 'Jadwal awal'];
    });
    if (awal.length) sj.getRange(2, 1, awal.length, KOLOM_JADWAL.length).setValues(awal);
    laporan.push('Sheet "' + SHEET_JADWAL + '" dibuat dengan ' + awal.length + ' jadwal.');
  }
  sj.getRange('E2:E').setNumberFormat('dd/MM/yyyy');
  sj.getRange('F2:G').setNumberFormat('@');
  sj.getRange('M2:M').setNumberFormat('dd/MM/yyyy HH:mm');
  sj.getRange('K2:K').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUS_JADWAL, true).build());
  sj.getRange(1, 1).setNote('Sumber jadwal portal. Status: "Segera dibuka" = tampil tanpa tombol Daftar; "Buka" = tombol Daftar muncul; ' +
    '"Tutup" = pendaftaran ditutup; "Sembunyikan" = tidak tampil. Jadwal yang lewat jam selesainya otomatis "Selesai".');

  // 2. Kolom persetujuan di Usulan Lokasi
  var su = ss.getSheetByName(SHEET_USULAN);
  if (!su) {
    laporan.push('Sheet "' + SHEET_USULAN + '" belum ada (akan dibuat saat usulan pertama). Jalankan fungsi ini lagi setelahnya.');
  } else {
    var judul = su.getRange(1, 1, 1, su.getLastColumn()).getValues()[0].map(String);
    var tambah = KOLOM_SETUJU.filter(function (k) { return judul.indexOf(k) < 0; });
    if (tambah.length) {
      su.getRange(1, judul.length + 1, 1, tambah.length).setValues([tambah]).setFontWeight('bold')
        .setBackground('#fff2cc').setFontColor('#7f6000');
      laporan.push('Kolom persetujuan ditambahkan di "' + SHEET_USULAN + '": ' + tambah.join(', '));
    }
    judul = su.getRange(1, 1, 1, su.getLastColumn()).getValues()[0].map(String);
    var maks = su.getMaxRows() - 1, kol = function (n) { return judul.indexOf(n) + 1; };
    su.getRange(2, kol('Setujui ✔'), maks, 1).insertCheckboxes();
    su.getRange(2, kol('Tanggal layanan (disetujui)'), maks, 1).setNumberFormat('dd/MM/yyyy')
      .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().build());
    su.getRange(2, kol('Jam mulai'), maks, 2).setNumberFormat('@');
    su.getRange(1, kol('Setujui ✔')).setNote('Isi tanggal layanan (jam & kuota opsional), lalu centang untuk menjadwalkan.');
  }

  // 3. Pemicu edit
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'saatUsulanDiedit') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('saatUsulanDiedit').forSpreadsheet(ID_SPREADSHEET).onEdit().create();
  laporan.push('Pemicu "saatUsulanDiedit" terpasang.');

  CacheService.getScriptCache().remove('jadwal_v1');
  console.log(laporan.join('\n'));
  return laporan.join('\n');
}

// ---------- Pemicu: kotak "Setujui ✔" dicentang -----------------------------
function saatUsulanDiedit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() === SHEET_JADWAL) { CacheService.getScriptCache().remove('jadwal_v1'); return; }   // jadwal diubah → portal segar
  if (sh.getName() !== SHEET_USULAN || e.range.getRow() < 2) return;
  var judul = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var kolSetuju = judul.indexOf('Setujui ✔') + 1;
  if (e.range.getColumn() > kolSetuju || e.range.getLastColumn() < kolSetuju) return;
  for (var r = e.range.getRow(); r <= e.range.getLastRow(); r++) {
    var sel = sh.getRange(r, kolSetuju);
    if (sel.getValue() !== true) continue;
    try {
      var hasil = setujuiUsulan_(sh, r, judul);
      sel.setNote('✅ ' + hasil);
    } catch (err) {
      sel.setValue(false).setNote('⚠️ Belum dijadwalkan: ' + err.message);
    }
  }
}

function setujuiUsulan_(sh, baris, judul) {
  var kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try {
    var nilai = sh.getRange(baris, 1, 1, judul.length).getValues()[0];
    var tampil = sh.getRange(baris, 1, 1, judul.length).getDisplayValues()[0];
    var ambil = function (n) { var i = judul.indexOf(n); return i < 0 ? '' : nilai[i]; };
    var teks = function (n) { var i = judul.indexOf(n); return i < 0 ? '' : String(tampil[i]).trim(); };
    var kolom = function (n) { return judul.indexOf(n) + 1; };

    var nomor = teks('Nomor usulan'), jenis = teks('Jenis tempat'), nama = teks('Nama tempat'), kec = teks('Kecamatan');
    var pj = teks('Penanggung jawab'), wa = teks('WhatsApp').replace(/\D/g, '');
    var tgl = ambil('Tanggal layanan (disetujui)');
    if (!(tgl instanceof Date) || isNaN(tgl)) throw new Error('isi dulu kolom "Tanggal layanan (disetujui)".');
    var hariIni = new Date(); hariIni.setHours(0, 0, 0, 0);
    if (tgl < hariIni) throw new Error('tanggal layanan sudah lewat.');
    if (!nama) throw new Error('nama tempat kosong.');
    var mulai = jam_(teks('Jam mulai'), '08:00'), selesai = jam_(teks('Jam selesai'), '15:00');
    var kuotaBaru = angkaAtau_(ambil('Kuota SIM Baru'), ambil('Perkiraan SIM Baru'));
    var kuotaPerp = angkaAtau_(ambil('Kuota Perpanjangan'), ambil('Perkiraan Perpanjangan'));
    if (kuotaBaru + kuotaPerp < 1) throw new Error('isi kuota SIM Baru / Perpanjangan.');
    var kode = (teks('Kode lokasi') || kodeDari_(nama)).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
    var info = IKON_JENIS[jenis] || IKON_JENIS['Lainnya'];
    var ket = info[1] + (kec ? ' · Kec. ' + kec : '');
    var maps = teks('Link Google Maps');

    var ss = SpreadsheetApp.openById(ID_SPREADSHEET);
    var sj = ss.getSheetByName(SHEET_JADWAL);
    if (!sj) throw new Error('sheet "' + SHEET_JADWAL + '" belum ada. Jalankan pasangJadwalLayanan().');
    var data = sj.getDataRange().getDisplayValues(), barisJadwal = 0;
    for (var i = 1; i < data.length; i++) {
      if (nomor && data[i][13] === nomor) { barisJadwal = i + 1; break; }
      if (data[i][0].toUpperCase() === kode) throw new Error('kode "' + kode + '" sudah dipakai jadwal lain. Isi kolom "Kode lokasi" dengan kode lain.');
    }
    var isi = [kode, nama, ket, info[0], tgl, mulai, selesai, nama, kuotaBaru, kuotaPerp, 'Segera dibuka', maps, new Date(), nomor];
    if (barisJadwal) sj.getRange(barisJadwal, 1, 1, isi.length).setValues([isi]);
    else sj.appendRow(isi);

    // QR bukti teori di sheet Lokasi
    var tglIso = Utilities.formatDate(tgl, ZONA, 'yyyy-MM-dd');
    var sl = ss.getSheetByName(SHEET_LOKASI_QR);
    if (sl) {
      var kodeAda = sl.getLastRow() > 1 ? sl.getRange(2, 1, sl.getLastRow() - 1, 1).getDisplayValues().map(function (r) { return r[0].toUpperCase(); }) : [];
      if (kodeAda.indexOf(kode) < 0) {
        var bLok = sl.getLastRow() + 1;
        sl.getRange(bLok, 1, 1, 4).setValues([[kode, nama, tgl, BUKTI_URL + kode + '&tgl=' + tglIso]]);
        sl.getRange(bLok, 3).setNumberFormat('dd/MM/yyyy');
      }
    }

    // perbarui usulan
    var tglPanjang = hariTanggal_(tgl);
    if (kolom('Status (diisi petugas)')) sh.getRange(baris, kolom('Status (diisi petugas)')).setValue('Dijadwalkan');
    if (kolom('Kode lokasi')) sh.getRange(baris, kolom('Kode lokasi')).setValue(kode);
    var kolTL = kolom('Tindak lanjut petugas');
    if (kolTL) {
      var tl = teks('Tindak lanjut petugas');
      var catat = 'Dijadwalkan ' + tglPanjang + ' (' + kode + ')';
      if (tl.indexOf(catat) < 0) sh.getRange(baris, kolTL).setValue((tl ? tl + ' · ' : '') + catat);
    }
    var kolWA = kolom('Kabari penanggung jawab');
    if (kolWA && wa) {
      var nomorWA = wa.replace(/^0/, '62');
      if (/^8/.test(nomorWA)) nomorWA = '62' + nomorWA;   // nomor yang tersimpan tanpa angka 0 di depan
      var pesan = 'Assalamualaikum / Salam sejahtera Bapak/Ibu ' + pj + '.\n' +
        'Usulan SIM Komunitas di ' + nama + (nomor ? ' (' + nomor + ')' : '') + ' telah DISETUJUI ✅\n\n' +
        '📅 ' + tglPanjang + ', pukul ' + mulai + '–' + selesai + ' WIB\n' +
        '👥 Kuota: SIM Baru ' + kuotaBaru + ' orang, Perpanjangan ' + kuotaPerp + ' orang\n\n' +
        'Mohon diteruskan kepada calon peserta:\n' +
        '• Jadwal, sisa kuota & pendaftaran: ' + PORTAL_URL + '#jadwal\n' +
        '• Ketentuan peserta (PDF): ' + PDF_KETENTUAN + '\n\n' +
        'Petugas akan menghubungi kembali untuk persiapan lokasi. Terima kasih.\n– Satpas Polresta Banyuwangi';
      var url = 'https://wa.me/' + nomorWA + '?text=' + encodeURIComponent(pesan);
      var pisah = /^(en|ja|ko|zh|th|he|iw|ms|fil|tl|hi)/.test(ss.getSpreadsheetLocale()) ? ',' : ';';
      sh.getRange(baris, kolWA).setFormula('=HYPERLINK("' + url + '"' + pisah + ' "💬 Kirim WhatsApp")');
    }
    CacheService.getScriptCache().remove('jadwal_v1');
    return 'Dijadwalkan ' + tglPanjang + ' (' + kode + '). Status di "' + SHEET_JADWAL + '": Segera dibuka.';
  } finally {
    kunci.releaseLock();
  }
}

// ---------- Dibaca oleh jadwalPublik_() di PortalPublik.gs -------------------
/** Daftar jadwal dari sheet "Jadwal Layanan", atau null bila sheet belum ada/kosong. */
function bacaJadwalLayanan_(ss) {
  var sj = ss.getSheetByName(SHEET_JADWAL);
  if (!sj || sj.getLastRow() < 2) return null;
  var nilai = sj.getDataRange().getValues(), tampil = sj.getDataRange().getDisplayValues();
  var batasBaru = Date.now() - HARI_LABEL_BARU * 864e5, hasil = [];
  for (var r = 1; r < nilai.length; r++) {
    var v = nilai[r], t = tampil[r], status = String(t[10]).trim();
    if (!t[0] || status === 'Sembunyikan') continue;
    var tgl = v[4] instanceof Date ? Utilities.formatDate(v[4], ZONA, 'yyyy-MM-dd') : tanggalIso_(v[4], t[4]);
    if (!tgl) continue;
    hasil.push({ kode: String(t[0]).trim(), nama: String(t[1]).trim(), ket: String(t[2]).trim(), ikon: String(t[3]).trim() || '📍',
      tanggal: tgl, mulai: jam_(t[5], '08:00'), selesai: jam_(t[6], '15:00'), cocok: String(t[7]).trim() || String(t[1]).trim(),
      kuota: { baru: angkaAtau_(v[8], 0), perpanjangan: angkaAtau_(v[9], 0) },
      dibuka: status === 'Buka', segera: status === 'Segera dibuka', maps: String(t[11]).trim(),
      baru: v[12] instanceof Date && v[12].getTime() > batasBaru });
  }
  return hasil.length ? hasil : null;
}

// ---------- Pembantu -------------------------------------------------------
function jam_(v, bawaan) {
  var m = /(\d{1,2})[:.](\d{2})/.exec(String(v || ''));
  return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : bawaan;
}
function angkaAtau_(v, cadangan) {
  var n = Math.floor(Number(v));
  if (!isFinite(n) || n <= 0 || v === '' || v === null) { n = Math.floor(Number(cadangan)); if (!isFinite(n) || n < 0) n = 0; }
  return Math.min(n, 2000);
}
function kodeDari_(nama) {
  return String(nama).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').trim().split(/\s+/).slice(0, 3).join('-');
}
function hariTanggal_(d) {
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var x = new Date(Utilities.formatDate(d, ZONA, "yyyy-MM-dd'T'12:00:00"));
  return HARI[x.getDay()] + ', ' + x.getDate() + ' ' + BULAN[x.getMonth()] + ' ' + x.getFullYear();
}
