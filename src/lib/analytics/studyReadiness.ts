import type { FieldStudy, StudyMeta } from "@/lib/types";

export type ReadinessState = "ready" | "needs_attention" | "incomplete";

export interface ReadinessCheckItem {
  id: string;
  category: "brief" | "questions" | "methods" | "framework" | "roles";
  targetTab: "study-brief" | "study-questions" | "study-methods" | "study-framework";
  label: string;
  description: string;
  isSatisfied: boolean;
  severity: "critical" | "warning";
}

export interface StudyReadinessResult {
  state: ReadinessState;
  stateLabel: string;
  summary: string;
  checks: ReadinessCheckItem[];
  passedCount: number;
  totalCount: number;
  criticalMissingCount: number;
  warningMissingCount: number;
}

export function computeStudyReadiness(
  study: StudyMeta | FieldStudy | null | undefined
): StudyReadinessResult {
  if (!study) {
    return {
      state: "incomplete",
      stateLabel: "Blueprint Incomplete",
      summary: "No active study loaded to evaluate readiness.",
      checks: [],
      passedCount: 0,
      totalCount: 0,
      criticalMissingCount: 0,
      warningMissingCount: 0,
    };
  }

  const titleValid = typeof study.title === "string" && study.title.trim().length > 0;
  const purposeValid =
    (typeof study.purpose === "string" && study.purpose.trim().length > 0) ||
    (typeof study.context === "string" && study.context.trim().length > 0);

  const activeQuestions = (study.questions || []).filter((q) => q.isActive !== false);
  const questionsValid = activeQuestions.length >= 1;

  const sites = study.scope?.targetSites || [];
  const sitesValid = sites.length >= 1 && sites.some((s) => s.trim().length > 0);

  const stakeholders = study.scope?.targetStakeholderGroups || [];
  const stakeholdersValid =
    stakeholders.length >= 1 && stakeholders.some((s) => s.trim().length > 0);

  const plannedMethods = study.scope?.plannedMethods || [];
  const expectedMethods = study.scope?.expectedMethods || [];
  const methodsValid = plannedMethods.length >= 1 || expectedMethods.length >= 1;

  const frameworkThemes = study.framework?.themes || [];
  const activeThemes = frameworkThemes.filter((t) => t.isActive !== false);
  const frameworkValid = activeThemes.length >= 2;

  const roles = study.teamRoles || [];
  const leadAssigned =
    (typeof study.ownerLead === "string" && study.ownerLead.trim().length > 0) ||
    roles.some((r) => r.role === "lead");

  const validatorAssigned = roles.some(
    (r) => r.role === "validator" || r.role === "reviewer"
  );

  const checks: ReadinessCheckItem[] = [
    {
      id: "brief_title",
      category: "brief",
      targetTab: "study-brief",
      label: "Study Title",
      description: "A clear, descriptive name identifying the study.",
      isSatisfied: titleValid,
      severity: "critical",
    },
    {
      id: "brief_purpose",
      category: "brief",
      targetTab: "study-brief",
      label: "Purpose & Rationale",
      description: "Why this study exists and its intended decision use.",
      isSatisfied: purposeValid,
      severity: "critical",
    },
    {
      id: "questions_defined",
      category: "questions",
      targetTab: "study-questions",
      label: "Core Study Questions",
      description: "At least one primary question defining what evidence collection must answer.",
      isSatisfied: questionsValid,
      severity: "critical",
    },
    {
      id: "scope_sites",
      category: "questions",
      targetTab: "study-questions",
      label: "Target Field Sites",
      description: "Explicit geographic locations or operational sites in scope.",
      isSatisfied: sitesValid,
      severity: "critical",
    },
    {
      id: "scope_stakeholders",
      category: "questions",
      targetTab: "study-questions",
      label: "Target Stakeholders",
      description: "Key community and institutional stakeholder groups to be consulted.",
      isSatisfied: stakeholdersValid,
      severity: "critical",
    },
    {
      id: "methods_planned",
      category: "methods",
      targetTab: "study-methods",
      label: "Planned Collection Methods",
      description: "At least one collection method with optional target interview/focus group counts.",
      isSatisfied: methodsValid,
      severity: "warning",
    },
    {
      id: "framework_themes",
      category: "framework",
      targetTab: "study-framework",
      label: "Analytical Framework Lenses",
      description: "At least two analytical lenses or evaluation domains for comparative interpretation.",
      isSatisfied: frameworkValid,
      severity: "warning",
    },
    {
      id: "governance_lead",
      category: "roles",
      targetTab: "study-framework",
      label: "Study Lead Assigned",
      description: "Principal investigator or team lead accountable for methodological rigor.",
      isSatisfied: leadAssigned,
      severity: "warning",
    },
    {
      id: "governance_validator",
      category: "roles",
      targetTab: "study-framework",
      label: "Finding Validator Assigned",
      description: "Designated peer reviewer or validator to inspect claims against evidence.",
      isSatisfied: validatorAssigned,
      severity: "warning",
    },
  ];

  const totalCount = checks.length;
  const passedCount = checks.filter((c) => c.isSatisfied).length;
  const criticalMissingCount = checks.filter(
    (c) => !c.isSatisfied && c.severity === "critical"
  ).length;
  const warningMissingCount = checks.filter(
    (c) => !c.isSatisfied && c.severity === "warning"
  ).length;

  let state: ReadinessState;
  let stateLabel: string;
  let summary: string;

  if (criticalMissingCount > 0) {
    state = "incomplete";
    stateLabel = "Blueprint Incomplete";
    summary = `${criticalMissingCount} foundational item${
      criticalMissingCount > 1 ? "s" : ""
    } must be defined before fieldwork can begin.`;
  } else if (warningMissingCount > 0) {
    state = "needs_attention";
    stateLabel = "Needs Attention";
    summary = `Foundational inquiry defined. ${warningMissingCount} governance or method recommendation${
      warningMissingCount > 1 ? "s" : ""
    } unassigned.`;
  } else {
    state = "ready";
    stateLabel = "Ready for Fieldwork";
    summary = "All study charter, scope, method targets, and governance roles are established.";
  }

  return {
    state,
    stateLabel,
    summary,
    checks,
    passedCount,
    totalCount,
    criticalMissingCount,
    warningMissingCount,
  };
}
