import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatPhone, type CreatedInvitation, type FamilyInvitation } from '@familyhub/shared';
import { InvitationReady } from '@/features/invitations';
import { useInvitations } from '@/hooks/family-data';
import { errorMessage, rpc } from '@/lib/data';
import { expiryLabel, relativeTime } from '@/lib/format';
import { invalidateFamilyData } from '@/lib/query';
import { useActiveFamily } from '@/providers/FamilyProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { ConfirmDialog } from '@/ui/dialogs';
import { AppText, Banner, Button, Card, EmptyState, ErrorState, LoadingState, RoleBadge, Screen } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

export default function InvitationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { activeFamily, activeFamilyId, can } = useActiveFamily();
  const invitations = useInvitations(activeFamilyId, can('members.invite'));
  const [revoking, setRevoking] = useState<FamilyInvitation | null>(null);
  const [reissued, setReissued] = useState<{ invitation: CreatedInvitation; source: FamilyInvitation } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const revoke = useMutation({
    mutationFn: (id: string) => rpc<void>('revoke_invitation', { p_invitation_id: id }),
    onSuccess: async () => {
      setRevoking(null);
      await invalidateFamilyData();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const reissue = useMutation({
    mutationFn: async (inv: FamilyInvitation) => {
      const rows = await rpc<CreatedInvitation[]>('reissue_invitation', { p_invitation_id: inv.id });
      return { invitation: rows[0]!, source: inv };
    },
    onSuccess: async (res) => {
      setReissued(res);
      await invalidateFamilyData();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!can('members.invite')) {
    return (
      <Screen>
        <Banner tone="warning" title="You can't manage invitations in this family." />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => invitations.refetch()} refreshing={invitations.isRefetching}>
      {error ? <Banner tone="danger" title={error} /> : null}
      {invitations.isPending ? (
        <LoadingState />
      ) : invitations.error ? (
        <ErrorState message={errorMessage(invitations.error)} onRetry={() => invitations.refetch()} />
      ) : (invitations.data ?? []).length === 0 ? (
        <EmptyState
          icon="mail-open-outline"
          title="No pending invitations"
          message="Invitations you send appear here until they're accepted."
          action={<Button title="Invite a member" icon="person-add-outline" onPress={() => router.push('/invite')} />}
        />
      ) : (
        (invitations.data ?? []).map((inv) => {
          const expired = new Date(inv.expires_at).getTime() <= Date.now();
          return (
            <Card key={inv.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
                <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                  {inv.relationship_label ?? (inv.phone ? formatPhone(inv.phone) : `Code ending ${inv.code_hint}`)}
                </AppText>
                <RoleBadge role={inv.role} />
              </View>
              <AppText variant="caption" tone="muted">
                {inv.relationship_label && inv.phone ? `${formatPhone(inv.phone)} · ` : ''}
                Sent {relativeTime(inv.created_at)} ·{' '}
                <AppText variant="caption" style={{ color: expired ? colors.danger : colors.textMuted }}>
                  {expiryLabel(inv.expires_at)}
                </AppText>
              </AppText>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button title={expired ? 'Renew' : 'Resend'} icon="refresh" compact variant="secondary" style={{ flex: 1 }} loading={reissue.isPending && reissue.variables?.id === inv.id} onPress={() => { setError(null); reissue.mutate(inv); }} />
                <Button title="Revoke" icon="close-circle-outline" compact variant="danger" style={{ flex: 1 }} onPress={() => { setError(null); setRevoking(inv); }} />
              </View>
            </Card>
          );
        })
      )}

      <ConfirmDialog
        visible={!!revoking}
        title="Revoke this invitation?"
        message="The code stops working immediately. You can send a new invitation later."
        confirmLabel="Revoke invitation"
        destructive
        loading={revoke.isPending}
        onConfirm={() => revoking && revoke.mutate(revoking.id)}
        onCancel={() => setRevoking(null)}
      />

      <Modal visible={!!reissued} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReissued(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <Screen>
            <AppText variant="title">New code ready</AppText>
            <AppText tone="muted">The previous code no longer works.</AppText>
            {reissued ? (
              <InvitationReady
                invitation={reissued.invitation}
                familyName={activeFamily.name}
                phone={reissued.source.phone}
                role={reissued.source.role}
                label={reissued.source.relationship_label}
                onDone={() => setReissued(null)}
              />
            ) : null}
          </Screen>
        </SafeAreaView>
      </Modal>
    </Screen>
  );
}
