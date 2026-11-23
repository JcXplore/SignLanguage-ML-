import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Type } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';

/** Screen title, left-aligned, with optional content on the right. */
export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const { colors } = usePalette();
  return (
    <View style={styles.header}>
      <Text style={[Type.title, styles.title, { color: colors.text }]} accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    flexShrink: 1,
  },
});
