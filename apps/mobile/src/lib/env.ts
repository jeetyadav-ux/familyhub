/**
 * Public configuration baked into the app at build time (EXPO_PUBLIC_*).
 * These are not secrets: the anon key only works within Row Level Security.
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
};

export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!/^https?:\/\/.+/.test(env.supabaseUrl)) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (env.supabaseAnonKey.length < 20) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  return missing;
}

export const isConfigured = missingConfig().length === 0;
