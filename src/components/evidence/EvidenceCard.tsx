"use client";

import React, { useMemo } from "react";
import type {
  EvidenceEntry,
  Finding,
  SourceRecord,
  FieldStudy,
  EvidenceReviewStatus,
} from "@/lib/types";
import { canonicalizeCollectionMethod } from "@/lib/methodTaxonomy";
import { mapLegacyValidationToReviewStatus } from "@/lib/storage/normalization";
import {
  canReject,
  canReopen,
  requiresRevalidation,
} from "@/lib/validation";

interface EvidenceCardProps {
  entry: EvidenceEntry;
  source?: SourceRecord;
  linkedFinding?: Finding;
  currentStudy?: FieldStudy | null;
  isHighlighted: boolean;
  isDemoCase: boolean;
  onTraceSelect: (id: string) => void;
  onEdit: (entry: EvidenceEntry) => void;
  onSubmitForReview?: (entry: EvidenceEntry) => void;
  onValidate?: (entry: EvidenceEntry) => void;
  onReject: (entry: EvidenceEntry) => void;
  onReopen: (entry: EvidenceEntry) => void;
  onQualify?: (entry: EvidenceEntry) => void;
  onFlagClarification?: (entry: EvidenceEntry) => void;
  onMapTheme?: (entry: EvidenceEntry, themeId: string) => void;
  onLinkQuestion?: (entry: EvidenceEntry, questionId: string) => void;
  onUnlinkQuestion?: (entry: EvidenceEntry, questionId: string) => void;
}

