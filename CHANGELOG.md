# Changelog

## Phase 4 - Analysis Architecture & Traceable Validation

- **Analytical Architecture & Local Workspaces (Space 3: Analysis)**:
  - Redesigned the Analysis space into 4 dedicated, traceable workspaces:
    - **Synthesis Workbench** (`synthesis`): Sensemaking workspace bridging qualified field material to emerging insights.
    - **Triangulation Matrix** (`triangulation`): Cross-tabulation matrix assessing evidence distribution and detecting blind spots.
    - **Findings Ledger** (`findings`): Master-detail claim verification and evaluator validation sign-off.
    - **Lessons** (`lessons`): Actionable and transferable learning derived strictly from validated findings.
- **Synthesis Workbench (`SynthesisWorkbenchView.tsx`)**:
  - **Evidence Explorer (`EvidenceExplorer.tsx`)**: Left-hand browser defaulting to qualified field material (`reviewStatus === "usable"`), multi-filter dimensions (Study Question, Framework Theme, Method, Stakeholder, Site, Sensitivity), document coordinates, and modal for reading original file excerpts in full context (`ViewOriginalSourceModal.tsx`).
  - **Sensemaking Canvas (`ReasoningWorkspace.tsx`)**: Working pattern note authoring with 5 explicit reasoning types (`pattern`, `tension`, `contradiction`, `possible_explanation`, `evidence_gap`), multi-evidence linking, and direct promotion to a candidate finding.
- **Triangulation Matrix (`TriangulationMatrixView.tsx`)**:
  - Cross-tabulation grid evaluating analytical framing (Framework Themes, Study Questions) against triangulation vectors (Methods, Stakeholders, Sites, Categories).
  - Deterministic cell classification: `CONVERGENT`, `MIXED`, `DIVERGENT`, `SPARSE`, `EMPTY`.
  - Strict independent source deduplication (multiple observations from the same source record count as 1 source; supervisory debriefs are excluded from independent source counts).
  - Interactive drill-down drawer inspecting all supporting observations and source records.
- **Findings Ledger & Review Inspector (`FindingsLedgerView.tsx`)**:
  - Master-detail ledger: searchable findings list on the left; rich finding inspector on the right.
  - Live evidence support profile reconciliation (independent sources, method diversity, stakeholder groups, site coverage).
  - Mandatory limitation note requirement: blocks validation if finding relies on single source, sparse data, or unresolved contradictions unless an explicit limitation note is documented.
  - Complete validation lifecycle: Draft -> Needs Review -> Validated (human evaluator certification) / Rejected (non-empty rationale, with reopen to Draft).
  - Excluded evidence guard: rejects validation if any supporting evidence record is marked `reviewStatus === "excluded"`.
- **Lessons & Practices Workspace (`LessonsWorkspaceView.tsx`)**:
  - Structured 3-column analysis grid: What Worked / What Did Not, Underlying Mechanics / Why, Conditions for Transferability / Replication.
  - Grounded parent finding constraint: prevents validating a lesson or good practice unless all linked parent findings are in `validationStatus === "Validated"`.
- **Epistemic Invariants & Zero-AI Principle**:
  - Zero AI models, prompts, RAG, or AI generation added. Complete human analytical reasoning and defense preserved.
  - Maintained `DB_VERSION = 2` without migrations; extended models via optional backward-compatible attributes.
  - Demo case (`communityBridgesCase`) seeded with 5 multi-type pattern notes (`PAT-001` to `PAT-005`).
- **Quality Gates & Verification**:
  - Tests: 315 passing tests across 26 test files (including 18 new tests in `tests/phase4AnalysisArchitecture.test.ts`).
  - TypeScript: `tsc --noEmit --incremental false` clean (0 errors).
  - ESLint: clean (0 errors, 0 warnings).
  - Next.js Turbopack build clean.
  - Automated CDP visual QA verified across desktop (1440px), tablet (768px), and mobile (390px) with 0 horizontal overflow and copyright notice preserved.

## Phase 3 - Workspace Rail + Field Material Architecture

- **Workspace Navigation Architecture (Phase 3A)**:
  - Implemented collapsible `WorkspaceLeftRail.tsx` (230px expanded, 64px collapsed) with accessible keyboard shortcut (`Alt+[`), smooth CSS transitions, tooltip hover states, and live metric badges (e.g. `20 obs · 12 src`, `8 findings`, `10 recs`). State persists to `localStorage` (`fls_rail_collapsed`).
  - Streamlined `StudyWorkspaceHeader.tsx`: On desktop (>=1024px), removed redundant primary workspace horizontal tabs, preserving only secondary/local sub-view tabs. Preserved responsive switcher on mobile/tablet (<1024px).
- **Field Material Architecture & Restructuring (Phase 3B)**:
  - Reorganized practitioner spaces:
    - Step 2 (Field Material): `Field Intake` (`intake`), `Daily Debrief` (`debrief`), `Import & Mapping` (`import`), `Evidence Review` (`evidence`).
    - Step 3 (Analysis): `Synthesis Workbench` (`synthesis`), `Findings Ledger` (`findings`), `Lessons & Practices` (`lessons`). Relocated `Daily Debrief` from Analysis to Field Material.
  - **Tabular CSV/TSV Intake & Mapping Engine**:
    - Created `tabularImporter.ts` with RFC 4180 parsing handling nested commas, quotes, and newlines in cells, as well as tab-delimited files.
    - Added heuristic column auto-detection (Title, Date, Site, Stakeholder, Method, Collector, Notes).
    - Transactional batch ingestion via `saveSourceBatch` and `saveEvidenceBatch` in IndexedDB.
    - Preserved original source files in IndexedDB `sourceFileRepository`.
  - **Unified 3-Mode Import Studio (`ImportMappingView.tsx`)**:
    - Interactive 3-mode selector: Tabular CSV/TSV, Word .docx, Structured Notes.
    - Column mapping preview with category assignment and batch commit confirmation.
    - Enforced showcase demo safety lock preventing accidental edits to showcase demo cases.
  - **Method Taxonomy Harmonization**:
    - Harmonized collection methods to the 6 canonical methods in `src/lib/methodTaxonomy.ts`: `Key Informant Interview`, `Focus Group Discussion`, `Direct Observation`, `Document Review`, `Survey`, `Community Meeting`.
    - Added `isCanonicalMethod` predicate and auto-canonicalization for method variants.
  - **Evidence Review & Qualification Gate**:
    - Instituted 4-state qualification workflow: `pending` ("Pending Review"), `usable` ("Qualified / Usable"), `needs_clarification` ("Needs Clarification"), `excluded` ("Excluded / Disqualified").
    - Added dimension filters: Theme, Stakeholder, Reliability, Sensitivity, Study Question, Site/Location, Method.
    - Non-destructive Framework Themes bridge (`frameworkThemeIds` linked without overwriting legacy `primaryTheme`).
    - Study Questions linkage in Field Material: observations can link/unlink active study questions; archived questions are displayed with `[Archived]` tag without authoring controls.
  - **Epistemic Safeguards (Supervisory Debrief Exclusion)**:
    - Relocated Daily Debrief to Field Material with prominent methodological notice.
    - All debrief entries stamped with `materialCategory: "supervisory_interpretation"`, strictly excluded from triangulation support metrics.
