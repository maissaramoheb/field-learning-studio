import { assembleStudy, getStudyMeta } from "./studyStore";
import { getLinkedFindingIds } from "@/lib/exportPolicy";
import { sourceFileRepository } from "./sourceFileRepository";
import { normalizeRecommendation } from "./normalization";
import { getDb } from "./indexedDb";
import type {
  StudyId,
  StudyMeta,
  SourceRecord,
  EvidenceEntry,
  DailyDebrief,
  Finding,
  LessonLearned,
  GoodPractice,
  Recommendation,
  ValidationStatus,
  SourceFileMetadata,
  SourceFileId,
} from "@/lib/types";

export const BACKUP_FORMAT_IDENTIFIER = "field-learning-studio-backup";
export const BACKUP_FORMAT_VERSION = 1;
export const UNENCRYPTED_SENSITIVE_DATA_WARNING =
  "WARNING: This export contains unencrypted field study records. Ensure this file is stored securely and handled in accordance with participant consent, data protection regulations, and institutional ethics protocols.";

export interface StudyBackupEnvelope {
  format: typeof BACKUP_FORMAT_IDENTIFIER;
  version: typeof BACKUP_FORMAT_VERSION;
  exportedAt: number;
  warning: string;
  study: StudyMeta;
  sources: SourceRecord[];
  evidence: EvidenceEntry[];
  debriefs: DailyDebrief[];
  findings: Finding[];
  lessons: LessonLearned[];
  goodPractices: GoodPractice[];
  recommendations: Recommendation[];
  /** Optional portable extension; the original structured v1 JSON format remains supported. */
  fileArchiveVersion?: 1;
  sourceFiles?: { metadata: SourceFileMetadata; extractedText?: string; binaryBase64?: string; binaryType?: string }[];
}

export type ImportStrategy = "reject_collision" | "overwrite" | "import_as_new";

export interface BackupInspectionResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  envelope?: StudyBackupEnvelope;
  preview?: {
    studyId: string;
    studyTitle: string;
    exportedAt: number;
    sourceCount: number;
    evidenceCount: number;
    findingCount: number;
    recommendationCount: number;
    debriefCount: number;
    lessonCount: number;
    goodPracticeCount: number;
    collisionDetected: boolean;
  };
}

const VALID_VALIDATION_STATUSES = new Set<ValidationStatus>([
  "Draft",
  "Needs Review",
  "Validated",
  "Rejected",
]);

/**
 * Validates the structural envelope, entity completeness, required fields,
 * and same-study referential relationships for a study backup archive.
 */
