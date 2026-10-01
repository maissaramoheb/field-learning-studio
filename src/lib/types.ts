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
export type SourceFileId = `SF-${string}`;

export type EvidenceStrength = "High" | "Medium" | "Low";
export type SensitivityFlag = "None" | "Low" | "Medium" | "High";
export type QAStatus = "Reviewed" | "Needs Review" | "Warning";
export type RecommendationPriority = "High" | "Medium" | "Low";
export type QAReviewStatus =
  | "Pass"
  | "Needs Review"
  | "Warning"
  | "Human Review Required"
  | "Not Assessed"
  | "Check Required"
  | "Evidence Missing"
  | "Informational";

export type ValidationStatus = "Draft" | "Needs Review" | "Validated" | "Rejected";

export type EvidenceReviewStatus = "pending" | "usable" | "needs_clarification" | "excluded";

export type MaterialCategory =
  | "primary_evidence"
  | "secondary_evidence"
  | "supervisory_interpretation"
  | "legacy_unclassified";

export type ActorKind = "human" | "system" | "ai";

export interface ActorRef {
  kind: ActorKind;
  id?: string;
  displayName: string;
}

export type ProvenanceKind = "human" | "ai_assisted" | "ai_generated" | "legacy_unknown";

export interface OriginMetadata {
  provenance: ProvenanceKind;
  createdActor: ActorRef;
  createdAt: number;
  updatedActor: ActorRef;
  updatedAt: number;
  modelOrPromptId?: string;
  validatedActor?: ActorRef;
  lastValidatedAt?: number;
}

export type CoordinateSourceType = "docx_extracted" | "xlsx_cell" | "csv_row" | "transcript_offset";

export interface SourceCoordinate {
  sourceType: CoordinateSourceType;
  // DOCX
  blockIndex?: number;
  headingPath?: string[];
  segmentType?: "paragraph" | "bullet" | "table_cell" | "table_row";
  charOffset?: number;
  // XLSX
  sheetName?: string;
  rowIndex?: number;
  columnIndex?: number;
  columnHeader?: string;
  cellAddress?: string;
  // CSV
  csvRowIndex?: number;
  csvColumnIndex?: number;
  csvHeader?: string;
  // General text / transcript
  lineNumber?: number;
  timecodeSeconds?: number;
}

export interface SourceFileMetadata {
  id: SourceFileId;
  studyId: StudyId;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256?: string;
  importedAt: number;
  parsingVersion: number;
  hasContent: boolean;
}

export interface SourceFileContent {
  id: SourceFileId;
  studyId: StudyId;
  blob?: Blob;
  extractedText?: string;
  extractedHtml?: string;
}

export interface TriangulationSuggestion {
  suggestedStatus: "convergent" | "mixed" | "divergent" | "sparse";
  rationale: string;
  modelOrPromptId: string;
  createdAt: number;
}

export interface TriangulationAssessment {
  confirmedStatus: "convergent" | "mixed" | "divergent" | "sparse";
  justification: string;
  assessedBy: ActorRef;
  assessedAt: number;
}

export interface TriangulationMetrics {
  distinctSourceCount: number;
  independentSourceCount: number;
  methodDiversityCount: number;
  methodsFound: string[];
  stakeholderCoverageCount: number;
  stakeholdersFound: string[];
  siteCoverageCount: number;
  sitesFound: string[];
  contradictionCount: number;
  hasContradictions: boolean;
  isSingleSourceDependent: boolean;
  isSparse: boolean;
  hasUnclassifiedMaterialWarning: boolean;
  transparencyFlags: string[];
}

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

export type EvidenceGapType =
  | "MissingStakeholder"
  | "MissingSite"
  | "SingleSourceDependency"
  | "MethodConcentration"
  | "UnresolvedContradiction"
  | "InsufficientCoverage";

export type EvidenceGapSeverity = "Info" | "Needs Attention" | "Critical";

export interface EvidenceGap {
  id: string;
  gapType: EvidenceGapType;
  title: string;
  description: string;
  severity: EvidenceGapSeverity;
  findingId?: FindingId;
  relatedEntityId?: string;
  missingDimension?: string;
  suggestedAction?: string;
}

export interface EvidenceSupportProfile {
  independentSourceCount: number;

  methodDiversity: {
    methodsFound: string[];
    isMultiMethod: boolean;
  };

  stakeholderCoverage: {
    stakeholdersFound: string[];
    isMultiStakeholder: boolean;
    missingTargetStakeholders: string[];
  };

  siteCoverage: {
    sitesFound: string[];
    isCrossSite: boolean;
    missingSites: string[];
  };

  contradictionState: {
    hasContradictions: boolean;
    unresolvedCount: number;
    notes: string[];
  };

  supportTier: SupportTier;

  transparencyFlags: string[];
}

export interface PlannedMethodTarget {
  id?: string;
  method: CollectionMethod | string;
  targetSourceCount?: number;
  /** @deprecated Legacy compatibility fallback. Normalization falls back: targetSourceCount ?? plannedCount */
  plannedCount?: number;
  /** @deprecated Internal/historical field; not a primary planning target */
  targetEvidenceCount?: number;
  description?: string;
  notes?: string;
}


