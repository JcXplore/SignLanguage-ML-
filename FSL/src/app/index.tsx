import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { DetectionHUD } from '@/components/asl/DetectionHUD';
import { SentenceBuilder } from '@/components/asl/SentenceBuilder';
import { SpeechService } from '@/services/speechService';

export default function CameraTranslatorScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [mode, setMode] = useState<'alphabet' | 'numbers' | 'common'>('alphabet');
  
  // Real-time detection state
  const [detectedSign, setDetectedSign] = useState<string | null>('A');
  const [confidence, setConfidence] = useState<number>(0.96);
  
  // Accumulated sentence state
  const [sentence, setSentence] = useState<string>('HELLO');

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleMode = () => {
    setMode((current) => {
      if (current === 'alphabet') return 'numbers';
      if (current === 'numbers') return 'common';
      return 'alphabet';
    });
  };

  const toggleHaptic = () => {
    setHapticEnabled((prev) => !prev);
  };

  const handleAppendText = (char: string) => {
    setSentence((prev) => prev + char);
    if (hapticEnabled) {
      SpeechService.triggerRecognitionHaptic();
    }
  };

  const handleBackspace = () => {
    setSentence((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setSentence('');
  };

  const handleTestSign = (sign: string) => {
    setDetectedSign(sign);
    setConfidence(0.98);
    setSentence((prev) => (prev ? `${prev} ${sign}` : sign));
    if (hapticEnabled) {
      SpeechService.triggerRecognitionHaptic();
    }
  };

  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Initializing camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <SafeAreaView
        style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
        <View style={styles.permissionCard}>
          <View style={[styles.permissionIconBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="camera" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionSubtitle, { color: colors.textSecondary }]}>
            SignBridge needs camera access to recognize your sign language gestures
            in real time. All processing happens 100% on your device without an internet connection.
          </Text>

          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
            activeOpacity={0.8}>
            <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Camera View Area */}
      <View style={styles.cameraWrapper}>
        <CameraView style={styles.camera} facing={facing} />
        <DetectionHUD
          detectedSign={detectedSign}
          confidence={confidence}
          mode={mode}
          onToggleMode={toggleMode}
          onFlipCamera={toggleCameraFacing}
          hapticEnabled={hapticEnabled}
          onToggleHaptic={toggleHaptic}
          isDark={isDark}
        />
      </View>

      {/* Sentence Builder Bottom Dock */}
      <SentenceBuilder
        sentence={sentence}
        onAppendText={handleAppendText}
        onBackspace={handleBackspace}
        onClear={handleClear}
        isDark={isDark}
        onTestSign={handleTestSign}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    alignItems: 'center',
    maxWidth: 360,
    gap: 16,
  },
  permissionIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cameraWrapper: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
});
