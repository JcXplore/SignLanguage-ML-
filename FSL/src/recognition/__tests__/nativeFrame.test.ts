/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertNativeFrame, type NativeFrame } from '../nativeFrame.ts';
import { frameFeatures } from '../features.ts';
import type { Vec3 } from '../types.ts';

function pose(shoulderY = 0.6, visibility = 0.99) {
  const p = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.99 }));
  p[11] = { x: 0.4, y: shoulderY, z: 0, visibility };
  p[12] = { x: 0.6, y: shoulderY, z: 0, visibility };
  return p;
}
const hand = (label: string, x = 0.55): NativeFrame['hands'][number] => ({
  label,
  points: Array.from({ length: 21 }, () => [x, 0.5, 0.01]),
});

test('matches the web path: same features as frameFeatures on the same points', () => {
  const nf: NativeFrame = { t: 1000, hands: [hand('Right'), hand('Left', 0.45)], pose: pose() };
  const { frame, status } = convertNativeFrame(nf);
  const expected = frameFeatures(
    [
      { label: 'Right', points: nf.hands[0].points as Vec3[] },
      { label: 'Left', points: nf.hands[1].points as Vec3[] },
    ],
    nf.pose!.map((p) => [p.x, p.y, p.z] as Vec3)
  );
  assert.equal(status, 'ok');
  assert.equal(frame.t, 1000);
  assert.deepEqual(Array.from(frame.v), Array.from(expected));
});

test('no hands but a pose is noHands', () => {
  assert.equal(convertNativeFrame({ t: 0, hands: [], pose: pose() }).status, 'noHands');
});

test('shoulders off-image (signer too close) is noPose with an empty frame', () => {
  const { frame, status } = convertNativeFrame({ t: 0, hands: [hand('Right')], pose: pose(1.3) });
  assert.equal(status, 'noPose');
  assert.ok(frame.v.every((v) => v === 0));
});

test('missing pose is noPose', () => {
  assert.equal(convertNativeFrame({ t: 0, hands: [hand('Right')], pose: null }).status, 'noPose');
});

test('an unknown handedness label is treated as Right, like the web path', () => {
  const { frame } = convertNativeFrame({ t: 0, hands: [hand('right?')], pose: pose() });
  assert.equal(frame.v[126], 1);
  assert.equal(frame.v[127], 0);
});
