# Field Learning Studio

Field Learning Studio is an AI-assisted field learning synthesis app for MEL, evaluation, donor reporting, and programme learning teams.

It helps turn messy field evidence into a traceable workflow:

Raw field evidence -> source inventory -> evidence matrix -> findings -> lessons learned -> good practices -> recommendations -> QA review -> donor-ready learning brief.

## Current Stage

v0.7-export-pack (Word, PDF, Markdown Export Package). This is a premium interactive product demonstrator and validation tool, not a production SaaS.

- **Live Production URL:** https://field-learning-studio.vercel.app/
- **Deployment Platform:** Vercel
- **Current Version:** v0.7-export-pack (Professional Word, PDF, and Markdown Export Pack)

## Documentation

- [Demo & Validation Pack v0.1](file:///Users/maissaraselim/Library/CloudStorage/OneDrive-Personal/Consultancy/Apps/Field%20Learning%20Studio/docs/demo_validation_pack_v01.md)
- [Phase 2 Real Case Demo Plan](docs/phase_2_real_case_demo_plan.md)
- [Impeccable v0.3 UI Review](docs/impeccable_v0.3_ui_review.md)
- [v0.5 Dark Workbench Shape](docs/v0.5_dark_workbench_shape.md)
- [v0.6 Blue Command Workbench Refinement](docs/v0.6_blue_command_workbench_refinement.md)

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
npm run lint
npm run build
```

## Demo Constraints

- Demo data only.
- No authentication.
- No database.
- No file upload.
- No real user data.
- No external AI API calls.
- Local/session state only.
- Client-side Word, PDF, and Markdown document exports (no upload or backend processing).
- Human review required.

## Core Workflow

1. Select a fictional or sanitized real-world-inspired demo case.
2. Try a local sandbox field note or inspect the static evidence base.
3. Trace evidence into findings, lessons, good practices, and recommendations.
4. Run deterministic QA review safeguards.
5. Preview a donor-ready learning brief and download/copy the Word, PDF, or Markdown export.

## Folder Structure

```text
src/app                 App Router route, layout, and global styles
src/components          Interactive demo UI components
src/data                Static fictional and sanitized demo case data
src/lib                 TypeScript models and pure helper functions
```

## Safety Note

This demo app uses fictional and sanitized demo data only. Do not enter real sensitive field evidence, personal data, or confidential programme material.
