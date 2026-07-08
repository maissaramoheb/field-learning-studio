---
target: src/components/FieldLearningStudioApp.tsx
total_score: 30
p0_count: 0
p1_count: 2
timestamp: 2026-07-08T15-58-52Z
slug: src-components-fieldlearningstudioapp-tsx
---
# UX Critique: Field Learning Studio (v0.1.1)

⚠️ DEGRADED: single-context (sequential inline execution chosen to complete user script without blocking)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Navigation stepper is static; does not indicate active tab state as the user interacts. |
| 2 | Match System / Real World | 4 | Perfect match; uses standard evaluation vocabulary (triangulation, evidence strength, findings). |
| 3 | User Control and Freedom | 3 | Lacks interactive control to collapse/expand card contents or reset filters instantly. |
| 4 | Consistency and Standards | 4 | High visual consistency; badges, colors, and layout are standardized. |
| 5 | Error Prevention | 4 | Filter selects are constrained; no manual text input errors are possible. |
| 6 | Recognition Rather Than Recall | 2 | Traceability pills (e.g., `EV-001`) are static text; requires users to memorize links across tabs. |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts for navigation or actions; lacks quick search filters. |
| 8 | Aesthetic & Minimalist Design | 3 | Redundant warning banners in the Hero and Matrix; card layout has minor density rhythm issues. |
| 9 | Error Recovery | 4 | n/a (static demo data environment has no error states). |
| 10 | Help and Documentation | 2 | Lacks inline tooltips or help icons for complex MEL metrics. |
| **Total** | | **30/40** | **Good** |

---

## Anti-Patterns Verdict

- **LLM Assessment:** The visual layout is clean but very basic. The default Arial font stack makes it look like a documentation site or a wireframe rather than a premium analytical workspace. The cards are stacked in simple grids, and the dense text lists could benefit from improved typographical contrast.
- **Deterministic Scan:** No automatic design issues were flagged by the detector script (`[]`).
- **Visual Overlays:** Fallback signal used (no browser automation available in this context; scan restricted to local source code).

---

## Overall Impression

Field Learning Studio has an exceptionally strong, domain-appropriate structural model. However, the interface currently acts as a static report viewer. The core promise of "traceability" remains dead text. Making the ID links interactive, enhancing typographic rhythm, and refining card density will elevate this from a basic demo to a premium institutional tool.

---

## What's Working

1. **MEL-Aligned Architecture:** The clear flow from Sources -> Evidence -> Findings -> Recommendations makes logical sense to evaluators.
2. **The QA Review Panel:** The checklist is a powerful concept that directly addresses doner-reporting anxieties.
3. **Structured Badges:** Categorized colors for status and evidence strength provide clear visual anchors.

---

## Priority Issues

### [P1] Dead Traceability Links
- **Why it matters:** Traceability is the core value proposition. Since `EV` and `SRC` pills are static text, users must switch tabs and manually search the lists, defeating the promise of seamless verification.
- **Fix:** Make the ID pills active buttons. Clicking a pill should open a side drawer showing its detail, or jump to the source and highlight it.
- **Suggested command:** `$impeccable layout` / `$impeccable polish`

### [P1] Static Navigation Stepper
- **Why it matters:** The tab navigation bar sits at the top but does not update its active state. The user has no visual feedback on which step of the workflow they are currently exploring.
- **Fix:** Add dynamic active styling (e.g., active background/border highlight) to the selected tab.
- **Suggested command:** `$impeccable layout`

### [P2] Redundant Verification Banners
- **Why it matters:** The warning banner "This version uses fictional data only" is repeated verbatim multiple times across the screen, adding visual clutter and decreasing the premium feel of the app.
- **Fix:** Consolidate the warning banner into a single, elegant warning banner at the very top or bottom of the workspace.
- **Suggested command:** `$impeccable distill`

### [P2] Card Information Density & Progressive Disclosure
- **Why it matters:** The Recommendations cards display 8 metadata fields (timeframe, feasibility, expected benefit, etc.) fully expanded by default. This makes the column layout extremely long and hard to scan.
- **Fix:** Use a clean, collapsible layout or key-value summary layout to hide details until requested.
- **Suggested command:** `$impeccable layout`

---

## Persona Red Flags

- **Miriam (UN Donor-Reporting Specialist):** Finds the raw Markdown preview text box too technical. It feels like a software developer output rather than a polished, donor-ready publication page she can preview.
- **Jordan (First-Time MEL Officer):** Is confused by the difference between "Evidence Strength" and "Sensitivity Flag" because there are no tooltips or explanatory definitions on the page.
- **Alex (Impatient Power User):** Wants to navigate between the workflow tabs using keyboard shortcuts (e.g. `1`-`7`) to speed up review sessions.

---

## Minor Observations

- **Arial Typography:** The standard browser default font stack looks generic. Changing this to a premium, clean font stack like `Inter` will immediately lift the aesthetic.
- **Table Width:** The Evidence Matrix table overflows on medium viewports, requiring heavy horizontal scrolling.

---

## Questions to Consider

- *What if the Learning Brief preview looked like an actual printed paper sheet (with simulated margins and page headers) instead of a dark text area?*
- *What if the QA Review checklist dynamically pointed to the elements that flagged a warning (e.g. highlighting sensitive evidence)?*
- *Can we add simple keyboard shortcuts for tab navigation to make the demo feel ultra-responsive?*