- **Post-Audit Hardening Pass**:
  - **DOCX Source File Lineage & Genuine Coordinates**: Threaded `sourceFileId` through DOCX ingestion to created `SourceRecord` and `EvidenceEntry` records; populated genuine parser coordinates (`blockIndex`, `headingPath`, `segmentType`) without inventing synthetic page numbers or Word paragraph IDs.
  - **Multi-Store Atomic Transaction**: Implemented `saveSourceAndEvidenceBatch` in `studyStore.ts` ensuring sources and evidence are committed together in a single `["sources", "evidence"]` transaction with referential integrity checks.
  - **Cascading Study Deletion**: Extended `deleteStudy` transaction to safely delete study source files from `sourceFileMetadata` and `sourceFileContent` stores without affecting other studies.
  - **2-Step Structured Notes Flow**: Converted Structured Notes import into a safe 2-step flow: parse and validate without writing, display extraction preview with "Back to Edit" / "Cancel", and ingest atomically on user confirmation.
  - **Decoupled Qualification & Validation**: Separated `reviewStatus` (`pending`, `usable`, `needs_clarification`, `excluded`) from formal `validationStatus` (`draft`, `in_review`, `validated`, `rejected`). Exclusion/reopening now modifies admissibility only.
  - **Evidence Qualification UI Copy**: Replaced "Reject" language with "Evidence Qualification", "Exclude Observation from Analysis", and "Confirm Exclusion" in `EvidenceRejectModal.tsx`.
  - **Framework Theme Inactive Guard**: Filtered out inactive themes (`isActive === false`) from tagging in capture/edit forms while preserving historical tags with an `(Archived)` badge.
  - **Unified Collection Method Taxonomy**: Eliminated duplicate mapping tables in CSV and structured text parsers, routing all method canonicalization strictly through `canonicalizeCollectionMethod` in `methodTaxonomy.ts`.
  - **Workspace Left Rail Tooltip Polish**: Removed `(Alt+[)` hint from the rail toggle button title/aria-label in `WorkspaceLeftRail.tsx`.
  - **Study Switch Filter Reset & O(1) Performance**: Reset evidence review filters upon switching studies, and pre-computed an $O(1)$ source lookup map to eliminate quadratic scans over evidence cards.
- **Quality Gates & Verification**:
  - Total passing tests: 297 across 25 test files (including 27 dedicated tests in `phase3FieldMaterialWorkspace.test.ts`).
  - TypeScript compilation clean (`tsc --noEmit --incremental false` exits 0).
  - ESLint clean (0 errors, 0 warnings).
  - Next.js Turbopack production build succeeds cleanly.
  - `git diff --check` clean (0 whitespace issues).
  - Verified responsive layouts, modal semantics, and toggle behaviors across desktop, tablet, and mobile.

## Phase 2 - Study Workspace: Study Brief, Questions & Scope, Methods & Sources, Framework & Roles

- **Study Workspace Transformation & Sub-navigation**:
  - Transformed Space 1 (Study) from a generic overview into the authoritative definition space where practitioners configure a study before collection/intake.
  - Established 4 purposeful sub-views under Space 1:
    - **Study Brief** (`study-brief`, default sub-view): Comprehensive evaluation charter defining title, purpose, background, intended audience, decision use, geography, timeframe, owner/lead, and known limitations. Includes modal editing for local studies and a prominent "Clone to Edit" CTA for read-only showcase studies.
    - **Questions & Scope** (`study-questions`): Canonical management of `StudyQuestion` entities (title, description, primary flag, sub-questions, up/down reordering) alongside explicit scope boundaries (scope statement, in-scope, out-of-scope, assumptions, constraints).
    - **Methods & Sources** (`study-methods`): Configuration of planned methods, target source counts, target evidence counts, and qualitative descriptions, with live dynamic in-memory reconciliation against actual field sources (`useMemo`). Zero derived counts are persisted.
    - **Framework & Roles** (`study-framework`): Analytical framework configuration (evaluation lenses with descriptions and active status) alongside a team governance matrix (`Lead Evaluator`, `Field Researcher`, `Peer Reviewer`, `QA Approver`, `Focal Point`).
- **Canonical Study Question Migration & Synthesis Linkage**:
  - Transferred authoring, ordering, and deletion of `StudyQuestion` entities canonically into `Study -> Questions & Scope`.
  - Updated `SynthesisWorkbench` to retain question filtering, matrix association, and active selection, enhanced with a "Manage in Study Blueprint →" action navigating directly to `study-questions`.
- **Dynamic Study Readiness Checklist**:
  - Implemented pure, rule-based readiness calculation in `src/lib/analytics/studyReadiness.ts` evaluating 9 deterministic criteria across Brief, Questions, Methods, Framework, and Roles.
  - Designed collapsible `StudyReadinessBanner` with score badge (e.g. 9/9 Ready, 6/9 In Progress), progress bar, missing-item checklist, and direct deep-link buttons to the corresponding sub-view tabs.
  - Dynamic readiness metrics are computed entirely at runtime; no scores or check statuses are written to IndexedDB.
- **Showcase Case Enrichment**:
  - Enriched both demo fixtures (`communityBridgesCase` and `nutritionFieldCase`) with comprehensive, credible Phase 2 evaluation charters, structured primary and secondary questions, planned method quotas, analytical lenses, and team governance roles.
  - Extended `adaptDemoCaseToFieldStudy` to map all Phase 2 properties into runtime studies while strictly maintaining showcase data immutability.
- **Post-Implementation Audit Hardening**:
  - **Study Question Referential Integrity & Lineage Protection**: Hardened `deleteStudyQuestion` in `src/lib/storage/studyStore.ts` via `getStudyQuestionUsage` to strictly block deletion if referenced by downstream records (`EvidenceEntry.studyQuestionIds`, `Finding.studyQuestionId`, `PatternNote.questionId`). Added `archiveStudyQuestion` (`isActive = false`) to preserve question IDs, evidence links, and analytical lineage without cascading deletions or orphaning. Added user-facing domain alert in `StudyQuestionsScopeView`.
  - **Study Blueprint as Sole Question Authoring Home**: Removed Add/Edit/Delete actions from `SynthesisWorkbench` and `StudyQuestionSelector`, retaining question selection, filtering, and `[Archived]` indicator with deep link "Manage in Study Blueprint →".
  - **Canonical Method Normalization**: Implemented `src/lib/methodTaxonomy.ts` with `canonicalizeCollectionMethod(rawType)` mapping variants (e.g. "Focus group discussion", "FGD", "Observation notes", "Field observation log") to standard collection methods (`KII`, `FGD`, `Direct Observation`, `Survey`), preventing false mapping of arbitrary document titles to Document Review.
  - **Planned Method Target Standardization**: Standardized `PlannedMethodTarget` on canonical `targetSourceCount?: number`, deprecating `plannedCount` and dual-writing on save for backward compatibility. Removed `targetEvidenceCount` as planning quota.
  - **Actual Count Semantics**: Corrected actual counts so source count is primary from `SourceRecord` (unaffected by rejected evidence), while observation count excludes excluded/rejected evidence records (`reviewStatus === 'excluded'` or `validationStatus === 'Rejected'`).
  - **Showcase Demo Reconciliation**: Resolved duplicate "Behind Target" / "Unplanned" rows in both showcase demo cases (`communityBridgesCase` and `nutritionFieldCase`), cleanly reconciling planned quotas and field-emergent methods.
  - **Readiness Banner UX**: Default collapsed when `readiness.state === 'ready'`, expanded otherwise, with async hydration state synchronization.
