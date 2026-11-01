import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useFamilyRecord, useInvitations, useMembers } from '@/hooks/family-data';
import { errorMessage } from '@/lib/data';
import { useAuth } from '@/providers/AuthProvider';
import { useActiveFamily } from '@/providers/FamilyProvider';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  ErrorState,
  IconTile,
  ListRow,
  LoadingState,
  RoleBadge,
  Screen,
  SectionHeader,
} from '@/ui/primitives';
import { useTheme } from '@/providers/ThemeProvider';
import { spacing } from '@/ui/theme';

export default function FamilyTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const { userId } = useAuth();
  const { activeFamily, activeFamilyId, can } = useActiveFamily();
  const members = useMembers(activeFamilyId);
  const canInvite = can('members.invite');
  const invitations = useInvitations(activeFamilyId, canInvite);
  const pendingCount = invitations.data?.length ?? 0;
  const family = useFamilyRecord(activeFamilyId);
  const primaryAdminId = family.data?.primary_admin_id;

  return (
    <Screen edges={[]} onRefresh={() => { members.refetch(); invitations.refetch(); family.refetch(); }} refreshing={members.isRefetching}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={activeFamily.name} seed={activeFamily.family_id} size={52} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="heading">{activeFamily.name}</AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <RoleBadge role={activeFamily.role} isPrimaryAdmin={activeFamily.is_primary_admin} />
            <AppText variant="caption" tone="muted">
              {activeFamily.member_count} {Number(activeFamily.member_count) === 1 ? 'member' : 'members'}
            </AppText>
          </View>
        </View>
      </Card>

      {canInvite ? <Button title="Invite a member" icon="person-add-outline" onPress={() => router.push('/invite')} /> : null}

      <SectionHeader title="Members" />
      <Card padded={false}>
        {members.isPending ? (
          <LoadingState />
        ) : members.error ? (
          <ErrorState message={errorMessage(members.error)} onRetry={() => members.refetch()} />
        ) : (
          (members.data ?? []).map((m, i) => {
            const isMe = m.user_id === userId;
            const isPrimary = m.user_id === primaryAdminId;
            return (
              <View key={m.id}>
                {i > 0 ? <Divider inset={72} /> : null}
                <MemberRow
                  name={m.profile?.display_name ?? 'Member'}
                  isMe={isMe}
                  subtitle={m.relationship_label}
                  userId={m.user_id}
                  role={m.role}
                  isPrimary={isPrimary}
                  onPress={() => router.push({ pathname: '/member/[userId]', params: { userId: m.user_id } })}
                />
              </View>
            );
          })
        )}
      </Card>

      {canInvite ? (
        <Card padded={false}>
          <ListRow
            title="Pending invitations"
            subtitle={pendingCount ? `${pendingCount} waiting` : 'None right now'}
            left={<IconTile icon="mail-outline" tone="accent" />}
            right={pendingCount ? <Badge label={String(pendingCount)} fg={colors.accent} bg={colors.accentSoft} /> : undefined}
            onPress={() => router.push('/invitations')}
          />
        </Card>
      ) : null}

      <SectionHeader title="Family" />
      <Card padded={false}>
        <ListRow title="Activity" subtitle="Who joined, invited and changed what" left={<IconTile icon="pulse-outline" />} onPress={() => router.push('/activity')} />
        <Divider inset={64} />
        <ListRow title="Permissions" subtitle="What each role can do" left={<IconTile icon="shield-checkmark-outline" />} onPress={() => router.push('/permissions')} />
        {can('audit.view') ? (
          <>
            <Divider inset={64} />
            <ListRow title="Audit log" subtitle="Detailed change history" left={<IconTile icon="document-text-outline" />} onPress={() => router.push('/audit')} />
          </>
        ) : null}
        <Divider inset={64} />
        <ListRow title="Family settings" subtitle="Name, currency, ownership" left={<IconTile icon="settings-outline" />} onPress={() => router.push('/family-settings')} />
        <Divider inset={64} />
        <ListRow title="Switch family" subtitle="Your other families" left={<IconTile icon="swap-horizontal-outline" />} onPress={() => router.push('/switch-family')} />
      </Card>
    </Screen>
  );
}

function MemberRow({
  name,
  isMe,
  subtitle,
  userId,
  role,
  isPrimary,
  onPress,
}: {
  name: string;
  isMe: boolean;
  subtitle: string | null;
  userId: string;
  role: 'admin' | 'adult' | 'child' | 'viewer';
  isPrimary: boolean;
  onPress: () => void;
}) {
  return (
    <ListRow
      title={isMe ? `${name} (you)` : name}
      subtitle={subtitle}
      left={<Avatar name={name} seed={userId} />}
      right={<RoleBadge role={role} isPrimaryAdmin={isPrimary} />}
      onPress={onPress}
    />
  );
}
