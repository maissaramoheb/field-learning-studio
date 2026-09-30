import type {
  EvidenceEntry,
  Finding,
  Recommendation,
  EvidenceSupportProfile,
  ValidationStatus,
  SourceRecord,
  OriginMetadata,
} from "@/lib/types";
import {
  isFindingExportEligible,
  isRecommendationExportEligible,
  getRecommendationDependencyWarning,
  isLessonExportEligible,
  isGoodPracticeExportEligible,
  type CanonicalExportContext,
} from "@/lib/exportPolicy";
export {
  isFindingExportEligible,
  isRecommendationExportEligible,
  getRecommendationDependencyWarning,
  isLessonExportEligible,
  isGoodPracticeExportEligible,
  type CanonicalExportContext,
};

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
    limitationNote?: string;
    staleDependencyWarning?: string;
  }
>(
  artifact: T,
  reviewerName: string,
  validationNote?: string,
  context?: {
    sources?: SourceRecord[];
    evidence?: EvidenceEntry[];
    findings?: Finding[];
  }
): T {
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

  const anyArtifact = artifact as unknown as Record<string, unknown>;

  // Finding Approval Guard
  if (Array.isArray(anyArtifact.supportingEvidenceIds)) {
    const suppIds = anyArtifact.supportingEvidenceIds as string[];
    if (suppIds.length === 0) {
      throw new Error(
        "Cannot approve Finding: A formal Finding must have at least one supporting Evidence link."
      );
    }
    if (context?.evidence) {
      const evMap = new Map<string, EvidenceEntry>(context.evidence.map((e) => [e.id, e]));
      for (const evId of suppIds) {
        const ev = evMap.get(evId);
        if (!ev) {
          throw new Error(
            `Cannot approve Finding: Supporting evidence "${evId}" is missing from this study.`
          );
        }
        // Qualification check: usable reviewStatus qualifies evidence for analysis
        if (ev.reviewStatus === "usable") {
          // Qualified to support finding regardless of validationStatus
        } else if (ev.reviewStatus === "excluded") {
          throw new Error(
            `Cannot approve Finding: Supporting evidence "${evId}" is marked as excluded and cannot support a Finding.`
          );
        } else if (ev.reviewStatus === "pending" || ev.reviewStatus === "needs_clarification") {
          throw new Error(
            `Cannot approve Finding: Supporting evidence "${evId}" is not yet validated (reviewStatus: "${ev.reviewStatus}"). All supporting evidence must be qualified and validated before a Finding can be approved.`
          );
        } else if (ev.validationStatus !== "Validated") {
          // Legacy record without reviewStatus: must be Validated under pre-existing product rule
          throw new Error(
            `Cannot approve Finding: Supporting evidence "${evId}" is not yet validated (status: "${ev.validationStatus}"). All supporting evidence must be Validated before a Finding can be approved.`
          );
        }
        if (ev.staleDependencyWarning && ev.staleDependencyWarning.trim().length > 0) {
          throw new Error(
            `Cannot approve Finding: Supporting evidence "${evId}" has an active stale dependency warning. Review the evidence first.`
          );
        }
        if (context.sources && ev.sourceId) {
          const src = context.sources.find((s) => s.id === ev.sourceId);
          if (!src) {
            throw new Error(
              `Cannot approve Finding: Parent Source "${ev.sourceId}" for supporting evidence "${evId}" is missing from this study.`
            );
          }
        }
      }

      if (Array.isArray(anyArtifact.contradictoryEvidenceIds)) {
        const contraIds = anyArtifact.contradictoryEvidenceIds as string[];
        for (const evId of contraIds) {
          const ev = evMap.get(evId);
          if (!ev) {
            throw new Error(
              `Cannot approve Finding: Challenging evidence "${evId}" is missing from this study.`
            );
          }
          if (ev.validationStatus === "Rejected") {
            throw new Error(
              `Cannot approve Finding: Challenging evidence "${evId}" has been marked as Rejected. Reconsider the challenging evidence before approving this Finding.`
            );
          }
          if (ev.staleDependencyWarning && ev.staleDependencyWarning.trim().length > 0) {
            throw new Error(
              `Cannot approve Finding: Challenging evidence "${evId}" has an active stale dependency warning. Review the evidence first.`
            );
          }
        }
      }

      if (Array.isArray(anyArtifact.qualifyingEvidenceIds)) {
        const qualIds = anyArtifact.qualifyingEvidenceIds as string[];
        for (const evId of qualIds) {
          const ev = evMap.get(evId);
          if (!ev) {
            throw new Error(
              `Cannot approve Finding: Qualifying evidence "${evId}" is missing from this study.`
            );
          }
          if (ev.validationStatus === "Rejected") {
            throw new Error(
              `Cannot approve Finding: Qualifying evidence "${evId}" has been marked as Rejected. Reconsider the qualifying evidence before approving this Finding.`
            );
          }
          if (ev.staleDependencyWarning && ev.staleDependencyWarning.trim().length > 0) {
            throw new Error(
              `Cannot approve Finding: Qualifying evidence "${evId}" has an active stale dependency warning. Review the evidence first.`
            );
          }
        }
      }
    } else if (artifact.staleDependencyWarning && artifact.staleDependencyWarning.trim().length > 0) {
      throw new Error(
        `Cannot approve: ${artifact.staleDependencyWarning}`
      );
    }
  } else if (artifact.staleDependencyWarning && artifact.staleDependencyWarning.trim().length > 0) {
    throw new Error(
      `Cannot approve: ${artifact.staleDependencyWarning}`
    );
  }

  // Recommendation Approval Guard
  if (typeof anyArtifact.linkedFindingId === "string") {
    const linkedId = anyArtifact.linkedFindingId.trim();
    if (!linkedId) {
      throw new Error("Cannot approve Recommendation: Linked Finding ID is required.");
    }
    const actor = typeof anyArtifact.responsibleActor === "string" ? anyArtifact.responsibleActor.trim() : "";
    if (!actor || actor.toLowerCase() === "unassigned") {
      throw new Error(
        "Cannot approve Recommendation: Intended Actor is required. Specify an identified role/actor or explicit 'Responsibility to be agreed'."
      );
    }
    if (context?.findings) {
      const linkedFinding = context.findings.find((f) => f.id === linkedId);
      if (!linkedFinding) {
        throw new Error(`Cannot approve Recommendation: Linked Finding "${linkedId}" was not found in this study.`);
      }
      if (linkedFinding.validationStatus !== "Validated") {
        throw new Error(
          `Cannot approve Recommendation: Linked Finding "${linkedId}" is not validated (current status: "${linkedFinding.validationStatus}"). Parent Finding must be Validated first.`
        );
      }
      if (linkedFinding.staleDependencyWarning && linkedFinding.staleDependencyWarning.trim().length > 0) {
        throw new Error(
          `Cannot approve Recommendation: Linked Finding "${linkedId}" has an active stale dependency warning.`
        );
      }
    }
  }

  // Lesson & Good Practice Approval Guard
  if (Array.isArray(anyArtifact.evidenceBase) && context?.evidence) {
    const evIds = anyArtifact.evidenceBase as string[];
    const evMap = new Map<string, EvidenceEntry>(context.evidence.map((e) => [e.id, e]));
    for (const evId of evIds) {
      const ev = evMap.get(evId);
      if (!ev || ev.validationStatus !== "Validated") {
        throw new Error("Cannot approve: All referenced evidence must be Validated first.");
      }
      if (ev.reviewStatus === "excluded") {
        throw new Error(`Cannot approve: Referenced evidence "${evId}" is marked as excluded.`);
      }
    }
  }

  if (Array.isArray(anyArtifact.linkedFindingIds) && anyArtifact.linkedFindingIds.length > 0 && context?.findings) {
    const fIds = anyArtifact.linkedFindingIds as string[];
    const fMap = new Map<string, Finding>(context.findings.map((f) => [f.id, f]));
    for (const fId of fIds) {
      const f = fMap.get(fId);
      if (!f) {
        throw new Error(`Cannot approve: Linked Finding "${fId}" was not found in this study.`);
      }
      if (f.validationStatus !== "Validated") {
        throw new Error(
          `Cannot approve: Linked Finding "${fId}" is not validated (current status: "${f.validationStatus}"). Parent Finding must be Validated first.`
        );
      }
    }
  }

  const now = Date.now();
  const existingAudit = (artifact as unknown as Record<string, unknown>).audit as OriginMetadata | undefined;
  const updatedAudit: OriginMetadata = {
    provenance: existingAudit?.provenance ?? "human",
    createdActor: existingAudit?.createdActor ?? { kind: "human", displayName: trimmedReviewer },
    createdAt: existingAudit?.createdAt ?? now,
    updatedActor: { kind: "human", displayName: trimmedReviewer },
    updatedAt: now,
    validatedActor: { kind: "human", displayName: trimmedReviewer },
    lastValidatedAt: now,
  };

  return {
    ...artifact,
    validationStatus: "Validated",
    lastValidatedBy: trimmedReviewer,
    lastValidatedAt: now,
    rejectionReason: undefined,
    staleDependencyWarning: undefined,
    ...(validationNote?.trim() ? { limitationNote: validationNote.trim() } : {}),
    audit: updatedAudit,
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

// ============================================================================
// Finding Validation Lifecycle Helpers
// ============================================================================

export function isSubstantiveFindingChange(
  original: Finding,
  proposed: Partial<Finding>
): boolean {
  if (
    proposed.statement !== undefined &&
    normalizeComparableText(proposed.statement) !== normalizeComparableText(original.statement)
  ) {
    return true;
  }
  if (
    proposed.explanation !== undefined &&
    normalizeComparableText(proposed.explanation) !== normalizeComparableText(original.explanation)
  ) {
    return true;
  }
  if (
    proposed.programmeImplication !== undefined &&
    normalizeComparableText(proposed.programmeImplication) !== normalizeComparableText(original.programmeImplication)
  ) {
    return true;
  }
  if (proposed.supportingEvidenceIds !== undefined) {
    const origSet = new Set(original.supportingEvidenceIds || []);
    const propSet = new Set(proposed.supportingEvidenceIds || []);
    if (origSet.size !== propSet.size || ![...origSet].every((id) => propSet.has(id))) {
      return true;
    }
  }
  if (proposed.contradictoryEvidenceIds !== undefined) {
    const origSet = new Set(original.contradictoryEvidenceIds || []);
    const propSet = new Set(proposed.contradictoryEvidenceIds || []);
    if (origSet.size !== propSet.size || ![...origSet].every((id) => propSet.has(id))) {
      return true;
    }
  }
  if (proposed.qualifyingEvidenceIds !== undefined) {
    const origSet = new Set(original.qualifyingEvidenceIds || []);
    const propSet = new Set(proposed.qualifyingEvidenceIds || []);
    if (origSet.size !== propSet.size || ![...origSet].every((id) => propSet.has(id))) {
      return true;
    }
  }
  if (
    proposed.contradictoryEvidence !== undefined &&
    normalizeComparableText(proposed.contradictoryEvidence) !== normalizeComparableText(original.contradictoryEvidence)
  ) {
    return true;
  }
  if (
    proposed.targetStakeholderGroup !== undefined &&
    normalizeComparableText(proposed.targetStakeholderGroup) !== normalizeComparableText(original.targetStakeholderGroup)
  ) {
    return true;
  }
  if (
    proposed.isStakeholderSpecific !== undefined &&
    proposed.isStakeholderSpecific !== original.isStakeholderSpecific
  ) {
    return true;
  }
  return false;
}

export function applySubstantiveFindingEdit(
  original: Finding,
  updates: Partial<Finding>
): { updated: Finding; requiredRevalidation: boolean } {
  const isSubstantive = isSubstantiveFindingChange(original, updates);
  const now = Date.now();

  if (original.validationStatus === "Validated") {
    if (isSubstantive) {
      const currentRevision = original.revision ?? 1;
      const nextRevision = currentRevision + 1;

      const updated: Finding = {
        ...original,
        ...updates,
        revision: nextRevision,
        previousValidationStatus: "Validated",
        validationStatus: "Needs Review",
        lastValidatedAt: original.lastValidatedAt,
        lastValidatedBy: original.lastValidatedBy,
        updatedAt: now,
      };

      return {
        updated,
        requiredRevalidation: true,
      };
    }

    return {
      updated: {
        ...original,
        ...updates,
        updatedAt: now,
      },
      requiredRevalidation: false,
    };
  }

  const updated: Finding = {
    ...original,
    ...updates,
    updatedAt: now,
  };

  return {
    updated,
    requiredRevalidation: false,
  };
}

export function requiresFindingLimitationNote(
  finding: Finding,
  profile?: EvidenceSupportProfile,
  criticalGapsCount: number = 0
): boolean {
  if (!profile) return false;
  if (finding.limitationNote && finding.limitationNote.trim().length > 0) {
    return false;
  }
  const isEmerging = profile.supportTier === "Emerging";
  const hasContradictions =
    profile.contradictionState.hasContradictions &&
    profile.contradictionState.unresolvedCount > 0;
  const hasCriticalGaps = criticalGapsCount > 0;
  return isEmerging || hasContradictions || hasCriticalGaps;
}

// ============================================================================
// Recommendation Validation Lifecycle Helpers
// ============================================================================

export function isSubstantiveRecommendationChange(
  original: Recommendation,
  proposed: Partial<Recommendation>
): boolean {
  if (
    proposed.recommendation !== undefined &&
    normalizeComparableText(proposed.recommendation) !== normalizeComparableText(original.recommendation)
  ) {
    return true;
  }
  if (
    proposed.responsibleActor !== undefined &&
    normalizeComparableText(proposed.responsibleActor) !== normalizeComparableText(original.responsibleActor)
  ) {
    return true;
  }
  if (
    proposed.priority !== undefined &&
    proposed.priority !== original.priority
  ) {
    return true;
  }
  if (
    proposed.timeframe !== undefined &&
    normalizeComparableText(proposed.timeframe) !== normalizeComparableText(original.timeframe)
  ) {
    return true;
  }
  if (
    proposed.expectedBenefit !== undefined &&
    normalizeComparableText(proposed.expectedBenefit) !== normalizeComparableText(original.expectedBenefit)
  ) {
    return true;
  }
  if (
    proposed.successIndicator !== undefined &&
    normalizeComparableText(proposed.successIndicator) !== normalizeComparableText(original.successIndicator)
  ) {
    return true;
  }
  if (
    proposed.linkedFindingId !== undefined &&
    proposed.linkedFindingId !== original.linkedFindingId
  ) {
    return true;
  }
  return false;
}

export function applySubstantiveRecommendationEdit(
  original: Recommendation,
  updates: Partial<Recommendation>
): { updated: Recommendation; requiredRevalidation: boolean } {
  const isSubstantive = isSubstantiveRecommendationChange(original, updates);
  const now = Date.now();

  if (original.validationStatus === "Validated") {
    if (isSubstantive) {
      const currentRevision = original.revision ?? 1;
      const nextRevision = currentRevision + 1;

      const updated: Recommendation = {
        ...original,
        ...updates,
        revision: nextRevision,
        previousValidationStatus: "Validated",
        validationStatus: "Needs Review",
        lastValidatedAt: original.lastValidatedAt,
        lastValidatedBy: original.lastValidatedBy,
        updatedAt: now,
      };

      return {
        updated,
        requiredRevalidation: true,
      };
    }

    return {
      updated: {
        ...original,
        ...updates,
        updatedAt: now,
      },
      requiredRevalidation: false,
    };
  }

  const updated: Recommendation = {
    ...original,
    ...updates,
    updatedAt: now,
  };

  return {
    updated,
    requiredRevalidation: false,
  };
}
