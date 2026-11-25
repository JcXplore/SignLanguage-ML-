/**
 * Converts one frame from the Android hand-tracker module (modules/hand-tracker)
 * into the feature frame the recognizer uses. Same rules as the web path
 * (handPoints.web.ts): MediaPipe's handedness picks the slot, unusable shoulders
 * count as no pose.
 */
import { frameFeatures } from './features.ts';
import { usablePose, type PoseLandmark } from './poseCheck.ts';
import type { FeatureFrame, FrameStatus, HandInput, Vec3 } from './types.ts';

/** The payload of the native view's onFrame event. Coordinates are raw (unmirrored) image space. */
export interface NativeFrame {
  /** Milliseconds, increasing. */
  t: number;
  hands: { label: string; points: number[][] }[];
  /** Missing or null when no body was found. */
  pose?: PoseLandmark[] | null;
}

export function convertNativeFrame(nf: NativeFrame): { frame: FeatureFrame; status: FrameStatus } {
  const hands: HandInput[] = nf.hands.map((h) => ({
    label: h.label === 'Left' ? 'Left' : 'Right',
    points: h.points.map((p) => [p[0], p[1], p[2]] as Vec3),
  }));
  const pose = usablePose(nf.pose);
  return {
    frame: { t: nf.t, v: frameFeatures(hands, pose) },
    status: !pose ? 'noPose' : hands.length === 0 ? 'noHands' : 'ok',
  };
}
