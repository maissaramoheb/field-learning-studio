"use client";

import React, { useState } from "react";
import { WorkspaceDialog } from "@/components/WorkspaceDialog";
import type { CollectionMethod, PlannedMethodTarget } from "@/lib/types";

interface PlannedMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (target: PlannedMethodTarget) => Promise<void>;
  initialTarget?: PlannedMethodTarget | null;
}

const STANDARD_METHODS: CollectionMethod[] = [
  "Key Informant Interview",
  "Focus Group Discussion",
  "Direct Observation",
  "Document Review",
  "Community Meeting",
  "Survey / Questionnaire",
];

export function PlannedMethodModal({
  isOpen,
  onClose,
  onSave,
  initialTarget,
}: PlannedMethodModalProps) {
  if (!isOpen) return null;

  return (
    <PlannedMethodModalContent
      onClose={onClose}
      onSave={onSave}
      initialTarget={initialTarget}
    />
  );
}

function PlannedMethodModalContent({
  onClose,
  onSave,
  initialTarget,
}: Omit<PlannedMethodModalProps, "isOpen">) {
  const isEditing = !!initialTarget;

  const [selectedPreset, setSelectedPreset] = useState<string>(
    initialTarget?.method && STANDARD_METHODS.includes(initialTarget.method as CollectionMethod)
      ? initialTarget.method
      : initialTarget?.method
      ? "Other"
      : "Key Informant Interview"
  );
  const [customMethod, setCustomMethod] = useState<string>(
    initialTarget?.method && !STANDARD_METHODS.includes(initialTarget.method as CollectionMethod)
      ? initialTarget.method
      : ""
  );
  const [plannedCount, setPlannedCount] = useState<number | string>(
    initialTarget?.plannedCount ?? ""
  );
  const [description, setDescription] = useState(initialTarget?.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const methodName =
      selectedPreset === "Other" ? customMethod.trim() : selectedPreset;

    if (!methodName) {
      setErrorMessage("Please specify a method name.");
      return;
    }

    const countNum =
      typeof plannedCount === "number"
        ? plannedCount
        : plannedCount.trim() !== ""
        ? parseInt(plannedCount, 10)
        : undefined;

    if (countNum !== undefined && (isNaN(countNum) || countNum < 0)) {
      setErrorMessage("Planned count must be a non-negative number.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        method: methodName,
        plannedCount: countNum,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save collection method."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <WorkspaceDialog labelledBy="method-modal-title" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
              Methods & Sources
            </span>
            <h3 id="method-modal-title" className="text-base font-bold text-[var(--foreground)]">
              {isEditing ? "Configure Collection Method" : "Add Planned Collection Method"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-md bg-[var(--danger-surface)] border border-[var(--danger-border)] p-3 text-xs text-[var(--danger)]">
            {errorMessage}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Method Type *
          </label>
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
          >
            {STANDARD_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            <option value="Other">Other / Custom Method...</option>
          </select>
        </div>

        {selectedPreset === "Other" && (
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
              Custom Method Name *
            </label>
            <input
              type="text"
              required
              value={customMethod}
              onChange={(e) => setCustomMethod(e.target.value)}
              placeholder="e.g. Remote Satellite Analysis, Household Diary"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Planned Collection Target (Optional count)
          </label>
          <input
            type="number"
            min={0}
            value={plannedCount}
            onChange={(e) => setPlannedCount(e.target.value)}
            placeholder="e.g. 15 (Planned interviews or sessions)"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
          />
          <span className="text-[11px] text-[var(--muted)] mt-0.5 block">
            Actual collection counts are dynamically reconciled from live field sources.
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Operational Protocol / Target Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Disaggregated by gender; minimum 2 sessions per district..."
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-[var(--trace)] px-4 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : isEditing ? "Update Method" : "Add Method"}
          </button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
