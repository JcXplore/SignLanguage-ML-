/**
 * Whether the upper body is usable. When the signer is too close, MediaPipe
 * still returns a pose but guesses the shoulders off-image with low
 * visibility; normalising against guessed shoulders would make the classifier
 * guess too. Treat that as "no pose" so the screen says "move back" instead.
 */
import type { Vec3 } from './types.ts';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

const MIN_VISIBILITY = 0.5;
const SHOULDERS = [11, 12];

export function usablePose(pose: PoseLandmark[] | null | undefined): Vec3[] | null {
  if (!pose || pose.length < 17) return null;
  for (const i of SHOULDERS) {
    const s = pose[i];
    if ((s.visibility ?? 1) < MIN_VISIBILITY || s.x < 0 || s.x > 1 || s.y < 0 || s.y > 1) return null;
  }
  return pose.map((p) => [p.x, p.y, p.z] as Vec3);
}
