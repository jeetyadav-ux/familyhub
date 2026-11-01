import { describe, expect, it } from 'vitest';
import { INVITE_CODE_ALPHABET } from '@familyhub/shared';
import { asUser, createFamily, createUser, familyWith, invite, rpc, rpcValue, select, sql } from '../helpers/db';

type Result = { ok: boolean; error?: string; family_id?: string | null; family_name?: string; role?: string };

describe('creating invitations', () => {
  it('returns a one-time code in XXXX-XXXX form from the safe alphabet', async () => {
    const admin = await createUser('Admin');
    const familyId = await createFamily(admin);
    const inv = await invite(admin, familyId, 'adult');
    expect(inv.code).toMatch(new RegExp(`^[${INVITE_CODE_ALPHABET}]{4}-[${INVITE_CODE_ALPHABET}]{4}$`));
    const expiresInDays = (new Date(inv.expires_at).getTime() - Date.now()) / 86_400_000;
    expect(expiresInDays).toBeGreaterThan(6.9);
    expect(expiresInDays).toBeLessThanOrEqual(7);
  });

  it('stores only a hash of the code and never exposes it to clients', async () => {
    const admin = await createUser('Admin');
    const familyId = await createFamily(admin);
    const inv = await invite(admin, familyId, 'adult');
    const stored = (await sql('select code_hash, code_hint from public.family_invitations where id = $1', [inv.invitation_id])).rows[0]!;
    expect(stored.code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.code_hash).not.toContain(inv.code.replace('-', ''));
    expect(stored.code_hint).toBe(inv.code.slice(-2));

    await expect(select(admin, 'select code_hash from public.family_invitations')).rejects.toThrow(/permission denied/);
    const visible = await select(admin, 'select id, code_hint, status from public.family_invitations where family_id = $1', [familyId]);
    expect(visible).toHaveLength(1);

    const audit = (await sql("select new_values from public.audit_logs where table_name = 'family_invitations'")).rows;
    for (const row of audit) expect(row.new_values ?? {}).not.toHaveProperty('code_hash');
  });

  it('only lets members with members.invite create invitations', async () => {
    const admin = await createUser('Admin');
    const adult = await createUser('Adult');
    const familyId = await familyWith(admin, [{ user: adult, role: 'adult' }]);
    await expect(invite(adult, familyId, 'child')).rejects.toThrow(/FH_NOT_AUTHORIZED/);

    const outsider = await createUser('Outsider');
    await expect(invite(outsider, familyId, 'child')).rejects.toThrow(/FH_NOT_AUTHORIZED/);
  });

  it('lets an adult invite once granted, but never invite an admin', async () => {
    const admin = await createUser('Admin');
    const adult = await createUser('Adult');
    const familyId = await familyWith(admin, [{ user: adult, role: 'adult' }]);
    await rpc(admin, 'set_role_permission', [familyId, 'adult', 'members.invite', true]);

    await expect(invite(adult, familyId, 'child')).resolves.toBeTruthy();
    await expect(invite(adult, familyId, 'admin')).rejects.toThrow(/FH_NOT_AUTHORIZED/);
  });

  it('rejects bad phones and people who are already members', async () => {
    const admin = await createUser('Admin');
    const adult = await createUser('Adult');
    const familyId = await familyWith(admin, [{ user: adult, role: 'adult' }]);
    await expect(invite(admin, familyId, 'adult', '98765')).rejects.toThrow(/FH_INVALID_PHONE/);
    await expect(invite(admin, familyId, 'adult', adult.phone)).rejects.toThrow(/FH_ALREADY_MEMBER/);
  });

  it('replaces an earlier pending invitation to the same phone', async () => {
    const admin = await createUser('Admin');
    const familyId = await createFamily(admin);
    const first = await invite(admin, familyId, 'adult', '+919811111111');
    await invite(admin, familyId, 'child', '+919811111111');
    const old = (await sql('select status from public.family_invitations where id = $1', [first.invitation_id])).rows[0]!;
    expect(old.status).toBe('revoked');
  });

  it('caps pending invitations at 20 per family', async () => {
    const admin = await createUser('Admin');
    const familyId = await createFamily(admin);
    for (let i = 0; i < 20; i += 1) await invite(admin, familyId, 'viewer');
    await expect(invite(admin, familyId, 'viewer')).rejects.toThrow(/FH_TOO_MANY_INVITES/);
  });
});

