import { describe, it, expect } from "vitest";
import { computeSupportProfile } from "@/lib/analytics/supportProfile";
import type {
  Finding,
  EvidenceEntry,
  SourceRecord,
  StudyScopeConfig,
} from "@/lib/types";

describe("Evidence Support Profile Engine (v0.9 Phase 2)", () => {
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

  describe("Case A: Repeated quotes from same source (Source Independence Rule)", () => {
    it("counts multiple evidence excerpts from the same source as 1 independent source", () => {
      const finding = createDummyFinding({
        supportingEvidenceIds: ["EV-001", "EV-002", "EV-003"],
      });

      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          title: "Teacher In-Depth Interview",
          sourceType: "Key Informant Interview",
          date: "2026-03-01",
          stakeholderType: "Teachers",
          location: "Minya",
          summary: "Interview on teaching practices",
          sensitivityFlag: "None",
        },
      ];

      const evidence: EvidenceEntry[] = [
        {
          id: "EV-001",
          sourceId: "SRC-001",
          stakeholderType: "Teachers",
          rawEvidence: "Quote 1 on lesson plans",
          primaryTheme: "Pedagogy",
          secondaryTheme: "Engagement",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "Plans work",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-002",
          sourceId: "SRC-001",
          stakeholderType: "Teachers",
          rawEvidence: "Quote 2 on student attention",
          primaryTheme: "Pedagogy",
          secondaryTheme: "Engagement",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "Plans work",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-003",
          sourceId: "SRC-001",
          stakeholderType: "Teachers",
          rawEvidence: "Quote 3 on lesson pacing",
          primaryTheme: "Pedagogy",
          secondaryTheme: "Engagement",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "Plans work",
          qaStatus: "Reviewed",
        },
      ];

      const profile = computeSupportProfile(finding, baseScope, evidence, sources);

      expect(profile.independentSourceCount).toBe(1);
      expect(profile.supportTier).toBe("Emerging");
      expect(profile.transparencyFlags).toContain("Only 1 independent source");
    });
  });

  describe("Case B: Diverse Triangulation across sources, methods, and stakeholders", () => {
    it("classifies findings with 3+ sources, multi-method, multi-stakeholder, and cross-site evidence as Strongly Supported", () => {
      const finding = createDummyFinding({
        supportingEvidenceIds: ["EV-001", "EV-002", "EV-003"],
      });

      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          title: "Teacher Interview",
          sourceType: "Key Informant Interview",
          date: "2026-03-01",
          stakeholderType: "Teachers",
          location: "Minya",
          summary: "Summary 1",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-002",
          title: "Parent Focus Group",
          sourceType: "Focus Group Discussion",
          date: "2026-03-02",
          stakeholderType: "Parents",
          location: "Assiut",
          summary: "Summary 2",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-003",
          title: "Classroom Observation",
          sourceType: "Direct Observation",
          date: "2026-03-03",
          stakeholderType: "Children",
          location: "Minya",
          summary: "Summary 3",
          sensitivityFlag: "None",
        },
      ];

      const evidence: EvidenceEntry[] = [
        {
          id: "EV-001",
          sourceId: "SRC-001",
          siteId: "Minya",
          stakeholderType: "Teachers",
          rawEvidence: "Teachers report high attention",
          primaryTheme: "Learning",
          secondaryTheme: "Attention",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "High attention",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-002",
          sourceId: "SRC-002",
          siteId: "Assiut",
          stakeholderType: "Parents",
          rawEvidence: "Parents report positive homework habits",
          primaryTheme: "Learning",
          secondaryTheme: "Attention",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "High attention",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-003",
          sourceId: "SRC-003",
          siteId: "Minya",
          stakeholderType: "Children",
          rawEvidence: "Observed active student hand-raising",
          primaryTheme: "Learning",
          secondaryTheme: "Attention",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "High attention",
          qaStatus: "Reviewed",
        },
      ];

      const profile = computeSupportProfile(finding, baseScope, evidence, sources);

      expect(profile.independentSourceCount).toBe(3);
      expect(profile.methodDiversity.isMultiMethod).toBe(true);
      expect(profile.methodDiversity.methodsFound.length).toBe(3);
      expect(profile.stakeholderCoverage.isMultiStakeholder).toBe(true);
      expect(profile.siteCoverage.isCrossSite).toBe(true);
      expect(profile.contradictionState.hasContradictions).toBe(false);
      expect(profile.supportTier).toBe("Strongly Supported");
    });
  });

  describe("Case C: Single-Site Study Legitimate Coverage", () => {
    it("does not penalize single-site studies for lack of cross-site evidence", () => {
      const singleSiteScope: StudyScopeConfig = {
        targetSites: ["Minya Center"],
        isSingleSiteStudy: true,
        targetStakeholderGroups: ["Teachers", "Parents"],
      };

      const finding = createDummyFinding({
        supportingEvidenceIds: ["EV-001", "EV-002", "EV-003"],
      });

      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          title: "Teacher KII",
          sourceType: "Key Informant Interview",
          date: "2026-03-01",
          stakeholderType: "Teachers",
          location: "Minya Center",
          summary: "",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-002",
          title: "Parent Survey",
          sourceType: "Survey / Questionnaire",
          date: "2026-03-02",
          stakeholderType: "Parents",
          location: "Minya Center",
          summary: "",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-003",
          title: "Direct Observation",
          sourceType: "Direct Observation",
          date: "2026-03-03",
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
          rawEvidence: "Ev 1",
          primaryTheme: "T1",
          secondaryTheme: "T2",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "P",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-002",
          sourceId: "SRC-002",
          siteId: "Minya Center",
          stakeholderType: "Parents",
          rawEvidence: "Ev 2",
          primaryTheme: "T1",
          secondaryTheme: "T2",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "P",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-003",
          sourceId: "SRC-003",
          siteId: "Minya Center",
          stakeholderType: "Teachers",
          rawEvidence: "Ev 3",
          primaryTheme: "T1",
          secondaryTheme: "T2",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "P",
          qaStatus: "Reviewed",
        },
      ];

      const profile = computeSupportProfile(finding, singleSiteScope, evidence, sources);

      expect(profile.independentSourceCount).toBe(3);
      expect(profile.siteCoverage.missingSites).toEqual([]);
      expect(profile.supportTier).toBe("Strongly Supported");
      expect(profile.transparencyFlags).toContain(
        "Single-site study: site coverage requirement satisfied"
      );
    });
  });

  describe("Case D: Multi-Site Study with Only Single Site Evidence", () => {
    it("detects missing sites and prevents Strongly Supported status in multi-site studies", () => {
      const finding = createDummyFinding({
        supportingEvidenceIds: ["EV-001", "EV-002", "EV-003"],
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
          title: "Observation 1",
          sourceType: "Direct Observation",
          date: "2026-03-02",
          stakeholderType: "Parents",
          location: "Minya",
          summary: "",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-003",
          title: "FGD 1",
          sourceType: "Focus Group Discussion",
          date: "2026-03-03",
          stakeholderType: "Children",
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
          rawEvidence: "Ev 1",
          primaryTheme: "T1",
          secondaryTheme: "T2",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "P",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-002",
          sourceId: "SRC-002",
          siteId: "Minya",
          stakeholderType: "Parents",
          rawEvidence: "Ev 2",
          primaryTheme: "T1",
          secondaryTheme: "T2",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "P",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-003",
          sourceId: "SRC-003",
          siteId: "Minya",
          stakeholderType: "Children",
          rawEvidence: "Ev 3",
          primaryTheme: "T1",
          secondaryTheme: "T2",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "P",
          qaStatus: "Reviewed",
        },
      ];

      const profile = computeSupportProfile(finding, baseScope, evidence, sources);

      expect(profile.siteCoverage.isCrossSite).toBe(false);
      expect(profile.siteCoverage.missingSites).toContain("Assiut");
      expect(profile.supportTier).toBe("Partially Supported");
      expect(
        profile.transparencyFlags.some((f) => f.includes("missing Assiut"))
      ).toBe(true);
    });
  });

  describe("Case E: Stakeholder-Specific Finding Exception", () => {
    it("does not penalize stakeholder-specific findings for omitting non-target stakeholder perspectives", () => {
      const singleSiteScope: StudyScopeConfig = {
        targetSites: ["Minya Center"],
        isSingleSiteStudy: true,
        targetStakeholderGroups: ["Teachers", "Parents", "Children"],
      };

      const finding = createDummyFinding({
        supportingEvidenceIds: ["EV-001", "EV-002", "EV-003"],
        isStakeholderSpecific: true,
        targetStakeholderGroup: "Teachers",
      });

      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          title: "Teacher KII 1",
          sourceType: "Key Informant Interview",
          date: "2026-03-01",
          stakeholderType: "Teachers",
          location: "Minya Center",
          summary: "",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-002",
          title: "Teacher Survey",
          sourceType: "Survey / Questionnaire",
          date: "2026-03-02",
          stakeholderType: "Teachers",
          location: "Minya Center",
          summary: "",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-003",
          title: "Teacher KII 2",
          sourceType: "Key Informant Interview",
          date: "2026-03-03",
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
          rawEvidence: "Teacher feedback 1",
          primaryTheme: "Workload",
          secondaryTheme: "Administration",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "High workload",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-002",
          sourceId: "SRC-002",
          siteId: "Minya Center",
          stakeholderType: "Teachers",
          rawEvidence: "Teacher survey results",
          primaryTheme: "Workload",
          secondaryTheme: "Administration",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "High workload",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-003",
          sourceId: "SRC-003",
          siteId: "Minya Center",
          stakeholderType: "Teachers",
          rawEvidence: "Teacher feedback 2",
          primaryTheme: "Workload",
          secondaryTheme: "Administration",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "High workload",
          qaStatus: "Reviewed",
        },
      ];

      const profile = computeSupportProfile(finding, singleSiteScope, evidence, sources);

      expect(profile.stakeholderCoverage.missingTargetStakeholders).toEqual([]);
      expect(profile.supportTier).toBe("Strongly Supported");
      expect(profile.transparencyFlags).toContain(
        "Stakeholder-specific claim supported by target group: Teachers"
      );
    });
  });

  describe("Case F: Broad Finding with Missing Target Stakeholders", () => {
    it("flags missing target groups and limits broad findings to Partially Supported", () => {
      const singleSiteScope: StudyScopeConfig = {
        targetSites: ["Minya Center"],
        isSingleSiteStudy: true,
        targetStakeholderGroups: ["Teachers", "Parents", "Children"],
      };

      const finding = createDummyFinding({
        supportingEvidenceIds: ["EV-001", "EV-002", "EV-003"],
        isStakeholderSpecific: false,
      });

      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          title: "Teacher KII",
          sourceType: "Key Informant Interview",
          date: "2026-03-01",
          stakeholderType: "Teachers",
          location: "Minya Center",
          summary: "",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-002",
          title: "Parent Survey",
          sourceType: "Survey / Questionnaire",
          date: "2026-03-02",
          stakeholderType: "Parents",
          location: "Minya Center",
          summary: "",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-003",
          title: "Parent FGD",
          sourceType: "Focus Group Discussion",
          date: "2026-03-03",
          stakeholderType: "Parents",
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
          rawEvidence: "Evidence 1",
          primaryTheme: "Nutrition",
          secondaryTheme: "Access",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "Broad claim",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-002",
          sourceId: "SRC-002",
          siteId: "Minya Center",
          stakeholderType: "Parents",
          rawEvidence: "Evidence 2",
          primaryTheme: "Nutrition",
          secondaryTheme: "Access",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "Broad claim",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-003",
          sourceId: "SRC-003",
          siteId: "Minya Center",
          stakeholderType: "Parents",
          rawEvidence: "Evidence 3",
          primaryTheme: "Nutrition",
          secondaryTheme: "Access",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "Broad claim",
          qaStatus: "Reviewed",
        },
      ];

      const profile = computeSupportProfile(finding, singleSiteScope, evidence, sources);

      expect(profile.stakeholderCoverage.missingTargetStakeholders).toContain("Children");
      expect(profile.supportTier).toBe("Partially Supported");
      expect(profile.transparencyFlags).toContain("Missing perspective(s): Children");
    });
  });

  describe("Case G: Active Unresolved Contradictions", () => {
    it("downgrades finding to Emerging when unresolved contradictions are linked", () => {
      const singleSiteScope: StudyScopeConfig = {
        targetSites: ["Minya Center"],
        isSingleSiteStudy: true,
        targetStakeholderGroups: ["Teachers", "Parents"],
      };

      const finding = createDummyFinding({
        supportingEvidenceIds: ["EV-001", "EV-002", "EV-003"],
        contradictoryEvidenceIds: ["EV-CONTRADICT-01"],
        contradictoryEvidenceSummary: "Field monitoring noted supplies did not arrive on time.",
      });

      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          title: "Teacher KII",
          sourceType: "Key Informant Interview",
          date: "2026-03-01",
          stakeholderType: "Teachers",
          location: "Minya Center",
          summary: "",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-002",
          title: "Parent Survey",
          sourceType: "Survey / Questionnaire",
          date: "2026-03-02",
          stakeholderType: "Parents",
          location: "Minya Center",
          summary: "",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-003",
          title: "Observation",
          sourceType: "Direct Observation",
          date: "2026-03-03",
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
          rawEvidence: "Ev 1",
          primaryTheme: "Supply",
          secondaryTheme: "Delivery",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "Supplies arrived",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-002",
          sourceId: "SRC-002",
          siteId: "Minya Center",
          stakeholderType: "Parents",
          rawEvidence: "Ev 2",
          primaryTheme: "Supply",
          secondaryTheme: "Delivery",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "Supplies arrived",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-003",
          sourceId: "SRC-003",
          siteId: "Minya Center",
          stakeholderType: "Teachers",
          rawEvidence: "Ev 3",
          primaryTheme: "Supply",
          secondaryTheme: "Delivery",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "Supplies arrived",
          qaStatus: "Reviewed",
        },
      ];

      const profile = computeSupportProfile(finding, singleSiteScope, evidence, sources);

      expect(profile.contradictionState.hasContradictions).toBe(true);
      expect(profile.contradictionState.unresolvedCount).toBe(1);
      expect(profile.supportTier).toBe("Emerging");
      expect(
        profile.transparencyFlags.some((f) =>
          f.includes("Contradictory evidence remains unresolved")
        )
      ).toBe(true);
    });
  });

  describe("Case H: Method Concentration", () => {
    it("recognizes source diversity but surfaces method concentration when 4 sources use the same method", () => {
      const singleSiteScope: StudyScopeConfig = {
        targetSites: ["Minya Center"],
        isSingleSiteStudy: true,
        targetStakeholderGroups: ["Teachers", "Parents"],
      };

      const finding = createDummyFinding({
        supportingEvidenceIds: ["EV-001", "EV-002", "EV-003", "EV-004"],
      });

      const sources: SourceRecord[] = [
        {
          id: "SRC-001",
          title: "Teacher 1 Interview",
          sourceType: "Key Informant Interview",
          date: "2026-03-01",
          stakeholderType: "Teachers",
          location: "Minya Center",
          summary: "",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-002",
          title: "Teacher 2 Interview",
          sourceType: "Key Informant Interview",
          date: "2026-03-02",
          stakeholderType: "Teachers",
          location: "Minya Center",
          summary: "",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-003",
          title: "Teacher 3 Interview",
          sourceType: "Key Informant Interview",
          date: "2026-03-03",
          stakeholderType: "Teachers",
          location: "Minya Center",
          summary: "",
          sensitivityFlag: "None",
        },
        {
          id: "SRC-004",
          title: "Headmaster Interview",
          sourceType: "Key Informant Interview",
          date: "2026-03-04",
          stakeholderType: "Parents",
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
          rawEvidence: "Quote A",
          primaryTheme: "T1",
          secondaryTheme: "T2",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "P",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-002",
          sourceId: "SRC-002",
          siteId: "Minya Center",
          stakeholderType: "Teachers",
          rawEvidence: "Quote B",
          primaryTheme: "T1",
          secondaryTheme: "T2",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "P",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-003",
          sourceId: "SRC-003",
          siteId: "Minya Center",
          stakeholderType: "Teachers",
          rawEvidence: "Quote C",
          primaryTheme: "T1",
          secondaryTheme: "T2",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "P",
          qaStatus: "Reviewed",
        },
        {
          id: "EV-004",
          sourceId: "SRC-004",
          siteId: "Minya Center",
          stakeholderType: "Parents",
          rawEvidence: "Quote D",
          primaryTheme: "T1",
          secondaryTheme: "T2",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "P",
          qaStatus: "Reviewed",
        },
      ];

      const profile = computeSupportProfile(finding, singleSiteScope, evidence, sources);

      expect(profile.independentSourceCount).toBe(4);
      expect(profile.methodDiversity.isMultiMethod).toBe(false);
      expect(profile.methodDiversity.methodsFound).toEqual(["Key Informant Interview"]);
      expect(profile.supportTier).toBe("Partially Supported");
      expect(profile.transparencyFlags).toContain(
        "All supporting evidence comes from Key Informant Interview (method concentration)"
      );
    });
  });

  describe("Phase 6 Workflow-Friction Audit: Support Profile Rigor & Scope Gaps", () => {
    const multiScope: StudyScopeConfig = {
      targetSites: ["Minya", "Assiut"],
      isSingleSiteStudy: false,
      targetStakeholderGroups: ["Teachers", "Parents", "Children"],
    };

    const sources: SourceRecord[] = [
      {
        id: "SRC-001",
        title: "Teacher Interview Minya",
        sourceType: "Key Informant Interview",
        date: "2026-03-01",
        stakeholderType: "Teachers",
        location: "Minya",
        summary: "Teacher perspective",
        sensitivityFlag: "None",
      },
      {
        id: "SRC-002",
        title: "Parent FGD Assiut",
        sourceType: "Focus Group Discussion",
        date: "2026-03-02",
        stakeholderType: "Parents",
        location: "Assiut",
        summary: "Parent perspective",
        sensitivityFlag: "None",
      },
      {
        id: "SRC-003",
        title: "Teacher Interview Assiut",
        sourceType: "Key Informant Interview",
        date: "2026-03-03",
        stakeholderType: "Teachers",
        location: "Assiut",
        summary: "Teacher perspective Assiut",
        sensitivityFlag: "None",
      },
      {
        id: "SRC-004",
        title: "Child Observation Minya",
        sourceType: "Direct Observation",
        date: "2026-03-04",
        stakeholderType: "Children",
        location: "Minya",
        summary: "Child meal observation",
        sensitivityFlag: "None",
      },
    ];

    const evidence: EvidenceEntry[] = [
      {
        id: "EV-001",
        sourceId: "SRC-001",
        siteId: "Minya",
        stakeholderType: "Teachers",
        rawEvidence: "Teachers report delivery delays.",
        primaryTheme: "Nutrition",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "Delays occur",
        qaStatus: "Reviewed",
      },
      {
        id: "EV-002",
        sourceId: "SRC-002",
        siteId: "Assiut",
        stakeholderType: "Parents",
        rawEvidence: "Parents report meals arrive late.",
        primaryTheme: "Nutrition",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "Delays occur",
        qaStatus: "Reviewed",
      },
      {
        id: "EV-003",
        sourceId: "SRC-003",
        siteId: "Assiut",
        stakeholderType: "Teachers",
        rawEvidence: "Assiut teachers confirm timing mismatch.",
        primaryTheme: "Nutrition",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "Delays occur",
        qaStatus: "Reviewed",
      },
      {
        id: "EV-004",
        sourceId: "SRC-004",
        siteId: "Minya",
        stakeholderType: "Children",
        rawEvidence: "Observed children receiving meals after recess.",
        primaryTheme: "Nutrition",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "Delays occur",
        qaStatus: "Reviewed",
      },
    ];

    it("does NOT classify broad finding as Strongly Supported when Children perspective is missing", () => {
      const broadFinding = createDummyFinding({
        id: "FND-010",
        statement: "Delivery delays prevent regular student meal access.",
        supportingEvidenceIds: ["EV-001", "EV-002", "EV-003"], // 3 sources, 2 methods (KII + FGD), 2 sites (Minya + Assiut), but NO Children
        isStakeholderSpecific: false,
      });

      const profile = computeSupportProfile(broadFinding, multiScope, evidence, sources);

      // Verify missingTargetStakeholders includes Children
      expect(profile.stakeholderCoverage.missingTargetStakeholders).toContain("Children");
      expect(profile.transparencyFlags).toContain("Missing perspective(s): Children");

      // Verify that even with 3 sources, multi-method, and cross-site, it is NOT Strongly Supported
      expect(profile.independentSourceCount).toBe(3);
      expect(profile.methodDiversity.isMultiMethod).toBe(true);
      expect(profile.siteCoverage.isCrossSite).toBe(true);
      expect(profile.supportTier).toBe("Partially Supported");
      expect(profile.supportTier).not.toBe("Strongly Supported");
    });

    it("upgrades to Strongly Supported when appropriate Children evidence is added", () => {
      const completedFinding = createDummyFinding({
        id: "FND-011",
        statement: "Delivery delays prevent regular student meal access across all groups.",
        supportingEvidenceIds: ["EV-001", "EV-002", "EV-003", "EV-004"], // Now includes EV-004 (Children, Direct Observation)
        isStakeholderSpecific: false,
      });

      const profile = computeSupportProfile(completedFinding, multiScope, evidence, sources);

      expect(profile.stakeholderCoverage.missingTargetStakeholders).toHaveLength(0);
      expect(profile.independentSourceCount).toBe(4);
      expect(profile.methodDiversity.methodsFound).toEqual(
        expect.arrayContaining(["Key Informant Interview", "Focus Group Discussion", "Direct Observation"])
      );
      expect(profile.siteCoverage.isCrossSite).toBe(true);
      expect(profile.supportTier).toBe("Strongly Supported");
      expect(profile.transparencyFlags).not.toContain("Missing perspective(s): Children");
    });

    it("detects multi-site gap when evidence is limited to Minya in a Minya + Assiut study", () => {
      const singleSiteFinding = createDummyFinding({
        id: "FND-012",
        statement: "Storage conditions compromise meal quality.",
        supportingEvidenceIds: ["EV-001", "EV-004"], // Both Minya
        isStakeholderSpecific: false,
      });

      const profile = computeSupportProfile(singleSiteFinding, multiScope, evidence, sources);

      expect(profile.siteCoverage.missingSites).toContain("Assiut");
      expect(profile.siteCoverage.isCrossSite).toBe(false);
      expect(profile.supportTier).toBe("Partially Supported");
      expect(profile.transparencyFlags).toContain(
        "Evidence currently limited to Minya; missing Assiut"
      );
    });
  });
});
