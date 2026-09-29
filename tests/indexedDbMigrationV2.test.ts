import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { openDB, deleteDB } from "idb";
import {
  getDb,
  DB_NAME,
} from "@/lib/storage/indexedDb";
import {
  MIGRATION_BACKUP_DB_NAME,
  MIGRATION_BACKUP_STORE_NAME,
  runPreMigrationBackupIfNeeded,
} from "@/lib/storage/migrationV2";
import {
  V1_MIGRATION_STUDY_ID,
  syntheticV1StudyMeta,
  syntheticV1Sources,
  syntheticV1Evidence,
  syntheticV1Debriefs,
  syntheticV1Findings,
  syntheticV1Lessons,
  syntheticV1GoodPractices,
  syntheticV1Recommendations,
} from "./fixtures/sanitizedV1Database";

/**
 * Helper to seed a pure v1 database (version 1) without v2 stores or fields.
 */
async function seedRawV1Database(dbName: string): Promise<void> {
  const db = await openDB(dbName, 1, {
    upgrade(v1Db) {
      const studyStore = v1Db.createObjectStore("studies", { keyPath: "id" });
      studyStore.createIndex("by_status", "status");
      studyStore.createIndex("by_updatedAt", "updatedAt");

      const sourceStore = v1Db.createObjectStore("sources", {
        keyPath: ["studyId", "id"],
      });
      sourceStore.createIndex("by_study", "studyId");
      sourceStore.createIndex("by_date", ["studyId", "date"]);

      const evidenceStore = v1Db.createObjectStore("evidence", {
        keyPath: ["studyId", "id"],
      });
      evidenceStore.createIndex("by_study", "studyId");
      evidenceStore.createIndex("by_source", ["studyId", "sourceId"]);
      evidenceStore.createIndex("by_validationStatus", ["studyId", "validationStatus"]);

      const debriefStore = v1Db.createObjectStore("debriefs", {
        keyPath: ["studyId", "id"],
      });
      debriefStore.createIndex("by_study", "studyId");
      debriefStore.createIndex("by_date", ["studyId", "date"]);

      const findingStore = v1Db.createObjectStore("findings", {
        keyPath: ["studyId", "id"],
      });
      findingStore.createIndex("by_study", "studyId");
      findingStore.createIndex("by_validationStatus", ["studyId", "validationStatus"]);

      const lessonStore = v1Db.createObjectStore("lessons", {
        keyPath: ["studyId", "id"],
      });
      lessonStore.createIndex("by_study", "studyId");
      lessonStore.createIndex("by_validationStatus", ["studyId", "validationStatus"]);

      const gpStore = v1Db.createObjectStore("goodPractices", {
        keyPath: ["studyId", "id"],
      });
      gpStore.createIndex("by_study", "studyId");
      gpStore.createIndex("by_validationStatus", ["studyId", "validationStatus"]);

      const recStore = v1Db.createObjectStore("recommendations", {
        keyPath: ["studyId", "id"],
      });
      recStore.createIndex("by_study", "studyId");
      recStore.createIndex("by_finding", ["studyId", "linkedFindingId"]);
      recStore.createIndex("by_validationStatus", ["studyId", "validationStatus"]);
    },
  });

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

  await tx.objectStore("studies").put(syntheticV1StudyMeta);
  for (const s of syntheticV1Sources) await tx.objectStore("sources").put(s);
  for (const e of syntheticV1Evidence) await tx.objectStore("evidence").put(e);
  for (const d of syntheticV1Debriefs) await tx.objectStore("debriefs").put(d);
  for (const f of syntheticV1Findings) await tx.objectStore("findings").put(f);
  for (const l of syntheticV1Lessons) await tx.objectStore("lessons").put(l);
  for (const g of syntheticV1GoodPractices) await tx.objectStore("goodPractices").put(g);
  for (const r of syntheticV1Recommendations) await tx.objectStore("recommendations").put(r);

  await tx.done;
  db.close();
}

