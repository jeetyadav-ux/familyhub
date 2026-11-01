import { useState } from 'react';
import { View } from 'react-native';
import { displayNameSchema, formatPhone } from '@familyhub/shared';
import { errorMessage, unwrap } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { AppText, Button, Screen, TextField } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

export default function ProfileSetupScreen() {
  const { userId, profile, refetchProfile, signOut } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const parsed = displayNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter your name');
      return;
    }
    setSaving(true);
    try {
      unwrap(
        await supabase
          .from('profiles')
          .update({ display_name: parsed.data, onboarded_at: new Date().toISOString() })
          .eq('id', userId!)
          .select('id'),
      );
      await refetchProfile();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button title="Continue" onPress={save} loading={saving} />
          <Button title="Use a different number" variant="ghost" onPress={() => signOut()} />
        </View>
      }
    >
      <AppText tone="muted">Signed in as {formatPhone(profile?.phone)}</AppText>
      <AppText variant="title" accessibilityRole="header">
        What should your family call you?
      </AppText>
      <TextField
        label="Your name"
        value={name}
        onChangeText={(v) => {
          setName(v);
          if (error) setError(null);
        }}
        placeholder="e.g. Jeet"
        autoFocus
        autoCapitalize="words"
        textContentType="name"
        autoComplete="name"
        maxLength={60}
        error={error}
        returnKeyType="done"
        onSubmitEditing={save}
      />
    </Screen>
  );
}