export function validateStudyBackupEnvelope(data: unknown): BackupInspectionResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errors: ["Backup data must be a valid non-null JSON object."],
      warnings: [],
    };
  }

  const obj = data as Record<string, unknown>;

  if (obj.format !== BACKUP_FORMAT_IDENTIFIER) {
    errors.push(
      `Invalid format identifier. Expected "${BACKUP_FORMAT_IDENTIFIER}", got "${String(
        obj.format
      )}".`
    );
  }

  if (obj.version !== BACKUP_FORMAT_VERSION) {
    errors.push(
      `Unsupported backup version. Expected ${BACKUP_FORMAT_VERSION}, got "${String(
        obj.version
      )}".`
    );
  }

  if (typeof obj.exportedAt !== "number" || isNaN(obj.exportedAt)) {
    errors.push("Backup must contain a valid numeric exportedAt timestamp.");
  }

  if (typeof obj.study !== "object" || obj.study === null) {
    errors.push("Backup must contain a valid study metadata object.");
  }

  const study = (obj.study || {}) as Record<string, unknown>;
  if (typeof study.id !== "string" || !study.id.trim()) {
    errors.push("Study metadata is missing a valid string ID.");
  }
  if (typeof study.title !== "string" || !study.title.trim()) {
    errors.push("Study metadata is missing a valid string title.");
  }
  if (!study.scope || typeof study.scope !== "object") {
    errors.push("Study metadata is missing required scope configuration.");
  } else {
    const scope = study.scope as Record<string, unknown>;
    if (scope.targetSites !== undefined && (!Array.isArray(scope.targetSites) || !scope.targetSites.every(value => typeof value === "string"))) {
      errors.push("Study scope targetSites must be an array if provided.");
    }
    if (scope.geographicAreas !== undefined && (!Array.isArray(scope.geographicAreas) || !scope.geographicAreas.every(value => typeof value === "string"))) {
      errors.push("Study scope geographicAreas must be an array if provided.");
    }
  }

  // Check array sections
  const arrayFields = [
    "sources",
    "evidence",
    "debriefs",
    "findings",
    "lessons",
    "goodPractices",
    "recommendations",
  ] as const;

  for (const field of arrayFields) {
    if (!Array.isArray(obj[field])) {
      errors.push(`Backup section "${field}" must be an array.`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const idArrays = ["supportingEvidenceIds", "contradictoryEvidenceIds", "qualifyingEvidenceIds", "linkedFindingIds", "linkedLessonIds", "evidenceBase", "evidenceIds", "studyQuestionIds", "frameworkThemeIds", "contradictionIds", "linkedSourceIds", "linkedEvidenceIds", "siteIds", "attendees", "tomorrowPriorities", "supersedesFindingIds"];
  for (const field of arrayFields) {
    for (const [index, value] of (obj[field] as unknown[]).entries()) {
      if (!value || typeof value !== "object" || Array.isArray(value)) { errors.push(`${field}[${index}] must be an object.`); continue; }
      const record = value as Record<string, unknown>;
      for (const key of idArrays) if (record[key] !== undefined && (!Array.isArray(record[key]) || !(record[key] as unknown[]).every(id => typeof id === "string" && id.trim()))) errors.push(`${field}[${index}].${key} must be an array of non-empty strings.`);
      if (record.studyId !== undefined && record.studyId !== study.id) errors.push(`${field}[${index}] belongs to a different study.`);
      for (const key of ["id", "title", "statement", "recommendation", "sourceId", "linkedFindingId", "sourceFileId", "sourceType", "date", "stakeholderType", "location", "siteId", "summary", "rawText", "rawEvidence", "rawObservation", "potentialFinding", "interpretation", "primaryTheme", "secondaryTheme", "explanation", "limitationNote", "alternativeInterpretations", "staleDependencyWarning"]) if (record[key] !== undefined && typeof record[key] !== "string") errors.push(`${field}[${index}].${key} must be a string.`);
    }
  }
  if (study.patternNotes !== undefined && (!Array.isArray(study.patternNotes) || !study.patternNotes.every(note => note && typeof note === "object" && Array.isArray(note.evidenceIds) && note.evidenceIds.every((id: unknown) => typeof id === "string")))) errors.push("Study patternNotes and evidenceIds must have valid array shapes.");
  if (errors.length) return { valid: false, errors, warnings };

  const sources = (obj.sources || []) as SourceRecord[];
  const evidence = (obj.evidence || []) as EvidenceEntry[];
  const debriefs = (obj.debriefs || []) as DailyDebrief[];
  const findings = (obj.findings || []) as Finding[];
  const lessons = (obj.lessons || []) as LessonLearned[];
  const goodPractices = (obj.goodPractices || []) as GoodPractice[];
  const recommendations = (obj.recommendations || []) as Recommendation[];

  // 1. Validate Sources
  const sourceIdSet = new Set<string>();
  sources.forEach((s, idx) => {
    if (!s || typeof s !== "object") {
      errors.push(`Source at index ${idx} is not an object.`);
      return;
    }
    if (!s.id || typeof s.id !== "string" || !s.id.trim()) {
      errors.push(`Source at index ${idx} has missing or invalid ID.`);
      return;
    }
    if (sourceIdSet.has(s.id)) {
      errors.push(`Duplicate Source ID "${s.id}" detected in backup archive.`);
      return;
    }
    if (!s.title || typeof s.title !== "string" || !s.title.trim()) {
      errors.push(`Source "${s.id}" is missing required title.`);
    }
    sourceIdSet.add(s.id);
  });

  // 2. Validate Evidence
  const evidenceIdSet = new Set<string>();
  evidence.forEach((e, idx) => {
    if (!e || typeof e !== "object") {
      errors.push(`Evidence at index ${idx} is not an object.`);
      return;
    }
    if (!e.id || typeof e.id !== "string" || !e.id.trim()) {
      errors.push(`Evidence at index ${idx} has missing or invalid ID.`);
      return;
    }
    if (evidenceIdSet.has(e.id)) {
      errors.push(`Duplicate Evidence ID "${e.id}" detected in backup archive.`);
      return;
    }
    const obsText = e.rawEvidence || e.rawObservation;
    if (!obsText || typeof obsText !== "string" || !obsText.trim()) {
      errors.push(`Evidence "${e.id}" is missing required observation content.`);
    }
    if (!e.sourceId || !sourceIdSet.has(e.sourceId)) {
      errors.push(
        `Relationship violation: Evidence "${e.id}" references missing or foreign Source "${e.sourceId}".`
      );
    }
    if (e.validationStatus && !VALID_VALIDATION_STATUSES.has(e.validationStatus)) {
      errors.push(
        `Evidence "${e.id}" has invalid validationStatus "${String(e.validationStatus)}".`
      );
    }
    evidenceIdSet.add(e.id);
  });

  // 3. Validate Findings
  const findingIdSet = new Set<string>();
  findings.forEach((f, idx) => {
    if (!f || typeof f !== "object") {
      errors.push(`Finding at index ${idx} is not an object.`);
      return;
    }
    if (!f.id || typeof f.id !== "string" || !f.id.trim()) {
      errors.push(`Finding at index ${idx} has missing or invalid ID.`);
      return;
    }
    if (findingIdSet.has(f.id)) {
      errors.push(`Duplicate Finding ID "${f.id}" detected in backup archive.`);
      return;
    }
    if (!f.statement || typeof f.statement !== "string" || !f.statement.trim()) {
      errors.push(`Finding "${f.id}" is missing required statement.`);
    }
    if (f.validationStatus && !VALID_VALIDATION_STATUSES.has(f.validationStatus)) {
      errors.push(
        `Finding "${f.id}" has invalid validationStatus "${String(f.validationStatus)}".`
      );
    }
    for (const evId of f.supportingEvidenceIds || []) {
      if (!evidenceIdSet.has(evId)) {
        errors.push(
          `Relationship violation: Finding "${f.id}" references missing Evidence "${evId}".`
        );
      }
    }
    for (const evId of f.contradictoryEvidenceIds || []) {
      if (!evidenceIdSet.has(evId)) {
        errors.push(
          `Relationship violation: Finding "${f.id}" references missing contradictory Evidence "${evId}".`
        );
      }
    }
    findingIdSet.add(f.id);
  });

  // 4. Validate Recommendations
  const recommendationIdSet = new Set<string>();
  recommendations.forEach((r, idx) => {
    if (!r || typeof r !== "object") {
      errors.push(`Recommendation at index ${idx} is not an object.`);
      return;
    }
    if (!r.id || typeof r.id !== "string" || !r.id.trim()) {
      errors.push(`Recommendation at index ${idx} has missing or invalid ID.`);
      return;
    }
    if (recommendationIdSet.has(r.id)) {
      errors.push(`Duplicate Recommendation ID "${r.id}" detected in backup archive.`);
      return;
    }
    if (!r.recommendation || typeof r.recommendation !== "string" || !r.recommendation.trim()) {
      errors.push(`Recommendation "${r.id}" is missing required recommendation text.`);
    }
    if (r.linkedFindingId && !findingIdSet.has(r.linkedFindingId)) {
      errors.push(
        `Relationship violation: Recommendation "${r.id}" references missing parent Finding "${r.linkedFindingId}".`
      );
    }
    if (r.validationStatus && !VALID_VALIDATION_STATUSES.has(r.validationStatus)) {
      errors.push(
        `Recommendation "${r.id}" has invalid validationStatus "${String(r.validationStatus)}".`
      );
    }
    recommendationIdSet.add(r.id);
  });

  // 5. Validate Lessons & Good Practices
  const lessonIdSet = new Set<string>();
  lessons.forEach((l, idx) => {
    if (!l || typeof l !== "object") {
      errors.push(`Lesson at index ${idx} is not an object.`);
      return;
    }
    if (!l.id || typeof l.id !== "string" || !l.id.trim()) {
      errors.push(`Lesson at index ${idx} has missing or invalid ID.`);
      return;
    }
    if (lessonIdSet.has(l.id)) {
      errors.push(`Duplicate Lesson ID "${l.id}" detected in backup archive.`);
      return;
    }
    for (const evId of l.evidenceBase || []) {
      if (!evidenceIdSet.has(evId)) {
        errors.push(
          `Relationship violation: Lesson "${l.id}" references missing Evidence "${evId}".`
        );
      }
    }
    lessonIdSet.add(l.id);
  });

  const goodPracticeIdSet = new Set<string>();
  goodPractices.forEach((gp, idx) => {
    if (!gp || typeof gp !== "object") {
      errors.push(`Good Practice at index ${idx} is not an object.`);
      return;
    }
    if (!gp.id || typeof gp.id !== "string" || !gp.id.trim()) {
      errors.push(`Good Practice at index ${idx} has missing or invalid ID.`);
      return;
    }
    if (goodPracticeIdSet.has(gp.id)) {
      errors.push(`Duplicate Good Practice ID "${gp.id}" detected in backup archive.`);
      return;
    }
    for (const evId of gp.evidenceBase || []) {
      if (!evidenceIdSet.has(evId)) {
        errors.push(
          `Relationship violation: Good Practice "${gp.id}" references missing Evidence "${evId}".`
        );
      }
    }
    goodPracticeIdSet.add(gp.id);
  });

  // 6. Validate Debriefs
  const debriefIdSet = new Set<string>();
  debriefs.forEach((d, idx) => {
    if (!d || typeof d !== "object") {
      errors.push(`Debrief at index ${idx} is not an object.`);
      return;
    }
    if (!d.id || typeof d.id !== "string" || !d.id.trim()) {
      errors.push(`Debrief at index ${idx} has missing or invalid ID.`);
      return;
    }
    if (debriefIdSet.has(d.id)) {
      errors.push(`Duplicate Debrief ID "${d.id}" detected in backup archive.`);
      return;
    }
    debriefIdSet.add(d.id);
  });

  for (const f of findings) {
    for (const id of f.qualifyingEvidenceIds || []) if (!evidenceIdSet.has(id)) errors.push(`Finding "${f.id}" references missing qualifying Evidence "${id}".`);
    for (const id of [f.supersededByFindingId, f.supersedesFindingId].filter(Boolean)) if (!findingIdSet.has(id!)) errors.push(`Finding "${f.id}" references missing supersession Finding "${id}".`);
  }
  for (const child of [...lessons, ...goodPractices, ...recommendations]) {
    for (const id of getLinkedFindingIds(child)) if (!findingIdSet.has(id)) errors.push(`"${child.id}" references missing parent Finding "${id}".`);
  }
  const referencedFiles = new Set([...sources, ...evidence].map(record => record.sourceFileId).filter(Boolean));
  if (obj.fileArchiveVersion !== undefined) {
    if (obj.fileArchiveVersion !== 1 || !Array.isArray(obj.sourceFiles)) errors.push("Invalid portable file archive manifest.");
    else {
      const fileIds = new Set<string>();
      for (const [index, file] of obj.sourceFiles.entries()) {
        const meta = file?.metadata;
        if (!meta || typeof meta.id !== "string" || !meta.id.startsWith("SF-") || meta.studyId !== study.id || typeof meta.filename !== "string" || typeof meta.mimeType !== "string" || typeof meta.fileSizeBytes !== "number" || typeof meta.importedAt !== "number" || typeof meta.parsingVersion !== "number") { errors.push(`Invalid source file metadata at index ${index}.`); continue; }
        if (fileIds.has(meta.id)) errors.push(`Duplicate source file "${meta.id}".`);
        fileIds.add(meta.id);
        if (file.extractedText !== undefined && typeof file.extractedText !== "string") errors.push(`Invalid extracted text for "${meta.id}".`);
        if (file.binaryBase64 !== undefined && (typeof file.binaryBase64 !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.binaryBase64))) errors.push(`Invalid binary encoding for "${meta.id}".`);
        if (file.binaryType !== undefined && typeof file.binaryType !== "string") errors.push(`Invalid binary MIME type for "${meta.id}".`);
        if (file.binaryBase64 === undefined && file.extractedText === undefined) errors.push(`Source file "${meta.id}" has no recoverable content.`);
      }
      for (const id of referencedFiles) if (!fileIds.has(id!)) errors.push(`Portable archive is missing source file "${id}".`);
    }
  } else {
    if (obj.sourceFiles !== undefined) errors.push("Source files require a portable archive manifest.");
    warnings.push("ORIGINAL SOURCE FILES ARE NOT INCLUDED in this structured backup. Use the file-inclusive archive for portable recovery.");
  }

  const envelope = obj as unknown as StudyBackupEnvelope;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    envelope: errors.length === 0 ? envelope : undefined,
  };
}

