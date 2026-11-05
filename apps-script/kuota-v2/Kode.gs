/**
 * SIM Komunitas — pemilahan pendaftar & kuota otomatis PER LOKASI LAYANAN
 * Spreadsheet: "Formulir Pendaftaran SIM Komunitas (Jawaban)" (tertaut ke Google Form SIM Komunitas)
 *
 * Dipasang sebagai proyek Apps Script mandiri di akun satpasbwi@gmail.com.
 * Urutan pemasangan untuk jadwal baru (jalankan dari editor Apps Script):
 *  1. tambahPertanyaanLokasi() — menambah pertanyaan wajib "Lokasi & Tanggal Layanan" ke Google Form
 *  2. kosongkanDataLama()      — mengosongkan jawaban & bukti teori jadwal lama (ARSIPKAN DULU spreadsheet-nya)
 *  3. pasang()                 — membuat ulang sheet "SIM Baru" & "SIM Perpanjangan" + pemicu (lihat pasangPemicu)
 *
 * cekKuota() menghitung NIK unik per lokasi & jenis permohonan di sheet jawaban:
 *  - kuota Baru DAN Perpanjangan satu lokasi penuh -> lokasi itu dihapus dari pilihan "Lokasi & Tanggal Layanan"
 *  - kuota satu jenis di satu lokasi penuh -> pendaftar berikutnya tetap tercatat sebagai CADANGAN, dan keterangan
 *    pertanyaan lokasi memberi tahu jenis yang sudah penuh
 *  - semua lokasi penuh -> formulir berhenti menerima jawaban (dengan pesan penutup)
 *  - (sejak 5 Nov 2026) formulir dibuka kembali otomatis bila ada lokasi berstatus Buka di sheet "Jadwal Layanan".
 * Setelah menghapus baris ganda / mengubah kuota, jalankan cekKuota() lagi dari editor.
 * Bila pertanyaan formulir atau daftar LOKASI diubah, jalankan tambahPertanyaanLokasi() lalu pasang() lagi.
 *
 * SEJAK 5 NOV 2026 – JADWAL DARI SHEET "Jadwal Layanan":
 *  - Daftar lokasi diambil dari sheet "Jadwal Layanan" (diisi lewat persetujuan Usulan Lokasi di proyek
 *    "SIM Komunitas - API Portal Publik"). LOKASI_TETAP di bawah hanya cadangan bila sheet itu belum ada.
 *  - Kolom yang dipakai: Tanggal layanan, Teks cocok di formulir (= teks pilihan Google Form), Kuota SIM Baru,
 *    Kuota Perpanjangan, Status (hanya "Buka" yang tampil di formulir), Layanan ("Perpanjangan saja" = kuota Baru 0).
 *  - cekKuotaBerkala (tiap 1 menit) mendeteksi perubahan jadwal: lokasi/tanggal/kuota berubah -> pasang() otomatis;
 *    hanya status berubah -> cekKuota() (pilihan formulir diperbarui). Tidak perlu mengubah kode lagi.
 *  - Tidak ada lokasi berstatus Buka -> formulir ditutup otomatis; ada lagi -> formulir dibuka otomatis.
 *    Menutup pendaftaran cukup dengan mengubah Status lokasi menjadi "Tutup".
 */

var SPREADSHEET_ID = '1Gkn-UoX98ITUTdN2qMWVImjX_o7vxKCLS9xVibcEo0g';
var SHEET_JAWABAN = 'Form Responses 1';
var SHEET_BUKTI = 'Bukti Teori'; // dibuat oleh proyek "Kirim Bukti Ujian Teori" (sim-komunitas/bukti-teori)
// kuota bawaan per lokasi; tiap lokasi di LOKASI boleh menimpanya lewat kunci "kuota"
var KUOTA = { 'Baru': 50, 'Perpanjangan': 40 }; // SIM Baru dinaikkan 20 -> 50 (3 Nov 2026)
// Pilihan pertanyaan "Lokasi & Tanggal Layanan". Teks pilihan tanpa koma (dipakai di dalam rumus sheet).
// tanggal = hari layanan [tahun, bulan, tanggal]; SIM lama Perpanjangan yang habis sebelum tanggal ini tidak
// memakai kuota (harus daftar SIM Baru).
// tutup: true = kegiatan sudah selesai -> hilang dari pilihan formulir, tetapi pendaftarnya tetap dihitung di sheet
// SIM Baru / SIM Perpanjangan / Rekap dan tetap bisa dipilih di sheet Cetak. Jangan dihapus dari daftar selama
// datanya masih ada di sheet jawaban. Teks pilihan harus sama persis dengan pilihan di Google Form.
var JUDUL_LOKASI = 'Lokasi & Tanggal Layanan';
var LOKASI_TETAP = [
  { pilihan: 'BBPVP Muncar (Masyarakat Desa Kec. Muncar) - Selasa 3 November 2026', tanggal: [2026, 11, 3], tutup: true },
  // UNIBA: kuota SIM Baru 20 orang (permintaan 4 Nov 2026); Perpanjangan memakai KUOTA bawaan
  { pilihan: 'UNIBA (Universitas PGRI Banyuwangi) - Kamis 5 November 2026', tanggal: [2026, 11, 5], kuota: { 'Baru': 20 } }
];
var SHEET_JADWAL = 'Jadwal Layanan';
var LOKASI = muatLokasi_();

/**
 * Daftar lokasi dari sheet "Jadwal Layanan" + lokasi LOKASI_TETAP yang tidak ada di sheet (data lamanya tetap dihitung).
 * Teks pilihan yang merupakan potongan teks LOKASI_TETAP (mis. "UNIBA") memakai teks lengkap lamanya, supaya jawaban
 * yang sudah masuk tetap cocok. Gagal membaca sheet -> LOKASI_TETAP (pendaftaran tidak terganggu).
 */
function muatLokasi_() {
  try {
    var sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_JADWAL);
    if (!sh || sh.getLastRow() < 2) return LOKASI_TETAP;
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, 15).getValues();
    var hariIni = new Date(); hariIni.setHours(0, 0, 0, 0);
    var dariSheet = [], dipakai = {};
    v.forEach(function (r) {
      var teks = String(r[7] || r[1] || '').replace(/,/g, '').replace(/\s+/g, ' ').trim(), tgl = r[4];
      if (!String(r[0]).trim() || !teks || !(tgl instanceof Date)) return;
      var tetap = LOKASI_TETAP.filter(function (l) { return l.pilihan.indexOf(teks) >= 0; })[0];
      var pilihan = tetap ? tetap.pilihan : teks;
      if (dipakai[pilihan]) return;
      var perpSaja = String(r[14]).trim() === 'Perpanjangan saja';
      var angka = function (x, jenis) { var n = Number(x); return (x === '' || x === null || !isFinite(n)) ? kuotaLokasi_(tetap || {}, jenis) : n; };
      var hari = new Date(tgl.getFullYear(), tgl.getMonth(), tgl.getDate());
      dariSheet.push({ pilihan: pilihan, tanggal: [tgl.getFullYear(), tgl.getMonth() + 1, tgl.getDate()],
        kuota: { 'Baru': perpSaja ? 0 : angka(r[8], 'Baru'), 'Perpanjangan': angka(r[9], 'Perpanjangan') },
        tutup: String(r[10]).trim() !== 'Buka' || hari < hariIni, layanan: perpSaja ? 'perpanjangan' : 'lengkap' });
      dipakai[pilihan] = true;
    });
    var hasil = LOKASI_TETAP.filter(function (l) { return !dipakai[l.pilihan]; })
      .map(function (l) { var x = JSON.parse(JSON.stringify(l)); x.tutup = true; return x; })   // lokasi lama: hanya dihitung
      .concat(dariSheet);
    return hasil.length ? hasil : LOKASI_TETAP;
  } catch (err) {
    Logger.log('Jadwal Layanan tidak terbaca, memakai LOKASI_TETAP: ' + err.message);
    return LOKASI_TETAP;
  }
}

