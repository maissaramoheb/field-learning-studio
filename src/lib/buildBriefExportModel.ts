import type { DemoCase, FieldStudy } from "@/lib/types";
import {
  isFindingExportEligible,
  isRecommendationExportEligible,
  isLessonExportEligible,
  isGoodPracticeExportEligible,
  type CanonicalExportContext,
} from "./exportPolicy";

export interface ExportFinding {
  id: string;
  statement: string;
  explanation: string;
  evidenceBase: string[];
  programmeImplication: string;
}

export interface ExportLesson {
  id: string;
  statement: string;
  whatWorkedOrDidNotWork: string;
  whyItHappened: string;
  conditionsRequired: string;
  evidenceBase: string[];
  transferability: string;
}

export interface ExportGoodPractice {
  id: string;
  title: string;
  description: string;
  whyItWorked: string;
  evidenceBase: string[];
  conditionsForReplication: string;
  risksLimits: string;
  recommendedUse: string;
}

export interface ExportRecommendation {
  id: string;
  recommendation: string;
  linkedFindingId: string;
  evidenceBase: string[];
  responsibleActor: string;
  priority: string;
  timeframe: string;
  feasibility: string;
  riskSensitivity: string;
  expectedBenefit: string;
  successIndicator: string;
}

export interface ExportTraceItem {
  findingId: string;
  evidenceIds: string[];
  recommendationIds: string[];
}

export interface ExportSandboxEvidence {
  id: string;
  sourceId: string;
  stakeholderType: string;
  rawEvidence: string;
  primaryTheme: string;
  sensitivityFlag: string;
  draftFindingId?: string;
  draftFindingStatement?: string;
  draftRecommendationId?: string;
  draftRecommendationStatement?: string;
}

export interface BriefExportModel {
  caseId: string;
  title: string;
  subtitle: string;
  executiveSummary: string;
  keyMessages: string[];
  purposeAndScope?: string;
  keyThemes?: string[];
  findings: ExportFinding[];
  lessons: ExportLesson[];
  goodPractices: ExportGoodPractice[];
  recommendations: ExportRecommendation[];
  safeguardingNotes?: string;
  limitations: string[];
  traceability: ExportTraceItem[];
  safetyNote: string;
  demoNote: string;
  reviewNote: string;
  generatedDate: string;
  includeSandbox?: boolean;
  sandboxEvidence?: ExportSandboxEvidence[];
}

export function buildBriefExportModel(
  demoCase: DemoCase | FieldStudy,
  includeSandbox: boolean = false
): BriefExportModel {
  const safetyNote = demoCase.id === "school-nutrition"
    ? "This case is a sanitized demo derived from prior fieldwork. No raw identifiable field data is included."
    : "This case uses fictional demo data for product validation.";

  const demoNote = demoCase.id === "school-nutrition"
    ? "Sanitized real-world-inspired demo context."
    : "Fictional demo context.";

  const reviewNote = "Generated from Field Learning Studio demo. Review required before external use.";

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isLegacyDemo = Boolean(
    (demoCase as unknown as { isDemoCase?: boolean }).isDemoCase ||
    demoCase.id === "school-nutrition" ||
    demoCase.id === "community-bridges"
  );

  const context: CanonicalExportContext = {
    sources: demoCase.sources,
    evidence: demoCase.evidence,
    findings: demoCase.findings,
    isLegacyDemo,
  };

  const filteredFindings = demoCase.findings.filter((f) =>
    isFindingExportEligible(f, context)
  );

  const filteredRecs = demoCase.recommendations.filter((r) =>
    isRecommendationExportEligible(r, context)
  );

  const filteredLessons = demoCase.lessons.filter((l) =>
    isLessonExportEligible(l, context)
  );

  const filteredGoodPractices = demoCase.goodPractices.filter((g) =>
    isGoodPracticeExportEligible(g, context)
  );

  const sandboxEvidence: ExportSandboxEvidence[] = [];
  if (includeSandbox) {
    demoCase.evidence
      .filter((e) => e.id.includes("SBX") || e.id.includes("TEMP"))
      .forEach((e) => {
        const fnd = demoCase.findings.find((f) => f.supportingEvidenceIds.includes(e.id));
        const rec = fnd ? demoCase.recommendations.find((r) => r.linkedFindingId === fnd.id) : null;
        sandboxEvidence.push({
          id: e.id,
          sourceId: e.sourceId,
          stakeholderType: e.stakeholderType,
          rawEvidence: e.rawEvidence,
          primaryTheme: e.primaryTheme,
          sensitivityFlag: e.sensitivityFlag,
          draftFindingId: fnd?.id,
          draftFindingStatement: fnd?.statement,
          draftRecommendationId: rec?.id,
          draftRecommendationStatement: rec?.recommendation,
        });
      });
  }

  const projectTitle = "project" in demoCase ? demoCase.project : demoCase.title;

  return {
    caseId: demoCase.id,
    title: `${projectTitle}: Learning Brief`,
    subtitle: demoCase.subtitle,
    executiveSummary: demoCase.executiveSummary,
    keyMessages: demoCase.keyMessages,
    purposeAndScope: "purposeAndScope" in demoCase ? demoCase.purposeAndScope : undefined,
    keyThemes: "keyThemes" in demoCase ? demoCase.keyThemes : undefined,
    findings: filteredFindings.map((f) => ({
      id: f.id,
      statement: f.statement,
      explanation: f.explanation,
      evidenceBase: f.supportingEvidenceIds,
      programmeImplication: f.programmeImplication,
    })),
    lessons: filteredLessons.map((l) => ({
      id: l.id,
      statement: l.statement,
      whatWorkedOrDidNotWork: l.whatWorkedOrDidNotWork,
      whyItHappened: l.whyItHappened,
      conditionsRequired: l.conditionsRequired,
      evidenceBase: l.evidenceBase,
      transferability: l.transferability,
    })),
    goodPractices: filteredGoodPractices.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      whyItWorked: g.whyItWorked,
      evidenceBase: g.evidenceBase,
      conditionsForReplication: g.conditionsForReplication,
      risksLimits: g.risksLimits,
      recommendedUse: g.recommendedUse,
    })),
    recommendations: filteredRecs.map((r) => ({
      id: r.id,
      recommendation: r.recommendation,
      linkedFindingId: r.linkedFindingId,
      evidenceBase: r.evidenceBase,
      responsibleActor: r.responsibleActor,
      priority: r.priority,
      timeframe: r.timeframe,
      feasibility: r.feasibility,
      riskSensitivity: r.riskSensitivity,
      expectedBenefit: r.expectedBenefit,
      successIndicator: r.successIndicator,
    })),
    safeguardingNotes: "safeguardingNotes" in demoCase ? demoCase.safeguardingNotes : undefined,
    limitations: demoCase.limitations,
    traceability: filteredFindings.map((f) => ({
      findingId: f.id,
      evidenceIds: f.supportingEvidenceIds,
      recommendationIds: f.linkedRecommendationIds,
    })),
    safetyNote,
    demoNote,
    reviewNote,
    generatedDate: currentDate,
    includeSandbox,
    sandboxEvidence: sandboxEvidence.length > 0 ? sandboxEvidence : undefined,
  };
}
