"use client";

import React, { useState, useRef } from "react";
import { WorkspaceDialog } from "@/components/WorkspaceDialog";
import { parseDocxDocument } from "@/lib/intake/docxParser";
import { importDocxSourcesAndObservations } from "@/lib/intake/docxImporter";
import { sourceFileRepository } from "@/lib/storage/sourceFileRepository";
import type {
  DocxSourceCandidate,
  DocxCandidateObservation,
  DocxImportResult,
} from "@/lib/intake/docxTypes";
import type {
  FieldStudy,
  SensitivityFlag,
  SourceFileId,
  SourceFileMetadata,
  SourceFileContent,
} from "@/lib/types";

interface DocxIntakeModalProps {
  isOpen: boolean;
  study: FieldStudy;
  onClose: () => void;
  onImportComplete: (result: DocxImportResult) => void;
}

export function DocxIntakeModal({
  isOpen,
  study,
  onClose,
  onImportComplete,
}: DocxIntakeModalProps) {
  if (!isOpen) return null;

  return (
    <DocxIntakeModalContent
      study={study}
      onClose={onClose}
      onImportComplete={onImportComplete}
    />
  );
}

function DocxIntakeModalContent({
  study,
  onClose,
  onImportComplete,
}: Omit<DocxIntakeModalProps, "isOpen">) {
  // Wizard steps: 1 = Upload, 2 = Source Metadata & Observations, 3 = Review, 4 = Receipt
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Uploaded files & parse state
  const [filesToProcess, setFilesToProcess] = useState<File[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Parsed candidates
  const [sourceCandidates, setSourceCandidates] = useState<DocxSourceCandidate[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Editing observation state
  const [editingObsId, setEditingObsId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string>("");

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<DocxImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // STEP 1: FILE HANDLING & LOCAL PARSING
  // -------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).filter((f) =>
      f.name.toLowerCase().endsWith(".docx")
    );
    if (selected.length === 0) {
      setParseError("Please select valid .docx Word documents.");
      return;
    }
    setParseError(null);
    setFilesToProcess((prev) => [...prev, ...selected]);
  };

  const handleRemoveFile = (index: number) => {
    setFilesToProcess((prev) => prev.filter((_, i) => i !== index));
  };

  const handleParseFiles = async () => {
    if (filesToProcess.length === 0) {
      setParseError("Please select at least one Word document (.docx).");
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const candidates: DocxSourceCandidate[] = [];
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        const arrayBuffer = await file.arrayBuffer();
        const candidate = await parseDocxDocument(arrayBuffer, file.name, i + 1);
        candidates.push(candidate);
      }

      setSourceCandidates(candidates);
      setActiveFileIndex(0);
      setStep(2);
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Failed to parse Word documents."
      );
    } finally {
      setIsParsing(false);
    }
  };

  // -------------------------------------------------------------
  // STEP 2: METADATA & OBSERVATIONS EDITING
  // -------------------------------------------------------------
  const currentCandidate = sourceCandidates[activeFileIndex] || null;

  const updateCurrentCandidate = (
    updater: (prev: DocxSourceCandidate) => DocxSourceCandidate
  ) => {
    setSourceCandidates((prev) =>
      prev.map((c, idx) => (idx === activeFileIndex ? updater(c) : c))
    );
  };

  const handleToggleCandidateStatus = (
    obsTempId: string,
    status: DocxCandidateObservation["status"]
  ) => {
    updateCurrentCandidate((cand) => ({
      ...cand,
      candidateObservations: cand.candidateObservations.map((obs) =>
        obs.tempId === obsTempId ? { ...obs, status } : obs
      ),
    }));
  };

  const handleStartEditObservation = (obs: DocxCandidateObservation) => {
    setEditingObsId(obs.tempId);
    setEditedText(obs.rawObservation);
  };

  const handleSaveEditObservation = (obsTempId: string) => {
    updateCurrentCandidate((cand) => ({
      ...cand,
      candidateObservations: cand.candidateObservations.map((obs) =>
        obs.tempId === obsTempId
          ? {
              ...obs,
              rawObservation: editedText.trim() || obs.rawObservation,
              status: "edited",
            }
          : obs
      ),
    }));
    setEditingObsId(null);
    setEditedText("");
  };

  const handleCancelEditObservation = () => {
    setEditingObsId(null);
    setEditedText("");
  };

  const handleAcceptAllInCurrentFile = () => {
    updateCurrentCandidate((cand) => ({
      ...cand,
      candidateObservations: cand.candidateObservations.map((obs) => ({
        ...obs,
        status: obs.status === "edited" ? "edited" : "accepted",
      })),
    }));
  };

  const handleSkipAllInCurrentFile = () => {
    updateCurrentCandidate((cand) => ({
      ...cand,
      candidateObservations: cand.candidateObservations.map((obs) => ({
        ...obs,
        status: "skipped",
      })),
    }));
  };

  // -------------------------------------------------------------
  // STEP 3: TRANSACTIONAL IMPORT
  // -------------------------------------------------------------
  // Aggregate summary across all files
  const sessionSummary = React.useMemo(() => {
    let totalCandidates = 0;
    let selectedCount = 0;
    let editedCount = 0;
    let skippedCount = 0;
    const warnings: string[] = [];

    for (const file of sourceCandidates) {
      totalCandidates += file.candidateObservations.length;
      for (const obs of file.candidateObservations) {
        if (obs.status === "accepted") selectedCount++;
        else if (obs.status === "edited") editedCount++;
        else if (obs.status === "skipped") skippedCount++;
      }
      if (file.isDateUnknown || !file.date.trim()) {
        warnings.push(`"${file.filename}": Date is unspecified (will be recorded as Unknown).`);
      }
      if (file.isMethodUnspecified || !file.collectionMethod.trim()) {
        warnings.push(`"${file.filename}": Collection method is unspecified.`);
      }
      if (file.sensitivityFlag === "High") {
        warnings.push(`"${file.filename}": High sensitivity flag flagged.`);
      }
    }

    return {
      totalFiles: sourceCandidates.length,
      totalCandidates,
      selectedCount,
      editedCount,
      skippedCount,
      warningsCount: warnings.length,
      warningMessages: warnings,
    };
  }, [sourceCandidates]);

  const handleExecuteImport = async () => {
    setIsImporting(true);
    setImportError(null);

    try {
      let targetStudy = study;
      if (study.isDemoCase) {
        const { cloneDemoStudy, assembleStudy } = await import("@/lib/storage/studyStore");
        const clonedId = await cloneDemoStudy(study.id, `${study.title} (Field Notes Import)`);
        const assembled = await assembleStudy(clonedId);
        if (!assembled) {
          throw new Error("Failed to initialize editable copy for import.");
        }
        targetStudy = assembled;
      }

      // Preserve original Word document files in local SourceFileRepository
      const preparedCandidates: DocxSourceCandidate[] = [];
      for (let i = 0; i < sourceCandidates.length; i++) {
        const cand = sourceCandidates[i];
        const file = filesToProcess[i];
        const sourceFileId =
          cand.sourceFileId ||
          (`SF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` as SourceFileId);

        if (file && !cand.sourceFileId) {
          const meta: SourceFileMetadata = {
            id: sourceFileId,
            studyId: targetStudy.id,
            filename: file.name,
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            fileSizeBytes: file.size,
            importedAt: Date.now(),
            parsingVersion: 1,
            hasContent: true,
          };
          const content: SourceFileContent = {
            id: sourceFileId,
            studyId: targetStudy.id,
            blob: file,
          };
          try {
            await sourceFileRepository.saveFile(meta, content);
          } catch {
            // Non-fatal if storage quota restricts blob
          }
        }
        preparedCandidates.push({ ...cand, sourceFileId });
      }

      const result = await importDocxSourcesAndObservations(
        targetStudy,
        preparedCandidates
      );
      setImportResult(result);
      setStep(4);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to import Word documents."
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <WorkspaceDialog
      labelledBy="docx-intake-title"
      onClose={onClose}
      wide={true}
    >
      <div className="flex flex-col max-h-[85vh] text-[var(--foreground)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <span className="fls-eyebrow">FIELD MATERIAL INTAKE</span>
            <h2 id="docx-intake-title" className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
              Word Document Intake (.docx)
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Step Indicator */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted-soft)]">
              <span className={`px-2 py-0.5 rounded font-mono ${step === 1 ? "bg-[var(--accent)] text-white font-bold" : "bg-[var(--surface-muted)]"}`}>1. Upload</span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded font-mono ${step === 2 ? "bg-[var(--accent)] text-white font-bold" : "bg-[var(--surface-muted)]"}`}>2. Extract &amp; Review</span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded font-mono ${step === 3 ? "bg-[var(--accent)] text-white font-bold" : "bg-[var(--surface-muted)]"}`}>3. Summary</span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded font-mono ${step === 4 ? "bg-emerald-600 text-white font-bold" : "bg-[var(--surface-muted)]"}`}>4. Receipt</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm px-2 py-1 rounded"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="overflow-y-auto px-6 py-5 flex-1 space-y-6">
          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Privacy Notice */}
              <div className="rounded-lg border border-sky-500/30 bg-sky-950/20 p-4 text-xs text-sky-200 flex items-start gap-3">
                <span className="text-base">🔒</span>
                <div>
                  <strong className="block font-semibold text-sky-100">
                    Client-Side Local-First Document Processing
                  </strong>
                  <p className="mt-1 leading-relaxed text-sky-300">
                    Word documents are extracted entirely inside your browser. No text or file bytes are sent to external cloud servers, document-conversion backends, or third-party AI APIs.
                  </p>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--accent)] rounded-xl p-8 text-center cursor-pointer bg-[var(--surface-muted)]/50 hover:bg-[var(--surface-elevated)] transition flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-xl text-[var(--accent-strong)]">
                  📄
                </div>
                <div>
                  <p className="font-semibold text-sm text-[var(--foreground)]">
                    Click to select Word documents (.docx) or drag and drop
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Supports single or multiple Word files in one intake session.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* File List */}
              {filesToProcess.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Selected Files ({filesToProcess.length})
                  </h3>
                  <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                    {filesToProcess.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--accent-strong)]">📄</span>
                          <span className="font-semibold text-[var(--foreground)]">{f.name}</span>
                          <span className="text-[var(--muted-soft)] font-mono text-[11px]">
                            ({(f.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(i)}
                          className="text-rose-400 hover:text-rose-300 font-medium px-2 py-0.5 rounded hover:bg-rose-950/20"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parseError && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 text-xs text-rose-300 font-medium">
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: METADATA & OBSERVATIONS */}
          {step === 2 && currentCandidate && (
            <div className="space-y-6">
              {/* File Tabs */}
              {sourceCandidates.length > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] pb-2">
                  {sourceCandidates.map((cand, idx) => (
                    <button
                      key={cand.tempId}
                      type="button"
                      onClick={() => {
                        setActiveFileIndex(idx);
                        setEditingObsId(null);
                      }}
                      className={`rounded px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                        idx === activeFileIndex
                          ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border-strong)] shadow-xs"
                          : "text-[var(--muted)] hover:text-[var(--foreground)] border border-transparent"
                      }`}
                    >
                      📄 {cand.filename} ({cand.candidateObservations.length} obs)
                    </button>
                  ))}
                </div>
              )}

              {/* Source Metadata Card */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                    Source Record Metadata
                  </h3>
                  <span className="font-mono text-[11px] text-[var(--muted)]">
                    File: {currentCandidate.filename}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[var(--muted)]">
                      Source Title *
                    </label>
                    <input
                      type="text"
                      value={currentCandidate.title}
                      onChange={(e) =>
                        updateCurrentCandidate((c) => ({
                          ...c,
                          title: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)]"
                      placeholder="e.g. KII with District Medical Director"
                    />
                  </div>

                  {/* Date with Unknown toggle */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-[var(--muted)]">
                        Date of Field Material
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-[var(--muted)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentCandidate.isDateUnknown}
                          onChange={(e) =>
                            updateCurrentCandidate((c) => ({
                              ...c,
                              isDateUnknown: e.target.checked,
                              date: e.target.checked ? "" : c.date,
                            }))
                          }
                          className="rounded text-[var(--accent)]"
                        />
                        <span>Unknown / Unspecified</span>
                      </label>
                    </div>
                    <input
                      type="date"
                      disabled={currentCandidate.isDateUnknown}
                      value={currentCandidate.date}
                      onChange={(e) =>
                        updateCurrentCandidate((c) => ({
                          ...c,
                          date: e.target.value,
                          isDateUnknown: false,
                        }))
                      }
                      className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)] disabled:opacity-40"
                    />
                  </div>

                  {/* Method */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[var(--muted)]">
                      Collection Method
                    </label>
                    <select
                      value={
                        currentCandidate.isMethodUnspecified
                          ? "Unspecified Method"
                          : currentCandidate.collectionMethod
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        updateCurrentCandidate((c) => ({
                          ...c,
                          collectionMethod: val,
                          isMethodUnspecified: val === "Unspecified Method",
                        }));
                      }}
                      className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)]"
                    >
                      <option value="Unspecified Method">Unspecified Method</option>
                      <option value="Key Informant Interview">Key Informant Interview</option>
                      <option value="Focus Group Discussion">Focus Group Discussion</option>
                      <option value="Direct Observation">Direct Observation</option>
                      <option value="Document Review">Document Review</option>
                      <option value="Community Meeting">Community Meeting</option>
                      <option value="Survey / Questionnaire">Survey / Questionnaire</option>
                    </select>
                  </div>

                  {/* Location / Site */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[var(--muted)]">
                      Site / Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={currentCandidate.siteId}
                      onChange={(e) =>
                        updateCurrentCandidate((c) => ({
                          ...c,
                          siteId: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)]"
                      placeholder="e.g. Assiut District Clinic"
                    />
                  </div>

                  {/* Stakeholder Group */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[var(--muted)]">
                      Stakeholder Group (Optional)
                    </label>
                    <input
                      type="text"
                      value={currentCandidate.stakeholderType}
                      onChange={(e) =>
                        updateCurrentCandidate((c) => ({
                          ...c,
                          stakeholderType: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)]"
                      placeholder="e.g. Health Workers, Community Elders"
                    />
                  </div>

                  {/* Sensitivity */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[var(--muted)]">
                      Sensitivity / Handling
                    </label>
                    <select
                      value={currentCandidate.sensitivityFlag}
                      onChange={(e) =>
                        updateCurrentCandidate((c) => ({
                          ...c,
                          sensitivityFlag: e.target.value as SensitivityFlag,
                        }))
                      }
                      className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)]"
                    >
                      <option value="None">None</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High (Restricted / Confidential)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Candidate Observations Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                      Extracted Candidate Observations ({currentCandidate.candidateObservations.length})
                    </h3>
                    <p className="text-[11px] text-[var(--muted)]">
                      Select which observations to import. You can edit text or skip noisy items.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAcceptAllInCurrentFile}
                      className="text-xs font-medium text-[var(--accent-strong)] hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-[var(--muted-soft)]">·</span>
                    <button
                      type="button"
                      onClick={handleSkipAllInCurrentFile}
                      className="text-xs font-medium text-[var(--muted)] hover:underline"
                    >
                      Skip All
                    </button>
                  </div>
                </div>

                {/* Candidate Observations List */}
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {currentCandidate.candidateObservations.map((obs) => {
                    const isEditing = editingObsId === obs.tempId;
                    const isSkipped = obs.status === "skipped";

                    return (
                      <div
                        key={obs.tempId}
                        className={`rounded-lg border p-3 text-xs transition space-y-2 ${
                          isSkipped
                            ? "border-[var(--border)] bg-[var(--surface-muted)]/40 opacity-60"
                            : obs.status === "edited"
                            ? "border-amber-500/40 bg-[var(--surface-elevated)]"
                            : "border-[var(--border)] bg-[var(--surface)]"
                        }`}
                      >
                        {/* Clue and Controls Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] text-[var(--muted)] bg-[var(--surface-muted)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                              {obs.locationClue}
                            </span>
                            <span className="text-[10px] text-[var(--muted-soft)] font-mono">
                              ({obs.wordCount} words · {obs.segmentType})
                            </span>
                            {obs.status === "edited" && (
                              <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/30 px-1.5 py-0.2 rounded border border-amber-500/30">
                                Edited
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleCandidateStatus(obs.tempId, "accepted")}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                obs.status === "accepted"
                                  ? "bg-emerald-600 text-white"
                                  : "text-[var(--muted)] hover:text-emerald-400 border border-[var(--border)]"
                              }`}
                            >
                              ✓ Accept
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                isEditing
                                  ? handleCancelEditObservation()
                                  : handleStartEditObservation(obs)
                              }
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                isEditing
                                  ? "bg-amber-600 text-white"
                                  : "text-[var(--muted)] hover:text-amber-400 border border-[var(--border)]"
                              }`}
                            >
                              ✎ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleCandidateStatus(obs.tempId, "skipped")}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                obs.status === "skipped"
                                  ? "bg-slate-700 text-white"
                                  : "text-[var(--muted)] hover:text-rose-400 border border-[var(--border)]"
                              }`}
                            >
                              ✕ Skip
                            </button>
                          </div>
                        </div>

                        {/* Observation Text Body */}
                        {isEditing ? (
                          <div className="space-y-2 pt-1">
                            <textarea
                              value={editedText}
                              onChange={(e) => setEditedText(e.target.value)}
                              rows={3}
                              className="w-full rounded border border-amber-500/50 bg-[var(--surface)] p-2 text-xs text-[var(--foreground)]"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={handleCancelEditObservation}
                                className="px-2 py-1 text-[11px] text-[var(--muted)]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditObservation(obs.tempId)}
                                className="px-3 py-1 text-[11px] font-semibold bg-amber-600 text-white rounded"
                              >
                                Save Edit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-[var(--foreground)] leading-relaxed">
                            {obs.rawObservation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW SUMMARY */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">
                    DOCX Intake Summary
                  </h3>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Review extracted material before executing transactional import.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                    <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Files</span>
                    <p className="text-xl font-bold text-[var(--foreground)] mt-1">
                      {sessionSummary.totalFiles}
                    </p>
                    <span className="text-[11px] text-[var(--muted-soft)]">Word documents</span>
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                    <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Sources</span>
                    <p className="text-xl font-bold text-[var(--foreground)] mt-1">
                      {sessionSummary.totalFiles}
                    </p>
                    <span className="text-[11px] text-[var(--muted-soft)]">Source records to create</span>
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                    <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Observations</span>
                    <p className="text-xl font-bold text-emerald-400 mt-1">
                      {sessionSummary.selectedCount + sessionSummary.editedCount}
                    </p>
                    <span className="text-[11px] text-[var(--muted-soft)]">
                      {sessionSummary.selectedCount} accepted · {sessionSummary.editedCount} edited
                    </span>
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                    <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Skipped</span>
                    <p className="text-xl font-bold text-[var(--muted)] mt-1">
                      {sessionSummary.skippedCount}
                    </p>
                    <span className="text-[11px] text-[var(--muted-soft)]">Excluded candidate noise</span>
                  </div>
                </div>

                {/* Warnings Section */}
                {sessionSummary.warningsCount > 0 ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold text-xs">⚠️ Warnings ({sessionSummary.warningsCount})</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-xs text-amber-200">
                      {sessionSummary.warningMessages.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300">
                    ✓ All documents have complete metadata and no scope discrepancies.
                  </div>
                )}
              </div>

              {importError && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-4 text-xs text-rose-300 font-medium">
                  {importError}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: RECEIPT */}
          {step === 4 && importResult && (
            <div className="space-y-6 text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-950/50 border border-emerald-500/50 mx-auto flex items-center justify-center text-2xl text-emerald-400">
                ✓
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Word Material Successfully Imported
                </h3>
                <p className="text-xs text-[var(--muted)] mt-1 max-w-md mx-auto">
                  New records have been transactionally created and added to Field Material. All imported observations require practitioner review before validation.
                </p>
              </div>

              <div className="inline-flex items-center gap-6 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 text-xs font-mono">
                <div>
                  <span className="text-[var(--muted)]">Sources:</span>{" "}
                  <strong className="text-[var(--foreground)]">{importResult.sourcesCount}</strong>
                </div>
                <div className="w-px h-4 bg-[var(--border)]" />
                <div>
                  <span className="text-[var(--muted)]">Draft Observations:</span>{" "}
                  <strong className="text-[var(--foreground)]">{importResult.evidenceCount}</strong>
                </div>
                <div className="w-px h-4 bg-[var(--border)]" />
                <div>
                  <span className="text-amber-400 font-semibold">Needs Review:</span>{" "}
                  <strong className="text-amber-300">{importResult.needsReviewCount}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4 bg-[var(--surface)]">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={filesToProcess.length === 0 || isParsing}
                onClick={handleParseFiles}
                className="fls-button fls-button-primary disabled:opacity-50"
              >
                {isParsing ? "Extracting Word Content..." : "Extract Candidate Observations →"}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ← Back to Upload
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="fls-button fls-button-primary"
              >
                Review Intake Summary →
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ← Back to Edit
              </button>
              <button
                type="button"
                disabled={isImporting || sessionSummary.selectedCount + sessionSummary.editedCount === 0}
                onClick={handleExecuteImport}
                className="fls-button fls-button-primary disabled:opacity-50"
              >
                {isImporting
                  ? "Importing Transactionally..."
                  : `Import ${sessionSummary.selectedCount + sessionSummary.editedCount} Selected Material`}
              </button>
            </>
          )}

          {step === 4 && importResult && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onImportComplete(importResult);
                  onClose();
                }}
                className="fls-button fls-button-primary"
              >
                Proceed to Field Material Review →
              </button>
            </div>
          )}
        </div>
      </div>
    </WorkspaceDialog>
  );
}
