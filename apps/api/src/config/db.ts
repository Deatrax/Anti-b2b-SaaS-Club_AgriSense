// Single pg Pool over Supabase Postgres (§C.1). Swapping to any Postgres is a
// DATABASE_URL change — no client lock-in. Models call query() with raw SQL (§C.4).
import pg from 'pg';
import { env } from './env';

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    if (!env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL is not set — point it at your Supabase Postgres connection string (.env).',
      );
    }
    pool = new pg.Pool({
      connectionString: env.DATABASE_URL,
      // Supabase requires SSL over the pooled connection string.
      ssl: env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

/** Thin helper: `const rows = await query<Row>('select ... where id = $1', [id])`. */
export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const res = await getPool().query(text, params as unknown[]);
  return res.rows as T[];
}

/** Atomic multi-statement writes (e.g. replace-all-rows-for-cycle). BEGIN/COMMIT, ROLLBACK on throw. */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
