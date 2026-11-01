import { QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { SplashScreen, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { extractInviteCode } from '@familyhub/shared';
import { SetupRequired } from '@/features/SetupRequired';
import { errorMessage } from '@/lib/data';
import { Button, ErrorState, LoadingState, Screen } from '@/ui/primitives';
import { isConfigured } from '@/lib/env';
import { clearPendingInviteCode, readPendingInviteCode, savePendingInviteCode } from '@/lib/pending-invite';
import { queryClient } from '@/lib/query';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { FamilyProvider, useFamily } from '@/providers/FamilyProvider';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <FamilyProvider>
                <RootNavigator />
              </FamilyProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { colors, scheme } = useTheme();
  const { session, initializing, profile, profileLoading, profileError, refetchProfile, signOut } = useAuth();
  const { families, familiesLoading, familiesError, refetchFamilies } = useFamily();

  const signedIn = !!session;
  const needsProfile = signedIn && !profileLoading && !profile?.display_name;
  const hasProfile = signedIn && !!profile?.display_name;
  const needsFamily = hasProfile && !familiesLoading && families.length === 0;
  const inApp = hasProfile && families.length > 0;
  const ready = !initializing && (!signedIn || (!profileLoading && (needsProfile || !familiesLoading)));

  useEffect(() => {
    if (ready || !isConfigured) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  useInviteLinks(hasProfile && !familiesLoading);

  if (!isConfigured) return <SetupRequired />;
  if (initializing) return null; // splash screen stays visible
  const startupError = signedIn && ((profileError && !profile) || (hasProfile && familiesError && families.length === 0));
  if (startupError) {
    return (
      <Screen edges={['top', 'bottom']} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <ErrorState
          message={errorMessage(profileError ?? familiesError)}
          onRetry={() => {
            refetchProfile();
            refetchFamilies();
          }}
        />
        <Button title="Sign out" variant="ghost" onPress={() => signOut()} />
      </Screen>
    );
  }
  if (!ready) return <LoadingState label="Getting things ready…" />;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={needsProfile}>
          <Stack.Screen name="profile-setup" options={{ title: 'About you', headerBackVisible: false, gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={needsFamily}>
          <Stack.Screen name="family-setup" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={inApp}>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={hasProfile}>
          <Stack.Screen name="join" options={{ title: 'Join a family', presentation: 'modal' }} />
          <Stack.Screen name="scan" options={{ title: 'Scan invitation', presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

/**
 * Invitation links (familyhub://join?code=…) can arrive before sign-in. Keep the code,
 * then open the join screen once the user has a profile.
 */
function useInviteLinks(canJoin: boolean) {
  const url = Linking.useURL();
  const router = useRouter();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const code = extractInviteCode(url);
    if (code) savePendingInviteCode(code).catch(() => undefined);
  }, [url]);

  useEffect(() => {
    if (!canJoin) return;
    readPendingInviteCode()
      .then(async (code) => {
        if (!code || handled.current === code) return;
        handled.current = code;
        await clearPendingInviteCode();
        router.push({ pathname: '/join', params: { code } });
      })
      .catch(() => undefined);
  }, [canJoin, url, router]);
}
