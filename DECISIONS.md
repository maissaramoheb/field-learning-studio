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
