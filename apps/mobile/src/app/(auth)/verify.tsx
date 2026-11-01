import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatPhone } from '@familyhub/shared';
import { supabase } from '@/lib/supabase';
import { OtpField } from '@/ui/inputs';
import { AppText, Button, Screen } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

const RESEND_SECONDS = 30;

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const verify = async (token: string) => {
    if (!phone || token.length !== 6 || verifying) return;
    setVerifying(true);
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    setVerifying(false);
    if (e) {
      setCode('');
      setError(/expired/i.test(e.message) ? 'That code has expired. Request a new one.' : 'That code is incorrect. Try again.');
    }
    // On success the root navigator moves on automatically (session changes).
  };

  const resend = async () => {
    if (!phone) return;
    setNotice(null);
    setError(null);
    const { error: e } = await supabase.auth.signInWithOtp({ phone });
    if (e) setError('Could not send a new code. Please wait and try again.');
    else {
      setNotice('A new code is on its way.');
      setResendIn(RESEND_SECONDS);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title" accessibilityRole="header">
          Enter the code
        </AppText>
        <AppText tone="muted">Sent by SMS to {formatPhone(phone)}</AppText>
      </View>
      <OtpField value={code} onChange={(v) => { setCode(v); if (error) setError(null); }} onComplete={verify} error={error} disabled={verifying} />
      <Button title="Verify" onPress={() => verify(code)} loading={verifying} disabled={code.length !== 6} testID="verify-otp" />
      {notice ? <AppText tone="success" style={{ textAlign: 'center' }}>{notice}</AppText> : null}
      <Button
        title={resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
        variant="ghost"
        disabled={resendIn > 0}
        onPress={resend}
      />
    </Screen>
  );
}
