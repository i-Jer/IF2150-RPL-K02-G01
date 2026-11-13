# SeaGuard: source code

SeaGuard is a platform for reporting, verifying, claiming and cleaning marine litter hotspots along Indonesia's coasts (IF2150 RPL, K02 G01 "Swike Karang Anyar"). It implements all 8 use cases (UC01 to UC08), the 21 functional requirements (KF01 to KF21) and the testable non-functional requirements (KNF01 to KNF12) from the SKPL/DPPL in `docs/`.

- **Web app:** https://seaguard-app-production.up.railway.app
- **Android APK:** https://seaguard-app-production.up.railway.app/download (the app updates itself; see "App updates")

## 1. Architecture

MVC on a client-server web architecture, as designed in DPPL (docs/M7, docs/M8).

| Layer | Where | Notes |
|---|---|---|
| View (C11 to C16) | `web/src/pages/*.jsx` | React 19 + Vite. One codebase for the website and the Android app (Capacitor 8). |
| Controller (C17 to C23) | `server/src/controllers/*.js` | Express 5. Every route runs `Autentikasi.cekSesiDanPeran` (Algo-005) first. |
| Model (C01 to C10) | `server/src/models/*.js` | PostgreSQL 16 + PostGIS 3.4. Operation names follow DPPL (e.g. `kunciTitikLokasi`, `validasiGeofencingRadius`). |
| Notifikasi (C24) | `server/src/services/Notifikasi.js` | Server-Sent Events + `notifikasi` table. |
| Autentikasi (C25) | `server/src/services/Autentikasi.js` | bcrypt, HttpOnly session cookie (web) or Bearer token (app), lockout after 5 failures. |
| StorageAdapter (C26) | `server/src/services/StorageAdapter.js` | S3-compatible Railway bucket, 3 retries (KNF01). |

Hosting (Railway project "SeaGuard"): `seaguard-app` (this Docker image), `PostGIS` (database), `seaguard-media` (bucket for photos).

### Key algorithms and where they live

| DPPL | Implementation |
|---|---|
| Algo-001 photo format/size | `BuktiLaporan.validasiFormatUkuran` (JPG/PNG, at most 5 MB, magic-byte check) |
| Algo-002 heat intensity, Q-001 | `PetaHeatmap.hitungHeatIntensity`: `ST_ClusterDBSCAN` (eps 500 m), heat = 6 x reports + 12 x avg severity + 1.5 x avg days open |
| Algo-003 claim locking, Q-002/Q-003 | `KlaimTitikPencemaran.kunciTitikLokasi`: `SELECT ... FOR UPDATE` + partial unique indexes |
| Algo-004 geofencing, Q-004 | `BuktiPembersihan.validasiGeofencingRadius`: `ST_Distance` on geography, 100 m + 10 m tolerance (KNF06); photo EXIF GPS preferred |
| Algo-005 session and role | `Autentikasi.cekSesiDanPeran` |
| Algo-006 cleanup verification | `VerifikasiController.prosesVerifikasiPembersihan` (one transaction) |
| Algo-007 points, Q-006/Q-007 | `AkunRelawan.tambahSkorPoin`: points = max(1, round(heat of the cluster)) |
| Algo-008 ranking, Q-008 | `Leaderboard.hitungUlangPeringkat` / `getDaftarPeringkat` (`RANK() OVER`) |
| Algo-009 audit log, Q-009 | `LogVerifikasi`; DB trigger rejects UPDATE/DELETE (KNF07) |

## 2. Running locally

No account or cloud service is needed. Requirements: Node.js 20 or newer, and Docker (for the database). Photos are stored in `server/uploads/` when no bucket is configured.

1. Start PostgreSQL 16 + PostGIS 3.4 (from `src/`):

   ```bash
   docker compose up -d
   ```

   Already have PostgreSQL with PostGIS installed? Skip this step and point `DATABASE_URL` at it instead.

2. Install, configure and build:

   ```bash
   cd src/server && npm install && cp .env.example .env
   cd ../web && npm install && npx vite build
   ```

   `.env.example` already matches the Docker database. Set `SEED_ADMIN_PASSWORD` there to choose the admin password.

3. Start the API, which also serves the built web app:

   ```bash
   cd src/server && npm start
   ```

   Open http://localhost:8080. On first start the schema is applied and fictional demo data is seeded (section 4).

For live-reload UI work, keep the API running and run `cd src/web && npm run dev` (Vite on :5173, proxies `/api` to :8080).

Team members with the Railway CLI can instead run `railway run --service PostGIS -- node scripts/dev-server.mjs`, which uses a separate `seaguard_dev` database on the Railway PostGIS server.

