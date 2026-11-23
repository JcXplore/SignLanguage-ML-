/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FEATURE_SIZE, frameFeatures } from '../features.ts';
import type { HandInput, Vec3 } from '../types.ts';

const fixturePath = fileURLToPath(new URL('../../../../ml/fixtures/features_cases.json', import.meta.url));
const cases: { name: string; hands: HandInput[]; pose: Vec3[] | null; expected: number[] }[] = JSON.parse(
  readFileSync(fixturePath, 'utf8')
);

test('fixture cases match the Python definition within 1e-4', () => {
  assert.ok(cases.length >= 6);
  for (const c of cases) {
    const got = frameFeatures(c.hands, c.pose);
    assert.equal(got.length, FEATURE_SIZE, c.name);
    for (let i = 0; i < FEATURE_SIZE; i++) {
      assert.ok(Math.abs(got[i] - c.expected[i]) <= 1e-4, `${c.name}[${i}]: ${got[i]} vs ${c.expected[i]}`);
    }
  }
});

test('no pose gives zeros', () => {
  const hand: HandInput = { label: 'Right', points: Array.from({ length: 21 }, () => [0.5, 0.5, 0] as Vec3) };
  const got = frameFeatures([hand], null);
  assert.ok(got.every((v) => v === 0));
});
