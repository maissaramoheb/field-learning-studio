# TODO

## P0

- [x] Initialize app.
- [x] Create foundation docs.
- [x] Build demo data model.
- [x] Build page shell.
- [x] Build workflow steps.
- [x] Build learning brief preview.
- [x] Build Markdown export.
- [x] Run lint/build.
- [x] Converted long page to tabbed workspace layout.
- [x] Made traceability IDs interactive with scroll/highlight behavior.
- [x] Replaced raw-only Markdown preview with styled donor-ready brief preview while preserving Markdown copy.
- [x] Installed and initialized Impeccable design context (PRODUCT.md, DESIGN.md, and live configuration).
- [x] Implemented Impeccable P1 interactive traceability (SRC- and QA- ID pills as button controls, tab mappings, dynamic highlight) and restyled navigation tabs.
- [x] Implemented Impeccable P2/P3 UI polish (reduced warning banner redundancy, restructured recommendation metadata grid, and upgraded font stack to Inter-style).
- [x] Create Phase 2 sanitized real-case demo plan for a school nutrition and child wellbeing field learning case.
- [x] Create v0.5 dark workbench shape document before coding.
- [x] Redesign v0.5 app shell as a premium dark evidence command room.
- [x] Remove quote-like styling from sanitized evidence observations.
- [x] Strengthen traceability IDs and claim-lineage drawer.
- [x] Replace recommendations three-column layout with stacked priority sections.
- [x] Stabilize Lessons and Good Practices layout for laptop/tablet widths.
- [x] Preserve styled brief preview and Markdown export in the dark workbench.
- [x] Create v0.6 blue command workbench refinement document before coding.
- [x] Refine v0.5 dark workbench into a blue-slate analytical command workspace.
- [x] Rework TraceChain into labeled source-to-brief lineage nodes.
- [x] Preserve static demo data, local-only sandbox behavior, and Markdown export in v0.6.
- [x] v0.7 Export Pack: client-side Word (.docx), PDF (.pdf), and improved Markdown (.md) brief downloads in a shared export model.
- [x] v0.8 Local Note Intake: local sandbox note paste, regex safety checks, confirmation bypass gate, mock parser, separate drafts in findings/recommendations, QA flags, and conditional exports.
- [x] v0.9 Phase 1: Domain Model + Normalized IndexedDB Persistence Foundation:
  - [x] Extend domain types in `src/lib/types.ts` (`StudyMeta`, `ValidationStatus`, `ConsentStatus`, `AnonymizationStatus`, `CollectionMethod`, `DailyDebrief` with multi-site `siteIds`, `rejectionReason`, `revision`, `FieldStudy`).
  - [x] Implement normalized `FieldLearningStudioDB` v1 schema across 8 object stores with compound keys `[studyId, id]` in `src/lib/storage/indexedDb.ts`.
  - [x] Implement typed repository operations in `src/lib/storage/studyStore.ts` (CRUD, `assembleStudy` projection, atomic persistence).
  - [x] Implement Option A demo template strategy (idempotent `bootstrapDemoTemplates`, deletion guard, `cloneDemoStudy` with fresh UUIDs).
  - [x] Implement portable `.fls.json` backup export and atomic multi-strategy import with runtime validator in `src/lib/storage/studyBackup.ts`.
  - [x] Implement bidirectional compatibility adapter in `src/lib/storage/demoStudyAdapter.ts`.
  - [x] Document storage architecture in `docs/v0.9_storage_architecture.md`.
  - [x] Create comprehensive Vitest suite in `tests/storage.test.ts` (16 tests, 43 total suite).
- [x] v0.9 Phase 2: Evidence Support Profile & Gap Detection Engine:
  - [x] Implement pure `computeSupportProfile()` in `src/lib/analytics/supportProfile.ts` with source independence, method diversity, stakeholder coverage, site coverage, contradiction handling, 3 support tiers, and transparency flags.
  - [x] Implement pure `detectFindingGaps()` and `detectStudyGaps()` in `src/lib/analytics/gapDetector.ts` with 6 explicit gap types and calibrated severities.
  - [x] Document evidence support model in `docs/v0.9_evidence_support_model.md`.
  - [x] Create unit tests in `tests/supportProfile.test.ts` and `tests/gapDetector.test.ts` covering Cases A through H (17 tests, 60 total suite).

## P1

- [x] Review and approve Phase 2 anonymization and safeguarding plan before coding.
- [x] Create a sanitized non-identifying working copy of the real field mission tracker outside the public app repository.
- [x] Select 8-10 source records and 12-16 representative evidence entries only after sanitization review.
- [x] Implement static second demo case only after approval.
- [x] Execute v0.2 UI/UX product-level redesign:
  - [x] Redesign Overview landing tab with strong Hero statement, clean layout, and CTAs
  - [x] Create a subtle, professional Suggested Walkthrough checklist side panel
  - [x] Create reusable visual Traceability Chain components inside drawer and card profiles
  - [x] Refactor Evidence Cards to prioritize interpretation-first summaries
  - [x] Restructure QA Review tab with audit counts and severity-sorted checklist cards
  - [x] Style A4 deliverable Brief preview with professional action header bar
  - [x] Polish Workspace Tabs navigation to look like an institutional document ledger
- [x] Upgrade to v0.2-demo interactive workbench:
  - [x] Create TraceabilityDrawer overlay for context-preserving ID inspections
  - [x] Convert Evidence Matrix table into responsive card layout grids
  - [x] Add local Sandbox Input on Overview tab with sample template buttons and keyword inference
  - [x] Add animated "Run QA Audit" progress scan on QA checklist
  - [x] Style A4 document brief sheet on Brief tab with hidden Markdown source toggle
  - [x] Render clickable workflow pipeline chart on Overview tab
- [x] Execute v0.3 Impeccable product polish:
  - [x] Create pre-implementation UI review document
  - [x] Strengthen first-screen product promise and value pillars
  - [x] Upgrade case selector into a professional demo pathway chooser
  - [x] Improve workflow map, guided demo path, traceability drawer, evidence cards, QA review, and brief preview
- [ ] Review the Next.js/PostCSS audit finding and update safely when a compatible patched Next.js release is available.
- [x] Review the v0.6 blue command workbench preview before deciding whether to merge.

## P2

- [ ] Future AI API integration.
- [ ] File upload.
- [ ] Authentication.
- [ ] Database.
- [ ] Paid pilot mode.
