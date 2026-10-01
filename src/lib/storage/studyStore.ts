import { getDb } from "./indexedDb";
import { demoCases } from "@/data/cases";
import { adaptDemoCaseToFieldStudy } from "./demoStudyAdapter";
import {
  assertEvidenceSourceIntegrity,
  assertFindingEvidenceIntegrity,
  assertRecommendationFindingIntegrity,
  assertLessonEvidenceIntegrity,
  assertGoodPracticeEvidenceIntegrity,
  cascadeEvidenceInvalidationToFindings,
  cascadeFindingInvalidationToOutputs,
  assertCurrentFindingParents,
  assertNewFindingEvidenceAdmissibility,
  assertFindingEvidenceApprovalIntegrity,
} from "./integrity";
import { isProfessionalDraft } from "@/lib/professionalDraft";
import { applySubstantiveRecommendationEdit } from "@/lib/validation/validationLifecycle";
import { getLinkedFindingIds, isLessonExportEligible, isGoodPracticeExportEligible, isRecommendationExportEligible } from "@/lib/exportPolicy";
import { isSubstantiveEvidenceChange, applySubstantiveFindingEdit, isSubstantiveSourceChange } from "@/lib/validation/validationLifecycle";
import {
  normalizeSourceRecord,
  normalizeEvidenceEntry,
  normalizeDailyDebrief,
  normalizeFinding,
  normalizeLessonLearned,
  normalizeGoodPractice,
  normalizeRecommendation,
  isEvidenceEligibleForAnalysis,
} from "./normalization";
import type {
  StudyId,
  StudyMeta,
  StudyQuestion,
  PatternNote,
  SourceRecord,
  SourceRecordId,
  EvidenceEntry,
  EvidenceEntryId,
  DailyDebrief,
  DailyDebriefId,
  Finding,
  FindingId,
  LessonLearned,
  LessonLearnedId,
  GoodPractice,
  GoodPracticeId,
  Recommendation,
  ProfessionalDraft,
  RecommendationId,
  FieldStudy,
  FrameworkTheme,
  PlannedMethodTarget,
  StudyRoleAssignment,
  StudyScopeConfig,
} from "@/lib/types";

// ============================================================================
// Study Meta Operations
// ============================================================================

export async function listStudies(): Promise<StudyMeta[]> {
  const db = await getDb();
  return db.getAll("studies");
}

export async function getStudyMeta(studyId: StudyId): Promise<StudyMeta | undefined> {
  const db = await getDb();
  return db.get("studies", studyId);
}

export async function saveStudyMeta(study: StudyMeta): Promise<void> {
  const db = await getDb();
  // Strip any accidental child collections to prevent stale child data duplication
  const pureMeta = { ...(study as unknown as Record<string, unknown>) };
  delete pureMeta.sources;
  delete pureMeta.evidence;
  delete pureMeta.debriefs;
  delete pureMeta.findings;
  delete pureMeta.lessons;
  delete pureMeta.goodPractices;
  delete pureMeta.recommendations;
  const tx = db.transaction("studies", "readwrite");
  const latest = await tx.store.get(study.id);
  // Dedicated draft saves own this field. Ordinary metadata edits cannot overwrite it.
  if (latest?.professionalDraft) pureMeta.professionalDraft = latest.professionalDraft;
  await tx.store.put(pureMeta as unknown as StudyMeta);
  await tx.done;
}

/** Atomic metadata patch with optimistic draft revision protection. */
export async function saveProfessionalDraft(studyId: StudyId, draft: ProfessionalDraft): Promise<ProfessionalDraft> {
  if (!isProfessionalDraft(draft)) throw new Error("Invalid Professional Draft structure.");
  const db = await getDb();
  const tx = db.transaction("studies", "readwrite");
  const latest = await tx.store.get(studyId);
  const conflict = !latest ? "Study not found." : latest.isDemoCase ? "Clone the showcase study before saving a draft." :
    (latest.professionalDraft?.revision ?? 0) !== draft.revision ? "Professional Draft changed in another view. Reload before saving." : null;
  if (conflict) { tx.abort(); await tx.done.catch(() => undefined); throw new Error(conflict); }
  const saved = { ...draft, revision: draft.revision + 1, updatedAt: Date.now() };
  await tx.store.put({ ...latest!, professionalDraft: saved, updatedAt: Date.now() });
  await tx.done;
  return saved;
}

export async function saveStudyScopeConfig(
  studyId: StudyId,
  scope: StudyScopeConfig
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);
  await saveStudyMeta({
    ...meta,
    scope,
    updatedAt: Date.now(),
  });
}

export async function saveStudyQuestion(
  studyId: StudyId,
  question: StudyQuestion
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);
  const questions = meta.questions ? [...meta.questions] : [];
  const idx = questions.findIndex((q) => q.id === question.id);
  if (idx >= 0) {
    questions[idx] = { ...question, updatedAt: Date.now() };
  } else {
    questions.push({
      ...question,
      createdAt: question.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    });
  }
  await saveStudyMeta({
    ...meta,
    questions,
    updatedAt: Date.now(),
  });
}

