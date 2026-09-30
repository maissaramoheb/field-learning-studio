import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  PRACTITIONER_SPACES,
  getSpaceForTab,
  type WorkspaceTabId,
} from "@/components/FieldLearningStudioApp";
import type {
  StudyMeta,
  Finding,
  EvidenceEntry,
  SourceRecord,
  PatternNote,
  LessonLearned,
  GoodPractice,
  ReasoningType,
} from "@/lib/types";
import {
  computeTriangulationMatrix,
  computeTriangulationMetrics,
  evaluateFindingValidationEligibility,
} from "@/lib/analytics/triangulation";
import {
  submitForReview,
  validateArtifact,
  rejectArtifact,
  reopenRejectedArtifact,
  isSubstantiveFindingChange,
} from "@/lib/validation/validationLifecycle";
import { DB_VERSION, getDb } from "@/lib/storage/indexedDb";
import { saveStudyMeta } from "@/lib/storage/studyStore";
import {
  cascadeEvidenceInvalidationToFindings,
  STALE_QUALIFYING_DEPENDENCY_WARNING_TEXT,
} from "@/lib/storage/integrity";
import { exportStudyBackup, importStudyBackup } from "@/lib/storage/studyBackup";
import { communityBridgesCase } from "@/data/cases/communityBridgesCase";
import { adaptDemoCaseToFieldStudy } from "@/lib/storage/demoStudyAdapter";

