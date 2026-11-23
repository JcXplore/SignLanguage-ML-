/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usablePose, type PoseLandmark } from '../poseCheck.ts';

function pose(shoulderY = 0.6, visibility = 0.99): PoseLandmark[] {
  const p: PoseLandmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.99 }));
  p[11] = { x: 0.4, y: shoulderY, z: 0, visibility };
  p[12] = { x: 0.6, y: shoulderY, z: 0, visibility };
  return p;
}

test('shoulders in view give the points', () => {
  const got = usablePose(pose());
  assert.ok(got);
  assert.deepEqual(got![11], [0.4, 0.6, 0]);
});

test('shoulders below the image (signer too close) count as no pose', () => {
  assert.equal(usablePose(pose(1.2)), null);
});

test('low shoulder visibility counts as no pose', () => {
  assert.equal(usablePose(pose(0.6, 0.2)), null);
});

test('no landmarks is no pose', () => {
  assert.equal(usablePose(null), null);
});
