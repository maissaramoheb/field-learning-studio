import { openDB, type IDBPTransaction, type IDBPDatabase, type StoreNames } from "idb";
import type { FieldLearningStudioDBSchema } from "./indexedDb";
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
import {
  normalizeEvidenceEntry,
  normalizeFinding,
  normalizeLessonLearned,
  normalizeGoodPractice,
  normalizeRecommendation,
  normalizeDailyDebrief,
  normalizeSourceRecord,
} from "./normalization";

export const MIGRATION_BACKUP_DB_NAME = "FieldLearningStudioBackupDB";
export const MIGRATION_BACKUP_STORE_NAME = "migrationBackups";

export interface MigrationBackupRecord {
  id: string;
  studyId: StudyId;
  createdAt: number;
  study: StudyMeta;
  sources: SourceRecord[];
  evidence: EvidenceEntry[];
  debriefs: DailyDebrief[];
  findings: Finding[];
  lessons: LessonLearned[];
  goodPractices: GoodPractice[];
  recommendations: Recommendation[];
}

/**
 * Reads existing study data from an open v1 database connection without triggering an upgrade.
 */
export async function readV1StudyData(
  db: IDBPDatabase,
  studyId: StudyId
): Promise<Omit<MigrationBackupRecord, "id" | "createdAt"> | undefined> {
  const meta = await db.get("studies", studyId);
  if (!meta) return undefined;

  const sources = (await db.getAllFromIndex("sources", "by_study", studyId)) || [];
  const evidence = (await db.getAllFromIndex("evidence", "by_study", studyId)) || [];
  const debriefs = (await db.getAllFromIndex("debriefs", "by_study", studyId)) || [];
  const findings = (await db.getAllFromIndex("findings", "by_study", studyId)) || [];
  const lessons = (await db.getAllFromIndex("lessons", "by_study", studyId)) || [];
  const goodPractices = (await db.getAllFromIndex("goodPractices", "by_study", studyId)) || [];
  const recommendations =
    (await db.getAllFromIndex("recommendations", "by_study", studyId)) || [];

  return {
    studyId,
    study: meta,
    sources,
    evidence,
    debriefs,
    findings,
    lessons,
    goodPractices,
    recommendations,
  };
}

/**
 * Preflight check that runs BEFORE FieldLearningStudioDB is opened at version 2.
 *
 * Guarantees:
 * 1. Checks current version of FieldLearningStudioDB without version bump.
 * 2. If version < 2 and studies exist, exports verified backup records to FieldLearningStudioBackupDB.
 * 3. Verifies that the backup was written and can be read back.
 * 4. Leaves FieldLearningStudioDB at version 1 throughout.
 * 5. If backup fails, aborts immediately so no upgrade occurs.
 */
export async function runPreMigrationBackupIfNeeded(
  mainDbName: string = "FieldLearningStudioDB",
  backupDbName: string = MIGRATION_BACKUP_DB_NAME
): Promise<{ needed: boolean; backedUp: boolean; error?: string }> {
  let mainDb: IDBPDatabase | null = null;
  let backupDb: IDBPDatabase | null = null;

  try {
    // Open main DB without version parameter to inspect current version without triggering upgrade
    mainDb = await openDB(mainDbName);
    const currentVersion = mainDb.version;

    // Already on v2 or higher, or newly created empty DB without v1 stores
    if (currentVersion >= 2) {
      mainDb.close();
      return { needed: false, backedUp: false };
    }

    if (!mainDb.objectStoreNames.contains("studies")) {
      mainDb.close();
      return { needed: false, backedUp: false };
    }

    const allStudies: StudyMeta[] = await mainDb.getAll("studies");
    if (!allStudies || allStudies.length === 0) {
      mainDb.close();
      return { needed: true, backedUp: true };
    }

    // Open dedicated backup database
    backupDb = await openDB(backupDbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(MIGRATION_BACKUP_STORE_NAME)) {
          const store = db.createObjectStore(MIGRATION_BACKUP_STORE_NAME, { keyPath: "id" });
          store.createIndex("by_study", "studyId", { unique: false });
          store.createIndex("by_createdAt", "createdAt", { unique: false });
        }
      },
    });

    const now = Date.now();
    for (const study of allStudies) {
      const data = await readV1StudyData(mainDb, study.id);
      if (!data) continue;

      const backupId = `pre_v2_migration_${study.id}_${now}`;
      const record: MigrationBackupRecord = {
        id: backupId,
        createdAt: now,
        ...data,
      };

      await backupDb.put(MIGRATION_BACKUP_STORE_NAME, record);

      // Verify read-back immediately
      const verified = await backupDb.get(MIGRATION_BACKUP_STORE_NAME, backupId);
      if (!verified || verified.studyId !== study.id) {
        throw new Error(
          `Backup write verification failed for study "${study.id}". Migration halted.`
        );
      }
    }

    mainDb.close();
    backupDb.close();
    return { needed: true, backedUp: true };
  } catch (err: unknown) {
    if (mainDb) {
      try {
        mainDb.close();
      } catch {
        // ignore
      }
    }
    if (backupDb) {
      try {
        backupDb.close();
      } catch {
        // ignore
      }
    }
    const message = err instanceof Error ? err.message : String(err);
    return {
      needed: true,
      backedUp: false,
      error: message,
    };
  }
}

