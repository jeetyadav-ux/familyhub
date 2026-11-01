import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { errorMessage } from '@/lib/data';
import { useFamily } from '@/providers/FamilyProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { Avatar, Banner, Button, Card, Divider, ListRow, RoleBadge, Screen } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

export default function SwitchFamilyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { families, activeFamilyId, setActiveFamily } = useFamily();
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  return (
    <Screen>
      {error ? <Banner tone="danger" title={error} /> : null}
      <Card padded={false}>
        {families.map((f, i) => (
          <View key={f.family_id}>
            {i > 0 ? <Divider inset={72} /> : null}
            <ListRow
              title={f.name}
              subtitle={`${f.member_count} ${Number(f.member_count) === 1 ? 'member' : 'members'}`}
              left={<Avatar name={f.name} seed={f.family_id} />}
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <RoleBadge role={f.role} isPrimaryAdmin={f.is_primary_admin} />
                  {f.family_id === activeFamilyId ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} accessibilityLabel="Current family" /> : null}
                </View>
              }
              chevron={false}
              disabled={switching !== null}
              onPress={async () => {
                if (f.family_id === activeFamilyId) {
                  router.back();
                  return;
                }
                setSwitching(f.family_id);
                try {
                  await setActiveFamily(f.family_id);
                  router.back();
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setSwitching(null);
                }
              }}
            />
          </View>
        ))}
      </Card>
      <Button title="Create another family" icon="add-circle-outline" variant="secondary" onPress={() => router.push('/create-family')} />
      <Button title="Join with a code" icon="keypad-outline" variant="secondary" onPress={() => router.push('/join')} />
    </Screen>
  );
}
