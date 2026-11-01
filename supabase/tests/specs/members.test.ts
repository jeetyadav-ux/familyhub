import { describe, expect, it } from 'vitest';
import { asUser, createFamily, createUser, familyWith, invite, rpc, rpcValue, select, sql } from '../helpers/db';

describe('changing roles', () => {
  it('lets admins change roles and records the reason in the audit log', async () => {
    const admin = await createUser('Admin');
    const member = await createUser('Member');
    const familyId = await familyWith(admin, [{ user: member, role: 'adult' }]);
    await rpc(admin, 'change_member_role', [familyId, member.id, 'viewer', 'Read-only for now']);

    const row = (await sql('select role from public.family_members where family_id = $1 and user_id = $2', [familyId, member.id])).rows[0]!;
    expect(row.role).toBe('viewer');

    const audit = await select<{ old_values: any; new_values: any; reason: string; actor_id: string }>(
      admin,
      "select old_values, new_values, reason, actor_id from public.audit_logs where family_id = $1 and table_name = 'family_members' and action = 'update'",
      [familyId],
    );
    expect(audit).toEqual([
      { old_values: { role: 'adult' }, new_values: { role: 'viewer' }, reason: 'Read-only for now', actor_id: admin.id },
    ]);
  });

  it('stops non-admins, self-changes and changes to the primary admin', async () => {
    const primary = await createUser('Primary');
    const second = await createUser('Second admin');
    const adult = await createUser('Adult');
    const familyId = await familyWith(primary, [
      { user: second, role: 'admin' },
      { user: adult, role: 'adult' },
    ]);
    await expect(rpc(adult, 'change_member_role', [familyId, second.id, 'viewer', null])).rejects.toThrow(/FH_NOT_AUTHORIZED/);
    await expect(rpc(second, 'change_member_role', [familyId, second.id, 'adult', null])).rejects.toThrow(/FH_CANNOT_TARGET_SELF/);
    await expect(rpc(second, 'change_member_role', [familyId, primary.id, 'adult', null])).rejects.toThrow(/FH_PRIMARY_ADMIN_PROTECTED/);
  });

  it('only the primary admin can demote another admin', async () => {
    const primary = await createUser('Primary');
    const a1 = await createUser('Admin one');
    const a2 = await createUser('Admin two');
    const familyId = await familyWith(primary, [
      { user: a1, role: 'admin' },
      { user: a2, role: 'admin' },
    ]);
    await expect(rpc(a1, 'change_member_role', [familyId, a2.id, 'adult', null])).rejects.toThrow(/FH_NOT_AUTHORIZED/);
    await rpc(primary, 'change_member_role', [familyId, a2.id, 'adult', null]);
  });

  it('protects the primary admin even against direct table updates', async () => {
    const primary = await createUser('Primary');
    const familyId = await createFamily(primary);
    await expect(
      sql("update public.family_members set role = 'viewer' where family_id = $1 and user_id = $2", [familyId, primary.id]),
    ).rejects.toThrow(/FH_PRIMARY_ADMIN_PROTECTED/);
  });
});

describe('removing and leaving', () => {
  it('cuts off access immediately but keeps the account and other families', async () => {
    const admin = await createUser('Admin');
    const member = await createUser('Member');
    const familyId = await familyWith(admin, [{ user: member, role: 'adult' }]);
    const ownFamily = await createFamily(member, 'Member own family');

    await rpc(admin, 'remove_member', [familyId, member.id, 'Moved out']);

    expect(await select(member, 'select id from public.families where id = $1', [familyId])).toEqual([]);
    expect(await select(member, 'select id from public.family_members where family_id = $1', [familyId])).toEqual([]);
    expect(await select(member, 'select id from public.family_activity where family_id = $1', [familyId])).toEqual([]);
    await expect(rpcValue(member, 'get_home_summary', [familyId])).rejects.toThrow(/FH_NOT_AUTHORIZED/);

    expect((await sql('select count(*)::int as n from public.profiles where id = $1', [member.id])).rows[0]!.n).toBe(1);
    expect(await select(member, 'select id from public.families where id = $1', [ownFamily])).toHaveLength(1);

    // the remaining admin no longer sees the removed member's profile
    expect(await select(admin, 'select id from public.profiles where id = $1', [member.id])).toEqual([]);
    const row = (await sql('select status, removed_by from public.family_members where family_id = $1 and user_id = $2', [familyId, member.id])).rows[0]!;
    expect(row).toEqual({ status: 'removed', removed_by: admin.id });
  });

  it('applies the same protections as role changes', async () => {
    const primary = await createUser('Primary');
    const a1 = await createUser('Admin one');
    const a2 = await createUser('Admin two');
    const adult = await createUser('Adult');
    const familyId = await familyWith(primary, [
      { user: a1, role: 'admin' },
      { user: a2, role: 'admin' },
      { user: adult, role: 'adult' },
    ]);
    await expect(rpc(adult, 'remove_member', [familyId, a1.id, null])).rejects.toThrow(/FH_NOT_AUTHORIZED/);
    await expect(rpc(a1, 'remove_member', [familyId, a2.id, null])).rejects.toThrow(/FH_NOT_AUTHORIZED/);
    await expect(rpc(a1, 'remove_member', [familyId, primary.id, null])).rejects.toThrow(/FH_PRIMARY_ADMIN_PROTECTED/);
    await expect(rpc(a1, 'remove_member', [familyId, a1.id, null])).rejects.toThrow(/FH_CANNOT_TARGET_SELF/);
    await rpc(a1, 'remove_member', [familyId, adult.id, null]);
  });

  it('lets members leave, but not the primary admin', async () => {
    const primary = await createUser('Primary');
    const member = await createUser('Member');
    const familyId = await familyWith(primary, [{ user: member, role: 'child' }]);
    await expect(rpc(primary, 'leave_family', [familyId])).rejects.toThrow(/FH_TRANSFER_REQUIRED/);
    await rpc(member, 'leave_family', [familyId]);
    expect((await sql('select status from public.family_members where family_id = $1 and user_id = $2', [familyId, member.id])).rows[0]!.status).toBe('left');
  });
});

