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
import { getLinkedFindingIds, isFindingExportEligible } from "@/lib/exportPolicy";
import { isEvidenceEligibleForAnalysis } from "./normalization";
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
    ...(finding.qualifyingEvidenceIds || []),
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
  for (const id of getLinkedFindingIds(recommendation)) {
    if (!await db.get("findings", [studyId, id])) throw new Error(`Finding "${id}" does not exist in this study for Recommendation "${recommendation.id}".`);
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
  "Supporting evidence changed after this Finding was reviewed. Review the highlighted evidence before approving this Finding again.";

export const STALE_CHALLENGING_DEPENDENCY_WARNING_TEXT =
  "Challenging evidence changed after this Finding was reviewed. Review the highlighted evidence before approving this Finding again.";

export const STALE_QUALIFYING_DEPENDENCY_WARNING_TEXT =
  "Qualifying context evidence changed after this Finding was reviewed. Review the highlighted evidence before approving this Finding again.";

/**
 * Cascades an Evidence change or deletion to all downstream Validated Findings in the same study.
 * Covers supporting evidence, challenging/contradictory evidence, and qualifying evidence.
 * Transitions affected Findings to "Needs Review" with an explicit stale-dependency warning.
 */
export async function cascadeEvidenceInvalidationToFindings(
  db: IDBPDatabase<FieldLearningStudioDBSchema>,
  studyId: StudyId,
  evidenceId: EvidenceEntryId,
  warningReason?: string
): Promise<FindingId[]> {
  const allFindings = await db.getAllFromIndex("findings", "by_study", studyId);
  const affectedFindingIds: FindingId[] = [];
  const now = Date.now();

  for (const finding of allFindings) {
    const isSupporting = finding.supportingEvidenceIds?.includes(evidenceId);
    const isContradictory = finding.contradictoryEvidenceIds?.includes(evidenceId);
    const isQualifying = finding.qualifyingEvidenceIds?.includes(evidenceId);

    if (isSupporting || isContradictory || isQualifying) {
      const defaultWarning = isSupporting
        ? STALE_DEPENDENCY_WARNING_TEXT
        : isContradictory
        ? STALE_CHALLENGING_DEPENDENCY_WARNING_TEXT
        : STALE_QUALIFYING_DEPENDENCY_WARNING_TEXT;
      const reason = warningReason || defaultWarning;

      const wasValidated = finding.validationStatus === "Validated";
      const updatedFinding: Finding & { studyId: StudyId } = {
        ...finding, studyId,
        validationStatus: wasValidated ? "Needs Review" : finding.validationStatus,
        previousValidationStatus: wasValidated ? "Validated" : finding.previousValidationStatus,
        revision: wasValidated ? (finding.revision ?? 1) + 1 : finding.revision,
        staleDependencyWarning: reason, updatedAt: now,
      };
      await db.put("findings", updatedFinding);
      await cascadeFindingInvalidationToOutputs(db, studyId, finding.id);
      affectedFindingIds.push(finding.id);

    }
  }

  return affectedFindingIds;
}

/**
 * Verifies that a Finding satisfies all formal approval prerequisites before it can be saved as Validated.
 * Throws a clear practitioner-language error if any invariant fails.
 */
export async function assertFindingEvidenceApprovalIntegrity(db: IDBPDatabase<FieldLearningStudioDBSchema>, studyId: StudyId, finding: Finding): Promise<void> {
  const context = {
    evidence: await db.getAllFromIndex("evidence", "by_study", studyId),
    sources: await db.getAllFromIndex("sources", "by_study", studyId),
  };
  if (!isFindingExportEligible(finding, context)) throw new Error(`Cannot approve Finding "${finding.id}": supporting/challenging/qualifying evidence must be qualified, resolve in this study, and have current lineage. Superseded or stale Findings require review.`);
}

/** Require current parents at approval and new lesson/practice authoring boundaries. */
export async function assertCurrentFindingParents(db: IDBPDatabase<FieldLearningStudioDBSchema>, studyId: StudyId, record: { id: string; linkedFindingIds?: string[]; linkedFindingId?: string }): Promise<void> {
  const ids = getLinkedFindingIds(record);
  if (!ids.length) throw new Error(`"${record.id}" requires at least one current Validated parent Finding.`);
  const context = {
    evidence: await db.getAllFromIndex("evidence", "by_study", studyId),
    sources: await db.getAllFromIndex("sources", "by_study", studyId),
  };
  for (const id of ids) {
    const parent = await db.get("findings", [studyId, id]);
    if (!parent || !isFindingExportEligible(parent, context)) throw new Error(`Linked Finding "${id}" is missing, stale, superseded, or not currently Validated.`);
  }
}

export async function assertRecommendationApprovalIntegrity(db: IDBPDatabase<FieldLearningStudioDBSchema>, studyId: StudyId, recommendation: Recommendation): Promise<void> {
  await assertCurrentFindingParents(db, studyId, recommendation);
}

export async function assertNewFindingEvidenceAdmissibility(db: IDBPDatabase<FieldLearningStudioDBSchema>, studyId: StudyId, finding: Finding, previous?: Finding): Promise<void> {
  for (const role of ["supportingEvidenceIds", "contradictoryEvidenceIds", "qualifyingEvidenceIds"] as const) {
    for (const id of finding[role] || []) {
      if (previous?.[role]?.includes(id)) continue; // Historical links stay inspectable.
      const ev = await db.get("evidence", [studyId, id]);
      if (!ev || !isEvidenceEligibleForAnalysis(ev)) throw new Error(`Cannot add ${role} relationship: evidence "${id}" is not qualified for analytical use.`);
    }
  }
}

/** Keep historical children, but withdraw their current approval when a parent changes. */
export async function cascadeFindingInvalidationToOutputs(db: IDBPDatabase<FieldLearningStudioDBSchema>, studyId: StudyId, findingId: FindingId): Promise<void> {
  for (const name of ["lessons", "goodPractices", "recommendations"] as const) {
    for (const child of await db.getAllFromIndex(name, "by_study", studyId)) {
      if (getLinkedFindingIds(child).includes(findingId) && child.validationStatus === "Validated") {
        await db.put(name, { ...child, studyId, validationStatus: "Needs Review", previousValidationStatus: "Validated", revision: (child.revision ?? 1) + 1, updatedAt: Date.now() } as typeof child);
      }
    }
  }
}
