# Offline sign recognition, milestone 1: words in the laptop browser

Status: draft for approval · 2026-11-23

## Why

SignBridge (the Expo app in `FSL/`) is meant to read Filipino Sign Language
(FSL) from the camera and turn it into text and speech. Today recognition is
switched off (`RECOGNITION_ENABLED = false` in `FSL/src/app/index.tsx`) and
nothing real is read. The owner is not publishing the app, but it must work
with **no internet connection** once installed. Video must never leave the
device; the app's camera permission text already promises this.

This milestone proves real recognition end to end in the fastest place to
iterate, the app's web build running on a laptop, and builds everything so
it moves to the phone later with one swappable piece.

## Goals

1. A trained classifier for the **105 signs of the FSL-105 dataset** (words
   and phrases, signed by Deaf FSL signers and checked by an FSL expert).
2. The Translate screen's **Words** mode reads those signs live from the
   laptop webcam in the web build, adds them to the sentence, and Speak reads
   them out, all with Wi-Fi off.
3. The recognition logic is platform-neutral, so the phone port (milestone 3)
   only replaces the camera-to-hand-points step and the model runner.

### Success looks like

- Held-out FSL-105 test split: top-1 accuracy of at least 85%, top-5 of at
  least 95%. Report the per-sign confusion, not only the average.
- Live: someone copying the dataset videos in front of a laptop webcam gets at
  least 8 of 10 chosen signs read correctly. The owner picks the 10.
- A sign appears within about half a second of the signer finishing it.
- Works after turning off the network, with the page reloaded.

## Non-goals (later milestones)

- The alphabet and numbers (ABC / 123 modes). That is milestone 2, using the
  Roboflow FSL alphabet set plus the owner's own recordings.
- Running on the phone. That is milestone 3 (native camera plugin, MediaPipe,
  TensorFlow Lite, development build).
- Sentence grammar, or reading continuous signing without pauses.
- Any server.

## Anti-goals (failure even if it "works")

- Any frame, hand point or result sent over the network, or any model or WASM
  file fetched from a CDN at runtime. Everything ships with the app.
- Showing a sign as read when the model isn't confident. Low confidence shows
  "Not sure yet" (the state already exists in `DetectionHUD`).
- Breaking the native app build. Web-only code and packages stay out of the
  iOS and Android bundles.

## Data

- **FSL-105**: Mendeley Data, DOI 10.17632/48y2y99mb9.2. About 2,130
  four-second clips across 105 signs in 10 categories, with a provided
  train/test split. The licence is reported as CC BY 4.0; confirm it on the
  Mendeley page before use.
- Raw videos and extracted hand points are **not committed** (too large). Both
  are regenerable from scripts. Trained model files (well under 5 MB) **are**
  committed.
- **Access:** this cloud environment blocks Mendeley. First choice is the owner
  approving network access for `data.mendeley.com` and the hosts its download
  redirects to; the processing then runs here. Fallback: the owner runs the
  extraction script on their own computer and uploads the hand-point file.
- **Credit:** add a short "Credits" entry in the app naming FSL-105 and its
  author (CC BY requires attribution).

## Approaches considered

| Approach | Trade-off |
|---|---|
| **A. Laptop browser first, then phone (chosen)** | Fastest to see real recognition and test the model. Phone port later reuses the model, the logic and the UI; only the camera-to-points step and the model runner change (about a few days). |
| B. Native on the phone directly | Smoothest final result, but needs a development build and community MediaPipe plugins up front, before anything is proven. |
| C. MediaPipe inside a web view in the app | One code path everywhere, but loading the WASM and models fully offline inside a web view is fiddly, and it runs slower. |

The owner chose A.

## How it works

```
webcam ─► hand points (MediaPipe, in browser) ─► window of frames ─► classifier ─► smoothing ─► sentence
          [swapped on phone]                                         [runner swapped on phone]
```

### 1. Features (shared by training and the app)

- Per frame: **both hands**, 21 points each (x, y, z), from MediaPipe Hand
  Landmarker, plus **upper-body pose points** (nose, both shoulders, both
  elbows, both wrists) from MediaPipe Pose Landmarker. Many FSL words are told
  apart by *where* the hand is (face, chest), which hand points alone don't
  capture.