describe('transferring ownership and deleting a family', () => {
  it('requires a fresh OTP to transfer primary admin', async () => {
    const primary = await createUser('Primary');
    const adult = await createUser('Adult');
    const familyId = await familyWith(primary, [{ user: adult, role: 'adult' }]);

    await expect(rpc(primary, 'transfer_primary_admin', [familyId, adult.id], { authAgeSeconds: 3600 })).rejects.toThrow(/FH_REAUTH_REQUIRED/);
    await rpc(primary, 'transfer_primary_admin', [familyId, adult.id], { authAgeSeconds: 60 });

    const fam = (await sql('select primary_admin_id from public.families where id = $1', [familyId])).rows[0]!;
    expect(fam.primary_admin_id).toBe(adult.id);
    const roles = (await sql('select user_id, role from public.family_members where family_id = $1 order by joined_at', [familyId])).rows;
    expect(roles).toEqual([
      { user_id: primary.id, role: 'admin' },
      { user_id: adult.id, role: 'admin' },
    ]);
    // the former primary is now an ordinary admin and can leave
    await rpc(primary, 'leave_family', [familyId]);
  });

  it('treats a JWT without an amr claim as not recently authenticated', async () => {
    const primary = await createUser('Primary');
    const adult = await createUser('Adult');
    const familyId = await familyWith(primary, [{ user: adult, role: 'adult' }]);
    await expect(
      asUser(primary, async (c) => {
        await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: primary.id, role: 'authenticated' })]);
        await c.query('select public.transfer_primary_admin($1, $2)', [familyId, adult.id]);
      }),
    ).rejects.toThrow(/FH_REAUTH_REQUIRED/);
  });

  it('only the primary admin can delete, with a fresh OTP and the exact family name', async () => {
    const primary = await createUser('Primary');
    const second = await createUser('Second');
    const familyId = await familyWith(primary, [{ user: second, role: 'admin' }], 'Delete Me');

    await expect(rpc(second, 'delete_family', [familyId, 'Delete Me'])).rejects.toThrow(/FH_NOT_AUTHORIZED/);
    await expect(rpc(primary, 'delete_family', [familyId, 'Delete Me'], { authAgeSeconds: 3600 })).rejects.toThrow(/FH_REAUTH_REQUIRED/);
    await expect(rpc(primary, 'delete_family', [familyId, 'Delete'])).rejects.toThrow(/FH_CONFIRMATION_MISMATCH/);

    await rpc(primary, 'delete_family', [familyId, '  delete me ']);
    for (const u of [primary, second]) {
      expect(await select(u, 'select id from public.families where id = $1', [familyId])).toEqual([]);
      expect(await rpc(u, 'my_families')).toEqual([]);
    }
    const lastFamilies = (await sql('select last_family_id from public.profiles where id = any($1)', [[primary.id, second.id]])).rows;
    expect(lastFamilies.every((r) => r.last_family_id === null)).toBe(true);
    // soft delete: the row still exists for recovery
    expect((await sql('select deleted_by from public.families where id = $1', [familyId])).rows[0]!.deleted_by).toBe(primary.id);
  });
});