export async function getStudyQuestionUsage(
  studyId: StudyId,
  questionId: string
): Promise<{
  isUsed: boolean;
  evidenceCount: number;
  findingsCount: number;
  patternNotesCount: number;
  totalUsageCount: number;
}> {
  const meta = await getStudyMeta(studyId);
  const evidenceList = await listEvidence(studyId);
  const findingsList = await listFindings(studyId);
  const patternNotes = meta?.patternNotes || [];

  const evidenceCount = evidenceList.filter(
    (e) => e.studyQuestionIds && e.studyQuestionIds.includes(questionId)
  ).length;

  const findingsCount = findingsList.filter(
    (f) => f.studyQuestionId === questionId
  ).length;

  const patternNotesCount = patternNotes.filter(
    (p) => p.questionId === questionId
  ).length;

  const totalUsageCount = evidenceCount + findingsCount + patternNotesCount;

  return {
    isUsed: totalUsageCount > 0,
    evidenceCount,
    findingsCount,
    patternNotesCount,
    totalUsageCount,
  };
}

export async function archiveStudyQuestion(
  studyId: StudyId,
  questionId: string,
  isActive: boolean = false
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);

  const questions = (meta.questions || []).map((q) =>
    q.id === questionId ? { ...q, isActive, updatedAt: Date.now() } : q
  );

  await saveStudyMeta({
    ...meta,
    questions,
    updatedAt: Date.now(),
  });
}

export async function deleteStudyQuestion(
  studyId: StudyId,
  questionId: string
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);

  const usage = await getStudyQuestionUsage(studyId, questionId);
  if (usage.isUsed) {
    throw new Error(
      `This Study Question is already used by evidence or analysis and cannot be deleted. Archive it instead to preserve study lineage.`
    );
  }

  const questions = (meta.questions || []).filter((q) => q.id !== questionId);
  await saveStudyMeta({
    ...meta,
    questions,
    updatedAt: Date.now(),
  });
}

export async function reorderStudyQuestions(
  studyId: StudyId,
  questionIds: string[]
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);
  const existingMap = new Map((meta.questions || []).map((q) => [q.id, q]));
  const reordered: StudyQuestion[] = [];
  questionIds.forEach((id, idx) => {
    const q = existingMap.get(id);
    if (q) {
      reordered.push({ ...q, order: idx + 1, updatedAt: Date.now() });
      existingMap.delete(id);
    }
  });
  existingMap.forEach((q) => {
    reordered.push({ ...q, order: reordered.length + 1 });
  });
  await saveStudyMeta({
    ...meta,
    questions: reordered,
    updatedAt: Date.now(),
  });
}

export async function savePlannedMethod(
  studyId: StudyId,
  target: PlannedMethodTarget
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);
  const scope = meta.scope ? { ...meta.scope } : {
    targetSites: [],
    isSingleSiteStudy: false,
    targetStakeholderGroups: [],
  };
  const currentMethods = scope.plannedMethods ? [...scope.plannedMethods] : [];
  const idx = currentMethods.findIndex(
    (m) => m.method.toLowerCase() === target.method.toLowerCase()
  );
  const normalizedTarget: PlannedMethodTarget = {
    ...target,
    targetSourceCount: target.targetSourceCount ?? target.plannedCount ?? 0,
    plannedCount: target.targetSourceCount ?? target.plannedCount ?? 0,
  };
  if (idx >= 0) {
    currentMethods[idx] = normalizedTarget;
  } else {
    currentMethods.push(normalizedTarget);
  }
  scope.plannedMethods = currentMethods;
  await saveStudyMeta({
    ...meta,
    scope,
    updatedAt: Date.now(),
  });
}

export async function deletePlannedMethod(
  studyId: StudyId,
  methodName: string
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);
  if (!meta.scope) return;
  const scope = { ...meta.scope };
  scope.plannedMethods = (scope.plannedMethods || []).filter(
    (m) => m.method.toLowerCase() !== methodName.toLowerCase()
  );
  await saveStudyMeta({
    ...meta,
    scope,
    updatedAt: Date.now(),
  });
}

export async function saveFrameworkTheme(
  studyId: StudyId,
  theme: FrameworkTheme
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);
  const framework = meta.framework
    ? { ...meta.framework, themes: [...(meta.framework.themes || [])] }
    : { themes: [] };
  const idx = framework.themes.findIndex((t) => t.id === theme.id);
  if (idx >= 0) {
    framework.themes[idx] = theme;
  } else {
    framework.themes.push({
      ...theme,
      order: theme.order ?? framework.themes.length + 1,
    });
  }
  await saveStudyMeta({
    ...meta,
    framework,
    updatedAt: Date.now(),
  });
}

export async function deleteFrameworkTheme(
  studyId: StudyId,
  themeId: string
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);
  if (!meta.framework) return;
  const framework = {
    ...meta.framework,
    themes: (meta.framework.themes || []).filter((t) => t.id !== themeId),
  };
  await saveStudyMeta({
    ...meta,
    framework,
    updatedAt: Date.now(),
  });
}

export async function reorderFrameworkThemes(
  studyId: StudyId,
  themeIds: string[]
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);
  if (!meta.framework) return;
  const existingMap = new Map((meta.framework.themes || []).map((t) => [t.id, t]));
  const reordered: FrameworkTheme[] = [];
  themeIds.forEach((id, idx) => {
    const t = existingMap.get(id);
    if (t) {
      reordered.push({ ...t, order: idx + 1 });
      existingMap.delete(id);
    }
  });
  existingMap.forEach((t) => {
    reordered.push({ ...t, order: reordered.length + 1 });
  });
  await saveStudyMeta({
    ...meta,
    framework: {
      ...meta.framework,
      themes: reordered,
    },
    updatedAt: Date.now(),
  });
}