describe('joining with a code', () => {
  it('previews then joins with the invited role, logging activity', async () => {
    const admin = await createUser('Jeet');
    const joiner = await createUser('Priya');
    const familyId = await createFamily(admin, 'Yadav Family');
    const { code } = await invite(admin, familyId, 'adult');

    const preview = await rpcValue<Result & { inviter_name: string; member_count: number }>(joiner, 'preview_invitation', [
      code.toLowerCase(),
    ]);
    expect(preview).toMatchObject({ ok: true, family_name: 'Yadav Family', inviter_name: 'Jeet', role: 'adult', member_count: 1 });

    const accepted = await rpcValue<Result>(joiner, 'accept_invitation', [code]);
    expect(accepted).toEqual({ ok: true, family_id: familyId });

    const membership = (await sql('select role, status, invited_by from public.family_members where family_id = $1 and user_id = $2', [familyId, joiner.id])).rows[0]!;
    expect(membership).toEqual({ role: 'adult', status: 'active', invited_by: admin.id });
    const lastFamily = (await sql('select last_family_id from public.profiles where id = $1', [joiner.id])).rows[0]!;
    expect(lastFamily.last_family_id).toBe(familyId);

    const feed = await select<{ verb: string; data: any }>(joiner, "select verb, data from public.family_activity where family_id = $1 and verb = 'member.joined'", [familyId]);
    expect(feed[0]!.data).toMatchObject({ actor_name: 'Priya', role: 'adult' });
  });

  it('cannot be used twice', async () => {
    const admin = await createUser('Admin');
    const first = await createUser('First');
    const second = await createUser('Second');
    const familyId = await createFamily(admin);
    const { code } = await invite(admin, familyId, 'adult');
    expect((await rpcValue<Result>(first, 'accept_invitation', [code])).ok).toBe(true);
    expect(await rpcValue<Result>(second, 'accept_invitation', [code])).toMatchObject({ ok: false, error: 'FH_INVITE_INVALID' });
  });

  it('enforces the phone lock on phone-addressed invitations', async () => {
    const admin = await createUser('Admin');
    const intended = await createUser('Intended');
    const other = await createUser('Other');
    const familyId = await createFamily(admin);
    const { code } = await invite(admin, familyId, 'adult', intended.phone);

    const wrong = await rpcValue<Result>(other, 'preview_invitation', [code]);
    expect(wrong).toEqual({ ok: false, error: 'FH_INVITE_WRONG_PHONE', family_id: null });
    expect(wrong).not.toHaveProperty('family_name');
    expect((await rpcValue<Result>(other, 'accept_invitation', [code])).error).toBe('FH_INVITE_WRONG_PHONE');
    expect((await rpcValue<Result>(intended, 'accept_invitation', [code])).ok).toBe(true);
  });

  it('rejects expired, revoked and malformed codes', async () => {
    const admin = await createUser('Admin');
    const joiner = await createUser('Joiner');
    const familyId = await createFamily(admin);

    const expired = await invite(admin, familyId, 'adult');
    await sql("update public.family_invitations set expires_at = now() - interval '1 minute' where id = $1", [expired.invitation_id]);
    expect((await rpcValue<Result>(joiner, 'accept_invitation', [expired.code])).error).toBe('FH_INVITE_EXPIRED');

    const revoked = await invite(admin, familyId, 'adult');
    await rpc(admin, 'revoke_invitation', [revoked.invitation_id]);
    expect((await rpcValue<Result>(joiner, 'accept_invitation', [revoked.code])).error).toBe('FH_INVITE_INVALID');

    expect((await rpcValue<Result>(joiner, 'accept_invitation', ['nope'])).error).toBe('FH_INVITE_INVALID');
  });

  it('tells existing members they are already in, without burning an attempt', async () => {
    const admin = await createUser('Admin');
    const familyId = await createFamily(admin);
    const { code } = await invite(admin, familyId, 'adult');
    expect(await rpcValue<Result>(admin, 'accept_invitation', [code])).toEqual({
      ok: false,
      error: 'FH_ALREADY_MEMBER',
      family_id: familyId,
    });
    const attempts = (await sql('select count(*)::int as n from public.invitation_attempts where user_id = $1', [admin.id])).rows[0]!;
    expect(attempts.n).toBe(0);
  });

  it('locks a user out after 10 failed attempts in an hour, even with a valid code', async () => {
    const admin = await createUser('Admin');
    const guesser = await createUser('Guesser');
    const familyId = await createFamily(admin);
    const { code } = await invite(admin, familyId, 'adult');

    for (let i = 0; i < 10; i += 1) {
      expect((await rpcValue<Result>(guesser, 'accept_invitation', ['ABCD-EFGH'])).error).toBe('FH_INVITE_INVALID');
    }
    expect((await rpcValue<Result>(guesser, 'accept_invitation', [code])).error).toBe('FH_RATE_LIMITED');
    expect((await rpcValue<Result>(guesser, 'preview_invitation', [code])).error).toBe('FH_RATE_LIMITED');

    await sql("update public.invitation_attempts set created_at = now() - interval '61 minutes' where user_id = $1", [guesser.id]);
    expect((await rpcValue<Result>(guesser, 'accept_invitation', [code])).ok).toBe(true);
  });

  it('lets a removed member rejoin through a new invitation', async () => {
    const admin = await createUser('Admin');
    const member = await createUser('Member');
    const familyId = await familyWith(admin, [{ user: member, role: 'adult' }]);
    await rpc(admin, 'remove_member', [familyId, member.id, null]);
    const { code } = await invite(admin, familyId, 'viewer');
    expect((await rpcValue<Result>(member, 'accept_invitation', [code])).ok).toBe(true);
    const row = (await sql('select role, status, removed_at from public.family_members where family_id = $1 and user_id = $2', [familyId, member.id])).rows[0]!;
    expect(row).toEqual({ role: 'viewer', status: 'active', removed_at: null });
  });
});

