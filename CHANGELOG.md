# Changelog

## v0.4.0 - Visual System Redesign Sprint

- **Container Width Discipline:** Changed max-width constraints on the page shell, app header, and tab panels to `max-w-6xl` to optimize reading scale on larger screens.
- **Calmer Badges and ID Pills:** Updated clickable trace anchors to render as clean, neutral grey monospaced tags that only color in teal on hover. Polished status badges to use tracked uppercase text in rounded pills.
- **Grouped Priority Recommendations:** Overhauled the rigid 3-column layout on the Recommendations tab into a single unified layout grouped vertically by priority sections, with recommendations in each priority group rendered in a clean, responsive 2-column grid.
- **Interpretation-First Evidence Cards:** Removed quotation marks from paraphrased observation summaries and redesigned the card content structure. Used clean grey left-border columns for raw evidence and green left-border blocks for interpreted meaning.
- **Clean Deliverable Canvas:** Styled the final Brief Preview to look like a premium document sheet using white backgrounds, slate card borders, and professional cap margins.
- **Workflow Overview Alignment:** Constrained the Suggested Walkthrough Path cards and flowchart pipeline to align perfectly with the new visual layout.

## v0.3.0 - Impeccable Product Polish Sprint

- **Pre-Implementation Review:** Added `docs/impeccable_v0.3_ui_review.md` documenting strengths, weaknesses, Impeccable critique findings, priorities, design direction, sprint scope, exclusions, and risks before coding.
- **Stronger Product Framing:** Reworked the first screen around the promise "Turn field evidence into traceable programme learning" with three clear value pillars.
- **Professional Case Selector:** Converted the case selector into a polished pathway chooser with use case, evidence base, sensitivity level, demonstration value, and safety notes for each case.
- **Workflow and Guided Demo Polish:** Clarified the suggested demo path and expanded the workflow map from field notes through source inventory, evidence matrix, findings, lessons/practices, recommendations, QA review, and learning brief.
- **Traceability Aha Moment:** Improved the traceability drawer with record summaries, linked IDs, safeguard notes, "why this matters" context, and trace chains extending to QA and Brief.
- **Evidence / QA / Brief Refinements:** Refined evidence cards, grouped QA results by severity, and expanded the brief preview into a more complete donor-ready document canvas while preserving Markdown copy/export.
- **Validation:** `npm run lint` and `npm run build` passed locally.

## v0.2.3 - School Nutrition Case and Case Switcher Integration

- **Multi-Case Switcher:** Designed a professional card-based `CaseSelector` component above the workspace tabs, allowing users to switch cases dynamically.
- **Sanitized Real field Case:** Integrated the real-world-inspired **School Nutrition & Child Wellbeing Field Learning Case** based on a field mission tracker.
- **Strict Data Safety:** Generalised school names, anonymised stakeholder/team names, paraphrased quotes, and abstract protection categories.
- **Case-Specific Workspace Rules:** Added custom warning disclaimers, custom sandbox templates, case-aware keyword parsing, and dynamic QA checklists (such as protection safety checks).
- **ESLint & Build Optimization:** Refactored state arrays into side-effect-free computed states to eliminate cascading renders and ESLint warnings.

## v0.2.2 - v0.2 Product-Level UI/UX Redesign Sprint

- **Overview Page Redesign:** Structured the landing page to feature a prominent hero section with a clear headline ("Turn field notes into traceable programme learning.") and a professional Suggested Walkthrough path checklist progress bar.
- **TraceChain Breadcrumbs Component:** Embedded a central visual traceback widget (`SRC → EV → FND → REC`) inside the drawer details, Overview page sandbox trace, and findings/recommendations card grids.
- **Interpretation-First Evidence Cards:** Refined evidence grid layout to display structured observation summaries, coded themes/stakeholders, strength levels, sensitivity flags, and inline Inspect links, avoiding raw-only displays.
- **Sorted QA Severity Checklist:** Restructured the QA Review page to show Passed/Needs Review/Warning statistics cards, sorting warnings to the top and adding a dynamic pill parser for checklist notes.
- **Polished Brief Page:** Structured the brief draft preview with a clean metadata strip and action bar header, keeping raw Markdown source code in a details disclosure toggle.

## v0.2.1 - Phase 2 real-case demo planning

