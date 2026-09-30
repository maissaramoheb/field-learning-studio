import type {
  FieldStudy,
  SourceRecord,
  EvidenceEntry,
  SourceRecordId,
} from "@/lib/types";
import {
  getNextSequenceOfSourceIds,
  getNextSequenceOfEvidenceIds,
} from "@/lib/idGenerator";
import { saveSourceBatch, saveEvidenceBatch } from "@/lib/storage/studyStore";
import type {
  DocxSourceCandidate,
  DocxImportResult,
  DocxCandidateObservation,
} from "./docxTypes";

export class DocxImportError extends Error {
  constructor(message: string) {
    super(`DOCX Import Error: ${message}`);
    this.name = "DocxImportError";
  }
}

/**
 * Validates and executes transactional import of parsed DOCX sources and accepted observations.
 * Follows MEP-02 storage safety invariants:
 * - Atomic execution (either all records save or none)
 * - Guarantees non-colliding sequential IDs
 * - Strictest isolation: all records stamped with the target studyId
 * - No placeholder defaulting of missing dates, methods, or ethics
 */
export async function importDocxSourcesAndObservations(
  study: FieldStudy,
  sourceCandidates: DocxSourceCandidate[]
): Promise<DocxImportResult> {
  if (!study || !study.id) {
    throw new DocxImportError("Invalid study target: Study ID is required.");
  }
  if (!sourceCandidates || sourceCandidates.length === 0) {
    throw new DocxImportError("No Word documents provided for import.");
  }

  const existingSourceIds = (study.sources || []).map((s) => s.id);
  const existingEvidenceIds = (study.evidence || []).map((e) => e.id);

  // 1. Generate sequential unique Source IDs
  const newSourceIds = getNextSequenceOfSourceIds(
    existingSourceIds,
    sourceCandidates.length
  );

  const now = Date.now();
  const sourceRecordsToSave: SourceRecord[] = [];
  const candidateObservationQueue: Array<{
    candidate: DocxCandidateObservation;
    parentSourceId: SourceRecordId;
    siteId: string;
    stakeholderType: string;
    fallbackSensitivity: SourceRecord["sensitivityFlag"];
  }> = [];

  // 2. Build Source records and queue selected observations
  sourceCandidates.forEach((candidate, idx) => {
    const sourceId = newSourceIds[idx];
    const title = candidate.title.trim() || candidate.filename;
    const date =
      candidate.isDateUnknown || !candidate.date.trim()
        ? "Unknown"
        : candidate.date.trim();
    const siteId = candidate.siteId.trim() || "Unspecified Site";
    const stakeholderType =
      candidate.stakeholderType.trim() || "Unspecified Stakeholder";
    const sourceType =
      candidate.isMethodUnspecified || !candidate.collectionMethod.trim()
        ? "Unspecified Method"
        : candidate.collectionMethod.trim();

    const sourceRecord: SourceRecord = {
      id: sourceId,
      studyId: study.id,
      title,
      date,
      location: siteId,
      siteId,
      stakeholderType,
      sourceType,
      collectorName: candidate.collectorName?.trim() || undefined,
      consentStatus: candidate.consentStatus,
      anonymizationStatus: candidate.anonymizationStatus,
      sensitivityFlag: candidate.sensitivityFlag,
      materialCategory: "primary_evidence",
      summary:
        candidate.rawText.slice(0, 200).replace(/\s+/g, " ") +
        (candidate.rawText.length > 200 ? "…" : ""),
      rawText: candidate.rawText,
      notes: candidate.notes.trim() || `Imported from ${candidate.filename}`,
      createdAt: now,
      updatedAt: now,
    };

    sourceRecordsToSave.push(sourceRecord);

    // Queue only accepted or edited candidate observations
    const activeObservations = candidate.candidateObservations.filter(
      (obs) => obs.status === "accepted" || obs.status === "edited"
    );

    for (const obs of activeObservations) {
      candidateObservationQueue.push({
        candidate: obs,
        parentSourceId: sourceId,
        siteId,
        stakeholderType,
        fallbackSensitivity: candidate.sensitivityFlag,
      });
    }
  });

  // 3. Generate sequential unique Evidence IDs
  const newEvidenceIds = getNextSequenceOfEvidenceIds(
    existingEvidenceIds,
    candidateObservationQueue.length
  );

  const evidenceRecordsToSave: EvidenceEntry[] = [];

  candidateObservationQueue.forEach((item, idx) => {
    const evidenceId = newEvidenceIds[idx];
    const obs = item.candidate;

    const evidenceEntry: EvidenceEntry = {
      id: evidenceId,
      studyId: study.id,
      sourceId: item.parentSourceId,
      siteId: item.siteId,
      stakeholderType: item.stakeholderType,
      // Active observation text
      rawEvidence: obs.rawObservation.trim(),
      // Unedited original text segment from DOCX
      rawObservation: obs.originalText.trim(),
      // Optional human interpretation (starts empty unless specified)
      interpretation: obs.interpretation?.trim() || undefined,
      primaryTheme: obs.primaryTheme || "Operational Execution",
      secondaryTheme: obs.secondaryTheme || "General",
      evidenceStrength: obs.evidenceStrength || "Medium",
      sensitivityFlag: obs.sensitivityFlag || item.fallbackSensitivity || "None",
      potentialFinding: obs.locationClue ? `[DOCX: ${obs.locationClue}]` : "",
      qaStatus: "Needs Review",
      validationStatus: "Draft",
      reviewStatus: "pending",
      materialCategory: "primary_evidence",
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };

    evidenceRecordsToSave.push(evidenceEntry);
  });

  // 4. Atomic batch persistence
  // Save sources first, then evidence. If anything fails, error bubbles up.
  try {
    await saveSourceBatch(study.id, sourceRecordsToSave);
    if (evidenceRecordsToSave.length > 0) {
      await saveEvidenceBatch(study.id, evidenceRecordsToSave);
    }
  } catch (err) {
    throw new DocxImportError(
      `Failed to persist imported batch: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return {
    studyId: study.id,
    createdSources: sourceRecordsToSave,
    createdEvidence: evidenceRecordsToSave,
    sourcesCount: sourceRecordsToSave.length,
    evidenceCount: evidenceRecordsToSave.length,
    needsReviewCount: evidenceRecordsToSave.length, // All newly imported observations are in Draft / Needs Review
  };
}