## 3. Tests

With the API running (section 2):

```bash
cd src/server
npm test              # 11 end-to-end tests against BASE_URL (default http://localhost:8080)
npm run profile       # heatmap profiling with 10,000 points (KNF03), in a scratch database it creates and drops
node tests/nfr-check.mjs   # KNF07 immutable audit log + KNF03 timing, also in a scratch database
```

`npm run profile` and `nfr-check.mjs` read `DATABASE_URL` from the environment (for example `DATABASE_URL=postgres://seaguard:seaguard@localhost:5432/seaguard npm run profile`). The tests sign in many times, so run `npm test` against a freshly started server: sign-in is rate-limited to 40 attempts per 15 minutes per address.

The end-to-end suite covers sign-up and login, the 5-attempt lockout (KNF09), RBAC (401/403), UC01 with invalid photo and outside-Indonesia location (R02), UC03 approve with audit log and notification, UC02 filters/empty filter/location not found, UC04 with two simultaneous claims (exactly one succeeds, KNF05), UC05 geofence reject/accept, UC06/UC07 points and ranking, and UC08 with the R24 institution rule.

## 4. Demo accounts

All demo people, communities and reports are fictional. Photos in the demo data are generated images.

| Role | Email | Password |
|---|---|---|
| Relawan | `relawan1@seaguard.test` | `Relawan123!` |
| Relawan (has a cleanup waiting for review) | `relawan2@seaguard.test` | `Relawan123!` |
| Verifikator | `verifikator@seaguard.test` | `Verifikator123!` |
| Admin | `admin@seaguard.test` | set with the `SEED_ADMIN_PASSWORD` variable on Railway |

Anyone can create a Relawan account from the sign-in screen. Verifikator and Admin roles are granted in the admin panel and require a confirmed institution (R24).

## 5. Android app and updates

- Built from the same React code with Capacitor 8 (`web/android`). Uses the device GPS and camera; asks for consent first (KF05, KNF02).
- **Web bundle updates (no re-download):** every deploy builds an OTA bundle (`/release/bundle-<version>.zip`, described by `/release/bundle.json`). On launch and when resumed, the app calls `GET /api/app/versi`, downloads a newer bundle in the background with `@capgo/capacitor-updater` (self-hosted, manual mode), and asks the user to restart into it. A bundle that fails to start rolls back automatically.
- **Native updates (rare, only when native plugins change):** bump `version` in `web/package.json`, run `node scripts/build-apk.mjs`, and deploy. The app sees the higher `versionCode` in `native.json` and offers the new APK.

Build the APK (needs JDK 21 and the Android SDK; the script defaults to `%LOCALAPPDATA%\seaguard-buildtools`):

```bash
cd src/web
node scripts/build-apk.mjs     # web build, OTA bundle, cap sync, signed release APK -> ../server/release
```

The release keystore lives outside the repository (`%LOCALAPPDATA%\seaguard-buildtools\seaguard-release.jks`, referenced by the git-ignored `android/keystore.properties`). Keep it: future APKs must be signed with the same key to install over the old one.

## 6. Deploying

From `src/`, with the Railway CLI linked to project SeaGuard, service `seaguard-app`:

```bash
railway up --service seaguard-app
```

The Dockerfile builds the web client and the OTA bundle, then the API image. Configuration (all set on Railway): `DATABASE_URL`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (references to the PostGIS service and the bucket), `JWT_SECRET`, `PUBLIC_URL`, `PORT=8080`, `SEED_ADMIN_PASSWORD`.

## 7. External services

- Map tiles: OpenFreeMap (OpenStreetMap data), no API key.
- Place search suggestions: Photon (OpenStreetMap search, built for type-ahead), with Nominatim as fallback and a built-in gazetteer of Indonesian coastal places. Common abbreviations are expanded first (BSD, PIK, Jaksel, Tangsel, Jogja, NTT and others).
- Reverse lookup (naming a reported place, rejecting points outside Indonesia): OpenStreetMap Nominatim, 1 request per second, cached.

None of these need an account or API key.

## 8. Database tables

Full definitions, indexes, triggers and the `kode_berikut` code generator are in `server/src/db/schema.sql`. Coordinates are PostGIS `geography(Point, 4326)`.

