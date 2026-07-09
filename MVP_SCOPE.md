# MVP Scope

## v0.1 Includes

- Landing page.
- Built-in demo case.
- Evidence intake / editing.
- Evidence matrix view.
- Findings builder.
- Lessons / good practices / recommendations view.
- QA review checklist.
- Learning brief preview.
- Markdown export.
- No-login demo experience.
- Accepted P0 UX improvement: tabbed workspace layout for Overview, Evidence, Findings, Lessons, Recommendations, QA Review, and Brief.
- Accepted P0 UX improvement: visually interactive traceability IDs that scroll to or highlight the relevant card or section.
- Accepted P0 UX improvement: styled donor-ready Learning Brief preview while preserving Markdown copy/export.

## v0.2 Includes

- **Interactive Traceability Drawer (P0):** Contextual slide-over drawer to inspect linked evidence, sources, and recommendations without yanking the user across workspace tabs.
- **Evidence Card Grid Layout (P0):** Replaced wide horizontal table scroll with responsive cards optimized for qualitative analysis.
- **Local Sandbox Intake Simulation (P0):** Interactive text box on Overview tab allowing users to paste notes or use quick templates to see deterministic keyword-inferred parsing (local-only, no server/AI upload).
- **QA Audit Scanner Simulator (P1):** Animated progress scanner that verifies evidence linkages and highlights warnings inline.
- **A4 Brief Sheet Preview (P1):** Styled the final output tab like a premium physical report with details-hidden Markdown source code block.
- **Product-Level UI/UX Redesign (P0):** Complete visual redesign to align with the creative north star "The Institutional Ledger", featuring structured boundaries, clean grid cards, visual active paths, and high-legibility sans-serif fonts.
- **Suggested Walkthrough Path (P1):** A subtle, professional checklist guiding the user through 5 core workspace steps.
- **Traceability Chains (P1):** Reusable inline breadcrumb chains mapping object linkages (`SRC → EV → FND → REC`) inside the drawer, findings/recommendations, and the landing page.

## v0.3 Includes

- **Impeccable Product Polish Review (P0):** Created `docs/impeccable_v0.3_ui_review.md` before coding to ground the sprint in PRODUCT.md, DESIGN.md, prior critique history, and local detector results.
- **Stronger First Impression (P0):** Reworked the top app header into a clearer evidence-to-learning value proposition with three professional value pillars.
- **Professional Case Selector (P0):** Upgraded case selection into a demo pathway chooser showing use case, evidence base, sensitivity level, and what each case demonstrates.
- **Workflow Map Refinement (P0):** Reframed the Overview workflow from field notes through source inventory, evidence matrix, findings, lessons/practices, recommendations, QA review, and learning brief.
- **Traceability Drawer Polish (P0):** Added clearer record summaries, safeguard notes, "why this matters" context, and expanded trace chains that reach QA and Brief.
- **Evidence/QA/Brief Hierarchy Polish (P1):** Refined evidence cards, QA review grouping, and the brief preview document canvas while preserving static demo data and Markdown export.

## v0.5 Includes

- **Dark Impeccable Workbench Redesign (P0):** Reworked the app into a premium dark evidence command room while preserving the existing static demo data, data models, local-only sandbox, and Markdown export.
- **Shape-First UX Direction (P0):** Created `docs/v0.5_dark_workbench_shape.md` before coding to document product mode, users, usage context, atmosphere, promise, metaphor, anti-references, and design priorities.
- **Traceability Signature Polish (P0):** Strengthened ID pills, claim lineage drawer, source-to-brief trace chains, and related-tab navigation without adding routes, backend, or persistence.
- **Evidence Card Safety Polish (P0):** Removed quote-like styling around sanitized observations and reframed evidence cards as observation -> interpretation -> linked finding.
- **Layout Hardening (P0):** Replaced the awkward recommendations three-column layout with stacked priority sections, stabilized Lessons/Good Practices, and tightened tablet/laptop overflow behavior.
- **Brief Preview Upgrade (P0):** Preserved raw Markdown copy/export while presenting the brief as a premium document sheet inside the dark workbench.

## v0.6 Includes

- **Blue Command Workbench Refinement (P0):** Refined the v0.5 dark workbench into a blue-black/slate analytical workspace while preserving the same static demo data, local-only sandbox, data models, and Markdown export.
- **Pre-Coding Refinement Plan (P0):** Created `docs/v0.6_blue_command_workbench_refinement.md` before code edits to document the assessment, blue-slate direction, component plan, traceability plan, exclusions, and validation checklist.
- **Blue-Slate Visual System (P0):** Updated the runtime and documented design tokens from green-black/teal to blue-black/slate with primary blue actions, cyan traceability, amber safety notes, red warnings, and green only for pass/completion states.
- **Traceability Presentation Upgrade (P0):** Reworked `TraceChain` into labeled source-to-brief lineage nodes and routed overview/sandbox trace paths through the traceability drawer.
- **Screen-Level Polish (P1):** Tuned the hero, case selector, overview, evidence cards, findings, lessons, recommendations, QA review, and brief preview for calmer hierarchy, less terminal feel, and better executive scannability.

## v0.7 Includes

- **Word, PDF, Markdown Export Pack (P0):** Adds professional local download options for Word (.docx), PDF (.pdf), and improved Markdown (.md) to the learning brief workbench.
- **Shared Export Model (P0):** Implements a shared structured export data model to ensure content parity across all three export types.
- **Visual Integration (P0):** Houses exports inside a clean "Export Brief Deliverable" action area styled as a premium command tool.

## v0.8 Includes

- **Local-Only Field Note Intake (P0):** Adds a paste-only sandbox workflow for short anonymized field notes using React component state only.
- **Deterministic Safety Warning Checker (P0):** Flags possible sensitive or identifying details with a local warning gate before draft evidence generation.
- **Sandbox Draft Evidence Boundary (P0):** Keeps sandbox evidence, findings, and recommendations visually separate from validated static demo content.
- **Optional Sandbox Export Inclusion (P0):** Excludes sandbox drafts from Word, PDF, and Markdown exports by default; includes them only in a separate "Sandbox Draft Evidence — Requires Review" section when explicitly enabled.
- **No Persistence / No Upload Boundary (P0):** Does not use file upload, database storage, localStorage, backend processing, external AI APIs, analytics, or saved project workspaces.

## v0.1 Does Not Include

- Authentication.
- Database.
- File upload.
- Real AI API calls.
- Payments.
- Team collaboration.
- Client portal.
- Dashboard-heavy analytics.
- Sensitive data processing.
- PDF/DOCX export (originally excluded in v0.1, added in v0.7).
- Public SaaS features.

## Feature Amendment Rule

Only add a new feature if one of the following happens:

- User testing shows the app is unusable without it.
- The feature directly improves the evidence-to-learning workflow.
- The feature improves safety, traceability, or export quality.
