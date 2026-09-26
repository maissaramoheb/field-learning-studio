import type { EvidenceEntry, ValidationStatus } from "@/lib/types";

/**
 * Normalizes text for substantive change comparison by trimming and collapsing
 * consecutive whitespace characters into a single space.
 */
function normalizeComparableText(text?: string): string {
  if (!text) return "";
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Checks if a proposed update to an EvidenceEntry represents a substantive change
 * rather than trivial whitespace or identical metadata.
 *
 * Substantive fields:
 * - rawEvidence / rawObservation
 * - interpretation / potentialFinding
 * - primaryTheme
 * - secondaryTheme
 * - evidenceStrength
 * - sensitivityFlag
 * - stakeholderType
 * - siteId
 */
export function isSubstantiveEvidenceChange(
  original: EvidenceEntry,
  proposed: Partial<EvidenceEntry>
): boolean {
  // Check observation text
  if (proposed.rawEvidence !== undefined) {
    if (
      normalizeComparableText(proposed.rawEvidence) !==
      normalizeComparableText(original.rawEvidence)
    ) {
      return true;
    }
  }
  if (proposed.rawObservation !== undefined) {
    if (
      normalizeComparableText(proposed.rawObservation) !==
      normalizeComparableText(original.rawObservation || original.rawEvidence)
    ) {
      return true;
    }
  }

  // Check interpretation text
  if (proposed.potentialFinding !== undefined) {
    if (
      normalizeComparableText(proposed.potentialFinding) !==
      normalizeComparableText(original.potentialFinding)
    ) {
      return true;
    }
  }
  if (proposed.interpretation !== undefined) {
    if (
      normalizeComparableText(proposed.interpretation) !==
      normalizeComparableText(original.interpretation || original.potentialFinding)
    ) {
      return true;
    }
  }

  // Check themes
  if (
    proposed.primaryTheme !== undefined &&
    normalizeComparableText(proposed.primaryTheme) !==
      normalizeComparableText(original.primaryTheme)
  ) {
    return true;
  }
  if (
    proposed.secondaryTheme !== undefined &&
    normalizeComparableText(proposed.secondaryTheme) !==
      normalizeComparableText(original.secondaryTheme)
  ) {
    return true;
  }

  // Check analytical classification
  if (
    proposed.evidenceStrength !== undefined &&
    proposed.evidenceStrength !== original.evidenceStrength
  ) {
    return true;
  }
  if (
    proposed.sensitivityFlag !== undefined &&
    proposed.sensitivityFlag !== original.sensitivityFlag
  ) {
    return true;
  }

  // Check provenance context if provided
  if (
    proposed.stakeholderType !== undefined &&
    normalizeComparableText(proposed.stakeholderType) !==
      normalizeComparableText(original.stakeholderType)
  ) {
    return true;
  }
  if (
    proposed.siteId !== undefined &&
    normalizeComparableText(proposed.siteId) !==
      normalizeComparableText(original.siteId)
  ) {
    return true;
  }

  return false;
}

/**
 * Transitions an artifact from Draft to Needs Review.
 * Throws if the artifact is not in Draft state.
 */
export function submitForReview<
  T extends {
    validationStatus?: ValidationStatus;
    updatedAt?: number;
  }
>(artifact: T): T {
  const currentStatus = artifact.validationStatus ?? "Draft";
  if (currentStatus !== "Draft") {
    throw new Error(
      `Cannot submit for review: current status is "${currentStatus}", expected "Draft".`
    );
  }

  return {
    ...artifact,
    validationStatus: "Needs Review",
    updatedAt: Date.now(),
  };
}

/**
 * Transitions an artifact from Needs Review to Validated.
 * Requires a non-empty reviewer identity.
 * Throws if the artifact is not in Needs Review state.
 */
export function validateArtifact<
  T extends {
    validationStatus?: ValidationStatus;
    lastValidatedBy?: string;
    lastValidatedAt?: number;
    rejectionReason?: string;
    updatedAt?: number;
  }
>(artifact: T, reviewerName: string): T {
  const trimmedReviewer = reviewerName?.trim();
  if (!trimmedReviewer) {
    throw new Error("Validation requires a non-empty reviewer name.");
  }

  const currentStatus = artifact.validationStatus ?? "Draft";
  if (currentStatus === "Draft") {
    throw new Error("Draft evidence must be submitted for review before validation.");
  }
  if (currentStatus !== "Needs Review") {
    throw new Error(
      `Cannot validate: current status is "${currentStatus}", expected "Needs Review".`
    );
  }

  const now = Date.now();
  return {
    ...artifact,
    validationStatus: "Validated",
    lastValidatedBy: trimmedReviewer,
    lastValidatedAt: now,
    rejectionReason: undefined,
    updatedAt: now,
  };
}

/**
 * Transitions an artifact from Needs Review to Rejected.
 * Requires a non-empty rejection reason.
 * Throws if the artifact is not in Needs Review state.
 */
export function rejectArtifact<
  T extends {
    validationStatus?: ValidationStatus;
    rejectionReason?: string;
    updatedAt?: number;
  }
>(artifact: T, reason: string): T {
  const trimmedReason = reason?.trim();
  if (!trimmedReason) {
    throw new Error("Rejection requires a non-empty reason.");
  }

  const currentStatus = artifact.validationStatus ?? "Draft";
  if (currentStatus === "Draft") {
    throw new Error("Draft evidence must be submitted for review before rejection.");
  }
  if (currentStatus === "Validated") {
    throw new Error("Validated evidence cannot be directly rejected. Re-validation lifecycle required.");
  }
  if (currentStatus !== "Needs Review") {
    throw new Error(
      `Cannot reject: current status is "${currentStatus}", expected "Needs Review".`
    );
  }

  const now = Date.now();
  return {
    ...artifact,
    validationStatus: "Rejected",
    rejectionReason: trimmedReason,
    updatedAt: now,
  };
}

/**
 * Transitions a Rejected artifact back to Draft for revision.
 * Preserves the previous rejection note so revision context is not lost.
 */
export function reopenRejectedArtifact<
  T extends {
    validationStatus?: ValidationStatus;
    previousValidationStatus?: ValidationStatus;
    updatedAt?: number;
  }
>(artifact: T): T {
  if (artifact.validationStatus !== "Rejected") {
    throw new Error(
      `Cannot reopen: current status is "${artifact.validationStatus}", expected "Rejected".`
    );
  }

  const now = Date.now();
  return {
    ...artifact,
    validationStatus: "Draft",
    previousValidationStatus: "Rejected",
    updatedAt: now,
  };
}

/**
 * Applies updates to an EvidenceEntry.
 *
 * If the entry is currently "Validated" and the updates contain substantive changes:
 * - Automatically increments revision (e.g. 1 -> 2)
 * - Sets previousValidationStatus = "Validated"
 * - Resets validationStatus = "Needs Review"
 * - Preserves lastValidatedAt and lastValidatedBy as historical audit metadata
 * - Returns requiredRevalidation: true
 *
 * If updates are non-substantive (e.g. minor whitespace) or the entry was not "Validated",
 * existing validation state is maintained.
 */
export function applySubstantiveEvidenceEdit(
  original: EvidenceEntry,
  updates: Partial<EvidenceEntry>
): { updated: EvidenceEntry; requiredRevalidation: boolean } {
  const isSubstantive = isSubstantiveEvidenceChange(original, updates);
  const now = Date.now();

  if (original.validationStatus === "Validated") {
    if (isSubstantive) {
      const currentRevision = original.revision ?? 1;
      const nextRevision = currentRevision + 1;

      const updated: EvidenceEntry = {
        ...original,
        ...updates,
        // Sync rawObservation and rawEvidence if one was updated
        rawEvidence: updates.rawEvidence ?? updates.rawObservation ?? original.rawEvidence,
        rawObservation: updates.rawObservation ?? updates.rawEvidence ?? original.rawObservation,
        potentialFinding:
          updates.potentialFinding ?? updates.interpretation ?? original.potentialFinding,
        interpretation:
          updates.interpretation ?? updates.potentialFinding ?? original.interpretation,
        revision: nextRevision,
        previousValidationStatus: "Validated",
        validationStatus: "Needs Review",
        // Preserve prior validation audit trail
        lastValidatedAt: original.lastValidatedAt,
        lastValidatedBy: original.lastValidatedBy,
        updatedAt: now,
      };

      return {
        updated,
        requiredRevalidation: true,
      };
    }

    // Non-substantive edit to validated entry
    return {
      updated: {
        ...original,
        ...updates,
        updatedAt: now,
      },
      requiredRevalidation: false,
    };
  }

  // Not currently validated
  const updated: EvidenceEntry = {
    ...original,
    ...updates,
    rawEvidence: updates.rawEvidence ?? updates.rawObservation ?? original.rawEvidence,
    rawObservation: updates.rawObservation ?? updates.rawEvidence ?? original.rawObservation,
    potentialFinding:
      updates.potentialFinding ?? updates.interpretation ?? original.potentialFinding,
    interpretation:
      updates.interpretation ?? updates.potentialFinding ?? original.interpretation,
    updatedAt: now,
  };

  return {
    updated,
    requiredRevalidation: false,
  };
}

/**
 * UI State Check Helpers
 */
export function canSubmitForReview(entry: EvidenceEntry): boolean {
  const status = entry.validationStatus ?? "Draft";
  return status === "Draft";
}

export function canValidate(entry: EvidenceEntry): boolean {
  return entry.validationStatus === "Needs Review";
}

export function canReject(entry: EvidenceEntry): boolean {
  return entry.validationStatus === "Needs Review";
}

export function canReopen(entry: EvidenceEntry): boolean {
  return entry.validationStatus === "Rejected";
}

export function requiresRevalidation(entry: EvidenceEntry): boolean {
  return (
    entry.previousValidationStatus === "Validated" &&
    entry.validationStatus === "Needs Review" &&
    (entry.revision ?? 1) > 1
  );
}