export async function saveStudyRole(
  studyId: StudyId,
  roleAssignment: StudyRoleAssignment
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);
  const roles = meta.teamRoles ? [...meta.teamRoles] : [];
  const idx = roles.findIndex((r) => r.id === roleAssignment.id);
  if (idx >= 0) {
    roles[idx] = { ...roleAssignment, assignedAt: roleAssignment.assignedAt ?? Date.now() };
  } else {
    roles.push({ ...roleAssignment, assignedAt: roleAssignment.assignedAt ?? Date.now() });
  }
  await saveStudyMeta({
    ...meta,
    teamRoles: roles,
    updatedAt: Date.now(),
  });
}

export async function deleteStudyRole(
  studyId: StudyId,
  roleAssignmentId: string
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);
  const roles = (meta.teamRoles || []).filter((r) => r.id !== roleAssignmentId);
  await saveStudyMeta({
    ...meta,
    teamRoles: roles,
    updatedAt: Date.now(),
  });
}

export async function savePatternNote(
  studyId: StudyId,
  pattern: PatternNote
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);
  const notes = meta.patternNotes ? [...meta.patternNotes] : [];
  const idx = notes.findIndex((p) => p.id === pattern.id);
  for (const id of pattern.evidenceIds) {
    const ev = await getEvidence(studyId, id);
    if (!ev) throw new Error(`Pattern references missing evidence "${id}".`);
    if (!notes[idx]?.evidenceIds.includes(id) && !isEvidenceEligibleForAnalysis(ev)) throw new Error(`Pattern evidence "${id}" is not qualified for analytical use.`);
  }
  if (idx >= 0) {
    notes[idx] = { ...pattern, updatedAt: Date.now() };
  } else {
    notes.push({
      ...pattern,
      createdAt: pattern.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    });
  }
  await saveStudyMeta({
    ...meta,
    patternNotes: notes,
    updatedAt: Date.now(),
  });
}

export async function deletePatternNote(
  studyId: StudyId,
  patternId: string
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);
  const notes = (meta.patternNotes || []).filter((p) => p.id !== patternId);
  await saveStudyMeta({
    ...meta,
    patternNotes: notes,
    updatedAt: Date.now(),
  });
}

export async function bulkAssignEvidenceToQuestion(studyId: StudyId, evidenceIds: EvidenceEntryId[], questionId: string): Promise<void> {
  const updates = (await listEvidence(studyId)).filter(e => evidenceIds.includes(e.id) && !e.studyQuestionIds?.includes(questionId)).map(e => ({ ...e, studyId, studyQuestionIds: [...(e.studyQuestionIds || []), questionId] }));
  await saveEvidenceBatch(updates);
}

export async function bulkAssignEvidenceTheme(studyId: StudyId, evidenceIds: EvidenceEntryId[], theme: string): Promise<void> {
  const updates = (await listEvidence(studyId)).filter(e => evidenceIds.includes(e.id) && e.primaryTheme !== theme).map(e => ({ ...e, studyId, primaryTheme: theme }));
  await saveEvidenceBatch(updates);
}

export async function deleteStudy(studyId: StudyId): Promise<void> {
  const db = await getDb();
  const meta = await db.get("studies", studyId);
  if (!meta) {
    return;
  }
  if (meta.isDemoCase) {
    throw new Error(
      `Cannot delete demo template study "${studyId}". Demo cases are read-only.`
    );
  }

  const tx = db.transaction(
    [
      "studies",
      "sources",
      "evidence",
      "debriefs",
      "findings",
      "lessons",
      "goodPractices",
      "recommendations",
      "sourceFileMetadata",
      "sourceFileContent",
    ],
    "readwrite"
  );

  const childStores = [
    "sources",
    "evidence",
    "debriefs",
    "findings",
    "lessons",
    "goodPractices",
    "recommendations",
    "sourceFileMetadata",
    "sourceFileContent",
  ] as const;

  for (const storeName of childStores) {
    const store = tx.objectStore(storeName);
    const keys = await store.index("by_study").getAllKeys(studyId);
    for (const key of keys) {
      await store.delete(key);
    }
  }

  await tx.objectStore("studies").delete(studyId);
  await tx.done;
}

// ============================================================================
// Source Operations
// ============================================================================

export async function saveSource(
  source: SourceRecord & { studyId: StudyId },
  options?: { isCreate?: boolean }
): Promise<void> {
  if (!source.studyId || !source.studyId.trim()) {
    throw new Error("Source is missing required studyId.");
  }
  const db = await getDb();
  if (options?.isCreate) {
    const existing = await db.get("sources", [source.studyId, source.id]);
    if (existing) {
      throw new Error(
        `ID collision: A Source with ID "${source.id}" already exists in Study "${source.studyId}". Creation cannot overwrite existing records.`
      );
    }
  }
  const normalized = normalizeSourceRecord(source, false);
  const previous = await db.get("sources", [source.studyId, source.id]);
  if (previous && isSubstantiveSourceChange(previous, normalized)) {
    for (const ev of await db.getAllFromIndex("evidence", "by_source", [source.studyId, source.id])) {
      await cascadeEvidenceInvalidationToFindings(db, source.studyId, ev.id, "Source method, context, or provenance changed after review. Review the linked material again.");
    }
  }
  await db.put("sources", normalized as SourceRecord & { studyId: StudyId });
}

