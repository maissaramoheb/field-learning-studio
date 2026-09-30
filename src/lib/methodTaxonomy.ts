import type { CollectionMethod } from "./types";

export const STANDARD_COLLECTION_METHODS: CollectionMethod[] = [
  "Key Informant Interview",
  "Focus Group Discussion",
  "Direct Observation",
  "Document Review",
  "Community Meeting",
  "Survey / Questionnaire",
];

const KNOWN_METHOD_ALIASES: Record<string, CollectionMethod> = {
  // Key Informant Interview
  "kii": "Key Informant Interview",
  "key informant interview": "Key Informant Interview",
  "key informant interviews": "Key Informant Interview",
  "interview": "Key Informant Interview",
  "interviews": "Key Informant Interview",
  "semi-structured interview": "Key Informant Interview",
  "in-depth interview": "Key Informant Interview",

  // Focus Group Discussion
  "fgd": "Focus Group Discussion",
  "fgds": "Focus Group Discussion",
  "focus group discussion": "Focus Group Discussion",
  "focus group discussions": "Focus Group Discussion",
  "focus group": "Focus Group Discussion",
  "focus groups": "Focus Group Discussion",
  "group discussion": "Focus Group Discussion",

  // Direct Observation
  "direct observation": "Direct Observation",
  "direct observations": "Direct Observation",
  "observation": "Direct Observation",
  "observations": "Direct Observation",
  "observation notes": "Direct Observation",
  "field observation log": "Direct Observation",
  "observation of activity": "Direct Observation",
  "site observation": "Direct Observation",
  "structured observation": "Direct Observation",

  // Survey / Questionnaire
  "survey": "Survey / Questionnaire",
  "surveys": "Survey / Questionnaire",
  "questionnaire": "Survey / Questionnaire",
  "questionnaires": "Survey / Questionnaire",
  "survey / questionnaire": "Survey / Questionnaire",
  "structured survey": "Survey / Questionnaire",
  "household survey": "Survey / Questionnaire",

  // Document Review
  "document review": "Document Review",
  "document": "Document Review",
  "desk review": "Document Review",
  "literature review": "Document Review",
  "document analysis": "Document Review",

  // Community Meeting
  "community meeting": "Community Meeting",
  "community meetings": "Community Meeting",
  "town hall": "Community Meeting",
  "public meeting": "Community Meeting",
  "community assembly": "Community Meeting",
};

/**
 * Normalizes a raw method or sourceType string into a canonical collection method name.
 * 
 * Rules:
 * - Trims whitespace and handles case-insensitivity.
 * - Resolves known standard abbreviations (KII, FGD) and observational variants.
 * - Preserves specific non-standard methods (e.g. "Monitoring record", "Meeting minutes")
 *   as their clean trimmed string without making unfounded assumptions.
 * - Returns "Unclassified" if value is empty or undefined.
 */
export function canonicalizeCollectionMethod(rawType?: string | null): string {
  if (!rawType) return "Unclassified";
  const trimmed = rawType.trim();
  if (!trimmed) return "Unclassified";

  const lower = trimmed.toLowerCase();
  if (KNOWN_METHOD_ALIASES[lower]) {
    return KNOWN_METHOD_ALIASES[lower];
  }

  // Exact match against standard collection methods (case-insensitive check)
  const standardMatch = STANDARD_COLLECTION_METHODS.find(
    (m) => m.toLowerCase() === lower
  );
  if (standardMatch) {
    return standardMatch;
  }

  // Return original trimmed string for non-standard or emergent methods
  return trimmed;
}

/**
 * Checks whether a given method is one of the recognized standard methodology types.
 */
export function isStandardCollectionMethod(method: string): method is CollectionMethod {
  return STANDARD_COLLECTION_METHODS.includes(method as CollectionMethod);
}

/**
 * Returns the planned source collection target, falling back to legacy plannedCount if targetSourceCount is not set.
 */
export function getPlannedTargetSourceCount(target: {
  targetSourceCount?: number;
  plannedCount?: number;
}): number {
  return target.targetSourceCount ?? target.plannedCount ?? 0;
}

