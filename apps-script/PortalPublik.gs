/**
 * SIM Komunitas – API Portal Publik
 * ---------------------------------------------------------------------------
 * Project Apps Script mandiri (buat di https://script.new) yang membaca spreadsheet
 * "Formulir Pendaftaran SIM Komunitas (Jawaban)" lewat ID_SPREADSHEET (hanya baca).
 *
 * Melayani dua permintaan dari portal https://satpasbwi-sim.github.io/sim-komunitas-bwi/
 *   ?aksi=jadwal                         → jadwal lokasi + sisa kuota (hanya angka)
 *   ?aksi=status&nik=…&lahir=yyyy-mm-dd  → status pendaftaran 1 orang
 *
 * PRINSIP DATA PRIBADI
 *   - Tidak ada NIK, nomor HP, alamat, atau tautan bukti yang dikirim ke portal.
 *   - Cek status hanya menjawab bila NIK DAN tanggal lahir cocok; nama disamarkan.
 *   - Percobaan dibatasi (lihat BATAS_*) agar NIK tidak bisa ditebak beruntun.
 *
 * Yang perlu diubah petugas hanya bagian JADWAL di bawah ini.
 */

// ====== 1. JADWAL & KUOTA (ubah di sini) ===================================
// cocok   : potongan teks yang PASTI ada di kolom "Lokasi layanan" untuk lokasi ini
// dibuka  : false = pendaftaran lokasi ini ditutup (tetap tampil sebagai "Ditutup")
// kuota   : batas pendaftar per jenis permohonan
var JADWAL = [
  { kode: 'SIMLING', nama: 'Ponpes Safinatul Huda', ket: 'SIM Masuk Pesantren · Mobil SIMLING', ikon: '🕌',
    tanggal: '2026-10-31', mulai: '08:00', selesai: '15:00', cocok: 'Safinatul Huda', dibuka: false,
    kuota: { baru: 50, perpanjangan: 40 } },
  { kode: 'BBPVP-MUNCAR', nama: 'BBPVP Muncar', ket: 'SIM Masuk Desa · Masyarakat Kec. Muncar', ikon: '🏘️',
    tanggal: '2026-11-03', mulai: '08:00', selesai: '15:00', cocok: 'BBPVP Muncar', dibuka: false,
    kuota: { baru: 50, perpanjangan: 40 } },
  { kode: 'UNIBA', nama: 'UNIBA', ket: 'SIM Masuk Kampus · Universitas PGRI Banyuwangi', ikon: '🎓',
    tanggal: '2026-11-05', mulai: '08:00', selesai: '15:00', cocok: 'UNIBA', dibuka: true,
    kuota: { baru: 50, perpanjangan: 40 } }
];

// ====== 2. PENGATURAN TEKNIS (biasanya tidak perlu diubah) =================
var SHEET_BARU = 'SIM Baru';
var SHEET_PERPANJANGAN = 'SIM Perpanjangan';
var SHEET_BUKTI = 'Bukti Teori';
var KETERANGAN_TIDAK_DIHITUNG = /luar kuota|cadangan|ditolak|duplikat|batal|tidak memenuhi/i;
var CACHE_JADWAL_DETIK = 60;          // angka kuota disegarkan paling lama tiap 1 menit
var BATAS_PER_NIK = 5;                // maks. percobaan cek status per NIK …
var BATAS_GLOBAL_PER_MENIT = 150;     // … dan maks. cek status seluruh pengguna per menit
var ZONA = 'Asia/Jakarta';
var ID_SPREADSHEET = '1Gkn-UoX98ITUTdN2qMWVImjX_o7vxKCLS9xVibcEo0g'; // Formulir Pendaftaran SIM Komunitas (Jawaban)

// ===========================================================================

