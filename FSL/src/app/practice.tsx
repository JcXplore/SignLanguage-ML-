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

export default function PracticeScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(3);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const currentSign: ASLSign = ALL_ASL_SIGNS[currentIndex % ALL_ASL_SIGNS.length];

  // Pick 3 distractors for multiple choice quiz
  const options = React.useMemo(() => {
    const distractors = ALL_ASL_SIGNS.filter(
      (s) => s.id !== currentSign.id && s.category === currentSign.category
    ).slice(0, 3);
    const combined = [...distractors, currentSign];
    // Deterministic shuffle based on current sign id length
    return combined.sort(() => (currentSign.id.charCodeAt(0) % 2 === 0 ? 1 : -1));
  }, [currentSign]);

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
    setCurrentIndex((prev) => (prev + 1) % ALL_ASL_SIGNS.length);
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
            <Text style={styles.questionBannerText}>
              IDENTIFY THE SIGN • QUESTION {currentIndex + 1}
            </Text>
          </View>

          {/* Big Symbol / Sign Name Display */}
          <View
            style={[
              styles.signPromptBox,
              { backgroundColor: colors.backgroundSelected },
            ]}>
            <Text style={[styles.signPromptSymbol, { color: colors.primary }]}>
              {currentSign.symbol || currentSign.name}
            </Text>
            <Text style={[styles.signPromptCategory, { color: colors.textSecondary }]}>
              Category: {currentSign.category.toUpperCase()}
            </Text>
          </View>

          {/* Hint Expander */}
          <TouchableOpacity
            style={styles.hintToggle}
            onPress={() => setShowAnswer(!showAnswer)}>
            <Ionicons
              name={showAnswer ? 'eye-off-outline' : 'bulb-outline'}
              size={18}
              color={colors.warning}
            />
            <Text style={[styles.hintToggleText, { color: colors.textSecondary }]}>
              {showAnswer ? 'Hide description' : 'Show description hint'}
            </Text>
          </TouchableOpacity>

          {showAnswer && (
            <View
              style={[
                styles.answerBox,
                { backgroundColor: colors.backgroundElement },
              ]}>
              <Text style={[styles.answerText, { color: colors.text }]}>
                {currentSign.description}
              </Text>
              <Text
                style={[styles.movementText, { color: colors.textSecondary }]}>
                Movement: {currentSign.movement}
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
                  activeOpacity={0.8}>
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
              activeOpacity={0.8}>
              <Text style={styles.nextButtonText}>Next Sign</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Camera Practice Banner */}
        <TouchableOpacity
          style={[styles.liveCameraBanner, { backgroundColor: '#1E1B4B' }]}
          onPress={handleOpenLiveCamera}
          activeOpacity={0.8}>
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
    color: '#6366F1',
  },
  signPromptBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    borderRadius: 16,
    gap: 6,
  },
  signPromptSymbol: {
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 1,
  },
  signPromptCategory: {
    fontSize: 12,
    fontWeight: '600',
  },
  hintToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
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
