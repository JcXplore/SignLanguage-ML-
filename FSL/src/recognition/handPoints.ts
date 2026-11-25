/**
 * Android hand-point source: frames come from the native HandTracker view
 * (modules/hand-tracker), which runs MediaPipe on the phone. The view pushes
 * each frame into a FrameFeed; this source converts them with the same rules
 * as the web build.
 */
import { convertNativeFrame, type NativeFrame } from './nativeFrame.ts';
import type { CameraHandle, FrameFeed, HandPointSource } from './types.ts';

/** A feed the native camera view emits into and the recognizer subscribes to. */
export function createFrameFeed(): FrameFeed<NativeFrame> & { emit(frame: NativeFrame): void } {
  const listeners = new Set<(frame: NativeFrame) => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(frame) {
      listeners.forEach((l) => l(frame));
    },
  };
}

const isFeed = (camera: CameraHandle | null): camera is FrameFeed<NativeFrame> =>
  !!camera && typeof (camera as FrameFeed).subscribe === 'function';

export function createHandPointSource(): HandPointSource {
  let unsubscribe: (() => void) | null = null;
  return {
    async start(camera, onFrame) {
      if (!isFeed(camera)) throw new Error('unavailable');
      unsubscribe = camera.subscribe((nf) => {
        const { frame, status } = convertNativeFrame(nf);
        onFrame(frame, status);
      });
    },
    stop() {
      unsubscribe?.();
      unsubscribe = null;
    },
  };
}
