import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeInviteCode } from '@familyhub/shared';

/**
 * Remembers an invite code opened from a link or QR before the user signed in,
 * so it can be offered right after sign-in. Cleared once used.
 */
const KEY = 'familyhub.pendingInviteCode';

export async function savePendingInviteCode(code: string): Promise<void> {
  const normalized = normalizeInviteCode(code);
  if (normalized) await AsyncStorage.setItem(KEY, normalized);
}

export async function readPendingInviteCode(): Promise<string | null> {
  return normalizeInviteCode(await AsyncStorage.getItem(KEY));
}

export async function clearPendingInviteCode(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
