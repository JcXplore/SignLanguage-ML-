import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Radius, Type, FontFamily } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { ALL_ASL_SIGNS, ASLSign } from '@/data/aslDictionary';
import { SpeechService } from '@/services/speechService';
import { SignVisual } from '@/components/asl/SignVisual';
import { ScreenHeader } from '@/components/ScreenHeader';

const QUESTION_BY_CATEGORY: Record<ASLSign['category'], string> = {
  alphabet: 'Which letter is this?',
  numbers: 'Which number is this?',
  common: 'Which word is this?',
  emergency: 'Which word is this?',
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
  const { colors } = usePalette();

  const [deck, setDeck] = useState<ASLSign[]>(() => shuffle(ALL_ASL_SIGNS));
  const [position, setPosition] = useState(0);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(deck[0]));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  const sign = question.sign;
  const answered = picked !== null;
  const gotIt = picked === sign.id;

  const handlePick = (option: ASLSign) => {
    if (answered) return;
    setPicked(option.id);
    if (option.id === sign.id) {
      setScore((n) => n + 10);
      setStreak((n) => n + 1);
      SpeechService.triggerSuccessHaptic();
    } else {
      setStreak(0);
      SpeechService.triggerRecognitionHaptic();
    }
  };

  const handleNext = () => {
    setPicked(null);
    setShowHint(false);
    let nextDeck = deck;
    let next = position + 1;
    if (next >= deck.length) {
      // Went through every sign: start a fresh shuffled round.
      nextDeck = shuffle(ALL_ASL_SIGNS);
      next = 0;
      setDeck(nextDeck);
    }
    setPosition(next);
    setQuestion(makeQuestion(nextDeck[next]));
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Practice"
        right={
          <View style={styles.stats} accessible accessibilityLabel={`${streak} in a row, ${score} points`}>
            <View style={styles.stat}>
              <Ionicons name="flame" size={18} color={colors.warningText} />
              <Text style={[Type.smallStrong, { color: colors.text }]}>{streak}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="star" size={18} color={colors.primaryText} />
              <Text style={[Type.smallStrong, { color: colors.text }]}>{score}</Text>
            </View>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.questionRow}>
          <Text style={[Type.heading, styles.flex, { color: colors.text }]} accessibilityRole="header">
            {QUESTION_BY_CATEGORY[sign.category]}
          </Text>
          <Text style={[Type.meta, { color: colors.textSecondary }]}>
            {position + 1} of {deck.length}
          </Text>
        </View>

        {/* The sign to identify: picture first, written handshape as backup.
            The answer itself is never shown here. */}
        <View style={[styles.prompt, { backgroundColor: colors.backgroundElement }]}>
          <SignVisual sign={sign} size={132} showCaption />
          <Text style={[Type.bodyStrong, styles.centerText, { color: colors.text }]}>
            {maskAnswer(sign.handshape, sign)}
          </Text>
          <Text style={[Type.small, styles.centerText, { color: colors.textSecondary }]}>
            {maskAnswer(sign.description, sign)}
          </Text>
          {showHint ? (
            <View style={[styles.hint, { backgroundColor: colors.primaryLight }]}>
              <Text style={[Type.small, { color: colors.text }]}>
                {maskAnswer(sign.movement, sign)} {maskAnswer(sign.tips, sign)}
              </Text>
            </View>
          ) : (
            !answered && (
              <TouchableOpacity
                style={styles.hintBtn}
                onPress={() => setShowHint(true)}
                accessibilityRole="button">
                <Ionicons name="bulb-outline" size={18} color={colors.primaryText} />
                <Text style={[Type.smallStrong, { color: colors.primaryText }]}>Show a hint</Text>
              </TouchableOpacity>
            )
          )}
        </View>

        <View style={styles.options}>
          {question.options.map((opt) => {
            const isAnswer = opt.id === sign.id;
            const isPicked = opt.id === picked;
            let bg: string = colors.backgroundElement;
            let border: string = colors.cardBorder;
            let icon: React.ComponentProps<typeof Ionicons>['name'] | null = null;
            let iconColor: string = colors.text;
            if (answered && isAnswer) {
              bg = colors.successTint;
              border = colors.successText;
              icon = 'checkmark-circle';
              iconColor = colors.successText;
            } else if (answered && isPicked) {
              bg = colors.dangerTint;
              border = colors.dangerText;
              icon = 'close-circle';
              iconColor = colors.dangerText;
            }
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.option, { backgroundColor: bg, borderColor: border }, answered && !isAnswer && !isPicked && styles.dimmed]}
                onPress={() => handlePick(opt)}
                disabled={answered}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={
                  answered && isAnswer
                    ? `${opt.name}, correct answer`
                    : answered && isPicked
                      ? `${opt.name}, your answer, wrong`
                      : opt.name
                }
                accessibilityState={{ disabled: answered, selected: isPicked }}>
                <Text style={[styles.optionText, { color: colors.text }]} numberOfLines={2}>
                  {opt.name}
                </Text>
                {icon && <Ionicons name={icon} size={20} color={iconColor} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {answered && (
          <Text
            style={[Type.bodyStrong, { color: gotIt ? colors.successText : colors.dangerText }]}
            accessibilityLiveRegion="polite">
            {gotIt ? `Correct. That's ${sign.name}.` : `Not quite. That's ${sign.name}.`}
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.nextBtn,
            answered
              ? { backgroundColor: colors.primarySolid }
              : { backgroundColor: colors.backgroundSelected },
          ]}
          onPress={handleNext}
          activeOpacity={0.85}
          accessibilityRole="button">
          <Text style={[Type.bodyStrong, { color: answered ? '#FFFFFF' : colors.text }]}>
            {answered ? 'Next sign' : 'Skip'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cameraLink}
          onPress={() => router.navigate('/')}
          accessibilityRole="link">
          <Ionicons name="hand-left-outline" size={20} color={colors.primaryText} />
          <Text style={[Type.smallStrong, { color: colors.primaryText }]}>
            Try signing it with the camera
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerText: { textAlign: 'center' },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 32,
    gap: 16,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  prompt: {
    alignItems: 'center',
    borderRadius: Radius.card,
    padding: 20,
    gap: 8,
  },
  hintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  hint: {
    alignSelf: 'stretch',
    padding: 12,
    borderRadius: Radius.control,
    marginTop: 4,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 60,
    paddingHorizontal: 16,
    borderRadius: Radius.control,
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: FontFamily.bold,
    flexShrink: 1,
  },
  dimmed: {
    opacity: 0.55,
  },
  nextBtn: {
    height: 52,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
  },
});
