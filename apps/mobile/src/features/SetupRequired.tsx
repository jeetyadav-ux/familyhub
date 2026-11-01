import { View } from 'react-native';
import { missingConfig } from '@/lib/env';
import { AppText, Banner, Card, Screen } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

/** Shown instead of the app when the build has no Supabase configuration. */
export function SetupRequired() {
  const missing = missingConfig();
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
        <AppText variant="display">FamilyHub</AppText>
        <AppText tone="muted">This build isn&apos;t connected to a FamilyHub backend yet.</AppText>
      </View>
      <Banner tone="warning" title="Configuration needed" message={`Missing: ${missing.join(', ')}`} />
      <Card>
        <AppText variant="heading">For developers</AppText>
        <AppText tone="muted">
          Copy apps/mobile/.env.example to apps/mobile/.env, fill in your Supabase project URL and anon key, then restart
          the Expo dev server. See docs/phases/PHASE-1.md for the full setup.
        </AppText>
      </Card>
    </Screen>
  );
}
