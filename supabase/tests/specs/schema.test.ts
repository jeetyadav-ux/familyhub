import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@familyhub/shared';
import { asUser, createUser, sql } from '../helpers/db';

describe('schema hardening', () => {
  it('enables RLS on every public table', async () => {
    const { rows } = await sql<{ relname: string }>(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it('gives anon no table privileges at all', async () => {
    const { rows } = await sql<{ table_name: string; privilege_type: string }>(`
      select table_name, privilege_type from information_schema.role_table_grants
       where grantee = 'anon' and table_schema = 'public'`);
    expect(rows).toEqual([]);
  });

  it('blocks anonymous reads and RPCs', async () => {
    await expect(asUser(null, (c) => c.query('select * from public.families'))).rejects.toThrow(/permission denied/);
    await expect(asUser(null, (c) => c.query('select * from public.profiles'))).rejects.toThrow(/permission denied/);
    await expect(asUser(null, (c) => c.query("select public.create_family('x')"))).rejects.toThrow(/permission denied/);
  });

  it('pins search_path on every SECURITY DEFINER function', async () => {
    const { rows } = await sql<{ fn: string }>(`
      select n.nspname || '.' || p.proname as fn
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname in ('public', 'app') and p.prosecdef
         and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')`);
    expect(rows.map((r) => r.fn)).toEqual([]);
  });

  it('does not let users call internal helpers directly', async () => {
    const user = await createUser('Mallory');
    await expect(
      asUser(user, (c) => c.query("select app.log_activity(gen_random_uuid(), 'x.y')")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(user, (c) => c.query('select app.generate_invite_code()')),
    ).rejects.toThrow(/permission denied/);
  });

  it('keeps the permission catalog in sync with packages/shared', async () => {
    const { rows: perms } = await sql<{ key: string; module: string; admin_only: boolean; available_from_phase: number }>(
      'select key, module, admin_only, available_from_phase from public.permissions order by key',
    );
    const expected = [...PERMISSIONS]
      .map((p) => ({ key: p.key, module: p.module, admin_only: p.adminOnly, available_from_phase: p.availableFromPhase }))
      .sort((a, b) => a.key.localeCompare(b.key));
    expect(perms).toEqual(expected);

    const { rows: defaults } = await sql<{ role: string; permission: string }>(
      'select role::text, permission from public.role_permissions order by permission, role',
    );
    const expectedDefaults = PERMISSIONS.flatMap((p) => p.defaults.map((role) => ({ role, permission: p.key }))).sort(
      (a, b) => a.permission.localeCompare(b.permission) || a.role.localeCompare(b.role),
    );
    expect(defaults).toEqual(expectedDefaults);
  });
});

describe('profiles', () => {
  it('creates a profile with an E.164 phone when an auth user signs up', async () => {
    const user = await createUser(null);
    const { rows } = await sql('select phone, display_name from public.profiles where id = $1', [user.id]);
    expect(rows[0]).toEqual({ phone: user.phone, display_name: null });
  });

  it('follows phone number changes in auth', async () => {
    const user = await createUser('Asha');
    await sql('update auth.users set phone = $2 where id = $1', [user.id, '919000000001']);
    const { rows } = await sql('select phone from public.profiles where id = $1', [user.id]);
    expect(rows[0]!.phone).toBe('+919000000001');
  });

  it('lets users edit their own name but not their phone or someone else', async () => {
    const a = await createUser('Asha');
    const b = await createUser('Bina');
    await asUser(a, (c) => c.query("update public.profiles set display_name = 'Asha Y' where id = $1", [a.id]));
    expect((await sql('select display_name from public.profiles where id = $1', [a.id])).rows[0]!.display_name).toBe('Asha Y');

    await expect(
      asUser(a, (c) => c.query("update public.profiles set phone = '+919999999999' where id = $1", [a.id])),
    ).rejects.toThrow(/permission denied/);

    const res = await asUser(a, (c) => c.query("update public.profiles set display_name = 'hacked' where id = $1", [b.id]));
    expect(res.rowCount).toBe(0);
  });

  it('hides profiles of people you share no family with', async () => {
    const a = await createUser('Asha');
    const b = await createUser('Bina');
    const rows = await asUser(a, async (c) => (await c.query('select id from public.profiles')).rows);
    expect(rows.map((r) => r.id)).toEqual([a.id]);
    expect(rows.map((r) => r.id)).not.toContain(b.id);
  });
});
