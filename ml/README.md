# SignBridge sign recognition: training

Trains the offline FSL word recognizer used by the app's Translate screen.
Everything here runs on a laptop CPU; nothing in the app ever goes online.

## Data

[FSL-105](https://data.mendeley.com/datasets/48y2y99mb9/2) by Isaiah Jassen
Tupal (2023), CC BY 4.0: 105 Filipino Sign Language words and phrases, about
20 four-second clips each, signed by Deaf FSL signers and checked by an FSL
expert. The dataset's own train/test split is used.

Raw videos and extracted points live in `work/` and are not committed.

## Steps

Needs Python 3.11 or 3.12 (MediaPipe), [uv](https://docs.astral.sh/uv/), and
on Linux the EGL library (`apt-get install libegl1 libgles2`).

```bash
uv venv -p 3.12 .venv
uv pip install -p .venv/bin/python -e ".[dev]"
```

1. **Download** the dataset files (`clips.zip`, `labels.csv`, `train.csv`,
   `test.csv`) from the Mendeley page into `work/fsl105/`, and unzip
   `clips.zip` there.
2. **MediaPipe models:** `.venv/bin/python download_models.py`
3. **Extract** hand and pose points (about an hour on 4 cores):
   `.venv/bin/python extract.py --workers 4` writes `work/points.npz`.
4. **Train:** `.venv/bin/python train.py` writes `work/model.keras` and
   `work/metrics.json`.
5. **Export** into the app: `.venv/bin/python export.py` writes
   `../FSL/assets/models/fsl105/`.
6. **Check:** `.venv/bin/python -m pytest -q`, then in `../FSL`
   `npm run test:recognition`.

After changing `download_models.py`'s models, run
`node scripts/copy-mediapipe-assets.js` in `../FSL` so the web build serves
them from `public/mediapipe/`.

## How it fits together

- `features.py` defines the 149 numbers per video frame (both hands, upper
  body, normalised to the shoulders). `FSL/src/recognition/features.ts` is its
  twin; both are checked against `fixtures/features_cases.json`.
- `windows.py` trims a clip to where the hands move and resamples it to 32
  frames, matching the app's live segmenter (`segmenter.ts`).
- The model is a small 1-D convolution network. `export.py` folds BatchNorm
  into the convolutions and writes `model.json` + `weights.bin` for the app's
  own TypeScript runner (`convnet.ts`), plus `model.tflite` for the phone
  version later. `fixtures/tiny_net/` checks the TypeScript runner against
  Keras.

## Live check

(Filled in after the owner's test: the 10 signs tried, how many were read,
and the misses.)
