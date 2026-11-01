import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { palettes, type Palette } from '@/ui/theme';

export type ThemePreference = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'familyhub.theme';

interface ThemeContextValue {
  colors: Palette;
  scheme: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPreferenceState(v);
      })
      .catch(() => undefined);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
    return {
      colors: palettes[scheme],
      scheme,
      preference,
      setPreference: (p) => {
        setPreferenceState(p);
        AsyncStorage.setItem(STORAGE_KEY, p).catch(() => undefined);
      },
    };
  }, [preference, system]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const ctx = use(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
