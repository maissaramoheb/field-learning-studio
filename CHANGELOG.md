# Changelog

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
