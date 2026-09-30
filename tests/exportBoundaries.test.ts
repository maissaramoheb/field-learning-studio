import { describe, it, expect } from "vitest";
import { communityBridgesCase } from "@/data/cases/communityBridgesCase";
import { nutritionFieldCase } from "@/data/cases/nutritionFieldCase";
import { buildBriefExportModel } from "@/lib/buildBriefExportModel";
import { generateLearningBriefMarkdown } from "@/lib/generateBrief";
import type { DemoCase, EvidenceEntry, Finding, Recommendation, SourceRecord } from "@/lib/types";

describe("v0.8 Baseline: Export Boundaries & Fixtures Characterization", () => {
  describe("Community Bridges Case Baseline", () => {
    it("preserves exact baseline entity counts", () => {
      expect(communityBridgesCase.sources).toHaveLength(12);
      expect(communityBridgesCase.evidence).toHaveLength(21);
      expect(communityBridgesCase.findings).toHaveLength(8);
      expect(communityBridgesCase.lessons).toHaveLength(7);
      expect(communityBridgesCase.goodPractices).toHaveLength(4);
      expect(communityBridgesCase.recommendations).toHaveLength(10);
    });

    it("generates structured export model matching baseline counts", () => {
      const model = buildBriefExportModel(communityBridgesCase, false);

      expect(model.caseId).toBe("community-bridges");
      expect(model.title).toBe("Community Bridges Initiative: Learning Brief");
      expect(model.findings).toHaveLength(8);
      expect(model.lessons).toHaveLength(7);
      expect(model.goodPractices).toHaveLength(4);
      expect(model.recommendations).toHaveLength(10);
      expect(model.limitations).toHaveLength(4);
      expect(model.safetyNote).toContain("fictional demo data");
      expect(model.sandboxEvidence).toBeUndefined();
    });

    it("generates complete, non-empty learning brief markdown", () => {
      const md = generateLearningBriefMarkdown(communityBridgesCase, false);

      expect(md).toContain("# Community Bridges Initiative: Learning Brief");
      expect(md).toContain("## Executive Summary");
      expect(md).toContain("## Main Findings");
      expect(md).toContain("## Lessons Learned");
      expect(md).toContain("## Good Practices");
      expect(md).toContain("## Recommendations");
      expect(md).toContain("## Annex: Traceability Summary");
      expect(md.length).toBeGreaterThan(2000);
    });
  });

  describe("School Nutrition Case Baseline", () => {
    it("preserves exact baseline entity counts", () => {
      expect(nutritionFieldCase.sources).toHaveLength(8);
      expect(nutritionFieldCase.evidence).toHaveLength(12);
      expect(nutritionFieldCase.findings).toHaveLength(6);
      expect(nutritionFieldCase.lessons).toHaveLength(5);
      expect(nutritionFieldCase.goodPractices).toHaveLength(4);
      expect(nutritionFieldCase.recommendations).toHaveLength(8);
    });

    it("generates structured export model with sanitized disclaimers", () => {
      const model = buildBriefExportModel(nutritionFieldCase, false);

      expect(model.caseId).toBe("school-nutrition");
      expect(model.title).toBe("School Nutrition & Child Wellbeing Field Learning Case: Learning Brief");
      expect(model.findings).toHaveLength(6);
      expect(model.lessons).toHaveLength(5);
      expect(model.goodPractices).toHaveLength(4);
      expect(model.recommendations).toHaveLength(8);
      expect(model.safetyNote).toContain("sanitized demo derived from prior fieldwork");
      expect(model.sandboxEvidence).toBeUndefined();
    });

    it("generates complete, non-empty sanitized learning brief markdown", () => {
      const md = generateLearningBriefMarkdown(nutritionFieldCase, false);

      expect(md).toContain("# School Nutrition & Child Wellbeing Field Learning Case: Learning Brief");
      expect(md).toContain("## Purpose and Scope");
      expect(md).toContain("## Main Findings");
      expect(md).toContain("Targeting precision requires combining medical health indicators");
      expect(md.length).toBeGreaterThan(2000);
    });
  });

  describe("Sandbox / Validated Boundary Protection", () => {
    const mockSandboxSource: SourceRecord = {
      id: "SRC-SBX-001",
      title: "Sandbox Interview",
      sourceType: "Interview",
      date: "2026-07-09",
      stakeholderType: "Youth",
      location: "Sandbox Site",
      summary: "Sandbox summary",
      sensitivityFlag: "Low",
    };

    const mockSandboxEvidence: EvidenceEntry = {
      id: "EV-SBX-001",
      sourceId: "SRC-SBX-001",
      stakeholderType: "Youth",
      rawEvidence: "Raw sandbox observation",
      primaryTheme: "Access",
      secondaryTheme: "Sandbox",
      evidenceStrength: "Medium",
      sensitivityFlag: "Low",
      potentialFinding: "Potential draft finding",
      qaStatus: "Needs Review",
    };

    const mockSandboxFinding: Finding = {
      id: "FND-SBX-001",
      statement: "Draft finding from sandbox note",
      explanation: "Explanation of draft",
      supportingEvidenceIds: ["EV-SBX-001"],
      contradictoryEvidence: "None",
      evidenceStrength: "Medium",
      programmeImplication: "Check implications",
      linkedRecommendationIds: ["REC-SBX-001"],
    };

    const mockSandboxRec: Recommendation = {
      id: "REC-SBX-001",
      recommendation: "Draft recommendation from sandbox note",
      linkedFindingId: "FND-SBX-001",
      evidenceBase: ["EV-SBX-001"],
      responsibleActor: "MEL Lead",
      priority: "Medium",
      timeframe: "Next Quarter",
      feasibility: "Medium",
      riskSensitivity: "Low",
      expectedBenefit: "Improves outcomes",
      successIndicator: "Signed report",
    };

    const caseWithSandbox: DemoCase = {
      ...communityBridgesCase,
      sources: [mockSandboxSource, ...communityBridgesCase.sources],
      evidence: [mockSandboxEvidence, ...communityBridgesCase.evidence],
      findings: [mockSandboxFinding, ...communityBridgesCase.findings],
      recommendations: [mockSandboxRec, ...communityBridgesCase.recommendations],
    };

    it("strictly isolates sandbox findings and recommendations from formal sections when includeSandbox is false", () => {
      const model = buildBriefExportModel(caseWithSandbox, false);

      expect(model.findings).toHaveLength(8);
      expect(model.recommendations).toHaveLength(10);
      expect(model.findings.some((f) => f.id.includes("SBX"))).toBe(false);
      expect(model.recommendations.some((r) => r.id.includes("SBX"))).toBe(false);
      expect(model.sandboxEvidence).toBeUndefined();

      const md = generateLearningBriefMarkdown(caseWithSandbox, false);
      expect(md).not.toContain("FND-SBX-001");
      expect(md).not.toContain("REC-SBX-001");
      expect(md).not.toContain("Sandbox Draft Evidence");
    });

    it("appends sandbox drafts ONLY under dedicated sandbox section when includeSandbox is true", () => {
      const model = buildBriefExportModel(caseWithSandbox, true);

      // Main sections must still ONLY contain validated items
      expect(model.findings).toHaveLength(8);
      expect(model.recommendations).toHaveLength(10);
      expect(model.findings.some((f) => f.id.includes("SBX"))).toBe(false);
      expect(model.recommendations.some((r) => r.id.includes("SBX"))).toBe(false);

      // Dedicated sandbox array is populated
      expect(model.sandboxEvidence).toBeDefined();
      expect(model.sandboxEvidence).toHaveLength(1);
      expect(model.sandboxEvidence![0].id).toBe("EV-SBX-001");
      expect(model.sandboxEvidence![0].draftFindingId).toBe("FND-SBX-001");
      expect(model.sandboxEvidence![0].draftRecommendationId).toBe("REC-SBX-001");

      const md = generateLearningBriefMarkdown(caseWithSandbox, true);
      expect(md).toContain("## Sandbox Draft Evidence — Requires Review");
      expect(md).toContain("EV-SBX-001");
      expect(md).toContain("Raw sandbox observation");
    });
  });
});
