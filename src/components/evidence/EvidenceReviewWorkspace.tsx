"use client";

import React, { useState, useMemo } from "react";
import type {
  EvidenceEntry,
  Finding,
  SourceRecord,
  FieldStudy,
} from "@/lib/types";
import {
  submitForReview,
  validateArtifact,
  rejectArtifact,
  reopenRejectedArtifact,
} from "@/lib/validation";
import { saveEvidence } from "@/lib/storage/studyStore";
import { EvidenceCard } from "./EvidenceCard";
import { EvidenceEditModal } from "./EvidenceEditModal";
import { EvidenceRejectModal } from "./EvidenceRejectModal";
import { ReviewerIdentityBar } from "./ReviewerIdentityBar";
import { StatusFilterPills, type StatusCounts } from "./StatusFilterPills";

export type EvidenceFilters = {
  theme: string;
  stakeholderType: string;
  evidenceStrength: string;
  sensitivityFlag: string;
  validationStatus?: string;
};

interface EvidenceReviewWorkspaceProps {
  evidence: EvidenceEntry[];
  rawEvidenceList: EvidenceEntry[];
  sources: SourceRecord[];
  findings: Finding[];
  currentStudy: FieldStudy | null;
  filters: EvidenceFilters;
  onFiltersChange: (filters: EvidenceFilters) => void;
  themes: string[];
  stakeholderTypes: string[];
  evidenceStrengths: string[];
  sensitivityFlags: string[];
  traceHandlers: {
    highlightedId: string | null;
    onTraceSelect: (id: string) => void;
  };
  onRefreshStudy: () => Promise<void> | void;
}

