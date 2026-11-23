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


# --- live_segments mirrors FSL/src/recognition/segmenter.ts (same scenarios as segmenter.test.ts)
from windows import live_segments


def xs_to_seq(xs):
    s = np.zeros((len(xs), 149), np.float32)
    for i, x in enumerate(xs):
        if x is None:
            continue
        s[i, 0:63:3] = x
        s[i, 126] = 1
        s[i, 131], s[i, 134] = -0.5, 0.5
    return s


def still(n, x=0.2):
    return [x] * n


def moving(n, start=0.2, step=0.05):
    return [start + step * (i + 1) for i in range(n)]


def test_live_still_hands_never_start_a_segment():
    assert live_segments(xs_to_seq(still(120))) == []


def test_live_moving_then_still_ends_one_segment_with_padding():
    m = moving(30)
    segs = live_segments(xs_to_seq(still(10) + m + still(20, m[-1])))
    assert len(segs) == 1
    (a, b, reason) = segs[0]
    assert reason == "ended" and 30 <= b - a <= 38


def test_live_short_gap_continues_segment():
    a = moving(15)
    b = moving(15, a[-1])
    segs = live_segments(xs_to_seq(still(5) + a + still(5, a[-1]) + b + still(20, b[-1])))
    assert len(segs) == 1


def test_live_short_twitch_is_dropped():
    m = moving(5)
    assert live_segments(xs_to_seq(still(10) + m + still(20, m[-1]))) == []


def test_live_long_signing_cut_at_3s():
    segs = live_segments(xs_to_seq(still(5) + moving(120)))
    assert segs and segs[0][2] == "maxLength"
