/** React hook: live sign recognition from the camera (web: <video>; Android: native frame feed). */
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { createClassifier } from './classifier';
import type { Decision } from './decide';
import { createHandPointSource } from './handPoints';
import { startRecognition, type RecognitionState } from './recognizer';
import type { CameraHandle, Hint, UnavailableReason } from './types';

/** A decision plus an id, so the same sign read twice still counts as new. */
export type RecognitionEvent = Decision & { id: number };

export interface SignRecognition {
  state: RecognitionState;
  reason?: UnavailableReason;
  last?: RecognitionEvent;
  hint: Hint;
}

const classifier = createClassifier(); // one model per app session

export function useSignRecognition(camera: CameraHandle | null, enabled: boolean): SignRecognition {
  const [status, setStatus] = useState<{ state: RecognitionState; reason?: UnavailableReason }>({ state: 'loading' });
  const [last, setLast] = useState<RecognitionEvent>();
  const [hint, setHint] = useState<Hint>(null);
  const nextId = useRef(1);

  useEffect(() => {
    if (!enabled) return;
    if (Platform.OS === 'ios') {
      // the iPhone hand tracker isn't built yet
      setStatus({ state: 'unavailable', reason: 'platform' });
      return;
    }
    if (!camera) return;
    let cancelled = false;
    let handle: { stop(): void } | null = null;
    const source = createHandPointSource();
    startRecognition(source, classifier, camera, {
      onState: (state, reason) => !cancelled && setStatus({ state, reason }),
      onDecision: (d) => !cancelled && setLast({ ...d, id: nextId.current++ }),
      onHint: (h) => !cancelled && setHint(h),
    }).then((h) => {
      handle = h;
      if (cancelled) h.stop();
    });
    return () => {
      cancelled = true;
      handle?.stop();
      source.stop();
    };
  }, [camera, enabled]);

  return { ...status, last, hint };
}
