import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { CURRENT_PHASE, PHASE_NAMES, displayNameSchema, formatPhone } from '@familyhub/shared';
import { errorMessage, unwrap } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme, type ThemePreference } from '@/providers/ThemeProvider';
import { ConfirmDialog } from '@/ui/dialogs';
import { AppText, Banner, Button, Card, Divider, IconTile, ListRow, Screen, SectionHeader, SegmentedControl, TextField } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { preference, setPreference } = useTheme();
  const { userId, profile, refetchProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmGlobal, setConfirmGlobal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? 'dev';
  const build = Application.nativeBuildVersion ?? (Platform.OS === 'web' ? 'web' : 'dev');

  const saveName = async () => {
    const parsed = displayNameSchema.safeParse(name);
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message ?? 'Invalid name');
      return;
    }
    setSaving(true);
    try {
      unwrap(await supabase.from('profiles').update({ display_name: parsed.data }).eq('id', userId!).select('id'));
      await refetchProfile();
      setSaved(true);
    } catch (e) {
      setNameError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <SectionHeader title="Profile" />
      <Card>
        <TextField
          label="Your name"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setNameError(null);
            setSaved(false);
          }}
          maxLength={60}
          autoCapitalize="words"
          error={nameError}
          hint={saved ? 'Saved' : undefined}
        />
        <Button title="Save name" compact variant="secondary" disabled={name.trim() === (profile?.display_name ?? '')} loading={saving} onPress={saveName} />
        <Divider />
        <View style={{ gap: 2 }}>
          <AppText variant="label" tone="muted">
            Mobile number
          </AppText>
          <AppText>{formatPhone(profile?.phone)}</AppText>
          <AppText variant="caption" tone="subtle">
            Your number is your login. Changing it will be supported in a later update.
          </AppText>
        </View>
      </Card>

      <SectionHeader title="Appearance" />
      <SegmentedControl<ThemePreference>
        label="Theme"
        value={preference}
        onChange={setPreference}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />

      <SectionHeader title="Family" />
      <Card padded={false}>
        <ListRow title="Family settings" left={<IconTile icon="home-outline" />} onPress={() => router.push('/family-settings')} />
        <Divider inset={64} />
        <ListRow title="Your families" left={<IconTile icon="swap-horizontal-outline" />} onPress={() => router.push('/switch-family')} />
      </Card>

      <SectionHeader title="App" />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText tone="muted">Installed version</AppText>
          <AppText>
            {version} ({build})
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText tone="muted">Release</AppText>
          <AppText>
            Phase {CURRENT_PHASE}: {PHASE_NAMES[CURRENT_PHASE]}
          </AppText>
        </View>
        <AppText variant="caption" tone="subtle">
          Update checks, release notes and in-app updates arrive in Phase 8. Until then, update from TestFlight, the Play Store or your build link.
        </AppText>
      </Card>

      <SectionHeader title="Security" />
      <View style={{ gap: spacing.sm }}>
        <Button title="Sign out" icon="log-out-outline" variant="secondary" loading={signingOut} onPress={async () => { setSigningOut(true); await signOut('local'); }} />
        <Button title="Sign out on all devices" icon="phone-portrait-outline" variant="danger" onPress={() => setConfirmGlobal(true)} />
      </View>
      <Banner tone="info" icon="shield-checkmark-outline" title="Your session is stored encrypted on this device." message="FamilyHub never stores card numbers, PINs, CVVs, OTPs or bank passwords." />

      <ConfirmDialog
        visible={confirmGlobal}
        title="Sign out everywhere?"
        message="All your devices, including this one, will need a new OTP to sign in."
        confirmLabel="Sign out everywhere"
        destructive
        onConfirm={async () => {
          setConfirmGlobal(false);
          await signOut('global');
        }}
        onCancel={() => setConfirmGlobal(false)}
      />
    </Screen>
  );
}
