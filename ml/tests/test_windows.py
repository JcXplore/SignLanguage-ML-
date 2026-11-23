import numpy as np

from windows import WINDOW, active_span, resample_to_32


def seq_with_motion(n=100, start=30, end=60):
    s = np.zeros((n, 149), np.float32)
    s[:, 126] = 1
    for t in range(start, end):
        s[t, 0:63:3] = 0.05 * (t - start + 1)  # whole right hand moves 0.05 per frame in x
    s[end:, 0:63:3] = s[end - 1, 0]
    return s


def test_resample_of_32_is_identity():
    s = np.arange(32 * 149, dtype=np.float32).reshape(32, 149)
    np.testing.assert_array_equal(resample_to_32(s), s)


def test_resample_of_63_picks_every_other():
    s = np.arange(63, dtype=np.float32)[:, None].repeat(149, axis=1)
    out = resample_to_32(s)
    assert out.shape == (WINDOW, 149)
    np.testing.assert_array_equal(out[:, 0], np.arange(0, 63, 2))


def test_resample_of_single_frame_repeats_it():
    s = np.ones((1, 149), np.float32)
    assert resample_to_32(s).shape == (32, 149)


def test_active_span_covers_the_moving_stretch_with_padding():
    start, end = active_span(seq_with_motion())
    assert start == 30 - 4
    assert end == 60 + 4


def test_active_span_of_still_clip_is_whole_clip():
    assert active_span(np.zeros((50, 149), np.float32)) == (0, 50)


def test_absent_left_hand_does_not_dilute_motion():
    from windows import motion

    s = seq_with_motion()
    assert motion(s)[40] > 0.02


def test_hand_appearing_is_not_motion():
    from windows import motion

    s = np.zeros((3, 149), np.float32)
    s[2, 126] = 1
    s[2, 0:63] = 0.5
    assert motion(s)[2] == 0.0
