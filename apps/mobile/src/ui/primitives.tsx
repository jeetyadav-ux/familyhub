import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { roleLabel, type FamilyRole } from '@familyhub/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { HIT_SLOP, radius, spacing, typography, type TypographyVariant } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------
type Tone = 'default' | 'muted' | 'subtle' | 'primary' | 'danger' | 'success' | 'warning' | 'onPrimary';

export function AppText({
  variant = 'body',
  tone = 'default',
  style,
  ...rest
}: TextProps & { variant?: TypographyVariant; tone?: Tone }) {
  const { colors } = useTheme();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    subtle: colors.textSubtle,
    primary: colors.primary,
    danger: colors.danger,
    success: colors.success,
    warning: colors.warning,
    onPrimary: colors.onPrimary,
  }[tone];
  return <Text maxFontSizeMultiplier={1.6} {...rest} style={[typography[variant], { color }, style]} />;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
export function Screen({
  children,
  scroll = true,
  edges = ['bottom'],
  padded = true,
  refreshing,
  onRefresh,
  contentStyle,
  footer,
}: PropsWithChildren<{
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
}>) {
  const { colors } = useTheme();
  const pad = padded ? { padding: spacing.lg, gap: spacing.lg } : null;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.background }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[pad, { paddingBottom: spacing.xxxl }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
      )}
      {footer ? (
        <View style={{ padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.background }}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export function Card({ children, style, padded = true }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; padded?: boolean }>) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: padded ? spacing.lg : 0,
          gap: padded ? spacing.md : 0,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs }}>
      <AppText variant="overline" tone="muted" accessibilityRole="header">
        {title.toUpperCase()}
      </AppText>
      {action}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: inset }} />;
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  compact = false,
  style,
  accessibilityHint,
  testID,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.surface, pressed: colors.surfaceAlt, fg: colors.text, border: colors.border },
    ghost: { bg: 'transparent', pressed: colors.surfaceAlt, fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.dangerSoft, pressed: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        {
          minHeight: compact ? 40 : 52,
          paddingHorizontal: compact ? spacing.md : spacing.xl,
          borderRadius: radius.md,
          backgroundColor: pressed && !inactive ? palette.pressed : palette.bg,
          borderWidth: 1,
          borderColor: palette.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          opacity: inactive && !loading ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 18 : 20} color={palette.fg} /> : null}
          <AppText variant={compact ? 'label' : 'bodyStrong'} style={{ color: palette.fg }}>
            {title}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  tone = 'default',
  size = 22,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'primary';
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: HIT_SLOP,
        height: HIT_SLOP,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.pill,
        backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
      })}
    >
      <Ionicons name={icon} size={size} color={tone === 'primary' ? colors.primary : colors.text} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------
export function TextField({
  label,
  error,
  hint,
  left,
  style,
  ...input
}: TextInputProps & { label: string; error?: string | null; hint?: string; left?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 52,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
        }}
      >
        {left}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.primary}
          {...input}
          style={[{ flex: 1, color: colors.text, ...typography.body, paddingVertical: spacing.sm } as TextStyle, style]}
        />
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="subtle">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  label,
}: {
  options: ReadonlyArray<{ value: T; label: string; disabled?: boolean }>;
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const selected = o.value === value;
        const off = disabled || o.disabled;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: off }}
            accessibilityLabel={o.label}
            onPress={off ? undefined : () => onChange(o.value)}
            style={{
              flex: 1,
              minHeight: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              backgroundColor: selected ? colors.surface : 'transparent',
              opacity: off && !selected ? 0.45 : 1,
            }}
          >
            <AppText variant="label" tone={selected ? 'default' : 'muted'}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------
export function Badge({ label, fg, bg, icon }: { label: string; fg: string; bg: string; icon?: IconName }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 }}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <AppText variant="caption" style={{ color: fg, fontWeight: '600' }}>
        {label}
      </AppText>
    </View>
  );
}

