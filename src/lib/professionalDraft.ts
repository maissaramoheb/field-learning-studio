import type { DemoCase, FieldStudy, DraftRecordKind, ProfessionalDraft, ProfessionalDraftItem } from "./types";
import { getLinkedFindingIds, isFindingExportEligible, isLessonExportEligible, isGoodPracticeExportEligible, isRecommendationExportEligible } from "./exportPolicy";

type DraftStudy = FieldStudy | DemoCase;
export const draftKinds: DraftRecordKind[] = ["findings", "lessons", "goodPractices", "recommendations"];

export function isProfessionalDraft(value: unknown): value is ProfessionalDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as ProfessionalDraft;
  return draft.formatVersion === 1 && Number.isSafeInteger(draft.revision) && draft.revision >= 0 &&
    Number.isFinite(draft.updatedAt) && typeof draft.manualExecutiveSummary === "string" &&
    Array.isArray(draft.manualKeyMessages) && draft.manualKeyMessages.every(text => typeof text === "string") &&
    Array.isArray(draft.items) && draft.items.every(item => item && draftKinds.includes(item.kind) &&
      typeof item.recordId === "string" && Boolean(item.recordId.trim()) && typeof item.label === "string" &&
      typeof item.snapshotText === "string" && typeof item.signature === "string" && Boolean(item.signature) && Number.isFinite(item.includedAt)) &&
    new Set(draft.items.map(item => `${item.kind}:${item.recordId}`)).size === draft.items.length;
}

export function createProfessionalDraft(study: DraftStudy): ProfessionalDraft {
  return { formatVersion: 1, revision: 0, items: [], manualExecutiveSummary: study.executiveSummary || "",
    manualKeyMessages: [...(study.keyMessages || [])], updatedAt: Date.now() };
}

export function isDraftRecordCurrent(study: DraftStudy, kind: DraftRecordKind, id: string): boolean {
  switch (kind) {
    case "findings": return study.findings.some(record => record.id === id && isFindingExportEligible(record, study));
    case "lessons": return study.lessons.some(record => record.id === id && isLessonExportEligible(record, study));
    case "goodPractices": return study.goodPractices.some(record => record.id === id && isGoodPracticeExportEligible(record, study));
    case "recommendations": return study.recommendations.some(record => record.id === id && isRecommendationExportEligible(record, study));
  }
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !["createdAt", "updatedAt", "audit", "studyId"].includes(key)).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
  return value;
}

function signature(study: DraftStudy, kind: DraftRecordKind, id: string): string {
  const record = study[kind].find(record => record.id === id);
  const parentIds = kind === "findings" ? [id] : record ? getLinkedFindingIds(record as { linkedFindingIds?: string[]; linkedFindingId?: string }) : [];
  const parents = study.findings.filter(f => parentIds.includes(f.id));
  const observationIds = [...new Set([...parents.flatMap(f => [...f.supportingEvidenceIds, ...(f.contradictoryEvidenceIds || []), ...(f.qualifyingEvidenceIds || [])]), ...(record && "evidenceBase" in record ? record.evidenceBase : [])])];
  const evidence = study.evidence.filter(e => observationIds.includes(e.id));
  const sources = study.sources.filter(s => evidence.some(e => e.sourceId === s.id));
  return JSON.stringify(stable({ record, parents, evidence, sources }));
}

export function captureDraftItem(study: DraftStudy, kind: DraftRecordKind, id: string): ProfessionalDraftItem {
  if (!isDraftRecordCurrent(study, kind, id)) throw new Error("Only current validated analytical outputs can be included or refreshed.");
  const record = study[kind].find(record => record.id === id)!;
  const label = "statement" in record ? record.statement : "recommendation" in record ? record.recommendation : record.title;
  const snapshotText = Object.entries(record).filter(([key, value]) => (typeof value === "string" || (Array.isArray(value) && value.every(item => typeof item === "string"))) && !["id", "studyId", "validationStatus", "lastValidatedBy"].includes(key)).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`).join("\n");
  return { kind, recordId: id, label, snapshotText, signature: signature(study, kind, id), includedAt: Date.now() };
}

/** Snapshot history stays stored; current authority is always derived from live records. */
export function assessProfessionalDraft(study: DraftStudy, draft = study.professionalDraft, fileAvailability?: Record<string, boolean>) {
  const items = draft?.items || [];
  const selections = items.map(item => {
    const exists = study[item.kind].some(record => record.id === item.recordId);
    const current = exists && isDraftRecordCurrent(study, item.kind, item.recordId);
    const changed = exists && item.signature !== signature(study, item.kind, item.recordId);
    const state = !exists ? "MISSING" : !current ? "NON-CURRENT" : changed ? "CHANGED SINCE INCLUSION" : "CURRENT";
    return { item, state, ready: current && !changed };
  });
  const validItems = selections.filter(selection => selection.ready).map(selection => selection.item);
  const findingIds = new Set(validItems.filter(item => item.kind === "findings").map(item => item.recordId));
  for (const item of validItems.filter(item => item.kind !== "findings")) {
    const child = study[item.kind].find(record => record.id === item.recordId)!;
    getLinkedFindingIds(child as { linkedFindingIds?: string[]; linkedFindingId?: string }).forEach(id => findingIds.add(id));
  }
  const parents = study.findings.filter(f => findingIds.has(f.id));
  const observationIds = new Set([...parents.flatMap(f => [...f.supportingEvidenceIds, ...(f.contradictoryEvidenceIds || []), ...(f.qualifyingEvidenceIds || [])]), ...validItems.flatMap(item => {
    const record = study[item.kind].find(record => record.id === item.recordId)!;
    return "evidenceBase" in record ? record.evidenceBase : [];
  })]);
  const evidence = study.evidence.filter(e => observationIds.has(e.id));
  const sources = study.sources.filter(s => evidence.some(e => e.sourceId === s.id));
  const files = [...new Set([...sources, ...evidence].map(record => record.sourceFileId).filter((id): id is NonNullable<typeof id> => Boolean(id)))];
  const missingFiles = files.filter(id => fileAvailability !== undefined && fileAvailability[id] !== true);
  const fileState = !files.length ? "UNAVAILABLE" : fileAvailability === undefined ? "NOT CHECKED" : missingFiles.length ? "NEEDS ATTENTION" : "CHECKED";
  const blockers = [...(!draft ? ["Professional Draft has not been saved."] : []), ...(!items.length ? ["No structured analytical outputs selected."] : []),
    ...selections.filter(selection => !selection.ready).map(selection => `${selection.item.recordId}: ${selection.state}`),
    ...(files.length && fileState !== "CHECKED" ? [`Original files: ${fileState}`] : [])];
  const unlinkedText = Boolean(draft?.manualExecutiveSummary.trim() || draft?.manualKeyMessages.some(text => text.trim()));
  return { selections, validItems, findingIds, files, missingFiles, fileState, blockers, unlinkedText,
    ready: blockers.length === 0, state: blockers.length ? "NEEDS ATTENTION" : "CHECKED" };
}

/** Use this at the professional download boundary; warnings still require human judgment. */
export function assertProfessionalExportReady(study: DraftStudy, fileAvailability?: Record<string, boolean>): void {
  const review = assessProfessionalDraft(study, study.professionalDraft, fileAvailability);
  if (!review.ready) throw new Error(`Professional export blocked: ${review.blockers.join("; ")}`);
}
