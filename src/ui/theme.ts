import { useColorScheme } from 'react-native';

/**
 * A calm "paper and ink" palette. Deliberately avoids the pinks and reds most
 * period trackers use, so the app looks like an ordinary notes app.
 */
export interface Colors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  focus: string;
  focusSoft: string;
  danger: string;
  warningSoft: string;
}

const light: Colors = {
  background: '#F6F4EF',
  surface: '#FFFFFF',
  surfaceAlt: '#EFECE5',
  border: '#DEDAD1',
  text: '#26272B',
  muted: '#6E6B66',
  accent: '#2F6B70',
  accentSoft: '#D9E8E8',
  onAccent: '#FFFFFF',
  focus: '#B7862C',
  focusSoft: '#F3E6C9',
  danger: '#A8412F',
  warningSoft: '#F6E3DC',
};

const dark: Colors = {
  background: '#141517',
  surface: '#1E2023',
  surfaceAlt: '#272A2E',
  border: '#34383D',
  text: '#ECEAE6',
  muted: '#A19D97',
  accent: '#6FB3B8',
  accentSoft: '#233C3F',
  onAccent: '#0E1A1B',
  focus: '#D9AE5B',
  focusSoft: '#3A301D',
  danger: '#E08A77',
  warningSoft: '#3B2621',
};

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
