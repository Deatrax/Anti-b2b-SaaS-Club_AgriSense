import { getPool } from './src/config/db';

async function migrate() {
  const pool = getPool();
  try {
    console.log('Adding farm_id column to conversations...');
    await pool.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES farms(id) ON DELETE CASCADE');
    
    console.log('Backfilling farm_id from fields...');
    await pool.query(`
      UPDATE conversations c
      SET farm_id = f.farm_id
      FROM fields f
      WHERE c.field_id = f.id AND c.farm_id IS NULL
    `);
    
    console.log('Making field_id optional...');
    await pool.query('ALTER TABLE conversations ALTER COLUMN field_id DROP NOT NULL');
    
    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

migrate();
