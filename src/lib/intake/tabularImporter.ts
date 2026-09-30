import type {
  FieldStudy,
  SourceRecord,
  EvidenceEntry,
  SourceFileId,
  MaterialCategory,
  SourceFileMetadata,
  SourceFileContent,
} from "@/lib/types";
import {
  getNextSequenceOfSourceIds,
  getNextSequenceOfEvidenceIds,
} from "@/lib/idGenerator";
import { canonicalizeCollectionMethod } from "@/lib/methodTaxonomy";
import { sourceFileRepository } from "@/lib/storage/sourceFileRepository";
import { saveSourceAndEvidenceBatch } from "@/lib/storage/studyStore";
import type { StandardSourceField, TabularParseResult } from "./csvParser";

export interface TabularCandidateRow {
  rowIndex: number;
  title: string;
  date: string;
  siteId: string;
  stakeholderType: string;
  collectionMethod: string;
  collectorName?: string;
  excerpt: string;
  observerNotes?: string;
  materialCategory: MaterialCategory;
}

export interface TabularImportResult {
  studyId: string;
  sourceFileId?: SourceFileId;
  createdSources: SourceRecord[];
  createdEvidence: EvidenceEntry[];
  sourcesCount: number;
  evidenceCount: number;
}

/**
 * Maps raw tabular rows to candidate field material records based on column mapping and category inference.
 */
export function mapTabularRowsToCandidates(
  parseResult: TabularParseResult,
  columnMapping: Record<number, StandardSourceField>,
  defaultCategory: MaterialCategory = "primary_evidence"
): TabularCandidateRow[] {
  const candidates: TabularCandidateRow[] = [];

  parseResult.rows.forEach((row, rowIndex) => {
    let title = "";
    let date = "";
    let siteId = "";
    let stakeholderType = "";
    let rawMethod = "";
    let collectorName = "";
    let excerpt = "";
    let observerNotes = "";

    row.forEach((cellValue, colIndex) => {
      const field = columnMapping[colIndex];
      const val = cellValue.trim();
      if (!val) return;

      switch (field) {
        case "title":
          title = val;
          break;
        case "date":
          date = val;
          break;
        case "siteId":
          siteId = val;
          break;
        case "stakeholderType":
          stakeholderType = val;
          break;
        case "collectionMethod":
          rawMethod = val;
          break;
        case "collectorName":
          collectorName = val;
          break;
        case "narrative":
          // If excerpt is already set, append or treat as observer notes
          if (!excerpt) {
            excerpt = val;
          } else {
            observerNotes = observerNotes ? `${observerNotes} | ${val}` : val;
          }
          break;
        default:
          break;
      }
    });

    const canonicalMethod = canonicalizeCollectionMethod(rawMethod || "Direct Observation");
    const fallbackTitle = title || excerpt.slice(0, 50) || `Field Log Row ${rowIndex + 1}`;

    // Automatic suggestion of material category
    let inferredCategory: MaterialCategory = defaultCategory;
    const lowerMethod = canonicalMethod.toLowerCase();
    if (lowerMethod.includes("document")) {
      inferredCategory = "secondary_evidence";
    } else if (lowerMethod.includes("debrief") || lowerMethod.includes("reflection")) {
      inferredCategory = "supervisory_interpretation";
    } else if (lowerMethod.includes("interview") || lowerMethod.includes("observation") || lowerMethod.includes("survey") || lowerMethod.includes("meeting")) {
      inferredCategory = "primary_evidence";
    }

    candidates.push({
      rowIndex,
      title: fallbackTitle,
      date: date || new Date().toISOString().slice(0, 10),
      siteId: siteId || "Unspecified Site",
      stakeholderType: stakeholderType || "General Stakeholder",
      collectionMethod: canonicalMethod,
      collectorName: collectorName || undefined,
      excerpt: excerpt || title || "Observation recorded without narrative body.",
      observerNotes: observerNotes || undefined,
      materialCategory: inferredCategory,
    });
  });

  return candidates;
}

/**
 * Commits mapped tabular candidates transactionally into the study repository
 * and preserves original file metadata & content in SourceFileRepository.
 */
