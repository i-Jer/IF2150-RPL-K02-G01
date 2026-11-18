// Unit tests for the design classes (HIUPL section 4.2). Each test name starts with its test-case ID.
// Runs against a scratch database (see bantuan-db.mjs):  npm run test:unit
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { siapkanDb, relawanBaru, laporanDisetujui } from './bantuan-db.mjs';

const { pool, akun, bersihkan } = await siapkanDb('seaguard_uji_unit');
after(bersihkan);

const { BuktiLaporan } = await import('../src/models/BuktiLaporan.js');
const { KlaimTitikPencemaran } = await import('../src/models/KlaimTitikPencemaran.js');
const { BuktiPembersihan } = await import('../src/models/BuktiPembersihan.js');
const { PetaHeatmap } = await import('../src/models/PetaHeatmap.js');
const { LaporanPencemaran } = await import('../src/models/LaporanPencemaran.js');
const { LaporanPembersihan } = await import('../src/models/LaporanPembersihan.js');
const { LogVerifikasi } = await import('../src/models/LogVerifikasi.js');
const { Leaderboard } = await import('../src/models/Leaderboard.js');
const { AkunRelawan } = await import('../src/models/AkunRelawan.js');
const { Komunitas } = await import('../src/models/Komunitas.js');
const { Autentikasi, validasiPassword, hashPassword } = await import('../src/services/Autentikasi.js');
const { StorageAdapter } = await import('../src/services/StorageAdapter.js');
const { Notifikasi } = await import('../src/services/Notifikasi.js');
const { gambarDemo } = await import('../src/db/demoImage.js');

const MB5 = 5 * 1024 * 1024;
const png = gambarDemo({ width: 32, height: 24, seed: 3 });
const jpeg = (size) => { const b = Buffer.alloc(16); b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; return { buffer: b, mimetype: 'image/jpeg', size }; };
const kode = async (fn) => { try { await fn(); } catch (e) { return e.code; } return 'TIDAK_GAGAL'; };
const statusLaporan = async (id) => (await pool.query('SELECT status_laporan FROM laporan_pencemaran WHERE id_laporan = $1', [id])).rows[0].status_laporan;

// ---------- C02 BuktiLaporan (Mendalam) ----------
test('C02-UT01 validasiFormatUkuran: foto PNG valid diterima', () => {
  assert.deepEqual(BuktiLaporan.validasiFormatUkuran({ buffer: png, mimetype: 'image/png', size: png.length }), { valid: true, format: 'png' });
});
test('C02-UT02 validasiFormatUkuran: JPG tepat 5 MB diterima (batas)', () => {
  assert.deepEqual(BuktiLaporan.validasiFormatUkuran(jpeg(MB5)), { valid: true, format: 'jpg' });
});
test('C02-UT03 validasiFormatUkuran: 5 MB + 1 byte ditolak (batas)', () => {
  assert.equal(BuktiLaporan.validasiFormatUkuran(jpeg(MB5 + 1)).code, 'PHOTO_TOO_LARGE');
});
test('C02-UT04 validasiFormatUkuran: format GIF ditolak', () => {
  assert.equal(BuktiLaporan.validasiFormatUkuran({ buffer: png, mimetype: 'image/gif', size: 10 }).code, 'PHOTO_FORMAT');
});
test('C02-UT05 validasiFormatUkuran: berkas teks berlabel PNG ditolak (magic bytes)', () => {
  assert.equal(BuktiLaporan.validasiFormatUkuran({ buffer: Buffer.from('bukan gambar sama sekali'), mimetype: 'image/png', size: 24 }).code, 'PHOTO_FORMAT');
});
test('C02-UT06 validasiFormatUkuran: tanpa foto ditolak', () => {
  assert.equal(BuktiLaporan.validasiFormatUkuran(null).code, 'PHOTO_MISSING');
});
test('C02-UT07 ekstrakMetadataEXIF: foto tanpa EXIF dan berkas rusak menghasilkan null', async () => {
  assert.equal(await BuktiLaporan.ekstrakMetadataEXIF({ buffer: png }), null);
  assert.equal(await BuktiLaporan.ekstrakMetadataEXIF({ buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0, 4, 1, 2]) }), null);
});
test('C02-UT08 simpanBukti + getDetailBukti: metadata GPS tersimpan dan jarak EXIF dihitung', async () => {
  const r = await relawanBaru(AkunRelawan);
  const { id_laporan: id } = await LaporanPencemaran.simpanLaporan(LaporanPencemaran.buatLaporan(r.idRelawan, { lat: -6.2, lon: 106.8 }, 'Sehat'));
  await BuktiLaporan.simpanBukti(id, 'bukti/a.png', { lat: -6.201, lon: 106.8 }, 1000, 'png');
  await BuktiLaporan.simpanBukti(id, 'bukti/b.png', null, 1000, 'png');
  const d = await BuktiLaporan.getDetailBukti(id);
  assert.equal(d.length, 2);
  const jarak = d.map((x) => x.jarakExifM).sort();
  assert.ok(Math.abs(jarak[0] - 110.6) < 2, `jarak ${jarak[0]}`);
  assert.equal(jarak[1], null);
});

