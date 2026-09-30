"use client";

import React, { useState } from "react";

interface EvidenceRejectModalProps {
  isOpen: boolean;
  evidenceId: string | null;
  onClose: () => void;
  onConfirmReject: (reason: string) => Promise<void> | void;
}

export function EvidenceRejectModal({
  isOpen,
  evidenceId,
  onClose,
  onConfirmReject,
}: EvidenceRejectModalProps) {
  if (!isOpen || !evidenceId) return null;

  return (
    <EvidenceRejectModalContent
      key={evidenceId}
      evidenceId={evidenceId}
      onClose={onClose}
      onConfirmReject={onConfirmReject}
    />
  );
}

function EvidenceRejectModalContent({
  evidenceId,
  onClose,
  onConfirmReject,
}: {
  evidenceId: string;
  onClose: () => void;
  onConfirmReject: (reason: string) => Promise<void> | void;
}) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Please provide a specific reason for exclusion.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirmReject(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record exclusion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Evidence Qualification
            </span>
            <h3 className="mt-0.5 text-lg font-bold text-[var(--foreground)]">
              Exclude Observation from Analysis ({evidenceId})
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            An excluded observation will be flagged as <span className="font-semibold text-rose-400">Excluded</span> and removed from analytical synthesis. State the methodological rationale, data quality issue, or safeguarding reason:
          </p>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Exclusion Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Inconclusive single-source statement without corroboration; contradicts official attendance register..."
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            />
          </div>

          {error && (
            <div className="rounded border border-rose-500/40 bg-rose-950/30 p-2.5 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="rounded-lg border border-rose-600 bg-rose-700 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-rose-600 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Recording..." : "Confirm Exclusion"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
