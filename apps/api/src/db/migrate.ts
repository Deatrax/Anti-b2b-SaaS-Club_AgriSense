// Apply every .sql in migrations/ in lexical order (§C.4). Idempotent (create ... if not exists).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getPool } from '../config/db';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, 'migrations');

async function main() {
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const pool = getPool();
  for (const f of files) {
    const sql = readFileSync(join(dir, f), 'utf8');
    process.stdout.write(`→ applying ${f} ... `);
    await pool.query(sql);
    console.log('ok');
  }
  await pool.end();
  console.log(`Applied ${files.length} migration(s).`);
}

main().catch((err) => {
  console.error('migration failed:', err);
  process.exit(1);
});
