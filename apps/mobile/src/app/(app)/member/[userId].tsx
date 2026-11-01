import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ROLE_INFO, formatPhone, roleLabel, type FamilyRole } from '@familyhub/shared';
import { StepUpCancelled, useStepUp } from '@/features/step-up';
import { useFamilyRecord, useMembers } from '@/hooks/family-data';
import { errorMessage, rpc } from '@/lib/data';
import { invalidateFamilyData } from '@/lib/query';
import { useAuth } from '@/providers/AuthProvider';
import { useActiveFamily } from '@/providers/FamilyProvider';
import { ConfirmDialog } from '@/ui/dialogs';
import { AppText, Avatar, Banner, Button, Card, EmptyState, LoadingState, RoleBadge, Screen, SectionHeader, SegmentedControl } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

type Pending = { kind: 'role'; role: FamilyRole } | { kind: 'remove' } | { kind: 'transfer' } | null;

export default function MemberScreen() {
  const router = useRouter();
  const { userId: targetId } = useLocalSearchParams<{ userId: string }>();
  const { userId } = useAuth();
  const { activeFamilyId, isAdmin, isPrimaryAdmin, can } = useActiveFamily();
  const members = useMembers(activeFamilyId);
  const family = useFamilyRecord(activeFamilyId);
  const stepUp = useStepUp();
  const member = members.data?.find((m) => m.user_id === targetId);
  const [role, setRole] = useState<FamilyRole | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);

  const act = useMutation({
    mutationFn: async ({ action, reason }: { action: NonNullable<Pending>; reason?: string }) => {
      if (action.kind === 'role') {
        await rpc('change_member_role', { p_family_id: activeFamilyId, p_user_id: targetId, p_role: action.role, p_reason: reason ?? null });
      } else if (action.kind === 'remove') {
        await rpc('remove_member', { p_family_id: activeFamilyId, p_user_id: targetId, p_reason: reason ?? null });
      } else {
        await stepUp.run(() => rpc('transfer_primary_admin', { p_family_id: activeFamilyId, p_new_admin_id: targetId }));
      }
      return action;
    },
    onSuccess: async (action) => {
      setPending(null);
      setRole(null);
      await invalidateFamilyData();
      if (action.kind === 'remove') router.back();
    },
    onError: (e) => {
      setPending(null);
      if (!(e instanceof StepUpCancelled)) setError(errorMessage(e));
    },
  });

  if (members.isPending) return <LoadingState />;
  if (!member) {
    return (
      <Screen>
        <EmptyState icon="person-outline" title="Not in this family" message="This person is no longer an active member." />
      </Screen>
    );
  }

  const name = member.profile?.display_name ?? 'Member';
  const isMe = member.user_id === userId;
  const targetIsPrimary = family.data?.primary_admin_id === member.user_id;
  const canChangeRole = can('members.change_role') && !isMe && !targetIsPrimary && (member.role !== 'admin' || isPrimaryAdmin);
  const canRemove = can('members.remove') && !isMe && !targetIsPrimary && (member.role !== 'admin' || isPrimaryAdmin);
  const canTransfer = isPrimaryAdmin && !isMe;
  const selectedRole = role ?? member.role;

  return (
    <Screen>
      <Card style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
        <Avatar name={name} seed={member.user_id} size={72} />
        <AppText variant="title">{isMe ? `${name} (you)` : name}</AppText>
        {member.relationship_label ? <AppText tone="muted">{member.relationship_label}</AppText> : null}
        <RoleBadge role={member.role} isPrimaryAdmin={targetIsPrimary} />
        {member.profile?.phone ? (
          <AppText variant="caption" tone="muted" selectable>
            {formatPhone(member.profile.phone)}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="subtle">
          Joined {new Date(member.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </AppText>
      </Card>

      {error ? <Banner tone="danger" title={error} /> : null}

      {canChangeRole ? (
        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Role" />
          <SegmentedControl
            label="Role"
            value={selectedRole}
            onChange={(r) => {
              setRole(r);
              setError(null);
            }}
            options={(['admin', 'adult', 'child', 'viewer'] as FamilyRole[]).map((r) => ({ value: r, label: ROLE_INFO[r].label }))}
          />
          <AppText variant="caption" tone="muted">
            {ROLE_INFO[selectedRole].summary}
          </AppText>
          {selectedRole !== member.role ? (
            <Button title={`Make ${name} ${roleLabel(selectedRole).toLowerCase()}`} onPress={() => setPending({ kind: 'role', role: selectedRole })} />
          ) : null}
        </View>
      ) : !isMe && isAdmin && (targetIsPrimary || member.role === 'admin') ? (
        <Banner
          tone="info"
          title={targetIsPrimary ? 'This is the primary admin' : 'Only the primary admin can change another admin'}
          message={targetIsPrimary ? 'Their role is protected until they transfer ownership.' : undefined}
        />
      ) : null}

      {canTransfer || canRemove ? <SectionHeader title="Manage" /> : null}
      {canTransfer ? (
        <Button
          title="Make primary admin"
          icon="star-outline"
          variant="secondary"
          loading={act.isPending && act.variables?.action.kind === 'transfer'}
          onPress={() => setPending({ kind: 'transfer' })}
        />
      ) : null}
      {canRemove ? (
        <Button title="Remove from family" icon="person-remove-outline" variant="danger" onPress={() => setPending({ kind: 'remove' })} />
      ) : null}

      <ConfirmDialog
        visible={pending?.kind === 'role'}
        title={`Change ${name}'s role?`}
        message={pending?.kind === 'role' ? `${roleLabel(member.role)} → ${roleLabel(pending.role)}. ${ROLE_INFO[pending.role].summary}` : undefined}
        confirmLabel="Change role"
        askReason
        loading={act.isPending}
        onConfirm={({ reason }) => pending && act.mutate({ action: pending, reason })}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        visible={pending?.kind === 'remove'}
        title={`Remove ${name}?`}
        message="They lose access to this family's shared information right away. Their FamilyHub account and personal data are not deleted, and you can invite them again later."
        confirmLabel="Remove member"
        destructive
        askReason
        loading={act.isPending}
        onConfirm={({ reason }) => pending && act.mutate({ action: pending, reason })}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        visible={pending?.kind === 'transfer'}
        title={`Make ${name} the primary admin?`}
        message="They will own the family, including the ability to delete it. You stay an admin. You'll confirm with a one-time code."
        confirmLabel="Transfer ownership"
        onConfirm={() => {
          // Close first: the one-time-code sheet may open next.
          setPending(null);
          act.mutate({ action: { kind: 'transfer' } });
        }}
        onCancel={() => setPending(null)}
      />
      {stepUp.modal}
    </Screen>
  );
}
