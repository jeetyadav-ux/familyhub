import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { CURRENT_PHASE, PHASE_NAMES, type ModuleDef } from '@familyhub/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText, Badge, Card, IconTile, Screen, type IconName } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

/**
 * Honest screen for a module that is not built yet: what it will do and when.
 * No buttons or sample data that could be mistaken for a working feature.
 */
export function ModulePlaceholder({ module }: { module: ModuleDef }) {
  const { colors } = useTheme();
  return (
    <Screen edges={[]}>
      <Card style={{ alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md }}>
        <IconTile icon={(module.icon.endsWith('-outline') ? module.icon : `${module.icon}-outline`) as IconName} size={64} />
        <AppText variant="title" style={{ textAlign: 'center' }} accessibilityRole="header">
          {module.title}
        </AppText>
        <Badge label={`Arrives in Phase ${module.phase} · ${PHASE_NAMES[module.phase]}`} fg={colors.accent} bg={colors.accentSoft} icon="time-outline" />
        <AppText tone="muted" style={{ textAlign: 'center' }}>
          {module.description}
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading">FamilyHub roadmap</AppText>
        {Object.entries(PHASE_NAMES).map(([n, name]) => {
          const phase = Number(n);
          const done = phase <= CURRENT_PHASE;
          const isThis = phase === module.phase;
          return (
            <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Ionicons
                name={done ? 'checkmark-circle' : isThis ? 'ellipse' : 'ellipse-outline'}
                size={20}
                color={done ? colors.success : isThis ? colors.accent : colors.textSubtle}
              />
              <AppText tone={done ? 'default' : isThis ? 'default' : 'muted'} variant={isThis ? 'bodyStrong' : 'body'}>
                Phase {n}: {name}
                {done ? ' (available)' : ''}
              </AppText>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
