import { useCallback, useRef, useState } from 'react';
import { Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatPhone } from '@familyhub/shared';
import { AppError, errorMessage, toAppError } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { OtpField } from '@/ui/inputs';
import { AppText, Button, IconButton } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

export class StepUpCancelled extends AppError {
  constructor() {
    super('Confirmation cancelled.', null);
  }
}

/**
 * Critical actions (transfer ownership, delete family) need a fresh OTP. `run(action)` tries
 * the action; if the database answers FH_REAUTH_REQUIRED it asks for an OTP, then retries once.
 * Render `modal` somewhere in the screen.
 */
export function useStepUp() {
  const [visible, setVisible] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    try {
      return await action();
    } catch (error) {
      if (toAppError(error).code !== 'FH_REAUTH_REQUIRED') throw error;
      const ok = await new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setVisible(true);
      });
      if (!ok) throw new StepUpCancelled();
      return action();
    }
  }, []);

  const finish = (ok: boolean) => {
    setVisible(false);
    resolver.current?.(ok);
    resolver.current = null;
  };

  return { run, modal: <StepUpModal visible={visible} onDone={finish} /> };
}

function StepUpModal({ visible, onDone }: { visible: boolean; onDone: (ok: boolean) => void }) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phone = profile?.phone ?? '';

  const reset = () => {
    setSent(false);
    setCode('');
    setError(null);
    setBusy(false);
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
    setBusy(false);
    if (e) setError(errorMessage(e));
    else setSent(true);
  };

  const verify = async (token: string) => {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    setBusy(false);
    if (e) {
      setError('That code is incorrect or has expired.');
      return;
    }
    reset();
    onDone(true);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { reset(); onDone(false); }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="title" accessibilityRole="header">
            Confirm it&apos;s you
          </AppText>
          <IconButton icon="close" label="Cancel" onPress={() => { reset(); onDone(false); }} />
        </View>
        <AppText tone="muted">
          This is a sensitive action. We&apos;ll send a one-time code to {formatPhone(phone)} to confirm.
        </AppText>
        {sent ? (
          <>
            <OtpField value={code} onChange={setCode} onComplete={verify} error={error} disabled={busy} />
            <Button title="Confirm" loading={busy} disabled={code.length !== 6} onPress={() => verify(code)} />
            <Button title="Send a new code" variant="ghost" disabled={busy} onPress={send} />
          </>
        ) : (
          <>
            {error ? <AppText tone="danger">{error}</AppText> : null}
            <Button title="Send code" icon="chatbubble-ellipses-outline" loading={busy} onPress={send} />
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}
