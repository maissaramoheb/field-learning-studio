# Field Learning Studio

Field Learning Studio is an AI-assisted field learning synthesis app for MEL, evaluation, donor reporting, and programme learning teams.

It helps turn messy field evidence into a traceable workflow:

Raw field evidence -> source inventory -> evidence matrix -> findings -> lessons learned -> good practices -> recommendations -> QA review -> donor-ready learning brief.

## Current Stage

v0.1.4-demo MVP. This is a product demonstrator and validation tool, not a production SaaS.

- **Live Production URL:** https://field-learning-studio.vercel.app/
- **Deployment Platform:** Vercel
- **Current Version:** v0.1.4-demo (Live Demo MVP)

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

## v0.1 Constraints

- Demo data only.
- No authentication.
- No database.
- No file upload.
- No real user data.
- No external AI API calls.
- Local/session state only.
- Markdown export only.
- Human review required.

## Core Workflow

1. Review project context.
2. Inspect source inventory and evidence matrix.
3. Trace evidence into findings.
4. Convert findings into lessons, good practices, and recommendations.
5. Run QA review.
6. Preview and copy a Markdown learning brief.

## Folder Structure

```text
src/app                 App Router route, layout, and global styles
src/components          Interactive demo UI components
src/data                Static fictional demo case data
src/lib                 TypeScript models and pure helper functions
```

## Safety Note

This v0.1 app uses fictional demo data only. Do not enter real sensitive field evidence, personal data, or confidential programme material.
