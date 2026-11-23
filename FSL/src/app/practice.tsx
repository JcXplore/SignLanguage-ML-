import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { ALL_ASL_SIGNS, ASLSign } from '@/data/aslDictionary';
import { SpeechService } from '@/services/speechService';
import { router } from 'expo-router';
import { SignVisual } from '@/components/asl/SignVisual';

const CATEGORY_LABELS: Record<ASLSign['category'], string> = {
  alphabet: 'Letter',
  numbers: 'Number',
  common: 'Word',
  emergency: 'Emergency word',
};

/** Fisher–Yates shuffle; returns a new array. */
function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Blanks out the answer where a written description names it
 * (e.g. "a C shape", "L-shape"), so the text doesn't give the answer away.
 * Single letters/digits match only as capitals, so the article "a" survives.
 */
function maskAnswer(text: string, sign: ASLSign): string {
  const name = sign.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flags = sign.name.length === 1 ? 'g' : 'gi';
  return text.replace(new RegExp(`\\b${name}\\b`, flags), '___');
}

interface Question {
  sign: ASLSign;
  options: ASLSign[];
}

/** The answer plus three random wrong answers from the same category, in random order. */
function makeQuestion(sign: ASLSign): Question {
  const distractors = shuffle(
    ALL_ASL_SIGNS.filter((s) => s.id !== sign.id && s.category === sign.category)
  ).slice(0, 3);
  return { sign, options: shuffle([...distractors, sign]) };
}

