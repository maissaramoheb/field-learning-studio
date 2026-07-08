export type SourceRecordId = `SRC-${string}`;
export type EvidenceEntryId = `EV-${string}`;
export type FindingId = `FND-${string}`;
export type LessonLearnedId = `LES-${string}`;
export type GoodPracticeId = `GP-${string}`;
export type RecommendationId = `REC-${string}`;
export type QAReviewItemId = `QA-${string}`;
export type LearningBriefSectionId = `BRF-${string}`;

export type EvidenceStrength = "High" | "Medium" | "Low";
export type SensitivityFlag = "None" | "Low" | "Medium" | "High";
export type QAStatus = "Reviewed" | "Needs Review" | "Warning";
export type RecommendationPriority = "High" | "Medium" | "Low";
export type QAReviewStatus = "Pass" | "Needs Review" | "Warning";

export interface SourceRecord {
  id: SourceRecordId;
  title: string;
  sourceType: string;
  date: string;
  stakeholderType: string;
  location: string;
  summary: string;
  sensitivityFlag: SensitivityFlag;
}

export interface EvidenceEntry {
  id: EvidenceEntryId;
  sourceId: SourceRecordId;
  stakeholderType: string;
  rawEvidence: string;
  primaryTheme: string;
  secondaryTheme: string;
  evidenceStrength: EvidenceStrength;
  sensitivityFlag: SensitivityFlag;
  potentialFinding: string;
  qaStatus: QAStatus;
}

export interface Finding {
  id: FindingId;
  statement: string;
  explanation: string;
  supportingEvidenceIds: EvidenceEntryId[];
  contradictoryEvidence: string;
  evidenceStrength: EvidenceStrength;
  programmeImplication: string;
  linkedRecommendationIds: RecommendationId[];
}

export interface LessonLearned {
  id: LessonLearnedId;
  statement: string;
  whatWorkedOrDidNotWork: string;
  whyItHappened: string;
  conditionsRequired: string;
  evidenceBase: EvidenceEntryId[];
  transferability: string;
}

export interface GoodPractice {
  id: GoodPracticeId;
  title: string;
  description: string;
  whyItWorked: string;
  evidenceBase: EvidenceEntryId[];
  conditionsForReplication: string;
  risksLimits: string;
  recommendedUse: string;
}

export interface Recommendation {
  id: RecommendationId;
  recommendation: string;
  linkedFindingId: FindingId;
  evidenceBase: EvidenceEntryId[];
  responsibleActor: string;
  priority: RecommendationPriority;
  timeframe: string;
  feasibility: string;
  riskSensitivity: string;
  expectedBenefit: string;
  successIndicator: string;
}

export interface QAReviewItem {
  id: QAReviewItemId;
  title: string;
  reviewQuestion: string;
  status: QAReviewStatus;
  notes: string;
}

export interface LearningBriefSection {
  id: LearningBriefSectionId;
  title: string;
  content: string;
}

export interface DemoCase {
  project: string;
  subtitle: string;
  context: string;
  evidenceBase: {
    sourceRecords: number;
    evidenceEntries: number;
    findings: number;
    lessonsLearned: number;
    goodPractices: number;
    recommendations: number;
  };
  executiveSummary: string;
  keyMessages: string[];
  limitations: string[];
  sources: SourceRecord[];
  evidence: EvidenceEntry[];
  findings: Finding[];
  lessons: LessonLearned[];
  goodPractices: GoodPractice[];
  recommendations: Recommendation[];
}
