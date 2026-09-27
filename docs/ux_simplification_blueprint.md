# UX Simplification Blueprint: Field Learning Studio v1.0

## Executive Summary

Field Learning Studio has evolved rapidly through Phases 1 through 7, expanding from a static demo viewer into a rigorous, local-first qualitative synthesis and evidence-governance platform. While this rapid development established robust underlying data integrity, compound-key isolation, and rigorous validation lifecycles, it introduced cognitive fragmentation: the application grew to 10 top-level navigation tabs, extensive modal dialogs, and developer-centric terminology (such as "Dependency Invalidation" and raw compound keys).

This blueprint outlines the target information architecture, workflow simplification, and terminology normalization for Field Learning Studio v1.0. It defines an intuitive, practitioner-aligned **4-Space Architecture** that preserves 100% of the underlying relational integrity and IndexedDB domain schemas while eliminating unnecessary UI clutter and cognitive friction.

---

## 1. Information Architecture: The 4-Space Model

The current 10 tabs (`Overview`, `Field Material`, `Daily Debrief`, `Evidence`, `Working Patterns`, `Synthesis Workbench`, `QA Review`, `Export`, `Traceability`, `Gap Analysis`) are consolidated into **four primary conceptual spaces** that mirror the natural progression of an evaluation mission:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FIELD LEARNING STUDIO (v1.0)                         │
├───────────────┬────────────────────┬───────────────────┬────────────────────┤
│ 1. Study      │ 2. Field Material  │ 3. Analysis       │ 4. Deliverables    │
│ (Framework)   │ (Sources & Obs)    │ (Debrief & Sense) │ (Brief & Output)   │
└───────────────┴────────────────────┴───────────────────┴────────────────────┘
```

### Space 1: Study (Framework & Resumable Home)
* **Purpose**: Establish evaluation scope, manage study lifecycle, configure questions, and provide a resumable operational cockpit.
* **Sub-views / Sections**:
  1. **Study Overview & Resume Card**: Current progress bar (e.g. "12 sources documented, 48 observations captured, 6 findings validated"), recent activity log, and one-click "Resume where you left off".
  2. **Framework & Questions**: Evaluation questions (OECD-DAC / custom criteria) and study boundaries (target sites, stakeholder groups, methods).
  3. **Study Administration**: Local backup (`.fls.json`), restore, study cloning, and safety/PII settings.
* **Replaces**: The sprawling legacy `Overview` tab and isolated study settings modals.

### Space 2: Field Material (Intake & Raw Evidence)
* **Purpose**: Primary intake and organization of raw fieldwork records without premature synthesis.
* **Sub-views / Sections**:
  1. **Source Ledger**: Filterable table of KIIs, FGDs, observations, and documents with collection metadata, consent status, and anonymization level.
  2. **Observation Workbench**: Split pane or inline list viewing observations linked to selected sources.
  3. **Bulk Intake Drawer**: Non-blocking slide-out drawer supporting structured note parsing and tabular CSV/TSV ingestion with intelligent column mapping and candidate review.
* **Core Principle**: Field evaluators can capture verbatim notes without being forced into immediate interpretation, coding, or thematic tagging during intake.

### Space 3: Analysis (Debriefs, Patterns & Findings)
* **Purpose**: Sensemaking, qualitative triangulation, and rigorous synthesis.
* **Sub-views / Sections**:
  1. **Daily Debrief Memory**: Chronological, dated field reflections ("What surprised us", "Contradictions observed", "Shaken assumptions", "Tomorrow's priorities"). Serves as dated analytical memory linked to field materials.
  2. **Pattern Scratchpad (Optional)**: Lightweight thematic grouping and hypothesis testing (`PAT-xxx`) for working through emerging observations before committing to formal findings.
  3. **Finding Workbench**: Rigorous finding synthesis with automated Support Profiles (method diversity, site triangulation, stakeholder coverage), contradiction audit, limitation documentation, and QA review flags.
* **Core Principle**: Debriefs and patterns inform findings without automated overreach; human evaluators retain full ownership of causal conclusions.

### Space 4: Deliverables (Recommendations, Lessons & Export)
* **Purpose**: Translation of validated findings into actionable programme guidance and donor-ready deliverables.
* **Sub-views / Sections**:
  1. **Action Formulation**: Authoring Recommendations, Lessons Learned, and Good Practices explicitly anchored to validated parent findings.
  2. **Traceability Matrix**: Visual end-to-end evidence chains (`Source -> Observation -> Finding -> Recommendation`) with gap detection and orphaned-artifact alerts.
  3. **Export & Publishing Desk**: Single source of truth export engine providing real-time live preview, Markdown copy, and branded PDF generation with strict validation filtering (only validated items pass).
* **Core Principle**: Separation between exploratory synthesis and external deliverables ensures no draft hypothesis leaks into donor briefs.

---

## 2. Consolidating Analytical Memory (Daily Debrief)

In the legacy design, `Daily Debrief` sat as an isolated top-level tab separate from the synthesis workbench. In the v1.0 architecture:
* **Dated Analytical Memory**: Debriefs are integrated directly into the `Analysis` space as dated analytical milestones.
* **Non-Mutating Pre-Synthesis**: Debrief reflections (e.g. notes recorded in "Contradictions Observed") are treated as qualitative context and evaluative commentary. They do not silently populate `contradictionIds` on raw observations or force premature classification.
* **Evidence Linking**: Evaluators can link debrief notes to specific sources and observations from that day's fieldwork, creating an audit trail of how field insights evolved over the mission calendar.

---

## 3. Progressive Disclosure & Terminology Normalization

Field Learning Studio is designed for evaluators, humanitarian consultants, and research leads—not database administrators. All developer-centric jargon and cognitive friction points are replaced with natural evaluation terminology:

| Legacy Developer Concept | Professional Evaluator Term | UI Behavior / Presentation |
| :--- | :--- | :--- |
| **"Dependency Invalidation"** | **"Supporting Evidence Revised"** | Clear, actionable banner: *"The finding supporting this recommendation was edited. Please review and re-confirm."* |
| **"Foreign Key Violation"** | **"Source Belongs to Another Study"** | Human-readable validation error explaining that records cannot be cross-referenced between separate studies. |
| **"Compound Key (`study::EV-001`)"** | **"Evidence ID: `EV-001`"** | The study namespace is kept entirely internal in IndexedDB; the UI displays clean, short identifiers. |
| **"Revision 3 (Draft)"** | **"Draft (v3)"** | Revisions are tucked into an info tooltip or metadata panel, keeping the primary card header focused on the statement. |
| **"Support Tier: Emerging"** | **"Evidence Coverage: Preliminary"** | Avoids sounding like a statistical algorithm; clearly indicates that more triangulating sources/sites are required. |
| **"Orphaned Artifact"** | **"Unlinked Recommendation"** | Clear guidance that the recommendation requires a parent finding to be export-eligible. |

---

## 4. Modal Reduction & Non-Blocking Drawer Architecture

The current interface relies heavily on modal dialogs for finding authoring, bulk intake, backup/restore, and optional outputs. In v1.0, modals are replaced with modern non-blocking UI patterns:

1. **Contextual Slide-Out Drawers**:
   - Bulk source import and structured text intake open in a right-hand slide-out drawer (600px width), allowing evaluators to reference existing sources on screen while importing.
   - Finding authoring and detail inspection use an expandable side panel rather than full-screen blocking modals.
2. **Inline Fast-Tagging**:
   - Observation theming and study question assignment can be performed directly within the Observation Workbench via keyboard shortcuts and inline dropdowns, avoiding multi-step dialog clicks.
3. **No Forced Interpretation at Intake**:
   - Evaluators importing raw field notes or tabular logs are never forced to supply interpretation, potential findings, or themes upfront. Uncategorized observations are stored cleanly as raw material and marked for later synthesis.

---

## 5. Separation of Demo Sandbox & Professional Field Workflows

To prevent confusion during professional engagements and client demonstrations:
* **Dedicated Demo Sandbox Space**: Demo cases (such as the *School Nutrition Governance Study*) are explicitly marked with an orange "Demo Template / Protected Sandbox" banner.
* **Immutable Demo Guarantee**: Demo studies cannot be inadvertently modified or overwritten by user edits; the UI provides a prominent "Clone to Editable Study" button for training exercises.
* **Sandbox Evidence Indicator**: Experimental or synthetic notes generated in sandbox experiments are watermarked with an amber badge and are excluded by default from formal donor brief exports unless explicitly enabled with a disclosure notice.

---

## 6. Persistence & Migration Roadmap

The 4-Space Architecture is purely a presentation-layer and interaction-layer refinement. It requires **zero destructive migrations** of the underlying IndexedDB schema:
* `studies` (StudyMeta, questions, scope) maps directly to **Space 1: Study**.
* `sources` and `evidence` map directly to **Space 2: Field Material**.
* `debriefs`, `patternNotes`, and `findings` map directly to **Space 3: Analysis**.
* `recommendations`, `lessons`, `goodPractices`, and export models map directly to **Space 4: Deliverables**.

This decoupling ensures that all existing studies, test suites, and integrity guarantees remain 100% intact as the user interface transitions to the simplified v1.0 layout.
