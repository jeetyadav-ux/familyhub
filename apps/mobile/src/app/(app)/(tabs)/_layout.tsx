import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/tabs';
import { TAB_MODULES } from '@familyhub/shared';
import { useTheme } from '@/providers/ThemeProvider';
import type { IconName } from '@/ui/primitives';

const ROUTE_FOR_TAB: Record<string, string> = {
  home: 'home',
  finance: 'finance',
  shopping: 'shopping',
  health: 'health',
  family: 'family',
  more: 'more',
};

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TAB_MODULES.map((tab) => (
        <Tabs.Screen
          key={tab.key}
          name={ROUTE_FOR_TAB[tab.key]!}
          options={{
            title: tab.title,
            headerShown: tab.key !== 'home',
            tabBarAccessibilityLabel: `${tab.title} tab`,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={(focused ? tab.icon : `${tab.icon}-outline`) as IconName} size={size} color={color as string} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
