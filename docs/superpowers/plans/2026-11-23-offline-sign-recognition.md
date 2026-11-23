# Offline Sign Recognition (Milestone 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The web build's Translate screen reads the 105 FSL-105 signs live from a laptop webcam, fully offline, using a model trained in a new `ml/` folder.

**Architecture:** Python (`ml/`) extracts MediaPipe hand and pose points from FSL-105 videos, trains a small temporal-convolution classifier, and exports TF.js and TFLite models into the app. The app (`FSL/src/recognition/`) has one shared feature function (mirrored in Python and checked against a shared fixture), pure segmentation and decision logic, and two web-only adapters (MediaPipe Tasks Vision, TF.js) behind interfaces, with native stubs for milestone 3.

**Tech Stack:** Python 3.12 (uv venv), mediapipe 1.2.x Tasks API, tensorflow 2.21 / Keras, tensorflowjs converter; TypeScript, Expo SDK 57 web, `@mediapipe/tasks-vision` 1.2.3, `@tensorflow/tfjs` 4.22.0; Playwright for the end-to-end check.

**Spec:** `docs/superpowers/specs/2026-11-23-offline-sign-recognition-design.md`

## Global Constraints

- Nothing fetched from the network at runtime: MediaPipe WASM, `.task` models and the classifier all ship inside `FSL/` (anti-goal).
- No frame, point or result is sent anywhere.
- Classifier exports to TF.js and TFLite with no custom or flex ops.
- `@mediapipe/tasks-vision` and `@tensorflow/tfjs` are imported only from `*.web.ts(x)` files; `npx tsc --noEmit` passes and the native bundle never resolves them.
- Raw videos and extracted points are not committed (`ml/work/` is gitignored); model files are committed under `FSL/assets/models/fsl105/`.
- Targets: test top-1 ≥ 0.85, top-5 ≥ 0.95; result within about 500 ms of the signer finishing.
- Low confidence never shows as read: it shows "Not sure yet" plus the top-2 chips.
- Credit FSL-105 (Tupal, 2023, CC BY 4.0, DOI 10.17632/48y2y99mb9.2) in the app.

## Review Focus

1. **No pose detected (signer too close, or shoulders out of frame):** the frame becomes all zeros with the pose flag 0; recognition shows "Move back so your shoulders are in view" instead of guessing (Task 1 and Task 4 tests).
2. **Only one hand visible, or the hand leaves mid-sign:** the missing slot is zeros with its presence flag 0; a 1-frame dropout doesn't end the segment (Task 4 test `gap shorter than 300ms continues segment`).
3. **Hands raised but still (resting pose):** no segment starts without motion, so nothing is guessed (Task 4 test `still hands never start a segment`).
4. **Very short twitch or over-long signing:** segments under 300 ms are dropped; segments are cut at 3 s and classified (Task 4 tests).
5. **Camera or model unavailable (permission denied, native platform, model file missing):** the Words mode shows the existing notice with a specific reason; the app never crashes (Task 6 test with a missing model URL).

---

## File structure

```
ml/
  pyproject.toml            uv project: mediapipe, tensorflow, tensorflowjs, numpy, opencv-python-headless, pytest
  features.py               frame -> 149-float feature vector (THE shared definition)
  extract.py                videos -> ml/work/points.npz (+ labels, split)
  train.py                  points -> Keras model + metrics
  export.py                 Keras -> TF.js, TFLite, labels.json, metrics.md
  models/                   hand_landmarker.task, pose_landmarker_lite.task (downloaded by script, gitignored)
  fixtures/features_cases.json   shared input -> expected feature cases
  tests/test_features.py, tests/test_export.py
FSL/
  public/mediapipe/          tasks-vision WASM files + the two .task models (copied by script, committed)
  assets/models/fsl105/      model.json, group1-shard*.bin, model.tflite, labels.json, metrics.md
  src/recognition/
    features.ts              TS twin of ml/features.py
    segmenter.ts             motion-based start/end of a sign
    decide.ts                threshold + margin decision
    types.ts                 HandPointSource, SignClassifier, FeatureFrame, Guess
    handPoints.web.ts / handPoints.ts       MediaPipe adapter / native stub
    classifier.web.ts / classifier.ts       TF.js adapter / native stub
    useSignRecognition.ts    hook wiring source -> segmenter -> classifier -> decide
    __tests__/*.test.ts      run with node --test (type stripping)
  src/components/asl/WebCameraView.web.tsx   <video> + getUserMedia, exposes the element
  src/app/index.tsx, src/components/asl/DetectionHUD.tsx   per-mode enable, chips, reasons
  src/app/credits.tsx (or a section in Dictionary)          dataset credit
```

