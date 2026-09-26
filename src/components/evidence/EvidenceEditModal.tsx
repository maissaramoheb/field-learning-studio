"use client";

import React, { useState } from "react";
import type {
  EvidenceEntry,
  EvidenceStrength,
  SensitivityFlag,
} from "@/lib/types";
import { applySubstantiveEvidenceEdit } from "@/lib/validation";

interface EvidenceEditModalProps {
  isOpen: boolean;
  entry: EvidenceEntry | null;
  onClose: () => void;
  onSave: (updated: EvidenceEntry, requiredRevalidation: boolean) => Promise<void> | void;
}

export function EvidenceEditModal({
  isOpen,
  entry,
  onClose,
  onSave,
}: EvidenceEditModalProps) {
  if (!isOpen || !entry) return null;

  return (
    <EvidenceEditModalContent
      key={entry.id}
      entry={entry}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function EvidenceEditModalContent({
  entry,
  onClose,
  onSave,
}: {
  entry: EvidenceEntry;
  onClose: () => void;
  onSave: (updated: EvidenceEntry, requiredRevalidation: boolean) => Promise<void> | void;
}) {
  const [rawObservation, setRawObservation] = useState(
    () => entry.rawObservation || entry.rawEvidence || ""
  );
  const [interpretation, setInterpretation] = useState(
    () => entry.interpretation || entry.potentialFinding || ""
  );
  const [primaryTheme, setPrimaryTheme] = useState(() => entry.primaryTheme || "");
  const [secondaryTheme, setSecondaryTheme] = useState(() => entry.secondaryTheme || "");
  const [stakeholderType, setStakeholderType] = useState(() => entry.stakeholderType || "");
  const [evidenceStrength, setEvidenceStrength] = useState<EvidenceStrength>(
    () => entry.evidenceStrength || "Medium"
  );
  const [sensitivityFlag, setSensitivityFlag] = useState<SensitivityFlag>(
    () => entry.sensitivityFlag || "None"
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isValidated = entry.validationStatus === "Validated";
  const currentRevision = entry.revision ?? 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedObservation = rawObservation.trim();
    const trimmedTheme = primaryTheme.trim();

    if (!trimmedObservation) {
      setErrorMessage("Observation text cannot be empty.");
      return;
    }
    if (!trimmedTheme) {
      setErrorMessage("Primary theme cannot be empty.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const updates: Partial<EvidenceEntry> = {
        rawObservation: trimmedObservation,
        rawEvidence: trimmedObservation,
        interpretation: interpretation.trim() || undefined,
        potentialFinding: interpretation.trim() || undefined,
        primaryTheme: trimmedTheme,
        secondaryTheme: secondaryTheme.trim(),
        stakeholderType: stakeholderType.trim() || entry.stakeholderType,
        evidenceStrength,
        sensitivityFlag,
      };

      const result = applySubstantiveEvidenceEdit(entry, updates);
      await onSave(result.updated, result.requiredRevalidation);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update evidence.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 shadow-2xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[var(--trace)]">
                {entry.id}
              </span>
              <span className="text-xs text-[var(--muted)]">•</span>
              <span className="text-xs text-[var(--muted)]">Source {entry.sourceId}</span>
              {isValidated && (
                <span className="rounded border border-emerald-500/40 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Validated (Rev {currentRevision})
                </span>
              )}
            </div>
            <h3 className="mt-1 text-lg font-bold text-[var(--foreground)]">
              Edit Evidence Record
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        </div>

        {/* Warning if Editing Validated Evidence */}
        {isValidated && (
          <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-950/25 p-3.5 text-xs text-amber-300 flex items-start gap-2.5">
            <span className="text-base leading-none">⚠️</span>
            <div>
              <p className="font-semibold text-amber-200">
                Re-validation Warning: Validated Item
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-amber-300/90">
                This evidence was previously validated by{" "}
                <span className="font-semibold text-amber-100">
                  {entry.lastValidatedBy || "an evaluator"}
                </span>
                . Making substantive changes will advance this item to{" "}
                <span className="font-semibold text-amber-100">Revision {currentRevision + 1}</span>,
                reset its status to <span className="font-semibold text-amber-100">&quot;Needs Review&quot;</span>, and require formal re-validation.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Observation Text */}
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Raw Observation / Empirical Note <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={rawObservation}
              onChange={(e) => setRawObservation(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)] font-sans"
            />
            <span className="text-[11px] text-[var(--muted)]">
              What was observed or stated, separate from subjective inferences.
            </span>
          </div>

          {/* Interpretation */}
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Evaluator Interpretation / Analytical Reading
            </label>
            <textarea
              rows={3}
              value={interpretation}
              onChange={(e) => setInterpretation(e.target.value)}
              placeholder="What does this observation indicate about project implementation or outcomes?"
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)] font-sans"
            />
          </div>

          {/* Themes */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Primary Theme <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={primaryTheme}
                onChange={(e) => setPrimaryTheme(e.target.value)}
                placeholder="e.g. Access, Infrastructure, Governance"
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Secondary Theme
              </label>
              <input
                type="text"
                value={secondaryTheme}
                onChange={(e) => setSecondaryTheme(e.target.value)}
                placeholder="e.g. Community Buy-in, Cost"
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
              />
            </div>
          </div>

          {/* Classification & Metadata */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Stakeholder Group
              </label>
              <input
                type="text"
                value={stakeholderType}
                onChange={(e) => setStakeholderType(e.target.value)}
                placeholder="e.g. Teachers, Parents"
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Evidence Strength
              </label>
              <select
                value={evidenceStrength}
                onChange={(e) => setEvidenceStrength(e.target.value as EvidenceStrength)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Sensitivity Flag
              </label>
              <select
                value={sensitivityFlag}
                onChange={(e) => setSensitivityFlag(e.target.value as SensitivityFlag)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
              >
                <option value="None">None</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded border border-rose-500/40 bg-rose-950/30 p-2.5 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !rawObservation.trim() || !primaryTheme.trim()}
              className="rounded-lg border border-[var(--trace-border)] bg-[var(--trace)] px-4 py-2 text-xs font-semibold text-[#03121a] shadow hover:bg-[var(--trace-text)] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Saving..." : isValidated ? "Save & Request Re-validation" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