// sidik jadwal: berubah -> rumus sheet (pasang) atau pilihan formulir (cekKuota) perlu diperbarui
function sidikRumus_() {
  return JSON.stringify(LOKASI.map(function (l) { return [l.pilihan, l.tanggal, kuotaLokasi_(l, 'Baru'), kuotaLokasi_(l, 'Perpanjangan')]; }));
}
function sidikForm_() {
  return JSON.stringify(LOKASI.map(function (l) { return [l.pilihan, !!l.tutup, l.layanan || '']; }));
}
// true = keterangan pertanyaan lokasi menampilkan sisa kuota. Angka itu berubah di setiap kiriman,
// jadi formulir ikut ditulis ulang tiap ada pendaftar dan editor Google Form yang sedang dibuka memuat ulang.
// false = keterangan hanya berubah saat kuota satu jenis di satu lokasi penuh.
var TAMPILKAN_SISA = false;
var JUDUL_NIK = 'Nomor Induk Kependudukan (NIK)';
var JUDUL_PERMOHONAN = 'Jenis Permohonan SIM';
var JUDUL_JENIS_SIM = 'Jenis SIM yang Diajukan';
var JUDUL_HABIS = 'Tanggal Habis Masa Berlaku SIM Lama';
var JUDUL_KLASTER = 'Nama Klaster Sim Komunitas';
// bagian formulir tujuan tiap pilihan "Jenis Permohonan SIM"
var HALAMAN = {
  'Baru': 'Ujian Teori (Khusus SIM Baru)',
  'Perpanjangan': 'Data SIM Lama (Khusus Perpanjangan)'
};
var PESAN_TUTUP = 'Mohon maaf, kuota pendaftaran SIM Komunitas untuk semua lokasi sudah penuh. ' +
  'Info jadwal berikutnya: WhatsApp Satpas 0852-3390-0100 atau Instagram @satpassim_banyuwangi.';

function kuotaLokasi_(l, jenis) {
  return (l.kuota && l.kuota[jenis] !== undefined) ? l.kuota[jenis] : KUOTA[jenis];
}

// [awal judul kolom di sheet jawaban, judul kolom di sheet pilahan]. Judul dicocokkan dari awalnya, jadi
// tambahan di belakang judul pertanyaan (mis. "(sesuai KTP)") tidak membuat kolom hilang.
var KOLOM_UMUM = [
  ['Timestamp', 'Waktu daftar'],
  [JUDUL_NIK, 'NIK'],
  ['Nama Lengkap Sesuai KTP', 'Nama'],
  ['Jenis Kelamin', 'Jenis kelamin'],
  ['Tanggal Lahir', 'Tanggal lahir'],
  ['Nomor Telepon atau WhatsApp', 'WhatsApp'],
  ['Alamat Desa/Kelurahan & Kecamatan Domisili di Banyuwangi', 'Alamat'],
  [JUDUL_KLASTER, 'Klaster'],
  ['Identitas Pondok Pesantren', 'Komunitas'],
  ['Status / Peran di Komunitas', 'Status / peran'],
  [JUDUL_JENIS_SIM, 'Jenis SIM'],
  [JUDUL_LOKASI, 'Lokasi layanan']
];
var SHEET_PILAHAN = [
  { nama: 'SIM Baru', jenis: 'Baru',
    // "Permohonan di form" = Perpanjangan menandai pindahan dari Perpanjangan (SIM lama habis)
    kolom: KOLOM_UMUM.concat([['Metode Ujian Teori', 'Metode ujian teori'], [JUDUL_PERMOHONAN, 'Permohonan di form']]) },
  { nama: 'SIM Perpanjangan', jenis: 'Perpanjangan',
    kolom: KOLOM_UMUM.concat([['Nomor SIM Lama', 'Nomor SIM lama'],
      [JUDUL_HABIS, 'SIM lama berlaku s/d']]) }
];

function spreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function huruf_(sh, kolom) {
  return sh.getRange(1, kolom).getA1Notation().replace(/\d+/g, '');
}

/** Indeks (0-based) kolom yang judulnya sama dengan, atau diawali, teks t; -1 bila tidak ada. */
function indeksJudul_(judul, t) {
  var i = judul.indexOf(t);
  if (i >= 0) return i;
  for (var k = 0; k < judul.length; k++) {
    if (String(judul[k]).trim().indexOf(t) === 0) return k;
  }
  return -1;
}

// setFormula mengikuti lokal spreadsheet: lokal berdesimal koma (mis. Indonesia) memakai ";" sebagai pemisah
// argumen. Rumus di bawah ditulis dengan "," dan tidak memuat koma di dalam teks, jadi aman diganti.
function rumus_(ss, f) {
  var titik = /^(en|ja|ko|zh|th|he|iw|ms|fil|tl|hi)/.test(ss.getSpreadsheetLocale());
  return titik ? f : f.replace(/,/g, ';');
}

/** Jalankan sekali dari editor: menambah pertanyaan "Lokasi & Tanggal Layanan" (wajib) sebelum pertanyaan Klaster. */
function tambahPertanyaanLokasi() {
  var form = FormApp.openByUrl(spreadsheet_().getFormUrl());
  var items = form.getItems(), ada = null, posisi = -1;
  items.forEach(function (it, i) {
    if (it.getTitle() === JUDUL_LOKASI) ada = it.asMultipleChoiceItem();
    if (it.getTitle() === JUDUL_KLASTER && posisi < 0) posisi = i;
  });
  var pilihan = LOKASI.filter(function (l) { return !l.tutup; }).map(function (l) { return l.pilihan; });
  if (ada) {
    ada.setChoiceValues(pilihan).setRequired(true);
  } else {
    var baru = form.addMultipleChoiceItem().setTitle(JUDUL_LOKASI)
      .setHelpText('Pilih lokasi dan tanggal Anda akan datang. Kuota dihitung per lokasi.')
      .setChoiceValues(pilihan).setRequired(true);
    if (posisi >= 0) form.moveItem(baru.getIndex(), posisi);
  }
  var hasil = 'Pertanyaan "' + JUDUL_LOKASI + '" ' + (ada ? 'diperbarui' : 'ditambahkan') + ': ' + pilihan.join(' | ');
  Logger.log(hasil);
  return hasil;
}

/**
 * Jalankan dari editor SETELAH spreadsheet diarsipkan (Drive > Buat salinan): menghapus semua baris jawaban di
 * sheet jawaban dan semua kiriman di sheet Bukti Teori, supaya kuota & rekap jadwal baru mulai dari nol.
 * Jawaban yang tersimpan di Google Form sendiri tidak dihapus.
 */
function kosongkanDataLama() {
  var ss = spreadsheet_(), hasil = [];
  [SHEET_JAWABAN, SHEET_BUKTI].forEach(function (nama) {
    var sh = ss.getSheetByName(nama);
    if (!sh || sh.getLastRow() < 2) { hasil.push(nama + ': 0 baris'); return; }
    var n = sh.getLastRow() - 1;
    sh.deleteRows(2, n);
    hasil.push(nama + ': ' + n + ' baris dihapus');
  });
  Logger.log(hasil.join(', '));
  return hasil.join(', ');
}

