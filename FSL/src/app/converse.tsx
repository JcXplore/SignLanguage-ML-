import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { SpeechService } from '@/services/speechService';
import { ASL_ALPHABET, ASL_COMMON_WORDS } from '@/data/aslDictionary';
import { SignVisual } from '@/components/asl/SignVisual';

export default function ConverseScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [inputMessage, setInputMessage] = useState('');
  const [activeMessage, setActiveMessage] = useState(
    'HELLO NICE TO MEET YOU'
  );

  const quickDeafResponses = [
    { text: 'Yes, I understand', sign: 'YES' },
    { text: 'No', sign: 'NO' },
    { text: 'Thank you very much', sign: 'THANK YOU' },
    { text: 'Please wait a moment', sign: 'PLEASE' },
    { text: 'Can you type or write it down?', sign: 'HELP' },
    { text: 'I need medical help', sign: 'DOCTOR' },
  ];

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    setActiveMessage(inputMessage.trim().toUpperCase());
    setInputMessage('');
  };

  const handleQuickResponse = async (text: string) => {
    SpeechService.triggerSuccessHaptic();
    await SpeechService.speak(text);
    setActiveMessage(text.toUpperCase());
  };

  // Convert active message characters into fingerspelling tokens
  const letters = activeMessage.split('').filter((c) => c !== ' ');

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            2-Way Communicator
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Conversations between deaf & hearing companions
          </Text>
        </View>

        <View style={styles.statusChip}>
          <Ionicons name="people" size={14} color={colors.successText} />
          <Text style={[styles.statusChipText, { color: colors.successText }]}>
            Face-to-Face
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Jumbo High-Contrast Display for Deaf Reader */}
        <View
          style={[
            styles.jumboCard,
            {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: colors.primary,
            },
          ]}>
          <View style={styles.jumboHeader}>
            <Text style={[styles.jumboLabel, { color: colors.primary }]}>
              Companion Message (High Visibility)
            </Text>
            <TouchableOpacity
              onPress={() => SpeechService.speak(activeMessage)}
              style={styles.speakPill}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Read message aloud">
              <Ionicons name="volume-medium" size={16} color="#FFFFFF" />
              <Text style={styles.speakPillText}>Voice Out</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.jumboText, { color: colors.text }]}>
            {activeMessage || 'Type a message below to show here'}
          </Text>
        </View>

        {/* ASL Fingerspelling Breakdown */}
        <View style={styles.breakdownSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ASL Sign & Fingerspelling Breakdown
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsScroll}>
            {letters.map((char, index) => {
              const signDef = ASL_ALPHABET.find(
                (s) => s.symbol?.toUpperCase() === char
              );
              return (
                <View
                  key={`${char}-${index}`}
                  style={[
                    styles.letterCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                    },
                  ]}>
                  {signDef ? (
                    <SignVisual sign={signDef} size={64} isDark={isDark} />
                  ) : null}
                  <Text style={[styles.letterChar, { color: colors.text }]}>
                    {char}
                  </Text>
                  {signDef ? (
                    <Text
                      style={[styles.letterDesc, { color: colors.textSecondary }]}>
                      {signDef.handshape}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Quick One-Tap Response Chips */}
        <View style={styles.quickSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Quick Responses (Tap to Voice Out)
          </Text>
          <View style={styles.chipsGrid}>
            {quickDeafResponses.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.responseChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => handleQuickResponse(item.text)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Say: ${item.text}`}>
                <View style={styles.chipSignBadge}>
                  <Text style={styles.chipSignText}>{item.sign}</Text>
                </View>
                <Text
                  style={[styles.chipLabelText, { color: colors.text }]}
                  numberOfLines={2}>
                  {item.text}
                </Text>
                <Ionicons
                  name="volume-medium-outline"
                  size={16}
                  color={colors.primary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Input Tray for Companion to Type */}
      <View
        style={[
          styles.inputTray,
          {
            backgroundColor: colors.backgroundElement,
            borderTopColor: colors.cardBorder,
          },
        ]}>
        <TextInput
          style={[
            styles.inputField,
            {
              backgroundColor: colors.background,
              borderColor: colors.cardBorder,
              color: colors.text,
            },
          ]}
          placeholder="Type here to speak or display in ASL..."
          accessibilityLabel="Message to show"
          placeholderTextColor={colors.textSecondary}
          value={inputMessage}
          onChangeText={setInputMessage}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={handleSend}
          disabled={!inputMessage.trim()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Show message"
          accessibilityState={{ disabled: !inputMessage.trim() }}>
          <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
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
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 20,
    paddingBottom: 30,
  },
  jumboCard: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 20,
    minHeight: 140,
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  jumboHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jumboLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  speakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  speakPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  jumboText: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: 0.5,
  },
  breakdownSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardsScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  letterCard: {
    width: 120,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  letterChar: {
    fontSize: 22,
    fontWeight: '800',
  },
  letterDesc: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  quickSection: {
    gap: 10,
  },
  chipsGrid: {
    gap: 8,
  },
  responseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  chipSignBadge: {
    backgroundColor: '#312E81',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipSignText: {
    color: '#E0E7FF',
    fontSize: 11,
    fontWeight: '800',
  },
  chipLabelText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  inputTray: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  inputField: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
