// Copies MediaPipe's WASM runtime and the hand/pose models into public/mediapipe/
// so the web build loads them from the app itself, never from a CDN.
// Run after installing or upgrading @mediapipe/tasks-vision, or after ml/download_models.py.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'mediapipe');
fs.mkdirSync(out, { recursive: true });

const wasmDir = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
for (const f of fs.readdirSync(wasmDir)) {
  if (f.startsWith('vision_wasm_internal')) fs.copyFileSync(path.join(wasmDir, f), path.join(out, f));
}
const models = path.join(root, '..', 'ml', 'models');
for (const f of ['hand_landmarker.task', 'pose_landmarker_lite.task']) {
  fs.copyFileSync(path.join(models, f), path.join(out, f));
}
console.log('copied to', out, fs.readdirSync(out));
