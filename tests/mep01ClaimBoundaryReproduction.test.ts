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
  deleteSource,
} from "@/lib/storage";
import {
  validateArtifact,
  applySubstantiveEvidenceEdit,
} from "@/lib/validation";
import {
  isFindingExportEligible,
} from "@/lib/exportPolicy";
import type {
  StudyMeta,
  SourceRecord,
  EvidenceEntry,
  Finding,
  Recommendation,
  StudyId,
} from "@/lib/types";

describe("MEP-01 Defect Reproduction Suite", () => {
  const studyId: StudyId = "study-mep01-repro";

  const sampleMeta: StudyMeta = {
    id: studyId,
    title: "MEP-01 Claim Boundary Study",
    subtitle: "Testing formal claim boundary invariants",
    status: "Active Fieldwork",
    context: "Field mission in Minya",
    isDemoCase: false,
    scope: {
      targetStakeholderGroups: ["Teachers", "Parents"],
      targetSites: ["Site-A"],
      isSingleSiteStudy: true,
    },
    executiveSummary: "Summary",
    keyMessages: [],
    limitations: [],
    questions: [],
    patternNotes: [],
    createdAt: 1000,
    updatedAt: 1000,
  };

  const sampleSource: SourceRecord & { studyId: StudyId } = {
    id: "SRC-001",
    studyId,
    title: "KII with School Principal",
    sourceType: "Key Informant Interview",
    date: "2026-03-10",
    stakeholderType: "Teachers",
    location: "Site-A",
    summary: "Principal interview",
    sensitivityFlag: "None",
  };

  const sampleEvidence: EvidenceEntry & { studyId: StudyId } = {
    id: "EV-001",
    studyId,
    sourceId: "SRC-001",
    rawEvidence: "Solar battery runs out at 12:30 PM daily.",
    rawObservation: "Solar battery runs out at 12:30 PM daily.",
    interpretation: "Instructional hours cut short.",
    potentialFinding: "Power failure halts classes.",
    primaryTheme: "Access",
    secondaryTheme: "",
    stakeholderType: "Teachers",
    evidenceStrength: "High",
    sensitivityFlag: "None",
    qaStatus: "Reviewed",
    validationStatus: "Validated",
    revision: 1,
  };

  const sampleFinding: Finding & { studyId: StudyId } = {
    id: "FND-001",
    studyId,
    statement: "Power instability terminates digital instructional hours.",
    explanation: "Solar battery depletion halts daily operations.",
    supportingEvidenceIds: ["EV-001"],
    contradictoryEvidence: "",
    contradictoryEvidenceIds: [],
    evidenceStrength: "High",
    programmeImplication: "Procure battery backup systems.",
    linkedRecommendationIds: ["REC-001"],
    validationStatus: "Validated",
    revision: 1,
  };

  const sampleRecommendation: Recommendation & { studyId: StudyId } = {
    id: "REC-001",
    studyId,
    recommendation: "Install backup power system for computer lab.",
    linkedFindingId: "FND-001",
    evidenceBase: ["EV-001"],
    responsibleActor: "Logistics Team",
    priority: "High",
    timeframe: "Immediate",
    feasibility: "High",
    riskSensitivity: "Low",
    expectedBenefit: "Restores instructional hours",
    successIndicator: "100% lab uptime",
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
  // Defect 1: Supporting Evidence edit does NOT invalidate Finding in storage
  // ============================================================================
  it("REPRO-1: substantive edit to supporting evidence fails to cascade to Finding in storage", async () => {
    const fetchedEv = await getEvidence(studyId, "EV-001");
    expect(fetchedEv).toBeDefined();

    // Substantive edit applied to Evidence
    const editResult = applySubstantiveEvidenceEdit(fetchedEv!, {
      rawEvidence: "Substantially altered observation: solar battery works fine until 4:00 PM.",
    });

    expect(editResult.requiredRevalidation).toBe(true);
    expect(editResult.updated.validationStatus).toBe("Needs Review");

    // Save edited evidence to storage
    await saveEvidence({ ...editResult.updated, studyId });

    // CURRENT DEFECT: Finding in storage is NOT automatically updated to Needs Review
    const findingInStorage = await getFinding(studyId, "FND-001");
    expect(findingInStorage?.validationStatus).toBe("Needs Review"); // EXPECTED TO FAIL currently!
  });

  // ============================================================================
  // Defect 2: Wrong Order Approval (Finding approved while Evidence is Needs Review)
  // ============================================================================
  it("REPRO-2: wrong-order approval: Finding cannot be validated while supporting evidence is Needs Review", async () => {
    // Put evidence in Needs Review
    await saveEvidence({
      ...sampleEvidence,
      validationStatus: "Needs Review",
    });

    const unreviewedFinding: Finding = {
      ...sampleFinding,
      validationStatus: "Needs Review",
    };

    const evidenceInDb = await getEvidence(studyId, "EV-001");
    expect(evidenceInDb?.validationStatus).toBe("Needs Review");

    // In-memory review action enforces prerequisites and rejects wrong-order approval:
    expect(() => {
      validateArtifact(unreviewedFinding, "Senior Evaluator", undefined, {
        evidence: [evidenceInDb!],
      });
    }).toThrow(/Supporting evidence.*not yet validated/i);
  });

  // ============================================================================
  // Defect 3: Challenging Evidence mutation is ignored
  // ============================================================================
  it("REPRO-3: changing challenging evidence fails to invalidate approved Finding", async () => {
    const challengingEvidence: EvidenceEntry & { studyId: StudyId } = {
      id: "EV-CHALLENGE-01",
      studyId,
      sourceId: "SRC-001",
      rawEvidence: "Log sheet indicates diesel generator was operational on three days.",
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
    await saveEvidence(challengingEvidence);

    // Finding links to challenging evidence
    await saveFinding({
      ...sampleFinding,
      contradictoryEvidenceIds: ["EV-CHALLENGE-01"],
      contradictoryEvidence: "Diesel generator logs show intermittent power supply.",
    });

    // Substantive edit to challenging evidence
    const editResult = applySubstantiveEvidenceEdit(challengingEvidence, {
      rawEvidence: "REVISED: Diesel generator logs were falsified by vendor.",
    });
    await saveEvidence({ ...editResult.updated, studyId });

    // Finding is invalidated and transitioned to Needs Review
    const findingInStorage = await getFinding(studyId, "FND-001");
    expect(findingInStorage?.validationStatus).toBe("Needs Review");
    expect(findingInStorage?.staleDependencyWarning).toContain("Challenging evidence changed");
  });

  // ============================================================================
  // Defect 4: Source deletion silently creates orphan evidence chain
  // ============================================================================
  it("REPRO-4: deleting Source succeeds even when active Evidence depends on it", async () => {
    // deleteSource must be blocked when dependent evidence exists
    await expect(deleteSource(studyId, "SRC-001")).rejects.toThrow(
      /Cannot delete Source.*evidence/i
    );
  });

  // ============================================================================
  // Defect 5: isFindingExportEligible ignores supporting evidence status
  // ============================================================================
  it("REPRO-5: isFindingExportEligible returns false when supporting evidence is unreviewed or missing", async () => {
    // Evidence is put into Needs Review
    const unreviewedEvidence: EvidenceEntry = {
      ...sampleEvidence,
      validationStatus: "Needs Review",
    };

    // Finding itself is marked "Validated"
    const findingWithUnreviewedEvidence: Finding = {
      ...sampleFinding,
      validationStatus: "Validated",
      staleDependencyWarning: undefined,
    };

    const isEligible = isFindingExportEligible(findingWithUnreviewedEvidence, {
      sources: [sampleSource],
      evidence: [unreviewedEvidence],
    });
    expect(isEligible).toBe(false);

    // Also when supporting evidence is missing from context
    const isEligibleMissing = isFindingExportEligible(findingWithUnreviewedEvidence, {
      sources: [sampleSource],
      evidence: [],
    });
    expect(isEligibleMissing).toBe(false);
  });

  // ============================================================================
  // Defect 6: Batch mutation routes bypass invalidation cascade
  // ============================================================================
  it("REPRO-6: saveEvidenceBatch substantive edits bypass invalidation cascade", async () => {
    const fetchedEv = await getEvidence(studyId, "EV-001");
    expect(fetchedEv).toBeDefined();

    // Substantive edit via batch
    const alteredEv: EvidenceEntry & { studyId: StudyId } = {
      ...fetchedEv!,
      studyId,
      rawEvidence: "Batch-altered observation: totally different finding premise.",
      validationStatus: "Needs Review",
    };

    await saveEvidenceBatch([alteredEv]);

    // CURRENT DEFECT: saveEvidenceBatch does not cascade invalidation to Finding!
    const findingInStorage = await getFinding(studyId, "FND-001");
    expect(findingInStorage?.validationStatus).toBe("Needs Review"); // EXPECTED TO FAIL currently!
  });
});

