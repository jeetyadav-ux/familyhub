import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { EncryptedStorage } from '@/lib/encrypted-storage';

const mockKeychain = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'afterFirstUnlockThisDeviceOnly',
  getItemAsync: jest.fn(async (k: string) => mockKeychain.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    if (!/^[\w.-]+$/.test(k)) throw new Error(`invalid SecureStore key ${k}`);
    mockKeychain.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockKeychain.delete(k);
  }),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytes: (n: number) => new Uint8Array(require('crypto').randomBytes(n)),
}));

const SESSION = JSON.stringify({ access_token: 'eyJhbGciOi.secret.token', refresh_token: 'refresh-123', user: { id: 'u1' } });
const KEY = 'sb-abcd-auth-token';

beforeEach(async () => {
  mockKeychain.clear();
  await AsyncStorage.clear();
});

describe('EncryptedStorage', () => {
  it('round-trips a session', async () => {
    const store = new EncryptedStorage();
    await store.setItem(KEY, SESSION);
    await expect(store.getItem(KEY)).resolves.toBe(SESSION);
  });

  it('never writes the session in plain text to AsyncStorage', async () => {
    const store = new EncryptedStorage();
    await store.setItem(KEY, SESSION);
    const raw = await AsyncStorage.getItem(KEY);
    expect(raw).toMatch(/^[0-9a-f]+$/);
    expect(raw).not.toContain('refresh-123');
    expect(mockKeychain.size).toBe(1);
    expect([...mockKeychain.values()][0]).toMatch(/^[0-9a-f]{64}$/); // 256-bit key
  });

  it('uses a fresh key on every write', async () => {
    const store = new EncryptedStorage();
    await store.setItem(KEY, SESSION);
    const first = [...mockKeychain.values()][0];
    await store.setItem(KEY, SESSION);
    expect([...mockKeychain.values()][0]).not.toBe(first);
  });

  it('treats a missing key as signed out and cleans up', async () => {
    const store = new EncryptedStorage();
    await store.setItem(KEY, SESSION);
    mockKeychain.clear();
    await expect(store.getItem(KEY)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
  });

  it('removes both halves', async () => {
    const store = new EncryptedStorage();
    await store.setItem(KEY, SESSION);
    await store.removeItem(KEY);
    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
    expect(mockKeychain.size).toBe(0);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
  });

  it('returns null when nothing is stored', async () => {
    await expect(new EncryptedStorage().getItem('nothing')).resolves.toBeNull();
  });
});
