// Heatmap profiling (KNF03: 10,000 points in <= 3 s). Runs in a scratch database "seaguard_bench" that is
// created and dropped again, so no real data is touched.
//   Usage (local PostGIS):  DATABASE_URL=postgres://seaguard:seaguard@localhost:5432/seaguard node tests/profile-heatmap.mjs
//   Usage (Railway):        railway run --service PostGIS -- node tests/profile-heatmap.mjs
//
// Compares the two ways of serving GET /api/heatmap:
//   A. compute on read: cluster all approved reports (ST_ClusterDBSCAN) on every request, then read the layer
//   B. precomputed (what the app does): clusters are recomputed on approval/claim and hourly, the request only reads
import pg from 'pg';

const RUNS = 3;
const url = new URL(process.env.DATABASE_URL);
const baseDb = url.pathname;
const local = /localhost|127\.0\.0\.1/.test(url.hostname);
const ssl = local ? false : { rejectUnauthorized: false };
const admin = new pg.Client({ connectionString: url.toString(), ssl });
await admin.connect();
await admin.query('DROP DATABASE IF EXISTS seaguard_bench WITH (FORCE)');
await admin.query('CREATE DATABASE seaguard_bench');
await admin.end();
url.pathname = '/seaguard_bench';
process.env.DATABASE_URL = url.toString();

const { migrate } = await import('../src/db/migrate.js');
const { pool } = await import('../src/db/pool.js');
const { PetaHeatmap } = await import('../src/models/PetaHeatmap.js');
await migrate();

// 10,000 approved reports over 6 coastal regions (deterministic).
const u = await pool.query(`INSERT INTO akun_relawan (nama, email, password_hash, peran) VALUES ('Bench','bench@x.test','x','Relawan') RETURNING id_relawan`);
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
await pool.query('ANALYZE laporan_pencemaran');

const time = async (fn) => { const t = process.hrtime.bigint(); const r = await fn(); return { ms: Number(process.hrtime.bigint() - t) / 1e6, r }; };
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

const a = []; const b = []; const cl = []; let info;
for (let i = 0; i < RUNS; i += 1) {
  const c = await time(() => PetaHeatmap.hitungHeatIntensity());
  const l = await time(() => PetaHeatmap.tampilkanHeatmap());
  cl.push(c.ms); a.push(c.ms + l.ms); b.push(l.ms);
  info = { laporan: c.r.laporan, klaster: c.r.klaster, titik: l.r.titik.length, lapisanKlaster: l.r.klaster.length };
}

// Database-side execution time (no network): EXPLAIN ANALYZE of the clustering step and of the cluster layer read.
const explain = async (sql, params = []) => {
  const { rows } = await pool.query(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`, params);
  return rows[0]['QUERY PLAN'][0]['Execution Time'];
};
const eDbscan = await explain(
  `SELECT id_laporan, ST_ClusterDBSCAN(ST_Transform(koordinat_gps::geometry, 3857), eps := 505, minpoints := 1) OVER () AS cid
   FROM laporan_pencemaran WHERE status_laporan IN ('Disetujui', 'Diklaim')`);
const eLayer = await explain(`SELECT id_klaster, ST_Y(koordinat_pusat::geometry), ST_X(koordinat_pusat::geometry), heat_intensity, kategori_kualitas FROM peta_heatmap ORDER BY heat_intensity DESC`);

console.log(`Data: ${info.laporan} approved reports -> ${info.klaster} clusters; layer returns ${info.titik} points + ${info.lapisanKlaster} clusters`);
console.log(`Runs: ${RUNS}, median wall time measured from this machine (includes network round trips to the database)`);
console.log(`A. compute on read  (cluster + read): ${median(a).toFixed(0)} ms   [clustering alone ${median(cl).toFixed(0)} ms]`);
console.log(`B. precomputed      (read only)     : ${median(b).toFixed(0)} ms`);
console.log(`Database execution time (EXPLAIN ANALYZE): ST_ClusterDBSCAN over 10,000 points ${eDbscan.toFixed(0)} ms; cluster layer read ${eLayer.toFixed(1)} ms`);
console.log('KNF03 limit: 3000 ms');

await pool.end();
const a2 = new pg.Client({ connectionString: process.env.DATABASE_URL.replace('/seaguard_bench', baseDb), ssl });
await a2.connect(); await a2.query('DROP DATABASE IF EXISTS seaguard_bench WITH (FORCE)'); await a2.end();
