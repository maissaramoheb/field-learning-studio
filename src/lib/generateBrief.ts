import type { DemoCase } from "@/lib/types";

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export function generateLearningBriefMarkdown(demoCase: DemoCase): string {
  const findings = demoCase.findings
    .map(
      (finding) =>
        `### ${finding.id}: ${finding.statement}\n\n${finding.explanation}\n\nEvidence base: ${finding.supportingEvidenceIds.join(", ")}\n\nProgramme implication: ${finding.programmeImplication}`,
    )
    .join("\n\n");

  const lessons = demoCase.lessons
    .map(
      (lesson) =>
        `### ${lesson.id}: ${lesson.statement}\n\nWhat worked / did not work: ${lesson.whatWorkedOrDidNotWork}\n\nWhy it happened: ${lesson.whyItHappened}\n\nConditions required: ${lesson.conditionsRequired}\n\nEvidence base: ${lesson.evidenceBase.join(", ")}\n\nTransferability: ${lesson.transferability}`,
    )
    .join("\n\n");

  const goodPractices = demoCase.goodPractices
    .map(
      (practice) =>
        `### ${practice.id}: ${practice.title}\n\n${practice.description}\n\nWhy it worked: ${practice.whyItWorked}\n\nEvidence base: ${practice.evidenceBase.join(", ")}\n\nConditions for replication: ${practice.conditionsForReplication}\n\nRisks / limits: ${practice.risksLimits}\n\nRecommended use: ${practice.recommendedUse}`,
    )
    .join("\n\n");

  const recommendations = demoCase.recommendations
    .map(
      (recommendation) =>
        `### ${recommendation.id}: ${recommendation.recommendation}\n\nLinked finding: ${recommendation.linkedFindingId}\n\nEvidence base: ${recommendation.evidenceBase.join(", ")}\n\nResponsible actor: ${recommendation.responsibleActor}\n\nPriority: ${recommendation.priority}\n\nTimeframe: ${recommendation.timeframe}\n\nFeasibility: ${recommendation.feasibility}\n\nRisk / sensitivity: ${recommendation.riskSensitivity}\n\nExpected benefit: ${recommendation.expectedBenefit}\n\nSuccess indicator: ${recommendation.successIndicator}`,
    )
    .join("\n\n");

  const traceability = demoCase.findings
    .map(
      (finding) =>
        `- ${finding.id}: evidence ${finding.supportingEvidenceIds.join(", ")} -> recommendations ${finding.linkedRecommendationIds.join(", ")}`,
    )
    .join("\n");

  const purposeAndScopeSection = demoCase.purposeAndScope
    ? `\n\n## Purpose and Scope\n\n${demoCase.purposeAndScope}`
    : "";

  const keyThemesSection = demoCase.keyThemes
    ? `\n\n## Key Themes\n\n${bulletList(demoCase.keyThemes)}`
    : "";

  const safeguardingSection = demoCase.safeguardingNotes
    ? `\n\n## Safeguarding and Sensitivity Notes\n\n${demoCase.safeguardingNotes}`
    : "";

  const safetyNote = demoCase.id === "school-nutrition"
    ? "This case is a sanitized demo derived from prior fieldwork. No raw identifiable field data is included."
    : "This demo brief uses fictional data only. Do not use v0.1 with real sensitive field evidence.";

  return `# ${demoCase.project}: Learning Brief

## Subtitle

${demoCase.subtitle}

## Executive Summary

${demoCase.executiveSummary}

## Key Messages

${bulletList(demoCase.keyMessages)}${purposeAndScopeSection}${keyThemesSection}

## Main Findings

${findings}

## Lessons Learned

${lessons}

## Good Practices

${goodPractices}

## Recommendations

${recommendations}${safeguardingSection}

## Limitations

${bulletList(demoCase.limitations)}

## Annex: Traceability Summary

${traceability}

## Safety Note

${safetyNote}`;
}
