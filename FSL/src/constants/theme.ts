import '@/global.css';

import { Platform } from 'react-native';

/**
 * SignBridge palette. Colors come from the Philippine flag and each one has a job:
 * - highlight (sun yellow): the thing that is active right now — the live caption,
 *   the selected tab, the selected mode. Never decoration.
 * - primary (deep blue): actions.
 * - danger (flag red): emergency only.
 * *Text variants are safe for small text (>= 4.5:1 on background, card and their
 * own 12% tint). *Solid variants carry white text (>= 4.5:1).
 */
export const Colors = {
  light: {
    text: '#121A2E',
    textSecondary: '#4D576C',
    background: '#F2F4F7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E4E8EF',
    primary: '#1F3A93',
    primaryLight: '#E6EBF8',
    accent: '#F6C400',
    card: '#FFFFFF',
    cardBorder: '#D9DEE7',
    success: '#1E7B4F',
    warning: '#B26A00',
    danger: '#C8102E',
    primaryText: '#1F3A93',
    successText: '#17663F',
    warningText: '#8A4B00',
    dangerText: '#A60D26',
    primarySolid: '#1F3A93',
    successSolid: '#17663F',
    warningSolid: '#8A4B00',
    dangerSolid: '#C8102E',
    highlight: '#F6C400',
    onHighlight: '#121A2E',
    successTint: '#E3F3EA',
    dangerTint: '#FBE7EA',
    tint: '#1F3A93',
    tabIconDefault: '#5B6478',
    tabIconSelected: '#121A2E',
  },
  dark: {
    text: '#F2F4F7',
    textSecondary: '#A9B2C5',
    background: '#0D1322',
    backgroundElement: '#161E31',
    backgroundSelected: '#222C44',
    primary: '#9DB2F5',
    primaryLight: '#1C2748',
    accent: '#F6C400',
    card: '#161E31',
    cardBorder: '#28324C',
    success: '#4CC38A',
    warning: '#F0B44C',
    danger: '#FF6B7F',
    primaryText: '#A9BCF6',
    successText: '#6FD6A3',
    warningText: '#F5C26B',
    dangerText: '#FF8A99',
    primarySolid: '#2D4FB8',
    successSolid: '#17663F',
    warningSolid: '#8A4B00',
    dangerSolid: '#C8102E',
    highlight: '#F6C400',
    onHighlight: '#121A2E',
    successTint: '#143326',
    dangerTint: '#3A1620',
    tint: '#9DB2F5',
    tabIconDefault: '#A9B2C5',
    tabIconSelected: '#121A2E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Palette = (typeof Colors)['light'] | (typeof Colors)['dark'];

/**
 * Type scale (system font). Large and heavy at the top because the live caption
 * has to be read across a table; body never below 15.
 */
export const Type = {
  caption: { fontSize: 36, lineHeight: 42, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.4 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  smallStrong: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  meta: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
} as const;

export const Radius = {
  control: 12,
  card: 18,
  pill: 999,
} as const;

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

export const MaxContentWidth = 800;
