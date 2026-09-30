import type {
  EvidenceEntry,
  EvidenceReviewStatus,
  Finding,
  LessonLearned,
  GoodPractice,
  Recommendation,
  DailyDebrief,
  SourceRecord,
  MaterialCategory,
  OriginMetadata,
  ActorRef,
} from "@/lib/types";

export function getActiveReviewerName(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const stored = localStorage.getItem("fls_reviewer_name");
      if (stored && stored.trim().length > 0) {
        return stored.trim();
      }
    } catch {
      // localStorage may be restricted in sandbox/privacy mode
    }
  }
  return "Evaluator";
}

export const DEMO_AUDIT: OriginMetadata = {
  provenance: "human",
  createdActor: {
    kind: "system",
    id: "system:demo-seed",
    displayName: "Demo Seeder",
  },
  createdAt: 1717200000000,
  updatedActor: {
    kind: "system",
    id: "system:demo-seed",
    displayName: "Demo Seeder",
  },
  updatedAt: 1717200000000,
};

export function createAuditMetadata(
  isLegacyMigration: boolean = false,
  createdAt?: number,
  updatedAt?: number
): OriginMetadata {
  const now = Date.now();
  if (isLegacyMigration) {
    const migrationActor: ActorRef = {
      kind: "system",
      id: "legacy-migration",
      displayName: "Legacy Migration Engine",
    };
    return {
      provenance: "legacy_unknown",
      createdActor: migrationActor,
      createdAt: createdAt ?? now,
      updatedActor: migrationActor,
      updatedAt: updatedAt ?? now,
    };
  }

  const reviewerName = getActiveReviewerName();
  const humanActor: ActorRef = {
    kind: "human",
    displayName: reviewerName,
  };

  return {
    provenance: "human",
    createdActor: humanActor,
    createdAt: createdAt ?? now,
    updatedActor: humanActor,
    updatedAt: updatedAt ?? now,
  };
}

export function inferMaterialCategoryFromSourceType(sourceType?: string): MaterialCategory {
  if (!sourceType) return "legacy_unclassified";
  const normalized = sourceType.trim().toLowerCase();

  if (
    normalized.includes("interview") ||
    normalized.includes("focus group") ||
    normalized.includes("observation") ||
    normalized.includes("community meeting") ||
    normalized.includes("survey")
  ) {
    return "primary_evidence";
  }

  if (
    normalized.includes("document review") ||
    normalized.includes("report") ||
    normalized.includes("evaluation") ||
    normalized.includes("desk review")
  ) {
    return "secondary_evidence";
  }

  if (
    normalized.includes("debrief") ||
    normalized.includes("team reflection") ||
    normalized.includes("supervisory")
  ) {
    return "supervisory_interpretation";
  }

  return "legacy_unclassified";
}

export function mapLegacyValidationToReviewStatus(validationStatus?: string): EvidenceReviewStatus {
  if (!validationStatus) return "pending";
  switch (validationStatus) {
    case "Validated":
      return "usable";
    case "Rejected":
      return "excluded";
    case "Needs Review":
    case "Draft":
      return "pending";
    default:
      return "needs_clarification";
  }
}

/**
 * Canonical eligibility boundary for analytical use (Synthesis, Triangulation, Findings):
 * - Phase 3+ / modern record: requires reviewStatus === "usable".
 * - Legacy record without reviewStatus: requires validationStatus === "Validated".
 *
 * Excludes: reviewStatus "excluded", "pending", "needs_clarification",
 * and legacy unreviewed records ("Draft", "Needs Review", "Rejected").
 */
export function isEvidenceEligibleForAnalysis(entry: {
  reviewStatus?: EvidenceReviewStatus | string | null;
  validationStatus?: string | null;
}): boolean {
  if (entry.reviewStatus) {
    return entry.reviewStatus === "usable";
  }
  return entry.validationStatus === "Validated";
}

export function normalizeSourceRecord(
  source: SourceRecord,
  isLegacyMigration: boolean = false
): SourceRecord {
  const now = Date.now();
  const materialCategory =
    source.materialCategory ?? inferMaterialCategoryFromSourceType(source.sourceType);

  return {
    ...source,
    materialCategory,
    audit: source.audit ?? createAuditMetadata(isLegacyMigration, source.createdAt, source.updatedAt),
    createdAt: source.createdAt ?? now,
    updatedAt: source.updatedAt ?? now,
  };
}

export function normalizeEvidenceEntry(
  entry: EvidenceEntry,
  isLegacyMigration: boolean = false,
  parentSource?: SourceRecord
): EvidenceEntry {
  const now = Date.now();
  const reviewStatus =
    entry.reviewStatus ?? mapLegacyValidationToReviewStatus(entry.validationStatus);

  let materialCategory = entry.materialCategory;
  if (!materialCategory) {
    if (parentSource?.materialCategory) {
      materialCategory = parentSource.materialCategory;
    } else if (parentSource?.sourceType) {
      materialCategory = inferMaterialCategoryFromSourceType(parentSource.sourceType);
    } else {
      materialCategory = isLegacyMigration ? "legacy_unclassified" : "primary_evidence";
    }
  }

  return {
    ...entry,
    reviewStatus,
    materialCategory,
    validationStatus: entry.validationStatus ?? "Draft",
    audit: entry.audit ?? createAuditMetadata(isLegacyMigration, entry.createdAt, entry.updatedAt),
    createdAt: entry.createdAt ?? now,
    updatedAt: entry.updatedAt ?? now,
  };
}