// ---------- C03 KlaimTitikPencemaran (Mendalam) ----------
const kl = {};
test('C03-UT01 kunciTitikLokasi: titik Disetujui berhasil diklaim, laporan menjadi Diklaim', async () => {
  kl.a = await relawanBaru(AkunRelawan); kl.b = await relawanBaru(AkunRelawan);
  kl.id = await laporanDisetujui(LaporanPencemaran, kl.a.idRelawan, akun.verif.idRelawan);
  const k = await KlaimTitikPencemaran.kunciTitikLokasi({ idRelawan: kl.a.idRelawan, idLaporan: kl.id });
  assert.equal(k.statusKlaim, 'Aktif');
  assert.equal(await statusLaporan(kl.id), 'Diklaim');
  assert.ok(new Date(k.batasWaktu) - new Date(k.wktKlaim) > 6.9 * 86400000);
});
test('C03-UT02 getStatusKlaim: mengembalikan klaim hidup, null bila belum diklaim', async () => {
  assert.equal((await KlaimTitikPencemaran.getStatusKlaim(kl.id)).idRelawan, kl.a.idRelawan);
  const bebas = await laporanDisetujui(LaporanPencemaran, kl.a.idRelawan, akun.verif.idRelawan, -6.3, 106.9);
  assert.equal(await KlaimTitikPencemaran.getStatusKlaim(bebas), null);
  kl.bebas = bebas;
});
test('C03-UT03 kunciTitikLokasi: titik yang sudah diklaim ditolak (ALREADY_CLAIMED)', async () => {
  assert.equal(await kode(() => KlaimTitikPencemaran.kunciTitikLokasi({ idRelawan: kl.b.idRelawan, idLaporan: kl.id })), 'ALREADY_CLAIMED');
});
test('C03-UT04 kunciTitikLokasi: relawan dengan klaim aktif tidak dapat klaim lagi (HAS_ACTIVE_CLAIM)', async () => {
  assert.equal(await kode(() => KlaimTitikPencemaran.kunciTitikLokasi({ idRelawan: kl.a.idRelawan, idLaporan: kl.bebas })), 'HAS_ACTIVE_CLAIM');
});
test('C03-UT05 kunciTitikLokasi: laporan belum diverifikasi atau tidak ada ditolak', async () => {
  const { id_laporan: menunggu } = await LaporanPencemaran.simpanLaporan(LaporanPencemaran.buatLaporan(kl.b.idRelawan, { lat: -6.4, lon: 106.9 }, 'Waspada'));
  assert.equal(await kode(() => KlaimTitikPencemaran.kunciTitikLokasi({ idRelawan: kl.b.idRelawan, idLaporan: menunggu })), 'NOT_CLAIMABLE');
  assert.equal(await kode(() => KlaimTitikPencemaran.kunciTitikLokasi({ idRelawan: kl.b.idRelawan, idLaporan: '00000000-0000-0000-0000-000000000000' })), 'REPORT_NOT_FOUND');
});
test('C03-UT06 kunciTitikLokasi: 5 klaim bersamaan pada satu titik, tepat satu berhasil (KNF05)', async () => {
  const id = await laporanDisetujui(LaporanPencemaran, kl.a.idRelawan, akun.verif.idRelawan, -6.5, 106.9);
  const para = await Promise.all([1, 2, 3, 4, 5].map(() => relawanBaru(AkunRelawan)));
  const hasil = await Promise.allSettled(para.map((p) => KlaimTitikPencemaran.kunciTitikLokasi({ idRelawan: p.idRelawan, idLaporan: id })));
  assert.equal(hasil.filter((h) => h.status === 'fulfilled').length, 1);
  assert.ok(hasil.filter((h) => h.status === 'rejected').every((h) => h.reason.code === 'ALREADY_CLAIMED'));
  const n = (await pool.query(`SELECT count(*)::int n FROM klaim_titik_pencemaran WHERE id_laporan = $1`, [id])).rows[0].n;
  assert.equal(n, 1);
});
test('C03-UT07 getKoordinatAcuan + ubahStatusKlaim: acuan hanya untuk klaim Aktif', async () => {
  const k = await KlaimTitikPencemaran.getKoordinatAcuan(kl.a.idRelawan);
  assert.ok(k && Number.isFinite(k.lat));
  await KlaimTitikPencemaran.ubahStatusKlaim(k.idKlaim, 'Menunggu Verifikasi');
  assert.equal(await KlaimTitikPencemaran.getKoordinatAcuan(kl.a.idRelawan), null);
  await KlaimTitikPencemaran.ubahStatusKlaim(k.idKlaim, 'Aktif');
});
test('C03-UT08 batalkanKlaim: titik kembali Disetujui; tanpa klaim aktif ditolak', async () => {
  await KlaimTitikPencemaran.batalkanKlaim(kl.a.idRelawan);
  assert.equal(await statusLaporan(kl.id), 'Disetujui');
  assert.equal(await kode(() => KlaimTitikPencemaran.batalkanKlaim(kl.a.idRelawan)), 'NO_ACTIVE_CLAIM');
  assert.equal((await KlaimTitikPencemaran.getRiwayatKlaim(kl.a.idRelawan))[0].statusKlaim, 'Dibatalkan');
});
test('C03-UT09 kedaluwarsakan: klaim melewati batas 7 hari dilepas', async () => {
  const k = await KlaimTitikPencemaran.kunciTitikLokasi({ idRelawan: kl.b.idRelawan, idLaporan: kl.id });
  await pool.query(`UPDATE klaim_titik_pencemaran SET batas_waktu = now() - interval '1 minute' WHERE id_klaim = $1`, [k.idKlaim]);
  const habis = await KlaimTitikPencemaran.kedaluwarsakan();
  assert.ok(habis.some((h) => h.id_laporan === kl.id));
  assert.equal(await statusLaporan(kl.id), 'Disetujui');
});

