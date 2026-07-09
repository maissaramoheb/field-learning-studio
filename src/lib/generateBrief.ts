import type { DemoCase } from "@/lib/types";

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export function generateLearningBriefMarkdown(demoCase: DemoCase, includeSandbox: boolean = false): string {
  const findingsList = demoCase.findings.filter((f) => !f.id.includes("SBX") && !f.id.includes("TEMP"));
  const lessonsList = demoCase.lessons.filter((l) => !l.id.includes("SBX") && !l.id.includes("TEMP"));
  const goodPracticesList = demoCase.goodPractices.filter((g) => !g.id.includes("SBX") && !g.id.includes("TEMP"));
  const recsList = demoCase.recommendations.filter((r) => !r.id.includes("SBX") && !r.id.includes("TEMP"));

  const findings = findingsList
    .map(
      (finding) =>
        `### ${finding.id}: ${finding.statement}\n\n${finding.explanation}\n\nEvidence base: ${finding.supportingEvidenceIds.join(", ")}\n\nProgramme implication: ${finding.programmeImplication}`,
    )
    .join("\n\n");

  const lessons = lessonsList
    .map(
      (lesson) =>
        `### ${lesson.id}: ${lesson.statement}\n\nWhat worked / did not work: ${lesson.whatWorkedOrDidNotWork}\n\nWhy it happened: ${lesson.whyItHappened}\n\nConditions required: ${lesson.conditionsRequired}\n\nEvidence base: ${lesson.evidenceBase.join(", ")}\n\nTransferability: ${lesson.transferability}`,
    )
    .join("\n\n");

  const goodPractices = goodPracticesList
    .map(
      (practice) =>
        `### ${practice.id}: ${practice.title}\n\n${practice.description}\n\nWhy it worked: ${practice.whyItWorked}\n\nEvidence base: ${practice.evidenceBase.join(", ")}\n\nConditions for replication: ${practice.conditionsForReplication}\n\nRisks / limits: ${practice.risksLimits}\n\nRecommended use: ${practice.recommendedUse}`,
    )
    .join("\n\n");

  const recommendations = recsList
    .map(
      (recommendation) =>
        `### ${recommendation.id}: ${recommendation.recommendation}\n\nLinked finding: ${recommendation.linkedFindingId}\n\nEvidence base: ${recommendation.evidenceBase.join(", ")}\n\nResponsible actor: ${recommendation.responsibleActor}\n\nPriority: ${recommendation.priority}\n\nTimeframe: ${recommendation.timeframe}\n\nFeasibility: ${recommendation.feasibility}\n\nRisk / sensitivity: ${recommendation.riskSensitivity}\n\nExpected benefit: ${recommendation.expectedBenefit}\n\nSuccess indicator: ${recommendation.successIndicator}`,
    )
    .join("\n\n");

  const traceability = findingsList
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
    ? "This case is a sanitized demo derived from prior fieldwork. No raw identifiable field data is included.\n\nGenerated from Field Learning Studio demo. Review required before external use."
    : "This case uses fictional demo data for product validation.\n\nGenerated from Field Learning Studio demo. Review required before external use.";

  let sandboxSection = "";
  const sandboxEv = demoCase.evidence.filter((e) => e.id.includes("SBX"));
  if (includeSandbox && sandboxEv.length > 0) {
    const sandboxItemsStr = sandboxEv.map((e) => {
      const fnd = demoCase.findings.find((f) => f.supportingEvidenceIds.includes(e.id));
      const rec = fnd ? demoCase.recommendations.find((r) => r.linkedFindingId === fnd.id) : null;
      return `### ${e.id}
- **Evidence ID:** ${e.id}
- **Source ID:** ${e.sourceId}
- **Stakeholder:** ${e.stakeholderType}
- **Observation Summary:** ${e.rawEvidence}
- **Theme:** ${e.primaryTheme}
- **Sensitivity:** ${e.sensitivityFlag}
${fnd ? `- **Draft Finding:** ${fnd.id} - ${fnd.statement}` : ""}
${rec ? `- **Draft Recommendation:** ${rec.id} - ${rec.recommendation}` : ""}`;
    }).join("\n\n");

    sandboxSection = `\n\n## Sandbox Draft Evidence — Requires Review\n\n**Sandbox Warning: Sandbox draft content is user-provided, local-only, and not validated.**\n\n${sandboxItemsStr}`;
  }

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

${recommendations}${safeguardingSection}${sandboxSection}

## Limitations

${bulletList(demoCase.limitations)}

## Annex: Traceability Summary

${traceability}

## Safety Note

${safetyNote}`;
}
