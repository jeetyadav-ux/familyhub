import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { extractInviteCode } from '@familyhub/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText, Banner, Button, LoadingState, Screen } from '@/ui/primitives';
import { radius, spacing } from '@/ui/theme';

export default function ScanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [notInvite, setNotInvite] = useState(false);
  const handled = useRef(false);

  if (!permission) return <LoadingState label="Opening camera…" />;

  if (!permission.granted) {
    return (
      <Screen>
        <AppText variant="heading">Camera access needed</AppText>
        <AppText tone="muted">
          FamilyHub uses the camera only to read the invitation QR code. Nothing is recorded or uploaded.
        </AppText>
        {permission.canAskAgain ? (
          <Button title="Allow camera" icon="camera-outline" onPress={requestPermission} />
        ) : (
          <Button title="Open settings" icon="settings-outline" onPress={() => Linking.openSettings()} />
        )}
        <Button title="Enter code instead" variant="ghost" onPress={() => router.replace('/join')} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (handled.current) return;
          const code = extractInviteCode(data);
          if (!code) {
            setNotInvite(true);
            return;
          }
          handled.current = true;
          router.replace({ pathname: '/join', params: { code } });
        }}
      />
      <View pointerEvents="none" style={{ position: 'absolute', top: '25%', alignSelf: 'center', width: 240, height: 240, borderRadius: radius.xl, borderWidth: 3, borderColor: '#FFFFFF' }} />
      <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.xxxl, gap: spacing.md }}>
        {notInvite ? <Banner tone="warning" title="That QR code isn't a FamilyHub invitation." /> : null}
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }}>
          <AppText style={{ textAlign: 'center' }}>Point the camera at the invitation QR code.</AppText>
        </View>
        <Button title="Enter code instead" variant="secondary" onPress={() => router.replace('/join')} />
      </View>
    </View>
  );
}
