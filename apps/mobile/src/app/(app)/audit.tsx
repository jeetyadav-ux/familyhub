import { View } from 'react-native';
import { useAuditLog, useMembers } from '@/hooks/family-data';
import { describeAudit } from '@/lib/audit';
import { errorMessage } from '@/lib/data';
import { relativeTime } from '@/lib/format';
import { useActiveFamily } from '@/providers/FamilyProvider';
import { AppText, Banner, Card, Divider, EmptyState, ErrorState, LoadingState, Screen } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

export default function AuditScreen() {
  const { activeFamilyId, can } = useActiveFamily();
  const allowed = can('audit.view');
  const log = useAuditLog(activeFamilyId, allowed);
  const members = useMembers(activeFamilyId);
  const names = new Map((members.data ?? []).map((m) => [m.user_id, m.profile?.display_name ?? 'Member']));

  if (!allowed) {
    return (
      <Screen>
        <Banner tone="warning" title="Only admins can see the audit log in this family." />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => log.refetch()} refreshing={log.isRefetching}>
      <AppText tone="muted">Every change to members, invitations, permissions and family settings. Entries can't be edited or deleted.</AppText>
      {log.isPending ? (
        <LoadingState />
      ) : log.error ? (
        <ErrorState message={errorMessage(log.error)} onRetry={() => log.refetch()} />
      ) : (log.data ?? []).length === 0 ? (
        <EmptyState icon="document-text-outline" title="No entries yet" />
      ) : (
        <Card>
          {(log.data ?? []).map((entry, i) => (
            <View key={entry.id} style={{ gap: 2 }}>
              {i > 0 ? <Divider /> : null}
              <View style={{ paddingTop: i > 0 ? spacing.sm : 0, gap: 2 }}>
                <AppText>{describeAudit(entry)}</AppText>
                <AppText variant="caption" tone="subtle">
                  {entry.actor_id ? names.get(entry.actor_id) ?? 'Former member' : 'System'} · {relativeTime(entry.created_at)}
                </AppText>
                {entry.reason ? (
                  <AppText variant="caption" tone="muted">
                    Reason: {entry.reason}
                  </AppText>
                ) : null}
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
