import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import type { EvidenceEntry, FieldStudy, Finding, GoodPractice, LessonLearned, Recommendation, SourceRecord } from "@/lib/types";
import { assembleStudy, clearAllStores, deleteFinding, getEvidence, getFinding, getStudyMeta, saveEvidence, saveFinding, saveGoodPractice, saveLesson, saveRecommendation, saveSource, saveSourceAndEvidenceBatch, saveStudyMeta, listStudies } from "@/lib/storage";
import { sourceFileRepository } from "@/lib/storage/sourceFileRepository";
import { exportStudyArchive, exportStudyBackup, importStudyBackup, inspectStudyBackup } from "@/lib/storage/studyBackup";
import { submitForReview, validateArtifact } from "@/lib/validation";
import { buildBriefExportModel } from "@/lib/buildBriefExportModel";
import { generateMarkdownFromModel } from "@/lib/exportMarkdown";
import { Packer } from "docx";
import { extractRawText } from "mammoth";
import { buildBriefDocxDocument } from "@/lib/exportDocx";
import { renderToBuffer } from "@react-pdf/renderer";
import { LearningBriefPdfDocument } from "@/components/export/LearningBriefPdfDocument";
import { assessFinalReviewIntegrity } from "@/lib/validation/finalReviewIntegrity";
import { computeTriangulationMatrix, computeTriangulationMetrics } from "@/lib/analytics/triangulation";
import { computeSupportProfile } from "@/lib/analytics/supportProfile";

const studyId = "study-integrity-contract";
const meta: FieldStudy = { id: studyId, title: "Synthetic evaluator study", subtitle: "", context: "", status: "Active Fieldwork", isDemoCase: false, scope: { targetSites: ["Site label"], isSingleSiteStudy: true, targetStakeholderGroups: ["Teachers"] }, executiveSummary: "Practitioner summary", keyMessages: [], limitations: [], createdAt: 1, updatedAt: 1, sources: [], evidence: [], debriefs: [], findings: [], lessons: [], goodPractices: [], recommendations: [] };
const source: SourceRecord & { studyId: string } = { id: "SRC-001", studyId, title: "Synthetic source", sourceType: "Monitoring record", date: "Unknown", stakeholderType: "Teachers", location: "Site label", siteId: "SITE-1", summary: "Synthetic notes", sensitivityFlag: "None", materialCategory: "primary_evidence" };
const evidence: EvidenceEntry & { studyId: string } = { id: "EV-001", studyId, sourceId: source.id, siteId: "SITE-1", stakeholderType: "Teachers", rawEvidence: "Observation", rawObservation: "Observation", interpretation: "Interpretation", primaryTheme: "Access", secondaryTheme: "", evidenceStrength: "Medium", sensitivityFlag: "None", potentialFinding: "", qaStatus: "Needs Review", reviewStatus: "usable", validationStatus: "Draft", materialCategory: "primary_evidence" };
const finding: Finding & { studyId: string } = { id: "FND-001", studyId, statement: "Bounded synthetic finding", explanation: "Evaluator reasoning", supportingEvidenceIds: ["EV-001"], contradictoryEvidenceIds: ["EV-002"], qualifyingEvidenceIds: ["EV-003"], contradictoryEvidence: "Recorded challenge", limitationNote: "One source only", alternativeInterpretations: "Another explanation remains possible", evidenceStrength: "Medium", programmeImplication: "Review delivery", linkedRecommendationIds: [], validationStatus: "Draft", revision: 1 };
const lesson: LessonLearned & { studyId: string } = { id: "LES-001", studyId, statement: "Bounded learning", whatWorkedOrDidNotWork: "Evaluator observation", whyItHappened: "Evaluator reasoning", conditionsRequired: "Recorded conditions", evidenceBase: ["EV-001"], linkedFindingIds: ["FND-001"], transferability: "Limited to reviewed conditions", validationStatus: "Draft" };
const practice: GoodPractice & { studyId: string } = { id: "GP-001", studyId, title: "Bounded practice", description: "Description", whyItWorked: "Human reasoning", evidenceBase: ["EV-001"], linkedFindingIds: ["FND-001"], conditionsForReplication: "Conditions", risksLimits: "Limits", recommendedUse: "Reviewed context only", validationStatus: "Draft" };
const recommendation: Recommendation & { studyId: string } = { id: "REC-001", studyId, recommendation: "Review an action", linkedFindingId: "FND-001", linkedFindingIds: ["FND-001"], evidenceBase: ["EV-001"], responsibleActor: "Evaluator", priority: "Medium", timeframe: "To be agreed", feasibility: "To be assessed", riskSensitivity: "Review required", expectedBenefit: "To be assessed", successIndicator: "To be agreed", validationStatus: "Draft" };

