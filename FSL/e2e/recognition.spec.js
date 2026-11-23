// End-to-end check of offline sign recognition in the web build.
//
// Plays FSL-105 test clips into Chromium as a fake webcam, blocks every
// non-localhost request (so nothing can come from the internet), and checks
// that the clip's sign is read into the sentence.
//
// Needs: the dev server (`npx expo start --web --port 8081`), ffmpeg, and the
// FSL-105 clips in ../ml/work/fsl105 (see ml/README.md).
// Usage: node e2e/recognition.spec.js [clipCount=3]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DATA = path.join(__dirname, '..', '..', 'ml', 'work', 'fsl105');
const URL = process.env.APP_URL || 'http://localhost:8081/';
const COUNT = Number(process.argv[2] || 3);

function testClips(n) {
  const rows = fs.readFileSync(path.join(DATA, 'test.csv'), 'utf8').trim().split(/\r?\n/).slice(1);
  const seen = new Set();
  const picks = [];
  for (const r of rows) {
    const [vid, , label] = r.split(',');
    if (seen.has(label)) continue;
    seen.add(label);
    picks.push({ file: path.join(DATA, vid.replace(/\\/g, '/')), label });
    if (picks.length === n) break;
  }
  return picks;
}

function toY4m(file) {
  const out = path.join(os.tmpdir(), `${path.basename(path.dirname(file))}-${path.basename(file, '.MOV')}.y4m`);
  if (!fs.existsSync(out)) {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', file, '-r', '30', '-vf', 'scale=640:360', '-pix_fmt', 'yuv420p', out]);
  }
  return out;
}

async function runClip({ file, label }) {
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${toY4m(file)}`],
  });
  const context = await browser.newContext({ permissions: ['camera'], viewport: { width: 1280, height: 800 } });
  const external = [];
  await context.route('**/*', (route) => {
    const host = new globalThis.URL(route.request().url()).hostname;
    if (host === 'localhost' || host === '127.0.0.1') return route.continue();
    external.push(route.request().url());
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(URL);
  // the model loads once; give it time, then up to 20 s of the looping clip
  // only the sentence counts (the dev test chips show some labels too)
  const found = await page
    .getByTestId('sentence')
    .getByText(label)
    .waitFor({ timeout: 45000 })
    .then(() => true)
    .catch(() => false);
  const shot = path.join(os.tmpdir(), `e2e-${label.replace(/\W+/g, '_')}.png`);
  await page.screenshot({ path: shot });
  await browser.close();
  return { label, found, external, shot };
}

async function notTrainedCopy() {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const page = await (await browser.newContext({ permissions: ['camera'] })).newPage();
  await page.goto(URL);
  await page.getByLabel('Letters', { exact: true }).click();
  const ok = await page
    .getByText("Letters and numbers aren't trained yet. Switch to Words.")
    .waitFor({ timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  await browser.close();
  return ok;
}

(async () => {
  const results = [];
  for (const clip of testClips(COUNT)) results.push(await runClip(clip));
  for (const r of results) console.log(`${r.found ? 'PASS' : 'FAIL'}  ${r.label}  (external requests blocked: ${r.external.length})  ${r.shot}`);
  const abc = await notTrainedCopy();
  console.log(`${abc ? 'PASS' : 'FAIL'}  ABC mode shows the not-trained notice`);
  const passed = results.filter((r) => r.found).length;
  const ok = passed >= Math.ceil((COUNT * 2) / 3) && abc && results.every((r) => r.external.length === 0);
  console.log(`${passed}/${results.length} clips read; ${ok ? 'OK' : 'NOT OK'}`);
  process.exit(ok ? 0 : 1);
})();
