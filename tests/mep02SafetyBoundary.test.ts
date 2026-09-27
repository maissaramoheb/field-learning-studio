import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "@/lib/storage/indexedDb";
import {
  saveStudyMeta,
  saveSource,
  saveSourceBatch,
  saveEvidence,
  saveEvidenceBatch,
  saveFinding,
  saveRecommendation,
  getSource,
  getEvidence,
  getFinding,
  getRecommendation,
  assembleStudy,
} from "@/lib/storage/studyStore";
import {
  validateStudyBackupEnvelope,
  exportStudyBackup,
  importStudyBackup,
} from "@/lib/storage/studyBackup";
import type {
  StudyId,
  StudyMeta,
  SourceRecord,
  SourceRecordId,
  EvidenceEntry,
  EvidenceEntryId,
  Finding,
  Recommendation,
} from "@/lib/types";

describe("MEP-02 Minimum Safety Boundary", () => {
  const studyId: StudyId = "study_mep02_safety";

  const sampleMeta: StudyMeta = {
    id: studyId,
    title: "MEP-02 Safety Verification Study",
    subtitle: "Safety Verification",
    context: "Study for verifying storage safety invariants",
    status: "Active Fieldwork",
    scope: {
      targetSites: ["District 1"],
      isSingleSiteStudy: false,
      targetStakeholderGroups: ["Children", "Teachers"],
    },
    executiveSummary: "Summary",
    keyMessages: [],
    limitations: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDemoCase: false,
  };

  const sampleSource: SourceRecord & { studyId: StudyId } = {
    id: "SRC-S01",
    studyId,
    title: "Quarterly School Monitoring Log",
    sourceType: "Field Note",
    date: "2026-03-01",
    stakeholderType: "Teachers",
    location: "District 1",
    summary: "Monitoring notes on kitchen facilities",
    sensitivityFlag: "None",
  };

  const sampleEvidence: EvidenceEntry & { studyId: StudyId } = {
    id: "EV-S01",
    studyId,
    sourceId: "SRC-S01",
    rawEvidence: "Storage room refrigeration failed for 48 hours.",
    primaryTheme: "Nutrition",
    secondaryTheme: "Facilities",
    stakeholderType: "Teachers",
    evidenceStrength: "High",
    sensitivityFlag: "None",
    qaStatus: "Reviewed",
    validationStatus: "Validated",
    revision: 1,
    potentialFinding: "",
  };

  const sampleFinding: Finding & { studyId: StudyId } = {
    id: "FND-S01",
    studyId,
    statement: "Refrigeration failures compromise perishable food safety.",
    explanation: "Power outages spoil milk reserves.",
    supportingEvidenceIds: ["EV-S01"],
    contradictoryEvidence: "",
    contradictoryEvidenceIds: [],
    evidenceStrength: "High",
    programmeImplication: "Install solar-powered milk chillers.",
    linkedRecommendationIds: ["REC-S01"],
    validationStatus: "Validated",
    revision: 1,
  };

  const sampleRecommendation: Recommendation & { studyId: StudyId } = {
    id: "REC-S01",
    studyId,
    recommendation: "Procure dedicated solar chillers for school pantry.",
    linkedFindingId: "FND-S01",
    evidenceBase: ["EV-S01"],
    responsibleActor: "Logistics",
    priority: "High",
    timeframe: "Immediate",
    feasibility: "High",
    riskSensitivity: "Low",
    expectedBenefit: "Preserves dairy supplies",
    successIndicator: "Zero spoilage incidents",
    validationStatus: "Validated",
    revision: 1,
  };

  beforeEach(async () => {
    const db = await getDb();
    await db.clear("studies");
    await db.clear("sources");
    await db.clear("evidence");
    await db.clear("findings");
    await db.clear("recommendations");
    await db.clear("lessons");
    await db.clear("goodPractices");
    await db.clear("debriefs");

    await saveStudyMeta(sampleMeta);
    await saveSource(sampleSource);
    await saveEvidence(sampleEvidence);
    await saveFinding(sampleFinding);
    await saveRecommendation(sampleRecommendation);
  });

  // 1. Duplicate record IDs rejected before mutation
  describe("1. Duplicate Record IDs Rejection", () => {
    it("rejects batch source mutation containing duplicate source IDs", async () => {
      const dupSources = [
        { ...sampleSource, id: "SRC-DUP-1" as SourceRecordId, title: "Source A" },
        { ...sampleSource, id: "SRC-DUP-1" as SourceRecordId, title: "Source B with same ID" },
      ];
      await expect(saveSourceBatch(dupSources)).rejects.toThrow(
        /Batch mutation rejected: Duplicate Source IDs found in batch: SRC-DUP-1/i
      );
    });

    it("rejects batch evidence mutation containing duplicate evidence IDs", async () => {
      const dupEvidence = [
        { ...sampleEvidence, id: "EV-DUP-1" as EvidenceEntryId, rawEvidence: "Obs A" },
        { ...sampleEvidence, id: "EV-DUP-1" as EvidenceEntryId, rawEvidence: "Obs B with same ID" },
      ];
      await expect(saveEvidenceBatch(dupEvidence)).rejects.toThrow(
        /Batch mutation rejected: Duplicate Evidence IDs found in batch: EV-DUP-1/i
      );
    });

    it("rejects backup archives containing duplicate IDs in any entity section", () => {
      const badBackup = {
        format: "field-learning-studio-backup",
        version: 1,
        exportedAt: Date.now(),
        warning: "warning",
        study: sampleMeta,
        sources: [
          sampleSource,
          { ...sampleSource, title: "Duplicate Source Title" },
        ],
        evidence: [sampleEvidence],
        findings: [sampleFinding],
        recommendations: [sampleRecommendation],
        debriefs: [],
        lessons: [],
        goodPractices: [],
      };
      const result = validateStudyBackupEnvelope(badBackup);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Duplicate Source ID"))).toBe(true);
    });
  });

  // 2. Foreign/wrong study ownership rejected
  describe("2. Foreign Study Ownership Rejection", () => {
    it("rejects saving source without valid studyId", async () => {
      await expect(
        saveSource({ ...sampleSource, studyId: "" as StudyId })
      ).rejects.toThrow(/missing required studyId/i);
    });

    it("rejects saving evidence referencing a source from another study", async () => {
      const foreignEvidence: EvidenceEntry & { studyId: StudyId } = {
        ...sampleEvidence,
        id: "EV-FOREIGN",
        studyId: "different_study_id",
        sourceId: sampleSource.id,
      };
      await expect(saveEvidence(foreignEvidence)).rejects.toThrow(
        /Source "SRC-S01" does not exist in Study "different_study_id"/i
      );
    });

    it("rejects saving finding referencing evidence from another study", async () => {
      const foreignFinding: Finding & { studyId: StudyId } = {
        ...sampleFinding,
        id: "FND-FOREIGN",
        studyId: "different_study_id",
        supportingEvidenceIds: [sampleEvidence.id],
      };
      await expect(saveFinding(foreignFinding)).rejects.toThrow(
        /Evidence "EV-S01" does not exist in Study "different_study_id"/i
      );
    });
  });

  // 3. Broken parent relationships rejected
  describe("3. Broken Parent Relationships Rejection", () => {
    it("rejects backup where recommendation references non-existent finding", () => {
      const badBackup = {
        format: "field-learning-studio-backup",
        version: 1,
        exportedAt: Date.now(),
        warning: "warning",
        study: sampleMeta,
        sources: [sampleSource],
        evidence: [sampleEvidence],
        findings: [sampleFinding],
        recommendations: [
          {
            ...sampleRecommendation,
            linkedFindingId: "FND-DOES-NOT-EXIST",
          },
        ],
        debriefs: [],
        lessons: [],
        goodPractices: [],
      };
      const result = validateStudyBackupEnvelope(badBackup);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("references missing parent Finding"))
      ).toBe(true);
    });

    it("rejects backup where lesson references non-existent evidence", () => {
      const badBackup = {
        format: "field-learning-studio-backup",
        version: 1,
        exportedAt: Date.now(),
        warning: "warning",
        study: sampleMeta,
        sources: [sampleSource],
        evidence: [sampleEvidence],
        findings: [sampleFinding],
        recommendations: [sampleRecommendation],
        debriefs: [],
        lessons: [
          {
            id: "LES-01",
            statement: "Lesson statement",
            whatWorkedOrDidNotWork: "Checks work",
            whyItHappened: "Early replacement",
            conditionsRequired: "Dedicated staff",
            evidenceBase: ["EV-NON-EXISTENT"],
            transferability: "All sites",
            validationStatus: "Validated",
            revision: 1,
          },
        ],
        goodPractices: [],
      };
      const result = validateStudyBackupEnvelope(badBackup);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("references missing Evidence"))
      ).toBe(true);
    });
  });

  // 4. Malformed required study structure rejected cleanly
  describe("4. Malformed Required Study Structure", () => {
    it("rejects backup with missing or malformed study scope", () => {
      const malformedBackup = {
        format: "field-learning-studio-backup",
        version: 1,
        exportedAt: Date.now(),
        warning: "warning",
        study: {
          id: "study_malformed",
          title: "Malformed Study",
          // missing scope!
        },
        sources: [],
        evidence: [],
        findings: [],
        recommendations: [],
        debriefs: [],
        lessons: [],
        goodPractices: [],
      };
      const result = validateStudyBackupEnvelope(malformedBackup);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("missing required scope configuration"))
      ).toBe(true);
    });
  });

  // 5. Creation collisions cannot silently overwrite another record
  describe("5. Creation Collision Protection", () => {
    it("rejects saveSource with isCreate: true when source ID already exists", async () => {
      await expect(
        saveSource(
          { ...sampleSource, title: "Attempted Overwrite Title" },
          { isCreate: true }
        )
      ).rejects.toThrow(/ID collision: A Source with ID "SRC-S01" already exists/i);

      // Verify original title is preserved!
      const fetched = await getSource(studyId, sampleSource.id);
      expect(fetched?.title).toBe(sampleSource.title);
    });

    it("rejects saveEvidence with isCreate: true when evidence ID already exists", async () => {
      await expect(
        saveEvidence(
          { ...sampleEvidence, rawEvidence: "Attempted Overwrite Evidence" },
          { isCreate: true }
        )
      ).rejects.toThrow(/ID collision: An Evidence entry with ID "EV-S01" already exists/i);

      const fetched = await getEvidence(studyId, sampleEvidence.id);
      expect(fetched?.rawEvidence).toBe(sampleEvidence.rawEvidence);
    });

    it("rejects saveFinding with isCreate: true when finding ID already exists", async () => {
      await expect(
        saveFinding(
          { ...sampleFinding, statement: "Attempted Overwrite Statement" },
          { isCreate: true }
        )
      ).rejects.toThrow(/ID collision: A Finding with ID "FND-S01" already exists/i);

      const fetched = await getFinding(studyId, sampleFinding.id);
      expect(fetched?.statement).toBe(sampleFinding.statement);
    });

    it("rejects saveRecommendation with isCreate: true when recommendation ID already exists", async () => {
      await expect(
        saveRecommendation(
          { ...sampleRecommendation, recommendation: "Attempted Overwrite Recommendation" },
          { isCreate: true }
        )
      ).rejects.toThrow(/ID collision: A Recommendation with ID "REC-S01" already exists/i);

      const fetched = await getRecommendation(studyId, sampleRecommendation.id);
      expect(fetched?.recommendation).toBe(sampleRecommendation.recommendation);
    });
  });

  // 6. Real Backup Export & Restore Verification
  describe("6. Real Backup Export & Restore Verification", () => {
    it("exports a real study and restores successfully with import_as_new", async () => {
      const exportedJson = await exportStudyBackup(studyId);
      expect(typeof exportedJson).toBe("string");

      const importResult = await importStudyBackup(exportedJson, "import_as_new");
      expect(importResult.success).toBe(true);
      expect(importResult.studyId).not.toBe(studyId);

      // Verify the new study is fully intact and assembled
      const assembledNew = await assembleStudy(importResult.studyId);
      expect(assembledNew).toBeDefined();
      expect(assembledNew?.sources.length).toBe(1);
      expect(assembledNew?.evidence.length).toBe(1);
      expect(assembledNew?.findings.length).toBe(1);
      expect(assembledNew?.recommendations.length).toBe(1);

      // Verify relationships point within the new study scope
      expect(assembledNew?.evidence[0].sourceId).toBe("SRC-S01");
      expect(assembledNew?.findings[0].supportingEvidenceIds).toEqual(["EV-S01"]);
      expect(assembledNew?.recommendations[0].linkedFindingId).toBe("FND-S01");

      // Verify original study was untouched
      const originalStudy = await assembleStudy(studyId);
      expect(originalStudy?.id).toBe(studyId);
      expect(originalStudy?.findings.length).toBe(1);
    });

    it("failed restore leaves existing data completely unchanged", async () => {
      const originalFinding = await getFinding(studyId, sampleFinding.id);

      // Attempt to import a corrupted/invalid backup with collision
      await expect(
        importStudyBackup("not-valid-json", "overwrite")
      ).rejects.toThrow(/Invalid backup archive/i);

      // Existing data must remain 100% intact
      const findingAfterFailed = await getFinding(studyId, sampleFinding.id);
      expect(findingAfterFailed).toEqual(originalFinding);
    });
  });
});
