"use client";

import React, { useState } from "react";
import {
  exportStudyBackup,
  inspectStudyBackup,
  importStudyBackup,
  type BackupInspectionResult,
  type ImportStrategy,
} from "@/lib/storage/studyBackup";
import type { FieldStudy, StudyMeta } from "@/lib/types";

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudy: FieldStudy | null;
  allStudies: StudyMeta[];
  onStudyRestored: (studyId: string) => void;
}

export function BackupRestoreModal({
  isOpen,
  onClose,
  currentStudy,
  allStudies,
  onStudyRestored,
}: BackupRestoreModalProps) {
  const [activeTab, setActiveTab] = useState<"backup" | "restore">("backup");

  // Backup State
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Restore State
  const [fileName, setFileName] = useState<string>("");
  const [inspection, setInspection] = useState<BackupInspectionResult | null>(null);
  const [strategy, setStrategy] = useState<ImportStrategy>("import_as_new");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = async () => {
    if (!currentStudy) return;
    try {
      setIsExporting(true);
      const json = await exportStudyBackup(currentStudy.id);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeTitle = currentStudy.title.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `fls-backup-${safeTitle}-${dateStr}.fls.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportNotice("Backup file downloaded successfully.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to export backup.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportError(null);
    try {
      const text = await file.text();
      const existingIds = allStudies.map((s) => s.id);
      const result = await inspectStudyBackup(text, existingIds);
      setInspection(result);
      if (result.preview?.collisionDetected) {
        setStrategy("import_as_new");
      }
    } catch {
      setImportError("Failed to read file.");
    }
  };

  const handleExecuteRestore = async () => {
    if (!inspection || !inspection.valid || !inspection.envelope) return;
    try {
      setIsImporting(true);
      setImportError(null);
      const result = await importStudyBackup(inspection.envelope, strategy);
      if (result.success) {
        onStudyRestored(result.studyId);
        onClose();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to restore backup.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-restore-title"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <h3 id="backup-restore-title" className="text-lg font-bold text-[var(--foreground)]">
              Study Backup & Recovery
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Local, self-contained study archives (.fls.json)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)] text-lg"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 flex border-b border-[var(--border)]">
          <button
            type="button"
            onClick={() => setActiveTab("backup")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === "backup"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Export Backup (.fls.json)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("restore")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === "restore"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Restore Study Archive
          </button>
        </div>

        {/* Tab 1: Backup */}
        {activeTab === "backup" && (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-200 space-y-2">
              <p className="font-semibold text-amber-300">
                Security & Data Protection Notice:
              </p>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                Study backups are exported as <strong>unencrypted JSON files</strong> stored on your local disk.
                They contain raw field notes, stakeholder identities, and analytical drafts.
                Ensure exported archives are handled in strict compliance with your institutional ethics protocols,
                participant consent agreements, and local data protection regulations.
              </p>
            </div>

            {currentStudy ? (
              <div className="rounded-lg border border-[var(--border)] bg-slate-900/40 p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Active Study:</span>
                  <span className="font-semibold text-[var(--foreground)]">{currentStudy.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Study ID:</span>
                  <span className="font-mono text-[var(--trace)]">{currentStudy.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Records:</span>
                  <span className="text-[var(--foreground)]">
                    {currentStudy.sources.length} sources · {currentStudy.evidence.length} evidence ·{" "}
                    {currentStudy.findings.length} findings · {currentStudy.recommendations.length} recommendations
                  </span>
                </div>
              </div>
            ) : null}

            {exportNotice && (
              <div className="rounded bg-emerald-950/40 border border-emerald-500/40 p-3 text-xs text-emerald-300">
                ✓ {exportNotice}
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={isExporting || !currentStudy}
                className="rounded bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-sky-500 disabled:opacity-50 transition cursor-pointer"
              >
                {isExporting ? "Exporting..." : "Download .fls.json Backup"}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Restore */}
        {activeTab === "restore" && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                Select .fls.json Archive File
              </label>
              <input
                type="file"
                accept=".json,.fls.json"
                onChange={handleFileSelect}
                className="block w-full text-xs text-[var(--muted)] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-sky-950/60 file:text-sky-300 hover:file:bg-sky-900/60 cursor-pointer"
              />
              {fileName && <p className="mt-1 text-[11px] text-[var(--muted)]">Loaded: {fileName}</p>}
            </div>

            {/* Inspection Preview */}
            {inspection && (
              <div className="space-y-3">
                {inspection.valid && inspection.preview ? (
                  <div className="rounded-lg border border-[var(--border)] bg-slate-900/40 p-4 text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-400">✓ Archive Validated</span>
                      <span className="text-[10px] text-[var(--muted)]">
                        Exported: {new Date(inspection.preview.exportedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-[var(--border)] pt-2">
                      <div>
                        <span className="text-[var(--muted)]">Title: </span>
                        <strong className="text-[var(--foreground)]">{inspection.preview.studyTitle}</strong>
                      </div>
                      <div>
                        <span className="text-[var(--muted)]">Study ID: </span>
                        <span className="font-mono text-[var(--trace)]">{inspection.preview.studyId}</span>
                      </div>
                      <div>
                        <span className="text-[var(--muted)]">Sources: </span>
                        <span>{inspection.preview.sourceCount}</span>
                      </div>
                      <div>
                        <span className="text-[var(--muted)]">Evidence: </span>
                        <span>{inspection.preview.evidenceCount}</span>
                      </div>
                      <div>
                        <span className="text-[var(--muted)]">Findings: </span>
                        <span>{inspection.preview.findingCount}</span>
                      </div>
                      <div>
                        <span className="text-[var(--muted)]">Recommendations: </span>
                        <span>{inspection.preview.recommendationCount}</span>
                      </div>
                    </div>

                    {/* Collision Strategy Selection */}
                    {inspection.preview.collisionDetected && (
                      <div className="mt-3 rounded border border-amber-500/40 bg-amber-950/20 p-3 space-y-2">
                        <p className="text-[11px] font-semibold text-amber-300">
                          ⚠️ Study ID &quot;{inspection.preview.studyId}&quot; already exists locally.
                        </p>
                        <p className="text-[11px] text-amber-200/90">
                          Select collision handling mode (no silent overwrite):
                        </p>
                        <div className="space-y-1.5 pt-1">
                          <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                            <input
                              type="radio"
                              name="strategy"
                              value="import_as_new"
                              checked={strategy === "import_as_new"}
                              onChange={() => setStrategy("import_as_new")}
                              className="accent-sky-500"
                            />
                            <span>
                              <strong>Import as New Copy</strong> (generates a new unique study ID, recommended)
                            </span>
                          </label>
                          <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                            <input
                              type="radio"
                              name="strategy"
                              value="overwrite"
                              checked={strategy === "overwrite"}
                              onChange={() => setStrategy("overwrite")}
                              className="accent-rose-500"
                            />
                            <span className="text-rose-300">
                              <strong>Overwrite Existing Study</strong> (replaces local records completely)
                            </span>
                          </label>
                          <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                            <input
                              type="radio"
                              name="strategy"
                              value="reject_collision"
                              checked={strategy === "reject_collision"}
                              onChange={() => setStrategy("reject_collision")}
                              className="accent-slate-500"
                            />
                            <span>
                              <strong>Reject Import</strong> (abort on collision)
                            </span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-4 text-xs space-y-2 text-rose-300">
                    <p className="font-semibold text-rose-400">✗ Archive Failed Integrity Validation:</p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px]">
                      {inspection.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {importError && (
              <div className="rounded bg-rose-950/40 border border-rose-500/40 p-3 text-xs text-rose-300">
                {importError}
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={!inspection || !inspection.valid || isImporting || strategy === "reject_collision"}
                className="rounded bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50 transition cursor-pointer"
              >
                {isImporting ? "Restoring..." : "Restore Study Archive"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