- **Quality Gates & Verification**:
  - Added 35 comprehensive unit and integration tests in `tests/phase2StudyWorkspace.test.ts` (15 baseline + 20 targeted audit regression tests).
  - Total passing tests: 270 across 24 test files.
  - TypeScript compilation, ESLint, Next.js Turbopack build, and `git diff --check` all pass with 0 errors.
  - Headless Chrome CDP visual QA verified 6 targeted post-hardening screenshots in `phase2_hardening_qa/` in addition to the 11 baseline screenshots.

## Phase 1 - Study Library, Demo/Real Separation, and Workspace Identity Foundation

- **Study Library Architecture (`StudyLibraryView`)**:
  - Implemented `StudyLibraryView` component serving as the home/overview view when entering the Studio (`?view=library`).
  - Divided library into two clear visual sections: **Showcase Studies** (curated, read-only demo evaluations) and **My Studies** (local editable studies stored in IndexedDB).
  - Implemented `EmptyStudyState` guiding users on first visit with clean, inviting action to create a real study.
  - Retained `MinimalStudyModal` for frictionless real study creation.
  - Added reserve card for future Phase 2 Import & Mapping UI.
- **Demo / Real Separation & Cloning**:
  - Distinct styling for Demo Studies (`DemoStudyCard`) with informational `SHOWCASE DATA · READ-ONLY` badge.
  - Real studies (`StudyCard`) display evaluation metadata, status badge, last-modified timestamp, and key metric counters (sources, evidence, findings, recommendations) without alarming or distracting "LIVE" labels.
  - Implemented "Clone to My Studies" on demo cards: clones the selected demo study into a new editable local study in IndexedDB with full relationship and lineage fidelity.
  - In-workspace header displays subtle `SHOWCASE DATA · READ-ONLY` pill when viewing demo studies.
- **Workspace Identity System & Semantic Design Tokens**:
  - Defined semantic CSS tokens in `globals.css` across Day and Night themes:
    - Step 1: **Study** | Purpose: *DEFINE* | Blue (`--workspace-study-accent: #3b82f6` night, `#2563eb` day)
    - Step 2: **Field Material** | Purpose: *CAPTURE & QUALIFY* | Sky (`--workspace-field-accent: #0ea5e9` night, `#0284c7` day)
    - Step 3: **Analysis** | Purpose: *INTERPRET & VALIDATE* | Violet (`--workspace-analysis-accent: #8b5cf6` night, `#7c3aed` day)
    - Step 4: **Deliverables** | Purpose: *COMMUNICATE & DECIDE* | Purple (`--workspace-deliverables-accent: #a855f7` night, `#9333ea` day)
  - Strict isolation between workspace identity tokens and status/alert tokens (`--warning`, `--danger`, `--success`).
  - Implemented `WorkspaceContextHeader` orientation component answering: *Where am I?*, *What am I doing here?*, *What type of work belongs here?*
- **Header Hierarchy & Navigation Refactoring**:
  - Replaced cramped `<select>` dropdown with 3-tier navigation hierarchy in `StudyWorkspaceHeader`:
    - Level 1: Utility bar (`< Back to Study Library`, study title, demo indicator, ThemeSwitcher, Backup/Restore, `+ New Study`).
    - Level 2: Epistemic 4-space tabs with step numbers and purpose labels (*Define -> Capture -> Interpret -> Communicate*) while allowing unrestricted navigation.
    - Level 3: Active sub-tabs preserving existing analytical workflows without disruption.
- **Post-Implementation Audit Hardening**:
  - Implemented `resolveStudioNavigation` establishing strict deep-link resolution precedence (`?view=library` -> valid `?study=<id>` over cached study -> safe fallback) and attached `popstate` event listener with clean unmount cleanup for native browser Back/Forward traversal.
  - Hardened `cloneDemoStudy()` to deep clone `patternNotes` with explicit `studyId: newStudyId` remapping while strictly maintaining immutability of the source demo pattern notes.
  - Refactored Level 1 header in `StudyWorkspaceHeader` and `globals.css` into two responsive rows (`.fls-app-bar-context` and `.fls-app-utilities`) at $\le 800\text{px}$ and $\le 540\text{px}$, resolving mobile button collisions, title truncation, and horizontal overflow.
- **Verification & Visual QA**:
  - Added 18 unit and integration tests in `tests/phase1StudyLibrary.test.ts` covering demo/real separation, cloning, empty state, workspace context mapping, lineage preservation, deep-link priority, browser history popstate traversal, and PatternNote remapping.
  - Total passing tests: 235 across 23 test files.
  - TypeScript, ESLint, Turbopack production build, and `git diff --check` all pass with 0 errors.
  - Headless Chrome CDP visual QA verified 14 high-resolution screenshots + 6 responsive mobile checks across Day and Night themes.

## Phase 0 - Schema, Lineage, and Epistemic Foundation (Specification v1.2)

- **IndexedDB Schema v2 (`FieldLearningStudioDB`)**:
  - Incremented `DB_VERSION` from 1 to 2 with transactional, cursor-based historical record backfill.
  - Added dedicated object stores: `sourceFileMetadata` (`[studyId, id]`, indexed by `by_originalName`, `by_createdAt`) and `sourceFileContent` (`[studyId, fileId]`).
  - Added index `by_reviewStatus` on `evidence` store for targeted lifecycle queries.
  - Maintained in-memory relationship traversal for assembled studies without invalid compound multiEntry indexes.
- **Preflight Backup Isolation**:
  - Implemented `runPreMigrationBackup` in `src/lib/storage/migrationV2.ts` opening raw v1 connection to capture verified `.fls.json` backup envelopes in a dedicated `FieldLearningStudioBackupDB` before opening the main database at version 2.
  - Upgrade is safely aborted if backup envelope serialization or verification fails, leaving `FieldLearningStudioDB` untouched at version 1.
- **Pure Centralized Write Normalization**:
  - Implemented `src/lib/storage/normalization.ts` providing pure, idempotent normalizers for all 7 entity types before persistence via `studyStore`.
  - Guarantees required metadata (`audit`, `materialCategory`, `reviewStatus`, `lineageStatus`, `linkedFindingIds`, `linkedLessonIds`) on every write without depending on individual UI callers.
- **Epistemic Classification & Dynamic Triangulation**:
  - Implemented explicit `MaterialCategory` (`primary_evidence`, `secondary_evidence`, `supervisory_interpretation`, `legacy_unclassified`).
  - Supervisory debriefs explicitly classified as `supervisory_interpretation` and excluded from `independentSourceCount`.
  - Unclassified legacy materials assigned `legacy_unclassified`, surfacing methodological independence-classification warnings without silently fabricating independence.
  - Implemented pure runtime calculation in `src/lib/analytics/triangulation.ts` and `supportProfile.ts` with zero persisted deterministic scores.
  - Single-source findings remain validatable when accompanied by explicit recorded human limitation caveats.
