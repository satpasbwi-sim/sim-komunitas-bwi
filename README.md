# SIM Komunitas Banyuwangi — Portal Publik

Halaman web untuk masyarakat peserta **SIM Komunitas** Satlantas Polresta Banyuwangi.
Alamat setelah aktif: `https://satpasbwi-sim.github.io/sim-komunitas-bwi/`

## Fitur

| Fitur | Untuk masyarakat | Sumber data |
|---|---|---|
| **Jadwal & sisa kuota** | Lokasi, tanggal, hitung mundur, sisa kuota SIM Baru/Perpanjangan, tombol Daftar, *Ingatkan saya* (Google Kalender), Bagikan ke WhatsApp | Apps Script → sheet `SIM Baru` & `SIM Perpanjangan` (hanya angka) |
| **Cek syarat** | Cek usia minimal, deteksi SIM yang sudah lewat masa berlaku (diarahkan ke SIM Baru), daftar berkas yang bisa dicentang, tarif PNBP resmi, pengingat perpanjangan 30 hari sebelum habis | Dihitung di HP pengguna, tidak dikirim ke mana pun |
| **Cek status** | Masukkan NIK + tanggal lahir → terdaftar / masuk kuota / hasil ujian teori / lokasi | Apps Script, nama disamarkan, percobaan dibatasi |
| **Latihan teori** | 10 soal acak (Persepsi Bahaya, Wawasan, Pengetahuan) + penjelasan, nilai lulus 70, tombol ke simulasi E-AVIS lengkap | Bank soal **Buku Digital SIM** (`bukusimbwi/simulasi/soal-eavis.json`) |
| **Usulkan lokasi** | Pengurus pondok/kampus/sekolah/desa/instansi mengusulkan SIM Komunitas di tempatnya; dapat nomor usulan; cadangan lewat WhatsApp bila server tidak menjawab | Apps Script → sheet **`Usulan Lokasi`** (dibuat otomatis) |
| **Kirim bukti teori** | Tombol muncul otomatis H-1 dan hari H | Halaman `bukusimbwi/bukti/` yang sudah ada |
| Tanya jawab, WhatsApp Satpas, peringatan calo, mode gelap, bisa dipasang di layar HP | | |

## Dua versi portal

| Versi | Untuk | Link untuk dibagikan | Menu |
|---|---|---|---|
| **A – SIM Baru & Perpanjangan** | lokasi layanan lengkap | https://satpasbwi-sim.github.io/sim-komunitas-bwi/ | Jadwal · Cek Syarat · Cek Status · Latihan Teori · Latihan Praktik · Usul Lokasi · Tanya Jawab |
| **B – Khusus Perpanjangan** | lokasi perpanjangan saja | https://satpasbwi-sim.github.io/sim-komunitas-bwi/perpanjangan/ | Jadwal · Cek Syarat · Cek Status · Usul Lokasi · Tanya Jawab |

Satu kode, satu data. Versi dipilih dari alamat (`versi.js`): `?versi=perpanjangan` (atau folder `perpanjangan/`) = Versi B, selain itu Versi A.
Elemen berlabel `data-hanya="A"` / `data-hanya="B"` hanya tampil di versinya. Versi B: header hijau, kuota hanya Perpanjangan, Cek Syarat langsung ke perpanjangan (SIM kedaluwarsa diarahkan ke Versi A), tanpa Latihan Teori/Praktik, usulan otomatis "Perpanjangan saja", bisa dipasang sebagai aplikasi terpisah (`manifest-perpanjangan.webmanifest`).

Jenis layanan tiap lokasi diatur di sheet **Jadwal Layanan**, kolom **Layanan** (`SIM Baru & Perpanjangan` / `Perpanjangan saja`). Lokasi "Perpanjangan saja" tampil di kedua versi dengan label *Khusus Perpanjangan* dan hanya kuota Perpanjangan.

## Data pribadi

Repo ini **publik**, jadi isinya tidak boleh memuat data pendaftar.
NIK, nama, nomor HP, alamat, dan foto tetap berada di Google Sheets.
Portal hanya menerima angka kuota, dan untuk Cek Status hanya status satu orang yang NIK **dan** tanggal lahirnya cocok, dengan nama disamarkan (`Pu** Wu*******`).

## Cara memasang (sekali saja)