function doGet(e) {
  var p = (e && e.parameter) || {};
  var hasil;
  try {
    if (p.aksi === 'jadwal') hasil = jadwalPublik_();
    else if (p.aksi === 'status') hasil = cekStatus_(p.nik, p.lahir);
    else hasil = { ok: true, layanan: 'SIM Komunitas – API Portal Publik', aksi: ['jadwal', 'status'] };
  } catch (err) {
    console.error(err);
    hasil = { ok: false, pesan: 'Server sedang sibuk. Coba lagi sebentar lagi.' };
  }
  return ContentService.createTextOutput(JSON.stringify(hasil)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- Jadwal & kuota -------------------------------------------------
function jadwalPublik_() {
  var cache = CacheService.getScriptCache();
  var simpan = cache.get('jadwal_v1');
  if (simpan) return JSON.parse(simpan);

  var ss = SpreadsheetApp.openById(ID_SPREADSHEET);
  var lokBaru = kolomLokasi_(ss.getSheetByName(SHEET_BARU));
  var lokPerp = kolomLokasi_(ss.getSheetByName(SHEET_PERPANJANGAN));
  var sekarang = Utilities.formatDate(new Date(), ZONA, "yyyy-MM-dd'T'HH:mm");

  var daftar = JADWAL.map(function (j) {
    var terisiBaru = hitung_(lokBaru, j.cocok), terisiPerp = hitung_(lokPerp, j.cocok);
    var k = {
      baru: angkaKuota_(j.kuota.baru, terisiBaru),
      perpanjangan: angkaKuota_(j.kuota.perpanjangan, terisiPerp)
    };
    var status;
    if (sekarang > j.tanggal + 'T' + j.selesai) status = 'selesai';
    else if (!j.dibuka) status = 'tutup';
    else if (k.baru.sisa === 0 && k.perpanjangan.sisa === 0) status = 'penuh';
    else status = 'buka';
    return { kode: j.kode, nama: j.nama, ket: j.ket, ikon: j.ikon, tanggal: j.tanggal,
             mulai: j.mulai, selesai: j.selesai, status: status, kuota: k };
  });

  var hasil = { ok: true, diperbarui: Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy HH:mm') + ' WIB', jadwal: daftar };
  cache.put('jadwal_v1', JSON.stringify(hasil), CACHE_JADWAL_DETIK);
  return hasil;
}

function kolomLokasi_(sh) {
  if (!sh || sh.getLastRow() < 2) return [];
  var data = sh.getDataRange().getDisplayValues();
  var h = data[0], iLok = cariKolom_(h, /lokasi layanan/i), iKet = cariKolom_(h, /^keterangan$/i);
  if (iLok < 0) return [];
  return data.slice(1).filter(function (r) { return r[iLok]; }).map(function (r) {
    return { lok: r[iLok], ket: iKet >= 0 ? r[iKet] : '' };
  });
}

function hitung_(baris, cocok) {
  var c = cocok.toLowerCase();
  return baris.filter(function (r) {
    return r.lok.toLowerCase().indexOf(c) >= 0 && !KETERANGAN_TIDAK_DIHITUNG.test(r.ket);
  }).length;
}

function angkaKuota_(batas, terisi) {
  return { batas: batas, terisi: terisi, sisa: Math.max(0, batas - terisi) };
}

// ---------- Cek status -----------------------------------------------------
function cekStatus_(nikMentah, lahirMentah) {
  var nik = String(nikMentah || '').replace(/\D/g, '');
  var lahir = String(lahirMentah || '');
  if (nik.length !== 16) return { ok: false, pesan: 'NIK harus 16 angka.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lahir)) return { ok: false, pesan: 'Tanggal lahir belum diisi.' };

  // pembatasan percobaan
  var cache = CacheService.getScriptCache();
  var kunciNik = 'rl_' + sidik_(nik), kunciGlobal = 'rlg_' + Utilities.formatDate(new Date(), ZONA, 'HHmm');
  var nNik = Number(cache.get(kunciNik) || 0), nGlobal = Number(cache.get(kunciGlobal) || 0);
  if (nNik >= BATAS_PER_NIK) return { ok: false, pesan: 'Terlalu banyak percobaan untuk NIK ini. Coba lagi 15 menit lagi.' };
  if (nGlobal >= BATAS_GLOBAL_PER_MENIT) return { ok: false, pesan: 'Banyak yang sedang mengecek. Coba lagi 1 menit lagi.' };
  cache.put(kunciNik, String(nNik + 1), 900);
  cache.put(kunciGlobal, String(nGlobal + 1), 120);

  var ss = SpreadsheetApp.openById(ID_SPREADSHEET);
  var temuan = [];
  [[SHEET_BARU, 'SIM Baru'], [SHEET_PERPANJANGAN, 'Perpanjangan']].forEach(function (s) {
    var sh = ss.getSheetByName(s[0]);
    if (!sh || sh.getLastRow() < 2) return;
    var data = sh.getDataRange().getValues(), tampil = sh.getDataRange().getDisplayValues(), h = tampil[0];
    var iNik = cariKolom_(h, /^nik$/i), iLahir = cariKolom_(h, /tanggal lahir/i), iNama = cariKolom_(h, /^nama$/i),
        iSim = cariKolom_(h, /jenis sim/i), iLok = cariKolom_(h, /lokasi layanan/i), iKet = cariKolom_(h, /^keterangan$/i),
        iBukti = cariKolom_(h, /status bukti/i), iNilai = cariKolom_(h, /nilai teori/i), iWaktu = cariKolom_(h, /waktu daftar/i),
        iUrut = cariKolom_(h, /no\. ?urut/i);
    for (var r = 1; r < data.length; r++) {
      if (String(tampil[r][iNik]).replace(/\D/g, '') !== nik) continue;
      if (tanggalIso_(data[r][iLahir], tampil[r][iLahir]) !== lahir) continue;
      var ket = iKet >= 0 ? tampil[r][iKet] : '';
      temuan.push({
        permohonan: s[1],
        nama: samarkan_(tampil[r][iNama]),
        sim: iSim >= 0 ? tampil[r][iSim] : '',
        lokasi: iLok >= 0 ? tampil[r][iLok] : '',
        noUrut: iUrut >= 0 ? tampil[r][iUrut] : '',
        waktuDaftar: iWaktu >= 0 ? tampil[r][iWaktu] : '',
        keterangan: ket || 'Terdaftar',
        masukKuota: !KETERANGAN_TIDAK_DIHITUNG.test(ket),
        statusTeori: iBukti >= 0 ? tampil[r][iBukti] : '',
        nilaiTeori: iNilai >= 0 ? tampil[r][iNilai] : ''
      });
    }
  });

  if (!temuan.length) {
    return { ok: true, ditemukan: false,
             pesan: 'Data tidak ditemukan. Periksa kembali NIK dan tanggal lahir, atau data Anda masih diproses (tunggu ±5 menit setelah mengisi formulir).' };
  }
  cache.remove(kunciNik); // berhasil → hitungan percobaan dikosongkan
  return { ok: true, ditemukan: true, data: temuan };
}

// ---------- Pembantu -------------------------------------------------------
function cariKolom_(header, pola) {
  for (var i = 0; i < header.length; i++) if (pola.test(String(header[i]).trim())) return i;
  return -1;
}

function tanggalIso_(nilai, teks) {
  if (Object.prototype.toString.call(nilai) === '[object Date]' && !isNaN(nilai)) {
    return Utilities.formatDate(nilai, ZONA, 'yyyy-MM-dd');
  }
  var m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(String(teks || nilai).trim()); // dd/MM/yyyy
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

/** "Puri Wulandari" → "Pu** Wu*******" */
function samarkan_(nama) {
  return String(nama || '').trim().split(/\s+/).map(function (k) {
    return k.length <= 2 ? k.charAt(0) + '*' : k.slice(0, 2) + new Array(k.length - 1).join('*');
  }).join(' ');
}

function sidik_(teks) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, teks)).slice(0, 22);
}

/** Jalankan sekali dari editor untuk memeriksa hasil sebelum di-deploy. */
function ujiCoba() {
  CacheService.getScriptCache().remove('jadwal_v1');
  console.log(JSON.stringify(jadwalPublik_(), null, 2));
  console.log(samarkan_('Puri Wulandari'));
}
