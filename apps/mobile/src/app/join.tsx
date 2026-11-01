import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  ERROR_MESSAGES,
  formatInviteCode,
  isErrorCode,
  normalizeInviteCode,
  type AcceptInvitationResult,
  type InvitationPreview,
} from '@familyhub/shared';
import { errorMessage, rpc } from '@/lib/data';
import { expiryLabel, roleWithArticle } from '@/lib/format';
import { invalidateFamilyData } from '@/lib/query';
import { useFamily } from '@/providers/FamilyProvider';
import { AppText, Avatar, Banner, Button, Card, RoleBadge, Screen, TextField } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

function resultMessage(error: string): string {
  return isErrorCode(error) ? ERROR_MESSAGES[error] : 'Something went wrong. Please try again.';
}

export default function JoinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { setActiveFamily } = useFamily();
  const [code, setCode] = useState(params.code ? formatInviteCode(params.code) : '');
  const [preview, setPreview] = useState<Extract<InvitationPreview, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyMemberOf, setAlreadyMemberOf] = useState<string | null>(null);

  const check = useMutation({
    mutationFn: (value: string) => rpc<InvitationPreview>('preview_invitation', { p_code: value }),
    onSuccess: (res) => {
      if (res.ok) setPreview(res);
      else {
        setError(resultMessage(res.error));
        if (res.error === 'FH_ALREADY_MEMBER' && res.family_id) setAlreadyMemberOf(res.family_id);
      }
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const join = useMutation({
    mutationFn: (value: string) => rpc<AcceptInvitationResult>('accept_invitation', { p_code: value }),
    onSuccess: async (res) => {
      if (!res.ok) {
        setPreview(null);
        setError(resultMessage(res.error));
        return;
      }
      await invalidateFamilyData();
      await setActiveFamily(res.family_id).catch(() => undefined);
      router.dismissTo('/home');
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const submit = (raw = code) => {
    setError(null);
    setAlreadyMemberOf(null);
    const normalized = normalizeInviteCode(raw);
    if (!normalized) {
      setError('Enter the 8-character code, like K7QM-4XPA');
      return;
    }
    check.mutate(normalized);
  };

  // A code from a link or QR scan is checked straight away.
  useEffect(() => {
    if (params.code && normalizeInviteCode(params.code)) submit(params.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code]);

  if (preview) {
    return (
      <Screen>
        <Card style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
          <Avatar name={preview.family_name} size={64} seed={preview.family_id} />
          <AppText variant="title" style={{ textAlign: 'center' }}>
            {preview.family_name}
          </AppText>
          <AppText tone="muted" style={{ textAlign: 'center' }}>
            {preview.inviter_name} invited you to join as
          </AppText>
          <RoleBadge role={preview.role} />
          <AppText variant="caption" tone="subtle">
            {preview.member_count} {preview.member_count === 1 ? 'member' : 'members'} · {expiryLabel(preview.expires_at)}
          </AppText>
        </Card>
        <AppText variant="caption" tone="muted">
          As {roleWithArticle(preview.role)}, you&apos;ll see the family&apos;s shared information. Your personal records stay private unless you share them.
        </AppText>
        {error ? <Banner tone="danger" title={error} /> : null}
        <Button title={`Join ${preview.family_name}`} loading={join.isPending} onPress={() => join.mutate(normalizeInviteCode(code)!)} />
        <Button title="Not now" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText tone="muted">Enter the invitation code from your family admin.</AppText>
      <TextField
        label="Invitation code"
        value={code}
        onChangeText={(v) => {
          setCode(v.toUpperCase());
          setError(null);
        }}
        placeholder="K7QM-4XPA"
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus={!params.code}
        maxLength={12}
        returnKeyType="go"
        onSubmitEditing={() => submit()}
        style={{ fontSize: 22, letterSpacing: 2 }}
      />
      {error ? <Banner tone="danger" title={error} /> : null}
      {alreadyMemberOf ? (
        <Button
          title="Open this family"
          variant="secondary"
          onPress={async () => {
            await setActiveFamily(alreadyMemberOf).catch(() => undefined);
            router.dismissTo('/home');
          }}
        />
      ) : null}
      <View style={{ gap: spacing.sm }}>
        <Button title="Continue" loading={check.isPending} onPress={() => submit()} />
        <Button title="Scan QR code instead" icon="qr-code-outline" variant="secondary" onPress={() => router.replace('/scan')} />
      </View>
    </Screen>
  );
}
