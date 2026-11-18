<h1>
IF2150 REKAYASA PERANGKAT LUNAK
<br>
TUGAS 10
<br>
HASIL IMPLEMENTASI DAN UJI PERANGKAT LUNAK (HIUPL)
</h1>
<br>

## *SeaGuard*
<p align="center">
<img alt="Logo SeaGuard" src="../M8/assets/logo-seaguard.png" width="45%">
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

## Daftar Isi

- [BAB 1: Pendahuluan](#bab-1-pendahuluan)
  - [1.1 Tujuan Penulisan Dokumen](#11-tujuan-penulisan-dokumen)
  - [1.2 Lingkup Masalah](#12-lingkup-masalah)
  - [1.3 Definisi, Istilah, dan Singkatan](#13-definisi-istilah-dan-singkatan)
  - [1.4 Aturan Penomoran](#14-aturan-penomoran)
  - [1.5 Referensi](#15-referensi)
  - [1.6 Deskripsi Umum Dokumen (Ikhtisar)](#16-deskripsi-umum-dokumen-ikhtisar)
- [BAB 2: Deskripsi Umum Perangkat Lunak](#bab-2-deskripsi-umum-perangkat-lunak)
- [BAB 3: Implementasi](#bab-3-implementasi)
  - [3.1 Lingkungan Implementasi](#31-lingkungan-implementasi)
  - [3.2 Implementasi Modul](#32-implementasi-modul)
  - [3.3 Implementasi Antarmuka](#33-implementasi-antarmuka)
  - [3.4 File Lain](#34-file-lain)
- [BAB 4: Hasil Pengujian](#bab-4-hasil-pengujian)
  - [4.1 Strategi dan Kedalaman Pengujian Kelas](#41-strategi-dan-kedalaman-pengujian-kelas)
  - [4.2 Pengujian Unit Kelas](#42-pengujian-unit-kelas)
  - [4.3 Pengujian Integrasi](#43-pengujian-integrasi)
  - [4.4 Pengujian Use Case](#44-pengujian-use-case)
  - [4.5 Pengujian Kebutuhan Non-Fungsional (KNF)](#45-pengujian-kebutuhan-non-fungsional-knf)
  - [4.6 Tangkapan Layar dan Bukti Hasil Pengujian](#46-tangkapan-layar-dan-bukti-hasil-pengujian)
- [BAB 5: Traceability](#bab-5-traceability)

---

## Daftar Perubahan

| Revisi | Deskripsi |
| :--- | :--- |
| *A* | *Perubahan implementasi terhadap DPPL dicatat lengkap pada Tabel B.1 dokumen Implementasi (Tugas 9) dan tidak diulang di sini. Sejak Tugas 9, pekerjaan berkala (kedaluwarsa klaim dan penyegaran heat intensity) tidak lagi dijalankan dengan timer, tetapi saat ada permintaan API (`services/Pemeliharaan.js`), dan respons peta publik disimpan di cache memori. Perubahan ini dibuat agar server dapat tidur saat tidak dipakai sehingga biaya hosting mendekati nol.* |
| *B* | *Ditambahkan pengujian unit (`tests/unit.test.mjs`) dan integrasi (`tests/integrasi.test.mjs`) beserta skrip `npm run test:unit` dan `npm run test:integrasi`.* |

---

# BAB 1: Pendahuluan

## 1.1 Tujuan Penulisan Dokumen
Dokumen Hasil Implementasi dan Uji Perangkat Lunak (HIUPL) ini melaporkan hasil implementasi SeaGuard beserta hasil pengujiannya pada level unit, integrasi, use case, dan kebutuhan non-fungsional. Dokumen ini menunjukkan bahwa kelas, antarmuka, dan kebutuhan pada SKPL dan DPPL telah diimplementasikan, serta bagaimana setiap kebutuhan diverifikasi melalui test case. Target pembaca dokumen ini adalah asisten dan dosen sebagai penilai, serta tim pengembang sebagai acuan perbaikan dan pemeliharaan.

## 1.2 Lingkup Masalah
SeaGuard merupakan aplikasi berbasis web (ditambah aplikasi Android dari kode yang sama) bagi Relawan untuk memantau, melaporkan, dan membersihkan titik pencemaran sampah di wilayah perairan Indonesia. Relawan melaporkan titik pencemaran beserta foto bukti, melihat persebaran pencemaran melalui heatmap, mengklaim titik untuk dibersihkan, lalu melaporkan hasil pembersihan. Laporan dan hasil pembersihan diverifikasi oleh Verifikator/Admin, dan setiap pembersihan yang disetujui menambah skor Relawan pada leaderboard. SeaGuard berinteraksi dengan Geolocation API pada perangkat, layanan peta pihak ketiga (OpenFreeMap, Photon, Nominatim), dan penyimpanan objek (*bucket* S3 di Railway).

## 1.3 Definisi, Istilah, dan Singkatan

Tabel 1.3. Definisi Istilah dan Singkatan

| Singkatan, Akronim, atau Istilah | Penjelasan |
| :--- | :--- |
| *P/L* | *Singkatan dari Perangkat Lunak, yaitu aplikasi yang memberikan perintah kepada komputer untuk menjalankan tugas tertentu.* |
| *SKPL* | *Singkatan dari Spesifikasi Kebutuhan Perangkat Lunak, yaitu dokumen yang merangkum kriteria-kriteria yang diperlukan untuk membangun aplikasi menjalankan tugasnya.* |
| *APL* | *Singkatan dari Arsitektur Perangkat Lunak, yaitu dokumen yang menjelaskan style/pattern, komponen, dan model arsitektur perangkat lunak.* |
| *DPPL* | *Singkatan dari Deskripsi Perancangan Perangkat Lunak, yaitu dokumen yang menjelaskan rancangan arsitektur, kelas, dan antarmuka P/L.* |
| *HIUPL* | *Singkatan dari Hasil Implementasi dan Uji Perangkat Lunak, yaitu dokumen yang melaporkan hasil implementasi dan pengujian P/L.* |
| *KF* | *Singkatan dari Kebutuhan Fungsional.* |
| *KNF* | *Singkatan dari Kebutuhan Non-Fungsional.* |
| *UC* | *Singkatan dari Use Case.* |
| *TC* | *Singkatan dari Test Case, yaitu satu kasus uji untuk skenario tertentu.* |
| *UT* | *Singkatan dari Unit Test, yaitu test case tingkat kelas/operasi.* |
| *INT* | *Singkatan dari Integration Test, yaitu test case yang menguji interaksi antarkomponen.* |
| *E2E* | *End-to-end test, yaitu pengujian alur lengkap melalui API HTTP terhadap server yang sedang berjalan.* |
| *Boundary* | *Kasus uji pada nilai batas masukan, misalnya nilai minimum, maksimum, atau tepat di ambang aturan.* |
| *Coverage* | *Persentase baris/cabang kode yang dieksekusi oleh pengujian.* |
| *MVC* | *Model-View-Controller, pola arsitektur yang dipakai SeaGuard.* |
| *PostGIS* | *Ekstensi PostgreSQL untuk data geospasial (jarak, pengelompokan titik).* |
| *SSE* | *Server-Sent Events, saluran satu arah dari server ke klien untuk notifikasi real-time.* |
| *Geofencing* | *Pemeriksaan bahwa koordinat foto berada dalam radius tertentu dari titik klaim.* |

## 1.4 Aturan Penomoran

Tabel 1.4. Aturan Penomoran

| Hal/Bagian | Penomoran | Keterangan |
| :--- | :--- | :--- |
| *Kebutuhan Fungsional* | *KFXX* | *Sesuai SKPL, KF01 hingga KF21.* |
| *Kebutuhan Non-Fungsional* | *KNFXX* | *Sesuai SKPL, KNF01 hingga KNF12.* |
| *Use Case* | *UCXX* | *Sesuai SKPL, UC01 hingga UC08.* |
| *Kelas* | *CXX* | *Sesuai DPPL, C01 hingga C26.* |
| *Antarmuka (layar)* | *I-XX* | *Sesuai DPPL, I-01 hingga I-08.* |
| *Antarmuka antarkomponen* | *IA-XX* | *Baru pada dokumen ini, untuk batas antarkomponen yang diuji pada pengujian integrasi (Tabel 4.3.1). Dibedakan dari I-XX agar tidak tertukar dengan ID layar.* |
| *Algoritma / Query* | *Algo-XXX / Q-XXX* | *Sesuai DPPL.* |
| *Test Case Unit* | *CXX-UTYY* | *XX adalah nomor kelas, YY adalah nomor urut test case unit pada kelas tersebut.* |
| *Test Case Integrasi* | *INT-TCYY* | *YY adalah nomor urut test case integrasi.* |
| *Test Case Use Case* | *UCXX-TCYY* | *XX adalah nomor use case, YY adalah nomor urut test case pada use case tersebut.* |
| *Test Case KNF* | *KNFXX-TCYY* | *XX adalah nomor KNF, YY adalah nomor urut test case pada KNF tersebut.* |

## 1.5 Referensi
1. Kelompok G01 K02. (2026). *Spesifikasi Kebutuhan Perangkat Lunak (SKPL) SeaGuard* ([`docs/M5/K02_G01_SKPL.md`](../M5/K02_G01_SKPL.md)).
2. Kelompok G01 K02. (2026). *Arsitektur Perangkat Lunak (APL) SeaGuard* ([`docs/M6/K02_G01_APL.md`](../M6/K02_G01_APL.md)).
3. Kelompok G01 K02. (2026). *Deskripsi Perancangan Perangkat Lunak (DPPL) SeaGuard* ([`docs/M8/K02_G01_DPPL2.md`](../M8/K02_G01_DPPL2.md)).
4. Kelompok G01 K02. (2026). *Implementasi Perangkat Lunak SeaGuard (Tugas 9)* ([`docs/M9/K02_G01_Implementasi.md`](../M9/K02_G01_Implementasi.md)) dan [`src/README.md`](../../src/README.md).
5. Node.js. *Test runner (`node:test`) dan code coverage*. https://nodejs.org/api/test.html
6. PostgreSQL Global Development Group. *EXPLAIN*. https://www.postgresql.org/docs/16/sql-explain.html
7. PostGIS. *ST_Distance, ST_ClusterDBSCAN*. https://postgis.net/docs/
8. Puppeteer. *Dokumentasi Puppeteer* (tangkapan layar otomatis). https://pptr.dev
9. Sommerville, I. (2016). *Software Engineering* (10th ed.). Pearson.

## 1.6 Deskripsi Umum Dokumen (Ikhtisar)
Dokumen ini terdiri atas lima bab. BAB 1 berisi pendahuluan, BAB 2 berisi gambaran umum SeaGuard beserta use case diagram, BAB 3 berisi lingkungan implementasi serta daftar modul, antarmuka, dan berkas lain yang diimplementasikan, BAB 4 berisi strategi dan hasil pengujian unit, integrasi, use case, dan KNF beserta buktinya, dan BAB 5 berisi matriks kerunutan KF dan KNF terhadap implementasi dan test case.

<br>

---

# BAB 2: Deskripsi Umum Perangkat Lunak

SeaGuard adalah aplikasi client-server berpola MVC. Klien berupa aplikasi web (React) yang dibuka di browser dan aplikasi Android (Capacitor) yang memakai kode antarmuka yang sama. Server Node.js/Express menjalankan Controller dan Model, menyimpan data di PostgreSQL + PostGIS, dan menyimpan foto bukti di *bucket* S3-compatible. Versi produksi berjalan di Railway (https://seaguard-app-production.up.railway.app).

Batasan dan keterkaitan dengan sistem di luar SeaGuard:
1. **Geolocation API / GPS perangkat** dipakai oleh View untuk mengambil koordinat saat melapor dan saat mengunggah bukti pembersihan. SeaGuard tidak menyimpan riwayat lokasi pengguna di luar laporan.
2. **Layanan peta pihak ketiga**: OpenFreeMap untuk peta dasar, Photon dan Nominatim (OpenStreetMap) untuk pencarian tempat dan penamaan lokasi. Data pencemaran tidak dikirim ke layanan tersebut.
3. **Penyimpanan objek (Railway bucket)** menyimpan foto bukti, diakses hanya dari server melalui `StorageAdapter`.
4. SeaGuard tidak terhubung ke sensor kualitas air atau sumber data pencemaran lain; seluruh data berasal dari laporan Relawan yang diverifikasi.

Aktor SeaGuard adalah **Relawan** (melapor, melihat heatmap, mengklaim, membersihkan, melihat leaderboard) dan **Verifikator/Admin** (memverifikasi laporan dan hasil pembersihan, mengelola akun dan komunitas). Gambar 2.1 menyalin use case diagram dari SKPL.

<p align="center">
<img alt="Use Case Diagram SeaGuard" src="../M5/assets/diagram/Diagram%20Use%20Case.png" width="80%">
</p>
<p align="center">
<i>Gambar 2.1. Use Case Diagram SeaGuard (dari SKPL Gambar 2)</i>
</p>

Alur utamanya: Relawan melaporkan titik pencemaran (UC01); Verifikator menyetujui laporan (UC03) sehingga titik tampil pada heatmap (UC02); Relawan mengklaim titik (UC04), membersihkannya, lalu melaporkan hasil pembersihan dengan foto sebelum dan sesudah dalam radius 100 m (UC05); Verifikator menyetujui hasil pembersihan (UC06) sehingga poin Relawan bertambah dan leaderboard diperbarui (UC07). Admin mengelola akun dan komunitas (UC08).

<br>

---

# BAB 3: Implementasi

Elemen P/L SeaGuard terdiri atas kode server (`src/server/`), kode antarmuka (`src/web/`), skema dan data demo basis data, serta konfigurasi deploy. Hasil yang dapat dijalankan adalah image Docker `seaguard-app` (server + web yang sudah di-*build*), bundel web `src/web/dist/`, dan APK Android `seaguard-<versi>.apk` yang dapat diunduh dari `/download`. Perubahan terhadap rancangan DPPL dicatat pada Tabel B.1 dokumen Implementasi (Tugas 9); tidak ada kelas yang dihapus, digabung, atau dipecah.

## 3.1 Lingkungan Implementasi

Tabel 3.1. Lingkungan Implementasi

| Aspek | Keterangan |
| :--- | :--- |
| *Hardware* | *Laptop pengembang: AMD Ryzen 3 5300U, RAM 6 GB. Produksi: layanan Railway (region asia-southeast1), container Linux untuk server dan PostGIS. Uji Android: emulator Android 15 (API 35) dan ponsel Samsung.* |
| *Operating System* | *Pengembangan: Windows 10. Server: Debian 12 (image `node:22-bookworm-slim`) di Railway. Klien: browser modern di Windows/macOS/Linux/Android, aplikasi Android 7.0+.* |
| *Bahasa Pemrograman* | *JavaScript (ES2023) di server dan klien; SQL (PostgreSQL/PostGIS); HTML dan CSS. Node.js 22 di produksi, Node.js 24 di laptop pengembang.* |
| *Framework/Library* | *Server: Express 5.3, pg 8.23, bcryptjs 3.0, exifr 7.1, multer 2, helmet 8, express-rate-limit 8, @aws-sdk/client-s3 3. Klien: React 19.3, Vite 8.3, MapLibre GL 6.17, lucide-react, Capacitor 8.6, @capgo/capacitor-updater 8.54.* |
| *DBMS* | *PostgreSQL 16 dengan PostGIS 3.4 (sesuai Subbab 2.1 DPPL "PostgreSQL v15 atau terbaru").* |
| *Development Tools* | *Visual Studio Code, Git dan GitHub, Docker Compose (basis data lokal), Railway CLI, Android Studio/SDK + JDK 21 (build APK), draw.io dan StarUML (pemodelan).* |
| *Testing Tools* | *Test runner bawaan Node.js (`node:test`, `node:assert`) untuk unit, integrasi, dan E2E; laporan coverage `--experimental-test-coverage` (baris, cabang, fungsi); `EXPLAIN (ANALYZE)` PostgreSQL dan `process.hrtime` untuk performa; `curl` untuk waktu respons produksi; Puppeteer + Google Chrome untuk tangkapan layar dan skenario gagal jaringan.* |

Dibandingkan Subbab 2.1 DPPL, perbedaannya adalah klien React + aplikasi Android (bukan HTML/JS biasa), PostgreSQL 16, dan *bucket* Railway sebagai Cloud Object Storage. Alasan perubahan dijelaskan pada Tabel B.1 Tugas 9 (no. 1–4).

## 3.2 Implementasi Modul

Path relatif terhadap `src/`. Kode server tidak dikompilasi; "file executable" sisi server adalah image Docker `seaguard-app` yang menjalankan `node server/src/server.js`. Kode View di-*build* menjadi bundel `web/dist/` (dipakai web dan APK).

Tabel 3.2. Implementasi Modul

| No | ID Kelas | Nama Modul/Kelas | Nama File Fisik | Nama File Executable |
| :--- | :--- | :--- | :--- | :--- |
| 1 | C01 | LaporanPencemaran | `server/src/models/LaporanPencemaran.js` | image `seaguard-app` |
| 2 | C02 | BuktiLaporan | `server/src/models/BuktiLaporan.js` | image `seaguard-app` |
| 3 | C03 | KlaimTitikPencemaran | `server/src/models/KlaimTitikPencemaran.js` | image `seaguard-app` |
| 4 | C04 | LaporanPembersihan | `server/src/models/LaporanPembersihan.js` | image `seaguard-app` |
| 5 | C05 | BuktiPembersihan | `server/src/models/BuktiPembersihan.js` | image `seaguard-app` |
| 6 | C06 | LogVerifikasi | `server/src/models/LogVerifikasi.js` | image `seaguard-app` |
| 7 | C07 | Leaderboard | `server/src/models/Leaderboard.js` | image `seaguard-app` |
| 8 | C08 | AkunRelawan | `server/src/models/AkunRelawan.js` | image `seaguard-app` |
| 9 | C09 | Komunitas | `server/src/models/Komunitas.js` | image `seaguard-app` |
| 10 | C10 | PetaHeatmap | `server/src/models/PetaHeatmap.js`, `server/src/services/Geocoder.js` | image `seaguard-app` |
| 11 | C11 | PelaporanView | `web/src/pages/Report.jsx`, `web/src/components/Consent.jsx`, `web/src/components/PhotoDrop.jsx` | `web/dist/`, `seaguard-<versi>.apk` |
| 12 | C12 | HeatmapView | `web/src/pages/Heatmap.jsx`, `web/src/components/MapView.jsx` | `web/dist/`, `seaguard-<versi>.apk` |
| 13 | C13 | DashboardVerifikasiView | `web/src/pages/VerifyReports.jsx`, `web/src/pages/VerifyCleanups.jsx`, `web/src/components/Decision.jsx` | `web/dist/`, `seaguard-<versi>.apk` |
| 14 | C14 | PembersihanView | `web/src/pages/Cleanup.jsx` | `web/dist/`, `seaguard-<versi>.apk` |
| 15 | C15 | LeaderboardView | `web/src/pages/Leaderboard.jsx` | `web/dist/`, `seaguard-<versi>.apk` |
| 16 | C16 | PanelAdminView | `web/src/pages/Admin.jsx`, `web/src/pages/AuditLog.jsx` | `web/dist/`, `seaguard-<versi>.apk` |
| 17 | C17 | PelaporanController | `server/src/controllers/PelaporanController.js` | image `seaguard-app` |
| 18 | C18 | HeatmapController | `server/src/controllers/HeatmapController.js` | image `seaguard-app` |
| 19 | C19 | VerifikasiController | `server/src/controllers/VerifikasiController.js` | image `seaguard-app` |
| 20 | C20 | KlaimController | `server/src/controllers/KlaimController.js` | image `seaguard-app` |
| 21 | C21 | PembersihanController | `server/src/controllers/PembersihanController.js` | image `seaguard-app` |
| 22 | C22 | LeaderboardController | `server/src/controllers/LeaderboardController.js` | image `seaguard-app` |
| 23 | C23 | AdminController | `server/src/controllers/AdminController.js` | image `seaguard-app` |
| 24 | C24 | Notifikasi | `server/src/services/Notifikasi.js`, klien `web/src/api/live.js` | image `seaguard-app`, `web/dist/` |
| 25 | C25 | Autentikasi | `server/src/services/Autentikasi.js`, `server/src/middleware/auth.js` | image `seaguard-app` |
| 26 | C26 | StorageAdapter | `server/src/services/StorageAdapter.js` | image `seaguard-app` |

## 3.3 Implementasi Antarmuka

Tabel 3.3. Implementasi Antarmuka

| No | ID Antarmuka | Nama Antarmuka | Nama File Fisik | Nama File Executable |
| :--- | :--- | :--- | :--- | :--- |
| 1 | I-01 | Form Laporan Pencemaran | `web/src/pages/Report.jsx`, `web/src/components/PhotoDrop.jsx` | `web/dist/`, `seaguard-<versi>.apk` (rute `/lapor`) |
| 2 | I-02 | Dialog Persetujuan Akses Lokasi dan Kamera | `web/src/components/Consent.jsx` | `web/dist/`, `seaguard-<versi>.apk` |
| 3 | I-03 | Peta Heatmap Pencemaran | `web/src/pages/Heatmap.jsx`, `web/src/components/MapView.jsx` | `web/dist/`, `seaguard-<versi>.apk` (rute `/peta`) |
| 4 | I-04 | Form Laporan Pembersihan | `web/src/pages/Cleanup.jsx` | `web/dist/`, `seaguard-<versi>.apk` (rute `/pembersihan`) |
| 5 | I-05 | Dashboard Verifikasi Laporan Pencemaran | `web/src/pages/VerifyReports.jsx`, `web/src/components/Decision.jsx` | `web/dist/`, `seaguard-<versi>.apk` (rute `/verifikasi/laporan`) |
| 6 | I-06 | Verifikasi Hasil Pembersihan | `web/src/pages/VerifyCleanups.jsx`, `web/src/components/Decision.jsx` | `web/dist/`, `seaguard-<versi>.apk` (rute `/verifikasi/pembersihan`) |
| 7 | I-07 | Leaderboard | `web/src/pages/Leaderboard.jsx` | `web/dist/`, `seaguard-<versi>.apk` (rute `/leaderboard`) |
| 8 | I-08 | Panel Pengelolaan Akun dan Komunitas | `web/src/pages/Admin.jsx`, `web/src/pages/AuditLog.jsx` | `web/dist/`, `seaguard-<versi>.apk` (rute `/admin`) |

Layar tambahan di luar DPPL (B.1 no. 13 Tugas 9): Masuk/Daftar (`pages/Auth.jsx`), Pilih Bahasa (`pages/LanguagePick.jsx`), Beranda (`pages/Landing.jsx`), Profil (`pages/Profile.jsx`), Notifikasi (`pages/Notifications.jsx`), dan Unduh Aplikasi (`pages/Download.jsx`).

## 3.4 File Lain

Tabel 3.4. File Lain

| No | Nama File | Keterangan |
| :--- | :--- | :--- |
| 1 | `server/src/server.js` | Entry point: migrasi, seed data demo bila basis data kosong, menjalankan HTTP. |
| 2 | `server/src/app.js` | Konfigurasi Express (header keamanan, kompresi, CORS untuk aplikasi Android, file statis). |
| 3 | `server/src/routes/api.js` | Pemetaan route REST ke operasi Controller; cache respons publik. |
| 4 | `server/src/config.js` | Konfigurasi dari variabel lingkungan dan aturan bisnis (5 MB, 100 m + 10 m, 7 hari, 5 kali gagal masuk, radius klaster 500 m). |
| 5 | `server/src/db/schema.sql`, `migrate.js` | Skema 16 tabel, *index*, *trigger* log audit immutable (KNF07), dan migrasi. |
| 6 | `server/src/db/seed.js`, `demoImage.js` | Data demo fiktif (akun, laporan, klaim, pembersihan) dan pembuat gambar demo. |
| 7 | `server/src/db/pool.js` | Pool koneksi PostgreSQL dan helper transaksi. |
| 8 | `server/src/services/Pemeliharaan.js` | Kedaluwarsa klaim dan penyegaran heat intensity yang dijalankan saat ada permintaan. |
| 9 | `server/src/utils/cacheRespons.js`, `geo.js`, `errors.js` | Cache respons, helper koordinat PostGIS, dan format galat. |
| 10 | `server/.env.example`, `docker-compose.yml` | Contoh konfigurasi dan basis data PostGIS lokal. |
| 11 | `Dockerfile`, `railway.json` | Build image (web + server) dan konfigurasi deploy Railway. |
| 12 | `web/src/App.jsx`, `web/src/i18n/strings.js` | Navigasi per peran dan teks dua bahasa (Indonesia/Inggris). |
| 13 | `web/src/lib/updater.js`, `web/scripts/*.mjs`, `web/android/` | Pembaruan aplikasi Android *over-the-air* dan skrip build APK. |
| 14 | `server/tests/unit.test.mjs` | 55 test case unit (Subbab 4.2) dengan laporan coverage. |
| 15 | `server/tests/integrasi.test.mjs` | 15 test case integrasi (Subbab 4.3). |
| 16 | `server/tests/bantuan-db.mjs` | Menyiapkan basis data uji sementara (dibuat, dimigrasi, di-seed, lalu dihapus). |
| 17 | `server/tests/e2e.test.mjs` | 11 test E2E melalui API HTTP (Subbab 4.4). |
| 18 | `server/tests/profile-heatmap.mjs`, `nfr-check.mjs` | Pengukuran KNF03 (10.000 titik) dan KNF07. |
| 19 | `README.md` | Cara menjalankan, menguji, dan men-deploy. |

<br>

---

# BAB 4: Hasil Pengujian

Pengujian dilakukan pada 18 November 2026 terhadap kode di branch `main` (rilis Tugas 9 ditambah perubahan hemat biaya hosting pada Daftar Perubahan A). Pengujian unit dan integrasi dijalankan pada basis data sementara di server PostGIS yang dibuat dan dihapus oleh skrip uji. Pengujian use case (E2E) dijalankan terhadap server lokal dengan basis data pengembangan `seaguard_dev`, terpisah dari data produksi.

Cara menjalankan seluruh pengujian (dari `src/server`, dengan `DATABASE_URL` mengarah ke PostgreSQL + PostGIS, misalnya basis data Docker Compose pada `src/README.md` bagian 2):

```bash
npm run test:unit        # Subbab 4.2, beserta laporan coverage
npm run test:integrasi   # Subbab 4.3
npm start                # di terminal lain, lalu:
npm test                 # Subbab 4.4 (E2E)
npm run profile          # Subbab 4.5, KNF03
node tests/nfr-check.mjs # Subbab 4.5, KNF07
```

Ringkasan hasil: **55/55 unit Pass, 15/15 integrasi Pass, 11/11 E2E Pass**. Pada KNF, satu pengukuran KNF03 (waktu total dari laptop melalui internet) belum memenuhi target, dan KNF11 belum diuji; keduanya dijelaskan pada Subbab 4.5.

## 4.1 Strategi dan Kedalaman Pengujian Kelas

Tingkat **Mendalam** diberikan pada kelas yang memuat validasi, algoritma, aturan status, keamanan, atau integrasi eksternal. Tingkat **Sedang** diberikan pada kelas Model yang sebagian besar menyimpan dan membaca data dengan aturan sederhana, serta pada Controller yang hanya mengoordinasikan Model; Controller diuji melalui pengujian integrasi karena perilakunya baru bermakna bersama Model dan basis data. Tingkat **Tidak perlu** diberikan pada kelas View, yang tidak memuat logika bisnis (validasi dilakukan ulang di server) dan teruji melalui pengujian use case.

Tabel 4.1.1. Identifikasi Tingkat Pengujian Kelas

| ID Kelas | Nama Kelas | Tingkat | Alasan | Test Case Terkait |
| :--- | :--- | :--- | :--- | :--- |
| C02 | BuktiLaporan | Mendalam | Validasi format, ukuran, dan *magic bytes* foto (Algo-001), ekstraksi EXIF | C02-UT01 s.d. C02-UT08, INT-TC01, INT-TC02 |
| C03 | KlaimTitikPencemaran | Mendalam | Penguncian klaim (Algo-003, KNF05), aturan status klaim, kedaluwarsa 7 hari | C03-UT01 s.d. C03-UT09, INT-TC07, INT-TC13 |
| C05 | BuktiPembersihan | Mendalam | Geofencing 100 m + toleransi 10 m (Algo-004, KNF06) | C05-UT01 s.d. C05-UT05, INT-TC08 |
| C10 | PetaHeatmap | Mendalam | Pengelompokan dan perhitungan heat intensity (Algo-002), filter kategori dan area | C10-UT01 s.d. C10-UT07, INT-TC03, INT-TC04 |
| C25 | Autentikasi | Mendalam | Keamanan: sesi, peran (Algo-005), penguncian 5 kali gagal masuk (KNF09), *hash* kata sandi, consent log (KNF02) | C25-UT01 s.d. C25-UT09 |
| C26 | StorageAdapter | Mendalam | Integrasi eksternal dengan *retry* 3 kali (KNF01) | C26-UT01 s.d. C26-UT03, INT-TC01, INT-TC14 |
| C01 | LaporanPencemaran | Sedang | Penyimpanan dan pembacaan laporan; aturan sederhana (indikator valid, keputusan sekali) | C01-UT01, C01-UT02, INT-TC05, INT-TC06 |
| C04 | LaporanPembersihan | Sedang | Penyimpanan laporan pembersihan; validasi deskripsi dan keputusan | C04-UT01, C04-UT02, INT-TC09 |
| C06 | LogVerifikasi | Sedang | Hanya menambah catatan; immutability dijamin *trigger* basis data | C06-UT01, C06-UT02, INT-TC13 |
| C07 | Leaderboard | Sedang | Pengurutan peringkat oleh query `RANK()` (Algo-008) | C07-UT01, C07-UT02, INT-TC10 |
| C08 | AkunRelawan | Sedang | Sebagian besar CRUD akun; perhitungan poin satu baris (Algo-007) | C08-UT01, C08-UT02, INT-TC09, INT-TC11 |
| C09 | Komunitas | Sedang | CRUD komunitas dengan validasi nama | C09-UT01, C09-UT02, INT-TC11 |
| C24 | Notifikasi | Sedang | Menyimpan notifikasi dan meneruskannya lewat SSE | C24-UT01, C24-UT02, INT-TC05, KNF04-TC01 |
| C17 | PelaporanController | Sedang | Mengoordinasikan C01, C02, C26 dan validasi wilayah | INT-TC01, INT-TC02 |
| C18 | HeatmapController | Sedang | Mengoordinasikan C10 dan C01, termasuk pesan filter kosong | INT-TC03, INT-TC04, INT-TC15 |
| C19 | VerifikasiController | Sedang | Mengoordinasikan keputusan dalam satu transaksi (Algo-006) | INT-TC05, INT-TC06, INT-TC09 |
| C20 | KlaimController | Sedang | Delegasi ke C03 | INT-TC07 |
| C21 | PembersihanController | Sedang | Delegasi ke C03 dan C05 | INT-TC08 |
| C22 | LeaderboardController | Sedang | Delegasi ke C07 | INT-TC10 |
| C23 | AdminController | Sedang | Mengoordinasikan C08, C09, C06 dengan aturan peran (R24) | INT-TC11, INT-TC12 |
| C11 | PelaporanView | Tidak perlu | Tampilan form; validasi diulang di server | UC01-TC01 s.d. UC01-TC03 |
| C12 | HeatmapView | Tidak perlu | Tampilan peta dan detail | UC02-TC01 s.d. UC02-TC06, UC04-TC01 |
| C13 | DashboardVerifikasiView | Tidak perlu | Tampilan antrean dan keputusan | UC03-TC01, UC06-TC01 |
| C14 | PembersihanView | Tidak perlu | Tampilan form pembersihan | UC05-TC01, UC05-TC02 |
| C15 | LeaderboardView | Tidak perlu | Tampilan peringkat | UC07-TC01, UC07-TC02 |
| C16 | PanelAdminView | Tidak perlu | Tampilan daftar dan form ubah data | UC08-TC01, UC08-TC02 |

## 4.2 Pengujian Unit Kelas

Pengujian unit dilakukan pada kelas bertingkat Mendalam dan kelas Model bertingkat Sedang. Kelas Mendalam diuji dengan kasus normal, batas, dan negatif, dengan coverage baris minimal 70%. Kelas Sedang diuji dengan minimal satu kasus normal dan satu kasus gagal. Pengujian memakai basis data PostGIS sungguhan (bukan *mock*) yang berisi data demo, karena sebagian besar logika berada pada query PostGIS.

Cara menjalankan unit test: `cd src/server && npm run test:unit` (perlu `DATABASE_URL`).

Lokasi file test: [`src/server/tests/unit.test.mjs`](../../src/server/tests/unit.test.mjs) (persiapan basis data di [`bantuan-db.mjs`](../../src/server/tests/bantuan-db.mjs)).

### 4.2.1 Kelas BuktiLaporan

**ID Kelas:** C02  
**Nama Kelas:** BuktiLaporan  
**Tingkat:** Mendalam

Tabel 4.2.1. Hasil Pengujian Unit Kelas C02

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C02-UT01 | `validasiFormatUkuran()` | Normal | Foto PNG asli 32×24 px | `{valid: true, format: 'png'}` | Sesuai | Pass |
| C02-UT02 | `validasiFormatUkuran()` | Batas | JPG tepat 5.242.880 byte (5 MB) | Diterima, `format: 'jpg'` | Diterima | Pass |
| C02-UT03 | `validasiFormatUkuran()` | Batas | JPG 5 MB + 1 byte | Ditolak `PHOTO_TOO_LARGE` | `PHOTO_TOO_LARGE` | Pass |
| C02-UT04 | `validasiFormatUkuran()` | Negatif | Berkas bertipe `image/gif` | Ditolak `PHOTO_FORMAT` | `PHOTO_FORMAT` | Pass |
| C02-UT05 | `validasiFormatUkuran()` | Negatif | Berkas teks yang diberi tipe `image/png` | Ditolak `PHOTO_FORMAT` (*magic bytes*) | `PHOTO_FORMAT` | Pass |
| C02-UT06 | `validasiFormatUkuran()` | Negatif | Tanpa foto (`null`) | Ditolak `PHOTO_MISSING` | `PHOTO_MISSING` | Pass |
| C02-UT07 | `ekstrakMetadataEXIF()` | Negatif | PNG tanpa EXIF; JPEG dengan EXIF rusak | `null`, tidak melempar galat | `null` untuk keduanya | Pass |
| C02-UT08 | `simpanBukti()`, `getDetailBukti()` | Normal | Dua bukti: dengan GPS EXIF ±110 m dari titik laporan, dan tanpa GPS | 2 bukti; jarak EXIF ≈ 110,6 m dan `null` | 2 bukti; jarak ±110,6 m dan `null` | Pass |

Tabel 4.2.1b. Ringkasan Cakupan Kelas C02

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `validasiFormatUkuran()`, `ekstrakMetadataEXIF()`, `simpanBukti()`, `getDetailBukti()` |
| Operasi yang diuji | Semua (4/4) |
| ID Algoritma yang tercakup | Algo-001 |
| Coverage (wajib ≥ 70%) | Baris 93,06% / cabang 84,78% / fungsi 100% (`node --test --experimental-test-coverage`, bukti 4.6) |

### 4.2.2 Kelas KlaimTitikPencemaran

**ID Kelas:** C03  
**Nama Kelas:** KlaimTitikPencemaran  
**Tingkat:** Mendalam

Tabel 4.2.2. Hasil Pengujian Unit Kelas C03

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C03-UT01 | `kunciTitikLokasi()` | Normal | Relawan A mengklaim laporan berstatus Disetujui | Klaim `Aktif`, laporan menjadi `Diklaim`, batas waktu 7 hari | Sesuai | Pass |
| C03-UT02 | `getStatusKlaim()` | Normal | Laporan yang diklaim dan laporan lain yang belum | Klaim milik A; `null` untuk yang belum | Sesuai | Pass |
| C03-UT03 | `kunciTitikLokasi()` | Negatif | Relawan B mengklaim titik milik A | Ditolak `ALREADY_CLAIMED` | `ALREADY_CLAIMED` | Pass |
| C03-UT04 | `kunciTitikLokasi()` | Negatif | Relawan A (sudah punya klaim aktif) mengklaim titik lain | Ditolak `HAS_ACTIVE_CLAIM` | `HAS_ACTIVE_CLAIM` | Pass |
| C03-UT05 | `kunciTitikLokasi()` | Negatif | Laporan masih Menunggu Verifikasi; ID laporan tidak ada | `NOT_CLAIMABLE`; `REPORT_NOT_FOUND` | Sesuai | Pass |
| C03-UT06 | `kunciTitikLokasi()` | Batas | 5 relawan mengklaim satu titik secara bersamaan (`Promise.all`) | Tepat 1 berhasil, 4 `ALREADY_CLAIMED`, 1 baris klaim di basis data (KNF05) | 1 berhasil, 4 ditolak, 1 baris | Pass |
| C03-UT07 | `getKoordinatAcuan()`, `ubahStatusKlaim()` | Normal/Batas | Ubah status ke Menunggu Verifikasi lalu kembali ke Aktif | Acuan ada saat Aktif; `null` saat Menunggu Verifikasi | Sesuai | Pass |
| C03-UT08 | `batalkanKlaim()`, `getRiwayatKlaim()` | Normal/Negatif | Lepas klaim; lepas lagi tanpa klaim aktif | Laporan kembali Disetujui; kedua kali `NO_ACTIVE_CLAIM`; riwayat `Dibatalkan` | Sesuai | Pass |
| C03-UT09 | `kedaluwarsakan()` | Batas | Batas waktu klaim diubah ke 1 menit lalu | Klaim `Kedaluwarsa`, laporan kembali Disetujui | Sesuai | Pass |

Tabel 4.2.2b. Ringkasan Cakupan Kelas C03

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `getStatusKlaim()`, `kunciTitikLokasi()`, `getKoordinatAcuan()`, `ubahStatusKlaim()` (+ tambahan `getKlaimHidup()`, `getRiwayatKlaim()`, `batalkanKlaim()`, `kedaluwarsakan()`) |
| Operasi yang diuji | Semua (8/8) |
| ID Algoritma yang tercakup | Algo-003 (Q-002, Q-003) |
| Coverage (wajib ≥ 70%) | Baris 96,64% / cabang 96,30% / fungsi 100% |

### 4.2.3 Kelas BuktiPembersihan

**ID Kelas:** C05  
**Nama Kelas:** BuktiPembersihan  
**Tingkat:** Mendalam

Tabel 4.2.3. Hasil Pengujian Unit Kelas C05

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C05-UT01 | `validasiGeofencingRadius()` | Normal | Foto sebelum 55 m, sesudah 40 m dari titik klaim | Valid, jarak sebelum ≈ 55 m | Valid, 55 m | Pass |
| C05-UT02 | `validasiGeofencingRadius()` | Batas | Foto sebelum 105 m (di dalam toleransi 10 m) | Valid | Valid | Pass |
| C05-UT03 | `validasiGeofencingRadius()` | Batas | Foto sesudah 115 m | Tidak valid, `GEOFENCE_OUTSIDE` | Sesuai | Pass |
| C05-UT04 | `validasiGeofencingRadius()` | Negatif | Koordinat foto sebelum tidak ada | `GPS_MISSING` | `GPS_MISSING` | Pass |
| C05-UT05 | `tampilkanPerbandinganFoto()` | Normal/Negatif | ID pembersihan data demo; ID tidak dikenal | URL foto sebelum dan sesudah; `null` | Sesuai | Pass |

Tabel 4.2.3b. Ringkasan Cakupan Kelas C05

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `validasiGeofencingRadius()`, `tampilkanPerbandinganFoto()` |
| Operasi yang diuji | Semua (2/2) |
| ID Algoritma yang tercakup | Algo-004 (Q-004) |
| Coverage (wajib ≥ 70%) | Baris 100% / cabang 100% / fungsi 100% |

### 4.2.4 Kelas PetaHeatmap

**ID Kelas:** C10  
**Nama Kelas:** PetaHeatmap  
**Tingkat:** Mendalam

Tabel 4.2.4. Hasil Pengujian Unit Kelas C10

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C10-UT01 | `hitungHeatIntensity()` | Normal | Data demo + laporan uji | Jumlah laporan terkelompok = jumlah laporan Disetujui/Diklaim; 0 < klaster ≤ laporan | Sesuai | Pass |
| C10-UT02 | `hitungHeatIntensity()` | Normal | Periksa setiap baris `peta_heatmap` | heat = 6·jumlah + 12·rata-rata keparahan + 1,5·rata-rata hari (selisih < 0,2); kategori = indikator paling parah di klaster | Sesuai untuk semua klaster | Pass |
| C10-UT03 | `filterBerdasarkanKategori()` | Normal | Kategori `['Sehat']` | Hanya klaster dan titik Sehat | Sesuai | Pass |
| C10-UT04 | `tampilkanHeatmap()` | Batas | Kategori kosong `[]` | `{klaster: [], titik: []}` | Sesuai | Pass |
| C10-UT05 | `tampilkanHeatmap()` | Normal/Negatif | Area peta Bali `114.4,-9.0,115.8,-8.0`; area tidak valid `abc` | Titik hanya di dalam area; area tidak valid diabaikan | Sesuai | Pass |
| C10-UT06 | `getDetailKlaster()` | Normal/Negatif | Titik di Muara Angke; titik di Samudra Hindia | Klaster ditemukan; `null` | Sesuai | Pass |
| C10-UT07 | `getPapanHotspot()` | Normal/Batas | `limit: 5`; kategori kosong | 5 baris urut heat menurun; `[]` | Sesuai | Pass |

Tabel 4.2.4b. Ringkasan Cakupan Kelas C10

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `hitungHeatIntensity()`, `tampilkanHeatmap()`, `filterBerdasarkanKategori()`, `cariLokasi()`, `getDetailKlaster()` (+ `getPapanHotspot()`) |
| Operasi yang diuji | 5 dari 6 pada unit test; `cariLokasi()` memanggil layanan eksternal sehingga diuji pada integrasi (INT-TC15) |
| ID Algoritma yang tercakup | Algo-002 (Q-001) |
| Coverage (wajib ≥ 70%) | Baris 98,77% / cabang 83,33% / fungsi 92,86% |

### 4.2.5 Kelas Autentikasi

**ID Kelas:** C25  
**Nama Kelas:** Autentikasi  
**Tingkat:** Mendalam

Tabel 4.2.5. Hasil Pengujian Unit Kelas C25

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C25-UT01 | `validasiPassword()` | Batas | `abcdefg1` (8 karakter); `abcdef1` (7 karakter) | Diterima; ditolak `PASSWORD_WEAK` | Sesuai | Pass |
| C25-UT02 | `validasiPassword()` | Negatif | `passwordsaja` (tanpa angka) | `PASSWORD_WEAK` | Sesuai | Pass |
| C25-UT03 | `daftar()` | Normal/Negatif | Email baru; email yang sama sekali lagi | Token + peran Relawan; `EMAIL_TAKEN` | Sesuai | Pass |
| C25-UT04 | `login()` | Normal/Negatif | Sandi benar; sandi salah; email tidak terdaftar | Token; `LOGIN_FAILED` untuk keduanya (pesan sama, tidak membocorkan email) | Sesuai | Pass |
| C25-UT05 | `login()` | Batas | 5 kali sandi salah, lalu sandi benar | Percobaan 1–4 `LOGIN_FAILED`, ke-5 `ACCOUNT_LOCKED`; sandi benar tetap `ACCOUNT_LOCKED`; kunci ≥ 14 menit (KNF09) | Sesuai | Pass |
| C25-UT06 | `cekSesiDanPeran()` | Normal/Negatif | Token Relawan, Verifikator, Admin, dan token palsu terhadap berbagai peran | Relawan→Verifikator 403; Verifikator→Verifikator ok; Admin→Verifikator ok; Verifikator→Relawan `RELAWAN_ONLY`; token palsu 401 | Sesuai | Pass |
| C25-UT07 | `cekSesiDanPeran()`, `login()` | Negatif | Akun berstatus Ditangguhkan | `ACCOUNT_SUSPENDED` pada keduanya | Sesuai | Pass |
| C25-UT08 | `gantiPassword()`, `logout()`, `akunDariToken()` | Normal/Negatif | Sandi lama salah; sandi lama benar; logout | `PASSWORD_WRONG`; masuk dengan sandi baru berhasil; token tidak berlaku setelah logout; *hash* bcrypt | Sesuai | Pass |
| C25-UT09 | `catatConsent()`, `sudahConsent()` | Normal/Negatif | Izinkan lokasi_kamera; jenis `mikrofon`; keputusan `Mungkin` | Keputusan terakhir `Izinkan`; `CONSENT_INVALID` untuk keduanya (KNF02) | Sesuai | Pass |

Tabel 4.2.5b. Ringkasan Cakupan Kelas C25

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `cekSesiDanPeran()` (+ tambahan `daftar()`, `login()`, `logout()`, `gantiPassword()`, `akunDariToken()`, `catatConsent()`, `sudahConsent()`) |
| Operasi yang diuji | Semua (8/8) |
| ID Algoritma yang tercakup | Algo-005 |
| Coverage (wajib ≥ 70%) | Baris 100% / cabang 83,33% / fungsi 100% |

### 4.2.6 Kelas StorageAdapter

**ID Kelas:** C26  
**Nama Kelas:** StorageAdapter  
**Tingkat:** Mendalam

Tabel 4.2.6. Hasil Pengujian Unit Kelas C26

| ID Pengujian | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C26-UT01 | `unggahFoto()`, `baca()`, `urlBaca()` | Normal | Mode lokal, unggah PNG lalu baca | Kunci `uji/YYYY-MM/<uuid>.png`; isi berkas sama; URL bertanda tangan `null` di mode lokal | Sesuai | Pass |
| C26-UT02 | `unggahFoto()` | Batas | Klien penyimpanan gagal 2 kali, berhasil pada percobaan ke-3 | Berhasil, tepat 3 percobaan (KNF01) | Berhasil, 3 percobaan | Pass |
| C26-UT03 | `unggahFoto()` | Negatif | Klien penyimpanan selalu gagal | `UPLOAD_FAILED` setelah tepat 3 percobaan | Sesuai | Pass |

Tabel 4.2.6b. Ringkasan Cakupan Kelas C26

| Informasi | Keterangan |
| :--- | :--- |
| Daftar operasi public pada DPPL | `unggahFoto()` (+ `urlBaca()`, `baca()`, `simpanBerkas()`) |
| Operasi yang diuji | `unggahFoto()`, `urlBaca()`, `baca()` |
| ID Algoritma yang tercakup | – (aturan *retry* KNF01) |
| Coverage (wajib ≥ 70%) | Baris 82,95% / cabang 67,74% / fungsi 87,50%. Baris yang tidak tercakup adalah pembuatan klien S3 dengan kredensial asli, yang diuji di produksi melalui E2E. |

### 4.2.7 Kelas Model bertingkat Sedang

Tabel 4.2.7. Hasil Pengujian Unit Kelas Sedang

| ID Pengujian | Kelas | Operasi yang Diuji | Jenis Kasus | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C01-UT01 | C01 LaporanPencemaran | `buatLaporan()`, `simpanLaporan()` | Normal | Indikator Waspada, jenis sampah `plastik` dan `x` | Jenis tidak dikenal dibuang; status `Menunggu Verifikasi` | Sesuai | Pass |
| C01-UT02 | C01 LaporanPencemaran | `buatLaporan()`, `perbaruiStatusLaporan()` | Gagal | Indikator `Parah`; memutus laporan yang sudah Disetujui | `INDICATOR_INVALID`; `ALREADY_DECIDED` | Sesuai | Pass |
| C04-UT01 | C04 LaporanPembersihan | `buatLaporanPembersihan()` | Normal | Deskripsi berspasi, 4 peserta, 12,34 kg | Deskripsi dirapikan, berat 12,3 kg | Sesuai | Pass |
| C04-UT02 | C04 LaporanPembersihan | `buatLaporanPembersihan()`, `setHasilVerifikasi()` | Gagal | Deskripsi `pendek`; keputusan `Mungkin` | `CLEANUP_DESC_SHORT`; `DECISION_INVALID` | Sesuai | Pass |
| C06-UT01 | C06 LogVerifikasi | `catatLogVerifikasi()`, `getLog()` | Normal | Catat keputusan untuk `LP-UJI` | Log terbaru berkode `LP-UJI` | Sesuai | Pass |
| C06-UT02 | C06 LogVerifikasi | *trigger* `log_verifikasi` | Gagal | `UPDATE` dan `DELETE` langsung ke tabel | Keduanya ditolak (KNF07) | Ditolak | Pass |
| C07-UT01 | C07 Leaderboard | `getDaftarPeringkat()` | Normal | 10 teratas | Urut poin menurun, peringkat pertama = 1 | Sesuai | Pass |
| C07-UT02 | C07 Leaderboard | `getPosisiPengguna()` | Gagal | Akun Verifikator | `null` (tidak masuk peringkat) | `null` | Pass |
| C08-UT01 | C08 AkunRelawan | `tambahSkorPoin()`, `getAtributPoin()` | Normal | Pembersihan demo yang menunggu verifikasi | Poin ≥ 1, total baru = total lama + poin (Algo-007) | Sesuai | Pass |
| C08-UT02 | C08 AkunRelawan | `ubahHakAkses()`, `tangguhkanAkun()` | Gagal | Peran `Raja`; ID akun tidak ada | `ROLE_INVALID`; `ACCOUNT_NOT_FOUND` | Sesuai | Pass |
| C09-UT01 | C09 Komunitas | `perbaruiKomunitas()`, `getDetailKomunitas()` | Normal | Nama baru `Komunitas Uji` | Nama tersimpan | Sesuai | Pass |
| C09-UT02 | C09 Komunitas | `perbaruiKomunitas()` | Gagal | Nama berisi spasi saja | `COMMUNITY_NAME_INVALID` | Sesuai | Pass |
| C24-UT01 | C24 Notifikasi | `kirimNotifikasi()`, `getDaftar()`, `tandaiDibaca()` | Normal | Kirim satu notifikasi lalu tandai semua dibaca | Belum dibaca 1 lalu 0 | Sesuai | Pass |
| C24-UT02 | C24 Notifikasi | `kirimNotifikasi()` | Gagal | Penerima tidak ada | Ditolak *foreign key* basis data | Ditolak | Pass |

<br>

## 4.3 Pengujian Integrasi

Pengujian integrasi memanggil operasi Controller secara langsung dengan Model, basis data PostgreSQL + PostGIS, penyimpanan berkas, dan layanan Photon/Nominatim yang sebenarnya (tanpa *mock*). Setiap test memeriksa hasil langsung di basis data. DPPL tidak memiliki daftar antarmuka antarkomponen, sehingga daftarnya disusun dari Logical View DPPL (Gambar 2) dan diberi ID IA-XX.

Cara menjalankan: `cd src/server && npm run test:integrasi`. Lokasi file: [`src/server/tests/integrasi.test.mjs`](../../src/server/tests/integrasi.test.mjs).

Tabel 4.3.1. Daftar Antarmuka Antarkomponen

| ID Antarmuka | Komponen Asal | Komponen Tujuan | Jenis Batas | Test Case |
| :--- | :--- | :--- | :--- | :--- |
| IA-01 | PelaporanController | LaporanPencemaran, BuktiLaporan, StorageAdapter | Controller - Model | INT-TC01, INT-TC02 |
| IA-02 | HeatmapController | PetaHeatmap, LaporanPencemaran | Controller - Model | INT-TC03, INT-TC04 |
| IA-03 | VerifikasiController | LaporanPencemaran, LogVerifikasi, Notifikasi | Controller - Model | INT-TC05, INT-TC06 |
| IA-04 | KlaimController | KlaimTitikPencemaran, AkunRelawan | Controller - Model | INT-TC07 |
| IA-05 | PembersihanController | KlaimTitikPencemaran, BuktiPembersihan | Controller - Model | INT-TC08 |
| IA-06 | VerifikasiController | LaporanPembersihan, AkunRelawan, Leaderboard, LogVerifikasi | Controller - Model | INT-TC09 |
| IA-07 | LeaderboardController | Leaderboard | Controller - Model | INT-TC10 |
| IA-08 | AdminController | AkunRelawan, Komunitas, LogVerifikasi | Controller - Model | INT-TC11, INT-TC12 |
| IA-09 | Model | Database (PostgreSQL + PostGIS) | Aplikasi - Basis data | INT-TC13 (serta seluruh test lain) |
| IA-10 | StorageAdapter | Penyimpanan objek (bucket S3 / folder lokal) | Aplikasi - Sistem eksternal | INT-TC14 |
| IA-11 | PetaHeatmap / Geocoder | Photon dan Nominatim (OpenStreetMap) | Aplikasi - Sistem eksternal | INT-TC15 |
| IA-12 | Notifikasi (server) | Klien browser/Android (SSE) | Aplikasi - Klien | KNF04-TC01, KNF08-TC01 |

Tabel 4.3.2. Hasil Pengujian Integrasi

| ID Pengujian | ID Antarmuka | Skenario | Prosedur/Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| INT-TC01 | IA-01 | Normal: laporan baru | `prosesLaporan()` dengan foto PNG, koordinat Muara Angke, indikator Berbahaya | Baris laporan `Menunggu Verifikasi`, baris bukti tersimpan, berkas foto dapat dibaca dari penyimpanan | Sesuai | Pass |
| INT-TC02 | IA-01 | Gagal: foto dan lokasi tidak valid | Foto berupa teks; koordinat Singapura | `PHOTO_FORMAT`; `OUTSIDE_INDONESIA`; jumlah laporan tidak bertambah | Sesuai | Pass |
| INT-TC03 | IA-02 | Normal: data peta | Segarkan heat (seperti route `/heatmap`), lalu `ambilDataHeatmap()` | Titik, klaster, dan papan hotspot terisi; ringkasan "aktif" = jumlah titik | Sesuai | Pass |
| INT-TC04 | IA-02 | Gagal: filter kosong | `terapkanFilter({kategori: ''})` | `kosong: true`, pesan `FILTER_EMPTY` | Sesuai | Pass |
| INT-TC05 | IA-03 | Normal: setujui laporan | `prosesVerifikasiLaporan()` pada laporan menunggu | Status Disetujui, baris log audit, notifikasi untuk pelapor, laporan masuk klaster | Sesuai | Pass |
| INT-TC06 | IA-03 | Gagal: keputusan ganda | Menolak laporan yang sudah Disetujui | `ALREADY_DECIDED`, tidak ada log baru (transaksi dibatalkan) | Sesuai | Pass |
| INT-TC07 | IA-04 | Normal: klaim dan lepas | `ambilDetailTitikKlaim()`, `klaimTitik()`, `batalkan()` | `bisaKlaim` true; klaim Aktif dan `milikSaya`; status Dibatalkan | Sesuai | Pass |
| INT-TC08 | IA-05 | Normal dan gagal: geofencing | Tanpa klaim; klaim lalu foto ±44 m dan ±330 m | `NO_ACTIVE_CLAIM`; valid; tidak valid | Sesuai | Pass |
| INT-TC09 | IA-06 | Normal: setujui pembersihan | `prosesVerifikasiPembersihan()` pada pengajuan demo | Total poin bertambah sesuai `poin`, klaim Selesai, log audit jenis pembersihan | Sesuai | Pass |
| INT-TC10 | IA-07 | Normal: leaderboard | `ambilLeaderboard()`, `ambilDaftarPeringkat()` | Posisi pengguna dan tanggal pembaruan tersedia; daftar tidak kosong | Sesuai | Pass |
| INT-TC11 | IA-08 | Normal: penangguhan dan komunitas | Tangguhkan akun baru; ubah nama komunitas | Akun Ditangguhkan; log audit jenis komunitas | Sesuai | Pass |
| INT-TC12 | IA-08 | Gagal: aturan peran | Admin mengubah perannya sendiri; Relawan dijadikan Verifikator tanpa instansi | `SELF_ROLE`; `INSTITUTION_REQUIRED` (R24) | Sesuai | Pass |
| INT-TC13 | IA-09 | Gagal: batasan basis data | `DELETE` pada `log_verifikasi`; menyisipkan klaim aktif kedua untuk relawan yang sama | Ditolak *trigger*; ditolak *unique index* (kode 23505) | Sesuai | Pass |
| INT-TC14 | IA-10 | Normal: unggah dan baca | `storage.unggahFoto()` lalu `storage.baca()` | Isi berkas sama | Sesuai | Pass |
| INT-TC15 | IA-11 | Normal dan gagal: pencarian tempat | `cariLokasi('BSD')`; `cariLokasi('zzqqxx nowhere')` | BSD di sekitar Tangerang (lat −6,2 s.d. −6,4; lon 106,6 s.d. 106,8); `LOCATION_NOT_FOUND` | Sesuai | Pass |

<br>

## 4.4 Pengujian Use Case

Pengujian use case dilakukan dengan dua cara: (1) otomatis melalui API HTTP dengan `npm test` ([`src/server/tests/e2e.test.mjs`](../../src/server/tests/e2e.test.mjs), 11 test) terhadap server yang berjalan, dan (2) melalui antarmuka web dengan Google Chrome yang dijalankan otomatis oleh Puppeteer, untuk mengambil tangkapan layar pada Subbab 4.6. Data uji adalah data demo (`src/README.md` bagian 4): Relawan `relawan1@seaguard.test`, Verifikator `verifikator@seaguard.test`.

### 4.4.1 Use Case Melaporkan Titik Pencemaran

**ID Use Case:** UC01  
**Nama Use Case:** Melaporkan Titik Pencemaran

Tabel 4.4.1. Hasil Pengujian Use Case UC01

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC01-TC01 | KF01, KF02, KF03, KF04, KF05 | Normal | 1. Masuk sebagai Relawan.<br>2. Buka menu Lapor.<br>3. Isi foto, indikator, koordinat.<br>4. Kirim. | Foto PNG, Berbahaya, −6,1065 / 106,7745 | Form tampil dengan unggah foto, indikator, koordinat, dan tombol "Gunakan lokasi saya"; laporan tersimpan berstatus Menunggu Verifikasi | Form tampil lengkap; E2E "UC01: report a pollution point" mendapat 201 dan status Menunggu Verifikasi | Pass |
| UC01-TC02 | KF01 | Alternatif 1: Upload laporan gagal (format laporan tidak sesuai) | Kirim laporan dengan koordinat di luar wilayah Indonesia | Koordinat Singapura | Ditolak dengan pesan lokasi di luar perairan Indonesia, pengguna dapat memperbaiki | `OUTSIDE_INDONESIA` (E2E "UC01 alternative") | Pass |
| UC01-TC03 | KF03 | Alternatif 2: Upload bukti foto gagal | Kirim laporan dengan foto tidak valid | Berkas bukan JPG/PNG | Ditolak dengan pesan format foto, pengguna dapat mengunggah ulang | `PHOTO_FORMAT` (E2E "UC01 alternative") | Pass |

### 4.4.2 Use Case Melihat Data dan Heatmap Pencemaran

**ID Use Case:** UC02  
**Nama Use Case:** Melihat Data dan Heatmap Pencemaran

Tabel 4.4.2. Hasil Pengujian Use Case UC02

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC02-TC01 | KF06, KF08 | Normal langkah 1 | Buka menu Peta Heatmap | – | Peta heatmap berwarna per kategori beserta legenda Sehat/Waspada/Berbahaya | Peta, legenda, daftar hotspot, dan ringkasan tampil | Pass |
| UC02-TC02 | KF07 | Normal langkah 2 | Matikan filter Sehat dan Waspada | Filter Berbahaya | Peta dan daftar hanya menampilkan kategori Berbahaya | Sesuai | Pass |
| UC02-TC03 | KF06 | Normal langkah 3 | Ketik lokasi di kotak pencarian, tekan Enter | `Muara Angke` | Peta berpindah ke lokasi yang dicari | Peta berpindah ke Muara Angke | Pass |
| UC02-TC04 | KF06 | Normal langkah 4 | Pilih satu titik pada daftar hotspot | Titik teratas | Detail tingkat pencemaran, heat, lama belum ditangani, tanggal, jenis sampah | Panel detail tampil | Pass |
| UC02-TC05 | KF06 | Alternatif 1: Lokasi tidak ditemukan | Cari lokasi acak | `zzqqxx nowhere` | Pesan "Lokasi tidak ditemukan" | Pesan tampil; E2E mendapat `LOCATION_NOT_FOUND` | Pass |
| UC02-TC06 | KF07 | Alternatif 2: Hasil filter kosong | Matikan semua filter | – | Pesan "Tidak ada data untuk tingkat pencemaran ini" | Pesan tampil; E2E mendapat `kosong: true` | Pass |

### 4.4.3 Use Case Memverifikasi Laporan Pencemaran

**ID Use Case:** UC03  
**Nama Use Case:** Memverifikasi Laporan Pencemaran

Tabel 4.4.3. Hasil Pengujian Use Case UC03

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC03-TC01 | KF09, KF10, KF11, KF17 | Normal | 1. Masuk sebagai Verifikator.<br>2. Buka Verifikasi Laporan.<br>3. Pilih laporan, pilih Setujui. | Laporan dari UC01-TC01 | Antrean menampilkan foto, lokasi, dan status; status menjadi Disetujui; log audit tercatat; Relawan menerima notifikasi | Antrean tampil; E2E "UC03" menemukan log audit dan notifikasi `laporan_disetujui` | Pass |

Catatan: pada tangkapan layar, *thumbnail* foto antrean kosong karena berkas foto demo pada server lokal pengembang sudah terhapus. Ini bukan galat aplikasi; di produksi foto tampil dari *bucket*.

### 4.4.4 Use Case Mengklaim Titik Pencemaran

**ID Use Case:** UC04  
**Nama Use Case:** Mengklaim Titik Pencemaran

Tabel 4.4.4. Hasil Pengujian Use Case UC04

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC04-TC01 | KF12 | Normal | 1. Masuk sebagai Relawan.<br>2. Pilih titik pada peta.<br>3. Tekan "Klaim titik ini" dan konfirmasi. | Titik berstatus Disetujui | Detail dengan tombol klaim; titik terkunci untuk Relawan selama 7 hari | Tombol tampil; setelah konfirmasi, menu Pembersihan menampilkan klaim Aktif dengan batas 7 hari | Pass |
| UC04-TC02 | KF12 | Alternatif 1: Titik sudah diklaim | Relawan lain mengklaim titik yang sudah diklaim | Titik berstatus Diklaim | Ditolak dengan pesan titik sudah diklaim pengguna lain | `ALREADY_CLAIMED` (C03-UT03; tampilan "Diklaim … sampai …") | Pass |
| UC04-TC03 | KF12 | Alternatif 2: Klaim bersamaan | Dua Relawan menekan klaim pada titik yang sama bersamaan | Dua permintaan paralel | Tepat satu berhasil, yang lain ditolak | 1 × 201 dan 1 × 409 `ALREADY_CLAIMED` (E2E "UC04 + KNF05") | Pass |

### 4.4.5 Use Case Melaporkan Hasil Pembersihan

**ID Use Case:** UC05  
**Nama Use Case:** Melaporkan Hasil Pembersihan

Tabel 4.4.5. Hasil Pengujian Use Case UC05

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC05-TC01 | KF13, KF14 | Normal | 1. Buka menu Pembersihan.<br>2. Unggah foto sebelum dan sesudah beserta deskripsi.<br>3. Kirim. | Foto ±55 m dan ±44 m dari titik klaim | Form foto sebelum, sesudah, dan deskripsi; laporan tersimpan dan klaim menjadi Menunggu Verifikasi | Form tampil; E2E "UC05" mendapat 201 | Pass |
| UC05-TC02 | KF14 | Alternatif 1: Lokasi foto di luar radius | Unggah foto yang diambil ±330 m dari titik klaim | Koordinat foto sebelum +0,003° | Pesan galat di luar radius 100 m | `GEOFENCE_OUTSIDE` (E2E "UC05") | Pass |

### 4.4.6 Use Case Memverifikasi Hasil Pembersihan

**ID Use Case:** UC06  
**Nama Use Case:** Memverifikasi Hasil Pembersihan

Tabel 4.4.6. Hasil Pengujian Use Case UC06

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC06-TC01 | KF15, KF16, KF17, KF19 | Normal | 1. Masuk sebagai Verifikator.<br>2. Buka Verifikasi Pembersihan.<br>3. Pilih pengajuan, bandingkan foto, Setujui. | Pengajuan dari UC05-TC01 | Foto sebelum dan sesudah berdampingan; keputusan tersimpan; log audit; notifikasi; poin Relawan bertambah | E2E "UC06 + UC07": URL foto sebelum/sesudah ada, status Disetujui, poin = selisih total poin | Pass |

### 4.4.7 Use Case Melihat Leaderboard

**ID Use Case:** UC07  
**Nama Use Case:** Melihat Leaderboard

Tabel 4.4.7. Hasil Pengujian Use Case UC07

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC07-TC01 | KF18, KF19 | Normal | Buka menu Leaderboard | – | Daftar peringkat dengan total poin; posisi pengguna (bila masuk) | Tampil; E2E: posisi Relawan tersedia setelah persetujuan pembersihan | Pass |
| UC07-TC02 | KF18 | Alternatif 1: Gagal memuat leaderboard | 1. Buka Leaderboard dengan permintaan `/api/leaderboard` diputus.<br>2. Tekan "Muat ulang" setelah koneksi pulih. | Permintaan jaringan gagal | Pesan "Gagal memuat leaderboard." dan tombol Muat ulang; setelah ditekan data tampil | Sesuai | Pass |

### 4.4.8 Use Case Mengelola Akun Relawan dan Data Komunitas

**ID Use Case:** UC08  
**Nama Use Case:** Mengelola Akun Relawan dan Data Komunitas

Tabel 4.4.8. Hasil Pengujian Use Case UC08

| ID Pengujian | ID KF | Skenario | Prosedur Pengujian | Masukan | Hasil yang Diharapkan | Hasil Pengujian | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UC08-TC01 | KF20, KF21 | Normal | 1. Masuk sebagai Verifikator/Admin.<br>2. Buka Panel Admin.<br>3. Pilih akun/komunitas, ubah, simpan. | Ubah data komunitas; tangguhkan akun | Daftar akun, komunitas, dan hak akses tampil; perubahan tersimpan; akun ditangguhkan langsung keluar | Tampil; E2E "UC08": komunitas diperbarui, sesi akun yang ditangguhkan langsung ditolak (401), peran Verifikator tanpa instansi ditolak | Pass |
| UC08-TC02 | KF20 | Alternatif 1: Pembaruan data gagal | 1. Pilih akun, tekan Simpan dengan permintaan `PUT /api/admin/…` diputus.<br>2. Tekan "Coba lagi". | Permintaan jaringan gagal | Pesan "Gagal memperbarui data akun/komunitas" dan tombol Coba lagi; percobaan ulang dikirim ke server | Pesan dan tombol tampil; percobaan ulang sampai ke server (dijawab "Tidak ada yang diubah" karena data sama) | Pass |

<br>

## 4.5 Pengujian Kebutuhan Non-Fungsional (KNF)

Tabel 4.5. Hasil Pengujian KNF

| ID Pengujian | ID KNF | Parameter | Target Terukur | Metode dan Alat | Hasil Aktual | Kesimpulan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| KNF01-TC01 | KNF01 | Reliability | Unggah foto dicoba ulang otomatis maksimal 3 kali | Unit test dengan klien penyimpanan yang gagal (C26-UT02, C26-UT03) | Gagal 2× lalu berhasil pada percobaan ke-3; selalu gagal → berhenti tepat setelah 3 percobaan | Pass |
| KNF02-TC01 | KNF02 | Security | Setiap keputusan consent lokasi/kamera tercatat | Unit test (C25-UT09) dan inspeksi tabel `consent_log` | Keputusan, jenis, perangkat, IP, dan waktu tersimpan; jenis tidak dikenal ditolak | Pass |
| KNF03-TC01 | KNF03 | Response time | Lapisan heatmap 10.000 titik ≤ 3 detik | `EXPLAIN (ANALYZE)` pada basis data, 10.000 laporan, `npm run profile` | Baca lapisan klaster 8,1 ms; `ST_ClusterDBSCAN` 10.000 titik 97 ms | Pass |
| KNF03-TC02 | KNF03 | Response time | Waktu total pembacaan 10.000 titik ≤ 3 detik | `npm run profile` dari laptop pengembang ke PostGIS Railway melalui internet, median 3 kali | 3.576 ms (pengukuran 13 Nov: 1.145 ms) | Fail |
| KNF03-TC03 | KNF03 | Response time | Peta produksi tampil ≤ 3 detik | `curl` ke `GET /api/heatmap` produksi, 6 kali | 1,32 s saat layanan bangun dari tidur; 0,17–0,18 s berikutnya | Pass |
| KNF04-TC01 | KNF04 | Response time | Notifikasi diterima ≤ 5 detik setelah keputusan | Skrip klien SSE: catat waktu dari `POST` keputusan sampai event `notifikasi` diterima, 5 kali | Rata-rata 608 ms, maks 1.053 ms | Pass |
| KNF05-TC01 | KNF05 | Reliability | Tidak ada klaim ganda pada klaim bersamaan | C03-UT06 (5 klaim paralel), E2E UC04 (2 klaim paralel), INT-TC13 | Tepat 1 klaim berhasil, 1 baris di basis data | Pass |
| KNF06-TC01 | KNF06 | Reliability | Toleransi geofencing 10 m dari radius 100 m | C05-UT02, C05-UT03 | 105 m diterima, 115 m ditolak | Pass |
| KNF07-TC01 | KNF07 | Security | Log audit tidak dapat diubah atau dihapus | C06-UT02, INT-TC13, `node tests/nfr-check.mjs` | `UPDATE` dan `DELETE` ditolak *trigger* | Pass |
| KNF08-TC01 | KNF08 | Response time | Leaderboard semua pengguna diperbarui ≤ 10 detik setelah persetujuan | Skrip klien SSE anonim: waktu dari `POST` persetujuan pembersihan sampai event `leaderboard` | 921 ms (1 pengajuan yang tersedia) | Pass |
| KNF09-TC01 | KNF09 | Security | 5 kali gagal masuk mengunci akun 15 menit | C25-UT05 dan E2E "KNF09" | Percobaan ke-5 `ACCOUNT_LOCKED`, sisa kunci ≥ 14 menit, sandi benar tetap ditolak | Pass |
| KNF10-TC01 | KNF10 | Ergonomy | Heatmap dan legenda dapat dipahami tanpa pelatihan | Inspeksi tampilan (UC02-TC01): legenda selalu tampil dengan warna dan label teks, filter berlabel, pesan galat di bawah kolom terkait | Legenda Sehat/Waspada/Berbahaya/Belum diverifikasi beserta penjelasan singkat; belum diuji dengan pengguna awam secara formal | Pass |
| KNF11-TC01 | KNF11 | Availability | Uptime ≥ 99% per bulan | – | Belum diuji. Aplikasi baru berjalan sejak 9 Nov 2026 dan memakai mode *serverless* (tidur saat tidak dipakai), sehingga belum ada data satu bulan | Belum diuji |
| KNF12-TC01 | KNF12 | Portability | Berjalan di browser modern dua tahun terakhir | Uji manual dan otomatis pada Google Chrome desktop, emulator Android 15 (WebView), dan satu ponsel Samsung | Berjalan normal pada ketiganya; Firefox, Safari, dan Edge belum diuji | Pass (sebagian) |

**Penjelasan KNF03-TC02 (Fail).** Waktu eksekusi di basis data hanya 8,1 ms; sisa waktu adalah pengiriman ±18.600 baris dari server Singapura ke laptop di Indonesia melalui internet, dan hasilnya berubah-ubah sesuai jaringan (1.145 ms pada 13 November, 3.576 ms pada 18 November). Di produksi, server aplikasi dan basis data berada pada jaringan privat Railway yang sama, sehingga hambatan ini tidak terjadi (KNF03-TC03). **Rencana perbaikan:** (1) mengulang pengukuran dari dalam jaringan Railway agar sesuai kondisi produksi, dan (2) mengurangi data yang dikirim saat peta diperkecil, yaitu hanya mengirim klaster tanpa titik individu bila jumlah titik di area peta melebihi batas tertentu.

**Rencana KNF11.** Memasang pemantauan uptime (misalnya *health check* `GET /api/health` tiap 5 menit) selama satu bulan penuh, dengan mencatat waktu bangun dari tidur sebagai bagian dari ketersediaan.

<br>

## 4.6 Tangkapan Layar dan Bukti Hasil Pengujian

Keluaran lengkap *test runner* disimpan pada folder [`assets/bukti/`](./assets/bukti/). Tangkapan layar diambil dari server lokal (`http://localhost:8080`, bahasa Indonesia, 1280×800) dengan Google Chrome yang dijalankan otomatis.

Tabel 4.6. Bukti Hasil Pengujian

| ID Pengujian | Bukti Hasil Pengujian |
| :--- | :--- |
| C02-UT01 – C24-UT02 (55 test) | Keluaran `npm run test:unit`: [`unit-test.txt`](./assets/bukti/unit-test.txt) (55 pass, 0 fail) |
| C02, C03, C05, C10, C25, C26 (coverage) | Laporan coverage pada bagian akhir [`unit-test.txt`](./assets/bukti/unit-test.txt). Ringkasan: C02 93,06%, C03 96,64%, C05 100%, C10 98,77%, C25 100%, C26 82,95% (baris) |
| INT-TC01 – INT-TC15 | Keluaran `npm run test:integrasi`: [`integrasi-test.txt`](./assets/bukti/integrasi-test.txt) (15 pass, 0 fail) |
| UC01-TC02, UC01-TC03, UC03-TC01, UC04-TC03, UC05-TC01, UC05-TC02, UC06-TC01, UC08-TC01, KNF09-TC01 | Keluaran `npm test` (E2E): [`e2e-test.txt`](./assets/bukti/e2e-test.txt) (11 pass, 0 fail) |
| UC01-TC01 | <img src="./assets/bukti/uc01-tc01-form-laporan.png" alt="UC01-TC01 form laporan" width="600"> |
| UC02-TC01 | <img src="./assets/bukti/uc02-tc01-heatmap.png" alt="UC02-TC01 heatmap" width="600"> |
| UC02-TC02 | <img src="./assets/bukti/uc02-tc02-filter-berbahaya.png" alt="UC02-TC02 filter Berbahaya" width="600"> |
| UC02-TC03 | <img src="./assets/bukti/uc02-tc03-cari-lokasi.png" alt="UC02-TC03 cari lokasi" width="600"> |
| UC02-TC04 | <img src="./assets/bukti/uc02-tc04-detail-titik.png" alt="UC02-TC04 detail titik" width="600"> |
| UC02-TC05 | <img src="./assets/bukti/uc02-tc05-lokasi-tidak-ditemukan.png" alt="UC02-TC05 lokasi tidak ditemukan" width="600"> |
| UC02-TC06 | <img src="./assets/bukti/uc02-tc06-filter-kosong.png" alt="UC02-TC06 filter kosong" width="600"> |
| UC03-TC01 | <img src="./assets/bukti/uc03-tc01-antrean-laporan.png" alt="UC03-TC01 antrean laporan" width="600"> |
| UC04-TC01 | <img src="./assets/bukti/uc04-tc01-detail-klaim.png" alt="UC04-TC01 tombol klaim" width="600"><br>Setelah klaim, klaim Aktif tampil di menu Pembersihan (gambar UC05-TC01). |
| UC05-TC01 | <img src="./assets/bukti/uc05-tc01-form-pembersihan.png" alt="UC05-TC01 form pembersihan" width="600"> |
| UC06-TC01 | <img src="./assets/bukti/uc06-tc01-daftar-pembersihan.png" alt="UC06-TC01 daftar pengajuan" width="600"><br>Pengajuan demo sudah disetujui saat pengukuran KNF08, sehingga daftar Menunggu kosong; alur persetujuan dibuktikan oleh E2E "UC06 + UC07". |
| UC07-TC01 | <img src="./assets/bukti/uc07-tc01-leaderboard.png" alt="UC07-TC01 leaderboard" width="600"> |
| UC07-TC02 | <img src="./assets/bukti/uc07-tc02-gagal-memuat.png" alt="UC07-TC02 gagal memuat" width="600"><br><img src="./assets/bukti/uc07-tc02-setelah-muat-ulang.png" alt="UC07-TC02 setelah muat ulang" width="600"> |
| UC08-TC01 | <img src="./assets/bukti/uc08-tc01-panel-admin.png" alt="UC08-TC01 panel admin" width="600"> |
| UC08-TC02 | <img src="./assets/bukti/uc08-tc02-gagal-memperbarui.png" alt="UC08-TC02 gagal memperbarui" width="600"><br><img src="./assets/bukti/uc08-tc02-setelah-coba-lagi.png" alt="UC08-TC02 setelah coba lagi" width="600"> |
| KNF03-TC01 – KNF03-TC03, KNF04-TC01, KNF07-TC01, KNF08-TC01 | Keluaran pengukuran: [`knf-pengukuran.txt`](./assets/bukti/knf-pengukuran.txt) |
| KNF01, KNF02, KNF05, KNF06, KNF09 | Lihat test unit terkait pada [`unit-test.txt`](./assets/bukti/unit-test.txt) |

<br>

---

# BAB 5: Traceability

Path relatif terhadap `src/`. Test case E2E disebut dengan nama test pada `server/tests/e2e.test.mjs`.

Tabel 5.1. Matriks Kerunutan KF terhadap Implementasi dan Pengujian

| KF ID | KNF Terkait | Use Case ID | Kelas Terkait | Implementasi File Terkait | Test Case (UC) | Test Case (Unit/Integrasi/KNF) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| KF01 | KNF12 | UC01 | C11 PelaporanView, C17 PelaporanController, C01 LaporanPencemaran | `web/src/pages/Report.jsx`, `server/src/controllers/PelaporanController.js`, `server/src/models/LaporanPencemaran.js` | UC01-TC01, UC01-TC02 | C01-UT01, C01-UT02, INT-TC01, INT-TC02 |
| KF02 | – | UC01 | C11 PelaporanView | `web/src/lib/device.js`, `web/src/pages/Report.jsx` | UC01-TC01 | – |
| KF03 | KNF01 | UC01 | C02 BuktiLaporan, C26 StorageAdapter | `server/src/models/BuktiLaporan.js`, `server/src/services/StorageAdapter.js` | UC01-TC01, UC01-TC03 | C02-UT01 s.d. C02-UT06, C26-UT01 s.d. C26-UT03, INT-TC01, INT-TC02, KNF01-TC01 |
| KF04 | – | UC01 | C02 BuktiLaporan | `server/src/models/BuktiLaporan.js` | UC01-TC01 | C02-UT07, C02-UT08 |
| KF05 | KNF02 | UC01 | C11 PelaporanView, C25 Autentikasi | `web/src/components/Consent.jsx`, `server/src/services/Autentikasi.js` | UC01-TC01 | C25-UT09, KNF02-TC01 |
| KF06 | KNF03, KNF10 | UC02 | C12 HeatmapView, C18 HeatmapController, C10 PetaHeatmap | `web/src/pages/Heatmap.jsx`, `web/src/components/MapView.jsx`, `server/src/controllers/HeatmapController.js`, `server/src/models/PetaHeatmap.js` | UC02-TC01, UC02-TC03, UC02-TC04, UC02-TC05 | C10-UT05, C10-UT06, INT-TC03, INT-TC15, KNF03-TC01 s.d. KNF03-TC03, KNF10-TC01 |
| KF07 | KNF10 | UC02 | C12 HeatmapView, C10 PetaHeatmap | `web/src/pages/Heatmap.jsx`, `server/src/models/PetaHeatmap.js` | UC02-TC02, UC02-TC06 | C10-UT03, C10-UT04, INT-TC04 |
| KF08 | KNF03 | UC02 | C10 PetaHeatmap | `server/src/models/PetaHeatmap.js`, `server/src/services/Pemeliharaan.js` | UC02-TC01 | C10-UT01, C10-UT02, C10-UT07, INT-TC03, KNF03-TC01 |
| KF09 | – | UC03 | C13 DashboardVerifikasiView, C19 VerifikasiController, C01 LaporanPencemaran | `web/src/pages/VerifyReports.jsx`, `server/src/controllers/VerifikasiController.js` | UC03-TC01 | INT-TC05 |
| KF10 | – | UC03 | C19 VerifikasiController, C01 LaporanPencemaran | `server/src/controllers/VerifikasiController.js`, `server/src/models/LaporanPencemaran.js` | UC03-TC01 | C01-UT02, INT-TC05, INT-TC06 |
| KF11 | KNF04 | UC03 | C24 Notifikasi | `server/src/services/Notifikasi.js`, `web/src/api/live.js` | UC03-TC01 | C24-UT01, C24-UT02, INT-TC05, KNF04-TC01 |
| KF12 | KNF05 | UC04 | C12 HeatmapView, C20 KlaimController, C03 KlaimTitikPencemaran | `web/src/pages/Heatmap.jsx`, `server/src/controllers/KlaimController.js`, `server/src/models/KlaimTitikPencemaran.js` | UC04-TC01, UC04-TC02, UC04-TC03 | C03-UT01 s.d. C03-UT09, INT-TC07, INT-TC13, KNF05-TC01 |
| KF13 | – | UC05 | C14 PembersihanView, C21 PembersihanController, C04 LaporanPembersihan | `web/src/pages/Cleanup.jsx`, `server/src/controllers/PembersihanController.js`, `server/src/models/LaporanPembersihan.js` | UC05-TC01 | C04-UT01, C04-UT02 |
| KF14 | KNF06 | UC05 | C05 BuktiPembersihan, C21 PembersihanController | `server/src/models/BuktiPembersihan.js`, `server/src/controllers/PembersihanController.js` | UC05-TC01, UC05-TC02 | C05-UT01 s.d. C05-UT04, INT-TC08, KNF06-TC01 |
| KF15 | – | UC06 | C13 DashboardVerifikasiView, C05 BuktiPembersihan | `web/src/pages/VerifyCleanups.jsx`, `server/src/models/BuktiPembersihan.js` | UC06-TC01 | C05-UT05 |
| KF16 | – | UC06 | C19 VerifikasiController, C04 LaporanPembersihan | `server/src/controllers/VerifikasiController.js`, `server/src/models/LaporanPembersihan.js` | UC06-TC01 | C04-UT02, INT-TC09 |
| KF17 | KNF07 | UC03, UC06 | C06 LogVerifikasi | `server/src/models/LogVerifikasi.js`, `server/src/db/schema.sql` | UC03-TC01, UC06-TC01 | C06-UT01, C06-UT02, INT-TC05, INT-TC09, INT-TC13, KNF07-TC01 |
| KF18 | – | UC07 | C15 LeaderboardView, C22 LeaderboardController, C07 Leaderboard | `web/src/pages/Leaderboard.jsx`, `server/src/controllers/LeaderboardController.js`, `server/src/models/Leaderboard.js` | UC07-TC01, UC07-TC02 | C07-UT01, C07-UT02, INT-TC10 |
| KF19 | KNF08 | UC06, UC07 | C08 AkunRelawan, C07 Leaderboard, C19 VerifikasiController | `server/src/models/AkunRelawan.js`, `server/src/models/Leaderboard.js`, `server/src/controllers/VerifikasiController.js` | UC06-TC01, UC07-TC01 | C08-UT01, INT-TC09, KNF08-TC01 |
| KF20 | KNF09 | UC08 | C16 PanelAdminView, C23 AdminController, C08 AkunRelawan, C25 Autentikasi | `web/src/pages/Admin.jsx`, `server/src/controllers/AdminController.js`, `server/src/models/AkunRelawan.js` | UC08-TC01, UC08-TC02 | C08-UT02, C25-UT06, C25-UT07, INT-TC11, INT-TC12 |
| KF21 | – | UC08 | C23 AdminController, C09 Komunitas | `server/src/controllers/AdminController.js`, `server/src/models/Komunitas.js` | UC08-TC01 | C09-UT01, C09-UT02, INT-TC11 |

Seluruh KF01–KF21 diimplementasikan dan seluruh test case terkaitnya berkesimpulan Pass, sehingga seluruh KF dinyatakan terpenuhi. KF02 diuji melalui use case karena pengambilan GPS terjadi di perangkat (Geolocation API/plugin Capacitor) dan tidak memiliki logika di server.

Tabel 5.2. Matriks Kerunutan KNF terhadap Pengujian

| ID KNF | Parameter | KF/UC Terkait | Test Case |
| :--- | :--- | :--- | :--- |
| KNF01 | Reliability | KF03 / UC01, UC05 | KNF01-TC01 (C26-UT02, C26-UT03) |
| KNF02 | Security | KF05 / UC01 | KNF02-TC01 (C25-UT09) |
| KNF03 | Response time | KF06, KF08 / UC02 | KNF03-TC01, KNF03-TC02 (Fail, lihat 4.5), KNF03-TC03 |
| KNF04 | Response time | KF11 / UC03, UC06 | KNF04-TC01 |
| KNF05 | Reliability | KF12 / UC04 | KNF05-TC01 (C03-UT06, INT-TC13, UC04-TC03) |
| KNF06 | Reliability | KF14 / UC05 | KNF06-TC01 (C05-UT02, C05-UT03) |
| KNF07 | Security | KF17 / UC03, UC06 | KNF07-TC01 (C06-UT02, INT-TC13) |
| KNF08 | Response time | KF19 / UC06, UC07 | KNF08-TC01 |
| KNF09 | Security | KF20 / semua UC (masuk) | KNF09-TC01 (C25-UT05) |
| KNF10 | Ergonomy | KF06, KF07 / UC02 | KNF10-TC01 |
| KNF11 | Availability | – / semua UC | KNF11-TC01 (belum diuji, lihat 4.5) |
| KNF12 | Portability | KF01 / semua UC | KNF12-TC01 (sebagian) |