- **Lineage Foundation & Dual-Write Invariant**:
  - Extended `LessonLearned` and `GoodPractice` with `linkedFindingIds: FindingId[]` and `lineageStatus: "legacy_unresolved" | "resolved"`.
  - Extended `Recommendation` with `linkedFindingIds: FindingId[]` and `linkedLessonIds: LessonId[]`.
  - Enforced dual-write compatibility invariant: `linkedFindingId = linkedFindingIds[0] ?? linkedFindingId ?? undefined`, keeping existing production readers and the `by_finding` index operational.
- **Source File Storage Abstraction**:
  - Implemented `src/lib/storage/sourceFileRepository.ts` separating lightweight metadata from heavy blob/text content, complete with storage quota estimation and threshold warnings.
- **Demo Case Data Updates**:
  - Updated `communityBridgesCase.ts`, `nutritionFieldCase.ts`, and `demoStudyAdapter.ts` with neutral audit personas (`system:demo-seed`, `evaluator-1`) and fully populated lineage fields.
- **Test Suites & Verification**:
  - Added 13 new unit and integration tests across `tests/indexedDbMigrationV2.test.ts`, `tests/lineageGraph.test.ts`, and `tests/triangulationRules.test.ts` with synthetic fixture `tests/fixtures/sanitizedV1Database.ts`.
  - All 217 unit and integration tests passing across 22 test files.
  - TypeScript clean (`tsc --noEmit` exits 0), ESLint clean (0 errors, 0 warnings), Next.js Turbopack build clean.

## v1.1.0 - Day / Night Theme System Release

- **Dual-Theme Design System**:
  - Implemented an intentional, editorial **Day Theme** (`[data-theme="day"]`) designed specifically for long analytical sessions (warm paper canvas `#f6f8fa`, crisp card surface `#ffffff`, high-contrast text `#0f172a`, deep editorial blue accent `#2563eb`, analytical cyan-blue trace `#0284c7`).
  - Preserved the official **Night Theme** (`[data-theme="night"]` and default `:root`) with 100% visual fidelity compared to production baseline.
  - Fully semantic CSS token architecture in `globals.css` (`--background`, `--surface`, `--surface-muted`, `--surface-elevated`, `--surface-selected`, `--border`, `--border-strong`, `--accent`, `--accent-strong`, `--trace`, `--trace-ink`, `--warning-*`, `--success-*`, `--danger-*`, `--document-*`).
- **Zero Flash & Zero Hydration Warnings**:
  - Synchronous inline script in `src/app/layout.tsx` `<head>` sets `data-theme` attribute before DOM painting begins, preventing any theme flash.
  - Accessible `ThemeSwitcher.tsx` with Sun/Moon SVGs using `useSyncExternalStore` for flicker-free React 19 hydration and multi-tab/cross-component synchronization.
  - Persistent preference in `localStorage.getItem('fls_theme')` with automatic fallback to `prefers-color-scheme`.
- **Theme-Synchronized Screenshots**:
  - Generated and paired 1440×900 Day screenshots (`study-day.png`, `field_material-day.png`, `analysis-day.png`, `deliverables-day.png`, `final_draft_preview-day.png`) in `public/screenshots/`.
  - Configured `LandingPage.tsx` with `.dark-image` and `.light-image` classes to automatically display theme-matching workspace screenshots.
- **Verification & Quality Gates**:
  - All 204 Vitest unit and integration tests passing.
  - TypeScript clean, ESLint clean, Next.js Turbopack production build clean.
  - Automated 7-stage headless Chrome CDP browser audit passed with 0 console errors and 0 hydration warnings.

## v1.0.0 - Unified Production Release: Public Landing Page + DOCX Field Intake + Studio Workspace

- **Production Integration**:
  - Merged `feature/docx-field-intake` and `feature/public-landing-page` onto `main` (commit `c145dad`).
  - Released live to permanent production URL: `https://field-learning-studio.vercel.app`.
  - Tagged production release: `v1.0-public-pilot`.
- **Public-Facing Landing Page (`/` and `/welcome`)**:
  - Methodology-first public narrative communicating value to evaluators, MEL teams, consultancies, and NGOs.
  - Interactive 4-space workflow stepper, unbroken traceability lineage demonstration (`SRC-001` → Draft), human judgment comparison matrix, trust & privacy principles ("Study data stored locally in browser · 100% Client-Side Processing · No Account Required").
- **Client-Side DOCX Field Intake Engine**:
  - Integrated `mammoth.js` for zero-server, 100% client-side Word `.docx` parsing.
  - Automatic extraction of source metadata and candidate observation segments.
  - Candidate Review Table (`CandidateReviewTable.tsx`) with Accept / Edit / Skip controls.
  - Atomic batch commit to IndexedDB generating sequential `SRC-***` and `EV-***` IDs in Draft status.
  - Seamless continuation into the existing 4-space analytical workflow (Field Material → Analysis → Deliverables).
- **Studio Analytical Workspace (`/studio`)**:
  - Full IndexedDB-backed workspace mounted at `/studio` with zero state leakage or session degradation.
  - Complete MEP-01 claim boundary protection and MEP-02 storage safety invariants preserved.
- **Verification & Quality Gates**:
  - **204/204** Vitest unit & integration tests passing across 19 test files.
  - TypeScript clean (`tsc --noEmit` exits 0), ESLint clean (0 errors, 0 warnings), Next.js Turbopack build clean.
  - Headless Chrome CDP production smoke test passing on live production URL: 0 console errors, 0 network failures, mobile 390px zero overflow.

## v0.9.3 - Premium Public Landing Page & Studio Routing

- **Public-Facing Landing Page (`src/components/landing/LandingPage.tsx`)**:
  - Implemented high-authority, methodology-first landing page communicating value to evaluators, MEL teams, consultancies, and NGOs (Partage, F3E, Annick, donor-facing teams).
  - Headline transformation: "From field material to a defensible professional draft."
  - 11 structured narrative sections: Navigation with logo & direct Studio CTA, Hero with framed active workspace viewport, The Real Problem, 4-Space Sequential Stepper with synchronized descriptions & real screenshots, Traceability Diagram (unbroken lineage from SRC-001 to Brief Draft), Human Judgment vs FLS Matrix, Field Material Word/DOCX Intake, Analytical Workbench Comparative Matrix, Editorial Deliverables & Export, Trust & Methodological Principles, Who It Is For, and Final Clearance CTA & Footer.
- **Routing Architecture**:
  - Root route `/` renders public `LandingPage`.
  - `/studio` mounts `FieldLearningStudioApp` with `communityBridgesCase` and full IndexedDB workspace.
  - `/welcome` provides an explicit landing page alias.
  - Core workspace logic, storage keys, and MEP-01/02 boundaries remain 100% untouched.
- **Responsive & Visual Verification**:
  - Verified across 1440×900, 1280×800, 1024×768, and 390×844 viewports with zero horizontal overflow.
  - All 191 Vitest tests pass across 17 test files.
  - TypeScript clean, ESLint clean, Next.js Turbopack build clean.

## v0.9.2 - Final UI/UX Integration Pass

