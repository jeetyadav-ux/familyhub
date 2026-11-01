export const FAMILY_ROLES = ['admin', 'adult', 'child', 'viewer'] as const;
export type FamilyRole = (typeof FAMILY_ROLES)[number];

/**
 * Roles that can be given to people today. 'child' is hidden (owner decision, 1 Nov 2026:
 * FamilyHub has no child users). Must match app.role_is_assignable() in the database.
 */
export const ASSIGNABLE_ROLES = ['admin', 'adult', 'viewer'] as const satisfies readonly FamilyRole[];
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export function isAssignableRole(role: FamilyRole): role is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly FamilyRole[]).includes(role);
}

export const MEMBER_STATUSES = ['active', 'removed', 'left'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const INVITATION_STATUSES = ['pending', 'accepted', 'declined', 'revoked'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export interface RoleInfo {
  role: FamilyRole;
  label: string;
  summary: string;
}

export const ROLE_INFO: Record<FamilyRole, RoleInfo> = {
  admin: {
    role: 'admin',
    label: 'Admin',
    summary: 'Manages members, permissions and family settings.',
  },
  adult: {
    role: 'adult',
    label: 'Adult',
    summary: 'Adds and edits shared family records.',
  },
  child: {
    role: 'child',
    label: 'Child',
    summary: 'Sees assigned tasks, shopping and approved family info.',
  },
  viewer: {
    role: 'viewer',
    label: 'Viewer',
    summary: 'Read-only access to shared information.',
  },
};

export function roleLabel(role: FamilyRole, isPrimaryAdmin = false): string {
  if (role === 'admin') return isPrimaryAdmin ? 'Primary admin' : 'Admin';
  return ROLE_INFO[role].label;
}

export function isFamilyRole(value: unknown): value is FamilyRole {
  return typeof value === 'string' && (FAMILY_ROLES as readonly string[]).includes(value);
}
