"""Export the trained classifier for the app.

Usage: python export.py

Reads work/model.keras and work/metrics.json, writes to FSL/assets/models/fsl105/:
  model.json      layer list for the app's own TypeScript inference (BatchNorm folded in)
  weights.bin     float32 little-endian weights, in model.json order (w then b per layer)
  model.tflite    for the phone (milestone 3); builtin ops only
  labels.json     [{index, label, category}]
  reference.json  a few inputs with Keras's output probabilities (TS parity test)
  metrics.md      test accuracy and the worst signs / most common confusions
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
WORK = HERE / "work"
OUT = HERE.parent / "FSL" / "assets" / "models" / "fsl105"
WINDOW, FEATURES = 32, 149


def same_padding(n: int, kernel: int, stride: int) -> tuple[int, int]:
    """TensorFlow 'same' padding for a 1-D convolution: (left, right)."""
    out = math.ceil(n / stride)
    total = max((out - 1) * stride + kernel - n, 0)
    return total // 2, total - total // 2


def web_layers(model) -> tuple[list[dict], list[np.ndarray]]:
    """Walk the Keras model and return (layer specs, weight arrays), folding BatchNorm into Conv1D."""
    from keras import layers as L

    specs: list[dict] = []
    arrays: list[np.ndarray] = []
    n = WINDOW
    pending = None
    for layer in model.layers:
        if isinstance(layer, L.Conv1D):
            (w,) = layer.get_weights()  # (k, in, out), no bias
            k, stride = layer.kernel_size[0], layer.strides[0]
            left, right = same_padding(n, k, stride)
            pending = {"type": "conv1d", "kernel": k, "stride": stride, "padLeft": left, "padRight": right,
                       "inLength": n, "w": w}
            n = math.ceil(n / stride)
        elif isinstance(layer, L.BatchNormalization):
            gamma, beta, mean, var = layer.get_weights()
            g = gamma / np.sqrt(var + layer.epsilon)
            w = pending.pop("w") * g[None, None, :]
            b = beta - mean * g
            pending.update({"outLength": n, "relu": False, "shapes": {"w": list(w.shape), "b": list(b.shape)}})
            specs.append(pending)
            arrays += [w.astype(np.float32), b.astype(np.float32)]
            pending = None
        elif isinstance(layer, L.ReLU):
            specs[-1]["relu"] = True
        elif isinstance(layer, L.GlobalAveragePooling1D):
            specs.append({"type": "globalAvgPool"})
        elif isinstance(layer, L.Dense):
            w, b = layer.get_weights()
            specs.append({"type": "dense", "softmax": True, "shapes": {"w": list(w.shape), "b": list(b.shape)}})
            arrays += [w.astype(np.float32), b.astype(np.float32)]
        # InputLayer and Dropout carry nothing at inference time
    return specs, arrays


def to_tflite(model) -> bytes:
    import tensorflow as tf

    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]
    return converter.convert()


def main() -> None:
    import keras

    model = keras.models.load_model(WORK / "model.keras")
    metrics = json.loads((WORK / "metrics.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)

    specs, arrays = web_layers(model)
    (OUT / "model.json").write_text(json.dumps(
        {"format": "signbridge-conv1d/1", "input": [WINDOW, FEATURES], "output": len(metrics["labels"]),
         "layers": specs}, indent=1))
    with open(OUT / "weights.bin", "wb") as f:
        for a in arrays:
            f.write(np.ascontiguousarray(a, dtype="<f4").tobytes())

    (OUT / "model.tflite").write_bytes(to_tflite(model))

    (OUT / "labels.json").write_text(json.dumps(
        [{"index": i, "label": l, "category": c} for i, (l, c) in enumerate(zip(metrics["labels"], metrics["categories"]))],
        indent=1))

    windows = np.load(WORK / "test_windows.npy")[:4]
    probs = model.predict(windows, verbose=0)
    (OUT / "reference.json").write_text(json.dumps(
        {"cases": [{"input": w.reshape(-1).round(6).tolist(), "probs": p.round(7).tolist()} for w, p in zip(windows, probs)]}))

    worst = sorted(metrics["per_sign"].items(), key=lambda kv: kv[1])[:10]
    conf = list(metrics["confusions"].items())[:10]
    md = [
        "# FSL-105 sign classifier",
        "",
        "Trained on FSL-105 (Tupal, 2023, CC BY 4.0, DOI 10.17632/48y2y99mb9.2), dataset train split; evaluated once on its test split.",
        "",
        f"- top-1: {metrics['top1']:.4f}",
        f"- top-5: {metrics['top5']:.4f}",
        f"- clips: {metrics['n_train']} train, {metrics['n_val']} validation, {metrics['n_test']} test",
        "",
        "## Weakest signs (test accuracy)",
        "",
        *[f"- {name}: {acc:.2f}" for name, acc in worst],
        "",
        "## Most common confusions (true -> predicted)",
        "",
        *[f"- {k}: {v}" for k, v in conf],
        "",
    ]
    (OUT / "metrics.md").write_text("\n".join(md))
    print("exported to", OUT)


if __name__ == "__main__":
    main()