## Feature vector (pinned: both implementations must match)

149 floats per frame, in this order:
- `[0..62]` right-hand slot, `[63..125]` left-hand slot: 21 landmarks × (x, y, z), using MediaPipe's handedness label to pick the slot.
- `[126]` right present (0/1), `[127]` left present (0/1).
- `[128..148]` pose points 0 (nose), 11, 12 (shoulders), 13, 14 (elbows), 15, 16 (wrists) × (x, y, z).

Normalisation: origin = midpoint of pose 11 and 12 (x, y; z origin 0); scale = 2D distance between pose 11 and 12. Every x and y is `(v - origin) / scale`, and every z is `v / scale`. A missing hand is 63 zeros with its flag 0. **No pose → the whole vector is zeros** (the frame is unusable). Left-handed signing is handled by a mirror augmentation in training (flip x and swap the slots), not in this function.

---

### Task 1: Shared feature definition (Python) and fixture

**Files:** Create `ml/pyproject.toml`, `ml/features.py`, `ml/fixtures/features_cases.json`, `ml/tests/test_features.py`, `ml/.gitignore` (`work/`, `models/`, `.venv/`)

**Interfaces:** Produces `frame_features(hands: list[Hand], pose: list[Point] | None) -> np.ndarray[149]` where `Hand = {"label": "Left"|"Right", "points": [[x,y,z]*21]}`, `Point = [x,y,z]` (33 pose points). The fixture is a JSON list of `{name, hands, pose, expected}`.

- [ ] Step 1: Write tests: `test_shape_is_149`, `test_no_pose_is_all_zeros`, `test_missing_left_hand_zero_slot_and_flag`, `test_shoulder_midpoint_maps_to_origin` (a point at the shoulder midpoint → (0, 0)), `test_scale_by_shoulder_width` (a point one shoulder-width right of origin → x = 1.0), `test_fixture_cases_match` (every case in the fixture within 1e-6).
- [ ] Step 2: `cd ml && uv venv -p 3.12 && uv pip install -e .[dev] && uv run pytest -q` → fails (module missing).
- [ ] Step 3: Implement `frame_features` per the pinned definition. Generate `features_cases.json` with 6 cases (both hands; right only; left only; no pose; rotated shoulders; zero-width shoulders, which must return zeros rather than divide by zero) by calling the function, then hand-check two values per case against the definition.
- [ ] Step 4: `uv run pytest -q` → all pass.
- [ ] Step 5: Commit `feat(ml): shared 149-float feature definition with fixture`.

### Task 2: TypeScript twin of the features

**Files:** Create `FSL/src/recognition/types.ts`, `FSL/src/recognition/features.ts`, `FSL/src/recognition/__tests__/features.test.ts`; add script `"test:recognition": "node --experimental-strip-types --test src/recognition/__tests__/"` to `FSL/package.json`.

**Interfaces:** Consumes the fixture from Task 1. Produces in `types.ts`: `type Vec3 = [number, number, number]`, `interface HandInput { label: 'Left' | 'Right'; points: Vec3[] }`, `type FeatureFrame = { t: number; v: Float32Array }` (149), `interface Guess { label: string; score: number }`. `features.ts` exports `FEATURE_SIZE = 149` and `frameFeatures(hands: HandInput[], pose: Vec3[] | null): Float32Array`. No imports from `@/` (so Node can run the tests directly).

- [ ] Step 1: Test `fixture cases match within 1e-4` reads `../../../../ml/fixtures/features_cases.json` and compares every case; test `no pose gives zeros`.
- [ ] Step 2: `cd FSL && npm run test:recognition` → fails.
- [ ] Step 3: Implement `frameFeatures`.
- [ ] Step 4: Tests pass; `npx tsc --noEmit` passes.
- [ ] Step 5: Commit `feat(recognition): TS feature twin checked against the Python fixture`.

### Task 3: Data, extraction, training and export

Needs FSL-105 downloaded. First ask the owner for network access to `data.mendeley.com` and the hosts its download link redirects to (an environment-update prompt). If declined, give the owner `ml/extract.py` plus the instructions in `ml/README.md` to run locally, and continue from their uploaded `points.npz`.

**Files:** Create `ml/download_models.py` (fetches `hand_landmarker.task` and `pose_landmarker_lite.task` from `storage.googleapis.com/mediapipe-models/...` into `ml/models/`), `ml/extract.py`, `ml/train.py`, `ml/export.py`, `ml/README.md`, `ml/tests/test_export.py`; outputs into `FSL/assets/models/fsl105/`.