// ---------- C05 BuktiPembersihan (Mendalam) ----------
const acuan = { lat: -6.105, lon: 106.775 };
const geser = (m) => ({ lat: acuan.lat + m / 110580, lon: acuan.lon });
test('C05-UT01 validasiGeofencingRadius: foto ±55 m dari titik klaim valid', async () => {
  const r = await BuktiPembersihan.validasiGeofencingRadius(geser(55), geser(-40), acuan);
  assert.equal(r.valid, true);
  assert.ok(Math.abs(r.jarakBefore - 55) < 1);
});
test('C05-UT02 validasiGeofencingRadius: 105 m masih diterima (toleransi 10 m, KNF06)', async () => {
  assert.equal((await BuktiPembersihan.validasiGeofencingRadius(geser(105), acuan, acuan)).valid, true);
});
test('C05-UT03 validasiGeofencingRadius: 115 m ditolak (GEOFENCE_OUTSIDE)', async () => {
  const r = await BuktiPembersihan.validasiGeofencingRadius(acuan, geser(115), acuan);
  assert.equal(r.valid, false);
  assert.equal(r.code, 'GEOFENCE_OUTSIDE');
});
test('C05-UT04 validasiGeofencingRadius: koordinat GPS tidak ada ditolak', async () => {
  assert.equal((await BuktiPembersihan.validasiGeofencingRadius(null, acuan, acuan)).code, 'GPS_MISSING');
});
test('C05-UT05 tampilkanPerbandinganFoto: before/after tersedia; id tidak dikenal null', async () => {
  const { rows } = await pool.query('SELECT id_pembersihan FROM laporan_pembersihan LIMIT 1');
  const f = await BuktiPembersihan.tampilkanPerbandinganFoto(rows[0].id_pembersihan);
  assert.ok(f.before.url.startsWith('/api/foto/') && f.after.url.startsWith('/api/foto/'));
  assert.equal(await BuktiPembersihan.tampilkanPerbandinganFoto('00000000-0000-0000-0000-000000000000'), null);
});

