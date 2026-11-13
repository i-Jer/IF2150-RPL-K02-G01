// Drops the local development database "seaguard_dev" (never production) so the next dev-server start reseeds it.
// Usage: railway run --service PostGIS -- node scripts/reset-dev-db.mjs
import pg from 'pg';

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
await c.query('DROP DATABASE IF EXISTS seaguard_dev WITH (FORCE)');
await c.end();
console.log('[dev] seaguard_dev dropped');
