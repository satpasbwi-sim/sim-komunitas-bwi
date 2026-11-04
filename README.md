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
| **Kirim bukti teori** | Tombol muncul otomatis H-1 dan hari H | Halaman `bukusimbwi/bukti/` yang sudah ada |
| Tanya jawab, WhatsApp Satpas, peringatan calo, mode gelap, bisa dipasang di layar HP | | |

## Data pribadi

Repo ini **publik**, jadi isinya tidak boleh memuat data pendaftar.
NIK, nama, nomor HP, alamat, dan foto tetap berada di Google Sheets.
Portal hanya menerima angka kuota, dan untuk Cek Status hanya status satu orang yang NIK **dan** tanggal lahirnya cocok, dengan nama disamarkan (`Pu** Wu*******`).

## Cara memasang (sekali saja)

### 1. Aktifkan API (sekitar 3 menit, dengan akun satpasbwi@gmail.com)
1. Buka **https://script.new** → beri nama project .
2. Hapus isi , lalu tempel seluruh isi [](apps-script/PortalPublik.gs) (tombol *Copy raw file* di GitHub) → **Simpan**.
3. Pilih fungsi **** → **Jalankan** → *Tinjau izin* → pilih akun → *Lanjutan* → *Buka (tidak aman)* → **Izinkan**. Izin yang diminta hanya **melihat** spreadsheet.
   Log harus menampilkan jadwal beserta angka kuota.
4. **Terapkan → Deployment baru** → ikon roda → **Aplikasi web**
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
   → **Terapkan** → salin **URL aplikasi web** (berakhiran ).
5. Cek kuota di bagian **** dan samakan dengan project *Pemilahan & Kuota*. Setiap kali  diubah: **Terapkan → Kelola deployment → Edit → Versi baru**.

### 2. Sambungkan portal
Buka `config.js` dan isi `API_URL: 'https://script.google.com/macros/s/…/exec'`.
Sebelum diisi, portal tetap berjalan: jadwal tampil tanpa angka kuota, dan Cek Status mengarahkan ke WhatsApp.

### 3. Aktifkan GitHub Pages
Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch `main` / folder `/ (root)` → **Save**.

## Menambah jadwal baru
1. `apps-script/PortalPublik.gs` → tambah baris di `JADWAL`, lalu **Terapkan → Kelola deployment → Edit → Versi baru**.
2. `config.js` → tambah baris yang sama di `JADWAL_CADANGAN` (dipakai bila server tidak menjawab).

Lokasi yang sudah lewat jam selesainya otomatis ditandai **Selesai** dan dipindah ke bawah.

## Struktur
```
index.html            halaman
style.css             tampilan (terang/gelap)
app.js                logika (tanpa pustaka luar)
config.js             pengaturan: URL API, formulir, WhatsApp, jadwal cadangan, tarif
apps-script/          kode Apps Script untuk spreadsheet (tidak dijalankan oleh GitHub)
img/                  ikon & logo (dari Buku Digital)
```
