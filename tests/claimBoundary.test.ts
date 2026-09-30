import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  clearAllStores,
  saveStudyMeta,
  saveSource,
  saveEvidence,
  saveEvidenceBatch,
  getEvidence,
  saveFinding,
  getFinding,
  saveRecommendation,
  getRecommendation,
  deleteSource,
  assembleStudy,
  bulkAssignEvidenceTheme,
  bulkAssignEvidenceToQuestion,
  saveLesson,
  saveGoodPractice,
} from "@/lib/storage";
import {
  validateArtifact,
  applySubstantiveEvidenceEdit,
  isFindingExportEligible,
  isRecommendationExportEligible,
  getRecommendationDependencyWarning,
  type CanonicalExportContext,
} from "@/lib/validation";
import { buildBriefExportModel } from "@/lib/buildBriefExportModel";
import { generateLearningBriefMarkdown } from "@/lib/generateBrief";
import type {
  StudyMeta,
  SourceRecord,
  EvidenceEntry,
  Finding,
  Recommendation,
  LessonLearned,
  GoodPractice,
  StudyId,
} from "@/lib/types";

describe("MEP-01: Formal Claim Boundary & Export Parity Verification", () => {
  const studyId: StudyId = "study-mep01-formal";

  const sampleMeta: StudyMeta = {
    id: studyId,
    title: "Minya Education Learning Study",
    subtitle: "Formal Claim Boundary & Export Parity Testing",
    status: "Active Fieldwork",
    context: "Field study testing claim boundaries",
    isDemoCase: false,
    scope: {
      targetStakeholderGroups: ["Teachers", "Parents", "Students"],
      targetSites: ["Site-1", "Site-2"],
      isSingleSiteStudy: false,
    },
    executiveSummary: "Executive summary of the study",
    keyMessages: ["Key message 1", "Key message 2"],
    limitations: ["Limitation 1"],
    questions: [
      { id: "RQ-001", question: "How does power supply affect digital instruction?", criterion: "Effectiveness", isActive: true },
    ],
    patternNotes: [],
    createdAt: 1000,
    updatedAt: 1000,
  };

  const sampleSource: SourceRecord & { studyId: StudyId } = {
    id: "SRC-101",
    studyId,
    title: "KII with School Principal",
    sourceType: "Key Informant Interview",
    date: "2026-03-10",
    stakeholderType: "Teachers",
    location: "Site-1",
    summary: "School principal interview transcript",
    sensitivityFlag: "None",
  };

  const sampleEvidence: EvidenceEntry & { studyId: StudyId } = {
    id: "EV-101",
    studyId,
    sourceId: "SRC-101",
    rawEvidence: "Solar battery bank is depleted by 12:30 PM daily.",
    rawObservation: "Solar battery bank is depleted by 12:30 PM daily.",
    interpretation: "Instructional hours cut short in the computer lab.",
    potentialFinding: "Power failure halts digital curriculum.",
    primaryTheme: "Access",
    secondaryTheme: "",
    stakeholderType: "Teachers",
    evidenceStrength: "High",
    sensitivityFlag: "None",
    qaStatus: "Reviewed",
    validationStatus: "Validated",
    revision: 1,
    studyQuestionIds: ["Q-001"],
  };

  const sampleFinding: Finding & { studyId: StudyId } = {
    id: "FND-101",
    studyId,
    statement: "Power instability terminates digital instructional hours.",
    explanation: "Solar battery depletion halts daily operations by early afternoon.",
    supportingEvidenceIds: ["EV-101"],
    contradictoryEvidence: "",
    contradictoryEvidenceIds: [],
    evidenceStrength: "High",
    programmeImplication: "Procure battery backup systems.",
    linkedRecommendationIds: ["REC-101"],
    validationStatus: "Validated",
    revision: 1,
  };

  const sampleRecommendation: Recommendation & { studyId: StudyId } = {
    id: "REC-101",
    studyId,
    recommendation: "Install secondary battery bank for computer lab.",
    linkedFindingId: "FND-101",
    evidenceBase: ["EV-101"],
    responsibleActor: "Logistics Team",
    priority: "High",
    timeframe: "Immediate",
    feasibility: "High",
    riskSensitivity: "Low",
    expectedBenefit: "Restores afternoon instructional hours",
    successIndicator: "100% lab uptime during class hours",
    validationStatus: "Validated",
    revision: 1,
  };

  beforeEach(async () => {
    await clearAllStores();
    await saveStudyMeta(sampleMeta);
    await saveSource(sampleSource);
    await saveEvidence(sampleEvidence);
    await saveFinding(sampleFinding);
    await saveRecommendation(sampleRecommendation);
  });

  // ============================================================================
  // 1. Dependency Chain Invariant
  // ============================================================================
  describe("1. Dependency Chain Invariant", () => {
    it("substantive edit to supporting evidence demotes finding to Needs Review and blocks recommendation", async () => {
      // Initially, finding and recommendation are export-eligible
      const studyBefore = await assembleStudy(studyId);
      expect(studyBefore).toBeDefined();
      const modelBefore = buildBriefExportModel(studyBefore!);
      expect(modelBefore.findings.map((f) => f.id)).toContain("FND-101");
      expect(modelBefore.recommendations.map((r) => r.id)).toContain("REC-101");

      // Apply substantive edit to supporting evidence
      const ev = await getEvidence(studyId, "EV-101");
      const editResult = applySubstantiveEvidenceEdit(ev!, {
        rawEvidence: "Substantially altered: Solar battery actually works fine through 5:00 PM.",
      });
      expect(editResult.requiredRevalidation).toBe(true);
      await saveEvidence({ ...editResult.updated, studyId });

      // Finding in storage must be transitioned to Needs Review with plain warning
      const findingAfter = await getFinding(studyId, "FND-101");
      expect(findingAfter?.validationStatus).toBe("Needs Review");
      expect(findingAfter?.staleDependencyWarning).toBe(
        "Supporting evidence changed after this Finding was reviewed. Review the highlighted evidence before approving this Finding again."
      );

      // Downstream export model must exclude both finding and recommendation
      const studyAfter = await assembleStudy(studyId);
      const modelAfter = buildBriefExportModel(studyAfter!);
      expect(modelAfter.findings.map((f) => f.id)).not.toContain("FND-101");
      expect(modelAfter.recommendations.map((r) => r.id)).not.toContain("REC-101");

      // Recommendation warning must explain parent needs review
      const rec = await getRecommendation(studyId, "REC-101");
      const warning = getRecommendationDependencyWarning(rec!, findingAfter);
      expect(warning).toContain("Supporting evidence changed after this Finding was reviewed");
    });
  });

  // ============================================================================
  // 2. Wrong-Order Approval Invariant
  // ============================================================================
  describe("2. Wrong-Order Approval Invariant", () => {
    it("rejects finding approval when supporting evidence is still Needs Review", async () => {
      // Put evidence into Needs Review
      await saveEvidence({ ...sampleEvidence, validationStatus: "Needs Review" });

      const inReviewFinding: Finding = {
        ...sampleFinding,
        validationStatus: "Needs Review",
      };

      const evInDb = await getEvidence(studyId, "EV-101");
      expect(evInDb?.validationStatus).toBe("Needs Review");

      // Deliberately attempt wrong order approval: approve finding while evidence is unreviewed
      expect(() => {
        validateArtifact(inReviewFinding, "Lead Evaluator", undefined, {
          evidence: [evInDb!],
          sources: [sampleSource],
        });
      }).toThrow(/Supporting evidence "EV-101" is not yet (validated|qualified for analytical use)/i);
    });
  });

  // ============================================================================
  // 3. Correct-Order Restoration Invariant
  // ============================================================================
  describe("3. Correct-Order Restoration Invariant", () => {
    it("restores formal eligibility only after evidence is reviewed, then finding deliberately approved", async () => {
      // 1. Evidence gets edited -> Needs Review -> Finding stale
      const ev = await getEvidence(studyId, "EV-101");
      const editResult = applySubstantiveEvidenceEdit(ev!, {
        rawEvidence: "Updated field note: Battery depleted at 1:00 PM.",
      });
      await saveEvidence({ ...editResult.updated, studyId });

      // 2. Step 1: Re-review and validate Evidence
      const evToValidate = await getEvidence(studyId, "EV-101");
      const validatedEv = validateArtifact(evToValidate!, "Lead Field Evaluator");
      await saveEvidence({ ...validatedEv, studyId });
      expect(validatedEv.validationStatus).toBe("Validated");

      // At this point, Finding is still Needs Review and ineligible until deliberately re-approved
      const findingBeforeReval = await getFinding(studyId, "FND-101");
      expect(findingBeforeReval?.validationStatus).toBe("Needs Review");
      const intermediateStudy = await assembleStudy(studyId);
      const intermediateModel = buildBriefExportModel(intermediateStudy!);
      expect(intermediateModel.findings).toHaveLength(0);
      expect(intermediateModel.recommendations).toHaveLength(0);

      // 3. Step 2: Deliberately validate Finding with updated evidence context
      const validatedFinding = validateArtifact(
        findingBeforeReval!,
        "Senior Team Lead",
        undefined,
        {
          evidence: [validatedEv],
          sources: [sampleSource],
        }
      );
      await saveFinding({ ...validatedFinding, studyId });
      expect(validatedFinding.validationStatus).toBe("Validated");
      expect(validatedFinding.staleDependencyWarning).toBeUndefined();

      // 4. Step 3: Eligibility is restored for both finding and recommendation
      const restoredStudy = await assembleStudy(studyId);
      const restoredModel = buildBriefExportModel(restoredStudy!);
      expect(restoredModel.findings.map((f) => f.id)).toContain("FND-101");
      expect(restoredModel.recommendations.map((r) => r.id)).toContain("REC-101");
    });
  });

  // ============================================================================
  // 4. Challenging Evidence Invariant
  // ============================================================================
  describe("4. Challenging Evidence Invariant", () => {
    it("substantive change to challenging evidence cascades invalidation to Finding", async () => {
      const challengingEv: EvidenceEntry & { studyId: StudyId } = {
        id: "EV-CHALLENGE-01",
        studyId,
        sourceId: "SRC-101",
        rawEvidence: "Diesel backup log indicates continuous power on Tuesdays.",
        primaryTheme: "Access",
        secondaryTheme: "",
        stakeholderType: "Teachers",
        evidenceStrength: "Medium",
        sensitivityFlag: "None",
        qaStatus: "Reviewed",
        validationStatus: "Validated",
        revision: 1,
        potentialFinding: "",
      };
      await saveEvidence(challengingEv);

      await saveFinding({
        ...sampleFinding,
        contradictoryEvidenceIds: ["EV-CHALLENGE-01"],
        contradictoryEvidence: "Diesel generator operational on Tuesdays.",
      });

      // Substantive edit to challenging evidence
      const editResult = applySubstantiveEvidenceEdit(challengingEv, {
        rawEvidence: "REVISED: Diesel logbook was falsified and generator was inoperative.",
      });
      await saveEvidence({ ...editResult.updated, studyId });

      // Finding must be invalidated and transitioned to Needs Review
      const findingInStorage = await getFinding(studyId, "FND-101");
      expect(findingInStorage?.validationStatus).toBe("Needs Review");
      expect(findingInStorage?.staleDependencyWarning).toContain("Challenging evidence changed");

      // Export model must exclude finding
      const study = await assembleStudy(studyId);
      const model = buildBriefExportModel(study!);
      expect(model.findings.map((f) => f.id)).not.toContain("FND-101");
    });
  });

  // ============================================================================
  // 5. Batch Mutation Routes Invariant
  // ============================================================================
  describe("5. Batch Mutation Routes Invariant", () => {
    it("saveEvidenceBatch substantive edits trigger the same invalidation cascade", async () => {
      const ev = await getEvidence(studyId, "EV-101");
      const alteredEv: EvidenceEntry & { studyId: StudyId } = {
        ...ev!,
        studyId,
        rawEvidence: "Batch-altered observation: totally different finding premise.",
        validationStatus: "Needs Review",
      };

      await saveEvidenceBatch([alteredEv]);

      const findingInStorage = await getFinding(studyId, "FND-101");
      expect(findingInStorage?.validationStatus).toBe("Needs Review");
      expect(findingInStorage?.staleDependencyWarning).toContain("Supporting evidence changed");
    });

    it("bulkAssignEvidenceTheme demotes validated evidence and cascades invalidation to Finding", async () => {
      // Re-assign theme of EV-101 from 'Access' to 'Governance'
      await bulkAssignEvidenceTheme(studyId, ["EV-101"], "Governance");

      const evInStorage = await getEvidence(studyId, "EV-101");
      expect(evInStorage?.primaryTheme).toBe("Governance");
      expect(evInStorage?.validationStatus).toBe("Needs Review");

      const findingInStorage = await getFinding(studyId, "FND-101");
      expect(findingInStorage?.validationStatus).toBe("Needs Review");
      expect(findingInStorage?.staleDependencyWarning).toContain("Supporting evidence changed");
    });

    it("bulkAssignEvidenceToQuestion demotes validated evidence and cascades invalidation to Finding", async () => {
      await bulkAssignEvidenceToQuestion(studyId, ["EV-101"], "Q-999");

      const evInStorage = await getEvidence(studyId, "EV-101");
      expect(evInStorage?.studyQuestionIds).toContain("Q-999");
      expect(evInStorage?.validationStatus).toBe("Needs Review");

      const findingInStorage = await getFinding(studyId, "FND-101");
      expect(findingInStorage?.validationStatus).toBe("Needs Review");
    });
  });

  // ============================================================================
  // 6. Source Deletion & Parent Integrity Invariant
  // ============================================================================
  describe("6. Source Deletion & Parent Integrity Invariant", () => {
    it("blocks source deletion when dependent evidence exists", async () => {
      await expect(deleteSource(studyId, "SRC-101")).rejects.toThrow(
        /Cannot delete Source "SRC-101": 1 Evidence entry\/entries currently depend on this Source/i
      );
    });

    it("allows source deletion when no evidence depends on it", async () => {
      const unusedSource: SourceRecord & { studyId: StudyId } = {
        id: "SRC-UNUSED",
        studyId,
        title: "Unused source",
        sourceType: "Document",
        date: "2026-03-11",
        stakeholderType: "General",
        location: "Site-1",
        summary: "No evidence linked",
        sensitivityFlag: "None",
      };
      await saveSource(unusedSource);
      await expect(deleteSource(studyId, "SRC-UNUSED")).resolves.toBeUndefined();
    });
  });

  // ============================================================================
  // 7. Missing Parents & Cross-Study Integrity Invariant
  // ============================================================================
  describe("7. Missing Parents & Cross-Study Integrity Invariant", () => {
    it("isFindingExportEligible returns false if parent source is missing", () => {
      const contextWithoutSource: CanonicalExportContext = {
        sources: [], // Source missing!
        evidence: [sampleEvidence],
        findings: [sampleFinding],
        isLegacyDemo: false,
      };

      expect(isFindingExportEligible(sampleFinding, contextWithoutSource)).toBe(false);
    });

    it("isRecommendationExportEligible returns false if parent finding is missing", () => {
      const contextWithoutFinding: CanonicalExportContext = {
        sources: [sampleSource],
        evidence: [sampleEvidence],
        findings: [], // Finding missing!
        isLegacyDemo: false,
      };

      expect(
        isRecommendationExportEligible(sampleRecommendation, contextWithoutFinding)
      ).toBe(false);
    });
  });

  // ============================================================================
  // 8. 100% Export Parity Invariant
  // ============================================================================
  describe("8. 100% Export Parity Invariant", () => {
    it("guarantees exact same eligible items across BriefExportModel and Markdown", async () => {
      // Add a mix of artifacts: eligible, draft, needs review, stale
      const draftFinding: Finding & { studyId: StudyId } = {
        id: "FND-DRAFT",
        studyId,
        statement: "Draft finding statement",
        explanation: "Draft explanation",
        supportingEvidenceIds: ["EV-101"],
        contradictoryEvidence: "",
        contradictoryEvidenceIds: [],
        evidenceStrength: "Low",
        programmeImplication: "Draft implication",
        linkedRecommendationIds: [],
        validationStatus: "Draft",
        revision: 1,
      };
      await saveFinding(draftFinding);

      const staleFinding: Finding & { studyId: StudyId } = {
        id: "FND-STALE",
        studyId,
        statement: "Stale finding statement",
        explanation: "Stale explanation",
        supportingEvidenceIds: ["EV-101"],
        contradictoryEvidence: "",
        contradictoryEvidenceIds: [],
        evidenceStrength: "Medium",
        programmeImplication: "Stale implication",
        linkedRecommendationIds: [],
        validationStatus: "Validated",
        staleDependencyWarning: "Supporting evidence changed after this Finding was reviewed.",
        revision: 2,
      };
      await saveFinding(staleFinding);

      const study = await assembleStudy(studyId);
      expect(study).toBeDefined();

      const model = buildBriefExportModel(study!, false);
      const markdown = generateLearningBriefMarkdown(study!, false);

      // Model contains ONLY the eligible finding and recommendation
      expect(model.findings.map((f) => f.id)).toEqual(["FND-101"]);
      expect(model.recommendations.map((r) => r.id)).toEqual(["REC-101"]);

      // Ineligible items must be completely absent from both model and markdown
      expect(model.findings.some((f) => f.id === "FND-DRAFT")).toBe(false);
      expect(model.findings.some((f) => f.id === "FND-STALE")).toBe(false);

      expect(markdown).toContain("FND-101");
      expect(markdown).toContain("REC-101");
      expect(markdown).not.toContain("FND-DRAFT");
      expect(markdown).not.toContain("FND-STALE");
    });
  });

  // ============================================================================
  // 9. Legacy Demo Isolation Invariant
  // ============================================================================
  describe("9. Legacy Demo Isolation Invariant", () => {
    it("legacy demo mode does not validate editable live study artifacts", () => {
      const liveFinding: Finding = {
        ...sampleFinding,
        validationStatus: "Needs Review",
      };

      // Live editable context: Must be rejected
      const liveContext: CanonicalExportContext = {
        sources: [sampleSource],
        evidence: [sampleEvidence],
        findings: [liveFinding],
        isLegacyDemo: false,
      };
      expect(isFindingExportEligible(liveFinding, liveContext)).toBe(false);

      // Explicit legacy demo mode evaluates legacy demo artifacts
      const demoContext: CanonicalExportContext = {
        isLegacyDemo: true,
      };
      expect(isFindingExportEligible(sampleFinding, demoContext)).toBe(true);
    });
  });

  // ============================================================================
  // 10. Optional Formal Outputs Invariant (Lessons & Good Practices)
  // ============================================================================
  describe("10. Optional Formal Outputs Invariant", () => {
    it("excludes lessons and good practices if referenced evidence is unvalidated", async () => {
      const lesson: LessonLearned & { studyId: StudyId } = {
        id: "LES-001",
        studyId,
        statement: "Regular battery maintenance preserves instructional uptime.",
        whatWorkedOrDidNotWork: "Preventative checks work.",
        whyItHappened: "Early replacement prevents abrupt failure.",
        conditionsRequired: "Dedicated technician.",
        evidenceBase: ["EV-101"],
        transferability: "Applicable to all solar-powered sites.",
        validationStatus: "Validated",
        revision: 1,
      };
      await saveLesson(lesson);

      const goodPractice: GoodPractice & { studyId: StudyId } = {
        id: "GP-001",
        studyId,
        title: "Daily solar charge level logging",
        description: "Staff record charge readings at 9 AM and 1 PM.",
        whyItWorked: "Identifies capacity decline before class disruption.",
        evidenceBase: ["EV-101"],
        conditionsForReplication: "Digital or paper logbook.",
        risksLimits: "Requires compliance.",
        recommendedUse: "Standard operating procedure.",
        validationStatus: "Validated",
        revision: 1,
      };
      await saveGoodPractice(goodPractice);

      // Initially both are export-eligible
      const studyValid = await assembleStudy(studyId);
      const modelValid = buildBriefExportModel(studyValid!);
      expect(modelValid.lessons.map((l) => l.id)).toContain("LES-001");
      expect(modelValid.goodPractices.map((g) => g.id)).toContain("GP-001");

      // Now demote EV-101 to Needs Review
      await saveEvidence({ ...sampleEvidence, validationStatus: "Needs Review" });

      const studyInval = await assembleStudy(studyId);
      const modelInval = buildBriefExportModel(studyInval!);
      expect(modelInval.lessons.map((l) => l.id)).not.toContain("LES-001");
      expect(modelInval.goodPractices.map((g) => g.id)).not.toContain("GP-001");
    });
  });
});
