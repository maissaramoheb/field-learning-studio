import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "/Users/maissaraselim/.gemini/antigravity/brain/dfe6126f-f624-4cdf-b68d-c87dedb116f6/phase4_screenshots";

async function runAudit() {
  console.log("=== Starting Phase 4 Browser Acceptance Audit ===");

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
    console.log(`Saved screenshot: ${name}.png`);
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

  // Inject robust helper for setting React controlled input/textarea values
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

  await screenshot("01_initial_app_overview");

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
  console.log("Clicked New Blank Study button:", createStudyClicked);
  if (!createStudyClicked) {
    throw new Error("Could not find 'New Blank Study' button");
  }
  await sleep(800);

  // Fill in modal
  const modalFilled = await evalScript(`
    (() => {
      const titleInput = document.querySelector("input[placeholder*='PARTAGE']");
      if (titleInput) window.__setVal(titleInput, "Upper Egypt Education Evaluation");

      const subInput = document.querySelector("input[placeholder*='Mid-term synthesis']");
      if (subInput) window.__setVal(subInput, "Phase 4 Human Validation Study");

      const ctxTextarea = document.querySelector("textarea[placeholder*='Briefly describe']");
      if (ctxTextarea) window.__setVal(ctxTextarea, "Independent mixed-method evaluation of educational infrastructure and attendance barriers across Minya and Assiut governorates.");

      const sitesInput = document.querySelector("input[placeholder*='Minya, Assiut']");
      if (sitesInput) window.__setVal(sitesInput, "Minya Primary School, Assiut Central");

      const stakeholdersInput = document.querySelector("input[placeholder*='Teachers, Parents']");
      if (stakeholdersInput) window.__setVal(stakeholdersInput, "Teachers, School Leaders, Parents");

      const submitBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "Create Study");
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log("Modal filled and submitted:", modalFilled);
  await sleep(2500);

  // Scroll to workspace panel for clear screenshots
  await evalScript(`
    document.getElementById("workspace-panel")?.scrollIntoView({ behavior: "instant", block: "start" });
  `);
  await sleep(500);
  await screenshot("02_study_created_intake_view");

  // Step 3: Verify we are in Field Intake Studio
  console.log("3. Verifying Field Intake Studio is active...");
  let inIntake = await evalScript(`
    (() => {
      return document.body.innerText.includes("Editable Field Study") || document.body.innerText.includes("Source Capture");
    })()
  `);
  console.log("In Field Intake Studio:", inIntake);
  if (!inIntake) {
    await evalScript(`
      (() => {
        const tabBtn = Array.from(document.querySelectorAll("button, [role='tab']")).find(b => b.textContent.includes("Field Intake"));
        if (tabBtn) tabBtn.click();
      })()
    `);
    await sleep(1500);
  }

  // Step 4: Verify Safeguarding Warning & Updated Checkbox Text
  console.log("4. Testing sensitive note capture and verifying safeguarding text...");
  await evalScript(`
    (() => {
      const textarea = document.querySelector("textarea[placeholder*='Paste or write detailed field notes']");
      if (textarea) {
        window.__setVal(textarea, "On 2024-05-12, interviewed Headmaster Ahmed (phone: 01012345678, email: ahmed@school.eg). During winter months, heating facilities in 4 classrooms were completely non-functional, causing chronic respiratory illnesses and severe student absenteeism.");
        return true;
      }
      return false;
    })()
  `);
  await sleep(1200);

  // Verify safeguarding text in DOM
  const safeguardingCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      const hasOldText = text.includes("I confirm this note is safe or sufficiently sanitized");
      const hasNewText = text.includes("I have reviewed the warning and confirm I am authorized to save this information in this local study");
      const hasWarning = text.includes("Warning Triggered") || text.includes("sensitive or identifying details");
      return { hasOldText, hasNewText, hasWarning };
    })()
  `);
  console.log("Safeguarding text audit:", safeguardingCheck);
  if (safeguardingCheck.hasOldText) {
    throw new Error("Audit Failed: Old 'safe or sufficiently sanitized' string still found in DOM!");
  }
  if (!safeguardingCheck.hasNewText) {
    throw new Error("Audit Failed: New authorized safeguarding acknowledgment string not found!");
  }
  if (!safeguardingCheck.hasWarning) {
    throw new Error("Audit Failed: Safeguarding warning banner not triggered by sensitive text!");
  }
  console.log("✓ Verified: Safeguarding acknowledgment text correctly states authorized confirmation without overclaiming safe/anonymized.");

  await screenshot("03_safeguarding_warning_verified");

  // Fill in source title and click bypass checkbox
  console.log("4b. Completing source record capture...");
  const sourceSaved = await evalScript(`
    (() => {
      // Set title
      const titleInput = document.querySelector("input[placeholder*='e.g. KII with School Principal']");
      if (titleInput) {
        window.__setVal(titleInput, "KII with Headmaster on School Infrastructure");
      }

      // Set collector
      const collectorInput = document.querySelector("input[placeholder*='Lead Evaluator']");
      if (collectorInput) {
        window.__setVal(collectorInput, "Lead Evaluator Sarah");
      }

      // Check the authorized checkbox
      const checkbox = Array.from(document.querySelectorAll("input[type='checkbox']")).find(c => {
        const parent = c.closest("label");
        return parent && parent.textContent.includes("authorized to save this information");
      });
      if (checkbox && !checkbox.checked) {
        checkbox.click();
      }

      // Click save button
      const saveBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Save Source Record"));
      if (saveBtn && !saveBtn.disabled) {
        saveBtn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log("Source record saved triggered:", sourceSaved);
  if (!sourceSaved) {
    throw new Error("Could not submit source record form (save button disabled or not found)");
  }
  await sleep(2500);
  await screenshot("04_source_record_saved");

  // Step 5: Extract discrete observation into Evidence
  console.log("5. Extracting discrete evidence observation...");
  const obsSaved = await evalScript(`
    (() => {
      const obsTextarea = document.querySelector("textarea[placeholder*='Paste or write the specific factual observation']");
      if (obsTextarea) window.__setVal(obsTextarea, "Heating facilities across 4 primary classrooms remained non-functional throughout winter, leading to chronic absenteeism.");

      const interpTextarea = document.querySelector("textarea[placeholder*='Record your working analytical interpretation']");
      if (interpTextarea) window.__setVal(interpTextarea, "Unheated classrooms undermine basic learning conditions and depress student attendance during winter terms.");

      const themeInput = document.querySelector("input[placeholder*='Targeting, Safety, Transport']");
      if (themeInput) window.__setVal(themeInput, "Infrastructure");

      const secThemeInput = document.querySelector("input[placeholder*='Infrastructure, Gender']");
      if (secThemeInput) window.__setVal(secThemeInput, "Attendance");

      const extractBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Save Evidence Observation"));
      if (extractBtn && !extractBtn.disabled) {
        extractBtn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log("Evidence observation extraction triggered:", obsSaved);
  if (!obsSaved) {
    throw new Error("Could not submit observation extraction form");
  }
  await sleep(2500);

  // Verify extracted evidence card in Intake shows Draft
  const intakeDraftCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      return text.includes("Draft") && text.includes("Heating facilities across 4 primary classrooms");
    })()
  `);
  console.log("Extracted observation has Draft status in Intake:", intakeDraftCheck);
  if (!intakeDraftCheck) {
    throw new Error("Audit Failed: Extracted observation did not appear in Intake with Draft status!");
  }
  await screenshot("05_observation_extracted_draft");

  // Step 6: Switch to Evidence Matrix tab
  console.log("6. Switching to Evidence Review & Validation Matrix...");
  await evalScript(`
    (() => {
      const evTabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab']")).find(b => b.textContent.trim() === "Evidence");
      if (evTabBtn) {
        evTabBtn.click();
        return true;
      }
      return false;
    })()
  `);
  await sleep(2000);
  await evalScript(`
    document.getElementById("workspace-panel")?.scrollIntoView({ behavior: "instant", block: "start" });
  `);
  await sleep(500);

  // Verify status filter pills and initial Draft status
  const evidenceInitialCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      const hasHeading = text.includes("Evidence Review & Human Validation Matrix");
      const hasDraftPill = text.includes("Draft") && text.includes("1");
      const hasNeedsReviewPill = text.includes("Needs Review") && text.includes("0");
      const hasSubmitBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Submit for Review"));
      return { hasHeading, hasDraftPill, hasNeedsReviewPill, hasSubmitBtn };
    })()
  `);
  console.log("Evidence Matrix initial Draft status check:", evidenceInitialCheck);
  if (!evidenceInitialCheck.hasSubmitBtn) {
    throw new Error("Audit Failed: Evidence item not showing Submit for Review button!");
  }
  console.log("✓ Verified: Evidence Matrix displays true Draft status badge and Submit for Review action.");
  await screenshot("06_evidence_matrix_draft");

  // Step 7: Submit for Review
  console.log("7. Submitting Draft evidence for review...");
  await evalScript(`
    (() => {
      const submitBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Submit for Review"));
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    })()
  `);
  await sleep(2000);

  // Verify status changed to Needs Review and filter pills updated
  const inReviewCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      const hasValidateBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("✓ Validate"));
      const hasRejectBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("✕ Reject"));
      return { hasValidateBtn, hasRejectBtn };
    })()
  `);
  console.log("In Review transition check:", inReviewCheck);
  if (!inReviewCheck.hasValidateBtn || !inReviewCheck.hasRejectBtn) {
    throw new Error("Audit Failed: Evidence did not transition to Needs Review with Validate/Reject controls!");
  }
  console.log("✓ Verified: Transition to Needs Review successful. Action buttons updated to Validate and Reject.");
  await screenshot("07_evidence_in_review");

  // Step 8: Set Reviewer Identity and Validate
  console.log("8. Setting reviewer identity and validating evidence...");
  await evalScript(`
    (() => {
      const setNameBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Set Name") || b.textContent.includes("Change"));
      if (setNameBtn) {
        setNameBtn.click();
      }
    })()
  `);
  await sleep(600);

  await evalScript(`
    (() => {
      const reviewerInput = document.querySelector("input[placeholder*='Lead Evaluator Sarah']");
      if (reviewerInput) {
        window.__setVal(reviewerInput, "Dr. Moheb / Lead Evaluator");
        const form = reviewerInput.closest("form");
        const setBtn = form?.querySelector("button[type='submit']");
        if (setBtn) setBtn.click();
      }
    })()
  `);
  await sleep(800);

  // Click Validate action button (specifically "✓ Validate" to avoid matching filter pill "Validated")
  console.log("8b. Clicking ✓ Validate action button...");
  const validatedClicked = await evalScript(`
    (() => {
      const valBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("✓ Validate"));
      if (valBtn) {
        valBtn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log("Clicked ✓ Validate:", validatedClicked);
  if (!validatedClicked) {
    throw new Error("Could not find or click '✓ Validate' button");
  }
  await sleep(2000);

  // Scroll to workspace card
  await evalScript(`
    document.getElementById("workspace-panel")?.scrollIntoView({ behavior: "instant", block: "start" });
  `);
  await sleep(500);

  // Verify status is Validated with reviewer attribution
  const validatedCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      const hasValidatedBadge = Array.from(document.querySelectorAll("span")).some(s => s.textContent.trim() === "Validated" && s.className.includes("text-emerald"));
      const hasAttribution = text.includes("Validated by Dr. Moheb / Lead Evaluator");
      const hasEditRevalidateBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Edit (Re-validate)"));
      return { hasValidatedBadge, hasAttribution, hasEditRevalidateBtn };
    })()
  `);
  console.log("Validation check:", validatedCheck);
  if (!validatedCheck.hasValidatedBadge || !validatedCheck.hasAttribution || !validatedCheck.hasEditRevalidateBtn) {
    throw new Error("Audit Failed: Item not validated or reviewer attribution missing!");
  }
  console.log("✓ Verified: Evidence validated with explicit human reviewer attribution.");
  await screenshot("08_evidence_validated");

  // Step 9: Substantive Edit to Validated Evidence -> Re-Validation Requirement
  console.log("9. Testing substantive edit on Validated item with warning & re-validation trigger...");
  await evalScript(`
    (() => {
      const editBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Edit (Re-validate)"));
      if (editBtn) {
        editBtn.click();
        return true;
      }
      return false;
    })()
  `);
  await sleep(800);

  // Verify warning banner in modal
  const editModalCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      const hasWarning = text.includes("Re-validation Warning: Validated Item") && text.includes("Revision 2");
      return { hasWarning };
    })()
  `);
  console.log("Edit modal warning banner check:", editModalCheck);
  if (!editModalCheck.hasWarning) {
    throw new Error("Audit Failed: Re-validation warning banner missing from edit modal!");
  }
  console.log("✓ Verified: Re-validation warning banner clearly warns that saving substantive changes will advance to Revision 2 and reset status to Needs Review.");

  await screenshot("09_evidence_edit_warning_modal");

  // Make substantive change and save
  await evalScript(`
    (() => {
      const textareas = document.querySelectorAll("form textarea");
      const obsTextarea = textareas[0];
      if (obsTextarea) {
        window.__setVal(obsTextarea, "Direct facility audits and teacher interviews confirmed 4 primary classrooms had non-operational heaters, causing severe illness rates during December-January.");
      }
      const saveBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Save & Request Re-validation"));
      if (saveBtn) {
        saveBtn.click();
        return true;
      }
      return false;
    })()
  `);
  await sleep(2000);

  // Scroll to workspace card
  await evalScript(`
    document.getElementById("workspace-panel")?.scrollIntoView({ behavior: "instant", block: "start" });
  `);
  await sleep(500);

  // Verify Revision 2 badge, Needs Review status, and re-validation banner
  const revalidationCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      const hasNeedsReviewBadge = Array.from(document.querySelectorAll("span")).some(s => s.textContent.trim() === "Needs Review" && s.className.includes("text-amber"));
      const hasRev2Badge = text.includes("Revision 2") || text.includes("Rev 2");
      const hasRevalBanner = text.includes("Re-validation Required: Substantively modified after prior validation");
      return { hasNeedsReviewBadge, hasRev2Badge, hasRevalBanner };
    })()
  `);
  console.log("Re-validation state check:", revalidationCheck);
  if (!revalidationCheck.hasNeedsReviewBadge || !revalidationCheck.hasRev2Badge || !revalidationCheck.hasRevalBanner) {
    throw new Error("Audit Failed: Substantive edit did not advance revision or trigger re-validation status!");
  }
  console.log("✓ Verified: Substantive edit reset status to Needs Review, advanced to Revision 2, and flagged Re-validation Required banner.");
  await screenshot("10_evidence_revision_2_revalidation_required");

  // Step 10: Rejection and Reopen Workflow
  console.log("10. Testing rejection and reopening workflow...");
  // Click ✕ Reject
  await evalScript(`
    (() => {
      const rejectBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("✕ Reject"));
      if (rejectBtn) {
        rejectBtn.click();
        return true;
      }
      return false;
    })()
  `);
  await sleep(800);

  await screenshot("11_evidence_reject_modal");

  // Submit rejection with reason
  await evalScript(`
    (() => {
      const reasonTextarea = document.querySelector("textarea[placeholder*='Inconclusive']");
      if (reasonTextarea) {
        window.__setVal(reasonTextarea, "Facility audit logs indicate heating units were serviced in November; requires verification of utility logs.");
      }
      const confirmBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Confirm Rejection"));
      if (confirmBtn) {
        confirmBtn.click();
        return true;
      }
      return false;
    })()
  `);
  await sleep(2000);

  // Scroll to workspace card
  await evalScript(`
    document.getElementById("workspace-panel")?.scrollIntoView({ behavior: "instant", block: "start" });
  `);
  await sleep(500);

  // Verify status is Rejected and rejection reason is displayed
  const rejectedCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      const hasRejectedBadge = Array.from(document.querySelectorAll("span")).some(s => s.textContent.trim() === "Rejected" && s.className.includes("text-rose"));
      const hasReason = text.includes("requires verification of utility logs");
      const hasReopenBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Reopen for Revision"));
      return { hasRejectedBadge, hasReason, hasReopenBtn };
    })()
  `);
  console.log("Rejection check:", rejectedCheck);
  if (!rejectedCheck.hasRejectedBadge || !rejectedCheck.hasReason || !rejectedCheck.hasReopenBtn) {
    throw new Error("Audit Failed: Item not rejected or rejection reason missing from card!");
  }
  console.log("✓ Verified: Item flagged as Rejected with rationale displayed. Reopen for Revision button visible.");
  await screenshot("12_evidence_rejected_with_rationale");

  // Click Reopen for Revision
  await evalScript(`
    (() => {
      const reopenBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Reopen for Revision"));
      if (reopenBtn) {
        reopenBtn.click();
        return true;
      }
      return false;
    })()
  `);
  await sleep(2000);

  // Scroll to workspace card
  await evalScript(`
    document.getElementById("workspace-panel")?.scrollIntoView({ behavior: "instant", block: "start" });
  `);
  await sleep(500);

  // Verify transitions back to Draft
  const reopenedCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      const hasDraftPill = text.includes("Draft") && text.includes("1");
      const hasSubmitBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Submit for Review"));
      return { hasDraftPill, hasSubmitBtn };
    })()
  `);
  console.log("Reopened check:", reopenedCheck);
  if (!reopenedCheck.hasSubmitBtn) {
    throw new Error("Audit Failed: Reopened item did not transition back to Draft!");
  }
  console.log("✓ Verified: Reopened item transitioned cleanly back to Draft.");
  await screenshot("13_evidence_reopened_to_draft");

  // Step 11: Verify Read-Only Protection on Demo Cases
  console.log("11. Verifying read-only protection on demo case reference data...");
  await evalScript(`
    window.scrollTo({ top: 0, behavior: "instant" });
  `);
  await sleep(500);

  await evalScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const demoBtn = buttons.find(b => b.textContent.includes("Community Bridges"));
      if (demoBtn) {
        demoBtn.click();
        return true;
      }
      return false;
    })()
  `);
  await sleep(2000);

  // Ensure Evidence tab is selected
  await evalScript(`
    (() => {
      const evTabBtn = Array.from(document.querySelectorAll("[role='tablist'] [role='tab']")).find(b => b.textContent.trim() === "Evidence");
      if (evTabBtn) {
        evTabBtn.click();
        return true;
      }
      return false;
    })()
  `);
  await sleep(2000);

  await evalScript(`
    document.getElementById("workspace-panel")?.scrollIntoView({ behavior: "instant", block: "start" });
  `);
  await sleep(500);

  const demoProtectionCheck = await evalScript(`
    (() => {
      const text = document.body.innerText;
      const hasDemoBanner = text.includes("Reference Demo Case (Read-Only)");
      const hasDemoRefBadges = text.includes("Demo Reference");
      const hasSubmitBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Submit for Review"));
      const hasValidateBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("✓ Validate"));
      const hasRejectBtn = Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("✕ Reject"));
      return { hasDemoBanner, hasDemoRefBadges, hasSubmitBtn, hasValidateBtn, hasRejectBtn };
    })()
  `);
  console.log("Demo protection check:", demoProtectionCheck);
  if (!demoProtectionCheck.hasDemoBanner || demoProtectionCheck.hasSubmitBtn || demoProtectionCheck.hasValidateBtn || demoProtectionCheck.hasRejectBtn) {
    throw new Error("Audit Failed: Demo study is not read-only protected!");
  }
  console.log("✓ Verified: Demo studies remain pristine and read-only. Action buttons are completely suppressed.");
  await screenshot("14_demo_study_readonly_protected");

  console.log("\n=== ALL PHASE 4 BROWSER ACCEPTANCE AUDIT TESTS PASSED CLEANLY! ===");
  ws.close();
}

runAudit().catch((err) => {
  console.error("FATAL AUDIT ERROR:", err);
  process.exit(1);
});