export function EvidenceCard({
  entry,
  source,
  linkedFinding,
  currentStudy,
  isHighlighted,
  isDemoCase,
  onTraceSelect,
  onEdit,
  onReject,
  onReopen,
  onQualify,
  onFlagClarification,
  onMapTheme,
  onLinkQuestion,
  onUnlinkQuestion,
}: EvidenceCardProps) {
  const needsRevalidation = requiresRevalidation(entry);
  const status = entry.validationStatus || (isDemoCase ? "Validated" : "Draft");
  const isSandbox = entry.id.includes("SBX") || entry.id.startsWith("EV-TEMP-");

  // Derive unified review status
  const effectiveReviewStatus: EvidenceReviewStatus =
    entry.reviewStatus || mapLegacyValidationToReviewStatus(entry.validationStatus);

  // Derive material category
  const materialCategory =
    entry.materialCategory || source?.materialCategory || "primary_evidence";

  // Derive canonical collection method
  const canonicalMethod = canonicalizeCollectionMethod(source?.sourceType || "Direct Observation");

  // Study questions resolution
  const questionsInScope = useMemo(() => {
    return currentStudy?.questions || [];
  }, [currentStudy?.questions]);

  const linkedQuestions = useMemo(() => {
    const qIds = entry.studyQuestionIds || [];
    return qIds.map((id) => {
      const q = questionsInScope.find((item) => item.id === id);
      const isArchived = q?.isActive === false;
      const prompt = q?.shortLabel || q?.question || id;
      return {
        id,
        prompt,
        isArchived,
      };
    });
  }, [entry.studyQuestionIds, questionsInScope]);

  const availableActiveQuestions = useMemo(() => {
    const linkedSet = new Set(entry.studyQuestionIds || []);
    return questionsInScope.filter((q) => {
      const isArchived = q.isActive === false;
      return !isArchived && !linkedSet.has(q.id);
    });
  }, [questionsInScope, entry.studyQuestionIds]);

  // Framework themes resolution
  const frameworkThemes = useMemo(() => {
    return currentStudy?.framework?.themes || [];
  }, [currentStudy?.framework?.themes]);

  const activeFrameworkThemes = useMemo(() => {
    const themeIds = entry.frameworkThemeIds || [];
    return frameworkThemes.filter((th) => themeIds.includes(th.id));
  }, [entry.frameworkThemeIds, frameworkThemes]);

  // Deterministic suggestion: does entry.primaryTheme match any framework theme name?
  const suggestedFrameworkTheme = useMemo(() => {
    if (activeFrameworkThemes.length > 0 || !entry.primaryTheme) return null;
    const lowerPrimary = entry.primaryTheme.trim().toLowerCase();
    if (lowerPrimary === "uncategorized" || lowerPrimary === "operational execution") return null;
    return frameworkThemes.find((th) => th.name.trim().toLowerCase() === lowerPrimary) || null;
  }, [activeFrameworkThemes.length, entry.primaryTheme, frameworkThemes]);

  return (
    <article
      id={`trace-${entry.id}`}
      className={`scroll-mt-52 rounded-lg border transition p-4 flex flex-col justify-between ${
        isHighlighted
          ? "border-[var(--trace)] bg-[var(--trace-wash)] shadow-lg shadow-[var(--trace)]/5"
          : isSandbox
          ? "border-[var(--border)] bg-[rgba(11,22,37,0.4)] hover:border-[var(--border-strong)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
      }`}
    >
      <div>
        {/* Card Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-3 mb-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onTraceSelect(entry.id)}
                title={`Trace ${entry.id}`}
                className="font-mono text-xs font-bold text-[var(--trace-text)] bg-[var(--trace-wash)] border border-[var(--trace-border)] rounded px-2 py-0.5 hover:border-[var(--trace)] cursor-pointer"
              >
                {entry.id}
              </button>
              {entry.revision && entry.revision > 1 && (
                <span className="rounded border border-sky-800/40 bg-sky-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400">
                  Revision {entry.revision}
                </span>
              )}
              {/* Method Badge */}
              <span className="rounded border border-indigo-500/30 bg-indigo-950/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                {canonicalMethod}
              </span>
              {/* Category Badge */}
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                  materialCategory === "supervisory_interpretation"
                    ? "border-amber-500/40 bg-amber-950/30 text-amber-300"
                    : materialCategory === "secondary_evidence"
                    ? "border-purple-500/40 bg-purple-950/30 text-purple-300"
                    : "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                }`}
              >
                {materialCategory === "supervisory_interpretation"
                  ? "Supervisory Debrief"
                  : materialCategory === "secondary_evidence"
                  ? "Secondary Document"
                  : "Primary Observation"}
              </span>
            </div>

            <h3 className="mt-2 text-sm font-semibold text-[var(--foreground)] leading-snug">
              {entry.primaryTheme}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {entry.stakeholderType}
              {entry.siteId ? ` • 📍 ${entry.siteId}` : source?.location ? ` • 📍 ${source.location}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onTraceSelect(entry.sourceId)}
              title={`Trace Source ${entry.sourceId}`}
              className="font-mono text-xs font-semibold text-[var(--trace-text)] bg-[var(--trace-wash)] border border-[var(--trace-border)] rounded px-2 py-0.5 hover:border-[var(--trace)] cursor-pointer"
            >
              {entry.sourceId}
            </button>

            {/* Qualification Gate Status Badge */}
            <span
              className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                effectiveReviewStatus === "usable"
                  ? "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success-text)]"
                  : effectiveReviewStatus === "needs_clarification"
                  ? "border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--info-text)]"
                  : effectiveReviewStatus === "excluded"
                  ? "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-text)]"
                  : "border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-text)]"
              }`}
            >
              {effectiveReviewStatus === "usable"
                ? "✓ Qualified / Usable"
                : effectiveReviewStatus === "needs_clarification"
                ? "? Needs Clarification"
                : effectiveReviewStatus === "excluded"
                ? "✕ Excluded"
                : "⏳ Pending Review"}
            </span>
          </div>
        </div>

        {/* Epistemic Exclusion Banner for Supervisory Material */}
        {materialCategory === "supervisory_interpretation" && (
          <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-950/20 p-2.5 text-xs text-amber-300 flex items-start gap-2">
            <span className="text-sm leading-none">⚠️</span>
            <div>
              <span className="font-semibold text-amber-200">
                Supervisory Debrief Note:
              </span>{" "}
              Reflective sensemaking artifact. Excluded from independent source corroboration in analytical triangulation.
            </div>
          </div>
        )}

        {/* Re-validation Warning Banner */}
        {needsRevalidation && (
          <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-950/30 p-2.5 text-xs text-amber-300 flex items-start gap-2">
            <span className="text-sm leading-none">⚠️</span>
            <div>
              <span className="font-semibold text-amber-200">
                Re-validation Required:
              </span>{" "}
              Substantively modified after prior validation (Revision {entry.revision}). Formal evaluator sign-off needed.
            </div>
          </div>
        )}

        {/* Validated Attribution Banner */}
        {status === "Validated" && entry.lastValidatedBy && (
          <div className="mb-3 rounded-lg border border-[var(--success-border)] bg-[var(--success-soft)] px-3 py-1.5 text-xs text-[var(--success-text)] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span>✓</span>
              <span>
                Validated by <span className="font-semibold text-[var(--success-text)]">{entry.lastValidatedBy}</span>
              </span>
            </div>
            {entry.lastValidatedAt && (
              <span className="text-[10px] text-[var(--success-text)] opacity-80">
                {new Date(entry.lastValidatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {/* Exclusion / Rejection Banner */}
        {(effectiveReviewStatus === "excluded" || status === "Rejected") && (entry.rejectionReason || entry.exclusionReason) && (
          <div className="mb-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] p-3 text-xs text-[var(--danger-text)]">
            <div className="flex items-center gap-1 font-semibold text-[var(--danger-text)]">
              <span>✕</span>
              <span>Disqualification Rationale:</span>
            </div>
            <p className="mt-1 italic opacity-90">&ldquo;{entry.exclusionReason || entry.rejectionReason}&rdquo;</p>
          </div>
        )}

        {/* Observations & Interpretations */}
        <div className="space-y-3">
          <div className="py-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
              Observation / Excerpt
            </span>
            <p className="text-sm leading-relaxed text-[var(--foreground)]">
              {entry.rawObservation || entry.rawEvidence}
            </p>
          </div>

          {(entry.interpretation || entry.potentialFinding) && (
            <div className="border-s-2 border-[var(--trace-border)] ps-3 text-[13px] leading-relaxed">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                Observer Reflection / Context
              </span>
              <p className="text-[var(--foreground)] font-medium">
                {entry.interpretation || entry.potentialFinding}
              </p>
            </div>
          )}

          {/* Framework Themes Bridge */}
          {(activeFrameworkThemes.length > 0 || suggestedFrameworkTheme) && (
            <div className="rounded-lg border border-sky-500/20 bg-sky-950/10 p-2.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                  Study Framework Themes
                </span>
                {suggestedFrameworkTheme && onMapTheme && !isDemoCase && (
                  <button
                    type="button"
                    onClick={() => onMapTheme(entry, suggestedFrameworkTheme.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-300 hover:text-white cursor-pointer underline"
                  >
                    ⚡ Map to &quot;{suggestedFrameworkTheme.name}&quot;
                  </button>
                )}
              </div>

              {activeFrameworkThemes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {activeFrameworkThemes.map((th) => (
                    <span
                      key={th.id}
                      className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-950/40 px-2 py-0.5 text-[10.5px] font-medium text-sky-200"
                    >
                      <span>{th.name}</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Linked Study Questions */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-2.5 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
                Linked Study Questions ({linkedQuestions.length})
              </span>
            </div>

            {linkedQuestions.length > 0 ? (
              <div className="space-y-1">
                {linkedQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-start justify-between gap-2 rounded bg-[var(--surface)] p-1.5 border border-[var(--border)] text-[11.5px]"
                  >
                    <div className="flex items-start gap-1.5 min-w-0">
                      <span className="font-mono text-[10px] font-bold text-[var(--trace)] shrink-0">
                        {q.id}
                      </span>
                      {q.isArchived && (
                        <span className="rounded border border-amber-500/40 bg-amber-950/20 px-1 py-0.2 text-[9px] font-semibold text-amber-300 shrink-0">
                          Archived
                        </span>
                      )}
                      <span className="text-[var(--foreground)] truncate">{q.prompt}</span>
                    </div>

                    {!isDemoCase && onUnlinkQuestion && (
                      <button
                        type="button"
                        onClick={() => onUnlinkQuestion(entry, q.id)}
                        title="Unlink question from this observation"
                        className="text-[var(--muted)] hover:text-rose-400 text-xs px-1 cursor-pointer shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[var(--muted)] italic">
                Not yet linked to a Study Question.
              </p>
            )}

            {/* Link Active Question Selector (No authoring permitted in Field Material) */}
            {!isDemoCase && onLinkQuestion && availableActiveQuestions.length > 0 && (
              <div className="pt-1 border-t border-[var(--border)]">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      onLinkQuestion(entry, e.target.value);
                    }
                  }}
                  className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
                >
                  <option value="">+ Link Active Study Question...</option>
                  {availableActiveQuestions.map((q) => (
                    <option key={q.id} value={q.id}>
                      [{q.id}] {q.shortLabel || q.question}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Linked Source Provenance Box */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
                Linked Source Provenance
              </span>
              <button
                type="button"
                onClick={() => onTraceSelect(entry.sourceId)}
                className="text-[11px] font-medium text-[var(--trace)] hover:underline cursor-pointer"
              >
                Inspect Source Note &rarr;
              </button>
            </div>

            {source ? (
              <div className="space-y-1">
                <p className="font-semibold text-[var(--foreground)]">{source.title}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--muted)]">
                  <span>📅 {source.date}</span>
                  <span>📍 {source.location || "Location not stated"}</span>
                  <span>🔍 {source.sourceType}</span>
                  <span>👥 {source.stakeholderType}</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[var(--muted)]">
                Source record ({entry.sourceId}) details not currently available.
              </p>
            )}
          </div>

          {/* Linked Finding */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-2.5 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
              Synthesized Finding
            </span>
            {linkedFinding ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-[var(--foreground)] line-clamp-2">
                  {linkedFinding.statement}
                </p>
                <button
                  type="button"
                  onClick={() => onTraceSelect(linkedFinding.id)}
                  className="font-mono text-[10px] font-bold text-[var(--trace)] whitespace-nowrap hover:underline cursor-pointer"
                >
                  {linkedFinding.id} &rarr;
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-[var(--muted)]">
                Not yet linked to a validated finding.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer Classification & Action Controls */}
      <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-3">
        {/* Classification tags */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {entry.secondaryTheme && (
            <span className="bg-[var(--surface-muted)] text-[var(--muted)] px-2 py-0.5 rounded border border-[var(--border)] font-medium">
              {entry.secondaryTheme}
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded border font-semibold ${
              entry.evidenceStrength === "High"
                ? "border-sky-500/40 bg-sky-950/30 text-sky-300"
                : entry.evidenceStrength === "Medium"
                ? "border-amber-500/40 bg-amber-950/30 text-amber-300"
                : "border-zinc-700 bg-zinc-800/40 text-zinc-300"
            }`}
            title={
              entry.evidenceStrength === "High"
                ? "High: direct observation, verbatim quote, corroborated"
                : entry.evidenceStrength === "Medium"
                ? "Medium: secondary account, retrospective summary"
                : "Low: unverified assertion, single uncorroborated claim"
            }
          >
            {entry.evidenceStrength} Reliability
          </span>
          {entry.sensitivityFlag && entry.sensitivityFlag !== "None" && (
            <span
              className={`px-2 py-0.5 rounded border font-semibold ${
                entry.sensitivityFlag === "High"
                  ? "border-rose-500/40 bg-rose-950/30 text-rose-300"
                  : "border-amber-500/40 bg-amber-950/30 text-amber-300"
              }`}
            >
              {entry.sensitivityFlag} Sensitivity
            </span>
          )}
        </div>

        {/* Action Buttons for Editable Study */}
        {!isDemoCase && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border)]">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Qualification Actions */}
              {onQualify && effectiveReviewStatus !== "usable" && (
                <button
                  type="button"
                  onClick={() => onQualify(entry)}
                  className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer shadow-sm"
                  title="Mark as Qualified / Usable for analytical synthesis"
                >
                  ✓ Qualify
                </button>
              )}

              {onFlagClarification && effectiveReviewStatus !== "needs_clarification" && (
                <button
                  type="button"
                  onClick={() => onFlagClarification(entry)}
                  className="rounded border border-sky-500/50 bg-sky-950/40 px-2 py-1 text-xs font-medium text-sky-300 hover:bg-sky-900/60 cursor-pointer"
                  title="Flag as Needs Clarification for team follow-up"
                >
                  ? Clarify
                </button>
              )}

              {canReject(entry) && (
                <button
                  type="button"
                  onClick={() => onReject(entry)}
                  className="rounded border border-rose-600 bg-rose-950/40 px-2 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 cursor-pointer"
                  title="Disqualify/exclude from synthesis with methodological justification"
                >
                  ✕ Exclude
                </button>
              )}

              {canReopen(entry) && (
                <button
                  type="button"
                  onClick={() => onReopen(entry)}
                  className="rounded bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-600 cursor-pointer shadow-sm"
                >
                  ↺ Reopen
                </button>
              )}

              {/* Edit button */}
              <button
                type="button"
                onClick={() => onEdit(entry)}
                className="rounded border border-[var(--border)] px-2 py-1 text-xs font-medium text-[var(--muted)] hover:border-[var(--trace)] hover:text-[var(--foreground)] cursor-pointer"
              >
                ✎ Edit
              </button>
            </div>

            <button
              type="button"
              onClick={() => onTraceSelect(entry.id)}
              className="rounded border border-[var(--trace-border)] bg-[var(--trace)] px-2.5 py-1 text-xs font-semibold text-[var(--trace-ink)] hover:bg-[var(--trace-text)] cursor-pointer"
            >
              Inspect Chain &rarr;
            </button>
          </div>
        )}

        {isDemoCase && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => onTraceSelect(entry.id)}
              className="rounded border border-[var(--trace-border)] bg-[var(--trace)] px-2.5 py-1 text-xs font-semibold text-[var(--trace-ink)] hover:bg-[var(--trace-text)] cursor-pointer"
            >
              Inspect Chain &rarr;
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
