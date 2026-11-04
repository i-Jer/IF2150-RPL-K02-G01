<h1>
IF2150 REKAYASA PERANGKAT LUNAK
<br>
TUGAS 9
<br>
IMPLEMENTASI PERANGKAT LUNAK
</h1>
<br>

## *SeaGuard*
<p align="center">
<img alt="Logo SeaGuard" src="./assets/logo-seaguard.png" width="45%">
</p>

### Untuk: *Aurelia Jennifer Gunawan*

Dipersiapkan oleh:
| Informasi | Keterangan |
| --- | --- |
| Kelas | *K02* |
| Kelompok | *G01 (Swike Karang Anyar)* |

| NIM | Nama |
|---|---|
| *13525104* | *Jeremy Gerald Sutanto* |
| *13525116* | *Christian Immanuel* |
| *13525014* | *Denzel Santoso* |
| *13525011* | *Raihan* |
| *13525125* | *Peter Emmanuel Suwardy* |
---

**Deadline:** Rabu, 11 November 2026, 21.50 WIB  
**Tag pengumpulan:** `v9.0` pada branch `main` repository public kelompok.  
**Kode sumber dan README:** [`src/`](../../src) dan [`src/README.md`](../../src/README.md)

---

# Ringkasan Implementasi

SeaGuard diimplementasikan sebagai **aplikasi web client-server** dengan pola **MVC** sesuai DPPL. Seluruh **8 use case (UC01–UC08)** pada SKPL diimplementasikan, bersama **21 kebutuhan fungsional** dan kebutuhan non-fungsional yang dapat diuji (Tabel R.2). Aplikasi dapat dijalankan dengan dua perintah (`npm install`, `npm start`) dan dilengkapi data demo fiktif serta akun uji pada README.

```mermaid
flowchart LR
  subgraph Browser["Browser (VIEW) - public/js/views"]
    V1[PelaporanView C11]:::v --- V2[HeatmapView C12]:::v --- V3[DashboardVerifikasiView C13]:::v
    V4[PembersihanView C14]:::v --- V5[LeaderboardView C15]:::v --- V6[PanelAdminView C16]:::v
  end
  subgraph Server["Server Node.js + Express"]
    R[routes/api.js] --> C[Controller C17-C23]:::c
    C -->|cek sesi & peran| A[Autentikasi C25]
    C --> M[Model C01-C10]:::m
    C --> N[Notifikasi C24 - SSE]
    C --> S[StorageAdapter C26]
  end
  Browser -- "fetch /api (JSON / multipart)" --> R
  N -. "notifikasi real-time" .-> Browser
  M --> DB[(SQLite)]
  S --> F[(uploads/)]
  classDef v fill:#d7eef3,stroke:#1fa3b8; classDef c fill:#fff3d6,stroke:#f39c34; classDef m fill:#e3f5ea,stroke:#3aa76d;
```

Tabel R.1. Status implementasi use case

| Use Case | Status | Kelas utama | Bukti pengujian otomatis |
| :--- | :--- | :--- | :--- |
| UC01 Melaporkan Titik Pencemaran | Selesai | C11, C17, C01, C02, C26 | `alur-utama.test.js` (normal + alt: format/ukuran foto tidak valid) |
| UC02 Melihat Data dan Heatmap | Selesai | C12, C18, C10, C01 | filter kategori, hasil kosong, lokasi tidak ditemukan |
| UC03 Memverifikasi Laporan Pencemaran | Selesai | C13, C19, C06, C24 | keputusan, log audit, notifikasi, keputusan ganda ditolak |
| UC04 Mengklaim Titik Pencemaran | Selesai | C12, C20, C03 | klaim normal, titik sudah diklaim, **klaim paralel (race)** |
| UC05 Melaporkan Hasil Pembersihan | Selesai | C14, C21, C04, C05, C26 | geofencing di dalam/luar radius |
| UC06 Memverifikasi Hasil Pembersihan | Selesai | C13, C19, C04, C05, C07 | poin bertambah, leaderboard, log audit |
| UC07 Melihat Leaderboard | Selesai | C15, C22, C07 | posisi & total poin sesuai |
| UC08 Mengelola Akun dan Komunitas | Selesai | C16, C23, C08, C09 | ubah peran, tangguhkan, validasi, komunitas |

Tabel R.2. Cakupan kebutuhan fungsional dan non-fungsional

