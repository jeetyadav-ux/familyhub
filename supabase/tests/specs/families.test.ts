import { describe, expect, it } from 'vitest';
import { asUser, createFamily, createUser, familyWith, rpc, rpcValue, select, sql } from '../helpers/db';

describe('creating a family', () => {
  it('requires a profile name', async () => {
    const nameless = await createUser(null);
    await expect(rpcValue(nameless, 'create_family', ['Home', null])).rejects.toThrow(/FH_PROFILE_INCOMPLETE/);
  });

  it('validates the family name', async () => {
    const user = await createUser('Jeet');
    await expect(rpcValue(user, 'create_family', ['   ', null])).rejects.toThrow(/FH_INVALID_INPUT/);
    await expect(rpcValue(user, 'create_family', ['x'.repeat(61), null])).rejects.toThrow(/FH_INVALID_INPUT/);
  });

  it('makes the creator primary admin, sets last family and logs activity', async () => {
    const jeet = await createUser('Jeet');
    const familyId = await createFamily(jeet, 'Yadav Family');

    const fam = (await sql('select primary_admin_id, created_by, currency from public.families where id = $1', [familyId])).rows[0]!;
    expect(fam).toEqual({ primary_admin_id: jeet.id, created_by: jeet.id, currency: 'INR' });

    const member = (await sql('select role, status from public.family_members where family_id = $1', [familyId])).rows;
    expect(member).toEqual([{ role: 'admin', status: 'active' }]);

    const profile = (await sql('select last_family_id from public.profiles where id = $1', [jeet.id])).rows[0]!;
    expect(profile.last_family_id).toBe(familyId);

    const activity = await select(jeet, 'select verb, data from public.family_activity where family_id = $1', [familyId]);
    expect(activity).toEqual([{ verb: 'family.created', data: { actor_name: 'Jeet', name: 'Yadav Family' } }]);
  });

  it('lists the families a user belongs to', async () => {
    const jeet = await createUser('Jeet');
    const f1 = await createFamily(jeet, 'Alpha');
    const f2 = await createFamily(jeet, 'Beta');
    const rows = await rpc<{ family_id: string; role: string; is_primary_admin: boolean; member_count: string }>(
      jeet,
      'my_families',
    );
    expect(rows.map((r) => [r.family_id, r.role, r.is_primary_admin, Number(r.member_count)])).toEqual([
      [f1, 'admin', true, 1],
      [f2, 'admin', true, 1],
    ]);
  });
});

describe('family isolation', () => {
  it('keeps one family invisible to another', async () => {
    const a = await createUser('Asha');
    const b = await createUser('Bina');
    const familyA = await createFamily(a, 'A family');
    await createFamily(b, 'B family');

    expect(await select(b, 'select id from public.families where id = $1', [familyA])).toEqual([]);
    expect(await select(b, 'select id from public.family_members where family_id = $1', [familyA])).toEqual([]);
    expect(await select(b, 'select id from public.family_activity where family_id = $1', [familyA])).toEqual([]);
    expect(await select(b, 'select id from public.audit_logs where family_id = $1', [familyA])).toEqual([]);
    await expect(rpcValue(b, 'get_home_summary', [familyA])).rejects.toThrow(/FH_NOT_AUTHORIZED/);
    await expect(rpc(b, 'family_permission_matrix', [familyA])).rejects.toThrow(/FH_NOT_AUTHORIZED/);
    expect(await rpcValue<string[]>(b, 'my_permissions', [familyA])).toEqual([]);
  });

  it('prevents pointing last_family_id at a family you are not in', async () => {
    const a = await createUser('Asha');
    const b = await createUser('Bina');
    const familyA = await createFamily(a, 'A family');
    await expect(
      asUser(b, (c) => c.query('update public.profiles set last_family_id = $1 where id = $2', [familyA, b.id])),
    ).rejects.toThrow(/row-level security/);
  });

  it('shows co-members profiles but not their families elsewhere', async () => {
    const a = await createUser('Asha');
    const b = await createUser('Bina');
    const c = await createUser('Chirag');
    await familyWith(a, [{ user: b, role: 'adult' }]);
    const other = await createFamily(c, 'C only');

    const visible = await select<{ id: string }>(b, 'select id from public.profiles order by id');
    expect(visible.map((r) => r.id).sort()).toEqual([a.id, b.id].sort());
    expect(await select(b, 'select id from public.families where id = $1', [other])).toEqual([]);
  });
});

