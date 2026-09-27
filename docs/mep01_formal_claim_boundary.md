# MEP-01: Formal Claim Boundary & Export Parity Architecture

## 1. Executive Summary

MEP-01 closes the formal claim boundary in Field Learning Studio, guaranteeing that:
> **A formal Finding must depend on complete, current, deliberately reviewed material, and every formal output path must apply the same eligibility rules.**

Prior to MEP-01, several subtle defects allowed unvalidated or stale material to leak into deliverables or persist in contradictory states:
1. Substantive edits to challenging/contradictory evidence failed to cascade invalidation to parent findings.
2. Wrong-order approval allowed findings to be marked validated while supporting evidence remained in `Needs Review` or `Draft`.
3. Source records could be deleted while dependent evidence entries remained, creating orphan claims.
4. Batch mutation routes (batch updates, theme assignment, question linkage) bypassed individual invalidation triggers.
5. In-app Styled Brief Preview displayed all non-sandbox findings regardless of validation status or stale dependencies, breaking parity with Markdown, Word (DOCX), and PDF exports.

---

## 2. The Formal Eligibility Contract

All formal deliverable projections (Styled Brief Preview, Copy Markdown, Download Markdown, Download DOCX, Download PDF) now evaluate claims against a single canonical export context (`CanonicalExportContext` in `@/lib/exportPolicy`):

### Finding Formal Eligibility Rules (`isFindingExportEligible`)
For editable/live studies, a Finding is eligible for formal deliverable export **if and only if**:
1. **Explicit Review**: `validationStatus === "Validated"`. Draft, Needs Review, and Rejected findings are strictly excluded.
2. **Non-Stale Provenance**: No active `staleDependencyWarning` exists on the Finding.
3. **Evidence Linkage**: At least one supporting evidence relationship exists in the same Study.
4. **Supporting Evidence State**: Every linked supporting evidence entry:
   - Exists in the active Study.
   - Has `validationStatus === "Validated"`.
   - Has no active `staleDependencyWarning`.
   - Has a valid parent Source record existing in the active Study.
5. **Challenging Evidence State**: Any linked challenging evidence:
   - Exists in the active Study.
   - Is not in `Rejected` status.
   - Has no active `staleDependencyWarning`.
6. **Non-Sandbox ID**: Item IDs containing temporary or sandbox prefixes (`SBX`, `TEMP`) are excluded from formal deliverable sections.

### Recommendation Formal Eligibility Rules (`isRecommendationExportEligible`)
A Recommendation is eligible for formal deliverable export **if and only if**:
1. **Explicit Review**: `validationStatus === "Validated"`.
2. **Linked Parent Finding**: `linkedFindingId` references an existing Finding in the same Study.
3. **Parent Finding Eligibility**: The parent Finding is currently formally eligible under `isFindingExportEligible`.
4. **Non-Stale Provenance**: The parent Finding has not been invalidated or marked stale.

### Optional Outputs Eligibility Rules (`isLessonExportEligible`, `isGoodPracticeExportEligible`)
Lessons Learned and Good Practices require explicit `validationStatus === "Validated"`, and all referenced evidence entries in their `evidenceBase` must exist and be `Validated`.

---

## 3. Stale Dependency Semantics & Plain-Language Warnings

When an upstream dependency changes substantively, formal eligibility is suspended immediately and the affected Finding is demoted to `Needs Review` with a human-readable practitioner warning:

- **Supporting Evidence Changed**:
  > `"Supporting evidence changed after this Finding was reviewed. Review the highlighted evidence before approving this Finding again."`
- **Challenging Evidence Changed**:
  > `"Challenging evidence changed after this Finding was reviewed. Review the highlighted evidence before approving this Finding again."`
- **Supporting Evidence Removed**:
  > `"Supporting evidence was removed after this Finding was reviewed. Review the Finding again before including it in a formal deliverable."`

Technical jargon (e.g. `dependency invalidation`, `cascade failure`) is strictly avoided at the practitioner decision interface.

---

## 4. Review Order & Restoration Semantics

Downstream approval is **never automatically restored** simply because an upstream evidence item is re-validated. Analytical claims require deliberate practitioner judgment:

1. **Step 1 — Field Material Review**: Practitioner validates/re-validates the evidence entry.
2. **Step 2 — Analytical Review**: Finding becomes eligible to be reviewed again. The approval guard verifies all supporting evidence is current and Validated. Practitioner deliberately approves the Finding, clearing the stale dependency warning.
3. **Step 3 — Action Review**: Downstream Recommendation eligibility is restored automatically once its parent Finding is deliberately approved.

Wrong-order approvals (e.g. attempting to approve a Finding while supporting evidence is in `Needs Review` or `Draft`) are blocked at the validation interface and report:
> `"Cannot approve Finding: Supporting evidence is not yet validated. Review and validate all supporting evidence before approving this Finding."`

---

## 5. Source Deletion & Parent Integrity

To prevent orphan claim chains, `deleteSource` enforces referential integrity:
- Deleting a Source with 0 dependent Evidence entries succeeds immediately.
- Deleting a Source with active dependent Evidence entries is **blocked with an explicit error**:
  > `"Cannot delete Source [ID]: N Evidence entry/entries currently depend on this Source. Deleting a parent Source while dependent Evidence exists would create invalid orphan claims. Remove or reassign the dependent Evidence first."`

---

## 6. Batch Mutation Routes & Substantive Parity

All mutation routes trigger the exact same dependency invalidation cascade:
- Individual evidence editing (`saveEvidence`)
- Batch observation saves (`saveEvidenceBatch`)
- Bulk theme reassignment (`bulkAssignEvidenceTheme`)
- Bulk question reassignment (`bulkAssignEvidenceToQuestion`)

Any substantive change to an already `Validated` evidence entry automatically transitions its status to `Needs Review`, increments its revision counter, records previous validation history, and cascades invalidation to all dependent findings in the study.

---

## 7. 100% Formal Preview & Export Parity

All 5 output channels now consume the single canonical `BriefExportModel` produced by `buildBriefExportModel(study, includeSandbox)`:
1. **Styled Brief Preview** (`StyledBriefPreview` in UI)
2. **Copy Markdown** (`currentBriefMarkdown` via `generateLearningBriefMarkdown`)
3. **Download Markdown** (`downloadBriefMarkdown`)
4. **Download Word (DOCX)** (`downloadBriefDocx`)
5. **Download PDF** (`downloadBriefPdf`)

No deliverable output channel independently queries raw collections or displays unvalidated drafts. If a study contains 0 eligible findings, a clear notice is displayed:
> `"No formally eligible findings. Only approved findings with verified, current supporting evidence appear in the formal Learning Brief deliverable."`

---

## 8. Legacy Demo Isolation Boundary

Legacy immutable demo cases (`school-nutrition`, `community-bridges`) use a dedicated demo compatibility flag (`isLegacyDemo: true`). In this mode, pre-validated static demonstration records remain displayable. 

This exception is strictly quarantined to legacy cases and **never leaks into live/editable studies**, ensuring that client fieldwork cannot bypass review requirements.
