import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius, Type, FontFamily } from '@/constants/theme';

export type RecognitionMode = 'alphabet' | 'numbers' | 'common';

/** What the result card shows. */
export type HUDStatus =
  | { kind: 'loading' }
  | { kind: 'unavailable'; reason: UnavailableNotice }
  | { kind: 'idle' }
  | { kind: 'read'; label: string; test?: boolean }
  | { kind: 'unsure'; top: string[] };

export type UnavailableNotice = 'notTrained' | 'noModel' | 'noCamera' | 'platform';

const NOTICE: Record<UnavailableNotice, string> = {
  notTrained: "Letters and numbers aren't trained yet. Switch to Words.",
  noModel: "The sign model didn't load. Restart the app.",
  noCamera: 'Allow the camera to read signs.',
  platform: "Sign reading isn't available on this device yet.",
};

interface DetectionHUDProps {
  status: HUDStatus;
  hint?: 'moveBack' | null;
  /** A "not sure" guess the signer tapped to accept. */
  onPickGuess?: (label: string) => void;
  mode: RecognitionMode;
  onChangeMode: (mode: RecognitionMode) => void;
  onFlipCamera: () => void;
  hapticEnabled: boolean;
  onToggleHaptic: () => void;
}

const MODES: { id: RecognitionMode; label: string; spoken: string }[] = [
  { id: 'alphabet', label: 'ABC', spoken: 'Letters' },
  { id: 'numbers', label: '123', spoken: 'Numbers' },
  { id: 'common', label: 'Words', spoken: 'Words' },
];

// The overlay always sits on camera video, so it uses fixed light-on-dark colors
// in both themes.
const ink = Colors.light.text;
const sun = Colors.light.highlight;
const scrim = 'rgba(13, 19, 34, 0.78)';

export const DetectionHUD: React.FC<DetectionHUDProps> = ({
  status,
  hint,
  onPickGuess,
  mode,
  onChangeMode,
  onFlipCamera,
  hapticEnabled,
  onToggleHaptic,
}) => {
  // Size the hand frame from the space actually left between the controls,
  // so it never runs under the result card on small phones.
  const [frameArea, setFrameArea] = useState({ width: 0, height: 0 });
  const onFrameAreaLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setFrameArea({ width, height });
  };
  const frameWidth = Math.min(frameArea.width * 0.72, (frameArea.height - 16) * 0.88, 300);
  const frameHeight = frameWidth / 0.88;

  const live = status.kind === 'idle' || status.kind === 'read' || status.kind === 'unsure';
  const hasSign = status.kind === 'read';

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.topRow}>
        <View style={styles.statusChip}>
          <View
            style={[styles.statusDot, { backgroundColor: live ? '#4CC38A' : sun }]}
          />
          <Text style={styles.statusText}>
            {live ? 'Reading signs' : status.kind === 'loading' ? 'Loading' : 'Not reading signs'}
          </Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={[styles.roundBtn, hapticEnabled && styles.roundBtnOn]}
            onPress={onToggleHaptic}
            activeOpacity={0.7}
            accessibilityRole="switch"
            accessibilityState={{ checked: hapticEnabled }}
            accessibilityLabel="Vibrate when a sign is read">
            <MaterialCommunityIcons
              name={hapticEnabled ? 'vibrate' : 'vibrate-off'}
              size={20}
              color={hapticEnabled ? ink : '#FFFFFF'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.roundBtn}
            onPress={onFlipCamera}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Switch camera">
            <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel="What to read">
        {MODES.map((m) => {
          const selected = m.id === mode;
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.segment, selected && styles.segmentOn]}
              onPress={() => onChangeMode(m.id)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={m.spoken}>
              <Text style={[styles.segmentText, selected && styles.segmentTextOn]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.frameArea} onLayout={onFrameAreaLayout} pointerEvents="none">
        {frameWidth > 0 && (
          <View style={{ width: frameWidth, height: frameHeight }}>
            {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
              <View
                key={c}
                style={[styles.corner, styles[c], { borderColor: hasSign ? sun : 'rgba(255,255,255,0.85)' }]}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.resultArea} accessibilityLiveRegion="polite">
        {hint === 'moveBack' && live ? (
          <Notice icon="resize-outline" text="Move back so your shoulders are in view." />
        ) : status.kind === 'read' ? (
          <View style={styles.resultCard}>
            <View style={styles.signTile}>
              <Text
                style={[styles.signTileText, status.label.length > 2 && styles.signTileWord]}
                numberOfLines={1}>
                {status.label}
              </Text>
            </View>
            <View style={styles.resultText}>
              <Text style={styles.resultTitle}>{status.test ? 'Test sign' : 'Read'}</Text>
              <Text style={styles.resultSub}>
                {status.test ? 'Tapped in, not read from the camera' : 'Added to your sentence'}
              </Text>
            </View>
          </View>
        ) : status.kind === 'unsure' ? (
          <View style={styles.resultCard}>
            <View style={styles.resultText}>
              <Text style={styles.resultTitle}>Not sure yet</Text>
              {status.top.length > 0 ? (
                <View style={styles.guessRow}>
                  <Text style={styles.resultSub}>Did you sign</Text>
                  {status.top.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={styles.guessChip}
                      onPress={() => onPickGuess?.(g)}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${g}`}>
                      <Text style={styles.guessText}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.resultSub}>Try the sign again, a little slower</Text>
              )}
            </View>
          </View>
        ) : status.kind === 'unavailable' ? (
          <Notice icon="information-circle-outline" text={NOTICE[status.reason]} tone="warn" />
        ) : status.kind === 'loading' ? (
          <Notice icon="hourglass-outline" text="Loading the sign model" />
        ) : (
          <Notice icon="hand-left-outline" text="Sign a word, then hold your hands still for a moment" />
        )}
      </View>
    </View>
  );
};

function Notice({ icon, text, tone }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string; tone?: 'warn' }) {
  return (
    <View style={styles.resultCard}>
      <Ionicons name={icon} size={22} color={tone === 'warn' ? sun : '#FFFFFF'} />
      <Text style={[styles.resultSub, styles.flex]}>{text}</Text>
    </View>
  );
}

const CORNER = 30;
const BORDER = 4;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    padding: 16,
    gap: 12,
  },
  flex: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: scrim,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: Radius.pill,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...Type.meta,
    color: '#FFFFFF',
  },
  topActions: {
    flexDirection: 'row',
    gap: 10,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: scrim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundBtnOn: {
    backgroundColor: sun,
  },
  segmented: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: scrim,
    borderRadius: Radius.pill,
    padding: 4,
  },
  segment: {
    minWidth: 72,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    backgroundColor: sun,
  },
  segmentText: {
    ...Type.smallStrong,
    color: '#FFFFFF',
  },
  segmentTextOn: {
    color: ink,
  },
  frameArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
  },
  tl: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderBottomRightRadius: 12 },
  resultArea: {
    alignItems: 'stretch',
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: scrim,
    borderRadius: Radius.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
  },
  signTile: {
    minWidth: 48,
    maxWidth: 140,
    paddingHorizontal: 10,
    height: 48,
    borderRadius: Radius.control,
    backgroundColor: sun,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signTileText: {
    color: ink,
    fontSize: 24,
    fontFamily: FontFamily.bold,
  },
  signTileWord: {
    fontSize: 16,
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    ...Type.bodyStrong,
    color: '#FFFFFF',
  },
  guessRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  guessChip: {
    backgroundColor: sun,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
  },
  guessText: {
    ...Type.smallStrong,
    color: ink,
  },
  resultSub: {
    ...Type.small,
    color: '#D5DAE5',
  },
});
