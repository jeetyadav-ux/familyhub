import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { CURRENT_PHASE, PHASE_NAMES, ROLE_INFO, type FamilyRole, type PermissionMatrixRow } from '@familyhub/shared';
import { usePermissionMatrix } from '@/hooks/family-data';
import { errorMessage, rpc } from '@/lib/data';
import { invalidateFamilyData } from '@/lib/query';
import { useActiveFamily } from '@/providers/FamilyProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText, Badge, Banner, Card, Divider, ErrorState, LoadingState, Screen } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

const EDITABLE_ROLES: Exclude<FamilyRole, 'admin'>[] = ['adult', 'child', 'viewer'];

export default function PermissionsScreen() {
  const { colors } = useTheme();
  const { activeFamilyId, can } = useActiveFamily();
  const matrix = usePermissionMatrix(activeFamilyId);
  const canManage = can('permissions.manage');
  const [error, setError] = useState<string | null>(null);

  const toggle = useMutation({
    mutationFn: (v: { role: FamilyRole; permission: string; allowed: boolean }) =>
      rpc<void>('set_role_permission', { p_family_id: activeFamilyId, p_role: v.role, p_permission: v.permission, p_allowed: v.allowed }),
    onSuccess: () => invalidateFamilyData(),
    onError: (e) => setError(errorMessage(e)),
  });

  if (matrix.isPending) return <LoadingState />;
  if (matrix.error) return <ErrorState message={errorMessage(matrix.error)} onRetry={() => matrix.refetch()} />;

  const rows = matrix.data ?? [];
  const byPermission = new Map<string, PermissionMatrixRow[]>();
  for (const r of rows) byPermission.set(r.permission, [...(byPermission.get(r.permission) ?? []), r]);
  const live = [...byPermission.values()].filter((g) => g[0]!.available_from_phase <= CURRENT_PHASE);
  const upcomingPhases = [...new Set(rows.filter((r) => r.available_from_phase > CURRENT_PHASE).map((r) => r.available_from_phase))].sort();

  return (
    <Screen>
      <AppText tone="muted">
        Admins can always do everything. {canManage ? 'Choose what adults, children and viewers can do in this family.' : 'Only admins can change these.'}
      </AppText>
      {error ? <Banner tone="danger" title={error} /> : null}

      {live.map((group) => {
        const first = group[0]!;
        return (
          <Card key={first.permission}>
            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                <AppText variant="bodyStrong">{first.label}</AppText>
                {first.admin_only ? <Badge label="Admins only" fg={colors.textMuted} bg={colors.surfaceAlt} icon="lock-closed" /> : null}
              </View>
              <AppText variant="caption" tone="muted">
                {first.description}
              </AppText>
            </View>
            {first.admin_only ? null : (
              <View>
                {EDITABLE_ROLES.map((role, i) => {
                  const row = group.find((g) => g.role === role)!;
                  const busy = toggle.isPending && toggle.variables?.permission === row.permission && toggle.variables.role === role;
                  return (
                    <View key={role}>
                      {i > 0 ? <Divider /> : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: spacing.md }}>
                        <AppText style={{ flex: 1 }}>{ROLE_INFO[role].label}s</AppText>
                        {!row.is_default ? <Badge label="Changed" fg={colors.accent} bg={colors.accentSoft} /> : null}
                        <Switch
                          value={busy ? toggle.variables!.allowed : row.allowed}
                          disabled={!canManage || toggle.isPending}
                          onValueChange={(allowed) => {
                            setError(null);
                            toggle.mutate({ role, permission: row.permission, allowed });
                          }}
                          trackColor={{ true: colors.primary, false: colors.border }}
                          accessibilityLabel={`${first.label} for ${ROLE_INFO[role].label}s`}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        );
      })}

      {upcomingPhases.length ? (
        <Banner
          tone="info"
          icon="time-outline"
          title="More permissions arrive with each module"
          message={upcomingPhases.map((p) => PHASE_NAMES[p]).join(', ')}
        />
      ) : null}
    </Screen>
  );
}
