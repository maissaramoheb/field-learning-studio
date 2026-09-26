import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  clearAllStores,
  saveStudyMeta,
  saveSource,
  saveEvidence,
  saveFinding,
  saveRecommendation,
  saveStudyQuestion,
  deleteStudyQuestion,
  savePatternNote,
  deletePatternNote,
  bulkAssignEvidenceToQuestion,
  bulkAssignEvidenceTheme,
  assembleStudy,
  bootstrapDemoTemplates,
} from "@/lib/storage";
import {
  getNextQuestionId,
  getNextPatternId,
} from "@/lib/idGenerator";
import {
  submitForReview,
  validateArtifact,
  rejectArtifact,
  reopenRejectedArtifact,
  isSubstantiveFindingChange,
  applySubstantiveFindingEdit,
  isRecommendationExportEligible,
  getRecommendationDependencyWarning,
  requiresFindingLimitationNote,
} from "@/lib/validation";
import { computeSupportProfile } from "@/lib/analytics/supportProfile";
import { buildBriefExportModel } from "@/lib/buildBriefExportModel";
import type {
  StudyMeta,
  StudyQuestion,
  PatternNote,
  SourceRecord,
  EvidenceEntry,
  Finding,
  Recommendation,
} from "@/lib/types";

describe("Phase 6: Study Framework & Synthesis Workbench Test Suite", () => {
  const testStudyId = "study-synthesis-eval";

  const sampleMeta: StudyMeta = {
    id: testStudyId,
    title: "School Nutrition Governance & Access Study",
    subtitle: "Evaluating meal distribution equity across Minya and Assiut",
    status: "Active Fieldwork",
    context: "Field mission assessing nutrition delivery, supply consistency, and community trust.",
    isDemoCase: false,
    scope: {
      targetThemes: ["Nutrition Access", "Supply Chain", "Governance"],
      targetStakeholderGroups: ["Teachers", "Parents", "Students", "Kitchen Staff"],
      targetSites: ["Minya Rural", "Assiut Urban"],
    },
    executiveSummary: "Ongoing evaluation.",
    keyMessages: [],
    limitations: [],
    questions: [],
    patternNotes: [],
    outputConfig: {
      includeRecommendations: true,
      includeLessons: false,
      includeGoodPractices: false,
    },
  };

  const sampleSources: SourceRecord[] = [
    {
      id: "SRC-001",
      studyId: testStudyId,
      sourceType: "Key Informant Interview",
      title: "KII with Minya Head Teacher",
      participantRole: "School Leadership",
      participantCount: 1,
      siteId: "Minya Rural",
      date: "2026-03-10",
      collectionMethod: "Key Informant Interview",
      consentStatus: "Written",
      anonymizationStatus: "Pseudonymized",
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: "SRC-002",
      studyId: testStudyId,
      sourceType: "Focus Group Discussion",
      title: "FGD with Assiut Mothers",
      participantRole: "Parents",
      participantCount: 8,
      siteId: "Assiut Urban",
      date: "2026-03-11",
      collectionMethod: "Focus Group Discussion",
      consentStatus: "Oral",
      anonymizationStatus: "Pseudonymized",
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: "SRC-003",
      studyId: testStudyId,
      sourceType: "Direct Observation",
      title: "Meal Serving Observation at Minya School",
      participantRole: "School Community",
      participantCount: 50,
      siteId: "Minya Rural",
      date: "2026-03-12",
      collectionMethod: "Direct Observation",
      consentStatus: "Not Required / Public Source",
      anonymizationStatus: "Anonymized",
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  const sampleEvidence: EvidenceEntry[] = [
    {
      id: "EV-001",
      studyId: testStudyId,
      sourceId: "SRC-001",
      siteId: "Minya Rural",
      stakeholderType: "Teachers",
      rawEvidence: "Meal delivery truck arrived 90 minutes after morning break.",
      rawObservation: "Meal delivery truck arrived 90 minutes after morning break.",
      interpretation: "Late arrivals cause meals to spoil in heat before distribution.",
      potentialFinding: "Delivery delays prevent regular student meal access.",
      primaryTheme: "Nutrition Access",
      evidenceStrength: "High",
      sensitivityFlag: "None",
      qaStatus: "Reviewed",
      validationStatus: "Validated",
      revision: 1,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: "EV-002",
      studyId: testStudyId,
      sourceId: "SRC-002",
      siteId: "Assiut Urban",
      stakeholderType: "Parents",
      rawEvidence: "Parents report meals frequently arrive cold and during lesson hours.",
      rawObservation: "Parents report meals frequently arrive cold and during lesson hours.",
      interpretation: "Cross-district logistics bottlenecks disrupt feeding schedules.",
      potentialFinding: "Delivery delays prevent regular student meal access.",
      primaryTheme: "Nutrition Access",
      evidenceStrength: "High",
      sensitivityFlag: "None",
      qaStatus: "Reviewed",
      validationStatus: "Validated",
      revision: 1,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: "EV-003",
      studyId: testStudyId,
      sourceId: "SRC-003",
      siteId: "Minya Rural",
      stakeholderType: "Teachers",
      rawEvidence: "Observed 120 meal boxes stacked outdoors under sunlight without cold storage.",
      rawObservation: "Observed 120 meal boxes stacked outdoors under sunlight without cold storage.",
      interpretation: "Lack of cold chain storage at school gates compromises food safety.",
      potentialFinding: "Storage conditions fail during transit delays.",
      primaryTheme: "Supply Chain",
      evidenceStrength: "High",
      sensitivityFlag: "Low",
      qaStatus: "Reviewed",
      validationStatus: "Validated",
      revision: 1,
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  beforeEach(async () => {
    await clearAllStores();
    await saveStudyMeta(sampleMeta);
    for (const src of sampleSources) {
      await saveSource(src);
    }
    for (const ev of sampleEvidence) {
      await saveEvidence(ev);
    }
  });

  describe("1. Study Questions CRUD & ID Generation", () => {
    it("generates sequential stable IDs (RQ-001, RQ-002)", () => {
      expect(getNextQuestionId([])).toBe("RQ-001");
      expect(getNextQuestionId(["RQ-001"])).toBe("RQ-002");
      expect(getNextQuestionId(["RQ-001", "RQ-005"])).toBe("RQ-006");
    });

    it("saves and retrieves study questions in StudyMeta", async () => {
      const q1: StudyQuestion = {
        id: "RQ-001",
        question: "What factors affect children's actual access to school meals?",
        shortLabel: "Meal Access Factors",
        criterion: "Effectiveness",
        isActive: true,
        createdAt: 1000,
        updatedAt: 1000,
      };

      await saveStudyQuestion(testStudyId, q1);
      const study = await assembleStudy(testStudyId);
      expect(study?.questions).toHaveLength(1);
      expect(study?.questions?.[0].id).toBe("RQ-001");
      expect(study?.questions?.[0].question).toBe(q1.question);
      expect(study?.questions?.[0].criterion).toBe("Effectiveness");
    });

    it("updates existing study question in place", async () => {
      const q1: StudyQuestion = {
        id: "RQ-001",
        question: "Initial question text",
        isActive: true,
        createdAt: 1000,
        updatedAt: 1000,
      };
      await saveStudyQuestion(testStudyId, q1);

      const updatedQ1: StudyQuestion = {
        ...q1,
        question: "Updated analytical question text",
        shortLabel: "Updated Theme",
        updatedAt: 2000,
      };
      await saveStudyQuestion(testStudyId, updatedQ1);

      const study = await assembleStudy(testStudyId);
      expect(study?.questions).toHaveLength(1);
      expect(study?.questions?.[0].question).toBe("Updated analytical question text");
      expect(study?.questions?.[0].shortLabel).toBe("Updated Theme");
    });

    it("deletes study question and unassigns evidence mapped to it", async () => {
      const q1: StudyQuestion = {
        id: "RQ-001",
        question: "To be deleted question",
        isActive: true,
        createdAt: 1000,
        updatedAt: 1000,
      };
      await saveStudyQuestion(testStudyId, q1);
      await bulkAssignEvidenceToQuestion(testStudyId, ["EV-001", "EV-002"], "RQ-001");

      let study = await assembleStudy(testStudyId);
      expect(study?.questions).toHaveLength(1);
      expect(study?.evidence.find((e) => e.id === "EV-001")?.studyQuestionIds).toContain("RQ-001");

      await deleteStudyQuestion(testStudyId, "RQ-001");
      study = await assembleStudy(testStudyId);
      expect(study?.questions).toHaveLength(0);
      expect(study?.evidence.find((e) => e.id === "EV-001")?.studyQuestionIds).toEqual([]);
      expect(study?.evidence.find((e) => e.id === "EV-002")?.studyQuestionIds).toEqual([]);
    });

    it("preserves backward compatibility when questions field is omitted", async () => {
      const legacyMeta: StudyMeta = {
        ...sampleMeta,
        questions: undefined,
        patternNotes: undefined,
      };
      await saveStudyMeta(legacyMeta);
      const study = await assembleStudy(testStudyId);
      expect(study?.questions).toBeUndefined();
      // Application handles study.questions || [] gracefully
      const safeQuestions = study?.questions || [];
      expect(safeQuestions).toEqual([]);
    });
  });

  describe("2. Evidence Mapping & Bulk Operations", () => {
    it("bulk assigns multiple evidence entries to a study question", async () => {
      await bulkAssignEvidenceToQuestion(testStudyId, ["EV-001", "EV-002"], "RQ-001");
      const study = await assembleStudy(testStudyId);

      const ev1 = study?.evidence.find((e) => e.id === "EV-001");
      const ev2 = study?.evidence.find((e) => e.id === "EV-002");
      const ev3 = study?.evidence.find((e) => e.id === "EV-003");

      expect(ev1?.studyQuestionIds).toEqual(["RQ-001"]);
      expect(ev2?.studyQuestionIds).toEqual(["RQ-001"]);
      expect(ev3?.studyQuestionIds || []).toEqual([]);
    });

    it("correctly identifies unassigned validated evidence", async () => {
      await bulkAssignEvidenceToQuestion(testStudyId, ["EV-001"], "RQ-001");
      const study = await assembleStudy(testStudyId);
      const unassigned = study?.evidence.filter(
        (e) => !e.studyQuestionIds || e.studyQuestionIds.length === 0
      );

      expect(unassigned?.map((e) => e.id)).toEqual(["EV-002", "EV-003"]);
    });

    it("bulk updates primaryTheme across selected evidence entries", async () => {
      await bulkAssignEvidenceTheme(testStudyId, ["EV-001", "EV-002"], "Logistics & Transport");
      const study = await assembleStudy(testStudyId);

      expect(study?.evidence.find((e) => e.id === "EV-001")?.primaryTheme).toBe("Logistics & Transport");
      expect(study?.evidence.find((e) => e.id === "EV-002")?.primaryTheme).toBe("Logistics & Transport");
      expect(study?.evidence.find((e) => e.id === "EV-003")?.primaryTheme).toBe("Supply Chain");
    });
  });

  describe("3. Working Patterns Sensemaking", () => {
    it("generates sequential stable IDs (PAT-001, PAT-002)", () => {
      expect(getNextPatternId([])).toBe("PAT-001");
      expect(getNextPatternId(["PAT-001"])).toBe("PAT-002");
      expect(getNextPatternId(["PAT-001", "PAT-009"])).toBe("PAT-010");
    });

    it("creates, saves, and deletes pattern notes", async () => {
      const p1: PatternNote = {
        id: "PAT-001",
        studyId: testStudyId,
        statement: "Transit delays correlate with extreme heat in rural districts.",
        evidenceIds: ["EV-001", "EV-003"],
        questionId: "RQ-001",
        theme: "Logistics",
        contradictionNote: "Assiut parent FGD suggests delivery timing was better during winter.",
        createdAt: 1000,
        updatedAt: 1000,
      };

      await savePatternNote(testStudyId, p1);
      let study = await assembleStudy(testStudyId);
      expect(study?.patternNotes).toHaveLength(1);
      expect(study?.patternNotes?.[0].id).toBe("PAT-001");
      expect(study?.patternNotes?.[0].evidenceIds).toEqual(["EV-001", "EV-003"]);

      await deletePatternNote(testStudyId, "PAT-001");
      study = await assembleStudy(testStudyId);
      expect(study?.patternNotes).toHaveLength(0);
    });
  });

  describe("4. Defensible Finding Authoring & Live Support Profiles", () => {
    it("computes Support Profile accurately with triangulation metrics", () => {
      const testFinding: Finding = {
        id: "FND-001",
        statement: "Late meal distribution appears to reduce consistent access to school meals.",
        explanation: "Delivery delays prevent regular student feeding schedules in both districts.",
        supportingEvidenceIds: ["EV-001", "EV-002", "EV-003"],
        contradictoryEvidence: "",
        evidenceStrength: "High",
        programmeImplication: "Centralize dispatch tracking and establish local buffer storage.",
        linkedRecommendationIds: [],
        studyQuestionId: "RQ-001",
        validationStatus: "Draft",
        revision: 1,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const profile = computeSupportProfile(
        testFinding,
        sampleMeta.scope,
        sampleEvidence,
        sampleSources
      );

      expect(testFinding.supportingEvidenceIds.length).toBe(3);
      expect(profile.independentSourceCount).toBe(3); // SRC-001, SRC-002, SRC-003
      expect(profile.siteCoverage.sitesFound).toContain("Minya Rural");
      expect(profile.siteCoverage.sitesFound).toContain("Assiut Urban");
      expect(profile.stakeholderCoverage.stakeholdersFound).toContain("Teachers");
      expect(profile.stakeholderCoverage.stakeholdersFound).toContain("Parents");
      expect(profile.supportTier).toBe("Partially Supported");
      expect(profile.methodDiversity.methodsFound).toContain("Key Informant Interview");
      expect(profile.methodDiversity.methodsFound).toContain("Focus Group Discussion");
      expect(profile.methodDiversity.methodsFound).toContain("Direct Observation");
    });

    it("evaluates limitation note requirement for Emerging findings or coverage gaps", () => {
      // Single source finding -> Emerging tier
      const singleSourceFinding: Finding = {
        id: "FND-002",
        statement: "Single source claim about kitchen supplies.",
        explanation: "Observed in one school only.",
        supportingEvidenceIds: ["EV-001"],
        contradictoryEvidence: "",
        evidenceStrength: "Low",
        programmeImplication: "Inspect kitchens.",
        linkedRecommendationIds: [],
        validationStatus: "Draft",
        revision: 1,
      };

      const profile = computeSupportProfile(
        singleSourceFinding,
        sampleMeta.scope,
        sampleEvidence,
        sampleSources
      );

      expect(profile.supportTier).toBe("Emerging");
      // Requires limitation note before validation
      expect(requiresFindingLimitationNote(singleSourceFinding, profile)).toBe(true);

      // With limitation note attached
      const findingWithLimitation: Finding = {
        ...singleSourceFinding,
        limitationNote: "Observed in one rural facility only; requires district-wide survey.",
      };
      expect(requiresFindingLimitationNote(findingWithLimitation, profile)).toBe(false);
    });
  });

  describe("5. Finding Validation Lifecycle & Substantive Changes", () => {
    it("follows full validation lifecycle: Draft -> Needs Review -> Validated", () => {
      const draftFinding: Finding = {
        id: "FND-001",
        statement: "Validated finding statement",
        explanation: "Detailed explanation",
        supportingEvidenceIds: ["EV-001"],
        contradictoryEvidence: "",
        evidenceStrength: "Medium",
        programmeImplication: "Action required",
        linkedRecommendationIds: [],
        validationStatus: "Draft",
        revision: 1,
      };

      const inReview = submitForReview(draftFinding);
      expect(inReview.validationStatus).toBe("Needs Review");

      const validated = validateArtifact(inReview, "Lead Evaluator", "Evaluated against field notes.");
      expect(validated.validationStatus).toBe("Validated");
      expect(validated.lastValidatedBy).toBe("Lead Evaluator");
      expect(validated.limitationNote).toBe("Evaluated against field notes.");
    });

    it("detects substantive finding changes and enforces re-validation", () => {
      const validatedFinding: Finding = {
        id: "FND-001",
        statement: "Original validated finding statement",
        explanation: "Original explanation",
        supportingEvidenceIds: ["EV-001", "EV-002"],
        contradictoryEvidence: "",
        evidenceStrength: "High",
        programmeImplication: "Original implication",
        linkedRecommendationIds: [],
        validationStatus: "Validated",
        revision: 1,
      };

      // Trivial edit: no change
      expect(isSubstantiveFindingChange(validatedFinding, { ...validatedFinding })).toBe(false);

      // Substantive edit: statement modified
      expect(
        isSubstantiveFindingChange(validatedFinding, {
          ...validatedFinding,
          statement: "Substantively modified finding claim",
        })
      ).toBe(true);

      // Substantive edit: supporting evidence IDs changed
      expect(
        isSubstantiveFindingChange(validatedFinding, {
          ...validatedFinding,
          supportingEvidenceIds: ["EV-001"],
        })
      ).toBe(true);

      // Substantive edit: contradiction added
      expect(
        isSubstantiveFindingChange(validatedFinding, {
          ...validatedFinding,
          contradictoryEvidence: "Teachers later disputed this claim.",
        })
      ).toBe(true);

      // Apply substantive edit: increments revision and reverts to Needs Review
      const edited = applySubstantiveFindingEdit(
        validatedFinding,
        { ...validatedFinding, statement: "Revised claim" },
        "Finding claim substantively altered after second debrief."
      );

      expect(edited.requiredRevalidation).toBe(true);
      expect(edited.updated.revision).toBe(2);
      expect(edited.updated.validationStatus).toBe("Needs Review");
      expect(edited.updated.previousValidationStatus).toBe("Validated");
    });

    it("supports rejection with mandatory rationale and reopening", () => {
      const inReviewFinding: Finding = {
        id: "FND-001",
        statement: "Finding under review",
        explanation: "Explanation",
        supportingEvidenceIds: ["EV-001"],
        contradictoryEvidence: "",
        evidenceStrength: "Medium",
        programmeImplication: "Implication",
        linkedRecommendationIds: [],
        validationStatus: "Needs Review",
        revision: 1,
      };

      const rejected = rejectArtifact(inReviewFinding, "Insufficient multi-source triangulation.");
      expect(rejected.validationStatus).toBe("Rejected");
      expect(rejected.rejectionReason).toBe("Insufficient multi-source triangulation.");

      const reopened = reopenRejectedArtifact(rejected);
      expect(reopened.validationStatus).toBe("Draft");
      expect(reopened.previousValidationStatus).toBe("Rejected");
    });
  });

  describe("6. Downstream Recommendations & Dependency Integrity", () => {
    const parentFinding: Finding = {
      id: "FND-001",
      statement: "Late meal distribution appears to reduce consistent access to school meals.",
      explanation: "Delivery delays prevent regular student feeding schedules.",
      supportingEvidenceIds: ["EV-001", "EV-002"],
      contradictoryEvidence: "",
      evidenceStrength: "High",
      programmeImplication: "Track delivery schedules.",
      linkedRecommendationIds: ["REC-001"],
      validationStatus: "Validated",
      revision: 1,
    };

    const validRecommendation: Recommendation = {
      id: "REC-001",
      studyId: testStudyId,
      recommendation: "Introduce routine comparison of delivery logs with observed serving times.",
      responsibleActor: "Directorate Logistics Coordinator",
      priority: "High",
      timeframe: "Immediate (1-2 weeks)",
      feasibility: "High",
      riskSensitivity: "Low",
      expectedBenefit: "Ensures accountability of delivery contractors.",
      successIndicator: "Zero unverified late deliveries in school logs.",
      linkedFindingId: "FND-001",
      validationStatus: "Validated",
      revision: 1,
    };

    it("verifies recommendation export eligibility based on linked finding status", () => {
      // Both validated -> eligible
      expect(isRecommendationExportEligible(validRecommendation, parentFinding)).toBe(true);
      expect(getRecommendationDependencyWarning(validRecommendation, parentFinding)).toBeNull();

      // Parent finding is in Draft -> recommendation blocked from export
      const draftParent: Finding = { ...parentFinding, validationStatus: "Draft" };
      expect(isRecommendationExportEligible(validRecommendation, draftParent)).toBe(false);
      expect(getRecommendationDependencyWarning(validRecommendation, draftParent)).toBe(
        "Linked Finding requires re-validation"
      );

      // Parent finding is in Needs Review -> recommendation blocked
      const reviewParent: Finding = { ...parentFinding, validationStatus: "Needs Review" };
      expect(isRecommendationExportEligible(validRecommendation, reviewParent)).toBe(false);
      expect(getRecommendationDependencyWarning(validRecommendation, reviewParent)).toBe(
        "Linked Finding requires re-validation"
      );

      // Recommendation itself is in Draft -> blocked
      const draftRec: Recommendation = { ...validRecommendation, validationStatus: "Draft" };
      expect(isRecommendationExportEligible(draftRec, parentFinding)).toBe(false);
    });

    it("drops recommendation export eligibility when parent finding undergoes substantive edit", () => {
      expect(isRecommendationExportEligible(validRecommendation, parentFinding)).toBe(true);

      // Substantive edit applied to parent finding -> reverts to Needs Review
      const editedParent = applySubstantiveFindingEdit(
        parentFinding,
        { ...parentFinding, statement: "Altered finding statement" },
        "Substantive adjustment"
      );

      expect(editedParent.updated.validationStatus).toBe("Needs Review");
      expect(isRecommendationExportEligible(validRecommendation, editedParent.updated)).toBe(false);

      // Re-validate parent finding -> recommendation becomes export-eligible again
      const revalidatedParent = validateArtifact(editedParent.updated, "Senior Lead Evaluator");
      expect(revalidatedParent.validationStatus).toBe("Validated");
      expect(isRecommendationExportEligible(validRecommendation, revalidatedParent)).toBe(true);
    });
  });

  describe("7. Export Boundary Verification & Parity", () => {
    it("preserves Phase 0 parity for demo cases without data loss", async () => {
      await bootstrapDemoTemplates();
      const demoStudy = await assembleStudy("community-bridges");
      expect(demoStudy).not.toBeNull();

      if (demoStudy) {
        const exportModel = buildBriefExportModel(demoStudy);
        expect(exportModel.findings.length).toBeGreaterThanOrEqual(1);
        expect(exportModel.recommendations.length).toBeGreaterThanOrEqual(1);
        expect(exportModel.lessons.length).toBeGreaterThanOrEqual(1);
        expect(exportModel.goodPractices.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("strictly filters unvalidated artifacts from export in editable studies", async () => {
      const validatedFinding: Finding = {
        id: "FND-001",
        statement: "Validated finding included in brief export.",
        explanation: "Thoroughly evidenced.",
        supportingEvidenceIds: ["EV-001", "EV-002"],
        contradictoryEvidence: "",
        evidenceStrength: "High",
        programmeImplication: "Standardize process.",
        linkedRecommendationIds: ["REC-001"],
        validationStatus: "Validated",
        revision: 1,
      };

      const draftFinding: Finding = {
        id: "FND-002",
        statement: "Draft finding must NOT appear in export brief.",
        explanation: "Preliminary observation.",
        supportingEvidenceIds: ["EV-003"],
        contradictoryEvidence: "",
        evidenceStrength: "Low",
        programmeImplication: "Investigate further.",
        linkedRecommendationIds: [],
        validationStatus: "Draft",
        revision: 1,
      };

      const validatedRec: Recommendation = {
        id: "REC-001",
        studyId: testStudyId,
        recommendation: "Validated recommendation included in brief export.",
        responsibleActor: "Logistics Team",
        priority: "High",
        timeframe: "Immediate",
        feasibility: "High",
        riskSensitivity: "Low",
        expectedBenefit: "Direct impact",
        successIndicator: "Metric A",
        linkedFindingId: "FND-001",
        validationStatus: "Validated",
        revision: 1,
      };

      const unvalidatedRec: Recommendation = {
        id: "REC-002",
        studyId: testStudyId,
        recommendation: "Draft recommendation linked to draft finding must NOT appear.",
        responsibleActor: "Field Team",
        priority: "Medium",
        timeframe: "Long-term",
        feasibility: "Medium",
        riskSensitivity: "Low",
        expectedBenefit: "Unknown",
        successIndicator: "Metric B",
        linkedFindingId: "FND-002",
        validationStatus: "Draft",
        revision: 1,
      };

      await saveFinding({ ...validatedFinding, studyId: testStudyId });
      await saveFinding({ ...draftFinding, studyId: testStudyId });
      await saveRecommendation(validatedRec);
      await saveRecommendation(unvalidatedRec);

      const assembled = await assembleStudy(testStudyId);
      expect(assembled).not.toBeNull();

      if (assembled) {
        const exportModel = buildBriefExportModel(assembled);

        // Validated items appear in export
        expect(exportModel.findings.map((f) => f.id)).toContain("FND-001");
        expect(exportModel.recommendations.map((r) => r.id)).toContain("REC-001");

        // Draft/unvalidated items are excluded from export
        expect(exportModel.findings.map((f) => f.id)).not.toContain("FND-002");
        expect(exportModel.recommendations.map((r) => r.id)).not.toContain("REC-002");
      }
    });
  });
});
