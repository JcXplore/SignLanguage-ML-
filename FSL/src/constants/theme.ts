import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    textSecondary: '#64748B',
    background: '#F8FAFC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E2E8F0',
    primary: '#4F46E5', // Indigo 600
    primaryLight: '#EEF2FF',
    accent: '#06B6D4', // Cyan 500
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    // Text-safe variants: >= 4.5:1 on card backgrounds and on their own 12% tint
    primaryText: '#4338CA',
    successText: '#047857',
    warningText: '#92400E',
    dangerText: '#B91C1C',
    // Solid fills that carry white text (>= 4.5:1 with #FFFFFF)
    primarySolid: '#4F46E5',
    successSolid: '#047857',
    warningSolid: '#B45309',
    dangerSolid: '#B91C1C',
    tint: '#4F46E5',
    tabIconDefault: '#64748B',
    tabIconSelected: '#4F46E5',
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    background: '#0B0F19', // Deep sleek dark
    backgroundElement: '#151C2C',
    backgroundSelected: '#1E293B',
    primary: '#6366F1', // Indigo 500
    primaryLight: '#1E1B4B',
    accent: '#22D3EE', // Cyan 400
    card: '#151C2C',
    cardBorder: '#1E293B',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    primaryText: '#A5B4FC',
    successText: '#34D399',
    warningText: '#FBBF24',
    dangerText: '#F87171',
    primarySolid: '#4F46E5',
    successSolid: '#047857',
    warningSolid: '#B45309',
    dangerSolid: '#B91C1C',
    tint: '#6366F1',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#818CF8',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 60, android: 75 }) ?? 75;
export const MaxContentWidth = 800;