- Normalise per frame: translate to the shoulder midpoint, scale by shoulder
  width, and mirror so the dominant hand is always on the same side. A missing
  hand becomes zeros plus a "present" flag.
- **One implementation of the normalisation** in TypeScript for the app and
  one in Python for training, with a shared test fixture (the same input must
  give the same output to 1e-4). This is the main thing that keeps the web and
  phone versions from drifting.

### 2. Training (Python, in a new top-level `ml/` folder)

- `ml/extract.py`: videos to hand and pose points, sampled at a fixed rate,
  written to one compressed file. Uses MediaPipe's Python package. MediaPipe
  may not support Python 3.13 yet, so use a 3.11 or 3.12 virtual environment.
- `ml/train.py`: fixed-length windows (resample each clip to a fixed number of
  frames), light augmentation (small rotation, scale, time-stretch, dropped
  frames), small model.
- **Model constraint:** it must export cleanly to **both** TensorFlow.js (now)
  and TensorFlow Lite (milestone 3) **without custom or "flex" ops**. A small
  1D temporal-convolution network is the safe default; a GRU is allowed only
  if its TFLite export is verified without flex ops.
- `ml/export.py`: writes the browser model, the `.tflite` model,
  `labels.json` (index to sign name and category) and a `metrics.md` with
  test accuracy and the confusion summary.
- Outputs land in `FSL/assets/models/fsl105/`.

### 3. Recognition in the app (TypeScript, in `FSL/src/recognition/`)

Two interfaces, and everything else is shared:

- `HandPointSource`: starts the camera and emits normalised feature frames
  with timestamps. Web implementation: `*.web.ts` using
  `@mediapipe/tasks-vision`, with its WASM and `.task` model files copied into
  the app (`FSL/public/` or bundled assets) so nothing loads from a CDN.
  Native implementation: a stub that reports "unavailable" until milestone 3.
- `SignClassifier`: takes a window of frames and returns ranked guesses with
  scores. Web implementation: TensorFlow.js loading the local model. Native:
  a stub until milestone 3.
- `useSignRecognition()` (shared): a hook that owns
  - **segmentation**: FSL-105 has no "no sign" class, so start a capture when
    a hand appears and moves, and end it when the hands rest or drop for
    about 300 ms, or after 3 s;
  - **decision**: accept the top guess only above a confidence threshold, and
    only if it beats the second guess by a margin; otherwise show
    "Not sure yet" with the top two as tappable chips (as in the review plan);
  - output into the existing `detectedSign`, `confidence` and sentence state
    of the Translate screen.
- Web-only packages (`@mediapipe/tasks-vision`, `@tensorflow/tfjs`) are
  imported only from `.web.ts` files, so the native bundles never include
  them.

### 4. Screen changes (Translate)

- The single `RECOGNITION_ENABLED` flag becomes **per mode**: Words is on when
  `HandPointSource` and the model are available; ABC and 123 show "Not trained
  yet" in the existing notice card.
- On web the camera preview must expose its video element to MediaPipe. If
  `expo-camera`'s web `CameraView` doesn't allow that, use a small web-only
  camera view built on `getUserMedia` and a `<video>` element.
- Keep the dev test chips, so the flow can be tested without signing.

## Decided

- Laptop browser first; the phone comes later (owner).
- Recognise FSL-105's 105 words first; the alphabet comes later (proposed here
  because FSL-105 is the best-quality free FSL data; owner to confirm).
- Fully offline, no server, nothing fetched at runtime (owner).
- Hands plus upper-body pose features; one shared normalisation with a test.
- Models committed; raw data and extracted points not committed.

## Left to the builder

- Frame rate, window length, model size and hyperparameters, within the
  success targets and the export constraint.
- Confidence and margin thresholds (tune on the test split, then live).
- Whether hand-point extraction runs here or on the owner's computer,
  depending on the network-access approval.
- Exact file names inside `ml/` and `FSL/src/recognition/`.
