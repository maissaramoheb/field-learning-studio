import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { Packer } from "docx";
import { extractRawText } from "mammoth";
import { renderToBuffer } from "@react-pdf/renderer";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { FieldStudy, Finding, Recommendation, SourceRecord, EvidenceEntry, LessonLearned, GoodPractice } from "@/lib/types";
import { assembleStudy, clearAllStores, saveStudyMeta, saveSource, saveEvidence, saveFinding, saveRecommendation, saveLesson, saveGoodPractice, saveProfessionalDraft, getStudyMeta } from "@/lib/storage";
import { exportStudyBackup, importStudyBackup, inspectStudyBackup } from "@/lib/storage/studyBackup";
import { submitForReview, validateArtifact } from "@/lib/validation";
import { createProfessionalDraft, captureDraftItem, assessProfessionalDraft, isProfessionalDraft } from "@/lib/professionalDraft";
import { prepareDraftExport } from "@/lib/storage/draftExport";
import { buildBriefExportModel } from "@/lib/buildBriefExportModel";
import { buildBriefDocxDocument } from "@/lib/exportDocx";
import { generateMarkdownFromModel } from "@/lib/exportMarkdown";
import { LearningBriefPdfDocument } from "@/components/export/LearningBriefPdfDocument";
import { sourceFileRepository } from "@/lib/storage/sourceFileRepository";

const studyId = "study-phase5-synthetic";
const meta: FieldStudy = { id: studyId, title: "Fictional Phase 5 verification", subtitle: "Decision translation", context: "Synthetic data only", status: "Synthesis", isDemoCase: false,
  scope: { targetSites: ["Site A"], isSingleSiteStudy: true, targetStakeholderGroups: ["Staff"] }, executiveSummary: "", keyMessages: [], limitations: ["Local scope"], createdAt: 1, updatedAt: 1,
  sources: [], evidence: [], debriefs: [], findings: [], lessons: [], goodPractices: [], recommendations: [] };
const source: SourceRecord = { id: "SRC-001", studyId, title: "Fictional context", date: "Unknown", sourceType: "Interview", stakeholderType: "Staff", location: "Site A", summary: "Observed record", sensitivityFlag: "None" };
const evidence: EvidenceEntry = { id: "EV-001", studyId, sourceId: source.id, stakeholderType: "Staff", rawEvidence: "One delivery improved", primaryTheme: "Access", secondaryTheme: "", evidenceStrength: "Medium", sensitivityFlag: "None", potentialFinding: "", qaStatus: "Needs Review", reviewStatus: "usable", validationStatus: "Draft" };
const finding: Finding = { id: "FND-001", studyId, statement: "Improvement in this observed context", explanation: "Human reasoning", supportingEvidenceIds: ["EV-001"], contradictoryEvidenceIds: ["EV-002"], qualifyingEvidenceIds: ["EV-003"], contradictoryEvidence: "Some arrivals were delayed", limitationNote: "One observed context only", alternativeInterpretations: "Staffing may explain the change", evidenceStrength: "Medium", programmeImplication: "Review timing", linkedRecommendationIds: [], validationStatus: "Draft", revision: 1 };
const recommendation: Recommendation = { id: "REC-001", studyId, recommendation: "Check timing before expansion", linkedFindingId: "FND-001", linkedFindingIds: ["FND-001", "FND-002"], evidenceBase: ["EV-001"], responsibleActor: "Synthetic practitioner", timeframe: "", feasibility: "", riskSensitivity: "", expectedBenefit: "", successIndicator: "", validationStatus: "Draft", revision: 1 };