describe("IndexedDB Schema Migration v1 -> v2 (Phase 0)", () => {
  beforeEach(async () => {
    await deleteDB(DB_NAME);
    await deleteDB(MIGRATION_BACKUP_DB_NAME);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it("1. creates a verified backup in FieldLearningStudioBackupDB before upgrade", async () => {
    await seedRawV1Database(DB_NAME);

    // Run pre-migration backup explicitly
    const result = await runPreMigrationBackupIfNeeded(DB_NAME, MIGRATION_BACKUP_DB_NAME);
    expect(result.needed).toBe(true);
    expect(result.backedUp).toBe(true);

    // Verify backup database contents
    const backupDb = await openDB(MIGRATION_BACKUP_DB_NAME, 1);
    expect(backupDb.objectStoreNames.contains(MIGRATION_BACKUP_STORE_NAME)).toBe(true);

    const backups = await backupDb.getAll(MIGRATION_BACKUP_STORE_NAME);
    expect(backups.length).toBe(1);
    expect(backups[0].studyId).toBe(V1_MIGRATION_STUDY_ID);
    expect(backups[0].study.title).toBe(syntheticV1StudyMeta.title);
    expect(backups[0].sources.length).toBe(syntheticV1Sources.length);
    expect(backups[0].evidence.length).toBe(syntheticV1Evidence.length);
    expect(backups[0].findings.length).toBe(syntheticV1Findings.length);
    expect(backups[0].lessons.length).toBe(syntheticV1Lessons.length);
    expect(backups[0].recommendations.length).toBe(syntheticV1Recommendations.length);

    backupDb.close();

    // Verify that the original main DB is still at version 1!
    const mainDb = await openDB(DB_NAME);
    expect(mainDb.version).toBe(1);
    mainDb.close();
  });

  it("2. halts migration if pre-migration backup verification fails", async () => {
    await seedRawV1Database(DB_NAME);

    // Pre-create the backup DB at version 5 with an incompatible schema to trigger VersionError on backup open
    const preExistingBackupDb = await openDB(MIGRATION_BACKUP_DB_NAME, 5);
    preExistingBackupDb.close();

    const preflight = await runPreMigrationBackupIfNeeded(DB_NAME, MIGRATION_BACKUP_DB_NAME);
    expect(preflight.needed).toBe(true);
    expect(preflight.backedUp).toBe(false);
    expect(preflight.error).toBeTruthy();

    // Attempting getDb() must throw and halt upgrade
    await expect(getDb()).rejects.toThrow(/Pre-migration backup failed/);

    // Main DB must remain at version 1
    const checkDb = await openDB(DB_NAME);
    expect(checkDb.version).toBe(1);
    checkDb.close();
  });

  it("3. upgrades to version 2, creates new stores, and normalizes legacy records transactionally", async () => {
    await seedRawV1Database(DB_NAME);

    // Call getDb() which runs pre-migration backup and upgrades to DB_VERSION (2)
    const db = await getDb();
    expect(db.version).toBe(2);

    // Verify newly added stores exist
    expect(db.objectStoreNames.contains("sourceFileMetadata")).toBe(true);
    expect(db.objectStoreNames.contains("sourceFileContent")).toBe(true);

    // Verify new index on evidence
    const tx = db.transaction(["sources", "evidence", "lessons", "goodPractices", "recommendations"]);
    const evidenceStore = tx.objectStore("evidence");
    expect(evidenceStore.indexNames.contains("by_reviewStatus")).toBe(true);

    // Verify normalized sources
    const sources = await tx.objectStore("sources").getAll();
    expect(sources.length).toBe(4);

    const interviewSrc = sources.find((s) => s.id === "SRC-V1-001");
    expect(interviewSrc?.materialCategory).toBe("primary_evidence");
    expect(interviewSrc?.audit?.provenance).toBe("legacy_unknown");
    expect(interviewSrc?.audit?.createdActor?.displayName).toBe("Legacy Migration Engine");

    const reportSrc = sources.find((s) => s.id === "SRC-V1-002");
    expect(reportSrc?.materialCategory).toBe("secondary_evidence");
    expect(reportSrc?.audit?.provenance).toBe("legacy_unknown");

    const debriefSrc = sources.find((s) => s.id === "SRC-V1-003");
    expect(debriefSrc?.materialCategory).toBe("supervisory_interpretation");
    expect(debriefSrc?.audit?.provenance).toBe("legacy_unknown");

    const unknownSrc = sources.find((s) => s.id === "SRC-V1-004");
    expect(unknownSrc?.materialCategory).toBe("legacy_unclassified");
    expect(unknownSrc?.audit?.provenance).toBe("legacy_unknown");

    // Verify normalized evidence
    const evidence = await tx.objectStore("evidence").getAll();
    expect(evidence.length).toBe(4);

    const ev1 = evidence.find((e) => e.id === "EV-V1-001");
    expect(ev1?.validationStatus).toBe("Validated");
    expect(ev1?.reviewStatus).toBe("usable");
    expect(ev1?.audit?.provenance).toBe("legacy_unknown");

    const ev4 = evidence.find((e) => e.id === "EV-V1-004");
    expect(ev4?.validationStatus).toBe("Needs Review");
    expect(ev4?.reviewStatus).toBe("pending");
    expect(ev4?.audit?.provenance).toBe("legacy_unknown");

    // Verify normalized lessons
    const lessons = await tx.objectStore("lessons").getAll();
    expect(lessons.length).toBe(1);
    const les1 = lessons[0];
    expect(les1.validationStatus).toBe("Validated"); // Preserved!
    expect(les1.linkedFindingIds).toEqual([]);
    expect(les1.lineageStatus).toBe("legacy_unresolved");
    expect(les1.audit?.provenance).toBe("legacy_unknown");

    // Verify normalized good practices
    const gps = await tx.objectStore("goodPractices").getAll();
    expect(gps.length).toBe(1);
    const gp1 = gps[0];
    expect(gp1.validationStatus).toBe("Validated"); // Preserved!
    expect(gp1.linkedFindingIds).toEqual([]);
    expect(gp1.lineageStatus).toBe("legacy_unresolved");
    expect(gp1.audit?.provenance).toBe("legacy_unknown");

    // Verify normalized recommendations
    const recs = await tx.objectStore("recommendations").getAll();
    expect(recs.length).toBe(1);
    const rec1 = recs[0];
    expect(rec1.linkedFindingId).toBe("FND-V1-001");
    expect(rec1.linkedFindingIds).toEqual(["FND-V1-001"]);
    expect(rec1.linkedLessonIds).toEqual([]);
    expect(rec1.audit?.provenance).toBe("legacy_unknown");

    await tx.done;
    db.close();
  });
});
