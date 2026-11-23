/**
 * Wires a hand-point source to the segmenter, classifier and decision.
 * Platform-neutral and free of React, so it is tested directly; the
 * useSignRecognition hook wraps it for the Translate screen.
 */
import { decide, type Decision } from './decide.ts';
import { createSegmenter, resampleTo32 } from './segmenter.ts';
import type { FrameStatus, HandPointSource, Hint, SignClassifier, UnavailableReason } from './types.ts';

export type RecognitionState = 'loading' | 'ready' | 'unavailable';

export interface RecognitionCallbacks {
  onState(state: RecognitionState, reason?: UnavailableReason): void;
  onDecision(d: Decision): void;
  onHint(h: Hint): void;
}

/** Show "move back" after this long without shoulders in view. */
const NO_POSE_HINT_MS = 1000;

function reasonFor(err: unknown): UnavailableReason {
  const e = err as { name?: string; message?: string } | null;
  if (e?.message === 'unavailable') return 'platform';
  if (e?.name === 'NotAllowedError' || e?.name === 'NotFoundError' || e?.name === 'NotReadableError') return 'noCamera';
  return 'noCamera';
}

/**
 * Loads the classifier, starts the source and reports results.
 * Resolves once started (or failed); call the returned stop() to end.
 */
export async function startRecognition(
  source: HandPointSource,
  classifier: SignClassifier,
  video: HTMLVideoElement | null,
  cb: RecognitionCallbacks
): Promise<{ stop(): void }> {
  const stop = () => source.stop();
  cb.onState('loading');
  cb.onHint(null); // a new run starts with no hint, clearing any left from the last one
  try {
    await classifier.load();
  } catch {
    cb.onState('unavailable', 'noModel');
    return { stop };
  }

  const segmenter = createSegmenter();
  let noPoseSince: number | null = null;
  let hint: Hint = null;
  let busy = Promise.resolve();

  const setHint = (h: Hint) => {
    if (h !== hint) {
      hint = h;
      cb.onHint(h);
    }
  };

  const onFrame = (frame: { t: number; v: Float32Array }, status: FrameStatus) => {
    if (status === 'noPose') {
      noPoseSince ??= frame.t;
      if (frame.t - noPoseSince >= NO_POSE_HINT_MS) setHint('moveBack');
    } else {
      noPoseSince = null;
      setHint(null);
    }
    const segment = segmenter.push(frame);
    if (segment) {
      const window = resampleTo32(segment.frames);
      // one prediction at a time, in order
      busy = busy.then(async () => cb.onDecision(decide(await classifier.predict(window))));
    }
  };

  try {
    await source.start(video, onFrame);
  } catch (err) {
    cb.onState('unavailable', reasonFor(err));
    return { stop };
  }
  cb.onState('ready');
  return { stop };
}
