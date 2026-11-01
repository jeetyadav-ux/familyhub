import { Stack, useLocalSearchParams } from 'expo-router';
import { MORE_MODULES, TAB_MODULES } from '@familyhub/shared';
import { ModulePlaceholder } from '@/features/ModulePlaceholder';
import { EmptyState, Screen } from '@/ui/primitives';

export default function ModuleScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const module = [...MORE_MODULES, ...TAB_MODULES].find((m) => m.key === key);
  if (!module) {
    return (
      <Screen>
        <EmptyState icon="help-circle-outline" title="Module not found" />
      </Screen>
    );
  }
  return (
    <>
      <Stack.Screen options={{ title: module.title }} />
      <ModulePlaceholder module={module} />
    </>
  );
}
