import type {
  Finding,
  Recommendation,
  LessonLearned,
  GoodPractice,
} from "@/lib/types";

/**
 * Checks if a Finding is eligible for formal brief export according to the single export policy.
 *
 * Rules:
 * - Sandbox or temporary items are strictly excluded.
 * - For editable/live studies: validationStatus must be strictly "Validated". Missing/undefined is NEVER Validated.
 * - Stale findings (with an active staleDependencyWarning) require human review before export.
 * - For immutable legacy demo cases: validationStatus defaults to "Validated" only inside isolated demo mode.
 */
export function isFindingExportEligible(
  finding: Finding,
  isLegacyDemo: boolean = false
): boolean {
  if (!finding || !finding.id) return false;
  if (finding.id.includes("SBX") || finding.id.includes("TEMP")) return false;

  // Stale findings are not eligible for formal output until re-validated
  if (finding.staleDependencyWarning && finding.staleDependencyWarning.trim().length > 0) {
    return false;
  }

  if (isLegacyDemo) {
    return (finding.validationStatus ?? "Validated") === "Validated";
  }

  return finding.validationStatus === "Validated";
}

/**
 * Checks if a Recommendation is eligible for formal brief export.
 *
 * Requirements:
 * 1. Recommendation validationStatus must be "Validated".
 * 2. linkedFindingId must be specified.
 * 3. Linked Finding must exist in the study.
 * 4. Linked Finding must be Validated and eligible (not stale).
 */
export function isRecommendationExportEligible(
  recommendation: Recommendation,
  allFindings: Finding[],
  isLegacyDemo: boolean = false
): boolean {
  if (!recommendation || !recommendation.id) return false;
  if (recommendation.id.includes("SBX") || recommendation.id.includes("TEMP")) return false;

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
  const linked = allFindings.find((f) => f.id === recommendation.linkedFindingId);
  if (!linked) return false;

  // 4. Linked finding must be validated and not stale
  return isFindingExportEligible(linked, isLegacyDemo);
}

/**
 * Checks if a Lesson Learned is eligible for formal brief export.
 */
export function isLessonExportEligible(
  lesson: LessonLearned,
  isLegacyDemo: boolean = false
): boolean {
  if (!lesson || !lesson.id) return false;
  if (lesson.id.includes("SBX") || lesson.id.includes("TEMP")) return false;

  if (isLegacyDemo) {
    return (lesson.validationStatus ?? "Validated") === "Validated";
  }

  return lesson.validationStatus === "Validated";
}

/**
 * Checks if a Good Practice is eligible for formal brief export.
 */
export function isGoodPracticeExportEligible(
  practice: GoodPractice,
  isLegacyDemo: boolean = false
): boolean {
  if (!practice || !practice.id) return false;
  if (practice.id.includes("SBX") || practice.id.includes("TEMP")) return false;

  if (isLegacyDemo) {
    return (practice.validationStatus ?? "Validated") === "Validated";
  }

  return practice.validationStatus === "Validated";
}
