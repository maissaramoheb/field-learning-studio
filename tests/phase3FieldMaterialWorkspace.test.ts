import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  parseCsvOrTsv,
  suggestColumnMappings,
} from "@/lib/intake/csvParser";
import {
  mapTabularRowsToCandidates,
  importTabularCandidates,
} from "@/lib/intake/tabularImporter";
import {
  CANONICAL_COLLECTION_METHODS,
  canonicalizeCollectionMethod,
  isCanonicalMethod,
} from "@/lib/methodTaxonomy";
import {
  PRACTITIONER_SPACES,
  getSpaceForTab,
  type WorkspaceTabId,
} from "@/components/FieldLearningStudioApp";
import {
  clearAllStores,
  assembleStudy,
  saveStudyMeta,
  saveSource,
  saveEvidence,
  saveStudyQuestion,
} from "@/lib/storage";
import type {
  StudyMeta,
  EvidenceEntry,
  StudyQuestion,
  SourceRecord,
} from "@/lib/types";

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

describe("Phase 3: Workspace Rail + Field Material Architecture", () => {
  beforeEach(async () => {
    await clearAllStores();
  });

  // ==========================================
  // 1. Navigation Architecture (Phase 3A)
  // ==========================================
  describe("1. Navigation Architecture (Phase 3A)", () => {
    it("defines 4 primary practitioner spaces with clear hierarchical progression", () => {
      expect(PRACTITIONER_SPACES).toHaveLength(4);
      expect(PRACTITIONER_SPACES.map((s) => s.id)).toEqual([
        "study",
        "field-material",
        "analysis",
        "deliverables",
      ]);

      const fieldMaterialSpace = PRACTITIONER_SPACES.find((s) => s.id === "field-material");
      expect(fieldMaterialSpace).toBeDefined();
      expect(fieldMaterialSpace?.stepNumber).toBe("2");
      expect(fieldMaterialSpace?.tabs.map((t) => t.id)).toEqual([
        "intake",
        "debrief",
        "import",
        "evidence",
      ]);

      const analysisSpace = PRACTITIONER_SPACES.find((s) => s.id === "analysis");
      expect(analysisSpace).toBeDefined();
      expect(analysisSpace?.stepNumber).toBe("3");
      expect(analysisSpace?.tabs.map((t) => t.id)).toEqual([
        "synthesis",
        "findings",
        "lessons",
      ]);
    });

    it("maps all Field Material sub-tabs to 'field-material' practitioner space", () => {
      const fieldMaterialTabs: WorkspaceTabId[] = [
        "intake",
        "debrief",
        "import",
        "evidence",
      ];
      fieldMaterialTabs.forEach((tab) => {
        expect(getSpaceForTab(tab)).toBe("field-material");
      });
    });

    it("strictly isolates Daily Debrief within Field Material, not Analysis", () => {
      expect(getSpaceForTab("debrief")).toBe("field-material");
      const analysisSpace = PRACTITIONER_SPACES.find((s) => s.id === "analysis");
      const debriefInAnalysis = analysisSpace?.tabs.some((t) => t.id === "debrief");
      expect(debriefInAnalysis).toBe(false);
    });
  });

  // ==========================================
  // 2. Tabular Intake & Mapping (Phase 3B)
  // ==========================================
  describe("2. Tabular Intake & Mapping (Phase 3B)", () => {
    it("correctly parses RFC 4180 CSV with quotes, commas, and newlines in cells", () => {
      const csv = `Date,Site,Method,Stakeholder,Observation,Notes
2026-03-15,"Site A, Central",Interview,Caregiver,"Mother stated: ""Water is scarce, and lines are long.""",Observed distress
2026-03-16,Site B,Focus Group,Youth,"Youth report:
- No playground
- Poor lighting",Evening session`;

      const parsed = parseCsvOrTsv(csv);
      expect(parsed.headers).toEqual(["Date", "Site", "Method", "Stakeholder", "Observation", "Notes"]);
      expect(parsed.rows).toHaveLength(2);
      expect(parsed.rows[0][1]).toBe("Site A, Central");
      expect(parsed.rows[0][4]).toBe('Mother stated: "Water is scarce, and lines are long."');
      expect(parsed.rows[1][4]).toBe("Youth report:\n- No playground\n- Poor lighting");
    });

    it("correctly parses TSV (tab-delimited) files", () => {
      const tsv = "Date\tSite\tMethod\tObservation\n2026-03-20\tNorth Clinic\tDirect Observation\tWaiting room packed";
      const parsed = parseCsvOrTsv(tsv);
      expect(parsed.headers).toEqual(["Date", "Site", "Method", "Observation"]);
      expect(parsed.rows).toHaveLength(1);
      expect(parsed.rows[0][1]).toBe("North Clinic");
      expect(parsed.rows[0][3]).toBe("Waiting room packed");
    });

    it("automatically infers column roles based on header heuristics", () => {
      const headers = ["Interview Date", "Facility / Location", "Method Used", "Respondent Type", "Verbatim Field Note", "Debrief Reflection"];
      const mapping = suggestColumnMappings(headers);

      expect(mapping[0]).toBe("date");
      expect(mapping[1]).toBe("siteId");
      expect(mapping[2]).toBe("collectionMethod");
      expect(mapping[3]).toBe("stakeholderType");
      expect(mapping[4]).toBe("narrative");
    });

    it("maps raw tabular row into structured candidate with canonical collection method", () => {
      const parseResult = {
        headers: ["Date", "Site", "Method", "Stakeholder", "Observation", "Notes"],
        rows: [
          ["2026-04-01", "Eastern District", "Focus Group", "Farmers", "Irrigation channels blocked by silt after heavy rain.", "Need prompt clearing before planting season."],
        ],
        delimiter: "," as const,
        totalRawRows: 1,
      };

      const columnMapping = {
        0: "date" as const,
        1: "siteId" as const,
        2: "collectionMethod" as const,
        3: "stakeholderType" as const,
        4: "narrative" as const,
      };

      const candidates = mapTabularRowsToCandidates(parseResult, columnMapping, "primary_evidence");

      expect(candidates).toHaveLength(1);
      const candidate = candidates[0];
      expect(candidate.date).toBe("2026-04-01");
      expect(candidate.siteId).toBe("Eastern District");
      expect(candidate.collectionMethod).toBe("Focus Group Discussion");
      expect(candidate.stakeholderType).toBe("Farmers");
      expect(candidate.excerpt).toBe("Irrigation channels blocked by silt after heavy rain.");
      expect(candidate.materialCategory).toBe("primary_evidence");
    });

    it("transactionally persists imported tabular candidates with pending status and coordinates", async () => {
      const studyId = "STUDY-P3-TAB-01";
      await saveStudyMeta(createMinimalMeta(studyId, "Agricultural Resilience Study"));
      const assembled = await assembleStudy(studyId);
      expect(assembled).toBeDefined();

      const candidate = {
        rowIndex: 0,
        title: "Irrigation Inspection",
        date: "2026-04-02",
        siteId: "Co-op Delta",
        collectionMethod: "Key Informant Interview",
        stakeholderType: "Water Committee Leader",
        excerpt: "Canal gates repaired last month but water pressure remains low.",
        observerNotes: "Potential upstream bottleneck.",
        materialCategory: "primary_evidence" as const,
      };

      const result = await importTabularCandidates(
        assembled!,
        [candidate],
        {
          filename: "field_intake_day1.csv",
          rawText: "Date,Site,Method,Stakeholder,Observation,Notes\n...",
        }
      );

      expect(result.sourcesCount).toBe(1);
      expect(result.evidenceCount).toBe(1);
      expect(result.sourceFileId).toBeDefined();

      const updatedStudy = await assembleStudy(studyId);
      expect(updatedStudy?.sources).toHaveLength(1);
      expect(updatedStudy?.evidence).toHaveLength(1);

      const savedEvidence = updatedStudy?.evidence[0];
      expect(savedEvidence?.reviewStatus).toBe("pending");
      expect(savedEvidence?.validationStatus).toBe("Draft");
      expect(savedEvidence?.materialCategory).toBe("primary_evidence");
      expect(savedEvidence?.sourceFileId).toBe(result.sourceFileId);
      expect(savedEvidence?.sourceCoordinate).toEqual({
        sourceType: "csv_row",
        csvRowIndex: 1,
      });
    });
  });

  // ==========================================
  // 3. Method Taxonomy Harmonization
  // ==========================================
  describe("3. Method Taxonomy Harmonization", () => {
    it("defines the 6 canonical collection methods", () => {
      expect(CANONICAL_COLLECTION_METHODS).toEqual([
        "Key Informant Interview",
        "Focus Group Discussion",
        "Direct Observation",
        "Document Review",
        "Community Meeting",
        "Survey / Questionnaire",
      ]);
    });

    it("normalizes method abbreviations and variants to canonical form", () => {
      expect(canonicalizeCollectionMethod("KII")).toBe("Key Informant Interview");
      expect(canonicalizeCollectionMethod("Interview")).toBe("Key Informant Interview");
      expect(canonicalizeCollectionMethod("FGD")).toBe("Focus Group Discussion");
      expect(canonicalizeCollectionMethod("Focus Group")).toBe("Focus Group Discussion");
      expect(canonicalizeCollectionMethod("Observation")).toBe("Direct Observation");
      expect(canonicalizeCollectionMethod("Review")).toBe("Document Review");
      expect(canonicalizeCollectionMethod("Desk Review")).toBe("Document Review");
      expect(canonicalizeCollectionMethod("Townhall")).toBe("Community Meeting");
      expect(canonicalizeCollectionMethod("Survey")).toBe("Survey / Questionnaire");
    });

    it("recognizes canonical methods via isCanonicalMethod predicate", () => {
      expect(isCanonicalMethod("Key Informant Interview")).toBe(true);
      expect(isCanonicalMethod("Direct Observation")).toBe(true);
      expect(isCanonicalMethod("Informal Chat")).toBe(false);
    });
  });

  // ==========================================
  // 4. Evidence Review & Qualification Gate
  // ==========================================
  describe("4. Evidence Review & Qualification Gate", () => {
    it("supports qualification state transitions: pending -> usable, needs_clarification, excluded", async () => {
      const studyId = "STUDY-P3-QUAL-01";
      await saveStudyMeta(createMinimalMeta(studyId, "Youth Employment Baseline"));

      const source: SourceRecord & { studyId: string } = {
        id: "SRC-P3-001",
        studyId,
        title: "Center Director Interview",
        sourceType: "Key Informant Interview",
        date: "2026-04-10",
        stakeholderType: "Vocational Trainers",
        location: "Training Center A",
        collectorName: "Lead Researcher",
        summary: "Interview with center director",
        sensitivityFlag: "None",
      };
      await saveSource(source);

      const entry: EvidenceEntry & { studyId: string } = {
        id: "EV-P3-001",
        studyId,
        sourceId: source.id,
        siteId: "Training Center A",
        stakeholderType: "Vocational Trainers",
        rawEvidence: "Equipment is 10 years outdated; students cannot practice modern welding.",
        primaryTheme: "Vocational Equipment",
        secondaryTheme: "Curriculum",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "Training equipment obsolescence restricts job placement.",
        qaStatus: "Needs Review",
        validationStatus: "Draft",
        reviewStatus: "pending",
        materialCategory: "primary_evidence",
        revision: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveEvidence(entry);

      // Qualify entry as usable
      const usableEntry: EvidenceEntry & { studyId: string } = {
        ...entry,
        reviewStatus: "usable",
        validationStatus: "Validated",
        lastValidatedBy: "Senior Evaluator",
        lastValidatedAt: Date.now(),
      };
      await saveEvidence(usableEntry);

      let assembled = await assembleStudy(studyId);
      expect(assembled?.evidence[0].reviewStatus).toBe("usable");
      expect(assembled?.evidence[0].validationStatus).toBe("Validated");

      // Flag for clarification
      const clarificationEntry: EvidenceEntry & { studyId: string } = {
        ...usableEntry,
        reviewStatus: "needs_clarification",
        validationStatus: "Needs Review",
      };
      await saveEvidence(clarificationEntry);

      assembled = await assembleStudy(studyId);
      expect(assembled?.evidence[0].reviewStatus).toBe("needs_clarification");
      expect(assembled?.evidence[0].validationStatus).toBe("Needs Review");

      // Exclude entry with explicit methodological reason
      const excludedEntry: EvidenceEntry & { studyId: string } = {
        ...clarificationEntry,
        reviewStatus: "excluded",
        validationStatus: "Rejected",
        exclusionReason: "Single uncorroborated anecdote outside evaluation timeframe.",
      };
      await saveEvidence(excludedEntry);

      assembled = await assembleStudy(studyId);
      expect(assembled?.evidence[0].reviewStatus).toBe("excluded");
      expect(assembled?.evidence[0].validationStatus).toBe("Rejected");
      expect(assembled?.evidence[0].exclusionReason).toBe("Single uncorroborated anecdote outside evaluation timeframe.");
    });
  });

  // ==========================================
  // 5. Framework Themes Bridge
  // ==========================================
  describe("5. Framework Themes Bridge", () => {
    it("links frameworkThemeIds while non-destructively preserving legacy primaryTheme", async () => {
      const studyId = "STUDY-P3-THEME-01";
      await saveStudyMeta(createMinimalMeta(studyId, "Nutrition & Health Study"));

      const source: SourceRecord & { studyId: string } = {
        id: "SRC-P3-002",
        studyId,
        title: "School Staff Interview",
        sourceType: "Key Informant Interview",
        date: "2026-04-12",
        stakeholderType: "School Staff",
        location: "Elementary School",
        summary: "Staff interview notes",
        sensitivityFlag: "None",
      };
      await saveSource(source);

      const entry: EvidenceEntry & { studyId: string } = {
        id: "EV-P3-002",
        studyId,
        sourceId: source.id,
        stakeholderType: "School Staff",
        rawEvidence: "Cooks lack basic measuring cups, leading to inconsistent meal portioning.",
        primaryTheme: "Portion Consistency",
        secondaryTheme: "Logistics",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "Lack of measuring tools impacts meal nutritional delivery.",
        qaStatus: "Needs Review",
        validationStatus: "Draft",
        reviewStatus: "pending",
        materialCategory: "primary_evidence",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveEvidence(entry);

      // Link Framework Theme FT-01 (Operational Quality)
      const linkedEntry: EvidenceEntry & { studyId: string } = {
        ...entry,
        frameworkThemeIds: ["FT-01"],
      };
      await saveEvidence(linkedEntry);

      const assembled = await assembleStudy(studyId);
      const retrieved = assembled?.evidence.find((e) => e.id === "EV-P3-002");
      expect(retrieved?.frameworkThemeIds).toEqual(["FT-01"]);
      expect(retrieved?.primaryTheme).toBe("Portion Consistency"); // Legacy string intact
    });
  });

  // ==========================================
  // 6. Study Questions in Field Material
  // ==========================================
  describe("6. Study Questions in Field Material", () => {
    it("allows linking and unlinking active study questions to observations", async () => {
      const studyId = "STUDY-P3-QUESTION-01";
      await saveStudyMeta(createMinimalMeta(studyId, "Community Water Quality Study"));

      const source: SourceRecord & { studyId: string } = {
        id: "SRC-P3-003",
        studyId,
        title: "Community Meeting",
        sourceType: "Community Meeting",
        date: "2026-04-14",
        stakeholderType: "Community Members",
        location: "Village Square",
        summary: "Meeting with villagers",
        sensitivityFlag: "None",
      };
      await saveSource(source);

      const q1: StudyQuestion = {
        id: "RQ-01",
        question: "To what extent are rural water points maintained effectively?",
        shortLabel: "Maintenance",
        isActive: true,
      };
      const q2: StudyQuestion = {
        id: "RQ-02",
        question: "What financial contributions do community members make?",
        shortLabel: "Tariffs",
        isActive: true,
      };
      await saveStudyQuestion(studyId, q1);
      await saveStudyQuestion(studyId, q2);

      const entry: EvidenceEntry & { studyId: string } = {
        id: "EV-P3-003",
        studyId,
        sourceId: source.id,
        stakeholderType: "Community Members",
        rawEvidence: "Pump broke down in February and was repaired within 48 hours by local mechanic.",
        primaryTheme: "Repair Turnaround",
        secondaryTheme: "Maintenance",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "Local mechanics ensure rapid breakdown turnaround.",
        qaStatus: "Needs Review",
        validationStatus: "Validated",
        reviewStatus: "usable",
        studyQuestionIds: ["RQ-01"],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveEvidence(entry);

      let assembled = await assembleStudy(studyId);
      let ev = assembled?.evidence.find((e) => e.id === "EV-P3-003");
      expect(ev?.studyQuestionIds).toEqual(["RQ-01"]);

      // Link second question
      const updatedEntry: EvidenceEntry & { studyId: string } = {
        ...entry,
        studyQuestionIds: ["RQ-01", "RQ-02"],
      };
      await saveEvidence(updatedEntry);

      assembled = await assembleStudy(studyId);
      ev = assembled?.evidence.find((e) => e.id === "EV-P3-003");
      expect(ev?.studyQuestionIds).toEqual(["RQ-01", "RQ-02"]);

      // Unlink question
      const unlinkedEntry: EvidenceEntry & { studyId: string } = {
        ...entry,
        studyQuestionIds: ["RQ-02"],
      };
      await saveEvidence(unlinkedEntry);

      assembled = await assembleStudy(studyId);
      ev = assembled?.evidence.find((e) => e.id === "EV-P3-003");
      expect(ev?.studyQuestionIds).toEqual(["RQ-02"]);
    });
  });

  // ==========================================
  // 7. Epistemic Safeguards (Supervisory Debrief Exclusion)
  // ==========================================
  describe("7. Epistemic Safeguards (Supervisory Debrief Exclusion)", () => {
    it("stamps debriefs and supervisory notes with materialCategory = 'supervisory_interpretation'", async () => {
      const studyId = "STUDY-P3-DEBRIEF-01";
      await saveStudyMeta(createMinimalMeta(studyId, "Peacebuilding Evaluation"));

      const source: SourceRecord & { studyId: string } = {
        id: "SRC-P3-004",
        studyId,
        title: "Field Debrief Log",
        sourceType: "Direct Observation",
        date: "2026-04-16",
        stakeholderType: "Evaluation Team",
        location: "Base Camp",
        summary: "Debrief log",
        sensitivityFlag: "Low",
      };
      await saveSource(source);

      const entry: EvidenceEntry & { studyId: string } = {
        id: "EV-P3-004",
        studyId,
        sourceId: source.id,
        stakeholderType: "Evaluation Team",
        rawEvidence: "Team debrief note: We suspect youth committee attendance is suppressed by elite capture.",
        primaryTheme: "Elite Capture Hypothesis",
        secondaryTheme: "Working Theory",
        evidenceStrength: "Low",
        sensitivityFlag: "Low",
        potentialFinding: "Hypothesis regarding youth exclusion.",
        qaStatus: "Needs Review",
        validationStatus: "Draft",
        reviewStatus: "pending",
        materialCategory: "supervisory_interpretation",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveEvidence(entry);

      const assembled = await assembleStudy(studyId);
      const ev = assembled?.evidence.find((e) => e.id === "EV-P3-004");
      expect(ev?.materialCategory).toBe("supervisory_interpretation");
    });
  });

  // ==========================================
  // 8. Legal & Shell Identity (Copyright Notice Regression)
  // ==========================================
  describe("8. Legal & Shell Identity (Copyright Notice Regression)", () => {
    it("asserts standard copyright notice exists in WorkspaceLeftRail", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const railSource = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/layout/WorkspaceLeftRail.tsx"),
        "utf-8"
      );

      // Expanded two-line treatment
      expect(railSource).toContain("© 2026 Maissara Selim");
      expect(railSource).toContain("Field Learning Studio. All rights reserved.");

      // Collapsed indicator with full tooltip / aria-label
      expect(railSource).toContain("© 2026");
      expect(railSource).toContain('aria-label="© 2026 Maissara Selim. Field Learning Studio. All rights reserved."');

      // Ensure no unauthorized trademark symbols
      expect(railSource).not.toContain("™");
      expect(railSource).not.toContain("®");
    });

    it("asserts full single-line copyright notice exists in LandingPage footer", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const landingSource = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/landing/LandingPage.tsx"),
        "utf-8"
      );

      expect(landingSource).toContain("© 2026 Maissara Selim. Field Learning Studio. All rights reserved.");
      expect(landingSource).not.toContain("™");
      expect(landingSource).not.toContain("®");
    });

    it("asserts mobile/tablet fallback notice exists in FieldLearningStudioApp and StudyLibraryView", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const appSource = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/FieldLearningStudioApp.tsx"),
        "utf-8"
      );
      const librarySource = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/library/StudyLibraryView.tsx"),
        "utf-8"
      );

      expect(appSource).toContain("© 2026 Maissara Selim. Field Learning Studio. All rights reserved.");
      expect(librarySource).toContain("© 2026 Maissara Selim. Field Learning Studio. All rights reserved.");
    });
  });
});