describe('family settings', () => {
  it('lets admins rename the family and records it in the feed', async () => {
    const a = await createUser('Asha');
    const familyId = await createFamily(a, 'Old name');
    await asUser(a, (c) => c.query("update public.families set name = 'New name' where id = $1", [familyId]));
    const feed = await select<{ verb: string; data: Record<string, string> }>(
      a,
      "select verb, data from public.family_activity where family_id = $1 and verb = 'family.renamed'",
      [familyId],
    );
    expect(feed[0]!.data).toMatchObject({ from: 'Old name', to: 'New name' });
  });

  it('does not let adults, children or viewers change settings', async () => {
    const a = await createUser('Asha');
    const adult = await createUser('Adult');
    const viewer = await createUser('Viewer');
    const familyId = await familyWith(a, [
      { user: adult, role: 'adult' },
      { user: viewer, role: 'viewer' },
    ]);
    for (const u of [adult, viewer]) {
      const res = await asUser(u, (c) => c.query("update public.families set name = 'Hijacked' where id = $1", [familyId]));
      expect(res.rowCount).toBe(0);
    }
    expect((await sql('select name from public.families where id = $1', [familyId])).rows[0]!.name).toBe('Test Family');
  });

  it('never lets anyone change primary_admin_id or deleted_at directly', async () => {
    const a = await createUser('Asha');
    const familyId = await createFamily(a);
    await expect(
      asUser(a, (c) => c.query('update public.families set deleted_at = now() where id = $1', [familyId])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(a, (c) => c.query('update public.families set primary_admin_id = $2 where id = $1', [familyId, a.id])),
    ).rejects.toThrow(/permission denied/);
  });

  it('does not allow direct writes to memberships', async () => {
    const a = await createUser('Asha');
    const familyId = await createFamily(a);
    const intruder = await createUser('Intruder');
    await expect(
      asUser(intruder, (c) =>
        c.query("insert into public.family_members (family_id, user_id, role) values ($1, $2, 'admin')", [familyId, intruder.id]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('home summary', () => {
  it('returns real members, activity and setup state', async () => {
    const a = await createUser('Asha');
    const b = await createUser('Bina');
    const familyId = await familyWith(a, [{ user: b, role: 'adult' }], 'Sharma Family');

    const summary = await rpcValue<any>(a, 'get_home_summary', [familyId]);
    expect(summary.family.name).toBe('Sharma Family');
    expect(summary.my_role).toBe('admin');
    expect(summary.is_primary_admin).toBe(true);
    expect(summary.members.map((m: any) => [m.display_name, m.role, m.is_primary_admin])).toEqual([
      ['Asha', 'admin', true],
      ['Bina', 'adult', false],
    ]);
    expect(summary.pending_invitations).toBe(0);
    expect(summary.setup).toEqual({ has_other_members: true, has_secondary_admin: false, has_pending_invitation: false });
    expect(summary.recent_activity.map((x: any) => x.verb)).toEqual(['member.joined', 'invitation.created', 'family.created']);

    const asAdult = await rpcValue<any>(b, 'get_home_summary', [familyId]);
    expect(asAdult.my_role).toBe('adult');
    expect(asAdult.pending_invitations).toBeNull();
  });
});

describe('dashboard layouts', () => {
  it('stores a per-user layout only for families the user belongs to', async () => {
    const a = await createUser('Asha');
    const b = await createUser('Bina');
    const familyA = await createFamily(a);
    const widgets = JSON.stringify([{ id: 'family_activity', visible: true }]);

    await asUser(a, (c) =>
      c.query('insert into public.user_dashboard_layouts (user_id, family_id, widgets) values ($1, $2, $3)', [a.id, familyA, widgets]),
    );
    await expect(
      asUser(b, (c) =>
        c.query('insert into public.user_dashboard_layouts (user_id, family_id, widgets) values ($1, $2, $3)', [b.id, familyA, widgets]),
      ),
    ).rejects.toThrow(/row-level security/);
    expect(await select(b, 'select * from public.user_dashboard_layouts')).toEqual([]);
    expect(await select(a, 'select family_id from public.user_dashboard_layouts')).toEqual([{ family_id: familyA }]);
  });
});
