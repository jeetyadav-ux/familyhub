import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText, Button, TextField } from './primitives';
import { radius, spacing } from './theme';

/**
 * Confirmation dialog used for every financial or administrative action.
 * Optional reason field (stored in the audit log) and optional typed confirmation.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive = false,
  loading = false,
  askReason = false,
  requireText,
  error,
  onConfirm,
  onCancel,
  children,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  askReason?: boolean;
  /** When set, the user must type this text (case-insensitive) to enable the confirm button. */
  requireText?: string;
  error?: string | null;
  onConfirm: (input: { reason?: string; typed?: string }) => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const typedOk = !requireText || typed.trim().toLowerCase() === requireText.trim().toLowerCase();

  const close = () => {
    setReason('');
    setTyped('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Dismiss" onPress={loading ? undefined : close} style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl }}>
          <Pressable accessible={false} onPress={() => undefined} style={{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <AppText variant="title" accessibilityRole="header">
                {title}
              </AppText>
              {message ? <AppText tone="muted">{message}</AppText> : null}
            </View>
            {children}
            {requireText ? (
              <TextField
                label={`Type "${requireText}" to confirm`}
                value={typed}
                onChangeText={setTyped}
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : null}
            {askReason ? (
              <TextField
                label="Reason (optional, saved in the audit log)"
                value={reason}
                onChangeText={setReason}
                maxLength={200}
                placeholder="e.g. Moved out"
              />
            ) : null}
            {error ? (
              <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
                {error}
              </AppText>
            ) : null}
            <View style={{ gap: spacing.sm }}>
              <Button
                title={confirmLabel}
                variant={destructive ? 'danger' : 'primary'}
                loading={loading}
                disabled={!typedOk}
                onPress={() => onConfirm({ reason: reason.trim() || undefined, typed: typed.trim() || undefined })}
              />
              <Button title="Cancel" variant="ghost" disabled={loading} onPress={close} />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
