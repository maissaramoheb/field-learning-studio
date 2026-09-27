import type { DemoCase, QAReviewItem, QAReviewStatus, QAReviewItemId } from "@/lib/types";

function statusFromCheck(check: boolean): QAReviewStatus {
  return check ? "Pass" : "Warning";
}

/**
 * Generates a realistic QA checklist based strictly on deterministic data capabilities.
 * Unsupported qualitative or contextual claims are explicitly assigned
 * "Human Review Required", "Not Assessed", or "Informational" rather than false "Pass".
 */
export function generateQAReview(demoCase: DemoCase): QAReviewItem[] {
  const everyFindingHasEvidence = demoCase.findings.every(
    (finding) => (finding.supportingEvidenceIds || []).length > 0
  );
  const everyRecommendationHasFinding = demoCase.recommendations.every(
    (recommendation) =>
      demoCase.findings.some(
        (finding) => finding.id === recommendation.linkedFindingId
      )
  );
  const everyRecommendationHasEvidence = demoCase.recommendations.every(
    (recommendation) => (recommendation.evidenceBase || []).length > 0
  );
  const contradictionsDisplayed = demoCase.findings.every(
    (finding) => (finding.contradictoryEvidence?.trim() || "").length > 0
  );
  const sensitivityFlagsPresent = demoCase.evidence.every(
    (entry) => (entry.sensitivityFlag?.trim() || "").length > 0
  );
  const hasSensitiveEvidence = demoCase.evidence.some(
    (entry) =>
      entry.sensitivityFlag === "Medium" || entry.sensitivityFlag === "High"
  );
  const allRecsHavePracticalFields = demoCase.recommendations.every(
    (r) =>
      Boolean(r.responsibleActor && r.responsibleActor.trim()) &&
      Boolean(r.priority) &&
      Boolean(r.timeframe && r.timeframe.trim())
  );

  const qaItems: QAReviewItem[] = [
    {
      id: "QA-001",
      title: "Evidence Traceability",
      reviewQuestion:
        "Does every finding and recommendation link back to evidence IDs?",
      status: statusFromCheck(
        everyFindingHasEvidence && everyRecommendationHasEvidence
      ),
      notes:
        "Deterministic check: verifies that finding and recommendation structures contain non-empty evidence links.",
    },
    {
      id: "QA-002",
      title: "Triangulation",
      reviewQuestion:
        "Are major claims supported by multiple sources or stakeholder perspectives?",
      status: "Needs Review",
      notes:
        "Analytical review required: verify that support profiles meet study-specific triangulation thresholds.",
    },
    {
      id: "QA-003",
      title: "Overclaiming",
      reviewQuestion:
        "Does the brief avoid making outcome claims beyond the available evidence?",
      status: "Human Review Required",
      notes:
        "Subjective claim boundaries and causal inferences require analytical verification by evaluators; cannot be deterministically validated.",
    },
    {
      id: "QA-004",
      title: "Contradictions",
      reviewQuestion:
        "Are contradictory or limiting evidence points visible to reviewers?",
      status: statusFromCheck(contradictionsDisplayed),
      notes:
        contradictionsDisplayed
          ? "All finding cards include a contradiction or limitation note field."
          : "Some findings are missing contradiction or limitation notes.",
    },
    {
      id: "QA-005",
      title:
        demoCase.id === "school-nutrition"
          ? "Protection & Safeguarding Safety"
          : "Conflict Sensitivity",
      reviewQuestion:
        demoCase.id === "school-nutrition"
          ? "Are child feedback channels and health-related meal risks monitored with adult supervision?"
          : "Are sensitive conflict dynamics summarized without exposing individuals?",
      status: hasSensitiveEvidence ? "Human Review Required" : "Informational",
      notes: hasSensitiveEvidence
        ? "Sensitive evidence flagged. Human review is required to verify referral pathways and safety protocols before external use."
        : "No high/medium sensitivity flags detected in current evidence base.",
    },
    {
      id: "QA-006",
      title: "Gender Sensitivity",
      reviewQuestion:
        demoCase.id === "school-nutrition"
          ? "Does the synthesis reflect household caregiver roles and division of nutrition responsibility?"
          : "Does the synthesis reflect women's access, safety, and voice constraints?",
      status: "Not Assessed",
      notes:
        "Gender sensitivity requires contextual analysis by thematic specialists; deterministic rules cannot verify substantive gender inclusion.",
    },
    {
      id: "QA-007",
      title:
        demoCase.id === "school-nutrition"
          ? "Child-Centred Sensitivity"
          : "Youth Sensitivity",
      reviewQuestion:
        demoCase.id === "school-nutrition"
          ? "Does the synthesis reflect child-led committees and peer monitor protection parameters?"
          : "Does the synthesis distinguish youth participation from general attendance?",
      status: "Not Assessed",
      notes:
        "Youth and child protection parameters require qualitative review by field teams; not automatically verified.",
    },
    {
      id: "QA-008",
      title: "Stakeholder Sensitivity",
      reviewQuestion:
        "Are local authorities, partners, and community groups represented without overgeneralization?",
      status: "Needs Review",
      notes:
        "Inspect Support Profile stakeholder breakdown to confirm non-dominant groups are adequately represented.",
    },
    {
      id: "QA-009",
      title: "Practicality",
      reviewQuestion:
        "Are recommendations feasible, responsible, and time-bound?",
      status: allRecsHavePracticalFields ? "Pass" : "Check Required",
      notes: allRecsHavePracticalFields
        ? "Deterministic check: all recommendations specify responsible actors, priorities, and timeframes."
        : "Some recommendations are missing responsible actors or timeframes.",
    },
    {
      id: "QA-010",
      title: "Donor-Ready Language",
      reviewQuestion:
        "Is the language clear, measured, and suitable for a learning brief?",
      status: "Human Review Required",
      notes:
        "Tone and external communication standards must be reviewed by lead researcher before publication.",
    },
    {
      id: "QA-011",
      title: "Confidentiality & Anonymization",
      reviewQuestion:
        "Does the brief avoid personal data and identifiable sensitive details?",
      status: "Check Required",
      notes: sensitivityFlagsPresent
        ? "Sensitivity flags are populated. Human review required to confirm direct quotes and notes contain no direct or indirect PII."
        : "Some evidence records lack sensitivity classification.",
    },
    {
      id: "QA-012",
      title: "Learning Value",
      reviewQuestion:
        "Does the synthesis produce transferable learning rather than only activity reporting?",
      status: "Informational",
      notes:
        "Evaluative depth and generalizability of lessons/practices must be determined by peer reviewers.",
    },
    {
      id: "QA-013",
      title: "Adaptive Management",
      reviewQuestion:
        "Can the recommendations inform concrete programme adjustments?",
      status: statusFromCheck(everyRecommendationHasFinding),
      notes: everyRecommendationHasFinding
        ? "Deterministic check: each recommendation links to a parent finding."
        : "Unlinked recommendations detected.",
    },
  ];

  const hasSandbox = demoCase.evidence.some((e) => e.id.includes("SBX"));
  if (hasSandbox) {
    qaItems.push({
      id: "QA-SBX-001" as QAReviewItemId,
      title: "Sandbox Human Validation",
      reviewQuestion:
        "Has sandbox-generated draft evidence been manually validated by program staff?",
      status: "Needs Review",
      notes:
        "Sandbox-generated evidence requires human validation before donor-facing use.",
    });

    const hasHighSensitivitySandbox = demoCase.evidence.some(
      (e) => e.id.includes("SBX") && e.sensitivityFlag === "High"
    );
    if (hasHighSensitivitySandbox) {
      qaItems.push({
        id: "QA-SBX-002" as QAReviewItemId,
        title: "High-Sensitivity Sandbox Review",
        reviewQuestion:
          "Does the high-sensitivity sandbox note contain any identifying details?",
        status: "Warning",
        notes:
          "High-sensitivity sandbox note should not be exported without anonymization and review.",
      });
    }
  }

  return qaItems;
}