async function seed() {
  await saveStudyMeta(meta); await saveSource({ ...source, studyId });
  for (const [id, text] of [["EV-001", "One delivery improved"], ["EV-002", "Others arrived late"], ["EV-003", "Only afternoon session observed"], ["EV-004", "Second bounded observation"]] as const) await saveEvidence({ ...evidence, id, rawEvidence: text, studyId });
  const initialFindings: Finding[] = [finding, { ...finding, id: "FND-002" as const, statement: "Second bounded finding", supportingEvidenceIds: ["EV-004"], contradictoryEvidenceIds: [], qualifyingEvidenceIds: [] }];
  for (const f of initialFindings) {
    await saveFinding({ ...f, studyId });
    await saveFinding({ ...validateArtifact(submitForReview(f), "Synthetic reviewer", undefined, (await assembleStudy(studyId))!), studyId });
  }
  const study = (await assembleStudy(studyId))!;
  await saveRecommendation({ ...validateArtifact(submitForReview(recommendation), "Synthetic reviewer", undefined, study), studyId });
  return (await assembleStudy(studyId))!;
}
async function include(study: FieldStudy, kinds: ["findings" | "lessons" | "goodPractices" | "recommendations", string][] = [["recommendations", "REC-001"]]) {
  const draft = study.professionalDraft || createProfessionalDraft(study);
  await saveProfessionalDraft(study.id, { ...draft, items: kinds.map(([kind, id]) => captureDraftItem(study, kind, id)) });
  return (await assembleStudy(study.id))!;
}

beforeEach(async () => { await clearAllStores(); });

