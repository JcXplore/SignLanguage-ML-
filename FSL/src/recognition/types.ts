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

/** Status of one camera frame, from the hand-point source. */
export type FrameStatus = 'ok' | 'noPose' | 'noHands';

/** A stream of frames from a native camera view (Android: modules/hand-tracker). */
export interface FrameFeed<T = unknown> {
  subscribe(listener: (frame: T) => void): () => void;
}

/** What the camera preview hands to recognition: the <video> element on web, a frame feed on Android. */
export type CameraHandle = HTMLVideoElement | FrameFeed;

/** Turns camera frames into feature frames. Web: MediaPipe in the browser; Android: the native module. */
export interface HandPointSource {
  /** Rejects with Error('unavailable') where not supported, or the camera's own error. */
  start(camera: CameraHandle | null, onFrame: (f: FeatureFrame, status: FrameStatus) => void): Promise<void>;
  stop(): void;
}

/** Scores a 32 x 149 window. */
export interface SignClassifier {
  load(): Promise<void>;
  /** Top 5 guesses, best first. */
  predict(window32: Float32Array): Promise<Guess[]>;
}

export type UnavailableReason = 'noCamera' | 'noModel' | 'platform';
export type Hint = 'moveBack' | null;
