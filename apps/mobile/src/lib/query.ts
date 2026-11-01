import { QueryClient } from '@tanstack/react-query';
import { AppError } from './data';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => {
        // Never retry authorization or validation failures.
        if (error instanceof AppError && error.code) return false;
        return count < 2;
      },
    },
    mutations: { retry: false },
  },
});

export const keys = {
  profile: (uid: string | undefined) => ['profile', uid] as const,
  myFamilies: (uid: string | undefined) => ['my_families', uid] as const,
  permissions: (familyId: string | null) => ['permissions', familyId] as const,
  homeSummary: (familyId: string | null) => ['home_summary', familyId] as const,
  members: (familyId: string | null) => ['members', familyId] as const,
  invitations: (familyId: string | null) => ['invitations', familyId] as const,
  invitationsForMe: (uid: string | undefined) => ['invitations_for_me', uid] as const,
  activity: (familyId: string | null) => ['activity', familyId] as const,
  audit: (familyId: string | null) => ['audit', familyId] as const,
  permissionMatrix: (familyId: string | null) => ['permission_matrix', familyId] as const,
  dashboardLayout: (familyId: string | null, uid: string | undefined) => ['dashboard_layout', familyId, uid] as const,
};

/** Refreshes everything that depends on the family membership set. */
export async function invalidateFamilyData(): Promise<void> {
  await Promise.all(
    ['my_families', 'family_record', 'permissions', 'home_summary', 'members', 'invitations', 'invitations_for_me', 'activity', 'audit', 'permission_matrix'].map(
      (k) => queryClient.invalidateQueries({ queryKey: [k] }),
    ),
  );
}
