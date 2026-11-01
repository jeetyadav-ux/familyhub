import type { FamilyRole, InvitationStatus, MemberStatus } from './roles';

/**
 * Row and RPC result types for Phase 1. Hand-written to match the migrations;
 * replace with `supabase gen types typescript` output once a hosted project exists.
 */

export interface Profile {
  id: string;
  phone: string | null;
  display_name: string | null;
  avatar_path: string | null;
  timezone: string;
  locale: string;
  last_family_id: string | null;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  primary_admin_id: string;
  currency: string;
  timezone: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: FamilyRole;
  status: MemberStatus;
  relationship_label: string | null;
  invited_by: string | null;
  joined_at: string;
  removed_at: string | null;
  removed_by: string | null;
}

export interface FamilyMemberWithProfile extends FamilyMember {
  profile: Pick<Profile, 'id' | 'display_name' | 'avatar_path' | 'phone'> | null;
}

export interface FamilyInvitation {
  id: string;
  family_id: string;
  invited_by: string | null;
  phone: string | null;
  role: FamilyRole;
  relationship_label: string | null;
  code_hint: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface CreatedInvitation {
  invitation_id: string;
  code: string;
  expires_at: string;
}

export interface MyFamily {
  family_id: string;
  name: string;
  role: FamilyRole;
  is_primary_admin: boolean;
  member_count: number;
  currency: string;
  joined_at: string;
}

export interface PendingInvitation {
  invitation_id: string;
  family_id: string;
  family_name: string;
  inviter_name: string;
  role: FamilyRole;
  relationship_label: string | null;
  expires_at: string;
}

export type InvitationPreview =
  | {
      ok: true;
      invitation_id: string;
      family_id: string;
      family_name: string;
      inviter_name: string;
      role: FamilyRole;
      relationship_label: string | null;
      expires_at: string;
      member_count: number;
    }
  | { ok: false; error: string; family_id?: string | null };

export type AcceptInvitationResult =
  | { ok: true; family_id: string }
  | { ok: false; error: string; family_id?: string | null };

export interface ActivityItem {
  id: number;
  verb: string;
  actor_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  data: Record<string, unknown> & { actor_name?: string; target_name?: string };
  created_at: string;
}

export interface HomeSummaryMember {
  user_id: string;
  display_name: string | null;
  avatar_path: string | null;
  role: FamilyRole;
  relationship_label: string | null;
  is_primary_admin: boolean;
}

export interface HomeSummary {
  family: Pick<Family, 'id' | 'name' | 'currency' | 'timezone' | 'primary_admin_id' | 'created_at'>;
  my_role: FamilyRole;
  is_primary_admin: boolean;
  members: HomeSummaryMember[];
  pending_invitations: number | null;
  recent_activity: ActivityItem[];
  setup: {
    has_other_members: boolean;
    has_secondary_admin: boolean;
    has_pending_invitation: boolean;
  };
}

export interface PermissionMatrixRow {
  permission: string;
  module: string;
  label: string;
  description: string;
  admin_only: boolean;
  available_from_phase: number;
  role: FamilyRole;
  allowed: boolean;
  is_default: boolean;
}

export interface AuditLogEntry {
  id: number;
  family_id: string | null;
  actor_id: string | null;
  action: 'insert' | 'update' | 'delete';
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[] | null;
  reason: string | null;
  created_at: string;
}
