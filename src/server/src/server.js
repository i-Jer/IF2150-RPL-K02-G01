// Entry point: migrate, seed demo data on an empty database, start HTTP, schedule background jobs.
import { config } from './config.js';
import { migrate } from './db/migrate.js';
import { seedJikaKosong } from './db/seed.js';
import { buatApp } from './app.js';
import { KlaimTitikPencemaran } from './models/KlaimTitikPencemaran.js';
import { PetaHeatmap } from './models/PetaHeatmap.js';
import { Notifikasi } from './services/Notifikasi.js';
import { pool } from './db/pool.js';

async function jobKlaimKedaluwarsa() {
  try {
    const expired = await KlaimTitikPencemaran.kedaluwarsakan();
    for (const k of expired) {
      const n = await Notifikasi.kirimNotifikasi(k.id_relawan, {
        jenis: 'klaim_kedaluwarsa', judul: `Claim ${k.kode} expired`, pesan: 'The 7-day window ended and the point is open again.', data: { kode: k.kode },
      });
      Notifikasi.dorong(k.id_relawan, n);
    }
    if (expired.length) {
      await PetaHeatmap.hitungHeatIntensity();
      Notifikasi.siarkan('heatmap', { alasan: 'klaim_kedaluwarsa' });
    }
  } catch (e) { console.error('[job] claim expiry', e.message); }
}

async function main() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is not set');
  await migrate();
  await seedJikaKosong();
  await PetaHeatmap.hitungHeatIntensity();
  const app = buatApp();
  const server = app.listen(config.port, '0.0.0.0', () => console.log(`[seaguard] listening on :${config.port} (${config.env})`));
  server.keepAliveTimeout = 65_000;

  setInterval(jobKlaimKedaluwarsa, 10 * 60 * 1000);
  // "Days unhandled" grows over time, so heat is refreshed hourly.
  setInterval(() => PetaHeatmap.hitungHeatIntensity().then(() => Notifikasi.siarkan('heatmap', { alasan: 'berkala' })).catch(() => {}), 60 * 60 * 1000);
  jobKlaimKedaluwarsa();

  const stop = () => { server.close(() => pool.end().finally(() => process.exit(0))); setTimeout(() => process.exit(0), 8000).unref(); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

main().catch((e) => { console.error('[seaguard] failed to start', e); process.exit(1); });
