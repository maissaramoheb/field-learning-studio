import type {
  DemoCase,
  FieldStudy,
  CollectionMethod,
  StudyScopeConfig,
} from "@/lib/types";
import {
  DEMO_AUDIT,
  inferMaterialCategoryFromSourceType,
  mapLegacyValidationToReviewStatus,
} from "./normalization";

const KNOWN_COLLECTION_METHODS: CollectionMethod[] = [
  "Key Informant Interview",
  "Focus Group Discussion",
  "Direct Observation",
  "Document Review",
  "Community Meeting",
  "Survey / Questionnaire",
];

function deriveScopeFromDemoCase(demoCase: DemoCase): StudyScopeConfig {
  const sites = new Set<string>();
  const stakeholders = new Set<string>();
  const methods = new Set<CollectionMethod>();

  for (const src of demoCase.sources || []) {
    if (src.location && src.location.trim().length > 0) {
      sites.add(src.location.trim());
    }
    if (src.stakeholderType && src.stakeholderType.trim().length > 0) {
      stakeholders.add(src.stakeholderType.trim());
    }
    if (src.sourceType) {
      const match = KNOWN_COLLECTION_METHODS.find(
        (m) => m.toLowerCase() === src.sourceType.toLowerCase()
      );
      if (match) {
        methods.add(match);
      }
    }
  }

  for (const ev of demoCase.evidence || []) {
    if (ev.siteId && ev.siteId.trim().length > 0) {
      sites.add(ev.siteId.trim());
    }
    if (ev.stakeholderType && ev.stakeholderType.trim().length > 0) {
      stakeholders.add(ev.stakeholderType.trim());
    }
  }

  const targetSites = sites.size > 0 ? Array.from(sites) : ["Primary Site"];
  const targetStakeholderGroups =
    stakeholders.size > 0 ? Array.from(stakeholders) : ["Community Members"];
  const expectedMethods =
    methods.size > 0 ? Array.from(methods) : undefined;

  return {
    targetSites,
    isSingleSiteStudy: targetSites.length <= 1,
    targetStakeholderGroups,
    expectedMethods,
  };
}

