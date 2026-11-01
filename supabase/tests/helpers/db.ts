import pg from 'pg';
import { afterAll } from 'vitest';
import { TEST_DB_URL } from './config';

const pool = new pg.Pool({ connectionString: TEST_DB_URL, max: 5 });
afterAll(async () => {
  await pool.end();
});

export interface TestUser {
  id: string;
  /** E.164, e.g. +919812345678 */
  phone: string;
  name: string;
}

// Valid Indian mobile numbers (+91 9XXXXXXXXX), unique within a test run.
const phoneBase = Math.floor(Math.random() * 900_000_000);
let counter = 0;
function uniquePhone(): string {
  counter += 1;
  return `+919${String((phoneBase + counter) % 1_000_000_000).padStart(9, '0')}`;
}

/** Runs SQL as the database owner (bypasses RLS). For arranging state and inspecting results. */
export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params);
}

/** Creates an auth user (Supabase stores phones without '+'), which triggers profile creation. */
export async function createUser(name: string | null = 'Test User', phone?: string): Promise<TestUser> {
  const e164 = phone ?? uniquePhone();
  const { rows } = await sql<{ id: string }>('insert into auth.users (phone) values ($1) returning id', [e164.slice(1)]);
  const id = rows[0]!.id;
  if (name) await sql('update public.profiles set display_name = $2 where id = $1', [id, name]);
  return { id, phone: e164, name: name ?? '' };
}

export interface AsUserOptions {
  /** Seconds since the user's last OTP verification (JWT amr timestamp). Default 30. */
  authAgeSeconds?: number;
}

/**
 * Runs `fn` inside a transaction as the given user with the `authenticated` role and
 * Supabase-style JWT claims, or as `anon` when user is null. Commits on success.
 */
export async function asUser<T>(
  user: TestUser | null,
  fn: (client: pg.PoolClient) => Promise<T>,
  options: AsUserOptions = {},
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    if (user) {
      const now = Math.floor(Date.now() / 1000);
      const claims = {
        sub: user.id,
        role: 'authenticated',
        aud: 'authenticated',
        phone: user.phone.slice(1),
        amr: [{ method: 'otp', timestamp: now - (options.authAgeSeconds ?? 30) }],
      };
      await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
      await client.query('set local role authenticated');
    } else {
      await client.query("select set_config('request.jwt.claims', '{\"role\":\"anon\"}', true)");
      await client.query('set local role anon');
    }
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

/** Calls a public RPC as a user and returns all rows. */
export async function rpc<T extends pg.QueryResultRow = pg.QueryResultRow>(
  user: TestUser | null,
  fn: string,
  args: unknown[] = [],
  options?: AsUserOptions,
): Promise<T[]> {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(', ');
  return asUser(user, async (c) => (await c.query<T>(`select * from public.${fn}(${placeholders})`, args)).rows, options);
}

/** Calls an RPC that returns a scalar and unwraps it. */
export async function rpcValue<T>(user: TestUser | null, fn: string, args: unknown[] = [], options?: AsUserOptions): Promise<T> {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(', ');
  return asUser(
    user,
    async (c) => (await c.query(`select public.${fn}(${placeholders}) as v`, args)).rows[0]!.v as T,
    options,
  );
}

/** Selects from a table as a user (RLS applies). */
export async function select<T extends pg.QueryResultRow = pg.QueryResultRow>(
  user: TestUser | null,
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  return asUser(user, async (c) => (await c.query<T>(text, params)).rows);
}

// ---------------------------------------------------------------------------
// Scenario builders
// ---------------------------------------------------------------------------
export async function createFamily(owner: TestUser, name = 'Test Family'): Promise<string> {
  return rpcValue<string>(owner, 'create_family', [name, null]);
}

export async function invite(
  inviter: TestUser,
  familyId: string,
  role: 'admin' | 'adult' | 'child' | 'viewer',
  phone: string | null = null,
): Promise<{ invitation_id: string; code: string; expires_at: Date }> {
  const rows = await rpc<{ invitation_id: string; code: string; expires_at: Date }>(inviter, 'create_invitation', [
    familyId,
    role,
    phone,
    null,
  ]);
  return rows[0]!;
}

/** Owner creates a family and adds each extra user with the given role through real invitations. */
export async function familyWith(
  owner: TestUser,
  members: Array<{ user: TestUser; role: 'admin' | 'adult' | 'child' | 'viewer' }>,
  name = 'Test Family',
): Promise<string> {
  const familyId = await createFamily(owner, name);
  for (const m of members) {
    const { code } = await invite(owner, familyId, m.role, m.user.phone);
    const result = await rpcValue<{ ok: boolean; error?: string }>(m.user, 'accept_invitation', [code]);
    if (!result.ok) throw new Error(`join failed: ${result.error}`);
  }
  return familyId;
}
