import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  clearAllStores,
  saveStudyMeta,
  saveSource,
  getSource,
  saveEvidence,
  getEvidence,
  saveDebrief,
  getDebrief,
  listDebriefs,
  deleteDebrief,
  assembleStudy,
  listFindings,
  bootstrapDemoTemplates,
  cloneDemoStudy,
} from "@/lib/storage";
import { getNextDebriefId } from "@/lib/idGenerator";
import type {
  StudyMeta,
  SourceRecord,
  EvidenceEntry,
  DailyDebrief,
} from "@/lib/types";

describe("Daily Field Debrief Studio - Domain & Persistence", () => {
  const testStudyId = "study-upper-egypt-eval";

  const sampleMeta: StudyMeta = {
    id: testStudyId,
    title: "Upper Egypt Education Field Evaluation",
    subtitle: "Community school resilience study across Minya and Assiut",
    status: "Active Fieldwork",
    context: "Field mission evaluating community school performance and governance.",
    scope: {
      targetSites: ["Minya Rural School A", "Assiut Community Hub B"],
      isSingleSiteStudy: false,
      targetStakeholderGroups: ["Teachers", "Parents", "Supervisors"],
    },
    executiveSummary: "Ongoing evaluation.",
    keyMessages: [],
    limitations: [],
    createdAt: 1774500000000,
    updatedAt: 1774500000000,
    isDemoCase: false,
  };

  const sampleSource: SourceRecord = {
    id: "SRC-001",
    sourceType: "Key Informant Interview",
    stakeholderType: "Teachers",
    location: "Minya Rural School A",
    siteId: "Minya Rural School A",
    date: "2026-09-26",
    title: "KII with Minya Head Teacher",
    summary: "Teacher discusses governance bottlenecks and solar power instability.",
    rawText: "Solar battery fails afternoon classes. Board meetings infrequent.",
    consentStatus: "Oral",
    anonymizationStatus: "Pseudonymized",
    sensitivityFlag: "Low",
  };

  const sampleEvidence: EvidenceEntry = {
    id: "EV-001",
    sourceId: "SRC-001",
    rawEvidence: "Teacher confirmed solar storage battery depletes by 12:30 PM, ending computer lab classes.",
    rawObservation: "Teacher confirmed solar storage battery depletes by 12:30 PM, ending computer lab classes.",
    interpretation: "Power unreliability halts digital curriculum daily.",
    primaryTheme: "Access",
    secondaryTheme: "Governance",
    stakeholderType: "Teachers",
    evidenceStrength: "High",
    sensitivityFlag: "Low",
    qaStatus: "Reviewed",
    validationStatus: "Draft",
    contradictionIds: [],
    revision: 1,
    potentialFinding: "Solar infrastructure failure impairs digital instruction.",
  };

  beforeEach(async () => {
    await clearAllStores();
    await saveStudyMeta(sampleMeta);
    await saveSource({ ...sampleSource, studyId: testStudyId });
    await saveEvidence({ ...sampleEvidence, studyId: testStudyId });
  });

  describe("Persistence & Lifecycle", () => {
    it("creates, saves, retrieves, and lists daily debriefs", async () => {
      const now = Date.now();
      const debrief: DailyDebrief = {
        id: "DBR-001",
        studyId: testStudyId,
        date: "2026-09-26",
        siteIds: ["site-minya-01"],
        attendees: ["M. Selim", "Field Evaluator B"],
        whatSurprisedUs: "Board participation dropped by half after relocation.",
        whatRepeated: "Teachers in three classrooms complained of battery depletion.",
        contradictionsObserved: "Supervisor claim of 100% attendance contradicts attendance logs.",
        shakenAssumptions: "We assumed community committees meet monthly.",
        potentialBiases: "Interviewer may have over-weighted teacher complaints vs admin log.",
        missingPerspectives: "We have not yet interviewed student mothers directly.",
        emergingHypotheses: "Governance breakdowns stem from lack of transportation stipends.",
        tomorrowPriorities: [
          "Cross-examine attendance sheets at Assiut Hub B",
          "Conduct focus group with student mothers",
        ],
        linkedSourceIds: ["SRC-001"],
        linkedEvidenceIds: ["EV-001"],
        createdAt: now,
        updatedAt: now,
      };

      await saveDebrief(debrief);

      const retrieved = await getDebrief(testStudyId, "DBR-001");
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe("DBR-001");
      expect(retrieved?.date).toBe("2026-09-26");
      expect(retrieved?.siteIds).toEqual(["site-minya-01"]);
      expect(retrieved?.tomorrowPriorities).toHaveLength(2);
      expect(retrieved?.linkedSourceIds).toContain("SRC-001");
      expect(retrieved?.linkedEvidenceIds).toContain("EV-001");

      const list = await listDebriefs(testStudyId);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("DBR-001");
    });

    it("updates an existing debrief preserving id and createdAt while updating updatedAt", async () => {
      const initialTime = 1774500000000;
      const debrief: DailyDebrief = {
        id: "DBR-001",
        studyId: testStudyId,
        date: "2026-09-26",
        siteIds: ["site-minya-01"],
        attendees: ["M. Selim"],
        whatSurprisedUs: "Initial surprise.",
        whatRepeated: "",
        contradictionsObserved: "",
        shakenAssumptions: "",
        potentialBiases: "",
        missingPerspectives: "",
        emergingHypotheses: "Initial hypothesis.",
        tomorrowPriorities: ["Check school solar inverter"],
        linkedSourceIds: [],
        linkedEvidenceIds: [],
        createdAt: initialTime,
        updatedAt: initialTime,
      };

      await saveDebrief(debrief);

      const updateTime = initialTime + 3600000;
      const updatedDebrief: DailyDebrief = {
        ...debrief,
        whatSurprisedUs: "Updated surprise note with additional context.",
        tomorrowPriorities: ["Check school solar inverter", "Interview caretaker"],
        updatedAt: updateTime,
      };

      await saveDebrief(updatedDebrief);

      const loaded = await getDebrief(testStudyId, "DBR-001");
      expect(loaded?.id).toBe("DBR-001");
      expect(loaded?.createdAt).toBe(initialTime);
      expect(loaded?.updatedAt).toBe(updateTime);
      expect(loaded?.whatSurprisedUs).toBe("Updated surprise note with additional context.");
      expect(loaded?.tomorrowPriorities).toHaveLength(2);
    });

    it("deletes a debrief cleanly without impacting other study records", async () => {
      const debrief: DailyDebrief = {
        id: "DBR-001",
        studyId: testStudyId,
        date: "2026-09-26",
        siteIds: ["site-minya-01"],
        attendees: ["M. Selim"],
        whatSurprisedUs: "Temporary note.",
        whatRepeated: "",
        contradictionsObserved: "",
        shakenAssumptions: "",
        potentialBiases: "",
        missingPerspectives: "",
        emergingHypotheses: "",
        tomorrowPriorities: [],
        linkedSourceIds: [],
        linkedEvidenceIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveDebrief(debrief);
      expect(await listDebriefs(testStudyId)).toHaveLength(1);

      await deleteDebrief(testStudyId, "DBR-001");
      expect(await listDebriefs(testStudyId)).toHaveLength(0);
      expect(await getDebrief(testStudyId, "DBR-001")).toBeUndefined();

      // Sources and evidence remain completely intact
      const source = await getSource(testStudyId, "SRC-001");
      expect(source).toBeDefined();
      const evidence = await getEvidence(testStudyId, "EV-001");
      expect(evidence).toBeDefined();
    });
  });

  describe("Multi-Site & Scope Support", () => {
    it("supports study-wide debriefs with empty siteIds", async () => {
      const debrief: DailyDebrief = {
        id: "DBR-001",
        studyId: testStudyId,
        date: "2026-09-26",
        siteIds: [],
        attendees: ["Team Lead", "All Researchers"],
        whatSurprisedUs: "Cross-governorate divergence in maintenance response times.",
        whatRepeated: "Consistent teacher dedication despite delayed stipends.",
        contradictionsObserved: "",
        shakenAssumptions: "",
        potentialBiases: "",
        missingPerspectives: "",
        emergingHypotheses: "",
        tomorrowPriorities: ["Regroup in Minya city office"],
        linkedSourceIds: [],
        linkedEvidenceIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveDebrief(debrief);
      const loaded = await getDebrief(testStudyId, "DBR-001");
      expect(loaded?.siteIds).toEqual([]);
    });

    it("supports multi-site debriefs covering multiple sites simultaneously", async () => {
      const debrief: DailyDebrief = {
        id: "DBR-001",
        studyId: testStudyId,
        date: "2026-09-26",
        siteIds: ["site-minya-01", "site-assiut-02"],
        attendees: ["M. Selim", "Field Researcher 2"],
        whatSurprisedUs: "Minya and Assiut school boards face identical supply hurdles.",
        whatRepeated: "",
        contradictionsObserved: "",
        shakenAssumptions: "",
        potentialBiases: "",
        missingPerspectives: "",
        emergingHypotheses: "",
        tomorrowPriorities: [],
        linkedSourceIds: [],
        linkedEvidenceIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveDebrief(debrief);
      const loaded = await getDebrief(testStudyId, "DBR-001");
      expect(loaded?.siteIds).toEqual(["site-minya-01", "site-assiut-02"]);
    });
  });

  describe("Same-Date Multiple Sessions & ID Generation", () => {
    it("persists multiple debriefs on the same date independently with sequential IDs", async () => {
      const morningDebrief: DailyDebrief = {
        id: "DBR-001",
        studyId: testStudyId,
        date: "2026-09-26",
        siteIds: ["site-minya-01"],
        attendees: ["M. Selim"],
        whatSurprisedUs: "Morning school visit notes.",
        whatRepeated: "",
        contradictionsObserved: "",
        shakenAssumptions: "",
        potentialBiases: "",
        missingPerspectives: "",
        emergingHypotheses: "",
        tomorrowPriorities: ["Afternoon followup"],
        linkedSourceIds: [],
        linkedEvidenceIds: [],
        createdAt: 1774510000000,
        updatedAt: 1774510000000,
      };

      const eveningDebrief: DailyDebrief = {
        id: "DBR-002",
        studyId: testStudyId,
        date: "2026-09-26",
        siteIds: ["site-assiut-02"],
        attendees: ["M. Selim", "Field Researcher 2"],
        whatSurprisedUs: "Evening supervisor interview notes.",
        whatRepeated: "",
        contradictionsObserved: "",
        shakenAssumptions: "",
        potentialBiases: "",
        missingPerspectives: "",
        emergingHypotheses: "",
        tomorrowPriorities: ["Review morning and evening logs"],
        linkedSourceIds: [],
        linkedEvidenceIds: [],
        createdAt: 1774530000000,
        updatedAt: 1774530000000,
      };

      await saveDebrief(morningDebrief);
      await saveDebrief(eveningDebrief);

      const list = await listDebriefs(testStudyId);
      expect(list).toHaveLength(2);

      const d1 = await getDebrief(testStudyId, "DBR-001");
      const d2 = await getDebrief(testStudyId, "DBR-002");
      expect(d1?.date).toBe("2026-09-26");
      expect(d2?.date).toBe("2026-09-26");
      expect(d1?.whatSurprisedUs).toBe("Morning school visit notes.");
      expect(d2?.whatSurprisedUs).toBe("Evening supervisor interview notes.");
    });

    it("generates resilient next debrief IDs surviving gaps", () => {
      expect(getNextDebriefId([])).toBe("DBR-001");
      expect(getNextDebriefId(["DBR-001"])).toBe("DBR-002");
      expect(getNextDebriefId(["DBR-001", "DBR-002", "DBR-003"])).toBe("DBR-004");
      // Survives gap in imported or deleted debrief IDs
      expect(getNextDebriefId(["DBR-001", "DBR-005"])).toBe("DBR-006");
      // Handles un-padded or non-matching gracefully
      expect(getNextDebriefId(["DBR-99"])).toBe("DBR-100");
    });
  });

  describe("Non-Mutation Invariants & Architectural Boundaries", () => {
    it("creating or editing a debrief NEVER alters Evidence validationStatus or revision", async () => {
      // Evidence starts as Draft with revision 1
      const initialEvidence = await getEvidence(testStudyId, "EV-001");
      expect(initialEvidence?.validationStatus).toBe("Draft");
      expect(initialEvidence?.revision).toBe(1);

      // Create a debrief linking this evidence
      const debrief: DailyDebrief = {
        id: "DBR-001",
        studyId: testStudyId,
        date: "2026-09-26",
        siteIds: ["site-minya-01"],
        attendees: ["Evaluator"],
        whatSurprisedUs: "Debrief reflection on evidence.",
        whatRepeated: "",
        contradictionsObserved: "Apparent tension between records.",
        shakenAssumptions: "",
        potentialBiases: "",
        missingPerspectives: "",
        emergingHypotheses: "Working hypothesis that requires more field investigation.",
        tomorrowPriorities: [],
        linkedSourceIds: ["SRC-001"],
        linkedEvidenceIds: ["EV-001"],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveDebrief(debrief);

      // Verify Evidence was NOT mutated
      const evidenceAfterDebrief = await getEvidence(testStudyId, "EV-001");
      expect(evidenceAfterDebrief?.validationStatus).toBe("Draft");
      expect(evidenceAfterDebrief?.revision).toBe(1);
      expect(evidenceAfterDebrief?.rawEvidence).toBe(initialEvidence?.rawEvidence);
    });

    it("reflections in contradictionsObserved NEVER populate or modify Evidence contradictionIds", async () => {
      const initialEvidence = await getEvidence(testStudyId, "EV-001");
      expect(initialEvidence?.contradictionIds).toEqual([]);

      const debrief: DailyDebrief = {
        id: "DBR-001",
        studyId: testStudyId,
        date: "2026-09-26",
        siteIds: ["site-minya-01"],
        attendees: ["Evaluator"],
        whatSurprisedUs: "",
        whatRepeated: "",
        contradictionsObserved: "Teacher statement directly contradicts district report on textbook distribution.",
        shakenAssumptions: "",
        potentialBiases: "",
        missingPerspectives: "",
        emergingHypotheses: "",
        tomorrowPriorities: [],
        linkedSourceIds: ["SRC-001"],
        linkedEvidenceIds: ["EV-001"],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveDebrief(debrief);

      // Evidence contradictionIds must remain strictly empty (unchanged)
      const evidenceAfter = await getEvidence(testStudyId, "EV-001");
      expect(evidenceAfter?.contradictionIds).toEqual([]);
    });

    it("emerging hypotheses NEVER automatically promote into Findings or Recommendations", async () => {
      // Study initially has 0 findings
      const initialFindings = await listFindings(testStudyId);
      expect(initialFindings).toHaveLength(0);

      const debrief: DailyDebrief = {
        id: "DBR-001",
        studyId: testStudyId,
        date: "2026-09-26",
        siteIds: ["site-minya-01"],
        attendees: ["Evaluator"],
        whatSurprisedUs: "",
        whatRepeated: "",
        contradictionsObserved: "",
        shakenAssumptions: "",
        potentialBiases: "",
        missingPerspectives: "",
        emergingHypotheses: "Decentralized school management improves teacher retention.",
        tomorrowPriorities: ["Test this hypothesis with headmaster interviews"],
        linkedSourceIds: ["SRC-001"],
        linkedEvidenceIds: ["EV-001"],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveDebrief(debrief);

      // Verify findings remain exactly 0
      const findingsAfter = await listFindings(testStudyId);
      expect(findingsAfter).toHaveLength(0);

      // Full study assembly confirms findings count is 0 while debrief exists
      const assembled = await assembleStudy(testStudyId);
      expect(assembled?.findings).toHaveLength(0);
      expect(assembled?.debriefs).toHaveLength(1);
      expect(assembled?.debriefs[0].emergingHypotheses).toBe(
        "Decentralized school management improves teacher retention."
      );
    });
  });

  describe("Demo Template Protection", () => {
    it("preserves pristine demo templates and requires cloning for edits", async () => {
      await bootstrapDemoTemplates();

      const demoDebriefs = await listDebriefs("community-bridges");
      expect(demoDebriefs).toHaveLength(0);

      // Cloning creates an editable copy where debriefs can be added
      const clonedId = await cloneDemoStudy("community-bridges", "Community Bridges - Field Mission Copy");
      expect(clonedId).toBeTruthy();

      const clonedMeta = (await assembleStudy(clonedId))!;
      expect(clonedMeta.isDemoCase).toBe(false);

      const debriefOnClone: DailyDebrief = {
        id: "DBR-001",
        studyId: clonedId,
        date: "2026-09-26",
        siteIds: [],
        attendees: ["Evaluator 1"],
        whatSurprisedUs: "Debrief on cloned study.",
        whatRepeated: "",
        contradictionsObserved: "",
        shakenAssumptions: "",
        potentialBiases: "",
        missingPerspectives: "",
        emergingHypotheses: "",
        tomorrowPriorities: [],
        linkedSourceIds: [],
        linkedEvidenceIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveDebrief(debriefOnClone);

      // Cloned study now has 1 debrief
      const cloneDebriefs = await listDebriefs(clonedId);
      expect(cloneDebriefs).toHaveLength(1);

      // Pristine demo study still has 0 debriefs
      const pristineDebriefs = await listDebriefs("community-bridges");
      expect(pristineDebriefs).toHaveLength(0);
    });
  });

  describe("Assemble Study with Debriefs", () => {
    it("assembles complete study including debriefs and preserves links", async () => {
      const debrief: DailyDebrief = {
        id: "DBR-001",
        studyId: testStudyId,
        date: "2026-09-26",
        siteIds: ["site-minya-01"],
        attendees: ["M. Selim"],
        whatSurprisedUs: "High student enthusiasm for science lab.",
        whatRepeated: "",
        contradictionsObserved: "",
        shakenAssumptions: "",
        potentialBiases: "",
        missingPerspectives: "",
        emergingHypotheses: "",
        tomorrowPriorities: ["Inspect science kit delivery logs"],
        linkedSourceIds: ["SRC-001"],
        linkedEvidenceIds: ["EV-001"],
        createdAt: 1774520000000,
        updatedAt: 1774520000000,
      };

      await saveDebrief(debrief);

      const study = await assembleStudy(testStudyId);
      expect(study).toBeDefined();
      expect(study?.debriefs).toHaveLength(1);
      expect(study?.debriefs[0].id).toBe("DBR-001");
      expect(study?.debriefs[0].linkedSourceIds).toEqual(["SRC-001"]);
      expect(study?.debriefs[0].linkedEvidenceIds).toEqual(["EV-001"]);
      expect(study?.sources).toHaveLength(1);
      expect(study?.evidence).toHaveLength(1);
    });
  });
});
