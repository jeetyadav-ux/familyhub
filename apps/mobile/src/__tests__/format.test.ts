import { describeAudit } from '@/lib/audit';
import { describeActivity, expiryLabel, greeting, relativeTime, roleWithArticle } from '@/lib/format';

const NOW = new Date('2026-11-01T12:00:00+05:30');

describe('relativeTime', () => {
  it.each([
    ['2026-11-01T11:59:40+05:30', 'just now'],
    ['2026-11-01T11:55:00+05:30', '5 min ago'],
    ['2026-11-01T09:00:00+05:30', '3 h ago'],
    ['2026-10-31T09:00:00+05:30', 'yesterday'],
  ])('%s → %s', (iso, expected) => {
    expect(relativeTime(iso, NOW)).toBe(expected);
  });

  it('falls back to a date for older items', () => {
    expect(relativeTime('2026-10-12T09:00:00+05:30', NOW)).toMatch(/12 Oct/);
  });
});

describe('expiryLabel', () => {
  it.each([
    ['2026-11-01T11:00:00+05:30', 'Expired'],
    ['2026-11-01T20:00:00+05:30', 'Expires today'],
    ['2026-11-02T13:00:00+05:30', 'Expires tomorrow'],
    ['2026-11-08T12:30:00+05:30', 'Expires in 7 days'],
  ])('%s → %s', (iso, expected) => {
    expect(expiryLabel(iso, NOW)).toBe(expected);
  });
});

describe('greeting', () => {
  it('follows the time of day', () => {
    expect(greeting(new Date('2026-11-01T08:00:00'))).toBe('Good morning');
    expect(greeting(new Date('2026-11-01T14:00:00'))).toBe('Good afternoon');
    expect(greeting(new Date('2026-11-01T20:00:00'))).toBe('Good evening');
  });
});

describe('describeActivity', () => {
  it('names the actor, or "You" for the current user', () => {
    const item = { verb: 'family.created', data: { actor_name: 'Jeet' } };
    expect(describeActivity(item)).toBe('Jeet created the family');
    expect(describeActivity(item, 'Jeet')).toBe('You created the family');
  });

  it.each([
    [{ verb: 'member.joined', data: { actor_name: 'Priya', role: 'adult' } }, 'Priya joined as an adult'],
    [{ verb: 'member.removed', data: { actor_name: 'Jeet', target_name: 'Rohan' } }, 'Jeet removed Rohan'],
    [{ verb: 'member.role_changed', data: { actor_name: 'Jeet', target_name: 'Rohan', from: 'adult', to: 'viewer' } }, 'Jeet changed Rohan from adult to viewer'],
    [{ verb: 'invitation.created', data: { actor_name: 'Jeet', role: 'child', relationship_label: 'Aarav' } }, 'Jeet invited Aarav as a child'],
    [{ verb: 'invitation.created', data: { actor_name: 'Jeet', role: 'adult', phone_masked: '+91••••••3210' } }, 'Jeet invited +91••••••3210 as an adult'],
    [{ verb: 'admin.transferred', data: { actor_name: 'Jeet', target_name: 'Priya' } }, 'Jeet made Priya the primary admin'],
    [{ verb: 'family.renamed', data: { actor_name: 'Jeet', to: 'Yadavs' } }, 'Jeet renamed the family to "Yadavs"'],
    [{ verb: 'something.new', data: { actor_name: 'Jeet' } }, 'Jeet made a change'],
  ])('%j', (item, expected) => {
    expect(describeActivity(item)).toBe(expected);
  });

  it('uses the right article for roles', () => {
    expect(roleWithArticle('admin')).toBe('an admin');
    expect(roleWithArticle('viewer')).toBe('a viewer');
  });
});

describe('describeAudit', () => {
  it.each([
    [{ table_name: 'family_members', action: 'update', old_values: { role: 'adult' }, new_values: { role: 'viewer' }, changed_fields: ['role'] }, 'Role changed: Adult → Viewer'],
    [{ table_name: 'family_members', action: 'update', old_values: { status: 'active' }, new_values: { status: 'removed' }, changed_fields: ['status', 'removed_at', 'removed_by'] }, 'Member removed'],
    [{ table_name: 'family_members', action: 'insert', old_values: null, new_values: { role: 'admin' }, changed_fields: null }, 'Member added as Admin'],
    [{ table_name: 'families', action: 'update', old_values: { name: 'A' }, new_values: { name: 'B' }, changed_fields: ['name'] }, 'Family renamed: A → B'],
    [{ table_name: 'families', action: 'update', old_values: {}, new_values: {}, changed_fields: ['primary_admin_id'] }, 'Primary admin transferred'],
    [{ table_name: 'family_invitations', action: 'update', old_values: { status: 'pending' }, new_values: { status: 'revoked' }, changed_fields: ['status', 'closed_at', 'closed_by'] }, 'Invitation revoked'],
    [{ table_name: 'family_role_permissions', action: 'insert', old_values: null, new_values: { role: 'adult', permission: 'members.invite', allowed: true }, changed_fields: null }, 'Permission granted: members.invite for Adults'],
  ] as const)('%j', (entry, expected) => {
    expect(describeAudit(entry as never)).toBe(expected);
  });
});
