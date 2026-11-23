import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { ASLSign } from '@/data/aslDictionary';

interface SignVisualProps {
  sign: ASLSign;
  size: number;
  isDark: boolean;
  /** Show the "No picture yet" caption under the placeholder icon. */
  showCaption?: boolean;
}

/**
 * The picture of a sign. Until an image is added to the dictionary entry,
 * shows a neutral placeholder instead of inventing a handshape drawing.
 */
export const SignVisual: React.FC<SignVisualProps> = ({
  sign,
  size,
  isDark,
  showCaption = false,
}) => {
  const colors = Colors[isDark ? 'dark' : 'light'];

  if (sign.image) {
    return (
      <Image
        source={sign.image}
        style={[styles.frame, { width: size, height: size }]}
        contentFit="contain"
        accessibilityLabel={`Hand sign for ${sign.name}`}
      />
    );
  }

  return (
    <View
      style={[
        styles.frame,
        styles.placeholder,
        {
          width: size,
          height: size,
          backgroundColor: colors.backgroundSelected,
          borderColor: colors.cardBorder,
        },
      ]}
      accessible
      accessibilityLabel={`No picture yet for ${sign.name}`}>
      <Ionicons
        name="hand-left-outline"
        size={Math.round(size * 0.4)}
        color={colors.textSecondary}
      />
      {showCaption && (
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          No picture yet
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    borderRadius: 12,
  },
  placeholder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
  },
});
