/** What the Translate screen's result card shows, from the recognition state. */
import type { UnavailableReason } from './types.ts';

export type UnavailableNotice = 'notTrained' | UnavailableReason;

export type HUDStatus =
  | { kind: 'loading' }
  | { kind: 'unavailable'; reason: UnavailableNotice }
  | { kind: 'idle' }
  | { kind: 'read'; label: string; test?: boolean }
  | { kind: 'unsure'; top: string[] };

export interface ScreenInput {
  mode: 'alphabet' | 'numbers' | 'common';
  recognition: { state: 'loading' | 'ready' | 'unavailable'; reason?: UnavailableReason };
  /** The camera preview failed to start (no device, in use, or access revoked). */
  cameraError: boolean;
  /** The latest result to show, if any. */
  shown: HUDStatus | null;
}

export function screenStatus({ mode, recognition, cameraError, shown }: ScreenInput): HUDStatus {
  if (shown?.kind === 'read' && shown.test) return shown;
  if (mode !== 'common') return { kind: 'unavailable', reason: 'notTrained' };
  if (cameraError) return { kind: 'unavailable', reason: 'noCamera' };
  if (recognition.state === 'unavailable') return { kind: 'unavailable', reason: recognition.reason ?? 'noModel' };
  if (recognition.state === 'loading') return { kind: 'loading' };
  return shown ?? { kind: 'idle' };
}