| Kebutuhan | Realisasi pada implementasi |
| :--- | :--- |
| KF01–KF05 | Form pelaporan (I-01), Geolocation API, validasi JPG/PNG ≤ 5 MB (+ pemeriksaan *magic bytes*), ekstraksi EXIF, dialog consent I-02 |
| KF06–KF08 | Heatmap Leaflet berwarna per kategori + legenda, filter kategori/area, heat intensity per klaster (Algo-002) |
| KF09–KF11 | Antrean verifikasi, setujui/tolak, notifikasi in-app real-time (SSE) |
| KF12 | Klaim titik dengan locking |
| KF13–KF16 | Form pembersihan, geofencing 100 m, foto before–after berdampingan, setujui/tolak |
| KF17 | Log audit `log_verifikasi` |
| KF18–KF19 | Posisi + total poin; peringkat dihitung ulang otomatis setelah persetujuan |
| KF20–KF21 | Panel admin: peran, penangguhan, data komunitas |
| KNF01 | `StorageAdapter.unggahFoto` retry otomatis maks. 3 kali (diuji) |
| KNF02 | Tabel `consent_log` mencatat persetujuan/penolakan |
| KNF03 | Heatmap 10.000 titik ≈ 15–45 ms (batas 3 detik), lihat B.2.1 |
| KNF04 | Notifikasi SSE diterima < 5 detik (diuji) |
| KNF05 | Transaksi `IMMEDIATE` + unique index parsial; diuji dengan 4 klaim paralel → tepat 1 berhasil |
| KNF06 | Geofencing 100 m dengan toleransi 10 m (diuji) |
| KNF07 | Trigger SQLite menolak `UPDATE`/`DELETE` pada `log_verifikasi` (diuji) |
| KNF08 | Peringkat dihitung ulang sinkron dalam transaksi persetujuan (< 1 detik) |
| KNF09 | 5 kali gagal login → akun terkunci 15 menit (diuji) |
| KNF10 | Legenda warna + tooltip, label kontras, navigasi sederhana per peran |
| KNF11, KNF12 | Tidak diukur pada tahap ini (lihat B.3); UI memakai fitur browser standar (ES modules, Fetch, EventSource) |

---

# BAGIAN B: Laporan Implementasi

## B.1 Perubahan dari DPPL

Tabel B.1. Perubahan dari DPPL