describe('phone-addressed invitations (no code)', () => {
  it('shows up for the invitee and can be accepted by id', async () => {
    const admin = await createUser('Jeet');
    const invitee = await createUser('Maa');
    const familyId = await createFamily(admin, 'Yadav Family');
    const inv = await invite(admin, familyId, 'adult', invitee.phone);

    const pending = await rpc<{ invitation_id: string; family_name: string; inviter_name: string }>(invitee, 'my_pending_invitations');
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ invitation_id: inv.invitation_id, family_name: 'Yadav Family', inviter_name: 'Jeet' });

    const someoneElse = await createUser('Else');
    expect(await rpc(someoneElse, 'my_pending_invitations')).toEqual([]);
    await expect(rpcValue(someoneElse, 'accept_invitation_by_id', [inv.invitation_id])).rejects.toThrow(/FH_INVITE_WRONG_PHONE/);

    expect(await rpcValue<Result>(invitee, 'accept_invitation_by_id', [inv.invitation_id])).toEqual({ ok: true, family_id: familyId });
    expect(await rpc(invitee, 'my_pending_invitations')).toEqual([]);
  });

  it('cannot accept code-only invitations by id', async () => {
    const admin = await createUser('Admin');
    const user = await createUser('User');
    const familyId = await createFamily(admin);
    const inv = await invite(admin, familyId, 'adult');
    await expect(rpcValue(user, 'accept_invitation_by_id', [inv.invitation_id])).rejects.toThrow(/FH_INVITE_INVALID/);
  });

  it('can be declined by the invitee only', async () => {
    const admin = await createUser('Admin');
    const invitee = await createUser('Invitee');
    const familyId = await createFamily(admin);
    const inv = await invite(admin, familyId, 'adult', invitee.phone);
    await expect(rpc(admin, 'decline_invitation', [inv.invitation_id])).rejects.toThrow(/FH_INVITE_INVALID/);
    await rpc(invitee, 'decline_invitation', [inv.invitation_id]);
    expect((await sql('select status from public.family_invitations where id = $1', [inv.invitation_id])).rows[0]!.status).toBe('declined');
  });
});

describe('managing invitations', () => {
  it('reissuing kills the old code and extends expiry', async () => {
    const admin = await createUser('Admin');
    const joiner = await createUser('Joiner');
    const familyId = await createFamily(admin);
    const original = await invite(admin, familyId, 'adult');
    await sql("update public.family_invitations set expires_at = now() + interval '1 day' where id = $1", [original.invitation_id]);

    const [reissued] = await rpc<{ invitation_id: string; code: string; expires_at: Date }>(admin, 'reissue_invitation', [original.invitation_id]);
    expect(reissued!.invitation_id).toBe(original.invitation_id);
    expect(reissued!.code).not.toBe(original.code);
    expect(new Date(reissued!.expires_at).getTime()).toBeGreaterThan(Date.now() + 6.9 * 86_400_000);

    expect((await rpcValue<Result>(joiner, 'accept_invitation', [original.code])).error).toBe('FH_INVITE_INVALID');
    expect((await rpcValue<Result>(joiner, 'accept_invitation', [reissued!.code])).ok).toBe(true);
  });

  it('only inviters can see, revoke or reissue invitations', async () => {
    const admin = await createUser('Admin');
    const adult = await createUser('Adult');
    const familyId = await familyWith(admin, [{ user: adult, role: 'adult' }]);
    const inv = await invite(admin, familyId, 'viewer');

    expect(await select(adult, 'select id from public.family_invitations where family_id = $1', [familyId])).toEqual([]);
    await expect(rpc(adult, 'revoke_invitation', [inv.invitation_id])).rejects.toThrow(/FH_NOT_AUTHORIZED/);
    await expect(rpc(adult, 'reissue_invitation', [inv.invitation_id])).rejects.toThrow(/FH_NOT_AUTHORIZED/);
  });

  it('writes no rows for anonymous callers', async () => {
    await expect(asUser(null, (c) => c.query("select public.accept_invitation('ABCD-EFGH')"))).rejects.toThrow(/permission denied/);
  });
});
