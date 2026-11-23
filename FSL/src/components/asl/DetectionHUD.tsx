import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface DetectionHUDProps {
  detectedSign: string | null;
  confidence: number;
  mode: 'alphabet' | 'numbers' | 'common';
  onToggleMode: () => void;
  onFlipCamera: () => void;
  hapticEnabled: boolean;
  onToggleHaptic: () => void;
  isDark: boolean;
  /** False while no recognition model is connected: shows a demo notice, not results. */
  recognitionEnabled: boolean;
}

export const DetectionHUD: React.FC<DetectionHUDProps> = ({
  detectedSign,
  confidence,
  mode,
  onToggleMode,
  onFlipCamera,
  hapticEnabled,
  onToggleHaptic,
  isDark,
  recognitionEnabled,
}) => {
  const colors = Colors[isDark ? 'dark' : 'light'];

  const getModeLabel = () => {
    switch (mode) {
      case 'alphabet':
        return 'ABC Letters';
      case 'numbers':
        return '123 Numbers';
      case 'common':
        return 'Word Phrases';
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top Header Overlay */}
      <View style={styles.topRow}>
        <View style={styles.offlineBadge}>
          <View
            style={[
              styles.offlineDot,
              !recognitionEnabled && { backgroundColor: '#F59E0B' },
            ]}
          />
          <Text style={styles.offlineText}>
            {recognitionEnabled ? 'Works offline' : 'Demo · not reading signs yet'}
          </Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={[styles.actionBtn, hapticEnabled && styles.actionBtnActive]}
            onPress={onToggleHaptic}
            activeOpacity={0.7}
            accessibilityRole="switch"
            accessibilityState={{ checked: hapticEnabled }}
            accessibilityLabel="Vibrate when a sign is recognized">
            <Ionicons
              name={hapticEnabled ? 'radio' : 'radio-outline'}
              size={18}
              color={hapticEnabled ? '#10B981' : '#FFFFFF'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onFlipCamera}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Flip camera">
            <Ionicons name="camera-reverse-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Target Reticle in Center */}
      <View style={styles.reticleContainer} pointerEvents="none">
        <View style={styles.reticleBox}>
          {/* Reticle corner accents */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          <Text style={styles.reticleHint}>Position hand inside frame</Text>
        </View>
      </View>

      {/* Bottom Mode Switcher & Detection Badge */}
      <View style={styles.bottomSection}>
        {/* Detection Card */}
        {!recognitionEnabled && !detectedSign ? (
          <View style={styles.idleCard}>
            <Ionicons name="information-circle-outline" size={20} color="#FBBF24" />
            <Text style={styles.idleText}>
              Sign recognition isn't connected yet
            </Text>
          </View>
        ) : detectedSign ? (
          <View style={styles.detectionCard}>
            <View style={styles.signBadge}>
              <Text style={styles.signBadgeText}>{detectedSign}</Text>
            </View>
            <View style={styles.detectionInfo}>
              <Text style={styles.detectionTitle}>
                {recognitionEnabled ? 'Recognized Sign' : 'Test sign (not from camera)'}
              </Text>
              {recognitionEnabled && (
              <View style={styles.confidenceRow}>
                <View style={styles.confidenceTrack}>
                  <View
                    style={[
                      styles.confidenceBar,
                      { width: `${Math.round(confidence * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.confidenceText}>
                  {Math.round(confidence * 100)}%
                </Text>
              </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.idleCard}>
            <Ionicons name="hand-right-outline" size={20} color="#94A3B8" />
            <Text style={styles.idleText}>Ready • Looking for hand gestures...</Text>
          </View>
        )}

        {/* Mode Selector Pill */}
        <TouchableOpacity
          style={styles.modePill}
          onPress={onToggleMode}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Recognition mode: ${getModeLabel()}`}
          accessibilityHint="Switches between letters, numbers and words">
          <Ionicons name="layers-outline" size={16} color="#FFFFFF" />
          <Text style={styles.modePillLabel}>Mode: {getModeLabel()}</Text>
          <Ionicons name="swap-horizontal" size={14} color="#A5B4FC" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  offlineText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  topActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionBtnActive: {
    borderColor: '#10B981',
  },
  reticleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleBox: {
    width: 260,
    height: 290,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#6366F1',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 10,
  },
  reticleHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bottomSection: {
    gap: 10,
    alignItems: 'center',
  },
  detectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#6366F1',
    gap: 14,
    minWidth: 260,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  signBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signBadgeText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  detectionInfo: {
    flex: 1,
  },
  detectionTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  confidenceTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  confidenceText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  idleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  idleText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '500',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#312E81',
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  modePillLabel: {
    color: '#E0E7FF',
    fontSize: 13,
    fontWeight: '700',
  },
});
