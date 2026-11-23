"""FSL-105 videos -> per-frame feature sequences (ml/work/points.npz).

Usage: python extract.py [--data work/fsl105] [--out work/points.npz] [--workers 4] [--limit N]

Each clip is read at 30 fps (every second frame of the 60 fps source), run
through MediaPipe Hand Landmarker (2 hands) and Pose Landmarker (lite) in
VIDEO mode, and turned into 149-float frames by features.frame_features.
Full sequences are stored (not resampled) so training can trim and augment.
"""

from __future__ import annotations

import argparse
import csv
import logging
import os
from multiprocessing import Pool
from pathlib import Path

import numpy as np

from features import FEATURE_SIZE, frame_features

HERE = Path(__file__).parent
TARGET_FPS = 30

_hands = None
_pose = None
_clock_ms = 0


def _init_worker() -> None:
    global _hands, _pose
    os.environ.setdefault("GLOG_minloglevel", "2")
    from mediapipe.tasks.python import BaseOptions, vision

    _hands = vision.HandLandmarker.create_from_options(
        vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(HERE / "models" / "hand_landmarker.task")),
            running_mode=vision.RunningMode.VIDEO,
            num_hands=2,
        )
    )
    _pose = vision.PoseLandmarker.create_from_options(
        vision.PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(HERE / "models" / "pose_landmarker_lite.task")),
            running_mode=vision.RunningMode.VIDEO,
        )
    )


def extract_clip(path: str) -> np.ndarray | None:
    """Return a (T, 149) float16 sequence, or None if the clip can't be read."""
    global _clock_ms
    import cv2
    import mediapipe as mp

    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 60.0
    step = max(1, round(fps / TARGET_FPS))
    frames: list[np.ndarray] = []
    i = 0
    while True:
        ok, bgr = cap.read()
        if not ok:
            break
        if i % step == 0:
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            # VIDEO mode needs strictly increasing timestamps across the worker's lifetime.
            _clock_ms += int(1000 / TARGET_FPS)
            h = _hands.detect_for_video(image, _clock_ms)
            p = _pose.detect_for_video(image, _clock_ms)
            hands = [
                {"label": hd[0].category_name, "points": [[lm.x, lm.y, lm.z] for lm in pts]}
                for pts, hd in zip(h.hand_landmarks, h.handedness)
            ]
            pose = [[lm.x, lm.y, lm.z] for lm in p.pose_landmarks[0]] if p.pose_landmarks else None
            frames.append(frame_features(hands, pose))
        i += 1
    cap.release()
    if not frames:
        return None
    return np.stack(frames).astype(np.float16)


def _job(item: tuple[int, str]) -> tuple[int, np.ndarray | None]:
    idx, path = item
    try:
        return idx, extract_clip(path)
    except Exception as e:  # one bad clip must not stop the run
        logging.warning("failed %s: %s", path, e)
        return idx, None


def load_index(data: Path) -> tuple[list[dict], list[str], list[str]]:
    with open(data / "labels.csv", encoding="utf-8-sig") as f:
        rows = sorted(csv.DictReader(f), key=lambda r: int(r["id"]))
    labels = [r["label"] for r in rows]
    categories = [r["category"] for r in rows]
    clips = []
    for split in ("train", "test"):
        with open(data / f"{split}.csv", encoding="utf-8-sig") as f:
            for r in csv.DictReader(f):
                clips.append({
                    "path": str(data / r["vid_path"].replace("\\", "/")),
                    "y": int(r["id_label"]),
                    "split": split,
                })
    return clips, labels, categories


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(HERE / "work" / "fsl105"))
    ap.add_argument("--out", default=str(HERE / "work" / "points.npz"))
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    clips, labels, categories = load_index(Path(args.data))
    if args.limit:
        clips = clips[: args.limit]
    results: dict[int, np.ndarray] = {}
    with Pool(args.workers, initializer=_init_worker) as pool:
        for n, (idx, seq) in enumerate(pool.imap_unordered(_job, list(enumerate(c["path"] for c in clips)), chunksize=4)):
            if seq is not None:
                results[idx] = seq
            if n % 100 == 0:
                logging.info("%d/%d clips", n, len(clips))

    kept = sorted(results)
    seqs = [results[i] for i in kept]
    offsets = np.cumsum([0] + [len(s) for s in seqs])
    np.savez_compressed(
        args.out,
        frames=np.concatenate(seqs) if seqs else np.zeros((0, FEATURE_SIZE), np.float16),
        offsets=offsets,
        y=np.array([clips[i]["y"] for i in kept]),
        split=np.array([clips[i]["split"] for i in kept]),
        paths=np.array([clips[i]["path"] for i in kept]),
        labels=np.array(labels),
        categories=np.array(categories),
    )
    logging.info("wrote %s: %d clips (%d skipped), %d frames", args.out, len(kept), len(clips) - len(kept), offsets[-1])


if __name__ == "__main__":
    main()
