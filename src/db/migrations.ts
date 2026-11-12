import type { Pool } from 'pg';

/**
 * Additive compatibility migrations for databases created by earlier releases.
 * These statements preserve existing rows and can safely run at every startup.
 */
export async function runSchemaMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE public.request_categories
        ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'FileText',
        ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS subcategories text NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS requires_amount boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS requires_dates boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS created_at timestamp without time zone NOT NULL DEFAULT now()
    `);
    await client.query('COMMIT');
    console.info('Database schema migrations completed.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