| Table | Columns |
|---|---|
| `komunitas` | `id_komunitas`, `kode`, `nama_komunitas`, `deskripsi_komunitas`, `wilayah`, `terverifikasi`, `dibuat`, `diperbarui` |
| `akun_relawan` | `id_relawan`, `kode`, `nama`, `email`, `password_hash`, `peran`, `status_akun`, `total_poin`, `id_komunitas`, `instansi`, `jumlah_gagal_login`, `waktu_kunci`, `jumlah_teguran`, `bahasa`, `dibuat`, `diperbarui` |
| `sesi` | `id_sesi`, `id_relawan`, `dibuat`, `kedaluwarsa`, `perangkat` |
| `consent_log` | `id_consent`, `id_relawan`, `jenis`, `keputusan`, `perangkat`, `alamat_ip`, `waktu` |
| `laporan_pencemaran` | `id_laporan`, `kode`, `id_relawan`, `koordinat_gps`, `sumber_koordinat`, `indikator_tingkat`, `jenis_sampah`, `perkiraan_volume`, `deskripsi`, `lokasi_nama`, `tanggal_laporan`, `status_laporan`, `catatan_verifikasi`, `diverifikasi_oleh`, `diverifikasi_pada`, `dibersihkan_pada` |
| `bukti_laporan` | `id_bukti`, `id_laporan`, `foto_url`, `ukuran_file`, `format_file`, `metadata_exif`, `gps_exif` |
| `klaim_titik_pencemaran` | `id_klaim`, `kode`, `id_laporan`, `id_relawan`, `koordinat_titik`, `wkt_klaim`, `batas_waktu`, `status_klaim`, `diperbarui` |
| `laporan_pembersihan` | `id_pembersihan`, `kode`, `id_klaim`, `id_relawan`, `deskripsi_kegiatan`, `jumlah_peserta`, `perkiraan_berat_kg`, `tgl_selesai`, `status_pembersihan`, `poin_diberikan`, `catatan_verifikasi`, `diverifikasi_oleh`, `diverifikasi_pada` |
| `bukti_pembersihan` | `id_bukti_pembersihan`, `id_pembersihan`, `foto_before_url`, `foto_after_url`, `gps_before`, `gps_after`, `sumber_gps_before`, `sumber_gps_after`, `jarak_before_m`, `jarak_after_m` |
| `log_verifikasi` | `id_log`, `id_verifikator`, `jenis_objek`, `id_objek`, `kode_objek`, `status_keputusan`, `catatan`, `timestamp` (UPDATE/DELETE blocked by trigger) |
| `teguran` | `id_teguran`, `id_relawan`, `id_verifikator`, `alasan`, `kode_objek`, `dibuat` |
| `riwayat_poin` | `id_riwayat`, `id_relawan`, `id_pembersihan`, `poin`, `dibuat` |
| `peta_heatmap` | `id_klaster`, `koordinat_pusat`, `heat_intensity`, `kategori_kualitas`, `jumlah_laporan`, `rata_rata_keparahan`, `rata_rata_hari`, `dihitung_pada` |
| `leaderboard` | `id_leaderboard`, `tgl_pembaruan` |
| `notifikasi` | `id_notifikasi`, `id_relawan`, `jenis`, `judul`, `pesan`, `tautan`, `data`, `dibaca`, `dibuat` |
| `rilis_aplikasi` | `id_rilis`, `jenis`, `versi`, `kode_versi`, `catatan`, `berkas`, `wajib`, `dibuat` |

## 9. Modules and team

| Member | Modules |
|---|---|
| 13525104 Jeremy Gerald Sutanto | UC02 heatmap and UC04 claims: `PetaHeatmap`, `KlaimTitikPencemaran`, `HeatmapController`, `KlaimController`, `Geocoder`, `pages/Heatmap.jsx`, `components/MapView.jsx`; heatmap profiling |
| 13525116 Christian Immanuel | UC01 reporting: `LaporanPencemaran`, `BuktiLaporan`, `PelaporanController`, `StorageAdapter`, `pages/Report.jsx`, consent dialog |
| 13525014 Denzel Santoso | UC03 and UC06 verification: `VerifikasiController`, `LogVerifikasi`, `Notifikasi` (SSE), `pages/VerifyReports.jsx`, `pages/VerifyCleanups.jsx`, audit log page |
| 13525011 Raihan | UC05 cleanup and UC07 leaderboard: `LaporanPembersihan`, `BuktiPembersihan`, `Leaderboard`, `PembersihanController`, `LeaderboardController`, `pages/Cleanup.jsx`, `pages/Leaderboard.jsx` |
| 13525125 Peter Emmanuel Suwardy | UC08 administration and accounts: `AkunRelawan`, `Komunitas`, `Autentikasi`, `AdminController`, `pages/Admin.jsx`, sign-in pages; database schema, demo data and end-to-end tests |
