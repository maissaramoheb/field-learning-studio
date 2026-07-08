# Field Learning Studio — Real-Field Demo Case Smoke Test Walkthrough v0.1

This document outlines the step-by-step smoke testing protocol for validating the multi-case architecture, the **School Nutrition & Child Wellbeing Field Learning Case**, and interactive sandbox features in Field Learning Studio.

---

## 1. Case Selector Switcher Test
*   **Action:** Open the home page (`/`).
*   **Verification:**
    *   Confirm the card-based **Case Switcher** is visible above the workspace tabs.
    *   Verify both cases are displayed: **Community Bridges Initiative** (fictional) and **School Nutrition & Child Wellbeing** (real-world-inspired).
    *   Click between the two cases. Verify the active card receives a teal border highlight and updates the active project details.
    *   Confirm that switching cases dynamically resets the active state:
        *   Workspace tabs default to the **Overview** tab.
        *   The Suggested Walkthrough checklist resets all tasks to incomplete (gray markers).
        *   Any active item details drawer closes.
        *   Simulated QA audit states reset (re-enabling the "Run QA Audit" action).
        *   Session sandbox items are cleared.

---

## 2. Safety & Anonymization Validation

### A. Nutrition Case Safety Label Test
*   **Action:** Click the card switcher to activate the **School Nutrition & Child Wellbeing** case.
*   **Verification:**
    *   Verify the warning disclaimer banner inside the header dynamically updates to show:
        *   *“Sanitized real-world-inspired demo. No identifiable field data is displayed.”*
    *   Switch back to **Community Bridges Initiative** and verify the banner displays the fictional workspace notice:
        *   *“Demo Mode: This version uses fictional data only. Do not enter real sensitive field evidence.”*

### B. No Identifiable Data Review (Sanitization Compliance)
*   **Action:** Switch to the **Evidence** and **Sources** tabs while the Nutrition case is active.
*   **Verification:**
    *   Verify that no school names are visible; they must be generalized to **School A**, **School B**, **School C**, or **School D**.
    *   Verify that no field staff, monitor, or respondent names are exposed.
    *   Verify that direct quotes are paraphrased and safeguard logs are categorized under abstract protection categories (e.g. *“Child safeguarding category flag raised”*).
    *   Verify that location data is generalized to *“selected programme schools”*.

---

## 3. Sandbox Intake & Presets Test
*   **Action:** Go to the **Overview** tab and locate the **Ingest Local Field Note Log** section.
*   **Verification:**
    *   Verify the warning label is displayed:
        *   *“Deterministic demo parsing — no AI call, no upload, no storage. Do not enter real sensitive field evidence.”*
    *   Verify the Template buttons underneath the textarea change depending on the active case:
        *   **School Nutrition Case active:** templates must display *Water & Spoilage*, *Caregiver Roles*, and *Teacher Capacity*.
        *   **Community Bridges Case active:** templates must display *Safe Access*, *Youth Engagement*, and *Reporting Burden*.
*   **Action:** Click the *Water & Spoilage* preset button in the School Nutrition case, then click **Parse into Evidence**.
*   **Verification:**
    *   Confirm the app redirects you automatically to the **Evidence** tab.
    *   Look for a new evidence card with ID `EV-TEMP-01` at the top of the grid.
    *   Verify the card primary theme is inferred as **Food acceptability and water safety** with a sensitivity level of **High**.
    *   Verify the card carries a prominent amber badge showing:
        *   *“Sandbox evidence item — local demo only, not validated.”*

---

## 4. Traceability Drawer Test
*   **Action:** Click the **Inspect Chain** button on the newly created `EV-TEMP-01` evidence card (or any existing evidence card).
*   **Verification:**
    *   Confirm the context-preserving slide-over **Traceability Drawer** overlay slides open from the right side.
    *   Verify the drawer displays the active item's ID, type, raw details, primary theme, strength level, sensitivity flags, and linked elements.
    *   Observe the **Traceability Chain** breadcrumbs navigation at the top of the drawer (e.g. `SRC-TEMP-01 → EV-TEMP-01 → FND-TEMP-01`).
    *   Click on the parent source ID (`SRC-TEMP-01`) inside the breadcrumb chain.
    *   Verify the drawer contents update dynamically to show source record details without refreshing or shifting the active workspace tab background.
    *   Close the drawer and verify you are still on the **Evidence** tab page.

---

## 5. QA Review Test
*   **Action:** Select the **QA Review** tab and click **Run QA Audit**.
*   **Verification:**
    *   Confirm the audit scanner simulation runs for ~1.8 seconds with status updates ("Initiating compliance audit...", "Checking evidence-finding linkages...", etc.).
    *   Observe the severity statistics counter cards at the top: **Passed**, **Needs Review**, and **Warnings**.
    *   Verify that any Warnings are sorted to the top of the checklist.
    *   Verify that under the School Nutrition case, item `QA-005` displays as **Protection & Safeguarding Safety** and item `QA-007` displays as **Child-Centred Sensitivity** with case-specific checklist notes.
    *   Verify the compliance notes contain clickable ID links (e.g. `EV-001`, `EV-TEMP-01`) that open their corresponding profiles inside the Traceability Drawer directly.

---

## 6. Learning Brief Export Test

### A. Brief Preview Test
*   **Action:** Select the **Brief** tab.
*   **Verification:**
    *   Confirm the brief preview panel displays as a clean A4 sheet container with margins.
    *   Verify the brief header displays dynamic case metadata (Date, Project Title, and Subtitle).
    *   Verify that if the School Nutrition case is active, the brief renders appended sections for **Project Purpose and Scope**, **Key Thematic Pillars**, and **Safeguarding Notes**.

### B. Markdown Copy Test
*   **Action:** Click the **Copy Brief Markdown** action button on the Brief tab bar.
*   **Verification:**
    *   Verify the button label updates to show **✓ Copied to Clipboard**.
    *   Paste the clipboard contents into a text editor and confirm it matches the structural Markdown format.
    *   Toggle open the **Show Raw Markdown Source** panel at the bottom of the brief to view the plain-text payload directly.
