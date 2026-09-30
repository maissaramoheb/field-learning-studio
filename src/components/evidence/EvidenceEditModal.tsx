"use client";

import React, { useState, useMemo } from "react";
import type {
  EvidenceEntry,
  EvidenceStrength,
  SensitivityFlag,
  MaterialCategory,
  FieldStudy,
} from "@/lib/types";
import { applySubstantiveEvidenceEdit } from "@/lib/validation";

interface EvidenceEditModalProps {
  isOpen: boolean;
  entry: EvidenceEntry | null;
  study?: FieldStudy | null;
  onClose: () => void;
  onSave: (updated: EvidenceEntry, requiredRevalidation: boolean) => Promise<void> | void;
}

export function EvidenceEditModal({
  isOpen,
  entry,
  study,
  onClose,
  onSave,
}: EvidenceEditModalProps) {
  if (!isOpen || !entry) return null;

  return (
    <EvidenceEditModalContent
      key={entry.id}
      entry={entry}
      study={study}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function EvidenceEditModalContent({
  entry,
  study,
  onClose,
  onSave,
}: {
  entry: EvidenceEntry;
  study?: FieldStudy | null;
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
  const [materialCategory, setMaterialCategory] = useState<MaterialCategory>(
    () => entry.materialCategory || "primary_evidence"
  );
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(
    () => entry.studyQuestionIds || []
  );
  const [selectedFrameworkThemeIds, setSelectedFrameworkThemeIds] = useState<string[]>(
    () => entry.frameworkThemeIds || []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isValidated = entry.validationStatus === "Validated";
  const currentRevision = entry.revision ?? 1;

  // Active questions from Study workspace
  const activeQuestions = useMemo(() => {
    return (study?.questions || []).filter((q) => q.isActive !== false);
  }, [study?.questions]);

  // Framework themes from Study workspace
  const frameworkThemes = useMemo(() => {
    return study?.framework?.themes || [];
  }, [study?.framework?.themes]);

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
        materialCategory,
        studyQuestionIds: selectedQuestionIds,
        frameworkThemeIds: selectedFrameworkThemeIds,
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

        {/* Warning if modifying validated artifact */}
        {isValidated && (
          <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-300">
            <span className="font-semibold text-amber-200">Notice:</span> Substantive edits to this validated evidence item will increment it to <span className="font-semibold text-amber-100">Revision {currentRevision + 1}</span> and reset its status to <span className="font-semibold text-amber-100">Needs Review</span>, requiring evaluator re-validation.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Raw Observation */}
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Raw Observation (Factual excerpt) <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={rawObservation}
              onChange={(e) => setRawObservation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            />
          </div>

          {/* Analytical Interpretation */}
          <div>
            <label className="block text-xs font-semibold text-sky-400">
              Analytical Interpretation / Observer Reflection
            </label>
            <textarea
              rows={2}
              value={interpretation}
              onChange={(e) => setInterpretation(e.target.value)}
              placeholder="Record analytical working interpretation or reflection notes..."
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-sky-400 focus:outline-none"
            />
          </div>

          {/* Material Category & Reliability Row */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Material Category
              </label>
              <select
                value={materialCategory}
                onChange={(e) => setMaterialCategory(e.target.value as MaterialCategory)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              >
                <option value="primary_evidence">Primary Observation / Interview</option>
                <option value="secondary_evidence">Secondary Document / Report</option>
                <option value="supervisory_interpretation">Supervisory Reflection / Debrief</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Epistemic Reliability <span className="text-rose-400">*</span>
              </label>
              <select
                value={evidenceStrength}
                onChange={(e) => setEvidenceStrength(e.target.value as EvidenceStrength)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              >
                <option value="High">High (Direct observation, verbatim quote)</option>
                <option value="Medium">Medium (Secondary account, summary)</option>
                <option value="Low">Low (Unverified assertion, rumor)</option>
              </select>
            </div>
          </div>

          {/* Framework Themes Selector */}
          {frameworkThemes.length > 0 && (
            <div className="rounded-lg border border-sky-500/20 bg-sky-950/10 p-3 space-y-2">
              <span className="block text-xs font-semibold text-sky-300">
                Study Framework Themes:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {frameworkThemes.map((th) => {
                  const isSelected = selectedFrameworkThemeIds.includes(th.id);
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedFrameworkThemeIds(
                            selectedFrameworkThemeIds.filter((id) => id !== th.id)
                          );
                        } else {
                          setSelectedFrameworkThemeIds([...selectedFrameworkThemeIds, th.id]);
                          if (!primaryTheme || primaryTheme === "Uncategorized") {
                            setPrimaryTheme(th.name);
                          }
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                        isSelected
                          ? "border-[var(--trace)] bg-[var(--trace)] text-white font-semibold"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--trace)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      <span>{th.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Study Questions Linking */}
          {activeQuestions.length > 0 && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 space-y-2">
              <span className="block text-xs font-semibold text-[var(--foreground)]">
                Linked Active Study Questions:
              </span>
              <div className="grid gap-1.5 sm:grid-cols-2 max-h-36 overflow-y-auto pr-1">
                {activeQuestions.map((q) => {
                  const isChecked = selectedQuestionIds.includes(q.id);
                  return (
                    <label
                      key={q.id}
                      className={`flex items-start gap-2 rounded border p-2 text-xs transition cursor-pointer ${
                        isChecked
                          ? "border-[var(--trace)] bg-[var(--trace-wash)] text-[var(--foreground)] font-medium"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedQuestionIds([...selectedQuestionIds, q.id]);
                          } else {
                            setSelectedQuestionIds(selectedQuestionIds.filter((id) => id !== q.id));
                          }
                        }}
                        className="mt-0.5 rounded border-[var(--border)]"
                      />
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] font-bold text-[var(--trace)] block">
                          {q.id}
                        </span>
                        <span className="text-[11px] line-clamp-1">{q.shortLabel || q.question}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Primary & Secondary Theme (String tags preserved) */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Primary Theme Tag <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={primaryTheme}
                onChange={(e) => setPrimaryTheme(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Secondary Theme Tag (Optional)
              </label>
              <input
                type="text"
                value={secondaryTheme}
                onChange={(e) => setSecondaryTheme(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              />
            </div>
          </div>

          {/* Stakeholder & Sensitivity */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Stakeholder Perspective
              </label>
              <input
                type="text"
                value={stakeholderType}
                onChange={(e) => setStakeholderType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Sensitivity Flag
              </label>
              <select
                value={sensitivityFlag}
                onChange={(e) => setSensitivityFlag(e.target.value as SensitivityFlag)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
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

          {/* Modal Footer */}
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
              disabled={isSubmitting}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-600 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
