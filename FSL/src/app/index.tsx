import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { Radius, Type } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { DetectionHUD, RecognitionMode } from '@/components/asl/DetectionHUD';
import { SentenceBuilder } from '@/components/asl/SentenceBuilder';
import { SpeechService } from '@/services/speechService';

// No on-device FSL recognition model is connected yet. While this is false the
// screen says so instead of showing made-up results. Set to true once the model
// feeds real detections into setDetectedSign / setConfidence.
const RECOGNITION_ENABLED = false;

export default function TranslateScreen() {
  const { colors } = usePalette();

  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [mode, setMode] = useState<RecognitionMode>('alphabet');
  const [detectedSign, setDetectedSign] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [sentence, setSentence] = useState('');

  const handleAppendText = (text: string) => {
    setSentence((prev) => prev + text);
    if (hapticEnabled) SpeechService.triggerRecognitionHaptic();
  };

  const handleTestSign = (sign: string) => {
    setDetectedSign(sign);
    setConfidence(1);
    // Letters join into a word; whole-word signs get a space before them.
    setSentence((prev) =>
      sign.length === 1 ? prev + sign : prev && !prev.endsWith(' ') ? `${prev} ${sign}` : prev + sign
    );
    if (hapticEnabled) SpeechService.triggerRecognitionHaptic();
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[Type.small, { color: colors.textSecondary }]}>Starting camera</Text>
      </View>
    );
  }

  if (!permission.granted) {
    const blocked = !permission.canAskAgain;
    return (
      <SafeAreaView style={[styles.permission, { backgroundColor: colors.background }]}>
        <View style={styles.permissionBody}>
          <View style={[styles.permissionIcon, { backgroundColor: colors.highlight }]}>
            <Ionicons name="hand-left" size={34} color={colors.onHighlight} />
          </View>
          <Text style={[Type.title, { color: colors.text }]} accessibilityRole="header">
            Let SignBridge see your hands
          </Text>
          <Text style={[Type.body, { color: colors.textSecondary }]}>
            The camera is used to read your signs. Video stays on your phone and is never
            uploaded.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primarySolid }]}
            onPress={blocked ? () => Linking.openSettings() : requestPermission}
            activeOpacity={0.85}
            accessibilityRole="button">
            <Text style={styles.primaryBtnText}>
              {blocked ? 'Open Settings' : 'Allow camera'}
            </Text>
          </TouchableOpacity>
          {blocked && (
            <Text style={[Type.small, { color: colors.textSecondary }]}>
              Camera access is turned off. Turn it on in Settings, then come back.
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.flex, { backgroundColor: '#000' }]}>
      <View style={styles.camera}>
        <CameraView style={styles.flex} facing={facing} />
        <DetectionHUD
          detectedSign={detectedSign}
          confidence={confidence}
          mode={mode}
          onChangeMode={setMode}
          onFlipCamera={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          hapticEnabled={hapticEnabled}
          onToggleHaptic={() => setHapticEnabled((v) => !v)}
          recognitionEnabled={RECOGNITION_ENABLED}
        />
      </View>

      <SentenceBuilder
        sentence={sentence}
        onAppendText={handleAppendText}
        onBackspace={() => setSentence((prev) => prev.slice(0, -1))}
        onClear={() => {
          setSentence('');
          setDetectedSign(null);
        }}
        onTestSign={handleTestSign}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  camera: {
    flex: 1,
    overflow: 'hidden',
  },
  permission: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permissionBody: {
    gap: 16,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtn: {
    height: 52,
    borderRadius: Radius.control,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    ...Type.bodyStrong,
    color: '#FFFFFF',
  },
});
