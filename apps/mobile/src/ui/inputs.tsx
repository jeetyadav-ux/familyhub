import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState, type ComponentRef } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COUNTRY_CODES, type CountryCode } from '@familyhub/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText, Divider, IconButton, ListRow } from './primitives';
import { radius, spacing, typography } from './theme';

/**
 * Six-digit OTP entry. One real TextInput (so iOS/Android SMS autofill works) drawn as six boxes.
 */
export function OtpField({
  value,
  onChange,
  onComplete,
  error,
  autoFocus = true,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  error?: string | null;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');

  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable onPress={() => input.current?.focus()} accessible={false} style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }}>
        {digits.map((d, i) => {
          const active = focused && (i === value.length || (i === 5 && value.length === 6));
          return (
            <View
              key={i}
              style={{
                flex: 1,
                aspectRatio: 0.85,
                maxWidth: 56,
                borderRadius: radius.md,
                borderWidth: active ? 2 : 1,
                borderColor: error ? colors.danger : active ? colors.primary : colors.border,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText variant="title">{d.trim()}</AppText>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={input}
        testID="otp-input"
        value={value}
        editable={!disabled}
        onChangeText={(t) => {
          const clean = t.replace(/\D/g, '').slice(0, 6);
          onChange(clean);
          if (clean.length === 6) onComplete?.(clean);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        accessibilityLabel="6-digit verification code"
        style={{ position: 'absolute', opacity: 0.011, width: 1, height: 1 }}
        caretHidden
      />
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

/** Country code selector + national number input. */
export function PhoneField({
  country,
  onCountryChange,
  value,
  onChangeText,
  error,
  label = 'Mobile number',
  autoFocus,
  onSubmitEditing,
}: {
  country: CountryCode;
  onCountryChange: (c: CountryCode) => void;
  value: string;
  onChangeText: (v: string) => void;
  error?: string | null;
  label?: string;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
}) {
  const { colors } = useTheme();
  const [picking, setPicking] = useState(false);
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 56,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.surface,
          overflow: 'hidden',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Country code ${country.name} ${country.dialCode}. Change`}
          onPress={() => setPicking(true)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: spacing.md,
            alignSelf: 'stretch',
            borderRightWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
          })}
        >
          <AppText variant="bodyStrong">{country.dialCode}</AppText>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Pressable>
        <TextInput
          testID="phone-input"
          value={value}
          onChangeText={onChangeText}
          placeholder={country.iso === 'IN' ? '98765 43210' : 'Mobile number'}
          placeholderTextColor={colors.textSubtle}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          autoFocus={autoFocus}
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={label}
          selectionColor={colors.primary}
          style={{ flex: 1, paddingHorizontal: spacing.md, color: colors.text, ...typography.body, fontSize: 18, letterSpacing: 0.5 }}
        />
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}

      <Modal visible={picking} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicking(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg }}>
            <AppText variant="title">Country code</AppText>
            <IconButton icon="close" label="Close" onPress={() => setPicking(false)} />
          </View>
          <FlatList
            data={COUNTRY_CODES as CountryCode[]}
            keyExtractor={(c) => c.iso}
            ItemSeparatorComponent={() => <Divider inset={spacing.lg} />}
            renderItem={({ item }) => (
              <ListRow
                title={item.name}
                right={<AppText tone="muted">{item.dialCode}</AppText>}
                chevron={false}
                onPress={() => {
                  onCountryChange(item);
                  setPicking(false);
                }}
              />
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