/**
 * Persisted backfill of legacy records during the v1 -> v2 versionchange transaction.
 * Normalizes all legacy entities using idempotent normalization utilities with legacy_unknown provenance.
 */
export async function executePersistedBackfill(
  transaction: IDBPTransaction<
    FieldLearningStudioDBSchema,
    StoreNames<FieldLearningStudioDBSchema>[],
    "versionchange"
  >
): Promise<void> {
  // 1. Evidence Backfill
  if (transaction.objectStoreNames.contains("evidence")) {
    const store = transaction.objectStore("evidence");
    let cursor = await store.openCursor();
    while (cursor) {
      const normalized = {
        ...normalizeEvidenceEntry(cursor.value, true),
        studyId: cursor.value.studyId,
      };
      await cursor.update(normalized);
      cursor = await cursor.continue();
    }
  }

  // 2. Findings Backfill
  if (transaction.objectStoreNames.contains("findings")) {
    const store = transaction.objectStore("findings");
    let cursor = await store.openCursor();
    while (cursor) {
      const normalized = {
        ...normalizeFinding(cursor.value, true),
        studyId: cursor.value.studyId,
      };
      await cursor.update(normalized);
      cursor = await cursor.continue();
    }
  }

  // 3. Lessons Backfill
  if (transaction.objectStoreNames.contains("lessons")) {
    const store = transaction.objectStore("lessons");
    let cursor = await store.openCursor();
    while (cursor) {
      const normalized = {
        ...normalizeLessonLearned(cursor.value, true),
        studyId: cursor.value.studyId,
      };
      await cursor.update(normalized);
      cursor = await cursor.continue();
    }
  }

  // 4. Good Practices Backfill
  if (transaction.objectStoreNames.contains("goodPractices")) {
    const store = transaction.objectStore("goodPractices");
    let cursor = await store.openCursor();
    while (cursor) {
      const normalized = {
        ...normalizeGoodPractice(cursor.value, true),
        studyId: cursor.value.studyId,
      };
      await cursor.update(normalized);
      cursor = await cursor.continue();
    }
  }

  // 5. Recommendations Backfill
  if (transaction.objectStoreNames.contains("recommendations")) {
    const store = transaction.objectStore("recommendations");
    let cursor = await store.openCursor();
    while (cursor) {
      const normalized = {
        ...normalizeRecommendation(cursor.value, true),
        studyId: cursor.value.studyId,
      };
      await cursor.update(normalized);
      cursor = await cursor.continue();
    }
  }

  // 6. Debriefs Backfill
  if (transaction.objectStoreNames.contains("debriefs")) {
    const store = transaction.objectStore("debriefs");
    let cursor = await store.openCursor();
    while (cursor) {
      const normalized = {
        ...normalizeDailyDebrief(cursor.value, true),
        studyId: cursor.value.studyId,
      };
      await cursor.update(normalized);
      cursor = await cursor.continue();
    }
  }

  // 7. Sources Backfill
  if (transaction.objectStoreNames.contains("sources")) {
    const store = transaction.objectStore("sources");
    let cursor = await store.openCursor();
    while (cursor) {
      const normalized = {
        ...normalizeSourceRecord(cursor.value, true),
        studyId: cursor.value.studyId,
      };
      await cursor.update(normalized);
      cursor = await cursor.continue();
    }
  }
}
