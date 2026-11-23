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
// The library itself is loaded by the browser at runtime (Metro can't bundle its dynamic import()).
// MediaPipe also sends usage logs to Google (odml.pa.googleapis.com) every 60 s. SignBridge
// promises that nothing leaves the device, so the copied bundle's log flush is patched to drop
// the queue instead of sending it. If MediaPipe's code changes shape, stop rather than ship it.
const bundle = fs.readFileSync(path.join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'vision_bundle.mjs'), 'utf8');
const FLUSH = 'else if(0===this.i.length)t?.();else{var r=this.i;this.i=[]';
const PATCHED = 'else if(!0)this.i=[],t?.();else{var r=this.i;this.i=[]';
if (bundle.split(FLUSH).length !== 2 || bundle.split('odml.pa.googleapis.com').length !== 2) {
  throw new Error('MediaPipe usage-log code changed; update the patch in scripts/copy-mediapipe-assets.js');
}
fs.writeFileSync(path.join(out, 'vision_bundle.mjs'), bundle.replace(FLUSH, PATCHED));
const models = path.join(root, '..', 'ml', 'models');
for (const f of ['hand_landmarker.task', 'pose_landmarker_lite.task']) {
  fs.copyFileSync(path.join(models, f), path.join(out, f));
}
console.log('copied to', out, fs.readdirSync(out));