export function EvidenceReviewWorkspace({
  evidence,
  rawEvidenceList,
  sources,
  findings,
  currentStudy,
  filters,
  onFiltersChange,
  themes,
  stakeholderTypes,
  evidenceStrengths,
  sensitivityFlags,
  traceHandlers,
  onRefreshStudy,
}: EvidenceReviewWorkspaceProps) {
  const isDemoCase = currentStudy?.isDemoCase ?? false;

  // Reviewer identity state
  const [reviewerName, setReviewerName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fls_reviewer_name") || "";
    }
    return "";
  });
  const [reviewerPromptOpen, setReviewerPromptOpen] = useState(false);
  const [pendingValidateEntry, setPendingValidateEntry] = useState<EvidenceEntry | null>(null);

  // Modals state
  const [editingEntry, setEditingEntry] = useState<EvidenceEntry | null>(null);
  const [rejectingEntry, setRejectingEntry] = useState<EvidenceEntry | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Compute status counts from unfiltered rawEvidenceList
  const statusCounts: StatusCounts = useMemo(() => {
    let draft = 0;
    let needsReview = 0;
    let validated = 0;
    let rejected = 0;

    for (const e of rawEvidenceList) {
      const s = e.validationStatus || (isDemoCase ? "Validated" : "Draft");
      if (s === "Draft") draft++;
      else if (s === "Needs Review") needsReview++;
      else if (s === "Validated") validated++;
      else if (s === "Rejected") rejected++;
    }

    return {
      total: rawEvidenceList.length,
      draft,
      needsReview,
      validated,
      rejected,
    };
  }, [rawEvidenceList, isDemoCase]);

  // Handle Reviewer Name change
  const handleReviewerNameChange = (name: string) => {
    setReviewerName(name);
    if (typeof window !== "undefined") {
      localStorage.setItem("fls_reviewer_name", name);
    }
  };

  // Action: Submit for Review
  const handleSubmitForReview = async (entry: EvidenceEntry) => {
    if (!currentStudy) return;
    try {
      const updated = submitForReview(entry);
      await saveEvidence({ ...updated, studyId: currentStudy.id });
      await onRefreshStudy();
      showToast(`Evidence ${entry.id} submitted for evaluation review.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit for review.");
    }
  };

  // Action: Validate
  const handleValidate = async (entry: EvidenceEntry) => {
    if (!currentStudy) return;
    const activeReviewer = reviewerName.trim();
    if (!activeReviewer) {
      setPendingValidateEntry(entry);
      setReviewerPromptOpen(true);
      return;
    }

    try {
      const updated = validateArtifact(entry, activeReviewer);
      await saveEvidence({ ...updated, studyId: currentStudy.id });
      await onRefreshStudy();
      showToast(`Evidence ${entry.id} validated by ${activeReviewer}.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to validate evidence.");
    }
  };

  const handleConfirmValidateWithReviewer = async (name: string) => {
    if (!pendingValidateEntry || !currentStudy) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    handleReviewerNameChange(trimmed);
    try {
      const updated = validateArtifact(pendingValidateEntry, trimmed);
      await saveEvidence({ ...updated, studyId: currentStudy.id });
      await onRefreshStudy();
      showToast(`Evidence ${pendingValidateEntry.id} validated by ${trimmed}.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to validate evidence.");
    } finally {
      setPendingValidateEntry(null);
      setReviewerPromptOpen(false);
    }
  };

  // Action: Reject
  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingEntry || !currentStudy) return;
    try {
      const updated = rejectArtifact(rejectingEntry, reason);
      await saveEvidence({ ...updated, studyId: currentStudy.id });
      await onRefreshStudy();
      showToast(`Evidence ${rejectingEntry.id} marked as Rejected.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject evidence.");
    }
  };

  // Action: Reopen
  const handleReopen = async (entry: EvidenceEntry) => {
    if (!currentStudy) return;
    try {
      const updated = reopenRejectedArtifact(entry);
      await saveEvidence({ ...updated, studyId: currentStudy.id });
      await onRefreshStudy();
      showToast(`Evidence ${entry.id} reopened as Draft for revision.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reopen evidence.");
    }
  };

  // Action: Save Edit
  const handleSaveEdit = async (
    updatedEntry: EvidenceEntry,
    requiredRevalidation: boolean
  ) => {
    if (!currentStudy) return;
    try {
      await saveEvidence({ ...updatedEntry, studyId: currentStudy.id });
      await onRefreshStudy();
      if (requiredRevalidation) {
        showToast(
          `Substantive changes saved! Evidence ${updatedEntry.id} advanced to Revision ${updatedEntry.revision} and requires re-validation.`
        );
      } else {
        showToast(`Evidence ${updatedEntry.id} updated.`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save edited evidence.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-[var(--trace)] bg-[var(--surface-elevated)] p-4 text-xs font-semibold text-[var(--foreground)] shadow-xl animate-fade-in flex items-center gap-2">
          <span className="text-[var(--trace)]">ℹ️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--trace)]">
              Phase 4 Evidence Workspace
            </span>
            <span className="text-xs text-[var(--muted)]">•</span>
            <span className="text-xs text-[var(--muted)]">
              {currentStudy?.title || "Field Study"}
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-bold text-[var(--foreground)]">
            Evidence Review &amp; Human Validation Matrix
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)] max-w-3xl leading-relaxed">
            Human validation gate: Unvalidated observations remain in review. Only deliberately validated evidence forms the empirical foundation for defensible findings and deliverables.
          </p>
        </div>

        <div>
          {isDemoCase ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 px-3 py-1.5 text-xs font-semibold text-amber-300">
              Reference Demo Case (Read-Only)
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 px-3 py-1.5 text-xs font-semibold text-emerald-300">
              Active Editable Study
            </div>
          )}
        </div>
      </div>

      {/* Reviewer Identity Bar (for non-demo editable study) */}
      {!isDemoCase && (
        <ReviewerIdentityBar
          reviewerName={reviewerName}
          onReviewerNameChange={handleReviewerNameChange}
        />
      )}

      {/* Validation Status Filter Pills */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4">
        <StatusFilterPills
          selectedStatus={filters.validationStatus || "All"}
          onSelectStatus={(validationStatus) =>
            onFiltersChange({ ...filters, validationStatus })
          }
          counts={statusCounts}
        />

        {/* Analytical Dimension Filters */}
        <div className="grid gap-3 pt-3 border-t border-[var(--border)] grid-cols-2 md:grid-cols-4">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
              Theme
            </label>
            <select
              value={filters.theme}
              onChange={(e) =>
                onFiltersChange({ ...filters, theme: e.target.value })
              }
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            >
              <option value="All">All Themes</option>
              {themes
                .filter((t) => t !== "All")
                .map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
              Stakeholder
            </label>
            <select
              value={filters.stakeholderType}
              onChange={(e) =>
                onFiltersChange({ ...filters, stakeholderType: e.target.value })
              }
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            >
              <option value="All">All Stakeholders</option>
              {stakeholderTypes
                .filter((s) => s !== "All")
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
              Evidence Strength
            </label>
            <select
              value={filters.evidenceStrength}
              onChange={(e) =>
                onFiltersChange({ ...filters, evidenceStrength: e.target.value })
              }
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            >
              <option value="All">All Strengths</option>
              {evidenceStrengths
                .filter((s) => s !== "All")
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
              Sensitivity
            </label>
            <select
              value={filters.sensitivityFlag}
              onChange={(e) =>
                onFiltersChange({ ...filters, sensitivityFlag: e.target.value })
              }
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            >
              <option value="All">All Sensitivity Levels</option>
              {sensitivityFlags
                .filter((s) => s !== "All")
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Evidence Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {evidence.map((entry) => {
          const isHighlighted = traceHandlers.highlightedId === entry.id;
          const source = sources.find((s) => s.id === entry.sourceId);
          const linkedFinding = findings.find((f) =>
            f.supportingEvidenceIds.includes(entry.id)
          );

          return (
            <EvidenceCard
              key={entry.id}
              entry={entry}
              source={source}
              linkedFinding={linkedFinding}
              isHighlighted={isHighlighted}
              isDemoCase={isDemoCase}
              onTraceSelect={traceHandlers.onTraceSelect}
              onEdit={(e) => setEditingEntry(e)}
              onSubmitForReview={handleSubmitForReview}
              onValidate={handleValidate}
              onReject={(e) => setRejectingEntry(e)}
              onReopen={handleReopen}
            />
          );
        })}
      </div>

      {/* Empty State */}
      {evidence.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            No evidence entries match the active filters.
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Try adjusting the validation state or dimension filters above.
          </p>
        </div>
      )}

      {/* Edit Modal */}
      <EvidenceEditModal
        isOpen={editingEntry !== null}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={handleSaveEdit}
      />

      {/* Reject Modal */}
      <EvidenceRejectModal
        isOpen={rejectingEntry !== null}
        evidenceId={rejectingEntry?.id || null}
        onClose={() => setRejectingEntry(null)}
        onConfirmReject={handleRejectConfirm}
      />

      {/* Prompt Reviewer Name Modal (when validating without name set) */}
      {reviewerPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[var(--foreground)]">
              Evaluator Identity Required
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
              To validate evidence item{" "}
              <span className="font-mono font-semibold text-[var(--trace)]">
                {pendingValidateEntry?.id}
              </span>
              , please provide your name or official role for human accountability:
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const input = form.elements.namedItem(
                  "reviewerInput"
                ) as HTMLInputElement;
                if (input && input.value.trim()) {
                  handleConfirmValidateWithReviewer(input.value);
                }
              }}
              className="mt-4 space-y-4"
            >
              <input
                type="text"
                required
                autoFocus
                name="reviewerInput"
                placeholder="e.g. Dr. Moheb / Lead Evaluator"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-2.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => {
                    setReviewerPromptOpen(false);
                    setPendingValidateEntry(null);
                  }}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-muted)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer shadow"
                >
                  Confirm &amp; Validate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