/**
 * Inspects a backup JSON string, runs deep structural validation,
 * and produces a preview with collision status.
 */
export async function inspectStudyBackup(
  jsonString: string,
  existingStudyIds: string[] = []
): Promise<BackupInspectionResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      valid: false,
      errors: ["Not valid JSON format: File is not valid JSON."],
      warnings: [],
    };
  }

  const result = validateStudyBackupEnvelope(parsed);
  if (!result.valid || !result.envelope) {
    return result;
  }

  const env = result.envelope;
  const collisionDetected = existingStudyIds.includes(env.study.id);

  return {
    ...result,
    preview: {
      studyId: env.study.id,
      studyTitle: env.study.title,
      exportedAt: env.exportedAt,
      sourceCount: env.sources.length,
      evidenceCount: env.evidence.length,
      findingCount: env.findings.length,
      recommendationCount: env.recommendations.length,
      debriefCount: env.debriefs.length,
      lessonCount: env.lessons.length,
      goodPracticeCount: env.goodPractices.length,
      collisionDetected,
    },
  };
}

export async function exportStudyBackup(studyId: StudyId): Promise<string> {
  const study = await assembleStudy(studyId);
  if (!study) {
    throw new Error(`Study "${studyId}" not found for export.`);
  }

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

  const envelope: StudyBackupEnvelope = {
    format: BACKUP_FORMAT_IDENTIFIER,
    version: BACKUP_FORMAT_VERSION,
    exportedAt: Date.now(),
    warning: UNENCRYPTED_SENSITIVE_DATA_WARNING,
    study: meta,
    sources,
    evidence,
    debriefs,
    findings,
    lessons,
    goodPractices,
    recommendations,
  };

  return JSON.stringify(envelope, null, 2);
}

