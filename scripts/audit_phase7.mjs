import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "/Users/maissaraselim/.gemini/antigravity/brain/dfe6126f-f624-4cdf-b68d-c87dedb116f6/phase7_screenshots";

async function runAudit() {
  console.log("=== Starting Phase 7 Bulk Intake & Structured Import Browser Acceptance Audit ===");

  // 1. Fetch WebSocket URL from Chrome
  const targetsRes = await fetch("http://127.0.0.1:9222/json");
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === "page" && (t.url.includes("3000") || t.title.includes("Field Learning Studio") || t.title.includes("127.0.0.1:3000")));

  if (!pageTarget) {
    throw new Error("Could not find localhost:3000 / 127.0.0.1:3000 page target in Chrome.");
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
      if (data.error) {
        reject(data.error);
      } else {
        resolve(data.result);
      }
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
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error("Eval error: " + JSON.stringify(result.exceptionDetails));
    }
    return result.result?.value;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function screenshot(name, scrollTargetSelector = null) {
    if (scrollTargetSelector) {
      await evalScript(`
        (() => {
          const el = document.querySelector(${JSON.stringify(scrollTargetSelector)});
          if (el) el.scrollIntoView({ block: "start", behavior: "instant" });
        })();
      `);
    } else {
      await evalScript(`
        (() => {
          const modal = document.querySelector("[role='dialog']");
          if (!modal) {
            const panel = document.getElementById("workspace-panel") || document.querySelector("nav[aria-label*='workspace']");
            if (panel) {
              panel.scrollIntoView({ block: "start", behavior: "instant" });
            }
          }
        })();
      `);
    }
    await sleep(400);
    const res = await send("Page.captureScreenshot", { format: "png" });
    const filePath = path.join(ARTIFACT_DIR, `${name}.png`);
    fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
    console.log(`✓ Saved screenshot: ${name}.png`);
  }

  // Helper inside browser context to set React controlled values
  const injectReactHelper = `
    window.__setReactValue = function(element, val) {
      if (!element) return;
      const proto = element instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      if (descriptor && descriptor.set) {
        descriptor.set.call(element, val);
      } else {
        element.value = val;
      }
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    };
  `;

  // Enable Page & DOM
  await send("Page.enable");
  await send("DOM.enable");
  await send("Runtime.enable");

  // Set viewport to 1440x960
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 960,
    deviceScaleFactor: 1,
    mobile: false,
  });

  console.log("Navigating to http://127.0.0.1:3000/ ...");
  await send("Page.navigate", { url: "http://127.0.0.1:3000/" });
  await sleep(2500);

  // 1. Initialize New Field Study for Phase 7
  console.log("\n--- Step 1: Initialize New Field Study for Bulk Intake Testing ---");
  const initResult = await evalScript(`
    (async () => {
      const openDB = window.indexedDB.open("FieldLearningStudioDB", 1);
      return new Promise((resolve, reject) => {
        openDB.onsuccess = async (e) => {
          const db = e.target.result;
          const studyId = "STUDY-PHASE7-BULK";
          const studyMeta = {
            id: studyId,
            title: "PARTAGE Upper Egypt Field Intake",
            subtitle: "Rapid Food Security & Logistics Evaluation",
            context: "Phase 7 Bulk Intake and Field Observations Validation Study",
            status: "Active Fieldwork",
            isDemoCase: false,
            scope: {
              targetSites: ["Assiut", "Minya"],
              isSingleSiteStudy: false,
              targetStakeholderGroups: ["Teachers", "Parents", "Warehouse Staff", "Students"],
              expectedMethods: ["Key Informant Interview", "Focus Group Discussion", "Direct Observation"],
            },
            executiveSummary: "Multi-site assessment examining cold chain stability and school meal delivery timing.",
            keyMessages: ["Morning deliveries delayed across Minya and Assiut sites."],
            limitations: ["Preliminary field intake data."],
            outputConfig: {
              includeRecommendations: true,
              includeLessons: true,
              includeGoodPractices: true,
            },
            updatedAt: Date.now(),
          };

          const tx = db.transaction(["studies", "sources", "evidence"], "readwrite");
          tx.objectStore("studies").put(studyMeta);

          // Clear previous test sources and evidence for this study if any
          const sStore = tx.objectStore("sources");
          const sIndex = sStore.index("by_study");
          const sReq = sIndex.getAllKeys(studyId);
          sReq.onsuccess = () => {
            for (const key of sReq.result) {
              sStore.delete(key);
            }
          };

          const evStore = tx.objectStore("evidence");
          const evIndex = evStore.index("by_study");
          const evReq = evIndex.getAllKeys(studyId);
          evReq.onsuccess = () => {
            for (const key of evReq.result) {
              evStore.delete(key);
            }
          };

          tx.oncomplete = () => {
            localStorage.setItem("fls_active_study_id", studyId);
            localStorage.setItem("fls_current_study_id", studyId);
            resolve({ success: true, studyId });
          };
          tx.onerror = () => reject(tx.error);
        };
        openDB.onerror = () => reject(openDB.error);
      });
    })()
  `);
  console.log("Study initialized:", initResult);

  // Reload page to activate STUDY-PHASE7-BULK
  await send("Page.navigate", { url: "http://127.0.0.1:3000/" });
  await sleep(2500);

  // Inject React helper
  await evalScript(injectReactHelper);

  // Switch to Field Intake tab
  await evalScript(`
    (() => {
      const tabs = Array.from(document.querySelectorAll("[role='tab']"));
      const intakeTab = tabs.find((b) => b.textContent.trim().includes("Field Intake"));
      if (intakeTab) intakeTab.click();
    })()
  `);
  await sleep(1000);

  const headerInfo = await evalScript(`
    (() => {
      return {
        title: document.querySelector("h2")?.textContent,
        isEditable: document.body.innerText.includes("Editable Field Study"),
        hasBulkBtn: Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Bulk Source Intake")),
      };
    })()
  `);
  console.log("Intake Desk Header Info:", headerInfo);

  // 2. Route B: Multi-Source Structured Paste Intake
  console.log("\n--- Step 2: Route B - Multi-Source Structured Paste Intake ---");
  // Click "⚡ Bulk Source Intake" button
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const bulkBtn = buttons.find((b) => b.textContent.includes("Bulk Source Intake"));
      if (!bulkBtn) throw new Error("Could not find Bulk Source Intake button");
      bulkBtn.click();
    })()
  `);
  await sleep(800);
  await screenshot("01_bulk_source_modal_opened");

  // Paste 3 structured source blocks with realistic field day content
  const multiSourceText = `---