function pasang() {
  var ss = spreadsheet_();
  var sumber = ss.getSheetByName(SHEET_JAWABAN);
  var judul = sumber.getRange(1, 1, 1, sumber.getLastColumn()).getValues()[0];
  var cari = function (t) {
    var i = indeksJudul_(judul, t);
    if (i < 0) {
      throw new Error('Kolom "' + t + '" tidak ditemukan di sheet ' + SHEET_JAWABAN +
        (t === JUDUL_LOKASI ? '. Jalankan tambahPertanyaanLokasi() dulu.' : ''));
    }
    return i + 1;
  };
  var akhir = huruf_(sumber, sumber.getLastColumn());
  var hurufJenis = huruf_(sumber, cari(JUDUL_PERMOHONAN));
  var rentang = "'" + SHEET_JAWABAN + "'!A2:" + akhir;
  var rentangJenis = "'" + SHEET_JAWABAN + "'!" + hurufJenis + '2:' + hurufJenis;
  var rentangSumber = function (t) {
    var h = huruf_(sumber, cari(t));
    return "'" + SHEET_JAWABAN + "'!" + h + '2:' + h;
  };
  // rumus bertingkat per lokasi; variabel l = kolom lokasi
  var perLokasi = function (nilai, lainnya) {
    return LOKASI.reduceRight(function (lain, l) {
      return 'IF(l="' + l.pilihan + '", ' + nilai(l) + ', ' + lain + ')';
    }, lainnya);
  };
  var hari = perLokasi(function (l) { return 'DATE(' + l.tanggal.join(', ') + ')'; }, 'TODAY()');
  // Perpanjangan dengan SIM lama yang habis sebelum hari layanan otomatis pindah: tampil (dan dihitung kuotanya) di
  // sheet SIM Baru, dan tidak tampil lagi di sheet SIM Perpanjangan. Jawaban aslinya tetap di sheet jawaban, jadi
  // bila tanggal habisnya dibetulkan di sana, barisnya kembali ke SIM Perpanjangan dengan sendirinya.
  // Pindahan dari orang yang juga mendaftar SIM Baru untuk jenis SIM yang sama tidak ditampilkan; baris SIM Baru-nya
  // mendapat catatan di kolom "Catatan".
  var syaratJenis = function (rumus) {
    return 'LET(j, ' + rentangJenis + ', h, ' + rentangSumber(JUDUL_HABIS) + ', l, ' + rentangSumber(JUDUL_LOKASI) +
      ', ni, ' + rentangSumber(JUDUL_NIK) + ', sj, ' + rentangSumber(JUDUL_JENIS_SIM) +
      ', m, (j="Perpanjangan")*ISNUMBER(h)*(h<' + hari + '), ' + rumus + ')';
  };
  var syaratPilahan = {
    'Baru': syaratJenis('(j="Baru")+m*(COUNTIFS(ni, ni, sj, sj, j, "Baru")=0)'),
    'Perpanjangan': syaratJenis('(j="Perpanjangan")*(m=0)')
  };

  SHEET_PILAHAN.forEach(function (p) {
    // sheet pilahan dibuat ulang (bukan sh.clear()): bila petugas mengubahnya menjadi Tabel, kolom bertipe menolak
    // format baru. Isinya seluruhnya rumus dari sheet jawaban, jadi tidak ada data yang hilang.
    var lama = ss.getSheetByName(p.nama), posisi = lama ? lama.getIndex() - 1 : ss.getNumSheets();
    if (lama) ss.deleteSheet(lama);
    var sh = ss.insertSheet(p.nama, posisi);
    var kepala = ['No. urut'].concat(p.kolom.map(function (k) { return k[1]; })).concat(['Keterangan'])
      .concat(p.jenis === 'Baru' ? ['Catatan'] : []);
    sh.getRange(1, 1, 1, kepala.length).setValues([kepala]);
    var kolAsal = kepala.indexOf('Permohonan di form') + 1;
    if (kolAsal > 0) {
      sh.getRange(1, kolAsal).setNote('Perpanjangan = pindahan otomatis dari sheet SIM Perpanjangan karena SIM lama ' +
        'sudah habis sebelum hari layanan. Pastikan pemohon mengikuti ujian teori SIM Baru.');
    }

    var nomor = p.kolom.map(function (k) { return cari(k[0]); });
    // data pendaftar jenis ini, mulai kolom B
    sh.getRange('B2').setFormula(rumus_(ss, '=IFERROR(CHOOSECOLS(FILTER(' + rentang + ', ' + syaratPilahan[p.jenis] + '), ' +
      nomor.join(', ') + '), "")'));

    // NIK ada di kolom C. Satu orang boleh mengajukan SIM A dan SIM C sekaligus, jadi yang dianggap ganda
    // (tidak memakai kuota) adalah NIK + jenis SIM yang sama dengan baris sebelumnya. Di SIM Baru, baris pindahan
    // tetap kalah dari pendaftaran SIM Baru (yang biasanya sudah menyembunyikannya lewat syaratPilahan).
    // u = nomor urut pendaftar sah di dalam lokasi yang sama; k = kuota lokasi itu.
    var hurufKolom = function (t) { return huruf_(sh, 2 + p.kolom.map(function (k) { return k[0]; }).indexOf(t)); };
    var hurufLok = hurufKolom(JUDUL_LOKASI), hurufSim = hurufKolom(JUDUL_JENIS_SIM);
    var kuota = perLokasi(function (l) { return kuotaLokasi_(l, p.jenis); }, String(KUOTA[p.jenis]));
    var ganda = 'COUNTIFS(n, n, s, s, r, "<"&r)';
    if (p.jenis === 'Baru') {
      var o = hurufKolom(JUDUL_PERMOHONAN), kolO = o + '2:' + o;
      ganda = 'IF(' + kolO + '="Perpanjangan", COUNTIFS(n, n, s, s, ' + kolO + ', "Baru")+' +
        'COUNTIFS(n, n, s, s, ' + kolO + ', "Perpanjangan", r, "<"&r), COUNTIFS(n, n, s, s, ' + kolO + ', "Baru", r, "<"&r))';
    }
    var unik = 'LET(n, C2:C, l, ' + hurufLok + '2:' + hurufLok + ', s, ' + hurufSim + '2:' + hurufSim +
      ', r, ROW(C2:C), g, (n<>"")*(' + ganda + '>0), ' +
      'b, (n<>"")*(g=0), ' +
      'u, MAP(r, l, b, LAMBDA(rr, ll, bb, IF(bb=0, 0, SUMPRODUCT((r<=rr)*(l=ll)*b)))), k, ' + kuota + ', ';
    sh.getRange('A2').setFormula(rumus_(ss, '=ARRAYFORMULA(' + unik + 'IF(n="", "", IF(b=0, "-", u))))'));
    var hurufKet = huruf_(sh, kepala.indexOf('Keterangan') + 1);
    sh.getRange(hurufKet + '2').setFormula(rumus_(ss, '=ARRAYFORMULA(' + unik + 'IF(n="", "", ' +
      'IF(g=1, "Ganda (NIK & jenis SIM sama)", IF(u<=k, "Masuk kuota", IF(k=0, "Tidak dilayani di lokasi ini", "CADANGAN (lewat kuota)"))))))'));
    // SIM Baru: catatan bila pendaftar yang sama juga mengisi Perpanjangan untuk jenis SIM ini
    // (dicocokkan langsung per nilai, bukan lewat gabungan teks, supaya NIK 16 digit tidak terpotong)
    var kolCatatan = kepala.indexOf('Catatan') + 1;
    if (kolCatatan > 0) {
      var hurufCat = huruf_(sh, kolCatatan);
      var tglHabis = 'IFERROR(INDEX(FILTER(' + rentangSumber(JUDUL_HABIS) + ', ' + rentangSumber(JUDUL_NIK) + '=nn, ' +
        rentangSumber(JUDUL_JENIS_SIM) + '=ss, ' + rentangJenis + '="Perpanjangan"), 1), "")';
      sh.getRange(hurufCat + '2').setFormula(rumus_(ss, '=MAP(C2:C, ' + hurufSim + '2:' + hurufSim + ', ' + kolO + ', ' +
        hurufLok + '2:' + hurufLok + ', LAMBDA(nn, ss, oo, l, IF(OR(nn="", oo<>"Baru"), "", LET(x, ' + tglHabis + ', ' +
        'IF(x="", "", "Juga daftar Perpanjangan - SIM lama " & IF(x<' + hari + ', "habis ", "berlaku s/d ") & ' +
        'TEXT(x, "dd/mm/yyyy"))))))'));
      sh.getRange(1, kolCatatan).setNote('Terisi bila pemohon juga mengisi formulir Perpanjangan untuk jenis SIM yang ' +
        'sama. Baris Perpanjangan-nya tidak ditampilkan di sheet ini agar tidak tercatat dua kali.');
    }
    // SIM Baru: tampilkan bukti ujian teori dari sheet "Bukti Teori" (proyek Kirim Bukti), dicocokkan lewat NIK,
    // kiriman terakhir yang dipakai. Diisi rumus agar tetap sejajar walau baris jawaban berubah.
    if (p.jenis === 'Baru' && ss.getSheetByName(SHEET_BUKTI)) {
      var kolBukti = kepala.length + 1;
      var cariBukti = function (kolom) {
        return "XLOOKUP(C2:C, '" + SHEET_BUKTI + "'!G2:G, '" + SHEET_BUKTI + "'!" + kolom + '2:' + kolom + ', "", 0, -1)';
      };
      sh.getRange(1, kolBukti, 1, 4).setValues([['Bukti teori', 'Status bukti', 'Nilai teori', 'Bukti dicetak']]);
      sh.getRange(2, kolBukti).setFormula(rumus_(ss, '=ARRAYFORMULA(IF(C2:C="", "", LET(x, ' + cariBukti('J') +
        ', IF(x="", "", HYPERLINK(x, "Lihat")))))'));
      ['K', 'L', 'M'].forEach(function (k, i) {
        sh.getRange(2, kolBukti + 1 + i).setFormula(rumus_(ss, '=ARRAYFORMULA(IF(C2:C="", "", ' + cariBukti(k) + '))'));
      });
      sh.getRange(2, kolBukti + 3, sh.getMaxRows() - 1, 1).setNumberFormat('dd/mm/yyyy hh:mm');
    }
    sh.getRange('C2:C').setNumberFormat('@');
    // hasil FILTER tidak membawa format tanggal dari sheet jawaban
    p.kolom.forEach(function (k, i) {
      var pola = k[0] === 'Timestamp' ? 'dd/mm/yyyy hh:mm' : (/^Tanggal/.test(k[0]) ? 'dd/mm/yyyy' : null);
      if (pola) sh.getRange(2, i + 2, sh.getMaxRows() - 1, 1).setNumberFormat(pola);
    });
    tataTampilan_(sh, p);
  });
  tataJawaban_(sumber);
  SHEET_PILAHAN.forEach(function (p) { buatCetak_(ss, p); });

  pasangPemicu();
  var hasilPasang = cekKuota();
  PropertiesService.getScriptProperties().setProperties({ sidikRumus: sidikRumus_(), sidikForm: sidikForm_() });
  return hasilPasang;
}

