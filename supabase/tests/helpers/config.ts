/**
 * Connection settings. Defaults match a local PostgreSQL with user/password postgres/postgres.
 * Override with FAMILYHUB_PG_URL (maintenance database URL, e.g. .../postgres).
 */
const base = process.env.FAMILYHUB_PG_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/postgres';

export const TEST_DB_NAME = process.env.FAMILYHUB_TEST_DB ?? 'familyhub_test';
export const MAINTENANCE_URL = base;

const url = new URL(base);
url.pathname = `/${TEST_DB_NAME}`;
export const TEST_DB_URL = url.toString();