// ---------- C10 PetaHeatmap (Mendalam) ----------
test('C10-UT01 hitungHeatIntensity: semua laporan Disetujui/Diklaim masuk klaster', async () => {
  const r = await PetaHeatmap.hitungHeatIntensity();
  const n = (await pool.query(`SELECT count(*)::int n FROM laporan_pencemaran WHERE status_laporan IN ('Disetujui','Diklaim')`)).rows[0].n;
  assert.equal(r.laporan, n);
  assert.ok(r.klaster > 0 && r.klaster <= n);
});
test('C10-UT02 hitungHeatIntensity: heat = 6·jumlah + 12·keparahan + 1,5·hari; kategori = paling parah', async () => {
  const { rows } = await pool.query(`SELECT p.*, (SELECT max(CASE indikator_tingkat WHEN 'Sehat' THEN 1 WHEN 'Waspada' THEN 2 ELSE 3 END)
      FROM laporan_pencemaran l WHERE l.id_klaster = p.id_klaster) AS maks FROM peta_heatmap p`);
  for (const p of rows) {
    const harap = 6 * p.jumlah_laporan + 12 * Number(p.rata_rata_keparahan) + 1.5 * Number(p.rata_rata_hari);
    assert.ok(Math.abs(Number(p.heat_intensity) - harap) < 0.2, `klaster ${p.id_klaster}`);
    assert.equal(p.kategori_kualitas, ['Sehat', 'Waspada', 'Berbahaya'][p.maks - 1]);
  }
});
test('C10-UT03 tampilkanHeatmap: filter Sehat hanya mengembalikan kategori Sehat', async () => {
  const h = await PetaHeatmap.filterBerdasarkanKategori(['Sehat']);
  assert.ok(h.klaster.length > 0);
  assert.ok(h.klaster.every((k) => k.kategoriKualitas === 'Sehat') && h.titik.every((t) => t.kategoriKualitas === 'Sehat'));
});
test('C10-UT04 tampilkanHeatmap: tanpa kategori dipilih hasilnya kosong (batas)', async () => {
  assert.deepEqual(await PetaHeatmap.tampilkanHeatmap({ kategori: [] }), { klaster: [], titik: [] });
});
test('C10-UT05 tampilkanHeatmap: area peta Bali membatasi titik; area tidak valid diabaikan', async () => {
  const bali = await PetaHeatmap.tampilkanHeatmap({ areaPeta: '114.4,-9.0,115.8,-8.0' });
  assert.ok(bali.titik.length > 0 && bali.titik.every((t) => t.lon > 114.4 && t.lon < 115.8));
  const semua = await PetaHeatmap.tampilkanHeatmap({});
  assert.equal((await PetaHeatmap.tampilkanHeatmap({ areaPeta: 'abc' })).titik.length, semua.titik.length);
});
test('C10-UT06 getDetailKlaster: klaster di dekat titik ditemukan; di tengah laut null', async () => {
  assert.ok(await PetaHeatmap.getDetailKlaster({ lat: -6.1061, lon: 106.7742 }));
  assert.equal(await PetaHeatmap.getDetailKlaster({ lat: -4.0, lon: 90.0 }), null);
});
test('C10-UT07 getPapanHotspot: urut heat menurun dan menghormati limit', async () => {
  const p = await PetaHeatmap.getPapanHotspot({ limit: 5 });
  assert.equal(p.length, 5);
  assert.ok(p.every((x, i) => i === 0 || p[i - 1].heatIntensity >= x.heatIntensity));
  assert.deepEqual(await PetaHeatmap.getPapanHotspot({ kategori: [] }), []);
});

