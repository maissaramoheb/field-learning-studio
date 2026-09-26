import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  getDb,
  clearAllStores,
  listStudies,
  saveStudyMeta,
  deleteStudy,
  saveSource,
  getSource,
  listSources,
  deleteSource,
  saveEvidence,
  getEvidence,
  listEvidence,
  deleteEvidence,
  saveDebrief,
  getDebrief,
  listDebriefs,
  deleteDebrief,
  saveFinding,
  getFinding,
  listFindings,
  saveLesson,
  getLesson,
  listLessons,
  saveGoodPractice,
  getGoodPractice,
  listGoodPractices,
  saveRecommendation,
  getRecommendation,
  listRecommendations,
  assembleStudy,
  bootstrapDemoTemplates,
  cloneDemoStudy,
  exportStudyBackup,
  importStudyBackup,
  validateStudyBackupEnvelope,
  BACKUP_FORMAT_IDENTIFIER,
  BACKUP_FORMAT_VERSION,
} from "@/lib/storage";
import type {
  StudyMeta,
  SourceRecord,
  EvidenceEntry,
  DailyDebrief,
  Finding,
  LessonLearned,
  GoodPractice,
  Recommendation,
} from "@/lib/types";

describe("Normalized IndexedDB Storage Foundation (v0.9 Phase 1)", () => {
  beforeEach(async () => {
    await clearAllStores();
  });

  describe("1. Database Initialization & Schema", () => {
    it("opens the database and confirms all 8 required object stores exist", async () => {
      const db = await getDb();
      const expectedStores = [
        "studies",
        "sources",
        "evidence",
        "debriefs",
        "findings",
        "lessons",
        "goodPractices",
        "recommendations",
      ];

      for (const store of expectedStores) {
        expect(db.objectStoreNames.contains(store)).toBe(true);
      }
    });

    it("verifies expected indices exist on stores", async () => {
      const db = await getDb();
      const tx = db.transaction(["studies", "sources", "evidence", "debriefs", "recommendations"]);

      expect(tx.objectStore("studies").indexNames.contains("by_status")).toBe(true);
      expect(tx.objectStore("sources").indexNames.contains("by_study")).toBe(true);
      expect(tx.objectStore("sources").indexNames.contains("by_date")).toBe(true);
      expect(tx.objectStore("evidence").indexNames.contains("by_study")).toBe(true);
      expect(tx.objectStore("evidence").indexNames.contains("by_source")).toBe(true);
      expect(tx.objectStore("evidence").indexNames.contains("by_validationStatus")).toBe(true);
      expect(tx.objectStore("debriefs").indexNames.contains("by_study")).toBe(true);
      expect(tx.objectStore("debriefs").indexNames.contains("by_date")).toBe(true);
      expect(tx.objectStore("recommendations").indexNames.contains("by_study")).toBe(true);
      expect(tx.objectStore("recommendations").indexNames.contains("by_finding")).toBe(true);
    });
  });

  describe("2. Study Isolation via Compound Keys [studyId, id]", () => {
    it("safely isolates child records with identical IDs in different studies without collision", async () => {
      const studyA: StudyMeta = {
        id: "study-alpha",
        title: "Study Alpha",
        subtitle: "District A",
        context: "Alpha context",
        status: "Active Fieldwork",
        isDemoCase: false,
        scope: {
          targetSites: ["Site A"],
          isSingleSiteStudy: true,
          targetStakeholderGroups: ["Teachers"],
        },
        executiveSummary: "Summary A",
        keyMessages: ["Msg A"],
        limitations: ["Lim A"],
        createdAt: 1000,
        updatedAt: 1000,
      };

      const studyB: StudyMeta = {
        id: "study-beta",
        title: "Study Beta",
        subtitle: "District B",
        context: "Beta context",
        status: "Active Fieldwork",
        isDemoCase: false,
        scope: {
          targetSites: ["Site B"],
          isSingleSiteStudy: true,
          targetStakeholderGroups: ["Farmers"],
        },
        executiveSummary: "Summary B",
        keyMessages: ["Msg B"],
        limitations: ["Lim B"],
        createdAt: 2000,
        updatedAt: 2000,
      };

      await saveStudyMeta(studyA);
      await saveStudyMeta(studyB);

      // Both studies store an evidence entry with the exact same ID "EV-001"
      const evA: EvidenceEntry & { studyId: string } = {
        id: "EV-001",
        studyId: "study-alpha",
        sourceId: "SRC-001",
        stakeholderType: "Teachers",
        rawEvidence: "Alpha specific observation on school attendance",
        primaryTheme: "Attendance",
        secondaryTheme: "Nutrition",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "Attendance improved",
        qaStatus: "Reviewed",
        validationStatus: "Validated",
        revision: 1,
      };

      const evB: EvidenceEntry & { studyId: string } = {
        id: "EV-001",
        studyId: "study-beta",
        sourceId: "SRC-001",
        stakeholderType: "Farmers",
        rawEvidence: "Beta specific observation on crop yields",
        primaryTheme: "Agriculture",
        secondaryTheme: "Irrigation",
        evidenceStrength: "Medium",
        sensitivityFlag: "None",
        potentialFinding: "Yields fluctuated",
        qaStatus: "Needs Review",
        validationStatus: "Draft",
        revision: 1,
      };

      await saveEvidence(evA);
      await saveEvidence(evB);

      // Verify retrieval returns correct study-scoped entity
      const retrievedA = await getEvidence("study-alpha", "EV-001");
      const retrievedB = await getEvidence("study-beta", "EV-001");

      expect(retrievedA).toBeDefined();
      expect(retrievedA?.rawEvidence).toBe("Alpha specific observation on school attendance");
      expect(retrievedA?.validationStatus).toBe("Validated");

      expect(retrievedB).toBeDefined();
      expect(retrievedB?.rawEvidence).toBe("Beta specific observation on crop yields");
      expect(retrievedB?.validationStatus).toBe("Draft");

      // Verify listing by study separates them
      const listA = await listEvidence("study-alpha");
      const listB = await listEvidence("study-beta");

      expect(listA.length).toBe(1);
      expect(listA[0].rawEvidence).toBe("Alpha specific observation on school attendance");

      expect(listB.length).toBe(1);
      expect(listB[0].rawEvidence).toBe("Beta specific observation on crop yields");

      // Deleting in Study A does not affect Study B
      await deleteEvidence("study-alpha", "EV-001");
      expect(await getEvidence("study-alpha", "EV-001")).toBeUndefined();
      expect(await getEvidence("study-beta", "EV-001")).toBeDefined();
    });
  });

  describe("3. Normalized CRUD Operations", () => {
    it("handles Source create, read, list, and delete", async () => {
      const source: SourceRecord & { studyId: string } = {
        id: "SRC-001",
        studyId: "test-study",
        title: "KII with District Coordinator",
        sourceType: "Key Informant Interview",
        date: "2026-03-15",
        stakeholderType: "Government Official",
        location: "District HQ",
        consentStatus: "Written",
        anonymizationStatus: "Anonymized",
        summary: "Discussion on operational logistics",
        sensitivityFlag: "None",
      };

      await saveSource(source);

      const fetched = await getSource("test-study", "SRC-001");
      expect(fetched).toBeDefined();
      expect(fetched?.title).toBe("KII with District Coordinator");

      const all = await listSources("test-study");
      expect(all.length).toBe(1);

      await deleteSource("test-study", "SRC-001");
      expect(await getSource("test-study", "SRC-001")).toBeUndefined();
    });

    it("handles Daily Debrief create, read, list, and multi-site support", async () => {
      const debrief: DailyDebrief = {
        id: "DBR-001",
        studyId: "test-study",
        date: "2026-03-15",
        siteIds: ["Site-1", "Site-2"], // Multi-site requirement verified
        attendees: ["Lead Evaluator", "Field Researcher"],
        whatSurprisedUs: "Community participation exceeded expectations.",
        whatRepeated: "Complaints about transport delays.",
        contradictionsObserved: "Official logs stated supplies arrived on Monday.",
        shakenAssumptions: "We assumed all schools had power.",
        potentialBiases: "Morning visits selected more engaged parents.",
        missingPerspectives: "Youth voice underrepresented.",
        emergingHypotheses: "Decentralized distribution increases uptake.",
        tomorrowPriorities: ["Conduct youth focus group"],
        linkedSourceIds: ["SRC-001"],
        linkedEvidenceIds: ["EV-001"],
        createdAt: 1000,
        updatedAt: 1000,
      };

      await saveDebrief(debrief);

      const fetched = await getDebrief("test-study", "DBR-001");
      expect(fetched).toBeDefined();
      expect(fetched?.siteIds).toEqual(["Site-1", "Site-2"]);
      expect(fetched?.tomorrowPriorities).toContain("Conduct youth focus group");

      const all = await listDebriefs("test-study");
      expect(all.length).toBe(1);

      await deleteDebrief("test-study", "DBR-001");
      expect(await getDebrief("test-study", "DBR-001")).toBeUndefined();
    });

    it("handles Findings, Lessons, Good Practices, and Recommendations CRUD", async () => {
      const studyId = "test-study";

      const finding: Finding & { studyId: string } = {
        id: "FND-001",
        studyId,
        statement: "Community engagement increased program ownership.",
        explanation: "Frequent consultations built local trust.",
        supportingEvidenceIds: ["EV-001"],
        contradictoryEvidence: "None noted.",
        evidenceStrength: "High",
        programmeImplication: "Expand consultative committees.",
        linkedRecommendationIds: ["REC-001"],
        validationStatus: "Needs Review",
        revision: 2,
        rejectionReason: undefined,
      };

      const lesson: LessonLearned & { studyId: string } = {
        id: "LES-001",
        studyId,
        statement: "Engaging elders early mitigates field resistance.",
        whatWorkedOrDidNotWork: "Elder briefings secured village access.",
        whyItHappened: "Traditional authority structures hold high influence.",
        conditionsRequired: "Briefings must occur prior to team arrival.",
        evidenceBase: ["EV-001"],
        transferability: "Rural community programs.",
        validationStatus: "Validated",
        revision: 1,
      };

      const gp: GoodPractice & { studyId: string } = {
        id: "GP-001",
        studyId,
        title: "Daily Evening Debrief Protocol",
        description: "15-minute debrief immediately after field visits.",
        whyItWorked: "Captured rapid perishable impressions before forgetting.",
        evidenceBase: ["EV-001"],
        conditionsForReplication: "Field team co-located at end of day.",
        risksLimits: "Team fatigue if debriefs exceed 30 minutes.",
        recommendedUse: "All multi-site evaluations.",
        validationStatus: "Validated",
        revision: 1,
      };

      const rec: Recommendation & { studyId: string } = {
        id: "REC-001",
        studyId,
        recommendation: "Institutionalize village entry protocols.",
        linkedFindingId: "FND-001",
        evidenceBase: ["EV-001"],
        responsibleActor: "Field Operations Manager",
        priority: "High",
        timeframe: "Immediate",
        feasibility: "High",
        riskSensitivity: "Low",
        expectedBenefit: "Fewer field visit cancellations.",
        successIndicator: "100% adherence to protocol in Q2.",
        validationStatus: "Needs Review",
        revision: 1,
      };

      await saveFinding(finding);
      await saveLesson(lesson);
      await saveGoodPractice(gp);
      await saveRecommendation(rec);

      expect(await getFinding(studyId, "FND-001")).toBeDefined();
      expect(await getLesson(studyId, "LES-001")).toBeDefined();
      expect(await getGoodPractice(studyId, "GP-001")).toBeDefined();
      expect(await getRecommendation(studyId, "REC-001")).toBeDefined();

      expect((await listFindings(studyId)).length).toBe(1);
      expect((await listLessons(studyId)).length).toBe(1);
      expect((await listGoodPractices(studyId)).length).toBe(1);
      expect((await listRecommendations(studyId)).length).toBe(1);
    });
  });

  describe("4. Assembling FieldStudy Projection", () => {
    it("assembles complete study projection from normalized stores", async () => {
      const studyId = "proj-study";
      const studyMeta: StudyMeta = {
        id: studyId,
        title: "Projection Test Study",
        subtitle: "Testing Projection",
        context: "Testing assembleStudy",
        status: "Active Fieldwork",
        isDemoCase: false,
        scope: {
          targetSites: ["Site 1"],
          isSingleSiteStudy: true,
          targetStakeholderGroups: ["Parents"],
        },
        executiveSummary: "Summary",
        keyMessages: ["Msg"],
        limitations: ["Lim"],
        createdAt: 1000,
        updatedAt: 1000,
      };

      await saveStudyMeta(studyMeta);
      await saveSource({
        id: "SRC-001",
        studyId,
        title: "Test Source",
        sourceType: "Direct Observation",
        date: "2026-03-01",
        stakeholderType: "Parents",
        location: "Site 1",
        summary: "Source summary",
        sensitivityFlag: "None",
      });
      await saveEvidence({
        id: "EV-001",
        studyId,
        sourceId: "SRC-001",
        stakeholderType: "Parents",
        rawEvidence: "Raw observation",
        primaryTheme: "Theme 1",
        secondaryTheme: "Theme 2",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "Finding preview",
        qaStatus: "Reviewed",
      });
      await saveFinding({
        id: "FND-001",
        studyId,
        statement: "Finding 1",
        explanation: "Explanation 1",
        supportingEvidenceIds: ["EV-001"],
        contradictoryEvidence: "",
        evidenceStrength: "High",
        programmeImplication: "Implication 1",
        linkedRecommendationIds: [],
      });

      const assembled = await assembleStudy(studyId);
      expect(assembled).toBeDefined();
      expect(assembled?.id).toBe(studyId);
      expect(assembled?.title).toBe("Projection Test Study");
      expect(assembled?.sources.length).toBe(1);
      expect(assembled?.evidence.length).toBe(1);
      expect(assembled?.findings.length).toBe(1);
      expect(assembled?.debriefs.length).toBe(0);
      expect(assembled?.lessons.length).toBe(0);
      expect(assembled?.goodPractices.length).toBe(0);
      expect(assembled?.recommendations.length).toBe(0);
    });
  });

  describe("5. Demo Templates Seeding & Idempotency (Option A)", () => {
    it("seeds demo templates without mutating static fixtures, and confirms idempotency", async () => {
      await bootstrapDemoTemplates();

      const studies = await listStudies();
      const demoIds = studies.map((s) => s.id);
      expect(demoIds).toContain("community-bridges");
      expect(demoIds).toContain("school-nutrition");

      const cb = await assembleStudy("community-bridges");
      expect(cb).toBeDefined();
      expect(cb?.isDemoCase).toBe(true);
      expect(cb?.sources.length).toBe(12);
      expect(cb?.evidence.length).toBe(20);
      expect(cb?.findings.length).toBe(8);
      expect(cb?.lessons.length).toBe(7);
      expect(cb?.goodPractices.length).toBe(4);
      expect(cb?.recommendations.length).toBe(10);

      const sn = await assembleStudy("school-nutrition");
      expect(sn).toBeDefined();
      expect(sn?.isDemoCase).toBe(true);
      expect(sn?.sources.length).toBe(8);
      expect(sn?.evidence.length).toBe(12);

      // Verify idempotency on repeated execution
      await bootstrapDemoTemplates();
      const studiesAfter = await listStudies();
      expect(studiesAfter.length).toBe(2);

      const cbAfter = await assembleStudy("community-bridges");
      expect(cbAfter?.evidence.length).toBe(20); // No duplicates
    });

    it("prevents deletion of demo template studies", async () => {
      await bootstrapDemoTemplates();
      await expect(deleteStudy("community-bridges")).rejects.toThrow(
        /Cannot delete demo template study/
      );
    });
  });

  describe("6. Demo Study Cloning (Option A)", () => {
    it("clones a demo study into an editable independent copy with new unique studyId", async () => {
      await bootstrapDemoTemplates();

      const newStudyId = await cloneDemoStudy(
        "community-bridges",
        "Community Bridges - Field Mission 2026"
      );

      expect(newStudyId).not.toBe("community-bridges");
      expect(newStudyId.startsWith("study-")).toBe(true);

      const original = await assembleStudy("community-bridges");
      const clone = await assembleStudy(newStudyId);

      expect(original?.isDemoCase).toBe(true);
      expect(clone?.isDemoCase).toBe(false);
      expect(clone?.title).toBe("Community Bridges - Field Mission 2026");
      expect(clone?.status).toBe("Active Fieldwork");

      // Verify record counts remain identical
      expect(clone?.sources.length).toBe(original?.sources.length);
      expect(clone?.evidence.length).toBe(original?.evidence.length);
      expect(clone?.findings.length).toBe(original?.findings.length);
      expect(clone?.lessons.length).toBe(original?.lessons.length);
      expect(clone?.goodPractices.length).toBe(original?.goodPractices.length);
      expect(clone?.recommendations.length).toBe(original?.recommendations.length);

      // Verify all child records have studyId remapped to newStudyId
      expect(clone?.sources.every((s) => s.studyId === newStudyId)).toBe(true);
      expect(clone?.evidence.every((e) => e.studyId === newStudyId)).toBe(true);
      expect(clone?.findings.every((f) => f.studyId === newStudyId)).toBe(true);
      expect(clone?.recommendations.every((r) => r.studyId === newStudyId)).toBe(true);

      // Verify internal IDs and links remain intact
      expect(clone?.evidence[0].id).toBe(original?.evidence[0].id);
      expect(clone?.findings[0].supportingEvidenceIds).toEqual(
        original?.findings[0].supportingEvidenceIds
      );

      // Verify editable copy can be deleted without affecting demo template
      await deleteStudy(newStudyId);
      expect(await assembleStudy(newStudyId)).toBeUndefined();
      expect(await assembleStudy("community-bridges")).toBeDefined();
    });
  });

  describe("7. Portable .fls.json Backup Round-trip", () => {
    it("exports study to valid .fls.json archive and imports it into fresh database", async () => {
      await bootstrapDemoTemplates();
      const exportedJson = await exportStudyBackup("community-bridges");

      expect(typeof exportedJson).toBe("string");
      const envelope = JSON.parse(exportedJson);

      expect(envelope.format).toBe(BACKUP_FORMAT_IDENTIFIER);
      expect(envelope.version).toBe(BACKUP_FORMAT_VERSION);
      expect(typeof envelope.exportedAt).toBe("number");
      expect(envelope.warning).toContain("WARNING: This export contains unencrypted field study records");
      expect(envelope.study.id).toBe("community-bridges");
      expect(envelope.evidence.length).toBe(20);

      // Clear all stores to simulate fresh database / different machine
      await clearAllStores();
      expect((await listStudies()).length).toBe(0);

      // Import the backup
      const importResult = await importStudyBackup(exportedJson, "reject_collision");
      expect(importResult.success).toBe(true);
      expect(importResult.studyId).toBe("community-bridges");

      // Verify reassembled study in fresh database matches original
      const restored = await assembleStudy("community-bridges");
      expect(restored).toBeDefined();
      expect(restored?.title).toBe("Community Bridges Initiative");
      expect(restored?.evidence.length).toBe(20);
      expect(restored?.findings.length).toBe(8);
      expect(restored?.recommendations.length).toBe(10);
    });
  });

  describe("8. Import-as-new and Collision Strategies", () => {
    it("handles collision rejection, overwrite, and import-as-new strategies", async () => {
      await bootstrapDemoTemplates();
      const backupJson = await exportStudyBackup("community-bridges");

      // 1. reject_collision on existing study
      await expect(
        importStudyBackup(backupJson, "reject_collision")
      ).rejects.toThrow(/Collision detected: Study "community-bridges" already exists/);

      // 2. import_as_new assigns new studyId and preserves relational integrity
      const importNewResult = await importStudyBackup(backupJson, "import_as_new");
      expect(importNewResult.success).toBe(true);
      expect(importNewResult.studyId).not.toBe("community-bridges");

      const newStudy = await assembleStudy(importNewResult.studyId);
      expect(newStudy).toBeDefined();
      expect(newStudy?.title).toBe("Community Bridges Initiative (Imported)");
      expect(newStudy?.isDemoCase).toBe(false);
      expect(newStudy?.evidence.length).toBe(20);
      expect(newStudy?.evidence.every((e) => e.studyId === importNewResult.studyId)).toBe(true);

      // 3. overwrite replaces existing records cleanly
      const overwriteResult = await importStudyBackup(backupJson, "overwrite");
      expect(overwriteResult.success).toBe(true);
      expect(overwriteResult.studyId).toBe("community-bridges");
      const overwritten = await assembleStudy("community-bridges");
      expect(overwritten?.evidence.length).toBe(20);
    });
  });

  describe("9. Malformed / Invalid Archive Rejection", () => {
    it("rejects invalid JSON", async () => {
      await expect(importStudyBackup("not-valid-json")).rejects.toThrow(
        /Not valid JSON format/
      );
    });

    it("rejects unknown format identifier", async () => {
      const badFormat = JSON.stringify({
        format: "unknown-app-backup",
        version: 1,
        exportedAt: Date.now(),
        warning: "warning",
        study: { id: "s1", title: "Study 1" },
        sources: [],
        evidence: [],
        debriefs: [],
        findings: [],
        lessons: [],
        goodPractices: [],
        recommendations: [],
      });

      await expect(importStudyBackup(badFormat)).rejects.toThrow(
        /Invalid format identifier/
      );
    });

    it("rejects unsupported format version", async () => {
      const badVersion = JSON.stringify({
        format: BACKUP_FORMAT_IDENTIFIER,
        version: 99,
        exportedAt: Date.now(),
        warning: "warning",
        study: { id: "s1", title: "Study 1" },
        sources: [],
        evidence: [],
        debriefs: [],
        findings: [],
        lessons: [],
        goodPractices: [],
        recommendations: [],
      });

      await expect(importStudyBackup(badVersion)).rejects.toThrow(
        /Unsupported backup version/
      );
    });

    it("validates runtime envelope integrity correctly", () => {
      expect(validateStudyBackupEnvelope(null).valid).toBe(false);
      expect(validateStudyBackupEnvelope("string").valid).toBe(false);
      expect(
        validateStudyBackupEnvelope({
          format: BACKUP_FORMAT_IDENTIFIER,
          version: 1,
          exportedAt: "not-a-number",
        }).valid
      ).toBe(false);
      expect(
        validateStudyBackupEnvelope({
          format: BACKUP_FORMAT_IDENTIFIER,
          version: 1,
          exportedAt: 12345,
          warning: "test",
          study: { id: "", title: "title" },
        }).valid
      ).toBe(false);
    });
  });
});