export function RoleBadge({ role, isPrimaryAdmin = false }: { role: FamilyRole; isPrimaryAdmin?: boolean }) {
  const { colors } = useTheme();
  const c = colors.role[role];
  return <Badge label={roleLabel(role, isPrimaryAdmin)} fg={c.fg} bg={c.bg} icon={isPrimaryAdmin ? 'star' : undefined} />;
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0]![0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] ?? '' : '')).toUpperCase();
}

const AVATAR_TINTS = ['#2F5D50', '#3D4F8C', '#A0522D', '#7A4E8C', '#2B6F8F', '#8C6A2B'];

export function Avatar({ name, size = 40, seed }: { name: string | null | undefined; size?: number; seed?: string }) {
  const key = seed ?? name ?? '';
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const bg = AVATAR_TINTS[hash % AVATAR_TINTS.length]!;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: size * 0.38, fontWeight: '700' }}>{initials(name)}</Text>
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  left,
  right,
  onPress,
  chevron = !!onPress,
  destructive = false,
  disabled = false,
  accessibilityHint,
}: {
  title: string;
  subtitle?: string | null;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: PressableProps['onPress'];
  chevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const { colors } = useTheme();
  const content = (
    <>
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" tone={destructive ? 'danger' : 'default'} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} /> : null}
    </>
  );
  const rowStyle: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 56 };
  if (!onPress) return <View style={[rowStyle, { opacity: disabled ? 0.55 : 1 }]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [rowStyle, { backgroundColor: pressed ? colors.surfaceAlt : 'transparent', opacity: disabled ? 0.55 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

export function IconTile({ icon, tone = 'primary', size = 36 }: { icon: IconName; tone?: 'primary' | 'accent' | 'muted' | 'danger'; size?: number }) {
  const { colors } = useTheme();
  const map = {
    primary: [colors.primarySoft, colors.primary],
    accent: [colors.accentSoft, colors.accent],
    muted: [colors.surfaceAlt, colors.textMuted],
    danger: [colors.dangerSoft, colors.danger],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: radius.sm + 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={size * 0.55} color={fg} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={{ flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xxxl, alignItems: 'center', gap: spacing.md, backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} />
      <AppText tone="muted">{label}</AppText>
    </View>
  );
}

export function EmptyState({ icon, title, message, action }: { icon: IconName; title: string; message?: string; action?: ReactNode }) {
  return (
    <View style={{ paddingVertical: spacing.xxl, alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg }}>
      <IconTile icon={icon} tone="muted" size={52} />
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {message ? (
        <AppText tone="muted" style={{ textAlign: 'center' }}>
          {message}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View accessibilityRole="alert" style={{ paddingVertical: spacing.xxl, alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg }}>
      <IconTile icon="cloud-offline-outline" tone="danger" size={52} />
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        Couldn&apos;t load this
      </AppText>
      <AppText tone="muted" style={{ textAlign: 'center' }}>
        {message}
      </AppText>
      {onRetry ? <Button title="Try again" variant="secondary" icon="refresh" onPress={onRetry} compact /> : null}
    </View>
  );
}

export function Banner({
  tone = 'info',
  icon,
  title,
  message,
  action,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  icon?: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  const map = {
    info: [colors.primarySoft, colors.primary, 'information-circle'],
    warning: [colors.warningSoft, colors.warning, 'warning'],
    danger: [colors.dangerSoft, colors.danger, 'alert-circle'],
    success: [colors.successSoft, colors.success, 'checkmark-circle'],
  } as const;
  const [bg, fg, defaultIcon] = map[tone];
  return (
    <View accessibilityRole={tone === 'danger' ? 'alert' : undefined} style={{ backgroundColor: bg, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
        <Ionicons name={icon ?? defaultIcon} size={20} color={fg} style={{ marginTop: 1 }} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong" style={{ color: fg }}>
            {title}
          </AppText>
          {message ? <AppText variant="caption" tone="muted">{message}</AppText> : null}
        </View>
      </View>
      {action}
    </View>
  );
}
