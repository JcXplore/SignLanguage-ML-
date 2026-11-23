/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startRecognition, type RecognitionCallbacks } from '../recognizer.ts';
import type { FeatureFrame, FrameStatus, Guess, HandPointSource, SignClassifier } from '../types.ts';

const FPS_MS = 1000 / 30;

function frame(i: number, x: number | null): FeatureFrame {
  const v = new Float32Array(149);
  if (x !== null) {
    for (let p = 0; p < 21; p++) v[p * 3] = x;
    v[126] = 1;
    v[131] = -0.5;
    v[134] = 0.5;
  }
  return { t: i * FPS_MS, v };
}

/** A source that replays scripted frames as soon as it starts. */
function fakeSource(frames: [FeatureFrame, FrameStatus][], fail?: Error): HandPointSource {
  return {
    async start(_video, onFrame) {
      if (fail) throw fail;
      for (const [f, s] of frames) onFrame(f, s);
    },
    stop() {},
  };
}

function fakeClassifier(guesses: Guess[], failLoad = false): SignClassifier {
  return {
    async load() {
      if (failLoad) throw new Error('404');
    },
    async predict() {
      return guesses;
    },
  };
}

/** Still, then a 1 s sign, then still long enough to end it. */
function signFrames(): [FeatureFrame, FrameStatus][] {
  const xs = [...Array(5).fill(0.2), ...Array.from({ length: 30 }, (_, i) => 0.2 + 0.05 * (i + 1))];
  const last = xs[xs.length - 1];
  xs.push(...Array(20).fill(last));
  return xs.map((x, i) => [frame(i, x), 'ok']);
}

function collect() {
  const log: { states: string[]; decisions: unknown[]; hints: unknown[] } = { states: [], decisions: [], hints: [] };
  const cb: RecognitionCallbacks = {
    onState: (s, reason) => log.states.push(reason ? `${s}:${reason}` : s),
    onDecision: (d) => log.decisions.push(d),
    onHint: (h) => log.hints.push(h),
  };
  return { log, cb };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

test('emits read event after a segment ends', async () => {
  const { log, cb } = collect();
  await startRecognition(fakeSource(signFrames()), fakeClassifier([{ label: 'HELLO', score: 0.9 }, { label: 'NO', score: 0.05 }]), null, cb);
  await settle();
  assert.deepEqual(log.states, ['loading', 'ready']);
  assert.deepEqual(log.decisions, [{ kind: 'read', label: 'HELLO', score: 0.9 }]);
});

test('emits unsure with top 2', async () => {
  const { log, cb } = collect();
  await startRecognition(fakeSource(signFrames()), fakeClassifier([{ label: 'HELLO', score: 0.5 }, { label: 'HI', score: 0.4 }, { label: 'NO', score: 0.1 }]), null, cb);
  await settle();
  assert.deepEqual(log.decisions, [{ kind: 'unsure', top: [{ label: 'HELLO', score: 0.5 }, { label: 'HI', score: 0.4 }] }]);
});

test('noPose status for 1s sets hint moveBack, and a good frame clears it', async () => {
  const { log, cb } = collect();
  const frames: [FeatureFrame, FrameStatus][] = Array.from({ length: 32 }, (_, i) => [frame(i, null), 'noPose']);
  frames.push([frame(32, 0.2), 'ok']);
  await startRecognition(fakeSource(frames), fakeClassifier([]), null, cb);
  assert.deepEqual(log.hints, [null, 'moveBack', null]);
});

test('classifier load failure gives unavailable/noModel', async () => {
  const { log, cb } = collect();
  await startRecognition(fakeSource(signFrames()), fakeClassifier([], true), null, cb);
  assert.deepEqual(log.states, ['loading', 'unavailable:noModel']);
  assert.equal(log.decisions.length, 0);
});

test('unsupported platform gives unavailable/platform', async () => {
  const { log, cb } = collect();
  await startRecognition(fakeSource([], new Error('unavailable')), fakeClassifier([]), null, cb);
  assert.deepEqual(log.states, ['loading', 'unavailable:platform']);
});

test('camera permission denied gives unavailable/noCamera', async () => {
  const { log, cb } = collect();
  const denied = Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
  await startRecognition(fakeSource([], denied), fakeClassifier([]), null, cb);
  assert.deepEqual(log.states, ['loading', 'unavailable:noCamera']);
});

test('reports no hint when a new recognition starts, so a stale hint is cleared', async () => {
  const { log, cb } = collect();
  await startRecognition(fakeSource([[frame(0, 0.2), 'ok']]), fakeClassifier([]), null, cb);
  assert.equal(log.hints[0], null);
});
