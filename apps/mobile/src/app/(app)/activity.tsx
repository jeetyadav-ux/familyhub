import { ActivityList } from '@/features/home-widgets';
import { useActivity } from '@/hooks/family-data';
import { errorMessage } from '@/lib/data';
import { useAuth } from '@/providers/AuthProvider';
import { useActiveFamily } from '@/providers/FamilyProvider';
import { Card, EmptyState, ErrorState, LoadingState, Screen } from '@/ui/primitives';

export default function ActivityScreen() {
  const { profile } = useAuth();
  const { activeFamilyId } = useActiveFamily();
  const activity = useActivity(activeFamilyId);

  return (
    <Screen onRefresh={() => activity.refetch()} refreshing={activity.isRefetching}>
      {activity.isPending ? (
        <LoadingState />
      ) : activity.error ? (
        <ErrorState message={errorMessage(activity.error)} onRetry={() => activity.refetch()} />
      ) : (activity.data ?? []).length === 0 ? (
        <EmptyState icon="pulse-outline" title="No activity yet" />
      ) : (
        <Card>
          <ActivityList items={activity.data ?? []} myName={profile?.display_name} />
        </Card>
      )}
    </Screen>
  );
}
