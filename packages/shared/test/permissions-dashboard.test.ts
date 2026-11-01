import { describe, expect, it } from 'vitest';
import { PERMISSIONS, roleHasDefaultPermission, roleHasPermission } from '../src/permissions';
import { DASHBOARD_WIDGETS, moveWidget, resolveDashboardLayout, toSavedLayout } from '../src/dashboard';
import { MORE_MODULES, TAB_MODULES, isModuleLive } from '../src/modules';
import { extractErrorCode, friendlyErrorMessage } from '../src/errors';

describe('permission catalog', () => {
  it('has unique keys in module.action form', () => {
    const keys = PERMISSIONS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^[a-z_]+\.[a-z_]+$/);
  });

  it('never gives admin-only permissions to non-admin roles by default', () => {
    for (const p of PERMISSIONS.filter((x) => x.adminOnly)) expect(p.defaults).toHaveLength(0);
  });

  it('admins hold every permission', () => {
    for (const p of PERMISSIONS) expect(roleHasDefaultPermission('admin', p.key)).toBe(true);
  });

  it('follows spec defaults', () => {
    expect(roleHasDefaultPermission('adult', 'finance.edit_shared')).toBe(true);
    expect(roleHasDefaultPermission('viewer', 'finance.edit_shared')).toBe(false);
    expect(roleHasDefaultPermission('viewer', 'finance.view_shared')).toBe(true);
    expect(roleHasDefaultPermission('child', 'finance.view_shared')).toBe(false);
    expect(roleHasDefaultPermission('child', 'tasks.update_assigned')).toBe(true);
    expect(roleHasDefaultPermission('adult', 'members.invite')).toBe(false);
  });

  it('applies family overrides but never for admin-only keys', () => {
    const overrides = [
      { role: 'adult' as const, permission: 'members.invite', allowed: true },
      { role: 'adult' as const, permission: 'members.remove', allowed: true },
      { role: 'viewer' as const, permission: 'finance.view_shared', allowed: false },
    ];
    expect(roleHasPermission('adult', 'members.invite', overrides)).toBe(true);
    expect(roleHasPermission('adult', 'members.remove', overrides)).toBe(false);
    expect(roleHasPermission('viewer', 'finance.view_shared', overrides)).toBe(false);
    expect(roleHasPermission('adult', 'unknown.key', overrides)).toBe(false);
  });
});

describe('dashboard layout', () => {
  const adminPerms = ['members.invite', 'audit.view'];

  it('defaults to every live widget the user may see, visible', () => {
    const { items, upcoming } = resolveDashboardLayout(null, adminPerms, 1);
    expect(items.map((i) => i.id)).toEqual(['setup_checklist', 'family_members', 'pending_invitations', 'family_activity']);
    expect(items.every((i) => i.visible)).toBe(true);
    expect(upcoming.length).toBe(DASHBOARD_WIDGETS.length - 4);
  });

  it('hides permission-gated widgets', () => {
    const { items } = resolveDashboardLayout(null, [], 1);
    expect(items.map((i) => i.id)).not.toContain('pending_invitations');
  });

  it('keeps saved order and visibility, drops unknown ids and appends new widgets', () => {
    const { items } = resolveDashboardLayout(
      [
        { id: 'family_activity', visible: true },
        { id: 'retired_widget', visible: true },
        { id: 'family_members', visible: false },
        { id: 'family_activity', visible: false },
      ],
      adminPerms,
      1,
    );
    expect(items.map((i) => [i.id, i.visible])).toEqual([
      ['family_activity', true],
      ['family_members', false],
      ['setup_checklist', true],
      ['pending_invitations', true],
    ]);
    expect(toSavedLayout(items)[1]).toEqual({ id: 'family_members', visible: false });
  });

  it('turns phase 2 widgets on when phase 2 ships', () => {
    const { items } = resolveDashboardLayout(null, adminPerms, 2);
    expect(items.map((i) => i.id)).toContain('month_expenses');
  });

  it('moves widgets safely', () => {
    expect(moveWidget(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveWidget(['a', 'b', 'c'], 2, 5)).toEqual(['a', 'b', 'c']);
  });
});

describe('modules', () => {
  it('has the six tabs from the spec in order', () => {
    expect(TAB_MODULES.map((m) => m.title)).toEqual(['Home', 'Finance', 'Shopping', 'Health', 'Family', 'More']);
  });
  it('lists all 19 More entries', () => {
    expect(MORE_MODULES).toHaveLength(19);
  });
  it('marks only phase-1 modules live in phase 1', () => {
    expect(MORE_MODULES.filter((m) => isModuleLive(m, 1)).map((m) => m.key)).toEqual(['members', 'settings']);
  });
});

describe('errors', () => {
  it('finds FH codes in PostgREST errors', () => {
    expect(extractErrorCode({ code: 'P0001', message: 'FH_NOT_AUTHORIZED', details: null })).toBe('FH_NOT_AUTHORIZED');
    expect(extractErrorCode(new Error('boom'))).toBeNull();
  });
  it('produces friendly messages', () => {
    expect(friendlyErrorMessage({ message: 'FH_INVITE_EXPIRED' })).toMatch(/expired/);
    expect(friendlyErrorMessage(new Error('Network request failed'))).toMatch(/connection/);
    expect(friendlyErrorMessage(new Error('weird'))).toMatch(/Something went wrong/);
  });
});
