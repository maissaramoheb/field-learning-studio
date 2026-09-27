import type {
  Finding,
  Recommendation,
  LessonLearned,
  GoodPractice,
  SourceRecord,
  EvidenceEntry,
} from "@/lib/types";

export interface CanonicalExportContext {
  sources?: SourceRecord[];
  evidence?: EvidenceEntry[];
  findings?: Finding[];
  isLegacyDemo?: boolean;
}

/**
 * Checks if a Finding is eligible for formal brief export according to the single export policy.
 *
 * Rules:
 * - Sandbox or temporary items are strictly excluded.
 * - For editable/live studies:
 *   1. Finding must be explicitly approved (validationStatus === "Validated").
 *   2. Finding must not have an active stale dependency warning.
 *   3. Finding must have at least one supporting evidence relationship.
 *   4. If context (evidence/sources) is provided:
 *      - All supporting evidence must exist in the study.
 *      - All supporting evidence must be currently Validated (not Draft, Needs Review, or Rejected).
 *      - All supporting evidence must have an existing parent Source in the study.
 *      - All material challenging evidence (if linked) must exist and cannot be Rejected.
 * - For immutable legacy demo cases: validationStatus defaults to "Validated" inside isolated demo mode.
 */
export function isFindingExportEligible(
  finding: Finding,
  contextOrLegacyDemo?: CanonicalExportContext | boolean,
  maybeLegacyDemo: boolean = false
): boolean {
  if (!finding || !finding.id) return false;
  if (finding.id.includes("SBX") || finding.id.includes("TEMP")) return false;

  const isLegacyDemo =
    typeof contextOrLegacyDemo === "boolean"
      ? contextOrLegacyDemo
      : Boolean(contextOrLegacyDemo?.isLegacyDemo || maybeLegacyDemo);

  const context = typeof contextOrLegacyDemo === "object" ? contextOrLegacyDemo : undefined;

  // Stale findings are never eligible for formal deliverable output until re-reviewed
  if (finding.staleDependencyWarning && finding.staleDependencyWarning.trim().length > 0) {
    return false;
  }

  if (isLegacyDemo) {
    return (finding.validationStatus ?? "Validated") === "Validated";
  }

  // Live editable study requirements
  if (finding.validationStatus !== "Validated") {
    return false;
  }

  // Must have at least one supporting evidence item
  if (!finding.supportingEvidenceIds || finding.supportingEvidenceIds.length === 0) {
    return false;
  }

  // If evidence context is provided, enforce deep referential & review state invariants
  if (context?.evidence) {
    const evidenceMap = new Map<string, EvidenceEntry>(context.evidence.map((e) => [e.id, e]));
    const sourceIdSet = context.sources ? new Set<string>(context.sources.map((s) => s.id)) : null;

    // Check all supporting evidence
    for (const evId of finding.supportingEvidenceIds) {
      const ev = evidenceMap.get(evId);
      if (!ev) {
        // Missing supporting evidence
        return false;
      }
      if (ev.validationStatus !== "Validated") {
        // Unreviewed or rejected supporting evidence
        return false;
      }
      if (ev.staleDependencyWarning && ev.staleDependencyWarning.trim().length > 0) {
        return false;
      }
      if (sourceIdSet && (!ev.sourceId || !sourceIdSet.has(ev.sourceId))) {
        // Parent source is missing from study
        return false;
      }
    }

    // Check material challenging evidence
    if (finding.contradictoryEvidenceIds && finding.contradictoryEvidenceIds.length > 0) {
      for (const evId of finding.contradictoryEvidenceIds) {
        const ev = evidenceMap.get(evId);
        if (!ev) {
          // Missing challenging evidence
          return false;
        }
        if (ev.validationStatus === "Rejected") {
          // Material challenging evidence has been rejected
          return false;
        }
        if (ev.staleDependencyWarning && ev.staleDependencyWarning.trim().length > 0) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Checks if a Recommendation is eligible for formal brief export.
 *
 * Requirements:
 * 1. Recommendation validationStatus must be "Validated".
 * 2. linkedFindingId must be specified.
 * 3. Linked Finding must exist in the study.
 * 4. Linked Finding must be formally eligible under isFindingExportEligible (Validated, not stale, reviewed evidence).
 */
export function isRecommendationExportEligible(
  recommendation: Recommendation,
  contextOrFindings?: CanonicalExportContext | Finding[] | Finding,
  maybeLegacyDemo: boolean = false
): boolean {
  if (!recommendation || !recommendation.id) return false;
  if (recommendation.id.includes("SBX") || recommendation.id.includes("TEMP")) return false;

  let findings: Finding[] = [];
  let context: CanonicalExportContext | undefined;
  let isLegacyDemo = maybeLegacyDemo;

  if (Array.isArray(contextOrFindings)) {
    findings = contextOrFindings;
    context = { findings, isLegacyDemo: maybeLegacyDemo };
  } else if (
    typeof contextOrFindings === "object" &&
    contextOrFindings !== null &&
    "statement" in contextOrFindings &&
    "id" in contextOrFindings
  ) {
    // Single Finding passed directly: isRecommendationExportEligible(rec, linkedFinding, isLegacyDemo)
    findings = [contextOrFindings as Finding];
    isLegacyDemo = maybeLegacyDemo;
    context = undefined;
  } else if (typeof contextOrFindings === "object" && contextOrFindings !== null) {
    context = contextOrFindings;
    findings = context.findings || [];
    isLegacyDemo = Boolean(context.isLegacyDemo || maybeLegacyDemo);
  }

  // 1. Recommendation must be validated
  const isRecValid = isLegacyDemo
    ? (recommendation.validationStatus ?? "Validated") === "Validated"
    : recommendation.validationStatus === "Validated";

  if (!isRecValid) return false;

  // 2. Must reference a linked finding
  if (!recommendation.linkedFindingId || !recommendation.linkedFindingId.trim()) {
    return false;
  }

  // 3. Linked finding must exist
  const linked = findings.find((f) => f.id === recommendation.linkedFindingId);
  if (!linked) return false;

  // 4. Linked finding must be formally eligible according to single canonical policy
  return isFindingExportEligible(linked, context ?? isLegacyDemo, isLegacyDemo);
}

/**
 * Returns plain practitioner-language dependency warning for a Recommendation.
 */
export function getRecommendationDependencyWarning(
  recommendation: Recommendation,
  linkedFinding?: Finding,
  context?: CanonicalExportContext
): string | null {
  if (!linkedFinding) {
    return "Linked Finding not found";
  }
  if (linkedFinding.staleDependencyWarning && linkedFinding.staleDependencyWarning.trim().length > 0) {
    return linkedFinding.staleDependencyWarning;
  }
  if (linkedFinding.validationStatus !== "Validated") {
    return "Linked Finding requires re-validation";
  }
  if (context && !isFindingExportEligible(linkedFinding, context)) {
    return "This Recommendation cannot be included in a formal deliverable until its parent Finding is reviewed again.";
  }
  return null;
}

/**
 * Checks if a Lesson Learned is eligible for formal brief export.
 */
export function isLessonExportEligible(
  lesson: LessonLearned,
  contextOrLegacyDemo?: CanonicalExportContext | boolean,
  maybeLegacyDemo: boolean = false
): boolean {
  if (!lesson || !lesson.id) return false;
  if (lesson.id.includes("SBX") || lesson.id.includes("TEMP")) return false;

  const isLegacyDemo =
    typeof contextOrLegacyDemo === "boolean"
      ? contextOrLegacyDemo
      : Boolean(contextOrLegacyDemo?.isLegacyDemo || maybeLegacyDemo);

  const context = typeof contextOrLegacyDemo === "object" ? contextOrLegacyDemo : undefined;

  if (isLegacyDemo) {
    return (lesson.validationStatus ?? "Validated") === "Validated";
  }

  if (lesson.validationStatus !== "Validated") return false;

  if (context?.evidence) {
    const evidenceMap = new Map<string, EvidenceEntry>(context.evidence.map((e) => [e.id, e]));
    for (const evId of lesson.evidenceBase || []) {
      const ev = evidenceMap.get(evId);
      if (!ev || ev.validationStatus !== "Validated") {
        return false;
      }
    }
  }

  return true;
}

/**
 * Checks if a Good Practice is eligible for formal brief export.
 */
export function isGoodPracticeExportEligible(
  practice: GoodPractice,
  contextOrLegacyDemo?: CanonicalExportContext | boolean,
  maybeLegacyDemo: boolean = false
): boolean {
  if (!practice || !practice.id) return false;
  if (practice.id.includes("SBX") || practice.id.includes("TEMP")) return false;

  const isLegacyDemo =
    typeof contextOrLegacyDemo === "boolean"
      ? contextOrLegacyDemo
      : Boolean(contextOrLegacyDemo?.isLegacyDemo || maybeLegacyDemo);

  const context = typeof contextOrLegacyDemo === "object" ? contextOrLegacyDemo : undefined;

  if (isLegacyDemo) {
    return (practice.validationStatus ?? "Validated") === "Validated";
  }

  if (practice.validationStatus !== "Validated") return false;

  if (context?.evidence) {
    const evidenceMap = new Map<string, EvidenceEntry>(context.evidence.map((e) => [e.id, e]));
    for (const evId of practice.evidenceBase || []) {
      const ev = evidenceMap.get(evId);
      if (!ev || ev.validationStatus !== "Validated") {
        return false;
      }
    }
  }

  return true;
}
