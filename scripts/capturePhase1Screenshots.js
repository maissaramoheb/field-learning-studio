/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const OUT_DIR = '/Users/maissaraselim/.gemini/antigravity/brain/dfe6126f-f624-4cdf-b68d-c87dedb116f6/phase1_screenshots';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9222;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CdpSession {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.ws.on('message', (msg) => {
      const res = JSON.parse(msg.toString());
      if (res.id && this.callbacks.has(res.id)) {
        const { resolve, reject } = this.callbacks.get(res.id);
        this.callbacks.delete(res.id);
        if (res.error) reject(res.error);
        else resolve(res.result);
      }
    });
  }

  ready() {
    return new Promise((resolve) => {
      if (this.ws.readyState === WebSocket.OPEN) resolve();
      else this.ws.on('open', resolve);
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  async captureScreenshot(filename) {
    const res = await this.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.join(OUT_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
    return outPath;
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  console.log('Spawning headless Chrome...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=/tmp/fls_chrome_qa_' + Date.now(),
    '--window-size=1440,960',
    '--hide-scrollbars',
    '--disable-gpu',
    '--no-first-run',
  ]);

  let connected = false;
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      await fetchJson(`http://127.0.0.1:${PORT}/json/version`);
      connected = true;
      break;
    } catch {
      // wait
    }
  }

  if (!connected) {
    chrome.kill();
    throw new Error('Could not connect to Chrome debugging port.');
  }

  const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const cdp = new CdpSession(pageTarget.webSocketDebuggerUrl);
  await cdp.ready();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 960,
    deviceScaleFactor: 2,
    mobile: false,
  });

  console.log('1. Navigating to Study Library...');
  await cdp.send('Page.navigate', { url: 'http://localhost:3000/studio?view=library' });
  await sleep(2500);

  // 1. Study Library - Night
  await cdp.eval(`document.documentElement.setAttribute('data-theme', 'night')`);
  await sleep(400);
  await cdp.captureScreenshot('1_study_library_night.png');

  // 2. Study Library - Day
  await cdp.eval(`document.documentElement.setAttribute('data-theme', 'day')`);
  await sleep(400);
  await cdp.captureScreenshot('2_study_library_day.png');

  // Clone a demo case to verify My Studies populated
  console.log('Cloning demo case into My Studies...');
  await cdp.eval(`
    const cloneBtn = document.querySelector('[data-testid^="demo-card"] button.fls-button-quiet');
    if (cloneBtn) cloneBtn.click();
  `);
  await sleep(2000);

  // Now in Workspace with cloned Real Study!
  console.log('Inspecting cloned Real Study workspace...');
  await cdp.eval(`document.documentElement.setAttribute('data-theme', 'night')`);
  await sleep(500);
  await cdp.captureScreenshot('3_real_study_workspace_night.png');

  await cdp.eval(`document.documentElement.setAttribute('data-theme', 'day')`);
  await sleep(500);
  await cdp.captureScreenshot('4_real_study_workspace_day.png');

  // Test Back to Study Library button
  console.log('Testing < Back to Study Library button...');
  await cdp.eval(`
    const backBtn = document.querySelector('.fls-back-to-library-btn');
    if (backBtn) backBtn.click();
  `);
  await sleep(1500);

  // Capture Study Library with My Studies populated
  await cdp.eval(`document.documentElement.setAttribute('data-theme', 'night')`);
  await sleep(400);
  await cdp.captureScreenshot('5_study_library_with_real_study_night.png');

  await cdp.eval(`document.documentElement.setAttribute('data-theme', 'day')`);
  await sleep(400);
  await cdp.captureScreenshot('6_study_library_with_real_study_day.png');

  // Now open Demo Study
  console.log('Opening Demo Study...');
  await cdp.eval(`
    const openDemoBtn = document.querySelector('[data-testid^="demo-card"] button.fls-button-primary');
    if (openDemoBtn) openDemoBtn.click();
  `);
  await sleep(1500);

  // 7. Demo Study Workspace - Space 1: Study (Night & Day)
  await cdp.eval(`document.documentElement.setAttribute('data-theme', 'night')`);
  await sleep(500);
  await cdp.captureScreenshot('7_demo_study_space1_study_night.png');

  await cdp.eval(`document.documentElement.setAttribute('data-theme', 'day')`);
  await sleep(500);
  await cdp.captureScreenshot('8_demo_study_space1_study_day.png');

  // 8. Space 2: Field Material
  console.log('Navigating to Space 2: Field Material...');
  await cdp.eval(`
    const space2 = document.querySelector('#space-field-material');
    if (space2) space2.click();
  `);
  await sleep(1000);
  await cdp.eval(`document.documentElement.setAttribute('data-theme', 'night')`);
  await sleep(400);
  await cdp.captureScreenshot('9_demo_study_space2_field_night.png');

  await cdp.eval(`document.documentElement.setAttribute('data-theme', 'day')`);
  await sleep(400);
  await cdp.captureScreenshot('10_demo_study_space2_field_day.png');

  // 9. Space 3: Analysis
  console.log('Navigating to Space 3: Analysis...');
  await cdp.eval(`
    const space3 = document.querySelector('#space-analysis');
    if (space3) space3.click();
  `);
  await sleep(1000);
  await cdp.eval(`document.documentElement.setAttribute('data-theme', 'night')`);
  await sleep(400);
  await cdp.captureScreenshot('11_demo_study_space3_analysis_night.png');

  await cdp.eval(`document.documentElement.setAttribute('data-theme', 'day')`);
  await sleep(400);
  await cdp.captureScreenshot('12_demo_study_space3_analysis_day.png');

  // 10. Space 4: Deliverables
  console.log('Navigating to Space 4: Deliverables...');
  await cdp.eval(`
    const space4 = document.querySelector('#space-deliverables');
    if (space4) space4.click();
  `);
  await sleep(1000);
  await cdp.eval(`document.documentElement.setAttribute('data-theme', 'night')`);
  await sleep(400);
  await cdp.captureScreenshot('13_demo_study_space4_deliverables_night.png');

  await cdp.eval(`document.documentElement.setAttribute('data-theme', 'day')`);
  await sleep(400);
  await cdp.captureScreenshot('14_demo_study_space4_deliverables_day.png');

  console.log('All screenshots captured successfully!');
  cdp.close();
  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error('Visual QA error:', err);
  process.exit(1);
});
