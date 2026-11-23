"""Turning a variable-length feature sequence into the model's fixed window.

resample_to_32 must match resampleTo32 in FSL/src/recognition/segmenter.ts:
frame i of the window is source frame round(i * (n - 1) / 31).

active_span approximates what the app's motion segmenter captures live: the
stretch where the hands move, so training windows look like live segments
rather than whole clips with idle time at both ends.
"""

from __future__ import annotations

import numpy as np

WINDOW = 32
MOTION_THRESHOLD = 0.02  # same default as the app's segmenter
SPAN_PAD = 4  # frames kept either side of the moving stretch
RIGHT_XY = np.array([i for i in range(0, 63) if i % 3 != 2])
LEFT_XY = np.array([i for i in range(63, 126) if i % 3 != 2])
RIGHT_FLAG, LEFT_FLAG = 126, 127


def resample_to_32(seq: np.ndarray) -> np.ndarray:
    n = len(seq)
    idx = np.rint(np.arange(WINDOW) * (n - 1) / (WINDOW - 1)).astype(int) if n > 1 else np.zeros(WINDOW, int)
    return seq[idx]


def motion(seq: np.ndarray) -> np.ndarray:
    """Per-frame hand motion vs the previous frame (first frame 0).

    For each hand present in both frames, the mean absolute change of its 42
    x/y values; the frame's motion is the larger of the two hands. A hand that
    appears or disappears counts as no motion.
    """
    s = seq.astype(np.float32)
    out = np.zeros(len(s), np.float32)
    for xy, flag in ((RIGHT_XY, RIGHT_FLAG), (LEFT_XY, LEFT_FLAG)):
        both = (s[1:, flag] > 0) & (s[:-1, flag] > 0)
        d = np.abs(np.diff(s[:, xy], axis=0)).mean(axis=1) * both
        out[1:] = np.maximum(out[1:], d)
    return out


def active_span(seq: np.ndarray) -> tuple[int, int]:
    """[start, end) of the moving stretch, padded; the whole clip if nothing moves."""
    moving = np.flatnonzero(motion(seq) > MOTION_THRESHOLD)
    if len(moving) == 0:
        return 0, len(seq)
    return max(0, moving[0] - SPAN_PAD), min(len(seq), moving[-1] + 1 + SPAN_PAD)


# --- the app's live segmenter (FSL/src/recognition/segmenter.ts), frame-indexed at 30 fps
FRAME_MS = 1000 / 30
END_STILL_MS, MIN_MS, MAX_MS = 300, 300, 3000


def live_segments(seq: np.ndarray) -> list[tuple[int, int, str]]:
    """Segments the app would cut from this sequence: [(start, end), reason]. Same rules as segmenter.ts."""
    m = motion(seq)
    out: list[tuple[int, int, str]] = []
    start = None
    first_move = last_move = 0
    for i in range(len(seq)):
        moving = i > 0 and m[i] > MOTION_THRESHOLD
        t = i * FRAME_MS
        if start is None:
            if moving:
                start = max(0, i - SPAN_PAD)
                first_move = last_move = i
            continue
        if moving:
            last_move = i
        reason = "maxLength" if t - first_move * FRAME_MS >= MAX_MS else "ended" if t - last_move * FRAME_MS >= END_STILL_MS else None
        if reason:
            too_short = (last_move - first_move) * FRAME_MS < MIN_MS
            if not (too_short and reason == "ended"):
                out.append((start, min(i + 1, last_move + 1 + SPAN_PAD), reason))
            start = None
    return out
