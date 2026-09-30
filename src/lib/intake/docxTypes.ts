import type {
  StudyId,
  SourceRecord,
  EvidenceEntry,
  EvidenceStrength,
  SensitivityFlag,
  ConsentStatus,
  AnonymizationStatus,
  SourceFileId,
} from "@/lib/types";

export type DocxCandidateStatus = "accepted" | "edited" | "skipped";

export interface DocxCandidateObservation {
  tempId: string;
  sourceTempId: string;
  sourceFilename: string;
  locationClue: string;
  headingContext?: string;
  originalText: string;
  rawObservation: string;
  interpretation?: string;
  primaryTheme: string;
  secondaryTheme: string;
  evidenceStrength: EvidenceStrength;
  sensitivityFlag: SensitivityFlag;
  status: DocxCandidateStatus;
  segmentType: "paragraph" | "bullet" | "table_cell" | "table_row";
  segmentIndex: number;
  wordCount: number;
}

export interface DocxSourceCandidate {
  tempId: string;
  filename: string;
  fileSizeBytes: number;
  importedAt: number;
  sourceFileId?: SourceFileId;
  title: string;
  date: string;
  isDateUnknown: boolean;
  siteId: string;
  stakeholderType: string;
  collectionMethod: string;
  isMethodUnspecified: boolean;
  consentStatus: ConsentStatus;
  anonymizationStatus: AnonymizationStatus;
  sensitivityFlag: SensitivityFlag;
  collectorName?: string;
  notes: string;
  rawText: string;
  htmlContent?: string;
  headings: string[];
  candidateObservations: DocxCandidateObservation[];
  warnings: string[];
  errors: string[];
}

export interface DocxIntakeSession {
  files: DocxSourceCandidate[];
  summary: {
    totalFiles: number;
    totalCandidates: number;
    selectedCount: number;
    editedCount: number;
    skippedCount: number;
    warningsCount: number;
    warningMessages: string[];
  };
}

export interface DocxImportResult {
  studyId: StudyId;
  createdSources: SourceRecord[];
  createdEvidence: EvidenceEntry[];
  sourcesCount: number;
  evidenceCount: number;
  needsReviewCount: number;
}
