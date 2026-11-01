import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import {
  DEFAULT_COUNTRY,
  ROLE_INFO,
  isAssignableRole,
  normalizePhone,
  relationshipLabelSchema,
  type CountryCode,
  type CreatedInvitation,
  type FamilyRole,
} from '@familyhub/shared';
import { InvitationReady } from '@/features/invitations';
import { errorMessage, rpc } from '@/lib/data';
import { invalidateFamilyData } from '@/lib/query';
import { useActiveFamily } from '@/providers/FamilyProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { PhoneField } from '@/ui/inputs';
import { AppText, Banner, Button, Card, Screen, SegmentedControl, TextField } from '@/ui/primitives';
import { spacing } from '@/ui/theme';

export default function InviteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { activeFamily, activeFamilyId, isAdmin, can } = useActiveFamily();
  const [label, setLabel] = useState('');
  const [usePhone, setUsePhone] = useState(true);
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [number, setNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [role, setRole] = useState<FamilyRole>('adult');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ invitation: CreatedInvitation; phone: string | null } | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      let phone: string | null = null;
      if (usePhone) {
        const parsed = normalizePhone(number, country);
        if (!parsed.ok) {
          setPhoneError(parsed.error === 'empty' ? 'Enter their mobile number, or switch this off' : 'Enter a valid mobile number');
          throw null;
        }
        phone = parsed.e164;
      }
      const rows = await rpc<CreatedInvitation[]>('create_invitation', {
        p_family_id: activeFamilyId,
        p_role: role,
        p_phone: phone,
        p_relationship_label: relationshipLabelSchema.parse(label) ?? null,
      });
      return { invitation: rows[0]!, phone };
    },
    onSuccess: async (res) => {
      setResult(res);
      await invalidateFamilyData();
    },
    onError: (e) => {
      if (e) setError(errorMessage(e));
    },
  });

  if (!can('members.invite')) {
    return (
      <Screen>
        <Banner tone="warning" title="Only admins can invite members in this family." message="Ask an admin to invite them, or to give your role the invite permission." />
      </Screen>
    );
  }

  if (result) {
    return (
      <Screen>
        <InvitationReady
          invitation={result.invitation}
          familyName={activeFamily.name}
          phone={result.phone}
          role={role}
          label={label.trim() || null}
          onDone={() => router.back()}
        />
      </Screen>
    );
  }

  // Adults first (most common); only admins may invite another admin.
  const roles: FamilyRole[] = (['adult', 'viewer', 'admin'] as const).filter((r) => isAssignableRole(r) && (r !== 'admin' || isAdmin));

  return (
    <Screen footer={<Button title="Create invitation" loading={create.isPending} onPress={() => { setError(null); create.mutate(); }} />}>
      <AppText tone="muted">Invite someone to {activeFamily.name}. They&apos;ll get their own login with their mobile number.</AppText>

      <TextField
        label="Who is this? (optional)"
        value={label}
        onChangeText={setLabel}
        placeholder="e.g. Maa, Rohan, Dadi"
        autoCapitalize="words"
        maxLength={30}
        hint="Shown to the family next to their name."
      />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">Invite by mobile number</AppText>
            <AppText variant="caption" tone="muted">
              Recommended. Only this number can use the invitation, and it appears in their app automatically.
            </AppText>
          </View>
          <Switch
            value={usePhone}
            onValueChange={(v) => {
              setUsePhone(v);
              setPhoneError(null);
            }}
            trackColor={{ true: colors.primary, false: colors.border }}
            accessibilityLabel="Invite by mobile number"
          />
        </View>
        {usePhone ? (
          <PhoneField
            label="Their mobile number"
            country={country}
            onCountryChange={setCountry}
            value={number}
            onChangeText={(v) => {
              setNumber(v);
              setPhoneError(null);
            }}
            error={phoneError}
          />
        ) : (
          <AppText variant="caption" tone="warning">
            Without a number, anyone who gets the code can join. Share it only with the person you mean to invite.
          </AppText>
        )}
      </Card>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" tone="muted">
          Role
        </AppText>
        <SegmentedControl
          label="Role"
          value={role}
          onChange={setRole}
          options={roles.map((r) => ({ value: r, label: ROLE_INFO[r].label }))}
        />
        <AppText variant="caption" tone="muted">
          {ROLE_INFO[role].summary}
          {role === 'admin' ? ' Admins can invite, remove and change everyone except the primary admin.' : ''}
        </AppText>
      </View>

      {error ? <Banner tone="danger" title={error} /> : null}
    </Screen>
  );
}
