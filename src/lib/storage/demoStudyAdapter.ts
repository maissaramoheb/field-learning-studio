import type {
  DemoCase,
  FieldStudy,
  CollectionMethod,
  StudyScopeConfig,
} from "@/lib/types";

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
    consentStatus: s.consentStatus ?? "Written",
    anonymizationStatus: s.anonymizationStatus ?? "Anonymized",
    createdAt: s.createdAt ?? baseTimestamp,
    updatedAt: s.updatedAt ?? baseTimestamp,
  }));

  const evidence = (demoCase.evidence || []).map((e) => ({
    ...e,
    studyId,
    validationStatus: e.validationStatus ?? "Validated",
    revision: e.revision ?? 1,
    lastValidatedAt: e.lastValidatedAt ?? baseTimestamp,
    lastValidatedBy: e.lastValidatedBy ?? "Demo Reviewer",
    createdAt: e.createdAt ?? baseTimestamp,
    updatedAt: e.updatedAt ?? baseTimestamp,
  }));

  const findings = (demoCase.findings || []).map((f) => ({
    ...f,
    studyId,
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
    validationStatus: g.validationStatus ?? "Validated",
    revision: g.revision ?? 1,
    lastValidatedAt: g.lastValidatedAt ?? baseTimestamp,
    lastValidatedBy: g.lastValidatedBy ?? "Demo Reviewer",
    createdAt: g.createdAt ?? baseTimestamp,
    updatedAt: g.updatedAt ?? baseTimestamp,
  }));

  const recommendations = (demoCase.recommendations || []).map((r) => ({
    ...r,
    studyId,
    validationStatus: r.validationStatus ?? "Validated",
    revision: r.revision ?? 1,
    lastValidatedAt: r.lastValidatedAt ?? baseTimestamp,
    lastValidatedBy: r.lastValidatedBy ?? "Demo Reviewer",
    createdAt: r.createdAt ?? baseTimestamp,
    updatedAt: r.updatedAt ?? baseTimestamp,
  }));

  return {
    id: studyId,
    title: demoCase.project,
    subtitle: demoCase.subtitle,
    context: demoCase.context,
    status: "Demo Case",
    isDemoCase: true,
    scope,
    executiveSummary: demoCase.executiveSummary,
    keyMessages: [...(demoCase.keyMessages || [])],
    limitations: [...(demoCase.limitations || [])],
    questions: [],
    patternNotes: [],
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
  };
}

export function adaptFieldStudyToDemoCase(study: FieldStudy): DemoCase {
  return {
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
    executiveSummary: study.executiveSummary,
    keyMessages: [...study.keyMessages],
    limitations: [...study.limitations],
    sources: study.sources,
    evidence: study.evidence,
    findings: study.findings,
    lessons: study.lessons,
    goodPractices: study.goodPractices,
    recommendations: study.recommendations,
  };
}