// ---------- tampilan ----------
// Semua format dipasang lewat skrip: sheet pilahan dibuat ulang setiap pasang(), jadi tampilannya ikut kembali rapi.
// Format hanya mengubah tampilan, tidak mengubah isi sel.
var GAYA = {
  // ukuran 12 + skala lebar kolom 1,2: teks nyaman dibaca di layar laptop maupun HP
  huruf: 'Roboto', ukuran: 12, tinggiJudul: 52, tinggiBaris: 30, skala: 1.2,
  judul: '#1f3864', judulBukti: '#7f6000', judulJawaban: '#37474f', teksJudul: '#ffffff',
  belang: '#f3f6fb', garis: '#c9d3e3',
  tab: { 'Baru': '#2e7d32', 'Perpanjangan': '#1565c0', 'Jawaban': '#607d8b' }
};
// lebar kolom (piksel) menurut judul kolom di sheet pilahan
var LEBAR = {
  'No. urut': 64, 'Waktu daftar': 118, 'NIK': 140, 'Nama': 210, 'Jenis kelamin': 96, 'Tanggal lahir': 96,
  'WhatsApp': 120, 'Alamat': 260, 'Klaster': 110, 'Komunitas': 160, 'Status / peran': 180, 'Jenis SIM': 76,
  'Lokasi layanan': 270, 'Metode ujian teori': 180, 'Permohonan di form': 112, 'Keterangan': 180, 'Catatan': 300,
  'Nomor SIM lama': 140, 'SIM lama berlaku s/d': 112,
  'Bukti teori': 84, 'Status bukti': 110, 'Nilai teori': 84, 'Bukti dicetak': 130
};
var RATA_TENGAH = ['No. urut', 'Waktu daftar', 'Jenis kelamin', 'Tanggal lahir', 'Klaster', 'Jenis SIM',
  'Permohonan di form', 'Keterangan', 'SIM lama berlaku s/d', 'Bukti teori', 'Status bukti', 'Nilai teori',
  'Bukti dicetak'];
var KOLOM_BUKTI = ['Bukti teori', 'Status bukti', 'Nilai teori', 'Bukti dicetak'];
// sel teks agar angka panjang (NIK, nomor HP, nomor SIM) tidak tampil sebagai 3,57E+15 atau kehilangan angka 0 di depan
var KOLOM_TEKS = ['NIK', 'WhatsApp', 'Nomor SIM lama'];

/** Tata tampilan sheet SIM Baru / SIM Perpanjangan (dipanggil pasang()). */
function tataTampilan_(sh, p) {
  var baris = sh.getMaxRows(), kolom = sh.getLastColumn();
  var judul = sh.getRange(1, 1, 1, kolom).getValues()[0];
  var semua = sh.getRange(1, 1, baris, kolom);
  var isi = sh.getRange(2, 1, baris - 1, kolom);

  semua.setFontFamily(GAYA.huruf).setFontSize(GAYA.ukuran).setVerticalAlignment('middle')
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  sh.getRange(1, 1, 1, kolom).setBackground(GAYA.judul).setFontColor(GAYA.teksJudul).setFontWeight('bold')
    .setHorizontalAlignment('center').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sh.setRowHeight(1, GAYA.tinggiJudul);
  sh.setRowHeightsForced(2, baris - 1, GAYA.tinggiBaris);

  judul.forEach(function (t, i) {
    var k = i + 1;
    if (LEBAR[t]) sh.setColumnWidth(k, Math.round(LEBAR[t] * GAYA.skala));
    if (RATA_TENGAH.indexOf(t) >= 0) sh.getRange(2, k, baris - 1, 1).setHorizontalAlignment('center');
    if (KOLOM_TEKS.indexOf(t) >= 0) sh.getRange(2, k, baris - 1, 1).setNumberFormat('@');
    if (KOLOM_BUKTI.indexOf(t) >= 0) sh.getRange(1, k).setBackground(GAYA.judulBukti);
  });

  // baris belang + garis tipis antarbaris
  sh.getBandings().forEach(function (b) { b.remove(); });
  isi.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false)
    .setFirstRowColor('#ffffff').setSecondRowColor(GAYA.belang);
  isi.setBorder(null, null, null, null, null, true, GAYA.garis, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(1, 1, 1, kolom).setBorder(null, null, true, null, null, null, GAYA.judul,
    SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // warna status: hijau = masuk kuota, kuning = cadangan, merah = ganda
  var aturan = [];
  var warnai = function (namaKolom, teks, latar, tulisan, awal) {
    var k = judul.indexOf(namaKolom) + 1;
    if (k < 1) return;
    var b = SpreadsheetApp.newConditionalFormatRule().setBackground(latar).setFontColor(tulisan)
      .setRanges([sh.getRange(2, k, baris - 1, 1)]);
    aturan.push((awal ? b.whenTextStartsWith(teks) : b.whenTextEqualTo(teks)).build());
  };
  warnai('Keterangan', 'Masuk kuota', '#d9f2e3', '#1b5e20');
  warnai('Keterangan', 'CADANGAN', '#fff4cc', '#7a4f00', true);
  warnai('Keterangan', 'Ganda', '#fde0dc', '#b71c1c', true);
  warnai('Permohonan di form', 'Perpanjangan', '#ede7f6', '#4527a0');
  warnai('Status bukti', 'Sah', '#d9f2e3', '#1b5e20');
  var kCat = judul.indexOf('Catatan') + 1;
  if (kCat > 0) {
    aturan.push(SpreadsheetApp.newConditionalFormatRule().whenCellNotEmpty().setFontColor('#bf360c').setItalic(true)
      .setRanges([sh.getRange(2, kCat, baris - 1, 1)]).build());
  }
  sh.setConditionalFormatRules(aturan);
  var kKet = judul.indexOf('Keterangan') + 1;
  if (kKet > 0) sh.getRange(2, kKet, baris - 1, 1).setFontWeight('bold');

  // kolom No. urut s/d Nama tetap terlihat saat digeser ke kanan; filter untuk menyaring per lokasi/keterangan
  sh.setFrozenRows(1);
  sh.setFrozenColumns(Math.max(judul.indexOf('Nama') + 1, 1));
  if (sh.getFilter()) sh.getFilter().remove();
  semua.createFilter();
  sh.setHiddenGridlines(true);
  sh.setTabColor(GAYA.tab[p.jenis]);
  // isi sheet ini seluruhnya rumus: peringatkan petugas sebelum mengetik di atasnya
  sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (x) { x.remove(); });
  sh.protect().setDescription('Terisi otomatis dari Form Responses 1 - jangan diketik').setWarningOnly(true);
}

