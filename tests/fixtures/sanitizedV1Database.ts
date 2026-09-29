/**
 * Synthetic v1 Database Fixture for Field Learning Studio (FLS).
 *
 * Models a pre-Phase 0 (DB version 1) database with legacy schema shapes:
 * - Sources lack materialCategory and audit
 * - Evidence entries lack reviewStatus, coordinates, and audit
 * - Findings lack supersededByFindingId, audit
 * - Lessons lack linkedFindingIds, lineageStatus, audit
 * - Good practices lack linkedFindingIds, lineageStatus, audit
 * - Recommendations have single linkedFindingId only, no linkedFindingIds[], no linkedLessonIds[], no audit
 * - Debriefs lack audit
 *
 * Uses sanitized, neutral test personas with NO real or personal data.
 */

import type { StudyMeta } from "@/lib/types";

export const V1_MIGRATION_STUDY_ID = "v1-legacy-study-001";

export const syntheticV1StudyMeta: StudyMeta = {
  id: V1_MIGRATION_STUDY_ID,
  title: "Sanitized Legacy Field Study",
  subtitle: "Baseline assessment prior to v2 schema upgrade",
  context: "A synthetic study testing legacy database schema backfill and lineage resolution.",
  status: "Active Fieldwork",
  isDemoCase: false,
  scope: {
    targetSites: ["District West", "District East"],
    isSingleSiteStudy: false,
    targetStakeholderGroups: ["Community Members", "Local Coordinators"],
    expectedMethods: ["Key Informant Interview", "Focus Group Discussion"],
  },
  executiveSummary: "Synthetic executive summary representing legacy data baseline.",
  keyMessages: ["Key message 1", "Key message 2"],
  limitations: ["Fictional test dataset"],
  questions: [],
  patternNotes: [],
  outputConfig: {
    includeRecommendations: true,
    includeLessons: true,
    includeGoodPractices: true,
  },
  createdAt: 1715000000000,
  updatedAt: 1715000000000,
};

export const syntheticV1Sources = [
  {
    id: "SRC-V1-001",
    studyId: V1_MIGRATION_STUDY_ID,
    title: "Community Key Informant Interview",
    sourceType: "Key Informant Interview",
    date: "2026-01-10",
    stakeholderType: "Community Members",
    location: "District West",
    summary: "Interview discussing primary field access and water points.",
    sensitivityFlag: "Low" as const,
    consentStatus: "Written" as const,
    anonymizationStatus: "Anonymized" as const,
    createdAt: 1715000000000,
    updatedAt: 1715000000000,
  },
  {
    id: "SRC-V1-002",
    studyId: V1_MIGRATION_STUDY_ID,
    title: "Regional Evaluation Report",
    sourceType: "Evaluation Report",
    date: "2026-01-15",
    stakeholderType: "Local Coordinators",
    location: "District East",
    summary: "Secondary desk review summarizing prior project phases.",
    sensitivityFlag: "None" as const,
    consentStatus: "Exempt" as const,
    anonymizationStatus: "Anonymized" as const,
    createdAt: 1715000000000,
    updatedAt: 1715000000000,
  },
  {
    id: "SRC-V1-003",
    studyId: V1_MIGRATION_STUDY_ID,
    title: "Supervisory Mission Debrief",
    sourceType: "Team Reflection and Debrief",
    date: "2026-01-20",
    stakeholderType: "Supervisory Team",
    location: "Central Office",
    summary: "Supervisory review notes evaluating field team performance and coordination.",
    sensitivityFlag: "Medium" as const,
    consentStatus: "Written" as const,
    anonymizationStatus: "Anonymized" as const,
    createdAt: 1715000000000,
    updatedAt: 1715000000000,
  },
  {
    id: "SRC-V1-004",
    studyId: V1_MIGRATION_STUDY_ID,
    title: "Unclassified Field Artifact",
    sourceType: "Custom Unknown Source Format",
    date: "2026-01-22",
    stakeholderType: "Community Members",
    location: "District West",
    summary: "Legacy artifact with unclassified source type testing fallback classification.",
    sensitivityFlag: "Low" as const,
    consentStatus: "Verbal" as const,
    anonymizationStatus: "Anonymized" as const,
    createdAt: 1715000000000,
    updatedAt: 1715000000000,
  },
];