### 1. Aktifkan API (sekitar 3 menit, dengan akun satpasbwi@gmail.com)
1. Buka **https://script.new** → beri nama project `SIM Komunitas - API Portal Publik`.
2. Hapus isi `Code.gs`, lalu tempel seluruh isi [`apps-script/PortalPublik.gs`](apps-script/PortalPublik.gs) (tombol *Copy raw file* di GitHub) → **Simpan**.
3. Pilih fungsi **`ujiCoba`** → **Jalankan** → *Tinjau izin* → pilih akun → *Lanjutan* → *Buka (tidak aman)* → **Izinkan**. Izin yang diminta hanya **melihat** spreadsheet.
   Log harus menampilkan jadwal beserta angka kuota.
4. **Terapkan → Deployment baru** → ikon roda → **Aplikasi web**
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
   → **Terapkan** → salin **URL aplikasi web** (berakhiran `/exec`).
5. Cek kuota di bagian **`JADWAL`** dan samakan dengan project *Pemilahan & Kuota*. Setiap kali `JADWAL` diubah: **Terapkan → Kelola deployment → Edit → Versi baru**.

### 2. Sambungkan portal
Buka `config.js` dan isi `API_URL: 'https://script.google.com/macros/s/…/exec'`.
Sebelum diisi, portal tetap berjalan: jadwal tampil tanpa angka kuota, dan Cek Status mengarahkan ke WhatsApp.

### 3. Aktifkan GitHub Pages
Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch `main` / folder `/ (root)` → **Save**.

## Usulan lokasi
Usulan masuk ke sheet **Usulan Lokasi** (dibuat otomatis saat usulan pertama). Petugas mengisi kolom **Status** (Baru / Dihubungi / Dijadwalkan / Ditunda / Tidak bisa dilayani) dan **Tindak lanjut petugas**.
Pengaman: isian jebakan robot, maks. 30 usulan per 10 menit dan 3 usulan per nomor WhatsApp per 6 jam, isian yang diawali `= + - @` dinetralkan agar tidak menjadi rumus.

## Memperbarui script (setiap kali `PortalPublik.gs` berubah)
1. Buka project di script.google.com → ganti seluruh isi file dengan versi terbaru → **Simpan**.
2. Bila `appsscript.json` berubah (izin baru): **Setelan project** → centang *Tampilkan file manifes "appsscript.json"* → tempel isi terbaru → Simpan → jalankan `ujiCoba` → **Izinkan**.
3. **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan.** URL `/exec` tetap sama.

## Jadwal Layanan & persetujuan usulan (satu klik)
Sejak `apps-script/JadwalLayanan.gs` dipasang, **sheet "Jadwal Layanan" adalah sumber jadwal portal** — tidak perlu mengubah kode.

**Pemasangan (sekali):** di project *API Portal Publik* tambahkan file `JadwalLayanan.gs`, jalankan `pasangJadwalLayanan()` → Izinkan, lalu **Terapkan → Kelola deployment → ✏️ → Versi baru**.

**Menyetujui usulan:** sheet *Usulan Lokasi* → isi **Tanggal layanan (disetujui)** (jam, kuota, kode, link Maps opsional) → centang **Setujui ✔**. Otomatis:
1. baris baru di *Jadwal Layanan* dengan status **Segera dibuka** (tampil di portal dengan label BARU, tanpa tombol Daftar);
2. baris baru di sheet *Lokasi* (QR Kirim Bukti Teori);
3. status usulan → *Dijadwalkan*, catatan tindak lanjut, dan tautan **💬 Kirim WhatsApp** berisi pesan siap kirim ke penanggung jawab.

Bila ada yang kurang (misalnya tanggal belum diisi), centang dibatalkan dan alasannya tertulis di catatan sel.

**Membuka pendaftaran:** tambahkan lokasi ke Google Form (project Kuota Otomatis), lalu ubah **Status** di *Jadwal Layanan* menjadi **Buka**. Status lain: *Tutup* (tampil, pendaftaran ditutup) dan *Sembunyikan* (tidak tampil). Jadwal yang lewat jam selesainya otomatis "Selesai". Kolom *Teks cocok di formulir* harus sama dengan potongan teks pilihan lokasi di Google Form agar sisa kuota terhitung.

Portal berubah paling lambat ±1 menit setelah sheet diubah.

## Struktur
```
index.html            halaman
style.css             tampilan (terang/gelap)
app.js                logika (tanpa pustaka luar)
config.js             pengaturan: URL API, formulir, WhatsApp, jadwal cadangan, tarif
apps-script/          kode Apps Script untuk spreadsheet (tidak dijalankan oleh GitHub)
img/                  ikon & logo (dari Buku Digital)
```