export async function saveSourceBatch(
  sourcesOrStudyId: (SourceRecord & { studyId: StudyId })[] | StudyId,
  maybeSources?: SourceRecord[]
): Promise<void> {
  const sources: (SourceRecord & { studyId: StudyId })[] =
    typeof sourcesOrStudyId === "string"
      ? (maybeSources || []).map((s) => ({ ...s, studyId: sourcesOrStudyId }))
      : sourcesOrStudyId;
  if (sources.length === 0) return;

  const seenSourceIds = new Set<string>();
  const dupSourceIds: string[] = [];
  for (const src of sources) {
    if (!src.studyId || !src.studyId.trim()) {
      throw new Error("Source is missing required studyId.");
    }
    if (seenSourceIds.has(src.id)) {
      dupSourceIds.push(src.id);
    }
    seenSourceIds.add(src.id);
  }
  if (dupSourceIds.length > 0) {
    throw new Error(
      `Batch mutation rejected: Duplicate Source IDs found in batch: ${dupSourceIds.join(", ")}`
    );
  }

  const db = await getDb();
  for (const src of sources) {
    const previous = await db.get("sources", [src.studyId, src.id]);
    if (previous && isSubstantiveSourceChange(previous, src)) {
      for (const ev of await db.getAllFromIndex("evidence", "by_source", [src.studyId, src.id])) await cascadeEvidenceInvalidationToFindings(db, src.studyId, ev.id, "Source context or provenance changed after review.");
    }
  }
  const tx = db.transaction("sources", "readwrite");
  for (const src of sources) await tx.objectStore("sources").put(normalizeSourceRecord(src, false) as SourceRecord & { studyId: StudyId });
  await tx.done;

}

export async function getSource(
  studyId: StudyId,
  sourceId: SourceRecordId
): Promise<SourceRecord | undefined> {
  const db = await getDb();
  return db.get("sources", [studyId, sourceId]);
}

export async function listSources(studyId: StudyId): Promise<SourceRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex("sources", "by_study", studyId);
}

export async function deleteSource(
  studyId: StudyId,
  sourceId: SourceRecordId
): Promise<void> {
  const db = await getDb();
  const evidenceList = await listEvidence(studyId);
  const dependentEvidence = evidenceList.filter((e) => e.sourceId === sourceId);
  if (dependentEvidence.length > 0) {
    throw new Error(
      `Cannot delete Source "${sourceId}": ${dependentEvidence.length} Evidence entry/entries currently depend on this Source. Deleting a parent Source while dependent Evidence exists would create invalid orphan claims. Remove or reassign the dependent Evidence first.`
    );
  }
  await db.delete("sources", [studyId, sourceId]);
}

// ============================================================================
// Evidence Operations
// ============================================================================

export async function saveEvidence(
  evidence: EvidenceEntry & { studyId: StudyId },
  options?: { isCreate?: boolean }
): Promise<void> {
  if (!evidence.studyId || !evidence.studyId.trim()) {
    throw new Error("Evidence is missing required studyId.");
  }
  const db = await getDb();
  if (options?.isCreate) {
    const existing = await db.get("evidence", [evidence.studyId, evidence.id]);
    if (existing) {
      throw new Error(
        `ID collision: An Evidence entry with ID "${evidence.id}" already exists in Study "${evidence.studyId}". Creation cannot overwrite existing records.`
      );
    }
  }
  evidence = normalizeEvidenceEntry(evidence, false) as EvidenceEntry & { studyId: StudyId };
  await assertEvidenceSourceIntegrity(db, evidence.studyId, evidence);

  // If this evidence was previously validated and is now being downgraded or substantively edited
  const existing = await db.get("evidence", [evidence.studyId, evidence.id]);
  if (existing) {
    const isSubstantive = isSubstantiveEvidenceChange(existing, evidence);
    if (existing.validationStatus !== evidence.validationStatus || isSubstantive) {
      if (isSubstantive && existing.validationStatus === "Validated" && evidence.validationStatus === "Validated") {
        evidence.validationStatus = "Needs Review";
        evidence.previousValidationStatus = "Validated";
        evidence.revision = (existing.revision ?? 1) + 1;
      }
      await cascadeEvidenceInvalidationToFindings(db, evidence.studyId, evidence.id);
    }
  }

  const normalized = normalizeEvidenceEntry(evidence, false);
  await db.put("evidence", normalized as EvidenceEntry & { studyId: StudyId });
}

export async function saveEvidenceBatch(
  evidenceOrStudyId: (EvidenceEntry & { studyId: StudyId })[] | StudyId,
  maybeEvidence?: EvidenceEntry[]
): Promise<void> {
  const evidenceList: (EvidenceEntry & { studyId: StudyId })[] =
    typeof evidenceOrStudyId === "string"
      ? (maybeEvidence || []).map((e) => ({ ...e, studyId: evidenceOrStudyId }))
      : evidenceOrStudyId;
  for (let i = 0; i < evidenceList.length; i++) evidenceList[i] = normalizeEvidenceEntry(evidenceList[i], false) as EvidenceEntry & { studyId: StudyId };
  if (evidenceList.length === 0) return;

  const seenEvidenceIds = new Set<string>();
  const dupEvidenceIds: string[] = [];
  for (const ev of evidenceList) {
    if (!ev.studyId || !ev.studyId.trim()) {
      throw new Error("Evidence is missing required studyId.");
    }
    if (seenEvidenceIds.has(ev.id)) {
      dupEvidenceIds.push(ev.id);
    }
    seenEvidenceIds.add(ev.id);
  }
  if (dupEvidenceIds.length > 0) {
    throw new Error(
      `Batch mutation rejected: Duplicate Evidence IDs found in batch: ${dupEvidenceIds.join(", ")}`
    );
  }

  const db = await getDb();

  for (const ev of evidenceList) {
    await assertEvidenceSourceIntegrity(db, ev.studyId, ev);
  }

  const cascadeEvidenceIds: { studyId: StudyId; id: EvidenceEntryId }[] = [];

  for (const ev of evidenceList) {
    const existing = await db.get("evidence", [ev.studyId, ev.id]);
    if (existing) {
      const isSubstantive = isSubstantiveEvidenceChange(existing, ev);
      if (existing.validationStatus !== ev.validationStatus || isSubstantive) {
        if (isSubstantive && existing.validationStatus === "Validated" && ev.validationStatus === "Validated") {
          ev.validationStatus = "Needs Review";
          ev.previousValidationStatus = "Validated";
          ev.revision = (existing.revision ?? 1) + 1;
        }
        cascadeEvidenceIds.push({ studyId: ev.studyId, id: ev.id });
      }
    }
  }

  for (const item of cascadeEvidenceIds) {
    await cascadeEvidenceInvalidationToFindings(db, item.studyId, item.id);
  }

  const tx = db.transaction("evidence", "readwrite");
  const store = tx.objectStore("evidence");
  for (const ev of evidenceList) {
    const normalized = normalizeEvidenceEntry(ev, false);
    store.put(normalized as EvidenceEntry & { studyId: StudyId });
  }
  await tx.done;


}

