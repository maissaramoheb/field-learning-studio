import type { SourceRecord } from "@/lib/types";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateReason?: string;
  matchedSourceId?: string;
  matchType?: "exact_title_date" | "exact_narrative";
}

/**
 * Normalizes text for deterministic comparison (lowercasing, collapsing whitespace, trimming).
 */
export function normalizeTextForComparison(text?: string): string {
  if (!text) return "";
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Deterministically checks whether a candidate source record duplicates an existing source
 * or another source in the same import batch.
 */
export function checkSourceDuplicate(
  candidate: {
    title: string;
    date: string;
    rawText?: string;
    summary?: string;
  },
  existingSources: SourceRecord[]
): DuplicateCheckResult {
  const normCandidateTitle = normalizeTextForComparison(candidate.title);
  const normCandidateDate = (candidate.date || "").trim();
  const candidateNarrative = normalizeTextForComparison(
    candidate.rawText || candidate.summary
  );

  for (const existing of existingSources) {
    const normExistingTitle = normalizeTextForComparison(existing.title);
    const normExistingDate = (existing.date || "").trim();
    const existingNarrative = normalizeTextForComparison(
      existing.rawText || existing.summary
    );

    // 1. Same Title + Same Date
    if (
      normCandidateTitle &&
      normCandidateTitle === normExistingTitle &&
      normCandidateDate &&
      normCandidateDate === normExistingDate
    ) {
      return {
        isDuplicate: true,
        duplicateReason: `Matches existing source "${existing.title}" (${existing.id}) on ${existing.date}`,
        matchedSourceId: existing.id,
        matchType: "exact_title_date",
      };
    }

    // 2. Exact Narrative match (if narrative is substantial: >= 40 chars)
    if (
      candidateNarrative.length >= 40 &&
      candidateNarrative === existingNarrative
    ) {
      return {
        isDuplicate: true,
        duplicateReason: `Identical narrative text to existing source "${existing.title}" (${existing.id})`,
        matchedSourceId: existing.id,
        matchType: "exact_narrative",
      };
    }
  }

  return { isDuplicate: false };
}
