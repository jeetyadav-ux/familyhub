import { useRouter } from 'expo-router';
import { CreateFamilyForm } from '@/features/CreateFamilyForm';
import { AppText, Screen } from '@/ui/primitives';

export default function CreateFamilyScreen() {
  const router = useRouter();
  return (
    <Screen>
      <AppText tone="muted">
        Each family has its own members, records and settings. You can switch between your families at any time.
      </AppText>
      <CreateFamilyForm onCreated={() => router.dismissTo('/home')} />
    </Screen>
  );
}
