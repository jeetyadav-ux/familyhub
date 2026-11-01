import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { familyNameSchema } from '@familyhub/shared';
import { StepUpCancelled, useStepUp } from '@/features/step-up';
import { useFamilyRecord } from '@/hooks/family-data';
import { errorMessage, rpc, unwrap } from '@/lib/data';
import { invalidateFamilyData } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { useActiveFamily } from '@/providers/FamilyProvider';
import { ConfirmDialog } from '@/ui/dialogs';
import { AppText, Banner, Button, Card, LoadingState, Screen, SectionHeader, SegmentedControl, TextField } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

const CURRENCIES = ['INR', 'USD', 'AED', 'GBP', 'EUR', 'SGD'] as const;

export default function FamilySettingsScreen() {
  const router = useRouter();
  const { activeFamilyId, can, isPrimaryAdmin } = useActiveFamily();
  const family = useFamilyRecord(activeFamilyId);
  const stepUp = useStepUp();
  const editable = can('family.settings');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<string>('INR');
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null);

  useEffect(() => {
    if (family.data) {
      setName(family.data.name);
      setCurrency(family.data.currency);
    }
  }, [family.data]);

  const save = useMutation({
    mutationFn: async () => {
      const parsed = familyNameSchema.safeParse(name);
      if (!parsed.success) {
        setNameError(parsed.error.issues[0]?.message ?? 'Invalid name');
        throw null;
      }
      unwrap(await supabase.from('families').update({ name: parsed.data, currency }).eq('id', activeFamilyId).select('id'));
    },
    onSuccess: async () => {
      setSaved(true);
      await invalidateFamilyData();
    },
    onError: (e) => {
      if (e) setError(errorMessage(e));
    },
  });

  const leave = useMutation({
    mutationFn: () => rpc<void>('leave_family', { p_family_id: activeFamilyId }),
    onSuccess: async () => {
      setConfirm(null);
      await invalidateFamilyData();
      router.dismissTo('/home');
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (typed: string) => stepUp.run(() => rpc<void>('delete_family', { p_family_id: activeFamilyId, p_confirm_name: typed })),
    onSuccess: async () => {
      await invalidateFamilyData();
      router.dismissTo('/home');
    },
    onError: (e) => {
      if (!(e instanceof StepUpCancelled)) setError(errorMessage(e));
    },
  });

  if (family.isPending || !family.data) return <LoadingState />;
  const dirty = name.trim() !== family.data.name || currency !== family.data.currency;

  return (
    <Screen>
      {error ? <Banner tone="danger" title={error} /> : null}
      {saved && !dirty ? <Banner tone="success" title="Saved" /> : null}

      <SectionHeader title="Details" />
      <Card>
        <TextField
          label="Family name"
          value={name}
          editable={editable}
          onChangeText={(v) => {
            setName(v);
            setNameError(null);
            setSaved(false);
          }}
          maxLength={60}
          error={nameError}
        />
        <View style={{ gap: spacing.xs }}>
          <AppText variant="label" tone="muted">
            Currency
          </AppText>
          <SegmentedControl
            label="Currency"
            value={currency}
            disabled={!editable}
            onChange={(c) => {
              setCurrency(c);
              setSaved(false);
            }}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          />
          <AppText variant="caption" tone="subtle">
            Used for budgets and reports when the finance modules launch.
          </AppText>
        </View>
        {editable ? (
          <Button title="Save changes" disabled={!dirty} loading={save.isPending} onPress={() => { setError(null); save.mutate(); }} />
        ) : (
          <AppText variant="caption" tone="muted">
            Only admins can change family details.
          </AppText>
        )}
      </Card>

      <SectionHeader title="Ownership" />
      <Card>
        {isPrimaryAdmin ? (
          <>
            <AppText tone="muted">
              You are the primary admin. To hand over ownership, open a member in the Family tab and choose “Make primary admin”.
            </AppText>
            <Button
              title="Delete this family"
              icon="trash-outline"
              variant="danger"
              loading={remove.isPending}
              onPress={() => {
                setError(null);
                setConfirm('delete');
              }}
            />
          </>
        ) : (
          <>
            <AppText tone="muted">Leaving removes your access to this family. Your account and other families are not affected.</AppText>
            <Button title="Leave this family" icon="exit-outline" variant="danger" onPress={() => setConfirm('leave')} />
          </>
        )}
      </Card>

      <ConfirmDialog
        visible={confirm === 'leave'}
        title={`Leave ${family.data.name}?`}
        message="You'll need a new invitation to rejoin."
        confirmLabel="Leave family"
        destructive
        loading={leave.isPending}
        onConfirm={() => leave.mutate()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        visible={confirm === 'delete'}
        title="Delete this family?"
        message="Every member loses access immediately. This is recorded in the audit log, and you'll confirm with a one-time code."
        confirmLabel="Delete family"
        destructive
        requireText={family.data.name}
        onConfirm={({ typed }) => {
          setConfirm(null);
          remove.mutate(typed ?? '');
        }}
        onCancel={() => setConfirm(null)}
      />
      {stepUp.modal}
    </Screen>
  );
}
