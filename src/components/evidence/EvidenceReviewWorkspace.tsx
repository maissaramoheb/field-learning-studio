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
import { ValidationStatusBadge } from "./ValidationStatusBadge";

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
  onOpenDocxModal?: () => void;
  docxReceipt?: {
    sourcesCount: number;
    evidenceCount: number;
    needsReviewCount: number;
  } | null;
  onDismissReceipt?: () => void;
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
  onOpenDocxModal,
  docxReceipt,
  onDismissReceipt,
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

  // Master/Detail view state
  const [userSelectedId, setUserSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"split" | "grid">("split");

  // Derive active selected entry cleanly without effects:
  // If highlightedId matches an entry, prioritize it.
  // Otherwise use user-clicked selection if valid in current list.
  // Otherwise default to first available evidence entry.
  const activeSelectedEntry = useMemo(() => {
    if (traceHandlers.highlightedId) {
      const found = evidence.find((e) => e.id === traceHandlers.highlightedId);
      if (found) return found;
    }
    if (userSelectedId) {
      const found = evidence.find((e) => e.id === userSelectedId);
      if (found) return found;
    }
    return evidence[0] || null;
  }, [traceHandlers.highlightedId, userSelectedId, evidence]);

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

      <div className="fls-page-heading">
        <div>
          <p className="fls-eyebrow">Field Material</p>
          <h1>Evidence review</h1>
          <p>Review observations before validation. Only validated evidence can support findings and deliverables.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {onOpenDocxModal && (
            <button
              type="button"
              onClick={onOpenDocxModal}
              className="fls-button fls-button-quiet text-xs"
              title="Import field notes from Word (.docx) documents"
            >
              📄 Import Word (.docx) Notes
            </button>
          )}
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

      {/* Intake Receipt Banner */}
      {docxReceipt && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xl">📥</span>
            <div>
              <strong className="block font-semibold text-emerald-200">
                Word Material Intake Receipt
              </strong>
              <p className="mt-0.5 text-emerald-300">
                Imported: <strong>{docxReceipt.sourcesCount}</strong> Sources · <strong>{docxReceipt.evidenceCount}</strong> Draft Observations · Needs practitioner review: <strong className="text-amber-300">{docxReceipt.needsReviewCount}</strong>
              </p>
            </div>
          </div>
          {onDismissReceipt && (
            <button
              type="button"
              onClick={onDismissReceipt}
              className="text-emerald-400 hover:text-emerald-200 font-medium px-2 py-1 rounded"
            >
              Dismiss ✕
            </button>
          )}
        </div>
      )}

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
              Observation Reliability
            </label>
            <select
              value={filters.evidenceStrength}
              onChange={(e) =>
                onFiltersChange({ ...filters, evidenceStrength: e.target.value })
              }
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            >
              <option value="All">All Reliabilities</option>
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

      {/* View Toolbar: Count & View Switcher */}
      <div className="flex items-center justify-between text-xs text-[var(--muted)] px-1">
        <span className="font-mono text-[11px] text-[var(--muted-soft)]">
          Showing <strong className="text-[var(--foreground)]">{evidence.length}</strong> of {rawEvidenceList.length} observations
        </span>
        <div className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`rounded px-2.5 py-1 font-medium transition cursor-pointer ${
              viewMode === "split"
                ? "bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-xs"
                : "text-[var(--muted-soft)] hover:text-[var(--foreground)]"
            }`}
          >
            Split View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`rounded px-2.5 py-1 font-medium transition cursor-pointer ${
              viewMode === "grid"
                ? "bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-xs"
                : "text-[var(--muted-soft)] hover:text-[var(--foreground)]"
            }`}
          >
            Grid View
          </button>
        </div>
      </div>

      {/* Empty State */}
      {evidence.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            No evidence entries match the active filters.
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Try adjusting the validation state or dimension filters above.
          </p>
        </div>
      ) : viewMode === "split" ? (
        /* Master/Detail Split */
        <div className="fls-evidence-master-detail">
          {/* Left Column: Master List */}
          <div className="fls-evidence-master-list">
            <div className="max-h-[calc(100vh-230px)] min-h-[460px] overflow-y-auto space-y-2 pe-1.5 fls-custom-scrollbar">
              {evidence.map((entry) => {
                const isSelected = activeSelectedEntry?.id === entry.id;
                const isHighlighted = traceHandlers.highlightedId === entry.id;
                return (
                  <button
                    key={entry.id}
                    id={`trace-${entry.id}`}
                    type="button"
                    onClick={() => setUserSelectedId(entry.id)}
                    aria-pressed={isSelected}
                    data-selected={isSelected}
                    className={`fls-evidence-row ${
                      isHighlighted ? "ring-2 ring-[var(--trace)]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[var(--trace-text)] bg-[var(--trace-wash)] border border-[var(--trace-border)] rounded px-1.5 py-0.5">
                          {entry.id}
                        </span>
                        {entry.revision && entry.revision > 1 && (
                          <span className="rounded border border-sky-800/40 bg-sky-950/30 px-1 py-0.2 text-[9px] font-semibold text-sky-400">
                            Rev {entry.revision}
                          </span>
                        )}
                      </div>
                      <ValidationStatusBadge
                        status={entry.validationStatus}
                        revision={entry.revision}
                      />
                    </div>

                    <h4 className="text-xs font-semibold text-[var(--foreground)] line-clamp-1">
                      {entry.primaryTheme}
                    </h4>

                    <p className="text-[11.5px] leading-relaxed text-[var(--muted)] line-clamp-2">
                      {entry.rawObservation || entry.rawEvidence}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[var(--muted-soft)] pt-1 border-t border-[var(--border)]">
                      <span className="font-mono font-medium">{entry.sourceId}</span>
                      <span>•</span>
                      <span>{entry.stakeholderType}</span>
                      <span>•</span>
                      <span>{entry.evidenceStrength}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Detail Inspector */}
          <div className="fls-evidence-detail-pane">
            {activeSelectedEntry ? (
              <EvidenceCard
                key={activeSelectedEntry.id}
                entry={activeSelectedEntry}
                source={sources.find((s) => s.id === activeSelectedEntry.sourceId)}
                linkedFinding={findings.find((f) =>
                  f.supportingEvidenceIds.includes(activeSelectedEntry.id)
                )}
                isHighlighted={traceHandlers.highlightedId === activeSelectedEntry.id}
                isDemoCase={isDemoCase}
                onTraceSelect={traceHandlers.onTraceSelect}
                onEdit={(e) => setEditingEntry(e)}
                onSubmitForReview={handleSubmitForReview}
                onValidate={handleValidate}
                onReject={(e) => setRejectingEntry(e)}
                onReopen={handleReopen}
              />
            ) : (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--muted)]">
                Select an observation to inspect details.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Grid View */
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
