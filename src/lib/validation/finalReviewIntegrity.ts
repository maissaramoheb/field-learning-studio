import type { DemoCase, FieldStudy } from "@/lib/types";
import { getLinkedFindingIds, isFindingExportEligible, isRecommendationExportEligible, isLessonExportEligible, isGoodPracticeExportEligible } from "@/lib/exportPolicy";

/** Checks stored relationships/current policy only; never certifies analytical judgment. */
export function assessFinalReviewIntegrity(study: FieldStudy | DemoCase, fileAvailability?: Record<string, boolean>) {
  const evidence = new Map(study.evidence.map(e => [e.id, e]));
  const sources = new Set(study.sources.map(s => s.id));
  const findings = new Set<string>(study.findings.map(f => f.id));
  const brokenLinks = study.findings.flatMap(f => [...f.supportingEvidenceIds, ...(f.contradictoryEvidenceIds || []), ...(f.qualifyingEvidenceIds || [])].filter(id => !evidence.has(id) || !sources.has(evidence.get(id)!.sourceId)).map(id => `${f.id} → ${id}`));
  const children = [...study.lessons, ...study.goodPractices, ...study.recommendations];
  const brokenParents = children.filter(child => !getLinkedFindingIds(child).length || getLinkedFindingIds(child).some(id => !findings.has(id))).map(child => child.id);
  const currentFindings = study.findings.filter(f => isFindingExportEligible(f, study));
  const currentRecommendations = study.recommendations.filter(rec => isRecommendationExportEligible(rec, study));
  const nonCurrentOutputs = [...study.lessons.filter(l => !isLessonExportEligible(l, study)), ...study.goodPractices.filter(g => !isGoodPracticeExportEligible(g, study)), ...study.recommendations.filter(rec => !isRecommendationExportEligible(rec, study))].map(child => child.id);
  const files = [...new Set([...study.sources, ...study.evidence].map(record => record.sourceFileId).filter((id): id is NonNullable<typeof id> => Boolean(id)))];
  const missingFiles = files.filter(id => fileAvailability !== undefined && fileAvailability[id] !== true);
  const fileState = !files.length ? "UNAVAILABLE" : !fileAvailability ? "NOT CHECKED" : missingFiles.length ? "NEEDS ATTENTION" : "CHECKED";
  const unlinkedFreeText = Boolean(study.executiveSummary?.trim() || study.keyMessages?.some(text => text.trim()));
  return { brokenLinks, brokenParents, currentFindings, currentRecommendations, nonCurrentOutputs, files, missingFiles, fileState, unlinkedFreeText,
    lineageState: brokenLinks.length || brokenParents.length ? "NEEDS ATTENTION" : "CHECKED",
    authorityState: currentFindings.length !== study.findings.length || nonCurrentOutputs.length ? "NEEDS ATTENTION" : "CHECKED" };
}
