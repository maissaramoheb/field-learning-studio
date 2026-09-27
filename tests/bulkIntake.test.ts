import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  splitNarrativeIntoSegments,
  checkSourceDuplicate,
  parseStructuredSourceBlocks,
  parseCsvOrTsv,
  suggestColumnMappings,
  convertTabularRowsToSourceCandidates,
} from "@/lib/intake";
import {
  getNextSequenceOfIds,
  getNextSequenceOfSourceIds,
  getNextSequenceOfEvidenceIds,
} from "@/lib/idGenerator";
import {
  clearAllStores,
  saveStudyMeta,
  saveSource,
  saveSourceBatch,
  saveEvidenceBatch,
  listSources,
  listEvidence,
} from "@/lib/storage";
import { computeSupportProfile } from "@/lib/analytics/supportProfile";
import type {
  StudyScopeConfig,
  SourceRecord,
  EvidenceEntry,
  Finding,
  StudyMeta,
  SourceRecordId,
  EvidenceEntryId,
} from "@/lib/types";

const mockScope: StudyScopeConfig = {
  targetSites: ["Assiut", "Minya"],
  isSingleSiteStudy: false,
  targetStakeholderGroups: ["Teachers", "Parents", "Warehouse Staff"],
  expectedMethods: ["Key Informant Interview", "Focus Group Discussion", "Direct Observation"],
};

