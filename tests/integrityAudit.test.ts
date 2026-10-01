import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  clearAllStores,
  saveStudyMeta,
  saveSource,
  saveEvidence,
  saveFinding,
  saveCompleteStudy,
  saveRecommendation,
  assembleStudy,
  exportStudyBackup,
  inspectStudyBackup,
  importStudyBackup,
  type StudyBackupEnvelope,
} from "@/lib/storage";
import {
  applySubstantiveFindingEdit,
  validateArtifact,
  isRecommendationExportEligible,
  getRecommendationDependencyWarning,
} from "@/lib/validation";
import { computeSupportProfile } from "@/lib/analytics/supportProfile";
import { buildBriefExportModel } from "@/lib/buildBriefExportModel";
import { generateMarkdownFromModel } from "@/lib/exportMarkdown";
import type {
  StudyMeta,
  SourceRecord,
  EvidenceEntry,
  Finding,
  Recommendation,
  StudyId,
} from "@/lib/types";

describe("Codex Audit Resolution & Evidence Integrity Suite", () => {
  const studyA: StudyId = "study-alpha";
  const studyB: StudyId = "study-beta";

  const metaA: StudyMeta = {
    id: studyA,
    title: "Study Alpha - Education Assessment",
    subtitle: "Evaluating access and governance",
    status: "Active Fieldwork",
    context: "Field mission in Minya",
    isDemoCase: false,
    scope: {
      targetStakeholderGroups: ["Teachers", "Parents"],
      targetSites: ["Site-A", "Site-B"],
      isSingleSiteStudy: false,
    },
    executiveSummary: "Alpha summary",
    keyMessages: ["Alpha key message"],
    limitations: [],
    questions: [],
    patternNotes: [],
    createdAt: 1000,
    updatedAt: 1000,
  };

  const metaB: StudyMeta = {
    id: studyB,
    title: "Study Beta - Health Assessment",
    subtitle: "Evaluating clinic logistics",
    status: "Active Fieldwork",
    context: "Field mission in Assiut",
    isDemoCase: false,
    scope: {
      targetStakeholderGroups: ["Clinicians"],
      targetSites: ["Clinic-1"],
      isSingleSiteStudy: true,
    },
    executiveSummary: "Beta summary",
    keyMessages: [],
    limitations: [],
    questions: [],
    patternNotes: [],
    createdAt: 1000,
    updatedAt: 1000,
  };

  beforeEach(async () => {
    await clearAllStores();
    await saveStudyMeta(metaA);
    await saveStudyMeta(metaB);
  });

  // ============================================================================
  // Test 1: Cross-Study Source Isolation Rejection
  // ============================================================================
  describe("1. Cross-Study Isolation & Foreign Key Validation", () => {
    it("rejects evidence when referencing a foreign source belonging to another study", async () => {
      // Create source belonging to Study B
      const sourceB: SourceRecord & { studyId: StudyId } = {
        id: "SRC-B01",
        studyId: studyB,
        title: "KII with Beta Clinic Doctor",
        sourceType: "Key Informant Interview",
        date: "2026-03-10",
        stakeholderType: "Clinicians",
        location: "Clinic-1",
        summary: "Doctor remarks",
        sensitivityFlag: "None",
      };
      await saveSource(sourceB);

      // Attempt to save Evidence in Study A referencing Study B's source
      const evidenceA: EvidenceEntry & { studyId: StudyId } = {
        id: "EV-A01",
        studyId: studyA,
        sourceId: "SRC-B01",
        rawEvidence: "Vaccine cold chain failed twice this week.",
        primaryTheme: "Supply Chain",
        secondaryTheme: "",
        stakeholderType: "Clinicians",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "",
        qaStatus: "Reviewed",
        validationStatus: "Draft",
        revision: 1,
      };

      await expect(saveEvidence(evidenceA)).rejects.toThrow(
        /Cross-study isolation violation|Foreign source/i
      );
    });

    it("rejects evidence referencing a non-existent source", async () => {
      const evidenceNonExistent: EvidenceEntry & { studyId: StudyId } = {
        id: "EV-A02",
        studyId: studyA,
        sourceId: "SRC-NONEXISTENT",
        rawEvidence: "Observation without parent source.",
        primaryTheme: "Access",
        secondaryTheme: "",
        stakeholderType: "Teachers",
        evidenceStrength: "Medium",
        sensitivityFlag: "None",
        potentialFinding: "",
        qaStatus: "Reviewed",
        validationStatus: "Draft",
        revision: 1,
      };

      await expect(saveEvidence(evidenceNonExistent)).rejects.toThrow(
        /Foreign source reference error|does not exist/i
      );
    });

    it("rejects finding referencing foreign or missing evidence", async () => {
      const foreignFinding: Finding & { studyId: StudyId } = {
        id: "FND-A01",
        studyId: studyA,
        statement: "Supply chain disruptions are pervasive.",
        explanation: "Evidenced by foreign observations.",
        supportingEvidenceIds: ["EV-NONEXISTENT"],
        contradictoryEvidence: "",
        evidenceStrength: "High",
        programmeImplication: "Review protocols",
        linkedRecommendationIds: [],
        validationStatus: "Draft",
        revision: 1,
      };

      await expect(saveFinding(foreignFinding)).rejects.toThrow(
        /Foreign evidence reference error|does not exist/i
      );
    });

    it("rejects recommendation referencing foreign or missing finding", async () => {
      const foreignRec: Recommendation & { studyId: StudyId } = {
        id: "REC-A01",
        studyId: studyA,
        recommendation: "Establish emergency fuel reserves.",
        linkedFindingId: "FND-NONEXISTENT",
        evidenceBase: [],
        responsibleActor: "Logistics Team",
        priority: "High",
        timeframe: "Immediate",
        feasibility: "High",
        riskSensitivity: "Low",
        expectedBenefit: "Operational continuity",
        successIndicator: "Zero cold chain incidents",
        validationStatus: "Draft",
        revision: 1,
      };

      await expect(saveRecommendation(foreignRec)).rejects.toThrow(
        /Foreign finding reference error|does not exist/i
      );
    });
  });

  // ============================================================================
  // Test 2: Export Parity Across Preview, Markdown, and Download Paths
  // ============================================================================
  describe("2. Export Parity Across Export Models", () => {
    it("guarantees Draft, Needs Review, and unvalidated items are excluded identically from preview and markdown", async () => {
      const sourceA: SourceRecord & { studyId: StudyId } = {
        id: "SRC-A01",
        studyId: studyA,
        title: "KII with Minya Head Teacher",
        sourceType: "Key Informant Interview",
        date: "2026-03-10",
        stakeholderType: "Teachers",
        location: "Site-A",
        summary: "Teacher discusses solar power",
        sensitivityFlag: "None",
      };
      await saveSource(sourceA);

      const ev1: EvidenceEntry & { studyId: StudyId } = {
        id: "EV-A01",
        studyId: studyA,
        sourceId: "SRC-A01",
        rawEvidence: "Solar battery consistently fails at 12:30 PM.",
        primaryTheme: "Access",
        secondaryTheme: "",
        stakeholderType: "Teachers",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "",
        qaStatus: "Reviewed",
        validationStatus: "Validated",
        revision: 1,
      };
      const ev2: EvidenceEntry & { studyId: StudyId } = {
        id: "EV-A02",
        studyId: studyA,
        sourceId: "SRC-A01",
        rawEvidence: "Secondary power generator lacks maintenance log.",
        primaryTheme: "Access",
        secondaryTheme: "",
        stakeholderType: "Teachers",
        evidenceStrength: "Medium",
        sensitivityFlag: "None",
        potentialFinding: "",
        qaStatus: "Reviewed",
        validationStatus: "Draft",
        revision: 1,
      };
      await saveEvidence(ev1);
      await saveEvidence(ev2);

      // Finding 1: Validated
      const fndValidated: Finding & { studyId: StudyId } = {
        id: "FND-001",
        studyId: studyA,
        statement: "Power instability prematurely terminates digital instructional hours.",
        explanation: "Repeated solar battery exhaustion documented across morning sessions.",
        supportingEvidenceIds: ["EV-A01"],
        contradictoryEvidence: "",
        evidenceStrength: "High",
        programmeImplication: "Procure battery backup systems.",
        linkedRecommendationIds: ["REC-001"],
        validationStatus: "Validated",
        revision: 1,
      };

      // Finding 2: Draft (Must NOT be exported)
      const fndDraft: Finding & { studyId: StudyId } = {
        id: "FND-002",
        studyId: studyA,
        statement: "UNVERIFIED PRELIMINARY OBSERVATION ON GENERATOR LOGS",
        explanation: "Preliminary notes from field inspection.",
        supportingEvidenceIds: ["EV-A02"],
        contradictoryEvidence: "",
        evidenceStrength: "Low",
        programmeImplication: "Audit maintenance books.",
        linkedRecommendationIds: ["REC-002"],
        validationStatus: "Draft",
        revision: 1,
      };

      // Finding 3: Needs Review (Must NOT be exported)
      const fndNeedsReview: Finding & { studyId: StudyId } = {
        id: "FND-003",
        studyId: studyA,
        statement: "UNVALIDATED HYPOTHESIS UNDER RE-EXAMINATION",
        explanation: "Substantively modified hypothesis awaiting peer review.",
        supportingEvidenceIds: ["EV-A01"],
        contradictoryEvidence: "",
        evidenceStrength: "Medium",
        programmeImplication: "Await review",
        linkedRecommendationIds: [],
        validationStatus: "Needs Review",
        revision: 2,
      };

      // Recommendation 1: Validated (Export-eligible)
      const rec1: Recommendation & { studyId: StudyId } = {
        id: "REC-001",
        studyId: studyA,
        recommendation: "Install lithium-ion buffer batteries for afternoon computer lab sessions.",
        linkedFindingId: "FND-001",
        evidenceBase: ["EV-A01"],
        responsibleActor: "Infrastructure Unit",
        priority: "High",
        timeframe: "Immediate",
        feasibility: "High",
        riskSensitivity: "Low",
        expectedBenefit: "Restores daily instructional hours",
        successIndicator: "100% afternoon uptime",
        validationStatus: "Validated",
        revision: 1,
      };

      // Recommendation 2: Linked to Draft finding (Must NOT be exported)
      const rec2: Recommendation & { studyId: StudyId } = {
        id: "REC-002",
        studyId: studyA,
        recommendation: "Audit generator maintenance contracts immediately.",
        linkedFindingId: "FND-002",
        evidenceBase: ["EV-A02"],
        responsibleActor: "Audit Bureau",
        priority: "Medium",
        timeframe: "Q2",
        feasibility: "Medium",
        riskSensitivity: "Medium",
        expectedBenefit: "Cost control",
        successIndicator: "Clean logs",
        validationStatus: "Validated", // Even if rec is marked validated, parent is Draft -> excluded!
        revision: 1,
      };

      await saveFinding(fndValidated);
      const historicalStudy = (await assembleStudy(studyA))!;
      await saveCompleteStudy({ ...historicalStudy, findings: [...historicalStudy.findings, fndDraft] });
      await saveFinding(fndNeedsReview);
      await saveRecommendation(rec1);
      const historyWithDraftParent = (await assembleStudy(studyA))!;
      await saveCompleteStudy({ ...historyWithDraftParent, recommendations: [...historyWithDraftParent.recommendations, rec2] });

      const assembled = await assembleStudy(studyA);
      expect(assembled).toBeDefined();
      if (!assembled) return;

      const exportModel = buildBriefExportModel(assembled);

      // Check Model Filter Parity
      expect(exportModel.findings.map((f) => f.id)).toEqual(["FND-001"]);
      expect(exportModel.recommendations.map((r) => r.id)).toEqual(["REC-001"]);

      expect(exportModel.findings.some((f) => f.id === "FND-002")).toBe(false);
      expect(exportModel.findings.some((f) => f.id === "FND-003")).toBe(false);
      expect(exportModel.recommendations.some((r) => r.id === "REC-002")).toBe(false);

      // Check Markdown Generator Parity
      const markdown = generateMarkdownFromModel(exportModel);
      expect(markdown).toContain("FND-001: Power instability prematurely terminates digital instructional hours.");
      expect(markdown).toContain("REC-001: Install lithium-ion buffer batteries");

      // Verify draft and unvalidated text NEVER leaks into exported markdown
      expect(markdown).not.toContain("UNVERIFIED PRELIMINARY OBSERVATION");
      expect(markdown).not.toContain("UNVALIDATED HYPOTHESIS UNDER RE-EXAMINATION");
      expect(markdown).not.toContain("Audit generator maintenance contracts immediately.");
    });
  });

  // ============================================================================
  // Test 3: Stale Dependency Propagation
  // ============================================================================
  describe("3. Stale Dependency Propagation Across Evidence-Finding-Recommendation Chain", () => {
    it("demotes finding to Needs Review and flags recommendation as export-ineligible on substantive change", () => {
      const parentFinding: Finding = {
        id: "FND-001",
        statement: "Original stable finding statement.",
        explanation: "Established evidence.",
        supportingEvidenceIds: ["EV-001"],
        contradictoryEvidence: "",
        evidenceStrength: "High",
        programmeImplication: "Proceed with policy.",
        linkedRecommendationIds: ["REC-001"],
        validationStatus: "Validated",
        revision: 1,
      };

      const validRecommendation: Recommendation = {
        id: "REC-001",
        recommendation: "Implement policy action.",
        linkedFindingId: "FND-001",
        evidenceBase: ["EV-001"],
        responsibleActor: "Policy Director",
        priority: "High",
        timeframe: "Immediate",
        feasibility: "High",
        riskSensitivity: "Low",
        expectedBenefit: "Measurable progress",
        successIndicator: "Audit signoff",
        validationStatus: "Validated",
        revision: 1,
      };

      // Initially valid & export-eligible
      expect(isRecommendationExportEligible(validRecommendation, parentFinding)).toBe(true);
      expect(getRecommendationDependencyWarning(validRecommendation, parentFinding)).toBeNull();

      // Substantive edit: finding statement altered
      const editResult = applySubstantiveFindingEdit(parentFinding, {
        statement: "Revised finding statement asserting substantially altered conclusion.",
      });

      expect(editResult.requiredRevalidation).toBe(true);
      expect(editResult.updated.validationStatus).toBe("Needs Review");
      expect(editResult.updated.revision).toBe(2);

      // Recommendation immediately loses export eligibility
      expect(isRecommendationExportEligible(validRecommendation, editResult.updated)).toBe(false);

      // Recommendation receives clear dependency warning
      const warning = getRecommendationDependencyWarning(validRecommendation, editResult.updated);
      expect(warning).toBeDefined();
      expect(warning).toMatch(/Linked Finding requires re-validation/i);

      // Revalidating finding restores recommendation eligibility
      const revalidatedFinding = validateArtifact(editResult.updated, "Lead Reviewer", undefined, { evidence: [{ id: "EV-001", sourceId: "SRC-001", rawEvidence: "Reviewed synthetic material", primaryTheme: "Access", secondaryTheme: "", stakeholderType: "Teachers", evidenceStrength: "Medium", sensitivityFlag: "None", potentialFinding: "", qaStatus: "Reviewed", reviewStatus: "usable" }] });
      expect(revalidatedFinding.validationStatus).toBe("Validated");
      expect(isRecommendationExportEligible(validRecommendation, revalidatedFinding)).toBe(true);
      expect(getRecommendationDependencyWarning(validRecommendation, revalidatedFinding)).toBeNull();
    });
  });

  // ============================================================================
  // Test 4: Support Profile Eligibility & Context Logic
  // ============================================================================
  describe("4. Support Profile Eligibility & Analytical Robustness", () => {
    it("excludes rejected evidence and correctly evaluates single-site studies", () => {
      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          title: "KII with Teacher A",
          sourceType: "Key Informant Interview",
          date: "2026-03-10",
          stakeholderType: "Teachers",
          location: "Site-1",
          siteId: "Site-1",
          summary: "Interview notes",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-002",
          title: "FGD with Parents",
          sourceType: "Focus Group Discussion",
          date: "2026-03-11",
          stakeholderType: "Parents",
          location: "Site-1",
          siteId: "Site-1",
          summary: "Focus group notes",
          sensitivityFlag: "None",
        },
      ];

      const evidenceList: EvidenceEntry[] = [
        {
          id: "EV-001",
          sourceId: "SRC-001",
          siteId: "Site-1",
          rawEvidence: "Active evidence point 1.",
          primaryTheme: "Access",
          secondaryTheme: "",
          stakeholderType: "Teachers",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "",
          qaStatus: "Reviewed",
          validationStatus: "Validated",
        },
        {
          id: "EV-002",
          sourceId: "SRC-002",
          siteId: "Site-1",
          rawEvidence: "Active evidence point 2.",
          primaryTheme: "Access",
          secondaryTheme: "",
          stakeholderType: "Parents",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "",
          qaStatus: "Reviewed",
          validationStatus: "Validated",
        },
        {
          id: "EV-003",
          sourceId: "SRC-001",
          siteId: "Site-1",
          rawEvidence: "Flawed or unverified claim.",
          primaryTheme: "Access",
          secondaryTheme: "",
          stakeholderType: "Teachers",
          evidenceStrength: "Low",
          sensitivityFlag: "None",
          potentialFinding: "",
          qaStatus: "Needs Review",
          validationStatus: "Rejected", // REJECTED -> MUST BE EXCLUDED!
        },
      ];

      const finding: Finding = {
        id: "FND-001",
        statement: "Access challenges observed in school community.",
        explanation: "Evidenced by teachers and parents.",
        supportingEvidenceIds: ["EV-001", "EV-002", "EV-003"],
        contradictoryEvidence: "",
        evidenceStrength: "High",
        programmeImplication: "Action needed",
        linkedRecommendationIds: [],
      };

      // Test multi-site study context
      const multiSiteProfile = computeSupportProfile(
        finding,
        {
          targetStakeholderGroups: ["Teachers", "Parents"],
          targetSites: ["Site-1", "Site-2"],
          isSingleSiteStudy: false,
        },
        evidenceList,
        sources
      );

      // EV-003 is rejected, so only EV-001 and EV-002 are counted (2 independent sources)
      expect(multiSiteProfile.independentSourceCount).toBe(2);
      expect(multiSiteProfile.siteCoverage.sitesFound).toEqual(["Site-1"]);
      // Since study is multi-site and targetSites includes Site-2, Site-2 is missing
      expect(multiSiteProfile.siteCoverage.missingSites).toEqual(["Site-2"]);
      expect(multiSiteProfile.siteCoverage.isCrossSite).toBe(false);

      // Test single-site study context
      const singleSiteProfile = computeSupportProfile(
        finding,
        {
          targetStakeholderGroups: ["Teachers", "Parents"],
          targetSites: ["Site-1"],
          isSingleSiteStudy: true,
        },
        evidenceList,
        sources
      );

      // In single-site study, 1 site satisfies coverage without missing sites!
      expect(singleSiteProfile.siteCoverage.sitesFound).toEqual(["Site-1"]);
      expect(singleSiteProfile.siteCoverage.missingSites).toEqual([]);
      expect(singleSiteProfile.supportTier).toBe("Partially Supported");
    });
  });

  // ============================================================================
  // Test 5: Backup Validation, Corruption Rejection, and Collision Modes
  // ============================================================================
  describe("5. Backup Integrity, Forensic Validation, and Import Modes", () => {
    it("rejects non-JSON and corrupted backup files", async () => {
      const corruptedJson = "NOT_VALID_JSON{";
      const result = await inspectStudyBackup(corruptedJson, []);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Not valid JSON format/i);
    });

    it("rejects backup archives with broken relational integrity (orphaned child records)", async () => {
      const invalidArchive: StudyBackupEnvelope = {
        format: "field-learning-studio-backup",
        version: 1,
        exportedAt: Date.now(),
        warning: "DO NOT EDIT DIRECTLY.",
        study: metaA,
        sources: [], // No sources!
        evidence: [
          {
            id: "EV-001",
            sourceId: "SRC-MISSING", // Orphaned evidence!
            rawEvidence: "Orphaned evidence observation",
            primaryTheme: "Access",
            secondaryTheme: "",
            stakeholderType: "Teachers",
            evidenceStrength: "High",
            sensitivityFlag: "None",
            qaStatus: "Reviewed",
            validationStatus: "Draft",
            potentialFinding: "",
          },
        ],
        debriefs: [],
        findings: [],
        lessons: [],
        goodPractices: [],
        recommendations: [],
      };

      const result = await inspectStudyBackup(JSON.stringify(invalidArchive), []);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("references missing or foreign Source"))).toBe(true);
    });

    it("correctly handles import_as_new collision strategy by re-keying study and preserving internal references", async () => {
      const sourceA: SourceRecord & { studyId: StudyId } = {
        id: "SRC-A01",
        studyId: studyA,
        title: "KII with Minya Head Teacher",
        sourceType: "Key Informant Interview",
        date: "2026-03-10",
        stakeholderType: "Teachers",
        location: "Site-A",
        summary: "Teacher discusses solar power",
        sensitivityFlag: "None",
      };
      await saveSource(sourceA);

      const ev1: EvidenceEntry & { studyId: StudyId } = {
        id: "EV-A01",
        studyId: studyA,
        sourceId: "SRC-A01",
        rawEvidence: "Solar battery consistently fails at 12:30 PM.",
        primaryTheme: "Access",
        secondaryTheme: "",
        stakeholderType: "Teachers",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "",
        qaStatus: "Reviewed",
        validationStatus: "Validated",
        revision: 1,
      };
      await saveEvidence(ev1);

      // Export backup of Study A
      const backupJson = await exportStudyBackup(studyA);
      expect(backupJson).toBeDefined();

      // Inspect backup with studyA in existing list -> collision detected!
      const inspection = await inspectStudyBackup(backupJson, [studyA]);
      expect(inspection.valid).toBe(true);
      expect(inspection.preview?.collisionDetected).toBe(true);

      // Import as new study
      if (!inspection.envelope) throw new Error("Envelope missing");
      const importResult = await importStudyBackup(inspection.envelope, "import_as_new");

      expect(importResult.success).toBe(true);
      expect(importResult.studyId).not.toBe(studyA);
      expect(importResult.studyId).toMatch(/^study-[a-z0-9]+-[a-z0-9]+/);

      // Verify imported study can be assembled with preserved child relationships
      const restored = await assembleStudy(importResult.studyId);
      expect(restored).toBeDefined();
      expect(restored?.sources.length).toBe(1);
      expect(restored?.evidence.length).toBe(1);
      expect(restored?.title).toContain("Study Alpha");
    });
  });
});
