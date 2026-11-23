/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../decide.ts';

test('decide reads when score 0.8 and margin 0.5', () => {
  const r = decide([{ label: 'B', score: 0.3 }, { label: 'A', score: 0.8 }]);
  assert.deepEqual(r, { kind: 'read', label: 'A', score: 0.8 });
});

test('decide unsure when score 0.55', () => {
  const r = decide([{ label: 'A', score: 0.55 }, { label: 'B', score: 0.1 }]);
  assert.equal(r.kind, 'unsure');
});

test('decide unsure when margin 0.1, top 2 returned', () => {
  const r = decide([{ label: 'A', score: 0.7 }, { label: 'B', score: 0.6 }, { label: 'C', score: 0.01 }]);
  assert.equal(r.kind, 'unsure');
  if (r.kind === 'unsure') assert.deepEqual(r.top.map((g) => g.label), ['A', 'B']);
});

test('decide with no guesses is unsure with nothing to offer', () => {
  assert.deepEqual(decide([]), { kind: 'unsure', top: [] });
});
