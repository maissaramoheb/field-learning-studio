import { getDb } from "./indexedDb";
import type {
  SourceFileId,
  StudyId,
  SourceFileMetadata,
  SourceFileContent,
} from "@/lib/types";

export interface StorageQuotaEstimate {
  usageBytes: number;
  quotaBytes: number;
  percentageUsed: number;
  isWarningThreshold: boolean;
}

export class SourceFileRepository {
  async saveFile(
    metadata: SourceFileMetadata,
    content: SourceFileContent
  ): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(["sourceFileMetadata", "sourceFileContent"], "readwrite");
    await Promise.all([
      tx.objectStore("sourceFileMetadata").put(metadata),
      tx.objectStore("sourceFileContent").put(content),
      tx.done,
    ]);
  }

  async getFileMetadata(id: SourceFileId): Promise<SourceFileMetadata | undefined> {
    const db = await getDb();
    return db.get("sourceFileMetadata", id);
  }

  async listMetadataForStudy(studyId: StudyId): Promise<SourceFileMetadata[]> {
    const db = await getDb();
    return db.getAllFromIndex("sourceFileMetadata", "by_study", studyId);
  }

  async getFileContent(id: SourceFileId): Promise<SourceFileContent | undefined> {
    const db = await getDb();
    return db.get("sourceFileContent", id);
  }

  async getFileBlob(id: SourceFileId): Promise<Blob | undefined> {
    const content = await this.getFileContent(id);
    return content?.blob;
  }

  async deleteFile(id: SourceFileId): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(["sourceFileMetadata", "sourceFileContent"], "readwrite");
    await Promise.all([
      tx.objectStore("sourceFileMetadata").delete(id),
      tx.objectStore("sourceFileContent").delete(id),
      tx.done,
    ]);
  }

  async getStorageUsage(): Promise<StorageQuotaEstimate> {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageBytes = estimate.usage ?? 0;
        const quotaBytes = estimate.quota ?? 1;
        const percentageUsed = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;
        const remainingBytes = quotaBytes - usageBytes;
        const isWarningThreshold = percentageUsed >= 80 || remainingBytes < 50 * 1024 * 1024;
        return {
          usageBytes,
          quotaBytes,
          percentageUsed,
          isWarningThreshold,
        };
      } catch {
        // Fallback for environments where estimate() throws or is unavailable
      }
    }
    return {
      usageBytes: 0,
      quotaBytes: 0,
      percentageUsed: 0,
      isWarningThreshold: false,
    };
  }
}

export const sourceFileRepository = new SourceFileRepository();
