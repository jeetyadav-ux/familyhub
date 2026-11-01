import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { EncryptedStorage } from './encrypted-storage';
import { env, isConfigured } from './env';

// When configuration is missing the app shows a setup screen instead of calling this client.
const url = isConfigured ? env.supabaseUrl : 'https://not-configured.invalid';
const key = isConfigured ? env.supabaseAnonKey : 'not-configured-anon-key-placeholder';

export const supabase = createClient(url, key, {
  auth: {
    // Web (used only for development previews) falls back to localStorage.
    storage: Platform.OS === 'web' ? undefined : new EncryptedStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is in the foreground (Supabase recommendation for RN).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
