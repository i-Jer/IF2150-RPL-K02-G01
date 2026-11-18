// Integration tests (HIUPL section 4.3): Controller -> Model with a real database, the database
// itself, and the external services (object storage, Photon/Nominatim). No mocks.
//   npm run test:integrasi
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { siapkanDb, relawanBaru, laporanDisetujui } from './bantuan-db.mjs';

const { pool, akun, bersihkan } = await siapkanDb('seaguard_uji_int');
after(bersihkan);

const { PelaporanController } = await import('../src/controllers/PelaporanController.js');
const { HeatmapController } = await import('../src/controllers/HeatmapController.js');
const { VerifikasiController } = await import('../src/controllers/VerifikasiController.js');
const { KlaimController } = await import('../src/controllers/KlaimController.js');
const { PembersihanController } = await import('../src/controllers/PembersihanController.js');
const { LeaderboardController } = await import('../src/controllers/LeaderboardController.js');
const { AdminController } = await import('../src/controllers/AdminController.js');
const { LaporanPencemaran } = await import('../src/models/LaporanPencemaran.js');
const { AkunRelawan } = await import('../src/models/AkunRelawan.js');
const { storage } = await import('../src/services/StorageAdapter.js');
const { Pemeliharaan } = await import('../src/services/Pemeliharaan.js');
const { gambarDemo } = await import('../src/db/demoImage.js');

const png = gambarDemo({ width: 32, height: 24, seed: 5 });
const kode = async (fn) => { try { await fn(); } catch (e) { return e.code; } return 'TIDAK_GAGAL'; };
const satu = async (sql, p) => (await pool.query(sql, p)).rows[0];

