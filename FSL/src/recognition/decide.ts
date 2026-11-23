/** Turns ranked classifier guesses into "read" or "not sure yet". */
import type { Guess } from './types.ts';

export type Decision = { kind: 'read'; label: string; score: number } | { kind: 'unsure'; top: Guess[] };

export interface DecideOptions {
  /** The top guess must score at least this. */
  minScore?: number;
  /** ...and beat the second guess by at least this. */
  minMargin?: number;
}

export function decide(guesses: Guess[], opts: DecideOptions = {}): Decision {
  const minScore = opts.minScore ?? 0.6;
  const minMargin = opts.minMargin ?? 0.2;
  const ranked = [...guesses].sort((a, b) => b.score - a.score);
  const [top, second] = ranked;
  if (top && top.score >= minScore && top.score - (second?.score ?? 0) >= minMargin) {
    return { kind: 'read', label: top.label, score: top.score };
  }
  return { kind: 'unsure', top: ranked.slice(0, 2) };
}
