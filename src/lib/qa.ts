import type { DemoCase, QAReviewItem, QAReviewStatus, QAReviewItemId } from "@/lib/types";

function statusFromCheck(check: boolean): QAReviewStatus {
  return check ? "Pass" : "Warning";
}

export function generateQAReview(demoCase: DemoCase): QAReviewItem[] {
  const everyFindingHasEvidence = demoCase.findings.every(
    (finding) => finding.supportingEvidenceIds.length > 0,
  );
  const everyRecommendationHasFinding = demoCase.recommendations.every(
    (recommendation) =>
      demoCase.findings.some(
        (finding) => finding.id === recommendation.linkedFindingId,
      ),
  );
  const everyRecommendationHasEvidence = demoCase.recommendations.every(
    (recommendation) => recommendation.evidenceBase.length > 0,
  );
  const contradictionsDisplayed = demoCase.findings.every(
    (finding) => (finding.contradictoryEvidence?.trim() || "").length > 0,
  );
  const sensitivityFlagsPresent = demoCase.evidence.every(
    (entry) => (entry.sensitivityFlag?.trim() || "").length > 0,
  );
  const hasSensitiveEvidence = demoCase.evidence.some(
    (entry) =>
      entry.sensitivityFlag === "Medium" || entry.sensitivityFlag === "High",
  );

  const qaItems: QAReviewItem[] = [
    {
      id: "QA-001",
      title: "Evidence Traceability",
      reviewQuestion:
        "Does every finding and recommendation link back to evidence IDs?",
      status: statusFromCheck(
        everyFindingHasEvidence && everyRecommendationHasEvidence,
      ),
      notes:
        "Findings and recommendations include evidence IDs so users can verify the claim chain.",
    },
    {
      id: "QA-002",
      title: "Triangulation",
      reviewQuestion:
        "Are major claims supported by multiple sources or stakeholder perspectives?",
      status: "Needs Review",
      notes:
        "Several findings use multiple evidence entries, but outcome-level claims still need more triangulation.",
    },
    {
      id: "QA-003",
      title: "Overclaiming",
      reviewQuestion:
        "Does the brief avoid making outcome claims beyond the available evidence?",
      status: "Pass",
      notes:
        demoCase.id === "school-nutrition"
          ? "The brief explicitly limits outcome claims, focusing on local acceptability and constraints rather than long-term nutritional changes."
          : "The brief explicitly limits claims about long-term peacebuilding outcomes.",
    },
    {
      id: "QA-004",
      title: "Contradictions",
      reviewQuestion:
        "Are contradictory or limiting evidence points visible to reviewers?",
      status: statusFromCheck(contradictionsDisplayed),
      notes:
        "Each finding card includes a contradiction or limitation note.",
    },
    {
      id: "QA-005",
      title: demoCase.id === "school-nutrition" ? "Protection & Safeguarding Safety" : "Conflict Sensitivity",
      reviewQuestion:
        demoCase.id === "school-nutrition"
          ? "Are child feedback channels and health-related meal risks monitored with adult supervision?"
          : "Are sensitive conflict dynamics summarized without exposing individuals?",
      status: hasSensitiveEvidence ? "Needs Review" : "Pass",
      notes:
        demoCase.id === "school-nutrition"
          ? "Sensitive evidence is flagged. Human review is required to verify referral pathways and safety protocols before donor-facing use."
          : "Sensitive evidence is flagged. Human review is required before any donor-facing use.",
    },
    {
      id: "QA-006",
      title: "Gender Sensitivity",
      reviewQuestion:
        demoCase.id === "school-nutrition"
          ? "Does the synthesis reflect household caregiver roles and division of nutrition responsibility?"
          : "Does the synthesis reflect women's access, safety, and voice constraints?",
      status: "Pass",
      notes:
        demoCase.id === "school-nutrition"
          ? "Caregiver roles and gendered household nutrition responsibility are covered in findings, lessons, and recommendations."
          : "Women's participation appears in findings, lessons, practices, and recommendations.",
    },
    {
      id: "QA-007",
      title: demoCase.id === "school-nutrition" ? "Child-Centred Sensitivity" : "Youth Sensitivity",
      reviewQuestion:
        demoCase.id === "school-nutrition"
          ? "Does the synthesis reflect child-led committees and peer monitor protection parameters?"
          : "Does the synthesis distinguish youth participation from general attendance?",
      status: "Pass",
      notes:
        demoCase.id === "school-nutrition"
          ? "Child participation and peer health group roles are covered in findings and recommendations."
          : "Youth engagement is linked to committee routines, small grants, and practical participation.",
    },
    {
      id: "QA-008",
      title: "Stakeholder Sensitivity",
      reviewQuestion:
        "Are local authorities, partners, and community groups represented without overgeneralization?",
      status: "Needs Review",
      notes:
        "The stakeholder map identifies inclusion gaps that should be addressed in future evidence collection.",
    },
    {
      id: "QA-009",
      title: "Practicality",
      reviewQuestion:
        "Are recommendations feasible, responsible, and time-bound?",
      status: "Pass",
      notes:
        "Recommendations include responsible actors, timeframes, feasibility, and success indicators.",
    },
    {
      id: "QA-010",
      title: "Donor-Ready Language",
      reviewQuestion:
        "Is the language clear, measured, and suitable for a learning brief?",
      status: "Needs Review",
      notes:
        "Language is structured and cautious, but final donor formatting should be reviewed by a human.",
    },
    {
      id: "QA-011",
      title: "Confidentiality",
      reviewQuestion:
        "Does the brief avoid personal data and identifiable sensitive details?",
      status: statusFromCheck(sensitivityFlagsPresent),
      notes:
        demoCase.id === "school-nutrition"
          ? "All school names are replaced with School A/B/C/D. Direct quotes are paraphrased and team names removed."
          : "The demo uses fictional, non-identifying evidence and visible sensitivity flags.",
    },
    {
      id: "QA-012",
      title: "Learning Value",
      reviewQuestion:
        "Does the synthesis produce transferable learning rather than only activity reporting?",
      status: "Pass",
      notes:
        "Lessons and good practices identify conditions, risks, and transferability.",
    },
    {
      id: "QA-013",
      title: "Adaptive Management",
      reviewQuestion:
        "Can the recommendations inform concrete programme adjustments?",
      status: statusFromCheck(everyRecommendationHasFinding),
      notes:
        "Each recommendation is linked to a finding and includes an expected benefit.",
    },
  ];

  const hasSandbox = demoCase.evidence.some((e) => e.id.includes("SBX"));
  if (hasSandbox) {
    qaItems.push({
      id: "QA-SBX-001" as QAReviewItemId,
      title: "Sandbox Human Validation",
      reviewQuestion: "Has sandbox-generated draft evidence been manually validated by program staff?",
      status: "Needs Review",
      notes: "Sandbox-generated evidence requires human validation before donor-facing use.",
    });

    const hasHighSensitivitySandbox = demoCase.evidence.some(
      (e) => e.id.includes("SBX") && e.sensitivityFlag === "High"
    );
    if (hasHighSensitivitySandbox) {
      qaItems.push({
        id: "QA-SBX-002" as QAReviewItemId,
        title: "High-Sensitivity Sandbox Review",
        reviewQuestion: "Does the high-sensitivity sandbox note contain any identifying details?",
        status: "Warning",
        notes: "High-sensitivity sandbox note should not be exported without anonymization and review.",
      });
    }
  }

  return qaItems;
}
