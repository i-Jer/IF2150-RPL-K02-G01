-- SeaGuard schema (PostgreSQL 16 + PostGIS). Idempotent: safe to run on every boot.
-- Table/column names follow DPPL 5.0: snake_case of class and attribute names.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SEQUENCE IF NOT EXISTS seq_relawan;
CREATE SEQUENCE IF NOT EXISTS seq_komunitas;
CREATE SEQUENCE IF NOT EXISTS seq_laporan;
CREATE SEQUENCE IF NOT EXISTS seq_klaim;
CREATE SEQUENCE IF NOT EXISTS seq_pembersihan;

-- Human-readable codes (LP-0001 ... LP-9999, then LP-10000): lpad alone would truncate past 9999.
CREATE OR REPLACE FUNCTION kode_berikut(prefix text, seq text) RETURNS text AS $fn$
  SELECT prefix || '-' || CASE WHEN v < 10000 THEN lpad(v::text, 4, '0') ELSE v::text END FROM nextval(seq::regclass) AS v
$fn$ LANGUAGE sql VOLATILE;

-- C09 Komunitas
CREATE TABLE IF NOT EXISTS komunitas (
  id_komunitas        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode                text UNIQUE NOT NULL DEFAULT kode_berikut('KM', 'seq_komunitas'),
  nama_komunitas      text UNIQUE NOT NULL CHECK (char_length(nama_komunitas) BETWEEN 1 AND 100),
  deskripsi_komunitas text NOT NULL DEFAULT '',
  wilayah             text NOT NULL DEFAULT '',
  terverifikasi       boolean NOT NULL DEFAULT false,
  dibuat              timestamptz NOT NULL DEFAULT now(),
  diperbarui          timestamptz NOT NULL DEFAULT now()
);

