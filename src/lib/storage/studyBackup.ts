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

export interface ValidationResult {
  valid: boolean;
  error?: string;
  envelope?: StudyBackupEnvelope;
}

export function validateStudyBackupEnvelope(data: unknown): ValidationResult {
  if (typeof data !== "object" || data === null) {
    return { valid: false, error: "Backup data must be a non-null object." };
  }

  const obj = data as Record<string, unknown>;

  if (obj.format !== BACKUP_FORMAT_IDENTIFIER) {
    return {
      valid: false,
      error: `Invalid format identifier. Expected "${BACKUP_FORMAT_IDENTIFIER}", got "${String(
        obj.format
      )}".`,
    };
  }

  if (obj.version !== BACKUP_FORMAT_VERSION) {
    return {
      valid: false,
      error: `Unsupported backup version. Expected ${BACKUP_FORMAT_VERSION}, got "${String(
        obj.version
      )}".`,
    };
  }

  if (typeof obj.exportedAt !== "number" || isNaN(obj.exportedAt)) {
    return { valid: false, error: "Backup must contain a valid numeric exportedAt timestamp." };
  }

  if (typeof obj.warning !== "string") {
    return { valid: false, error: "Backup must contain an unencrypted-data warning string." };
  }

  if (typeof obj.study !== "object" || obj.study === null) {
    return { valid: false, error: "Backup must contain a valid study metadata object." };
  }

  const study = obj.study as Record<string, unknown>;
  if (typeof study.id !== "string" || !study.id.trim()) {
    return { valid: false, error: "Study metadata must have a non-empty string ID." };
  }
  if (typeof study.title !== "string" || !study.title.trim()) {
    return { valid: false, error: "Study metadata must have a non-empty string title." };
  }

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
      return { valid: false, error: `Backup section "${field}" must be an array.` };
    }

    const items = obj[field] as unknown[];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (typeof item !== "object" || item === null) {
        return {
          valid: false,
          error: `Item at index ${i} in "${field}" must be a non-null object.`,
        };
      }
      const itemObj = item as Record<string, unknown>;
      if (typeof itemObj.id !== "string" || !itemObj.id.trim()) {
        return {
          valid: false,
          error: `Item at index ${i} in "${field}" is missing a valid string ID.`,
        };
      }
    }
  }

  return {
    valid: true,
    envelope: obj as unknown as StudyBackupEnvelope,
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
  jsonString: string,
  strategy: ImportStrategy = "reject_collision"
): Promise<{ success: boolean; studyId: StudyId; message?: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid backup file: Not valid JSON format.");
  }

  const validation = validateStudyBackupEnvelope(parsed);
  if (!validation.valid || !validation.envelope) {
    throw new Error(`Invalid backup archive: ${validation.error}`);
  }

  const envelope = validation.envelope;
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
    message: `Study successfully imported with ID "${targetStudyId}".`,
  };
}
