import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  clearAllStores,
  saveStudyMeta,
  saveSource,
  saveEvidence,
  saveFinding,
  saveLesson,
  saveGoodPractice,
  saveRecommendation,
  getRecommendation,
  assembleStudy,
  getDb,
} from "@/lib/storage";
import type {
  StudyMeta,
  Finding,
  LessonLearned,
  GoodPractice,
  Recommendation,
  StudyId,
} from "@/lib/types";

describe("Lineage Graph & M:N Traversal (Phase 0)", () => {
  const studyId: StudyId = "study-lineage-test";

  const testStudyMeta: StudyMeta = {
    id: studyId,
    title: "Lineage Graph Test Study",
    subtitle: "Testing M:N relationship traversal and dual-write",
    context: "Unit testing lineage semantics.",
    status: "Active Fieldwork",
    isDemoCase: false,
    scope: {
      targetSites: ["Site Alpha"],
      isSingleSiteStudy: true,
      targetStakeholderGroups: ["Community"],
    },
    executiveSummary: "Summary",
    keyMessages: [],
    limitations: [],
    questions: [],
    patternNotes: [],
    outputConfig: {
      includeRecommendations: true,
      includeLessons: true,
      includeGoodPractices: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(async () => {
    await clearAllStores();
    await saveStudyMeta(testStudyMeta);
    await saveSource({
      id: "SRC-001",
      studyId,
      title: "Lineage Source Alpha",
      sourceType: "Key Informant Interview",
      date: "2026-01-01",
      stakeholderType: "Community",
      location: "Site Alpha",
      summary: "Prerequisite source for relational integrity",
      sensitivityFlag: "None",
    });
    await saveEvidence({
      id: "EV-001",
      studyId,
      sourceId: "SRC-001",
      stakeholderType: "Community",
      rawEvidence: "Prerequisite evidence item 1",
      primaryTheme: "Access",
      secondaryTheme: "General",
      potentialFinding: "Access is vital",
      qaStatus: "Reviewed",
      evidenceStrength: "High",
      sensitivityFlag: "None",
      validationStatus: "Validated",
      revision: 1,
    });
    await saveEvidence({
      id: "EV-002",
      studyId,
      sourceId: "SRC-001",
      stakeholderType: "Community",
      rawEvidence: "Prerequisite evidence item 2",
      primaryTheme: "Seasonality",
      secondaryTheme: "General",
      potentialFinding: "Timing matters",
      qaStatus: "Reviewed",
      evidenceStrength: "High",
      sensitivityFlag: "None",
      validationStatus: "Validated",
      revision: 1,
    });
  });

  it("1. supports M:N linkages where a lesson is linked to multiple findings", async () => {
    const finding1: Finding & { studyId: StudyId } = {
      id: "FND-001",
      studyId,
      statement: "Access barriers reduce participation in remote sites.",
      explanation: "Remote sites require transport.",
      supportingEvidenceIds: ["EV-001"],
      contradictoryEvidence: "None documented",
      evidenceStrength: "High",
      programmeImplication: "Provide transport vouchers.",
      linkedRecommendationIds: [],
      validationStatus: "Validated",
      revision: 1,
    };

    const finding2: Finding & { studyId: StudyId } = {
      id: "FND-002",
      studyId,
      statement: "Schedule rigidity conflicts with seasonal agricultural peaks.",
      explanation: "Harvest seasons see attendance drops.",
      supportingEvidenceIds: ["EV-002"],
      contradictoryEvidence: "None documented",
      evidenceStrength: "Medium",
      programmeImplication: "Adapt schedules seasonally.",
      linkedRecommendationIds: [],
      validationStatus: "Validated",
      revision: 1,
    };

    const multiLinkedLesson: LessonLearned & { studyId: StudyId } = {
      id: "LES-001",
      studyId,
      statement: "Operational and seasonal barriers must be jointly planned.",
      whatWorkedOrDidNotWork: "Flexible calendar plus transport stipends.",
      whyItHappened: "Participants juggle livelihoods with participation.",
      conditionsRequired: "Seasonal calendar validation.",
      evidenceBase: ["EV-001", "EV-002"],
      linkedFindingIds: ["FND-001", "FND-002"],
      lineageStatus: "resolved",
      transferability: "Transferable to rural programs.",
      validationStatus: "Validated",
      revision: 1,
    };

    await saveFinding(finding1);
    await saveFinding(finding2);
    await saveLesson(multiLinkedLesson);

    const study = await assembleStudy(studyId);
    expect(study).toBeDefined();

    const retrievedLesson = study?.lessons.find((l) => l.id === "LES-001");
    expect(retrievedLesson?.linkedFindingIds).toEqual(["FND-001", "FND-002"]);
    expect(retrievedLesson?.lineageStatus).toBe("resolved");

    // Traversal: given FND-001, find all lessons linked to it
    const lessonsForFnd1 = (study?.lessons || []).filter((l) =>
      l.linkedFindingIds?.includes("FND-001")
    );
    expect(lessonsForFnd1.map((l) => l.id)).toContain("LES-001");

    // Traversal: given FND-002, find all lessons linked to it
    const lessonsForFnd2 = (study?.lessons || []).filter((l) =>
      l.linkedFindingIds?.includes("FND-002")
    );
    expect(lessonsForFnd2.map((l) => l.id)).toContain("LES-001");
  });

  it("2. enforces recommendation dual-write synchronization with linkedFindingId and index by_finding", async () => {
    // Save prerequisite findings
    await saveFinding({
      id: "FND-PRIMARY",
      studyId,
      statement: "Primary finding statement",
      explanation: "Explanation",
      supportingEvidenceIds: ["EV-001"],
      contradictoryEvidence: "None documented",
      evidenceStrength: "High",
      programmeImplication: "Implication",
      linkedRecommendationIds: [],
      validationStatus: "Validated",
      revision: 1,
    });
    await saveFinding({
      id: "FND-SECONDARY",
      studyId,
      statement: "Secondary finding statement",
      explanation: "Explanation",
      supportingEvidenceIds: ["EV-002"],
      contradictoryEvidence: "None documented",
      evidenceStrength: "Medium",
      programmeImplication: "Implication",
      linkedRecommendationIds: [],
      validationStatus: "Validated",
      revision: 1,
    });

    const recommendation: Recommendation & { studyId: StudyId } = {
      id: "REC-DUAL-001",
      studyId,
      recommendation: "Establish joint seasonal and transport planning cycles.",
      linkedFindingId: "FND-PRIMARY",
      linkedFindingIds: ["FND-PRIMARY", "FND-SECONDARY"],
      linkedLessonIds: ["LES-001"],
      evidenceBase: ["EV-001"],
      responsibleActor: "Operations Team",
      priority: "High",
      timeframe: "Immediate",
      feasibility: "High",
      riskSensitivity: "Low",
      expectedBenefit: "Reliable attendance.",
      successIndicator: "Zero scheduling conflicts.",
      validationStatus: "Validated",
      revision: 1,
    };

    await saveRecommendation(recommendation);

    const fetched = await getRecommendation(studyId, "REC-DUAL-001");
    expect(fetched).toBeDefined();
    // Dual-write guarantee: linkedFindingId MUST be synchronized to linkedFindingIds[0]
    expect(fetched?.linkedFindingId).toBe("FND-PRIMARY");
    expect(fetched?.linkedFindingIds).toEqual(["FND-PRIMARY", "FND-SECONDARY"]);
    expect(fetched?.linkedLessonIds).toEqual(["LES-001"]);

    // IndexedDB by_finding index must return the record via FND-PRIMARY
    const db = await getDb();
    const recordsFromIndex = await db.getAllFromIndex(
      "recommendations",
      "by_finding",
      [studyId, "FND-PRIMARY"]
    );
    expect(recordsFromIndex.length).toBe(1);
    expect(recordsFromIndex[0].id).toBe("REC-DUAL-001");
  });

  it("3. backfills single linkedFindingId into linkedFindingIds[] when writing legacy recommendation", async () => {
    await saveFinding({
      id: "FND-SINGLE-001",
      studyId,
      statement: "Single finding statement",
      explanation: "Explanation",
      supportingEvidenceIds: ["EV-001"],
      contradictoryEvidence: "None documented",
      evidenceStrength: "High",
      programmeImplication: "Implication",
      linkedRecommendationIds: [],
      validationStatus: "Validated",
      revision: 1,
    });

    const legacyRec: Recommendation & { studyId: StudyId } = {
      id: "REC-LEGACY-001",
      studyId,
      recommendation: "Legacy recommendation with single finding link.",
      linkedFindingId: "FND-SINGLE-001",
      evidenceBase: ["EV-001"],
      responsibleActor: "Coordinator",
      priority: "Medium",
      timeframe: "Next month",
      feasibility: "Medium",
      riskSensitivity: "Low",
      expectedBenefit: "Benefit",
      successIndicator: "Indicator",
      validationStatus: "Validated",
      revision: 1,
    };

    await saveRecommendation(legacyRec);

    const fetched = await getRecommendation(studyId, "REC-LEGACY-001");
    expect(fetched?.linkedFindingId).toBe("FND-SINGLE-001");
    expect(fetched?.linkedFindingIds).toEqual(["FND-SINGLE-001"]);
    expect(fetched?.linkedLessonIds).toEqual([]);
  });

  it("4. preserves legacy lessons as Validated with lineageStatus 'legacy_unresolved'", async () => {
    const unlinkedLegacyLesson: LessonLearned & { studyId: StudyId } = {
      id: "LES-LEGACY-UNLINKED",
      studyId,
      statement: "Legacy lesson validated without finding linkage in v1.",
      whatWorkedOrDidNotWork: "Worked well.",
      whyItHappened: "Direct observation.",
      conditionsRequired: "Contextual stability.",
      evidenceBase: ["EV-001"],
      transferability: "Contextual transferability.",
      validationStatus: "Validated",
      revision: 1,
    };

    await saveLesson(unlinkedLegacyLesson);

    const study = await assembleStudy(studyId);
    const lesson = study?.lessons.find((l) => l.id === "LES-LEGACY-UNLINKED");
    expect(lesson).toBeDefined();
    // Validation status must NOT be downgraded or reset
    expect(lesson?.validationStatus).toBe("Validated");
    expect(lesson?.linkedFindingIds).toEqual([]);
    expect(lesson?.lineageStatus).toBe("legacy_unresolved");
  });

  it("5. performs bidirectional lineage traversal across findings, lessons, and recommendations", async () => {
    const fndA: Finding & { studyId: StudyId } = {
      id: "FND-A",
      studyId,
      statement: "Finding A statement",
      explanation: "Explanation A",
      supportingEvidenceIds: ["EV-001"],
      contradictoryEvidence: "None documented",
      evidenceStrength: "High",
      programmeImplication: "Implication A",
      linkedRecommendationIds: ["REC-1"],
      validationStatus: "Validated",
      revision: 1,
    };

    const les1: LessonLearned & { studyId: StudyId } = {
      id: "LES-1",
      studyId,
      statement: "Lesson 1 statement",
      whatWorkedOrDidNotWork: "Worked",
      whyItHappened: "Why",
      conditionsRequired: "Conditions",
      evidenceBase: ["EV-001"],
      linkedFindingIds: ["FND-A"],
      lineageStatus: "resolved",
      transferability: "Transferable",
      validationStatus: "Validated",
      revision: 1,
    };

    const gp1: GoodPractice & { studyId: StudyId } = {
      id: "GP-1",
      studyId,
      title: "Good Practice 1",
      description: "Description",
      whyItWorked: "Why it worked",
      evidenceBase: ["EV-001"],
      linkedFindingIds: ["FND-A"],
      lineageStatus: "resolved",
      conditionsForReplication: "Replication",
      risksLimits: "Limits",
      recommendedUse: "Use",
      validationStatus: "Validated",
      revision: 1,
    };

    const rec1: Recommendation & { studyId: StudyId } = {
      id: "REC-1",
      studyId,
      recommendation: "Recommendation 1",
      linkedFindingId: "FND-A",
      linkedFindingIds: ["FND-A"],
      linkedLessonIds: ["LES-1"],
      evidenceBase: ["EV-001"],
      responsibleActor: "Lead",
      priority: "High",
      timeframe: "Immediate",
      feasibility: "High",
      riskSensitivity: "Low",
      expectedBenefit: "Benefit",
      successIndicator: "Indicator",
      validationStatus: "Validated",
      revision: 1,
    };

    await saveFinding(fndA);
    await saveLesson(les1);
    await saveGoodPractice(gp1);
    await saveRecommendation(rec1);

    const study = await assembleStudy(studyId);
    expect(study).toBeDefined();

    // From Finding -> downstream artifacts
    const downstreamLessons = (study?.lessons || []).filter((l) =>
      l.linkedFindingIds?.includes("FND-A")
    );
    const downstreamGps = (study?.goodPractices || []).filter((g) =>
      g.linkedFindingIds?.includes("FND-A")
    );
    const downstreamRecs = (study?.recommendations || []).filter((r) =>
      r.linkedFindingIds?.includes("FND-A")
    );

    expect(downstreamLessons.map((l) => l.id)).toEqual(["LES-1"]);
    expect(downstreamGps.map((g) => g.id)).toEqual(["GP-1"]);
    expect(downstreamRecs.map((r) => r.id)).toEqual(["REC-1"]);

    // From Recommendation -> upstream artifacts
    const theRec = study?.recommendations.find((r) => r.id === "REC-1");
    const upstreamFindings = (study?.findings || []).filter((f) =>
      theRec?.linkedFindingIds?.includes(f.id)
    );
    const upstreamLessons = (study?.lessons || []).filter((l) =>
      theRec?.linkedLessonIds?.includes(l.id)
    );

    expect(upstreamFindings.map((f) => f.id)).toEqual(["FND-A"]);
    expect(upstreamLessons.map((l) => l.id)).toEqual(["LES-1"]);
  });
});
