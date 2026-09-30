# Decisions

## Initial Decisions

- Build a demoable MVP app now.
- Keep the spreadsheet/manual method as the analytical backbone.
- Use built-in fictional demo data.
- Do not add authentication, database, or upload in v0.1.
- Use Markdown export first.
- Require human review for AI/synthesis outputs.
- Treat productized consulting as the first revenue path.
- Do not treat SaaS as the first revenue path.
- Use plain accessible components instead of adding shadcn/ui in v0.1.
- Keep learning brief generation as a pure local helper using static fictional demo data.
- Set the Next.js Turbopack root explicitly because this workspace sits below another lockfile.
- Accepted P0 UX improvements after Antigravity review: tabbed workspace, interactive traceability IDs, and styled brief preview.
- **v0.2-demo Development Decision:** v0.2-demo upgrades Field Learning Studio from a static structured viewer into an interactive evidence workbench while preserving safe local-only demo constraints. Added Traceability Drawer, card grid layout, sandbox note ingestion with preset templates, QA scanner animation, and premium document brief sheet.
- **v0.2-demo UI/UX Redesign Decision:** v0.2-demo requires a product-level UI/UX redesign before external validation. The redesign must make the app feel like a guided evidence workbench, not a static database viewer. Features include a restructured Overview with a Hero section and Suggested Walkthrough Path check card, visual Traceability Chains, refined Interpretation-first Evidence Cards, sorted QA checklist tables with severity counters, and clean document Brief preview styles.
- **v0.3-demo Impeccable Product Polish Decision:** Accepted a structured Impeccable-driven UI/UX polish sprint to make Field Learning Studio feel like a professional evidence-to-learning workbench. Changes are limited to product clarity, hierarchy, traceability, QA safeguards, case selection, and brief preview polish. No auth, database, upload, backend, external AI API, real data processing, or new product features are added.
- **v0.5-demo Dark Workbench Decision:** Accepted a dark Impeccable command-equivalent redesign sprint to make Field Learning Studio feel like a premium evidence command room for field learning synthesis. Changes are limited to the dark visual system, layout hierarchy, traceability signature interaction, evidence card clarity, QA review gate, and styled brief preview. No auth, database, upload, backend, analytics, payments, external AI API, real data processing, or Phase 2 content are added.
- **v0.6-demo Blue Command Workbench Decision:** Accepted a visual refinement sprint on top of v0.5 to shift the interface from green/teal command room to a blue-black/slate analytical evidence command center. Changes are limited to color roles, typography hierarchy, traceability presentation, screen-level visual polish, and documentation. Static demo data, local-only sandbox behavior, Markdown export, no-auth/no-db/no-upload/no-backend/no-external-AI constraints, and sensitive-data boundaries remain unchanged.
- **v0.7 Export Pack Decision:** Field Learning Studio will support local browser-based export of selected learning briefs to Word, PDF, and Markdown. No export content is uploaded or processed by a backend. Every exported file will include safety and review required disclosures.
- **v0.8 Local Note Intake Decision:** Field Learning Studio will support local-only pasted note intake before file upload or database-backed ingestion. Sandbox notes remain in component state and are excluded from exports unless explicitly included by the user.
- **Phase 0 Schema, Lineage, and Epistemic Foundation Decision (Specification v1.2):**
  - Entity-Specific Lifecycle Maturity: Reject universal status enums; use entity-appropriate lifecycles (e.g. Evidence reviewStatus, Finding validationStatus, Recommendation validationStatus).
  - Explicit MaterialCategory: Classify field material as `primary_evidence`, `secondary_evidence`, `supervisory_interpretation`, or `legacy_unclassified`. Never fabricate provenance. Exclude supervisory debriefs from independent source counts; issue warnings for legacy unclassified material.
  - IndexedDB v2 Architecture: Upgrade `FieldLearningStudioDB` to version 2 by introducing segregated `sourceFileMetadata` and `sourceFileContent` stores and a `by_reviewStatus` index on `evidence`. Retain assembled-study in-memory traversal instead of invalid compound multiEntry indexes.
  - Preflight Backup Isolation: Enforce backup isolation where `FieldLearningStudioBackupDB` is opened via a raw v1 connection to capture verified envelopes before the main database is opened at version 2. If backup fails, abort upgrade immediately.
  - Centralized Write Normalization: Ensure all new writes through `studyStore` pass through idempotent pure normalizers in `src/lib/storage/normalization.ts` ensuring all metadata, audit trails, and dual-write synchronizations are satisfied.
  - Recommendation Dual-Write Invariant: Maintain synchronization between `linkedFindingId` (singular) and `linkedFindingIds` (array) on every write to preserve existing UI consumers and the `by_finding` index during transition.
  - Pure Dynamic Triangulation: Recalculate triangulation metrics dynamically on demand; do not persist deterministic triangulation scores. Allow single-source findings with explicit recorded human caveats.
- **Phase 2 Study Workspace Architecture Decision:**
  - Study Workspace Purpose: Transform the Study workspace from an overview landing into the authoritative place where the practitioner defines the study before collection or import.
  - Canonical 4-Sub-View Hierarchy: Sub-divide Space 1 (Study) into `Study Brief` (`study-brief`, default), `Questions & Scope` (`study-questions`), `Methods & Sources` (`study-methods`), and `Framework & Roles` (`study-framework`).
  - Study Question Canonical Ownership: Move authoring and ordering of `StudyQuestion` entities canonically into `Study -> Questions & Scope`. `SynthesisWorkbench` retains filtering, matrix association, and active selection, with a "Manage in Study Blueprint →" button linking back to `study-questions`.
  - Dynamic Methods & Sources Reconciliation: Reconcile planned targets against actual active source and evidence records entirely dynamically in memory (`useMemo`). Never persist derived counts or statuses to storage.
  - Configurable Analytical Framework Lenses & Team Roles Matrix: Store framework lenses and governance assignments purely as typed properties on `StudyMeta` in IndexedDB. No user accounts, passwords, or RBAC systems are introduced.
  - Pure Dynamic Study Readiness: Evaluate study preparation readiness dynamically across 9 deterministic criteria covering brief, questions, methods, framework, and roles. Readiness score and missing-item lists are never stored in IndexedDB.
  - Zero IndexedDB Version Bump: Preserve `DB_VERSION = 2`. All new properties exist as non-breaking, optional fields on the existing `studies` store schema.