describe('permissions', () => {
  it('reports each role its effective permissions', async () => {
    const admin = await createUser('Admin');
    const adult = await createUser('Adult');
    const viewer = await createUser('Viewer');
    const familyId = await familyWith(admin, [
      { user: adult, role: 'adult' },
      { user: viewer, role: 'viewer' },
    ]);
    const adminPerms = await rpcValue<string[]>(admin, 'my_permissions', [familyId]);
    expect(adminPerms).toContain('members.remove');
    expect(adminPerms).toContain('permissions.manage');
    const adultPerms = await rpcValue<string[]>(adult, 'my_permissions', [familyId]);
    expect(adultPerms).toContain('finance.edit_shared');
    expect(adultPerms).not.toContain('members.invite');
    const viewerPerms = await rpcValue<string[]>(viewer, 'my_permissions', [familyId]);
    expect(viewerPerms).toEqual(['calendar.view', 'finance.view_shared', 'shopping.view', 'tasks.view', 'vault.view_shared']);
  });

  it('applies overrides, removes no-op overrides and refuses admin-only keys', async () => {
    const admin = await createUser('Admin');
    const viewer = await createUser('Viewer');
    const familyId = await familyWith(admin, [{ user: viewer, role: 'viewer' }]);

    await rpc(admin, 'set_role_permission', [familyId, 'viewer', 'audit.view', true]);
    expect(await rpcValue<string[]>(viewer, 'my_permissions', [familyId])).toContain('audit.view');
    expect((await select(viewer, 'select count(*)::int as n from public.audit_logs where family_id = $1', [familyId]))[0]!.n).toBeGreaterThan(0);

    await rpc(admin, 'set_role_permission', [familyId, 'viewer', 'audit.view', false]);
    expect((await sql('select count(*)::int as n from public.family_role_permissions where family_id = $1', [familyId])).rows[0]!.n).toBe(0);

    await expect(rpc(admin, 'set_role_permission', [familyId, 'viewer', 'members.remove', true])).rejects.toThrow(/FH_PERMISSION_NOT_GRANTABLE/);
    await expect(rpc(admin, 'set_role_permission', [familyId, 'admin', 'audit.view', false])).rejects.toThrow(/FH_INVALID_ROLE/);
    await expect(rpc(viewer, 'set_role_permission', [familyId, 'viewer', 'audit.view', true])).rejects.toThrow(/FH_NOT_AUTHORIZED/);
  });

  it('even a forged override row cannot grant an admin-only permission', async () => {
    const admin = await createUser('Admin');
    const adult = await createUser('Adult');
    const familyId = await familyWith(admin, [{ user: adult, role: 'adult' }]);
    await sql("insert into public.family_role_permissions (family_id, role, permission, allowed) values ($1, 'adult', 'members.remove', true)", [familyId]);
    expect(await rpcValue<string[]>(adult, 'my_permissions', [familyId])).not.toContain('members.remove');
    await expect(rpc(adult, 'remove_member', [familyId, admin.id, null])).rejects.toThrow(/FH_NOT_AUTHORIZED/);
  });

  it('returns a full matrix to members', async () => {
    const admin = await createUser('Admin');
    const familyId = await createFamily(admin);
    const rows = await rpc<{ permission: string; role: string; allowed: boolean }>(admin, 'family_permission_matrix', [familyId]);
    const count = (await sql('select count(*)::int as n from public.permissions')).rows[0]!.n;
    expect(rows).toHaveLength(count * 4);
    expect(rows.filter((r) => r.role === 'admin').every((r) => r.allowed)).toBe(true);
  });
});

describe('audit visibility', () => {
  it('is visible to admins only by default', async () => {
    const admin = await createUser('Admin');
    const adult = await createUser('Adult');
    const familyId = await familyWith(admin, [{ user: adult, role: 'adult' }]);
    expect((await select(admin, 'select id from public.audit_logs where family_id = $1', [familyId])).length).toBeGreaterThan(0);
    expect(await select(adult, 'select id from public.audit_logs where family_id = $1', [familyId])).toEqual([]);
    await expect(asUser(admin, (c) => c.query('delete from public.audit_logs'))).rejects.toThrow(/permission denied/);
    await expect(asUser(admin, (c) => c.query('update public.audit_logs set reason = null'))).rejects.toThrow(/permission denied/);
  });

  it('records who invited whom', async () => {
    const admin = await createUser('Admin');
    const familyId = await createFamily(admin);
    const inv = await invite(admin, familyId, 'adult', '+919822222222');
    const rows = await select<{ action: string; actor_id: string; new_values: any }>(
      admin,
      "select action, actor_id, new_values from public.audit_logs where table_name = 'family_invitations' and record_id = $1 order by id",
      [inv.invitation_id],
    );
    expect(rows[0]).toMatchObject({ action: 'insert', actor_id: admin.id });
    expect(rows[0]!.new_values).toMatchObject({ phone: '+919822222222', role: 'adult' });
  });
});
