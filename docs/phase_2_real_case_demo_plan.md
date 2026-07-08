# Phase 2 Real Case Demo Plan

## 1. Purpose of Phase 2

Phase 2 prepares Field Learning Studio to demonstrate a second, realistic MEL / field monitoring synthesis case while preserving strict public-demo safety. The goal is to show that the workspace can handle child-sensitive programme evidence from school visits, child sessions, staff interviews, and observations without exposing raw identifiable data.

This document is a planning and approval artifact only. It does not import, copy, transform, or publish raw spreadsheet rows.

## 2. Why the Real Field Mission Tracker Is Useful

The field mission tracker is useful because it reflects the kind of messy but structured evidence MEL teams actually manage:

- School-level observations.
- Staff interview summaries.
- Child session notes.
- Participant counts by age/gender category.
- Coded themes and analyst comments.
- Safeguarding flags and follow-up needs.
- Nutrition, water quality, food safety, attendance, and implementation observations.

This makes it a strong candidate for a sanitized real-world-inspired demo because it can stress-test the current app model across source inventory, evidence matrix, findings, lessons learned, good practices, recommendations, QA review, and learning brief output.

## 3. Data-Safety Risks

The source dataset is sensitive because it may include children, schools, health and nutrition observations, safeguarding indicators, staff notes, real locations, field team names, and potentially identifiable comments.

Primary risks:

- Identification of a child, school, staff member, field team member, or community.
- Exposure of direct child or staff quotes.
- Publication of medical, nutrition, safeguarding, or family-context details.
- Misinterpretation of field notes as verified findings.
- Overclaiming programme performance based on partial observations.
- Reputational harm to schools, communities, or implementing partners.
- Normalizing the use of real sensitive data in a public demo.

Safety position: preserve the analytical structure, not the raw record.

## 4. Anonymization Rules

All Phase 2 demo data must follow these rules before any app implementation:

- Replace real school names with anonymized labels: `School A`, `School B`, `School C`, etc.
- Replace exact governorate/district identifiers, where needed, with broader regional labels such as `Northern region`, `Urban school cluster`, or `Rural school cluster`.
- Remove or paraphrase direct quotes from children and staff.
- Remove names of field team members.
- Do not expose raw child-sensitive notes.
- Generalize health conditions where needed.
- Keep safeguarding flags only as abstracted categories: `No concern`, `Needs review`, or `Safeguarding-sensitive observation`.
- Remove any details that could identify a specific child, school, staff member, family, or community.
- Convert sensitive medical observations into programme-level risk categories.
- Preserve coded themes, traceability structure, and synthesis logic, not raw field wording.
- Use representative excerpts only after paraphrasing and aggregation.
- Avoid exact participant counts where small numbers could increase identifiability; use ranges when needed.
- Do not use row-level spreadsheet IDs from the original source in the public app.

## 5. Data Mapping Plan

### SourceRecord Mapping

| Spreadsheet column | Field Learning Studio mapping | Safety handling |
|---|---|---|
| Date | `date` | Keep month or date if not identifying; otherwise generalize to period. |
| Governorate | `location` | Replace with broad region label if needed. |
| School Name | Source title / anonymized site name | Replace with `School A`, `School B`, etc. |
| Stakeholder Group | `stakeholderType` | Keep broad group only: children, teachers, school leadership, caregiver group, field team. |
| Data Type | `sourceType` | Keep generic type such as observation, interview, child session, monitoring log. |
| Activity Type | Source summary detail | Keep as sanitized activity category. |
| School Type | Source summary detail | Use broad site type if useful; avoid uniquely identifying combinations. |
| Participants Count / Boys / Girls / Adults Count | Source summary | Use ranges or aggregated participant summary. |
| Entered By | Remove | Do not expose field team names. |
| Safeguarding Flag | `sensitivityFlag` | Convert to abstract app-level sensitivity. |
| General Comments | Source summary / analyst note | Sanitize and paraphrase. |

### EvidenceEntry Mapping

| Spreadsheet column | Field Learning Studio mapping | Safety handling |
|---|---|---|
| Notes | `rawEvidence` | Paraphrase as a sanitized evidence summary. |
| What Happened | Event description | Summarize without identifying detail. |
| Key Observation | Analytical observation | Keep as sanitized programme-level observation. |
| Direct Quote or Paraphrase | Supporting evidence only | Do not include direct quotes; paraphrase and generalize. |
| Coded Theme | `primaryTheme` | Keep or normalize into approved Phase 2 themes. |
| Gender-Nutrition Link | `secondaryTheme` or inclusion lens | Keep as gender/social inclusion lens. |
| Follow-up Needed | `potentialFinding` or recommendation input | Reframe as potential programme action. |
| Needs Clarification | `qaStatus` | Map to `Needs Review` where applicable. |
| Safeguarding Flag | `sensitivityFlag` | Use abstract sensitivity only. |