| No | Bagian DPPL | Rancangan Awal | Implementasi Akhir | Alasan |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Subbab 2.1 DBMS | PostgreSQL v15 + PostGIS | **SQLite** (`better-sqlite3`), skema pada `src/db/schema.sql` | Ketentuan Tugas 9 menyarankan basis data lokal agar asisten dapat menjalankan ulang tanpa Docker/server terpisah. Seluruh fungsi PostGIS diganti implementasi aplikasi (baris 2–4). |
| 2 | Q-004, Q-006 (`ST_Distance`, `ST_DWithin`, `ST_GeogFromText`) | Query PostGIS | Fungsi `haversine`/`jarakWKT` di `src/utils/geo.js`; koordinat tetap disimpan sebagai WKT `POINT(lon lat)` | SQLite tidak punya PostGIS. Akurasi haversine (bola) cukup untuk radius 100 m (selisih ≪ toleransi 10 m KNF06). |
| 3 | Q-001 (`ST_ClusterDBSCAN`, Algo-002) | Pengelompokan di dalam query | `clusterGrid` (spatial hash grid + union-find) di `src/utils/cluster.js`, setara DBSCAN `eps=radius, minpoints=1`; hasil disimpan ke tabel `peta_heatmap` | Pengganti PostGIS. Versi awal O(n²) dioptimasi berdasarkan profiling (B.2.1); kesetaraan hasil diuji (`geo-cluster.test.js`). |
| 4 | Q-002 `SELECT … FOR UPDATE` (Algo-003) | Penguncian baris | Transaksi `BEGIN IMMEDIATE` (kunci tulis) + **unique index parsial** `ux_klaim_laporan_hidup` | SQLite tidak mendukung `FOR UPDATE`; kunci tulis memberi serialisasi yang sama, unique index menjadi lapis pengaman kedua (KNF05). |
| 5 | Subbab 2.1 Filing System, C26 | Cloud Object Storage (S3/GCS) | Folder lokal `uploads/` di balik `StorageAdapter.unggahFoto()` | Tanpa akun cloud agar mudah dijalankan; antarmuka tetap `unggahFoto(foto): URL` sehingga mudah diganti. Retry 3× (KNF01) tetap ada. |
| 6 | `PetaHeatmap.cariLokasi()` (layanan peta pihak ketiga) | Pencarian ke layanan peta | **Gazetteer lokal** 26 lokasi pesisir (`src/utils/gazetteer.js`); mengembalikan `{wkt, nama}` atau `null` | Menghindari API key/akun pribadi (A.3). Ubin peta dasar tetap dari OpenStreetMap. |
| 7 | Status `LaporanPencemaran` | Menunggu Verifikasi, Disetujui, Ditolak, Diklaim | Ditambah status **Dibersihkan**; heatmap menampilkan laporan berstatus *Disetujui* **dan** *Diklaim* (Q-001 DPPL hanya *Disetujui*) | Titik yang sedang diklaim harus tetap terlihat; titik yang sudah dibersihkan harus hilang dari heatmap. |
| 8 | Status `KlaimTitikPencemaran` | Aktif, Menunggu Verifikasi | Ditambah **Selesai** dan **Dibatalkan**. Pembersihan ditolak → klaim kembali **Aktif** agar dapat diajukan ulang | Melengkapi siklus hidup klaim yang belum dirinci DPPL. |
| 9 | Algo-004 geofencing | `jarak ≤ 100 m` | `jarak ≤ 100 m + 10 m toleransi` (110 m); koordinat **EXIF foto diutamakan**, bila tidak ada dipakai GPS browser | Memenuhi KNF06 (toleransi maks. 10 m) dan KF14 ("koordinat GPS pada foto"). |
| 10 | C08 `ajukanKlaimTitik` / `getKoordinatAcuan` | Tidak membatasi jumlah klaim | Satu Relawan hanya boleh memiliki **satu klaim aktif** (unique index `ux_klaim_relawan_hidup`) | `getKoordinatAcuan(idRelawan)` pada DPPL mengembalikan satu titik acuan, sehingga aturan satu klaim aktif diterapkan. |
| 11 | Operasi Controller (mis. `validasiBukti(): Boolean`, `ambilDataHeatmap(): void`) | Controller memanggil `View.tampilkan…()` langsung | Controller **mengembalikan objek hasil** `{ok, status, pesan, data}`; View yang memanggil API lalu menampilkan hasil | Pada web, View berjalan di browser dan Controller di server (HTTP request/response). Alur View → Controller → Model tetap sama. |
| 12 | Atribut View `idSesi` (C11–C16) | Menyimpan id sesi | Diisi **id pengguna** (penanda); token sesi disimpan di cookie `HttpOnly` | Mencegah pencurian token sesi lewat JavaScript (XSS). |
| 13 | C25 Autentikasi (`jumlahGagalLogin`, `waktuKunci`, `idSesi`) | Atribut kelas | Kolom `jumlah_gagal_login`, `waktu_kunci` pada `akun_relawan` dan tabel `sesi`; ditambah operasi `login`, `logout`, `catatConsent`, `sudahConsent` | DPPL hanya merinci `cekSesiDanPeran()`, padahal KNF09 dan KF05/KNF02 memerlukan login dan consent log. |
| 14 | Antarmuka | I-01 s.d. I-08 | Ditambah **layar Login** (`LoginView`) | Autentikasi (C25) membutuhkan layar masuk yang tidak dirancang pada DPPL. |
| 15 | `PetaHeatmap.tampilkanHeatmap(): String` | Mengembalikan String | Mengembalikan **objek JSON** `{titik, klaster}` | Langsung dirender Leaflet; dikirim sebagai JSON. |
| 16 | `Notifikasi.kirimNotifikasi()` (real-time) | Tidak menyebut teknologi | **Server-Sent Events** (`GET /api/notifikasi/stream`) + simpan ke tabel `notifikasi` | Satu arah server → klien, tanpa library tambahan; notifikasi tetap tersimpan bila tab ditutup. |
| 17 | C08 `tambahSkorPoin` (Algo-007) | `poin = ROUND(heatIntensity)` | `poin = max(1, ROUND(heatIntensity))`; klaster dihitung ulang sebelum poin diberikan | Menjamin poin minimal 1 dan nilai klaster selalu mutakhir. |
| 18 | Operasi tambahan (tidak ada di DPPL) | – | `LaporanPencemaran.setStatusDibersihkan`, `KlaimTitikPencemaran.getKlaimHidup`, `AkunRelawan.aktifkanAkun`/`perbaruiDataAkun`, `Leaderboard.getTglPembaruan` | Kebutuhan alur lengkap (pemulihan akun yang ditangguhkan, edit nama/email I08-04, penanda waktu leaderboard). |
| 19 | `BuktiLaporan.validasiFormatUkuran` (Algo-001) | Cek tipe + ukuran | Ditambah pemeriksaan **magic bytes** JPEG/PNG | Menolak berkas yang hanya menyamar sebagai gambar (keamanan). |

