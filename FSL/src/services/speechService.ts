import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export class SpeechService {
  /**
   * Speaks the provided sentence out loud using the on-device offline TTS engine.
   */
  static async speak(text: string, onDone?: () => void) {
    if (!text || text.trim().length === 0) return;

    try {
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        await Speech.stop();
      }

      Speech.speak(text.trim(), {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.95,
        onDone: onDone,
        onError: (err) => {
          console.warn('Offline TTS error:', err);
        },
      });
    } catch (e) {
      console.warn('Speech invocation error:', e);
    }
  }

  /**
   * Immediately stops any speech output.
   */
  static async stop() {
    try {
      await Speech.stop();
    } catch (e) {
      console.warn('Error stopping speech:', e);
    }
  }

  /**
   * Triggers a subtle tactile vibration for deaf users to confirm a sign was detected.
   */
  static triggerRecognitionHaptic() {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Haptics optional fallback
      }
    }
  }

  /**
   * Triggers a success vibration (e.g. word completed or quiz answer correct).
   */
  static triggerSuccessHaptic() {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        // Fallback
      }
    }
  }
}
