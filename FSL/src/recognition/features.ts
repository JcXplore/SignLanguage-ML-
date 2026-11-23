/**
 * TypeScript twin of ml/features.py: the per-frame feature vector the sign
 * classifier was trained on. Both are checked against
 * ml/fixtures/features_cases.json; change them together.
 *
 * Layout (149): right hand 21x(x,y,z) [0..62], left hand [63..125],
 * right present [126], left present [127], pose points 0, 11..16 x(x,y,z)
 * [128..148]. Origin is the shoulder midpoint, scale the shoulder width.
 * No pose, or zero shoulder width, gives all zeros.
 */
import type { HandInput, Vec3 } from './types.ts';

export const FEATURE_SIZE = 149;
const RIGHT_SLOT = 0;
const LEFT_SLOT = 63;
const RIGHT_FLAG = 126;
const LEFT_FLAG = 127;
const POSE_START = 128;
const POSE_INDICES = [0, 11, 12, 13, 14, 15, 16];
const MIN_SCALE = 1e-6;

export function frameFeatures(hands: HandInput[], pose: Vec3[] | null): Float32Array {
  const out = new Float32Array(FEATURE_SIZE);
  if (!pose) return out;
  const ls = pose[11];
  const rs = pose[12];
  const ox = (ls[0] + rs[0]) / 2;
  const oy = (ls[1] + rs[1]) / 2;
  const scale = Math.hypot(ls[0] - rs[0], ls[1] - rs[1]);
  if (scale < MIN_SCALE) return out;

  const put = (offset: number, points: Vec3[]) => {
    points.forEach(([x, y, z], i) => {
      out[offset + 3 * i] = (x - ox) / scale;
      out[offset + 3 * i + 1] = (y - oy) / scale;
      out[offset + 3 * i + 2] = z / scale;
    });
  };

  for (const hand of hands) {
    if (hand.label === 'Right') {
      put(RIGHT_SLOT, hand.points);
      out[RIGHT_FLAG] = 1;
    } else if (hand.label === 'Left') {
      put(LEFT_SLOT, hand.points);
      out[LEFT_FLAG] = 1;
    }
  }
  put(POSE_START, POSE_INDICES.map((i) => pose[i]));
  return out;
}
