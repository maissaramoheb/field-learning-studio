"use client";

import React, { useState } from "react";
import { getNextEvidenceId } from "@/lib/idGenerator";
import { saveEvidence } from "@/lib/storage/studyStore";
import { BatchObservationBuilder } from "./BatchObservationBuilder";
import type {
  SourceRecord,
  EvidenceEntry,
  EvidenceStrength,
  SensitivityFlag,
  FieldStudy,
} from "@/lib/types";

interface ObservationCaptureFormProps {
  study: FieldStudy;
  activeSource: SourceRecord;
  onEvidenceCreated: (newEvidence?: EvidenceEntry) => void;
  onBatchEvidenceSaved?: (count: number) => void;
}

const STRENGTH_OPTIONS: EvidenceStrength[] = ["High", "Medium", "Low"];
const SENSITIVITY_FLAGS: SensitivityFlag[] = ["None", "Low", "Medium", "High"];

export function ObservationCaptureForm({
  study,
  activeSource,
  onEvidenceCreated,
  onBatchEvidenceSaved,
}: ObservationCaptureFormProps) {
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [rawObservation, setRawObservation] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [primaryTheme, setPrimaryTheme] = useState("Operational Execution");
  const [secondaryTheme, setSecondaryTheme] = useState("");
  const [evidenceStrength, setEvidenceStrength] = useState<EvidenceStrength>("Medium");
  const [sensitivityFlag, setSensitivityFlag] = useState<SensitivityFlag>(
    activeSource.sensitivityFlag || "None"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Existing evidence extracted from this source
  const extractedEvidence = study.evidence.filter(
    (e) => e.sourceId === activeSource.id
  );

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setRawObservation(selection.toString().trim());
    }
  };

  const handleSaveObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawObservation.trim() || !interpretation.trim() || !primaryTheme.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      setSuccessMsg(null);

      const existingEvidenceIds = study.evidence.map((e) => e.id);
      const nextId = getNextEvidenceId(existingEvidenceIds);
      const now = Date.now();

      const newEntry: EvidenceEntry & { studyId: string } = {
        id: nextId,
        studyId: study.id,
        sourceId: activeSource.id,
        siteId: activeSource.siteId || activeSource.location,
        stakeholderType: activeSource.stakeholderType,
        rawEvidence: rawObservation.trim(),
        rawObservation: rawObservation.trim(),
        interpretation: interpretation.trim(),
        primaryTheme: primaryTheme.trim(),
        secondaryTheme: secondaryTheme.trim() || "General",
        evidenceStrength,
        sensitivityFlag,
        potentialFinding: interpretation.trim(),
        qaStatus: "Needs Review",
        validationStatus: "Draft",
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };

      await saveEvidence(newEntry);
      onEvidenceCreated(newEntry);

      setSuccessMsg(`Extracted observation ${nextId} saved as Draft.`);
      setRawObservation("");
      setInterpretation("");
      setSecondaryTheme("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save observation.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isBatchMode) {
    return (
      <BatchObservationBuilder
        study={study}
        activeSource={activeSource}
        onEvidenceBatchSaved={(count) => {
          if (onBatchEvidenceSaved) {
            onBatchEvidenceSaved(count);
          } else {
            onEvidenceCreated();
          }
          setIsBatchMode(false);
        }}
        onClose={() => setIsBatchMode(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Source Reading Pane with Quick-Select capability */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[var(--trace)]">
                {activeSource.id}
              </span>
              <span className="text-xs text-[var(--muted)]">•</span>
              <span className="text-xs text-[var(--muted)]">{activeSource.date}</span>
              <span className="text-xs text-[var(--muted)]">•</span>
              <span className="text-xs text-[var(--muted)]">{activeSource.location}</span>
            </div>
            <h3 className="mt-1 text-base font-bold text-[var(--foreground)]">
              {activeSource.title}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {activeSource.sourceType} with {activeSource.stakeholderType}
              {activeSource.collectorName ? ` (Recorded by ${activeSource.collectorName})` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBatchMode(true)}
              className="rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition cursor-pointer"
            >
              ⚡ Extract Multiple Observations
            </button>
            <button
              type="button"
              onClick={handleTextSelection}
              title="Highlight text in the note below and click to copy it into Raw Observation"
              className="rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--trace)] hover:border-[var(--trace)]"
            >
              ✂ Extract Selected Text
            </button>
          </div>
        </div>

        {/* Narrative Box */}
        <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4 text-xs leading-relaxed text-[var(--foreground)] select-text">
          <p className="whitespace-pre-wrap font-sans">
            {activeSource.rawText || activeSource.summary}
          </p>
        </div>

        <p className="mt-2 text-[11px] text-[var(--muted)]">
          Tip: Highlight any sentence above and click &quot;Extract Selected Text&quot; or manually copy text into the observation field below.
        </p>
      </div>

      {/* Observation Extraction Form */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="border-b border-[var(--border)] pb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--trace)]">
            Analytical Extraction
          </span>
          <h3 className="text-base font-bold text-[var(--foreground)]">
            Extract Discrete Evidence Observation
          </h3>
          <p className="text-xs text-[var(--muted)]">
            Preserve what was specifically heard or observed before recording interpretive meaning.
          </p>
        </div>

        {successMsg && (
          <div className="mt-4 flex items-center justify-between rounded border border-emerald-500/40 bg-emerald-950/30 p-3 text-xs text-emerald-300">
            <span>✓ {successMsg}</span>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-400 hover:text-emerald-200"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSaveObservation} className="mt-4 space-y-4">
          {/* Raw Observation */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--foreground)]">
                Raw Observation (What was seen or heard) <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-[var(--muted)]">Factual excerpt</span>
            </div>
            <textarea
              required
              rows={3}
              value={rawObservation}
              onChange={(e) => setRawObservation(e.target.value)}
              placeholder="Paste or write the specific factual observation from this field note..."
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
            />
          </div>

          {/* Interpretation */}
          <div className="rounded-lg border border-[var(--border-strong)] bg-slate-900/40 p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-sky-300">
                Analytical Interpretation (What might this mean) <span className="text-rose-400">*</span>
              </label>
              <span className="rounded bg-sky-950/60 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                Draft sensemaking
              </span>
            </div>
            <textarea
              required
              rows={3}
              value={interpretation}
              onChange={(e) => setInterpretation(e.target.value)}
              placeholder="Record your working analytical interpretation. This will not alter or replace the raw observation, and does not automatically become a validated finding."
              className="mt-2 w-full rounded border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-sky-400 focus:outline-none"
            />
            <p className="mt-1.5 text-[11px] text-[var(--muted)]">
              Interpretation is captured as provisional working hypothesis (`validationStatus = Draft`).
            </p>
          </div>

          {/* Themes and Strength */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Primary Theme <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={primaryTheme}
                onChange={(e) => setPrimaryTheme(e.target.value)}
                placeholder="e.g. Targeting, Safety, Transport"
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Secondary Theme (Optional)
              </label>
              <input
                type="text"
                value={secondaryTheme}
                onChange={(e) => setSecondaryTheme(e.target.value)}
                placeholder="e.g. Infrastructure, Gender"
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Observation Reliability (researcher assessment) <span className="text-rose-400">*</span>
              </label>
              <select
                value={evidenceStrength}
                onChange={(e) => setEvidenceStrength(e.target.value as EvidenceStrength)}
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              >
                {STRENGTH_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st} Strength
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Describes this individual evidence item. Finding-level triangulation is assessed separately.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Sensitivity Flag
              </label>
              <select
                value={sensitivityFlag}
                onChange={(e) => setSensitivityFlag(e.target.value as SensitivityFlag)}
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              >
                {SENSITIVITY_FLAGS.map((f) => (
                  <option key={f} value={f}>
                    {f} Sensitivity
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving || !rawObservation.trim() || !interpretation.trim()}
              className="rounded bg-[var(--accent)] px-5 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? "Saving Observation..." : "Save Evidence Observation"}
            </button>
          </div>
        </form>
      </div>

      {/* Extracted Observations List for This Source */}
      {extractedEvidence.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--trace)]">
            Observations Extracted from {activeSource.id} ({extractedEvidence.length})
          </h4>
          <div className="mt-3 space-y-3">
            {extractedEvidence.map((ev) => (
              <div
                key={ev.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-1.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[var(--trace)]">{ev.id}</span>
                    <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                      {ev.primaryTheme}
                    </span>
                  </div>
                  <span className="rounded border border-amber-500/40 bg-amber-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                    {ev.validationStatus || "Draft"}
                  </span>
                </div>

                <div className="mt-2 text-[var(--foreground)]">
                  <p className="font-medium text-[var(--muted)]">Observation:</p>
                  <p className="mt-0.5">{ev.rawEvidence}</p>
                </div>

                {ev.interpretation && (
                  <div className="mt-2 rounded bg-slate-900/40 p-2 text-sky-200">
                    <p className="text-[10px] font-semibold text-sky-400">Interpretation:</p>
                    <p className="mt-0.5">{ev.interpretation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
