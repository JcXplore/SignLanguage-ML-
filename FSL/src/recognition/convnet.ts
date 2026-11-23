/**
 * Runs the sign classifier exported by ml/export.py ("signbridge-conv1d/1"):
 * Conv1D layers (BatchNorm already folded in, optional ReLU), global average
 * pooling, then a dense softmax layer. Plain TypeScript, no ML library, so it
 * runs anywhere the app does. Checked against Keras in convnet.test.ts.
 *
 * Tensors are row-major: input [length][channels], conv weights
 * [kernel][in][out], dense weights [in][out].
 */

export type LayerSpec =
  | {
      type: 'conv1d';
      kernel: number;
      stride: number;
      padLeft: number;
      padRight: number;
      inLength: number;
      outLength: number;
      relu: boolean;
      shapes: { w: [number, number, number]; b: [number] };
    }
  | { type: 'globalAvgPool' }
  | { type: 'dense'; softmax: boolean; shapes: { w: [number, number]; b: [number] } };

export interface NetSpec {
  format: string;
  input: [number, number];
  output: number;
  layers: LayerSpec[];
}

type Layer = LayerSpec & { w?: Float32Array; b?: Float32Array };
export interface Net {
  spec: NetSpec;
  layers: Layer[];
}

const size = (shape: number[]) => shape.reduce((a, b) => a * b, 1);

export function loadNet(spec: NetSpec, weights: ArrayBuffer): Net {
  if (spec.format !== 'signbridge-conv1d/1') throw new Error(`unknown model format ${spec.format}`);
  const needed = spec.layers.reduce((n, l) => n + ('shapes' in l ? size(l.shapes.w) + size(l.shapes.b) : 0), 0);
  if (weights.byteLength !== needed * 4) {
    throw new Error(`weights file is ${weights.byteLength} bytes, expected ${needed * 4}`);
  }
  const all = new Float32Array(weights);
  let at = 0;
  const take = (shape: number[]) => {
    const n = size(shape);
    const out = all.subarray(at, at + n);
    at += n;
    return out;
  };
  return {
    spec,
    layers: spec.layers.map((l) => ('shapes' in l ? { ...l, w: take(l.shapes.w), b: take(l.shapes.b) } : { ...l })),
  };
}

function conv1d(x: Float32Array, len: number, l: Extract<Layer, { type: 'conv1d' }>, w: Float32Array, b: Float32Array) {
  const [k, cin, cout] = l.shapes.w;
  const outLen = l.outLength;
  const y = new Float32Array(outLen * cout);
  for (let o = 0; o < outLen; o++) {
    const yo = o * cout;
    y.set(b, yo);
    for (let kk = 0; kk < k; kk++) {
      const t = o * l.stride + kk - l.padLeft;
      if (t < 0 || t >= len) continue;
      const xt = t * cin;
      const wk = kk * cin * cout;
      for (let c = 0; c < cin; c++) {
        const xv = x[xt + c];
        if (xv === 0) continue;
        const wc = wk + c * cout;
        for (let f = 0; f < cout; f++) y[yo + f] += xv * w[wc + f];
      }
    }
    if (l.relu) for (let f = 0; f < cout; f++) if (y[yo + f] < 0) y[yo + f] = 0;
  }
  return y;
}

/** Class probabilities for one window (input.length = length x channels). */
export function runNet(net: Net, input: Float32Array): Float32Array {
  let [len, channels] = net.spec.input;
  if (input.length !== len * channels) throw new Error(`input has ${input.length} values, expected ${len * channels}`);
  let x: Float32Array = input;
  for (const l of net.layers) {
    if (l.type === 'conv1d') {
      x = conv1d(x, len, l, l.w!, l.b!);
      len = l.outLength;
      channels = l.shapes.w[2];
    } else if (l.type === 'globalAvgPool') {
      const pooled = new Float32Array(channels);
      for (let t = 0; t < len; t++) for (let c = 0; c < channels; c++) pooled[c] += x[t * channels + c];
      for (let c = 0; c < channels; c++) pooled[c] /= len;
      x = pooled;
      len = 1;
    } else {
      const [nin, nout] = l.shapes.w;
      const y = Float32Array.from(l.b!);
      for (let i = 0; i < nin; i++) {
        const xv = x[i];
        for (let j = 0; j < nout; j++) y[j] += xv * l.w![i * nout + j];
      }
      if (l.softmax) {
        let max = -Infinity;
        for (const v of y) max = Math.max(max, v);
        let sum = 0;
        for (let j = 0; j < nout; j++) sum += y[j] = Math.exp(y[j] - max);
        for (let j = 0; j < nout; j++) y[j] /= sum;
      }
      x = y;
      channels = nout;
    }
  }
  return x;
}
