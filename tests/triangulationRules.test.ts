import { describe, it, expect } from "vitest";
import {
  computeTriangulationMetrics,
  evaluateFindingValidationEligibility,
  type TriangulationContext,
} from "@/lib/analytics/triangulation";
import { computeSupportProfile } from "@/lib/analytics/supportProfile";
import type {
  Finding,
  EvidenceEntry,
  SourceRecord,
} from "@/lib/types";

describe("Dynamic Triangulation Engine & Epistemic Rules (Phase 0)", () => {
  const sources: SourceRecord[] = [
    {
      id: "SRC-INTERVIEW",
      title: "Community Key Informant Interview",
      sourceType: "Key Informant Interview",
      materialCategory: "primary_evidence",
      date: "2026-03-01",
      stakeholderType: "Youth",
      location: "District A",
      summary: "Interview with youth regarding center attendance.",
      sensitivityFlag: "None",
    },
    {
      id: "SRC-OBSERVATION",
      title: "Direct Observation in Center",
      sourceType: "Direct Observation",
      materialCategory: "primary_evidence",
      date: "2026-03-02",
      stakeholderType: "Youth",
      location: "District A",
      summary: "Observation of youth activity sessions.",
      sensitivityFlag: "None",
    },
    {
      id: "SRC-DEBRIEF",
      title: "Supervisory Team Reflection",
      sourceType: "Team Reflection and Debrief",
      materialCategory: "supervisory_interpretation",
      date: "2026-03-05",
      stakeholderType: "Field Team",
      location: "District A",
      summary: "Internal supervisory notes reflecting on youth dynamics.",
      sensitivityFlag: "Low",
    },
    {
      id: "SRC-UNCLASSIFIED",
      title: "Legacy Unclassified Field Document",
      sourceType: "Custom Unknown Type",
      materialCategory: "legacy_unclassified",
      date: "2026-03-06",
      stakeholderType: "Community",
      location: "District B",
      summary: "Unclassified legacy document.",
      sensitivityFlag: "Low",
    },
  ];

  it("1. strictly excludes supervisory debriefs from independentSourceCount", () => {
    const evidence: EvidenceEntry[] = [
      {
        id: "EV-001",
        sourceId: "SRC-INTERVIEW",
        stakeholderType: "Youth",
        rawEvidence: "Youth preferred weekend sessions.",
        primaryTheme: "Access",
        secondaryTheme: "General",
        potentialFinding: "Youth attend on weekends",
        qaStatus: "Reviewed",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        validationStatus: "Validated",
        reviewStatus: "usable",
        revision: 1,
      },
      {
        id: "EV-002",
        sourceId: "SRC-DEBRIEF",
        stakeholderType: "Field Team",
        rawEvidence: "Supervisory impression confirms weekend preference.",
        primaryTheme: "Access",
        secondaryTheme: "General",
        potentialFinding: "Supervisory confirmation",
        qaStatus: "Reviewed",
        evidenceStrength: "Medium",
        sensitivityFlag: "None",
        validationStatus: "Validated",
        reviewStatus: "usable",
        revision: 1,
      },
    ];

    const finding: Finding = {
      id: "FND-001",
      statement: "Weekend scheduling significantly boosts youth attendance.",
      explanation: "Interview notes plus supervisory team reflection.",
      supportingEvidenceIds: ["EV-001", "EV-002"],
      contradictoryEvidence: "None documented",
      evidenceStrength: "High",
      programmeImplication: "Switch to weekend sessions.",
      linkedRecommendationIds: [],
      validationStatus: "Draft",
      revision: 1,
    };

    const context: TriangulationContext = { sources, evidence };
    const metrics = computeTriangulationMetrics(finding, context);

    // Both sources appear in distinct count
    expect(metrics.distinctSourceCount).toBe(2);
    // BUT only the interview counts as independent evidence; debrief is supervisory interpretation
    expect(metrics.independentSourceCount).toBe(1);
    // Because only 1 independent source supports it, it is single-source dependent
    expect(metrics.isSingleSourceDependent).toBe(true);
    expect(
      metrics.transparencyFlags.some((f) => f.includes("single independent source"))
    ).toBe(true);
  });

  it("2. emits qualification warning when supporting material contains legacy_unclassified records", () => {
    const evidence: EvidenceEntry[] = [
      {
        id: "EV-UNC",
        sourceId: "SRC-UNCLASSIFIED",
        stakeholderType: "Community",
        rawEvidence: "Legacy unclassified statement regarding fee structures.",
        primaryTheme: "Accountability",
        secondaryTheme: "General",
        potentialFinding: "Fee structure",
        qaStatus: "Reviewed",
        evidenceStrength: "Medium",
        sensitivityFlag: "Low",
        validationStatus: "Validated",
        reviewStatus: "usable",
        materialCategory: "legacy_unclassified",
        revision: 1,
      },
    ];

    const finding: Finding = {
      id: "FND-UNC",
      statement: "Fee structure needs revision.",
      explanation: "Supported by unclassified legacy paper.",
      supportingEvidenceIds: ["EV-UNC"],
      contradictoryEvidence: "None documented",
      evidenceStrength: "Medium",
      programmeImplication: "Review fees.",
      linkedRecommendationIds: [],
      validationStatus: "Draft",
      revision: 1,
    };

    const context: TriangulationContext = { sources, evidence };
    const metrics = computeTriangulationMetrics(finding, context);

    expect(metrics.hasUnclassifiedMaterialWarning).toBe(true);
    expect(metrics.transparencyFlags.some((f) => f.includes("legacy unclassified"))).toBe(true);
  });

  it("3. dynamically recalculates metrics upon evidence state edits without stale persisted state", () => {
    let evidence: EvidenceEntry[] = [
      {
        id: "EV-001",
        sourceId: "SRC-INTERVIEW",
        stakeholderType: "Youth",
        rawEvidence: "Youth report higher attendance with transport stipends.",
        primaryTheme: "Access",
        secondaryTheme: "General",
        potentialFinding: "Transport stipends help",
        qaStatus: "Reviewed",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        validationStatus: "Validated",
        reviewStatus: "usable",
        revision: 1,
      },
      {
        id: "EV-002",
        sourceId: "SRC-OBSERVATION",
        stakeholderType: "Youth",
        rawEvidence: "Direct count showed 30 youth in session.",
        primaryTheme: "Access",
        secondaryTheme: "General",
        potentialFinding: "30 youth attended",
        qaStatus: "Reviewed",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        validationStatus: "Validated",
        reviewStatus: "usable",
        revision: 1,
      },
    ];

    const finding: Finding = {
      id: "FND-DYN",
      statement: "Transport stipends improve youth attendance.",
      explanation: "Triangulated across interview and observation.",
      supportingEvidenceIds: ["EV-001", "EV-002"],
      contradictoryEvidence: "None documented",
      evidenceStrength: "High",
      programmeImplication: "Fund stipends.",
      linkedRecommendationIds: [],
      validationStatus: "Draft",
      revision: 1,
    };

    // Initial state: 2 independent sources, not single-source dependent
    let metrics = computeTriangulationMetrics(finding, { sources, evidence });
    expect(metrics.independentSourceCount).toBe(2);
    expect(metrics.methodDiversityCount).toBe(2);
    expect(metrics.isSingleSourceDependent).toBe(false);

    // Edit: Reviewer excludes EV-002 from analysis
    evidence = evidence.map((e) =>
      e.id === "EV-002" ? { ...e, reviewStatus: "excluded" as const } : e
    );

    // Recompute: metrics immediately react to evidence exclusion
    metrics = computeTriangulationMetrics(finding, { sources, evidence });
    expect(metrics.independentSourceCount).toBe(1);
    expect(metrics.methodDiversityCount).toBe(1);
    expect(metrics.isSingleSourceDependent).toBe(true);
  });

  it("4. requires human caveat/justification before validating single-source finding", () => {
    const evidence: EvidenceEntry[] = [
      {
        id: "EV-001",
        sourceId: "SRC-INTERVIEW",
        stakeholderType: "Youth",
        rawEvidence: "Only one interview mentioned this specific dispute.",
        primaryTheme: "Protection",
        secondaryTheme: "General",
        potentialFinding: "Dispute occurred",
        qaStatus: "Reviewed",
        evidenceStrength: "Low",
        sensitivityFlag: "Medium",
        validationStatus: "Validated",
        reviewStatus: "usable",
        revision: 1,
      },
    ];

    const findingWithoutCaveat: Finding = {
      id: "FND-SINGLE",
      statement: "An isolated dispute occurred at the municipal boundary.",
      explanation: "Single source report.",
      supportingEvidenceIds: ["EV-001"],
      contradictoryEvidence: "None documented",
      evidenceStrength: "Low",
      programmeImplication: "Monitor site.",
      linkedRecommendationIds: [],
      validationStatus: "Draft",
      revision: 1,
      // No limitationNote
    };

    const context: TriangulationContext = { sources, evidence };

    // Eligibility check fails because single-source finding lacks limitationNote
    const eligibility1 = evaluateFindingValidationEligibility(findingWithoutCaveat, context);
    expect(eligibility1.eligible).toBe(false);
    expect(eligibility1.requiresLimitationNote).toBe(true);
    expect(eligibility1.reasons.some((r) => r.includes("limitation note or caveat"))).toBe(true);

    // Providing explicit limitationNote/caveat allows human validation of single-source finding
    const findingWithCaveat: Finding = {
      ...findingWithoutCaveat,
      limitationNote:
        "Preliminary single-source observation documented as an early signal; corroboration is required before policy decisions.",
    };

    const eligibility2 = evaluateFindingValidationEligibility(findingWithCaveat, context);
    expect(eligibility2.eligible).toBe(true);
    expect(eligibility2.reasons).toEqual([]);
  });

  it("5. excludes supervisory debriefs from computeSupportProfile", () => {
    const evidence: EvidenceEntry[] = [
      {
        id: "EV-001",
        sourceId: "SRC-INTERVIEW",
        stakeholderType: "Youth",
        rawEvidence: "Interview point.",
        primaryTheme: "Theme",
        secondaryTheme: "General",
        potentialFinding: "Theme point",
        qaStatus: "Reviewed",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        validationStatus: "Validated",
        revision: 1,
      },
      {
        id: "EV-002",
        sourceId: "SRC-DEBRIEF",
        stakeholderType: "Field Team",
        rawEvidence: "Supervisory debrief point.",
        primaryTheme: "Theme",
        secondaryTheme: "General",
        potentialFinding: "Theme supervisory point",
        qaStatus: "Reviewed",
        evidenceStrength: "Medium",
        sensitivityFlag: "None",
        validationStatus: "Validated",
        revision: 1,
      },
    ];

    const finding: Finding = {
      id: "FND-SUPP",
      statement: "Test finding",
      explanation: "Explanation",
      supportingEvidenceIds: ["EV-001", "EV-002"],
      contradictoryEvidence: "None documented",
      evidenceStrength: "High",
      programmeImplication: "Implication",
      linkedRecommendationIds: [],
      validationStatus: "Validated",
      revision: 1,
    };

    const scope = {
      targetSites: ["District A"],
      isSingleSiteStudy: true,
      targetStakeholderGroups: ["Youth"],
    };

    const profile = computeSupportProfile(finding, scope, evidence, sources);
    // Independent source count excludes supervisory debrief (only SRC-INTERVIEW counts)
    expect(profile.independentSourceCount).toBe(1);
    expect(profile.supportTier).toBe("Emerging");
    expect(profile.transparencyFlags).toContain("Only 1 independent source");
  });
});
