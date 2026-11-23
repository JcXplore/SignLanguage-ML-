"""Test-split accuracy when signs are cut the way the live app cuts them (windows.live_segments).

Usage: python eval_live.py   (reads work/points.npz and work/model.keras)
"""

import json
from collections import Counter
from pathlib import Path

import numpy as np

from train import load
from windows import live_segments, resample_to_32

WORK = Path(__file__).parent / "work"

if __name__ == "__main__":
    import keras

    model = keras.models.load_model(WORK / "model.keras")
    seqs, y, split, labels, _ = load(WORK / "points.npz")
    idx = np.flatnonzero(split == "test")
    n_segs = Counter()
    longest_ok = read_ok = wrong_read = 0
    for i in idx:
        segs = live_segments(seqs[i])
        n_segs[min(len(segs), 3)] += 1
        if not segs:
            continue
        windows = np.stack([resample_to_32(seqs[i][a:b]) for a, b, _ in segs])
        probs = model.predict(windows, verbose=0)
        longest = int(np.argmax([b - a for a, b, _ in segs]))
        longest_ok += int(np.argmax(probs[longest]) == y[i])
        for p in probs:  # what the app would do with each segment (decide.ts defaults)
            top = np.sort(p)[::-1]
            if top[0] >= 0.6 and top[0] - top[1] >= 0.2:
                read_ok += int(np.argmax(p) == y[i])
                wrong_read += int(np.argmax(p) != y[i])
    n = len(idx)
    result = {
        "clips": n,
        "segments_per_clip": {"0": n_segs[0], "1": n_segs[1], "2": n_segs[2], "3+": n_segs[3]},
        "longest_segment_top1": round(longest_ok / n, 4),
        "confident_correct_reads": read_ok,
        "confident_wrong_reads": wrong_read,
    }
    print(json.dumps(result, indent=1))
    (WORK / "live_metrics.json").write_text(json.dumps(result, indent=1))
