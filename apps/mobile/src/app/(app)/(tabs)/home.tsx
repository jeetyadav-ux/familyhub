import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, RefreshControl } from 'react-native';
import { resolveDashboardLayout } from '@familyhub/shared';
import {
  FamilyActivityWidget,
  FamilyMembersWidget,
  PendingInvitationsWidget,
  SetupChecklistWidget,
} from '@/features/home-widgets';
import { PendingInviteCard } from '@/features/invitations';
import { QuickAddButton } from '@/features/QuickAdd';
import { useDashboardLayout, useHomeSummary, useInvitationsForMe } from '@/hooks/family-data';
import { errorMessage } from '@/lib/data';
import { greeting } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';
import { useActiveFamily } from '@/providers/FamilyProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText, Button, ErrorState, IconButton, LoadingState } from '@/ui/primitives';
import { radius, spacing } from '@/ui/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { activeFamily, activeFamilyId, families, permissions } = useActiveFamily();
  const summary = useHomeSummary(activeFamilyId);
  const layout = useDashboardLayout(activeFamilyId);
  const invitesForMe = useInvitationsForMe();

  const refreshing = summary.isRefetching || invitesForMe.isRefetching;
  const refresh = () => {
    summary.refetch();
    invitesForMe.refetch();
    layout.refetch();
  };

  const { items } = resolveDashboardLayout(layout.data, permissions);
  const firstName = profile?.display_name?.split(' ')[0] ?? '';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <AppText variant="title" accessibilityRole="header">
              {greeting()}, {firstName}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Current family ${activeFamily.name}. ${families.length > 1 ? 'Switch family' : 'Manage families'}`}
              onPress={() => router.push('/switch-family')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                alignSelf: 'flex-start',
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.sm,
                marginLeft: -spacing.sm,
                borderRadius: radius.pill,
                backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
              })}
            >
              <Ionicons name="home-outline" size={16} color={colors.primary} />
              <AppText variant="label" tone="primary">
                {activeFamily.name}
              </AppText>
              <Ionicons name="chevron-down" size={14} color={colors.primary} />
            </Pressable>
          </View>
          <IconButton icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
        </View>

        {(invitesForMe.data ?? []).map((inv) => (
          <PendingInviteCard key={inv.invitation_id} invite={inv} />
        ))}

        {summary.isPending ? (
          <LoadingState />
        ) : summary.error ? (
          <ErrorState message={errorMessage(summary.error)} onRetry={() => summary.refetch()} />
        ) : summary.data ? (
          items
            .filter((w) => w.visible)
            .map((w) => {
              switch (w.id) {
                case 'setup_checklist':
                  return <SetupChecklistWidget key={w.id} summary={summary.data} />;
                case 'family_members':
                  return <FamilyMembersWidget key={w.id} summary={summary.data} />;
                case 'pending_invitations':
                  return <PendingInvitationsWidget key={w.id} summary={summary.data} />;
                case 'family_activity':
                  return <FamilyActivityWidget key={w.id} summary={summary.data} myName={profile?.display_name} />;
                default:
                  return null;
              }
            })
        ) : null}

        <Button title="Customise home" icon="options-outline" variant="ghost" compact onPress={() => router.push('/customize-dashboard')} />
      </ScrollView>
      <QuickAddButton />
    </SafeAreaView>
  );
}