### Finding Mapping

Findings should be created by grouping sanitized evidence around repeated patterns, not by copying individual notes. Each finding must include:

- A synthesized statement.
- A cautious explanation.
- Supporting sanitized evidence IDs.
- Contradictory or limiting evidence.
- Evidence strength.
- Programme implication.
- Linked recommendation IDs.

## 6. Proposed Sanitized Case Title

Recommended title:

**School Nutrition & Child Wellbeing Field Learning Case**

Alternative title:

**Nutrition Programme Field Learning Synthesis Case**

Recommended subtitle:

**A sanitized real-world-inspired field synthesis case**

Proposed case metadata:

- `caseId`: `nutrition-field-learning-case`
- `caseStatus`: `Sanitized demo derived from prior fieldwork. No raw identifiable data included.`
- Suggested size: 8-10 source records, 12-16 evidence entries, 6 findings, 5 lessons learned, 4 good practices, 8 recommendations, and QA review items.

## 7. Proposed Themes

Approved initial theme set:

- Programme evolution and targeting.
- Food acceptability and water quality.
- Parent awareness and gendered care roles.
- Implementation capacity and staffing gaps.
- Child participation and awareness methods.
- Attendance and programme retention.
- Infrastructure and food safety constraints.
- Gender norms and age-related participation.
- Medical screening and inclusion gaps.
- Procurement, storage, and operational constraints.

Recommended UI grouping:

- Nutrition targeting and screening.
- Food safety and acceptability.
- Caregiver engagement and gender roles.
- Child participation and awareness.
- School implementation capacity.
- Infrastructure and operations.
- Safeguarding and health-sensitive review.

## 8. Proposed Findings

Draft findings must be based on repeated dataset patterns after sanitization, not raw copied text.

### `FND-NUT-001`

Nutrition programming is stronger where targeting is based on health and vulnerability data rather than generic meal provision.

Evidence logic: group evidence from screening notes, vulnerability indicators, and staff reflections showing the need for more precise targeting.

### `FND-NUT-002`

Food acceptability and water quality concerns affect children's engagement with school nutrition programming.

Evidence logic: group sanitized observations about food preferences, consumption barriers, water concerns, and practical constraints.

### `FND-NUT-003`

Parent awareness is gendered, with mothers carrying most nutrition responsibility while fathers are often less engaged.

Evidence logic: group caregiver engagement notes and gender-nutrition observations without exposing household details.

### `FND-NUT-004`

Child-led structures such as health groups and school committees can support nutrition awareness when properly supervised.

Evidence logic: group child session and committee observations, avoiding direct child quotes.

### `FND-NUT-005`

Infrastructure gaps, including storage, refrigeration, and eating space, create food safety and implementation risks.

Evidence logic: group school observations around storage, handling, refrigeration, safe eating space, and operational constraints.

### `FND-NUT-006`

Staffing gaps and reliance on non-specialist volunteers limit the quality and sustainability of nutrition support.

Evidence logic: group staff interview and implementation-capacity evidence, avoiding naming staff or schools.

## 9. Proposed Lessons Learned

Draft lessons:

- Targeting systems need health data plus social vulnerability data.
- Nutrition programming cannot rely only on meals; home practices and caregiver awareness matter.
- Child participation mechanisms are useful when structured and supervised.
- Food safety infrastructure is part of programme quality, not a logistical side issue.
- Gender norms shape both parental engagement and children's participation patterns.

Each lesson should include:

- What worked / did not work.
- Why it happened.
- Conditions required.
- Sanitized evidence base.
- Transferability notes.

## 10. Proposed Good Practices

Draft good practices:

1. **Anonymized school-level screening review**
   Use aggregate health and vulnerability indicators to refine targeting while avoiding individual child disclosure.

2. **Child-friendly nutrition awareness materials**
   Use visual and age-appropriate materials supported by teachers or trained facilitators.

3. **Caregiver nutrition awareness sessions**
   Offer low-literacy sessions designed for mothers and less-engaged fathers or male caregivers.

4. **Food safety readiness checklist**
   Review storage, refrigeration, water access, serving space, and safe handling before programme delivery.

Each good practice must include why it worked, evidence base, replication conditions, risks/limits, and recommended use.

## 11. Proposed Recommendations

Draft recommendations:

1. Strengthen screening and referral pathways for children with nutrition-related needs.
2. Introduce low-literacy caregiver nutrition sessions, especially for mothers and absent or less-engaged fathers.
3. Create child-friendly visual nutrition awareness materials.
4. Review menus for acceptability, safety, and dietary restrictions.
5. Improve refrigeration, storage, and safe eating spaces.
6. Clarify roles and minimum training for teachers or volunteers supporting nutrition delivery.
7. Establish simple monitoring tools linking attendance, nutrition delivery, and child feedback.
8. Add safeguarding-sensitive review for health-related meal risks.

