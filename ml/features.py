"""The shared per-frame feature definition.

This is the single source of truth for what the classifier sees. The app has
a TypeScript twin in FSL/src/recognition/features.ts; both are checked against
fixtures/features_cases.json, so any change here must regenerate the fixture
(python features.py --write-fixture) and keep the TS tests green.

Layout (149 float32):
  [0..62]    right-hand slot: 21 landmarks x (x, y, z)
  [63..125]  left-hand slot:  21 landmarks x (x, y, z)
  [126]      right hand present (0/1)
  [127]      left hand present (0/1)
  [128..148] pose points 0 (nose), 11, 12 (shoulders), 13, 14 (elbows),
             15, 16 (wrists) x (x, y, z)

Normalisation: origin is the midpoint of pose points 11 and 12 (x, y; z
origin 0); scale is the 2-D distance between them. x and y become
(v - origin) / scale, z becomes v / scale. No pose, or shoulders on top of
each other, means the frame is unusable and the whole vector is zeros.
Hand slots follow MediaPipe's handedness label. Left-handed signing is
handled by mirror augmentation in training, not here.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Sequence, TypedDict

import numpy as np

FEATURE_SIZE = 149
HAND_POINTS = 21
POSE_INDICES = (0, 11, 12, 13, 14, 15, 16)
RIGHT_SLOT = 0
LEFT_SLOT = 63
RIGHT_FLAG = 126
LEFT_FLAG = 127
POSE_START = 128
MIN_SCALE = 1e-6


class Hand(TypedDict):
    label: str  # "Left" | "Right"
    points: Sequence[Sequence[float]]  # 21 x [x, y, z]


def frame_features(hands: Sequence[Hand], pose: Sequence[Sequence[float]] | None) -> np.ndarray:
    out = np.zeros(FEATURE_SIZE, dtype=np.float32)
    if pose is None:
        return out
    ls, rs = pose[11], pose[12]
    ox, oy = (ls[0] + rs[0]) / 2.0, (ls[1] + rs[1]) / 2.0
    scale = math.hypot(ls[0] - rs[0], ls[1] - rs[1])
    if scale < MIN_SCALE:
        return out

    def put(offset: int, pts: Sequence[Sequence[float]]) -> None:
        for i, (x, y, z) in enumerate(pts):
            out[offset + 3 * i] = (x - ox) / scale
            out[offset + 3 * i + 1] = (y - oy) / scale
            out[offset + 3 * i + 2] = z / scale

    for hand in hands:
        if hand["label"] == "Right":
            put(RIGHT_SLOT, hand["points"])
            out[RIGHT_FLAG] = 1.0
        elif hand["label"] == "Left":
            put(LEFT_SLOT, hand["points"])
            out[LEFT_FLAG] = 1.0

    put(POSE_START, [pose[i] for i in POSE_INDICES])
    return out


def _fixture_cases() -> list[dict]:
    """Deterministic cases covering each branch of frame_features."""
    rng = np.random.default_rng(105)

    def rand_hand(label: str) -> Hand:
        return {"label": label, "points": rng.uniform(0.2, 0.8, size=(21, 3)).round(4).tolist()}

    def rand_pose(left=None, right=None) -> list[list[float]]:
        pose = rng.uniform(0.2, 0.8, size=(33, 3)).round(4).tolist()
        if left is not None:
            pose[11] = left
        if right is not None:
            pose[12] = right
        return pose

    cases = [
        ("both hands", [rand_hand("Right"), rand_hand("Left")], rand_pose()),
        ("right only", [rand_hand("Right")], rand_pose()),
        ("left only", [rand_hand("Left")], rand_pose()),
        ("no pose", [rand_hand("Right"), rand_hand("Left")], None),
        ("rotated shoulders", [rand_hand("Right")], rand_pose([0.35, 0.40, -0.1], [0.62, 0.55, 0.05])),
        ("zero-width shoulders", [rand_hand("Right")], rand_pose([0.5, 0.5, 0.0], [0.5, 0.5, 0.0])),
        ("no hands", [], rand_pose()),
    ]
    return [
        {"name": n, "hands": h, "pose": p, "expected": frame_features(h, p).round(6).tolist()}
        for n, h, p in cases
    ]


if __name__ == "__main__":
    if sys.argv[1:] == ["--write-fixture"]:
        path = Path(__file__).parent / "fixtures" / "features_cases.json"
        path.write_text(json.dumps(_fixture_cases(), indent=1))
        print(f"wrote {path}")
    else:
        print("usage: python features.py --write-fixture")
