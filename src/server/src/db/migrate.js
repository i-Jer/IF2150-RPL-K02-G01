// Applies schema.sql. Runs automatically at server start and via `npm run migrate`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  const sql = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
  const client = await pool.connect();
  try {
    // Serialise concurrent boots (several replicas) with an advisory lock.
    await client.query('SELECT pg_advisory_lock(424242)');
    await client.query(sql);
  } finally {
    await client.query('SELECT pg_advisory_unlock(424242)').catch(() => {});
    client.release();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => { console.log('[migrate] schema applied'); return pool.end(); })
    .catch((e) => { console.error(e); process.exit(1); });
}