**Interfaces:** `extract.py --videos DIR --out ml/work/points.npz` writes arrays `X` (N, 32, 149) float32 (each clip uniformly resampled to 32 frames, using VIDEO running mode with `num_hands=2`), `y` (N,) int, `split` (N,) {"train","test"} from the dataset's own split, and `labels` (105,) str. `export.py` writes `labels.json` as `[{"index": i, "label": str, "category": str}]` plus `metrics.md`.

- [ ] Step 1: Test `test_export.py`: `labels.json` has 105 entries with unique indices 0..104; `model.tflite` loads in `tf.lite.Interpreter` and `interpreter.get_signature_runner()` (or the op list) contains no `Flex` ops; TF.js `model.json` exists with input shape `[null, 32, 149]`; `metrics.md` reports top-1 ≥ 0.85 and top-5 ≥ 0.95.
- [ ] Step 2: Run it → fails (no outputs).
- [ ] Step 3: Implement `extract.py` (4 worker processes; skip and log clips that fail to decode), then run it.
- [ ] Step 4: Implement `train.py`: input (32, 149) → Conv1D 64, k5 → Conv1D 128, k5, stride 2 → Conv1D 128, k3 → GlobalAveragePooling → Dropout 0.3 → Dense 105 softmax (BatchNorm + ReLU after each conv). Augment the train split only: mirror (flip x, swap hand slots and their flags) p = 0.5, rotation ±10°, scale ±10%, time-stretch 0.8–1.2 by resampling, random frame drop to zeros 10%. Adam 1e-3, early stopping on a 10% validation slice of the train split, at most 150 epochs. Then run it.
- [ ] Step 5: Implement `export.py` and run it; then `uv run pytest -q` → all pass. If the targets are missed, iterate on training (not the test split) and record what changed in `metrics.md`.
- [ ] Step 6: Commit `feat(ml): FSL-105 extraction, training and export (top-1 X.XX)` with the model files.

### Task 4: Segmentation and decision (pure TS)

**Files:** Create `FSL/src/recognition/segmenter.ts`, `FSL/src/recognition/decide.ts`, `FSL/src/recognition/__tests__/segmenter.test.ts`, `FSL/src/recognition/__tests__/decide.test.ts`.

