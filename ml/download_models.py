"""Download the MediaPipe task models used for training and copied into the app."""

import urllib.request
from pathlib import Path

MODELS = {
    "hand_landmarker.task": "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    "pose_landmarker_lite.task": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
}

if __name__ == "__main__":
    out = Path(__file__).parent / "models"
    out.mkdir(exist_ok=True)
    for name, url in MODELS.items():
        target = out / name
        if not target.exists():
            urllib.request.urlretrieve(url, target)
        print(name, target.stat().st_size)
