import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { SpeechService } from '@/services/speechService';

interface SentenceBuilderProps {
  sentence: string;
  onAppendText: (text: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  isDark: boolean;
  onTestSign?: (sign: string) => void;
}

export const SentenceBuilder: React.FC<SentenceBuilderProps> = ({
  sentence,
  onAppendText,
  onBackspace,
  onClear,
  isDark,
  onTestSign,
}) => {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [isSpeaking, setIsSpeaking] = React.useState(false);

  const handleSpeak = async () => {
    if (!sentence || sentence.trim().length === 0) {
      return;
    }
    setIsSpeaking(true);
    await SpeechService.speak(sentence, () => {
      setIsSpeaking(false);
    });
  };

  const handleCopy = () => {
    if (!sentence) return;
    Alert.alert('Copied', `"${sentence}" copied to clipboard.`);
  };

  const quickLetters = ['A', 'B', 'C', 'H', 'L', 'O', 'Y'];
  const quickWords = ['HELLO', 'HELP', 'THANK YOU', 'PLEASE'];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundElement,
          borderTopColor: colors.cardBorder,
        },
      ]}>
      {/* Quick Test Bar (Super helpful in emulator & development) */}
      <View style={styles.testBarRow}>
        <Text style={[styles.testBarLabel, { color: colors.textSecondary }]}>
          Test Signs:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.testChipsContainer}>
          {quickWords.map((word) => (
            <TouchableOpacity
              key={word}
              style={[styles.testChip, { backgroundColor: colors.backgroundSelected }]}
              onPress={() => onTestSign?.(word)}
              hitSlop={{ top: 10, bottom: 10 }}
              accessibilityRole="button"
              accessibilityLabel={`Test sign ${word}`}>
              <Text style={[styles.testChipText, { color: colors.text }]}>
                {word}
              </Text>
            </TouchableOpacity>
          ))}
          {quickLetters.map((char) => (
            <TouchableOpacity
              key={char}
              style={[styles.testChip, { backgroundColor: colors.backgroundSelected }]}
              onPress={() => onTestSign?.(char)}
              hitSlop={{ top: 10, bottom: 10 }}
              accessibilityRole="button"
              accessibilityLabel={`Test sign ${char}`}>
              <Text style={[styles.testChipText, { color: colors.text }]}>
                {char}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sentence Display Area */}
      <View
        style={[
          styles.textDisplayBox,
          {
            backgroundColor: colors.background,
            borderColor: colors.cardBorder,
          },
        ]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.textScrollContent}>
          {sentence.length > 0 ? (
            <Text style={[styles.sentenceText, { color: colors.text }]}>
              {sentence}
            </Text>
          ) : (
            <Text
              style={[
                styles.placeholderText,
                { color: colors.textSecondary },
              ]}>
              Recognized signs will form a sentence here...
            </Text>
          )}
        </ScrollView>
      </View>

      {/* Controls Bar */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[
            styles.speakButton,
            { backgroundColor: colors.primary },
            sentence.length === 0 && styles.disabledButton,
          ]}
          onPress={handleSpeak}
          disabled={sentence.length === 0}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Speak sentence">
          <Ionicons
            name={isSpeaking ? 'volume-high' : 'volume-medium'}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.speakButtonText}>
            {isSpeaking ? 'Speaking...' : 'Speak (Offline)'}
          </Text>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: colors.backgroundSelected },
            ]}
            onPress={() => onAppendText(' ')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add space">
            <Text style={[styles.iconBtnText, { color: colors.text }]}>␣ Space</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: colors.backgroundSelected },
              sentence.length === 0 && styles.disabledButton,
            ]}
            onPress={onBackspace}
            disabled={sentence.length === 0}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Backspace">
            <Ionicons name="backspace-outline" size={18} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: colors.backgroundSelected },
              sentence.length === 0 && styles.disabledButton,
            ]}
            onPress={onClear}
            disabled={sentence.length === 0}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Clear sentence">
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    gap: 8,
  },
  testBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  testChipsContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  testChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  testChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textDisplayBox: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  textScrollContent: {
    alignItems: 'center',
  },
  sentenceText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  placeholderText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 12,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  speakButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