/**
 * Atomically commits a confirmed batch of sources and evidence records
 * within a single multi-store IndexedDB transaction (["sources", "evidence"]).
 * If any write fails, neither set is partially persisted.
 */
export async function saveSourceAndEvidenceBatch(
  studyId: StudyId,
  sources: SourceRecord[],
  evidence: EvidenceEntry[]
): Promise<void> {
  if (!studyId || !studyId.trim()) {
    throw new Error("Cannot save batch: Study ID is required.");
  }
  if (sources.length === 0 && evidence.length === 0) return;

  // Validate duplicate source IDs within batch
  const seenSourceIds = new Set<string>();
  for (const src of sources) {
    if (seenSourceIds.has(src.id)) {
      throw new Error(`Batch mutation rejected: Duplicate Source ID "${src.id}" found in batch.`);
    }
    seenSourceIds.add(src.id);
  }

  // Validate duplicate evidence IDs within batch
  const seenEvidenceIds = new Set<string>();
  for (const ev of evidence) {
    if (seenEvidenceIds.has(ev.id)) {
      throw new Error(`Batch mutation rejected: Duplicate Evidence ID "${ev.id}" found in batch.`);
    }
    seenEvidenceIds.add(ev.id);
  }

  const db = await getDb();

  // Validate that every evidence item points to an existing source in DB or within this batch
  for (const ev of evidence) {
    if (!ev.sourceId || !ev.sourceId.trim()) {
      throw new Error(`Evidence "${ev.id}" is missing required sourceId.`);
    }
    if (!seenSourceIds.has(ev.sourceId)) {
      const existingSource = await db.get("sources", [studyId, ev.sourceId]);
      if (!existingSource) {
        throw new Error(
          `Integrity Violation: Evidence "${ev.id}" references sourceId "${ev.sourceId}" which does not exist in study "${studyId}".`
        );
      }
    }
  }

  const tx = db.transaction(["sources", "evidence"], "readwrite");
  const sourceStore = tx.objectStore("sources");
  const evidenceStore = tx.objectStore("evidence");

  try {
    const conflicts: string[] = [];
    for (const src of sources) if (await sourceStore.get([studyId, src.id])) conflicts.push(src.id);
    for (const ev of evidence) if (await evidenceStore.get([studyId, ev.id])) conflicts.push(ev.id);
    if (conflicts.length) throw new Error(`Import collision: records already exist in this study: ${conflicts.join(", ")}. No records were overwritten.`);
    for (const ev of evidence) {
      if (!seenSourceIds.has(ev.sourceId) && !await sourceStore.get([studyId, ev.sourceId])) throw new Error(`Import rejected: source "${ev.sourceId}" no longer exists in this study.`);
    }
    for (const src of sources) await sourceStore.add(normalizeSourceRecord({ ...src, studyId }, false) as SourceRecord & { studyId: StudyId });
    for (const ev of evidence) await evidenceStore.add(normalizeEvidenceEntry({ ...ev, studyId }, false) as EvidenceEntry & { studyId: StudyId });
  } catch (error) {
    tx.abort();
    await tx.done.catch(() => undefined);
    throw error;
  }

  await tx.done;
}

export async function getEvidence(
  studyId: StudyId,
  evidenceId: EvidenceEntryId
): Promise<EvidenceEntry | undefined> {
  const db = await getDb();
  return db.get("evidence", [studyId, evidenceId]);
}

export async function listEvidence(studyId: StudyId): Promise<EvidenceEntry[]> {
  const db = await getDb();
  return db.getAllFromIndex("evidence", "by_study", studyId);
}

export async function deleteEvidence(
  studyId: StudyId,
  evidenceId: EvidenceEntryId
): Promise<void> {
  const db = await getDb();
  await cascadeEvidenceInvalidationToFindings(
    db,
    studyId,
    evidenceId,
    "Supporting evidence was removed after this Finding was reviewed. Review the Finding again before including it in a formal deliverable."
  );
  await db.delete("evidence", [studyId, evidenceId]);
}

// ============================================================================
// Daily Debrief Operations
// ============================================================================

export async function saveDebrief(debrief: DailyDebrief): Promise<void> {
  const db = await getDb();
  const normalized = normalizeDailyDebrief(debrief, false);
  await db.put("debriefs", normalized);
}

export async function getDebrief(
  studyId: StudyId,
  debriefId: DailyDebriefId
): Promise<DailyDebrief | undefined> {
  const db = await getDb();
  return db.get("debriefs", [studyId, debriefId]);
}

