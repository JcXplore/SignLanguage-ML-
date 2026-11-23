"""Train the FSL-105 sign classifier on extracted feature sequences.

Usage: python train.py [--points work/points.npz] [--epochs 150] [--seed 105]

Writes work/model.keras and work/metrics.json (test top-1/top-5, per-sign
accuracy, confusions). Only the dataset's own train split is used for
training and validation; the test split is touched once, at the end.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from augment import random_augment
from windows import WINDOW, resample_to_32, sign_span

HERE = Path(__file__).parent
WORK = HERE / "work"
FEATURES = 149
CROP = 0.15  # random trim of up to 15% of the active span at each end


def load(points: Path):
    d = np.load(points, allow_pickle=False)
    offsets = d["offsets"]
    seqs = [d["frames"][offsets[i] : offsets[i + 1]].astype(np.float32) for i in range(len(offsets) - 1)]
    return seqs, d["y"], d["split"], list(d["labels"]), list(d["categories"])


def eval_window(seq: np.ndarray) -> np.ndarray:
    a, b = sign_span(seq)
    return resample_to_32(seq[a:b])


def train_window(seq: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    a, b = sign_span(seq)
    n = b - a
    a2 = a + int(rng.uniform(0, CROP) * n)
    b2 = b - int(rng.uniform(0, CROP) * n)
    if b2 - a2 < 4:
        a2, b2 = a, b
    return resample_to_32(random_augment(seq[a2:b2], rng))


def build_model(num_classes: int):
    import keras
    from keras import layers

    inp = keras.Input((WINDOW, FEATURES))
    x = inp
    for filters, kernel, stride in ((64, 5, 1), (128, 5, 2), (128, 3, 1)):
        x = layers.Conv1D(filters, kernel, strides=stride, padding="same", use_bias=False)(x)
        x = layers.BatchNormalization()(x)
        x = layers.ReLU()(x)
    x = layers.GlobalAveragePooling1D()(x)
    x = layers.Dropout(0.3)(x)
    out = layers.Dense(num_classes, activation="softmax")(x)
    return keras.Model(inp, out)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--points", default=str(WORK / "points.npz"))
    ap.add_argument("--epochs", type=int, default=150)
    ap.add_argument("--seed", type=int, default=105)
    args = ap.parse_args()

    import keras
    import tensorflow as tf

    keras.utils.set_random_seed(args.seed)
    rng = np.random.default_rng(args.seed)
    seqs, y, split, labels, categories = load(Path(args.points))
    num_classes = len(labels)

    train_idx = np.flatnonzero(split == "train")
    test_idx = np.flatnonzero(split == "test")
    rng.shuffle(train_idx)
    n_val = max(1, len(train_idx) // 10)
    val_idx, fit_idx = train_idx[:n_val], train_idx[n_val:]

    x_val = np.stack([eval_window(seqs[i]) for i in val_idx])
    x_test = np.stack([eval_window(seqs[i]) for i in test_idx])

    def batches():
        while True:
            order = rng.permutation(fit_idx)
            for s in range(0, len(order), 32):
                chunk = order[s : s + 32]
                yield np.stack([train_window(seqs[i], rng) for i in chunk]), y[chunk]

    model = build_model(num_classes)
    model.compile(
        optimizer=keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.fit(
        batches(),
        steps_per_epoch=int(np.ceil(len(fit_idx) / 32)),
        epochs=args.epochs,
        validation_data=(x_val, y[val_idx]),
        callbacks=[
            keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=25, restore_best_weights=True),
            keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=10),
        ],
        verbose=2,
    )

    probs = model.predict(x_test, verbose=0)
    y_test = y[test_idx]
    top5 = np.argsort(-probs, axis=1)[:, :5]
    pred = top5[:, 0]
    per_sign = {
        labels[c]: float((pred[y_test == c] == c).mean()) for c in range(num_classes) if (y_test == c).any()
    }
    confusions: dict[str, int] = {}
    for t, p in zip(y_test, pred):
        if t != p:
            key = f"{labels[t]} -> {labels[p]}"
            confusions[key] = confusions.get(key, 0) + 1
    metrics = {
        "top1": float((pred == y_test).mean()),
        "top5": float((top5 == y_test[:, None]).any(axis=1).mean()),
        "n_train": int(len(fit_idx)),
        "n_val": int(len(val_idx)),
        "n_test": int(len(test_idx)),
        "per_sign": per_sign,
        "confusions": dict(sorted(confusions.items(), key=lambda kv: -kv[1])),
        "labels": labels,
        "categories": categories,
    }
    WORK.mkdir(exist_ok=True)
    model.save(WORK / "model.keras")
    np.save(WORK / "test_windows.npy", x_test[:8])
    (WORK / "metrics.json").write_text(json.dumps(metrics, indent=1))
    print(f"test top-1 {metrics['top1']:.4f}  top-5 {metrics['top5']:.4f}")


if __name__ == "__main__":
    main()
