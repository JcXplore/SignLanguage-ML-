/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadNet, runNet, type NetSpec } from '../convnet.ts';

function load(dir: string) {
  const path = (f: string) => fileURLToPath(new URL(`${dir}/${f}`, import.meta.url));
  const spec: NetSpec = JSON.parse(readFileSync(path('model.json'), 'utf8'));
  const buf = readFileSync(path('weights.bin'));
  const weights = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const ref: { cases: { input: number[]; probs: number[] }[] } = JSON.parse(readFileSync(path('reference.json'), 'utf8'));
  return { net: loadNet(spec, weights), ref, exists: true };
}

function assertMatches(dir: string) {
  const { net, ref } = load(dir);
  for (const c of ref.cases) {
    const probs = runNet(net, Float32Array.from(c.input));
    assert.equal(probs.length, c.probs.length);
    for (let i = 0; i < probs.length; i++) {
      assert.ok(Math.abs(probs[i] - c.probs[i]) <= 1e-4, `class ${i}: ${probs[i]} vs ${c.probs[i]}`);
    }
  }
}

test('matches Keras on the tiny random model within 1e-4', () => {
  assertMatches('../../../../ml/fixtures/tiny_net');
});

test('matches Keras on the exported FSL-105 model within 1e-4', (t) => {
  const real = fileURLToPath(new URL('../../../assets/models/fsl105/model.json', import.meta.url));
  if (!existsSync(real)) return t.skip('model not exported yet');
  assertMatches('../../../assets/models/fsl105');
});

test('rejects a weights file of the wrong size', () => {
  const spec: NetSpec = JSON.parse(readFileSync(fileURLToPath(new URL('../../../../ml/fixtures/tiny_net/model.json', import.meta.url)), 'utf8'));
  assert.throws(() => loadNet(spec, new ArrayBuffer(16)), /weights/);
});