export default function PracticeScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [deck, setDeck] = useState<ASLSign[]>(() => shuffle(ALL_ASL_SIGNS));
  const [position, setPosition] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(deck[0]));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const currentSign = question.sign;
  const options = question.options;

  const handleSelectOption = (option: ASLSign) => {
    setSelectedOption(option.id);
    if (option.id === currentSign.id) {
      setScore((prev) => prev + 10);
      setStreak((prev) => prev + 1);
      SpeechService.triggerSuccessHaptic();
      SpeechService.speak(`Correct! That is ${currentSign.name}`);
    } else {
      setStreak(0);
      SpeechService.triggerRecognitionHaptic();
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setShowAnswer(false);
    let nextDeck = deck;
    let nextPosition = position + 1;
    if (nextPosition >= deck.length) {
      // Went through every sign: start a fresh shuffled round.
      nextDeck = shuffle(ALL_ASL_SIGNS);
      nextPosition = 0;
      setDeck(nextDeck);
    }
    setPosition(nextPosition);
    setQuestionNumber((n) => n + 1);
    setQuestion(makeQuestion(nextDeck[nextPosition]));
  };

  const handleOpenLiveCamera = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            ASL Practice & Quiz
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Master fingerspelling & signs with interactive drills
          </Text>
        </View>

        {/* Streak & Score Badges */}
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="flame" size={16} color="#D97706" />
            <Text style={[styles.statText, { color: '#B45309' }]}>
              {streak} Streak
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="star" size={16} color="#4F46E5" />
            <Text style={[styles.statText, { color: '#4338CA' }]}>
              {score} pts
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Flashcard Challenge */}
        <View
          style={[
            styles.challengeCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}>
          <View style={styles.questionBanner}>
            <Text style={[styles.questionBannerText, { color: colors.primaryText }]}>
              WHICH {CATEGORY_LABELS[currentSign.category].toUpperCase()} IS THIS? • QUESTION{' '}
              {questionNumber}
            </Text>
          </View>

          {/* The sign to identify: picture first, written handshape as backup.
              The answer itself is never shown here. */}
          <View
            style={[
              styles.signPromptBox,
              { backgroundColor: colors.backgroundSelected },
            ]}>
            <SignVisual sign={currentSign} size={140} isDark={isDark} showCaption />
            <Text style={[styles.signPromptHandshape, { color: colors.text }]}>
              {maskAnswer(currentSign.handshape, currentSign)}
            </Text>
            <Text style={[styles.signPromptDescription, { color: colors.textSecondary }]}>
              {maskAnswer(currentSign.description, currentSign)}
            </Text>
          </View>

          {/* Hint Expander */}
          <TouchableOpacity
            style={styles.hintToggle}
            onPress={() => setShowAnswer(!showAnswer)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showAnswer }}>
            <Ionicons
              name={showAnswer ? 'eye-off-outline' : 'bulb-outline'}
              size={18}
              color={colors.warningText}
            />
            <Text style={[styles.hintToggleText, { color: colors.textSecondary }]}>
              {showAnswer ? 'Hide hint' : 'Show hint'}
            </Text>
          </TouchableOpacity>

          {showAnswer && (
            <View
              style={[
                styles.answerBox,
                { backgroundColor: colors.backgroundElement },
              ]}>
              <Text style={[styles.answerText, { color: colors.text }]}>
                Movement: {maskAnswer(currentSign.movement, currentSign)}
              </Text>
              <Text
                style={[styles.movementText, { color: colors.textSecondary }]}>
                Tip: {maskAnswer(currentSign.tips, currentSign)}
              </Text>
            </View>
          )}

          {/* Multiple Choice Options */}
          <View style={styles.optionsGrid}>
            {options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              const isCorrect = opt.id === currentSign.id;
              let optionBg: string = colors.backgroundElement;
              let borderColor: string = colors.cardBorder;
              let textColor: string = colors.text;

              if (selectedOption) {
                if (isCorrect) {
                  optionBg = '#D1FAE5';
                  borderColor = '#10B981';
                  textColor = '#065F46';
                } else if (isSelected) {
                  optionBg = '#FEE2E2';
                  borderColor = '#EF4444';
                  textColor = '#991B1B';
                }
              }

              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.optionBtn,
                    {
                      backgroundColor: optionBg,
                      borderColor: borderColor,
                    },
                  ]}
                  onPress={() => handleSelectOption(opt)}
                  disabled={selectedOption !== null}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    selectedOption && isCorrect
                      ? `${opt.name}, correct answer`
                      : selectedOption && isSelected
                        ? `${opt.name}, your answer, wrong`
                        : opt.name
                  }
                  accessibilityState={{ disabled: selectedOption !== null, selected: isSelected }}>
                  <Text style={[styles.optionBtnText, { color: textColor }]}>
                    {opt.name}
                  </Text>
                  {selectedOption && isCorrect && (
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  )}
                  {selectedOption && isSelected && !isCorrect && (
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Row */}
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.primary }]}
              onPress={handleNext}
              activeOpacity={0.8}
              accessibilityRole="button">
              <Text style={styles.nextButtonText}>Next Sign</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Camera Practice Banner */}
        <TouchableOpacity
          style={[styles.liveCameraBanner, { backgroundColor: '#1E1B4B' }]}
          onPress={handleOpenLiveCamera}
          activeOpacity={0.8}
          accessibilityRole="button">
          <View style={styles.cameraBannerContent}>
            <Ionicons name="camera-reverse" size={28} color="#A5B4FC" />
            <View style={{ flex: 1 }}>
              <Text style={styles.cameraBannerTitle}>
                Practice Live in Front of Camera
              </Text>
              <Text style={styles.cameraBannerDesc}>
                Open the on-device AI camera to test your signs in real time.
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 16,
    paddingBottom: 30,
  },
  challengeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  questionBanner: {
    alignSelf: 'flex-start',
  },
  questionBannerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  signPromptBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
  },
  signPromptHandshape: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  signPromptDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  hintToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  hintToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  answerBox: {
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  answerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  movementText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  optionsGrid: {
    gap: 10,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  optionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardActionsRow: {
    marginTop: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  liveCameraBanner: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#3730A3',
  },
  cameraBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cameraBannerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cameraBannerDesc: {
    color: '#C7D2FE',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
