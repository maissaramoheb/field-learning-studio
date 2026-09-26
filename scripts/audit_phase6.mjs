import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "/Users/maissaraselim/.gemini/antigravity/brain/dfe6126f-f624-4cdf-b68d-c87dedb116f6/phase6_screenshots";

async function runAudit() {
  console.log("=== Starting Phase 6 Study Framework + Synthesis Workbench Browser Acceptance Audit ===");

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

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function screenshot(name) {
    await evalScript(`
      (() => {
        const modal = document.querySelector("[role='dialog']");
        if (!modal) {
          document.getElementById("workspace-panel")?.scrollIntoView({ behavior: "instant", block: "start" });
        }
      })();
    `);
    await sleep(500);
    const res = await send("Page.captureScreenshot", { format: "png" });
    const filePath = path.join(ARTIFACT_DIR, `${name}.png`);
    fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
    console.log(`✓ Saved screenshot: ${name}.png`);
  }

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

  // Register persistent script across navigations
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__setVal = function(el, val) {
        if (!el) return;
        const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
        setter.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      window.prompt = function(promptText, defaultVal) {
        if (promptText && promptText.includes("reviewer identity")) return "Lead Evaluator";
        if (promptText && promptText.includes("limitation note")) return "Conclusions represent teacher and parent perspectives; direct child interviews remain pending.";
        if (promptText && promptText.includes("Edit Finding Statement")) return "Severe late meal distribution drastically reduces consistent access to school meals.";
        return defaultVal || "Lead Evaluator";
      };
    `,
  });

  // Inject into current page immediately as well
  await evalScript(`
    window.__setVal = function(el, val) {
      if (!el) return;
      const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      setter.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    window.prompt = function(promptText, defaultVal) {
      if (promptText && promptText.includes("reviewer identity")) return "Lead Evaluator";
      if (promptText && promptText.includes("limitation note")) return "Conclusions represent teacher and parent perspectives; direct child interviews remain pending.";
      if (promptText && promptText.includes("Edit Finding Statement")) return "Severe late meal distribution drastically reduces consistent access to school meals.";
      return defaultVal || "Lead Evaluator";
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
      if (titleInput) window.__setVal(titleInput, "PARTAGE School Nutrition & Governance Evaluation");

      const subInput = document.querySelector("input[placeholder*='Mid-term synthesis']");
      if (subInput) window.__setVal(subInput, "Comparative Study across Minya and Assiut");

      const ctxTextarea = document.querySelector("textarea[placeholder*='Briefly describe']");
      if (ctxTextarea) window.__setVal(ctxTextarea, "Field sensemaking evaluating meal access bottlenecks, supply chain equity, and community governance.");

      const sitesInput = document.querySelector("input[placeholder*='Minya, Assiut']");
      if (sitesInput) window.__setVal(sitesInput, "Minya Rural, Assiut Urban");

      const stakeholdersInput = document.querySelector("input[placeholder*='Teachers, Parents']");
      if (stakeholdersInput) window.__setVal(stakeholdersInput, "Teachers, Parents, Children, Supervisors");

      const submitBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "Create Study");
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    })()
  `);
  await sleep(2500);
  await screenshot("01_study_created");

  // Step 3: Switch to "Synthesis Workbench" tab
  console.log("3. Switching to Study Framework & Synthesis tab...");
  await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Synthesis");
      if (tabBtn) tabBtn.click();
    })()
  `);
  await sleep(1500);

  // Add Study Question 1
  console.log("4. Adding Study Question 1 (RQ-001)...");
  await evalScript(`
    (() => {
      const addBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Add Study Question"));
      if (addBtn) addBtn.click();
    })()
  `);
  await sleep(800);

  await evalScript(`
    (() => {
      const qText = document.querySelector("textarea[placeholder*='What factors affect']");
      if (qText) window.__setVal(qText, "What factors affect children's actual access to school meals?");

      const labelInput = document.querySelector("input[placeholder*='Meal Access Factors']");
      if (labelInput) window.__setVal(labelInput, "Meal Access Factors");

      const select = document.querySelector("select");
      if (select) {
        select.value = "Effectiveness";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }

      const saveBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "Save Question");
      if (saveBtn) saveBtn.click();
    })()
  `);
  await sleep(1500);

  // Add Study Question 2
  console.log("5. Adding Study Question 2 (RQ-002)...");
  await evalScript(`
    (() => {
      const addBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Add Study Question"));
      if (addBtn) addBtn.click();
    })()
  `);
  await sleep(800);

  await evalScript(`
    (() => {
      const qText = document.querySelector("textarea[placeholder*='What factors affect']");
      if (qText) window.__setVal(qText, "How does implementation differ between Minya and Assiut?");

      const labelInput = document.querySelector("input[placeholder*='Meal Access Factors']");
      if (labelInput) window.__setVal(labelInput, "Contextual Comparison");

      const select = document.querySelector("select");
      if (select) {
        select.value = "Relevance";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }

      const saveBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "Save Question");
      if (saveBtn) saveBtn.click();
    })()
  `);
  await sleep(1500);
  await screenshot("02_study_questions_configured");

  // Step 4: Inject 3 Sources and 3 Validated Evidence items directly into IndexedDB
  console.log("6. Populating 3 Sources and 3 Validated Evidence entries linked to RQ-001...");
  await evalScript(`
    (async () => {
      const dbRequest = indexedDB.open("FieldLearningStudioDB", 1);
      await new Promise((resolve, reject) => {
        dbRequest.onsuccess = (e) => {
          const db = e.target.result;
          
          const getStudies = db.transaction("studies", "readonly").objectStore("studies").getAll();
          getStudies.onsuccess = () => {
            const allStudies = getStudies.result;
            const current = allStudies.find(m => !m.isDemoCase) || allStudies[0];
            const activeId = current ? current.id : "STU-004";

            // Sources
            const txSrc = db.transaction("sources", "readwrite");
            const srcStore = txSrc.objectStore("sources");
            const s1 = {
              id: "SRC-001",
              studyId: activeId,
              sourceType: "Key Informant Interview",
              title: "KII with Minya Head Teacher Mariam",
              participantRole: "School Leadership",
              participantCount: 1,
              siteId: "Minya Rural",
              date: "2026-03-10",
              collectionMethod: "Key Informant Interview",
              consentStatus: "Written",
              anonymizationStatus: "Pseudonymized",
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            const s2 = {
              id: "SRC-002",
              studyId: activeId,
              sourceType: "Focus Group Discussion",
              title: "FGD with Assiut Mothers",
              participantRole: "Parents",
              participantCount: 8,
              siteId: "Assiut Urban",
              date: "2026-03-11",
              collectionMethod: "Focus Group Discussion",
              consentStatus: "Oral",
              anonymizationStatus: "Pseudonymized",
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            const s3 = {
              id: "SRC-003",
              studyId: activeId,
              sourceType: "Direct Observation",
              title: "Meal Distribution Observation at Minya School",
              participantRole: "School Community",
              participantCount: 50,
              siteId: "Minya Rural",
              date: "2026-03-12",
              collectionMethod: "Direct Observation",
              consentStatus: "Not Required / Public Source",
              anonymizationStatus: "Anonymized",
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            srcStore.put(s1);
            srcStore.put(s2);
            srcStore.put(s3);

            // Evidence
            const txEv = db.transaction("evidence", "readwrite");
            const evStore = txEv.objectStore("evidence");
            const ev1 = {
              id: "EV-001",
              studyId: activeId,
              sourceId: "SRC-001",
              siteId: "Minya Rural",
              stakeholderType: "Teachers",
              rawEvidence: "Morning meal delivery truck arrived 90 minutes after first recess in 4 observed sessions.",
              rawObservation: "Morning meal delivery truck arrived 90 minutes after first recess in 4 observed sessions.",
              interpretation: "Delivery delays prevent regular student meal access during the designated break.",
              potentialFinding: "Delivery delays prevent regular student meal access.",
              primaryTheme: "Nutrition Access",
              evidenceStrength: "High",
              sensitivityFlag: "None",
              qaStatus: "Reviewed",
              validationStatus: "Validated",
              revision: 1,
              studyQuestionIds: ["RQ-001"],
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            const ev2 = {
              id: "EV-002",
              studyId: activeId,
              sourceId: "SRC-002",
              siteId: "Assiut Urban",
              stakeholderType: "Parents",
              rawEvidence: "Parents report meals frequently arrive cold and during classroom lesson hours.",
              rawObservation: "Parents report meals frequently arrive cold and during classroom lesson hours.",
              interpretation: "Cross-district logistics bottlenecks disrupt feeding schedules in urban schools.",
              potentialFinding: "Delivery delays prevent regular student meal access.",
              primaryTheme: "Nutrition Access",
              evidenceStrength: "High",
              sensitivityFlag: "None",
              qaStatus: "Reviewed",
              validationStatus: "Validated",
              revision: 1,
              studyQuestionIds: ["RQ-001"],
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            const ev3 = {
              id: "EV-003",
              studyId: activeId,
              sourceId: "SRC-003",
              siteId: "Minya Rural",
              stakeholderType: "Teachers",
              rawEvidence: "Observed 120 meal boxes stacked outdoors under sunlight without cold storage.",
              rawObservation: "Observed 120 meal boxes stacked outdoors under sunlight without cold storage.",
              interpretation: "Lack of cold chain storage at school gates compromises food safety.",
              potentialFinding: "Storage conditions fail during transit delays.",
              primaryTheme: "Supply Chain",
              evidenceStrength: "High",
              sensitivityFlag: "Low",
              qaStatus: "Reviewed",
              validationStatus: "Validated",
              revision: 1,
              studyQuestionIds: ["RQ-001"],
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            evStore.put(ev1);
            evStore.put(ev2);
            evStore.put(ev3);

            txEv.oncomplete = () => resolve(true);
          };
        };
        dbRequest.onerror = reject;
      });
    })()
  `);
  await sleep(1000);

  // Refresh study in UI
  await send("Page.navigate", { url: "http://localhost:3000" });
  await sleep(2500);

  // Ensure editable study is selected
  await evalScript(`
    (() => {
      const studyCard = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("PARTAGE School Nutrition"));
      if (studyCard) studyCard.click();
    })()
  `);
  await sleep(1500);

  // Switch to Evidence Matrix to take screenshot of validated evidence
  console.log("7. Checking Evidence Matrix...");
  await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Evidence");
      if (tabBtn) tabBtn.click();
    })()
  `);
  await sleep(1500);
  await screenshot("03_evidence_matrix_validated");

  // Switch back to Synthesis tab
  console.log("8. Navigating to Synthesis Comparative Workspace...");
  await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Synthesis");
      if (tabBtn) tabBtn.click();
    })()
  `);
  await sleep(1500);

  // Select RQ-001 filter
  await evalScript(`
    (() => {
      const rqPill = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("RQ-001"));
      if (rqPill) rqPill.click();
    })()
  `);
  await sleep(1000);

  // Switch grouping mode to "Stakeholder"
  await evalScript(`
    (() => {
      const stakeholderBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "Stakeholder");
      if (stakeholderBtn) stakeholderBtn.click();
    })()
  `);
  await sleep(1000);
  await screenshot("04_synthesis_comparative_view");

  // Step 5: Create a Working Pattern Note
  console.log("9. Creating Working Pattern Note...");
  await evalScript(`
    (() => {
      const recPatternBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Record Working Pattern"));
      if (recPatternBtn) recPatternBtn.click();
    })()
  `);
  await sleep(800);

  await evalScript(`
    (() => {
      const stmtTextarea = document.querySelector("textarea[placeholder*='Late meal distribution appears in teacher']");
      if (stmtTextarea) window.__setVal(stmtTextarea, "Transit delays correlate with extreme heat in rural districts.");

      const themeInput = document.querySelector("input[placeholder*='Logistics & Timing']");
      if (themeInput) window.__setVal(themeInput, "Logistics & Supply");

      const contradInput = document.querySelector("input[placeholder*='Assiut school 2 reported timely delivery']");
      if (contradInput) window.__setVal(contradInput, "Assiut parent FGD suggests delivery timing was better during winter.");

      // Check evidence checkboxes
      const checkboxes = Array.from(document.querySelectorAll("input[type='checkbox']"));
      checkboxes.forEach(c => {
        if (!c.checked) c.click();
      });

      const saveBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "Save Working Pattern");
      if (saveBtn) saveBtn.click();
    })()
  `);
  await sleep(1500);
  await screenshot("05_working_pattern_created");

  // Step 6: Author Finding via Promotion with live Support Profile
  console.log("10. Authoring Finding with live Support Profile...");
  await evalScript(`
    (() => {
      const promoteBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Promote to Finding"));
      if (promoteBtn) {
        promoteBtn.click();
      } else {
        const authorBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Author Draft Finding"));
        if (authorBtn) authorBtn.click();
      }
    })()
  `);
  await sleep(1000);

  // Fill in Finding form
  await evalScript(`
    (() => {
      const stmtTextarea = document.querySelector("textarea[placeholder*='Late meal distribution appears to reduce']");
      if (stmtTextarea) window.__setVal(stmtTextarea, "Late meal distribution appears to reduce consistent access to school meals.");

      const explTextarea = document.querySelector("textarea[placeholder*='Provide supporting context']");
      if (explTextarea) window.__setVal(explTextarea, "Delivery delays prevent regular student feeding schedules in both districts.");

      const impTextarea = document.querySelector("textarea[placeholder*='What operational or strategic adjustments']");
      if (impTextarea) window.__setVal(impTextarea, "Centralize dispatch tracking and establish local buffer storage.");

      // Select all 3 evidence entries if not selected
      const evCheckboxes = Array.from(document.querySelectorAll("input[type='checkbox']"));
      evCheckboxes.forEach(c => {
        if (!c.checked) c.click();
      });

      const limitTextarea = document.querySelector("textarea[placeholder*='Required when tier is Emerging']");
      if (limitTextarea) window.__setVal(limitTextarea, "Findings represent teacher and parent perspectives; direct child interviews remain pending.");
    })()
  `);
  await sleep(1000);
  await screenshot("06_finding_authored_with_support_profile");

  // Save Finding
  await evalScript(`
    (() => {
      const saveBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Save as Draft Finding") || b.textContent.includes("Save Finding"));
      if (saveBtn) saveBtn.click();
    })()
  `);
  await sleep(2000);

  // Step 7: Validate Finding in Findings Tab
  console.log("11. Validating Finding (Draft -> Needs Review -> Validated)...");
  await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Findings");
      if (tabBtn) tabBtn.click();
    })()
  `);
  await sleep(1500);

  // Override window.prompt for Lead Evaluator & limitation notes
  await evalScript(`
    window.prompt = function(promptText, defaultVal) {
      if (promptText.includes("reviewer identity")) return "Lead Evaluator";
      if (promptText.includes("limitation note")) return "Conclusions represent teacher and parent perspectives; direct child interviews remain pending.";
      return defaultVal || "Lead Evaluator";
    };
  `);

  // Submit for Review
  await evalScript(`
    (() => {
      const submitBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Submit for Review"));
      if (submitBtn) submitBtn.click();
    })()
  `);
  await sleep(1500);

  // Validate
  await evalScript(`
    (() => {
      const validateBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Validate"));
      if (validateBtn) validateBtn.click();
    })()
  `);
  await sleep(2000);
  await screenshot("07_finding_validated");

  // Step 8: Create Recommendation linked to Validated Finding
  console.log("12. Creating Downstream Recommendation...");
  await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Synthesis");
      if (tabBtn) tabBtn.click();
    })()
  `);
  await sleep(1500);

  await evalScript(`
    (() => {
      const addRecBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("+ Recommendation"));
      if (addRecBtn) addRecBtn.click();
    })()
  `);
  await sleep(1000);

  await evalScript(`
    (() => {
      const recTextarea = document.querySelector("textarea[placeholder*='Introduce routine comparison']");
      if (recTextarea) window.__setVal(recTextarea, "Introduce routine comparison of delivery logs with observed serving times and beneficiary feedback.");

      const actorInput = document.querySelector("input[placeholder*='District Education Directorate']");
      if (actorInput) window.__setVal(actorInput, "Directorate Logistics Coordinator");

      const benefitInput = document.querySelector("input[placeholder*='Reduces distribution delays']");
      if (benefitInput) window.__setVal(benefitInput, "Ensures accountability of delivery contractors.");

      const indInput = document.querySelector("input[placeholder*='Monthly delivery audit reconciliation']");
      if (indInput) window.__setVal(indInput, "Zero unverified late deliveries in school logs.");

      const saveBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Save as Draft Recommendation"));
      if (saveBtn) saveBtn.click();
    })()
  `);
  await sleep(2000);

  // Validate Recommendation in Recommendations tab
  await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Recommendations");
      if (tabBtn) tabBtn.click();
    })()
  `);
  await sleep(1500);

  await evalScript(`
    (() => {
      const submitBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Submit for Review"));
      if (submitBtn) submitBtn.click();
    })()
  `);
  await sleep(1500);

  await evalScript(`
    (() => {
      const validateBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Validate"));
      if (validateBtn) validateBtn.click();
    })()
  `);
  await sleep(2000);
  await evalScript(`
    (() => {
      const card = Array.from(document.querySelectorAll("article, div")).find(el => el.textContent?.includes("REC-001"));
      if (card) {
        card.scrollIntoView({ behavior: "instant", block: "center" });
      }
    })()
  `);
  await sleep(500);
  await screenshot("08_recommendation_linked_and_validated");

  // Step 9: Downstream Optional Output (Lesson Learned)
  console.log("13. Creating Optional Output (Lesson Learned)...");
  await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Synthesis");
      if (tabBtn) tabBtn.click();
    })()
  `);
  await sleep(1500);

  await evalScript(`
    (() => {
      const lessonBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("+ Lesson"));
      if (lessonBtn) {
        lessonBtn.scrollIntoView({ behavior: "instant", block: "center" });
        lessonBtn.click();
      }
    })()
  `);
  await sleep(1000);

  await evalScript(`
    (() => {
      const textareas = document.querySelectorAll("form textarea");
      if (textareas.length >= 1) window.__setVal(textareas[0], "Consistent cold chain and scheduled delivery windows are prerequisite for nutrition uptake.");
      if (textareas.length >= 2) window.__setVal(textareas[1], "Direct observation in Minya and Assiut demonstrated heat exposure without cold storage.");
      if (textareas.length >= 3) window.__setVal(textareas[2], "Lack of intermediate refrigeration infrastructure at school level.");
    })()
  `);
  await sleep(800);
  await screenshot("09_optional_output_created");

  await evalScript(`
    (() => {
      const saveBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Save as Draft Lesson"));
      if (saveBtn) saveBtn.click();
    })()
  `);
  await sleep(1500);

  // Step 10: Inspect Traceability Drawer
  console.log("14. Inspecting Traceability Drawer for Study Question RQ-001...");
  await evalScript(`
    (() => {
      const rqButton = Array.from(document.querySelectorAll("button, span")).find(el => el.textContent.trim() === "RQ-001");
      if (rqButton) rqButton.click();
    })()
  `);
  await sleep(1500);
  await screenshot("10_traceability_drawer_inspected");

  // Close drawer
  await evalScript(`
    (() => {
      const closeBtn = document.querySelector("[aria-label='Close drawer']");
      if (closeBtn) closeBtn.click();
    })()
  `);
  await sleep(500);

  // Step 11: Brief Export & Invalidation Integrity
  console.log("15. Verifying Brief Export with Validated Items...");
  await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Brief");
      if (tabBtn) tabBtn.click();
    })()
  `);
  await sleep(1500);
  await evalScript(`
    (() => {
      const card = Array.from(document.querySelectorAll("article, div")).find(el => el.textContent?.includes("FND-001"));
      if (card) {
        card.scrollIntoView({ behavior: "instant", block: "center" });
      }
    })()
  `);
  await sleep(500);
  await screenshot("11_brief_export_validated_items");

  // Step 16: Apply Substantive Edit to Finding via UI to test Dependency Invalidation
  console.log("16. Applying Substantive Edit to Finding to test Dependency Invalidation...");
  await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Findings");
      if (tabBtn) tabBtn.click();
    })()
  `);
  await sleep(1500);

  // Set prompt override for Edit Finding Statement
  await evalScript(`
    window.prompt = function(promptText, defaultVal) {
      if (promptText && promptText.includes("Edit Finding Statement")) {
        return "Severe late meal distribution drastically reduces consistent access to school meals.";
      }
      return defaultVal || "Lead Evaluator";
    };
  `);

  await evalScript(`
    (() => {
      const editBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "Edit Finding");
      if (editBtn) editBtn.click();
    })()
  `);
  await sleep(1500);

  // View Recommendations tab to verify dependency warning badge
  await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Recommendations");
      if (tabBtn) tabBtn.click();
    })()
  `);
  await sleep(1500);
  await evalScript(`
    (() => {
      const card = Array.from(document.querySelectorAll("article, div")).find(el => el.textContent?.includes("REC-001"));
      if (card) {
        card.scrollIntoView({ behavior: "instant", block: "center" });
      }
    })()
  `);
  await sleep(500);
  await screenshot("12_finding_substantive_edit_dependency_warning");

  // Step 17: Revalidate Finding to restore Recommendation export eligibility
  console.log("17. Revalidating Finding to restore Recommendation export eligibility...");
  await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Findings");
      if (tabBtn) tabBtn.click();
    })()
  `);
  await sleep(1500);

  await evalScript(`
    window.prompt = function(promptText, defaultVal) {
      if (promptText && promptText.includes("reviewer identity")) return "Lead Evaluator";
      if (promptText && promptText.includes("limitation note")) return "Conclusions represent teacher and parent perspectives; direct child interviews remain pending.";
      return defaultVal || "Lead Evaluator";
    };
  `);

  await evalScript(`
    (() => {
      const validateBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Validate Finding"));
      if (validateBtn) validateBtn.click();
    })()
  `);
  await sleep(1500);

  // Switch to Export Brief
  await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Brief");
      if (tabBtn) tabBtn.click();
    })()
  `);
  await sleep(1500);
  await evalScript(`
    (() => {
      const card = Array.from(document.querySelectorAll("article, div")).find(el => el.textContent?.includes("FND-001"));
      if (card) {
        card.scrollIntoView({ behavior: "instant", block: "center" });
      }
    })()
  `);
  await sleep(500);
  await screenshot("13_finding_revalidated_recommendation_restored");

  // Step 12: Verify Demo Study Protection
  console.log("18. Testing Demo Study Protection...");
  await evalScript(`
    (() => {
      const demoBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Community Bridges") || b.textContent.includes("community-bridges"));
      if (demoBtn) demoBtn.click();
    })()
  `);
  await sleep(2000);

  await evalScript(`
    (() => {
      const tabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab'], button")).find(b => b.textContent.trim() === "Synthesis");
      if (tabBtn) tabBtn.click();
    })()
  `);
  await sleep(1500);
  await screenshot("14_demo_study_protected");

  console.log("=== All 14 Acceptance Audit Screenshots Successfully Captured! ===");
  ws.close();
}

runAudit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