// lebar kolom sheet jawaban menurut awal judul pertanyaan
var LEBAR_JAWABAN = [
  ['Timestamp', 140], [JUDUL_NIK, 140], ['Nama Lengkap', 200], ['Tanggal Lahir', 110], ['Nomor Telepon', 130],
  ['Alamat', 260], [JUDUL_KLASTER, 130], ['Identitas', 190], ['Status / Peran', 180], [JUDUL_JENIS_SIM, 100],
  [JUDUL_PERMOHONAN, 120], ['Nomor SIM Lama', 140], ['Metode Ujian Teori', 200], ['Unggah Foto KTP', 120],
  ['Jenis Kelamin', 100], [JUDUL_HABIS, 130], ['Pernyataan Pendaftar', 220], [JUDUL_LOKASI, 270]
];

/**
 * Tata tampilan Form Responses 1 (dipanggil pasang(), boleh juga dijalankan sendiri dari editor).
 * Hanya tampilan: isi, judul kolom, dan format warna yang sudah ada (mis. penanda NIK ganda) tidak diubah.
 */
function tataJawaban_(sh) {
  sh = sh || spreadsheet_().getSheetByName(SHEET_JAWABAN);
  var baris = sh.getMaxRows(), kolom = sh.getLastColumn();
  var judul = sh.getRange(1, 1, 1, kolom).getValues()[0];
  sh.getRange(1, 1, baris, kolom).setFontFamily(GAYA.huruf).setFontSize(GAYA.ukuran).setVerticalAlignment('middle')
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  sh.getRange(1, 1, 1, kolom).setBackground(GAYA.judulJawaban).setFontColor(GAYA.teksJudul).setFontWeight('bold')
    .setHorizontalAlignment('center').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sh.setRowHeight(1, 68);
  if (baris > 1) sh.setRowHeightsForced(2, baris - 1, GAYA.tinggiBaris);
  LEBAR_JAWABAN.forEach(function (x) {
    var i = indeksJudul_(judul, x[0]);
    if (i >= 0) sh.setColumnWidth(i + 1, Math.round(x[1] * GAYA.skala));
  });
  var iWaktu = indeksJudul_(judul, 'Timestamp');
  if (iWaktu >= 0 && baris > 1) sh.getRange(2, iWaktu + 1, baris - 1, 1).setNumberFormat('dd/mm/yyyy hh:mm:ss');
  try {
    sh.getBandings().forEach(function (b) { b.remove(); });
    if (baris > 1) {
      sh.getRange(2, 1, baris - 1, kolom).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false)
        .setFirstRowColor('#ffffff').setSecondRowColor(GAYA.belang);
    }
  } catch (err) {
    // mis. sheet jawaban sudah diubah petugas menjadi Tabel (punya warna sendiri); tampilan lain tetap dipasang
    Logger.log('Baris belang Form Responses 1 dilewati: ' + err.message);
  }
  sh.setFrozenRows(1);
  sh.setFrozenColumns(Math.max(indeksJudul_(judul, 'Nama Lengkap') + 1, 1));
  sh.setHiddenGridlines(true);
  sh.setTabColor(GAYA.tab['Jawaban']);
}

/** Jalankan dari editor bila hanya ingin merapikan ulang tampilan ketiga sheet (tanpa membuat ulang rumus). */
function rapikanTampilan() {
  var ss = spreadsheet_();
  SHEET_PILAHAN.forEach(function (p) {
    var sh = ss.getSheetByName(p.nama);
    if (sh) tataTampilan_(sh, p);
  });
  tataJawaban_(ss.getSheetByName(SHEET_JAWABAN));
  SHEET_PILAHAN.forEach(function (p) { if (ss.getSheetByName(p.nama)) buatCetak_(ss, p); });
  return 'Tampilan dirapikan';
}

// ---------- sheet siap cetak ----------
// Ringkasan sheet pilahan untuk dicetak (A4 mendatar): kolom seperlunya, huruf besar, lokasi dipilih di sel C2.
// Isinya rumus dari sheet pilahan, jadi selalu ikut data terbaru. Baris "Ganda" tidak ikut dicetak.
var LOKASI_SEMUA = 'Semua lokasi';
// [judul kolom di sheet pilahan, judul di sheet cetak, lebar piksel]; 'Lokasi layanan' dicetak nama singkatnya
var CETAK = {
  'Baru': { nama: 'Cetak SIM Baru', judul: 'DAFTAR PEMOHON SIM BARU', kolom: [
    ['No. urut', 'No.', 48], ['Nama', 'Nama', 230], ['NIK', 'NIK', 170], ['Jenis kelamin', 'Jenis kelamin', 110],
    ['Tanggal lahir', 'Tgl lahir', 105], ['WhatsApp', 'WhatsApp', 140], ['Jenis SIM', 'SIM', 64],
    ['Lokasi layanan', 'Lokasi', 140], ['Keterangan', 'Keterangan', 170], ['Status bukti', 'Ujian teori', 115],
    ['Nilai teori', 'Nilai', 64]] },
  'Perpanjangan': { nama: 'Cetak SIM Perpanjangan', judul: 'DAFTAR PEMOHON SIM PERPANJANGAN', kolom: [
    ['No. urut', 'No.', 48], ['Nama', 'Nama', 230], ['NIK', 'NIK', 170], ['Jenis kelamin', 'Jenis kelamin', 110],
    ['Tanggal lahir', 'Tgl lahir', 105], ['WhatsApp', 'WhatsApp', 140], ['Jenis SIM', 'SIM', 64],
    ['Lokasi layanan', 'Lokasi', 140], ['Nomor SIM lama', 'No. SIM lama', 165],
    ['SIM lama berlaku s/d', 'Berlaku s/d', 105], ['Keterangan', 'Keterangan', 170]] }
};

// ---------- jadwal lama di sheet Cetak SIM Baru ----------
// Pendaftar SIM Baru jadwal lama yang sudah dikosongkan dari sheet jawaban (diarsipkan ke spreadsheet lain) disalin ke
// SHEET_ARSIP_BARU, supaya tetap bisa dipilih & dicetak di Cetak SIM Baru. pilihan = teks lokasi di pilihan C2
// (tanpa koma; teks sebelum tanda kurung dicetak sebagai nama lokasi).
var ARSIP_BARU = [
  { id: '1P8YnfwRCvJV-sgbXD32oiJC6oYPcU-yLD_zDU9Ho2yE', pilihan: 'Ponpes Safinatul Huda (Mobil SIMLING) - 30-31 Oktober 2026' }
];
var SHEET_ARSIP_BARU = 'Arsip SIM Baru';
// sama dengan BATAS_LULUS di proyek "Kirim Bukti Ujian Teori": nilai 70 ke atas = Lulus
var BATAS_LULUS = 70;

// lokasi jadwal lama ikut jadi pilihan di kedua sheet cetak; Perpanjangan tidak punya sheet arsip, jadi lokasi itu
// tampil "Belum ada pemohon" bila memang tidak ada pemohon Perpanjangan (Ponpes Safinatul Huda: semua SIM Baru)
function pilihanCetak_(jenis) {
  return LOKASI.map(function (l) { return l.pilihan; }).concat(ARSIP_BARU.map(function (a) { return a.pilihan; }));
}

