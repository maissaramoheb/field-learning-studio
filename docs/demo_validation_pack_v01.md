# Field Learning Studio — Demo & Validation Pack v0.1

This pack supports founders and partners in presenting Field Learning Studio, collecting qualitative user feedback, and structuring pilot conversations with MEL professionals, evaluators, and donor-reporting specialists.

---

## 1. Product Snapshot

- **Product Name:** Field Learning Studio
- **Live URL:** [https://field-learning-studio.vercel.app/](https://field-learning-studio.vercel.app/)
- **Current Version:** v0.1.4-demo
- **One-line Promise:** Turn messy field evidence into traceable findings, lessons learned, good practices, recommendations, and donor-ready learning briefs.
- **Positioning:** A traceability-first evidence synthesis workspace for MEL, evaluation, donor reporting, and programme learning teams.
- **Current Status:** Live demo MVP using fictional data only.
- **Safety Note:** This version is for demonstration only. Do not enter or process real sensitive field evidence.

---

## 2. Who This Demo Is For

The primary target users are professionals who coordinate monitoring, evaluation, and reporting cycles in development, peacebuilding, humanitarian, and social-impact sectors:

### Target Roles
- MEL (Monitoring, Evaluation, and Learning) officers and directors
- Qualitative evaluation consultants and research coordinators
- NGO / INGO programme managers and heads of office
- Donor-reporting specialists and grant consultants
- Peacebuilding and social cohesion programme teams
- Training, capacity-building, and knowledge-management leads
- Field coordination and community engagement teams

### Prioritized User Workflows
Validation conversations should target professionals who regularly handle:
- Interview notes and stakeholder consultation logs
- Focus group discussion (FGD) transcript summaries
- Monitoring reports, field visit journals, and check-in logs
- Formal lessons learned exercises and retrospective reports
- Evaluation drafts, finding matrix sheets, and programmatic recommendations

---

## 3. Core Problem

Many programme teams collect rich qualitative field evidence but struggle to convert it into structured, defensible learning outputs under tight reporting timelines.

### Common Pain Points
- **Scattered Data:** Field notes, interviews, and observations remain scattered across various documents and spreadsheets, making analysis disjointed.
- **Missing Traceability:** Learning briefs and reports present high-level findings without an auditable, visible evidence trail to back them up.
- **Disconnected Recommendations:** Key recommendations are often written based on general intuition rather than being directly rooted in validated findings.
- **Generic Lessons:** "Lessons learned" tend to be boilerplate and generic, lacking transferability criteria or localized context.
- **Reporting Time Pressure:** Synthesis must be performed quickly under donor deadlines, increasing the risk of overclaiming or missing sensitive nuances.
- **Defense of Qualitative Evidence:** Teams struggle to defend their findings to skeptical donors, external auditors, or local stakeholders without a structured chain of evidence.

---

## 4. Core Product Logic

Field Learning Studio operates on a structured flow from raw field observation to polished, donor-ready briefs.

### The Synthesis Workflow
```
Raw field evidence
  → Source inventory
  → Evidence matrix (with Theme coding, Strength, and Sensitivity)
  → Findings (with Triangulation and Contradiction checks)
  → Lessons learned / Good practices (with Transferability and replication conditions)
  → Recommendations (with priority, responsible actors, feasibility, and risk)
  → QA review (with compliance check tags)
  → Donor-ready learning brief preview
```

### Core Product Rules
- **No finding without evidence:** Every finding card must link to one or more evidence records.
- **No recommendation without a finding:** Recommendations must trace back to a validated finding block.
- **No learning brief without traceability:** The final output document must contain an active annex of traceable source and evidence IDs.

> [!NOTE]
> Field Learning Studio is **not** trying to replace evaluators or MEL professionals. It is designed to act as an interactive synthesis ledger that makes their rigorous analysis visible, defensible, and easier to compile.

---

## 5. 60-Second Elevator Pitch

*Use this natural spoken pitch to introduce the concept during intros or early calls:*

> "Field Learning Studio is a traceability-first workspace for turning messy field evidence into structured programme learning. Many MEL and evaluation teams already have the raw material — interviews, field notes, monitoring reports, focus groups — but the hard part is connecting that evidence to findings, lessons, recommendations, and donor-ready outputs.
>
> This demo shows a fictional community peacebuilding project and how evidence moves through the full synthesis chain. The goal is not to replace human judgment, but to give teams a clearer, safer, and more defensible way to produce learning briefs and recommendations."

---

## 6. 5-Minute Demo Script

*A structured walkthrough guide using the live application tabs:*

### Minute 0:00–0:45 — Opening
1. Open the [Live App](https://field-learning-studio.vercel.app/) and display the **Overview** tab.
2. State the core promise: turning messy field notes into a traceable synthesis chain.
3. Call out the boundary: *"This is a secure, local-only demonstrator using fictional peacebuilding data. No real sensitive data should be entered in this version."*

### Minute 0:45–1:30 — Project Context
1. Point to the active demo case details under the header: **Community Bridges Initiative (CBI)**.
2. Explain the thematic context: youth and women's participation in peacebuilding committees.
3. Explain that the app maps real-world evaluation metadata (Sources, Evidence, Findings, Recommendations).

### Minute 1:30–2:15 — Evidence Matrix
1. Click the **Evidence** tab to display the matrix.
2. Walk through the table columns: Evidence ID, Source ID, Stakeholder Type, and Raw Note.
3. Point out the categorization tags: Theme, Evidence Strength, and Sensitivity Flags.
4. **Action:** Click a clickable source ID (e.g. `SRC-001`) or evidence ID (e.g. `EV-001`) to demonstrate the scroll-and-highlight traceability feature in action.

### Minute 2:15–3:00 — Findings
1. Click the **Findings** tab.
2. Show how each finding displays its supporting evidence base.
3. Highlight that finding statements are backed by specific interview logs.
4. **Action:** Click a linked evidence ID pill under a finding card to show how it automatically returns the user to the **Evidence** tab and highlights the matching row.

### Minute 3:00–3:40 — Recommendations
1. Click the **Recommendations** tab.
2. Point out that recommendations are prioritized (High, Medium, Low) and structured as key-value metadata cards.
3. Walk through the fields: Timeframe, Feasibility, Expected Benefit, and Risk.
4. Show that every recommendation points to its `Linked finding` and `Evidence base` anchors.

### Minute 3:40–4:20 — QA Review
1. Click the **QA Review** tab.
2. Explain that this acts as the quality assurance layer: verifying triangulation, overclaiming, youth/gender/conflict sensitivity, and confidentiality before compiling the final brief.
3. **Action:** Click an item's QA ID button (e.g. `QA-001`) to show highlight state.

### Minute 4:20–5:00 — Learning Brief
1. Click the **Brief** tab.
2. Show the **Donor-ready brief preview**: clean typography displaying the executive summary, findings, and annex.
3. Point out the **Markdown source** toggle at the bottom that enables easy copy-pasting into reports or word processors.
4. **Close:** *"The key question I'm testing is whether this structured workflow would save time, improve quality, and make learning outputs more defensible for your team."*

---

## 7. Demo Questions to Ask Users

Use these targeted questions during or after the walkthrough to capture validation feedback:

### Problem Validation
- How do you currently turn raw field notes or interview summaries into findings and recommendations?
- Where does the synthesis process usually become slow, messy, or politically sensitive?
- How do you track or prove which evidence supports which finding to external evaluators or donors?
- Have you encountered situations where final recommendations were weakly connected to the actual evidence?
- What kind of qualitative evidence is the hardest for your team to synthesize?

### Workflow Validation
- Does this step-by-step flow (Evidence → Findings → Recommendations) match how your team compiles learning?
- Which tab or section feels the most useful to your day-to-day workflow?
- Is there any step or metadata field in this demo that feels unnecessary or redundant?
- If you could change one thing about this flow, what would it be?
- Would this workspace be most valuable *during* field monitoring visits, or *after* all notes are gathered?

### Trust and Quality
- Would having interactive traceability links make you more confident in presenting learning briefs to donors?
- What QA checks or checks for overclaiming would you expect before you could trust an AI-assisted workspace with real evidence?
- What security or confidentiality concerns would worry you about using a tool like this?
- What would make the generated briefs feel credible enough to be sent directly to donors without extensive rewrite?

### Buying / Pilot Signal
- Would your organization be willing to pay for a tool or service that helps compile qualitative briefs through this workflow?
- Would you prefer this as a structured consulting service, an internal software tool, or a team subscription?
- What is a real, upcoming project or report where you could imagine piloting a workflow like this?
- Who would need to approve the budget or data-security review to run a pilot using real project notes?

---

## 8. Strong Signal vs Weak Signal

| Strong Signals (Highly Validated) | Weak Signals (Low Validation) |
|-----------------------------------|-------------------------------|
| User asks if they can try the app on an active project immediately. | User only says "nice interface" or "looks very clean." |
| User asks about security, local hosting, or data privacy. | User focuses entirely on visual styling (color, spacing). |
| User identifies a specific upcoming donor report or evaluation deadline. | User cannot name a concrete project where they would use it. |
| User asks about pricing, pilot packages, or collaborative workspace support. | User says their current Word document/Excel sheets are "fine." |
| User specifically praises the traceability links or QA checklist criteria. | User wants generic ChatGPT writing rather than structured tracing. |
| User asks if they can paste in interview notes or transcript files. | User is interested in AI tech but has no active use case. |

---

## 9. Early Paid Pilot Offer

To help founders convert early interest into structured trials, use the **Field Learning Synthesis Pilot** framework.

### The Pilot Offer
A service-supported pilot where a single project's qualitative evidence package is ingested, synthesized, and compiled into a traceable learning package using the Field Learning Studio workflow.

### Pilot Inputs (Provided by Partner)
- Raw field notes, interview summaries, or check-in reports
- Focus group discussion transcripts or workshop summary outputs
- Initial draft monitoring summaries or draft evaluation text

### Pilot Outputs (Delivered by Studio Workflow)
- Structured Source Inventory
- Ingested Evidence Matrix with theme codes and strength metrics
- Evidence-backed Findings Table
- Contextual Lessons Learned and replication-ready Good Practices
- Prioritized, action-oriented Recommendations
- Auditable QA review log
- Polished, donor-ready Learning Brief (Markdown/Word formats)

### Indicative Pilot Tiers
- **Option A (Light Pilot):** Ingestion of 1 small evidence set (e.g. 5–10 pages of qualitative notes), outputting a concise learning brief. *Estimated fee: USD 500 – 1,000.*
- **Option B (Standard Pilot):** Ingestion of a complete project component, mapping multiple sources and stakeholder perspectives into a full synthesis pack and brief. *Estimated fee: USD 1,500 – 3,500.*
- **Option C (Evaluation Support Pilot):** Ingestion of an ongoing program evaluation, supporting external evaluators to compile traceable recommendations. *Estimated fee: USD 3,000 – 7,500.*

---

## 10. What We Are NOT Selling Yet

To avoid overpromising, maintain clear boundaries during demos on what the current version does not support:

### Out of Scope (For Now)
- **SaaS Subscription:** We are not selling a self-service software-as-a-service login platform.
- **AI Auto-Analysis:** We do not automatically ingest raw files and spit out summaries without human review.
- **Confidential Database:** We do not host sensitive client information on our servers.
- **Enterprise Features:** We do not offer collaborative multi-user editing, permissions, or cross-project dashboards.

---

## 11. Feature Decision Rules

New features should only be added if there is clear qualitative user evidence supporting them:

1. **Request Threshold:** Do not build a feature unless at least 3 distinct target users request it.
2. **Workflow Alignment:** It must directly improve traceability, QA, export usefulness, or note ingestion.
3. **Pilot Enabler:** Priority is given to features that directly enable a paid pilot package.
4. **No Complexity Creep:** Reject features that add complexity without reducing delivery time.

---

## 12. Likely Next Features After Validation

### [P1] Post-Validation MVP Enhancements
- Editable evidence forms (direct entry in browser)
- Browser-based `localStorage` persistence (save draft session)
- Pasting in raw notes with simple text block parser
- Interactive demo mode with a blank template state
- Rich text preview and improved layout formatting for export

### [P2] Dynamic Workspace Support
- AI-assisted finding suggestion prompts based on selected evidence rows
- AI-assisted recommendation builder (mapping actor, timeframe, feasibility)
- Native DOCX and PDF styled template exports
- File-based save/load support (save project state as JSON file)

### [P3] Full Product Platform (SaaS)
- User authentication and secure logins
- Persistent backend database (PostgreSQL/Firestore)
- Bulk file upload and automated transcription ingestion
- Team workspaces with collaborative comment loops and version control

---

## 13. Demo Follow-Up Message Template

*A warm, professional follow-up template for users who reviewed the demo:*

```text
Subject: Field Learning Studio — Follow-up & Pilot Discussion

Hi [Name],

Thank you for taking the time to review the Field Learning Studio demo. 

What we are testing at this stage is not a full software platform, but whether a traceability-first evidence workflow is genuinely useful for MEL, evaluation, and donor-reporting teams. 

I would really value your thoughts on a few key areas:
1. Where could a structured workflow like this fit in your reporting cycles?
2. Which elements (traceability links, QA checks) felt most useful or unnecessary?
3. Whether a small pilot using an upcoming project's field notes would be worth exploring for your team.

Looking forward to your feedback.

Best regards,
[Founder Name]
```

---

## 14. Internal Founder Notes

- **Listen more than talk:** Let the user react to the workflow. Note down if they find the links helpful or if they get confused.
- **Sell the workflow, not the tech:** Focus on how it solves messy synthesis, not on AI capabilities.
- **Focus on upcoming deadlines:** Ask, *"Do you have a donor report or evaluation due in the next 60 days?"* to identify potential pilot clients.
- **Control the scope:** Do not start building databases or user logins until you have at least 5–7 completed user conversations indicating a clear willingness to pay.
