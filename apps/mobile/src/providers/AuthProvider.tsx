import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { createContext, use, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { Profile } from '@familyhub/shared';
import { unwrap } from '@/lib/data';
import { isConfigured } from '@/lib/env';
import { keys, queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  userId: string | undefined;
  initializing: boolean;
  profile: Profile | null;
  profileLoading: boolean;
  profileError: unknown;
  refetchProfile: () => Promise<unknown>;
  signOut: (scope?: 'local' | 'global') => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(isConfigured);

  useEffect(() => {
    if (!isConfigured) return;
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setSession(data.session);
      })
      .finally(() => mounted && setInitializing(false));

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT') queryClient.clear();
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id;
  const profileQuery = useQuery({
    queryKey: keys.profile(userId),
    enabled: !!userId,
    queryFn: async () =>
      unwrap<Profile>(await supabase.from('profiles').select('*').eq('id', userId!).single()),
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      userId,
      initializing,
      profile: profileQuery.data ?? null,
      profileLoading: !!userId && profileQuery.isPending,
      profileError: profileQuery.error,
      refetchProfile: profileQuery.refetch,
      signOut: async (scope = 'local') => {
        await supabase.auth.signOut({ scope });
        queryClient.clear();
      },
    }),
    [session, userId, initializing, profileQuery.data, profileQuery.isPending, profileQuery.error, profileQuery.refetch],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
