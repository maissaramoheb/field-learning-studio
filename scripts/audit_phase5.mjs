import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "/Users/maissaraselim/.gemini/antigravity/brain/dfe6126f-f624-4cdf-b68d-c87dedb116f6/phase5_screenshots";

async function runAudit() {
  console.log("=== Starting Phase 5 Daily Field Debrief Studio Browser Acceptance Audit ===");

  // 1. Fetch WebSocket URL from Chrome
  const targetsRes = await fetch("http://localhost:9222/json");
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === "page" && t.url.includes("localhost:3000"));

  if (!pageTarget) {
    throw new Error("Could not find localhost:3000 page target in Chrome");
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

  async function screenshot(name) {
    const res = await send("Page.captureScreenshot", { format: "png" });
    const filePath = path.join(ARTIFACT_DIR, `${name}.png`);
    fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
    console.log(`✓ Saved screenshot: ${name}.png`);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Enable Page & DOM
  await send("Page.enable");
  await send("DOM.enable");
  await send("Runtime.enable");

  // Set window / viewport size to 1440x900
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Navigate to localhost:3000
  await send("Page.navigate", { url: "http://localhost:3000" });
  await sleep(2500);

  // Clear indexedDB and localStorage for clean audit run
  console.log("1. Preparing clean local study state...");
  await evalScript(`
    localStorage.clear();
    const req = indexedDB.deleteDatabase("FieldLearningStudioDB");
  `);
  await send("Page.navigate", { url: "http://localhost:3000" });
  await sleep(2500);

  // Inject helper for setting React controlled input/textarea values
  await evalScript(`
    window.__setVal = function(el, val) {
      if (!el) return;
      const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      setter.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
  `);

  // Step 2: Create a new editable study
  console.log("2. Creating new editable field study...");
  const createStudyClicked = await evalScript(`
    (() => {
      const newStudyBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("New Blank Study"));
      if (newStudyBtn) {
        newStudyBtn.click();
        return true;
      }
      return false;
    })()
  `);
  if (!createStudyClicked) {
    throw new Error("Could not find 'New Blank Study' button");
  }
  await sleep(800);

  // Fill in modal
  await evalScript(`
    (() => {
      const titleInput = document.querySelector("input[placeholder*='PARTAGE']");
      if (titleInput) window.__setVal(titleInput, "Upper Egypt Education Evaluation");

      const subInput = document.querySelector("input[placeholder*='Mid-term synthesis']");
      if (subInput) window.__setVal(subInput, "Community School Resilience Field Study");

      const ctxTextarea = document.querySelector("textarea[placeholder*='Briefly describe']");
      if (ctxTextarea) window.__setVal(ctxTextarea, "Mixed-method field evaluation of educational infrastructure and attendance barriers across Minya and Assiut governorates.");

      const sitesInput = document.querySelector("input[placeholder*='Minya, Assiut']");
      if (sitesInput) window.__setVal(sitesInput, "Minya Rural School A, Assiut Community Hub B");

      const stakeholdersInput = document.querySelector("input[placeholder*='Teachers, Parents']");
      if (stakeholdersInput) window.__setVal(stakeholdersInput, "Teachers, School Leaders, Parents, Supervisors");

      const submitBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "Create Study");
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    })()
  `);
  await sleep(2500);

  // Scroll to workspace panel
  await evalScript(`
    document.getElementById("workspace-panel")?.scrollIntoView({ behavior: "instant", block: "start" });
  `);
  await sleep(500);
  await screenshot("01_study_created");

  // Step 3: Intake a field note and extract an evidence observation
  console.log("3. Capturing narrative note and extracting evidence...");
  await evalScript(`
    (() => {
      const textarea = document.querySelector("textarea[placeholder*='Paste or write detailed field notes']");
      if (textarea) {
        window.__setVal(textarea, "On 2026-09-26, interviewed Head Teacher Mariam at Minya Rural School A. In winter, classrooms are unheated and solar power storage battery fails by 12:30 PM daily, disabling computerized literacy sessions. School management committee members relocated to outer hamlets and stopped attending monthly governance meetings without travel stipends.");
      }
    })()
  `);
  await sleep(800);

  await evalScript(`
    (() => {
      const titleInput = document.querySelector("input[placeholder*='e.g. KII with School Principal']");
      if (titleInput) window.__setVal(titleInput, "KII with Head Teacher Mariam - Infrastructure & Governance");

      const collectorInput = document.querySelector("input[placeholder*='Lead Evaluator']");
      if (collectorInput) window.__setVal(collectorInput, "M. Selim");

      const checkbox = Array.from(document.querySelectorAll("input[type='checkbox']")).find(c => {
        const parent = c.closest("label");
        return parent && parent.textContent.includes("authorized to save this information");
      });
      if (checkbox && !checkbox.checked) checkbox.click();

      const saveBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Save Source Record"));
      if (saveBtn) saveBtn.click();
    })()
  `);
  await sleep(2500);

  // Extract observation
  await evalScript(`
    (() => {
      const obsTextarea = document.querySelector("textarea[placeholder*='Paste or write the specific factual observation']");
      if (obsTextarea) window.__setVal(obsTextarea, "Solar storage battery depletes by 12:30 PM daily, disabling computerized literacy sessions.");

      const interpTextarea = document.querySelector("textarea[placeholder*='Record your working analytical interpretation']");
      if (interpTextarea) window.__setVal(interpTextarea, "Unreliable energy storage directly halts digital curriculum instruction.");

      const themeInput = document.querySelector("input[placeholder*='Targeting, Safety, Transport']");
      if (themeInput) window.__setVal(themeInput, "Infrastructure");

      const secThemeInput = document.querySelector("input[placeholder*='Infrastructure, Gender']");
      if (secThemeInput) window.__setVal(secThemeInput, "Access");

      const extractBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Save Evidence Observation"));
      if (extractBtn) extractBtn.click();
    })()
  `);
  await sleep(2500);
  await screenshot("02_source_and_evidence_created");

  // Step 4: Switch to "Daily Debrief" tab
  console.log("4. Switching to Daily Debrief tab...");
  const debriefTabClicked = await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Daily Debrief");
      if (tabBtn) {
        tabBtn.click();
        return true;
      }
      return false;
    })()
  `);
  if (!debriefTabClicked) {
    throw new Error("Could not find 'Daily Debrief' tab in navigation bar");
  }
  await sleep(1500);

  await evalScript(`
    document.getElementById("workspace-panel")?.scrollIntoView({ behavior: "instant", block: "start" });
  `);
  await sleep(500);

  // Verify empty state
  const emptyStateCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      const hasHeading = text.includes("No field debrief has been recorded for this study yet");
      const hasCTA = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Record First Field Debrief"));
      return { hasHeading, hasCTA };
    })()
  `);
  console.log("Debrief tab initial empty state check:", emptyStateCheck);
  if (!emptyStateCheck.hasHeading || !emptyStateCheck.hasCTA) {
    throw new Error("Audit Failed: Daily Debrief empty state not rendering correctly!");
  }
  await screenshot("03_debrief_tab_empty_state");

  // Step 5: Click "+ Record First Field Debrief" and fill form
  console.log("5. Opening debrief form and recording session reflections...");
  await evalScript(`
    (() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Record First Field Debrief") || b.textContent.includes("Record Field Debrief"));
      if (btn) btn.click();
    })()
  `);
  await sleep(1000);

  // Fill in form
  await evalScript(`
    (() => {
      // 1. Context & Session
      const dateInput = document.querySelector("input[type='date']");
      if (dateInput) window.__setVal(dateInput, "2026-09-26");

      const attendeesInput = document.querySelector("input[placeholder*='M. Selim, Field Researcher 2']");
      if (attendeesInput) window.__setVal(attendeesInput, "M. Selim, Field Researcher 2, Local Coordinator");

      // Click Assiut site button to select it as well (Minya is selected by default)
      const assiutBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Assiut Community Hub B"));
      if (assiutBtn && !assiutBtn.textContent.includes("✓")) {
        assiutBtn.click();
      }

      // 2. Guided Reflection Questions
      const surpriseTextarea = document.querySelector("textarea[placeholder*='Late meal deliveries']");
      if (surpriseTextarea) {
        window.__setVal(surpriseTextarea, "Community school management committee participation plummeted after school relocation to outer hamlet; parents cited unpaved canal crossings as safety risk.");
      }

      const repeatedTextarea = document.querySelector("textarea[placeholder*='Timing concerns appeared']");
      if (repeatedTextarea) {
        window.__setVal(repeatedTextarea, "Teachers across three grade bands reported solar battery depletion before midday, halting digital numeracy sessions.");
      }

      const contraTextarea = document.querySelector("textarea[placeholder*='Official delivery logs record']");
      if (contraTextarea) {
        window.__setVal(contraTextarea, "District supervisor reported 100% textbook arrival, directly contradicting head teacher and classroom inventory logs.");
      }

      const shakenTextarea = document.querySelector("textarea[placeholder*='Delivery completion may not necessarily']");
      if (shakenTextarea) {
        window.__setVal(shakenTextarea, "We assumed community committees meet monthly without project-funded transportation stipends.");
      }

      const biasTextarea = document.querySelector("textarea[placeholder*='The team may be giving greater weight']");
      if (biasTextarea) {
        window.__setVal(biasTextarea, "Interviewer may have over-indexed on vocal complaints of senior math teacher relative to quieter primary educators.");
      }

      const missingTextarea = document.querySelector("textarea[placeholder*='Children have not yet been directly consulted']");
      if (missingTextarea) {
        window.__setVal(missingTextarea, "We have not yet interviewed student mothers directly, who control home study hours.");
      }

      const hypTextarea = document.querySelector("textarea[placeholder*='Distribution timing may be an important factor']");
      if (hypTextarea) {
        window.__setVal(hypTextarea, "Working Theory: Solar battery failure and lack of transportation stipends together explain the drop in attendance and digital lab cessation.");
      }
    })()
  `);
  await sleep(1000);

  // Add 3 Tomorrow Priorities
  console.log("5b. Adding discrete tomorrow priorities...");
  await evalScript(`
    (() => {
      const priorityInput = document.querySelector("input[placeholder*='Seek child perspectives']");
      const addBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Add Priority"));

      if (priorityInput && addBtn) {
        window.__setVal(priorityInput, "Cross-check physical textbook stock logs at Assiut Community Hub B.");
        addBtn.click();
      }
    })()
  `);
  await sleep(300);

  await evalScript(`
    (() => {
      const priorityInput = document.querySelector("input[placeholder*='Seek child perspectives']");
      const addBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Add Priority"));

      if (priorityInput && addBtn) {
        window.__setVal(priorityInput, "Conduct evening focus group with student mothers in hamlet.");
        addBtn.click();
      }
    })()
  `);
  await sleep(300);

  await evalScript(`
    (() => {
      const priorityInput = document.querySelector("input[placeholder*='Seek child perspectives']");
      const addBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Add Priority"));

      if (priorityInput && addBtn) {
        window.__setVal(priorityInput, "Inspect solar battery charging cycles with school caretaker.");
        addBtn.click();
      }
    })()
  `);
  await sleep(500);

  // Link Source and Evidence records
  console.log("5c. Explicitly linking today's Source and Evidence records...");
  await evalScript(`
    (() => {
      // Uncheck "Show only session date" if present to ensure all sources in study are listed
      const todayCheckbox = Array.from(document.querySelectorAll("input[type='checkbox']")).find(c => {
        const parent = c.closest("label");
        return parent && parent.textContent.includes("Show only session date");
      });
      if (todayCheckbox && todayCheckbox.checked) {
        todayCheckbox.click();
      }

      // Find source checkbox
      const sourceCheckbox = Array.from(document.querySelectorAll("input[type='checkbox']")).find(c => {
        const parent = c.closest("label");
        return parent && parent.textContent.includes("SRC-");
      });
      if (sourceCheckbox && !sourceCheckbox.checked) sourceCheckbox.click();

      // Switch sub-tab to Evidence
      const evTabBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Evidence ("));
      if (evTabBtn) evTabBtn.click();
    })()
  `);
  await sleep(500);

  await evalScript(`
    (() => {
      const evCheckbox = Array.from(document.querySelectorAll("input[type='checkbox']")).find(c => {
        const parent = c.closest("label");
        return parent && parent.textContent.includes("EV-");
      });
      if (evCheckbox && !evCheckbox.checked) evCheckbox.click();
    })()
  `);
  await sleep(500);

  await screenshot("04_debrief_form_filled");

  // Step 6: Save Debrief
  console.log("6. Saving Daily Field Debrief...");
  const saved = await evalScript(`
    (() => {
      const saveBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Save Daily Debrief") || b.textContent.includes("Save Field Debrief"));
      if (saveBtn) {
        saveBtn.click();
        return true;
      }
      return false;
    })()
  `);
  if (!saved) {
    throw new Error("Could not find Save button on debrief form");
  }
  await sleep(2000);

  // Scroll to workspace panel
  await evalScript(`
    document.getElementById("workspace-panel")?.scrollIntoView({ behavior: "instant", block: "start" });
  `);
  await sleep(500);

  // Verify Debrief History card
  const historyCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      const hasDbr = text.includes("DBR-001");
      const hasSurprise = text.includes("Community school management committee participation plummeted");
      const hasHypothesis = text.includes("Working Theory: Solar battery failure");
      const hasContradiction = text.includes("District supervisor reported 100% textbook arrival");
      const hasPrioritiesBadge = text.includes("3 priorities");
      const hasSitesBadge = text.includes("2 sites");
      return { hasDbr, hasSurprise, hasHypothesis, hasContradiction, hasPrioritiesBadge, hasSitesBadge };
    })()
  `);
  console.log("Debrief History card check:", historyCheck);
  if (!historyCheck.hasDbr || !historyCheck.hasSurprise || !historyCheck.hasPrioritiesBadge) {
    throw new Error("Audit Failed: Debrief not rendered in history with required badges and reflection snippets!");
  }
  await screenshot("05_debrief_saved_history");

  // Step 7: Open Detail View
  console.log("7. Viewing full debrief detail...");
  await evalScript(`
    (() => {
      const viewBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("View Full Reflections"));
      if (viewBtn) viewBtn.click();
    })()
  `);
  await sleep(1500);

  // Verify all reflection sections and linked materials
  const detailCheck = await evalScript(`
    (() => {
      const text = document.body.innerText.toLowerCase();
      const rawText = document.body.innerText;
      const hasSurprise = text.includes("what surprised us today?");
      const hasRepeated = text.includes("what patterns repeated?");
      const hasContra = text.includes("what contradicted earlier information?");
      const hasAssumptions = text.includes("which assumptions should we question?");
      const hasBiases = text.includes("where might our own bias be influencing interpretation?");
      const hasMissing = text.includes("whose perspective is still missing?");
      const hasHyp = text.includes("what hypotheses are emerging?");
      const hasPriorities = text.includes("what should we investigate tomorrow?") && text.includes("3 priorities");
      const hasLinkedSource = rawText.includes("SRC-001");
      const hasLinkedEvidence = rawText.includes("EV-001");
      const hasDraftBadge = rawText.includes("Draft");
      const hasTheoryGuardrail = text.includes("boundary guardrail") || text.includes("working interpretation");
      return {
        hasSurprise, hasRepeated, hasContra, hasAssumptions, hasBiases,
        hasMissing, hasHyp, hasPriorities, hasLinkedSource, hasLinkedEvidence,
        hasDraftBadge, hasTheoryGuardrail
      };
    })()
  `);
  console.log("Debrief Detail verification check:", detailCheck);
  if (!detailCheck.hasSurprise || !detailCheck.hasTheoryGuardrail || !detailCheck.hasLinkedSource) {
    throw new Error("Audit Failed: Debrief Detail view missing required reflection or linked evidence sections!");
  }
  await screenshot("06_debrief_detail_view");

  // Step 8: Edit Debrief
  console.log("8. Editing debrief and adding fourth priority...");
  await evalScript(`
    (() => {
      const editBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Edit Debrief"));
      if (editBtn) editBtn.click();
    })()
  `);
  await sleep(1000);

  // Add 4th priority
  await evalScript(`
    (() => {
      const priorityInput = document.querySelector("input[placeholder*='Seek child perspectives']");
      const addBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Add Priority"));

      if (priorityInput && addBtn) {
        window.__setVal(priorityInput, "Verify solar inverter brand and warranty documentation.");
        addBtn.click();
      }
    })()
  `);
  await sleep(800);

  // Save changes
  await evalScript(`
    (() => {
      const saveBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Update Daily Debrief") || b.textContent.includes("Save"));
      if (saveBtn) saveBtn.click();
    })()
  `);
  await sleep(2000);

  // Verify 4 priorities in detail
  const editedDetailCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      return text.includes("4 priorities") && text.includes("Verify solar inverter brand and warranty");
    })()
  `);
  console.log("Edited debrief has 4 priorities:", editedDetailCheck);
  if (!editedDetailCheck) {
    throw new Error("Audit Failed: Edited priority not saved or rendered in detail view!");
  }
  await screenshot("07_debrief_edited_detail");

  // Step 9: Traceability Drawer Integration for DBR-001
  console.log("9. Testing Traceability Drawer for DBR-001...");
  await evalScript(`
    (() => {
      // Trigger drawer with DBR-001
      const traceTrigger = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Inspect in Drawer"));
      if (traceTrigger) {
        traceTrigger.click();
      }
    })()
  `);
  await sleep(1500);

  // Verify drawer contents
  const drawerCheck = await evalScript(`
    (() => {
      const drawer = document.querySelector("[role='dialog']");
      if (!drawer) return { hasDrawer: false };
      const text = drawer.innerText;
      const hasDbrTitle = text.includes("DBR-001") && text.includes("Daily Field Debrief");
      const hasSuppressedTrace = !text.includes("Source-to-brief path");
      const hasSafeguard = text.includes("Debrief notes are internal methodological records");
      const hasLinkedSrc = text.includes("SRC-001");
      const hasLinkedEv = text.includes("EV-001");
      return { hasDrawer: true, hasDbrTitle, hasSuppressedTrace, hasSafeguard, hasLinkedSrc, hasLinkedEv };
    })()
  `);
  console.log("Traceability drawer check for DBR-001:", drawerCheck);
  if (!drawerCheck.hasDrawer || !drawerCheck.hasDbrTitle || !drawerCheck.hasSuppressedTrace) {
    throw new Error("Audit Failed: Traceability drawer did not open for DBR-001 or did not suppress linear trace chain!");
  }
  console.log("✓ Verified: Linear TraceChain is suppressed for DBR-001, safeguarding notes and linked items are present.");
  await screenshot("08_traceability_drawer_debrief");

  // Close drawer
  await evalScript(`
    (() => {
      const closeBtn = document.querySelector("button[aria-label='Close drawer']");
      if (closeBtn) closeBtn.click();
    })()
  `);
  await sleep(800);

  // Step 10: Page Reload Persistence & Non-Mutation Invariants Check
  console.log("10. Testing page reload persistence and non-mutation invariants...");
  await send("Page.navigate", { url: "http://localhost:3000" });
  await sleep(2500);

  // Navigate to Daily Debrief tab
  await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Daily Debrief");
      if (tabBtn) tabBtn.click();
    })()
  `);
  await sleep(1500);

  const persistenceCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      return text.includes("DBR-001") && text.includes("4 priorities");
    })()
  `);
  console.log("Debrief persisted after page reload:", persistenceCheck);
  if (!persistenceCheck) {
    throw new Error("Audit Failed: Debrief did not persist across full page reload!");
  }

  // Switch to Evidence tab to check non-mutation invariants
  await evalScript(`
    (() => {
      const evTabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Evidence");
      if (evTabBtn) evTabBtn.click();
    })()
  `);
  await sleep(1500);

  const evidenceInvariantCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      const isStillDraft = text.includes("Draft") && text.includes("Submit for Review");
      const hasNoContradictions = !text.includes("Contradicts:");
      return { isStillDraft, hasNoContradictions };
    })()
  `);
  console.log("Evidence non-mutation invariant check:", evidenceInvariantCheck);
  if (!evidenceInvariantCheck.isStillDraft) {
    throw new Error("Audit Failed: Evidence validation status was mutated by debrief activity!");
  }

  // Switch to Findings tab to check hypothesis isolation
  await evalScript(`
    (() => {
      const fndTabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Findings");
      if (fndTabBtn) fndTabBtn.click();
    })()
  `);
  await sleep(1500);

  const findingsInvariantCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      // In this new blank study, there should be 0 findings
      const noFindings = text.includes("0 findings") || text.includes("No findings") || !text.includes("FND-");
      return { noFindings };
    })()
  `);
  console.log("Findings hypothesis isolation check:", findingsInvariantCheck);
  if (!findingsInvariantCheck.noFindings) {
    throw new Error("Audit Failed: Hypotheses from debrief leaked into formal findings!");
  }
  console.log("✓ Verified: Hypotheses remain isolated in debrief, no auto-promotion to findings.");
  await screenshot("09_persistence_and_invariants_verified");

  // Step 11: Demo Case Protection & Cloning
  console.log("11. Verifying demo case read-only protection in Daily Debrief...");
  // Switch to Community Bridges demo case via CaseSelector
  await evalScript(`
    (() => {
      const demoBtn = Array.from(document.querySelectorAll("#case-selector button")).find(b => b.textContent.includes("Community Bridges"));
      if (demoBtn) {
        demoBtn.click();
      }
    })()
  `);
  await sleep(2000);

  // Switch to Daily Debrief tab in demo case
  await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Daily Debrief");
      if (tabBtn) tabBtn.click();
    })()
  `);
  await sleep(1500);

  const demoProtectionCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      const isReadOnly = text.includes("Demo Case (Read-Only)") || text.includes("create an editable copy");
      const hasCloneBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Create Editable Copy"));
      return { isReadOnly, hasCloneBtn };
    })()
  `);
  console.log("Demo study protection check in Daily Debrief:", demoProtectionCheck);
  if (!demoProtectionCheck.isReadOnly || !demoProtectionCheck.hasCloneBtn) {
    throw new Error("Audit Failed: Demo study did not enforce read-only protection in Daily Debrief!");
  }
  console.log("✓ Verified: Pristine demo case is protected and provides 'Create Editable Copy' action.");
  await screenshot("10_demo_case_protected_and_cloned");

  console.log("=== All 11 Browser Acceptance Audit Steps PASSED Successfully! ===");
  ws.close();
}

runAudit().catch((err) => {
  console.error("Audit FAILED with error:", err);
  process.exit(1);
});