- **Compact Workspace Architecture & Above-the-Fold Elevation**:
  - Tightened application header bar to 48px, demo notice to 24px, and practitioner space tabs to 42px. Total header footprint reduced to ~93px, elevating primary workspace content to ~260–300px from top on standard 1440×900 viewports.
  - Implemented `.fls-study-overview` featuring a compact Continue Work row (`.fls-resume-row`), a 4-metric horizontal study inventory strip (`.fls-inventory-strip`), a balanced 2-column scope and limitations panel (`.fls-study-context`), and collapsible demo guide (`<details className="fls-details fls-demo-guide">`).
- **Accessible Native Workspace Dialogs**:
  - Authored `WorkspaceDialog.tsx` utilizing standards-compliant HTML5 `<dialog>` with focus trap, backdrop styling, Escape key handling, and focus restoration to the trigger element.
  - Migrated `MinimalStudyModal` and `FindingAuthoringModal` to use `WorkspaceDialog`.
- **Docked Intake & Field Material**:
  - Implemented 2-column intake layout (`.fls-intake-grid`) with docked reading pane, source history (`aria-pressed`), and observation extraction form.
  - Styled compact evidence card grid (`.fls-review-grid`) with semantic left-border interpretation styling.
- **Analysis Grid & Synthesis**:
  - Implemented two-column analysis workbench (`.fls-analysis-grid`) with study question selector toolbar, comparative matrix, missing coverage warning summary, and draft finding authoring.
- **Deliverables Canvas**:
  - Implemented centered quiet document preview canvas (`.fls-draft-canvas`) and compact export toolbar (`.fls-export-toolbar`).
- **Visible Demo Inconsistency Resolved**:
  - Fixed `computeNextAction` logic (`validationStatus === "Draft" || validationStatus === "Needs Review"`). When all evidence is approved, the study displays "Review Professional Draft →" matching the inventory strip ("20 approved"), removing the prior "3 awaiting review" conflict.
- **Responsiveness**:
  - Verified across 1440×900, 1280×800, and 1024×768 with clean typography, no horizontal scroll, and zero layout overflow. All 191 tests passing, TypeScript clean, ESLint clean, Next.js build clean.

## v0.9.1 - Presentation-Ready Execution Sprint

- **Stage 1 — Real Browser MEP-01 Acceptance**:
  - Successfully verified complete claim boundary against live preview via headless Chrome CDP: initial chain eligibility, substantive invalidation cascade, wrong-order approval block, deliberate re-review restoration, and source deletion block.
- **Stage 2 — Minimum MEP-02 Storage Safety Boundary**:
  - Enforced duplicate ID rejection across batch operations and backup imports.
  - Enforced strict referential checks rejecting broken parent relations and cross-study contamination.
  - Added collision detection in `studyStore.ts` preventing silent overwrite of existing records on creation.
  - Added 15 new automated regression tests in `tests/mep02SafetyBoundary.test.ts`. Total test suite: 191 tests passing across 17 test files.
- **Stage 3 — Presentation-Critical UX**:
  - Replaced 10-tab navigation with **4 Practitioner Spaces**: **1. Study**, **2. Field Material**, **3. Analysis**, **4. Deliverables** with clean sub-navigation.
  - Prominent "Resume Work / Next Action" hero card on Study Home with direct one-click navigation to where the user left off.
  - Study Scope, Context, Governance, and Data Recovery card on Study Home.
  - Frictionless observation capture: optional primary theme (defaults to `Uncategorized`) and blank interpretations allowed.
  - Retired arbitrary headline tier badges in Finding authoring in favor of factual **Evidence Coverage & Limitations** (sources, methods, sites, stakeholders, challenging evidence).
  - Streamlined Recommendation authoring with progressive disclosure for implementation parameters.

## v0.9.0-mep01 - Formal Claim Boundary & Export Parity Closure

- **Formal Claim Eligibility & Export Parity**:
  - Implemented unified canonical formal eligibility contract in `src/lib/exportPolicy.ts` (`isFindingExportEligible`, `isRecommendationExportEligible`, `isLessonExportEligible`, `isGoodPracticeExportEligible`).
  - Refactored `StyledBriefPreview` in `src/components/FieldLearningStudioApp.tsx` to derive directly from `buildBriefExportModel`, establishing 100% parity across Styled Brief Preview, Copy Markdown, Download Markdown, DOCX, and PDF.
- **Finding Approval Prerequisite Guard**:
  - Hardened `validateArtifact` in `src/lib/validation/validationLifecycle.ts` to block wrong-order approvals when supporting evidence is in `Draft` or `Needs Review`, has active stale warnings, or is missing.
- **Bi-directional Invalidation Cascading**:
  - Extended `cascadeEvidenceInvalidationToFindings` in `src/lib/storage/integrity.ts` to cascade invalidation when either supporting evidence or challenging/contradictory evidence is substantively modified.
- **Parent Deletion Guard**:
  - Enforced deletion guard in `src/lib/storage/studyStore.ts` preventing deletion of Source records that have active dependent Evidence records.
- **Batch Mutation Lifecycle Equivalence**:
  - Updated `saveEvidenceBatch`, `bulkAssignEvidenceTheme`, and `bulkAssignEvidenceToQuestion` in `src/lib/storage/studyStore.ts` to detect substantive changes on validated evidence and run the invalidation cascade.
- **Deliberate Review Semantics**:
  - Enforced that re-reviewing an evidence item clears evidence-level alerts but leaves dependent findings in `Needs Review` until an analyst deliberately re-reviews and approves the finding.
- **Legacy Demo Compatibility Isolation**:
  - Isolated the legacy demo adapter to ensure demo compatibility policies never validate editable live-study artifacts.
- **Regression Test Suites**:
  - Added `tests/mep01ClaimBoundaryReproduction.test.ts` (6 tests reproducing audit defects) and `tests/claimBoundary.test.ts` (14 comprehensive regression tests covering all 11 invariant areas). All 176 tests passing.

## v0.9.0-audit-resolution - Evidence Integrity & Recovery Stabilization

- **Cross-Study Referential Integrity & Isolation**:
  - Implemented `assertEvidenceSourceIntegrity`, `assertFindingEvidenceIntegrity`, and `assertRecommendationFindingIntegrity` in `src/lib/storage/integrity.ts`.
  - Enforced repository-level foreign-key rejection preventing observations, findings, and recommendations from referencing entities from other studies.
- **Strict Export Parity & Boundary Enforcement**:
  - Centralized export eligibility logic in `src/lib/exportPolicy.ts`.
  - Updated `buildBriefExportModel.ts` and `generateMarkdownFromModel.ts` to guarantee that unvalidated artifacts (Draft, Needs Review, Rejected) and recommendations linked to unvalidated findings are strictly excluded from preview models, Markdown export, and document downloads.
- **Stale Dependency Propagation**:
  - Enforced that substantive edits to validated findings revert validation status to `Needs Review`, increment revision count, and log to `invalidationHistory`.
  - Downstream recommendations immediately display dependency warning banners and become ineligible for export until human revalidation of the parent finding.
- **Support Profile Hardening & Context Realism**:
  - Hardened `computeSupportProfile` to exclude rejected evidence entries and foreign sources.
  - Added full support for single-site study scopes, satisfying site coverage without penalizing single-site studies.
  - Robust placeholder detection preventing default phrases ("None documented", etc.) from being counted as substantive contradictions.
