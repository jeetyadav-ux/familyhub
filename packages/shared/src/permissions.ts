import type { FamilyRole } from './roles';

/**
 * Permission catalog. Must match `public.permissions` and `public.role_permissions`
 * (supabase/migrations/20261101000100_foundation.sql). A database test fails if they drift.
 * Admins implicitly hold every permission; `defaults` lists non-admin roles only.
 */
export interface PermissionDef {
  key: string;
  module: string;
  label: string;
  adminOnly: boolean;
  availableFromPhase: number;
  defaults: Exclude<FamilyRole, 'admin'>[];
}

export const PERMISSIONS = [
  { key: 'family.settings', module: 'family', label: 'Edit family settings', adminOnly: true, availableFromPhase: 1, defaults: [] },
  { key: 'members.invite', module: 'family', label: 'Invite members', adminOnly: false, availableFromPhase: 1, defaults: [] },
  { key: 'members.change_role', module: 'family', label: 'Change member roles', adminOnly: true, availableFromPhase: 1, defaults: [] },
  { key: 'members.remove', module: 'family', label: 'Remove members', adminOnly: true, availableFromPhase: 1, defaults: [] },
  { key: 'permissions.manage', module: 'family', label: 'Manage permissions', adminOnly: true, availableFromPhase: 1, defaults: [] },
  { key: 'audit.view', module: 'family', label: 'View audit log', adminOnly: false, availableFromPhase: 1, defaults: [] },
  { key: 'finance.view_shared', module: 'finance', label: 'View shared finances', adminOnly: false, availableFromPhase: 2, defaults: ['adult', 'viewer'] },
  { key: 'finance.edit_shared', module: 'finance', label: 'Edit shared finances', adminOnly: false, availableFromPhase: 2, defaults: ['adult'] },
  { key: 'shopping.view', module: 'shopping', label: 'View shopping lists', adminOnly: false, availableFromPhase: 4, defaults: ['adult', 'child', 'viewer'] },
  { key: 'shopping.edit', module: 'shopping', label: 'Edit shopping lists', adminOnly: false, availableFromPhase: 4, defaults: ['adult', 'child'] },
  { key: 'chat.use', module: 'chat', label: 'Use family chat', adminOnly: false, availableFromPhase: 4, defaults: ['adult', 'child'] },
  { key: 'vault.view_shared', module: 'vault', label: 'View shared documents', adminOnly: false, availableFromPhase: 5, defaults: ['adult', 'viewer'] },
  { key: 'vault.upload', module: 'vault', label: 'Upload documents', adminOnly: false, availableFromPhase: 5, defaults: ['adult'] },
  { key: 'records.delete_permanent', module: 'records', label: 'Delete records permanently', adminOnly: true, availableFromPhase: 5, defaults: [] },
  { key: 'backup.restore_family', module: 'backup', label: 'Restore family backup', adminOnly: true, availableFromPhase: 5, defaults: [] },
  { key: 'tasks.view', module: 'tasks', label: 'View tasks', adminOnly: false, availableFromPhase: 6, defaults: ['adult', 'child', 'viewer'] },
  { key: 'tasks.edit', module: 'tasks', label: 'Manage tasks', adminOnly: false, availableFromPhase: 6, defaults: ['adult'] },
  { key: 'tasks.update_assigned', module: 'tasks', label: 'Update own tasks', adminOnly: false, availableFromPhase: 6, defaults: ['adult', 'child'] },
  { key: 'calendar.view', module: 'calendar', label: 'View calendar', adminOnly: false, availableFromPhase: 6, defaults: ['adult', 'child', 'viewer'] },
  { key: 'calendar.edit', module: 'calendar', label: 'Edit calendar', adminOnly: false, availableFromPhase: 6, defaults: ['adult'] },
  { key: 'bills.edit', module: 'bills', label: 'Manage bills', adminOnly: false, availableFromPhase: 6, defaults: ['adult'] },
  { key: 'health.view_shared', module: 'health', label: 'View shared health info', adminOnly: false, availableFromPhase: 6, defaults: ['adult'] },
] as const satisfies readonly PermissionDef[];

export type PermissionKey = (typeof PERMISSIONS)[number]['key'];

const BY_KEY = new Map<string, PermissionDef>(PERMISSIONS.map((p) => [p.key, p]));

export function getPermission(key: string): PermissionDef | undefined {
  return BY_KEY.get(key);
}

/** Default permission check (no family overrides). Mirrors app.role_has_permission. */
export function roleHasDefaultPermission(role: FamilyRole, key: string): boolean {
  const def = BY_KEY.get(key);
  if (!def) return false;
  if (role === 'admin') return true;
  if (def.adminOnly) return false;
  return (def.defaults as readonly string[]).includes(role);
}

/** Effective permission given optional family overrides. Mirrors app.role_has_permission. */
export function roleHasPermission(
  role: FamilyRole,
  key: string,
  overrides: ReadonlyArray<{ role: FamilyRole; permission: string; allowed: boolean }> = [],
): boolean {
  const def = BY_KEY.get(key);
  if (!def) return false;
  if (role === 'admin') return true;
  if (def.adminOnly) return false;
  const override = overrides.find((o) => o.role === role && o.permission === key);
  return override ? override.allowed : roleHasDefaultPermission(role, key);
}