**Interfaces:** `createSegmenter(opts?: { motionThreshold?: number; endStillMs?: number; minMs?: number; maxMs?: number })` returns `{ push(frame: FeatureFrame): Segment | null; reset(): void }`, where `Segment = { frames: FeatureFrame[]; reason: 'ended' | 'maxLength' }`. Defaults: `endStillMs = 300`, `minMs = 300`, `maxMs = 3000`, `motionThreshold = 0.02` (mean absolute per-frame change of hand x/y in normalised units). `resampleTo32(frames: FeatureFrame[]): Float32Array` (32 × 149, uniform in time; matches `extract.py`'s resampling). `decide(guesses: Guess[], opts?: { minScore?: number; minMargin?: number }): { kind: 'read'; label: string; score: number } | { kind: 'unsure'; top: Guess[] }`, defaults `minScore = 0.6`, `minMargin = 0.2`.

- [ ] Step 1: Tests: `still hands never start a segment`; `moving hand starts, 300ms of stillness ends it`; `gap shorter than 300ms continues segment`; `segment under 300ms is dropped`; `cut at 3000ms with reason maxLength`; `no pose frames (all zeros) never start a segment`; `resampleTo32 of 32 frames is identity, of 64 picks every other`; `decide reads when score 0.8 and margin 0.5`; `decide unsure when score 0.55`; `decide unsure when margin 0.1, top 2 returned`.
- [ ] Step 2: `npm run test:recognition` → fails.
- [ ] Step 3: Implement both modules.
- [ ] Step 4: Tests pass; `npx tsc --noEmit` passes.
- [ ] Step 5: Commit `feat(recognition): motion segmentation and confidence decision`.

### Task 5: Web adapters, native stubs and the hook

**Files:** `npm install @mediapipe/tasks-vision@1.2.3 @tensorflow/tfjs@4.22.0` (the network allows the npm registry). Create `FSL/scripts/copy-mediapipe-assets.js` (copies `node_modules/@mediapipe/tasks-vision/wasm/*` and `ml/models/*.task` into `FSL/public/mediapipe/`; run once and commit the copies), `handPoints.web.ts`, `handPoints.ts`, `classifier.web.ts`, `classifier.ts`, `useSignRecognition.ts`, and `__tests__/hook-wiring.test.ts` (tests the pure `createRecognizer` that the hook wraps).

**Interfaces:**
- `types.ts` adds `interface HandPointSource { start(video: HTMLVideoElement | null, onFrame: (f: FeatureFrame, status: 'ok' | 'noPose' | 'noHands') => void): Promise<void>; stop(): void }` and `interface SignClassifier { load(): Promise<void>; predict(window32: Float32Array): Promise<Guess[]> }` (sorted descending, top 5).
- `handPoints.web.ts` exports `createHandPointSource(): HandPointSource`, using `FilesetResolver.forVisionTasks('/mediapipe')` and `HandLandmarker` and `PoseLandmarker` in VIDEO mode, driven by `requestAnimationFrame`, then `frameFeatures`. `handPoints.ts` (native) exports the same and rejects with `Error('unavailable')`.
- `classifier.web.ts` exports `createClassifier(modelUrl: string, labelsUrl: string): SignClassifier` (TF.js `loadLayersModel` or `loadGraphModel`, whichever `export.py` produced). `classifier.ts` (native) rejects `unavailable`.
- `useSignRecognition.ts` exports `createRecognizer(classifier: SignClassifier, onResult: (r: RecognitionEvent) => void)` returning `{ push(f: FeatureFrame, status): void }`, and `useSignRecognition(video: HTMLVideoElement | null, enabled: boolean): { state: 'loading' | 'ready' | 'unavailable'; reason?: 'noCamera' | 'noModel' | 'platform'; last?: RecognitionEvent; hint?: 'moveBack' | null }`, where `RecognitionEvent = ReturnType<typeof decide>`.

- [ ] Step 1: Tests for `createRecognizer` with a fake classifier: `emits read event after a segment ends`; `emits unsure with top 2`; `noPose status for 1s sets hint moveBack`; `classifier load failure gives unavailable/noModel` (Review Focus 5).
- [ ] Step 2: Run → fails.
- [ ] Step 3: Implement the adapters, stubs and hook.
- [ ] Step 4: Tests pass; `npx tsc --noEmit` passes; `CI=1 npx expo export -p ios` succeeds and its bundle contains no `tasks-vision` or `tfjs` strings (`grep -c` → 0).
- [ ] Step 5: Commit `feat(recognition): MediaPipe and TF.js web adapters behind interfaces`.

### Task 6: Translate screen integration and credits

**Files:** Create `FSL/src/components/asl/WebCameraView.web.tsx` and `WebCameraView.tsx` (native: re-exports `CameraView`); modify `FSL/src/app/index.tsx`, `FSL/src/components/asl/DetectionHUD.tsx`; add credits (a "Credits" row at the bottom of Dictionary opening a sheet); create `FSL/e2e/recognition.spec.js`.

**Interfaces:** Consumes `useSignRecognition` (Task 5). `DetectionHUD` gains `unavailableReason?: 'notTrained' | 'noModel' | 'noCamera' | 'platform'`, `hint?: 'moveBack' | null` and `onPickGuess?: (label: string) => void`. `RECOGNITION_ENABLED` is replaced by `recognitionFor(mode)`: Words → the hook's state; ABC and 123 → `notTrained`.

Copy (exact): notTrained "Letters and numbers aren't trained yet. Switch to Words."; noModel "The sign model didn't load. Restart the app."; noCamera "Allow the camera to read signs."; platform "Sign reading isn't available on this device yet."; moveBack "Move back so your shoulders are in view."; credit "Sign recognition trained on FSL-105 by Isaiah Jassen Tupal (2023), CC BY 4.0."

- [ ] Step 1: Playwright e2e (`node e2e/recognition.spec.js`): convert 3 FSL-105 test clips to `.y4m`, launch Chromium with `--use-file-for-fake-video-capture=<clip>`, block every non-localhost request (`page.route('**', r => isLocal ? r.continue() : r.abort())`), open `/`, switch to Words, and assert the clip's label appears in the sentence within 6 s. Also assert that in ABC mode the notTrained copy shows.
- [ ] Step 2: Run against `npx expo start --web` → fails.
- [ ] Step 3: Implement the screen changes (low-confidence chips call `onPickGuess`, which appends that label).
- [ ] Step 4: e2e passes for at least 2 of 3 clips (record which); `npx tsc --noEmit` passes; screenshots at 375 and 1280 widths look right in light and dark.
- [ ] Step 5: Commit `feat(translate): live FSL word recognition in the web build`.

### Task 7: Owner's live check (manual)

- [ ] Owner picks 10 FSL-105 signs, runs `npx expo start --web` on their laptop with Wi-Fi off after loading, and copies each sign from the dataset videos. Record the result (target: 8 of 10) and the misses in `ml/README.md`. Tune `minScore` and `minMargin` only if misses are "unsure" rather than wrong.
