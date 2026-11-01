import { useQuery } from '@tanstack/react-query';
import type {
  ActivityItem,
  AuditLogEntry,
  Family,
  FamilyInvitation,
  FamilyMemberWithProfile,
  HomeSummary,
  PendingInvitation,
  PermissionMatrixRow,
  SavedWidget,
} from '@familyhub/shared';
import { rpc, unwrap } from '@/lib/data';
import { keys } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export function useHomeSummary(familyId: string | null) {
  return useQuery({
    queryKey: keys.homeSummary(familyId),
    enabled: !!familyId,
    queryFn: () => rpc<HomeSummary>('get_home_summary', { p_family_id: familyId }),
  });
}

export function useFamilyRecord(familyId: string | null) {
  return useQuery({
    queryKey: ['family_record', familyId],
    enabled: !!familyId,
    queryFn: async () =>
      unwrap<Pick<Family, 'id' | 'name' | 'currency' | 'timezone' | 'primary_admin_id' | 'created_at'>>(
        await supabase.from('families').select('id, name, currency, timezone, primary_admin_id, created_at').eq('id', familyId!).single(),
      ),
  });
}

export function useMembers(familyId: string | null) {
  return useQuery({
    queryKey: keys.members(familyId),
    enabled: !!familyId,
    queryFn: async () =>
      unwrap<FamilyMemberWithProfile[]>(
        await supabase
          .from('family_members')
          .select(
            'id, family_id, user_id, role, status, relationship_label, invited_by, joined_at, removed_at, removed_by, profile:profiles!family_members_user_id_fkey(id, display_name, avatar_path, phone)',
          )
          .eq('family_id', familyId!)
          .eq('status', 'active')
          .order('joined_at', { ascending: true }),
      ),
  });
}

export function useInvitations(familyId: string | null, enabled = true) {
  return useQuery({
    queryKey: keys.invitations(familyId),
    enabled: !!familyId && enabled,
    queryFn: async () =>
      unwrap<FamilyInvitation[]>(
        await supabase
          .from('family_invitations')
          .select('id, family_id, invited_by, phone, role, relationship_label, code_hint, status, expires_at, accepted_by, accepted_at, closed_by, closed_at, created_at')
          .eq('family_id', familyId!)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ),
  });
}

export function useInvitationsForMe() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: keys.invitationsForMe(userId),
    enabled: !!userId,
    queryFn: () => rpc<PendingInvitation[]>('my_pending_invitations'),
  });
}

export function useActivity(familyId: string | null, limit = 100) {
  return useQuery({
    queryKey: [...keys.activity(familyId), limit],
    enabled: !!familyId,
    queryFn: async () =>
      unwrap<ActivityItem[]>(
        await supabase
          .from('family_activity')
          .select('id, verb, actor_id, entity_type, entity_id, data, created_at')
          .eq('family_id', familyId!)
          .order('created_at', { ascending: false })
          .limit(limit),
      ),
  });
}

export function useAuditLog(familyId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: keys.audit(familyId),
    enabled: !!familyId && enabled,
    queryFn: async () =>
      unwrap<AuditLogEntry[]>(
        await supabase
          .from('audit_logs')
          .select('*')
          .eq('family_id', familyId!)
          .order('created_at', { ascending: false })
          .limit(200),
      ),
  });
}

export function usePermissionMatrix(familyId: string | null) {
  return useQuery({
    queryKey: keys.permissionMatrix(familyId),
    enabled: !!familyId,
    queryFn: () => rpc<PermissionMatrixRow[]>('family_permission_matrix', { p_family_id: familyId }),
  });
}

export function useDashboardLayout(familyId: string | null) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: keys.dashboardLayout(familyId, userId),
    enabled: !!familyId && !!userId,
    queryFn: async () => {
      const row = unwrap<{ widgets: SavedWidget[] } | null>(
        await supabase
          .from('user_dashboard_layouts')
          .select('widgets')
          .eq('family_id', familyId!)
          .eq('user_id', userId!)
          .maybeSingle(),
      );
      return row?.widgets ?? null;
    },
  });
}