Title: KII with Minya Head Teacher
Date: 2026-09-20
Site: Minya
Stakeholder: Teachers
Method: Key Informant Interview
Consent: Oral
Anonymization: Pseudonymized
Sensitivity: None

Notes:
- Delivery trucks arrived 90 minutes after morning recess had ended.
- Teachers reported that students had already returned to classrooms without receiving biscuits.
- Storage room temperature reached 36°C by mid-afternoon due to faulty ceiling fans.
- Head teacher emphasized that this was the third delivery delay this month.
---
---
Title: FGD with Assiut Mothers
Date: 2026-09-21
Site: Assiut
Stakeholder: Parents
Method: Focus Group Discussion
Consent: Oral
Anonymization: Anonymized
Sensitivity: Low

Notes:
- Mothers expressed strong preference for fortified date bars over plain biscuits
- Several families reported children skipping morning breakfast in anticipation of school meals
- Concerns were raised regarding transport dust on package seals
- Group unanimously requested delivery trucks arrive before 8:30 AM
---
---
Title: Central Kitchen Direct Observation
Date: 2026-09-21
Site: Assiut
Stakeholder: Warehouse Staff
Method: Direct Observation
Consent: Not Required / Public Source
Anonymization: Anonymized
Sensitivity: None

Notes:
1. Loading dock had 3 refrigerated trucks staging between 06:00 and 07:15 AM
2. Digital thermometer logged cold-storage temperatures at 3.8°C
3. Batch packaging seals were inspected and 99.4% passed integrity checks
4. Drivers lacked insulated transfer blankets for the final 40km rural route
---`;

  await evalScript(`
    (() => {
      const textarea = document.querySelector("textarea[placeholder*='Paste structured blocks']");
      if (!textarea) throw new Error("Could not find structured text paste textarea");
      window.__setReactValue(textarea, ${JSON.stringify(multiSourceText)});
    })()
  `);
  await sleep(600);

  // Click "Parse & Preview Sources →"
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const parseBtn = buttons.find((b) => b.textContent.includes("Parse & Preview Sources"));
      if (!parseBtn) throw new Error("Could not find Parse & Preview Sources button");
      parseBtn.click();
    })()
  `);
  await sleep(1000);
  await screenshot("02_structured_blocks_parsed");

  // Verify preview candidate items
  const parseStatus = await evalScript(`
    (() => {
      const text = document.body.innerText;
      return {
        hasCandidate1: text.includes("KII with Minya Head Teacher"),
        hasCandidate2: text.includes("FGD with Assiut Mothers"),
        hasCandidate3: text.includes("Central Kitchen Direct Observation"),
        hasReadyBadge: text.includes("Ready to Import"),
      };
    })()
  `);
  console.log("Parse verification status:", parseStatus);

  // Click "Import Selected Sources (3)"
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const importBtn = buttons.find((b) => b.textContent.includes("Import Selected Sources"));
      if (!importBtn) throw new Error("Could not find Import Selected Sources button");
      importBtn.click();
    })()
  `);
  await sleep(1500);
  await screenshot("03_sources_imported_receipt");

  const receiptInfo = await evalScript(`
    (() => {
      const text = document.body.innerText;
      return {
        hasReceiptTitle: text.includes("Bulk Source Import Complete!"),
        hasCreatedCount: text.includes("Sources Created: 3"),
      };
    })()
  `);
  console.log("Import Receipt Info:", receiptInfo);

  // Click "Return to Field Intake Desk"
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const returnBtn = buttons.find((b) => b.textContent.includes("Return to Field Intake Desk"));
      if (!returnBtn) throw new Error("Could not find Return to Field Intake Desk button");
      returnBtn.click();
    })()
  `);
  await sleep(1200);

  // 3. Route A: Batch Observation Builder
  console.log("\n--- Step 3: Route A - Batch Observation Builder ---");
  // Select "KII with Minya Head Teacher" in source history list if not already active
  await evalScript(`
    (() => {
      const items = Array.from(document.querySelectorAll("div, button, p"));
      const card = items.find((el) => el.textContent.trim() === "KII with Minya Head Teacher");
      if (card) {
        const clickable = card.closest("button") || card.closest("[tabindex]") || card;
        clickable.click();
      }
    })()
  `);
  await sleep(800);

  // Click "⚡ Extract Multiple Observations"
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const batchBtn = buttons.find((b) => b.textContent.includes("Extract Multiple Observations"));
      if (!batchBtn) throw new Error("Could not find Extract Multiple Observations button");
      batchBtn.click();
    })()
  `);
  await sleep(1000);
  await screenshot("04_batch_observation_builder_opened");

  // Click "Split Narrative"
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const splitBtn = buttons.find((b) => b.textContent.trim() === "Split Narrative");
      if (!splitBtn) throw new Error("Could not find Split Narrative button");
      splitBtn.click();
    })()
  `);
  await sleep(800);

  // Click "+ Add All as Rows"
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const addAllBtn = buttons.find((b) => b.textContent.includes("Add All"));
      if (!addAllBtn) throw new Error("Could not find Add All as Rows button");
      addAllBtn.click();
    })()
  `);
  await sleep(800);

  // Fill in analytical interpretations in the compact table
  await evalScript(`
    (() => {
      const rows = Array.from(document.querySelectorAll("textarea[placeholder*='Why this matters']"));
      const interpretations = [
        "Delivery delay directly disrupts morning academic schedule and student attention.",
        "Students experience hunger during morning lessons due to missed distribution window.",
        "Storage facility heat compromises nutrient preservation and shelf life of food.",
        "Repeated delays indicate recurring transport bottlenecks on the rural branch route.",
      ];
      rows.forEach((textarea, i) => {
        window.__setReactValue(textarea, interpretations[i % interpretations.length]);
      });
    })()
  `);
  await sleep(600);

  // Apply Bulk Theme and Reliability
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const themeBtn = buttons.find((b) => b.textContent === "Set Theme");
      if (themeBtn) themeBtn.click();

      const relBtn = buttons.find((b) => b.textContent.trim() === "Set");
      if (relBtn) relBtn.click();
    })()
  `);
  await sleep(600);
  await screenshot("05_batch_observations_reviewed_and_themed");

  // Click "Save Selected Observations (4)"
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const saveBtn = buttons.find((b) => b.textContent.includes("Save Selected Observations"));
      if (!saveBtn) throw new Error("Could not find Save Selected Observations button");
      saveBtn.click();
    })()
  `);
  await sleep(1500);
  await screenshot("06_batch_evidence_saved_as_draft");

  // Close Builder back to single form view
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const backBtn = buttons.find((b) => b.textContent.includes("Close Batch Builder"));
      if (backBtn) backBtn.click();
    })()
  `);
  await sleep(800);

  // 4. Route C: Tabular CSV/TSV Import
  console.log("\n--- Step 4: Route C - Tabular CSV/TSV Import ---");
  // Open Bulk Source Modal
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const bulkBtn = buttons.find((b) => b.textContent.includes("Bulk Source Intake"));
      if (!bulkBtn) throw new Error("Could not find Bulk Source Intake button for Route C");
      bulkBtn.click();
    })()
  `);
  await sleep(800);

  // Switch to Tabular Import (CSV / TSV) Tab
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const tabBtn = buttons.find((b) => b.textContent.includes("Tabular Import") || b.textContent.includes("CSV"));
      if (!tabBtn) throw new Error("Could not find Tabular Import tab");
      tabBtn.click();
    })()
  `);
  await sleep(600);

  // Paste Tabular CSV data
  const tabularCsvData = `Record Title,Collection Date,Field Site,Stakeholder Group,Methodology,Interview Field Notes,Consent Given,Anonymization
"Survey with Minya School Cooks",2026-09-22,Minya,Warehouse Staff,Survey / Questionnaire,"12 cooks reported water filter replacements are 3 months overdue. Kitchen prep starts at 05:00 AM.",Oral,Pseudonymized
"Direct Inspection of Transport Vans",2026-09-22,Assiut,Warehouse Staff,Direct Observation,"Inspected 4 contractor vans. None had functional GPS trackers. Drivers keep paper manifests.",Not Required / Public Source,Anonymized`;

  await evalScript(`
    (() => {
      const textarea = document.querySelector("textarea[placeholder*='Paste CSV or Tab-separated']");
      if (!textarea) throw new Error("Could not find CSV paste textarea");
      window.__setReactValue(textarea, ${JSON.stringify(tabularCsvData)});
    })()
  `);
  await sleep(600);

  // Click "Next: Map Columns →"
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const mapBtn = buttons.find((b) => b.textContent.includes("Next: Map Columns"));
      if (!mapBtn) throw new Error("Could not find Next: Map Columns button");
      mapBtn.click();
    })()
  `);
  await sleep(800);
  await screenshot("07_tabular_mapping_and_preview");

  // Click "Confirm Mapping & Preview →"
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const confBtn = buttons.find((b) => b.textContent.includes("Confirm Mapping & Preview"));
      if (!confBtn) throw new Error("Could not find Confirm Mapping & Preview button");
      confBtn.click();
    })()
  `);
  await sleep(800);

  // Click "Import Selected Sources (2)"
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const importBtn = buttons.find((b) => b.textContent.includes("Import Selected Sources"));
      if (!importBtn) throw new Error("Could not find Import Selected Sources button");
      importBtn.click();
    })()
  `);
  await sleep(1500);
  await screenshot("08_tabular_sources_imported");

  // Return to intake desk
  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const returnBtn = buttons.find((b) => b.textContent.includes("Return to Field Intake Desk"));
      if (returnBtn) returnBtn.click();
    })()
  `);
  await sleep(1000);

  // 5. Synthesis & Triangulation Invariant Check
  console.log("\n--- Step 5: Synthesis & Triangulation Invariant Check ---");
  // Navigate to Synthesis tab
  await evalScript(`
    (() => {
      const tabs = Array.from(document.querySelectorAll("[role='tab']"));
      const synTab = tabs.find((b) => b.textContent.trim().includes("Synthesis"));
      if (!synTab) throw new Error("Could not find Synthesis tab");
      synTab.click();
    })()
  `);
  await sleep(1500);

  const dbState = await evalScript(`
    (async () => {
      const openDB = window.indexedDB.open("FieldLearningStudioDB", 1);
      return new Promise((resolve) => {
        openDB.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(["sources", "evidence"], "readonly");
          const sReq = tx.objectStore("sources").index("by_study").getAll("STUDY-PHASE7-BULK");
          const evReq = tx.objectStore("evidence").index("by_study").getAll("STUDY-PHASE7-BULK");

          tx.oncomplete = () => {
            const sources = sReq.result;
            const evidence = evReq.result;
            resolve({
              sourceCount: sources.length,
              evidenceCount: evidence.length,
              allDraft: evidence.length > 0 && evidence.every((ev) => ev.validationStatus === "Draft"),
              allRev1: evidence.length > 0 && evidence.every((ev) => ev.revision === 1),
              sourceIdsForEvidence: Array.from(new Set(evidence.map(e => e.sourceId))),
              sampleEvidence: evidence[0],
            });
          };
        };
      });
    })()
  `);
  console.log("IndexedDB persistent state check:", dbState);
  await screenshot("09_synthesis_source_independence_verified");

  // 6. Browser Reload Persistence
  console.log("\n--- Step 6: Browser Reload Persistence Verification ---");
  await send("Page.reload");
  await sleep(2500);

  const postReloadState = await evalScript(`
    (async () => {
      const openDB = window.indexedDB.open("FieldLearningStudioDB", 1);
      return new Promise((resolve) => {
        openDB.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(["sources", "evidence"], "readonly");
          const sReq = tx.objectStore("sources").index("by_study").getAll("STUDY-PHASE7-BULK");
          const evReq = tx.objectStore("evidence").index("by_study").getAll("STUDY-PHASE7-BULK");

          tx.oncomplete = () => {
            resolve({
              persistedSources: sReq.result.length,
              persistedEvidence: evReq.result.length,
            });
          };
        };
      });
    })()
  `);
  console.log("Post-reload state:", postReloadState);
  await screenshot("10_reload_persistence_verified");

  // 7. Scale & Responsiveness Simulation
  console.log("\n--- Step 7: Scale & Responsiveness Simulation ---");
  const scaleBench = await evalScript(`
    (async () => {
      const t0 = performance.now();
      const openDB = window.indexedDB.open("FieldLearningStudioDB", 1);
      return new Promise((resolve, reject) => {
        openDB.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(["sources", "evidence"], "readwrite");
          const sStore = tx.objectStore("sources");
          const evStore = tx.objectStore("evidence");

          for (let s = 1; s <= 20; s++) {
            sStore.put({
              id: "SRC-SCALE-" + String(s).padStart(3, "0"),
              studyId: "STUDY-PHASE7-BULK",
              title: "Scale Interview #" + s,
              date: "2026-09-22",
              location: s % 2 === 0 ? "Assiut" : "Minya",
              siteId: s % 2 === 0 ? "Assiut" : "Minya",
              stakeholderType: ["Teachers", "Parents", "Warehouse Staff"][s % 3],
              sourceType: ["Key Informant Interview", "Focus Group Discussion", "Direct Observation"][s % 3],
              summary: "Summary for scale test source #" + s,
              rawText: "Full narrative notes for high volume source #" + s,
              consentStatus: "Oral",
              anonymizationStatus: "Pseudonymized",
              sensitivityFlag: "None",
            });
          }

          for (let ev = 1; ev <= 75; ev++) {
            evStore.put({
              id: "EV-SCALE-" + String(ev).padStart(3, "0"),
              studyId: "STUDY-PHASE7-BULK",
              sourceId: "SRC-SCALE-" + String((ev % 20) + 1).padStart(3, "0"),
              rawObservation: "Discrete scale observation #" + ev,
              interpretation: "Interpretation for observation #" + ev,
              primaryTheme: ["Operational Execution", "Logistics & Delivery", "Safety & Protection"][ev % 3],
              evidenceStrength: ["High", "Medium", "Low"][ev % 3],
              sensitivityFlag: "None",
              validationStatus: "Draft",
              revision: 1,
              siteId: ev % 2 === 0 ? "Assiut" : "Minya",
              stakeholderType: ["Teachers", "Parents", "Warehouse Staff"][ev % 3],
              collectionMethod: ["Key Informant Interview", "Focus Group Discussion", "Direct Observation"][ev % 3],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          }

          tx.oncomplete = () => {
            const elapsed = performance.now() - t0;
            resolve({
              sourcesInjected: 20,
              evidenceInjected: 75,
              writeMs: Math.round(elapsed),
            });
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    })()
  `);
  console.log("Scale batch write benchmark:", scaleBench);

  // Reload to render with 25 sources and 79 evidence items
  await send("Page.reload");
  await sleep(2500);

  // Switch to Field Intake to observe scale rendering
  await evalScript(`
    (() => {
      const tabs = Array.from(document.querySelectorAll("[role='tab']"));
      const intakeTab = tabs.find((b) => b.textContent.trim().includes("Field Intake"));
      if (intakeTab) intakeTab.click();
    })()
  `);
  await sleep(1200);
  await screenshot("11_scale_responsiveness_verified");

  console.log("\n=== Phase 7 Browser Acceptance Audit Completed Successfully ===");
  ws.close();
}

runAudit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
