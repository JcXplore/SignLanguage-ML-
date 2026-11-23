/**
 * Web hand-point source: MediaPipe Tasks Vision running in the browser on the
 * webcam <video>. The WASM runtime and both models are served from the app's
 * own public/mediapipe folder (scripts/copy-mediapipe-assets.js), so this
 * works with no internet connection.
 */
import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { frameFeatures } from './features.ts';
import type { HandInput, HandPointSource, Vec3 } from './types.ts';

const BASE = '/mediapipe';
const FRAME_MS = 1000 / 30; // match the 30 fps the model was trained on

let landmarkers: Promise<{ hands: HandLandmarker; pose: PoseLandmarker }> | null = null;

function loadLandmarkers() {
  landmarkers ??= (async () => {
    const fileset = await FilesetResolver.forVisionTasks(BASE);
    const [hands, pose] = await Promise.all([
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${BASE}/hand_landmarker.task`, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numHands: 2,
      }),
      PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${BASE}/pose_landmarker_lite.task`, delegate: 'CPU' },
        runningMode: 'VIDEO',
      }),
    ]);
    return { hands, pose };
  })().catch((e) => {
    landmarkers = null; // allow a retry on the next start
    throw e;
  });
  return landmarkers;
}

export function createHandPointSource(): HandPointSource {
  let running = false;
  let raf = 0;

  return {
    async start(video, onFrame) {
      if (!video) throw Object.assign(new Error('No camera video'), { name: 'NotFoundError' });
      const { hands, pose } = await loadLandmarkers();
      running = true;
      let lastTime = -1;
      let lastProcessed = 0;

      const tick = () => {
        if (!running) return;
        raf = requestAnimationFrame(tick);
        const now = performance.now();
        if (video.readyState < 2 || video.currentTime === lastTime || now - lastProcessed < FRAME_MS - 2) return;
        lastTime = video.currentTime;
        lastProcessed = now;

        const h = hands.detectForVideo(video, now);
        const p = pose.detectForVideo(video, now);
        const handInputs: HandInput[] = h.landmarks.map((pts, i) => ({
          label: (h.handedness[i]?.[0]?.categoryName === 'Left' ? 'Left' : 'Right') as HandInput['label'],
          points: pts.map((lm) => [lm.x, lm.y, lm.z] as Vec3),
        }));
        const posePts = p.landmarks[0]?.map((lm) => [lm.x, lm.y, lm.z] as Vec3) ?? null;
        const v = frameFeatures(handInputs, posePts);
        onFrame({ t: now, v }, !posePts ? 'noPose' : handInputs.length === 0 ? 'noHands' : 'ok');
      };
      raf = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
  };
}
