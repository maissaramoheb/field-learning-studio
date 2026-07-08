# Architecture

## Recommended Stack

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui only if already configured easily; otherwise plain accessible components.
- Local React state or localStorage/sessionStorage.
- Static demo data in `src/data`.
- Pure functions in `src/lib` for synthesis and QA helpers.
- No backend in v0.1.

## Architecture Principles

- Keep components small and readable.
- Use typed data models.
- Avoid external services in v0.1.
- Keep demo data isolated from UI logic.
- Separate synthesis functions from presentation.
- Make future AI API migration straightforward.
- Make future database migration straightforward.
- Handle data safely by default.

## Future-Ready Interfaces

The v0.1 codebase should define TypeScript interfaces for:

- `SourceRecord`
- `EvidenceEntry`
- `Finding`
- `LessonLearned`
- `GoodPractice`
- `Recommendation`
- `QAReviewItem`
- `LearningBriefSection`

## v0.1 Data Flow

```text
src/data/demoCase.ts
  -> typed static demo case
  -> QA helper functions
  -> Markdown brief generator
  -> App Router page UI
```

## Safety Boundary

The application must not process real sensitive field data in v0.1. Any future file upload, AI API, authentication, or database work requires an explicit scope update in `MVP_SCOPE.md` and a decision record in `DECISIONS.md`.
