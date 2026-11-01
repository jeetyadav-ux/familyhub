import type { FamilyRole } from '@familyhub/shared';

export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  role: Record<FamilyRole, { fg: string; bg: string }>;
}

const light: Palette = {
  background: '#F6F5F2',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEDE8',
  border: '#E3E0D9',
  text: '#1C1B22',
  textMuted: '#5E5C68',
  textSubtle: '#8D8A95',
  primary: '#2F5D50',
  primaryPressed: '#244A40',
  onPrimary: '#FFFFFF',
  primarySoft: '#E3EEE9',
  accent: '#D9822B',
  accentSoft: '#FBEBDA',
  success: '#2E7D4F',
  successSoft: '#E1F2E7',
  warning: '#A86411',
  warningSoft: '#FCEFD9',
  danger: '#B83B3B',
  dangerSoft: '#F9E3E3',
  overlay: 'rgba(20, 18, 26, 0.45)',
  role: {
    admin: { fg: '#2F5D50', bg: '#E3EEE9' },
    adult: { fg: '#3D4F8C', bg: '#E5E9F7' },
    child: { fg: '#A0522D', bg: '#FBEBDA' },
    viewer: { fg: '#5E5C68', bg: '#EFEDE8' },
  },
};

const dark: Palette = {
  background: '#121215',
  surface: '#1B1B20',
  surfaceAlt: '#24242B',
  border: '#2F2F37',
  text: '#F3F1EC',
  textMuted: '#B4B1BC',
  textSubtle: '#86838F',
  primary: '#7FC1A9',
  primaryPressed: '#6AAE96',
  onPrimary: '#0E1A16',
  primarySoft: '#1F3530',
  accent: '#F0A55A',
  accentSoft: '#3A2A1A',
  success: '#6FCF97',
  successSoft: '#1D3326',
  warning: '#F2B45E',
  warningSoft: '#3A2D17',
  danger: '#F08A8A',
  dangerSoft: '#3D2224',
  overlay: 'rgba(0, 0, 0, 0.6)',
  role: {
    admin: { fg: '#7FC1A9', bg: '#1F3530' },
    adult: { fg: '#A9B8F0', bg: '#232A45' },
    child: { fg: '#F0A55A', bg: '#3A2A1A' },
    viewer: { fg: '#B4B1BC', bg: '#2A2A31' },
  },
};

export const palettes = { light, dark };

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '500' as const },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: '400' as const },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.6 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Minimum touch target (iOS HIG 44pt, Material 48dp). */
export const HIT_SLOP = 44;
