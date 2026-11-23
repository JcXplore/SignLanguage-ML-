/**
 * Native hand-point source: not built yet (milestone 3 adds a camera plugin
 * running MediaPipe on the phone). Reports "unavailable" so the screen can say so.
 */
import type { HandPointSource } from './types';

export function createHandPointSource(): HandPointSource {
  return {
    async start() {
      throw new Error('unavailable');
    },
    stop() {},
  };
}
