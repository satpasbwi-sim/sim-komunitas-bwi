/* SIM Komunitas Banyuwangi — logika portal. Pengaturan ada di config.js. */
(function () {
  'use strict';
  var K = window.SIMKOM;
  var VERSI = window.SIMKOM_VERSI === 'B' ? 'B' : 'A';   // A = SIM Baru & Perpanjangan, B = khusus Perpanjangan (lihat versi.js)
  /** Jenis kuota yang ditampilkan untuk satu lokasi pada versi ini. */
  function jenisKuota(j) {
    var lengkap = VERSI === 'A' && j.layanan !== 'perpanjangan';
    return lengkap ? [['SIM Baru', j.kuota && j.kuota.baru], ['Perpanjangan', j.kuota && j.kuota.perpanjangan]] : [['Perpanjangan', j.kuota && j.kuota.perpanjangan]];
  }
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


  // ---- halaman per menu: hanya bagian menu yang dipilih yang tampil ---------
  var PANEL = VERSI === 'B' ? ['beranda', 'jadwal', 'syarat', 'status', 'usulan', 'tanya']
                             : ['beranda', 'jadwal', 'syarat', 'status', 'teori', 'praktik', 'usulan', 'tanya'];
  var JUDUL_PANEL = { beranda: 'SIM Komunitas Banyuwangi', jadwal: 'Jadwal & Kuota', syarat: 'Cek Syarat', status: 'Cek Status',
    teori: 'Latihan Teori', praktik: 'Latihan Praktik', usulan: 'Usulkan Lokasi', tanya: 'Tanya Jawab' };
  document.querySelectorAll('[data-panel]').forEach(function (sec) {
    if (sec.getAttribute('data-panel') === 'beranda' || !sec.id) return;
    var w = sec.querySelector('.wrap');
    if (w) w.insertBefore(h('a', { class: 'kembali', href: '#beranda' }, '← Beranda'), w.firstChild);
  });
  function tampilPanel(gulir) {
    var id = (location.hash || '#beranda').slice(1);
    if (PANEL.indexOf(id) < 0) id = 'beranda';
    document.querySelectorAll('[data-panel]').forEach(function (sec) { sec.hidden = sec.getAttribute('data-panel') !== id; });
    document.querySelectorAll('.menu a').forEach(function (a) {
      var aktif = a.getAttribute('href') === '#' + id;
      a.classList.toggle('aktif', aktif);
      if (aktif) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var dasar = VERSI === 'B' ? 'SIM Perpanjangan Komunitas Banyuwangi' : JUDUL_PANEL.beranda;
    document.title = id === 'beranda' ? dasar : JUDUL_PANEL[id] + ' – ' + dasar;
    if (gulir !== false) window.scrollTo({ top: 0, behavior: 'instant' });
  }
  window.addEventListener('hashchange', function () { tampilPanel(); });
  document.addEventListener('click', function (ev) {   // klik menu yang sedang aktif: kembali ke atas
    var a = ev.target.closest('a[href^="#"]');
    if (a && a.getAttribute('href') === (location.hash || '#beranda')) { ev.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
  tampilPanel();

  /** URL halaman ini pada versi lain, misalnya lokasiVersi('B', '#jadwal'). */
  function lokasiVersi(v, hash) {
    return location.pathname + (v === 'B' ? '?versi=perpanjangan' : '') + (hash || location.hash || '#beranda');
  }
  document.querySelectorAll('[data-ke-versi]').forEach(function (a) { a.href = lokasiVersi(a.getAttribute('data-ke-versi'), a.getAttribute('href')); });

  // =========================================================================
  // 1. JADWAL & KUOTA
  // =========================================================================
  var jadwalTerkini = [];
  var STATUS_TEKS = { buka: 'Pendaftaran dibuka', segera: 'Segera dibuka', penuh: 'Kuota penuh', tutup: 'Pendaftaran ditutup', selesai: 'Selesai', menyusul: 'Tanggal menyusul' };

  function statusLokal(j) {
    if (!j.tanggal) return 'menyusul';   // lokasi dari JADWAL_MENYUSUL (tanggal belum diumumkan)
    if (wib() > j.tanggal + 'T' + (j.selesai || '23:59')) return 'selesai';
    return j.status || (j.dibuka === false ? 'tutup' : 'buka');
  }

  function muatJadwal() {
    var wadah = $('#daftarJadwal');
    wadah.replaceChildren(h('div', { class: 'kerangka' }), h('div', { class: 'kerangka' }));
    var janji = K.API_URL ? ambilJson(K.API_URL + '?aksi=jadwal', 10000) : Promise.reject(new Error('API belum diatur'));
    janji.then(function (d) {
      if (!d.ok) throw new Error(d.pesan);
      simpan('jadwal_terakhir', { jadwal: d.jadwal, diperbarui: d.diperbarui });
      tampilkanJadwal(d.jadwal, 'Sisa kuota diperbarui ' + d.diperbarui + '.');
    }).catch(function () {
      var akhir = ambil('jadwal_terakhir', null);   // data terakhir yang berhasil dimuat (untuk mode offline)
      if (akhir && akhir.jadwal) {
        tampilkanJadwal(akhir.jadwal, (navigator.onLine === false ? '📴 Offline – ' : '') + 'menampilkan data terakhir (' + akhir.diperbarui + '). Angka kuota bisa sudah berubah.');
      } else {
        tampilkanJadwal(K.JADWAL_CADANGAN, K.API_URL ? 'Angka kuota sedang tidak dapat dimuat. Jadwal tetap dapat dilihat.' : 'Jadwal resmi SIM Komunitas.');
      }
    });
  }

  /** Lokasi "tanggal menyusul" dari config yang belum ada di jadwal resmi (dicocokkan lewat kode atau nama). */
  function tambahMenyusul(daftar) {
    var sama = function (a, b) { return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase(); };
    return daftar.concat((K.JADWAL_MENYUSUL || []).filter(function (m) {
      return !daftar.some(function (j) { return sama(j.kode, m.kode) || sama(j.nama, m.nama); });
    }).map(function (m) { return Object.assign({ tanggal: '' }, m); }));
  }

  function tampilkanJadwal(daftar, info) {
    var kini = hariIni();
    jadwalTerkini = tambahMenyusul(daftar).map(function (j) { var c = Object.assign({}, j); c.status = statusLokal(j); return c; })
      .sort(function (a, b) {
        return (a.status === 'selesai') - (b.status === 'selesai') || (!a.tanggal) - (!b.tanggal) || (a.tanggal < b.tanggal ? -1 : 1);
      });
    var wadah = $('#daftarJadwal');
    wadah.replaceChildren();
    jadwalTerkini.forEach(function (j) { wadah.appendChild(kartuJadwal(j, kini)); });
    $('#jadwalInfo').textContent = info;
    $('#jadwalHabis').hidden = jadwalTerkini.some(function (j) { return j.status !== 'selesai'; });
    jadwalPopBukti();
    var baru = jadwalTerkini.filter(function (j) { return j.baru && j.status !== 'selesai'; });
    document.querySelectorAll('[data-pengumuman]').forEach(function (w) {
      w.hidden = !baru.length;
      w.replaceChildren(h('span', { class: 'pg-ikon' }, '🆕'), h('span', { class: 'pg-teks' }, h('b', null, 'Jadwal baru: '),
        baru.map(function (j) { return j.nama + ' – ' + tglPanjang(j.tanggal); }).join(' · ')));
      if (!w.closest('#jadwal')) w.appendChild(h('a', { class: 'tombol kecil', href: '#jadwal' }, 'Lihat'));
    });
    isiTiket();
  }

  // ---- tiket "Layanan berikutnya" di sampul --------------------------------
  var tiketTujuan = null;
  function isiTiket() {
    var j = jadwalTerkini.filter(function (x) { return x.status !== 'selesai' && x.tanggal; })[0];
    var menyusul = jadwalTerkini.filter(function (x) { return x.status === 'menyusul'; });
    var tiket = $('#tiket'), kuota = $('#tiketKuota');
    kuota.replaceChildren();
    if (!j && menyusul.length) {
      tiketTujuan = null; tiket.classList.add('kosong');
      $('#tiketNama').textContent = 'Berikutnya: ' + menyusul.map(function (x) { return x.nama; }).join(' & ');
      $('#tiketTgl').textContent = 'Tanggal layanan diumumkan menyusul · pantau halaman ini';
      return;
    }
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
      jenisKuota(j).forEach(function (x) {
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
    if (!j.tanggal) return kartuMenyusul(j, node);
    var beda = selisihHari(kini, j.tanggal);
    if (j.status === 'selesai') node.classList.add('lewat');
    $('.kj-ikon', node).textContent = j.ikon || '📍';
    $('h3', node).replaceChildren(h('span', null, j.nama, j.baru && j.status !== 'selesai' ? h('span', { class: 'chip baru-label' }, 'BARU') : null));
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
    if (j.layanan === 'perpanjangan' && VERSI === 'A') kq.appendChild(h('span', { class: 'chip khusus' }, '🔁 Khusus Perpanjangan'));
    if (j.kuota && j.status !== 'selesai') {
      jenisKuota(j).forEach(function (x) {
        if (!x[1]) return;
        var persen = x[1].batas ? Math.min(100, Math.round(x[1].terisi / x[1].batas * 100)) : 0;
        var bar = h('i', { class: x[1].sisa === 0 ? 'habis' : x[1].sisa <= x[1].batas * 0.2 ? 'tipis' : '' });
        bar.style.width = persen + '%';
        kq.appendChild(h('div', { class: 'kuota' },
          h('div', { class: 'kuota-baris' }, h('span', null, x[0]), h('b', null, x[1].sisa === 0 ? 'Penuh' : 'Sisa ' + x[1].sisa + ' dari ' + x[1].batas)),
          h('div', { class: 'batang', role: 'progressbar', 'aria-label': 'Kuota ' + x[0] + ' terisi', 'aria-valuenow': persen, 'aria-valuemin': 0, 'aria-valuemax': 100 }, bar)));
      });
    }

    if (j.status === 'segera') kq.appendChild(h('p', { class: 'kj-segera' }, '📣 Jadwal baru disetujui. Pendaftaran segera dibuka — pantau halaman ini atau tekan "Ingatkan saya".'));
    var aksi = $('.kj-aksi', node);
    if (j.status === 'buka') {
      aksi.appendChild(VERSI === 'B'
        ? h('button', { class: 'tombol kecil', type: 'button', 'aria-expanded': 'false', onclick: function () { cekSebelumDaftar(j, node, this); } }, '📝 Daftar sekarang')
        : h('a', { class: 'tombol kecil', href: K.FORM_URL, target: '_blank', rel: 'noopener' }, '📝 Daftar sekarang'));
    }
    if (j.status !== 'selesai' && beda <= 1 && VERSI === 'A' && j.layanan !== 'perpanjangan') {
      aksi.appendChild(h('a', { class: 'tombol kecil garis', href: K.BUKTI_URL + encodeURIComponent(j.kode) + '&tgl=' + j.tanggal }, '📤 Kirim bukti teori'));
    }
    if (j.status !== 'selesai' && /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps)/.test(j.maps || '')) {
      aksi.appendChild(h('a', { class: 'tombol kecil garis', href: j.maps, target: '_blank', rel: 'noopener' }, '🧭 Petunjuk arah'));
    }
    if (j.status !== 'selesai') {
      aksi.appendChild(h('a', { class: 'tombol kecil garis', href: tautanKalender(j), target: '_blank', rel: 'noopener' }, '🗓️ Ingatkan saya'));
      aksi.appendChild(h('button', { class: 'tombol kecil garis', type: 'button', onclick: function () { bagikan(j); } }, '↗ Bagikan'));
    }
    return node;
  }

  // ---- pop-up Kirim Bukti Ujian Teori ---------------------------------------
  // Muncul sekali per kunjungan (Versi A saja) setelah jadwal dimuat. Bila hari ini ada lokasi yang sedang
  // berlangsung, tombolnya memakai QR lokasi itu; selain itu QR tetap SIMLING (bukti dicocokkan lewat nomor WA).
  var popBukti = $('#popBukti');
  function jadwalPopBukti() {
    if (VERSI !== 'A' || !popBukti || jadwalPopBukti.sudah) return;
    jadwalPopBukti.sudah = true;
    try { if (sessionStorage.getItem('simkom_pop_bukti')) return; sessionStorage.setItem('simkom_pop_bukti', '1'); } catch (e) { /* mode privat */ }
    setTimeout(function () { if (!document.querySelector('dialog[open]')) bukaPopBukti(); }, 1500);
  }
  function bukaPopBukti() {
    if (!popBukti || popBukti.open) return;
    var kini = hariIni(), lok = jadwalTerkini.filter(function (j) { return j.tanggal === kini && j.status !== 'selesai'; })[0];
    $('#pbKirim').href = K.BUKTI_URL + (lok ? encodeURIComponent(lok.kode) + '&tgl=' + lok.tanggal : 'SIMLING');
    $('#pbLokasi').hidden = !lok;
    if (lok) $('#pbLokasi').textContent = '📍 Hari ini: ' + lok.nama + ' (' + (lok.mulai || '08:00') + '–' + (lok.selesai || '15:00') + ' WIB)';
    if (popBukti.showModal) popBukti.showModal(); else popBukti.setAttribute('open', '');
  }
  // tombol tetap "Kirim bukti ujian teori" (Beranda, menu, Jadwal, Latihan Teori) & tautan langsung …/#bukti
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-buka-bukti]');
    if (t) { e.preventDefault(); bukaPopBukti(); }
  });
  if (location.hash === '#bukti') {
    try { history.replaceState(null, '', '#beranda'); } catch (e) { /* browser lama */ }
    setTimeout(bukaPopBukti, 600);
  }
  if (popBukti) {
    popBukti.querySelectorAll('[data-tutup-bukti]').forEach(function (b) { b.addEventListener('click', function () { popBukti.close(); }); });
    $('#pbKirim').addEventListener('click', function () { popBukti.close(); });
    popBukti.addEventListener('click', function (e) { if (e.target === popBukti) popBukti.close(); });
  }

  /** Kartu lokasi yang tanggalnya belum diumumkan: tanpa kuota & hitung mundur, pendaftaran lewat formulir. */
  function kartuMenyusul(j, node) {
    $('.kj-ikon', node).textContent = j.ikon || '📍';
    $('h3', node).replaceChildren(h('span', null, j.nama, h('span', { class: 'chip baru-label' }, 'BARU')));
    $('.kj-ket', node).textContent = j.ket || '';
    var chip = $('.kj-status', node);
    chip.classList.add('segera');
    chip.textContent = STATUS_TEKS.menyusul;
    $('.kj-waktu', node).replaceChildren('Tanggal layanan diumumkan menyusul', h('small', null, 'Pantau halaman ini atau WhatsApp Satpas ' + K.WA_TAMPIL));
    if (j.dibuka === false) {
      // formulir untuk lokasi ini belum dibuka (lokasi diberi tutup: true di project Kuota v2)
      $('.kj-kuota', node).appendChild(h('p', { class: 'kj-segera' }, '⏳ Pendaftaran belum dibuka. Tanggal layanan dan pembukaan pendaftaran akan diumumkan.'));
      return node;
    }
    $('.kj-kuota', node).appendChild(h('p', { class: 'kj-segera' }, '📣 Pendaftaran sudah dapat dilakukan lewat formulir. Hari & jam layanan akan diumumkan.'));
    $('.kj-aksi', node).appendChild(h('a', { class: 'tombol kecil', href: K.FORM_URL, target: '_blank', rel: 'noopener' }, '📝 Daftar sekarang'));
    return node;
  }

  /**
   * Versi Perpanjangan: sebelum membuka formulir, minta masa berlaku SIM lama. SIM yang habis sebelum hari layanan
   * tidak bisa diperpanjang (patokan sama dengan script kuota) → diarahkan ke SIM Baru di Versi A.
   */
  function cekSebelumDaftar(j, node, tombol) {
    var ada = $('.kj-cek', node);
    if (ada) { ada.remove(); tombol.setAttribute('aria-expanded', 'false'); return; }
    tombol.setAttribute('aria-expanded', 'true');
    var isian = h('input', { type: 'date', name: 'berlaku' });
    isian.value = ambil('berlaku_sim', '');
    var hasil = h('div', { 'aria-live': 'polite' });
    var lanjut = function () {
      var berlaku = isian.value;
      if (!berlaku) { hasil.replaceChildren(h('div', { class: 'hasil gagal' }, 'Isi tanggal masa berlaku SIM lama (tertera di kartu SIM).')); isian.focus(); return; }
      simpan('berlaku_sim', berlaku);
      if (berlaku < j.tanggal) {
        hasil.replaceChildren(h('div', { class: 'hasil awas' },
          h('h3', null, 'SIM tidak berlaku lagi pada hari layanan'),
          h('p', null, 'SIM lama berlaku sampai ' + tglPanjang(berlaku) + ', sedangkan layanan di ' + j.nama + ' pada ' + tglPanjang(j.tanggal) +
            '. SIM yang sudah lewat masa berlaku tidak bisa diperpanjang: daftarlah sebagai SIM Baru dan ikuti ujian teori & praktik.'),
          h('div', { class: 'baris-aksi' },
            h('a', { class: 'tombol kecil', href: lokasiVersi('A', '#jadwal') }, '🔄 Daftar SIM Baru'),
            h('a', { class: 'tombol kecil garis', href: lokasiVersi('A', '#teori') }, '📘 Latihan teori'))));
        return;
      }
      hasil.replaceChildren(h('div', { class: 'hasil ok' },
        h('p', null, '✅ SIM masih berlaku pada hari layanan (s/d ' + tglPanjang(berlaku) + '). Di formulir, pilih jenis permohonan ', h('b', null, 'Perpanjangan'), '.'),
        h('a', { class: 'tombol kecil', href: K.FORM_URL, target: '_blank', rel: 'noopener' }, '📝 Buka formulir pendaftaran')));
    };
    var kotak = h('div', { class: 'panel kj-cek' },
      h('p', null, h('b', null, 'Cek dulu masa berlaku SIM lama'), h('br'), h('small', { class: 'redup' }, 'Perpanjangan hanya untuk SIM yang masih berlaku pada hari layanan (' + tglPanjang(j.tanggal) + ').')),
      h('label', { class: 'isian' }, 'Berlaku sampai (lihat kartu SIM)', isian),
      h('button', { class: 'tombol kecil', type: 'button', onclick: lanjut }, 'Lanjut'),
      hasil);
    node.insertBefore(kotak, $('.kj-aksi', node));
    isian.focus();
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

  // jadwal tidak dimuat ulang selama kotak cek masa berlaku terbuka (isiannya akan hilang)
  setInterval(function () { if (!document.hidden && !$('.kj-cek')) muatJadwal(); }, 120000);

  // =========================================================================
  // 2. CEK SYARAT
  // =========================================================================
  var fs = $('#formSyarat');
  function nilaiRadio(form, nama) { var x = form.querySelector('input[name="' + nama + '"]:checked'); return x && x.value; }
  fs.addEventListener('change', function () { $('#isianBerlaku').hidden = nilaiRadio(fs, 'permohonan') !== 'perpanjangan'; });
  if (VERSI === 'B') { fs.querySelector('input[value="perpanjangan"]').checked = true; $('#isianBerlaku').hidden = false; }

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

    // patokan = hari layanan terdekat (sama dengan script kuota): SIM yang habis sebelum hari itu harus SIM Baru
    var jadiBaru = false;
    var habisKapan = 'Masa berlaku berakhir ' + tglPanjang(berlaku) + (acuan > kini ? ', sebelum hari layanan ' + tglPanjang(acuan) : '') + '. ';
    if (VERSI === 'B' && berlaku < acuan) {
      out.replaceChildren(h('div', { class: 'hasil awas' },
        h('h3', null, berlaku < kini ? 'SIM lama sudah lewat masa berlaku' : 'SIM lama habis sebelum hari layanan'),
        h('p', null, habisKapan + 'SIM yang sudah lewat masa berlaku tidak bisa diperpanjang dan harus diajukan sebagai SIM Baru (ikut ujian teori & praktik). Layanan ini khusus perpanjangan.'),
        h('div', { class: 'baris-aksi' }, h('a', { class: 'tombol kecil', href: lokasiVersi('A', '#syarat') }, '🔄 Buka layanan SIM Baru & Perpanjangan'))));
      return;
    }
    if (per === 'perpanjangan' && berlaku < acuan) {
      jadiBaru = true;
      blok.push(h('div', { class: 'hasil awas' },
        h('h3', null, berlaku < kini ? 'SIM lama sudah lewat masa berlaku' : 'SIM lama habis sebelum hari layanan'),
        h('p', null, habisKapan + 'SIM yang sudah lewat masa berlaku tidak bisa diperpanjang, jadi daftarlah sebagai SIM Baru (ikut ujian teori dan praktik).')));
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
    var jl = jadwalTerkini.filter(function (j) { return r.lokasi.toLowerCase().indexOf(j.nama.toLowerCase()) >= 0; })[0] || {};
    var kodeLok = jl.kode;
    var gol = /\bA\b/.test(r.sim) ? 'A' : 'C';
    // r.dialihkan / r.berlaku: dari API (PortalPublik.gs). API lama tidak mengirimnya → kartu tetap tampil seperti biasa.
    if (r.permohonan === 'SIM Baru' && r.dialihkan) {
      tahap.push(h('li', { class: 'gagal' }, h('b', null, 'Dialihkan ke SIM Baru'),
        h('small', null, 'Anda mendaftar Perpanjangan, tetapi SIM lama sudah habis sebelum hari layanan. SIM yang lewat masa berlaku tidak bisa diperpanjang, jadi Anda wajib ujian teori & praktik.')));
    }
    if (r.permohonan === 'Perpanjangan') {
      tahap.push(h('li', { class: 'selesai' }, h('b', null, 'Tanpa ujian teori & praktik'),
        h('small', null, (r.berlaku ? 'SIM lama berlaku s/d ' + r.berlaku + ' – masih berlaku pada hari layanan.' : 'SIM lama masih berlaku pada hari layanan.'))));
      tahap.push(h('li', { class: 'kini' }, h('b', null, 'Siapkan berkas'),
        h('small', null, 'KTP-el asli, SIM ' + gol + ' lama (asli), HP dengan nomor WhatsApp pendaftaran. PNBP resmi ' + rupiah(K.PNBP.perpanjangan[gol]) +
          ' dibayar di loket/BRIVA, ditambah tes kesehatan & psikologi di lokasi.')));
    }
    if (r.permohonan === 'SIM Baru') {
      var st = (r.statusTeori || '').toLowerCase();
      if (st === 'lulus') tahap.push(h('li', { class: 'selesai' }, h('b', null, 'Ujian teori: Lulus' + (r.nilaiTeori ? ' (nilai ' + r.nilaiTeori + ')' : '')), h('small', null, 'Bukti sudah dicek petugas.')));
      else if (st.indexOf('tidak') === 0) tahap.push(h('li', { class: 'gagal' }, h('b', null, 'Ujian teori: Tidak lulus' + (r.nilaiTeori ? ' (nilai ' + r.nilaiTeori + ')' : '')), h('small', null, 'Ikuti ujian ulang, lalu kirim lagi screenshot terbaru dengan nomor WhatsApp yang sama.')));
      else tahap.push(h('li', { class: 'kini' }, h('b', null, 'Ujian teori: menunggu bukti'), h('small', null, 'Kerjakan ujian teori via HP, lalu kirim screenshot hasilnya.'),
        kodeLok ? h('a', { class: 'tombol kecil garis', href: K.BUKTI_URL + encodeURIComponent(kodeLok) }, '📤 Kirim bukti teori') : null));
    }
    tahap.push(h('li', { class: 'kini' }, h('b', null, 'Datang ke lokasi'),
      h('small', null, r.lokasi + (jl.mulai ? ' · pukul ' + jl.mulai + '–' + (jl.selesai || '15:00') + ' WIB' : ''))));
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
  // =========================================================================
  // 5. USULKAN LOKASI
  // =========================================================================
  var fu = $('#formUsulan');
  if (fu) {
    fu.tanggal.min = tambahHari(hariIni(), 7);
    var aturPerkiraan = function () {
      var hanyaPerp = VERSI === 'B' || nilaiRadio(fu, 'layanan') === 'Perpanjangan saja';
      var l = fu.querySelector('[data-perkiraan-baru]');
      if (l) { l.style.display = hanyaPerp ? 'none' : ''; l.closest('.dua-kolom').classList.toggle('satu', hanyaPerp); }
    };
    var isianLain = $('#isianJenisLain');
    var aturJenisLain = function () {
      var lain = nilaiRadio(fu, 'jenis') === 'Lainnya';
      isianLain.style.display = lain ? '' : 'none';
      if (!lain) isianLain.classList.remove('salah');
    };
    fu.addEventListener('change', function (ev) {
      if (ev.target.name === 'layanan') aturPerkiraan();
      if (ev.target.name === 'jenis') { aturJenisLain(); if (ev.target.value === 'Lainnya') fu.jenisLain.focus(); }
      if (ev.target.name === 'setuju') ev.target.closest('.setuju').classList.remove('salah');
    });
    aturPerkiraan(); aturJenisLain();
    fu.wa.addEventListener('input', function () { this.value = this.value.replace(/[^\d+ -]/g, ''); });
    fu.addEventListener('input', function (ev) { var l = ev.target.closest('.isian'); if (l) { l.classList.remove('salah'); delete l.dataset.pesan; } });

    var pesanWa = function (d) {
      return 'Assalamualaikum/Salam sejahtera. Saya ingin mengusulkan SIM Komunitas.\n' +
        '• Layanan: ' + d.layanan + '\n' +
        '• Tempat: ' + d.jenis + (d.jenisLain ? ' (' + d.jenisLain + ')' : '') + ' – ' + d.nama + '\n• Kecamatan: ' + d.kecamatan + (d.alamat ? ' (' + d.alamat + ')' : '') + '\n' +
        '• Penanggung jawab: ' + d.pj + (d.jabatan ? ', ' + d.jabatan : '') + ' – ' + d.wa + '\n' +
        '• Perkiraan peserta: SIM Baru ' + d.baru + ', Perpanjangan ' + d.perpanjangan + '\n' +
        (d.tanggal ? '• Usulan tanggal: ' + tglPanjang(d.tanggal) + '\n' : '') + (d.catatanAsli ? '• Catatan: ' + d.catatanAsli + '\n' : '') +
        (d.nomor ? '• Nomor usulan: ' + d.nomor : '');
    };
    var tombolWa = function (d, label) {
      return h('a', { class: 'tombol kecil wa', target: '_blank', rel: 'noopener', href: 'https://wa.me/' + K.WA + '?text=' + encodeURIComponent(pesanWa(d)) }, label);
    };

    fu.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var out = $('#hasilUsulan');
      var d = { aksi: 'usulan', layanan: VERSI === 'B' ? 'Perpanjangan saja' : (nilaiRadio(fu, 'layanan') || 'SIM Baru & Perpanjangan'), jenis: nilaiRadio(fu, 'jenis'), nama: fu.nama.value.trim(), kecamatan: fu.kecamatan.value, alamat: fu.alamat.value.trim(),
        pj: fu.pj.value.trim(), jabatan: fu.jabatan.value.trim(), wa: fu.wa.value.replace(/\D/g, '').replace(/^62/, '0'),
        baru: Number(fu.baru.value) || 0, perpanjangan: Number(fu.perpanjangan.value) || 0, tanggal: fu.tanggal.value,
        catatan: fu.catatan.value.trim(), website: fu.website.value };
      d.jenisLain = d.jenis === 'Lainnya' ? fu.jenisLain.value.trim() : '';
      d.catatanAsli = d.catatan;
      // jenis "Lainnya": keterangannya ikut di Catatan (server hanya menerima jenis tempat baku)
      if (d.jenisLain) d.catatan = ('Jenis tempat: ' + d.jenisLain + (d.catatan ? '. ' + d.catatan : '')).slice(0, 500);
      var salah = null;
      var tandai = function (el, pesan) {
        var l = el.closest('.isian');
        if (l) { l.classList.add('salah'); l.dataset.pesan = pesan; }
        if (!salah) {
          salah = pesan; el.focus({ preventScroll: true });
          // gulir ke isian pertama yang salah (scrollIntoView tidak menggulir di sebagian browser karena kepala halaman menempel)
          window.scrollTo({ top: Math.max(0, (l || el).getBoundingClientRect().top + window.scrollY - window.innerHeight / 3), behavior: 'smooth' });
        }
      };
      if (d.jenis === 'Lainnya' && d.jenisLain.length < 3) tandai(fu.jenisLain, 'Sebutkan jenis tempatnya.');
      if (d.nama.length < 3) tandai(fu.nama, 'Isi nama tempat.');
      if (!d.kecamatan) tandai(fu.kecamatan, 'Pilih kecamatan.');
      if (d.pj.length < 3) tandai(fu.pj, 'Isi nama penanggung jawab.');
      if (!/^08\d{8,11}$/.test(d.wa)) tandai(fu.wa, 'Nomor WhatsApp belum benar (contoh 0812xxxxxxxx).');
      if (d.layanan === 'Perpanjangan saja') d.baru = 0;
      if (d.baru + d.perpanjangan < 1) tandai(d.layanan === 'Perpanjangan saja' ? fu.perpanjangan : fu.baru, 'Isi perkiraan jumlah peserta.');
      if (!salah && !fu.setuju.checked) { salah = 'Centang persetujuan untuk dihubungi petugas.'; fu.setuju.focus(); fu.setuju.closest('.setuju').classList.add('salah'); }
      if (salah) {
        var n = fu.querySelectorAll('.isian.salah').length;
        out.replaceChildren(h('div', { class: 'hasil gagal' }, n > 1 ? salah + ' Ada ' + n + ' isian bertanda merah yang perlu dilengkapi.' : salah));
        return;
      }

      var tombol = fu.querySelector('button[type=submit]');
      tombol.disabled = true; tombol.textContent = 'Mengirim…';
      var gagal = function (pesan) {
        out.replaceChildren(h('div', { class: 'hasil awas' }, h('h3', null, 'Usulan belum terkirim'),
          h('p', null, pesan || 'Server sedang tidak menjawab.') , h('p', null, 'Anda tetap bisa mengirimkannya lewat WhatsApp Satpas. Isian Anda sudah disiapkan:'),
          h('div', { class: 'baris-aksi' }, tombolWa(d, '💬 Kirim lewat WhatsApp'))));
      };
      var janji = K.API_URL
        ? fetch(K.API_URL, { method: 'POST', body: JSON.stringify(d), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit' })
            .then(function (r) { return r.text(); }).then(function (t) { return JSON.parse(t); })
        : Promise.reject(new Error('API belum diatur'));
      janji.then(function (r) {
        if (!r.ok) { gagal(r.pesan); return; }
        d.nomor = r.nomor;
        out.replaceChildren(h('div', { class: 'hasil ok' },
          h('h3', null, '✅ Usulan terkirim'),
          h('p', null, 'Nomor usulan: ', h('b', null, r.nomor), '. Simpan nomor ini.'),
          h('p', null, 'Petugas Satpas akan menghubungi ' + d.pj + ' lewat WhatsApp ' + d.wa + ' untuk mengatur jadwal. Jadwal yang disetujui akan tampil di halaman ini.'),
          h('div', { class: 'baris-aksi' }, tombolWa(d, '💬 Kabari petugas juga lewat WhatsApp'))));
        fu.reset(); fu.tanggal.min = tambahHari(hariIni(), 7); aturPerkiraan(); aturJenisLain();
      }).catch(function () { gagal(); })
        .finally(function () { tombol.disabled = false; tombol.textContent = '📍 Kirim usulan'; out.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    });
  }
  // =========================================================================
  // 6. PWA: pasang di HP, mode offline, pemberitahuan versi baru
  // =========================================================================
  var mandiri = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  var iOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var ajakan = null;
  var kartuPasang = $('#kartuPasang'), tombolAtas = $('#tombolPasangAtas');
  var ditunda = ambil('pasang_ditunda', 0) > Date.now();

  function tampilkanPasang(teks, labelTombol) {
    if (mandiri) return;
    tombolAtas.hidden = !ajakan;
    if (ditunda) return;
    if (teks) $('#pasangTeks').textContent = teks;
    if (labelTombol) $('#tombolPasang').textContent = labelTombol;
    kartuPasang.hidden = false;
  }
  function pasang() {
    if (ajakan) {
      ajakan.prompt();
      ajakan.userChoice.then(function (r) { if (r.outcome === 'accepted') { kartuPasang.hidden = true; tombolAtas.hidden = true; } ajakan = null; });
    } else if (iOS) {
      $('#pasangTeks').replaceChildren('Di iPhone/iPad (Safari): ketuk tombol ', h('b', null, 'Bagikan ⬆️'), ' di bawah layar → pilih ',
        h('b', null, 'Tambahkan ke Layar Utama'), ' → ', h('b', null, 'Tambah'), '.');
      $('#tombolPasang').hidden = true;
    }
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); ajakan = e;
    tampilkanPasang(null, '📲 Pasang aplikasi');
  });
  window.addEventListener('appinstalled', function () { kartuPasang.hidden = true; tombolAtas.hidden = true; ajakan = null; });
  if (iOS && !mandiri) tampilkanPasang('Pasang di layar utama iPhone agar bisa dibuka seperti aplikasi, termasuk saat sinyal lemah.', '📲 Cara memasang');
  $('#tombolPasang').addEventListener('click', pasang);
  tombolAtas.addEventListener('click', pasang);
  $('#tutupPasang').addEventListener('click', function () { kartuPasang.hidden = true; simpan('pasang_ditunda', Date.now() + 7 * 864e5); });

  // penanda offline
  function cekSinyal() { $('#bannerOffline').hidden = navigator.onLine !== false; }
  window.addEventListener('online', function () { cekSinyal(); muatJadwal(); });
  window.addEventListener('offline', cekSinyal);
  cekSinyal();

  // service worker + pemberitahuan versi baru
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      var beriTahu = function (w) {
        if (!w || !navigator.serviceWorker.controller) return;   // pemasangan pertama: tidak perlu pemberitahuan
        $('#toastVersi').hidden = false;
        $('#muatUlang').onclick = function () { w.postMessage('pakai-versi-baru'); };
      };
      if (reg.waiting) beriTahu(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var w = reg.installing;
        w.addEventListener('statechange', function () { if (w.state === 'installed') beriTahu(w); });
      });
      setInterval(function () { reg.update().catch(function () {}); }, 30 * 60 * 1000);
    }).catch(function () {});
    var sudahMuatUlang = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (!sudahMuatUlang) { sudahMuatUlang = true; location.reload(); } });
  }
  // =========================================================================
  // 7. RUNNING TEXT: kecepatan tetap (±22 px/detik) berapa pun lebar layar
  // =========================================================================
  function aturTicker() {
    document.querySelectorAll('.ticker-jalur').forEach(function (j) {
      var isi = j.querySelector('.ticker-isi'); if (!isi) return;
      j.style.animationDuration = Math.max(30, Math.round(isi.offsetWidth / 22)) + 's';
    });
  }
  aturTicker();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(aturTicker);
  window.addEventListener('resize', aturTicker);

  // =========================================================================
  // 8. POP-UP LATIHAN UJIAN PRAKTIK (format Buku Digital B.13, B.13.1, B.13.2)
  // =========================================================================
  var PRAKTIK = {
    C: {
      judul: 'Ujian praktik SIM C: sirkuit huruf S',
      catatan: 'Sejak Agustus 2023 lintasan angka 8 dan zig-zag diganti satu sirkuit tak terputus berbentuk huruf S (lampiran Kep/105/VIII/2023).',
      urutan: [
        ['Pengereman / keseimbangan', 'Laju ±30 km/jam, kurangi gas, rem depan + belakang bersamaan, berhenti sebelum garis STOP.'],
        ['Putar balik huruf U', 'Masuk dari sisi luar, gas tetap stabil, kaki tidak turun.'],
        ['Tikungan huruf S', 'Kecepatan rata, pandang ke tikungan berikutnya.'],
        ['Rem menghindar (cabang Y)', 'Rem di garis REM, lepas rem dulu, lalu menghindar sesuai isyarat petugas.']
      ],
      lulus: ['Tidak menyentuh satu pun patok/sensor elektronik.', 'Kaki tetap di pijakan (footstep) selama motor berjalan.',
        'Saat berhenti & akan jalan: turunkan kaki kiri dan tengok kanan belakang.', 'Menyelesaikan seluruh materi.'],
      salah: [
        ['Mengerem terlambat atau hanya rem depan, motor melewati garis STOP.', 'Kurangi gas sebelum garis, rem depan + belakang bersamaan.'],
        ['Terlalu pelan di putaran U sehingga kaki turun atau menyenggol patok.', 'Masuk dari sisi luar, pandang ke arah keluar putaran, gas stabil.'],
        ['Kecepatan naik-turun dan panik di tikungan S.', 'Pandang jauh ke tikungan berikutnya, jaga kecepatan rata.'],
        ['Berbelok sambil masih mengerem di cabang Y, motor oleng.', 'Rem tepat di garis REM, lepas rem, baru menghindar.']
      ],
      cek: 'Periksa rem, lampu, spion, ban, rantai, dan klakson, lalu pakai helm SNI.',
      video: 'https://www.youtube.com/watch?v=A37m6DrR4Xs', simulasi: 'b5-3-2',
      kuis: [
        [false, 'Saat putar balik huruf U, motor terlalu pelan sehingga kaki kanan turun menyentuh tanah.', 'Kaki harus tetap di pijakan (footstep) selama motor berjalan. Jaga gas tetap stabil.'],
        [true, 'Di garis STOP materi 1, motor berhenti tepat sebelum garis, kaki kiri turun, peserta menengok ke kanan belakang, lalu berjalan lagi.', 'Urutan ini sesuai ketentuan: berhenti sebelum garis, kaki kiri turun, tengok kanan belakang.'],
        [false, 'Di tikungan huruf S, spion menyenggol satu patok.', 'Peserta tidak boleh menyentuh satu pun patok atau sensor elektronik.'],
        [false, 'Saat pengereman materi 1, ban depan melewati garis STOP.', 'Motor harus berhenti sebelum garis. Kurangi gas lebih awal dan pakai rem depan + belakang bersamaan.'],
        [true, 'Di garis REM motor direm, rem dilepas, lalu peserta menghindar ke kanan sesuai isyarat petugas dan berhenti di garis STOP.', 'Itulah urutan materi 4 yang benar.'],
        [false, 'Petugas memberi isyarat ke kanan, tetapi peserta menghindar ke kiri.', 'Arah menghindar harus sesuai isyarat petugas.'],
        [false, 'Di cabang Y peserta masih menahan rem sambil berbelok, motor oleng dan kaki turun.', 'Lepas rem dulu, baru menghindar. Kaki tidak boleh turun saat motor berjalan.'],
        [true, 'Putar balik huruf U dilakukan pelan tetapi stabil, kaki tetap di pijakan, tidak menyentuh patok.', 'Tidak ada kesalahan pada materi ini, jadi lulus.'],
        [false, 'Setelah berhenti di garis STOP, peserta langsung berjalan tanpa menengok ke kanan belakang.', 'Saat berhenti dan akan berjalan, peserta wajib menurunkan kaki kiri dan menengok ke kanan belakang.'],
        [true, 'Kecepatan di huruf S sempat naik-turun, tetapi tidak menyentuh patok dan kaki tetap di pijakan.', 'Menurut ketentuan tetap lulus, namun kecepatan yang rata membuat tikungan lebih mudah.'],
        [false, 'Peserta ragu sebelum cabang Y, lalu berhenti di tengah lintasan dan menurunkan kaki.', 'Kaki turun saat materi masih berjalan termasuk kesalahan. Jaga laju sampai garis STOP.'],
        [false, 'Di lintasan lurus materi 1, peserta hanya melaju sekitar 15 km/jam lalu mengerem.', 'Materi pengereman meminta laju minimal ±30 km/jam sebelum berhenti di garis STOP.']
      ]
    },
    A: {
      judul: 'Ujian praktik SIM A: lima materi lapangan uji mobil',
      catatan: 'Lintasan 6–10 pada denah lapangan uji (Kep/105/VIII/2023 huruf A.3 & I).',
      urutan: [
        ['Maju–mundur di jalur sempit', 'Berhenti sebelum garis STOP; saat mundur lihat kaca spion, jangan menengok ke belakang.'],
        ['Slalom maju & mundur', 'Pelan dan rata melewati 9 patok.'],
        ['Parkir seri', 'Masuk 1× gerakan mundur, keluar 1× gerakan maju.'],
        ['Parkir paralel', 'Masuk 1× mundur + 1× maju, keluar 1× mundur + 1× maju.'],
        ['Tanjakan & turunan', 'Berhenti sebelum garis STOP, tarik rem tangan, netralkan, jalan lagi tanpa mundur.']
      ],
      lulus: ['Tidak menyentuh satu pun patok/sensor elektronik.', 'Saat mundur di jalur sempit, lihat melalui kaca spion, kepala tidak menengok ke belakang.',
        'Di tanjakan mobil tidak bergerak mundur dan tidak mati mesin.', 'Wajib memakai sabuk keselamatan sejak awal dan menyelesaikan seluruh materi.'],
      salah: [
        ['Menengok ke belakang saat mundur di jalur sempit.', 'Gunakan kaca spion kiri, kanan, dan tengah.'],
        ['Bumper menyenggol patok saat slalom.', 'Pelan dan rata; mulai belok sedikit lebih awal.'],
        ['Parkir seri berkali-kali maju-mundur.', 'Atur posisi sebelum mundur; masuk cukup 1× gerakan mundur.'],
        ['Mobil mundur atau mesin mati di tanjakan.', 'Tahan rem tangan, naikkan gas pelan, lepas rem tangan saat mobil mulai menarik.']
      ],
      cek: 'Periksa kemudi, rem tangan & kaki, transmisi, kopling, oli, spion, lampu, bahan bakar, ban, dan klakson, lalu pasang sabuk keselamatan.',
      video: 'https://www.youtube.com/watch?v=dETBScrOvhI', simulasi: 'b5-3-1',
      kuis: [
        [false, 'Saat mundur di jalur sempit, peserta menoleh ke belakang lewat jendela supaya lebih jelas.', 'Saat mundur, kepala tidak boleh menengok ke belakang. Lihat melalui kaca spion.'],
        [true, 'Peserta memasang sabuk keselamatan sebelum mesin dijalankan, lalu maju dan berhenti tepat sebelum garis STOP jalur sempit.', 'Sabuk wajib dipakai sejak awal dan berhenti sebelum garis STOP sesuai ketentuan.'],
        [false, 'Saat slalom, bumper belakang menyenggol patok ke-6 sampai bergeser.', 'Peserta tidak boleh menyentuh satu pun patok atau sensor.'],
        [true, 'Parkir seri: mobil masuk dengan satu gerakan mundur, lalu keluar dengan satu gerakan maju tanpa menyentuh patok.', 'Itulah ketentuan parkir seri: masuk 1× mundur, keluar 1× maju.'],
        [false, 'Parkir seri: peserta mundur, maju, lalu mundur lagi untuk meluruskan posisi mobil.', 'Masuk parkir seri cukup 1× gerakan mundur. Gerakan tambahan termasuk kesalahan.'],
        [true, 'Parkir paralel: masuk dengan 1× mundur dan 1× maju, keluar dengan 1× mundur dan 1× maju.', 'Urutan ini sesuai ketentuan parkir paralel.'],
        [false, 'Di tanjakan, setelah berhenti di garis STOP, mobil sempat mundur sedikit saat mulai berjalan.', 'Di tanjakan mobil tidak boleh bergerak mundur. Gunakan rem tangan saat mulai jalan.'],
        [false, 'Di tanjakan, mesin mati saat peserta mencoba berjalan lagi.', 'Mobil tidak boleh mati mesin saat jalan kembali di tanjakan.'],
        [true, 'Di tanjakan, peserta berhenti sebelum garis STOP, menarik rem tangan, menetralkan, lalu berjalan lagi tanpa mundur.', 'Itulah urutan materi tanjakan yang benar.'],
        [false, 'Peserta menyelesaikan empat materi dengan baik, tetapi tidak mengikuti materi tanjakan.', 'Seluruh materi wajib diselesaikan.']
      ]
    }
  };
  var pop = $('#popPraktik'), ppIsi = $('#ppIsi'), halPraktik = $('#praktikIsi'), golAktif = 'C', kuisP = null;

  function daftarNomor(arr) {
    return h('ol', { class: 'pp-urutan' }, arr.map(function (x) { return h('li', null, h('b', null, x[0]), h('small', null, x[1])); }));
  }
  /** Halaman menu Latihan Praktik: keterangan pendukung per golongan SIM. */
  function isiPraktik(gol) {
    golAktif = gol;
    document.querySelectorAll('#praktikTab button').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-gol') === gol)); });
    var d = PRAKTIK[gol];
    halPraktik.replaceChildren(
      h('div', { class: 'pp-intisari' }, h('b', { class: 'pp-label' }, '⚡ Intisari'), h('h3', null, d.judul), h('p', { class: 'kecil redup' }, d.catatan), daftarNomor(d.urutan)),
      h('div', { class: 'pp-dua' },
        h('div', { class: 'pp-kotak hijau' }, h('h4', null, '✅ Syarat lulus'), h('ul', null, d.lulus.map(function (x) { return h('li', null, x); }))),
        h('div', { class: 'pp-kotak' }, h('h4', null, '🔧 Sebelum ujian'), h('p', { class: 'kecil' }, d.cek),
          h('p', { class: 'kecil' }, 'Gagal? Ujian ulang paling banyak 2 kali dalam 14 hari kerja.'))),
      h('div', { class: 'pp-kotak merah' }, h('h4', null, '⚠️ Kesalahan yang sering membuat gagal'),
        h('ul', { class: 'pp-salah' }, d.salah.map(function (x) { return h('li', null, h('span', null, '✗ ' + x[0]), h('span', null, '✓ ' + x[1])); }))),
      h('div', { class: 'pp-ajak-kuis' },
        h('div', null, h('b', null, '🎯 Kuis: lulus atau gagal?'), h('p', { class: 'kecil' }, '8 kejadian acak di lapangan uji SIM ' + gol + '. Tebak peserta lulus atau gagal, lengkap dengan penjelasannya.'),
          ambil('praktik_' + gol, 0) ? h('p', { class: 'kecil redup' }, 'Skor terbaik Anda: ' + ambil('praktik_' + gol, 0) + ' / 8') : null),
        h('button', { type: 'button', class: 'tombol', onclick: function () { bukaKuisPraktik(); } }, '▶ Mulai kuis')),
      h('div', { class: 'pp-aksi' },
        h('a', { class: 'tombol kecil garis', href: d.video, target: '_blank', rel: 'noopener' }, '▶️ Video tutorial'),
        h('a', { class: 'tombol kecil garis', href: K.BUKU_URL + '#' + d.simulasi, target: '_blank', rel: 'noopener' }, '🎮 Simulasi lengkap di Buku Digital')));
  }
  function mulaiKuisPraktik() {
    kuisP = { soal: acak(PRAKTIK[golAktif].kuis).slice(0, 8), i: 0, skor: 0 };
    tanyaPraktik();
  }
  function tanyaPraktik() {
    var w = ppIsi, k = kuisP;
    if (k.i >= k.soal.length) {
      var kunci = 'praktik_' + golAktif, terbaikP = ambil(kunci, 0);
      if (k.skor > terbaikP) simpan(kunci, k.skor);
      w.replaceChildren(h('div', { class: 'pp-kuis pp-skor' }, h('div', { class: 'skor' }, k.skor + ' / ' + k.soal.length),
        h('p', null, k.skor >= 7 ? '🎉 Bagus! Anda sudah paham aturan lulus ujian praktik.' : '📚 Baca lagi syarat lulus dan kesalahan yang sering terjadi, lalu coba kembali.'),
        h('div', { class: 'pp-aksi' },
          h('button', { type: 'button', class: 'tombol kecil', onclick: mulaiKuisPraktik }, '↻ Ulangi kuis'),
          h('button', { type: 'button', class: 'tombol kecil garis', onclick: function () { pop.close(); isiPraktik(golAktif); } }, '📖 Kembali ke materi'))));
      return;
    }
    var s = k.soal[k.i], ket = h('div', { class: 'pp-ket' });
    var opsi = h('div', { class: 'pp-opsi' });
    [[true, '✅ Lulus'], [false, '❌ Gagal']].forEach(function (o) {
      opsi.appendChild(h('button', { type: 'button', onclick: function () {
        var benar = o[0] === s[0]; if (benar) k.skor++;
        opsi.querySelectorAll('button').forEach(function (b, i) { b.disabled = true; if ([true, false][i] === s[0]) b.classList.add('benar'); });
        if (!benar) this.classList.add('salah');
        ket.replaceChildren(h('p', null, h('b', null, benar ? '✅ Benar! ' : '❌ Kurang tepat. '), 'Jawabannya ', h('b', null, s[0] ? 'lulus' : 'gagal'), '. ' + s[2]),
          h('button', { type: 'button', class: 'tombol kecil', onclick: function () { k.i++; tanyaPraktik(); } }, k.i + 1 < k.soal.length ? 'Soal berikutnya →' : 'Lihat skor'));
        ket.querySelector('button').focus();
      } }, o[1]));
    });
    var bar = h('i'); bar.style.width = (k.i / k.soal.length * 100) + '%';
    w.replaceChildren(h('div', { class: 'pp-kuis' }, h('div', { class: 'progres' }, bar), h('p', { class: 'soal-no' }, 'Soal ' + (k.i + 1) + ' dari ' + k.soal.length),
      h('p', { class: 'soal-q' }, s[1]), opsi, ket));
  }
  function bukaKuisPraktik() {
    $('#ppJudul').textContent = 'Kuis Ujian Praktik SIM ' + golAktif;
    $('#ppSub').textContent = (golAktif === 'C' ? '🏍️ Motor · sirkuit huruf S' : '🚗 Mobil · 5 materi lapangan uji') + ' · lulus atau gagal?';
    mulaiKuisPraktik();
    if (pop.showModal) pop.showModal(); else pop.setAttribute('open', '');
    document.documentElement.classList.add('kunci-gulir');
  }
  pop.addEventListener('close', function () { document.documentElement.classList.remove('kunci-gulir'); });
  pop.addEventListener('click', function (e) { if (e.target === pop) pop.close(); });   // klik di luar kotak
  pop.querySelectorAll('[data-tutup-praktik]').forEach(function (b) { b.addEventListener('click', function () { pop.close(); }); });
  document.querySelectorAll('#praktikTab button').forEach(function (b) { b.addEventListener('click', function () { isiPraktik(b.getAttribute('data-gol')); }); });
  isiPraktik('C');
})();