- Created `docs/phase_2_real_case_demo_plan.md` for a sanitized real-world-inspired school nutrition and child wellbeing case.
- Documented anonymization rules, data mapping, proposed themes, findings, lessons learned, good practices, recommendations, QA/safeguarding review logic, and public/private content boundaries.
- Recommended an Overview-tab case selector as the safest Phase 2 presentation approach after approval.
- Did not import raw spreadsheet data and did not change app code.

## v0.2.0 - v0.2-demo Interactive Workspace Workbench

- **Interactive Traceability Drawer Overlay:** Developed a slide-over drawer display to view details for all workspace objects (sources, evidence, findings, lessons, good practices, recommendations, and QA items) in a contextual overlay, eliminating tab-yanking transitions.
- **Card-Based Evidence Grid:** Converted the wide horizontal-scroll Evidence table into responsive cards optimized for qualitative field notes analysis.
- **Local Sandbox Ingestion Simulator:** Added a sandbox card on the Overview page for pasting custom field notes with a strict privacy disclaimer. Includes 3 quick-insert template buttons (Women's Safe Access, Youth Engagement, Partner Reporting Burden) and keyword-coding logic to set themes and sensitivity thresholds.
- **QA Audit Progress Simulator:** Integrated an interactive "Run QA Audit" command triggering a 1.8s scanning timer animation before displaying status checklist cards. Added a deterministic check indicator.
- **A4 Brief Sheet Layout:** Structured the Brief Preview to look like a premium physical report with white margin canvas borders and details-hidden Markdown source block.
- **Visual Clickable Pipeline Flowchart:** Rendered an interactive progress chart on the Overview landing page to navigate between workspace tabs.

## v0.1.4 - Impeccable P2/P3 UI Polish and Typography Refinements

- Consolidated duplicate warning disclaimer banners: removed large amber banners from Evidence Matrix and Learning Brief tabs, replacing them with minimal inline "Fictional demo data" indicators while keeping the top header warning banner prominent.
- Improved recommendation cards density: laid out the 8 metadata fields into a structured 2-column key-value grid using a new CompactField helper component.
- Refined global typography: updated the CSS body font family in `globals.css` to prefer a clean, system-safe Inter-style sans-serif stack.
- Deployed the demonstrator live to Vercel (https://field-learning-studio.vercel.app/) and performed a live browser smoke test.
- Created the Field Learning Studio Demo & Validation Pack v0.1 (docs/demo_validation_pack_v01.md) to support founder pitches, user demo sessions, qualitative feedback checklists, and early paid pilot offers.
- Verified linting and static compilation build compatibility.

## v0.1.3 - Impeccable P1 Interactive Traceability Fixes

- Converted all source (`SRC-`) and QA checklist (`QA-`) ID pills into clickable, accessible `TraceButton` controls.
- Linked source IDs in the Evidence Matrix table to highlight and scroll to source records cards.
- Restyled the sticky tab navigation bar to display as a professional bottom-border institutional tab header.
- Added comprehensive `title` and `aria-label` accessibility descriptors to all trace buttons.
- Removed unused legacy components (`Pill`) to maintain clean linter compliance.
- Verified linting and static compilation build passes.

## v0.1.2 - Impeccable Design Context Integration

- Installed and configured Impeccable CLI design harness plugin.
- Initialized Impeccable design context by creating `PRODUCT.md` and `DESIGN.md` guidelines at the project root.
- Created `.impeccable/design.json` design sidecar and `.impeccable/live/config.json` for live browser variant injections.
- Verified compilation and build compatibility on Node 25.x.

## v0.1.1 - Antigravity P0 UX improvements

- Converted the long page into a tabbed workspace: Overview, Evidence, Findings, Lessons, Recommendations, QA Review, and Brief.
- Made evidence, finding, lesson, good practice, and recommendation IDs visually interactive with tab switching, scroll, and highlight behavior.
- Replaced the raw-only Markdown preview with a styled donor-ready brief preview.
- Preserved the Copy Learning Brief Markdown function and static demo-data-only scope.
- Passed lint and production build validation.

## v0.1.0 - Project foundation and demo app scaffold

- Initialized project foundation documentation.
- Reserved v0.1 scope for a safe, fictional-data demo workflow.
- Added Next.js App Router, TypeScript, Tailwind CSS, and ESLint setup.
- Added typed data models and static Community Bridges demo data.
- Built the single-page evidence-to-learning demo workflow.
- Added QA review helper and Markdown learning brief generator.
- Added copyable Markdown learning brief preview.
- Passed lint and production build validation.