export async function listDebriefs(studyId: StudyId): Promise<DailyDebrief[]> {
  const db = await getDb();
  return db.getAllFromIndex("debriefs", "by_study", studyId);
}

export async function deleteDebrief(
  studyId: StudyId,
  debriefId: DailyDebriefId
): Promise<void> {
  const db = await getDb();
  await db.delete("debriefs", [studyId, debriefId]);
}

// ============================================================================
// Findings Operations
// ============================================================================

export async function saveFinding(
  finding: Finding & { studyId: StudyId },
  options?: { isCreate?: boolean }
): Promise<void> {
  if (!finding.studyId || !finding.studyId.trim()) {
    throw new Error("Finding is missing required studyId.");
  }
  const db = await getDb();
  if (options?.isCreate) {
    const existing = await db.get("findings", [finding.studyId, finding.id]);
    if (existing) {
      throw new Error(
        `ID collision: A Finding with ID "${finding.id}" already exists in Study "${finding.studyId}". Creation cannot overwrite existing records.`
      );
    }
  }
  const previous = await db.get("findings", [finding.studyId, finding.id]);
  const proposed = previous ? applySubstantiveFindingEdit(previous, finding).updated : finding;
  if (proposed.validationStatus === "Validated" && proposed.staleDependencyWarning?.trim()) proposed.validationStatus = "Needs Review";
  for (const parentId of [proposed.supersededByFindingId, proposed.supersedesFindingId].filter(Boolean)) {
    if (parentId === proposed.id || !await db.get("findings", [finding.studyId, parentId!])) throw new Error(`Finding supersession reference "${parentId}" does not resolve to another Finding in this study.`);
  }
  await assertFindingEvidenceIntegrity(db, finding.studyId, proposed);
  await assertNewFindingEvidenceAdmissibility(db, finding.studyId, proposed, previous);
  if (proposed.validationStatus === "Validated" && !proposed.supersededByFindingId && !proposed.supersededAt) await assertFindingEvidenceApprovalIntegrity(db, finding.studyId, proposed);
  if (previous && (proposed.validationStatus !== "Validated" || proposed.supersededByFindingId || proposed.supersededAt || proposed.staleDependencyWarning)) {
    await cascadeFindingInvalidationToOutputs(db, finding.studyId, finding.id);
  }
  const normalized = normalizeFinding({ ...proposed, studyId: finding.studyId }, false);
  await db.put("findings", normalized as Finding & { studyId: StudyId });

}

export async function getFinding(
  studyId: StudyId,
  findingId: FindingId
): Promise<Finding | undefined> {
  const db = await getDb();
  return db.get("findings", [studyId, findingId]);
}

export async function listFindings(studyId: StudyId): Promise<Finding[]> {
  const db = await getDb();
  return db.getAllFromIndex("findings", "by_study", studyId);
}

export async function deleteFinding(
  studyId: StudyId,
  findingId: FindingId
): Promise<void> {
  const db = await getDb();
  for (const name of ["lessons", "goodPractices", "recommendations"] as const) {
    const dependents = (await db.getAllFromIndex(name, "by_study", studyId)).filter(record => getLinkedFindingIds(record).includes(findingId));
    if (dependents.length) throw new Error(`Cannot delete Finding "${findingId}": ${name} reference it (${dependents.map(r => r.id).join(", ")}). Preserve the historical Finding or resolve its dependents first.`);
  }
  const historicalLinks = (await db.getAllFromIndex("findings", "by_study", studyId)).filter(f => f.id !== findingId && (f.supersedesFindingId === findingId || f.supersededByFindingId === findingId));
  if (historicalLinks.length) throw new Error(`Cannot delete Finding "${findingId}": supersession history references it.`);
  await db.delete("findings", [studyId, findingId]);
}

// ============================================================================
// Lessons Learned Operations
// ============================================================================

export async function saveLesson(
  lesson: LessonLearned & { studyId: StudyId },
  options?: { isCreate?: boolean }
): Promise<void> {
  if (!lesson.studyId || !lesson.studyId.trim()) {
    throw new Error("Lesson is missing required studyId.");
  }
  const db = await getDb();
  if (options?.isCreate) {
    const existing = await db.get("lessons", [lesson.studyId, lesson.id]);
    if (existing) {
      throw new Error(
        `ID collision: A Lesson with ID "${lesson.id}" already exists in Study "${lesson.studyId}". Creation cannot overwrite existing records.`
      );
    }
  }
  await assertLessonEvidenceIntegrity(db, lesson.studyId, lesson);
  const previous = await db.get("lessons", [lesson.studyId, lesson.id]);
  if (!previous || lesson.validationStatus === "Validated" || JSON.stringify(previous.linkedFindingIds) !== JSON.stringify(lesson.linkedFindingIds)) await assertCurrentFindingParents(db, lesson.studyId, lesson);
  if (lesson.validationStatus === "Validated") {
    const context = { evidence: await listEvidence(lesson.studyId), sources: await listSources(lesson.studyId), findings: await listFindings(lesson.studyId) };
    if (!isLessonExportEligible(lesson, context)) throw new Error("Cannot approve: parent Findings and referenced evidence must be current and qualified.");
  }
  const normalized = normalizeLessonLearned(lesson, false);
  await db.put("lessons", normalized as LessonLearned & { studyId: StudyId });
}

export async function getLesson(
  studyId: StudyId,
  lessonId: LessonLearnedId
): Promise<LessonLearned | undefined> {
  const db = await getDb();
  return db.get("lessons", [studyId, lessonId]);
}