export async function importTabularCandidates(
  study: FieldStudy,
  candidates: TabularCandidateRow[],
  fileData?: {
    filename: string;
    blob?: Blob;
    rawText: string;
    mimeType?: string;
  }
): Promise<TabularImportResult> {
  if (!study || !study.id) {
    throw new Error("Invalid study target: Study ID is required.");
  }
  if (!candidates || candidates.length === 0) {
    throw new Error("No candidate field material records provided for import.");
  }

  const existingSourceIds = (study.sources || []).map((s) => s.id);
  const existingEvidenceIds = (study.evidence || []).map((e) => e.id);
  const now = Date.now();

  // 1. Preserve original file if provided
  let sourceFileId: SourceFileId | undefined;
  if (fileData) {
    sourceFileId = `SF-${now}-${Math.random().toString(36).slice(2, 7)}` as SourceFileId;
    const fileBytes = fileData.blob ? fileData.blob.size : new Blob([fileData.rawText]).size;

    const fileMeta: SourceFileMetadata = {
      id: sourceFileId,
      studyId: study.id,
      filename: fileData.filename,
      mimeType: fileData.mimeType || "text/csv",
      fileSizeBytes: fileBytes,
      importedAt: now,
      parsingVersion: 1,
      hasContent: true,
    };

    const fileContent: SourceFileContent = {
      id: sourceFileId,
      studyId: study.id,
      blob: fileData.blob || new Blob([fileData.rawText], { type: fileData.mimeType || "text/csv" }),
      extractedText: fileData.rawText,
    };

    try {
      await sourceFileRepository.saveFile(fileMeta, fileContent);
    } catch {
      // Non-fatal if browser storage quota restricts file blob
    }
  }

  // 2. Generate sequential unique IDs
  const newSourceIds = getNextSequenceOfSourceIds(existingSourceIds, candidates.length);
  const newEvidenceIds = getNextSequenceOfEvidenceIds(existingEvidenceIds, candidates.length);

  const sourcesToSave: SourceRecord[] = [];
  const evidenceToSave: EvidenceEntry[] = [];

  candidates.forEach((cand, idx) => {
    const sourceId = newSourceIds[idx];
    const evidenceId = newEvidenceIds[idx];

    const sourceRecord: SourceRecord = {
      id: sourceId,
      studyId: study.id,
      title: cand.title,
      date: cand.date,
      location: cand.siteId,
      siteId: cand.siteId,
      stakeholderType: cand.stakeholderType,
      sourceType: cand.collectionMethod,
      collectorName: cand.collectorName,
      consentStatus: "Oral",
      anonymizationStatus: "Pseudonymized",
      sensitivityFlag: "None",
      materialCategory: cand.materialCategory,
      summary: cand.excerpt.slice(0, 180) + (cand.excerpt.length > 180 ? "…" : ""),
      rawText: cand.excerpt,
      notes: cand.observerNotes || `Imported tabular field log row ${cand.rowIndex + 1}`,
      sourceFileId,
      createdAt: now,
      updatedAt: now,
    };

    const evidenceEntry: EvidenceEntry = {
      id: evidenceId,
      studyId: study.id,
      sourceId,
      siteId: cand.siteId,
      stakeholderType: cand.stakeholderType,
      rawEvidence: cand.excerpt,
      rawObservation: cand.excerpt,
      interpretation: cand.observerNotes,
      primaryTheme: "Operational Execution",
      secondaryTheme: "General",
      evidenceStrength: cand.materialCategory === "supervisory_interpretation" ? "Low" : "Medium",
      sensitivityFlag: "None",
      potentialFinding: cand.observerNotes || "",
      qaStatus: "Needs Review",
      validationStatus: "Draft",
      reviewStatus: "pending",
      materialCategory: cand.materialCategory,
      sourceFileId,
      sourceCoordinate: {
        sourceType: "csv_row",
        csvRowIndex: cand.rowIndex + 1,
      },
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };

    sourcesToSave.push(sourceRecord);
    evidenceToSave.push(evidenceEntry);
  });

  // 3. Transactional persistence in a single multi-store transaction
  await saveSourceAndEvidenceBatch(study.id, sourcesToSave, evidenceToSave);

  return {
    studyId: study.id,
    sourceFileId,
    createdSources: sourcesToSave,
    createdEvidence: evidenceToSave,
    sourcesCount: sourcesToSave.length,
    evidenceCount: evidenceToSave.length,
  };
}
