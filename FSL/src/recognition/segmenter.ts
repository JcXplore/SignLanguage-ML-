/**
 * Finds individual signs in the live stream of feature frames.
 *
 * Mirrors ml/windows.py so live segments look like training windows:
 * - motion is, for each hand present in two consecutive frames, the mean
 *   absolute change of its 42 x/y values; a frame's motion is the larger hand;
 * - a segment starts when motion exceeds the threshold, and keeps up to PAD
 *   frames either side of the moving stretch;
 * - resampleTo32 picks source frame round(i * (n - 1) / 31).
 */
import type { FeatureFrame } from './types.ts';

export const WINDOW = 32;
const FEATURES = 149;
const PAD = 4;
const RIGHT_FLAG = 126;
const LEFT_FLAG = 127;

export interface Segment {
  frames: FeatureFrame[];
  reason: 'ended' | 'maxLength';
}

export interface SegmenterOptions {
  motionThreshold?: number;
  endStillMs?: number;
  minMs?: number;
  maxMs?: number;
}

function handMotion(a: Float32Array, b: Float32Array, start: number, flag: number): number {
  if (a[flag] === 0 || b[flag] === 0) return 0;
  let sum = 0;
  for (let i = start; i < start + 63; i++) {
    if ((i - start) % 3 !== 2) sum += Math.abs(b[i] - a[i]);
  }
  return sum / 42;
}

export function frameMotion(prev: Float32Array, cur: Float32Array): number {
  return Math.max(handMotion(prev, cur, 0, RIGHT_FLAG), handMotion(prev, cur, 63, LEFT_FLAG));
}

export function createSegmenter(opts: SegmenterOptions = {}) {
  const motionThreshold = opts.motionThreshold ?? 0.02;
  const endStillMs = opts.endStillMs ?? 300;
  const minMs = opts.minMs ?? 300;
  const maxMs = opts.maxMs ?? 3000;

  let prev: FeatureFrame | null = null;
  let pre: FeatureFrame[] = [];
  let frames: FeatureFrame[] | null = null;
  let firstMoveT = 0;
  let lastMoveT = 0;
  let lastMoveIdx = 0;

  const reset = () => {
    prev = null;
    pre = [];
    frames = null;
  };

  const finish = (reason: Segment['reason']): Segment | null => {
    const kept = frames!.slice(0, Math.min(frames!.length, lastMoveIdx + 1 + PAD));
    const tooShort = lastMoveT - firstMoveT < minMs;
    pre = frames!.slice(-PAD);
    frames = null;
    return tooShort && reason === 'ended' ? null : { frames: kept, reason };
  };

  function push(frame: FeatureFrame): Segment | null {
    const moving = prev !== null && frameMotion(prev.v, frame.v) > motionThreshold;
    prev = frame;

    if (frames === null) {
      if (moving) {
        frames = [...pre, frame];
        firstMoveT = lastMoveT = frame.t;
        lastMoveIdx = frames.length - 1;
      } else {
        pre.push(frame);
        if (pre.length > PAD) pre.shift();
      }
      return null;
    }

    frames.push(frame);
    if (moving) {
      lastMoveT = frame.t;
      lastMoveIdx = frames.length - 1;
    }
    if (frame.t - firstMoveT >= maxMs) return finish('maxLength');
    if (frame.t - lastMoveT >= endStillMs) return finish('ended');
    return null;
  }

  return { push, reset };
}

/** The model's input: 32 frames x 149 features, picked uniformly in time. */
export function resampleTo32(frames: FeatureFrame[]): Float32Array {
  const out = new Float32Array(WINDOW * FEATURES);
  const n = frames.length;
  if (n === 0) return out;
  for (let i = 0; i < WINDOW; i++) {
    const src = n > 1 ? Math.round((i * (n - 1)) / (WINDOW - 1)) : 0;
    out.set(frames[src].v, i * FEATURES);
  }
  return out;
}
