import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { DEFAULT_COUNTRY, normalizePhone, type CountryCode } from '@familyhub/shared';
import { errorMessage } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/providers/ThemeProvider';
import { PhoneField } from '@/ui/inputs';
import { AppText, Button, Screen } from '@/ui/primitives';
import { radius, spacing } from '@/ui/theme';

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [number, setNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const result = normalizePhone(number, country);
    if (!result.ok) {
      setError(result.error === 'empty' ? 'Enter your mobile number' : 'Enter a valid mobile number');
      return;
    }
    setError(null);
    setSending(true);
    const { error: e } = await supabase.auth.signInWithOtp({ phone: result.e164 });
    setSending(false);
    if (e) {
      setError(/rate|too many|frequency/i.test(e.message) ? 'Please wait a minute before requesting another code.' : errorMessage(e));
      return;
    }
    router.push({ pathname: '/verify', params: { phone: result.e164 } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']} contentStyle={{ flexGrow: 1, justifyContent: 'space-between' }}>
        <View style={{ gap: spacing.xxl, marginTop: spacing.xxl }}>
          <View style={{ gap: spacing.lg }}>
            <View style={{ width: 64, height: 64, borderRadius: radius.xl, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="home" size={32} color={colors.onPrimary} />
            </View>
            <View style={{ gap: spacing.sm }}>
              <AppText variant="display" accessibilityRole="header">
                FamilyHub
              </AppText>
              <AppText variant="body" tone="muted">
                Your family&apos;s money, plans and paperwork in one private place.
              </AppText>
            </View>
          </View>

          <View style={{ gap: spacing.lg }}>
            <PhoneField
              country={country}
              onCountryChange={setCountry}
              value={number}
              onChangeText={(v) => {
                setNumber(v);
                if (error) setError(null);
              }}
              error={error}
              onSubmitEditing={submit}
            />
            <Button title="Continue" onPress={submit} loading={sending} testID="send-otp" />
            <AppText variant="caption" tone="subtle" style={{ textAlign: 'center' }}>
              We&apos;ll send a 6-digit code by SMS. Standard message rates may apply.
            </AppText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xl }}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.textSubtle} />
          <AppText variant="caption" tone="subtle">
            Private by default. Only your family sees what you share.
          </AppText>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