export async function listLessons(studyId: StudyId): Promise<LessonLearned[]> {
  const db = await getDb();
  return db.getAllFromIndex("lessons", "by_study", studyId);
}

export async function deleteLesson(
  studyId: StudyId,
  lessonId: LessonLearnedId
): Promise<void> {
  const db = await getDb();
  await db.delete("lessons", [studyId, lessonId]);
}

// ============================================================================
// Good Practice Operations
// ============================================================================

export async function saveGoodPractice(
  practice: GoodPractice & { studyId: StudyId },
  options?: { isCreate?: boolean }
): Promise<void> {
  if (!practice.studyId || !practice.studyId.trim()) {
    throw new Error("Good Practice is missing required studyId.");
  }
  const db = await getDb();
  if (options?.isCreate) {
    const existing = await db.get("goodPractices", [practice.studyId, practice.id]);
    if (existing) {
      throw new Error(
        `ID collision: A Good Practice with ID "${practice.id}" already exists in Study "${practice.studyId}". Creation cannot overwrite existing records.`
      );
    }
  }
  await assertGoodPracticeEvidenceIntegrity(db, practice.studyId, practice);
  const previous = await db.get("goodPractices", [practice.studyId, practice.id]);
  if (!previous || practice.validationStatus === "Validated" || JSON.stringify(previous.linkedFindingIds) !== JSON.stringify(practice.linkedFindingIds)) await assertCurrentFindingParents(db, practice.studyId, practice);
  if (practice.validationStatus === "Validated") {
    const context = { evidence: await listEvidence(practice.studyId), sources: await listSources(practice.studyId), findings: await listFindings(practice.studyId) };
    if (!isGoodPracticeExportEligible(practice, context)) throw new Error("Cannot approve: parent Findings and referenced evidence must be current and qualified.");
  }
  const normalized = normalizeGoodPractice(practice, false);
  await db.put("goodPractices", normalized as GoodPractice & { studyId: StudyId });
}

export async function getGoodPractice(
  studyId: StudyId,
  practiceId: GoodPracticeId
): Promise<GoodPractice | undefined> {
  const db = await getDb();
  return db.get("goodPractices", [studyId, practiceId]);
}

export async function listGoodPractices(studyId: StudyId): Promise<GoodPractice[]> {
  const db = await getDb();
  return db.getAllFromIndex("goodPractices", "by_study", studyId);
}

export async function deleteGoodPractice(
  studyId: StudyId,
  practiceId: GoodPracticeId
): Promise<void> {
  const db = await getDb();
  await db.delete("goodPractices", [studyId, practiceId]);
}

// ============================================================================
// Recommendation Operations
// ============================================================================

export async function saveRecommendation(
  recommendation: Recommendation & { studyId: StudyId },
  options?: { isCreate?: boolean }
): Promise<void> {
  if (!recommendation.studyId || !recommendation.studyId.trim()) {
    throw new Error("Recommendation is missing required studyId.");
  }
  const db = await getDb();
  if (options?.isCreate) {
    const existing = await db.get("recommendations", [recommendation.studyId, recommendation.id]);
    if (existing) {
      throw new Error(
        `ID collision: A Recommendation with ID "${recommendation.id}" already exists in Study "${recommendation.studyId}". Creation cannot overwrite existing records.`
      );
    }
  }
  const existingRecommendation = await db.get("recommendations", [recommendation.studyId, recommendation.id]);
  if (existingRecommendation) recommendation = { ...applySubstantiveRecommendationEdit(existingRecommendation, recommendation).updated, studyId: recommendation.studyId };
  await assertRecommendationFindingIntegrity(db, recommendation.studyId, recommendation);
  if (recommendation.validationStatus === "Validated") {
    await assertCurrentFindingParents(db, recommendation.studyId, recommendation);
    const context = { evidence: await listEvidence(recommendation.studyId), sources: await listSources(recommendation.studyId), findings: await listFindings(recommendation.studyId) };
    if (!isRecommendationExportEligible(recommendation, context)) throw new Error("Cannot approve Recommendation: referenced evidence and all parent Findings must be current and qualified.");
  }
  const normalized = normalizeRecommendation(recommendation, false);
  await db.put("recommendations", normalized as Recommendation & { studyId: StudyId });
}

export async function getRecommendation(
  studyId: StudyId,
  recommendationId: RecommendationId
): Promise<Recommendation | undefined> {
  const db = await getDb();
  return db.get("recommendations", [studyId, recommendationId]);
}

export async function listRecommendations(
  studyId: StudyId
): Promise<Recommendation[]> {
  const db = await getDb();
  return db.getAllFromIndex("recommendations", "by_study", studyId);
}

export async function deleteRecommendation(
  studyId: StudyId,
  recommendationId: RecommendationId
): Promise<void> {
  const db = await getDb();
  await db.delete("recommendations", [studyId, recommendationId]);
}

// ============================================================================
// Study Projection Assembly
// ============================================================================

export async function assembleStudy(studyId: StudyId): Promise<FieldStudy | undefined> {
  const meta = await getStudyMeta(studyId);
  if (!meta) {
    return undefined;
  }

  const [sources, evidence, debriefs, findings, lessons, goodPractices, recommendations] =
    await Promise.all([
      listSources(studyId),
      listEvidence(studyId),
      listDebriefs(studyId),
      listFindings(studyId),
      listLessons(studyId),
      listGoodPractices(studyId),
      listRecommendations(studyId),
    ]);

  return {
    ...meta,
    sources,
    evidence,
    debriefs,
    findings,
    lessons,
    goodPractices,
    recommendations,
  };
}

// ============================================================================
// Atomic Complete Study Persistence
// ============================================================================

