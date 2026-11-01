import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFamily } from '@/providers/FamilyProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText, Divider, ListRow, IconTile, type IconName } from '@/ui/primitives';
import { radius, spacing } from '@/ui/theme';

interface QuickAction {
  key: string;
  title: string;
  subtitle: string;
  icon: IconName;
  href: Href;
  permission?: string;
}

/**
 * Quick Add only offers actions whose module is live. Each phase adds its own
 * (expense, income, shopping item, task, reminder, document, event) to this list.
 */
const ACTIONS: QuickAction[] = [
  { key: 'invite', title: 'Invite a family member', subtitle: 'By mobile number, link or QR code', icon: 'person-add-outline', href: '/invite', permission: 'members.invite' },
];

export function QuickAddButton() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { can } = useFamily();
  const [open, setOpen] = useState(false);
  const actions = ACTIONS.filter((a) => !a.permission || can(a.permission));
  if (actions.length === 0) return null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quick add"
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          position: 'absolute',
          right: spacing.lg,
          bottom: spacing.lg,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: pressed ? colors.primaryPressed : colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        })}
      >
        <Ionicons name="add" size={30} color={colors.onPrimary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close quick add" style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setOpen(false)} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: insets.bottom + spacing.md, paddingTop: spacing.md }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md }} />
          <AppText variant="heading" style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
            Quick add
          </AppText>
          {actions.map((a, i) => (
            <View key={a.key}>
              {i > 0 ? <Divider inset={spacing.lg} /> : null}
              <ListRow
                title={a.title}
                subtitle={a.subtitle}
                left={<IconTile icon={a.icon} />}
                onPress={() => {
                  setOpen(false);
                  router.push(a.href);
                }}
              />
            </View>
          ))}
          <AppText variant="caption" tone="subtle" style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
            Expenses, income, shopping, tasks, reminders, documents and events are added here as each module launches.
          </AppText>
        </View>
      </Modal>
    </>
  );
}
