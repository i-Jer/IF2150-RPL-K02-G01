// Local development against Railway's PostGIS without touching production data.
// Usage (from src/server): railway run --service PostGIS -- node scripts/dev-server.mjs
// Creates database "seaguard_dev" (with PostGIS) on the same server, then starts the API on :8080
// with photos stored in ./uploads. Credentials stay in the injected environment; nothing is printed.
import pg from 'pg';
import { spawn } from 'node:child_process';

const base = process.env.DATABASE_URL;
if (!base) { console.error('Run through `railway run --service PostGIS`.'); process.exit(1); }
const url = new URL(base);
const admin = new pg.Client({ connectionString: base, ssl: { rejectUnauthorized: false } });
await admin.connect();
const { rows } = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'seaguard_dev'");
if (!rows.length) await admin.query('CREATE DATABASE seaguard_dev');
await admin.end();
url.pathname = '/seaguard_dev';

const env = { ...process.env, DATABASE_URL: url.toString(), PORT: '8080', NODE_ENV: 'development' };
for (const k of ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) delete env[k];
const child = spawn(process.execPath, process.argv.includes('--seed-only') ? ['src/db/seed.js', ...process.argv.slice(2)] : ['src/server.js'], { env, stdio: 'inherit' });
child.on('exit', (c) => process.exit(c ?? 0));
