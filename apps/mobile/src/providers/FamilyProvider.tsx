import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, use, useCallback, useMemo, type PropsWithChildren } from 'react';
import type { MyFamily } from '@familyhub/shared';
import { rpc, unwrap } from '@/lib/data';
import { keys } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

interface FamilyContextValue {
  families: MyFamily[];
  familiesLoading: boolean;
  familiesError: unknown;
  refetchFamilies: () => Promise<unknown>;
  activeFamily: MyFamily | null;
  activeFamilyId: string | null;
  setActiveFamily: (familyId: string) => Promise<void>;
  permissions: string[];
  can: (permission: string) => boolean;
  isAdmin: boolean;
  isPrimaryAdmin: boolean;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: PropsWithChildren) {
  const { userId, profile } = useAuth();
  const qc = useQueryClient();

  const familiesQuery = useQuery({
    queryKey: keys.myFamilies(userId),
    enabled: !!userId,
    queryFn: () => rpc<MyFamily[]>('my_families'),
  });
  const families = useMemo(() => familiesQuery.data ?? [], [familiesQuery.data]);

  // The last-used family is stored on the profile, so it follows the user across devices.
  const activeFamily =
    families.find((f) => f.family_id === profile?.last_family_id) ?? families[0] ?? null;
  const activeFamilyId = activeFamily?.family_id ?? null;

  const permissionsQuery = useQuery({
    queryKey: keys.permissions(activeFamilyId),
    enabled: !!activeFamilyId,
    queryFn: () => rpc<string[]>('my_permissions', { p_family_id: activeFamilyId }),
  });
  const permissions = useMemo(() => permissionsQuery.data ?? [], [permissionsQuery.data]);

  const setActiveFamily = useCallback(
    async (familyId: string) => {
      if (!userId) return;
      unwrap(await supabase.from('profiles').update({ last_family_id: familyId }).eq('id', userId).select('id'));
      await qc.invalidateQueries({ queryKey: keys.profile(userId) });
    },
    [qc, userId],
  );

  const value = useMemo<FamilyContextValue>(
    () => ({
      families,
      familiesLoading: !!userId && familiesQuery.isPending,
      familiesError: familiesQuery.error,
      refetchFamilies: familiesQuery.refetch,
      activeFamily,
      activeFamilyId,
      setActiveFamily,
      permissions,
      can: (p) => permissions.includes(p),
      isAdmin: activeFamily?.role === 'admin',
      isPrimaryAdmin: !!activeFamily?.is_primary_admin,
    }),
    [families, userId, familiesQuery.isPending, familiesQuery.error, familiesQuery.refetch, activeFamily, activeFamilyId, setActiveFamily, permissions],
  );

  return <FamilyContext value={value}>{children}</FamilyContext>;
}

export function useFamily(): FamilyContextValue {
  const ctx = use(FamilyContext);
  if (!ctx) throw new Error('useFamily must be used inside <FamilyProvider>');
  return ctx;
}

/** For screens that only render inside the app shell, where a family always exists. */
export function useActiveFamily(): FamilyContextValue & { activeFamily: MyFamily; activeFamilyId: string } {
  const ctx = useFamily();
  if (!ctx.activeFamily || !ctx.activeFamilyId) throw new Error('No active family');
  return ctx as FamilyContextValue & { activeFamily: MyFamily; activeFamilyId: string };
}
