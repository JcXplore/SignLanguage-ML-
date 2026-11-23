import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Type } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import type { ASLSign } from '@/data/aslDictionary';

interface SignVisualProps {
  sign: ASLSign;
  size: number;
  /** Show "No picture yet" under the placeholder icon. */
  showCaption?: boolean;
}

/**
 * The picture of a sign. Until an image is added to the dictionary entry it shows
 * a neutral placeholder rather than an invented handshape drawing.
 */
export const SignVisual: React.FC<SignVisualProps> = ({ sign, size, showCaption = false }) => {
  const { colors } = usePalette();

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
        { width: size, height: size, backgroundColor: colors.backgroundSelected },
      ]}
      accessible
      accessibilityLabel={`No picture yet for ${sign.name}`}>
      <Ionicons
        name="hand-left-outline"
        size={Math.round(size * 0.38)}
        color={colors.textSecondary}
      />
      {showCaption && (
        <Text style={[Type.meta, { color: colors.textSecondary }]}>No picture yet</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    borderRadius: Radius.control,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
});
