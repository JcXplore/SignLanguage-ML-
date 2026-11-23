"""Training-time augmentations on (T, 149) feature sequences (see features.py for the layout)."""

from __future__ import annotations

import numpy as np

RIGHT = slice(0, 63)
LEFT = slice(63, 126)
RIGHT_FLAG, LEFT_FLAG = 126, 127
POSE = slice(128, 149)
# pose order in the vector: nose, 11, 12, 13, 14, 15, 16 -> swap left/right pairs
POSE_SWAP = [0, 2, 1, 4, 3, 6, 5]


def _points(seq: np.ndarray) -> np.ndarray:
    """View of all 49 (x, y, z) points per frame: (T, 49, 3)."""
    return np.concatenate([seq[:, RIGHT], seq[:, LEFT], seq[:, POSE]], axis=1).reshape(len(seq), 49, 3)


def _write_points(seq: np.ndarray, pts: np.ndarray) -> np.ndarray:
    out = seq.copy()
    flat = pts.reshape(len(seq), 147)
    out[:, RIGHT], out[:, LEFT], out[:, POSE] = flat[:, :63], flat[:, 63:126], flat[:, 126:]
    return out


def _zero_absent(seq: np.ndarray, empty: np.ndarray) -> np.ndarray:
    seq[seq[:, RIGHT_FLAG] == 0, RIGHT] = 0
    seq[seq[:, LEFT_FLAG] == 0, LEFT] = 0
    seq[empty] = 0
    return seq


def mirror(seq: np.ndarray) -> np.ndarray:
    """Left-right mirror: negate x, swap hand slots (and flags) and left/right pose points."""
    empty = ~seq.any(axis=1)
    out = seq.copy()
    out[:, RIGHT], out[:, LEFT] = seq[:, LEFT], seq[:, RIGHT]
    out[:, RIGHT_FLAG], out[:, LEFT_FLAG] = seq[:, LEFT_FLAG], seq[:, RIGHT_FLAG]
    pose = seq[:, POSE].reshape(len(seq), 7, 3)[:, POSE_SWAP]
    out[:, POSE] = pose.reshape(len(seq), 21)
    out[:, 0:126:3] *= -1
    out[:, 128:149:3] *= -1
    return _zero_absent(out, empty)


def rotate_scale(seq: np.ndarray, degrees: float, scale: float) -> np.ndarray:
    """Rotate x/y around the shoulder-midpoint origin and scale all coordinates."""
    empty = ~seq.any(axis=1)
    a = np.deg2rad(degrees)
    c, s = np.cos(a), np.sin(a)
    pts = _points(seq).copy()
    x, y = pts[..., 0].copy(), pts[..., 1].copy()
    pts[..., 0] = (c * x - s * y) * scale
    pts[..., 1] = (s * x + c * y) * scale
    pts[..., 2] *= scale
    return _zero_absent(_write_points(seq, pts), empty)


def random_augment(seq: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """The training recipe: mirror p=0.5, rotation ±10°, scale ±10%, drop 10% of frames to zeros."""
    out = mirror(seq) if rng.random() < 0.5 else seq
    out = rotate_scale(out, rng.uniform(-10, 10), rng.uniform(0.9, 1.1))
    drop = rng.random(len(out)) < 0.1
    out = out.copy()
    out[drop] = 0
    return out
