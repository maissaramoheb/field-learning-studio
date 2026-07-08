# Agent Instructions

This project uses Codex and other AI coding agents primarily for inspection, implementation, testing, and reporting.

Before editing, always read:

- `README.md`
- `PRODUCT_BRIEF.md`
- `MVP_SCOPE.md`
- `ARCHITECTURE.md`
- `TECHNICAL_STATUS.md`
- `DECISIONS.md`

## Operating Rules

- Inspect before editing.
- Preserve the core evidence-to-learning workflow.
- Do not redesign randomly.
- Do not overengineer.
- Keep changes practical, minimal, professional, and testable.
- Do not expand scope without updating `MVP_SCOPE.md` and `DECISIONS.md`.
- Do not add authentication, database, file upload, payments, client portals, or multi-user workflows unless explicitly requested.
- Do not process real sensitive user data in v0.1.
- Do not call external AI APIs in v0.1.
- Preserve accessibility and future RTL support.
- Do not touch secrets or `.env` files.
- Do not add dependencies unless they are required and the reason is clear.

## Validation

Run these before reporting done:

```bash
npm run lint
npm run build
```

If tests are later configured, run them too.

## Status Updates

After meaningful changes, update:

- `TECHNICAL_STATUS.md`
- `OPS_UPDATE.json`

Update `CHANGELOG.md` and `TODO.md` when scope, behavior, or implementation status changes.
