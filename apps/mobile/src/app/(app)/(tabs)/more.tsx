import { useRouter, type Href } from 'expo-router';
import { View } from 'react-native';
import { MORE_MODULES, isModuleLive } from '@familyhub/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText, Badge, Card, Divider, IconTile, ListRow, Screen, SectionHeader, type IconName } from '@/ui/primitives';

const LIVE_ROUTES: Record<string, Href> = {
  members: '/family',
  settings: '/settings',
};

export default function MoreTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const live = MORE_MODULES.filter((m) => isModuleLive(m) && LIVE_ROUTES[m.key]);
  const upcoming = MORE_MODULES.filter((m) => !isModuleLive(m));

  return (
    <Screen edges={[]}>
      <SectionHeader title="Available now" />
      <Card padded={false}>
        {live.map((m, i) => (
          <View key={m.key}>
            {i > 0 ? <Divider inset={64} /> : null}
            <ListRow title={m.title} subtitle={m.description} left={<IconTile icon={m.icon as IconName} />} onPress={() => router.push(LIVE_ROUTES[m.key]!)} />
          </View>
        ))}
      </Card>

      <SectionHeader title="Coming next" />
      <AppText variant="caption" tone="muted">
        These modules are being built phase by phase. Tap one to see what it will do.
      </AppText>
      <Card padded={false}>
        {upcoming.map((m, i) => (
          <View key={m.key}>
            {i > 0 ? <Divider inset={64} /> : null}
            <ListRow
              title={m.title}
              subtitle={m.description}
              left={<IconTile icon={m.icon as IconName} tone="muted" />}
              right={<Badge label={`Phase ${m.phase}`} fg={colors.textMuted} bg={colors.surfaceAlt} />}
              onPress={() => router.push({ pathname: '/module/[key]', params: { key: m.key } })}
            />
          </View>
        ))}
      </Card>
    </Screen>
  );
}