- **Forensic Backup Archive Inspection & Collision Management**:
  - Deep structural validation of `.fls.json` backup envelopes in `inspectStudyBackup`, enforcing required entity schemas and referential integrity.
  - Implemented `import_as_new` re-keying and `overwrite` collision resolution strategies.
- **Cleansed Synthetic Defaults**:
  - Removed manufactured placeholder text from `FindingAuthoringModal.tsx` and `OptionalOutputsModal.tsx`.
- **Restored QA Baseline Truth**:
  - Restored requirement in `src/lib/qa.ts` that sandbox-generated evidence must be reviewed before donor-facing use.
- **UX Simplification Blueprint**:
  - Created `docs/ux_simplification_blueprint.md` detailing the 4-Space Architecture (Study, Field Material, Analysis, Deliverables), terminology normalization, and modal reduction roadmap.
- **Regression Suite**:
  - Added dedicated test suite in `tests/integrityAudit.test.ts`. Total test suite: 156 passing tests across 14 test files.

## v0.9.0-phase7 - Bulk Intake & Structured Import

- Implemented **Route A: Batch Observation Builder**:
  - Direct narrative-to-observation extraction workspace in `BatchObservationBuilder.tsx` accessible from active source reader in Field Intake.
  - Deterministic segmentation helper in `src/lib/intake/segmentationHelper.ts` (`splitNarrativeIntoSegments`) supporting paragraphs, bullets (`-`, `*`, `•`, `1.`), and nested combinations.
  - Text highlight capture directly appending selected phrases into observation rows.
  - Compact review table with inline text editing of `Raw Observation` and `Analytical Meaning / Interpretation`.
  - Bulk action toolbar for setting Primary Theme, Observation Reliability (`High`, `Medium`, `Low`), and row deletion.
  - Atomic batch save via `saveEvidenceBatch` generating sequential non-colliding `EV-***` IDs and setting `validationStatus = "Draft"`, `revision = 1`.
- Implemented **Route B: Multi-Source Structured Paste**:
  - `BulkSourceModal.tsx` parsing multi-source notes separated by `---` blocks in `src/lib/intake/structuredTextParser.ts`.
  - Case-insensitive extraction of standard headers: `Title`, `Date`, `Site`, `Stakeholder`, `Method`, `Consent`, `Anonymization`, `Sensitivity`, and `Notes`.
  - Conservative ethics defaults: `Restricted / Unclear` consent and `Identifiable / Restricted` anonymization when omitted.
  - Narrative heuristic safety scanner reporting clean status or flagging sensitive patterns.
  - Planned study scope mismatch detector alerting on new sites or stakeholder groups with options to formally expand study scope or import as out-of-scope fieldwork.
  - Deterministic duplicate detector in `src/lib/intake/duplicateDetector.ts` flagging duplicates by Title + Date or $\ge 40$ character normalized narrative match.
  - Import receipt displaying created, skipped, and warning tallies.
- Implemented **Route C: Tabular CSV / TSV Import**:
  - Native, zero-dependency RFC 4180 parser in `src/lib/intake/csvParser.ts` (`parseCsvOrTsv`) with delimiter auto-detection (`,`, `\t`, `;`), quoted strings, multiline cells, and escaped quotes.
  - Smart column mapping suggester (`suggestColumnMappings`) with interactive dropdown selectors for incoming headers.
  - Direct file upload or clipboard text paste.
  - Conversion to candidate sources and reconciliation through preview and scope decision grid.
- Enforced **Architectural Invariants & Provenance Integrity**:
  - Strict provenance model: `Source -> candidate observations -> reviewed Evidence`.
  - Every observation created begins as `Draft` (Rev 1) and never alters validated findings until human review.
  - Triangulation invariant: multiple observations derived from a single source represent exactly one independent source in analytical support profiles (`computeSupportProfile`).
- Added comprehensive technical documentation in `docs/v0.9_bulk_intake_guide.md`.
- Added 20 Vitest unit and integration tests in `tests/bulkIntake.test.ts`. Total test suite: 146 passing tests across 13 test files.
- Completed 7-step browser acceptance audit via CDP in headless Chrome across 11 screenshots.

## v0.9.0-phase6 - Study Framework + Synthesis Workbench

- Implemented **Study Framework & Analytical Spine**:
  - Defined `StudyQuestion` model with DAC evaluation criteria (`Relevance`, `Coherence`, `Effectiveness`, `Efficiency`, `Impact`, `Sustainability`, `Cross-Cutting`).
  - Added interactive `StudyQuestionSelector` with analytical spine pills, unassigned evidence filter counter, and question management modals.
  - Linked evidence entries to study questions via `studyQuestionIds` in IndexedDB with referential integrity on question deletion.
- Implemented **Multi-dimensional Synthesis Comparison View** (`SynthesisComparisonView`):
  - Five comparative grouping modes: **Site**, **Stakeholder**, **Method**, **Theme**, and **Matrix** (cross-tabulation).
  - Common themes indicator across multiple sites.
  - Cross-tab matrix with coverage indicators and missing data alerts.
- Implemented **Working Patterns & Sensemaking Notes** (`WorkingPatternsPanel`):
  - Defined `PatternNote` model (`PAT-***`) with pattern statement, thematic tagging, counter-evidence/contradictions, and linked evidence items.
  - One-click promotion to draft finding pre-populating authoring modal.
- Implemented **Defensible Finding Authoring with Live Support Profiles**:
  - Integrated `computeSupportProfile()` into `FindingAuthoringModal` displaying real-time confidence tier (`Strongly Supported`, `Moderately Supported`, `Emerging / Needs Triangulation`, `Contradicted / Challenged`) and diagnostic flags.
  - Mandatory limitation notes enforced for `Emerging` claims and coverage gaps during authoring and human validation.
- Implemented **Decoupled Downstream Outputs & Recommendations**:
  - Replaced mandatory four-sequence pipeline (`Finding -> Lesson -> Good Practice -> Recommendation`) with flexible downstream outputs.
  - Added `RecommendationAuthoringModal` anchored directly in validated findings.
  - Configurable study output toggles (`enableRecommendations`, `enableLessonsLearned`, `enableGoodPractices`) via `StudyOutputConfig`.
  - Added `OptionalOutputsModal` for lessons learned and good practices.
- Implemented **Strict Dependency Invalidation & Re-validation Workflow**:
  - Substantive edit detector `isSubstantiveFindingChange` detecting changes to statement, explanation, implication, or evidence base.
  - Substantive edits to validated findings bump revision (`revision += 1`), revert status to `Needs Review`, and record audit history in `invalidationHistory`.
  - Downstream recommendations linked to unvalidated findings display amber warning banners (`⚠️ Linked Finding requires re-validation`) and are excluded from formal exports (`isRecommendationExportEligible`).
  - Human re-validation of parent finding automatically restores recommendation export eligibility.
- Extended **Traceability Drawer**:
  - Added dedicated inspectors for `RQ-***` and `PAT-***` records with assigned evidence chips and parent links.
- Updated **Export Boundaries**:
  - Export engine in `buildBriefExportModel.ts` strictly enforces validated-only export for findings, recommendations, lessons, and good practices in non-demo studies.
