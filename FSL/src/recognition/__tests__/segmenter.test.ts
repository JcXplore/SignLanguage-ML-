/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSegmenter, resampleTo32, type Segment } from '../segmenter.ts';
import type { FeatureFrame } from '../types.ts';

const FPS_MS = 1000 / 30;

/** A frame with the right hand present at x offset `x` (all 21 points). */
function frame(i: number, x: number | null): FeatureFrame {
  const v = new Float32Array(149);
  if (x !== null) {
    for (let p = 0; p < 21; p++) v[p * 3] = x;
    v[126] = 1;
    v[131] = -0.5; // a pose so the frame is not empty
    v[134] = 0.5;
  }
  return { t: i * FPS_MS, v };
}

/** Feed frames; return all emitted segments. `xs[i]` is the hand x at frame i (null = no hand). */
function run(xs: (number | null)[], opts?: Parameters<typeof createSegmenter>[0]) {
  const seg = createSegmenter(opts);
  const out: Segment[] = [];
  xs.forEach((x, i) => {
    const s = seg.push(frame(i, x));
    if (s) out.push(s);
  });
  return out;
}

const still = (n: number, x = 0.2) => Array<number>(n).fill(x);
const moving = (n: number, from = 0.2, step = 0.05) => Array.from({ length: n }, (_, i) => from + step * (i + 1));

test('still hands never start a segment', () => {
  assert.equal(run(still(120)).length, 0);
});

test('no pose frames (all zeros) never start a segment', () => {
  assert.equal(run(Array(120).fill(null)).length, 0);
});

test('moving hand starts, 300ms of stillness ends it', () => {
  const m = moving(30);
  const segs = run([...still(10), ...m, ...still(20, m[m.length - 1])]);
  assert.equal(segs.length, 1);
  assert.equal(segs[0].reason, 'ended');
  // moving stretch 30 frames, padded by up to 4 frames each side
  assert.ok(segs[0].frames.length >= 30 && segs[0].frames.length <= 38, String(segs[0].frames.length));
});

test('gap shorter than 300ms continues segment', () => {
  const a = moving(15);
  const gap = still(5, a[a.length - 1]); // ~167ms
  const b = moving(15, a[a.length - 1]);
  const segs = run([...still(5), ...a, ...gap, ...b, ...still(20, b[b.length - 1])]);
  assert.equal(segs.length, 1);
});

test('segment under 300ms is dropped', () => {
  const m = moving(5); // ~133ms of motion
  assert.equal(run([...still(10), ...m, ...still(20, m[m.length - 1])]).length, 0);
});

test('cut at 3000ms with reason maxLength', () => {
  const segs = run([...still(5), ...moving(120, 0.2, 0.05)]);
  assert.ok(segs.length >= 1);
  assert.equal(segs[0].reason, 'maxLength');
  const span = segs[0].frames[segs[0].frames.length - 1].t - segs[0].frames[0].t;
  assert.ok(span <= 3000 + FPS_MS * 5, String(span));
});

test('resampleTo32 of 32 frames is identity, of 64 picks every other', () => {
  const f32 = Array.from({ length: 32 }, (_, i) => ({ t: i, v: new Float32Array(149).fill(i) }));
  const w = resampleTo32(f32);
  assert.equal(w.length, 32 * 149);
  for (let i = 0; i < 32; i++) assert.equal(w[i * 149], i);
  const f63 = Array.from({ length: 63 }, (_, i) => ({ t: i, v: new Float32Array(149).fill(i) }));
  const w63 = resampleTo32(f63);
  for (let i = 0; i < 32; i++) assert.equal(w63[i * 149], 2 * i);
});
