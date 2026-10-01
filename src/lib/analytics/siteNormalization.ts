import type { EvidenceEntry, SourceRecord } from "@/lib/types";

/** Resolve a known label to its unique stored site ID; never guess ambiguous aliases. */
export function canonicalizeSite(value: string | undefined, sources: SourceRecord[]): string {
  const text = value?.trim() || "";
  const ids = new Set(sources.filter(s => s.location?.trim().toLowerCase() === text.toLowerCase() && s.siteId?.trim()).map(s => s.siteId!.trim()));
  return ids.size === 1 ? [...ids][0] : text;
}
export function evidenceSite(evidence: EvidenceEntry, source: SourceRecord | undefined, sources: SourceRecord[]): string {
  return canonicalizeSite(evidence.siteId || source?.siteId || source?.location, sources);
}