/** Jalankan dari editor: salin pendaftar SIM Baru dari ARSIP_BARU ke sheet "Arsip SIM Baru", lalu buat ulang kedua sheet cetak. */
function pasangArsipCetak() {
  var ss = spreadsheet_(), kolom = CETAK['Baru'].kolom.map(function (k) { return k[0]; }), isi = [];
  ARSIP_BARU.forEach(function (a) {
    var sh = SpreadsheetApp.openById(a.id).getSheetByName('SIM Baru');
    if (!sh || sh.getLastRow() < 2) return;
    var data = sh.getDataRange().getDisplayValues(), h = data[0];
    data.slice(1).forEach(function (r) {
      if (!String(r[h.indexOf('NIK')]).trim()) return;
      isi.push(kolom.map(function (k) {
        if (k === 'Lokasi layanan') return a.pilihan;
        var v = h.indexOf(k) >= 0 ? r[h.indexOf(k)] : '';
        if (k === 'Status bukti') {
          // status lama "Sah" -> aturan nilai: >= BATAS_LULUS Lulus, di bawahnya Tidak lulus
          var n = h.indexOf('Nilai teori') >= 0 ? r[h.indexOf('Nilai teori')] : '';
          if (n !== '' && !isNaN(Number(n))) return Number(n) >= BATAS_LULUS ? 'Lulus' : 'Tidak lulus';
          return v === 'Sah' ? 'Lulus' : v;
        }
        // nomor urut & nilai sebagai angka, supaya urutan cetak 1, 2, ... 10 (bukan urutan teks 1, 10, 2)
        if ((k === 'No. urut' || k === 'Nilai teori') && v !== '' && !isNaN(Number(v))) return Number(v);
        return v;
      }));
    });
  });
  var sa = ss.getSheetByName(SHEET_ARSIP_BARU) || ss.insertSheet(SHEET_ARSIP_BARU);
  sa.clear();
  ['NIK', 'WhatsApp'].forEach(function (k) { // tetap teks: angka nol di depan & 16 digit NIK tidak berubah
    sa.getRange(1, kolom.indexOf(k) + 1, sa.getMaxRows(), 1).setNumberFormat('@');
  });
  sa.getRange(1, 1, 1, kolom.length).setValues([kolom])
    .setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff');
  sa.setFrozenRows(1);
  if (isi.length) sa.getRange(2, 1, isi.length, kolom.length).setValues(isi);
  sa.autoResizeColumns(1, kolom.length);
  sa.protect().setDescription('Salinan arsip pendaftar SIM Baru - jangan diubah').setWarningOnly(true);
  SHEET_PILAHAN.forEach(function (p) { if (ss.getSheetByName(p.nama)) buatCetak_(ss, p); });
  var hasil = isi.length + ' pendaftar arsip disalin ke ' + SHEET_ARSIP_BARU + '; Cetak SIM Baru & Perpanjangan dibuat ulang';
  Logger.log(hasil);
  return hasil;
}

/** Buat ulang sheet cetak untuk satu sheet pilahan (dipanggil pasang() & rapikanTampilan()). */
function buatCetak_(ss, p) {
  var c = CETAK[p.jenis], sumber = ss.getSheetByName(p.nama);
  if (!c || !sumber) return;
  var judulSumber = sumber.getRange(1, 1, 1, sumber.getLastColumn()).getValues()[0];
  var pakai = c.kolom.filter(function (k) { return judulSumber.indexOf(k[0]) >= 0; });
  var n = pakai.length + 1; // + kolom Paraf

  // pilihan lokasi yang sedang dipakai dipertahankan saat sheet dibuat ulang
  var lama = ss.getSheetByName(c.nama), pilihan = LOKASI_SEMUA;
  if (lama) {
    var v = String(lama.getRange('C2').getValue());
    if (pilihanCetak_(p.jenis).indexOf(v) >= 0) pilihan = v;
    ss.deleteSheet(lama);
  }
  var sh = ss.insertSheet(c.nama, sumber.getIndex());
  if (sh.getMaxColumns() > n) sh.deleteColumns(n + 1, sh.getMaxColumns() - n);
  var baris = sh.getMaxRows();

  // baris 1 judul, baris 2 pilihan lokasi & waktu cetak, baris 3 judul kolom, data mulai baris 4
  sh.getRange(1, 1, 1, n).merge().setValue('SATLANTAS POLRESTA BANYUWANGI · ' + c.judul + ' (SIM KOMUNITAS)');
  sh.getRange(2, 1, 1, 2).merge().setValue('Lokasi:');
  var akhirLok = Math.min(7, n - 2);
  sh.getRange(2, 3, 1, akhirLok - 2).merge().setValue(pilihan).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList([LOKASI_SEMUA].concat(pilihanCetak_(p.jenis)), true)
    .setAllowInvalid(false).setHelpText('Pilih lokasi yang ingin dicetak').build());
  sh.getRange(2, akhirLok + 1, 1, n - akhirLok).merge()
    .setFormula(rumus_(ss, '="Dicetak: " & TEXT(NOW(), "dd/mm/yyyy hh:mm") & " WIB"'));
  sh.getRange(3, 1, 1, n).setValues([pakai.map(function (k) { return k[1]; }).concat(['Paraf'])]);

  var src = "'" + p.nama + "'!", akhir = huruf_(sumber, judulSumber.length);
  var nomor = pakai.map(function (k) { return judulSumber.indexOf(k[0]) + 1; });
  var posLok = pakai.map(function (k) { return k[0]; }).indexOf('Lokasi layanan') + 1;
  var hLok = huruf_(sumber, judulSumber.indexOf('Lokasi layanan') + 1);
  var urut = function (a, b) { var x = []; for (var i = a; i <= b; i++) x.push(i); return x.join(', '); };
  // SIM Baru: pendaftar jadwal lama dari sheet Arsip SIM Baru ikut digabung (kolomnya disusun seperti CETAK)
  var sumberData = 'CHOOSECOLS(' + src + 'A2:' + akhir + ', ' + nomor.join(', ') + ')';
  var shArsip = p.jenis === 'Baru' ? ss.getSheetByName(SHEET_ARSIP_BARU) : null;
  if (shArsip && shArsip.getLastRow() > 1) {
    var judulCetak = c.kolom.map(function (k) { return k[0]; });
    var kolArsip = pakai.map(function (k) { return judulCetak.indexOf(k[0]) + 1; });
    sumberData = 'VSTACK(' + sumberData + ', CHOOSECOLS(\'' + SHEET_ARSIP_BARU + '\'!A2:' + huruf_(shArsip, judulCetak.length) +
      ', ' + kolArsip.join(', ') + '))';
  }
  var posNik = pakai.map(function (k) { return k[0]; }).indexOf('NIK') + 1;
  var d = 'SORT(LET(x, ' + sumberData + ', FILTER(x, INDEX(x, 0, ' + posNik + ')<>"", INDEX(x, 0, 1)<>"-", ' +
    '(INDEX(x, 0, ' + posLok + ')=$C$2)+($C$2="' + LOKASI_SEMUA + '"))), ' + posLok + ', TRUE, 1, TRUE)';
  // kolom lokasi dicetak singkat: teks sebelum tanda kurung, mis. "BBPVP Muncar"
  var hasil = 'HSTACK(CHOOSECOLS(d, ' + urut(1, posLok - 1) + '), ' +
    'ARRAYFORMULA(TRIM(REGEXEXTRACT(CHOOSECOLS(d, ' + posLok + '), "^[^(]+")))' +
    (posLok < pakai.length ? ', CHOOSECOLS(d, ' + urut(posLok + 1, pakai.length) + ')' : '') + ')';
  sh.getRange('A4').setFormula(rumus_(ss, '=IFERROR(LET(d, ' + d + ', ' + hasil + '), "Belum ada pemohon untuk lokasi ini")'));

  // tampilan cetak
  sh.getRange(1, 1, baris, n).setFontFamily(GAYA.huruf).setFontSize(GAYA.ukuran).setVerticalAlignment('middle')
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  sh.getRange(1, 1).setFontSize(15).setFontWeight('bold').setHorizontalAlignment('center').setFontColor(GAYA.judul);
  sh.getRange(2, 1, 1, n).setFontWeight('bold');
  sh.getRange(2, 3).setBackground('#fff8e1').setFontColor('#7a4f00')
    .setBorder(true, true, true, true, null, null, '#f9a825', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(2, akhirLok + 1).setHorizontalAlignment('right').setFontWeight('normal').setFontColor('#555555');
  sh.getRange(3, 1, 1, n).setBackground(GAYA.judul).setFontColor(GAYA.teksJudul).setFontWeight('bold')
    .setHorizontalAlignment('center').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    .setBorder(true, true, true, true, true, null, GAYA.judul, SpreadsheetApp.BorderStyle.SOLID);
  sh.setRowHeight(1, 40);
  sh.setRowHeight(2, 34);
  sh.setRowHeight(3, 40);
  sh.setRowHeightsForced(4, baris - 3, 32);
  pakai.concat([['Paraf', 'Paraf', 90]]).forEach(function (k, i) {
    sh.setColumnWidth(i + 1, k[2]);
    var r = sh.getRange(4, i + 1, baris - 3, 1);
    if (['Nama', 'Lokasi layanan'].indexOf(k[0]) < 0) r.setHorizontalAlignment('center');
    if (KOLOM_TEKS.indexOf(k[0]) >= 0) r.setNumberFormat('@');
    if (/^Tanggal|berlaku/.test(k[0])) r.setNumberFormat('dd/mm/yyyy');
  });

  // warna hanya pada baris yang berisi, supaya baris kosong tidak ikut tercetak
  var data = sh.getRange(4, 1, baris - 3, n);
  var kKet = pakai.map(function (k) { return k[0]; }).indexOf('Keterangan') + 1;
  var rKet = sh.getRange(4, kKet, baris - 3, 1);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Masuk kuota').setFontColor('#1b5e20').setBold(true)
      .setRanges([rKet]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('CADANGAN').setFontColor('#7a4f00').setBold(true)
      .setRanges([rKet]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=ISEVEN(ROW())*($B4<>"")>0')
      .setBackground(GAYA.belang).setRanges([data]).build()
  ]);

  sh.setFrozenRows(3); // judul & judul kolom ikut diulang di setiap halaman cetak
  sh.setHiddenGridlines(false);
  sh.setTabColor(GAYA.tab[p.jenis]);
  var kunci = sh.protect().setDescription('Sheet cetak otomatis - ubah hanya pilihan lokasi di C2').setWarningOnly(true);
  kunci.setUnprotectedRanges([sh.getRange(2, 3)]);
}

