import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { MAINTENANCE_URL, TEST_DB_NAME, TEST_DB_URL } from './config';

const ROOT = join(__dirname, '..', '..');

/** Recreates the test database, applies the Supabase emulation and every migration in order. */
export default async function setup(): Promise<void> {
  const admin = new pg.Client({ connectionString: MAINTENANCE_URL });
  await admin.connect();
  await admin.query(`drop database if exists ${TEST_DB_NAME} with (force)`);
  await admin.query(`create database ${TEST_DB_NAME}`);
  await admin.end();

  const db = new pg.Client({ connectionString: TEST_DB_URL });
  await db.connect();
  try {
    await db.query(readFileSync(join(ROOT, 'tests', 'bootstrap.sql'), 'utf8'));
    const migrationsDir = join(ROOT, 'migrations');
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      try {
        await db.query(readFileSync(join(migrationsDir, file), 'utf8'));
      } catch (error) {
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
      }
    }
  } finally {
    await db.end();
  }
}
