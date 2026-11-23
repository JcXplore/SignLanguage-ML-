// Keeps the Translate screen reading signs for 75 s (past MediaPipe's 60 s
// usage-log flush) and fails if any request leaves localhost.
// Needs the dev server and one converted clip (run recognition.spec.js once first).
// Usage: node e2e/no-network.spec.js
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const URL = process.env.APP_URL || 'http://localhost:8081/';
const clip = fs.readdirSync(os.tmpdir()).find((f) => f.endsWith('.y4m'));

(async () => {
  if (!clip) throw new Error('no .y4m clip in the temp folder; run e2e/recognition.spec.js first');
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${path.join(os.tmpdir(), clip)}`],
  });
  const context = await browser.newContext({ permissions: ['camera'] });
  const external = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    const host = new globalThis.URL(url).hostname;
    if (host === 'localhost' || host === '127.0.0.1') return route.continue();
    external.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(URL);
  await page.getByText('Reading signs').waitFor({ timeout: 45000 });
  await page.waitForTimeout(75000);
  await page.close(); // closing flushes any pending logs too
  await browser.close();
  console.log(external.length === 0 ? 'PASS  no requests left the machine in 75 s' : `FAIL  ${external.length} external requests: ${[...new Set(external)].join(', ')}`);
  process.exit(external.length === 0 ? 0 : 1);
})();
