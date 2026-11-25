# SignBridge app

The Expo / React Native app for SignBridge: offline Filipino Sign Language reading,
plus a conversation screen, dictionary and practice quiz. See the
[project README](../README.md) for what it does, results and credits.

## Run it

```bash
npm install
npx expo start --web        # browser, laptop webcam
npx expo run:android        # Android device (native build; Expo Go can't load the hand tracker)
```

## Where things are

- `src/app/`: screens (Expo Router): Translate (`index.tsx`), Talk (`converse.tsx`),
  Dictionary, Practice.
- `src/recognition/`: sign recognition. `features.ts` (per-frame features, twin of
  `ml/features.py`), `segmenter.ts`, `convnet.ts` (model runner), `decide.ts`,
  `recognizer.ts`, `useSignRecognition.ts`. Web camera: `handPoints.web.ts`; Android:
  `handPoints.ts` plus `nativeFrame.ts`.
- `modules/hand-tracker/`: native Android module (CameraX + MediaPipe) that streams hand
  and pose points.
- `assets/models/fsl105/`: the trained model (`model.json`, `weights.bin`, `labels.json`,
  `metrics.md`).
- `public/mediapipe/`: MediaPipe's web runtime and models, served locally so the web build
  works offline. Regenerate with `node scripts/copy-mediapipe-assets.js`.
- `e2e/`: browser end-to-end checks (fake webcam from FSL-105 clips, network blocked).

## Checks

```bash
npm run test:recognition
npx tsc --noEmit
node e2e/recognition.spec.js 3     # needs `npx expo start --web` running and the FSL-105 clips
node e2e/no-network.spec.js
```
