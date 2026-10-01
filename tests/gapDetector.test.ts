import { describe, it, expect } from "vitest";
import { detectFindingGaps, detectStudyGaps } from "@/lib/analytics/gapDetector";
import type {
  Finding,
  EvidenceEntry,
  SourceRecord,
  StudyScopeConfig,
  FieldStudy,
} from "@/lib/types";

describe("Evidence Gap Detector Engine (v0.9 Phase 2)", () => {
  const baseScope: StudyScopeConfig = {
    targetSites: ["Minya", "Assiut"],
    isSingleSiteStudy: false,
    targetStakeholderGroups: ["Teachers", "Parents", "Children"],
  };

  const createDummyFinding = (overrides?: Partial<Finding>): Finding => ({
    id: "FND-001",
    statement: "Standardized lesson plans improved classroom engagement.",
    explanation: "Observed teachers effectively managing discussion.",
    supportingEvidenceIds: ["EV-001"],
    contradictoryEvidence: "",
    evidenceStrength: "High",
    programmeImplication: "Scale training.",
    linkedRecommendationIds: ["REC-001"],
    ...overrides,
  });

  describe("1. Insufficient Coverage Gap", () => {
    it("generates a Critical InsufficientCoverage gap when a finding has 0 supporting sources", () => {
      const finding = createDummyFinding({ supportingEvidenceIds: [] });
      const gaps = detectFindingGaps(finding, baseScope, [], []);

      expect(gaps.length).toBe(1);
      expect(gaps[0].gapType).toBe("InsufficientCoverage");
      expect(gaps[0].severity).toBe("Critical");
    });
  });

  describe("2. Single Source Dependency Gap", () => {
    it("generates a Needs Attention SingleSourceDependency gap when all evidence comes from 1 source", () => {
      const finding = createDummyFinding({
        supportingEvidenceIds: ["EV-001", "EV-002"],
      });

      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          title: "Single Interview",
          sourceType: "Key Informant Interview",
          date: "2026-03-01",
          stakeholderType: "Teachers",
          location: "Minya",
          summary: "",
          sensitivityFlag: "None",
        },
      ];

      const evidence: EvidenceEntry[] = [
        {
          id: "EV-001",
          sourceId: "SRC-001",
          stakeholderType: "Teachers",
          rawEvidence: "Excerpt 1",
          primaryTheme: "Pedagogy",
          secondaryTheme: "Engagement",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "Plans work",
          qaStatus: "Reviewed",
          reviewStatus: "usable",
        },
        {
          id: "EV-002",
          sourceId: "SRC-001",
          stakeholderType: "Teachers",
          rawEvidence: "Excerpt 2",
          primaryTheme: "Pedagogy",
          secondaryTheme: "Engagement",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "Plans work",
          qaStatus: "Reviewed",
          reviewStatus: "usable",
        },
      ];

      const gaps = detectFindingGaps(finding, baseScope, evidence, sources);
      const singleSourceGap = gaps.find((g) => g.gapType === "SingleSourceDependency");

      expect(singleSourceGap).toBeDefined();
      expect(singleSourceGap?.severity).toBe("Needs Attention");
    });
  });

  describe("3. Method Concentration Gap", () => {
    it("generates a MethodConcentration gap when multiple sources share a single collection method", () => {
      const finding = createDummyFinding({
        supportingEvidenceIds: ["EV-001", "EV-002"],
      });

      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          title: "Interview 1",
          sourceType: "Key Informant Interview",
          date: "2026-03-01",
          stakeholderType: "Teachers",
          location: "Minya",
          summary: "",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-002",
          title: "Interview 2",
          sourceType: "Key Informant Interview",
          date: "2026-03-02",
          stakeholderType: "Parents",
          location: "Assiut",
          summary: "",
          sensitivityFlag: "None",
        },
      ];

      const evidence: EvidenceEntry[] = [
        {
          id: "EV-001",
          sourceId: "SRC-001",
          stakeholderType: "Teachers",
          rawEvidence: "Ev 1",
          primaryTheme: "P",
          secondaryTheme: "E",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "F",
          qaStatus: "Reviewed",
          reviewStatus: "usable",
        },
        {
          id: "EV-002",
          sourceId: "SRC-002",
          stakeholderType: "Parents",
          rawEvidence: "Ev 2",
          primaryTheme: "P",
          secondaryTheme: "E",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "F",
          qaStatus: "Reviewed",
          reviewStatus: "usable",
        },
      ];

      const gaps = detectFindingGaps(finding, baseScope, evidence, sources);
      const methodGap = gaps.find((g) => g.gapType === "MethodConcentration");

      expect(methodGap).toBeDefined();
      expect(methodGap?.severity).toBe("Needs Attention");
      expect(methodGap?.missingDimension).toBe("Key Informant Interview");
    });
  });

  describe("4. Missing Stakeholder Gaps", () => {
    it("flags missing target group as Critical for stakeholder-specific findings", () => {
      const finding = createDummyFinding({
        supportingEvidenceIds: ["EV-001"],
        isStakeholderSpecific: true,
        targetStakeholderGroup: "Children",
      });

      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          title: "Teacher Interview",
          sourceType: "Key Informant Interview",
          date: "2026-03-01",
          stakeholderType: "Teachers",
          location: "Minya",
          summary: "",
          sensitivityFlag: "None",
        },
      ];

      const evidence: EvidenceEntry[] = [
        {
          id: "EV-001",
          sourceId: "SRC-001",
          stakeholderType: "Teachers", // NOT Children
          rawEvidence: "Adult perspective",
          primaryTheme: "P",
          secondaryTheme: "E",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "F",
          qaStatus: "Reviewed",
          reviewStatus: "usable",
        },
      ];

      const gaps = detectFindingGaps(finding, baseScope, evidence, sources);
      const stakeholderGap = gaps.find((g) => g.gapType === "MissingStakeholder");

      expect(stakeholderGap).toBeDefined();
      expect(stakeholderGap?.severity).toBe("Critical");
      expect(stakeholderGap?.missingDimension).toBe("Children");
    });

    it("flags missing target groups as Needs Attention for broad claims", () => {
      const finding = createDummyFinding({
        supportingEvidenceIds: ["EV-001"],
        isStakeholderSpecific: false,
      });

      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          title: "Teacher Interview",
          sourceType: "Key Informant Interview",
          date: "2026-03-01",
          stakeholderType: "Teachers",
          location: "Minya",
          summary: "",
          sensitivityFlag: "None",
        },
      ];

      const evidence: EvidenceEntry[] = [
        {
          id: "EV-001",
          sourceId: "SRC-001",
          stakeholderType: "Teachers",
          rawEvidence: "Adult perspective",
          primaryTheme: "P",
          secondaryTheme: "E",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "F",
          qaStatus: "Reviewed",
          reviewStatus: "usable",
        },
      ];

      const gaps = detectFindingGaps(finding, baseScope, evidence, sources);
      const stakeholderGap = gaps.find((g) => g.gapType === "MissingStakeholder");

      expect(stakeholderGap).toBeDefined();
      expect(stakeholderGap?.severity).toBe("Needs Attention");
      expect(stakeholderGap?.missingDimension).toContain("Parents");
      expect(stakeholderGap?.missingDimension).toContain("Children");
    });
  });

  describe("5. Missing Site Gap & Single-Site Exception", () => {
    it("flags missing sites in multi-site studies", () => {
      const finding = createDummyFinding({
        supportingEvidenceIds: ["EV-001"],
      });

      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          title: "Minya Interview",
          sourceType: "Key Informant Interview",
          date: "2026-03-01",
          stakeholderType: "Teachers",
          location: "Minya",
          summary: "",
          sensitivityFlag: "None",
        },
      ];

      const evidence: EvidenceEntry[] = [
        {
          id: "EV-001",
          sourceId: "SRC-001",
          siteId: "Minya",
          stakeholderType: "Teachers",
          rawEvidence: "Minya quote",
          primaryTheme: "P",
          secondaryTheme: "E",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "F",
          qaStatus: "Reviewed",
          reviewStatus: "usable",
        },
      ];

      const gaps = detectFindingGaps(finding, baseScope, evidence, sources);
      const siteGap = gaps.find((g) => g.gapType === "MissingSite");

      expect(siteGap).toBeDefined();
      expect(siteGap?.missingDimension).toBe("Assiut");
    });

    it("does NOT flag MissingSite in legitimate single-site studies", () => {
      const singleSiteScope: StudyScopeConfig = {
        targetSites: ["Minya Center"],
        isSingleSiteStudy: true,
        targetStakeholderGroups: ["Teachers"],
      };

      const finding = createDummyFinding({
        supportingEvidenceIds: ["EV-001"],
      });

      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          title: "Minya Interview",
          sourceType: "Key Informant Interview",
          date: "2026-03-01",
          stakeholderType: "Teachers",
          location: "Minya Center",
          summary: "",
          sensitivityFlag: "None",
        },
      ];

      const evidence: EvidenceEntry[] = [
        {
          id: "EV-001",
          sourceId: "SRC-001",
          siteId: "Minya Center",
          stakeholderType: "Teachers",
          rawEvidence: "Quote",
          primaryTheme: "P",
          secondaryTheme: "E",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "F",
          qaStatus: "Reviewed",
          reviewStatus: "usable",
        },
      ];

      const gaps = detectFindingGaps(finding, singleSiteScope, evidence, sources);
      const siteGap = gaps.find((g) => g.gapType === "MissingSite");

      expect(siteGap).toBeUndefined();
    });
  });

  describe("6. Unresolved Contradiction Gap", () => {
    it("generates a Critical UnresolvedContradiction gap when finding links contradictory evidence", () => {
      const finding = createDummyFinding({
        supportingEvidenceIds: ["EV-001"],
        contradictoryEvidenceIds: ["EV-CONTRADICT-01"],
      });

      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          title: "Minya Interview",
          sourceType: "Key Informant Interview",
          date: "2026-03-01",
          stakeholderType: "Teachers",
          location: "Minya",
          summary: "",
          sensitivityFlag: "None",
        },
      ];

      const evidence: EvidenceEntry[] = [
        {
          id: "EV-001",
          sourceId: "SRC-001",
          siteId: "Minya",
          stakeholderType: "Teachers",
          rawEvidence: "Quote",
          primaryTheme: "P",
          secondaryTheme: "E",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "F",
          qaStatus: "Reviewed",
          reviewStatus: "usable",
        },
      ];

      const gaps = detectFindingGaps(finding, baseScope, evidence, sources);
      const contradictionGap = gaps.find((g) => g.gapType === "UnresolvedContradiction");

      expect(contradictionGap).toBeDefined();
      expect(contradictionGap?.severity).toBe("Critical");
    });
  });

  describe("7. Study-Wide Gap Detection", () => {
    it("detects overall unvisited configured study sites across the whole study", () => {
      const dummyStudy: FieldStudy = {
        id: "study-01",
        title: "Test Study",
        subtitle: "",
        context: "",
        status: "Active Fieldwork",
        isDemoCase: false,
        scope: {
          targetSites: ["Minya", "Assiut", "Sohag"],
          isSingleSiteStudy: false,
          targetStakeholderGroups: ["Teachers"],
        },
        executiveSummary: "",
        keyMessages: [],
        limitations: [],
        createdAt: 1000,
        updatedAt: 1000,
        sources: [
          {
            id: "SRC-001",
            title: "Minya Interview",
            sourceType: "Key Informant Interview",
            date: "2026-03-01",
            stakeholderType: "Teachers",
            location: "Minya",
            summary: "",
            sensitivityFlag: "None",
          },
        ],
        evidence: [
          {
            id: "EV-001",
            sourceId: "SRC-001",
            siteId: "Minya",
            stakeholderType: "Teachers",
            rawEvidence: "Quote",
            primaryTheme: "P",
            secondaryTheme: "E",
            evidenceStrength: "High",
            sensitivityFlag: "None",
            potentialFinding: "F",
            qaStatus: "Reviewed",
            reviewStatus: "usable",
          },
        ],
        debriefs: [],
        findings: [
          createDummyFinding({ supportingEvidenceIds: ["EV-001"] }),
        ],
        lessons: [],
        goodPractices: [],
        recommendations: [],
      };

      const studyGaps = detectStudyGaps(dummyStudy);
      const unvisitedSiteGap = studyGaps.find(
        (g) => g.id === "study-gap-unvisited-sites"
      );

      expect(unvisitedSiteGap).toBeDefined();
      expect(unvisitedSiteGap?.missingDimension).toContain("Assiut");
      expect(unvisitedSiteGap?.missingDimension).toContain("Sohag");
    });
  });
});
