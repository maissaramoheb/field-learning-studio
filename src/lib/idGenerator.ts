import type {
  SourceRecordId,
  EvidenceEntryId,
  FindingId,
  DailyDebriefId,
  LessonLearnedId,
  GoodPracticeId,
  RecommendationId,
} from "@/lib/types";

/**
 * Safely derives the next human-readable identifier for a given prefix.
 *
 * e.g. given prefix "SRC-" and existing IDs ["SRC-001", "SRC-003", "SRC-010"],
 * finds the maximum existing numeric suffix (10), increments by 1 (11),
 * and formats with minimum 3-digit zero padding ("SRC-011").
 *
 * Features:
 * - Deterministic and gap-safe (does not assume consecutive array indices)
 * - Safe after imported studies with non-standard numbering
 * - Ignores non-matching or draft prefixes (e.g. "SRC-SBX-001")
 * - Expands naturally beyond 999 (e.g. "SRC-1000")
 */
export function getNextHumanReadableId(
  prefix: string,
  existingIds: string[],
  padLength: number = 3
): string {
  let maxNum = 0;
  // Match prefix followed strictly by digits
  const regex = new RegExp(`^${prefix}(\\d+)$`, "i");

  for (const id of existingIds) {
    if (!id || typeof id !== "string") continue;
    const match = id.trim().match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  const numStr = nextNum.toString();
  const padded = numStr.padStart(padLength, "0");
  return `${prefix}${padded}`;
}

export function getNextSourceId(existingSourceIds: string[]): SourceRecordId {
  return getNextHumanReadableId("SRC-", existingSourceIds) as SourceRecordId;
}

export function getNextEvidenceId(existingEvidenceIds: string[]): EvidenceEntryId {
  return getNextHumanReadableId("EV-", existingEvidenceIds) as EvidenceEntryId;
}

export function getNextFindingId(existingFindingIds: string[]): FindingId {
  return getNextHumanReadableId("FND-", existingFindingIds) as FindingId;
}

export function getNextDebriefId(existingDebriefIds: string[]): DailyDebriefId {
  return getNextHumanReadableId("DBR-", existingDebriefIds) as DailyDebriefId;
}

export function getNextLessonId(existingLessonIds: string[]): LessonLearnedId {
  return getNextHumanReadableId("LES-", existingLessonIds) as LessonLearnedId;
}

export function getNextGoodPracticeId(existingGpIds: string[]): GoodPracticeId {
  return getNextHumanReadableId("GP-", existingGpIds) as GoodPracticeId;
}

export function getNextRecommendationId(existingRecIds: string[]): RecommendationId {
  return getNextHumanReadableId("REC-", existingRecIds) as RecommendationId;
}

export function getNextQuestionId(existingQuestionIds: string[]): string {
  return getNextHumanReadableId("RQ-", existingQuestionIds);
}

export function getNextPatternId(existingPatternIds: string[]): string {
  return getNextHumanReadableId("PAT-", existingPatternIds);
}

/**
 * Safely derives a sequence of N non-colliding human-readable IDs.
 */
export function getNextSequenceOfIds(
  prefix: string,
  existingIds: string[],
  count: number,
  padLength: number = 3
): string[] {
  if (count <= 0) return [];
  let maxNum = 0;
  const regex = new RegExp(`^${prefix}(\\d+)$`, "i");

  for (const id of existingIds) {
    if (!id || typeof id !== "string") continue;
    const match = id.trim().match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const result: string[] = [];
  for (let i = 1; i <= count; i++) {
    const num = maxNum + i;
    result.push(`${prefix}${num.toString().padStart(padLength, "0")}`);
  }
  return result;
}

export function getNextSequenceOfEvidenceIds(
  existingEvidenceIds: string[],
  count: number
): EvidenceEntryId[] {
  return getNextSequenceOfIds("EV-", existingEvidenceIds, count) as EvidenceEntryId[];
}

export function getNextSequenceOfSourceIds(
  existingSourceIds: string[],
  count: number
): SourceRecordId[] {
  return getNextSequenceOfIds("SRC-", existingSourceIds, count) as SourceRecordId[];
}

