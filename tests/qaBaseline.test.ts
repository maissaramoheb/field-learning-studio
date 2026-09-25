import { describe, it, expect } from "vitest";
import { communityBridgesCase } from "@/data/cases/communityBridgesCase";
import { nutritionFieldCase } from "@/data/cases/nutritionFieldCase";
import { generateQAReview } from "@/lib/qa";
import type { DemoCase } from "@/lib/types";

describe("v0.8 Baseline: QA Safeguards Characterization", () => {
  describe("Community Bridges Case QA Baseline", () => {
    it("generates exactly 13 institutional QA checks with deterministic statuses", () => {
      const qaItems = generateQAReview(communityBridgesCase);

      expect(qaItems).toHaveLength(13);

      const statusCounts = {
        Pass: qaItems.filter((i) => i.status === "Pass").length,
        "Needs Review": qaItems.filter((i) => i.status === "Needs Review").length,
        Warning: qaItems.filter((i) => i.status === "Warning").length,
      };

      // In Community Bridges, 9 items pass, 4 need review, 0 warnings
      expect(statusCounts.Pass).toBe(9);
      expect(statusCounts["Needs Review"]).toBe(4);
      expect(statusCounts.Warning).toBe(0);

      // Verify specific key check IDs and titles
      expect(qaItems.find((i) => i.id === "QA-001")?.status).toBe("Pass"); // Evidence Traceability
      expect(qaItems.find((i) => i.id === "QA-002")?.status).toBe("Needs Review"); // Triangulation
      expect(qaItems.find((i) => i.id === "QA-003")?.status).toBe("Pass"); // Overclaiming
      expect(qaItems.find((i) => i.id === "QA-004")?.status).toBe("Pass"); // Contradictions
      expect(qaItems.find((i) => i.id === "QA-005")?.title).toBe("Conflict Sensitivity");
      expect(qaItems.find((i) => i.id === "QA-005")?.status).toBe("Needs Review");
      expect(qaItems.find((i) => i.id === "QA-013")?.status).toBe("Pass"); // Actionability
    });
  });

  describe("School Nutrition Case QA Baseline", () => {
    it("generates exactly 13 institutional QA checks with sanitized safeguarding labels", () => {
      const qaItems = generateQAReview(nutritionFieldCase);

      expect(qaItems).toHaveLength(13);

      const qa005 = qaItems.find((i) => i.id === "QA-005");
      expect(qa005?.title).toBe("Protection & Safeguarding Safety");
      expect(qa005?.status).toBe("Needs Review"); // Due to sensitive entries in nutrition case

      const qa007 = qaItems.find((i) => i.id === "QA-007");
      expect(qa007?.title).toBe("Child-Centred Sensitivity");
      expect(qa007?.status).toBe("Pass");

      const qa003 = qaItems.find((i) => i.id === "QA-003");
      expect(qa003?.notes).toContain("focusing on local acceptability and constraints rather than long-term nutritional changes");
    });
  });

  describe("Dynamic Sandbox Safeguard Flags", () => {
    it("dynamically injects QA-SBX-001 when unvalidated sandbox evidence is present", () => {
      const caseWithNormalSandbox: DemoCase = {
        ...communityBridgesCase,
        evidence: [
          {
            id: "EV-SBX-001",
            sourceId: "SRC-001",
            stakeholderType: "Youth",
            rawEvidence: "Draft observation",
            primaryTheme: "Access",
            secondaryTheme: "Sandbox",
            evidenceStrength: "Medium",
            sensitivityFlag: "Low",
            potentialFinding: "Potential draft",
            qaStatus: "Needs Review",
          },
          ...communityBridgesCase.evidence,
        ],
      };

      const qaItems = generateQAReview(caseWithNormalSandbox);
      expect(qaItems).toHaveLength(14);

      const sbxItem = qaItems.find((i) => i.id === "QA-SBX-001");
      expect(sbxItem).toBeDefined();
      expect(sbxItem?.status).toBe("Needs Review");
      expect(sbxItem?.title).toBe("Sandbox Human Validation");
      expect(sbxItem?.notes).toContain("requires human validation before donor-facing use");
    });

    it("dynamically injects QA-SBX-002 warning when high-sensitivity sandbox evidence is present", () => {
      const caseWithHighSensitivitySandbox: DemoCase = {
        ...communityBridgesCase,
        evidence: [
          {
            id: "EV-SBX-002",
            sourceId: "SRC-001",
            stakeholderType: "Protection",
            rawEvidence: "High sensitivity draft note",
            primaryTheme: "Safety",
            secondaryTheme: "Sandbox",
            evidenceStrength: "Medium",
            sensitivityFlag: "High",
            potentialFinding: "High risk potential draft",
            qaStatus: "Needs Review",
          },
          ...communityBridgesCase.evidence,
        ],
      };

      const qaItems = generateQAReview(caseWithHighSensitivitySandbox);
      expect(qaItems).toHaveLength(15); // Baseline 13 + SBX-001 + SBX-002

      const sbxItem2 = qaItems.find((i) => i.id === "QA-SBX-002");
      expect(sbxItem2).toBeDefined();
      expect(sbxItem2?.status).toBe("Warning");
      expect(sbxItem2?.title).toBe("High-Sensitivity Sandbox Review");
      expect(sbxItem2?.notes).toContain("High-sensitivity sandbox note should not be exported without anonymization");
    });
  });
});
