// KNF07 (immutable audit log) and KNF03 (heatmap of 10,000 points in <= 3 s), run against a scratch database.
// Usage: DATABASE_URL=postgres://seaguard:seaguard@localhost:5432/seaguard node tests/nfr-check.mjs
//    or: railway run --service PostGIS -- node tests/nfr-check.mjs
import pg from 'pg';

const url = new URL(process.env.DATABASE_URL);
const baseDb = url.pathname;
const ssl = /localhost|127.0.0.1/.test(url.hostname) ? false : { rejectUnauthorized: false };
const admin = new pg.Client({ connectionString: url.toString(), ssl });
await admin.connect();
await admin.query('DROP DATABASE IF EXISTS seaguard_bench');
await admin.query('CREATE DATABASE seaguard_bench');
await admin.end();
url.pathname = '/seaguard_bench';
process.env.DATABASE_URL = url.toString();

const { migrate } = await import('../src/db/migrate.js');
const { pool } = await import('../src/db/pool.js');
const { PetaHeatmap } = await import('../src/models/PetaHeatmap.js');
await migrate();

// KNF07
const u = await pool.query(`INSERT INTO akun_relawan (nama, email, password_hash, peran) VALUES ('Bench','bench@x.test','x','Verifikator') RETURNING id_relawan`);
await pool.query(`INSERT INTO log_verifikasi (id_verifikator, jenis_objek, id_objek, kode_objek, status_keputusan) VALUES ($1,'laporan',gen_random_uuid(),'LP-X','Disetujui')`, [u.rows[0].id_relawan]);
for (const sql of ['UPDATE log_verifikasi SET status_keputusan = $1', 'DELETE FROM log_verifikasi WHERE status_keputusan <> $1']) {
  try { await pool.query(sql, ['Ditolak']); console.log('KNF07 FAIL:', sql); } catch (e) { console.log('KNF07 ok, rejected:', e.message); }
}

// KNF03: 10,000 approved reports spread over 6 coastal regions.
const centers = [[-6.11, 106.78], [-8.72, 115.17], [-6.95, 110.44], [-7.24, 112.80], [-5.14, 119.41], [3.78, 98.69]];
let s = 42; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const lat = []; const lon = []; const ind = [];
for (let i = 0; i < 10000; i += 1) {
  const c = centers[i % centers.length];
  lat.push(c[0] + (rnd() - 0.5) * 0.6); lon.push(c[1] + (rnd() - 0.5) * 0.6); ind.push(['Sehat', 'Waspada', 'Berbahaya'][Math.floor(rnd() * 3)]);
}
await pool.query(
  `INSERT INTO laporan_pencemaran (id_relawan, koordinat_gps, indikator_tingkat, status_laporan, tanggal_laporan)
   SELECT $1, ST_SetSRID(ST_MakePoint(x.lon, x.lat), 4326)::geography, x.ind, 'Disetujui', now() - (random() * interval '30 days')
   FROM unnest($2::float8[], $3::float8[], $4::text[]) AS x(lat, lon, ind)`, [u.rows[0].id_relawan, lat, lon, ind]);
let t = Date.now();
const r = await PetaHeatmap.hitungHeatIntensity();
const tCluster = Date.now() - t;
t = Date.now();
const layer = await PetaHeatmap.tampilkanHeatmap();
const tLayer = Date.now() - t;
console.log(`KNF03: ${r.laporan} points -> ${r.klaster} clusters in ${tCluster} ms; layer query ${layer.titik.length} points in ${tLayer} ms; total ${tCluster + tLayer} ms (limit 3000 ms)`);
await pool.end();
const a2 = new pg.Client({ connectionString: process.env.DATABASE_URL.replace('/seaguard_bench', baseDb), ssl });
await a2.connect(); await a2.query('DROP DATABASE IF EXISTS seaguard_bench WITH (FORCE)'); await a2.end();
