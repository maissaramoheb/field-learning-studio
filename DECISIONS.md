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