export const syntheticV1Evidence = [
  {
    id: "EV-V1-001",
    studyId: V1_MIGRATION_STUDY_ID,
    sourceId: "SRC-V1-001",
    stakeholderType: "Community Members",
    rawEvidence: "Water point maintenance requires community-led management routines.",
    primaryTheme: "Infrastructure",
    evidenceStrength: "High" as const,
    sensitivityFlag: "Low" as const,
    qaStatus: "Reviewed" as const,
    validationStatus: "Validated" as const,
    revision: 1,
    createdAt: 1715000000000,
    updatedAt: 1715000000000,
  },
  {
    id: "EV-V1-002",
    studyId: V1_MIGRATION_STUDY_ID,
    sourceId: "SRC-V1-002",
    stakeholderType: "Local Coordinators",
    rawEvidence: "Municipal oversight of supply points improved reliability by 40%.",
    primaryTheme: "Coordination",
    evidenceStrength: "High" as const,
    sensitivityFlag: "None" as const,
    qaStatus: "Reviewed" as const,
    validationStatus: "Validated" as const,
    revision: 1,
    createdAt: 1715000000000,
    updatedAt: 1715000000000,
  },
  {
    id: "EV-V1-003",
    studyId: V1_MIGRATION_STUDY_ID,
    sourceId: "SRC-V1-003",
    stakeholderType: "Supervisory Team",
    rawEvidence: "Supervisory observation: internal debrief highlights need for faster response.",
    primaryTheme: "Operations",
    evidenceStrength: "Medium" as const,
    sensitivityFlag: "Medium" as const,
    qaStatus: "Reviewed" as const,
    validationStatus: "Validated" as const,
    revision: 1,
    createdAt: 1715000000000,
    updatedAt: 1715000000000,
  },
  {
    id: "EV-V1-004",
    studyId: V1_MIGRATION_STUDY_ID,
    sourceId: "SRC-V1-004",
    stakeholderType: "Community Members",
    rawEvidence: "Unverified rumor regarding maintenance fee allocation.",
    primaryTheme: "Accountability",
    evidenceStrength: "Low" as const,
    sensitivityFlag: "High" as const,
    qaStatus: "Warning" as const,
    validationStatus: "Needs Review" as const,
    revision: 1,
    createdAt: 1715000000000,
    updatedAt: 1715000000000,
  },
];

export const syntheticV1Debriefs = [
  {
    id: "DB-V1-001",
    studyId: V1_MIGRATION_STUDY_ID,
    date: "2026-01-11",
    team: "Team Alpha",
    location: "District West",
    summary: "Day 1 debrief on initial access and security.",
    operationalBottlenecks: "Fuel shortage in morning delayed arrival.",
    methodologicalReflections: "Interviews needed more translation support.",
    emergingFindings: "Community willingness to engage is high.",
    evidenceIds: ["EV-V1-001"],
    createdAt: 1715000000000,
    updatedAt: 1715000000000,
  },
];

export const syntheticV1Findings = [
  {
    id: "FND-V1-001",
    studyId: V1_MIGRATION_STUDY_ID,
    statement: "Community-led management improves water point durability.",
    explanation: "Both field interviews and evaluation reports confirm community ownership correlates with longer operational periods.",
    supportingEvidenceIds: ["EV-V1-001", "EV-V1-002"],
    evidenceStrength: "High" as const,
    programmeImplication: "Invest in local committee training.",
    linkedRecommendationIds: ["REC-V1-001"],
    validationStatus: "Validated" as const,
    revision: 1,
    createdAt: 1715000000000,
    updatedAt: 1715000000000,
  },
  {
    id: "FND-V1-002",
    studyId: V1_MIGRATION_STUDY_ID,
    statement: "Rapid feedback mechanisms are necessary to resolve rumors.",
    explanation: "Unverified rumors create participation hesitations.",
    supportingEvidenceIds: ["EV-V1-004"],
    evidenceStrength: "Low" as const,
    programmeImplication: "Establish immediate rumor verification protocols.",
    linkedRecommendationIds: ["REC-V1-002"],
    validationStatus: "Draft" as const,
    revision: 1,
    createdAt: 1715000000000,
    updatedAt: 1715000000000,
  },
];

export const syntheticV1Lessons = [
  {
    id: "LES-V1-001",
    studyId: V1_MIGRATION_STUDY_ID,
    statement: "Local ownership requires clear maintenance guidelines.",
    whatWorkedOrDidNotWork: "Committees with written agreements functioned better.",
    whyItHappened: "Clarity of roles reduced disputes.",
    conditionsRequired: "Written governance framework.",
    evidenceBase: ["EV-V1-001"],
    transferability: "Transferable to other rural infrastructure programs.",
    validationStatus: "Validated" as const,
    revision: 1,
    createdAt: 1715000000000,
    updatedAt: 1715000000000,
  },
];

export const syntheticV1GoodPractices = [
  {
    id: "GP-V1-001",
    studyId: V1_MIGRATION_STUDY_ID,
    title: "Community Water Committee Rostering",
    description: "Establish rotational caretaker rosters with public scheduling.",
    whyItWorked: "Distributed labor prevented burnout.",
    evidenceBase: ["EV-V1-001"],
    conditionsForReplication: "Willing volunteer base.",
    risksLimits: "May exclude vulnerable individuals if labor expectations are rigid.",
    recommendedUse: "Default practice for community water points.",
    validationStatus: "Validated" as const,
    revision: 1,
    createdAt: 1715000000000,
    updatedAt: 1715000000000,
  },
];

export const syntheticV1Recommendations = [
  {
    id: "REC-V1-001",
    studyId: V1_MIGRATION_STUDY_ID,
    recommendation: "Establish written caretaker rosters and provide basic repair toolkits.",
    linkedFindingId: "FND-V1-001",
    evidenceBase: ["EV-V1-001", "EV-V1-002"],
    responsibleActor: "Field Operations Manager",
    priority: "High" as const,
    timeframe: "Next quarter",
    feasibility: "High",
    riskSensitivity: "Low",
    expectedBenefit: "Extended water point lifespan and reduced downtime.",
    successIndicator: "90% of water points operational at 6-month check.",
    validationStatus: "Validated" as const,
    revision: 1,
    createdAt: 1715000000000,
    updatedAt: 1715000000000,
  },
];
