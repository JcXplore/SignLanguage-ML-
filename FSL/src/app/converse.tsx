import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Type, FontFamily } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { SpeechService } from '@/services/speechService';
import { ALL_ASL_SIGNS } from '@/data/aslDictionary';
import { SignVisual } from '@/components/asl/SignVisual';
import { ScreenHeader } from '@/components/ScreenHeader';

const EMERGENCY_PHRASES = [
  'I need a doctor',
  'Please call for help',
  'I am deaf. Please write it down',
];

const QUICK_REPLIES = [
  'Yes, I understand',
  'No',
  'Thank you very much',
  'Please wait a moment',
  'Can you type it for me?',
];

export default function TalkScreen() {
  const { colors } = usePalette();
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  const show = (text: string) => setMessage(text.trim());

  const handleSend = () => {
    if (!draft.trim()) return;
    show(draft);
    setDraft('');
  };

  const handleSay = (text: string, urgent = false) => {
    if (urgent) SpeechService.triggerSuccessHaptic();
    SpeechService.speak(text);
    show(text);
  };

  // Each letter or digit in the message, matched to its fingerspelling sign.
  const spelled = message
    .toUpperCase()
    .split('')
    .filter((c) => /[A-Z0-9]/.test(c))
    .map((char) => ({ char, sign: ALL_ASL_SIGNS.find((s) => s.symbol === char) }));

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader title="Talk" />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* The message, as large as it can be read across a table. */}
          <View
            style={[styles.messageCard, { backgroundColor: colors.backgroundElement }]}
            accessibilityLiveRegion="polite">
            <View style={[styles.liveBar, { backgroundColor: colors.highlight }]} />
            <View style={styles.messageBody}>
              {message ? (
                <Text style={[Type.caption, { color: colors.text }]}>{message}</Text>
              ) : (
                <Text style={[Type.heading, { color: colors.textSecondary }]}>
                  Type below or tap a reply. It shows here in large text and can be read aloud.
                </Text>
              )}
              {message ? (
                <TouchableOpacity
                  style={[styles.readAloud, { backgroundColor: colors.primaryLight }]}
                  onPress={() => SpeechService.speak(message)}
                  accessibilityRole="button">
                  <Ionicons name="volume-high" size={18} color={colors.primaryText} />
                  <Text style={[Type.smallStrong, { color: colors.primaryText }]}>Read aloud</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {spelled.length > 0 && (
            <View style={styles.section}>
              <Text style={[Type.heading, { color: colors.text }]} accessibilityRole="header">
                Fingerspelled
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.letters}>
                {spelled.map(({ char, sign }, i) => (
                  <View
                    key={`${char}-${i}`}
                    style={[styles.letterCard, { backgroundColor: colors.backgroundElement }]}>
                    {sign && <SignVisual sign={sign} size={64} />}
                    <Text style={[styles.letterChar, { color: colors.text }]}>{char}</Text>
                    {sign && (
                      <Text style={[Type.meta, styles.center, { color: colors.textSecondary }]}>
                        {sign.handshape}
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[Type.heading, { color: colors.dangerText }]} accessibilityRole="header">
              Emergency
            </Text>
            {EMERGENCY_PHRASES.map((text) => (
              <TouchableOpacity
                key={text}
                style={[styles.row, { backgroundColor: colors.dangerTint }]}
                onPress={() => handleSay(text, true)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Say: ${text}`}>
                <Ionicons name="alert-circle" size={22} color={colors.dangerText} />
                <Text style={[Type.bodyStrong, styles.flex, { color: colors.text }]}>{text}</Text>
                <Ionicons name="volume-high-outline" size={20} color={colors.dangerText} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[Type.heading, { color: colors.text }]} accessibilityRole="header">
              Quick replies
            </Text>
            <View style={[styles.group, { backgroundColor: colors.backgroundElement }]}>
              {QUICK_REPLIES.map((text, i) => (
                <TouchableOpacity
                  key={text}
                  style={[
                    styles.groupRow,
                    i > 0 && { borderTopColor: colors.cardBorder, borderTopWidth: StyleSheet.hairlineWidth },
                  ]}
                  onPress={() => handleSay(text)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Say: ${text}`}>
                  <Text style={[Type.body, styles.flex, { color: colors.text }]}>{text}</Text>
                  <Ionicons name="volume-high-outline" size={20} color={colors.primaryText} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.tray,
            { backgroundColor: colors.backgroundElement, borderTopColor: colors.cardBorder },
          ]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: inputFocused ? colors.primaryText : 'transparent',
              },
            ]}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Type a message"
            placeholderTextColor={colors.textSecondary}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            autoCapitalize="sentences"
            accessibilityLabel="Message to show"
          />
          <TouchableOpacity
            style={[
              styles.send,
              { backgroundColor: colors.primarySolid },
              !draft.trim() && styles.disabled,
            ]}
            onPress={handleSend}
            disabled={!draft.trim()}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Show message"
            accessibilityState={{ disabled: !draft.trim() }}>
            <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 28,
  },
  messageCard: {
    flexDirection: 'row',
    borderRadius: Radius.card,
    overflow: 'hidden',
    minHeight: 150,
  },
  liveBar: {
    width: 6,
  },
  messageBody: {
    flex: 1,
    padding: 20,
    gap: 16,
    justifyContent: 'center',
  },
  readAloud: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
  },
  section: {
    gap: 10,
  },
  letters: {
    gap: 10,
  },
  letterCard: {
    width: 116,
    padding: 12,
    borderRadius: Radius.card,
    alignItems: 'center',
    gap: 6,
  },
  letterChar: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: FontFamily.bold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: Radius.control,
  },
  group: {
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  tray: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: Radius.pill,
    paddingHorizontal: 18,
    fontSize: 16,
    fontFamily: FontFamily.regular,
    borderWidth: 2,
    ...Platform.select({ web: { outlineStyle: 'none' } as object }),
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
});
