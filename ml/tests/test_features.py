import json
from pathlib import Path

import numpy as np
import pytest

from features import FEATURE_SIZE, frame_features

FIXTURE = Path(__file__).parent.parent / "fixtures" / "features_cases.json"


def pose_with_shoulders(left=(0.4, 0.5, 0.0), right=(0.6, 0.5, 0.0)):
    """33 pose points; MediaPipe index 11 = left shoulder, 12 = right shoulder."""
    pose = [[0.5, 0.5, 0.0] for _ in range(33)]
    pose[11] = list(left)
    pose[12] = list(right)
    return pose


def hand(label, x=0.5, y=0.5, z=0.0):
    return {"label": label, "points": [[x, y, z] for _ in range(21)]}


def test_shape_is_149():
    v = frame_features([hand("Right")], pose_with_shoulders())
    assert FEATURE_SIZE == 149
    assert v.shape == (149,)
    assert v.dtype == np.float32


def test_no_pose_is_all_zeros():
    v = frame_features([hand("Right"), hand("Left")], None)
    assert np.count_nonzero(v) == 0


def test_missing_left_hand_zero_slot_and_flag():
    v = frame_features([hand("Right", x=0.7)], pose_with_shoulders())
    assert np.count_nonzero(v[63:126]) == 0
    assert v[126] == 1.0
    assert v[127] == 0.0


def test_shoulder_midpoint_maps_to_origin():
    # shoulders at x 0.4 and 0.6, y 0.5 -> midpoint (0.5, 0.5)
    v = frame_features([hand("Right", x=0.5, y=0.5)], pose_with_shoulders())
    assert v[0] == pytest.approx(0.0, abs=1e-6)
    assert v[1] == pytest.approx(0.0, abs=1e-6)


def test_scale_by_shoulder_width():
    # shoulder width 0.2; a point 0.2 right of the midpoint -> x = 1.0
    v = frame_features([hand("Right", x=0.7, y=0.5, z=0.1)], pose_with_shoulders())
    assert v[0] == pytest.approx(1.0, abs=1e-6)
    assert v[2] == pytest.approx(0.5, abs=1e-6)  # z / scale


def test_zero_width_shoulders_give_zeros():
    v = frame_features([hand("Right")], pose_with_shoulders(left=(0.5, 0.5, 0), right=(0.5, 0.5, 0)))
    assert np.count_nonzero(v) == 0


def test_pose_points_in_order_after_hand_flags():
    pose = pose_with_shoulders()
    pose[0] = [0.5, 0.3, 0.0]  # nose 0.2 above the midpoint -> y = -1.0
    v = frame_features([], pose)
    assert v[128] == pytest.approx(0.0, abs=1e-6)
    assert v[129] == pytest.approx(-1.0, abs=1e-6)
    assert v[126] == 0.0 and v[127] == 0.0


def test_fixture_cases_match():
    cases = json.loads(FIXTURE.read_text())
    assert len(cases) >= 6
    for case in cases:
        got = frame_features(case["hands"], case["pose"])
        np.testing.assert_allclose(got, np.array(case["expected"], dtype=np.float32), atol=1e-6, err_msg=case["name"])
