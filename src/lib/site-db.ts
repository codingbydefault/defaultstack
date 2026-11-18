import { Pool } from 'pg';

let pool: Pool | null = null;

export function siteDb(): Pool | null {
  const connectionString = process.env.DEFAULTSTACKR_AUTH_DATABASE_URL;
  if (!connectionString) return null;
  if (!pool) pool = new Pool({ connectionString, max: 4 });
  return pool;
}
