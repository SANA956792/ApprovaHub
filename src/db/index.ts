import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { readFileSync } from 'node:fs';
import * as schema from './schema.ts';
import { runSchemaMigrations } from './migrations.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      port: 5432,
      ssl: {
        ca: readFileSync('/etc/secrets/supabase-ca.crt', 'utf8'),
        rejectUnauthorized: true,
      },
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }

  return global._postgresPool;
};

const pool = createPool();

await runSchemaMigrations(pool);

export const db = drizzle(pool, { schema });
export { pool };


