/* SIM Komunitas Banyuwangi — logika portal. Pengaturan ada di config.js. */
(function () {
  'use strict';
  var K = window.SIMKOM;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var rupiah = function (n) { return 'Rp' + n.toLocaleString('id-ID'); };

  /** Membuat elemen tanpa innerHTML: h('p', {class:'x'}, 'teks', anak…) */
  function h(tag, at) {
    var e = document.createElement(tag);
    for (var k in at || {}) {
      if (at[k] == null || at[k] === false) continue;
      if (k === 'class') e.className = at[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), at[k]);
      else e.setAttribute(k, at[k]);
    }
    for (var i = 2; i < arguments.length; i++) tambah(e, arguments[i]);
    return e;
  }
  function tambah(e, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { tambah(e, x); });
    else e.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function simpan(k, v) { try { localStorage.setItem('simkom_' + k, JSON.stringify(v)); } catch (e) { /* mode privat */ } }
  function ambil(k, d) { try { var v = localStorage.getItem('simkom_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }

  // ---- waktu WIB -----------------------------------------------------------
  function wib() { return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 16); } // "YYYY-MM-DDTHH:MM"
  function hariIni() { return wib().slice(0, 10); }
  function tglObj(iso) { var p = iso.split('-'); return new Date(Date.UTC(+p[0], p[1] - 1, +p[2])); }
  function selisihHari(a, b) { return Math.round((tglObj(b) - tglObj(a)) / 864e5); }
  function tglPanjang(iso) { var d = tglObj(iso); return HARI[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + BULAN[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function tambahHari(iso, n) { return new Date(tglObj(iso).getTime() + n * 864e5).toISOString().slice(0, 10); }

  function ambilJson(url, ms) {
    var ctl = 'AbortController' in window ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 10000);
    return fetch(url, { signal: ctl && ctl.signal, credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .finally(function () { clearTimeout(t); });
  }

  // ---- tautan umum ---------------------------------------------------------
  document.querySelectorAll('[data-wa]').forEach(function (a) { a.href = 'https://wa.me/' + K.WA; a.target = '_blank'; a.rel = 'noopener'; });
  document.querySelectorAll('[data-wa-teks]').forEach(function (s) { s.textContent = K.WA_TAMPIL; });
  document.querySelectorAll('[data-buku]').forEach(function (a) { a.href = K.BUKU_URL; });
  document.querySelectorAll('[data-buku-teori]').forEach(function (a) { a.href = K.BUKU_TEORI; });
  document.querySelectorAll('[data-buku-komunitas]').forEach(function (a) { a.href = K.BUKU_KOMUNITAS; });

  // ---- tema ----------------------------------------------------------------
  var tema = ambil('tema', null);
  if (tema) document.documentElement.setAttribute('data-theme', tema);
  $('#tombolTema').addEventListener('click', function () {
    var gelap = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    tema = gelap ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', tema);
    simpan('tema', tema);
  });

  // =========================================================================
  // 1. JADWAL & KUOTA
  // =========================================================================
  var jadwalTerkini = [];
  var STATUS_TEKS = { buka: 'Pendaftaran dibuka', penuh: 'Kuota penuh', tutup: 'Pendaftaran ditutup', selesai: 'Selesai' };

  function statusLokal(j) {
    if (wib() > j.tanggal + 'T' + (j.selesai || '23:59')) return 'selesai';
    return j.status || (j.dibuka === false ? 'tutup' : 'buka');
  }

  function muatJadwal() {
    var wadah = $('#daftarJadwal');
    wadah.replaceChildren(h('div', { class: 'kerangka' }), h('div', { class: 'kerangka' }));
    var janji = K.API_URL ? ambilJson(K.API_URL + '?aksi=jadwal', 10000) : Promise.reject(new Error('API belum diatur'));
    janji.then(function (d) {
      if (!d.ok) throw new Error(d.pesan);
      tampilkanJadwal(d.jadwal, 'Sisa kuota diperbarui ' + d.diperbarui + '.');
    }).catch(function () {
      tampilkanJadwal(K.JADWAL_CADANGAN, K.API_URL ? 'Angka kuota sedang tidak dapat dimuat. Jadwal tetap dapat dilihat.' : 'Jadwal resmi SIM Komunitas.');
    });
  }

  function tampilkanJadwal(daftar, info) {
    var kini = hariIni();
    jadwalTerkini = daftar.map(function (j) { var c = Object.assign({}, j); c.status = statusLokal(j); return c; })
      .sort(function (a, b) { return (a.status === 'selesai') - (b.status === 'selesai') || (a.tanggal < b.tanggal ? -1 : 1); });
    var wadah = $('#daftarJadwal');
    wadah.replaceChildren();
    jadwalTerkini.forEach(function (j) { wadah.appendChild(kartuJadwal(j, kini)); });
    $('#jadwalInfo').textContent = info;
    $('#jadwalHabis').hidden = jadwalTerkini.some(function (j) { return j.status !== 'selesai'; });
    isiTiket();
  }

  // ---- tiket "Layanan berikutnya" di sampul --------------------------------
  var tiketTujuan = null;
  function isiTiket() {
    var j = jadwalTerkini.filter(function (x) { return x.status !== 'selesai'; })[0];
    var tiket = $('#tiket'), kuota = $('#tiketKuota');
    kuota.replaceChildren();
    if (!j) {
      tiketTujuan = null; tiket.classList.add('kosong');
      $('#tiketNama').textContent = 'Jadwal berikutnya segera diumumkan';
      $('#tiketTgl').textContent = 'Pantau halaman ini atau WhatsApp Satpas ' + K.WA_TAMPIL;
      return;
    }
    tiket.classList.remove('kosong');
    $('#tiketHitung').replaceChildren(
      h('div', null, h('b', { id: 'hH' }, '–'), h('small', null, 'hari')),
      h('div', null, h('b', { id: 'hJ' }, '–'), h('small', null, 'jam')),
      h('div', null, h('b', { id: 'hM' }, '–'), h('small', null, 'menit')));
    tiketTujuan = Date.parse(j.tanggal + 'T' + (j.mulai || '08:00') + ':00+07:00');
    $('#tiketNama').textContent = (j.ikon ? j.ikon + ' ' : '') + j.nama;
    $('#tiketTgl').textContent = tglPanjang(j.tanggal) + ' · ' + (j.mulai || '08:00') + ' WIB';
    if (j.kuota) {
      [['SIM Baru', j.kuota.baru], ['Perpanjangan', j.kuota.perpanjangan]].forEach(function (x) {
        if (x[1]) kuota.appendChild(h('span', { class: 'chip ' + (x[1].sisa === 0 ? 'penuh' : 'buka') }, x[0] + ': ' + (x[1].sisa === 0 ? 'penuh' : 'sisa ' + x[1].sisa)));
      });
    } else kuota.appendChild(h('span', { class: 'chip ' + j.status }, STATUS_TEKS[j.status]));
    hitungMundur();
  }
  function hitungMundur() {
    if (!tiketTujuan || !$('#hH')) return;
    var d = Math.max(0, tiketTujuan - Date.now());
    if (d === 0) { $('#tiketHitung').replaceChildren(h('div', null, h('b', null, '🟢'), h('small', null, 'sedang berlangsung'))); return; }
    var m = Math.floor(d / 6e4);
    $('#hH').textContent = Math.floor(m / 1440); $('#hJ').textContent = Math.floor(m % 1440 / 60); $('#hM').textContent = m % 60;
  }
  setInterval(hitungMundur, 30000);

  function kartuJadwal(j, kini) {
    var node = $('#tplJadwal').content.firstElementChild.cloneNode(true);
    var beda = selisihHari(kini, j.tanggal);
    if (j.status === 'selesai') node.classList.add('lewat');
    $('.kj-ikon', node).textContent = j.ikon || '📍';
    $('h3', node).textContent = j.nama;
    $('.kj-ket', node).textContent = j.ket || '';
    var chip = $('.kj-status', node);
    var label = STATUS_TEKS[j.status];
    if (j.status !== 'selesai' && beda === 0) { label = 'Hari ini'; chip.classList.add('hariini'); }
    else chip.classList.add(j.status);
    chip.textContent = label;

    var hitung = beda === 0 ? 'Hari ini' : beda === 1 ? 'Besok' : beda > 1 ? beda + ' hari lagi' : '';
    $('.kj-waktu', node).replaceChildren(tglPanjang(j.tanggal),
      h('small', null, 'Pukul ' + (j.mulai || '08:00') + '–' + (j.selesai || '15:00') + ' WIB' + (hitung && j.status !== 'selesai' ? ' · ' + hitung : '')));

    var kq = $('.kj-kuota', node);
    if (j.kuota && j.status !== 'selesai') {
      [['SIM Baru', j.kuota.baru], ['Perpanjangan', j.kuota.perpanjangan]].forEach(function (x) {
        if (!x[1]) return;
        var persen = x[1].batas ? Math.min(100, Math.round(x[1].terisi / x[1].batas * 100)) : 0;
        var bar = h('i', { class: x[1].sisa === 0 ? 'habis' : x[1].sisa <= x[1].batas * 0.2 ? 'tipis' : '' });
        bar.style.width = persen + '%';
        kq.appendChild(h('div', { class: 'kuota' },
          h('div', { class: 'kuota-baris' }, h('span', null, x[0]), h('b', null, x[1].sisa === 0 ? 'Penuh' : 'Sisa ' + x[1].sisa + ' dari ' + x[1].batas)),
          h('div', { class: 'batang', role: 'progressbar', 'aria-label': 'Kuota ' + x[0] + ' terisi', 'aria-valuenow': persen, 'aria-valuemin': 0, 'aria-valuemax': 100 }, bar)));
      });
    }

    var aksi = $('.kj-aksi', node);
    if (j.status === 'buka') aksi.appendChild(h('a', { class: 'tombol kecil', href: K.FORM_URL, target: '_blank', rel: 'noopener' }, '📝 Daftar sekarang'));
    if (j.status !== 'selesai' && beda <= 1) {
      aksi.appendChild(h('a', { class: 'tombol kecil garis', href: K.BUKTI_URL + encodeURIComponent(j.kode) + '&tgl=' + j.tanggal, target: '_blank', rel: 'noopener' }, '📤 Kirim bukti teori'));
    }
    if (j.status !== 'selesai') {
      aksi.appendChild(h('a', { class: 'tombol kecil garis', href: tautanKalender(j), target: '_blank', rel: 'noopener' }, '🗓️ Ingatkan saya'));
      aksi.appendChild(h('button', { class: 'tombol kecil garis', type: 'button', onclick: function () { bagikan(j); } }, '↗ Bagikan'));
    }
    return node;
  }

  function tautanKalender(j) {
    var t = j.tanggal.replace(/-/g, '');
    var jam = function (x) { var p = (x || '08:00').split(':'); return ('0' + (p[0] - 7)).slice(-2) + p[1] + '00'; }; // WIB → UTC
    var detail = 'Bawa KTP asli (dan SIM lama untuk perpanjangan). SIM Baru: kirim bukti ujian teori lewat ' +
      K.BUKTI_URL + j.kode + '\nInfo: ' + location.href.split('#')[0];
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('SIM Komunitas – ' + j.nama) +
      '&dates=' + t + 'T' + jam(j.mulai) + 'Z/' + t + 'T' + jam(j.selesai) + 'Z&ctz=Asia/Jakarta&location=' + encodeURIComponent(j.nama + ', Banyuwangi') +
      '&details=' + encodeURIComponent(detail);
  }

  function bagikan(j) {
    var teks = 'SIM Komunitas di ' + j.nama + ' – ' + tglPanjang(j.tanggal) + '. Cek sisa kuota & daftar: ' + location.href.split('#')[0] + '#jadwal';
    if (navigator.share) navigator.share({ title: 'SIM Komunitas Banyuwangi', text: teks }).catch(function () {});
    else window.open('https://wa.me/?text=' + encodeURIComponent(teks), '_blank', 'noopener');
  }

  muatJadwal();

  // menu: tandai bagian yang sedang dibaca
  if ('IntersectionObserver' in window) {
    var tautanMenu = document.querySelectorAll('.menu a');
    var pengamat = new IntersectionObserver(function (isi) {
      isi.forEach(function (x) {
        if (!x.isIntersecting) return;
        tautanMenu.forEach(function (a) { a.classList.toggle('aktif', a.getAttribute('href') === '#' + x.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['jadwal', 'syarat', 'status', 'teori', 'tanya'].forEach(function (id) { var e = document.getElementById(id); if (e) pengamat.observe(e); });
  }
  setInterval(function () { if (!document.hidden) muatJadwal(); }, 120000);

  // =========================================================================
  // 2. CEK SYARAT
  // =========================================================================
  var fs = $('#formSyarat');
  function nilaiRadio(form, nama) { var x = form.querySelector('input[name="' + nama + '"]:checked'); return x && x.value; }
  fs.addEventListener('change', function () { $('#isianBerlaku').hidden = nilaiRadio(fs, 'permohonan') !== 'perpanjangan'; });

  function usiaPada(lahir, pada) {
    var a = lahir.split('-').map(Number), b = pada.split('-').map(Number);
    var u = b[0] - a[0];
    if (b[1] < a[1] || (b[1] === a[1] && b[2] < a[2])) u--;
    return u;
  }

  fs.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var per = nilaiRadio(fs, 'permohonan'), gol = nilaiRadio(fs, 'gol');
    var lahir = fs.lahir.value, berlaku = fs.berlaku.value, kini = hariIni();
    var out = $('#hasilSyarat');
    if (!lahir) { out.replaceChildren(h('div', { class: 'hasil gagal' }, 'Isi tanggal lahir terlebih dahulu.')); fs.lahir.focus(); return; }
    if (per === 'perpanjangan' && !berlaku) { out.replaceChildren(h('div', { class: 'hasil gagal' }, 'Isi tanggal masa berlaku SIM lama (tertera di kartu SIM).')); fs.berlaku.focus(); return; }

    var lokasi = jadwalTerkini.filter(function (j) { return j.status === 'buka'; })[0];
    var acuan = lokasi ? lokasi.tanggal : kini;
    var usia = usiaPada(lahir, acuan), min = K.USIA_MIN[gol];
    var blok = [];

    if (usia < min) {
      var ultah = (Number(lahir.slice(0, 4)) + min) + lahir.slice(4);
      out.replaceChildren(h('div', { class: 'hasil gagal' },
        h('h3', null, 'Belum memenuhi usia minimal'),
        h('p', null, 'Usia minimal SIM ' + gol + ' adalah ' + min + ' tahun. Pada ' + tglPanjang(acuan) + ' usia Anda ' + usia + ' tahun.'),
        h('p', null, 'Anda bisa mendaftar mulai ' + tglPanjang(ultah) + '. Sambil menunggu, latihan dulu ujian teorinya di bawah. 🙂'),
        h('div', { class: 'baris-aksi' }, h('a', { class: 'tombol kecil', href: '#teori' }, '📝 Latihan teori'))));
      return;
    }

    var jadiBaru = false;
    if (per === 'perpanjangan' && berlaku < kini) {
      jadiBaru = true;
      blok.push(h('div', { class: 'hasil awas' },
        h('h3', null, 'SIM lama sudah lewat masa berlaku'),
        h('p', null, 'Masa berlaku berakhir ' + tglPanjang(berlaku) + '. SIM yang sudah lewat masa berlaku tidak bisa diperpanjang, jadi daftarlah sebagai SIM Baru (ikut ujian teori dan praktik).')));
      per = 'baru';
    }

    var berkas = per === 'baru'
      ? ['KTP asli, domisili Banyuwangi', 'Screenshot hasil ujian teori via HP (dikirim lewat tombol Kirim bukti teori)', 'HP dengan nomor WhatsApp yang dipakai saat mendaftar', 'Kondisi sehat untuk tes kesehatan & psikologi di lokasi', 'Kacamata bila biasa dipakai saat berkendara']
      : ['KTP asli, domisili Banyuwangi', 'SIM ' + gol + ' lama (asli)', 'HP dengan nomor WhatsApp yang dipakai saat mendaftar', 'Kondisi sehat untuk tes kesehatan & psikologi di lokasi'];
    var kunciCek = 'cek_' + per + gol, tercentang = ambil(kunciCek, {});
    var daftarCek = h('ul', { class: 'cek-list' }, berkas.map(function (b, i) {
      var cb = h('input', { type: 'checkbox', onchange: function () { tercentang[i] = this.checked; simpan(kunciCek, tercentang); } });
      cb.checked = !!tercentang[i];
      return h('li', null, h('label', null, cb, h('span', null, b)));
    }));

    var biaya = K.PNBP[per][gol];
    var aksi = h('div', { class: 'baris-aksi' },
      lokasi ? h('a', { class: 'tombol kecil', href: K.FORM_URL, target: '_blank', rel: 'noopener' }, '📝 Daftar ' + (per === 'baru' ? 'SIM Baru' : 'Perpanjangan')) : null,
      per === 'baru' ? h('a', { class: 'tombol kecil garis', href: '#teori' }, '📘 Latihan teori') : null);
    if (per === 'perpanjangan' && !jadiBaru) {
      var ingat = tambahHari(berlaku, -30).replace(/-/g, '');
      aksi.appendChild(h('a', { class: 'tombol kecil garis', target: '_blank', rel: 'noopener',
        href: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('Perpanjang SIM ' + gol + ' (habis ' + tglPanjang(berlaku) + ')') +
          '&dates=' + ingat + '/' + ingat + '&details=' + encodeURIComponent('SIM yang lewat masa berlaku harus dibuat baru. Info: ' + location.href.split('#')[0]) }, '⏰ Pengingat 30 hari sebelum habis'));
    }

    blok.push(h('div', { class: 'hasil ok' },
      h('h3', null, '✅ Anda bisa ikut: ' + (per === 'baru' ? 'SIM ' + gol + ' Baru' : 'Perpanjangan SIM ' + gol)),
      h('p', null, lokasi ? 'Lokasi terdekat yang masih dibuka: ' + lokasi.nama + ', ' + tglPanjang(lokasi.tanggal) + '.' : 'Saat ini belum ada lokasi yang membuka pendaftaran. Pantau jadwal di halaman ini.'),
      h('p', null, h('b', null, 'Yang perlu disiapkan'), ' (centang bila sudah):'), daftarCek,
      h('p', null, h('b', null, 'PNBP resmi: ' + rupiah(biaya)), ' — dibayar di loket resmi/BRIVA, bukan ke perorangan. Pendaftaran gratis.'),
      aksi));
    out.replaceChildren.apply(out, blok);
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // =========================================================================
  // 3. CEK STATUS
  // =========================================================================
  var fst = $('#formStatus');
  fst.nik.addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 16); });
  fst.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var out = $('#hasilStatus'), nik = fst.nik.value, lahir = fst.lahir.value;
    if (nik.length !== 16) { out.replaceChildren(h('div', { class: 'hasil gagal' }, 'NIK harus 16 angka (lihat KTP).')); fst.nik.focus(); return; }
    if (!lahir) { out.replaceChildren(h('div', { class: 'hasil gagal' }, 'Isi tanggal lahir sesuai KTP.')); fst.lahir.focus(); return; }
    if (!K.API_URL) {
      out.replaceChildren(h('div', { class: 'hasil awas' }, h('h3', null, 'Fitur cek status segera aktif'),
        h('p', null, 'Sementara ini, tanyakan status pendaftaran ke WhatsApp Satpas ' + K.WA_TAMPIL + '.'),
        h('a', { class: 'tombol kecil wa', href: 'https://wa.me/' + K.WA, target: '_blank', rel: 'noopener' }, '💬 Tanya petugas')));
      return;
    }
    var tombol = fst.querySelector('button'); tombol.disabled = true; tombol.textContent = 'Mencari…';
    ambilJson(K.API_URL + '?aksi=status&nik=' + nik + '&lahir=' + lahir, 15000).then(function (d) {
      if (!d.ok) { out.replaceChildren(h('div', { class: 'hasil gagal' }, d.pesan)); return; }
      if (!d.ditemukan) { out.replaceChildren(h('div', { class: 'hasil awas' }, h('h3', null, 'Data belum ditemukan'), h('p', null, d.pesan))); return; }
      out.replaceChildren.apply(out, d.data.map(kartuStatus));
      fst.nik.value = '';
    }).catch(function () {
      out.replaceChildren(h('div', { class: 'hasil gagal' }, 'Server tidak menjawab. Periksa sinyal internet lalu coba lagi.'));
    }).finally(function () { tombol.disabled = false; tombol.textContent = 'Cek status'; });
  });

  function kartuStatus(r) {
    var tahap = [h('li', { class: 'selesai' }, h('b', null, 'Terdaftar'), h('small', null, (r.waktuDaftar || '') + (r.noUrut ? ' · No. urut ' + r.noUrut : '')))];
    tahap.push(r.masukKuota
      ? h('li', { class: 'selesai' }, h('b', null, 'Masuk kuota'), h('small', null, r.keterangan))
      : h('li', { class: 'gagal' }, h('b', null, r.keterangan), h('small', null, 'Hubungi petugas untuk pilihan lokasi lain.')));
    var kodeLok = (jadwalTerkini.filter(function (j) { return r.lokasi.toLowerCase().indexOf(j.nama.toLowerCase()) >= 0; })[0] || {}).kode;
    if (r.permohonan === 'SIM Baru') {
      var st = (r.statusTeori || '').toLowerCase();
      if (st === 'lulus') tahap.push(h('li', { class: 'selesai' }, h('b', null, 'Ujian teori: Lulus' + (r.nilaiTeori ? ' (nilai ' + r.nilaiTeori + ')' : '')), h('small', null, 'Bukti sudah dicek petugas.')));
      else if (st.indexOf('tidak') === 0) tahap.push(h('li', { class: 'gagal' }, h('b', null, 'Ujian teori: Tidak lulus' + (r.nilaiTeori ? ' (nilai ' + r.nilaiTeori + ')' : '')), h('small', null, 'Ikuti ujian ulang, lalu kirim lagi screenshot terbaru dengan nomor WhatsApp yang sama.')));
      else tahap.push(h('li', { class: 'kini' }, h('b', null, 'Ujian teori: menunggu bukti'), h('small', null, 'Kerjakan ujian teori via HP, lalu kirim screenshot hasilnya.'),
        kodeLok ? h('a', { class: 'tombol kecil garis', href: K.BUKTI_URL + encodeURIComponent(kodeLok), target: '_blank', rel: 'noopener' }, '📤 Kirim bukti teori') : null));
    }
    tahap.push(h('li', { class: 'kini' }, h('b', null, 'Datang ke lokasi'), h('small', null, r.lokasi)));
    return h('div', { class: 'hasil' + (r.masukKuota ? ' ok' : ' awas') },
      h('h3', null, r.nama), h('p', { class: 'kecil' }, r.permohonan + ' · ' + r.sim), h('ul', { class: 'tahap' }, tahap));
  }

  // =========================================================================
  // 4. LATIHAN TEORI (bank soal Buku Digital)
  // =========================================================================
  var bank = null, sesi = null;
  var NAMA_TAHAP = { PB: 'Persepsi Bahaya', WA: 'Wawasan', PE: 'Pengetahuan' };
  var LULUS = 70, JUMLAH = { PB: 4, WA: 3, PE: 3 };
  var kuis = $('#kuis'), awalKuis = Array.prototype.slice.call(kuis.childNodes);
  var terbaik = ambil('skor_terbaik', null);
  if (terbaik) $('#kuisInfo').textContent = 'Skor terbaik Anda di perangkat ini: ' + terbaik + '. Latihan, bukan ujian resmi.';

  function acak(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  $('#mulaiKuis').addEventListener('click', function () {
    var gol = nilaiRadio(kuis, 'kgol') || 'C', btn = this;
    btn.disabled = true; btn.textContent = 'Memuat soal…';
    (bank ? Promise.resolve(bank) : ambilJson(K.SOAL_URL, 15000).then(function (d) { return (bank = d.soal); }))
      .then(function (soal) {
        var cocok = soal.filter(function (q) { return !q.g || q.g.indexOf(gol) >= 0; });
        var pilih = [];
        Object.keys(JUMLAH).forEach(function (t) { pilih = pilih.concat(acak(cocok.filter(function (q) { return q.t === t; })).slice(0, JUMLAH[t])); });
        sesi = { gol: gol, soal: pilih, i: 0, benar: 0 };
        tampilSoal();
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = '▶ Mulai latihan kilat';
        $('#kuisInfo').textContent = 'Soal belum bisa dimuat. Periksa internet, atau buka simulasi lengkap di Buku Digital.';
      });
  });

  function tampilSoal() {
    var q = sesi.soal[sesi.i];
    var opsi = acak([q.a].concat(q.o));
    var bar = h('i'); bar.style.width = (sesi.i / sesi.soal.length * 100) + '%';
    var wadahOpsi = h('div', { class: 'opsi' });
    var lanjut = h('div');
    opsi.forEach(function (o) {
      wadahOpsi.appendChild(h('button', { type: 'button', onclick: function () {
        var benar = o === q.a;
        if (benar) sesi.benar++;
        wadahOpsi.querySelectorAll('button').forEach(function (b) { b.disabled = true; if (b.textContent === q.a) b.classList.add('benar'); });
        if (!benar) this.classList.add('salah');
        lanjut.replaceChildren(
          h('div', { class: 'penjelasan' }, h('b', null, benar ? '✅ Benar. ' : '❌ Kurang tepat. '), q.e || '', q.d ? h('small', { class: 'redup' }, ' (' + q.d + ')') : null),
          h('div', { class: 'baris-aksi' }, h('button', { class: 'tombol', type: 'button', onclick: function () {
            sesi.i++; if (sesi.i < sesi.soal.length) tampilSoal(); else tampilSkor();
          } }, sesi.i + 1 < sesi.soal.length ? 'Soal berikutnya →' : 'Lihat nilai')));
        lanjut.querySelector('.tombol').focus();
      } }, o));
    });
    kuis.replaceChildren(h('div', { class: 'progres' }, bar),
      h('div', { class: 'soal-no' }, 'Soal ' + (sesi.i + 1) + ' dari ' + sesi.soal.length + ' · ' + NAMA_TAHAP[q.t] + ' · SIM ' + sesi.gol),
      h('p', { class: 'soal-q' }, q.q), wadahOpsi, lanjut);
  }

  function tampilSkor() {
    var nilai = Math.round(sesi.benar / sesi.soal.length * 100), lulus = nilai >= LULUS;
    if (!terbaik || nilai > terbaik) { terbaik = nilai; simpan('skor_terbaik', nilai); }
    kuis.replaceChildren(
      h('div', { class: 'skor' }, String(nilai)),
      h('p', null, h('b', null, lulus ? '🎉 Lulus latihan!' : 'Belum mencapai 70'), ' — benar ' + sesi.benar + ' dari ' + sesi.soal.length + ' soal.'),
      h('p', { class: 'kecil redup' }, lulus ? 'Mantap. Coba simulasi lengkap E-AVIS 65 soal di Buku Digital agar makin siap.' : 'Pelajari penjelasan tiap soal, lalu ulangi. Soal diacak setiap kali.'),
      h('div', { class: 'baris-aksi' },
        h('button', { class: 'tombol', type: 'button', onclick: function () { kuis.replaceChildren.apply(kuis, awalKuis); var b = $('#mulaiKuis'); b.disabled = false; b.textContent = '▶ Ulangi latihan'; $('#kuisInfo').textContent = 'Skor terbaik Anda di perangkat ini: ' + terbaik + '.'; } }, '↻ Latihan lagi'),
        h('a', { class: 'tombol garis', href: K.BUKU_TEORI, target: '_blank', rel: 'noopener' }, 'Simulasi lengkap E-AVIS')));
  }
})();