// ---------- C25 Autentikasi (Mendalam) ----------
const au = { email: `auth${Date.now()}@seaguard.test`, pw: 'Rahasia123' };
test('C25-UT01 validasiPassword: 8 karakter huruf+angka diterima, 7 karakter ditolak (batas)', () => {
  assert.doesNotThrow(() => validasiPassword('abcdefg1'));
  assert.throws(() => validasiPassword('abcdef1'), { code: 'PASSWORD_WEAK' });
});
test('C25-UT02 validasiPassword: tanpa angka ditolak', () => {
  assert.throws(() => validasiPassword('passwordsaja'), { code: 'PASSWORD_WEAK' });
});
test('C25-UT03 daftar: akun baru mendapat token; email sama ditolak', async () => {
  const r = await Autentikasi.daftar({ nama: 'Uji Auth', email: au.email, password: au.pw });
  assert.ok(r.token && r.akun.peran === 'Relawan');
  au.id = r.akun.idRelawan;
  assert.equal(await kode(() => Autentikasi.daftar({ nama: 'Uji Auth', email: au.email, password: au.pw })), 'EMAIL_TAKEN');
});
test('C25-UT04 login: kata sandi benar berhasil; salah dan email tak dikenal gagal dengan pesan sama', async () => {
  au.token = (await Autentikasi.login(au.email, au.pw)).token;
  assert.ok(au.token);
  assert.equal(await kode(() => Autentikasi.login(au.email, 'salah1234')), 'LOGIN_FAILED');
  assert.equal(await kode(() => Autentikasi.login('tidakada@seaguard.test', 'salah1234')), 'LOGIN_FAILED');
});
test('C25-UT05 login: 5 kali gagal mengunci akun 15 menit, sandi benar pun ditolak (KNF09)', async () => {
  const r = await Autentikasi.daftar({ nama: 'Uji Kunci', email: `kunci${Date.now()}@seaguard.test`, password: au.pw });
  const email = (await AkunRelawan.getDetailAkun(r.akun.idRelawan)).email;
  const kodeGagal = [];
  for (let i = 0; i < 5; i += 1) kodeGagal.push(await kode(() => Autentikasi.login(email, 'salah1234')));
  assert.deepEqual(kodeGagal, ['LOGIN_FAILED', 'LOGIN_FAILED', 'LOGIN_FAILED', 'LOGIN_FAILED', 'ACCOUNT_LOCKED']);
  assert.equal(await kode(() => Autentikasi.login(email, au.pw)), 'ACCOUNT_LOCKED');
  const { rows } = await pool.query('SELECT waktu_kunci - now() AS sisa FROM akun_relawan WHERE id_relawan = $1', [r.akun.idRelawan]);
  assert.ok(rows[0].sisa.minutes >= 14);
});
test('C25-UT06 cekSesiDanPeran: peran dicek sesuai hierarki (Algo-005)', async () => {
  const tVerif = (await Autentikasi.login('verifikator@seaguard.test', 'Verifikator123!')).token;
  const tAdmin = (await Autentikasi.login('admin@seaguard.test', process.env.SEED_ADMIN_PASSWORD)).token;
  assert.equal((await Autentikasi.cekSesiDanPeran(au.token, 'Relawan')).ok, true);
  assert.equal((await Autentikasi.cekSesiDanPeran(au.token, 'Verifikator')).status, 403);
  assert.equal((await Autentikasi.cekSesiDanPeran(tVerif, 'Verifikator')).ok, true);
  assert.equal((await Autentikasi.cekSesiDanPeran(tAdmin, 'Verifikator')).ok, true);
  assert.equal((await Autentikasi.cekSesiDanPeran(tVerif, 'Relawan')).code, 'RELAWAN_ONLY');
  assert.equal((await Autentikasi.cekSesiDanPeran('token-palsu', 'Relawan')).status, 401);
});
test('C25-UT07 cekSesiDanPeran + login: akun ditangguhkan ditolak', async () => {
  await pool.query(`UPDATE akun_relawan SET status_akun = 'Ditangguhkan' WHERE id_relawan = $1`, [au.id]);
  assert.equal((await Autentikasi.cekSesiDanPeran(au.token, 'Relawan')).code, 'ACCOUNT_SUSPENDED');
  assert.equal(await kode(() => Autentikasi.login(au.email, au.pw)), 'ACCOUNT_SUSPENDED');
  await pool.query(`UPDATE akun_relawan SET status_akun = 'Aktif' WHERE id_relawan = $1`, [au.id]);
});
test('C25-UT08 gantiPassword + logout: sandi lama salah ditolak; sesi berakhir setelah logout', async () => {
  assert.equal(await kode(() => Autentikasi.gantiPassword(au.id, 'salah1234', 'BaruSekali9', au.token)), 'PASSWORD_WRONG');
  await Autentikasi.gantiPassword(au.id, au.pw, 'BaruSekali9', au.token);
  assert.ok((await Autentikasi.login(au.email, 'BaruSekali9')).token);
  await Autentikasi.logout(au.token);
  assert.equal(await Autentikasi.akunDariToken(au.token), null);
  assert.ok((await hashPassword('x')).startsWith('$2'));
});
test('C25-UT09 catatConsent + sudahConsent: keputusan tersimpan; jenis tidak dikenal ditolak (KNF02)', async () => {
  await Autentikasi.catatConsent(au.id, 'lokasi_kamera', 'Izinkan', 'uji', '127.0.0.1');
  assert.equal((await Autentikasi.sudahConsent(au.id)).keputusan, 'Izinkan');
  assert.equal(await kode(() => Autentikasi.catatConsent(au.id, 'mikrofon', 'Izinkan')), 'CONSENT_INVALID');
  assert.equal(await kode(() => Autentikasi.catatConsent(au.id, 'lokasi', 'Mungkin')), 'CONSENT_INVALID');
});