export function normalizeFinding(
  finding: Finding,
  isLegacyMigration: boolean = false
): Finding {
  const now = Date.now();
  return {
    ...finding,
    supportingEvidenceIds: Array.isArray(finding.supportingEvidenceIds)
      ? finding.supportingEvidenceIds
      : [],
    contradictoryEvidenceIds: Array.isArray(finding.contradictoryEvidenceIds)
      ? finding.contradictoryEvidenceIds
      : [],
    linkedRecommendationIds: Array.isArray(finding.linkedRecommendationIds)
      ? finding.linkedRecommendationIds
      : [],
    validationStatus: finding.validationStatus ?? "Draft",
    audit: finding.audit ?? createAuditMetadata(isLegacyMigration, finding.createdAt, finding.updatedAt),
    createdAt: finding.createdAt ?? now,
    updatedAt: finding.updatedAt ?? now,
  };
}

export function normalizeLessonLearned(
  lesson: LessonLearned,
  isLegacyMigration: boolean = false
): LessonLearned {
  const now = Date.now();
  const linkedFindingIds = Array.isArray(lesson.linkedFindingIds) ? lesson.linkedFindingIds : [];
  const lineageStatus =
    lesson.lineageStatus ??
    (linkedFindingIds.length > 0 ? "resolved" : "legacy_unresolved");

  return {
    ...lesson,
    linkedFindingIds,
    lineageStatus,
    evidenceBase: Array.isArray(lesson.evidenceBase) ? lesson.evidenceBase : [],
    validationStatus: lesson.validationStatus ?? "Draft",
    audit: lesson.audit ?? createAuditMetadata(isLegacyMigration, lesson.createdAt, lesson.updatedAt),
    createdAt: lesson.createdAt ?? now,
    updatedAt: lesson.updatedAt ?? now,
  };
}

export function normalizeGoodPractice(
  goodPractice: GoodPractice,
  isLegacyMigration: boolean = false
): GoodPractice {
  const now = Date.now();
  const linkedFindingIds = Array.isArray(goodPractice.linkedFindingIds)
    ? goodPractice.linkedFindingIds
    : [];
  const lineageStatus =
    goodPractice.lineageStatus ??
    (linkedFindingIds.length > 0 ? "resolved" : "legacy_unresolved");

  return {
    ...goodPractice,
    linkedFindingIds,
    lineageStatus,
    evidenceBase: Array.isArray(goodPractice.evidenceBase) ? goodPractice.evidenceBase : [],
    validationStatus: goodPractice.validationStatus ?? "Draft",
    audit:
      goodPractice.audit ??
      createAuditMetadata(isLegacyMigration, goodPractice.createdAt, goodPractice.updatedAt),
    createdAt: goodPractice.createdAt ?? now,
    updatedAt: goodPractice.updatedAt ?? now,
  };
}

/**
 * Normalizes a Recommendation with dual-write compatibility invariant:
 * - linkedFindingId = linkedFindingIds[0] ?? linkedFindingId ?? undefined
 * - linkedFindingIds = [linkedFindingId] when only scalar exists
 * - linkedLessonIds = [] default
 */
export function normalizeRecommendation(
  rec: Recommendation,
  isLegacyMigration: boolean = false
): Recommendation {
  const now = Date.now();

  let linkedFindingIds: string[] = [];
  if (Array.isArray(rec.linkedFindingIds) && rec.linkedFindingIds.length > 0) {
    linkedFindingIds = [...rec.linkedFindingIds];
  } else if (rec.linkedFindingId && rec.linkedFindingId.trim()) {
    linkedFindingIds = [rec.linkedFindingId.trim()];
  }

  // Enforce dual-write synchronization invariant:
  const primaryFindingId = linkedFindingIds[0] ?? rec.linkedFindingId ?? "";

  const linkedLessonIds = Array.isArray(rec.linkedLessonIds) ? rec.linkedLessonIds : [];

  return {
    ...rec,
    linkedFindingId: primaryFindingId as Recommendation["linkedFindingId"],
    linkedFindingIds: linkedFindingIds as Recommendation["linkedFindingIds"],
    linkedLessonIds,
    evidenceBase: Array.isArray(rec.evidenceBase) ? rec.evidenceBase : [],
    validationStatus: rec.validationStatus ?? "Draft",
    audit: rec.audit ?? createAuditMetadata(isLegacyMigration, rec.createdAt, rec.updatedAt),
    createdAt: rec.createdAt ?? now,
    updatedAt: rec.updatedAt ?? now,
  };
}

export function normalizeDailyDebrief(
  debrief: DailyDebrief,
  isLegacyMigration: boolean = false
): DailyDebrief {
  const now = Date.now();
  return {
    ...debrief,
    materialCategory: "supervisory_interpretation",
    siteIds: Array.isArray(debrief.siteIds) ? debrief.siteIds : [],
    attendees: Array.isArray(debrief.attendees) ? debrief.attendees : [],
    tomorrowPriorities: Array.isArray(debrief.tomorrowPriorities) ? debrief.tomorrowPriorities : [],
    linkedSourceIds: Array.isArray(debrief.linkedSourceIds) ? debrief.linkedSourceIds : [],
    linkedEvidenceIds: Array.isArray(debrief.linkedEvidenceIds) ? debrief.linkedEvidenceIds : [],
    audit: debrief.audit ?? createAuditMetadata(isLegacyMigration, debrief.createdAt, debrief.updatedAt),
    createdAt: debrief.createdAt ?? now,
    updatedAt: debrief.updatedAt ?? now,
  };
}
