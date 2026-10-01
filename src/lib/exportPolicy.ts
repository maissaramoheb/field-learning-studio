import type { Finding, Recommendation, LessonLearned, GoodPractice, SourceRecord, EvidenceEntry } from "@/lib/types";
import { isEvidenceEligibleForAnalysis } from "@/lib/storage/normalization";

export interface CanonicalExportContext {
  sources?: SourceRecord[];
  evidence?: EvidenceEntry[];
  findings?: Finding[];
  isLegacyDemo?: boolean;
}

/** The array is canonical; the scalar is a compatibility fallback only. */
export function getLinkedFindingIds(record: { linkedFindingIds?: string[]; linkedFindingId?: string }): string[] {
  return [...new Set(record.linkedFindingIds?.length ? record.linkedFindingIds : record.linkedFindingId?.trim() ? [record.linkedFindingId.trim()] : [])];
}

function isCurrent(record: { id: string; validationStatus?: string; staleDependencyWarning?: string }, legacy: boolean): boolean {
  return !record.id.includes("SBX") && !record.id.includes("TEMP") &&
    (record.validationStatus ?? (legacy ? "Validated" : "Draft")) === "Validated" && !record.staleDependencyWarning?.trim();
}

export function isFindingExportEligible(finding: Finding, contextOrLegacyDemo?: CanonicalExportContext | boolean, maybeLegacyDemo = false): boolean {
  if (!finding?.id) return false;
  const context = typeof contextOrLegacyDemo === "object" ? contextOrLegacyDemo : undefined;
  const legacy = typeof contextOrLegacyDemo === "boolean" ? contextOrLegacyDemo : Boolean(context?.isLegacyDemo || maybeLegacyDemo);
  if (!isCurrent(finding, legacy) || finding.supersededByFindingId || finding.supersededAt) return false;
  if (!finding.supportingEvidenceIds?.length) return legacy && !context;
  const ids = [...finding.supportingEvidenceIds, ...(finding.contradictoryEvidenceIds || []), ...(finding.qualifyingEvidenceIds || [])];
  if (new Set(ids).size !== ids.length) return false;
  if (context?.evidence) {
    const evidence = new Map(context.evidence.map(e => [e.id, e]));
    const sources = context.sources ? new Set(context.sources.map(s => s.id)) : undefined;
    return ids.every(id => {
      const ev = evidence.get(id);
      return Boolean(ev && isEvidenceEligibleForAnalysis(ev) && !ev.staleDependencyWarning?.trim() && ev.sourceId && (!sources || sources.has(ev.sourceId)) && (!finding.studyId || !ev.studyId || finding.studyId === ev.studyId));
    });
  }
  // Compatibility-only status check. Active output callers supply the full study context.
  return true;
}

export function isRecommendationExportEligible(recommendation: Recommendation, contextOrFindings?: CanonicalExportContext | Finding[] | Finding, maybeLegacyDemo = false): boolean {
  if (!recommendation?.id) return false;
  const context: CanonicalExportContext = Array.isArray(contextOrFindings) ? { findings: contextOrFindings, isLegacyDemo: maybeLegacyDemo }
    : contextOrFindings && "statement" in contextOrFindings ? { findings: [contextOrFindings], isLegacyDemo: maybeLegacyDemo }
    : contextOrFindings || {};
  if (!isCurrent(recommendation, Boolean(context.isLegacyDemo || maybeLegacyDemo))) return false;
  if (!areParentsCurrent(recommendation, context)) return false;
  return !context.evidence || (recommendation.evidenceBase || []).every(id => {
    const ev = context.evidence!.find(e => e.id === id);
    return Boolean(ev && isEvidenceEligibleForAnalysis(ev) && !ev.staleDependencyWarning?.trim() && (!context.sources || context.sources.some(source => source.id === ev.sourceId)));
  });
}

function areParentsCurrent(record: { linkedFindingIds?: string[]; linkedFindingId?: string; studyId?: string }, context?: CanonicalExportContext): boolean {
  const ids = getLinkedFindingIds(record);
  if (!ids.length || !context?.findings) return false;
  return ids.every(id => {
    const parent = context.findings!.find(f => f.id === id);
    return Boolean(parent && (!record.studyId || !parent.studyId || parent.studyId === record.studyId) && isFindingExportEligible(parent, context));
  });
}

export function getRecommendationDependencyWarning(recommendation: Recommendation, linkedFinding?: Finding, context?: CanonicalExportContext): string | null {
  const fullContext = context ?? { findings: linkedFinding ? [linkedFinding] : [] };
  for (const id of getLinkedFindingIds(recommendation)) {
    const parent = fullContext.findings?.find(f => f.id === id);
    if (!parent) return "Linked Finding not found";
    if (context && parent.staleDependencyWarning?.trim()) return parent.staleDependencyWarning;
    if (parent.validationStatus !== "Validated") return "Linked Finding requires re-validation";
    if (parent.supersededByFindingId || parent.supersededAt) return "Linked Finding is superseded and remains historical";
    if (!isFindingExportEligible(parent, fullContext)) return "A linked Finding requires review before this output can be used.";
  }
  return getLinkedFindingIds(recommendation).length ? null : "Linked Finding not found";

}

function isDerivedOutputEligible(record: LessonLearned | GoodPractice, contextOrLegacyDemo?: CanonicalExportContext | boolean, maybeLegacyDemo = false): boolean {
  if (!record?.id) return false;
  const context = typeof contextOrLegacyDemo === "object" ? contextOrLegacyDemo : undefined;
  const legacy = typeof contextOrLegacyDemo === "boolean" ? contextOrLegacyDemo : Boolean(context?.isLegacyDemo || maybeLegacyDemo);
  if (!isCurrent(record, legacy)) return false;
  if (!context && legacy) return true; // Historical showcase status-only inspection.
  if (!areParentsCurrent(record, context)) return false;
  return (record.evidenceBase || []).every(id => {
    const ev = context?.evidence?.find(e => e.id === id);
    return Boolean(ev && isEvidenceEligibleForAnalysis(ev) && !ev.staleDependencyWarning?.trim());
  });
}
export function isLessonExportEligible(lesson: LessonLearned, context?: CanonicalExportContext | boolean, legacy = false): boolean {
  return isDerivedOutputEligible(lesson, context, legacy);
}
export function isGoodPracticeExportEligible(practice: GoodPractice, context?: CanonicalExportContext | boolean, legacy = false): boolean {
  return isDerivedOutputEligible(practice, context, legacy);
}
