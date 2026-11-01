import { describe, expect, it } from 'vitest';
import { ASSIGNABLE_ROLES } from '@familyhub/shared';
import { createFamily, createUser, familyWith, invite, rpc, sql } from '../helpers/db';

// Owner decision (1 Nov 2026): FamilyHub has no child users, so the Child role is hidden.
describe('hidden Child role', () => {
  it('cannot be used for new invitations', async () => {
    const admin = await createUser('Admin');
    const familyId = await createFamily(admin);
    await expect(invite(admin, familyId, 'child')).rejects.toThrow(/FH_INVALID_ROLE/);
    await expect(invite(admin, familyId, 'child', '+919833333333')).rejects.toThrow(/FH_INVALID_ROLE/);
  });

  it('cannot be given to an existing member', async () => {
    const admin = await createUser('Admin');
    const member = await createUser('Member');
    const familyId = await familyWith(admin, [{ user: member, role: 'adult' }]);
    await expect(rpc(admin, 'change_member_role', [familyId, member.id, 'child', null])).rejects.toThrow(/FH_INVALID_ROLE/);
  });

  it('is blocked even for direct writes that bypass the RPCs', async () => {
    const admin = await createUser('Admin');
    const outsider = await createUser('Outsider');
    const familyId = await createFamily(admin);
    await expect(
      sql("insert into public.family_members (family_id, user_id, role) values ($1, $2, 'child')", [familyId, outsider.id]),
    ).rejects.toThrow(/FH_INVALID_ROLE/);
  });

  it('still lets an admin move a pre-existing child member to another role', async () => {
    const admin = await createUser('Admin');
    const legacy = await createUser('Legacy');
    const familyId = await familyWith(admin, [{ user: legacy, role: 'viewer' }]);
    // Simulate a row created before the role was hidden.
    await sql('alter table public.family_members disable trigger family_members_assignable_role');
    await sql("update public.family_members set role = 'child' where family_id = $1 and user_id = $2", [familyId, legacy.id]);
    await sql('alter table public.family_members enable trigger family_members_assignable_role');

    await rpc(admin, 'change_member_role', [familyId, legacy.id, 'adult', null]);
    const row = (await sql('select role from public.family_members where family_id = $1 and user_id = $2', [familyId, legacy.id])).rows[0]!;
    expect(row.role).toBe('adult');
  });

  it('matches the roles the app offers', async () => {
    const { rows } = await sql<{ role: string }>(
      "select r::text as role from unnest(enum_range(null::public.family_role)) r where app.role_is_assignable(r) order by r",
    );
    expect(rows.map((r) => r.role).sort()).toEqual([...ASSIGNABLE_ROLES].sort());
  });
});
