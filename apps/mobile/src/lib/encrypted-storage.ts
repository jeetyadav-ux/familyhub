import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Session storage for Supabase Auth on iOS/Android.
 * The OS keystore (SecureStore) has a small size limit, so each value is encrypted with
 * a fresh random AES-256 key: the key goes into the keystore, the ciphertext into AsyncStorage.
 * Reading the ciphertext alone (backup, rooted device file dump) reveals nothing.
 */
export class EncryptedStorage {
  private static keyName(key: string): string {
    // SecureStore keys may only contain alphanumerics, '.', '-' and '_'.
    return `fh_k_${key.replace(/[^A-Za-z0-9._-]/g, '_')}`;
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    const hexKey = await SecureStore.getItemAsync(EncryptedStorage.keyName(key));
    if (!hexKey) {
      // Key lost (e.g. app reinstalled with restored AsyncStorage): treat as signed out.
      await AsyncStorage.removeItem(key);
      return null;
    }
    try {
      const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(hexKey), new aesjs.Counter(1));
      return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(encrypted)));
    } catch {
      await this.removeItem(key);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const encryptionKey = Crypto.getRandomBytes(32);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(EncryptedStorage.keyName(key), aesjs.utils.hex.fromBytes(encryptionKey), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    await AsyncStorage.setItem(key, aesjs.utils.hex.fromBytes(encrypted));
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(EncryptedStorage.keyName(key));
  }
}