-- C08 AkunRelawan (+ C25 Autentikasi attributes jumlahGagalLogin, waktuKunci)
CREATE TABLE IF NOT EXISTS akun_relawan (
  id_relawan          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode                text UNIQUE NOT NULL DEFAULT kode_berikut('RL', 'seq_relawan'),
  nama                text NOT NULL CHECK (char_length(nama) BETWEEN 2 AND 80),
  email               text NOT NULL,
  password_hash       text NOT NULL,
  peran               text NOT NULL DEFAULT 'Relawan' CHECK (peran IN ('Relawan', 'Verifikator', 'Admin')),
  status_akun         text NOT NULL DEFAULT 'Aktif' CHECK (status_akun IN ('Aktif', 'Ditangguhkan')),
  total_poin          integer NOT NULL DEFAULT 0 CHECK (total_poin >= 0),
  id_komunitas        uuid REFERENCES komunitas(id_komunitas) ON DELETE SET NULL,
  instansi            text,
  jumlah_gagal_login  integer NOT NULL DEFAULT 0,
  waktu_kunci         timestamptz,
  jumlah_teguran      integer NOT NULL DEFAULT 0,
  bahasa              text NOT NULL DEFAULT 'en' CHECK (bahasa IN ('en', 'id')),
  dibuat              timestamptz NOT NULL DEFAULT now(),
  diperbarui          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_akun_email ON akun_relawan (lower(email));

-- C25 Autentikasi: active sessions (token stored as SHA-256 hash)
CREATE TABLE IF NOT EXISTS sesi (
  id_sesi       text PRIMARY KEY,
  id_relawan    uuid NOT NULL REFERENCES akun_relawan(id_relawan) ON DELETE CASCADE,
  dibuat        timestamptz NOT NULL DEFAULT now(),
  kedaluwarsa   timestamptz NOT NULL,
  perangkat     text
);
CREATE INDEX IF NOT EXISTS ix_sesi_relawan ON sesi (id_relawan);

-- KNF02: consent log (UU PDP)
CREATE TABLE IF NOT EXISTS consent_log (
  id_consent   bigserial PRIMARY KEY,
  id_relawan   uuid NOT NULL REFERENCES akun_relawan(id_relawan) ON DELETE CASCADE,
  jenis        text NOT NULL CHECK (jenis IN ('lokasi_kamera', 'lokasi', 'kamera')),
  keputusan    text NOT NULL CHECK (keputusan IN ('Izinkan', 'Tolak')),
  perangkat    text,
  alamat_ip    text,
  waktu        timestamptz NOT NULL DEFAULT now()
);

-- C01 LaporanPencemaran
CREATE TABLE IF NOT EXISTS laporan_pencemaran (
  id_laporan        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode              text UNIQUE NOT NULL DEFAULT kode_berikut('LP', 'seq_laporan'),
  id_relawan        uuid NOT NULL REFERENCES akun_relawan(id_relawan) ON DELETE CASCADE,
  koordinat_gps     geography(Point, 4326) NOT NULL,
  sumber_koordinat  text NOT NULL DEFAULT 'perangkat' CHECK (sumber_koordinat IN ('perangkat', 'exif', 'manual')),
  indikator_tingkat text NOT NULL CHECK (indikator_tingkat IN ('Sehat', 'Waspada', 'Berbahaya')),
  jenis_sampah      text[] NOT NULL DEFAULT '{}',
  perkiraan_volume  text,
  deskripsi         text NOT NULL DEFAULT '',
  lokasi_nama       text NOT NULL DEFAULT '',
  tanggal_laporan   timestamptz NOT NULL DEFAULT now(),
  status_laporan    text NOT NULL DEFAULT 'Menunggu Verifikasi'
                    CHECK (status_laporan IN ('Menunggu Verifikasi', 'Disetujui', 'Ditolak', 'Diklaim', 'Dibersihkan')),
  catatan_verifikasi text,
  diverifikasi_oleh uuid REFERENCES akun_relawan(id_relawan) ON DELETE SET NULL,
  diverifikasi_pada timestamptz,
  dibersihkan_pada  timestamptz
);
CREATE INDEX IF NOT EXISTS ix_laporan_status ON laporan_pencemaran (status_laporan);
CREATE INDEX IF NOT EXISTS ix_laporan_geo ON laporan_pencemaran USING gist (koordinat_gps);
CREATE INDEX IF NOT EXISTS ix_laporan_relawan ON laporan_pencemaran (id_relawan);

-- C02 BuktiLaporan
CREATE TABLE IF NOT EXISTS bukti_laporan (
  id_bukti      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_laporan    uuid NOT NULL REFERENCES laporan_pencemaran(id_laporan) ON DELETE CASCADE,
  foto_url      text NOT NULL,
  ukuran_file   integer NOT NULL,
  format_file   text NOT NULL,
  metadata_exif jsonb,
  gps_exif      geography(Point, 4326)
);
CREATE INDEX IF NOT EXISTS ix_bukti_laporan ON bukti_laporan (id_laporan);

-- C03 KlaimTitikPencemaran
CREATE TABLE IF NOT EXISTS klaim_titik_pencemaran (
  id_klaim        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode            text UNIQUE NOT NULL DEFAULT kode_berikut('KL', 'seq_klaim'),
  id_laporan      uuid NOT NULL REFERENCES laporan_pencemaran(id_laporan) ON DELETE CASCADE,
  id_relawan      uuid NOT NULL REFERENCES akun_relawan(id_relawan) ON DELETE CASCADE,
  koordinat_titik geography(Point, 4326) NOT NULL,
  wkt_klaim       timestamptz NOT NULL DEFAULT now(),
  batas_waktu     timestamptz NOT NULL,
  status_klaim    text NOT NULL DEFAULT 'Aktif'
                  CHECK (status_klaim IN ('Aktif', 'Menunggu Verifikasi', 'Selesai', 'Dibatalkan', 'Kedaluwarsa')),
  diperbarui      timestamptz NOT NULL DEFAULT now()
);
-- KNF05 second line of defence: one live claim per point and per volunteer.
CREATE UNIQUE INDEX IF NOT EXISTS ux_klaim_laporan_hidup ON klaim_titik_pencemaran (id_laporan)
  WHERE status_klaim IN ('Aktif', 'Menunggu Verifikasi');
CREATE UNIQUE INDEX IF NOT EXISTS ux_klaim_relawan_hidup ON klaim_titik_pencemaran (id_relawan)
  WHERE status_klaim IN ('Aktif', 'Menunggu Verifikasi');

-- C04 LaporanPembersihan
CREATE TABLE IF NOT EXISTS laporan_pembersihan (
  id_pembersihan      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode                text UNIQUE NOT NULL DEFAULT kode_berikut('PB', 'seq_pembersihan'),
  id_klaim            uuid NOT NULL REFERENCES klaim_titik_pencemaran(id_klaim) ON DELETE CASCADE,
  id_relawan          uuid NOT NULL REFERENCES akun_relawan(id_relawan) ON DELETE CASCADE,
  deskripsi_kegiatan  text NOT NULL CHECK (char_length(deskripsi_kegiatan) BETWEEN 10 AND 2000),
  jumlah_peserta      integer NOT NULL DEFAULT 1 CHECK (jumlah_peserta BETWEEN 1 AND 500),
  perkiraan_berat_kg  numeric(8,1),
  tgl_selesai         timestamptz NOT NULL DEFAULT now(),
  status_pembersihan  text NOT NULL DEFAULT 'Menunggu Verifikasi'
                      CHECK (status_pembersihan IN ('Menunggu Verifikasi', 'Disetujui', 'Ditolak')),
  poin_diberikan      integer,
  catatan_verifikasi  text,
  diverifikasi_oleh   uuid REFERENCES akun_relawan(id_relawan) ON DELETE SET NULL,
  diverifikasi_pada   timestamptz
);
CREATE INDEX IF NOT EXISTS ix_pembersihan_status ON laporan_pembersihan (status_pembersihan);

-- C05 BuktiPembersihan
CREATE TABLE IF NOT EXISTS bukti_pembersihan (
  id_bukti_pembersihan uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_pembersihan       uuid NOT NULL UNIQUE REFERENCES laporan_pembersihan(id_pembersihan) ON DELETE CASCADE,
  foto_before_url      text NOT NULL,
  foto_after_url       text NOT NULL,
  gps_before           geography(Point, 4326) NOT NULL,
  gps_after            geography(Point, 4326) NOT NULL,
  sumber_gps_before    text NOT NULL DEFAULT 'perangkat',
  sumber_gps_after     text NOT NULL DEFAULT 'perangkat',
  jarak_before_m       numeric(10,1) NOT NULL,
  jarak_after_m        numeric(10,1) NOT NULL
);

-- C06 LogVerifikasi (KNF07 immutable)
CREATE TABLE IF NOT EXISTS log_verifikasi (
  id_log           bigserial PRIMARY KEY,
  id_verifikator   uuid NOT NULL REFERENCES akun_relawan(id_relawan) ON DELETE RESTRICT,
  jenis_objek      text NOT NULL CHECK (jenis_objek IN ('laporan', 'pembersihan', 'akun', 'komunitas')),
  id_objek         uuid NOT NULL,
  kode_objek       text NOT NULL,
  status_keputusan text NOT NULL,
  catatan          text,
  timestamp        timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION tolak_ubah_log() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'log_verifikasi bersifat immutable (KNF07)';
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_log_no_update ON log_verifikasi;
CREATE TRIGGER trg_log_no_update BEFORE UPDATE OR DELETE ON log_verifikasi
  FOR EACH ROW EXECUTE FUNCTION tolak_ubah_log();

-- R18: warnings issued to accounts for manipulated evidence
CREATE TABLE IF NOT EXISTS teguran (
  id_teguran     bigserial PRIMARY KEY,
  id_relawan     uuid NOT NULL REFERENCES akun_relawan(id_relawan) ON DELETE CASCADE,
  id_verifikator uuid NOT NULL REFERENCES akun_relawan(id_relawan) ON DELETE RESTRICT,
  alasan         text NOT NULL,
  kode_objek     text,
  dibuat         timestamptz NOT NULL DEFAULT now()
);

-- Points ledger (feeds period leaderboards; total_poin stays the source of truth for UC07)
CREATE TABLE IF NOT EXISTS riwayat_poin (
  id_riwayat     bigserial PRIMARY KEY,
  id_relawan     uuid NOT NULL REFERENCES akun_relawan(id_relawan) ON DELETE CASCADE,
  id_pembersihan uuid REFERENCES laporan_pembersihan(id_pembersihan) ON DELETE SET NULL,
  poin           integer NOT NULL,
  dibuat         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_riwayat_relawan ON riwayat_poin (id_relawan, dibuat);

-- C10 PetaHeatmap: cached clusters (recomputed by hitungHeatIntensity)
CREATE TABLE IF NOT EXISTS peta_heatmap (
  id_klaster          integer PRIMARY KEY,
  koordinat_pusat     geography(Point, 4326) NOT NULL,
  heat_intensity      numeric(8,2) NOT NULL,
  kategori_kualitas   text NOT NULL,
  jumlah_laporan      integer NOT NULL,
  rata_rata_keparahan numeric(4,2) NOT NULL,
  rata_rata_hari      numeric(8,2) NOT NULL,
  dihitung_pada       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_heatmap_geo ON peta_heatmap USING gist (koordinat_pusat);
ALTER TABLE laporan_pencemaran ADD COLUMN IF NOT EXISTS id_klaster integer;

-- C07 Leaderboard (singleton row holding tglPembaruan)
CREATE TABLE IF NOT EXISTS leaderboard (
  id_leaderboard integer PRIMARY KEY DEFAULT 1 CHECK (id_leaderboard = 1),
  tgl_pembaruan  timestamptz NOT NULL DEFAULT now()
);
INSERT INTO leaderboard (id_leaderboard) VALUES (1) ON CONFLICT DO NOTHING;

-- C24 Notifikasi
CREATE TABLE IF NOT EXISTS notifikasi (
  id_notifikasi bigserial PRIMARY KEY,
  id_relawan    uuid NOT NULL REFERENCES akun_relawan(id_relawan) ON DELETE CASCADE,
  jenis         text NOT NULL,
  judul         text NOT NULL,
  pesan         text NOT NULL,
  tautan        text,
  data          jsonb,
  dibaca        boolean NOT NULL DEFAULT false,
  dibuat        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_notifikasi_relawan ON notifikasi (id_relawan, dibuat DESC);

-- App releases for the in-app updater (OTA web bundles and native APKs)
CREATE TABLE IF NOT EXISTS rilis_aplikasi (
  id_rilis      bigserial PRIMARY KEY,
  jenis         text NOT NULL CHECK (jenis IN ('bundle', 'native')),
  versi         text NOT NULL,
  kode_versi    integer NOT NULL DEFAULT 0,
  catatan       text NOT NULL DEFAULT '',
  berkas        text NOT NULL,
  checksum      text,
  wajib         boolean NOT NULL DEFAULT false,
  dibuat        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jenis, versi)
);

-- Keep defaults current on databases created before kode_berikut existed.
ALTER TABLE komunitas ALTER COLUMN kode SET DEFAULT kode_berikut('KM', 'seq_komunitas');
ALTER TABLE akun_relawan ALTER COLUMN kode SET DEFAULT kode_berikut('RL', 'seq_relawan');
ALTER TABLE laporan_pencemaran ALTER COLUMN kode SET DEFAULT kode_berikut('LP', 'seq_laporan');
ALTER TABLE klaim_titik_pencemaran ALTER COLUMN kode SET DEFAULT kode_berikut('KL', 'seq_klaim');
ALTER TABLE laporan_pembersihan ALTER COLUMN kode SET DEFAULT kode_berikut('PB', 'seq_pembersihan');