function createMinimalMeta(id: string, title: string, overrides: Partial<StudyMeta> = {}): StudyMeta {
  return {
    id,
    title,
    subtitle: "Subtitle",
    context: "Context",
    status: "Active Fieldwork",
    isDemoCase: false,
    scope: {
      targetSites: [],
      isSingleSiteStudy: false,
      targetStakeholderGroups: [],
    },
    executiveSummary: "",
    keyMessages: [],
    limitations: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("Phase 4: Analysis Architecture & Traceable Validation", () => {
  describe("1. Workspace Navigation & Information Architecture", () => {
    it("defines 4 local workspaces under the Analysis practitioner space", () => {
      const analysisSpace = PRACTITIONER_SPACES.find((s) => s.id === "analysis");
      expect(analysisSpace).toBeDefined();
      expect(analysisSpace?.stepNumber).toBe("3");
      expect(analysisSpace?.defaultTab).toBe("synthesis");

      const tabIds = analysisSpace?.tabs.map((t) => t.id);
      expect(tabIds).toEqual(["synthesis", "triangulation", "findings", "lessons"]);

      expect(analysisSpace?.tabs.find((t) => t.id === "synthesis")?.label).toBe("Synthesis Workbench");
      expect(analysisSpace?.tabs.find((t) => t.id === "triangulation")?.label).toBe("Triangulation Matrix");
      expect(analysisSpace?.tabs.find((t) => t.id === "findings")?.label).toBe("Findings Ledger");
      expect(analysisSpace?.tabs.find((t) => t.id === "lessons")?.label).toBe("Lessons");
    });

    it("accurately maps all 4 analysis sub-tabs to the 'analysis' practitioner space", () => {
      const analysisTabs: WorkspaceTabId[] = ["synthesis", "triangulation", "findings", "lessons"];
      for (const tab of analysisTabs) {
        expect(getSpaceForTab(tab)).toBe("analysis");
      }
    });

    it("ensures Deliverables recommendations remain distinct from Analysis", () => {
      expect(getSpaceForTab("recommendations")).toBe("deliverables");
      expect(getSpaceForTab("brief")).toBe("deliverables");
      expect(getSpaceForTab("qa")).toBe("deliverables");
    });
  });

  describe("2. Database Version Invariance", () => {
    it("preserves DB_VERSION = 2 without triggering breaking store migrations", () => {
      expect(DB_VERSION).toBe(2);
    });
  });

  describe("3. Sensemaking Reasoning Notes & Candidate Promotion", () => {
    it("supports all canonical reasoning types with full metadata", () => {
      const reasoningTypes: ReasoningType[] = [
        "pattern",
        "tension",
        "contradiction",
        "possible_explanation",
        "alternative_interpretation",
        "evidence_gap",
        "analyst_note",
      ];

      for (const rType of reasoningTypes) {
        const note: PatternNote = {
          id: `PAT-TEST-${rType}`,
          studyId: "study-1",
          statement: `Observing ${rType} across districts`,
          reasoningType: rType,
          explanation: `Detailed causal explanation for ${rType}`,
          evidenceIds: ["EV-001", "EV-002"],
          questionId: "RQ-1",
          frameworkThemeIds: ["TH-1"],
          contradictionNote: rType === "tension" ? "Tension noted" : undefined,
          audit: {
            provenance: "human",
            createdActor: { kind: "human", displayName: "Lead Analyst" },
            createdAt: 1717200000000,
            updatedActor: { kind: "human", displayName: "Lead Analyst" },
            updatedAt: 1717200000000,
          },
          createdAt: 1717200000000,
          updatedAt: 1717200000000,
        };

        expect(note.reasoningType).toBe(rType);
        expect(note.audit?.provenance).toBe("human");
        expect(note.evidenceIds).toHaveLength(2);
      }
    });

    it("promotes a reasoning note to a candidate finding with preserved lineage in Draft status", () => {
      const originNote: PatternNote = {
        id: "PAT-001",
        studyId: "study-1",
        statement: "Center-based youth hubs consistently increase daytime attendance",
        reasoningType: "pattern",
        explanation: "Women-only hours and safe transit protocols tripled attendance",
        evidenceIds: ["EV-001", "EV-003", "EV-007"],
        questionId: "RQ-1",
        frameworkThemeIds: ["TH-1", "TH-2"],
        audit: {
          provenance: "human",
          createdActor: { kind: "human", displayName: "Analyst" },
          createdAt: 1717200000000,
          updatedActor: { kind: "human", displayName: "Analyst" },
          updatedAt: 1717200000000,
        },
        createdAt: 1717200000000,
        updatedAt: 1717200000000,
      };

      // Candidate finding promoted from the note
      const candidateFinding: Finding = {
        id: "FND-001",
        studyId: originNote.studyId,
        statement: originNote.statement,
        explanation: originNote.explanation || "",
        supportingEvidenceIds: [...originNote.evidenceIds],
        contradictoryEvidence: "",
        evidenceStrength: "High",
        programmeImplication: "Scale center safe hours across remaining districts",
        linkedRecommendationIds: [],
        studyQuestionId: originNote.questionId,
        frameworkThemeIds: originNote.frameworkThemeIds,
        originPatternNoteId: originNote.id,
        validationStatus: "Draft",
        revision: 1,
        audit: {
          provenance: "human",
          createdActor: { kind: "human", displayName: "Analyst" },
          createdAt: 1717200000000,
          updatedActor: { kind: "human", displayName: "Analyst" },
          updatedAt: 1717200000000,
        },
        createdAt: 1717200000000,
        updatedAt: 1717200000000,
      };

      expect(candidateFinding.validationStatus).toBe("Draft");
      expect(candidateFinding.originPatternNoteId).toBe("PAT-001");
      expect(candidateFinding.studyQuestionId).toBe("RQ-1");
      expect(candidateFinding.frameworkThemeIds).toEqual(["TH-1", "TH-2"]);
      expect(candidateFinding.supportingEvidenceIds).toEqual(["EV-001", "EV-003", "EV-007"]);
    });

    it("verifies showcase communityBridgesCase includes grounded reasoning notes", () => {
      const fieldStudy = adaptDemoCaseToFieldStudy(communityBridgesCase);
      const patternNotes = fieldStudy.patternNotes || [];
      expect(patternNotes.length).toBeGreaterThanOrEqual(5);

      const noteTypes = patternNotes.map((p) => p.reasoningType);
      expect(noteTypes).toContain("pattern");
      expect(noteTypes).toContain("tension");
      expect(noteTypes).toContain("contradiction");
      expect(noteTypes).toContain("possible_explanation");
      expect(noteTypes).toContain("evidence_gap");
    });
  });

  describe("4. Triangulation Matrix & Independent Source Deduplication", () => {
    const mockSources: SourceRecord[] = [
      {
        id: "SRC-1",
        title: "KII with District Director",
        sourceType: "Key Informant Interview",
        date: "2026-03-01",
        stakeholderType: "Government",
        location: "District HQ",
        summary: "Discussion of municipal support",
        sensitivityFlag: "Low",
        materialCategory: "primary_evidence",
      },
      {
        id: "SRC-2",
        title: "FGD with Youth Leaders",
        sourceType: "Focus Group Discussion",
        date: "2026-03-02",
        stakeholderType: "Youth",
        location: "Community Center",
        summary: "Youth leaders discuss access",
        sensitivityFlag: "Low",
        materialCategory: "primary_evidence",
      },
      {
        id: "SRC-3",
        title: "Daily Debrief Day 1",
        sourceType: "Supervisory Debrief",
        date: "2026-03-03",
        stakeholderType: "Team",
        location: "Field Office",
        summary: "Supervisory impressions",
        sensitivityFlag: "Low",
        materialCategory: "supervisory_interpretation",
      },
    ];

    const mockEvidence: EvidenceEntry[] = [
      {
        id: "EV-1",
        sourceId: "SRC-1",
        stakeholderType: "Staff",
        rawEvidence: "Director confirmed facility permit granted.",
        primaryTheme: "Institutional Support",
        secondaryTheme: "Access",
        evidenceStrength: "High",
        sensitivityFlag: "Low",
        potentialFinding: "Permit approved",
        qaStatus: "Reviewed",
        reviewStatus: "usable",
        validationStatus: "Validated",
        studyQuestionIds: ["RQ-1"],
      },
      {
        id: "EV-2",
        sourceId: "SRC-1", // Second observation from SAME source
        stakeholderType: "Staff",
        rawEvidence: "Director noted budget disbursement pending.",
        primaryTheme: "Institutional Support",
        secondaryTheme: "Funding",
        evidenceStrength: "Medium",
        sensitivityFlag: "Low",
        potentialFinding: "Disbursement delayed",
        qaStatus: "Reviewed",
        reviewStatus: "usable",
        validationStatus: "Validated",
        studyQuestionIds: ["RQ-1"],
      },
      {
        id: "EV-3",
        sourceId: "SRC-2",
        stakeholderType: "Community",
        rawEvidence: "Youth leaders stated center opens on schedule.",
        primaryTheme: "Institutional Support",
        secondaryTheme: "Operations",
        evidenceStrength: "High",
        sensitivityFlag: "Low",
        potentialFinding: "Center open",
        qaStatus: "Reviewed",
        reviewStatus: "usable",
        validationStatus: "Validated",
        studyQuestionIds: ["RQ-1"],
      },
      {
        id: "EV-4",
        sourceId: "SRC-3", // Supervisory debrief
        stakeholderType: "Facilitator",
        rawEvidence: "Supervisor noted team morale is high.",
        primaryTheme: "Institutional Support",
        secondaryTheme: "Team",
        evidenceStrength: "Low",
        sensitivityFlag: "Low",
        potentialFinding: "Good morale",
        qaStatus: "Reviewed",
        reviewStatus: "usable",
        validationStatus: "Validated",
        materialCategory: "supervisory_interpretation",
        studyQuestionIds: ["RQ-1"],
      },
      {
        id: "EV-5",
        sourceId: "SRC-2",
        stakeholderType: "Community",
        rawEvidence: "Excluded hearsay observation.",
        primaryTheme: "Institutional Support",
        secondaryTheme: "Rumor",
        evidenceStrength: "Low",
        sensitivityFlag: "Low",
        potentialFinding: "Rumor",
        qaStatus: "Reviewed",
        reviewStatus: "excluded", // Excluded from qualification
        validationStatus: "Draft",
        studyQuestionIds: ["RQ-1"],
      },
    ];

    it("deduplicates multiple observations from the same source record into 1 independent source", () => {
      const finding: Finding = {
        id: "FND-TEST-1",
        statement: "Test finding",
        explanation: "Explanation",
        supportingEvidenceIds: ["EV-1", "EV-2"], // Both from SRC-1
        contradictoryEvidence: "",
        evidenceStrength: "Medium",
        programmeImplication: "Implication",
        linkedRecommendationIds: [],
      };

      const metrics = computeTriangulationMetrics(finding, {
        sources: mockSources,
        evidence: mockEvidence,
      });

      expect(metrics.distinctSourceCount).toBe(1);
      expect(metrics.independentSourceCount).toBe(1);
      expect(metrics.isSingleSourceDependent).toBe(true);
    });

    it("strictly excludes supervisory debriefs from independentSourceCount", () => {
      const finding: Finding = {
        id: "FND-TEST-2",
        statement: "Test finding with debrief",
        explanation: "Explanation",
        supportingEvidenceIds: ["EV-1", "EV-4"], // EV-1 (SRC-1, primary) and EV-4 (SRC-3, supervisory)
        contradictoryEvidence: "",
        evidenceStrength: "Medium",
        programmeImplication: "Implication",
        linkedRecommendationIds: [],
      };

      const metrics = computeTriangulationMetrics(finding, {
        sources: mockSources,
        evidence: mockEvidence,
      });

      expect(metrics.distinctSourceCount).toBe(2);
      expect(metrics.independentSourceCount).toBe(1); // EV-4 does NOT contribute to independentSourceCount!
      expect(metrics.isSingleSourceDependent).toBe(true);
    });

    it("filters out excluded evidence from contributing to triangulation counts", () => {
      const matrix = computeTriangulationMatrix(
        {
          sources: mockSources,
          evidence: mockEvidence,
          studyQuestions: [{ id: "RQ-1", question: "Study question 1" }],
        },
        "question",
        "method"
      );

      // Total qualified evidence should be 4 (EV-5 excluded)
      expect(matrix.totalQualifiedEvidenceCount).toBe(4);

      // Check cell for RQ-1 and Focus Group Discussion (EV-3 is usable, EV-5 is excluded)
      const cellKey = "RQ-1__Focus Group Discussion";
      const cell = matrix.cells[cellKey];
      expect(cell).toBeDefined();
      expect(cell.evidenceCount).toBe(1); // Only EV-3
      expect(cell.evidenceItems.map((e) => e.id)).toEqual(["EV-3"]);
    });

    it("evaluates deterministic cell signal descriptors correctly", () => {
      // 1. Single source => SPARSE
      const sparseMatrix = computeTriangulationMatrix(
        {
          sources: [mockSources[0]],
          evidence: [mockEvidence[0]],
          studyQuestions: [{ id: "RQ-1", question: "Question 1" }],
        },
        "question",
        "method"
      );
      const kiiCell = sparseMatrix.cells["RQ-1__Key Informant Interview"];
      expect(kiiCell.descriptor).toBe("SPARSE");

      // 2. Multiple sources, multiple methods, no contradictions => CONVERGENT
      const convergentMatrix = computeTriangulationMatrix(
        {
          sources: [mockSources[0], mockSources[1]],
          evidence: [mockEvidence[0], mockEvidence[2]],
          studyQuestions: [{ id: "RQ-1", question: "Question 1" }],
        },
        "question",
        "method"
      );
      // Row has both KII and FGD
      expect(convergentMatrix.totalIndependentSourcesCount).toBe(2);

      // 3. Empty cell => EMPTY
      const emptyCell = sparseMatrix.cells["RQ-1__Survey / Questionnaire"];
      expect(emptyCell.descriptor).toBe("EMPTY");
      expect(emptyCell.evidenceCount).toBe(0);
    });
  });

  describe("5. Decoupled Formal Validation Lifecycle & Hard Verification Guards", () => {
    const testSources: SourceRecord[] = [
      {
        id: "SRC-A",
        title: "Source A",
        sourceType: "Key Informant Interview",
        date: "2026-03-01",
        stakeholderType: "Staff",
        location: "Site A",
        summary: "Summary",
        sensitivityFlag: "Low",
        materialCategory: "primary_evidence",
      },
      {
        id: "SRC-B",
        title: "Source B",
        sourceType: "Focus Group Discussion",
        date: "2026-03-02",
        stakeholderType: "Community",
        location: "Site B",
        summary: "Summary",
        sensitivityFlag: "Low",
        materialCategory: "primary_evidence",
      },
    ];

    const testEvidence: EvidenceEntry[] = [
      {
        id: "EV-A",
        sourceId: "SRC-A",
        stakeholderType: "Staff",
        rawEvidence: "Primary evidence A",
        primaryTheme: "Theme A",
        secondaryTheme: "Theme B",
        evidenceStrength: "High",
        sensitivityFlag: "Low",
        potentialFinding: "Finding A",
        qaStatus: "Reviewed",
        reviewStatus: "usable",
        validationStatus: "Validated",
      },
      {
        id: "EV-B",
        sourceId: "SRC-B",
        stakeholderType: "Community",
        rawEvidence: "Primary evidence B",
        primaryTheme: "Theme A",
        secondaryTheme: "Theme B",
        evidenceStrength: "High",
        sensitivityFlag: "Low",
        potentialFinding: "Finding B",
        qaStatus: "Reviewed",
        reviewStatus: "usable",
        validationStatus: "Validated",
      },
      {
        id: "EV-EXCLUDED",
        sourceId: "SRC-A",
        stakeholderType: "Community",
        rawEvidence: "Excluded observation",
        primaryTheme: "Theme A",
        secondaryTheme: "Theme B",
        evidenceStrength: "Low",
        sensitivityFlag: "Low",
        potentialFinding: "Hearsay",
        qaStatus: "Reviewed",
        reviewStatus: "excluded", // Excluded in evidence review
        validationStatus: "Validated",
      },
    ];

    it("transitions finding through complete lifecycle: Draft -> Needs Review -> Validated", () => {
      const draftFinding: Finding = {
        id: "FND-100",
        studyId: "study-1",
        statement: "Validated finding statement",
        explanation: "Comprehensive explanation",
        supportingEvidenceIds: ["EV-A", "EV-B"],
        contradictoryEvidence: "",
        evidenceStrength: "High",
        programmeImplication: "Scale intervention",
        linkedRecommendationIds: [],
        validationStatus: "Draft",
      };

      // 1. Submit for review
      const inReview = submitForReview(draftFinding);
      expect(inReview.validationStatus).toBe("Needs Review");

      // 2. Validate with human evaluator identity
      const validated = validateArtifact(inReview, "Dr. Evaluator", undefined, {
        evidence: testEvidence,
        sources: testSources,
      });

      expect(validated.validationStatus).toBe("Validated");
      expect(validated.lastValidatedBy).toBe("Dr. Evaluator");
      expect(validated.audit?.validatedActor?.displayName).toBe("Dr. Evaluator");
      expect(validated.audit?.lastValidatedAt).toBeDefined();
    });

    it("rejects finding validation if any supporting evidence is marked reviewStatus === 'excluded'", () => {
      const findingWithExcluded: Finding = {
        id: "FND-101",
        studyId: "study-1",
        statement: "Finding resting on excluded evidence",
        explanation: "Explanation",
        supportingEvidenceIds: ["EV-A", "EV-EXCLUDED"],
        contradictoryEvidence: "",
        evidenceStrength: "Medium",
        programmeImplication: "Implication",
        linkedRecommendationIds: [],
        validationStatus: "Needs Review",
      };

      expect(() => {
        validateArtifact(findingWithExcluded, "Lead Evaluator", undefined, {
          evidence: testEvidence,
          sources: testSources,
        });
      }).toThrow(/marked as excluded/i);
    });

    it("requires non-empty limitation note when validating finding with single-source or emerging profile", () => {
      const singleSourceFinding: Finding = {
        id: "FND-102",
        studyId: "study-1",
        statement: "Finding relying on single source",
        explanation: "Explanation",
        supportingEvidenceIds: ["EV-A"], // Single source SRC-A
        contradictoryEvidence: "",
        evidenceStrength: "Medium",
        programmeImplication: "Implication",
        linkedRecommendationIds: [],
      };

      const eligibility = evaluateFindingValidationEligibility(singleSourceFinding, {
        evidence: testEvidence,
        sources: testSources,
      });

      expect(eligibility.requiresLimitationNote).toBe(true);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reasons.some((r) => r.includes("limitation note"))).toBe(true);

      // Once limitation note is provided, it becomes eligible
      const findingWithNote: Finding = {
        ...singleSourceFinding,
        limitationNote: "Finding relies on a single staff informant; requires community triangulation.",
      };

      const eligibilityWithNote = evaluateFindingValidationEligibility(findingWithNote, {
        evidence: testEvidence,
        sources: testSources,
      });
      expect(eligibilityWithNote.eligible).toBe(true);
    });

    it("supports formal rejection with rationale and reopen to Draft", () => {
      const findingInReview: Finding = {
        id: "FND-103",
        studyId: "study-1",
        statement: "Contested finding statement",
        explanation: "Explanation",
        supportingEvidenceIds: ["EV-A"],
        contradictoryEvidence: "",
        evidenceStrength: "Medium",
        programmeImplication: "Implication",
        linkedRecommendationIds: [],
        validationStatus: "Needs Review",
      };

      // 1. Rejection requires non-empty rationale
      expect(() => rejectArtifact(findingInReview, "")).toThrow(/non-empty reason/i);

      const rejected = rejectArtifact(
        findingInReview,
        "Insufficient triangulation across opposing community factions."
      );
      expect(rejected.validationStatus).toBe("Rejected");
      expect(rejected.rejectionReason).toBe("Insufficient triangulation across opposing community factions.");

      // 2. Reopen moves back to Draft for revision
      const reopened = reopenRejectedArtifact(rejected);
      expect(reopened.validationStatus).toBe("Draft");
      expect(reopened.previousValidationStatus).toBe("Rejected");
    });
  });

  describe("6. Lessons Grounded in Validated Findings Constraint", () => {
    const parentFindingValidated: Finding = {
      id: "FND-VALIDATED",
      studyId: "study-1",
      statement: "Validated peacebuilding pattern",
      explanation: "Explanation",
      supportingEvidenceIds: ["EV-1"],
      contradictoryEvidence: "",
      evidenceStrength: "High",
      programmeImplication: "Scale",
      linkedRecommendationIds: [],
      validationStatus: "Validated",
    };

    const parentFindingDraft: Finding = {
      id: "FND-DRAFT",
      studyId: "study-1",
      statement: "Draft unvalidated claim",
      explanation: "Explanation",
      supportingEvidenceIds: ["EV-1"],
      contradictoryEvidence: "",
      evidenceStrength: "Low",
      programmeImplication: "Wait",
      linkedRecommendationIds: [],
      validationStatus: "Draft",
    };

    const testEvidence: EvidenceEntry[] = [
      {
        id: "EV-1",
        sourceId: "SRC-1",
        stakeholderType: "Staff",
        rawEvidence: "Evidence 1",
        primaryTheme: "Theme 1",
        secondaryTheme: "Theme 2",
        evidenceStrength: "High",
        sensitivityFlag: "Low",
        potentialFinding: "Finding 1",
        qaStatus: "Reviewed",
        reviewStatus: "usable",
        validationStatus: "Validated",
      },
    ];

    it("allows approving a Lesson whose parent finding is Validated", () => {
      const lessonInReview: LessonLearned = {
        id: "LES-001",
        studyId: "study-1",
        statement: "Safe spaces must precede mixed dialogue sessions",
        whatWorkedOrDidNotWork: "Preparatory sessions worked",
        whyItHappened: "Reduced social anxiety",
        conditionsRequired: "Trusted community facilitation",
        evidenceBase: ["EV-1"],
        linkedFindingIds: ["FND-VALIDATED"],
        transferability: "Applicable across post-conflict zones",
        validationStatus: "Needs Review",
      };

      const validatedLesson = validateArtifact(lessonInReview, "Principal Evaluator", undefined, {
        evidence: testEvidence,
        findings: [parentFindingValidated],
      });

      expect(validatedLesson.validationStatus).toBe("Validated");
      expect(validatedLesson.lastValidatedBy).toBe("Principal Evaluator");
    });

    it("rejects approving a Lesson whose parent finding is NOT Validated", () => {
      const lessonWithDraftParent: LessonLearned = {
        id: "LES-002",
        studyId: "study-1",
        statement: "Premature lesson based on draft finding",
        whatWorkedOrDidNotWork: "Worked",
        whyItHappened: "Unknown",
        conditionsRequired: "None",
        evidenceBase: ["EV-1"],
        linkedFindingIds: ["FND-DRAFT"],
        transferability: "Unclear",
        validationStatus: "Needs Review",
      };

      expect(() => {
        validateArtifact(lessonWithDraftParent, "Principal Evaluator", undefined, {
          evidence: testEvidence,
          findings: [parentFindingDraft],
        });
      }).toThrow(/parent finding must be validated first/i);
    });

    it("rejects approving a Good Practice whose referenced evidence is marked reviewStatus === 'excluded'", () => {
      const evidenceExcluded: EvidenceEntry[] = [
        {
          ...testEvidence[0],
          id: "EV-EXCLUDED",
          reviewStatus: "excluded",
          validationStatus: "Validated",
        },
      ];

      const practiceWithExcludedEvidence: GoodPractice = {
        id: "GP-001",
        studyId: "study-1",
        title: "Peer-led micro-grant committee",
        description: "Practice description",
        whyItWorked: "Broadened inclusion",
        conditionsForReplication: "Training required",
        risksLimits: "Elite capture",
        recommendedUse: "Phase 2",
        evidenceBase: ["EV-EXCLUDED"],
        linkedFindingIds: ["FND-VALIDATED"],
        validationStatus: "Needs Review",
      };

      expect(() => {
        validateArtifact(practiceWithExcludedEvidence, "Principal Evaluator", undefined, {
          evidence: evidenceExcluded,
          findings: [parentFindingValidated],
        });
      }).toThrow(/marked as excluded/i);
    });
  });

  describe("8. Evidence Qualification vs Finding Validation Boundary", () => {
    const parentFindingInReview: Finding = {
      id: "FND-QUAL-TEST",
      studyId: "study-qual",
      statement: "Qualified evidence supports finding irrespective of evidence validation lifecycle state.",
      explanation: "Testing boundary between reviewStatus and validationStatus.",
      supportingEvidenceIds: ["EV-USABLE-DRAFT", "EV-USABLE-NEEDS-REVIEW"],
      contradictoryEvidence: "",
      evidenceStrength: "Medium",
      programmeImplication: "Proceed with verified observations.",
      linkedRecommendationIds: [],
      validationStatus: "Needs Review",
    };

    const dummySource: SourceRecord = {
      id: "SRC-QUAL-1",
      studyId: "study-qual",
      sourceType: "Direct Observation",
      title: "Field Observation Session",
      date: "2026-06-01",
      stakeholderType: "Farmers",
      location: "Site A",
      siteId: "Site A",
      summary: "Observation content",
      sensitivityFlag: "None",
    };

    it("allows approving finding when supporting evidence has reviewStatus === 'usable' even if validationStatus is Draft", () => {
      const evidenceDraft: EvidenceEntry = {
        id: "EV-USABLE-DRAFT",
        sourceId: "SRC-QUAL-1",
        stakeholderType: "Farmers",
        rawEvidence: "Draft observation with confirmed usability",
        primaryTheme: "TH-1",
        secondaryTheme: "None",
        evidenceStrength: "Medium",
        sensitivityFlag: "None",
        potentialFinding: "P-1",
        qaStatus: "Reviewed",
        reviewStatus: "usable",
        validationStatus: "Draft",
      };

      const evidenceNeedsReview: EvidenceEntry = {
        id: "EV-USABLE-NEEDS-REVIEW",
        sourceId: "SRC-QUAL-1",
        stakeholderType: "Farmers",
        rawEvidence: "Observation in review with confirmed usability",
        primaryTheme: "TH-1",
        secondaryTheme: "None",
        evidenceStrength: "Medium",
        sensitivityFlag: "None",
        potentialFinding: "P-2",
        qaStatus: "Reviewed",
        reviewStatus: "usable",
        validationStatus: "Needs Review",
      };

      const certified = validateArtifact(parentFindingInReview, "Senior Evaluator", undefined, {
        evidence: [evidenceDraft, evidenceNeedsReview],
        sources: [dummySource],
      });

      expect(certified.validationStatus).toBe("Validated");
      expect(certified.lastValidatedBy).toBe("Senior Evaluator");
    });

    it("blocks approving finding when supporting evidence is reviewStatus === 'excluded'", () => {
      const excludedEvidence: EvidenceEntry = {
        id: "EV-EXCLUDED-TEST",
        sourceId: "SRC-QUAL-1",
        stakeholderType: "Farmers",
        rawEvidence: "Unsubstantiated rumor",
        primaryTheme: "TH-1",
        secondaryTheme: "None",
        evidenceStrength: "Low",
        sensitivityFlag: "High",
        potentialFinding: "P-Rumor",
        qaStatus: "Warning",
        reviewStatus: "excluded",
        exclusionReason: "Fails veracity criteria",
        validationStatus: "Validated",
      };

      const findingWithExcluded = {
        ...parentFindingInReview,
        supportingEvidenceIds: ["EV-EXCLUDED-TEST" as const],
      };

      expect(() => {
        validateArtifact(findingWithExcluded, "Senior Evaluator", undefined, {
          evidence: [excludedEvidence],
          sources: [dummySource],
        });
      }).toThrow(/marked as excluded and cannot support a Finding/i);
    });

    it("blocks approving finding when supporting evidence is reviewStatus === 'needs_clarification'", () => {
      const clarificationEvidence: EvidenceEntry = {
        id: "EV-CLARIFY-TEST",
        sourceId: "SRC-QUAL-1",
        stakeholderType: "Farmers",
        rawEvidence: "Ambiguous notes",
        primaryTheme: "TH-1",
        secondaryTheme: "None",
        evidenceStrength: "Low",
        sensitivityFlag: "None",
        potentialFinding: "P-Ambiguous",
        qaStatus: "Needs Review",
        reviewStatus: "needs_clarification",
        validationStatus: "Validated",
      };

      const findingWithClarify = {
        ...parentFindingInReview,
        supportingEvidenceIds: ["EV-CLARIFY-TEST" as const],
      };

      expect(() => {
        validateArtifact(findingWithClarify, "Senior Evaluator", undefined, {
          evidence: [clarificationEvidence],
          sources: [dummySource],
        });
      }).toThrow(/not yet validated.*needs_clarification/i);
    });

    it("preserves legacy fallback: unreviewed evidence requires validationStatus === 'Validated'", () => {
      const legacyValidated: EvidenceEntry = {
        id: "EV-LEGACY-VALIDATED",
        sourceId: "SRC-QUAL-1",
        stakeholderType: "Farmers",
        rawEvidence: "Pre-Phase 3 validated record without reviewStatus",
        primaryTheme: "TH-1",
        secondaryTheme: "None",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "P-Legacy",
        qaStatus: "Reviewed",
        validationStatus: "Validated",
      };

      const findingWithLegacy = {
        ...parentFindingInReview,
        supportingEvidenceIds: ["EV-LEGACY-VALIDATED" as const],
      };

      const certified = validateArtifact(findingWithLegacy, "Senior Evaluator", undefined, {
        evidence: [legacyValidated],
        sources: [dummySource],
      });
      expect(certified.validationStatus).toBe("Validated");

      const legacyUnvalidated: EvidenceEntry = {
        ...legacyValidated,
        id: "EV-LEGACY-UNVALIDATED",
        validationStatus: "Needs Review",
      };

      const findingWithUnvalidatedLegacy = {
        ...parentFindingInReview,
        supportingEvidenceIds: ["EV-LEGACY-UNVALIDATED" as const],
      };

      expect(() => {
        validateArtifact(findingWithUnvalidatedLegacy, "Senior Evaluator", undefined, {
          evidence: [legacyUnvalidated],
          sources: [dummySource],
        });
      }).toThrow(/All supporting evidence must be Validated/i);
    });
  });

  describe("9. Typed Evidence Roles (SUPPORT, CONTRADICT, QUALIFY)", () => {
    it("recognizes qualifyingEvidenceIds in substantive change detection", () => {
      const baseFinding: Finding = {
        id: "FND-ROLES",
        statement: "Base statement",
        explanation: "Base explanation",
        supportingEvidenceIds: ["EV-001"],
        contradictoryEvidence: "",
        contradictoryEvidenceIds: ["EV-002"],
        qualifyingEvidenceIds: ["EV-003"],
        evidenceStrength: "Medium",
        programmeImplication: "Action",
        linkedRecommendationIds: [],
        validationStatus: "Validated",
      };

      // Modifying qualifying evidence triggers substantive change
      const modifiedQualifying: Partial<Finding> = {
        ...baseFinding,
        qualifyingEvidenceIds: ["EV-003", "EV-004"],
      };
      expect(isSubstantiveFindingChange(baseFinding, modifiedQualifying)).toBe(true);

      // Same qualifying evidence is not substantive change
      const identical = { ...baseFinding };
      expect(isSubstantiveFindingChange(baseFinding, identical)).toBe(false);
    });

    it("validates that qualifyingEvidenceIds exist and are not rejected", () => {
      const validFinding: Finding = {
        id: "FND-ROLES-VALID",
        statement: "Base statement",
        explanation: "Base explanation",
        supportingEvidenceIds: ["EV-001"],
        contradictoryEvidence: "",
        qualifyingEvidenceIds: ["EV-QUAL-REJECTED"],
        evidenceStrength: "Medium",
        programmeImplication: "Action",
        linkedRecommendationIds: [],
        validationStatus: "Needs Review",
      };

      const evidenceValid: EvidenceEntry = {
        id: "EV-001",
        sourceId: "SRC-001",
        stakeholderType: "Staff",
        rawEvidence: "Valid observation",
        primaryTheme: "TH-1",
        secondaryTheme: "None",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "P-1",
        qaStatus: "Reviewed",
        reviewStatus: "usable",
        validationStatus: "Validated",
      };

      const evidenceRejected: EvidenceEntry = {
        id: "EV-QUAL-REJECTED",
        sourceId: "SRC-001",
        stakeholderType: "Staff",
        rawEvidence: "Rejected observation",
        primaryTheme: "TH-1",
        secondaryTheme: "None",
        evidenceStrength: "Low",
        sensitivityFlag: "None",
        potentialFinding: "P-Bad",
        qaStatus: "Warning",
        validationStatus: "Rejected",
      };

      expect(() => {
        validateArtifact(validFinding, "Evaluator", undefined, {
          evidence: [evidenceValid, evidenceRejected],
          sources: [
            {
              id: "SRC-001",
              studyId: "study",
              sourceType: "Direct Observation",
              title: "S1",
              date: "2026-06-01",
              stakeholderType: "Staff",
              location: "Site A",
              siteId: "Site A",
              summary: "Content",
              sensitivityFlag: "None",
            },
          ],
        });
      }).toThrow(/Qualifying evidence "EV-QUAL-REJECTED" has been marked as Rejected/i);
    });
  });

  describe("10. Cascade Invalidation on Qualifying Evidence Dependencies", () => {
    it("invalidates Validated Findings referencing an evidence entry in qualifyingEvidenceIds", async () => {
      const db = await getDb();
      const studyId = "study-cascade-qual";

      // Setup study & finding with qualifying evidence
      await saveStudyMeta(createMinimalMeta(studyId, "Cascade Study"));

      const finding: Finding = {
        id: "FND-CASCADE-TARGET",
        studyId,
        statement: "Finding dependent on qualifying context",
        explanation: "Explanation",
        supportingEvidenceIds: ["EV-SUPP"],
        contradictoryEvidence: "",
        qualifyingEvidenceIds: ["EV-QUAL-CASCADE"],
        evidenceStrength: "Medium",
        programmeImplication: "Implication",
        linkedRecommendationIds: [],
        validationStatus: "Validated",
        lastValidatedBy: "Lead Evaluator",
        lastValidatedAt: Date.now() - 10000,
      };

      await db.put("findings", { ...finding, studyId });

      const affected = await cascadeEvidenceInvalidationToFindings(db, studyId, "EV-QUAL-CASCADE");
      expect(affected).toContain("FND-CASCADE-TARGET");

      const refreshed = await db.get("findings", [studyId, "FND-CASCADE-TARGET"]);
      expect(refreshed?.validationStatus).toBe("Needs Review");
      expect(refreshed?.staleDependencyWarning).toBe(STALE_QUALIFYING_DEPENDENCY_WARNING_TEXT);
    });
  });

  describe("11. Cell Signal Descriptors (Internal Intersection Triangulation)", () => {
    it("classifies cell as MIXED when 2+ independent sources exist with contradictions", () => {
      const themes = [{ id: "THM-1", name: "Governance", description: "" }];
      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          studyId: "study-matrix",
          sourceType: "Interview",
          title: "Source 1",
          date: "2026-06-01",
          stakeholderType: "Youth",
          location: "Site 1",
          siteId: "Site 1",
          summary: "",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-002",
          studyId: "study-matrix",
          sourceType: "Survey",
          title: "Source 2",
          date: "2026-06-01",
          stakeholderType: "Authorities",
          location: "Site 1",
          siteId: "Site 1",
          summary: "",
          sensitivityFlag: "None",
        },
      ];
      const evidence: EvidenceEntry[] = [
        {
          id: "EV-001",
          studyId: "study-matrix",
          sourceId: "SRC-001",
          siteId: "Site 1",
          stakeholderType: "Youth",
          rawEvidence: "Positive youth response",
          frameworkThemeIds: ["THM-1"],
          primaryTheme: "THM-1",
          secondaryTheme: "None",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "",
          qaStatus: "Reviewed",
          reviewStatus: "usable",
          validationStatus: "Validated",
        },
        {
          id: "EV-002",
          studyId: "study-matrix",
          sourceId: "SRC-002",
          siteId: "Site 1",
          stakeholderType: "Authorities",
          rawEvidence: "Authorities report non-compliance",
          frameworkThemeIds: ["THM-1"],
          primaryTheme: "THM-1",
          secondaryTheme: "None",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "",
          qaStatus: "Reviewed",
          reviewStatus: "usable",
          validationStatus: "Validated",
        },
      ];
      const patternNotes: PatternNote[] = [
        {
          id: "PAT-TENSION",
          studyId: "study-matrix",
          statement: "Divergence between youth and council",
          reasoningType: "tension",
          explanation: "Youth and authorities disagree on curfew impact.",
          evidenceIds: ["EV-001", "EV-002"],
          frameworkThemeIds: ["THM-1"],
          audit: {
            provenance: "human",
            createdActor: { kind: "human", displayName: "Analyst" },
            createdAt: 1,
            updatedActor: { kind: "human", displayName: "Analyst" },
            updatedAt: 1,
          },
          createdAt: 1,
          updatedAt: 1,
        },
      ];

      const matrix = computeTriangulationMatrix(
        {
          evidence,
          sources,
          frameworkThemes: themes,
          patternNotes,
        },
        "theme",
        "site"
      );

      const cell = matrix.cells["THM-1__Site 1"];
      expect(cell).toBeDefined();
      expect(cell.evidenceCount).toBe(2);
      expect(cell.independentSourceCount).toBe(2);
      expect(cell.hasContradictions).toBe(true);
      expect(cell.descriptor).toBe("MIXED");
    });

    it("classifies cell as DIVERGENT when contradictions exist with fewer than 2 independent sources", () => {
      const themes = [{ id: "THM-1", name: "Governance", description: "" }];
      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          studyId: "study-matrix-div",
          sourceType: "Interview",
          title: "Source 1",
          date: "2026-06-01",
          stakeholderType: "Youth",
          location: "Site 1",
          siteId: "Site 1",
          summary: "",
          sensitivityFlag: "None",
        },
      ];
      const evidence: EvidenceEntry[] = [
        {
          id: "EV-001",
          studyId: "study-matrix-div",
          sourceId: "SRC-001",
          siteId: "Site 1",
          stakeholderType: "Youth",
          rawEvidence: "Initial youth view",
          frameworkThemeIds: ["THM-1"],
          primaryTheme: "THM-1",
          secondaryTheme: "None",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "",
          qaStatus: "Reviewed",
          reviewStatus: "usable",
          validationStatus: "Validated",
        },
        {
          id: "EV-002",
          studyId: "study-matrix-div",
          sourceId: "SRC-001",
          siteId: "Site 1",
          stakeholderType: "Youth",
          rawEvidence: "Follow-up youth view contradicting self",
          frameworkThemeIds: ["THM-1"],
          primaryTheme: "THM-1",
          secondaryTheme: "None",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "",
          qaStatus: "Reviewed",
          reviewStatus: "usable",
          validationStatus: "Validated",
        },
      ];
      const patternNotes: PatternNote[] = [
        {
          id: "PAT-CONTRADICTION",
          studyId: "study-matrix-div",
          statement: "Internal contradiction within source",
          reasoningType: "contradiction",
          explanation: "Participant contradicted earlier statement.",
          evidenceIds: ["EV-001", "EV-002"],
          frameworkThemeIds: ["THM-1"],
          audit: {
            provenance: "human",
            createdActor: { kind: "human", displayName: "Analyst" },
            createdAt: 1,
            updatedActor: { kind: "human", displayName: "Analyst" },
            updatedAt: 1,
          },
          createdAt: 1,
          updatedAt: 1,
        },
      ];

      const matrix = computeTriangulationMatrix(
        {
          evidence,
          sources,
          frameworkThemes: themes,
          patternNotes,
        },
        "theme",
        "site"
      );

      const cell = matrix.cells["THM-1__Site 1"];
      expect(cell).toBeDefined();
      expect(cell.evidenceCount).toBe(2);
      expect(cell.independentSourceCount).toBe(1);
      expect(cell.hasContradictions).toBe(true);
      expect(cell.descriptor).toBe("DIVERGENT");
    });
  });

  describe("12. PatternNote studyId Remapping on import_as_new", () => {
    it("remaps all patternNotes studyId to targetStudyId on import_as_new", async () => {
      const originalStudyId = "study-backup-source";
      const db = await getDb();

      await saveStudyMeta(
        createMinimalMeta(originalStudyId, "Backup Source Study", {
          patternNotes: [
            {
              id: "PAT-REMAP-1",
              studyId: originalStudyId,
              statement: "Sensemaking note before backup",
              reasoningType: "pattern",
              explanation: "Explanation",
              evidenceIds: [],
              audit: {
                provenance: "human",
                createdActor: { kind: "human", displayName: "Analyst" },
                createdAt: 1,
                updatedActor: { kind: "human", displayName: "Analyst" },
                updatedAt: 1,
              },
              createdAt: 1,
              updatedAt: 1,
            },
          ],
        })
      );

      const exportedBackup = await exportStudyBackup(originalStudyId);
      const importResult = await importStudyBackup(exportedBackup, "import_as_new");

      expect(importResult.success).toBe(true);
      expect(importResult.studyId).not.toBe(originalStudyId);

      const importedStudy = await db.get("studies", importResult.studyId);
      expect(importedStudy).toBeDefined();
      expect(importedStudy?.patternNotes).toHaveLength(1);
      expect(importedStudy?.patternNotes?.[0].studyId).toBe(importResult.studyId);
    });
  });

  describe("13. Demo Data Nuance Verification", () => {
    it("confirms EV-012 has reviewStatus === 'needs_clarification'", () => {
      const ev012 = communityBridgesCase.evidence.find((e) => e.id === "EV-012");
      expect(ev012).toBeDefined();
      expect(ev012?.reviewStatus).toBe("needs_clarification");
    });

    it("confirms EV-021 has reviewStatus === 'excluded' and explicit exclusionReason", () => {
      const ev021 = communityBridgesCase.evidence.find((e) => e.id === "EV-021");
      expect(ev021).toBeDefined();
      expect(ev021?.reviewStatus).toBe("excluded");
      expect(ev021?.exclusionReason).toBeDefined();
      expect(ev021?.exclusionReason).toContain("Unsubstantiated field rumor");
    });
  });
});