async function seed() {
  await saveStudyMeta(meta);
  await saveSource(source);
  for (const [id, text] of [["EV-001", "Observation"], ["EV-002", "Challenge"], ["EV-003", "Context"]] as const) await saveEvidence({ ...evidence, id, rawEvidence: text, rawObservation: text });
  await saveFinding(finding);
  const context = (await assembleStudy(studyId))!;
  const approved = validateArtifact(submitForReview(finding), "Synthetic reviewer", undefined, context);
  await saveFinding(approved);
  const outputContext = (await assembleStudy(studyId))!;
  await saveLesson(validateArtifact(submitForReview(lesson), "Synthetic reviewer", undefined, outputContext));
  await saveGoodPractice(validateArtifact(submitForReview(practice), "Synthetic reviewer", undefined, outputContext));
  await saveRecommendation(validateArtifact(submitForReview(recommendation), "Synthetic reviewer", undefined, outputContext));
  return (await assembleStudy(studyId))!;
}

beforeEach(async () => { await clearAllStores(); });

describe("Pre-Phase 5 cross-layer integrity contracts", () => {
  it("Sequence 1: usable Draft evidence supports reviewed findings, lessons, practices and the shared export model", async () => {
    const study = await seed();
    expect(study.evidence.every(e => e.validationStatus === "Draft")).toBe(true);
    const model = buildBriefExportModel(study);
    expect([model.findings.length, model.lessons.length, model.goodPractices.length, model.recommendations.length]).toEqual([1, 1, 1, 1]);
    const markdown = generateMarkdownFromModel(model);
    for (const text of ["One source only", "Another explanation", "Challenging observation", "Qualifying context", "UNLINKED SUBSTANTIVE FREE TEXT"]) expect(markdown).toContain(text);
    const docx = await Packer.toBuffer(buildBriefDocxDocument(model));
    const docxText = (await extractRawText({ buffer: docx })).value;
    for (const text of ["One source only", "Another explanation", "Challenging observation", "Qualifying context", "UNLINKED SUBSTANTIVE FREE TEXT"]) expect(docxText).toContain(text);
    const pdf = await renderToBuffer(LearningBriefPdfDocument({ model }));
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1000);
    expect(model.safetyNote).not.toContain("fictional");
    expect(assessFinalReviewIntegrity(study).authorityState).toBe("CHECKED");
    await saveEvidence({ ...evidence, id: "EV-004", reviewStatus: "pending" });
    await expect(saveRecommendation({ ...study.recommendations[0], studyId, id: "REC-UNQUALIFIED", evidenceBase: ["EV-004"] })).rejects.toThrow(/current and qualified/);
  });

  it.each(["edit", "excluded", "needs_clarification", "pending"] as const)("Sequence 2: %s evidence mutation withdraws finding and output authority", async mode => {
    await seed();
    const update = mode === "edit" ? { rawEvidence: "Materially different account" } : { reviewStatus: mode };
    await saveEvidence({ ...evidence, ...update });
    const study = (await assembleStudy(studyId))!;
    expect(study.findings[0].validationStatus).toBe("Needs Review");
    expect(study.findings[0].previousValidationStatus).toBe("Validated");
    expect([study.lessons[0], study.goodPractices[0], study.recommendations[0]].every(child => child.validationStatus === "Needs Review")).toBe(true);
    expect(buildBriefExportModel(study).findings).toHaveLength(0);
    expect(buildBriefExportModel(study).lessons).toHaveLength(0);
    expect(assessFinalReviewIntegrity(study).authorityState).toBe("NEEDS ATTENTION");
  });

  it.each(["contradictoryEvidenceIds", "qualifyingEvidenceIds"] as const)("all roles obey admissibility and invalidation: %s", async role => {
    const study = await seed();
    const id = finding[role]![0];
    const ev = study.evidence.find(e => e.id === id)!;
    await saveEvidence({ ...ev, studyId, reviewStatus: "excluded" });
    expect((await getFinding(studyId, finding.id))?.validationStatus).toBe("Needs Review");
    expect(() => validateArtifact({ ...finding, validationStatus: "Needs Review" }, "Reviewer", undefined, { ...study, evidence: study.evidence.map(e => e.id === id ? { ...e, reviewStatus: "excluded" } : e) })).toThrow(/excluded/);
  });

  it("Sequence 3: the production save boundary downgrades substantive finding edits exactly once and retains review history", async () => {
    await seed();
    const previous = (await getFinding(studyId, finding.id))!;
    await saveFinding({ ...previous, studyId, statement: "A materially different claim", audit: undefined, lastValidatedAt: undefined, lastValidatedBy: undefined });
    const updated = (await getFinding(studyId, finding.id))!;
    expect(updated.validationStatus).toBe("Needs Review");
    expect(updated.revision).toBe(2);
    expect(updated.lastValidatedBy).toBe(previous.lastValidatedBy);
    expect(updated.lastValidatedAt).toBe(previous.lastValidatedAt);
    expect(updated.audit?.validatedActor).toEqual(previous.audit?.validatedActor);
    await saveFinding({ ...updated, studyId, statement: "  A materially different claim  " });
    expect((await getFinding(studyId, finding.id))?.revision).toBe(2);
  });

  it("Sequence 4: file-bearing archive restores original binary, ownership and coordinates in a fresh database", async () => {
    const study = await seed();
    const blob = new Blob(["Synthetic original document"], { type: "text/plain" });
    await sourceFileRepository.saveFile({ id: "SF-ORIGINAL", studyId, filename: "synthetic.txt", mimeType: "text/plain", fileSizeBytes: blob.size, importedAt: 1, parsingVersion: 1, hasContent: true }, { id: "SF-ORIGINAL", studyId, blob, extractedText: "Synthetic original document" });
    await saveSource({ ...source, sourceFileId: "SF-ORIGINAL" });
    const coordinate = { sourceType: "docx_extracted" as const, blockIndex: 2, headingPath: ["Context"] };
    await saveEvidence({ ...study.evidence[0], studyId, sourceFileId: "SF-ORIGINAL", sourceCoordinate: coordinate });
    const archive = await exportStudyArchive(studyId);
    const originalFactory = globalThis.indexedDB;
    globalThis.indexedDB = new IDBFactory();
    try {
      expect(await getStudyMeta(studyId)).toBeUndefined();
      expect(await sourceFileRepository.getFileMetadata("SF-ORIGINAL")).toBeUndefined();
      const restored = await importStudyBackup(archive, "import_as_new");
      const copy = (await assembleStudy(restored.studyId))!;
      expect(copy.sources).toHaveLength(1);
      expect(copy.evidence).toHaveLength(3);
      expect(copy.findings).toHaveLength(1);
      const id = copy.evidence[0].sourceFileId!;
      expect(id).not.toBe("SF-ORIGINAL");
      expect(copy.sources[0].sourceFileId).toBe(id);
      expect(copy.evidence[0].sourceCoordinate).toEqual(coordinate);
      const file = await sourceFileRepository.getFileMetadata(id);
      const content = await sourceFileRepository.getFileContent(id);
      expect(file?.studyId).toBe(copy.id);
      expect(content?.studyId).toBe(copy.id);
      expect(await content?.blob?.text()).toBe("Synthetic original document");
      expect(content?.extractedText).toBe("Synthetic original document");
      expect(assessFinalReviewIntegrity(copy, { [id]: true }).fileState).toBe("CHECKED");
    } finally { globalThis.indexedDB = originalFactory; }
  });

  it("Sequence 5: parents requiring review or superseded block all children; referenced deletion is rejected", async () => {
    await seed();
    const replacement = { ...finding, id: "FND-002" as const, statement: "Candidate replacement", supersedesFindingId: finding.id };
    await saveFinding(replacement);
    const multiParent = { ...recommendation, id: "REC-002" as const, validationStatus: "Validated" as const, linkedFindingIds: [finding.id, replacement.id] };
    await expect(saveRecommendation(multiParent)).rejects.toThrow(/not currently Validated/);
    await saveFinding(validateArtifact(submitForReview(replacement), "Reviewer", undefined, (await assembleStudy(studyId))!));
    await saveRecommendation(multiParent);
    await saveFinding({ ...(await getFinding(studyId, replacement.id))!, studyId, explanation: "Changed replacement reasoning" });
    expect((await assembleStudy(studyId))!.recommendations.find(r => r.id === multiParent.id)?.validationStatus).toBe("Needs Review");
    await expect(deleteFinding(studyId, finding.id)).rejects.toThrow(/reference/);
    const previous = (await getFinding(studyId, finding.id))!;
    await saveFinding({ ...previous, studyId, supersededByFindingId: "FND-002", supersededAt: 2 });
    const study = (await assembleStudy(studyId))!;
    expect(study.findings).toHaveLength(2);
    expect(buildBriefExportModel(study).findings).toHaveLength(0);
    expect(buildBriefExportModel(study).recommendations).toHaveLength(0);
    expect(study.lessons[0].validationStatus).toBe("Needs Review");
    await expect(saveLesson({ ...lesson, linkedFindingIds: [] })).rejects.toThrow(/parent Finding/);
    await expect(saveGoodPractice({ ...practice, id: "GP-NEW", linkedFindingIds: [replacement.id] })).rejects.toThrow(/not currently Validated/);
    await expect(saveRecommendation({ ...recommendation, validationStatus: "Validated", linkedFindingIds: [finding.id, "FND-MISSING"] })).rejects.toThrow(/does not exist/);
  });

  it("Sequence 6: malformed relationship shapes produce controlled invalid results with zero partial writes", async () => {
    await seed();
    const json = await exportStudyBackup(studyId);
    for (const [section, key] of [["findings", "supportingEvidenceIds"], ["findings", "contradictoryEvidenceIds"], ["findings", "qualifyingEvidenceIds"], ["lessons", "linkedFindingIds"], ["sources", "sourceType"], ["findings", "explanation"]]) {
      const bad = JSON.parse(json); bad[section][0][key] = { malformed: true };
      expect((await inspectStudyBackup(JSON.stringify(bad))).valid).toBe(false);
      await expect(importStudyBackup(bad, "import_as_new")).rejects.toThrow(/Invalid backup/);
    }
    expect((await assembleStudy(studyId))?.findings[0].validationStatus).toBe("Validated");
    expect(await listStudies()).toHaveLength(1);
  });

  it("Sequence 7: persisted import collisions reject every write and preserve the reviewed chain", async () => {
    await seed();
    await expect(saveSourceAndEvidenceBatch(studyId, [{ ...source, summary: "Overwrite" }, { ...source, id: "SRC-NEW" }], [{ ...evidence, rawEvidence: "Overwrite" }])).rejects.toThrow(/SRC-001.*EV-001/);
    const study = (await assembleStudy(studyId))!;
    expect(study.sources).toHaveLength(1);
    expect((await getEvidence(studyId, evidence.id))?.rawEvidence).toBe("Observation");
    expect(study.findings[0].validationStatus).toBe("Validated");
  });

  it("source provenance changes invalidate, cosmetic title changes do not; Draft/Rejected states are preserved", async () => {
    await seed();
    const stored = (await assembleStudy(studyId))!.sources[0];
    await saveSource({ ...stored, studyId, title: "Corrected title" });
    expect((await getFinding(studyId, finding.id))?.validationStatus).toBe("Validated");
    await saveFinding({ ...finding, id: "FND-DRAFT", validationStatus: "Draft" });
    await saveFinding({ ...finding, id: "FND-REJECTED", validationStatus: "Rejected" });
    await saveSource({ ...stored, studyId, date: "2026-01-02" });
    expect((await getFinding(studyId, finding.id))?.validationStatus).toBe("Needs Review");
    expect((await getFinding(studyId, "FND-DRAFT"))?.validationStatus).toBe("Draft");
    expect((await getFinding(studyId, "FND-REJECTED"))?.validationStatus).toBe("Rejected");
    expect((await getFinding(studyId, "FND-DRAFT"))?.previousValidationStatus).toBeUndefined();
  });

  it("analytics agree on pending material, nonstandard methods and a site's ID/label", async () => {
    const study = await seed();
    const matrix = computeTriangulationMatrix(study, "theme", "method");
    expect(matrix.columns.map(c => c.id)).toContain("Monitoring record");
    expect(matrix.totalIndependentSourcesCount).toBe(1);
    expect(computeSupportProfile(finding, study.scope, study.evidence, study.sources).methodDiversity.methodsFound).toEqual(["Monitoring record"]);
    expect(computeTriangulationMetrics(finding, { evidence: study.evidence, sources: study.sources }).methodsFound).toEqual(["Monitoring record"]);
    const sites = computeTriangulationMatrix(study, "theme", "site");
    expect(sites.columns.map(c => c.id)).toEqual(["SITE-1"]);
    expect(computeSupportProfile(finding, study.scope, study.evidence, study.sources).siteCoverage.sitesFound).toEqual(["SITE-1"]);
    const pending = study.evidence.map(e => ({ ...e, reviewStatus: "pending" as const }));
    expect(computeSupportProfile(finding, study.scope, pending, study.sources).independentSourceCount).toBe(0);
    expect(computeTriangulationMetrics(finding, { evidence: pending, sources: study.sources }).independentSourceCount).toBe(0);
    expect(computeTriangulationMatrix({ ...study, evidence: pending }, "theme", "method").totalQualifiedEvidenceCount).toBe(0);
  });
});
