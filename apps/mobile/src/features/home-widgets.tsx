import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { ActivityItem, HomeSummary } from '@familyhub/shared';
import { activityIcon, describeActivity, relativeTime } from '@/lib/format';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText, Avatar, Button, Card, Divider, IconTile, type IconName } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

function WidgetHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={12}>
          <AppText variant="label" tone="primary">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SetupChecklistWidget({ summary }: { summary: HomeSummary }) {
  const router = useRouter();
  const { colors } = useTheme();
  if (summary.my_role !== 'admin') return null;

  const steps: Array<{ done: boolean; title: string; detail: string; onPress: () => void }> = [
    {
      done: summary.setup.has_other_members,
      title: summary.setup.has_pending_invitation && !summary.setup.has_other_members ? 'Waiting for your first member' : 'Invite your family',
      detail: summary.setup.has_pending_invitation && !summary.setup.has_other_members
        ? 'An invitation is pending. Resend it if needed.'
        : 'Add family members by mobile number, link or QR code.',
      onPress: () => router.push(summary.setup.has_pending_invitation && !summary.setup.has_other_members ? '/invitations' : '/invite'),
    },
    {
      done: summary.setup.has_secondary_admin,
      title: 'Add a second admin',
      detail: 'So someone else can manage the family if you are unavailable.',
      onPress: () => router.push('/family'),
    },
  ];
  if (steps.every((s) => s.done)) return null;
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card>
      <WidgetHeader title="Get your family set up" />
      <AppText variant="caption" tone="muted">
        {doneCount} of {steps.length} done
      </AppText>
      {steps.map((s) => (
        <Pressable
          key={s.title}
          accessibilityRole="button"
          accessibilityState={{ checked: s.done }}
          onPress={s.done ? undefined : s.onPress}
          style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingVertical: spacing.xs }}
        >
          <Ionicons name={s.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={s.done ? colors.success : colors.textSubtle} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong" style={s.done ? { textDecorationLine: 'line-through', color: colors.textMuted } : undefined}>
              {s.title}
            </AppText>
            {!s.done ? <AppText variant="caption" tone="muted">{s.detail}</AppText> : null}
          </View>
          {!s.done ? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} /> : null}
        </Pressable>
      ))}
    </Card>
  );
}

export function FamilyMembersWidget({ summary }: { summary: HomeSummary }) {
  const router = useRouter();
  const shown = summary.members.slice(0, 6);
  const extra = summary.members.length - shown.length;
  return (
    <Card>
      <WidgetHeader title="Family members" actionLabel="View all" onAction={() => router.push('/family')} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${summary.members.length} members. Open members`} onPress={() => router.push('/family')} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flexDirection: 'row' }}>
          {shown.map((m, i) => (
            <View key={m.user_id} style={{ marginLeft: i === 0 ? 0 : -10, borderRadius: 22, borderWidth: 2, borderColor: 'transparent' }}>
              <Avatar name={m.display_name} seed={m.user_id} size={40} />
            </View>
          ))}
        </View>
        <AppText tone="muted">
          {summary.members.length} {summary.members.length === 1 ? 'member' : 'members'}
          {extra > 0 ? ` (+${extra} more)` : ''}
        </AppText>
      </Pressable>
    </Card>
  );
}

export function PendingInvitationsWidget({ summary }: { summary: HomeSummary }) {
  const router = useRouter();
  const count = summary.pending_invitations ?? 0;
  return (
    <Card>
      <WidgetHeader title="Pending invitations" />
      {count === 0 ? (
        <View style={{ gap: spacing.md }}>
          <AppText tone="muted">No invitations waiting.</AppText>
          <Button title="Invite someone" icon="person-add-outline" variant="secondary" compact onPress={() => router.push('/invite')} />
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => router.push('/invitations')} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <IconTile icon="mail-outline" tone="accent" />
          <AppText style={{ flex: 1 }}>
            {count} {count === 1 ? 'invitation is' : 'invitations are'} waiting to be accepted
          </AppText>
          <Ionicons name="chevron-forward" size={18} />
        </Pressable>
      )}
    </Card>
  );
}

export function ActivityList({ items, myName, limit }: { items: ActivityItem[]; myName?: string | null; limit?: number }) {
  const list = limit ? items.slice(0, limit) : items;
  return (
    <View>
      {list.map((item, i) => (
        <View key={item.id}>
          {i > 0 ? <Divider inset={48} /> : null}
          <View style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, alignItems: 'center' }}>
            <IconTile icon={activityIcon(item.verb) as IconName} tone="muted" size={36} />
            <View style={{ flex: 1 }}>
              <AppText>{describeActivity(item, myName)}</AppText>
              <AppText variant="caption" tone="subtle">
                {relativeTime(item.created_at)}
              </AppText>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function FamilyActivityWidget({ summary, myName }: { summary: HomeSummary; myName?: string | null }) {
  const router = useRouter();
  return (
    <Card>
      <WidgetHeader title="Family activity" actionLabel={summary.recent_activity.length > 5 ? 'See all' : undefined} onAction={() => router.push('/activity')} />
      {summary.recent_activity.length === 0 ? (
        <AppText tone="muted">Nothing yet. Changes across the family show up here.</AppText>
      ) : (
        <ActivityList items={summary.recent_activity} myName={myName} limit={5} />
      )}
    </Card>
  );
}
