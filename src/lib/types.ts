export type StudyId = string;
export type SourceRecordId = `SRC-${string}`;
export type EvidenceEntryId = `EV-${string}`;
export type FindingId = `FND-${string}`;
export type LessonLearnedId = `LES-${string}`;
export type GoodPracticeId = `GP-${string}`;
export type RecommendationId = `REC-${string}`;
export type DailyDebriefId = `DBR-${string}`;
export type QAReviewItemId = `QA-${string}`;
export type LearningBriefSectionId = `BRF-${string}`;

export type EvidenceStrength = "High" | "Medium" | "Low";
export type SensitivityFlag = "None" | "Low" | "Medium" | "High";
export type QAStatus = "Reviewed" | "Needs Review" | "Warning";
export type RecommendationPriority = "High" | "Medium" | "Low";
export type QAReviewStatus = "Pass" | "Needs Review" | "Warning";

export type ValidationStatus = "Draft" | "Needs Review" | "Validated" | "Rejected";

export type ConsentStatus = 
  | "Written"
  | "Oral"
  | "Not Required / Public Source"
  | "Restricted / Unclear";

export type AnonymizationStatus = 
  | "Anonymized"
  | "Pseudonymized"
  | "Identifiable / Restricted";

export type CollectionMethod = 
  | "Key Informant Interview"
  | "Focus Group Discussion"
  | "Direct Observation"
  | "Document Review"
  | "Community Meeting"
  | "Survey / Questionnaire";

export type SupportTier = "Strongly Supported" | "Partially Supported" | "Emerging";

export interface StudyScopeConfig {
  targetSites: string[];
  isSingleSiteStudy: boolean;
  targetStakeholderGroups: string[];
  expectedMethods?: CollectionMethod[];
}

export interface StudyMeta {
  id: StudyId;
  title: string;
  subtitle: string;
  context: string;
  status: "Active Fieldwork" | "Synthesis" | "Completed" | "Demo Case";
  isDemoCase: boolean;
  scope: StudyScopeConfig;
  executiveSummary: string;
  keyMessages: string[];
  limitations: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SourceRecord {
  id: SourceRecordId;
  studyId?: StudyId;
  title: string;
  sourceType: CollectionMethod | string;
  date: string;
  stakeholderType: string;
  location: string;
  siteId?: string;
  collectorName?: string;
  consentStatus?: ConsentStatus;
  anonymizationStatus?: AnonymizationStatus;
  summary: string;
  rawText?: string;
  sensitivityFlag: SensitivityFlag;
  createdAt?: number;
  updatedAt?: number;
}

export interface EvidenceEntry {
  id: EvidenceEntryId;
  studyId?: StudyId;
  sourceId: SourceRecordId;
  siteId?: string;
  stakeholderType: string;
  rawEvidence: string;
  rawObservation?: string;
  interpretation?: string;
  primaryTheme: string;
  secondaryTheme: string;
  evidenceStrength: EvidenceStrength;
  sensitivityFlag: SensitivityFlag;
  potentialFinding: string;
  qaStatus: QAStatus;
  validationStatus?: ValidationStatus;
  contradictionIds?: EvidenceEntryId[];
  revision?: number;
  rejectionReason?: string;
  lastValidatedAt?: number;
  lastValidatedBy?: string;
  previousValidationStatus?: ValidationStatus;
  createdAt?: number;
  updatedAt?: number;
}

export interface DailyDebrief {
  id: DailyDebriefId;
  studyId: StudyId;
  date: string;
  siteIds: string[];
  attendees: string[];
  whatSurprisedUs: string;
  whatRepeated: string;
  contradictionsObserved: string;
  shakenAssumptions: string;
  potentialBiases: string;
  missingPerspectives: string;
  emergingHypotheses: string;
  tomorrowPriorities: string[];
  linkedSourceIds: SourceRecordId[];
  linkedEvidenceIds: EvidenceEntryId[];
  createdAt: number;
  updatedAt: number;
}

export interface Finding {
  id: FindingId;
  studyId?: StudyId;
  statement: string;
  explanation: string;
  supportingEvidenceIds: EvidenceEntryId[];
  contradictoryEvidence: string;
  contradictoryEvidenceSummary?: string;
  contradictoryEvidenceIds?: EvidenceEntryId[];
  evidenceStrength: EvidenceStrength;
  programmeImplication: string;
  linkedRecommendationIds: RecommendationId[];
  validationStatus?: ValidationStatus;
  isStakeholderSpecific?: boolean;
  targetStakeholderGroup?: string;
  revision?: number;
  rejectionReason?: string;
  lastValidatedAt?: number;
  lastValidatedBy?: string;
  previousValidationStatus?: ValidationStatus;
  createdAt?: number;
  updatedAt?: number;
}

export interface LessonLearned {
  id: LessonLearnedId;
  studyId?: StudyId;
  statement: string;
  whatWorkedOrDidNotWork: string;
  whyItHappened: string;
  conditionsRequired: string;
  evidenceBase: EvidenceEntryId[];
  transferability: string;
  validationStatus?: ValidationStatus;
  revision?: number;
  rejectionReason?: string;
  lastValidatedAt?: number;
  lastValidatedBy?: string;
  previousValidationStatus?: ValidationStatus;
  createdAt?: number;
  updatedAt?: number;
}

export interface GoodPractice {
  id: GoodPracticeId;
  studyId?: StudyId;
  title: string;
  description: string;
  whyItWorked: string;
  evidenceBase: EvidenceEntryId[];
  conditionsForReplication: string;
  risksLimits: string;
  recommendedUse: string;
  validationStatus?: ValidationStatus;
  revision?: number;
  rejectionReason?: string;
  lastValidatedAt?: number;
  lastValidatedBy?: string;
  previousValidationStatus?: ValidationStatus;
  createdAt?: number;
  updatedAt?: number;
}

export interface Recommendation {
  id: RecommendationId;
  studyId?: StudyId;
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
  validationStatus?: ValidationStatus;
  revision?: number;
  rejectionReason?: string;
  lastValidatedAt?: number;
  lastValidatedBy?: string;
  previousValidationStatus?: ValidationStatus;
  createdAt?: number;
  updatedAt?: number;
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
  id: string;
  project: string;
  subtitle: string;
  status: string;
  safetyNote?: string;
  phaseStatus?: string;
  futurePhase?: string;
  context: string;
  purposeAndScope?: string;
  keyThemes?: string[];
  safeguardingNotes?: string;
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

export interface FieldStudy extends StudyMeta {
  sources: SourceRecord[];
  evidence: EvidenceEntry[];
  debriefs: DailyDebrief[];
  findings: Finding[];
  lessons: LessonLearned[];
  goodPractices: GoodPractice[];
  recommendations: Recommendation[];
}
