"use client";

import React, { useState } from "react";
import { getNextSequenceOfEvidenceIds } from "@/lib/idGenerator";
import { saveEvidenceBatch } from "@/lib/storage/studyStore";
import { splitNarrativeIntoSegments, type CandidateSegment, type SplitMode } from "@/lib/intake/segmentationHelper";
import type {
  SourceRecord,
  EvidenceEntry,
  EvidenceStrength,
  SensitivityFlag,
  FieldStudy,
} from "@/lib/types";

interface BatchObservationRow {
  tempId: string;
  selected: boolean;
  rawObservation: string;
  interpretation: string;
  primaryTheme: string;
  secondaryTheme: string;
  evidenceStrength: EvidenceStrength;
  sensitivityFlag: SensitivityFlag;
}

interface BatchObservationBuilderProps {
  study: FieldStudy;
  activeSource: SourceRecord;
  onEvidenceBatchSaved: (count: number) => void;
  onClose: () => void;
}

const STRENGTH_OPTIONS: EvidenceStrength[] = ["High", "Medium", "Low"];
const SENSITIVITY_FLAGS: SensitivityFlag[] = ["None", "Low", "Medium", "High"];

let tempRowCounter = 0;
function getNextTempRowId(): string {
  tempRowCounter += 1;
  return `row-temp-${tempRowCounter}`;
}