export async function importStudyBackup(
  envelopeOrJson: StudyBackupEnvelope | string,
  strategy: ImportStrategy = "reject_collision"
): Promise<{ success: boolean; studyId: StudyId; message?: string }> {
  let envelope: StudyBackupEnvelope;

  if (typeof envelopeOrJson === "string") {
    const inspection = await inspectStudyBackup(envelopeOrJson);
    if (!inspection.valid || !inspection.envelope) {
      throw new Error(`Invalid backup archive: ${inspection.errors.join("; ")}`);
    }
    envelope = inspection.envelope;
  } else {
    const inspection = validateStudyBackupEnvelope(envelopeOrJson);
    if (!inspection.valid || !inspection.envelope) throw new Error(`Invalid backup archive: ${inspection.errors.join("; ")}`);
    envelope = inspection.envelope;
  }

  const originalStudyId = envelope.study.id;
  const existingMeta = await getStudyMeta(originalStudyId);

  if (existingMeta && strategy === "reject_collision") {
    throw new Error(
      `Collision detected: Study "${originalStudyId}" already exists. Choose "overwrite" or "import_as_new".`
    );
  }

  let targetStudyId: StudyId = originalStudyId;
  let targetTitle = envelope.study.title;
  let isDemoCase = envelope.study.isDemoCase;

  if (strategy === "import_as_new") {
    targetStudyId = `study-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;
    targetTitle = `${envelope.study.title} (Imported)`;
    isDemoCase = false;
  }

  const targetStudyMeta: StudyMeta = {
    ...envelope.study,
    id: targetStudyId,
    title: targetTitle,
    isDemoCase,
    patternNotes: envelope.study.patternNotes?.map((note) => ({
      ...note,
      studyId: targetStudyId,
    })),
    updatedAt: Date.now(),
  };

  const fileIdMap = new Map((envelope.sourceFiles || []).map((file, index) => [file.metadata.id, `SF-${targetStudyId}-${Date.now().toString(36)}-${index}` as SourceFileId]));
  const remapFile = (id?: SourceFileId) => id ? fileIdMap.get(id) || id : undefined;
  const targetSources = envelope.sources.map((s) => ({
    ...s,
    sourceFileId: remapFile(s.sourceFileId),
    studyId: targetStudyId,
  }));

  const targetEvidence = envelope.evidence.map((e) => ({
    ...e,
    sourceFileId: remapFile(e.sourceFileId),
    studyId: targetStudyId,
  }));

  const targetDebriefs = envelope.debriefs.map((d) => ({
    ...d,
    studyId: targetStudyId,
  }));

  const targetFindings = envelope.findings.map((f) => ({
    ...f,
    studyId: targetStudyId,
  }));

  const targetLessons = envelope.lessons.map((l) => ({
    ...l,
    studyId: targetStudyId,
  }));

  const targetGoodPractices = envelope.goodPractices.map((g) => ({
    ...g,
    studyId: targetStudyId,
  }));

  const targetRecommendations = envelope.recommendations.map((r) => ({
    ...normalizeRecommendation(r, true),
    studyId: targetStudyId,
  }));

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
      "sourceFileMetadata",
      "sourceFileContent",
    ],
    "readwrite"
  );

  // If overwriting existing study, clean out old records first in the same atomic transaction
  if (existingMeta && strategy === "overwrite") {
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
      // A structured-only restore carries no replacement file stores. Preserve local originals.
      if (!envelope.sourceFiles && (storeName === "sourceFileMetadata" || storeName === "sourceFileContent")) continue;
      const store = tx.objectStore(storeName);
      const keys = await store.index("by_study").getAllKeys(targetStudyId);
      for (const key of keys) {
        await store.delete(key);
      }
    }
  }

  await tx.objectStore("studies").put(targetStudyMeta);

  const sourceStore = tx.objectStore("sources");
  for (const s of targetSources) {
    await sourceStore.put(s);
  }

  const evidenceStore = tx.objectStore("evidence");
  for (const e of targetEvidence) {
    await evidenceStore.put(e);
  }

  const debriefStore = tx.objectStore("debriefs");
  for (const d of targetDebriefs) {
    await debriefStore.put(d);
  }

  const findingStore = tx.objectStore("findings");
  for (const f of targetFindings) {
    await findingStore.put(f);
  }

  const lessonStore = tx.objectStore("lessons");
  for (const l of targetLessons) {
    await lessonStore.put(l);
  }

  const gpStore = tx.objectStore("goodPractices");
  for (const g of targetGoodPractices) {
    await gpStore.put(g);
  }

  const recStore = tx.objectStore("recommendations");
  for (const r of targetRecommendations) {
    await recStore.put(r);
  }

  for (const file of envelope.sourceFiles || []) {
    const id = fileIdMap.get(file.metadata.id)!;
    const bytes = file.binaryBase64 !== undefined ? Uint8Array.from(atob(file.binaryBase64), char => char.charCodeAt(0)) : undefined;
    await tx.objectStore("sourceFileMetadata").put({ ...file.metadata, id, studyId: targetStudyId, hasContent: true });
    await tx.objectStore("sourceFileContent").put({ id, studyId: targetStudyId, extractedText: file.extractedText, blob: bytes ? new Blob([bytes], { type: file.binaryType || file.metadata.mimeType }) : undefined });
  }
  await tx.done;

  return {
    success: true,
    studyId: targetStudyId,
    message: `Study successfully restored as "${targetStudyId}".`,
  };
}

/** Portable extension of the existing JSON backup; binary files use base64, no new storage schema. */
export async function exportStudyArchive(studyId: StudyId): Promise<string> {
  const envelope: StudyBackupEnvelope = JSON.parse(await exportStudyBackup(studyId));
  const files = await sourceFileRepository.listMetadataForStudy(studyId);
  envelope.fileArchiveVersion = 1;
  envelope.sourceFiles = [];
  for (const metadata of files) {
    const content = await sourceFileRepository.getFileContent(metadata.id);
    if (!content || content.studyId !== studyId) throw new Error(`Cannot create portable archive: original content for "${metadata.id}" is unavailable.`);
    let binaryBase64: string | undefined;
    if (content.blob) {
      const bytes = new Uint8Array(await content.blob.arrayBuffer());
      const chunks: string[] = [];
      for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
      binaryBase64 = btoa(chunks.join(""));
    }
    envelope.sourceFiles.push({ metadata, extractedText: content.extractedText, binaryBase64, binaryType: content.blob?.type });
  }
  const check = validateStudyBackupEnvelope(envelope);
  if (!check.valid) throw new Error(`Cannot create portable archive: ${check.errors.join("; ")}`);
  return JSON.stringify(envelope, null, 2);
}
