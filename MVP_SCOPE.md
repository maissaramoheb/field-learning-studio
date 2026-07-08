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
- PDF/DOCX export.
- Public SaaS features.

## Feature Amendment Rule

Only add a new feature if one of the following happens:

- User testing shows the app is unusable without it.
- The feature directly improves the evidence-to-learning workflow.
- The feature improves safety, traceability, or export quality.