export interface StudyScopeConfig {
  targetSites: string[];
  isSingleSiteStudy: boolean;
  targetStakeholderGroups: string[];
  expectedMethods?: CollectionMethod[];
  plannedMethods?: PlannedMethodTarget[];
  scopeStatement?: string;
  inScope?: string[];
  outOfScope?: string[];
  assumptions?: string[];
  constraints?: string[];
}

export type StudyQuestionId = `RQ-${string}`;
export type PatternNoteId = `PAT-${string}`;

export interface StudyQuestion {
  id: string;
  question: string;
  shortLabel?: string;
  criterion?: string;
  isActive?: boolean;
  order?: number;
  isPrimary?: boolean;
  subQuestions?: string[];
  createdAt?: number;
  updatedAt?: number;
}

export interface FrameworkTheme {
  id: string;
  name: string;
  shortLabel?: string;
  description?: string;
  guidingQuestion?: string;
  order?: number;
  isActive?: boolean;
}

export interface AnalyticalFrameworkConfig {
  name?: string;
  frameworkName?: string;
  description?: string;
  themes: FrameworkTheme[];
}

export type StudyRoleType =
  | "lead"
  | "researcher"
  | "debrief_supervisor"
  | "reviewer"
  | "analyst"
  | "validator"
  | "approver";

export interface StudyRoleAssignment {
  id: string;
  role: StudyRoleType;
  actor: ActorRef;
  notes?: string;
  assignedAt?: number;
}

export type ReasoningType =
  | "pattern"
  | "tension"
  | "contradiction"
  | "possible_explanation"
  | "alternative_interpretation"
  | "evidence_gap"
  | "analyst_note";

export interface PatternNote {
  id: string;
  studyId: StudyId;
  statement: string;
  reasoningType?: ReasoningType;
  explanation?: string;
  evidenceIds: EvidenceEntryId[];
  questionId?: string;
  theme?: string;
  frameworkThemeIds?: string[];
  contradictionNote?: string;
  audit?: OriginMetadata;
  createdAt: number;
  updatedAt: number;
}

export interface StudyOutputConfig {
  includeRecommendations: boolean;
  includeLessons: boolean;
  includeGoodPractices: boolean;
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
  questions?: StudyQuestion[];
  patternNotes?: PatternNote[];
  outputConfig?: StudyOutputConfig;
  createdAt: number;
  updatedAt: number;

  // Phase 2 Study Workspace extensions
  purpose?: string;
  background?: string;
  intendedAudience?: string;
  decisionUse?: string;
  geography?: string;
  timeframe?: string;
  ownerLead?: string;
  framework?: AnalyticalFrameworkConfig;
  teamRoles?: StudyRoleAssignment[];
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
  notes?: string;
  sensitivityFlag: SensitivityFlag;
  sourceFileId?: SourceFileId;
  materialCategory?: MaterialCategory;
  audit?: OriginMetadata;
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
  reviewStatus?: EvidenceReviewStatus;
  materialCategory?: MaterialCategory;
  sourceFileId?: SourceFileId;
  sourceCoordinate?: SourceCoordinate;
  audit?: OriginMetadata;
  contradictionIds?: EvidenceEntryId[];
  studyQuestionIds?: string[];
  frameworkThemeIds?: string[];
  exclusionReason?: string;
  revision?: number;
  rejectionReason?: string;
  lastValidatedAt?: number;
  lastValidatedBy?: string;
  previousValidationStatus?: ValidationStatus;
  staleDependencyWarning?: string;
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
  materialCategory?: MaterialCategory;
  audit?: OriginMetadata;
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
  supersededByFindingId?: FindingId;
  supersededAt?: number;
  supersedesFindingId?: FindingId;
  triangulationSuggestion?: TriangulationSuggestion;
  triangulationAssessment?: TriangulationAssessment;
  audit?: OriginMetadata;
  isStakeholderSpecific?: boolean;
  targetStakeholderGroup?: string;
  studyQuestionId?: string;
  frameworkThemeIds?: string[];
  qualifyingEvidenceIds?: EvidenceEntryId[];
  alternativeInterpretations?: string;
  originPatternNoteId?: string;
  limitationNote?: string;
  revision?: number;
  rejectionReason?: string;
  lastValidatedAt?: number;
  lastValidatedBy?: string;
  previousValidationStatus?: ValidationStatus;
  staleDependencyWarning?: string;
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
  linkedFindingIds?: FindingId[];
  lineageStatus?: "resolved" | "legacy_unresolved";
  audit?: OriginMetadata;
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
  linkedFindingIds?: FindingId[];
  lineageStatus?: "resolved" | "legacy_unresolved";
  audit?: OriginMetadata;
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
  linkedFindingIds?: FindingId[];
  linkedLessonIds?: LessonLearnedId[];
  audit?: OriginMetadata;
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
  isDemoCase?: boolean;
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

  // Phase 2 Study Workspace extensions
  purpose?: string;
  background?: string;
  intendedAudience?: string;
  decisionUse?: string;
  geography?: string;
  timeframe?: string;
  ownerLead?: string;
  questions?: StudyQuestion[];
  patternNotes?: PatternNote[];
  scopeConfig?: Partial<StudyScopeConfig>;
  framework?: AnalyticalFrameworkConfig;
  teamRoles?: StudyRoleAssignment[];
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
