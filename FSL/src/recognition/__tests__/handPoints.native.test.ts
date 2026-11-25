/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandPointSource, createFrameFeed } from '../handPoints.ts';
import type { NativeFrame } from '../nativeFrame.ts';
import type { FrameStatus } from '../types.ts';

const frameWithPose = (t: number): NativeFrame => {
  const pose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  pose[11] = { x: 0.4, y: 0.6, z: 0, visibility: 1 };
  pose[12] = { x: 0.6, y: 0.6, z: 0, visibility: 1 };
  return { t, hands: [], pose };
};

test('forwards native frames as feature frames until stopped', async () => {
  const feed = createFrameFeed();
  const source = createHandPointSource();
  const seen: [number, FrameStatus][] = [];
  await source.start(feed, (f, s) => seen.push([f.t, s]));
  feed.emit(frameWithPose(10));
  feed.emit({ t: 20, hands: [], pose: null });
  source.stop();
  feed.emit(frameWithPose(30));
  assert.deepEqual(seen, [
    [10, 'noHands'],
    [20, 'noPose'],
  ]);
});

test('without a camera feed it is unavailable', async () => {
  await assert.rejects(createHandPointSource().start(null, () => {}), /unavailable/);
});
