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
} from "./integrity";
import { isSubstantiveEvidenceChange } from "@/lib/validation/validationLifecycle";
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
  RecommendationId,
  FieldStudy,
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
  await db.put("studies", pureMeta as unknown as StudyMeta);
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

export async function deleteStudyQuestion(
  studyId: StudyId,
  questionId: string
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);
  const questions = (meta.questions || []).filter((q) => q.id !== questionId);
  await saveStudyMeta({
    ...meta,
    questions,
    updatedAt: Date.now(),
  });

  const evidenceList = await listEvidence(studyId);
  for (const entry of evidenceList) {
    if (entry.studyQuestionIds && entry.studyQuestionIds.includes(questionId)) {
      const updatedIds = entry.studyQuestionIds.filter((id) => id !== questionId);
      await saveEvidence({
        ...entry,
        studyId,
        studyQuestionIds: updatedIds,
        updatedAt: Date.now(),
      });
    }
  }
}

export async function savePatternNote(
  studyId: StudyId,
  pattern: PatternNote
): Promise<void> {
  const meta = await getStudyMeta(studyId);
  if (!meta) throw new Error(`Study "${studyId}" not found.`);
  const notes = meta.patternNotes ? [...meta.patternNotes] : [];
  const idx = notes.findIndex((p) => p.id === pattern.id);
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

export async function bulkAssignEvidenceToQuestion(
  studyId: StudyId,
  evidenceIds: EvidenceEntryId[],
  questionId: string
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("evidence", "readwrite");
  const store = tx.objectStore("evidence");
  for (const evId of evidenceIds) {
    const entry = await store.get([studyId, evId]);
    if (entry) {
      const currentQuestions = entry.studyQuestionIds ? [...entry.studyQuestionIds] : [];
      if (!currentQuestions.includes(questionId)) {
        currentQuestions.push(questionId);
      }
      await store.put({
        ...entry,
        studyQuestionIds: currentQuestions,
        updatedAt: Date.now(),
      });
    }
  }
  await tx.done;
}

export async function bulkAssignEvidenceTheme(
  studyId: StudyId,
  evidenceIds: EvidenceEntryId[],
  theme: string
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("evidence", "readwrite");
  const store = tx.objectStore("evidence");
  for (const evId of evidenceIds) {
    const entry = await store.get([studyId, evId]);
    if (entry) {
      await store.put({
        ...entry,
        primaryTheme: theme,
        updatedAt: Date.now(),
      });
    }
  }
  await tx.done;
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
  source: SourceRecord & { studyId: StudyId }
): Promise<void> {
  const db = await getDb();
  await db.put("sources", source);
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
  const db = await getDb();
  const tx = db.transaction("sources", "readwrite");
  const store = tx.objectStore("sources");
  for (const src of sources) {
    store.put(src);
  }
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
  await db.delete("sources", [studyId, sourceId]);
}

// ============================================================================
// Evidence Operations
// ============================================================================

export async function saveEvidence(
  evidence: EvidenceEntry & { studyId: StudyId }
): Promise<void> {
  const db = await getDb();
  await assertEvidenceSourceIntegrity(db, evidence.studyId, evidence);

  // If this evidence was previously validated and is now being downgraded or substantively edited
  const existing = await db.get("evidence", [evidence.studyId, evidence.id]);
  if (existing && existing.validationStatus === "Validated") {
    const isSubstantive = isSubstantiveEvidenceChange(existing, evidence);
    if (evidence.validationStatus !== "Validated" || isSubstantive) {
      if (isSubstantive && evidence.validationStatus === "Validated") {
        evidence.validationStatus = "Needs Review";
        evidence.previousValidationStatus = "Validated";
        evidence.revision = (existing.revision ?? 1) + 1;
      }
      await cascadeEvidenceInvalidationToFindings(db, evidence.studyId, evidence.id);
    }
  }

  await db.put("evidence", evidence);
}

export async function saveEvidenceBatch(
  evidenceOrStudyId: (EvidenceEntry & { studyId: StudyId })[] | StudyId,
  maybeEvidence?: EvidenceEntry[]
): Promise<void> {
  const evidenceList: (EvidenceEntry & { studyId: StudyId })[] =
    typeof evidenceOrStudyId === "string"
      ? (maybeEvidence || []).map((e) => ({ ...e, studyId: evidenceOrStudyId }))
      : evidenceOrStudyId;
  if (evidenceList.length === 0) return;
  const db = await getDb();

  for (const ev of evidenceList) {
    await assertEvidenceSourceIntegrity(db, ev.studyId, ev);
  }

  const tx = db.transaction("evidence", "readwrite");
  const store = tx.objectStore("evidence");
  for (const ev of evidenceList) {
    store.put(ev);
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
  await db.put("debriefs", debrief);
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
  finding: Finding & { studyId: StudyId }
): Promise<void> {
  const db = await getDb();
  await assertFindingEvidenceIntegrity(db, finding.studyId, finding);
  // When validated, clear any stale dependency warning
  if (finding.validationStatus === "Validated") {
    finding.staleDependencyWarning = undefined;
  }
  await db.put("findings", finding);
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
  await db.delete("findings", [studyId, findingId]);
}

// ============================================================================
// Lessons Learned Operations
// ============================================================================

export async function saveLesson(
  lesson: LessonLearned & { studyId: StudyId }
): Promise<void> {
  const db = await getDb();
  await assertLessonEvidenceIntegrity(db, lesson.studyId, lesson);
  await db.put("lessons", lesson);
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
  practice: GoodPractice & { studyId: StudyId }
): Promise<void> {
  const db = await getDb();
  await assertGoodPracticeEvidenceIntegrity(db, practice.studyId, practice);
  await db.put("goodPractices", practice);
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
  recommendation: Recommendation & { studyId: StudyId }
): Promise<void> {
  const db = await getDb();
  await assertRecommendationFindingIntegrity(db, recommendation.studyId, recommendation);
  await db.put("recommendations", recommendation);
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
    await sourceStore.put({ ...s, studyId: meta.id });
  }

  const evidenceStore = tx.objectStore("evidence");
  for (const e of evidence) {
    await evidenceStore.put({ ...e, studyId: meta.id });
  }

  const debriefStore = tx.objectStore("debriefs");
  for (const d of debriefs) {
    await debriefStore.put({ ...d, studyId: meta.id });
  }

  const findingStore = tx.objectStore("findings");
  for (const f of findings) {
    await findingStore.put({ ...f, studyId: meta.id });
  }

  const lessonStore = tx.objectStore("lessons");
  for (const l of lessons) {
    await lessonStore.put({ ...l, studyId: meta.id });
  }

  const gpStore = tx.objectStore("goodPractices");
  for (const g of goodPractices) {
    await gpStore.put({ ...g, studyId: meta.id });
  }

  const recStore = tx.objectStore("recommendations");
  for (const r of recommendations) {
    await recStore.put({ ...r, studyId: meta.id });
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