// ---------- C26 StorageAdapter (Mendalam) ----------
test('C26-UT01 unggahFoto (lokal): berkas tersimpan dan dapat dibaca kembali', async () => {
  const s = new StorageAdapter();
  assert.equal(s.mode, 'local');
  const key = await s.unggahFoto({ buffer: png, format: 'png' }, 'uji');
  assert.match(key, /^uji\/\d{4}-\d{2}\/[0-9a-f-]{36}\.png$/);
  assert.ok((await s.baca(key)).buffer.equals(png));
  assert.equal(await s.urlBaca(key), null);
});
test('C26-UT02 unggahFoto: gagal 2 kali lalu berhasil pada percobaan ke-3 (KNF01)', async () => {
  const s = new StorageAdapter();
  let n = 0;
  s.client = { send: async () => { n += 1; if (n < 3) throw new Error('jaringan putus'); } };
  const key = await s.unggahFoto({ buffer: png, format: 'jpg' });
  assert.ok(key.endsWith('.jpg'));
  assert.equal(n, 3);
});
test('C26-UT03 unggahFoto: selalu gagal, berhenti setelah 3 percobaan (UPLOAD_FAILED)', async () => {
  const s = new StorageAdapter();
  let n = 0;
  s.client = { send: async () => { n += 1; throw new Error('jaringan putus'); } };
  assert.equal(await kode(() => s.unggahFoto({ buffer: png, format: 'png' })), 'UPLOAD_FAILED');
  assert.equal(n, 3);
});

