# Field Learning Studio

Field Learning Studio is a human-led, browser-local field learning synthesis app for MEL, evaluation, donor reporting, and programme learning teams.

It helps turn messy field evidence into a traceable workflow:

Raw field evidence -> source inventory -> evidence matrix -> findings -> lessons learned -> good practices -> recommendations -> QA review -> donor-ready learning brief.

## Current Stage

Phases 0–4 provide editable local studies and showcase cases, stored source files, evidence qualification, human findings/learning validation and draft exports. The pre-Phase 5 integrity closure is isolated on `feature/pre-phase5-integrity-closure` and requires independent targeted verification; it is not a deployed release. No AI generation is implemented.

- Published application: [Field Learning Studio](https://field-learning-studio.vercel.app/)
- Local current status: [Technical Status](TECHNICAL_STATUS.md)
- Storage schema: IndexedDB `DB_VERSION = 2`; no server database.

## Documentation

- [Demo & Validation Pack v0.1](docs/demo_validation_pack_v01.md)
- [Phase 2 Real Case Demo Plan](docs/phase_2_real_case_demo_plan.md)
- [Impeccable v0.3 UI Review](docs/impeccable_v0.3_ui_review.md)
- [v0.5 Dark Workbench Shape](docs/v0.5_dark_workbench_shape.md)
- [v0.6 Blue Command Workbench Refinement](docs/v0.6_blue_command_workbench_refinement.md)
- [v0.8 Local Note Intake Plan](docs/v0.8_local_note_intake_plan.md)

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
npm run lint
npm run build
npm test
npx tsc --noEmit --incremental false
```

## Local Use and Recovery Boundaries

- Showcase cases are read-only; clone them or create a study for editable local work.
- Evidence, source records and original imported files are stored in browser-local IndexedDB. There is no authentication, backend storage or collaboration service.
- DOCX, CSV/TSV and structured-note intake require human qualification. Missing method/date/consent/anonymization are not observed facts.
- Structured JSON backup excludes original source files. The file-inclusive archive includes study-owned file metadata, extracted text and binaries where stored. It cannot reconstruct originals that are missing. Archives are unencrypted and need appropriate handling.
- Findings and downstream professional drafts require current admissible evidence and reviewed parent findings. Deterministic checks do not replace human judgment or certify substantive agreement.
- Markdown, Word and PDF exports share one model. Unlinked summary/key-message text requires human grounding review.
- No external AI API calls; Vercel Analytics remains present. This is a local workbench, not a production SaaS.

## Core Workflow

1. Create a local study or clone a showcase case.
2. Define its questions, scope and framework; import field material and qualify observations.
3. Develop and review findings with supporting, challenging and qualifying relationships.
4. Create and review lessons, practices and recommendations from current findings.
5. Check Final Review, preview/download draft exports and retain a suitable recovery backup.

## Folder Structure

```text
src/app                 App Router route, layout, and global styles
src/components          Interactive demo UI components
src/data                Static fictional and sanitized demo case data
src/lib                 TypeScript models and pure helper functions
```

## Safety Note

Showcase material is fictional or sanitized. Local records and exports are not encrypted or centrally governed. Use fictional/sanitized data for testing; handle any study material according to your institution's consent and information-handling requirements.