describe("Bulk Intake & Structured Import Engine", () => {
  beforeEach(async () => {
    await clearAllStores();
  });

  describe("1. Segmentation Helper (splitNarrativeIntoSegments)", () => {
    const rawParagraphText = `First observation paragraph regarding meal arrival times and logistics.

Second observation paragraph regarding parent complaints about breakfast portions.

Third observation noting warehouse storage conditions and temperature.`;

    it("splits narrative by paragraphs correctly", () => {
      const segments = splitNarrativeIntoSegments(rawParagraphText, "paragraphs");
      expect(segments).toHaveLength(3);
      expect(segments[0].text).toContain("First observation paragraph");
      expect(segments[1].text).toContain("Second observation paragraph");
      expect(segments[2].text).toContain("Third observation noting");
      expect(segments[0].id).toBe("seg-p-1");
    });

    const rawBulletText = `Interview observations:
- Driver arrived at 10:15 AM after school morning recess had ended
* Warehouses lacked temperature loggers on refrigerator units
• Teachers reported distributed biscuits were damaged in transport
1. Parents expressed strong appreciation for the date bar supplement
2) Storage room had water leaking near corner sacks`;

    it("splits narrative by various bullet formats (- * • 1. 2))", () => {
      const segments = splitNarrativeIntoSegments(rawBulletText, "bullets");
      expect(segments.length).toBeGreaterThanOrEqual(5);
      expect(segments[0].text).toBe("Driver arrived at 10:15 AM after school morning recess had ended");
      expect(segments[1].text).toBe("Warehouses lacked temperature loggers on refrigerator units");
      expect(segments[2].text).toBe("Teachers reported distributed biscuits were damaged in transport");
      expect(segments[3].text).toBe("Parents expressed strong appreciation for the date bar supplement");
      expect(segments[4].text).toBe("Storage room had water leaking near corner sacks");
    });

    it("handles combined paragraph and bullet mode cleanly", () => {
      const combinedText = `Overview statement on school infrastructure.

- Classrooms had 45 pupils each
- Ventilators were non-functional during afternoon shift

Summary conclusion noted by team.`;

      const segments = splitNarrativeIntoSegments(combinedText, "both");
      expect(segments.length).toBeGreaterThanOrEqual(3);
      expect(segments.some((s) => s.text.includes("Overview statement"))).toBe(true);
      expect(segments.some((s) => s.text.includes("Classrooms had 45 pupils"))).toBe(true);
      expect(segments.some((s) => s.text.includes("Summary conclusion"))).toBe(true);
    });

    it("returns empty array for whitespace-only text", () => {
      expect(splitNarrativeIntoSegments("   \n\n   \t  ", "both")).toEqual([]);
    });
  });

  describe("2. Deterministic Duplicate Detector (checkSourceDuplicate)", () => {
    const existingSources: SourceRecord[] = [
      {
        id: "SRC-001",
        title: "KII with School Director",
        date: "2026-09-20",
        location: "Assiut",
        siteId: "Assiut",
        stakeholderType: "Teachers",
        sourceType: "Key Informant Interview",
        summary: "Discussion on school meal distribution schedule and delays.",
        rawText: "The delivery truck consistently arrived after 10:30 AM every Tuesday and Thursday.",
        consentStatus: "Oral",
        anonymizationStatus: "Pseudonymized",
        sensitivityFlag: "None",
      },
    ];

    it("detects duplicate when title and date match exactly (case-insensitive)", () => {
      const result = checkSourceDuplicate(
        { title: "kii with school director", date: "2026-09-20" },
        existingSources
      );
      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateReason).toContain("Matches existing source");
      expect(result.matchType).toBe("exact_title_date");
      expect(result.matchedSourceId).toBe("SRC-001");
    });

    it("detects duplicate when narrative text matches >= 40 characters", () => {
      const result = checkSourceDuplicate(
        {
          title: "Different Title",
          date: "2026-09-25",
          rawText: "The delivery truck consistently arrived after 10:30 AM every Tuesday and Thursday.",
        },
        existingSources
      );
      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateReason).toContain("Identical narrative text");
      expect(result.matchType).toBe("exact_narrative");
      expect(result.matchedSourceId).toBe("SRC-001");
    });

    it("returns false for distinct title and distinct content", () => {
      const result = checkSourceDuplicate(
        {
          title: "FGD with Community Elders",
          date: "2026-09-22",
          rawText: "Community elders noted general satisfaction with school administration and security.",
        },
        existingSources
      );
      expect(result.isDuplicate).toBe(false);
      expect(result.matchedSourceId).toBeUndefined();
    });
  });

  describe("3. Multi-Source Structured Text Parser (parseStructuredSourceBlocks)", () => {
    it("parses valid multi-block structured text with --- delimiters", () => {
      const validText = `---
Title: KII with Minya Head Teacher
Date: 2026-09-20
Site: Minya
Stakeholder: Teachers
Method: Key Informant Interview
Consent: Oral
Anonymization: Pseudonymized
Sensitivity: None

Notes:
Delivery trucks arrived 90 minutes after recess. Teachers noted that morning delays are recurrent.
---
---
Title: FGD with Assiut Mothers
Date: 2026-09-21
Site: Assiut
Stakeholder: Parents
Method: Focus Group Discussion
Consent: Oral
Anonymization: Anonymized
Sensitivity: Low

Notes:
Mothers expressed concern about meal quality and freshness in hot weather.
---`;

      const candidates = parseStructuredSourceBlocks(validText, mockScope, []);
      expect(candidates).toHaveLength(2);
      expect(candidates[0].title).toBe("KII with Minya Head Teacher");
      expect(candidates[0].siteId).toBe("Minya");
      expect(candidates[0].collectionMethod).toBe("Key Informant Interview");
      expect(candidates[0].consentStatus).toBe("Oral");
      expect(candidates[0].anonymizationStatus).toBe("Pseudonymized");
      expect(candidates[0].status).toBe("ready");

      expect(candidates[1].title).toBe("FGD with Assiut Mothers");
      expect(candidates[1].siteId).toBe("Assiut");
      expect(candidates[1].stakeholderType).toBe("Parents");
      expect(candidates[1].status).toBe("ready");
    });

    it("enforces strict ethics defaults when consent or anonymization is omitted", () => {
      const textWithoutEthics = `---
Title: Direct Observation at Central Kitchen
Date: 2026-09-22
Site: Assiut
Stakeholder: Warehouse Staff
Method: Direct Observation

Notes:
Kitchen counters were clean; temperature loggers read 4 degrees Celsius.
---`;

      const candidates = parseStructuredSourceBlocks(textWithoutEthics, mockScope, []);
      expect(candidates).toHaveLength(1);
      const cand = candidates[0];
      // Must NEVER assume Oral/Written or Anonymized!
      expect(cand.consentStatus).toBe("Restricted / Unclear");
      expect(cand.anonymizationStatus).toBe("Identifiable / Restricted");
      expect(cand.warnings.some((w) => w.includes("Consent status missing or unclear"))).toBe(true);
      expect(cand.warnings.some((w) => w.includes("Anonymization status unverified"))).toBe(true);
      expect(cand.status).toBe("needs_review");
    });

    it("detects safety warnings for PII / phone numbers / names in narrative", () => {
      const piiText = `---
Title: KII with Field Supervisor
Date: 2026-09-21
Site: Minya
Stakeholder: Teachers
Method: Key Informant Interview
Consent: Oral
Anonymization: Pseudonymized

Notes:
Contacted supervisor Ahmed Hassan directly at 01012345678 regarding logistics dispatch.
---`;

      const candidates = parseStructuredSourceBlocks(piiText, mockScope, []);
      expect(candidates[0].warnings.some((w) => w.toLowerCase().includes("safety") || w.includes("PII") || w.toLowerCase().includes("phone"))).toBe(true);
      expect(candidates[0].status).toBe("needs_review");
    });

    it("flags out-of-scope sites and stakeholders", () => {
      const outOfScopeText = `---
Title: Interview with Cairo Official
Date: 2026-09-22
Site: Cairo
Stakeholder: Ministry Officials
Method: Key Informant Interview

Notes:
Cairo officials outlined central ministerial policy for Upper Egypt governorates.
---`;

      const candidates = parseStructuredSourceBlocks(outOfScopeText, mockScope, []);
      expect(candidates[0].warnings.some((w) => w.includes("Cairo"))).toBe(true);
      expect(candidates[0].warnings.some((w) => w.includes("Ministry Officials"))).toBe(true);
    });

    it("marks blocks with missing Title as invalid", () => {
      const missingTitleText = `---
Date: 2026-09-22
Site: Assiut

Notes:
No title specified in this block.
---`;

      const candidates = parseStructuredSourceBlocks(missingTitleText, mockScope, []);
      expect(candidates[0].status).toBe("error");
      expect(candidates[0].errors).toContain("Missing required field: Title");
    });
  });

  describe("4. Tabular CSV/TSV Parser (RFC 4180)", () => {
    it("auto-detects comma, tab, and semicolon delimiters", () => {
      const csv = `Title,Date,Site\nInterview 1,2026-09-20,Assiut`;
      const tsv = `Title\tDate\tSite\nInterview 2\t2026-09-21\tMinya`;
      const semi = `Title;Date;Site\nInterview 3;2026-09-22;Assiut`;

      expect(parseCsvOrTsv(csv).delimiter).toBe(",");
      expect(parseCsvOrTsv(tsv).delimiter).toBe("\t");
      expect(parseCsvOrTsv(semi).delimiter).toBe(";");
    });

    it("correctly handles quoted fields containing commas and newlines (RFC 4180)", () => {
      const complexCsv = `Title,Date,Site,Narrative\n"Interview with Director, Assiut",2026-09-20,Assiut,"Line 1 of narrative,\nLine 2 of narrative with comma, and quotes: ""quoted value"""`;

      const parsed = parseCsvOrTsv(complexCsv);
      expect(parsed.rows).toHaveLength(1);
      expect(parsed.rows[0][0]).toBe("Interview with Director, Assiut");
      expect(parsed.rows[0][1]).toBe("2026-09-20");
      expect(parsed.rows[0][2]).toBe("Assiut");
      expect(parsed.rows[0][3]).toBe("Line 1 of narrative,\nLine 2 of narrative with comma, and quotes: \"quoted value\"");
    });

    it("suggests intelligent column mappings for recognized headers", () => {
      const headers = [
        "Record Title",
        "Collection Date",
        "Field Site",
        "Stakeholder Group",
        "Methodology",
        "Interview Field Notes",
        "Consent Given",
      ];

      const mapping = suggestColumnMappings(headers);
      expect(mapping[0]).toBe("title");
      expect(mapping[1]).toBe("date");
      expect(mapping[2]).toBe("siteId");
      expect(mapping[3]).toBe("stakeholderType");
      expect(mapping[4]).toBe("collectionMethod");
      expect(mapping[5]).toBe("narrative");
      expect(mapping[6]).toBe("consentStatus");
    });

    it("converts tabular rows to parsed Source candidates and flags duplicate/scope rows", () => {
      const rows = [
        ["Interview 1", "2026-09-20", "Assiut", "Teachers", "Key Informant Interview", "Narrative for interview 1"],
        ["Interview 2", "2026-09-21", "Sohag", "Doctors", "KII", "Narrative for interview 2"],
        ["", "", "", "", "", ""], // empty row should be skipped
      ];

      const mapping = {
        0: "title" as const,
        1: "date" as const,
        2: "siteId" as const,
        3: "stakeholderType" as const,
        4: "collectionMethod" as const,
        5: "narrative" as const,
      };

      const candidates = convertTabularRowsToSourceCandidates(rows, mapping, mockScope);
      expect(candidates).toHaveLength(2);
      expect(candidates[0].title).toBe("Interview 1");
      expect(candidates[0].status).toBe("needs_review"); // because consent/anon were omitted and defaulted safely
      expect(candidates[0].consentStatus).toBe("Restricted / Unclear");
      expect(candidates[0].anonymizationStatus).toBe("Identifiable / Restricted");

      // Candidate 2 has Sohag and Doctors out of scope
      expect(candidates[1].siteId).toBe("Sohag");
      expect(candidates[1].warnings.some((w) => w.includes("Sohag"))).toBe(true);
      expect(candidates[1].warnings.some((w) => w.includes("Doctors"))).toBe(true);
    });
  });

  describe("5. Batch Persistence & ID Allocation (Atomic Transactions)", () => {
    it("generates sequential non-colliding IDs in batch", () => {
      const existing = ["SRC-001", "SRC-002", "SRC-005"];
      const newIds = getNextSequenceOfIds("SRC-", existing, 4);
      expect(newIds).toEqual(["SRC-006", "SRC-007", "SRC-008", "SRC-009"]);

      const sourceIds = getNextSequenceOfSourceIds(["SRC-010" as SourceRecordId], 3);
      expect(sourceIds).toEqual(["SRC-011", "SRC-012", "SRC-013"]);

      const evIds = getNextSequenceOfEvidenceIds(["EV-003" as EvidenceEntryId], 2);
      expect(evIds).toEqual(["EV-004", "EV-005"]);
    });

    it("saves multiple sources atomically via saveSourceBatch", async () => {
      const studyId = "STUDY-BULK-001";
      const studyMeta: StudyMeta = {
        id: studyId,
        title: "Bulk Intake Test Study",
        subtitle: "Testing batch source intake",
        context: "Evaluation context",
        status: "Active Fieldwork",
        isDemoCase: false,
        scope: mockScope,
        executiveSummary: "",
        outputConfig: {
          includeRecommendations: true,
          includeLessons: true,
          includeGoodPractices: true,
        },
        keyMessages: [],
        limitations: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveStudyMeta(studyMeta);

      const sourcesToSave: SourceRecord[] = [
        {
          id: "SRC-101",
          title: "Batch Interview A",
          date: "2026-09-20",
          location: "Assiut",
          siteId: "Assiut",
          stakeholderType: "Teachers",
          sourceType: "Key Informant Interview",
          summary: "Batch note A",
          rawText: "Full note narrative A",
          consentStatus: "Oral",
          anonymizationStatus: "Pseudonymized",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-102",
          title: "Batch Interview B",
          date: "2026-09-21",
          location: "Minya",
          siteId: "Minya",
          stakeholderType: "Parents",
          sourceType: "Focus Group Discussion",
          summary: "Batch note B",
          rawText: "Full note narrative B",
          consentStatus: "Oral",
          anonymizationStatus: "Anonymized",
          sensitivityFlag: "Low",
        },
      ];

      await saveSourceBatch(studyId, sourcesToSave);

      const loadedSources = await listSources(studyId);
      expect(loadedSources).toHaveLength(2);
      expect(loadedSources.map((s) => s.id).sort()).toEqual(["SRC-101", "SRC-102"]);
    });

    it("saves multiple evidence observations atomically via saveEvidenceBatch with validationStatus: Draft", async () => {
      const studyId = "STUDY-BULK-002";
      const studyMeta: StudyMeta = {
        id: studyId,
        title: "Bulk Evidence Test",
        subtitle: "Testing batch evidence extraction",
        context: "Context",
        status: "Active Fieldwork",
        isDemoCase: false,
        scope: mockScope,
        executiveSummary: "",
        outputConfig: {
          includeRecommendations: true,
          includeLessons: true,
          includeGoodPractices: true,
        },
        keyMessages: [],
        limitations: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveStudyMeta(studyMeta);

      await saveSource({
        id: "SRC-101",
        studyId,
        title: "Source 101",
        date: "2026-09-20",
        location: "Assiut",
        siteId: "Assiut",
        stakeholderType: "Teachers",
        sourceType: "Key Informant Interview",
        consentStatus: "Oral",
        anonymizationStatus: "Pseudonymized",
        sensitivityFlag: "None",
        summary: "Notes summary",
        rawText: "Notes from source 101",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const evidenceBatch: EvidenceEntry[] = [
        {
          id: "EV-201",
          studyId,
          sourceId: "SRC-101",
          rawEvidence: "Observation 1 from source 101",
          rawObservation: "Observation 1 from source 101",
          interpretation: "Interpretation 1",
          primaryTheme: "Operational Execution",
          secondaryTheme: "",
          evidenceStrength: "Medium",
          sensitivityFlag: "None",
          potentialFinding: "",
          qaStatus: "Reviewed",
          validationStatus: "Draft",
          revision: 1,
          siteId: "Assiut",
          stakeholderType: "Teachers",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "EV-202",
          studyId,
          sourceId: "SRC-101",
          rawEvidence: "Observation 2 from source 101",
          rawObservation: "Observation 2 from source 101",
          interpretation: "Interpretation 2",
          primaryTheme: "Operational Execution",
          secondaryTheme: "",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "",
          qaStatus: "Reviewed",
          validationStatus: "Draft",
          revision: 1,
          siteId: "Assiut",
          stakeholderType: "Teachers",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      await saveEvidenceBatch(studyId, evidenceBatch);

      const loadedEvidence = await listEvidence(studyId);
      expect(loadedEvidence).toHaveLength(2);
      expect(loadedEvidence.every((e) => e.validationStatus === "Draft")).toBe(true);
      expect(loadedEvidence.every((e) => e.revision === 1)).toBe(true);
    });
  });

  describe("6. Triangulation & Source Independence Regression", () => {
    it("counts 12 observations from 1 Source as exactly 1 independent source in Support Profile", () => {
      const singleSource: SourceRecord = {
        id: "SRC-SINGLE",
        title: "Extended KII with Central Director",
        date: "2026-09-20",
        location: "Assiut",
        siteId: "Assiut",
        stakeholderType: "Teachers",
        sourceType: "Key Informant Interview",
        summary: "Extensive single source note",
        rawText: "Long interview transcription covering twelve different operational topics.",
        consentStatus: "Oral",
        anonymizationStatus: "Pseudonymized",
        sensitivityFlag: "None",
      };

      // 12 distinct observations all extracted from the same source
      const twelveObservations: EvidenceEntry[] = Array.from({ length: 12 }, (_, i) => ({
        id: `EV-${100 + i}` as EvidenceEntryId,
        studyId: "STUDY-REGRESSION",
        sourceId: singleSource.id,
        rawEvidence: `Discrete observation #${i + 1} from central director`,
        rawObservation: `Discrete observation #${i + 1} from central director`,
        interpretation: `Interpretation #${i + 1}`,
        primaryTheme: "Operational Execution",
        secondaryTheme: "",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "",
        qaStatus: "Reviewed",
        validationStatus: "Validated",
        revision: 1,
        siteId: "Assiut",
        stakeholderType: "Teachers",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      const finding: Finding = {
        id: "FND-001",
        studyId: "STUDY-REGRESSION",
        statement: "Delivery delays consistently disrupt morning academic schedules across Upper Egypt.",
        explanation: "Delivery delays in Assiut disrupt schedule.",
        programmeImplication: "Adjust logistics timing.",
        supportingEvidenceIds: twelveObservations.map((e) => e.id),
        contradictoryEvidence: "",
        evidenceStrength: "High",
        linkedRecommendationIds: [],
        validationStatus: "Draft",
        revision: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const profile = computeSupportProfile(
        finding,
        mockScope,
        twelveObservations,
        [singleSource]
      );

      // CRITICAL RIGOR INVARIANT: 12 observations from 1 source MUST equal 1 independent source!
      expect(profile.independentSourceCount).toBe(1);
      // Because only 1 independent source exists and Minya + Parents/Warehouse are missing, support tier CANNOT be Strongly Supported!
      expect(profile.supportTier).toBe("Emerging");
      expect(profile.transparencyFlags).toContain("Only 1 independent source");
      expect(profile.siteCoverage.isCrossSite).toBe(false);
      expect(profile.stakeholderCoverage.isMultiStakeholder).toBe(false);
      expect(profile.methodDiversity.isMultiMethod).toBe(false);
    });
  });
});
