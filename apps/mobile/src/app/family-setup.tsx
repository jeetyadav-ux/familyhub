import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { CreateFamilyForm } from '@/features/CreateFamilyForm';
import { PendingInviteCard } from '@/features/invitations';
import { useInvitationsForMe } from '@/hooks/family-data';
import { useAuth } from '@/providers/AuthProvider';
import { AppText, Button, Card, SectionHeader, Screen, SegmentedControl } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

/** First run after sign-in: accept an invitation, join with a code, or create a family. */
export default function FamilySetupScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const invites = useInvitationsForMe();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const pending = invites.data ?? [];

  return (
    <Screen edges={['top', 'bottom']} onRefresh={() => invites.refetch()} refreshing={invites.isRefetching}>
      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <AppText variant="title" accessibilityRole="header">
          Welcome, {profile?.display_name}
        </AppText>
        <AppText tone="muted">Join your family or start a new one. You can belong to more than one family.</AppText>
      </View>

      {pending.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <SectionHeader title="Invitations for you" />
          {pending.map((inv) => (
            <PendingInviteCard key={inv.invitation_id} invite={inv} />
          ))}
        </View>
      ) : null}

      <SegmentedControl
        label="Create or join"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'create', label: 'Create a family' },
          { value: 'join', label: 'I have a code' },
        ]}
      />

      {mode === 'create' ? (
        <Card>
          <CreateFamilyForm />
        </Card>
      ) : (
        <Card>
          <AppText tone="muted">
            Ask a family admin for the 8-character invitation code, or scan the QR code on their phone.
          </AppText>
          <Button title="Enter code" icon="keypad-outline" onPress={() => router.push('/join')} />
          <Button title="Scan QR code" icon="qr-code-outline" variant="secondary" onPress={() => router.push('/scan')} />
        </Card>
      )}

      <Button title="Sign out" variant="ghost" onPress={() => signOut()} />
    </Screen>
  );
}