describe("Phase 5 decision translation", () => {
  it("current Findings → reviewed multi-parent Recommendation → saved Draft → deterministic review → shared Markdown/DOCX/PDF", async () => {
    const study = await include(await seed());
    expect(assessProfessionalDraft(study).ready).toBe(true);
    const model = await prepareDraftExport(study, false, true);
    expect(model.recommendations.map(r => r.id)).toEqual(["REC-001"]);
    expect(model.findings.map(f => f.id)).toEqual(["FND-001", "FND-002"]);
    expect(model.recommendations[0].priority).toBe("Not recorded");
    const markdown = generateMarkdownFromModel(model);
    const docx = await Packer.toBuffer(buildBriefDocxDocument(model));
    const docxText = (await extractRawText({ buffer: docx })).value;
    for (const text of ["FND-001", "FND-002", "Check timing before expansion", "One observed context only", "Staffing may explain", "Challenging observation", "Qualifying context", "READY FOR PROFESSIONAL EXPORT"]) {
      expect(markdown).toContain(text); expect(docxText).toContain(text);
    }
    const pdf = await renderToBuffer(LearningBriefPdfDocument({ model }));
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(model.safetyNote).not.toMatch(/fictional|demo|sanitized/);
    expect(model.demoNote).toBe("Practitioner study context.");
    const dir = process.env.FLS_PHASE5_ARTIFACT_DIR;
    if (dir) { await mkdir(dir, { recursive: true }); await writeFile(join(dir, "phase5-professional-export.md"), markdown); await writeFile(join(dir, "phase5-professional-export.docx"), docx); await writeFile(join(dir, "phase5-professional-export.pdf"), pdf); }
  });

  it("one non-current parent withdraws a multi-parent Recommendation and blocks fresh professional download", async () => {
    const before = await include(await seed());
    await saveFinding({ ...before.findings[1], statement: "Substantive scope change", studyId });
    const after = (await assembleStudy(studyId))!;
    expect(after.recommendations[0].validationStatus).toBe("Needs Review");
    expect(assessProfessionalDraft(after).ready).toBe(false);
    await expect(prepareDraftExport(before, false, true)).rejects.toThrow(/Professional export blocked/);
    expect((await prepareDraftExport(before, false, false)).recommendations).toHaveLength(0);
    expect(after.professionalDraft!.items[0].label).toBe("Check timing before expansion");
  });

  it.each(["Needs Review", "Rejected", "superseded", "missing"] as const)("included Finding becoming %s remains a visible snapshot but not release-ready", async mode => {
    const saved = await include(await seed(), [["findings", "FND-001"]]);
    const study = structuredClone(saved);
    if (mode === "missing") study.findings = study.findings.filter(f => f.id !== "FND-001");
    else if (mode === "superseded") study.findings[0].supersededByFindingId = "FND-002";
    else study.findings[0].validationStatus = mode;
    const review = assessProfessionalDraft(study);
    expect(review.ready).toBe(false);
    expect(review.selections[0].item.snapshotText).toContain("Human reasoning");
    expect(buildBriefExportModel(study).findings).toHaveLength(0);
    expect(buildBriefExportModel(study).reviewNote).toContain("WORKING DRAFT");
    expect(() => buildBriefExportModel(study, false, { professionalExport: true })).toThrow(/blocked/);
  });

  it("revalidated/changed content still requires intentional inclusion refresh", async () => {
    const saved = await include(await seed(), [["findings", "FND-001"]]);
    await saveFinding({ ...saved.findings[0], statement: "Narrower reviewed scope", studyId });
    const changed = (await assembleStudy(studyId))!;
    await saveFinding({ ...validateArtifact(changed.findings[0], "Second synthetic reviewer", undefined, changed), studyId });
    const reviewed = (await assembleStudy(studyId))!;
    expect(assessProfessionalDraft(reviewed).selections[0].state).toBe("CHANGED SINCE INCLUSION");
    expect(buildBriefExportModel(reviewed).findings).toHaveLength(0);
    expect(assessProfessionalDraft(await include(reviewed, [["findings", "FND-001"]])).ready).toBe(true);
  });

  it("manual prose remains distinct and visibly unlinked in every shared output", async () => {
    const study = await include(await seed());
    const draft = study.professionalDraft!;
    await saveProfessionalDraft(studyId, { ...draft, manualExecutiveSummary: "Manual practitioner assessment", manualKeyMessages: ["Manually proposed message"] });
    const saved = (await assembleStudy(studyId))!;
    expect(assessProfessionalDraft(saved).unlinkedText).toBe(true);
    const model = await prepareDraftExport(saved, false, true);
    expect(model.executiveSummary).toBe("Manual practitioner assessment");
    expect(model.findings[0].statement).not.toContain("Manual");
    expect(model.reviewNote).toContain("UNLINKED SUBSTANTIVE FREE TEXT");
    const docxText = (await extractRawText({ buffer: await Packer.toBuffer(buildBriefDocxDocument(model)) })).value;
    for (const text of ["Manual practitioner assessment", "UNLINKED SUBSTANTIVE FREE TEXT", "Human review required"]) { expect(generateMarkdownFromModel(model)).toContain(text); expect(docxText).toContain(text); }
    const pdf = await renderToBuffer(LearningBriefPdfDocument({ model }));
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    const dir = process.env.FLS_PHASE5_ARTIFACT_DIR;
    if (dir) { await writeFile(join(dir, "phase5-manual-warning.pdf"), pdf); await writeFile(join(dir, "phase5-manual-warning.docx"), await Packer.toBuffer(buildBriefDocxDocument(model))); }
  });

  it("draft saves are atomic metadata patches; stale revisions cannot overwrite another writer", async () => {
    const study = await seed(); const draft = createProfessionalDraft(study);
    const saved = await saveProfessionalDraft(studyId, { ...draft, items: [captureDraftItem(study, "findings", "FND-001")] });
    await expect(saveProfessionalDraft(studyId, draft)).rejects.toThrow(/changed in another view/);
    await saveStudyMeta({ ...meta, title: "Latest study title" });
    const latest = (await getStudyMeta(studyId))!;
    expect(latest.professionalDraft).toEqual(saved);
    expect(latest.title).toBe("Latest study title");
    await saveProfessionalDraft(studyId, { ...saved, manualExecutiveSummary: "New manual summary" });
    expect((await getStudyMeta(studyId))!.title).toBe("Latest study title");
  });

  it("normal recovery retains draft selection/snapshot/manual text; malformed draft shapes are controlled invalid", async () => {
    await include(await seed());
    const study = (await assembleStudy(studyId))!;
    const backup = JSON.parse(await exportStudyBackup(studyId));
    const inspection = await inspectStudyBackup(JSON.stringify(backup));
    expect(inspection.errors).toEqual([]);
    expect(inspection.valid).toBe(true);
    const restored = await importStudyBackup(backup, "import_as_new");
    expect(restored.success).toBe(true);
    const copy = (await assembleStudy(restored.studyId!))!;
    expect(copy.professionalDraft).toEqual(study.professionalDraft);
    expect(assessProfessionalDraft(copy).ready).toBe(true);
    for (const malformed of [{ ...study.professionalDraft, items: "bad" }, { ...study.professionalDraft, manualKeyMessages: {} }, { ...study.professionalDraft, items: [{ kind: "unknown" }] }]) {
      const bad = structuredClone(backup); bad.study.professionalDraft = malformed as typeof study.professionalDraft;
      expect((await inspectStudyBackup(JSON.stringify(bad))).valid).toBe(false);
    }
  });

  it("new inclusion requires current outputs; learning/practice selection brings linked parents without unrelated records", async () => {
    const study = await seed();
    const lesson: LessonLearned = { id: "LES-001", studyId, statement: "Local learning", whatWorkedOrDidNotWork: "Observed", whyItHappened: "Reasoned", conditionsRequired: "Conditions", evidenceBase: ["EV-001"], linkedFindingIds: ["FND-001"], transferability: "Local only", validationStatus: "Needs Review" };
    const practice: GoodPractice = { id: "GP-001", studyId, title: "Local practice", description: "Recorded", whyItWorked: "Reasoned", conditionsForReplication: "Conditions", risksLimits: "Limited", recommendedUse: "Local use", evidenceBase: ["EV-001"], linkedFindingIds: ["FND-001"], validationStatus: "Needs Review" };
    await saveLesson({ ...validateArtifact(lesson, "Synthetic reviewer", undefined, study), studyId });
    await saveGoodPractice({ ...validateArtifact(practice, "Synthetic reviewer", undefined, study), studyId });
    const selected = await include((await assembleStudy(studyId))!, [["lessons", "LES-001"], ["goodPractices", "GP-001"]]);
    const model = buildBriefExportModel(selected);
    expect(model.findings.map(f => f.id)).toEqual(["FND-001"]);
    expect(model.recommendations).toHaveLength(0);
    expect(model.lessons[0].linkedFindingIds).toEqual(["FND-001"]);
    expect(generateMarkdownFromModel(model)).toContain("Linked Findings: FND-001");
    expect(() => captureDraftItem({ ...selected, findings: [{ ...selected.findings[0], validationStatus: "Rejected" }] }, "lessons", "LES-001")).toThrow(/current validated/);
  });

  it("Recommendation substance/parent edits preserve history and withdraw review authority without fabricating metadata", async () => {
    const study = await seed(); const rec = study.recommendations[0];
    expect(rec.priority).toBeUndefined(); expect(rec.timeframe).toBe("");
    await saveRecommendation({ ...rec, linkedFindingIds: ["FND-001"], feasibility: "Needs transport review", studyId });
    const updated = (await assembleStudy(studyId))!.recommendations[0];
    expect(updated.validationStatus).toBe("Needs Review"); expect(updated.revision).toBe(2);
    expect(updated.lastValidatedBy).toBe(rec.lastValidatedBy);
    expect(updated.linkedFindingIds).toEqual(["FND-001"]);
  });

  it("referenced original files are checked for actual study-owned content before professional output", async () => {
    await seed();
    await saveSource({ ...source, studyId, sourceFileId: "SF-PHASE5" });
    let current = (await assembleStudy(studyId))!;
    for (const f of current.findings) await saveFinding({ ...validateArtifact(f, "Synthetic re-reviewer", undefined, current), studyId });
    current = await include((await assembleStudy(studyId))!, [["findings", "FND-001"]]);
    expect(assessProfessionalDraft(current).fileState).toBe("NOT CHECKED");
    await expect(prepareDraftExport(current, false, true)).rejects.toThrow(/NEEDS ATTENTION/);
    await sourceFileRepository.saveFile({ id: "SF-PHASE5", studyId, filename: "synthetic.txt", mimeType: "text/plain", fileSizeBytes: 7, importedAt: 1, parsingVersion: 1, hasContent: true }, { id: "SF-PHASE5", studyId, extractedText: "context" });
    expect((await prepareDraftExport(current, false, true)).reviewNote).toContain("READY FOR PROFESSIONAL EXPORT");
  });

  it("empty/manual-only drafts and sandbox cannot silently become professional exports", async () => {
    const study = await seed();
    expect(isProfessionalDraft({ formatVersion: 1 })).toBe(false);
    await saveProfessionalDraft(studyId, { ...createProfessionalDraft(study), manualExecutiveSummary: "Unsupported conclusion" });
    await expect(prepareDraftExport(study, false, true)).rejects.toThrow(/No structured/);
    const selected = await include((await assembleStudy(studyId))!);
    await expect(prepareDraftExport(selected, true, true)).rejects.toThrow(/Sandbox/);
    expect(() => buildBriefExportModel(selected, true, { professionalExport: true })).toThrow(/Sandbox/);
  });
});