- Added comprehensive documentation in `docs/v0.9_synthesis_workbench_guide.md`.
- Added 19 Vitest unit and integration tests in `tests/synthesisWorkbench.test.ts`. Total test suite: 122 passing tests across 12 files.
- Completed 18-step browser acceptance audit via CDP in headless Chrome with 14 screenshots verified.

## v0.9.0-phase5 - Daily Field Debrief Studio

- Implemented dedicated **Daily Field Debrief Studio** situated between Evidence and Findings in the primary navigation:
  - Guided practitioner reflection across 7 key methodological questions: *What surprised us?*, *What patterns repeated?*, *What contradicted earlier information?*, *Which assumptions should we question?*, *Where might researcher bias be influencing interpretation?*, *Whose perspective is still missing?*, and *What hypotheses are emerging?*.
  - Multi-site support: debriefs support study-wide scope (`siteIds: []`) or multiple study sites simultaneously (`siteIds: string[]`), plus dynamic custom site addition.
  - Discrete tomorrow action priorities manager: add, inline edit, and remove discrete questions/tasks for tomorrow's field inquiries.
  - System evidence-gap signal: integrated read-only calibration signal from the Phase 2 gap detector displaying target stakeholder groups with zero recorded observations.
  - Field grounding: dedicated `RecordLinkSelector` for referencing today's Source records and Evidence observations with date-matching toggle and validation status badges.
- Enforced strict architectural boundaries and non-mutation invariants:
  - No `ValidationStatus` on `DailyDebrief` (internal methodological log, not donor claim).
  - Evidence non-mutation invariant: creating or editing debriefs never alters Evidence validation status, revisions, or contradiction IDs.
  - Contradiction independence: reflections in `contradictionsObserved` never write to `EvidenceEntry.contradictionIds`.
  - Hypothesis isolation: prominent amber `Boundary Guardrail` notice enforces that emerging hypotheses are working theories to focus fieldwork, never auto-promoted to findings.
  - Traceability Drawer integration: inspecting `DBR-*` suppresses the linear `TraceChain` claim lineage while displaying metadata, reflections, and linked records.
- Built modular Daily Debrief UI in `src/components/debrief/`:
  - `DebriefHistory`: reverse-chronological timeline, search/filtering, summary count badges, reflection snippet previews, and empty state with CTA.
  - `DebriefForm`: full reflection form with multi-site selection, attendees parser, priorities list, and link selector.
  - `RecordLinkSelector`: multi-tab selector for linking sources and observations with date matching filter.
  - `DebriefDetail`: comprehensive full view of reflections, checkable priorities list, and linked records with drawer triggers.
  - `DailyDebriefView`: tab-level coordinator managing list/create/edit/detail view transitions, cloning, and persistence.
- Enforced pristine demo case protection with `Create Editable Copy` cloning workflow.
- Updated `CaseSelector` active study persistence to preserve active study selection across page reloads.
- Created technical documentation in `docs/v0.9_daily_debrief_guide.md`.
- Added 12 new Vitest unit and storage integration tests in `tests/dailyDebrief.test.ts`. Total test suite: 103 passing tests across 11 files.
- Completed 11-step browser acceptance audit via CDP in headless Chrome covering study creation, note intake, debrief recording, editing, detail view, traceability drawer suppression, page reload persistence, invariant checks, and demo cloning with 10 screenshots captured.

## v0.9.0-phase4 - Editable Evidence Management & Human Validation Workflow

- Built pure validation lifecycle state machine in `src/lib/validation/validationLifecycle.ts`:
  - Lifecycle: `Draft` -> `Needs Review` -> `Validated` / `Rejected`.
  - Reopen rejected items: `Rejected` -> `Draft` (preserving rejection history).
  - Substantive edit handler: substantive changes to `Validated` evidence increment revision number (`revision = original.revision + 1`), preserve audit metadata (`lastValidatedAt`, `lastValidatedBy`), set `previousValidationStatus = "Validated"`, reset status to `Needs Review`, and require formal re-validation.
  - Deterministic substantive change detector `isSubstantiveEvidenceChange` comparing trimmed observation text, interpretation, themes, strength, sensitivity, stakeholder, and site.
- Corrected safeguarding acknowledgment text in `SourceCaptureForm.tsx` to: *"I have reviewed the warning and confirm I am authorized to save this information in this local study."*
- Built modular Evidence Review UI in `src/components/evidence/`:
  - `ValidationStatusBadge`: displays true validation status and revision.
  - `ReviewerIdentityBar`: records accountable evaluator identity with `localStorage` persistence under `fls_reviewer_name`.
  - `StatusFilterPills`: interactive status filter pills (`All`, `Draft`, `Needs Review`, `Validated`, `Rejected`) with live dynamic counts.
  - `EvidenceCard`: renders validation badge, revision indicator, re-validation warning banner, validated attribution banner, rejection rationale banner, provenance, analytical interpretation, and contextual action controls.
  - `EvidenceEditModal`: keyed modal with explicit amber re-validation warning when editing validated evidence.
  - `EvidenceRejectModal`: keyed modal requiring non-empty methodological rationale.
  - `EvidenceReviewWorkspace`: integrated tab workspace connecting state machine, filters, reviewer identity, and IndexedDB persistence.
- Enforced read-only protection for pristine demo cases (`community-bridges`, `school-nutrition`), rendering "Demo Reference" badges and suppressing review/edit actions.
- Added 19 unit and persistence round-trip tests in `tests/validationLifecycle.test.ts`. Total test suite: 91 passing tests across 10 files.
- Completed 14-step browser acceptance audit via CDP in headless Chrome covering Scenarios A through F with all screenshots captured.

## v0.9.0-phase3 - Field Intake Studio

- Replaced single-note sandbox mockup with persistent, local-first **Field Intake Studio**:
  - Narrative capture with full provenance metadata (date, site, stakeholder group, collection method, collector name, consent status, anonymization status, sensitivity flag).
  - Direct atomic persistence to IndexedDB (`studyStore.saveSource`).
- Implemented safe human-readable ID generation in `src/lib/idGenerator.ts`:
  - Deterministically extracts maximum numerical suffixes (`^PREFIX-(\d+)$` -> `maxNum + 1`) to guarantee collision-free IDs across deletions and sparse imports.
  - Generates `SRC-001`, `EV-001`, `FND-001`, `LES-001`, `GP-001`, `REC-001`, `DBR-001`.
- Enhanced narrative safety & PII scanner in `src/lib/sandboxParser.ts`:
  - `scanNarrativeSafety` returns structured warning details for phone numbers, email addresses, exact dates, names, and high-sensitivity safeguarding terms.
  - Displays *"No automated warning detected"* when clean (never claims "Safe" or "Anonymized").
  - Enforces explicit practitioner confirmation checkbox before allowing intake if heuristic warnings trigger.
- Implemented `ObservationCaptureForm`:
  - Links directly to the active source record.
  - Supports rapid text selection from narrative box.
  - Strictly separates raw observations (what was seen/heard) from analytical interpretations (what it might mean).
  - Initializes observations with `validationStatus: "Draft"`, `revision: 1`. Does not auto-generate findings.
- Implemented `SourceHistory` drawer:
  - Lists all captured sources with extracted observation counts and sensitivity badges.
  - Allows one-click switching of active source for further observation extraction.