// ---------- Kelas Sedang (Model) ----------
test('C01-UT01 buatLaporan + simpanLaporan: laporan baru berstatus Menunggu Verifikasi', async () => {
  const lap = LaporanPencemaran.buatLaporan(akun.relawan1.idRelawan, { lat: -6.2, lon: 106.8 }, 'Waspada', { jenisSampah: ['plastik', 'x'] });
  assert.deepEqual(lap.jenisSampah, ['plastik']);
  const r = await LaporanPencemaran.simpanLaporan(lap);
  assert.equal(await statusLaporan(r.id_laporan), 'Menunggu Verifikasi');
});
test('C01-UT02 buatLaporan / perbaruiStatusLaporan: indikator salah dan keputusan ganda ditolak', async () => {
  assert.throws(() => LaporanPencemaran.buatLaporan(akun.relawan1.idRelawan, { lat: -6.2, lon: 106.8 }, 'Parah'), { code: 'INDICATOR_INVALID' });
  const id = await laporanDisetujui(LaporanPencemaran, akun.relawan1.idRelawan, akun.verif.idRelawan, -6.6, 106.9);
  assert.equal(await kode(() => LaporanPencemaran.perbaruiStatusLaporan(id, 'Ditolak', akun.verif.idRelawan)), 'ALREADY_DECIDED');
});
test('C04-UT01 buatLaporanPembersihan: data valid dibulatkan dan disiapkan', () => {
  const l = LaporanPembersihan.buatLaporanPembersihan('r', '  Membersihkan pantai bersama warga  ', 'a', 'b', { jumlahPeserta: '4', perkiraanBeratKg: '12.34' });
  assert.equal(l.jumlahPeserta, 4);
  assert.equal(l.perkiraanBeratKg, 12.3);
});
test('C04-UT02 buatLaporanPembersihan / setHasilVerifikasi: deskripsi pendek dan keputusan tak dikenal ditolak', async () => {
  assert.throws(() => LaporanPembersihan.buatLaporanPembersihan('r', 'pendek', 'a', 'b'), { code: 'CLEANUP_DESC_SHORT' });
  assert.equal(await kode(() => LaporanPembersihan.setHasilVerifikasi('00000000-0000-0000-0000-000000000000', 'Mungkin')), 'DECISION_INVALID');
});
test('C06-UT01 catatLogVerifikasi: catatan audit tersimpan dan terbaca', async () => {
  const r = await LogVerifikasi.catatLogVerifikasi(akun.verif.idRelawan, akun.relawan1.idRelawan, 'LP-UJI', 'Disetujui', null);
  assert.ok(r.id_log);
  assert.equal((await LogVerifikasi.getLog({ limit: 1 }))[0].kodeObjek, 'LP-UJI');
});
test('C06-UT02 log_verifikasi: UPDATE dan DELETE ditolak trigger (KNF07)', async () => {
  await assert.rejects(pool.query(`UPDATE log_verifikasi SET status_keputusan = 'Ditolak'`));
  await assert.rejects(pool.query('DELETE FROM log_verifikasi'));
});
test('C07-UT01 getDaftarPeringkat: urut poin menurun dengan RANK()', async () => {
  const d = await Leaderboard.getDaftarPeringkat({ limit: 10 });
  assert.ok(d.length > 1 && d.every((x, i) => i === 0 || d[i - 1].totalPoin >= x.totalPoin));
  assert.equal(d[0].peringkat, 1);
});
test('C07-UT02 getPosisiPengguna: Verifikator tidak masuk peringkat (null)', async () => {
  assert.equal(await Leaderboard.getPosisiPengguna(akun.verif.idRelawan), null);
  assert.ok((await Leaderboard.getPosisiPengguna(akun.relawan1.idRelawan)).peringkat >= 1);
});
test('C08-UT01 tambahSkorPoin: poin = max(1, round(heat klaster)) ditambahkan ke total (Algo-007)', async () => {
  const { rows } = await pool.query(`SELECT id_pembersihan, id_relawan FROM laporan_pembersihan WHERE status_pembersihan = 'Menunggu Verifikasi' LIMIT 1`);
  const sebelum = await AkunRelawan.getAtributPoin(rows[0].id_relawan);
  const r = await AkunRelawan.tambahSkorPoin(rows[0].id_relawan, rows[0].id_pembersihan, 500);
  assert.ok(r.poin >= 1);
  assert.equal(r.totalPoinBaru, sebelum + r.poin);
});
test('C08-UT02 ubahHakAkses / tangguhkanAkun: peran tak dikenal dan akun tak ada ditolak', async () => {
  assert.equal(await kode(() => AkunRelawan.ubahHakAkses(akun.relawan1.idRelawan, 'Raja')), 'ROLE_INVALID');
  assert.equal(await kode(() => AkunRelawan.tangguhkanAkun('00000000-0000-0000-0000-000000000000')), 'ACCOUNT_NOT_FOUND');
});
test('C09-UT01 perbaruiKomunitas: nama baru tersimpan', async () => {
  const k = (await Komunitas.getDaftarKomunitas())[0];
  await Komunitas.perbaruiKomunitas(k.idKomunitas, { namaKomunitas: 'Komunitas Uji' });
  assert.equal((await Komunitas.getDetailKomunitas(k.idKomunitas)).namaKomunitas, 'Komunitas Uji');
});
test('C09-UT02 perbaruiKomunitas: nama kosong ditolak', async () => {
  const k = (await Komunitas.getDaftarKomunitas())[0];
  assert.equal(await kode(() => Komunitas.perbaruiKomunitas(k.idKomunitas, { namaKomunitas: '  ' })), 'COMMUNITY_NAME_INVALID');
});
test('C24-UT01 kirimNotifikasi: tersimpan sebagai belum dibaca, lalu ditandai dibaca', async () => {
  const r = await relawanBaru(AkunRelawan);
  await Notifikasi.kirimNotifikasi(r.idRelawan, { jenis: 'uji', judul: 'Uji', pesan: 'Halo' });
  assert.equal((await Notifikasi.getDaftar(r.idRelawan)).belumDibaca, 1);
  await Notifikasi.tandaiDibaca(r.idRelawan, 'semua');
  assert.equal((await Notifikasi.getDaftar(r.idRelawan)).belumDibaca, 0);
});
test('C24-UT02 kirimNotifikasi: penerima tidak ada ditolak basis data', async () => {
  await assert.rejects(Notifikasi.kirimNotifikasi('00000000-0000-0000-0000-000000000000', { jenis: 'uji', judul: 'x', pesan: 'x' }));
});
