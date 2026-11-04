# Langkah yang Belum Dilaksanakan – SIM Komunitas

Dicatat 4 November 2026. Centang `[x]` bila sudah selesai.
Semua langkah Apps Script dikerjakan dengan akun **satpasbwi@gmail.com** di https://script.google.com.

---

## A. Malam ini (sebelum kegiatan UNIBA, Kamis 5 Nov)

- [ ] **1. Kuota SIM Baru UNIBA = 20 di project "SIM Komunitas - Kuota Otomatis (v2, 2 Nov 2026)"**
  - Buka https://script.google.com/d/1s5wmRwgbqSlLGhELCJ6iHXz5l56N00Cgdxmc0l11LgRMx2aPW7tPwqzI/edit
  - Ctrl+F `Kamis 5 November 2026', tanggal: [2026, 11, 5]` → tambahkan sebelum `}` di akhir baris: `, kuota: { 'Baru': 20 }`
  - Simpan → jalankan **`pasang`** (bukan hanya `cekKuota`).
  - Alasan: v2 masih memakai kuota 50; portal sudah menampilkan 20. Tanpa langkah ini peserta ke-21 dst. tetap tercatat "Masuk kuota".
- [ ] **2. Pastikan hanya satu project kuota yang aktif**
  - Buka project **SIM Komunitas - Pemilahan & Kuota (v1)** → ⏰ Pemicu.
  - Bila ada `saatAdaPendaftar` / `cekKuotaBerkala` dan yang dipakai adalah v2 → hapus pemicu di v1.
- [ ] **3. Saat hari H:** tampilkan sheet **Cetak SIM Baru / Cetak SIM Perpanjangan** lewat *Lihat → Sheet tersembunyi* bila sudah menjalankan `rapikanTab`.

## B. Setelah pendaftaran UNIBA ditutup

- [ ] **4. Pasang Jadwal Layanan "satu klik"** (project *SIM Komunitas - API Portal Publik*)
  1. Ganti isi `Code.gs` dengan [`apps-script/PortalPublik.gs`](../apps-script/PortalPublik.gs) terbaru (sudah termasuk perbaikan nomor WhatsApp berawalan 0).
  2. **+ → Skrip** → `JadwalLayanan` → tempel [`apps-script/JadwalLayanan.gs`](../apps-script/JadwalLayanan.gs) → Simpan.
  3. Jalankan **`pasangJadwalLayanan`** → Izinkan.
  4. **Terapkan → Kelola deployment** → pilih deployment berakhiran `…WR_yA/exec` → ✏️ Edit → **Versi baru** → Terapkan.
  5. Cek: sheet **Jadwal Layanan** muncul (UNIBA 20/40) dan kolom kuning + kotak **Setujui ✔** muncul di **Usulan Lokasi**.
- [ ] **5. Rapikan tab spreadsheet** (bila belum): tambahkan [`apps-script/RapikanTab.gs`](../apps-script/RapikanTab.gs) ke project yang sama → jalankan **`rapikanTab`**. Batalkan dengan `tampilkanSemuaTab`.

## C. Setelah kegiatan UNIBA selesai (mulai Jumat 6 Nov)

- [ ] **6. Langkah 4 – project Kuota Otomatis (v2) membaca sheet "Jadwal Layanan"**
  - Dikerjakan Claude: pilihan lokasi di Google Form & kuota ikut sheet Jadwal Layanan, sehingga lokasi yang disetujui langsung bisa dipilih di formulir (tanpa mengubah kode).
  - Petugas: tempel kode baru ke project v2 → jalankan fungsi pemasangan yang disebutkan → uji dengan satu usulan.
- [ ] **7. Hapus data uji** baris usulan "tes" (U261104-001) di sheet **Usulan Lokasi**.
- [ ] **8. Arsipkan deployment lama** API Portal (`…AKfycbzQ6zt8…uwcl/exec`) lewat *Terapkan → Kelola deployment → Arsipkan* agar tidak tertukar.

## D. Tertunda lainnya

- [ ] **9. Deployment baru "SIM Komunitas - Kirim Bukti Ujian Teori"** (percepatan kiriman, 1 Nov): *Terapkan → Kelola penerapan → ✏️ → Versi baru → Terapkan*. Pastikan pemicu `perbaruiRekapBerkala` (tiap 5 menit) ada di ⏰ Pemicu.
- [ ] **10. Periksa isi oleh petugas** sebelum disebarkan luas:
  - PDF **Ketentuan Peserta** (`unduhan/Ketentuan-Peserta-SIM-Komunitas-Banyuwangi.pdf`) – rujukan pasal Perpol 5/2021 jo. Perpol 2/2023 diambil dari Buku Digital, belum dicocokkan dengan naskah resmi.
  - **Kuis SIM A** di pop-up Latihan Ujian Praktik (disusun dari ketentuan Kep/105/VIII/2023 di Buku Digital).
  - Agar Claude bisa mencocokkan naskah resmi: tambahkan `peraturan.bpk.go.id` dan `sippn.menpan.go.id` di *Allowed domains* environment.
- [ ] **11. Gambar cover** masih bertuliskan "SATLANTAS POLRESTA BANYUWANGI" pada spanduk kartun. Kirim versi bertuliskan "Satpas" bila ingin diganti.
- [ ] **12. Uji tombol "📲 Pasang"** (PWA) di HP Android (Chrome) dan iPhone (Safari → Bagikan → Tambahkan ke Layar Utama).
- [ ] **13. (Opsional) Formulir pendaftaran langsung di portal** (Cara A): kirim *link isian otomatis* Google Form dan beri tahu apakah pertanyaan foto KTP wajib.
- [ ] **14. (Opsional) Inovasi berikutnya:** tiket QR pendaftar, info antrean hari H, angka capaian terbuka, daftar pengingat WhatsApp H-1.
- [ ] **15. (Opsional) Tautkan portal dari Buku Digital** halaman B.19 SIM Komunitas (perlu izin tulis repo `bukusimbwi`).

---

### Alamat penting
| Apa | Alamat |
|---|---|
| Portal | https://satpasbwi-sim.github.io/sim-komunitas-bwi/ |
| Repo | https://github.com/satpasbwi-sim/sim-komunitas-bwi |
| API Portal (dipakai) | https://script.google.com/macros/s/AKfycbzoHAKZwTeuKGKZldMFGv7_oPKrsh5x3MYk1weTZOOeBZZOQz5cuybgQ1bulJ8URWR_yA/exec |
| Spreadsheet | https://docs.google.com/spreadsheets/d/1Gkn-UoX98ITUTdN2qMWVImjX_o7vxKCLS9xVibcEo0g/edit |
| Project kuota v2 | https://script.google.com/d/1s5wmRwgbqSlLGhELCJ6iHXz5l56N00Cgdxmc0l11LgRMx2aPW7tPwqzI/edit |
