"""Checks the exported model files the app depends on (run after export.py)."""

import json
import re
from pathlib import Path

import numpy as np
import pytest

OUT = Path(__file__).resolve().parents[2] / "FSL" / "assets" / "models" / "fsl105"


def test_labels_json_has_105_unique_entries():
    labels = json.loads((OUT / "labels.json").read_text())
    assert len(labels) == 105
    assert sorted(l["index"] for l in labels) == list(range(105))
    assert all(l["label"] and l["category"] for l in labels)


def test_tflite_loads_without_flex_ops():
    import tensorflow as tf

    interp = tf.lite.Interpreter(model_path=str(OUT / "model.tflite"))
    interp.allocate_tensors()  # fails if Select TF (flex) ops are needed
    ops = {op["op_name"] for op in interp._get_ops_details()}
    assert not any(o.startswith("Flex") for o in ops), ops
    assert list(interp.get_input_details()[0]["shape"][1:]) == [32, 149]


def test_web_model_json_shape_and_weights_size():
    spec = json.loads((OUT / "model.json").read_text())
    assert spec["input"] == [32, 149]
    assert spec["output"] == 105
    expected_floats = sum(int(np.prod(s)) for l in spec["layers"] for s in l.get("shapes", {}).values())
    assert (OUT / "weights.bin").stat().st_size == expected_floats * 4


def test_web_model_matches_keras_on_reference_inputs():
    ref = json.loads((OUT / "reference.json").read_text())
    assert len(ref["cases"]) >= 3
    for case in ref["cases"]:
        assert len(case["input"]) == 32 * 149
        assert abs(sum(case["probs"]) - 1.0) < 1e-3


def test_metrics_meet_targets():
    text = (OUT / "metrics.md").read_text()
    top1 = float(re.search(r"top-1: ([0-9.]+)", text).group(1))
    top5 = float(re.search(r"top-5: ([0-9.]+)", text).group(1))
    assert top1 >= 0.85, top1
    assert top5 >= 0.95, top5
