import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { PHASE_NAMES, moveWidget, resolveDashboardLayout, toSavedLayout, type ResolvedLayout } from '@familyhub/shared';
import { useDashboardLayout } from '@/hooks/family-data';
import { errorMessage, unwrap } from '@/lib/data';
import { keys } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useActiveFamily } from '@/providers/FamilyProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText, Badge, Banner, Button, Card, Divider, IconButton, LoadingState, Screen, SectionHeader } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

export default function CustomizeDashboardScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const { userId } = useAuth();
  const { activeFamilyId, permissions } = useActiveFamily();
  const layout = useDashboardLayout(activeFamilyId);
  const [items, setItems] = useState<ResolvedLayout['items'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resolved = resolveDashboardLayout(layout.data, permissions);

  useEffect(() => {
    if (layout.isSuccess && items === null) setItems(resolved.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.isSuccess]);

  const save = useMutation({
    mutationFn: async (next: ResolvedLayout['items'] | null) => {
      if (next === null) {
        unwrap(await supabase.from('user_dashboard_layouts').delete().eq('user_id', userId!).eq('family_id', activeFamilyId).select('user_id'));
      } else {
        unwrap(
          await supabase
            .from('user_dashboard_layouts')
            .upsert({ user_id: userId!, family_id: activeFamilyId, widgets: toSavedLayout(next) })
            .select('user_id'),
        );
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.dashboardLayout(activeFamilyId, userId) });
      router.back();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (layout.isPending || !items) return <LoadingState />;

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button title="Save" loading={save.isPending && save.variables !== null} onPress={() => save.mutate(items)} />
          <Button title="Reset to default" variant="ghost" loading={save.isPending && save.variables === null} onPress={() => save.mutate(null)} />
        </View>
      }
    >
      {error ? <Banner tone="danger" title={error} /> : null}
      <SectionHeader title="Your home widgets" />
      <Card padded={false}>
        {items.map((w, i) => (
          <View key={w.id}>
            {i > 0 ? <Divider inset={spacing.lg} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.lg, paddingRight: spacing.sm, minHeight: 60, gap: spacing.xs }}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" tone={w.visible ? 'default' : 'muted'}>
                  {w.title}
                </AppText>
                <AppText variant="caption" tone="subtle">
                  {w.description}
                </AppText>
              </View>
              <IconButton icon="chevron-up" label={`Move ${w.title} up`} onPress={() => setItems(moveWidget(items, i, i - 1))} />
              <IconButton icon="chevron-down" label={`Move ${w.title} down`} onPress={() => setItems(moveWidget(items, i, i + 1))} />
              <Switch
                value={w.visible}
                onValueChange={(visible) => setItems(items.map((x) => (x.id === w.id ? { ...x, visible } : x)))}
                trackColor={{ true: colors.primary, false: colors.border }}
                accessibilityLabel={`Show ${w.title}`}
              />
            </View>
          </View>
        ))}
      </Card>

      <SectionHeader title="Coming with later phases" />
      <Card padded={false}>
        {resolved.upcoming.map((w, i) => (
          <View key={w.id}>
            {i > 0 ? <Divider inset={spacing.lg} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, minHeight: 52, gap: spacing.md }}>
              <AppText tone="muted" style={{ flex: 1 }}>
                {w.title}
              </AppText>
              <Badge label={PHASE_NAMES[w.phase] ?? `Phase ${w.phase}`} fg={colors.textMuted} bg={colors.surfaceAlt} />
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
