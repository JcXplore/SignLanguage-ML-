import numpy as np

from augment import mirror, rotate_scale


def frame(right_x=0.5, left_x=None, nose_x=0.0, l_sh=-0.5, r_sh=0.5):
    f = np.zeros(149, np.float32)
    f[0:63:3] = right_x
    f[126] = 1
    if left_x is not None:
        f[63:126:3] = left_x
        f[127] = 1
    # pose order: nose, 11, 12, 13, 14, 15, 16
    f[128] = nose_x
    f[131] = l_sh
    f[134] = r_sh
    return f[None, :]


def test_mirror_moves_right_hand_to_left_slot_with_negated_x():
    out = mirror(frame(right_x=0.5))
    assert out[0, 127] == 1 and out[0, 126] == 0
    assert np.allclose(out[0, 63:126:3], -0.5)
    assert np.count_nonzero(out[0, 0:63]) == 0


def test_mirror_swaps_pose_pairs():
    out = mirror(frame(l_sh=-0.5, r_sh=0.5))
    assert out[0, 131] == -0.5 and out[0, 134] == 0.5  # swapped and negated -> same values


def test_mirror_twice_is_identity():
    f = frame(right_x=0.3, left_x=-0.2, nose_x=0.1)
    assert np.allclose(mirror(mirror(f)), f)


def test_rotate_keeps_absent_hand_and_empty_frames_zero():
    f = np.concatenate([frame(right_x=0.5), np.zeros((1, 149), np.float32)])
    out = rotate_scale(f, degrees=10, scale=1.1)
    assert np.count_nonzero(out[0, 63:126]) == 0
    assert np.count_nonzero(out[1]) == 0
    assert out[0, 126] == 1


def test_rotate_90_maps_x_to_y():
    out = rotate_scale(frame(right_x=1.0), degrees=90, scale=1.0)
    assert np.allclose(out[0, 0], 0, atol=1e-6)
    assert np.allclose(out[0, 1], 1, atol=1e-6)
