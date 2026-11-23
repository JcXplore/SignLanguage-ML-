import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { Radius, Type } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { DetectionHUD, HUDStatus, RecognitionMode } from '@/components/asl/DetectionHUD';
import { SentenceBuilder } from '@/components/asl/SentenceBuilder';
import { WebCameraView } from '@/components/asl/WebCameraView';
import { useSignRecognition } from '@/recognition/useSignRecognition';
import { screenStatus } from '@/recognition/screenStatus';
import { SpeechService } from '@/services/speechService';

/** Letters join into a word; whole-word signs get a space before them. */
function appendSign(prev: string, sign: string) {
  if (sign.length === 1) return prev + sign;
  return prev && !prev.endsWith(' ') ? `${prev} ${sign}` : prev + sign;
}

export default function TranslateScreen() {
  const { colors } = usePalette();

  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [hapticEnabled, setHapticEnabled] = useState(true);
  // Words is the only trained mode so far (FSL-105); letters and numbers come next.
  const [mode, setMode] = useState<RecognitionMode>('common');
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [shown, setShown] = useState<HUDStatus | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [sentence, setSentence] = useState('');

  const recognition = useSignRecognition(video, mode === 'common');

  const addSign = (sign: string, test = false) => {
    setSentence((prev) => appendSign(prev, sign));
    setShown({ kind: 'read', label: sign, test });
    if (hapticEnabled) SpeechService.triggerRecognitionHaptic();
  };

  // Each new decision from the camera: add a confident sign, or offer the top guesses.
  useEffect(() => {
    const d = recognition.last;
    if (!d) return;
    if (d.kind === 'read') addSign(d.label);
    else setShown({ kind: 'unsure', top: d.top.map((g) => g.label) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recognition.last?.id]);

  const status = screenStatus({ mode, recognition, cameraError, shown });

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
        <WebCameraView
          style={styles.flex}
          facing={facing}
          onVideo={(v) => {
            setVideo(v);
            if (v) setCameraError(false);
          }}
          onError={() => setCameraError(true)}
        />
        <DetectionHUD
          status={status}
          hint={recognition.hint}
          onPickGuess={(label) => addSign(label)}
          mode={mode}
          onChangeMode={(m) => {
            setMode(m);
            setShown(null);
          }}
          onFlipCamera={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          hapticEnabled={hapticEnabled}
          onToggleHaptic={() => setHapticEnabled((v) => !v)}
        />
      </View>

      <SentenceBuilder
        sentence={sentence}
        onAppendText={(text) => setSentence((prev) => prev + text)}
        onBackspace={() => setSentence((prev) => prev.slice(0, -1))}
        onClear={() => {
          setSentence('');
          setShown(null);
        }}
        onTestSign={(sign) => addSign(sign, true)}
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
