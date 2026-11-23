/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenStatus } from '../screenStatus.ts';

const base = { mode: 'common' as const, recognition: { state: 'loading' as const }, cameraError: false, shown: null };

test('camera error shows the camera notice instead of loading forever', () => {
  assert.deepEqual(screenStatus({ ...base, cameraError: true }), { kind: 'unavailable', reason: 'noCamera' });
});

test('letters mode is not trained', () => {
  assert.deepEqual(screenStatus({ ...base, mode: 'alphabet' }), { kind: 'unavailable', reason: 'notTrained' });
});

test('a test sign shows even in letters mode', () => {
  const shown = { kind: 'read' as const, label: 'A', test: true };
  assert.deepEqual(screenStatus({ ...base, mode: 'alphabet', shown }), shown);
});

test('ready with nothing shown is idle; with a result shows it', () => {
  const ready = { ...base, recognition: { state: 'ready' as const } };
  assert.deepEqual(screenStatus(ready), { kind: 'idle' });
  const shown = { kind: 'unsure' as const, top: ['A', 'B'] };
  assert.deepEqual(screenStatus({ ...ready, shown }), shown);
});

test('unavailable passes its reason through', () => {
  assert.deepEqual(screenStatus({ ...base, recognition: { state: 'unavailable', reason: 'platform' } }), {
    kind: 'unavailable',
    reason: 'platform',
  });
});
