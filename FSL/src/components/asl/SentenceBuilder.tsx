import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Type, FontFamily } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { SpeechService } from '@/services/speechService';

interface SentenceBuilderProps {
  sentence: string;
  onAppendText: (text: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  /** Developer-only shortcut to feed signs without a camera. */
  onTestSign?: (sign: string) => void;
}

const TEST_SIGNS = ['HELLO', 'HELP', 'THANK YOU', 'PLEASE', 'A', 'B', 'C', 'L', 'O', 'Y'];

export const SentenceBuilder: React.FC<SentenceBuilderProps> = ({
  sentence,
  onAppendText,
  onBackspace,
  onClear,
  onTestSign,
}) => {
  const { colors } = usePalette();
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const isEmpty = sentence.trim().length === 0;

  const handleSpeak = async () => {
    if (isSpeaking) {
      await SpeechService.stop();
      setIsSpeaking(false);
      return;
    }
    if (isEmpty) return;
    setIsSpeaking(true);
    await SpeechService.speak(sentence, () => setIsSpeaking(false));
  };

  const secondaryBtn = [styles.squareBtn, { backgroundColor: colors.backgroundSelected }];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.backgroundElement, borderTopColor: colors.cardBorder },
      ]}>
      {__DEV__ && onTestSign && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.testRow}>
          <Text style={[Type.meta, { color: colors.textSecondary }]}>Dev test:</Text>
          {TEST_SIGNS.map((sign) => (
            <TouchableOpacity
              key={sign}
              style={[styles.testChip, { borderColor: colors.cardBorder }]}
              onPress={() => onTestSign(sign)}
              hitSlop={{ top: 8, bottom: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Test sign ${sign}`}>
              <Text style={[Type.meta, { color: colors.text }]}>{sign}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* The sentence so far. The yellow bar marks it as the live text. */}
      <View
        style={[styles.sentenceBox, { backgroundColor: colors.background }]}
        testID="sentence"
        accessibilityLiveRegion="polite">
        <View style={[styles.liveBar, { backgroundColor: colors.highlight }]} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sentenceScroll}>
          {isEmpty ? (
            <Text style={[Type.body, { color: colors.textSecondary }]}>
              Signs you make appear here as text
            </Text>
          ) : (
            <Text style={[styles.sentenceText, { color: colors.text }]}>{sentence}</Text>
          )}
        </ScrollView>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.speakBtn,
            { backgroundColor: colors.primarySolid },
            isEmpty && !isSpeaking && styles.disabled,
          ]}
          onPress={handleSpeak}
          disabled={isEmpty && !isSpeaking}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ disabled: isEmpty && !isSpeaking }}>
          <Ionicons name={isSpeaking ? 'stop' : 'volume-high'} size={20} color="#FFFFFF" />
          <Text style={styles.speakText}>{isSpeaking ? 'Stop' : 'Speak'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[secondaryBtn, styles.spaceBtn]}
          onPress={() => onAppendText(' ')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add space">
          <Text style={[Type.smallStrong, { color: colors.text }]}>Space</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[secondaryBtn, isEmpty && styles.disabled]}
          onPress={onBackspace}
          disabled={isEmpty}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Delete last letter">
          <Ionicons name="backspace-outline" size={20} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[secondaryBtn, isEmpty && styles.disabled]}
          onPress={onClear}
          disabled={isEmpty}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Clear sentence">
          <Ionicons name="trash-outline" size={20} color={colors.dangerText} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  testRow: {
    alignItems: 'center',
    gap: 6,
  },
  testChip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sentenceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: Radius.control,
    overflow: 'hidden',
  },
  liveBar: {
    width: 5,
    alignSelf: 'stretch',
  },
  sentenceScroll: {
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  sentenceText: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speakBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: Radius.control,
  },
  speakText: {
    ...Type.bodyStrong,
    color: '#FFFFFF',
  },
  squareBtn: {
    height: 48,
    minWidth: 48,
    borderRadius: Radius.control,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spaceBtn: {
    paddingHorizontal: 16,
  },
  disabled: {
    opacity: 0.45,
  },
});
