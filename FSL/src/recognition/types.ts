/** Shared types for sign recognition. Platform-neutral: no React Native or web imports. */

export type Vec3 = [number, number, number];

/** One detected hand, as MediaPipe reports it (normalised image coordinates). */
export interface HandInput {
  label: 'Left' | 'Right';
  points: Vec3[];
}

/** One frame's 149-float feature vector (see features.ts) with its timestamp in ms. */
export type FeatureFrame = { t: number; v: Float32Array };

/** One classifier guess. */
export interface Guess {
  label: string;
  score: number;
}
