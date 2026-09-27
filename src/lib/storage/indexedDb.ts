import { openDB, deleteDB, type DBSchema, type IDBPDatabase } from "idb";
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

export const DB_NAME = "FieldLearningStudioDB";
export const DB_VERSION = 1;

export interface FieldLearningStudioDBSchema extends DBSchema {
  studies: {
    key: StudyId;
    value: StudyMeta;
    indexes: {
      by_status: string;
      by_updatedAt: number;
    };
  };
  sources: {
    key: [StudyId, string];
    value: SourceRecord & { studyId: StudyId };
    indexes: {
      by_study: StudyId;
      by_date: [StudyId, string];
    };
  };
  evidence: {
    key: [StudyId, string];
    value: EvidenceEntry & { studyId: StudyId };
    indexes: {
      by_study: StudyId;
      by_source: [StudyId, string];
      by_validationStatus: [StudyId, string];
    };
  };
  debriefs: {
    key: [StudyId, string];
    value: DailyDebrief;
    indexes: {
      by_study: StudyId;
      by_date: [StudyId, string];
    };
  };
  findings: {
    key: [StudyId, string];
    value: Finding & { studyId: StudyId };
    indexes: {
      by_study: StudyId;
      by_validationStatus: [StudyId, string];
    };
  };
  lessons: {
    key: [StudyId, string];
    value: LessonLearned & { studyId: StudyId };
    indexes: {
      by_study: StudyId;
      by_validationStatus: [StudyId, string];
    };
  };
  goodPractices: {
    key: [StudyId, string];
    value: GoodPractice & { studyId: StudyId };
    indexes: {
      by_study: StudyId;
      by_validationStatus: [StudyId, string];
    };
  };
  recommendations: {
    key: [StudyId, string];
    value: Recommendation & { studyId: StudyId };
    indexes: {
      by_study: StudyId;
      by_finding: [StudyId, string];
      by_validationStatus: [StudyId, string];
    };
  };
}

export async function getDb(): Promise<IDBPDatabase<FieldLearningStudioDBSchema>> {
  return openDB<FieldLearningStudioDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("studies")) {
        const studyStore = db.createObjectStore("studies", { keyPath: "id" });
        studyStore.createIndex("by_status", "status");
        studyStore.createIndex("by_updatedAt", "updatedAt");
      }

      if (!db.objectStoreNames.contains("sources")) {
        const sourceStore = db.createObjectStore("sources", {
          keyPath: ["studyId", "id"],
        });
        sourceStore.createIndex("by_study", "studyId");
        sourceStore.createIndex("by_date", ["studyId", "date"]);
      }

      if (!db.objectStoreNames.contains("evidence")) {
        const evidenceStore = db.createObjectStore("evidence", {
          keyPath: ["studyId", "id"],
        });
        evidenceStore.createIndex("by_study", "studyId");
        evidenceStore.createIndex("by_source", ["studyId", "sourceId"]);
        evidenceStore.createIndex("by_validationStatus", ["studyId", "validationStatus"]);
      }

      if (!db.objectStoreNames.contains("debriefs")) {
        const debriefStore = db.createObjectStore("debriefs", {
          keyPath: ["studyId", "id"],
        });
        debriefStore.createIndex("by_study", "studyId");
        debriefStore.createIndex("by_date", ["studyId", "date"]);
      }

      if (!db.objectStoreNames.contains("findings")) {
        const findingStore = db.createObjectStore("findings", {
          keyPath: ["studyId", "id"],
        });
        findingStore.createIndex("by_study", "studyId");
        findingStore.createIndex("by_validationStatus", ["studyId", "validationStatus"]);
      }

      if (!db.objectStoreNames.contains("lessons")) {
        const lessonStore = db.createObjectStore("lessons", {
          keyPath: ["studyId", "id"],
        });
        lessonStore.createIndex("by_study", "studyId");
        lessonStore.createIndex("by_validationStatus", ["studyId", "validationStatus"]);
      }

      if (!db.objectStoreNames.contains("goodPractices")) {
        const gpStore = db.createObjectStore("goodPractices", {
          keyPath: ["studyId", "id"],
        });
        gpStore.createIndex("by_study", "studyId");
        gpStore.createIndex("by_validationStatus", ["studyId", "validationStatus"]);
      }

      if (!db.objectStoreNames.contains("recommendations")) {
        const recStore = db.createObjectStore("recommendations", {
          keyPath: ["studyId", "id"],
        });
        recStore.createIndex("by_study", "studyId");
        recStore.createIndex("by_finding", ["studyId", "linkedFindingId"]);
        recStore.createIndex("by_validationStatus", ["studyId", "validationStatus"]);
      }
    },
  });
}

export async function clearAllStores(): Promise<void> {
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
  await Promise.all([
    tx.objectStore("studies").clear(),
    tx.objectStore("sources").clear(),
    tx.objectStore("evidence").clear(),
    tx.objectStore("debriefs").clear(),
    tx.objectStore("findings").clear(),
    tx.objectStore("lessons").clear(),
    tx.objectStore("goodPractices").clear(),
    tx.objectStore("recommendations").clear(),
    tx.done,
  ]);
}

export async function destroyDatabase(): Promise<void> {
  await deleteDB(DB_NAME);
}
