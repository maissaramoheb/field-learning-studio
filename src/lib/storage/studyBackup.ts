import { assembleStudy, getStudyMeta } from "./studyStore";
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
  recommendations.forEach((r, idx) => {
    if (!r || typeof r !== "object") {
      errors.push(`Recommendation at index ${idx} is not an object.`);
      return;
    }
    if (!r.id || typeof r.id !== "string" || !r.id.trim()) {
      errors.push(`Recommendation at index ${idx} has missing or invalid ID.`);
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
  });

  // 5. Validate Lessons & Good Practices
  lessons.forEach((l) => {
    for (const evId of l.evidenceBase || []) {
      if (!evidenceIdSet.has(evId)) {
        warnings.push(`Lesson "${l.id}" references evidence "${evId}" not found in backup.`);
      }
    }
  });

  goodPractices.forEach((gp) => {
    for (const evId of gp.evidenceBase || []) {
      if (!evidenceIdSet.has(evId)) {
        warnings.push(`Good Practice "${gp.id}" references evidence "${evId}" not found in backup.`);
      }
    }
  });

  // 6. Validate Debriefs
  debriefs.forEach((d, idx) => {
    if (!d || typeof d !== "object") {
      errors.push(`Debrief at index ${idx} is not an object.`);
      return;
    }
    if (!d.id || typeof d.id !== "string" || !d.id.trim()) {
      errors.push(`Debrief at index ${idx} has missing or invalid ID.`);
      return;
    }
  });

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
    envelope = envelopeOrJson;
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
    updatedAt: Date.now(),
  };

  const targetSources = envelope.sources.map((s) => ({
    ...s,
    studyId: targetStudyId,
  }));

  const targetEvidence = envelope.evidence.map((e) => ({
    ...e,
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
    ...r,
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
    ] as const;

    for (const storeName of childStores) {
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

  await tx.done;

  return {
    success: true,
    studyId: targetStudyId,
    message: `Study successfully restored as "${targetStudyId}".`,
  };
}
