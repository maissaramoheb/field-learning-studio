import { BriefExportModel } from "./buildBriefExportModel";

export function generateMarkdownFromModel(model: BriefExportModel): string {
  const bulletList = (items: string[]) => items.map(item => `- ${item}`).join("\n");

  const findingsText = model.findings
    .map(
      f =>
        `### ${f.id}: ${f.statement}\n\n${f.explanation}\n\nEvidence base: ${f.evidenceBase.join(", ")}\n\nProgramme implication: ${f.programmeImplication}`,
    )
    .join("\n\n");

  const lessonsText = model.lessons
    .map(
      l =>
        `### ${l.id}: ${l.statement}\n\nWhat worked / did not work: ${l.whatWorkedOrDidNotWork}\n\nWhy it happened: ${l.whyItHappened}\n\nConditions required: ${l.conditionsRequired}\n\nEvidence base: ${l.evidenceBase.join(", ")}\n\nTransferability: ${l.transferability}`,
    )
    .join("\n\n");

  const practicesText = model.goodPractices
    .map(
      g =>
        `### ${g.id}: ${g.title}\n\n${g.description}\n\nWhy it worked: ${g.whyItWorked}\n\nEvidence base: ${g.evidenceBase.join(", ")}\n\nConditions for replication: ${g.conditionsForReplication}\n\nRisks / limits: ${g.risksLimits}\n\nRecommended use: ${g.recommendedUse}`,
    )
    .join("\n\n");

  const recommendationsText = model.recommendations
    .map(
      r =>
        `### ${r.id}: ${r.recommendation}\n\nLinked finding: ${r.linkedFindingIds?.join(", ") || r.linkedFindingId}\n\nEvidence base: ${r.evidenceBase.join(", ")}\n\nResponsible actor: ${r.responsibleActor}\n\nPriority: ${r.priority}\n\nTimeframe: ${r.timeframe}\n\nFeasibility: ${r.feasibility}\n\nRisk / sensitivity: ${r.riskSensitivity}\n\nExpected benefit: ${r.expectedBenefit}\n\nSuccess indicator: ${r.successIndicator}`,
    )
    .join("\n\n");

  const traceabilityText = model.traceability
    .map(
      t =>
        `- ${t.findingId}: evidence ${t.evidenceIds.join(", ")} -> recommendations ${t.recommendationIds.join(", ")}`,
    )
    .join("\n");

  const purposeAndScopeSection = model.purposeAndScope
    ? `\n\n## Purpose and Scope\n\n${model.purposeAndScope}`
    : "";

  const keyThemesSection = model.keyThemes
    ? `\n\n## Key Themes\n\n${bulletList(model.keyThemes)}`
    : "";

  const safeguardingSection = model.safeguardingNotes
    ? `\n\n## Safeguarding and Sensitivity Notes\n\n${model.safeguardingNotes}`
    : "";

  let sandboxSection = "";
  if (model.includeSandbox && model.sandboxEvidence && model.sandboxEvidence.length > 0) {
    const sandboxItemsStr = model.sandboxEvidence.map((e) => {
      return `### ${e.id}
- **Evidence ID:** ${e.id}
- **Source ID:** ${e.sourceId}
- **Stakeholder:** ${e.stakeholderType}
- **Observation Summary:** ${e.rawEvidence}
- **Theme:** ${e.primaryTheme}
- **Sensitivity:** ${e.sensitivityFlag}
${e.draftFindingId ? `- **Draft Finding:** ${e.draftFindingId} - ${e.draftFindingStatement}` : ""}
${e.draftRecommendationId ? `- **Draft Recommendation:** ${e.draftRecommendationId} - ${e.draftRecommendationStatement}` : ""}`;
    }).join("\n\n");

    sandboxSection = `\n\n## Sandbox Draft Evidence — Requires Review\n\n**Sandbox Warning: Sandbox draft content is user-provided, local-only, and not validated.**\n\n${sandboxItemsStr}`;
  }

  return `# ${model.title}

## Subtitle

${model.subtitle}

## Metadata
- **Date Generated:** ${model.generatedDate}
- **Context:** ${model.demoNote}
- **Review Note:** ${model.reviewNote}

## Executive Summary

${model.executiveSummary}

## Key Messages

${bulletList(model.keyMessages)}${purposeAndScopeSection}${keyThemesSection}

## Main Findings

${findingsText}

## Lessons Learned

${lessonsText}

## Good Practices

${practicesText}

## Recommendations

${recommendationsText}${safeguardingSection}${sandboxSection}

## Limitations

${bulletList(model.limitations)}

## Annex: Traceability Summary

${traceabilityText}

## Safety Note

${model.safetyNote}`;
}

export function downloadBriefMarkdown(model: BriefExportModel): void {
  const content = generateMarkdownFromModel(model);
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const dateStr = new Date().toISOString().split("T")[0];
  link.href = url;
  link.download = `field-learning-brief-${model.caseId}-${dateStr}.md`;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