Each recommendation must include:

- Linked finding.
- Sanitized evidence base.
- Responsible actor.
- Priority.
- Timeframe.
- Feasibility.
- Risk / sensitivity.
- Expected benefit.
- Success indicator.

## 12. QA / Safeguarding Review Logic

Phase 2 requires stronger QA than the fictional peacebuilding case because the source context involves children, schools, health, nutrition, and safeguarding flags.

Required QA checks:

- No raw school names are present.
- No child names or identifiable child details are present.
- No direct child quotes are present.
- No staff names or field team names are present.
- No exact sensitive locations are exposed where they could identify a site.
- Safeguarding flags are abstracted into approved categories only.
- Medical or nutrition observations are framed as programme-level risks, not individual diagnoses.
- Every finding links to sanitized evidence IDs.
- Every recommendation links to a finding and evidence base.
- Any sensitive evidence is flagged as `Needs Review` or equivalent before publication.
- Contradictory or limiting evidence is visible.
- The brief avoids school-level blame, individual-level claims, and unsupported causal claims.
- A human safeguarding reviewer approves the case before it is merged into the public app.

Suggested additional QA statuses for planning language:

- `No concern`
- `Needs review`
- `Safeguarding-sensitive observation`

These can be mapped into the existing app model as `None`, `Medium`, and `High` sensitivity for v0.1/v0.2 compatibility.

## 13. What Can Be Shown Publicly

Public demo content may include:

- Sanitized case title and subtitle.
- Anonymized school labels such as `School A`, `School B`, `School C`.
- Broad regional or site-type labels.
- Aggregated participant summaries or participant ranges.
- Paraphrased evidence summaries.
- Coded themes.
- Abstract safeguarding categories.
- Synthesized findings.
- Lessons learned.
- Good practices.
- Recommendations.
- QA review status and notes.
- Learning brief preview and Markdown export.

Public content must read as real-world-inspired but non-identifying.

## 14. What Must Not Be Shown Publicly

Do not show:

- Original Google Sheet rows.
- Real school names.
- Real child names or details that could identify a child.
- Direct quotes from children or staff.
- Field team names.
- Exact sensitive locations if identifiable.
- Specific medical details linked to a person or school.
- Safeguarding narratives or incident-like details.
- Unique combinations of school type, participant counts, location, and observation detail that could identify a site.
- Raw analyst comments.
- Raw follow-up notes.
- Any data that has not passed human safeguarding review.

## 15. Implementation Steps

Implementation should happen only after this plan is reviewed and approved.

Recommended sequence:

1. Create a sanitized working copy of the spreadsheet outside the public app repository.
2. Remove names, exact school identifiers, field team names, and direct quotes.
3. Aggregate or generalize location and participant fields.
4. Paraphrase all evidence summaries into programme-level language.
5. Select only 8-10 representative source records and 12-16 evidence entries.
6. Group evidence into the six proposed findings.
7. Draft lessons, good practices, recommendations, and QA items.
8. Run a manual safeguarding review against the QA rules above.
9. Create a second static demo case file only after approval, likely `src/data/nutritionDemoCase.ts`.
10. Add a minimal case selector to the existing workspace.
11. Regenerate QA review and learning brief from the active case.
12. Run lint/build and a manual browser review.

## 16. Approval Checkpoint Before Coding

No Phase 2 app implementation should start until these items are approved:

- The anonymization rules are accepted.
- The proposed title and case framing are accepted.
- The proposed theme set is accepted.
- The proposed findings, lessons, practices, and recommendations are approved as synthesized patterns.
- The safe public/private content boundary is approved.
- A human safeguarding reviewer confirms that the planned case structure does not expose children, schools, staff, field teams, or sensitive health/safeguarding details.
- The case presentation option is selected.

Recommended presentation option:

**Option A: Case selector on the Overview tab**

Reasoning: this is the safest and cleanest option because it keeps the current workspace mental model intact, clearly frames the second case as another demo case, and avoids adding routing, backend, or multi-project product complexity. The selector can remain a local UI control backed by static sanitized data.

Alternative options:

- **Option B: Separate case switcher at top of workspace.** Clean for future multi-case browsing, but it risks making the demo feel like a full product feature before the second case is approved.
- **Option C: Keep one case active but add a real-world-inspired badge.** Safest technically, but weaker for demonstrating comparison between fictional and sanitized real-world-inspired workflows.

## Non-Negotiable Boundary

Do not import the raw Google Sheet into the app. Do not add authentication, database, upload, AI API, backend, payments, or file processing for this phase. The only approved next implementation path is a static, sanitized, human-reviewed second demo case.
