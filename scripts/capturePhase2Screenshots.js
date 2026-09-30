/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const OUT_DIR = '/Users/maissaraselim/.gemini/antigravity/brain/dfe6126f-f624-4cdf-b68d-c87dedb116f6/phase2_screenshots';
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
    '--user-data-dir=/tmp/fls_chrome_phase2_' + Date.now(),
    '--window-size=1440,960',
    '--hide-scrollbars',
    '--disable-gpu',
    '--no-first-run',
  ]);

  let cdp;
  try {
    let targets;
    for (let i = 0; i < 30; i++) {
      await sleep(300);
      try {
        targets = await fetchJson(`http://127.0.0.1:${PORT}/json`);
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error('Failed to connect to Chrome remote debugging port.');
    }

    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    console.log('Attaching CDP to target page:', pageTarget.webSocketDebuggerUrl);

    cdp = new CdpSession(pageTarget.webSocketDebuggerUrl);
    await cdp.ready();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 960,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('Navigating to http://localhost:3000/studio...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/studio' });
    await sleep(2500);

    // 1. Study Brief (Desktop)
    console.log('Capturing 01_study_brief_desktop.png...');
    await cdp.captureScreenshot('01_study_brief_desktop.png');

    // 2. Questions & Scope (Desktop)
    console.log('Switching to Questions & Scope tab...');
    await cdp.eval(`(() => {
      const btn = document.querySelector('button[data-tab-id="study-questions"]');
      if (btn) btn.click();
    })()`);
    await sleep(1000);
    console.log('Capturing 02_study_questions_desktop.png...');
    await cdp.captureScreenshot('02_study_questions_desktop.png');

    // 3. Methods & Sources (Desktop)
    console.log('Switching to Methods & Sources tab...');
    await cdp.eval(`(() => {
      const btn = document.querySelector('button[data-tab-id="study-methods"]');
      if (btn) btn.click();
    })()`);
    await sleep(1000);
    console.log('Capturing 03_study_methods_desktop.png...');
    await cdp.captureScreenshot('03_study_methods_desktop.png');

    // 4. Framework & Roles (Desktop)
    console.log('Switching to Framework & Roles tab...');
    await cdp.eval(`(() => {
      const btn = document.querySelector('button[data-tab-id="study-framework"]');
      if (btn) btn.click();
    })()`);
    await sleep(1000);
    console.log('Capturing 04_study_framework_desktop.png...');
    await cdp.captureScreenshot('04_study_framework_desktop.png');

    // 5. Readiness Checklist Banner Expanded
    console.log('Switching back to Study Brief and expanding readiness checklist...');
    await cdp.eval(`(() => {
      const btn = document.querySelector('button[data-tab-id="study-brief"]');
      if (btn) btn.click();
    })()`);
    await sleep(800);
    await cdp.eval(`(() => {
      const toggle = document.querySelector('button[aria-expanded]');
      if (toggle && toggle.getAttribute('aria-expanded') === 'false') {
        toggle.click();
      }
    })()`);
    await sleep(800);
    console.log('Capturing 05_study_readiness_banner_expanded.png...');
    await cdp.captureScreenshot('05_study_readiness_banner_expanded.png');

    // 6. Cloned Study (Real / Editable)
    console.log('Clicking Clone Demo to Edit button...');
    await cdp.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cloneBtn = btns.find(b => b.textContent.includes('Clone Demo to Edit') || b.textContent.includes('Clone Demo'));
      if (cloneBtn) cloneBtn.click();
    })()`);
    await sleep(2000);
    console.log('Capturing 06_cloned_study_editable_desktop.png...');
    await cdp.captureScreenshot('06_cloned_study_editable_desktop.png');

    // 7. Synthesis Workbench Blueprint Link
    console.log('Navigating to Space 3 Analysis -> Synthesis Workbench...');
    await cdp.eval(`(() => {
      const spaceTab = document.querySelector('button[data-space-id="analysis"]');
      if (spaceTab) spaceTab.click();
    })()`);
    await sleep(1000);
    await cdp.eval(`(() => {
      const synTab = document.querySelector('button[data-tab-id="synthesis"]');
      if (synTab) synTab.click();
    })()`);
    await sleep(1000);
    console.log('Capturing 07_synthesis_workbench_blueprint_button.png...');
    await cdp.captureScreenshot('07_synthesis_workbench_blueprint_button.png');

    // 8-11. Mobile Viewports (390x844)
    console.log('Emulating iPhone viewport 390x844...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(800);

    // Switch back to Space 1: Study
    await cdp.eval(`(() => {
      const studySpace = document.querySelector('button[data-space-id="study"]');
      if (studySpace) studySpace.click();
    })()`);
    await sleep(800);

    // Mobile Study Brief
    await cdp.eval(`(() => {
      const btn = document.querySelector('button[data-tab-id="study-brief"]');
      if (btn) btn.click();
    })()`);
    await sleep(800);
    console.log('Capturing 08_study_brief_mobile_390px.png...');
    await cdp.captureScreenshot('08_study_brief_mobile_390px.png');

    // Mobile Questions & Scope
    await cdp.eval(`(() => {
      const btn = document.querySelector('button[data-tab-id="study-questions"]');
      if (btn) btn.click();
    })()`);
    await sleep(800);
    console.log('Capturing 09_study_questions_mobile_390px.png...');
    await cdp.captureScreenshot('09_study_questions_mobile_390px.png');

    // Mobile Methods & Sources
    await cdp.eval(`(() => {
      const btn = document.querySelector('button[data-tab-id="study-methods"]');
      if (btn) btn.click();
    })()`);
    await sleep(800);
    console.log('Capturing 10_study_methods_mobile_390px.png...');
    await cdp.captureScreenshot('10_study_methods_mobile_390px.png');

    // Mobile Framework & Roles
    await cdp.eval(`(() => {
      const btn = document.querySelector('button[data-tab-id="study-framework"]');
      if (btn) btn.click();
    })()`);
    await sleep(800);
    console.log('Capturing 11_study_framework_mobile_390px.png...');
    await cdp.captureScreenshot('11_study_framework_mobile_390px.png');

    console.log('All Phase 2 screenshots captured successfully!');
  } finally {
    if (cdp) cdp.close();
    chrome.kill();
  }
}

run().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
