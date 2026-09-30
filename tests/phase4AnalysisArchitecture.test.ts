import { describe, it, expect } from "vitest";
import {
  PRACTITIONER_SPACES,
  getSpaceForTab,
  type WorkspaceTabId,
} from "@/components/FieldLearningStudioApp";
import type {
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
} from "@/lib/validation/validationLifecycle";
import { DB_VERSION } from "@/lib/storage/indexedDb";
import { communityBridgesCase } from "@/data/cases/communityBridgesCase";
import { adaptDemoCaseToFieldStudy } from "@/lib/storage/demoStudyAdapter";

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
});