// pemicu "saat formulir dikirim" milik spreadsheet pernah tidak berjalan sama sekali, jadi pemicu dipasang di
// Google Form-nya langsung, ditambah pemeriksaan berkala sebagai cadangan
var KUNCI_BARIS = 'barisJawabanTerakhir';

/** Jalankan dari editor (juga dipanggil pasang()): pemicu kiriman di Google Form + cek kuota tiap 1 menit. */
function pasangPemicu() {
  var form = FormApp.openByUrl(spreadsheet_().getFormUrl());
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'saatAdaPendaftar' || f === 'cekKuotaBerkala') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('saatAdaPendaftar').forForm(form).onFormSubmit().create();
  ScriptApp.newTrigger('cekKuotaBerkala').timeBased().everyMinutes(1).create();
  PropertiesService.getScriptProperties().setProperty(KUNCI_BARIS,
    String(spreadsheet_().getSheetByName(SHEET_JAWABAN).getLastRow()));
  var hasil = 'Pemicu terpasang: saatAdaPendaftar (kiriman Google Form), cekKuotaBerkala (tiap 1 menit)';
  Logger.log(hasil);
  return hasil;
}

/**
 * Cadangan bila pemicu kiriman terlambat/gagal: cekKuota() hanya dijalankan bila jumlah baris jawaban berubah,
 * supaya pemeriksaan tiap menit tetap ringan (batas waktu pemicu harian akun Google).
 */
function cekKuotaBerkala() {
  var props = PropertiesService.getScriptProperties();
  // jadwal di sheet "Jadwal Layanan" berubah? (lokasi baru disetujui, kuota/tanggal/status diubah petugas)
  try {
    if (props.getProperty('sidikRumus') !== sidikRumus_()) {
      Logger.log('Jadwal berubah: membangun ulang sheet pilahan. ' + pasang());
      return;
    }
    if (props.getProperty('sidikForm') !== sidikForm_()) {
      Logger.log('Status jadwal berubah: ' + cekKuota());
      props.setProperty('sidikForm', sidikForm_());
    }
  } catch (err) {
    Logger.log('Gagal sinkron jadwal: ' + err.message);
  }
  var baris = String(spreadsheet_().getSheetByName(SHEET_JAWABAN).getLastRow());
  if (props.getProperty(KUNCI_BARIS) === baris) return;
  try {
    cekKuota();
    props.setProperty(KUNCI_BARIS, baris);
  } catch (err) {
    Logger.log('Gagal cek kuota berkala: ' + err.message);
  }
}

// ---------- perapian huruf: awal setiap kata huruf besar ----------
// Kolom isian bebas di sheet jawaban yang dirapikan saat formulir dikirim (sheet SIM Baru/Perpanjangan ikut rapi
// karena mengambil dari sheet jawaban lewat rumus). Judul dicocokkan dari awalnya, seperti KOLOM_UMUM.
var KOLOM_RAPI = ['Nama Lengkap Sesuai KTP', 'Alamat Desa/Kelurahan & Kecamatan Domisili di Banyuwangi',
  'Identitas Pondok Pesantren', 'Status / Peran di Komunitas'];
// singkatan yang tetap ditulis seperti ini (kunci huruf besar semua)
var SINGKATAN = {};
['RT', 'RW', 'PT', 'CV', 'UD', 'KH', 'SD', 'SDN', 'SMP', 'SMPN', 'SMA', 'SMAN', 'SMK', 'SMKN', 'MI', 'MIN', 'MTs', 'MTsN',
  'MA', 'MAN', 'UIN', 'IAIN', 'STAI', 'STIE', 'STKIP', 'PP', 'TPQ', 'NU', 'LDII', 'UMKM', 'PNS', 'TNI', 'POLRI', 'KUD',
  'BUMDes', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  .forEach(function (s) { SINGKATAN[s.toUpperCase()] = s; });

/** "LINTIN AYU anggraini" -> "Lintin Ayu Anggraini"; "rt 02 rw 03" -> "RT 02 RW 03"; angka & tanda baca tetap. */
function hurufAwal_(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/\s+/g, ' ').trim().replace(/[A-Za-zÀ-ÿ']+/g, function (k) {
    return SINGKATAN[k.toUpperCase()] || k.charAt(0).toUpperCase() + k.slice(1).toLowerCase();
  });
}

function rapikanBaris_(sh, judul, baris) {
  KOLOM_RAPI.forEach(function (t) {
    var i = indeksJudul_(judul, t);
    if (i < 0) return;
    var sel = sh.getRange(baris, i + 1), v = sel.getValue(), baru = hurufAwal_(v);
    if (typeof v === 'string' && baru !== v) sel.setValue(baru);
  });
}

/** Jalankan sekali dari editor untuk merapikan jawaban yang sudah masuk sebelumnya. */
function rapikanSemua() {
  var sh = spreadsheet_().getSheetByName(SHEET_JAWABAN);
  var judul = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var ubah = 0;
  KOLOM_RAPI.forEach(function (t) {
    var i = indeksJudul_(judul, t);
    if (i < 0 || sh.getLastRow() < 2) return;
    var r = sh.getRange(2, i + 1, sh.getLastRow() - 1, 1), v = r.getValues();
    var baru = v.map(function (x) { return [hurufAwal_(x[0])]; });
    ubah += v.filter(function (x, j) { return x[0] !== baru[j][0]; }).length;
    r.setValues(baru);
  });
  Logger.log(ubah + ' sel dirapikan');
  return ubah;
}