export async function saveCompleteStudy(study: FieldStudy): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    [
      "studies",
      "sources",
      "evidence",
      "debriefs",
      "findings",
      "lessons",
      "goodPractices",
      "recommendations",
    ],
    "readwrite"
  );

  const {
    sources,
    evidence,
    debriefs,
    findings,
    lessons,
    goodPractices,
    recommendations,
    ...meta
  } = study;

  await tx.objectStore("studies").put(meta);

  const sourceStore = tx.objectStore("sources");
  for (const s of sources) {
    const normalized = normalizeSourceRecord({ ...s, studyId: meta.id }, false);
    await sourceStore.put(normalized as SourceRecord & { studyId: StudyId });
  }

  const evidenceStore = tx.objectStore("evidence");
  for (const e of evidence) {
    const normalized = normalizeEvidenceEntry({ ...e, studyId: meta.id }, false);
    await evidenceStore.put(normalized as EvidenceEntry & { studyId: StudyId });
  }

  const debriefStore = tx.objectStore("debriefs");
  for (const d of debriefs) {
    const normalized = normalizeDailyDebrief({ ...d, studyId: meta.id }, false);
    await debriefStore.put(normalized);
  }

  const findingStore = tx.objectStore("findings");
  for (const f of findings) {
    const normalized = normalizeFinding({ ...f, studyId: meta.id }, false);
    await findingStore.put(normalized as Finding & { studyId: StudyId });
  }

  const lessonStore = tx.objectStore("lessons");
  for (const l of lessons) {
    const normalized = normalizeLessonLearned({ ...l, studyId: meta.id }, false);
    await lessonStore.put(normalized as LessonLearned & { studyId: StudyId });
  }

  const gpStore = tx.objectStore("goodPractices");
  for (const g of goodPractices) {
    const normalized = normalizeGoodPractice({ ...g, studyId: meta.id }, false);
    await gpStore.put(normalized as GoodPractice & { studyId: StudyId });
  }

  const recStore = tx.objectStore("recommendations");
  for (const r of recommendations) {
    const normalized = normalizeRecommendation({ ...r, studyId: meta.id }, false);
    await recStore.put(normalized as Recommendation & { studyId: StudyId });
  }

  await tx.done;
}

// ============================================================================
// Demo Template Seeding (Option A)
// ============================================================================

export async function bootstrapDemoTemplates(): Promise<void> {
  for (const demoCase of demoCases) {
    const existing = await getStudyMeta(demoCase.id);
    if (!existing) {
      const fieldStudy = adaptDemoCaseToFieldStudy(demoCase);
      await saveCompleteStudy(fieldStudy);
    }
  }
}

// ============================================================================
// Demo Study Cloning (Option A)
// ============================================================================

export async function cloneDemoStudy(
  sourceStudyId: StudyId,
  newTitle?: string
): Promise<StudyId> {
  const sourceStudy = await assembleStudy(sourceStudyId);
  if (!sourceStudy) {
    throw new Error(`Source study "${sourceStudyId}" not found for cloning.`);
  }

  const newStudyId = `study-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .substring(2, 8)}`;
  const now = Date.now();

  const clonedStudy: FieldStudy = {
    ...sourceStudy,
    id: newStudyId,
    title: newTitle || `${sourceStudy.title} (Editable Copy)`,
    status: "Active Fieldwork",
    isDemoCase: false,
    createdAt: now,
    updatedAt: now,
    scope: JSON.parse(JSON.stringify(sourceStudy.scope)),
    patternNotes: sourceStudy.patternNotes?.map((note) => ({
      ...note,
      studyId: newStudyId,
    })),
    sources: sourceStudy.sources.map((s) => ({
      ...s,
      studyId: newStudyId,
      createdAt: now,
      updatedAt: now,
    })),
    evidence: sourceStudy.evidence.map((e) => ({
      ...e,
      studyId: newStudyId,
      createdAt: now,
      updatedAt: now,
    })),
    debriefs: sourceStudy.debriefs.map((d) => ({
      ...d,
      studyId: newStudyId,
      createdAt: now,
      updatedAt: now,
    })),
    findings: sourceStudy.findings.map((f) => ({
      ...f,
      studyId: newStudyId,
      createdAt: now,
      updatedAt: now,
    })),
    lessons: sourceStudy.lessons.map((l) => ({
      ...l,
      studyId: newStudyId,
      createdAt: now,
      updatedAt: now,
    })),
    goodPractices: sourceStudy.goodPractices.map((g) => ({
      ...g,
      studyId: newStudyId,
      createdAt: now,
      updatedAt: now,
    })),
    recommendations: sourceStudy.recommendations.map((r) => ({
      ...r,
      studyId: newStudyId,
      createdAt: now,
      updatedAt: now,
    })),
  };

  await saveCompleteStudy(clonedStudy);
  return newStudyId;
}

export interface StudyStats {
  sourcesCount: number;
  evidenceCount: number;
  findingsCount: number;
  recommendationsCount: number;
}

export async function getStudyStats(studyId: StudyId): Promise<StudyStats> {
  const db = await getDb();
  const [sourcesCount, evidenceCount, findingsCount, recommendationsCount] = await Promise.all([
    db.countFromIndex("sources", "by_study", studyId),
    db.countFromIndex("evidence", "by_study", studyId),
    db.countFromIndex("findings", "by_study", studyId),
    db.countFromIndex("recommendations", "by_study", studyId),
  ]);
  return {
    sourcesCount,
    evidenceCount,
    findingsCount,
    recommendationsCount,
  };
}
