import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Current color scheme and its palette. */
export function usePalette() {
  const isDark = useColorScheme() === 'dark';
  return { isDark, colors: Colors[isDark ? 'dark' : 'light'] };
}