function saatAdaPendaftar(e) {
  // Pemicu dari Google Form berjalan sesaat sebelum jawaban tertulis di sheet: tunggu barisnya muncul dulu
  // (paling lama ±10 detik). Bila belum muncul, cekKuotaBerkala() menyusul dalam 1 menit.
  var sh = spreadsheet_().getSheetByName(SHEET_JAWABAN), baris;
  if (!(e && e.range)) {
    var sebelum = Number(PropertiesService.getScriptProperties().getProperty(KUNCI_BARIS) || 0);
    for (var i = 0; i < 5 && sh.getLastRow() <= sebelum; i++) {
      Utilities.sleep(2000);
      SpreadsheetApp.flush();
    }
    baris = sh.getLastRow();
  } else {
    baris = e.range.getRow();
  }
  try {
    if (baris > 1) rapikanBaris_(sh, sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], baris);
  } catch (err) {
    Logger.log('Gagal merapikan huruf: ' + err.message);
  }
  cekKuota();
  PropertiesService.getScriptProperties().setProperty(KUNCI_BARIS, String(sh.getLastRow()));
}

function cekKuota() {
  var kunci = LockService.getScriptLock();
  kunci.waitLock(30000);
  try {
    var ss = spreadsheet_();
    var rentangData = ss.getSheetByName(SHEET_JAWABAN).getDataRange();
    var data = rentangData.getDisplayValues(), nilai = rentangData.getValues();
    var iNik = indeksJudul_(data[0], JUDUL_NIK);
    var iJenis = indeksJudul_(data[0], JUDUL_PERMOHONAN);
    var iLok = indeksJudul_(data[0], JUDUL_LOKASI);
    var iSim = indeksJudul_(data[0], JUDUL_JENIS_SIM);
    var iHabis = indeksJudul_(data[0], JUDUL_HABIS);
    var hariLayanan = {};
    LOKASI.forEach(function (l) {
      hariLayanan[l.pilihan] = l.tanggal ? new Date(l.tanggal[0], l.tanggal[1] - 1, l.tanggal[2]) : new Date();
    });
    // nik[pilihan lokasi][jenis] = {"NIK|jenis SIM": true}; sama dengan rumus di sheet pilahan: SIM A dan SIM C
    // dihitung terpisah, Perpanjangan dengan SIM lama yang sudah habis dihitung sebagai SIM Baru
    var nik = {};
    LOKASI.forEach(function (l) { nik[l.pilihan] = { 'Baru': {}, 'Perpanjangan': {} }; });
    for (var r = 1; r < data.length; r++) {
      var lok = iLok >= 0 ? data[r][iLok] : '', j = data[r][iJenis], n = String(data[r][iNik]).trim();
      if (!(nik[lok] && nik[lok][j] && n)) continue;
      var habis = iHabis >= 0 ? nilai[r][iHabis] : '';
      if (j === 'Perpanjangan' && habis instanceof Date && habis < hariLayanan[lok]) j = 'Baru';
      nik[lok][j][n + '|' + (iSim >= 0 ? data[r][iSim] : '')] = true;
    }
    var terbuka = [], catatan = [], ringkas = [];
    LOKASI.forEach(function (l) {
      var penuh = {}, teks = [];
      Object.keys(KUOTA).forEach(function (j) {
        if (j === 'Baru' && l.layanan === 'perpanjangan') {   // lokasi khusus Perpanjangan: SIM Baru tidak dilayani
          penuh[j] = true; teks.push('Baru -');
          if (!l.tutup) catatan.push(l.pilihan + ' hanya melayani Perpanjangan SIM.');
          return;
        }
        var jumlah = Object.keys(nik[l.pilihan][j]).length, batas = kuotaLokasi_(l, j);
        penuh[j] = jumlah >= batas;
        teks.push(j + ' ' + jumlah + '/' + batas);
        if (l.tutup) return;
        if (penuh[j]) catatan.push('Kuota SIM ' + j + ' di ' + l.pilihan + ' sudah penuh (pendaftar berikutnya jadi cadangan).');
        else if (TAMPILKAN_SISA) catatan.push('Sisa kuota SIM ' + j + ' di ' + l.pilihan + ': ' + (batas - jumlah) + ' orang.');
      });
      if (!l.tutup && !(penuh['Baru'] && penuh['Perpanjangan'])) terbuka.push(l.pilihan);
      ringkas.push(l.pilihan + ': ' + teks.join(', '));
    });

    var form = FormApp.openByUrl(ss.getFormUrl());
    var tanyaLok = null, tanyaJenis = null, halaman = {};
    form.getItems().forEach(function (it) {
      if (it.getTitle() === JUDUL_LOKASI) tanyaLok = it.asMultipleChoiceItem();
      if (it.getTitle() === JUDUL_PERMOHONAN) tanyaJenis = it.asMultipleChoiceItem();
      Object.keys(HALAMAN).forEach(function (j) {
        if (it.getType() === FormApp.ItemType.PAGE_BREAK && it.getTitle() === HALAMAN[j]) halaman[j] = it.asPageBreakItem();
      });
    });
    if (!tanyaLok) throw new Error('Pertanyaan "' + JUDUL_LOKASI + '" tidak ditemukan. Jalankan tambahPertanyaanLokasi() dulu.');
    if (!tanyaJenis) throw new Error('Pertanyaan "' + JUDUL_PERMOHONAN + '" tidak ditemukan di formulir');

    // Setiap perubahan formulir lewat script membuat editor Google Form yang sedang dibuka petugas memuat ulang
    // (halaman melompat & ketikan bisa hilang). Karena itu formulir hanya ditulis bila isinya benar-benar berubah.
    if (terbuka.length === 0) {
      if (form.isAcceptingResponses()) {
        form.setCustomClosedFormMessage(PESAN_TUTUP);
        form.setAcceptingResponses(false);
      }
    } else {
      // jadwal dari sheet "Jadwal Layanan": ada lokasi berstatus Buka -> formulir dibuka lagi bila sebelumnya tertutup
      // (untuk menutup pendaftaran, ubah Status lokasinya menjadi "Tutup", bukan tombol "Menerima jawaban")
      if (!form.isAcceptingResponses()) form.setAcceptingResponses(true);
      var lokLama = tanyaLok.getChoices().map(function (c) { return c.getValue(); }).join('|');
      if (lokLama !== terbuka.join('|')) tanyaLok.setChoiceValues(terbuka);
      var bantuan = ('Pilih lokasi dan tanggal Anda akan datang. Kuota dihitung per lokasi. ' + catatan.join(' ')).trim();
      if (tanyaLok.getHelpText() !== bantuan) tanyaLok.setHelpText(bantuan);

      // kuota kini per lokasi: kedua jenis permohonan selalu tersedia (pilihan yang dulu dihapus dipulihkan)
      var jenis = Object.keys(KUOTA);
      var jenisLama = tanyaJenis.getChoices().map(function (c) {
        var tujuan = c.getGotoPage();
        return c.getValue() + '>' + (tujuan ? tujuan.getId() : '');
      }).join('|');
      var jenisBaru = jenis.map(function (j) { return j + '>' + (halaman[j] ? halaman[j].getId() : ''); }).join('|');
      if (jenisLama !== jenisBaru) {
        tanyaJenis.setChoices(jenis.map(function (j) {
          return halaman[j] ? tanyaJenis.createChoice(j, halaman[j]) : tanyaJenis.createChoice(j);
        }));
      }
      if (tanyaJenis.getHelpText() !== '') tanyaJenis.setHelpText('');
    }
    var hasil = ringkas.join(' · ') + (terbuka.length ? '' : ' — formulir ditutup');
    Logger.log(hasil);
    return hasil;
  } finally {
    kunci.releaseLock();
  }
}

