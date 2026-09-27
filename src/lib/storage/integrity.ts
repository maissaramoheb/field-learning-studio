import type { IDBPDatabase } from "idb";
import type {
  StudyId,
  EvidenceEntry,
  EvidenceEntryId,
  Finding,
  FindingId,
  Recommendation,
  LessonLearned,
  GoodPractice,
} from "@/lib/types";
import type { FieldLearningStudioDBSchema } from "@/lib/storage/indexedDb";

/**
 * Validates that an Evidence entry references a Source belonging to the same Study.
 * Rejects missing sources or cross-study source references.
 */
export async function assertEvidenceSourceIntegrity(
  db: IDBPDatabase<FieldLearningStudioDBSchema>,
  studyId: StudyId,
  evidence: EvidenceEntry
): Promise<void> {
  if (!evidence.sourceId || !evidence.sourceId.trim()) {
    throw new Error(
      `Evidence integrity violation: Evidence "${evidence.id}" is missing a required sourceId.`
    );
  }

  const source = await db.get("sources", [studyId, evidence.sourceId]);
  if (!source) {
    throw new Error(
      `Cross-study / missing relationship rejected: Source "${evidence.sourceId}" does not exist in Study "${studyId}". Evidence "${evidence.id}" cannot reference a missing or foreign source.`
    );
  }
}

/**
 * Validates that all evidence referenced by a Finding exists in the same Study.
 */
export async function assertFindingEvidenceIntegrity(
  db: IDBPDatabase<FieldLearningStudioDBSchema>,
  studyId: StudyId,
  finding: Finding
): Promise<void> {
  const evIdsToCheck = [
    ...(finding.supportingEvidenceIds || []),
    ...(finding.contradictoryEvidenceIds || []),
  ];

  for (const evId of evIdsToCheck) {
    const ev = await db.get("evidence", [studyId, evId]);
    if (!ev) {
      throw new Error(
        `Cross-study / missing relationship rejected: Evidence "${evId}" does not exist in Study "${studyId}". Finding "${finding.id}" cannot link to missing or foreign evidence.`
      );
    }
  }
}

/**
 * Validates that the Finding referenced by a Recommendation exists in the same Study.
 */
export async function assertRecommendationFindingIntegrity(
  db: IDBPDatabase<FieldLearningStudioDBSchema>,
  studyId: StudyId,
  recommendation: Recommendation
): Promise<void> {
  if (recommendation.linkedFindingId) {
    const finding = await db.get("findings", [studyId, recommendation.linkedFindingId]);
    if (!finding) {
      throw new Error(
        `Cross-study / missing relationship rejected: Linked Finding "${recommendation.linkedFindingId}" does not exist in Study "${studyId}". Recommendation "${recommendation.id}" cannot link to a missing or foreign finding.`
      );
    }
  }
}

/**
 * Validates that all evidence referenced by a Lesson exists in the same Study.
 */
export async function assertLessonEvidenceIntegrity(
  db: IDBPDatabase<FieldLearningStudioDBSchema>,
  studyId: StudyId,
  lesson: LessonLearned
): Promise<void> {
  for (const evId of lesson.evidenceBase || []) {
    const ev = await db.get("evidence", [studyId, evId]);
    if (!ev) {
      throw new Error(
        `Cross-study / missing relationship rejected: Evidence "${evId}" does not exist in Study "${studyId}". Lesson "${lesson.id}" cannot link to missing or foreign evidence.`
      );
    }
  }
}

/**
 * Validates that all evidence referenced by a Good Practice exists in the same Study.
 */
export async function assertGoodPracticeEvidenceIntegrity(
  db: IDBPDatabase<FieldLearningStudioDBSchema>,
  studyId: StudyId,
  practice: GoodPractice
): Promise<void> {
  for (const evId of practice.evidenceBase || []) {
    const ev = await db.get("evidence", [studyId, evId]);
    if (!ev) {
      throw new Error(
        `Cross-study / missing relationship rejected: Evidence "${evId}" does not exist in Study "${studyId}". Good Practice "${practice.id}" cannot link to missing or foreign evidence.`
      );
    }
  }
}

/**
 * Plain practitioner language warning for stale dependency invalidation.
 */
export const STALE_DEPENDENCY_WARNING_TEXT =
  "Supporting evidence changed after this Finding was reviewed. Review the Finding again before including it in a formal deliverable.";

/**
 * Cascades an Evidence change or deletion to all downstream Validated Findings in the same study.
 * Transitions affected Findings to "Needs Review" with an explicit stale-dependency warning.
 */
export async function cascadeEvidenceInvalidationToFindings(
  db: IDBPDatabase<FieldLearningStudioDBSchema>,
  studyId: StudyId,
  evidenceId: EvidenceEntryId,
  warningReason: string = STALE_DEPENDENCY_WARNING_TEXT
): Promise<FindingId[]> {
  const allFindings = await db.getAllFromIndex("findings", "by_study", studyId);
  const affectedFindingIds: FindingId[] = [];
  const now = Date.now();

  for (const finding of allFindings) {
    if (
      finding.validationStatus === "Validated" &&
      finding.supportingEvidenceIds &&
      finding.supportingEvidenceIds.includes(evidenceId)
    ) {
      const updatedFinding: Finding & { studyId: StudyId } = {
        ...finding,
        studyId,
        validationStatus: "Needs Review",
        previousValidationStatus: "Validated",
        revision: (finding.revision ?? 1) + 1,
        staleDependencyWarning: warningReason,
        updatedAt: now,
      };

      await db.put("findings", updatedFinding);
      affectedFindingIds.push(finding.id);
    }
  }

  return affectedFindingIds;
}
