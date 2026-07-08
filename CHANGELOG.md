# Changelog

## v0.1.4 - Impeccable P2/P3 UI Polish and Typography Refinements

- Consolidated duplicate warning disclaimer banners: removed large amber banners from Evidence Matrix and Learning Brief tabs, replacing them with minimal inline "Fictional demo data" indicators while keeping the top header warning banner prominent.
- Improved recommendation cards density: laid out the 8 metadata fields into a structured 2-column key-value grid using a new CompactField helper component.
- Refined global typography: updated the CSS body font family in `globals.css` to prefer a clean, system-safe Inter-style sans-serif stack.
- Deployed the demonstrator live to Vercel (https://field-learning-studio.vercel.app/) and performed a live browser smoke test.
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
