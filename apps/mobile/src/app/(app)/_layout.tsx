import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';

export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="invite" options={{ title: 'Invite a member', presentation: 'modal' }} />
      <Stack.Screen name="invitations" options={{ title: 'Pending invitations' }} />
      <Stack.Screen name="member/[userId]" options={{ title: 'Member' }} />
      <Stack.Screen name="permissions" options={{ title: 'Permissions' }} />
      <Stack.Screen name="audit" options={{ title: 'Audit log' }} />
      <Stack.Screen name="activity" options={{ title: 'Family activity' }} />
      <Stack.Screen name="family-settings" options={{ title: 'Family settings' }} />
      <Stack.Screen name="switch-family" options={{ title: 'Your families', presentation: 'modal' }} />
      <Stack.Screen name="create-family" options={{ title: 'New family', presentation: 'modal' }} />
      <Stack.Screen name="customize-dashboard" options={{ title: 'Customise home' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="module/[key]" options={{ title: '' }} />
    </Stack>
  );
}