test('INT-TC01 IA-01 PelaporanController -> LaporanPencemaran, BuktiLaporan, StorageAdapter: laporan tersimpan beserta foto', async () => {
  const r = await PelaporanController.prosesLaporan(akun.relawan1, { lat: '-6.1065', lon: '106.7745', indikatorTingkat: 'Berbahaya', jenisSampah: 'plastik' },
    { buffer: png, mimetype: 'image/png', size: png.length, originalname: 'a.png' });
  const lap = await satu('SELECT status_laporan FROM laporan_pencemaran WHERE id_laporan = $1', [r.idLaporan]);
  const bukti = await satu('SELECT foto_url FROM bukti_laporan WHERE id_laporan = $1', [r.idLaporan]);
  assert.equal(lap.status_laporan, 'Menunggu Verifikasi');
  assert.ok((await storage.baca(bukti.foto_url)).buffer.equals(png));
});
test('INT-TC02 IA-01 PelaporanController: foto tidak valid dan lokasi di luar Indonesia ditolak, tidak ada baris tersimpan', async () => {
  const n = async () => (await satu('SELECT count(*)::int n FROM laporan_pencemaran')).n;
  const awal = await n();
  assert.equal(await kode(() => PelaporanController.prosesLaporan(akun.relawan1, { lat: '-6.1', lon: '106.7', indikatorTingkat: 'Sehat' },
    { buffer: Buffer.from('teks'), mimetype: 'image/png', size: 4 })), 'PHOTO_FORMAT');
  assert.equal(await kode(() => PelaporanController.validasiWilayah({ lat: 1.29, lon: 103.85 })), 'OUTSIDE_INDONESIA');
  assert.equal(await n(), awal);
});
test('INT-TC03 IA-02 HeatmapController -> PetaHeatmap, LaporanPencemaran: data peta, ringkasan, dan papan hotspot', async () => {
  await Pemeliharaan.pastikanHeatSegar(); // what the GET /heatmap route runs first
  const d = await HeatmapController.ambilDataHeatmap({});
  assert.ok(d.titik.length > 0 && d.klaster.length > 0 && d.papan.length > 0);
  assert.equal(d.ringkasan.aktif, d.titik.length);
});
test('INT-TC04 IA-02 HeatmapController: filter kosong mengembalikan pesan "tidak ada data"', async () => {
  const f = await HeatmapController.terapkanFilter({ kategori: '' });
  assert.equal(f.kosong, true);
  assert.equal(f.pesan.code, 'FILTER_EMPTY');
});
test('INT-TC05 IA-03 VerifikasiController -> LaporanPencemaran, LogVerifikasi, Notifikasi: persetujuan tercatat di tiga tabel', async () => {
  const { rows } = await pool.query(`SELECT id_laporan, id_relawan FROM laporan_pencemaran WHERE status_laporan = 'Menunggu Verifikasi' LIMIT 1`);
  const { id_laporan: id, id_relawan: pemilik } = rows[0];
  await VerifikasiController.prosesVerifikasiLaporan(akun.verif, id, { keputusan: 'Disetujui' });
  assert.equal((await satu('SELECT status_laporan FROM laporan_pencemaran WHERE id_laporan = $1', [id])).status_laporan, 'Disetujui');
  assert.ok(await satu(`SELECT 1 FROM log_verifikasi WHERE id_objek = $1 AND status_keputusan = 'Disetujui'`, [id]));
  assert.ok(await satu(`SELECT 1 FROM notifikasi WHERE id_relawan = $1 AND jenis = 'laporan_disetujui'`, [pemilik]));
  assert.ok(await satu('SELECT 1 FROM laporan_pencemaran WHERE id_laporan = $1 AND id_klaster IS NOT NULL', [id]));
});
test('INT-TC06 IA-03 VerifikasiController: keputusan kedua pada laporan yang sama ditolak tanpa log baru', async () => {
  const id = await laporanDisetujui(LaporanPencemaran, akun.relawan1.idRelawan, akun.verif.idRelawan, -7.0, 110.4);
  const n = async () => (await satu('SELECT count(*)::int n FROM log_verifikasi WHERE id_objek = $1', [id])).n;
  assert.equal(await kode(() => VerifikasiController.prosesVerifikasiLaporan(akun.verif, id, { keputusan: 'Ditolak', catatan: 'Foto buram sekali' })), 'ALREADY_DECIDED');
  assert.equal(await n(), 0);
});
test('INT-TC07 IA-04 KlaimController -> KlaimTitikPencemaran: klaim mengunci titik lalu dapat dilepas', async () => {
  const r = await relawanBaru(AkunRelawan);
  const a = { idRelawan: r.idRelawan, peran: 'Relawan' };
  const id = await laporanDisetujui(LaporanPencemaran, r.idRelawan, akun.verif.idRelawan, -7.1, 110.4);
  assert.equal((await KlaimController.ambilDetailTitikKlaim(a, id)).bisaKlaim, true);
  const k = await KlaimController.klaimTitik(a, id);
  assert.equal(k.statusKlaim, 'Aktif');
  assert.equal((await KlaimController.ambilDetailTitikKlaim(a, id)).milikSaya, true);
  assert.equal((await KlaimController.batalkan(a)).statusKlaim, 'Dibatalkan');
});
test('INT-TC08 IA-05 PembersihanController -> KlaimTitikPencemaran, BuktiPembersihan: geofencing memakai titik klaim', async () => {
  const r = await relawanBaru(AkunRelawan);
  const a = { idRelawan: r.idRelawan, peran: 'Relawan' };
  assert.equal(await kode(() => PembersihanController.validasiBukti(a, { latBefore: -7.2, lonBefore: 110.4, latAfter: -7.2, lonAfter: 110.4 })), 'NO_ACTIVE_CLAIM');
  const id = await laporanDisetujui(LaporanPencemaran, r.idRelawan, akun.verif.idRelawan, -7.2, 110.4);
  await KlaimController.klaimTitik(a, id);
  assert.equal((await PembersihanController.validasiBukti(a, { latBefore: -7.2004, lonBefore: 110.4, latAfter: -7.2, lonAfter: 110.4003 })).valid, true);
  assert.equal((await PembersihanController.validasiBukti(a, { latBefore: -7.203, lonBefore: 110.4, latAfter: -7.2, lonAfter: 110.4 })).valid, false);
});
test('INT-TC09 IA-06 VerifikasiController -> LaporanPembersihan, AkunRelawan, Leaderboard: persetujuan menambah poin dan menyelesaikan klaim', async () => {
  const p = await satu(`SELECT id_pembersihan, id_relawan, id_klaim FROM laporan_pembersihan WHERE status_pembersihan = 'Menunggu Verifikasi' LIMIT 1`);
  const sebelum = (await satu('SELECT total_poin FROM akun_relawan WHERE id_relawan = $1', [p.id_relawan])).total_poin;
  const r = await VerifikasiController.prosesVerifikasiPembersihan(akun.verif, p.id_pembersihan, { keputusan: 'Disetujui' });
  assert.equal((await satu('SELECT total_poin FROM akun_relawan WHERE id_relawan = $1', [p.id_relawan])).total_poin, sebelum + r.poin);
  assert.equal((await satu('SELECT status_klaim FROM klaim_titik_pencemaran WHERE id_klaim = $1', [p.id_klaim])).status_klaim, 'Selesai');
  assert.ok(await satu(`SELECT 1 FROM log_verifikasi WHERE id_objek = $1 AND jenis_objek = 'pembersihan'`, [p.id_pembersihan]));
});
test('INT-TC10 IA-07 LeaderboardController -> Leaderboard: posisi pengguna dan daftar peringkat', async () => {
  const l = await LeaderboardController.ambilLeaderboard(akun.relawan1, {});
  assert.ok(l.posisi.peringkat >= 1 && l.tglPembaruan);
  const d = await LeaderboardController.ambilDaftarPeringkat({});
  assert.ok(d.daftar.length > 0);
});
test('INT-TC11 IA-08 AdminController -> AkunRelawan, Komunitas, LogVerifikasi: penangguhan dan pembaruan komunitas tercatat', async () => {
  const r = await relawanBaru(AkunRelawan);
  await AdminController.prosesPerubahanData(akun.admin, r.idRelawan, 'akun', { statusAkun: 'Ditangguhkan' });
  assert.equal((await AkunRelawan.getDetailAkun(r.idRelawan)).statusAkun, 'Ditangguhkan');
  const k = (await AdminController.ambilDataAkunDanKomunitas({})).daftarKomunitas[0];
  await AdminController.prosesPerubahanData(akun.admin, k.idKomunitas, 'komunitas', { namaKomunitas: 'Komunitas Integrasi' });
  assert.ok(await satu(`SELECT 1 FROM log_verifikasi WHERE id_objek = $1 AND jenis_objek = 'komunitas'`, [k.idKomunitas]));
});
test('INT-TC12 IA-08 AdminController: Admin tidak dapat mengubah perannya sendiri; Verifikator wajib instansi', async () => {
  assert.equal(await kode(() => AdminController.prosesPerubahanData(akun.admin, akun.admin.idRelawan, 'akun', { peran: 'Relawan' })), 'SELF_ROLE');
  assert.equal(await kode(() => AdminController.prosesPerubahanData(akun.admin, akun.relawan1.idRelawan, 'akun', { peran: 'Verifikator' })), 'INSTITUTION_REQUIRED');
});
test('INT-TC13 IA-09 Model -> Database: log audit tidak dapat diubah/dihapus, satu relawan satu klaim aktif', async () => {
  await assert.rejects(pool.query('DELETE FROM log_verifikasi'));
  const k = await satu(`SELECT id_relawan, id_laporan FROM klaim_titik_pencemaran WHERE status_klaim = 'Aktif' LIMIT 1`);
  const lain = await satu(`SELECT id_laporan FROM laporan_pencemaran WHERE status_laporan = 'Disetujui' LIMIT 1`);
  await assert.rejects(pool.query(`INSERT INTO klaim_titik_pencemaran (id_laporan, id_relawan, koordinat_titik, batas_waktu, status_klaim)
    SELECT $1, $2, koordinat_gps, now(), 'Aktif' FROM laporan_pencemaran WHERE id_laporan = $1`, [lain.id_laporan, k.id_relawan]), { code: '23505' });
});
test('INT-TC14 IA-10 StorageAdapter -> penyimpanan objek: unggah lalu baca berkas yang sama', async () => {
  const key = await storage.unggahFoto({ buffer: png, format: 'png' }, 'uji');
  assert.ok((await storage.baca(key)).buffer.equals(png));
});
test('INT-TC15 IA-11 HeatmapController -> Geocoder (Photon/Nominatim): "BSD" ditemukan di Tangerang; teks acak tidak ditemukan', async () => {
  const r = await HeatmapController.cariLokasi('BSD');
  assert.ok(r.lat < -6.2 && r.lat > -6.4 && r.lon > 106.6 && r.lon < 106.8, JSON.stringify(r));
  assert.equal(await kode(() => HeatmapController.cariLokasi('zzqqxx nowhere')), 'LOCATION_NOT_FOUND');
});
