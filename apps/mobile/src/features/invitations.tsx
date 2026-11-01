import * as Clipboard from 'expo-clipboard';
import * as SMS from 'expo-sms';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  buildInviteLink,
  buildInviteMessage,
  formatPhone,
  type CreatedInvitation,
  type FamilyRole,
  type PendingInvitation,
} from '@familyhub/shared';
import { errorMessage, rpc } from '@/lib/data';
import { expiryLabel, roleWithArticle } from '@/lib/format';
import { invalidateFamilyData } from '@/lib/query';
import { useAuth } from '@/providers/AuthProvider';
import { useFamily } from '@/providers/FamilyProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText, Banner, Button, Card, IconTile, RoleBadge } from '@/ui/primitives';
import { radius, spacing } from '@/ui/theme';

/**
 * Shows a freshly issued invitation: code, QR and ways to send it.
 * The plain code only exists now; it is stored as a hash on the server.
 */
export function InvitationReady({
  invitation,
  familyName,
  phone,
  role,
  label,
  onDone,
}: {
  invitation: CreatedInvitation;
  familyName: string;
  phone: string | null;
  role: FamilyRole;
  label?: string | null;
  onDone: () => void;
}) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [smsAvailable, setSmsAvailable] = useState(false);
  const message = buildInviteMessage({
    familyName,
    inviterName: profile?.display_name ?? 'A family member',
    code: invitation.code,
    expiresAt: new Date(invitation.expires_at),
  });

  useEffect(() => {
    SMS.isAvailableAsync().then(setSmsAvailable).catch(() => setSmsAvailable(false));
  }, []);

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ alignItems: 'center', gap: spacing.lg }}>
        <AppText variant="overline" tone="muted">
          INVITATION CODE
        </AppText>
        <AppText variant="display" selectable accessibilityLabel={`Code ${invitation.code.split('').join(' ')}`} style={{ letterSpacing: 3 }}>
          {invitation.code}
        </AppText>
        <View style={{ padding: spacing.md, backgroundColor: '#FFFFFF', borderRadius: radius.md }} accessibilityLabel="QR code for this invitation">
          <QRCode value={buildInviteLink(invitation.code)} size={180} color="#1C1B22" backgroundColor="#FFFFFF" />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <RoleBadge role={role} />
          <AppText variant="caption" tone="muted">
            {label ? `${label} · ` : ''}
            {phone ? `${formatPhone(phone)} · ` : ''}
            {expiryLabel(invitation.expires_at)}
          </AppText>
        </View>
      </Card>

      {phone ? (
        <Banner
          tone="info"
          title="They can also join without the code"
          message={`When ${formatPhone(phone)} signs in to FamilyHub, this invitation appears in their app.`}
        />
      ) : null}

      <View style={{ gap: spacing.sm }}>
        {phone && smsAvailable ? (
          <Button
            title="Send by SMS"
            icon="chatbubble-ellipses-outline"
            onPress={() => SMS.sendSMSAsync([phone], message).catch(() => undefined)}
          />
        ) : null}
        <Button
          title="Share invitation"
          icon="share-outline"
          variant={phone && smsAvailable ? 'secondary' : 'primary'}
          onPress={() => Share.share({ message }).catch(() => undefined)}
        />
        <Button
          title={copied ? 'Code copied' : 'Copy code'}
          icon={copied ? 'checkmark' : 'copy-outline'}
          variant="secondary"
          onPress={async () => {
            await Clipboard.setStringAsync(invitation.code);
            setCopied(true);
          }}
        />
        <Button title="Done" variant="ghost" onPress={onDone} />
      </View>
      <AppText variant="caption" tone="subtle" style={{ textAlign: 'center', color: colors.textSubtle }}>
        The code works once. If it gets lost, resend from Pending invitations to get a new one.
      </AppText>
    </View>
  );
}

/** An invitation addressed to the signed-in user's phone number. */
export function PendingInviteCard({ invite, onJoined }: { invite: PendingInvitation; onJoined?: (familyId: string) => void }) {
  const qc = useQueryClient();
  const { setActiveFamily } = useFamily();
  const [error, setError] = useState<string | null>(null);

  const join = useMutation({
    mutationFn: () => rpc<{ ok: boolean; family_id: string }>('accept_invitation_by_id', { p_invitation_id: invite.invitation_id }),
    onSuccess: async (res) => {
      await invalidateFamilyData();
      await setActiveFamily(res.family_id).catch(() => undefined);
      onJoined?.(res.family_id);
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const decline = useMutation({
    mutationFn: () => rpc<void>('decline_invitation', { p_invitation_id: invite.invitation_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations_for_me'] }),
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        <IconTile icon="mail-unread-outline" tone="accent" />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong">{invite.family_name}</AppText>
          <AppText variant="caption" tone="muted">
            {invite.inviter_name} invited you as {roleWithArticle(invite.role)} · {expiryLabel(invite.expires_at)}
          </AppText>
        </View>
      </View>
      {error ? <AppText variant="caption" tone="danger">{error}</AppText> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button title="Join" compact style={{ flex: 1 }} loading={join.isPending} disabled={decline.isPending} onPress={() => join.mutate()} />
        <Button title="Decline" compact variant="secondary" style={{ flex: 1 }} loading={decline.isPending} disabled={join.isPending} onPress={() => decline.mutate()} />
      </View>
    </Card>
  );
}
