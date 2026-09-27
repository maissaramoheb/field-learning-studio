import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "/Users/maissaraselim/.gemini/antigravity/brain/dfe6126f-f624-4cdf-b68d-c87dedb116f6";
const SCREENSHOTS_DIR = path.join(ARTIFACT_DIR, "hardening_screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPresentationJourney() {
  console.log("=== Starting Final Hardening Presentation Verification ===");

  const targetsRes = await fetch("http://127.0.0.1:9222/json");
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === "page");

  if (!pageTarget) {
    throw new Error("Could not find Chrome page target");
  }

  console.log(`Connecting to CDP target: ${pageTarget.webSocketDebuggerUrl}`);
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let idCounter = 1;
  const pendingRequests = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pendingRequests.has(data.id)) {
      const { resolve, reject } = pendingRequests.get(data.id);
      pendingRequests.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evalScript(expression) {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(result.exceptionDetails)}`);
    }
    return result.result?.value;
  }

  async function captureScreenshot(filename) {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const subpath = path.join(SCREENSHOTS_DIR, filename);
    fs.writeFileSync(subpath, Buffer.from(data, "base64"));
    const rootPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(rootPath, Buffer.from(data, "base64"));
    console.log(`Saved screenshot: ${filename}`);
  }

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1.5,
    mobile: false,
  });

  async function scrollToWorkspace() {
    await evalScript(`(() => {
      const nav = document.querySelector("nav[aria-label*='practitioner spaces']");
      if (nav) nav.scrollIntoView({ behavior: 'instant', block: 'start' });
    })()`);
    await sleep(400);
  }

  // Navigate to local production app
  console.log("Navigating to http://localhost:3000 ...");
  await send("Page.navigate", { url: "http://localhost:3000" });
  await sleep(2500);

  // 1. Study Home
  console.log("1. Verifying Study Space (Study Home)...");
  await evalScript(`(() => {
    const cards = Array.from(document.querySelectorAll("button"));
    const snCard = cards.find(c => c.innerText.includes("School Nutrition"));
    if (snCard) snCard.click();
    const studyTab = Array.from(document.querySelectorAll("button[data-space-id='study']")).find(Boolean);
    if (studyTab) studyTab.click();
  })()`);
  await scrollToWorkspace();
  await captureScreenshot("study.png");

  // 2. Field Material Space
  console.log("2. Verifying Field Material Space...");
  await evalScript(`(() => {
    const fmSpace = Array.from(document.querySelectorAll("button[data-space-id='field-material']")).find(Boolean);
    if (fmSpace) fmSpace.click();
  })()`);
  await scrollToWorkspace();
  await captureScreenshot("field_material.png");

  // 3. Analysis Space
  console.log("3. Verifying Analysis Space...");
  await evalScript(`(() => {
    const analysisSpace = Array.from(document.querySelectorAll("button[data-space-id='analysis']")).find(Boolean);
    if (analysisSpace) analysisSpace.click();
  })()`);
  await scrollToWorkspace();
  await captureScreenshot("analysis.png");

  // 4. Evidence Coverage & Limitations in Finding modal
  console.log("4. Verifying Finding Authoring with Evidence Coverage & Limitations...");
  await evalScript(`(() => {
    const synthTab = document.querySelector("button[data-tab-id='synthesis']");
    if (synthTab) synthTab.click();
  })()`);
  await sleep(1500);
  await evalScript(`(() => {
    const authorBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Author Draft Finding"));
    if (authorBtn) {
      authorBtn.click();
    }
  })()`);
  await sleep(1000);
  await evalScript(`(() => {
    const evLabels = Array.from(document.querySelectorAll("div.max-h-56 label"));
    if (evLabels[0]) evLabels[0].click();
    if (evLabels[1]) evLabels[1].click();
  })()`);
  await sleep(1000);
  await captureScreenshot("finding_coverage.png");

  // Close finding modal
  await evalScript(`(() => {
    const closeBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText === "✕" || b.innerText === "Cancel");
    if (closeBtn) closeBtn.click();
  })()`);
  await sleep(600);

  // 5. Deliverables Space (Recommendations)
  console.log("5. Verifying Deliverables Space (Recommendations)...");
  await evalScript(`(() => {
    const delivSpace = document.querySelector("button[data-space-id='deliverables']");
    if (delivSpace) delivSpace.click();
  })()`);
  await sleep(600);
  await evalScript(`(() => {
    const recTab = document.querySelector("button[data-tab-id='recommendations']");
    if (recTab) recTab.click();
  })()`);
  await scrollToWorkspace();
  await captureScreenshot("deliverables.png");

  // 6. Deliverables Space (Learning Brief preview)
  console.log("6. Verifying Final Draft / Brief Preview...");
  await evalScript(`(() => {
    const briefTab = document.querySelector("button[data-tab-id='brief']");
    if (briefTab) briefTab.click();
  })()`);
  await scrollToWorkspace();
  await captureScreenshot("final_draft_preview.png");

  console.log("=== All 6 Critical Journey Screenshots Captured Successfully! ===");
  ws.close();
}

runPresentationJourney().catch((err) => {
  console.error("Presentation journey verification failed:", err);
  process.exit(1);
});
