// PostgreSQL connection pool and transaction helper.
import pg from 'pg';
import { config } from '../config.js';

// Return bigint/numeric as JS numbers (values here stay well inside double range).
pg.types.setTypeParser(20, (v) => Number(v));
pg.types.setTypeParser(1700, (v) => Number(v));

const needsSsl = config.databaseUrl && !/localhost|127\.0\.0\.1|\.railway\.internal/.test(config.databaseUrl);

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 15,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => console.error('[db] idle client error', err.message));

/** Run a query on the shared pool. */
export const query = (text, params) => pool.query(text, params);

/**
 * Run fn(client) inside BEGIN/COMMIT. Rolls back on throw.
 * Every model method accepts an optional client so controllers can compose
 * several model operations into one atomic transaction.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Pick the executor: a transaction client when given, else the pool. */
export const db = (client) => client || pool;
