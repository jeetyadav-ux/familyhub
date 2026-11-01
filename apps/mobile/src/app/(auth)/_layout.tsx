import { Stack } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';

// Open the sign-in screen when this group becomes the active one.
export const unstable_settings = { initialRouteName: 'sign-in' };

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="verify" options={{ title: '', headerBackTitle: 'Change number' }} />
    </Stack>
  );
}