export function adaptDemoCaseToFieldStudy(demoCase: DemoCase): FieldStudy {
  const baseTimestamp = 1717200000000; // 2024-06-01T00:00:00.000Z deterministic baseline
  const studyId = demoCase.id;

  const scope = deriveScopeFromDemoCase(demoCase);

  const sources = (demoCase.sources || []).map((s) => ({
    ...s,
    studyId,
    materialCategory: s.materialCategory ?? inferMaterialCategoryFromSourceType(s.sourceType),
    audit: s.audit ?? DEMO_AUDIT,
    consentStatus: s.consentStatus ?? "Written",
    anonymizationStatus: s.anonymizationStatus ?? "Anonymized",
    createdAt: s.createdAt ?? baseTimestamp,
    updatedAt: s.updatedAt ?? baseTimestamp,
  }));

  const evidence = (demoCase.evidence || []).map((e) => {
    const validationStatus = e.validationStatus ?? "Validated";
    const inferredThemes: string[] = [...(e.frameworkThemeIds || [])];
    if (inferredThemes.length === 0) {
      const text = `${e.primaryTheme || ""} ${e.secondaryTheme || ""}`.toLowerCase();
      if (text.includes("access") || text.includes("barrier") || text.includes("inclusion")) {
        inferredThemes.push("THM-1");
      }
      if (text.includes("safe") || text.includes("space") || text.includes("facilitat") || text.includes("dialogue")) {
        inferredThemes.push("THM-2");
      }
      if (text.includes("youth") || text.includes("efficacy") || text.includes("action") || text.includes("engagement") || text.includes("participation")) {
        inferredThemes.push("THM-3");
      }
      if (text.includes("trust") || text.includes("governance") || text.includes("committee") || text.includes("accountability")) {
        inferredThemes.push("THM-4");
      }
      if (text.includes("equity") || text.includes("fairness") || text.includes("resource") || text.includes("grant") || text.includes("funding")) {
        inferredThemes.push("THM-5");
      }
      if (inferredThemes.length === 0) inferredThemes.push("THM-1");
    }

    const inferredQuestions: string[] = [...(e.studyQuestionIds || [])];
    if (inferredQuestions.length === 0) {
      const numMatch = e.id.match(/EV-0*(\d+)/);
      const num = numMatch ? parseInt(numMatch[1], 10) : 1;
      if (num <= 6) inferredQuestions.push("RQ-1");
      else if (num <= 11) inferredQuestions.push("RQ-2");
      else if (num <= 16) inferredQuestions.push("RQ-3");
      else inferredQuestions.push("RQ-4");
    }

    return {
      ...e,
      studyId,
      frameworkThemeIds: inferredThemes,
      studyQuestionIds: inferredQuestions,
      reviewStatus: e.reviewStatus ?? mapLegacyValidationToReviewStatus(validationStatus),
      audit: e.audit ?? DEMO_AUDIT,
      validationStatus,
      revision: e.revision ?? 1,
      lastValidatedAt: e.lastValidatedAt ?? baseTimestamp,
      lastValidatedBy: e.lastValidatedBy ?? "Demo Reviewer",
      createdAt: e.createdAt ?? baseTimestamp,
      updatedAt: e.updatedAt ?? baseTimestamp,
    };
  });

  const findings = (demoCase.findings || []).map((f) => ({
    ...f,
    studyId,
    audit: f.audit ?? DEMO_AUDIT,
    validationStatus: f.validationStatus ?? "Validated",
    revision: f.revision ?? 1,
    lastValidatedAt: f.lastValidatedAt ?? baseTimestamp,
    lastValidatedBy: f.lastValidatedBy ?? "Demo Reviewer",
    createdAt: f.createdAt ?? baseTimestamp,
    updatedAt: f.updatedAt ?? baseTimestamp,
  }));

  const lessons = (demoCase.lessons || []).map((l) => ({
    ...l,
    studyId,
    linkedFindingIds: l.linkedFindingIds ?? [],
    lineageStatus:
      l.lineageStatus ??
      (l.linkedFindingIds && l.linkedFindingIds.length > 0 ? "resolved" : "legacy_unresolved"),
    audit: l.audit ?? DEMO_AUDIT,
    validationStatus: l.validationStatus ?? "Validated",
    revision: l.revision ?? 1,
    lastValidatedAt: l.lastValidatedAt ?? baseTimestamp,
    lastValidatedBy: l.lastValidatedBy ?? "Demo Reviewer",
    createdAt: l.createdAt ?? baseTimestamp,
    updatedAt: l.updatedAt ?? baseTimestamp,
  }));

  const goodPractices = (demoCase.goodPractices || []).map((g) => ({
    ...g,
    studyId,
    linkedFindingIds: g.linkedFindingIds ?? [],
    lineageStatus:
      g.lineageStatus ??
      (g.linkedFindingIds && g.linkedFindingIds.length > 0 ? "resolved" : "legacy_unresolved"),
    audit: g.audit ?? DEMO_AUDIT,
    validationStatus: g.validationStatus ?? "Validated",
    revision: g.revision ?? 1,
    lastValidatedAt: g.lastValidatedAt ?? baseTimestamp,
    lastValidatedBy: g.lastValidatedBy ?? "Demo Reviewer",
    createdAt: g.createdAt ?? baseTimestamp,
    updatedAt: g.updatedAt ?? baseTimestamp,
  }));

  const recommendations = (demoCase.recommendations || []).map((r) => {
    const findingIds =
      r.linkedFindingIds && r.linkedFindingIds.length > 0
        ? r.linkedFindingIds
        : r.linkedFindingId
        ? [r.linkedFindingId]
        : [];
    return {
      ...r,
      studyId,
      linkedFindingId: findingIds[0] ?? r.linkedFindingId,
      linkedFindingIds: findingIds,
      linkedLessonIds: r.linkedLessonIds ?? [],
      audit: r.audit ?? DEMO_AUDIT,
      validationStatus: r.validationStatus ?? "Validated",
      revision: r.revision ?? 1,
      lastValidatedAt: r.lastValidatedAt ?? baseTimestamp,
      lastValidatedBy: r.lastValidatedBy ?? "Demo Reviewer",
      createdAt: r.createdAt ?? baseTimestamp,
      updatedAt: r.updatedAt ?? baseTimestamp,
    };
  });

  return {
    id: studyId,
    title: demoCase.project,
    subtitle: demoCase.subtitle,
    context: demoCase.context,
    status: "Demo Case",
    isDemoCase: true,
    scope: {
      ...scope,
      ...(demoCase.scopeConfig || {}),
    },
    executiveSummary: demoCase.executiveSummary,
    keyMessages: [...(demoCase.keyMessages || [])],
    limitations: [...(demoCase.limitations || [])],
    questions: demoCase.questions ? [...demoCase.questions] : [],
    patternNotes: demoCase.patternNotes ? [...demoCase.patternNotes] : [],
    outputConfig: {
      includeRecommendations: true,
      includeLessons: true,
      includeGoodPractices: true,
    },
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    sources,
    evidence,
    debriefs: [],
    findings,
    lessons,
    goodPractices,
    recommendations,
    // Phase 2 Study Workspace extensions
    purpose: demoCase.purpose || demoCase.purposeAndScope || demoCase.context,
    background: demoCase.background || demoCase.context,
    intendedAudience: demoCase.intendedAudience,
    decisionUse: demoCase.decisionUse,
    geography: demoCase.geography,
    timeframe: demoCase.timeframe,
    ownerLead: demoCase.ownerLead,
    framework: demoCase.framework,
    teamRoles: demoCase.teamRoles,
  };
}

export function adaptFieldStudyToDemoCase(study: FieldStudy): DemoCase {
  return {
    isDemoCase: study.isDemoCase,
    purposeAndScope: study.purpose,
    purpose: study.purpose,
    framework: study.framework,
    id: study.id,
    project: study.title,
    subtitle: study.subtitle,
    status: study.status,
    context: study.context,
    evidenceBase: {
      sourceRecords: study.sources.length,
      evidenceEntries: study.evidence.length,
      findings: study.findings.length,
      lessonsLearned: study.lessons.length,
      goodPractices: study.goodPractices.length,
      recommendations: study.recommendations.length,
    },
    professionalDraft: study.professionalDraft,
    executiveSummary: study.executiveSummary,
    keyMessages: [...(study.keyMessages || [])],
    limitations: [...(study.limitations || [])],
    sources: study.sources,
    evidence: study.evidence,
    findings: study.findings,
    lessons: study.lessons,
    goodPractices: study.goodPractices,
    recommendations: study.recommendations,
  };
}