export function BatchObservationBuilder({
  study,
  activeSource,
  onEvidenceBatchSaved,
  onClose,
}: BatchObservationBuilderProps) {
  const defaultTheme = React.useMemo(() => {
    const existingThemes = Array.from(
      new Set(study.evidence.map((e) => e.primaryTheme).filter(Boolean))
    );
    return existingThemes[0] || "Operational Execution";
  }, [study.evidence]);

  const availableThemes = React.useMemo(() => {
    const fromEvidence = study.evidence.map((e) => e.primaryTheme).filter(Boolean);
    const defaults = [
      "Operational Execution",
      "Logistics & Delivery",
      "Community Acceptance",
      "Targeting & Selection",
      "Safety & Protection",
      "Program Governance",
    ];
    return Array.from(new Set([...fromEvidence, ...defaults]));
  }, [study.evidence]);
  const [rows, setRows] = useState<BatchObservationRow[]>([]);
  const [candidateSegments, setCandidateSegments] = useState<CandidateSegment[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>("both");
  const [bulkTheme, setBulkTheme] = useState<string>(defaultTheme);
  const [bulkStrength, setBulkStrength] = useState<EvidenceStrength>("Medium");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Add from selected text
  const handleUseSelectedText = () => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";
    if (!text) {
      alert("Please highlight/select text from the Source Narrative first.");
      return;
    }
    const newRow: BatchObservationRow = {
      tempId: getNextTempRowId(),
      selected: true,
      rawObservation: text,
      interpretation: "",
      primaryTheme: defaultTheme,
      secondaryTheme: "General",
      evidenceStrength: "Medium",
      sensitivityFlag: activeSource.sensitivityFlag || "None",
    };
    setRows((prev) => [...prev, newRow]);
  };

  // 2. Add blank candidate row
  const handleAddBlankRow = () => {
    const newRow: BatchObservationRow = {
      tempId: getNextTempRowId(),
      selected: true,
      rawObservation: "",
      interpretation: "",
      primaryTheme: defaultTheme,
      secondaryTheme: "General",
      evidenceStrength: "Medium",
      sensitivityFlag: activeSource.sensitivityFlag || "None",
    };
    setRows((prev) => [...prev, newRow]);
  };

  // 3. Split narrative into candidate segments
  const handleSplitSegments = () => {
    const text = activeSource.rawText || activeSource.summary || "";
    if (!text.trim()) {
      alert("Source narrative is empty.");
      return;
    }
    const segments = splitNarrativeIntoSegments(text, splitMode);
    setCandidateSegments(segments);
  };

  // 4. Convert segment into candidate row
  const handleAddSegmentAsRow = (segment: CandidateSegment) => {
    const newRow: BatchObservationRow = {
      tempId: getNextTempRowId(),
      selected: true,
      rawObservation: segment.text,
      interpretation: "",
      primaryTheme: defaultTheme,
      secondaryTheme: "General",
      evidenceStrength: "Medium",
      sensitivityFlag: activeSource.sensitivityFlag || "None",
    };
    setRows((prev) => [...prev, newRow]);
  };

  // Add all segments as rows
  const handleAddAllSegments = () => {
    const newRows: BatchObservationRow[] = candidateSegments.map((seg) => ({
      tempId: getNextTempRowId(),
      selected: true,
      rawObservation: seg.text,
      interpretation: "",
      primaryTheme: defaultTheme,
      secondaryTheme: "General",
      evidenceStrength: "Medium",
      sensitivityFlag: activeSource.sensitivityFlag || "None",
    }));
    setRows((prev) => [...prev, ...newRows]);
    setCandidateSegments([]);
  };

  // Row update helpers
  const handleUpdateRow = (id: string, updates: Partial<BatchObservationRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.tempId === id ? { ...r, ...updates } : r))
    );
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.tempId !== id));
  };

  // Bulk operations
  const handleToggleSelectAll = (checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const handleApplyBulkTheme = () => {
    if (!bulkTheme.trim()) return;
    setRows((prev) =>
      prev.map((r) => (r.selected ? { ...r, primaryTheme: bulkTheme.trim() } : r))
    );
  };

  const handleApplyBulkStrength = () => {
    setRows((prev) =>
      prev.map((r) => (r.selected ? { ...r, evidenceStrength: bulkStrength } : r))
    );
  };

  const handleRemoveSelectedRows = () => {
    setRows((prev) => prev.filter((r) => !r.selected));
  };

  // Batch Save Execution
  const handleSaveBatch = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const selectedRows = rows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      setErrorMsg("No observation rows selected for saving.");
      return;
    }

    // Validation: ensure raw observation text is filled (interpretation is optional)
    const invalidRows = selectedRows.filter(
      (r) => !r.rawObservation.trim()
    );
    if (invalidRows.length > 0) {
      setErrorMsg(
        `Cannot save: ${invalidRows.length} selected row(s) are missing required Raw Observation text.`
      );
      return;
    }

    try {
      setIsSaving(true);
      const existingEvidenceIds = study.evidence.map((e) => e.id);
      const newIds = getNextSequenceOfEvidenceIds(existingEvidenceIds, selectedRows.length);
      const now = Date.now();

      const newEntries: (EvidenceEntry & { studyId: string })[] = selectedRows.map(
        (row, idx) => ({
          id: newIds[idx],
          studyId: study.id,
          sourceId: activeSource.id,
          siteId: activeSource.siteId || activeSource.location,
          stakeholderType: activeSource.stakeholderType,
          rawEvidence: row.rawObservation.trim(),
          rawObservation: row.rawObservation.trim(),
          interpretation: row.interpretation.trim() || "",
          primaryTheme: row.primaryTheme.trim() || defaultTheme,
          secondaryTheme: row.secondaryTheme.trim() || "General",
          evidenceStrength: row.evidenceStrength,
          sensitivityFlag: row.sensitivityFlag,
          potentialFinding: row.interpretation.trim() || "",
          qaStatus: "Needs Review",
          validationStatus: "Draft",
          revision: 1,
          createdAt: now + idx,
          updatedAt: now + idx,
        })
      );

      await saveEvidenceBatch(newEntries);
      onEvidenceBatchSaved(newEntries.length);
      setSuccessMsg(`Successfully saved ${newEntries.length} candidate observation(s) as Draft.`);

      // Keep unselected rows, remove saved rows
      setRows((prev) => prev.filter((r) => !r.selected));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save observation batch.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = rows.filter((r) => r.selected).length;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[var(--trace)]">
              {activeSource.id}
            </span>
            <span className="text-xs text-[var(--muted)]">•</span>
            <span className="rounded bg-[var(--surface-muted)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
              {activeSource.siteId || activeSource.location}
            </span>
            <span className="rounded bg-[var(--surface-muted)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
              {activeSource.stakeholderType}
            </span>
          </div>
          <h3 className="mt-1 text-base font-bold text-[var(--foreground)]">
            Batch Observation Builder · Extract Multiple Observations
          </h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Build and refine candidate evidence observations from &ldquo;{activeSource.title}&rdquo; before saving as Drafts.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition"
        >
          Close Batch Builder
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-300">
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-3 text-xs text-emerald-300">
          ✓ {successMsg}
        </div>
      )}

      {/* Two-Column Layout: Left Narrative & Segmenter / Right Batch Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Source Narrative & Segmentation Helpers (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Source Narrative
              </span>
              <button
                type="button"
                onClick={handleUseSelectedText}
                className="rounded bg-[var(--trace)]/20 border border-[var(--trace)]/40 px-2 py-0.5 text-[11px] font-semibold text-[var(--trace)] hover:bg-[var(--trace)]/30 transition"
              >
                Use Highlighted Text
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto rounded border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-relaxed text-[var(--foreground)] whitespace-pre-wrap select-text">
              {activeSource.rawText || activeSource.summary || "No narrative content recorded for this source."}
            </div>
            <p className="mt-1.5 text-[10px] text-[var(--muted)]">
              Tip: Highlight any portion of text above and click &ldquo;Use Highlighted Text&rdquo; to add it as a candidate observation row.
            </p>
          </div>

          {/* Segmentation Helper Box */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                  Split Narrative into Segments
                </h4>
                <p className="text-[11px] text-[var(--muted)]">
                  Deterministic helper to break text into candidate segments (not evidence).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={splitMode}
                onChange={(e) => setSplitMode(e.target.value as SplitMode)}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--foreground)] focus:outline-none"
              >
                <option value="both">Paragraphs & Bullets</option>
                <option value="paragraphs">Paragraphs Only</option>
                <option value="bullets">Bullet Points Only</option>
              </select>

              <button
                type="button"
                onClick={handleSplitSegments}
                className="rounded bg-[var(--surface-elevated)] border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--trace)] transition"
              >
                Split Narrative
              </button>
            </div>

            {/* Candidate Segments List */}
            {candidateSegments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                  <span>{candidateSegments.length} candidate segment(s) generated</span>
                  <button
                    type="button"
                    onClick={handleAddAllSegments}
                    className="text-[var(--trace)] hover:underline font-semibold"
                  >
                    + Add All as Rows
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {candidateSegments.map((seg) => (
                    <div
                      key={seg.id}
                      className="rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-xs flex items-start justify-between gap-2"
                    >
                      <p className="line-clamp-2 text-[11px] text-[var(--foreground)]">
                        {seg.text}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleAddSegmentAsRow(seg)}
                        className="shrink-0 rounded bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-[var(--accent-strong)]"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Batch Observation Table / Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && rows.every((r) => r.selected)}
                  onChange={(e) => handleToggleSelectAll(e.target.checked)}
                  className="rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)]"
                />
                Select All ({rows.length})
              </label>

              <button
                type="button"
                onClick={handleAddBlankRow}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--trace)] transition"
              >
                + Blank Row
              </button>
            </div>

            {selectedCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Bulk Theme */}
                <div className="flex items-center gap-1">
                  <select
                    value={bulkTheme}
                    onChange={(e) => setBulkTheme(e.target.value)}
                    className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--foreground)] focus:outline-none"
                  >
                    {availableThemes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyBulkTheme}
                    className="rounded bg-[var(--surface-elevated)] border border-[var(--border)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Set Theme
                  </button>
                </div>

                {/* Bulk Reliability */}
                <div className="flex items-center gap-1">
                  <select
                    value={bulkStrength}
                    onChange={(e) => setBulkStrength(e.target.value as EvidenceStrength)}
                    className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--foreground)] focus:outline-none"
                  >
                    {STRENGTH_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s} Reliability
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyBulkStrength}
                    className="rounded bg-[var(--surface-elevated)] border border-[var(--border)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Set
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveSelectedRows}
                  className="text-[11px] font-semibold text-red-400 hover:text-red-300 ml-1"
                >
                  Delete ({selectedCount})
                </button>
              </div>
            )}
          </div>

          {/* Rows List */}
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center bg-[var(--surface-muted)]">
              <span className="text-2xl">📋</span>
              <h4 className="mt-2 text-sm font-bold text-[var(--foreground)]">
                No Candidate Observations in Batch
              </h4>
              <p className="mt-1 text-xs text-[var(--muted)] max-w-sm mx-auto">
                Highlight text in the Source Narrative, split text into candidate segments, or click &ldquo;+ Blank Row&rdquo; to start building evidence observations.
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleUseSelectedText}
                  className="rounded bg-[var(--trace)]/20 border border-[var(--trace)]/40 px-3 py-1.5 text-xs font-semibold text-[var(--trace)] hover:bg-[var(--trace)]/30"
                >
                  Use Highlighted Text
                </button>
                <button
                  type="button"
                  onClick={handleAddBlankRow}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--trace)]"
                >
                  + Add Blank Row
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {rows.map((row, idx) => (
                <div
                  key={row.tempId}
                  className={`rounded-lg border p-4 space-y-3 transition ${
                    row.selected
                      ? "border-[var(--trace)]/50 bg-[var(--surface-muted)]"
                      : "border-[var(--border)] bg-[var(--surface)] opacity-75"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) => handleUpdateRow(row.tempId, { selected: e.target.checked })}
                        className="rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)]"
                      />
                      <span className="font-mono text-xs font-bold text-[var(--muted)]">
                        Candidate #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={row.primaryTheme}
                        onChange={(e) => handleUpdateRow(row.tempId, { primaryTheme: e.target.value })}
                        className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--foreground)]"
                      >
                        {availableThemes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>

                      <select
                        value={row.evidenceStrength}
                        onChange={(e) =>
                          handleUpdateRow(row.tempId, {
                            evidenceStrength: e.target.value as EvidenceStrength,
                          })
                        }
                        className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--foreground)]"
                        title="Observation Reliability (researcher assessment)"
                      >
                        {STRENGTH_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s} Rel.
                          </option>
                        ))}
                      </select>

                      <select
                        value={row.sensitivityFlag}
                        onChange={(e) =>
                          handleUpdateRow(row.tempId, {
                            sensitivityFlag: e.target.value as SensitivityFlag,
                          })
                        }
                        className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--foreground)]"
                        title="Sensitivity Flag"
                      >
                        {SENSITIVITY_FLAGS.map((s) => (
                          <option key={s} value={s}>
                            {s} Sens.
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.tempId)}
                        className="text-xs text-[var(--muted)] hover:text-red-400 p-1"
                        aria-label="Remove candidate"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                        Raw Observation <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={row.rawObservation}
                        onChange={(e) => handleUpdateRow(row.tempId, { rawObservation: e.target.value })}
                        placeholder="Concrete observation or statement from source..."
                        className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                        Analytical Meaning / Interpretation (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={row.interpretation}
                        onChange={(e) => handleUpdateRow(row.tempId, { interpretation: e.target.value })}
                        placeholder="Why this matters, operational bottleneck, or implication..."
                        className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Batch Save Action Bar */}
          {rows.length > 0 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
              <div className="text-xs text-[var(--muted)]">
                <span>
                  {selectedCount} of {rows.length} observation(s) selected
                </span>
                <span className="block text-[10px] text-[var(--muted-strong)]">
                  Inherits Source {activeSource.id} ({activeSource.siteId || activeSource.location}, {activeSource.stakeholderType}) · Saved as Draft (Rev 1)
                </span>
              </div>

              <button
                type="button"
                onClick={handleSaveBatch}
                disabled={isSaving || selectedCount === 0}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] disabled:opacity-50 transition cursor-pointer"
              >
                {isSaving ? "Saving Observations..." : `Save Selected Observations (${selectedCount})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
