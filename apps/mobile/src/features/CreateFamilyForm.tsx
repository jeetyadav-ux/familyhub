import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { familyNameSchema, relationshipLabelSchema } from '@familyhub/shared';
import { errorMessage, rpc } from '@/lib/data';
import { invalidateFamilyData } from '@/lib/query';
import { useFamily } from '@/providers/FamilyProvider';
import { Banner, Button, TextField } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

export function CreateFamilyForm({ onCreated, submitLabel = 'Create family' }: { onCreated?: (familyId: string) => void; submitLabel?: string }) {
  const { setActiveFamily } = useFamily();
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const parsedName = familyNameSchema.safeParse(name);
      if (!parsedName.success) {
        setNameError(parsedName.error.issues[0]?.message ?? 'Give your family a name');
        throw null;
      }
      const label = relationshipLabelSchema.parse(relationship);
      return rpc<string>('create_family', { p_name: parsedName.data, p_relationship_label: label ?? null });
    },
    onSuccess: async (familyId) => {
      await invalidateFamilyData();
      await setActiveFamily(familyId).catch(() => undefined);
      onCreated?.(familyId);
    },
    onError: (e) => {
      if (e) setError(errorMessage(e));
    },
  });

  return (
    <View style={{ gap: spacing.lg }}>
      <TextField
        label="Family name"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setNameError(null);
        }}
        placeholder="e.g. Yadav Family"
        autoCapitalize="words"
        maxLength={60}
        error={nameError}
      />
      <TextField
        label="Your role in the family (optional)"
        value={relationship}
        onChangeText={setRelationship}
        placeholder="e.g. Father, Daughter, Nani"
        autoCapitalize="words"
        maxLength={30}
        hint="Shown next to your name. You'll be the family's primary admin."
      />
      <Button title={submitLabel} icon="home-outline" loading={create.isPending} onPress={() => { setError(null); create.mutate(); }} />
      {error ? <Banner tone="danger" title={error} /> : null}
    </View>
  );
}