- Implemented `MinimalStudyModal` and updated `CaseSelector`:
  - Enables creating blank editable local studies with target sites, stakeholder groups, and collection methods.
  - Displays local editable studies in the main case selector alongside pristine demo templates.
  - Displays one-click cloning prompt when viewing read-only demo templates.
- Added comprehensive documentation in `docs/v0.9_field_intake_guide.md`.
- Added 12 new Vitest unit and integration tests across `tests/idGenerator.test.ts` (7 tests) and `tests/fieldIntake.test.ts` (5 tests). Total test suite: 72 passing tests across 9 files.

## v0.9.0-phase2 - Evidence Support Profile & Gap Detection Engine

- Implemented pure analytical module `src/lib/analytics/supportProfile.ts`:
  - Enforced strict Source Independence Rule: multiple evidence citations from the same source count as 1 independent source.
  - Implemented study-aware scope calibration: single-site studies are not penalized for lack of cross-site evidence; multi-site studies track geographic concentration.
  - Implemented stakeholder-specific claim handling: claims targeted at specific stakeholder groups evaluate target representation without requiring artificial non-target diversity.
  - Enforced contradiction state tracking: unresolved contradictory evidence prevents findings from achieving `Strongly Supported` and downgrades them to `Emerging`.
  - Implemented 3 explainable support tiers: `Strongly Supported`, `Partially Supported`, and `Emerging`.
  - Generated factual, deterministic transparency flags for source counts, method diversity, stakeholder coverage, site distribution, and contradiction status.
- Implemented pure gap detection engine `src/lib/analytics/gapDetector.ts`:
  - 6 explicit gap types: `InsufficientCoverage`, `SingleSourceDependency`, `MethodConcentration`, `MissingStakeholder`, `MissingSite`, and `UnresolvedContradiction`.
  - Calibrated severities (`Info`, `Needs Attention`, `Critical`) and actionable remediation guidance.
  - Added finding-level and study-level scope gap scanners.
- Documented analytical architecture in `docs/v0.9_evidence_support_model.md`.
- Added 17 unit tests in `tests/supportProfile.test.ts` and `tests/gapDetector.test.ts` covering Cases A through H. Total test suite: 60 passing tests across 7 files.

## v0.9.0-phase1 - Domain Model & Normalized IndexedDB Persistence Foundation

- Implemented normalized local-first IndexedDB persistence using `idb` (`FieldLearningStudioDB` v1) with 8 stores (`studies`, `sources`, `evidence`, `debriefs`, `findings`, `lessons`, `goodPractices`, `recommendations`).
- Implemented compound primary keys `[studyId, id]` across all child stores to ensure human-readable entity IDs (e.g. `EV-001`, `SRC-001`) remain isolated per study without collisions.
- Extended domain model in `src/lib/types.ts`: `StudyMeta`, `ValidationStatus` (`Draft` -> `Needs Review` -> `Validated` / `Rejected`), `ConsentStatus`, `AnonymizationStatus`, `CollectionMethod`, `DailyDebrief` supporting multi-site `siteIds`, `rejectionReason`, `revision`, `lastValidatedAt`, and `FieldStudy` projection.
- Implemented typed repository operations in `src/lib/storage/studyStore.ts` including CRUD for all entities, `assembleStudy` non-authoritative projection, and atomic whole-study transactions.
- Implemented Option A demo template strategy: `bootstrapDemoTemplates` seeds pristine fixtures idempotently with deletion guards, while `cloneDemoStudy` produces editable copies with new unique study IDs.
- Implemented portable `.fls.json` unencrypted backup export and atomic multi-strategy import (`reject_collision`, `overwrite`, `import_as_new`) with strict runtime schema validation.
- Created bidirectional compatibility adapter between `DemoCase` and `FieldStudy` in `src/lib/storage/demoStudyAdapter.ts`.
- Created comprehensive storage test suite with 16 tests in `tests/storage.test.ts` using `fake-indexeddb`. Total test suite: 43 passing tests across 5 test files.


- Added v0.8 local-only field note intake workflow with sandbox draft evidence and optional export inclusion.
- Added deterministic local safety warning checks for possible identifying or sensitive details before draft generation.
- Displayed sandbox evidence, findings, and recommendations in separate local-only draft sections rather than mixing them with validated demo content.
- Kept sandbox drafts excluded from Word, PDF, and Markdown exports by default; optional inclusion now uses a separate "Sandbox Draft Evidence — Requires Review" section.
- Preserved no-backend, no-upload, no-database, no-localStorage, and no-external-AI constraints.

## v0.7.0 - Word, PDF, and Markdown Brief Export Pack

- Added v0.7 export pack with Word, PDF, and Markdown brief downloads.
- Implemented a shared export model builder (`src/lib/buildBriefExportModel.ts`) to maintain content parity and avoid data drift.
- Created local Word (`.docx`) file generator utilizing `docx` library with professional margins, clear typography, and a structured metadata table.
- Created local PDF (`.pdf`) document generator with `@react-pdf/renderer` using Helvetica typeface, margins, metadata rows, and structured annex details.
- Wrapped PDF generation in client-side lazy-import hooks to bypass Next.js server-side rendering (SSR) hydration warnings and preserve quick compilation times.
- Redesigned the final Action Bar on the Brief tab into an "Export Brief Deliverable" control panel containing primary Word download, secondary PDF, tertiary Markdown, and transparent Copy buttons.
- Integrated dynamic safety and review disclaimer notes across all three document layouts based on the active case switcher.
- Validation: `npm run lint` and `npm run build` passed with zero errors.

## v0.6.0 - Blue Command Workbench Refinement

- Refined v0.5 dark workbench into v0.6 blue-slate command workspace with calmer color roles, improved traceability emphasis, and stronger premium visual hierarchy.
- Created `docs/v0.6_blue_command_workbench_refinement.md` before coding to document the visual assessment, blue-slate direction, color system, typography, component plan, traceability plan, screen-specific plan, exclusions, and validation checklist.
- Updated runtime and documented design tokens from green-black/teal to blue-black/slate with primary blue actions, cyan traceability, amber safety notes, red warnings, and green reserved for pass/completion states.
- Reworked `TraceChain` into larger labeled source-to-brief lineage nodes and connected overview/sandbox trace paths to the drawer interaction.
- Tuned the hero, case selector, overview panels, evidence cards, findings, lessons, recommendations, QA review, and brief preview for calmer executive scannability while preserving static demo data and Markdown export.
- Validation: `npm run lint` and `npm run build` passed locally.

## v0.5.0 - Dark Impeccable Workbench Redesign

- Added v0.5 dark workbench redesign using Impeccable shape/layout/typeset/colorize/distill/delight/harden workflow.
- Created `docs/v0.5_dark_workbench_shape.md` before coding to define the premium evidence command room direction.
- Reworked the app shell, header, case selector, tabs, cards, drawer, QA gate, and brief preview around a restrained dark visual system.
- Removed quote-like styling from sanitized evidence observations and added an observation -> interpretation -> linked finding structure.
- Replaced the recommendations three-column layout with stacked priority sections and stabilized Lessons/Good Practices layout.
- Preserved static demo data, local-only sandbox behavior, Markdown export, and no-auth/no-db/no-upload/no-backend constraints.

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
