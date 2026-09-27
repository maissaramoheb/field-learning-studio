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
  "Supporting evidence changed after this Finding was reviewed. Review the highlighted evidence before approving this Finding again.";

export const STALE_CHALLENGING_DEPENDENCY_WARNING_TEXT =
  "Challenging evidence changed after this Finding was reviewed. Review the highlighted evidence before approving this Finding again.";

/**
 * Cascades an Evidence change or deletion to all downstream Validated Findings in the same study.
 * Covers both supporting evidence and challenging/contradictory evidence.
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

    if (isSupporting || isContradictory) {
      const defaultWarning = isSupporting
        ? STALE_DEPENDENCY_WARNING_TEXT
        : STALE_CHALLENGING_DEPENDENCY_WARNING_TEXT;
      const reason = warningReason || defaultWarning;

      // Invalidate if Validated, or ensure stale warning is attached
      if (finding.validationStatus === "Validated" || !finding.staleDependencyWarning) {
        const updatedFinding: Finding & { studyId: StudyId } = {
          ...finding,
          studyId,
          validationStatus: "Needs Review",
          previousValidationStatus: finding.validationStatus === "Validated" ? "Validated" : (finding.previousValidationStatus || "Validated"),
          revision: finding.validationStatus === "Validated" ? (finding.revision ?? 1) + 1 : (finding.revision ?? 1),
          staleDependencyWarning: reason,
          updatedAt: now,
        };

        await db.put("findings", updatedFinding);
        affectedFindingIds.push(finding.id);
      }
    }
  }

  return affectedFindingIds;
}

/**
 * Verifies that a Finding satisfies all formal approval prerequisites before it can be saved as Validated.
 * Throws a clear practitioner-language error if any invariant fails.
 */
export async function assertFindingEvidenceApprovalIntegrity(
  db: IDBPDatabase<FieldLearningStudioDBSchema>,
  studyId: StudyId,
  finding: Finding
): Promise<void> {
  // Stale warning guard
  if (finding.staleDependencyWarning && finding.staleDependencyWarning.trim().length > 0) {
    throw new Error(
      `Cannot approve Finding: ${finding.staleDependencyWarning}`
    );
  }

  // Supporting evidence existence guard
  if (!finding.supportingEvidenceIds || finding.supportingEvidenceIds.length === 0) {
    throw new Error(
      `Cannot approve Finding "${finding.id}": A formal Finding must have at least one supporting Evidence link.`
    );
  }

  // Verify supporting evidence
  for (const evId of finding.supportingEvidenceIds) {
    const ev = await db.get("evidence", [studyId, evId]);
    if (!ev) {
      throw new Error(
        `Cannot approve Finding "${finding.id}": Supporting evidence "${evId}" does not exist in Study "${studyId}".`
      );
    }
    if (ev.validationStatus !== "Validated") {
      throw new Error(
        `Cannot approve Finding "${finding.id}": Supporting evidence "${evId}" is not yet validated (current status: "${ev.validationStatus}"). All supporting evidence must be Validated before a Finding can be approved.`
      );
    }
    if (ev.staleDependencyWarning && ev.staleDependencyWarning.trim().length > 0) {
      throw new Error(
        `Cannot approve Finding "${finding.id}": Supporting evidence "${evId}" has an active stale dependency warning. Review the evidence first.`
      );
    }
    // Verify parent source
    if (!ev.sourceId) {
      throw new Error(
        `Cannot approve Finding "${finding.id}": Supporting evidence "${evId}" has no parent Source.`
      );
    }
    const source = await db.get("sources", [studyId, ev.sourceId]);
    if (!source) {
      throw new Error(
        `Cannot approve Finding "${finding.id}": Parent Source "${ev.sourceId}" for supporting evidence "${evId}" does not exist in Study "${studyId}".`
      );
    }
  }

  // Verify contradictory/challenging evidence
  if (finding.contradictoryEvidenceIds && finding.contradictoryEvidenceIds.length > 0) {
    for (const evId of finding.contradictoryEvidenceIds) {
      const ev = await db.get("evidence", [studyId, evId]);
      if (!ev) {
        throw new Error(
          `Cannot approve Finding "${finding.id}": Challenging evidence "${evId}" does not exist in Study "${studyId}".`
        );
      }
      if (ev.validationStatus === "Rejected") {
        throw new Error(
          `Cannot approve Finding "${finding.id}": Challenging evidence "${evId}" has been marked as Rejected. Reconsider the challenging evidence before approving this Finding.`
        );
      }
      if (ev.staleDependencyWarning && ev.staleDependencyWarning.trim().length > 0) {
        throw new Error(
          `Cannot approve Finding "${finding.id}": Challenging evidence "${evId}" has an active stale dependency warning. Review the evidence first.`
        );
      }
    }
  }
}

/**
 * Verifies that a Recommendation satisfies all formal approval prerequisites before it can be saved as Validated.
 */
export async function assertRecommendationApprovalIntegrity(
  db: IDBPDatabase<FieldLearningStudioDBSchema>,
  studyId: StudyId,
  recommendation: Recommendation
): Promise<void> {
  if (!recommendation.linkedFindingId || !recommendation.linkedFindingId.trim()) {
    throw new Error(
      `Cannot approve Recommendation "${recommendation.id}": A formal Recommendation must be linked to a parent Finding.`
    );
  }

  const finding = await db.get("findings", [studyId, recommendation.linkedFindingId]);
  if (!finding) {
    throw new Error(
      `Cannot approve Recommendation "${recommendation.id}": Linked Finding "${recommendation.linkedFindingId}" does not exist in Study "${studyId}".`
    );
  }

  if (finding.validationStatus !== "Validated") {
    throw new Error(
      `Cannot approve Recommendation "${recommendation.id}": Linked Finding "${finding.id}" is not validated (current status: "${finding.validationStatus}"). Parent Finding must be Validated first.`
    );
  }

  if (finding.staleDependencyWarning && finding.staleDependencyWarning.trim().length > 0) {
    throw new Error(
      `Cannot approve Recommendation "${recommendation.id}": Linked Finding "${finding.id}" has an active stale dependency warning. Review the parent Finding before approving this Recommendation.`
    );
  }

  // Ensure parent finding's supporting evidence is still intact and validated
  await assertFindingEvidenceApprovalIntegrity(db, studyId, finding);
}