*Seluruh 26 kelas perancangan tetap diimplementasikan; tidak ada kelas yang dihapus, digabung, atau dipecah (lihat B.5).*

## B.2 Bukti Penerapan Best Practices

<!-- ⚠ Ganti <USERNAME> dengan akun GitHub pemilik repo fork sebelum dikumpulkan. -->

Tabel B.2. Bukti Best Practices

| Praktik | Bukti | Keterangan |
| :--- | :--- | :--- |
| Branching | [Daftar branch](https://github.com/<USERNAME>/IF2150-RPL-K02-G01/branches) • [Network graph](https://github.com/<USERNAME>/IF2150-RPL-K02-G01/network) | Skema **feature branch** `<tipe>/<nama-fitur>` (mis. `feat/uc01-pelaporan`, `feat/uc02-heatmap`, `fix/geofencing-toleransi`, `refactor/cluster-grid`) → digabung ke `main` lewat Pull Request. `main` dijaga agar tetap dapat menerima sync asisten (sesuai README repo). |
| Semantic commit | [Riwayat commit](https://github.com/<USERNAME>/IF2150-RPL-K02-G01/commits/main) | Format `<tipe>(<scope>): <deskripsi>`. Contoh: `feat(klaim): tambah locking klaim titik dengan transaksi immediate`, `fix(auth): reset hitungan gagal login setelah kunci berakhir`, `refactor(heatmap): ganti clustering O(n^2) dengan spatial grid`, `test(klaim): tambah uji klaim paralel`, `docs(readme): tambah akun uji`. |
| Track tasks | [Issues](https://github.com/<USERNAME>/IF2150-RPL-K02-G01/issues) • [Project board](https://github.com/<USERNAME>/IF2150-RPL-K02-G01/projects) | 1 issue per fitur/use case + issue test/profiling/dokumen, template `[FEAT] …` dengan *Summary* dan *Acceptance Criteria*, label `enhancement`/`bug`/`documentation` dan `priority`, ditugaskan ke penanggung jawab modul (README bagian 6). PR menautkan issue (`Closes #n`). |
| Pull request dan review | [PR #…](https://github.com/<USERNAME>/IF2150-RPL-K02-G01/pulls?q=is%3Apr) *(tautkan 2–3 PR representatif)* | Template PR (`.github/PULL_REQUEST_TEMPLATE.md`) memuat deskripsi, tangkapan layar/hasil test, dan checklist. Setiap PR di-review minimal 1 anggota lain (rotasi: Jeremy→Christian→Denzel→Raihan→Peter→Jeremy). |
| Pengujian | [`src/tests/`](../../src/tests) • hasil: [`assets/profiling/hasil-test.txt`](./assets/profiling/hasil-test.txt) | **21 pengujian otomatis, 21 lulus** (`npm test`): unit (geo, klaster, validasi foto, geofencing, rumus heat, log immutable, autentikasi, retry storage), integrasi HTTP (alur UC01→UC07, otorisasi 401/403, kasus alternatif, admin, keamanan, SSE < 5 detik) dan **uji race condition** 4 klaim paralel. |

Tabel B.2.a. Daftar pengujian otomatis (ringkas)

| Tingkat | Yang diuji | Berkas |
| :--- | :--- | :--- |
| Unit | `parseWKT`/`haversine`; `clusterGrid` ≡ `clusterNaive` (600 titik acak); input kosong | `tests/unit/geo-cluster.test.js` |
| Unit | Algo-001 (JPG/PNG, batas tepat 5 MB, GIF, berkas menyamar); Algo-004 (55 m lolos, 118/155 m ditolak); Algo-002 (rumus heat); KNF07 log immutable; KNF05 klaim ganda; KNF09 penguncian; Algo-005 peran/sesi/penangguhan; KNF01 retry | `tests/unit/models.test.js` |
| Integrasi | Alur lengkap UC01→UC03→UC04→UC05→UC06→UC07; 401/403; UC02 filter/kosong/cari; UC08; path traversal & header keamanan; SSE real-time | `tests/integration/alur-utama.test.js` |
| Konkurensi | 4 Relawan mengklaim titik yang sama bersamaan → tepat 1 sukses | `tests/integration/klaim-race.test.js` |

### B.2.1 Profiling dan Optimasi

| Informasi | Keterangan |
| :--- | :--- |
| Fitur / proses yang diprofil | **Perhitungan heatmap** (`PetaHeatmap.hitungHeatIntensity`, Algo-002; dipanggil `GET /api/heatmap`). Fitur terberat karena membandingkan jarak antar titik laporan; KNF03 mensyaratkan 10.000 titik ≤ 3 detik. |
| Alat | `node --cpu-prof` (profil CPU V8) + skrip benchmark `src/tests/profiling/heatmap-benchmark.js` (`npm run profile`) berbasis `process.hrtime`. Data uji: 10.000 titik sintetis deterministik di 6 wilayah, radius klaster 500 m. Lingkungan: Linux, Node v22.23.4. |
| Temuan (sebelum) | Pengelompokan versi awal `clusterNaive` membandingkan **semua pasangan titik (O(n²))**. 10.000 titik ≈ **1.35–1.52 detik**, 5.000 titik ≈ 0,36–0,38 detik (waktu naik ≈ 4× bila data 2×). Profil CPU 10.000 titik: `haversine` **66,3%** dan `clusterNaive` **28,7%** dari waktu — lebih dari 95% waktu habis pada perbandingan pasangan. Walau masih di bawah 3 detik, margin hanya ±2× dan akan melanggar KNF03 pada perangkat lebih lambat atau data lebih besar (ekstrapolasi kuadratik: 20.000 titik ≈ 5–6 detik). |
| Perbaikan | `clusterGrid` (`src/utils/cluster.js`): **spatial hash grid** — titik dikelompokkan ke sel berukuran radius klaster sehingga hanya sel bertetangga yang dibandingkan (≈ O(n)), digabung dengan union-find. Hasil dijaga identik: uji `clusterGrid ≡ clusterNaive` dan jumlah klaster sama (7.146) pada 10.000 titik. Versi lama dipertahankan hanya untuk benchmark/uji. |
| Hasil (sesudah) | 10.000 titik: **≈ 13–45 ms** (≈ 90–110× lebih cepat); pipeline penuh `hitungHeatIntensity` (klaster + agregasi + simpan `peta_heatmap`) **≈ 32–43 ms** vs batas 3.000 ms → KNF03 terpenuhi dengan margin > 70×. |

Tabel B.2.1. Perbandingan waktu pengelompokan (diambil dari `assets/profiling/hasil-benchmark.md`)

| Jumlah titik | Sebelum: `clusterNaive` (ms) | Sesudah: `clusterGrid` (ms) | Percepatan | Klaster |
| ---: | ---: | ---: | ---: | ---: |
| 1.000 | 15.7 | 3.6 | 4× | 966 |
| 5.000 | 377.5 | 14.5 | 26× | 4.272 |
| 10.000 | 1.410.9 | 15.1 | 93× | 7.146 |

*Angka bergantung pada mesin dan bervariasi antar-run; jalankan `npm run profile` di laptop kelompok dan tempelkan tangkapan layar di sini bila diperlukan.*

## B.3 Kendala dan Catatan Penting

**Kendala yang dihadapi**
1. **Perbedaan lingkungan rancangan vs implementasi:** PostgreSQL/PostGIS dan Cloud Storage pada DPPL tidak praktis dijalankan ulang oleh asisten; diganti SQLite dan penyimpanan lokal, dengan fungsi geospasial ditulis ulang dan diuji (B.1 no. 1–5).
2. **Race condition klaim (KNF05):** SQLite tidak punya `FOR UPDATE`; diselesaikan dengan transaksi `IMMEDIATE` dan unique index parsial, lalu dibuktikan dengan uji klaim paralel.
3. **Performa heatmap:** versi awal O(n²) hampir menyentuh batas KNF03; dioptimasi (B.2.1).
4. **Konsistensi siklus status** (laporan, klaim, pembersihan) lintas empat tabel; ditangani dalam satu transaksi pada `VerifikasiController` dan diuji end-to-end.

**Known issues / batasan**
1. Antarmuka belum diuji menyeluruh pada seluruh browser dan perangkat (KNF12); ubin peta dasar OpenStreetMap membutuhkan internet. Tanpa internet heatmap dan klaster tetap tampil di atas latar kosong.
2. Geolokasi browser memerlukan `localhost` atau HTTPS; bila ditolak, koordinat dapat diisi manual.
3. Tidak ada pendaftaran akun mandiri karena tidak ada di SKPL; akun dibuat lewat data demo dan dikelola Admin (UC08).
4. Penguncian akun bersifat per akun (KNF09). Belum ada pembatasan laju per IP sehingga pihak lain dapat sengaja mengunci akun orang lain.
5. URL foto (`/uploads/…`) bersifat publik namun nama berkasnya acak; belum ada kontrol akses per foto. Cookie sesi belum memakai atribut `Secure` (mode HTTP lokal).
6. Heatmap dihitung ulang pada setiap permintaan (tanpa cache); memadai untuk puluhan ribu titik, perlu *caching* bila lebih besar.
7. Pengukuran KNF11 (uptime 99%) tidak dapat dilakukan pada tahap lokal.
8. Foto yatim (laporan gagal setelah foto terunggah) belum dibersihkan otomatis.

**Catatan untuk asisten**
1. Jalankan `cd src && npm install && npm start`, lalu buka `http://localhost:3000`. Data demo dimuat otomatis; untuk mengulang, hapus `src/data/seaguard.db*`.
2. Akun uji lengkap ada pada `src/README.md` bagian 5 (Relawan: `relawan1@seaguard.test` / `Relawan123!`; Verifikator/Admin: `verifikator@seaguard.test` / `Verifikator123!`).
3. Untuk mencoba **geofencing** tanpa lokasi nyata, isi koordinat foto sebelum/sesudah dengan jarak ≤ 100 m dari titik klaim (ditampilkan pada layar I-04); koordinat di luar itu akan ditolak. Foto dengan GPS EXIF akan memakai koordinat EXIF.
4. Antrean verifikasi sudah berisi 5 laporan menunggu dan 1 pengajuan pembersihan (milik `relawan2`) agar UC03 dan UC06 dapat langsung dicoba.
5. `npm test` menjalankan 21 pengujian (±5 detik); `npm run profile` mengulang profiling B.2.1.

## B.4 Kontribusi Anggota

<!-- ⚠ Persentase di bawah adalah usulan awal berbasis pembagian modul. Sesuaikan dengan kontribusi sebenarnya (git shortlog -sn --no-merges, jumlah PR/review/issue) sebelum dikumpulkan. -->

Tabel B.4. Kontribusi Anggota

| NIM | Nama | Modul / Fitur yang Dikerjakan | Persentase Kontribusi |
| :--- | :--- | :--- | :--- |
| *13525104* | *Jeremy Gerald Sutanto* | UC02 Heatmap & UC04 Klaim: `PetaHeatmap`, `KlaimTitikPencemaran`, `HeatmapView`, `HeatmapController`, `KlaimController`; profiling & optimasi clustering | *20%* |
| *13525116* | *Christian Immanuel* | UC01 Pelaporan: `LaporanPencemaran`, `BuktiLaporan`, `PelaporanView`, `PelaporanController`, `StorageAdapter`; dialog consent | *20%* |
| *13525014* | *Denzel Santoso* | UC03 & UC06 Verifikasi: `VerifikasiController`, `DashboardVerifikasiView`, `LogVerifikasi`, `Notifikasi` (SSE) | *20%* |
| *13525011* | *Raihan* | UC05 Pembersihan & UC07 Leaderboard: `LaporanPembersihan`, `BuktiPembersihan`, `Leaderboard`, view dan controller terkait | *20%* |
| *13525125* | *Peter Emmanuel Suwardy* | UC08 Admin, `AkunRelawan`, `Komunitas`, `Autentikasi`, skema DB, data demo, pengujian & CI dokumen | *20%* |
| | | **Total** | **100%** |

## B.5 Traceability Kelas Perancangan ke Implementasi

Semua file berada di bawah `src/`. Atribut kelas (private) diwujudkan sebagai kolom tabel / properti objek entitas (`camelCase` di kode, `snake_case` di basis data); operasi diwujudkan sebagai metode dengan **nama yang sama** dengan DPPL.

Tabel B.5. Traceability Kelas Perancangan ke Implementasi

| ID Kelas | Nama Kelas Perancangan | Bentuk Implementasi | Lokasi (File dan Nama) | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| C01 | LaporanPencemaran | Kelas (Model) + tabel | `models/LaporanPencemaran.js` — `LaporanPencemaran`; tabel `laporan_pencemaran` | 8 operasi DPPL menjadi metode bernama sama. Atribut menjadi kolom (+`lat`,`lon` turunan WKT untuk indeks). `perbaruiStatusLaporan` hanya mengubah laporan berstatus "Menunggu Verifikasi" (cegah keputusan ganda). Ditambah `setStatusDibersihkan`. |
| C02 | BuktiLaporan | Kelas (Model) + tabel | `models/BuktiLaporan.js` — `BuktiLaporan`; tabel `bukti_laporan` | `validasiFormatUkuran` = Algo-001 (+ magic bytes); `ekstrakMetadataEXIF` memakai `exifr`, hasil disimpan sebagai JSON pada `metadata_exif`. |
| C03 | KlaimTitikPencemaran | Kelas (Model) + tabel | `models/KlaimTitikPencemaran.js` — `KlaimTitikPencemaran`; tabel `klaim_titik_pencemaran` | `kunciTitikLokasi` = Algo-003 (transaksi `IMMEDIATE` + unique index, Q-002/Q-003). Ditambah `getKlaimHidup`. |
| C04 | LaporanPembersihan | Kelas (Model) + tabel | `models/LaporanPembersihan.js` — `LaporanPembersihan`; tabel `laporan_pembersihan` | `simpanLaporanPembersihan` menyimpan laporan **dan** `bukti_pembersihan` dalam satu transaksi. `setHasilVerifikasi` mengembalikan `idRelawan`. |
| C05 | BuktiPembersihan | Kelas (Model) + tabel | `models/BuktiPembersihan.js` — `BuktiPembersihan`; tabel `bukti_pembersihan` | `validasiGeofencingRadius` = Algo-004 memakai `utils/geo.js` (pengganti Q-004); disimpan lewat induknya (C04) seperti pada DPPL 2.4.1. |
| C06 | LogVerifikasi | Kelas (Model) + tabel | `models/LogVerifikasi.js` — `LogVerifikasi`; tabel `log_verifikasi` | Hanya `INSERT` (Q-009); **trigger** `trg_log_no_update/delete` di `db/schema.sql` menjamin immutable (KNF07). |
| C07 | Leaderboard | Kelas (Model) + tabel | `models/Leaderboard.js` — `Leaderboard`; tabel `leaderboard` | `hitungUlangPeringkat` memakai Q-008 (`RANK() OVER`); `daftarPeringkat` diturunkan dari `akun_relawan`, `tgl_pembaruan` disimpan. |
| C08 | AkunRelawan | Kelas (Model) + tabel | `models/AkunRelawan.js` — `AkunRelawan`; tabel `akun_relawan` | `tambahSkorPoin` = Algo-007 (Q-006 via haversine, Q-007 `UPDATE … RETURNING`). `ubahHakAkses`, `tangguhkanAkun` (mencabut sesi). Ditambah `aktifkanAkun`, `perbaruiDataAkun`. |
| C09 | Komunitas | Kelas (Model) + tabel | `models/Komunitas.js` — `Komunitas`; tabel `komunitas` | 3 operasi DPPL; `perbaruiKomunitas` memvalidasi nama (1–100 karakter). |
| C10 | PetaHeatmap | Kelas (Model) + tabel + utilitas | `models/PetaHeatmap.js` — `PetaHeatmap`; `utils/cluster.js` — `clusterGrid`; `utils/geo.js`; `utils/gazetteer.js`; tabel `peta_heatmap` | `hitungHeatIntensity` = Algo-002 (klaster oleh `clusterGrid`, bobot dari `config`). `cariLokasi` memakai gazetteer lokal. Klaster disimpan agar dapat difilter dan dipakai `tambahSkorPoin`. |
| C11 | PelaporanView | Kelas JS (View, browser) | `public/js/views/PelaporanView.js` — `PelaporanView`; layar I-01/I-02 | Operasi menjadi metode bernama sama; `ambilKoordinatGPS` memakai `navigator.geolocation`; atribut `idSesi` lihat B.1 no. 12. Dialog I-02 pada `public/js/ui.js` (`dialogConsent`). |
| C12 | HeatmapView | Kelas JS (View) | `public/js/views/HeatmapView.js` — `HeatmapView`; layar I-03 | `muatPetaDasar`/`tampilkanPeta` memakai Leaflet + leaflet.heat; `tekanKlaim` memanggil `POST /api/klaim/:id`. |
| C13 | DashboardVerifikasiView | Kelas JS (View) | `public/js/views/DashboardVerifikasiView.js` — `DashboardVerifikasiView`; layar I-05, I-06 | Dua alur (laporan & pembersihan) dalam satu kelas sesuai DPPL; foto before–after berdampingan. |
| C14 | PembersihanView | Kelas JS (View) | `public/js/views/PembersihanView.js` — `PembersihanView`; layar I-04 | Validasi geofencing interaktif lewat `POST /api/pembersihan/validasi`. |
| C15 | LeaderboardView | Kelas JS (View) | `public/js/views/LeaderboardView.js` — `LeaderboardView`; layar I-07 | `tekanRefresh` memuat ulang; gagal → "Gagal memuat leaderboard". |
| C16 | PanelAdminView | Kelas JS (View) | `public/js/views/PanelAdminView.js` — `PanelAdminView`; layar I-08 | Tab akun/komunitas, form ubah, pesan sukses/error, `konfirmasiCobaLagi`. |
| C17 | PelaporanController | Kelas (Controller) + route | `controllers/PelaporanController.js` — `PelaporanController`; `routes/api.js` — `GET /pelaporan/form`, `POST /pelaporan/validasi`, `POST /pelaporan` | 3 operasi DPPL; mengunggah foto via C26 lalu menyimpan laporan + bukti dalam satu transaksi. |
| C18 | HeatmapController | Kelas (Controller) + route | `controllers/HeatmapController.js` — `HeatmapController`; `routes/api.js` — `GET /heatmap`, `/heatmap/filter`, `/heatmap/cari`, `/heatmap/titik/:id` | Mengembalikan pesan alternatif UC02 ("Lokasi tidak ditemukan", "Tidak ada data untuk tingkat pencemaran ini"). |
| C19 | VerifikasiController | Kelas (Controller) + route | `controllers/VerifikasiController.js` — `VerifikasiController`; `routes/api.js` — `/verifikasi/laporan[/:id]`, `/verifikasi/pembersihan[/:id]` | `prosesVerifikasiPembersihan` = Algo-006 dalam satu transaksi (status, log audit, poin, leaderboard, status klaim/laporan), notifikasi dikirim setelah commit. |
| C20 | KlaimController | Kelas (Controller) + route | `controllers/KlaimController.js` — `KlaimController`; `routes/api.js` — `GET/POST /klaim/:id` | `klaimTitik` menolak bila Relawan masih punya klaim aktif atau titik sudah diklaim. |
| C21 | PembersihanController | Kelas (Controller) + route | `controllers/PembersihanController.js` — `PembersihanController`; `routes/api.js` — `/pembersihan/form`, `/pembersihan/validasi`, `POST /pembersihan` | `validasiBukti` mengambil koordinat acuan klaim lalu memanggil `validasiGeofencingRadius`; EXIF GPS diutamakan. |
| C22 | LeaderboardController | Kelas (Controller) + route | `controllers/LeaderboardController.js` — `LeaderboardController`; `routes/api.js` — `/leaderboard`, `/leaderboard/peringkat` | 2 operasi DPPL. |
| C23 | AdminController | Kelas (Controller) + route | `controllers/AdminController.js` — `AdminController`; `routes/api.js` — `/admin`, `/admin/:tipe/:id` | `prosesPerubahanData` atomik (transaksi); melarang Admin menurunkan/menangguhkan akunnya sendiri. |
| C24 | Notifikasi | Kelas (layanan pendukung) + tabel + SSE | `services/Notifikasi.js` — `Notifikasi`; `routes/api.js` — `GET /notifikasi/stream`; klien: `public/js/app.js` (`EventSource`); tabel `notifikasi` | `kirimNotifikasi` menyimpan ke DB lalu mendorong event SSE ke Relawan yang sedang daring (badge NAV-05 + toast). |
| C25 | Autentikasi | Kelas (layanan pendukung) + middleware + tabel | `services/Autentikasi.js` — `Autentikasi`; `middleware/auth.js`; tabel `sesi`, `consent_log`, kolom `jumlah_gagal_login`/`waktu_kunci` | `cekSesiDanPeran` = Algo-005, dipanggil di awal **setiap** operasi Controller. Kata sandi di-hash `scrypt` + salt; cookie sesi `HttpOnly; SameSite=Lax`. |
| C26 | StorageAdapter | Kelas (adapter integrasi) | `services/StorageAdapter.js` — `StorageAdapter`; folder `uploads/` (disajikan di `/uploads`) | `unggahFoto` menulis berkas bernama acak dan mengembalikan URL; retry 3× (KNF01). Dapat diganti S3/GCS tanpa mengubah Controller. |
| – | *(tambahan, bukan kelas DPPL)* | Komposisi dependensi, konfigurasi, entry point | `services/container.js`, `config/index.js`, `app.js`, `server.js`, `public/js/app.js`, `public/js/views/LoginView.js` | Merangkai Model–Controller (dependency injection), membaca `.env`, memetakan route → Controller, navigasi berbasis peran (NAV-01…08). |

### Matriks kerunutan kelas ke use case (ringkas)

Mengikuti Tabel 7.1 DPPL tanpa perubahan: UC01 (C01, C02, C08, C11, C17, C25, C26), UC02 (C01, C10, C12, C18, C25), UC03 (C01, C02, C06, C08, C13, C19, C24, C25), UC04 (C01, C03, C08, C12, C20, C25), UC05 (C03, C04, C05, C14, C21, C25, C26), UC06 (C04, C05, C06, C07, C08, C13, C19, C24, C25), UC07 (C07, C08, C15, C22, C25), UC08 (C08, C09, C16, C23, C25).
