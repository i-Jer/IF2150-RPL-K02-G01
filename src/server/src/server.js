// Entry point: migrate, seed demo data on an empty database, start HTTP, run pending upkeep once.
import { config } from './config.js';
import { migrate } from './db/migrate.js';
import { seedJikaKosong } from './db/seed.js';
import { buatApp } from './app.js';
import { Pemeliharaan } from './services/Pemeliharaan.js';
import { pool } from './db/pool.js';

async function main() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is not set');
  await migrate();
  await seedJikaKosong();
  const app = buatApp();
  const server = app.listen(config.port, '0.0.0.0', () => console.log(`[seaguard] listening on :${config.port} (${config.env})`));
  server.keepAliveTimeout = 65_000;

  // No timers here: upkeep (claim expiry, heat refresh) runs on incoming requests (services/Pemeliharaan.js),
  // so an idle server sends nothing and the platform can sleep it.
  Pemeliharaan.cekKlaimKedaluwarsa();

  const stop = () => { server.close(() => pool.end().finally(() => process.exit(0))); setTimeout(() => process.exit(0), 8000).unref(); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

main().catch((e) => { console.error('[seaguard] failed to start', e); process.exit(1); });
