// Shared setup for the unit and integration tests: a scratch database (created from DATABASE_URL,
// migrated and seeded with the demo data, dropped afterwards) and local photo storage.
import pg from 'pg';

export async function siapkanDb(nama) {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL (see src/README.md section 3).');
  const url = new URL(process.env.DATABASE_URL);
  const ssl = /localhost|127\.0\.0\.1/.test(url.hostname) ? false : { rejectUnauthorized: false };
  const basis = url.toString();
  const admin = new pg.Client({ connectionString: basis, ssl });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${nama} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${nama}`);
  await admin.end();

  url.pathname = `/${nama}`;
  process.env.DATABASE_URL = url.toString();
  for (const k of ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) delete process.env[k];
  process.env.SEED_ADMIN_PASSWORD ||= 'AdminUji123!';

  const { migrate } = await import('../src/db/migrate.js');
  const { seedJikaKosong } = await import('../src/db/seed.js');
  const { pool } = await import('../src/db/pool.js');
  await migrate();
  await seedJikaKosong();

  const idAkun = async (email) => (await pool.query('SELECT id_relawan FROM akun_relawan WHERE email = $1', [email])).rows[0].id_relawan;
  const akun = {
    admin: { idRelawan: await idAkun('admin@seaguard.test'), peran: 'Admin' },
    verif: { idRelawan: await idAkun('verifikator@seaguard.test'), peran: 'Verifikator' },
    relawan1: { idRelawan: await idAkun('relawan1@seaguard.test'), peran: 'Relawan' },
    relawan2: { idRelawan: await idAkun('relawan2@seaguard.test'), peran: 'Relawan' },
  };

  async function bersihkan() {
    await pool.end();
    const a = new pg.Client({ connectionString: basis, ssl });
    await a.connect();
    await a.query(`DROP DATABASE IF EXISTS ${nama} WITH (FORCE)`);
    await a.end();
  }
  return { pool, akun, bersihkan };
}

let urut = 0;
/** A fresh volunteer account (no claims, no points). */
export async function relawanBaru(AkunRelawan) {
  urut += 1;
  return AkunRelawan.buatAkun({ nama: `Relawan Uji ${urut}`, email: `uji${Date.now()}${urut}@seaguard.test`, passwordHash: 'x' });
}

/** A new approved report at (lat, lon), ready to be claimed. */
export async function laporanDisetujui(LaporanPencemaran, idRelawan, idVerifikator, lat = -6.105, lon = 106.775, indikator = 'Berbahaya') {
  const lap = LaporanPencemaran.buatLaporan(idRelawan, { lat, lon }, indikator, { lokasiNama: 'Titik uji' });
  const { id_laporan: id } = await LaporanPencemaran.simpanLaporan(lap);
  await LaporanPencemaran.perbaruiStatusLaporan(id, 'Disetujui', idVerifikator, null);
  return id;
}
