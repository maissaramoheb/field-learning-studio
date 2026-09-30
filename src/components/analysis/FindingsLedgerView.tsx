"use client";

import React, { useState, useMemo } from "react";
import type {
  FieldStudy,
  Finding,
  EvidenceEntry,
  SourceRecord,
  ValidationStatus,
} from "@/lib/types";
import type { TraceHandlers } from "@/components/FieldLearningStudioApp";
import {
  submitForReview,
  validateArtifact,
  rejectArtifact,
  reopenRejectedArtifact,
  requiresFindingLimitationNote,
} from "@/lib/validation/validationLifecycle";
import { computeSupportProfile } from "@/lib/analytics/supportProfile";
import { saveFinding } from "@/lib/storage";
import { ViewOriginalSourceModal } from "./ViewOriginalSourceModal";
import { canonicalizeCollectionMethod } from "@/lib/methodTaxonomy";
import { FindingAuthoringModal } from "@/components/synthesis/FindingAuthoringModal";

interface FindingsLedgerViewProps {
  study: FieldStudy;
  traceHandlers: TraceHandlers;
  onRefreshStudy?: () => Promise<void>;
  onOpenTab?: (tab: string) => void;
}

export function FindingsLedgerView({
  study,
  traceHandlers,
  onRefreshStudy,
  onOpenTab,
}: FindingsLedgerViewProps) {
  const isEditable = Boolean(!study.isDemoCase);

  const findings = useMemo(() => study.findings || [], [study.findings]);
  const evidence = useMemo(() => study.evidence || [], [study.evidence]);
  const sources = useMemo(() => study.sources || [], [study.sources]);
  const questions = useMemo(() => study.questions || [], [study.questions]);
  const themeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of study.framework?.themes || []) {
      map.set(t.id, t.name);
    }
    return map;
  }, [study.framework]);

  const sourceMap = useMemo(() => {
    const map = new Map<string, SourceRecord>();
    for (const s of sources) {
      map.set(s.id, s);
    }
    return map;
  }, [sources]);

  const evidenceMap = useMemo(() => {
    const map = new Map<string, EvidenceEntry>();
    for (const e of evidence) {
      map.set(e.id, e);
    }
    return map;
  }, [evidence]);

  const questionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const q of questions) {
      map.set(q.id, q.shortLabel || q.question);
    }
    return map;
  }, [questions]);

  // Master List State
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    findings[0]?.id || null
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Edit finding modal state
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);

  // View Original Source Modal state
  const [viewSourceModalOpen, setViewSourceModalOpen] = useState(false);
  const [modalEvidence, setModalEvidence] = useState<EvidenceEntry | null>(null);
  const [modalSource, setModalSource] = useState<SourceRecord | null>(null);

  // Filtered Findings
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const status = f.validationStatus || "Draft";
      if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const text = `${f.id} ${f.statement} ${f.explanation || ""} ${f.studyQuestionId || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [findings, statusFilter, searchQuery]);

  // Selected Finding
  const selectedFinding = useMemo(() => {
    if (!selectedFindingId && filteredFindings.length > 0) {
      return filteredFindings[0];
    }
    return findings.find((f) => f.id === selectedFindingId) || filteredFindings[0] || null;
  }, [findings, selectedFindingId, filteredFindings]);

  // Support Profile for Selected Finding
  const selectedFindingProfile = useMemo(() => {
    if (!selectedFinding) return null;
    return computeSupportProfile(selectedFinding, study.scope, evidence, sources);
  }, [selectedFinding, study.scope, evidence, sources]);

  // Status counts
  const counts = useMemo(() => {
    const c = { Draft: 0, "Needs Review": 0, Validated: 0, Rejected: 0 };
    for (const f of findings) {
      const s = f.validationStatus || "Draft";
      if (c[s] !== undefined) c[s]++;
    }
    return c;
  }, [findings]);

  // Formal Lifecycle Handlers
  const handleSubmitForReview = async (finding: Finding) => {
    if (!isEditable || !onRefreshStudy) return;
    try {
      const updated = submitForReview(finding);
      await saveFinding({ ...updated, studyId: study.id });
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to submit finding for review.");
    }
  };

  const handleValidate = async (finding: Finding) => {
    if (!isEditable || !onRefreshStudy) return;
    const configuredValidator = study.teamRoles?.find((r) => r.role === "validator")?.actor?.displayName;
    const cachedReviewer =
      typeof window !== "undefined" ? localStorage.getItem("fls_reviewer_name") : null;
    const reviewerName = window.prompt(
      "Enter reviewer / evaluator identity for validation certification:",
      configuredValidator || cachedReviewer || "Lead Evaluator"
    );
    if (!reviewerName?.trim()) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("fls_reviewer_name", reviewerName.trim());
    }

    let limitationNote = finding.limitationNote;
    const profile = computeSupportProfile(finding, study.scope, evidence, sources);
    if (requiresFindingLimitationNote(finding, profile) && !limitationNote?.trim()) {
      const note = window.prompt(
        "Finding support profile has limited sources, sparse data, or active contradictions. Document an explicit limitation note or caveat:",
        "Conclusion is provisional pending further site triangulation."
      );
      if (!note?.trim()) {
        alert("Validation cancelled: A limitation note is required for findings with emerging support or coverage gaps.");
        return;
      }
      limitationNote = note.trim();
    }

    try {
      const updated = validateArtifact(finding, reviewerName.trim(), limitationNote, {
        evidence,
        sources,
        findings,
      });
      await saveFinding({ ...updated, studyId: study.id });
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to validate finding.");
    }
  };

  const handleReject = async (finding: Finding) => {
    if (!isEditable || !onRefreshStudy) return;
    const reason = window.prompt(
      "Enter formal rejection rationale (e.g. insufficient triangulation, single-source dependency):",
      "Insufficient distinct source record triangulation."
    );
    if (!reason?.trim()) return;

    try {
      const updated = rejectArtifact(finding, reason.trim());
      await saveFinding({ ...updated, studyId: study.id });
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reject finding.");
    }
  };

  const handleReopen = async (finding: Finding) => {
    if (!isEditable || !onRefreshStudy) return;
    try {
      const updated = reopenRejectedArtifact(finding);
      await saveFinding({ ...updated, studyId: study.id });
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reopen finding.");
    }
  };

  const handleOpenSourceModal = (ev: EvidenceEntry) => {
    const src = sourceMap.get(ev.sourceId) || null;
    setModalEvidence(ev);
    setModalSource(src);
    setViewSourceModalOpen(true);
  };

  const getStatusBadge = (status?: ValidationStatus) => {
    const s = status || "Draft";
    switch (s) {
      case "Validated":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "Needs Review":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "Rejected":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "Draft":
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
                Analysis Workspace 3 of 4
              </span>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                {counts.Validated} Validated
              </span>
              <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                {counts["Needs Review"]} In Review
              </span>
              <span className="rounded bg-slate-500/10 border border-slate-500/30 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                {counts.Draft} Drafts
              </span>
            </div>
            <h1 className="text-xl font-bold text-[var(--foreground)] mt-1">
              Findings Ledger &amp; Review Inspector
            </h1>
            <p className="mt-1 text-xs text-[var(--muted)] max-w-3xl leading-relaxed">
              &ldquo;What analytical claims are sufficiently reasoned and reviewed to become formal findings?&rdquo; Maintain authoritative candidate claims, verify evidence support profiles, review documented contradictions, and manage human validation sign-off.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTab && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenTab("synthesis")}
                  className="rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition cursor-pointer"
                >
                  ← Synthesis Workbench
                </button>
                <button
                  type="button"
                  onClick={() => onOpenTab("lessons")}
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition cursor-pointer"
                >
                  Lessons &amp; Practices →
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-280px)] min-h-[640px]">
        {/* Left Column: Master Findings List (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {/* Filters & Search */}
          <div className="p-3.5 border-b border-[var(--border)] bg-[var(--surface-muted)] space-y-2.5">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search findings..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
            />

            <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 text-[11px]">
              {["all", "Draft", "Needs Review", "Validated", "Rejected"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 rounded py-1 text-center font-medium transition cursor-pointer ${
                    statusFilter === st
                      ? "bg-[var(--surface-muted)] text-[var(--foreground)] font-semibold shadow-xs"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {st === "all" ? `All (${findings.length})` : st}
                </button>
              ))}
            </div>
          </div>

          {/* Findings List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredFindings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--muted)]">
                No findings match the active filter.
              </div>
            ) : (
              filteredFindings.map((finding) => {
                const isSelected = selectedFinding?.id === finding.id;
                const status = finding.validationStatus || "Draft";
                const suppCount = finding.supportingEvidenceIds?.length || 0;

                return (
                  <div
                    key={finding.id}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    aria-label={`Finding ${finding.id}: ${finding.statement.slice(0, 60)}..., Status: ${status}${finding.supersededByFindingId ? ", Superseded" : ""}`}
                    onClick={() => setSelectedFindingId(finding.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedFindingId(finding.id);
                      }
                    }}
                    className={`rounded-xl border p-3.5 transition cursor-pointer text-xs space-y-2 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none ${
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[var(--trace)]">
                          {finding.id}
                        </span>
                        <span
                          className={`rounded border px-1.5 py-0.2 text-[9px] font-bold uppercase ${getStatusBadge(
                            finding.validationStatus
                          )}`}
                        >
                          {status}
                        </span>
                        {finding.supersededByFindingId && (
                          <span className="rounded bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.2 text-[9px] font-bold uppercase text-rose-400">
                            Superseded
                          </span>
                        )}
                        {finding.revision && finding.revision > 1 && (
                          <span className="font-mono text-[9px] text-[var(--muted)]">
                            v{finding.revision}
                          </span>
                        )}
                      </div>

                      <span className="rounded bg-[var(--surface-muted)] border border-[var(--border)] px-1.5 py-0.2 text-[10px] text-[var(--muted)] font-medium">
                        {suppCount} {suppCount === 1 ? "source obs" : "source obs"}
                      </span>
                    </div>

                    <p className="font-medium text-[var(--foreground)] line-clamp-2 leading-relaxed">
                      {finding.statement}
                    </p>

                    <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
                      {finding.studyQuestionId && (
                        <span className="rounded bg-[var(--trace)]/10 px-1 py-0.2 text-[var(--trace)] font-mono font-semibold">
                          {finding.studyQuestionId}
                        </span>
                      )}
                      {finding.originPatternNoteId && (
                        <span className="rounded bg-purple-500/10 px-1 py-0.2 text-purple-400 font-mono">
                          from {finding.originPatternNoteId}
                        </span>
                      )}
                      {finding.staleDependencyWarning && (
                        <span className="text-amber-400 font-semibold">
                          ⚠ Needs Re-validation
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Finding Review Inspector (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {selectedFinding ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Header / Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[var(--trace)]">
                      {selectedFinding.id}
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${getStatusBadge(
                        selectedFinding.validationStatus
                      )}`}
                    >
                      {selectedFinding.validationStatus || "Draft"}
                    </span>
                    {selectedFinding.revision && (
                      <span className="font-mono text-[10px] text-[var(--muted)]">
                        Revision {selectedFinding.revision}
                      </span>
                    )}
                    {selectedFinding.originPatternNoteId && (
                      <span className="rounded bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 font-mono text-[10px] text-purple-400">
                        Derived from {selectedFinding.originPatternNoteId}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-[var(--foreground)] mt-1.5 leading-snug">
                    {selectedFinding.statement}
                  </h2>
                </div>

                {isEditable && (
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Draft -> Submit for Review */}
                    {(selectedFinding.validationStatus === "Draft" || !selectedFinding.validationStatus) && (
                      <button
                        type="button"
                        onClick={() => handleSubmitForReview(selectedFinding)}
                        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition cursor-pointer"
                      >
                        Submit for Review →
                      </button>
                    )}

                    {/* Needs Review -> Validate / Reject */}
                    {selectedFinding.validationStatus === "Needs Review" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleValidate(selectedFinding)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition cursor-pointer"
                        >
                          Certify &amp; Validate ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(selectedFinding)}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition cursor-pointer"
                        >
                          Reject ✕
                        </button>
                      </>
                    )}

                    {/* Rejected -> Reopen */}
                    {selectedFinding.validationStatus === "Rejected" && (
                      <button
                        type="button"
                        onClick={() => handleReopen(selectedFinding)}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition cursor-pointer"
                      >
                        Reopen to Draft ↺
                      </button>
                    )}

                    {/* Edit Finding */}
                    <button
                      type="button"
                      onClick={() => setEditingFinding(selectedFinding)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition cursor-pointer"
                    >
                      Edit Finding ✎
                    </button>
                  </div>
                )}
              </div>

              {/* Stale Dependency / Invalidation Warning */}
              {selectedFinding.staleDependencyWarning && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-amber-300">
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <span>⚠ Invalidation Notice:</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    {selectedFinding.staleDependencyWarning}
                  </p>
                </div>
              )}

              {/* Superseded Notice */}
              {selectedFinding.supersededByFindingId && (
                <div className="rounded-xl border border-slate-500/40 bg-slate-500/10 p-3.5 text-slate-300">
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-700 text-[10px] uppercase font-bold text-slate-200">Superseded</span>
                      This finding has been superseded
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedFindingId(selectedFinding.supersededByFindingId!)}
                      className="text-xs text-[var(--accent)] font-semibold hover:underline cursor-pointer"
                    >
                      View Replacement Finding ({selectedFinding.supersededByFindingId}) →
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
                    {selectedFinding.supersededAt ? `Superseded on ${new Date(selectedFinding.supersededAt).toLocaleDateString()}. ` : ""}
                    This conclusion is archived for analytical lineage and provenance.
                  </p>
                </div>
              )}

              {/* Supersedes Prior Finding Notice */}
              {(() => {
                const superseded = findings.find(
                  (f) => f.id === selectedFinding.supersedesFindingId || f.supersededByFindingId === selectedFinding.id
                );
                if (!superseded) return null;
                return (
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-indigo-300">
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-800 text-[10px] uppercase font-bold text-indigo-200">Supersedes</span>
                        This finding supersedes an earlier finding
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedFindingId(superseded.id)}
                        className="text-xs text-indigo-300 font-semibold hover:underline cursor-pointer"
                      >
                        View Prior Finding ({superseded.id}) →
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)] line-clamp-1">
                      Prior statement: &ldquo;{superseded.statement}&rdquo;
                    </p>
                  </div>
                );
              })()}

              {/* Rejection Reason */}
              {selectedFinding.rejectionReason && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-rose-300">
                  <span className="font-semibold text-xs block">Rejection Rationale:</span>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    {selectedFinding.rejectionReason}
                  </p>
                </div>
              )}

              {/* Limitation Note */}
              {selectedFinding.limitationNote && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5">
                  <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--muted)] block">
                    Caveat / Explicit Limitation Note
                  </span>
                  <p className="mt-1 text-xs text-[var(--foreground)] leading-relaxed italic">
                    &ldquo;{selectedFinding.limitationNote}&rdquo;
                  </p>
                </div>
              )}

              {/* Explanation & Programme Implication */}
              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--muted)] block">
                    Analytical Explanation
                  </span>
                  <p className="mt-1 text-xs text-[var(--foreground)] leading-relaxed">
                    {selectedFinding.explanation || "(No detailed explanation documented.)"}
                  </p>
                </div>

                {selectedFinding.programmeImplication && (
                  <div>
                    <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--muted)] block">
                      Programme / Strategic Implication
                    </span>
                    <p className="mt-1 text-xs text-[var(--foreground)] leading-relaxed">
                      {selectedFinding.programmeImplication}
                    </p>
                  </div>
                )}
              </div>

              {/* Study Question & Framework Themes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--border)]">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] block">
                    Study Question
                  </span>
                  <div className="mt-1 font-medium text-[var(--foreground)]">
                    {selectedFinding.studyQuestionId ? (
                      <span
                        className="rounded bg-[var(--trace)]/10 px-1.5 py-0.5 text-[var(--trace)] font-mono font-semibold"
                        title={questionMap.get(selectedFinding.studyQuestionId)}
                      >
                        {selectedFinding.studyQuestionId}
                        {questionMap.get(selectedFinding.studyQuestionId)
                          ? ` · ${questionMap.get(selectedFinding.studyQuestionId)}`
                          : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] block">
                    Framework Themes
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedFinding.frameworkThemeIds && selectedFinding.frameworkThemeIds.length > 0 ? (
                      selectedFinding.frameworkThemeIds.map((tid) => (
                        <span
                          key={tid}
                          className="rounded bg-[var(--surface-muted)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--foreground)]"
                          title={themeMap.get(tid)}
                        >
                          {tid}
                          {themeMap.get(tid) ? ` · ${themeMap.get(tid)}` : ""}
                        </span>
                      ))
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Evidence Support Profile */}
              {selectedFindingProfile && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
                      Evidence Support Profile &amp; Triangulation
                    </span>
                    <span className="rounded bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--foreground)]">
                      Support Tier: {selectedFindingProfile.supportTier}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
                      <span className="text-[10px] text-[var(--muted)] block">Independent Sources</span>
                      <span className="text-base font-bold text-[var(--foreground)]">
                        {selectedFindingProfile.independentSourceCount}
                      </span>
                    </div>

                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
                      <span className="text-[10px] text-[var(--muted)] block">Method Diversity</span>
                      <span className="text-base font-bold text-[var(--foreground)]">
                        {selectedFindingProfile.methodDiversity.methodsFound.length} methods
                      </span>
                    </div>

                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
                      <span className="text-[10px] text-[var(--muted)] block">Stakeholder Groups</span>
                      <span className="text-base font-bold text-[var(--foreground)]">
                        {selectedFindingProfile.stakeholderCoverage.stakeholdersFound.length}
                      </span>
                    </div>

                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
                      <span className="text-[10px] text-[var(--muted)] block">Site Coverage</span>
                      <span className="text-base font-bold text-[var(--foreground)]">
                        {selectedFindingProfile.siteCoverage.sitesFound.length} sites
                      </span>
                    </div>
                  </div>

                  {selectedFindingProfile.transparencyFlags.length > 0 && (
                    <div className="pt-2 border-t border-[var(--border)] space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 block">
                        Transparency Flags:
                      </span>
                      {selectedFindingProfile.transparencyFlags.map((flag, idx) => (
                        <p key={idx} className="text-[11px] text-[var(--muted)] flex items-center gap-1.5">
                          <span className="text-amber-400">•</span> {flag}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 1. Supporting Field Observations */}
              <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-[var(--foreground)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Supporting Field Observations ({selectedFinding.supportingEvidenceIds?.length || 0})
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">
                    Direct Corroboration
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(selectedFinding.supportingEvidenceIds || []).length === 0 ? (
                    <p className="text-[11px] text-[var(--muted)] italic">
                      No supporting field observations attached.
                    </p>
                  ) : (
                    selectedFinding.supportingEvidenceIds?.map((evId) => {
                      const ev = evidenceMap.get(evId);
                      const src = ev ? sourceMap.get(ev.sourceId) : null;
                      const coord = ev?.sourceCoordinate;

                      if (!ev) {
                        return (
                          <div
                            key={evId}
                            className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-rose-300 text-xs"
                          >
                            Missing evidence record: {evId}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={evId}
                          className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 space-y-2 hover:border-emerald-500/40 transition"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Support
                              </span>
                              <button
                                type="button"
                                onClick={() => traceHandlers.onTraceSelect(ev.id)}
                                className="font-mono text-xs font-bold text-[var(--trace)] hover:underline"
                              >
                                {ev.id}
                              </button>
                              <span className="text-[10px] text-[var(--muted)]">
                                via {ev.sourceId} ({src?.sourceType ? canonicalizeCollectionMethod(src.sourceType) : "Source"})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenSourceModal(ev)}
                              className="text-[11px] text-[var(--accent)] font-medium hover:underline cursor-pointer"
                            >
                              View Original Source ↗
                            </button>
                          </div>

                          <blockquote className="italic text-[var(--foreground)] leading-5 text-xs">
                            &ldquo;{ev.rawObservation || ev.rawEvidence}&rdquo;
                          </blockquote>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border)] text-[10px] text-[var(--muted)]">
                            <span>
                              {ev.stakeholderType ? `Stakeholder: ${ev.stakeholderType}` : ""}
                              {ev.siteId ? ` · Site: ${ev.siteId}` : ""}
                            </span>
                            {coord?.blockIndex !== undefined && (
                              <span>Block {coord.blockIndex}</span>
                            )}
                            {coord?.csvRowIndex !== undefined && (
                              <span>Row {coord.csvRowIndex + 1}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 2. Challenging / Contradictory Evidence */}
              <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-[var(--foreground)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                    Challenging / Contradictory Evidence ({selectedFinding.contradictoryEvidenceIds?.length || 0})
                  </span>
                  <span className="text-[10px] text-rose-400 font-medium">
                    Counter-Evidence &amp; Dissent
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(selectedFinding.contradictoryEvidenceIds || []).length === 0 ? (
                    <p className="text-[11px] text-[var(--muted)] italic">
                      No structured contradictory evidence records linked.
                    </p>
                  ) : (
                    selectedFinding.contradictoryEvidenceIds?.map((evId) => {
                      const ev = evidenceMap.get(evId);
                      const src = ev ? sourceMap.get(ev.sourceId) : null;
                      const coord = ev?.sourceCoordinate;

                      if (!ev) {
                        return (
                          <div
                            key={evId}
                            className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-rose-300 text-xs"
                          >
                            Missing evidence record: {evId}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={evId}
                          className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 space-y-2 hover:border-rose-500/50 transition"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                Contradict
                              </span>
                              <button
                                type="button"
                                onClick={() => traceHandlers.onTraceSelect(ev.id)}
                                className="font-mono text-xs font-bold text-[var(--trace)] hover:underline"
                              >
                                {ev.id}
                              </button>
                              <span className="text-[10px] text-[var(--muted)]">
                                via {ev.sourceId} ({src?.sourceType ? canonicalizeCollectionMethod(src.sourceType) : "Source"})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenSourceModal(ev)}
                              className="text-[11px] text-[var(--accent)] font-medium hover:underline cursor-pointer"
                            >
                              View Original Source ↗
                            </button>
                          </div>

                          <blockquote className="italic text-[var(--foreground)] leading-5 text-xs">
                            &ldquo;{ev.rawObservation || ev.rawEvidence}&rdquo;
                          </blockquote>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border)] text-[10px] text-[var(--muted)]">
                            <span>
                              {ev.stakeholderType ? `Stakeholder: ${ev.stakeholderType}` : ""}
                              {ev.siteId ? ` · Site: ${ev.siteId}` : ""}
                            </span>
                            {coord?.blockIndex !== undefined && (
                              <span>Block {coord.blockIndex}</span>
                            )}
                            {coord?.csvRowIndex !== undefined && (
                              <span>Row {coord.csvRowIndex + 1}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 3. Qualifying / Contextual Evidence */}
              <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-[var(--foreground)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                    Qualifying / Contextual Evidence ({selectedFinding.qualifyingEvidenceIds?.length || 0})
                  </span>
                  <span className="text-[10px] text-indigo-400 font-medium">
                    Boundary &amp; Scope Conditions
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(selectedFinding.qualifyingEvidenceIds || []).length === 0 ? (
                    <p className="text-[11px] text-[var(--muted)] italic">
                      No qualifying or boundary evidence records linked.
                    </p>
                  ) : (
                    selectedFinding.qualifyingEvidenceIds?.map((evId) => {
                      const ev = evidenceMap.get(evId);
                      const src = ev ? sourceMap.get(ev.sourceId) : null;
                      const coord = ev?.sourceCoordinate;

                      if (!ev) {
                        return (
                          <div
                            key={evId}
                            className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-rose-300 text-xs"
                          >
                            Missing evidence record: {evId}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={evId}
                          className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-2 hover:border-indigo-500/50 transition"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                Qualify
                              </span>
                              <button
                                type="button"
                                onClick={() => traceHandlers.onTraceSelect(ev.id)}
                                className="font-mono text-xs font-bold text-[var(--trace)] hover:underline"
                              >
                                {ev.id}
                              </button>
                              <span className="text-[10px] text-[var(--muted)]">
                                via {ev.sourceId} ({src?.sourceType ? canonicalizeCollectionMethod(src.sourceType) : "Source"})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenSourceModal(ev)}
                              className="text-[11px] text-[var(--accent)] font-medium hover:underline cursor-pointer"
                            >
                              View Original Source ↗
                            </button>
                          </div>

                          <blockquote className="italic text-[var(--foreground)] leading-5 text-xs">
                            &ldquo;{ev.rawObservation || ev.rawEvidence}&rdquo;
                          </blockquote>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border)] text-[10px] text-[var(--muted)]">
                            <span>
                              {ev.stakeholderType ? `Stakeholder: ${ev.stakeholderType}` : ""}
                              {ev.siteId ? ` · Site: ${ev.siteId}` : ""}
                            </span>
                            {coord?.blockIndex !== undefined && (
                              <span>Block {coord.blockIndex}</span>
                            )}
                            {coord?.csvRowIndex !== undefined && (
                              <span>Row {coord.csvRowIndex + 1}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 4. Narrative Contradictory Evidence & Limiting Conditions */}
              {selectedFinding.contradictoryEvidence && (
                <div className="space-y-2 pt-3 border-t border-[var(--border)]">
                  <span className="font-semibold text-xs text-amber-400 block">
                    Documented Contradictions &amp; Limiting Conditions (Narrative)
                  </span>
                  <div className="rounded-lg border border-amber-900/30 bg-amber-950/20 p-3 text-xs text-amber-200 leading-relaxed">
                    {selectedFinding.contradictoryEvidence}
                  </div>
                </div>
              )}

              {/* Audit Trail */}
              {selectedFinding.audit && (
                <div className="pt-3 border-t border-[var(--border)] text-[10px] text-[var(--muted)] space-y-1">
                  <div>
                    Created: {new Date(selectedFinding.audit.createdAt).toLocaleString()} by{" "}
                    <strong>{selectedFinding.audit.createdActor.displayName}</strong>
                  </div>
                  {selectedFinding.lastValidatedBy && selectedFinding.lastValidatedAt && (
                    <div>
                      Certified by: <strong>{selectedFinding.lastValidatedBy}</strong> on{" "}
                      {new Date(selectedFinding.lastValidatedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-8 text-center text-xs text-[var(--muted)]">
              Select a finding from the ledger to inspect its evidence support, contradictions, and validation lifecycle.
            </div>
          )}
        </div>
      </div>

      {/* Edit Finding Modal */}
      {editingFinding && (
        <FindingAuthoringModal
          isOpen={Boolean(editingFinding)}
          onClose={() => setEditingFinding(null)}
          onSaveFinding={async (updated) => {
            if (!onRefreshStudy) return;
            // If the finding was Validated, substantive edit requires revalidation (handled inside modal or lifecycle)
            await saveFinding({ ...updated, studyId: study.id });
            await onRefreshStudy();
            setEditingFinding(null);
          }}
          existingFindings={findings}
          qualifiedEvidence={evidence.filter(
            (e) => e.reviewStatus === "usable" || (!e.reviewStatus && e.validationStatus !== "Rejected")
          )}
          allEvidence={evidence}
          sources={sources}
          scope={study.scope}
          questions={questions}
          initialFinding={editingFinding}
        />
      )}

      {/* View Original Source Modal */}
      <ViewOriginalSourceModal
        isOpen={viewSourceModalOpen}
        onClose={() => {
          setViewSourceModalOpen(false);
          setModalEvidence(null);
          setModalSource(null);
        }}
        evidence={modalEvidence}
        source={modalSource}
      />
    </div>
  );
}
