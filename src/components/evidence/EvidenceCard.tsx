"use client";

import React from "react";
import type {
  EvidenceEntry,
  Finding,
  SourceRecord,
} from "@/lib/types";
import {
  canSubmitForReview,
  canValidate,
  canReject,
  canReopen,
  requiresRevalidation,
} from "@/lib/validation";
import { ValidationStatusBadge } from "./ValidationStatusBadge";

interface EvidenceCardProps {
  entry: EvidenceEntry;
  source?: SourceRecord;
  linkedFinding?: Finding;
  isHighlighted: boolean;
  isDemoCase: boolean;
  onTraceSelect: (id: string) => void;
  onEdit: (entry: EvidenceEntry) => void;
  onSubmitForReview: (entry: EvidenceEntry) => void;
  onValidate: (entry: EvidenceEntry) => void;
  onReject: (entry: EvidenceEntry) => void;
  onReopen: (entry: EvidenceEntry) => void;
}

export function EvidenceCard({
  entry,
  source,
  linkedFinding,
  isHighlighted,
  isDemoCase,
  onTraceSelect,
  onEdit,
  onSubmitForReview,
  onValidate,
  onReject,
  onReopen,
}: EvidenceCardProps) {
  const needsRevalidation = requiresRevalidation(entry);
  const status = entry.validationStatus || (isDemoCase ? "Validated" : "Draft");
  const isSandbox = entry.id.includes("SBX") || entry.id.startsWith("EV-TEMP-");

  return (
    <article
      id={`trace-${entry.id}`}
      className={`scroll-mt-32 rounded-xl border transition p-5 flex flex-col justify-between ${
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
            <div className="flex items-center gap-2">
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
            </div>

            <h3 className="mt-2 text-base font-bold text-[var(--foreground)] leading-snug">
              {entry.primaryTheme}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {entry.stakeholderType}
              {source ? ` • ${source.sourceType}` : ""}
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

            {isDemoCase ? (
              <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-950/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                Demo Reference
              </span>
            ) : (
              <ValidationStatusBadge
                status={entry.validationStatus}
                revision={entry.revision}
              />
            )}
          </div>
        </div>

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
          <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-1.5 text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span>✓</span>
              <span>
                Validated by <span className="font-semibold text-emerald-200">{entry.lastValidatedBy}</span>
              </span>
            </div>
            {entry.lastValidatedAt && (
              <span className="text-[10px] text-emerald-400/80">
                {new Date(entry.lastValidatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {/* Rejection Banner */}
        {status === "Rejected" && entry.rejectionReason && (
          <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">
            <div className="flex items-center gap-1 font-semibold text-rose-200">
              <span>✕</span>
              <span>Rejection Rationale:</span>
            </div>
            <p className="mt-1 italic text-rose-200/90">&ldquo;{entry.rejectionReason}&rdquo;</p>
          </div>
        )}

        {/* Observations & Interpretations */}
        <div className="space-y-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
              Observation
            </span>
            <p className="text-xs font-medium leading-relaxed text-[var(--foreground)]">
              {entry.rawObservation || entry.rawEvidence}
            </p>
          </div>

          {(entry.interpretation || entry.potentialFinding) && (
            <div className="rounded-lg border border-[var(--trace-border)] bg-[var(--trace-wash)] p-3 text-xs leading-relaxed">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                Interpretation
              </span>
              <p className="text-[var(--foreground)] font-medium">
                {entry.interpretation || entry.potentialFinding}
              </p>
            </div>
          )}

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
          >
            {entry.evidenceStrength} Strength
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
            <div className="flex flex-wrap items-center gap-2">
              {/* Draft state actions */}
              {canSubmitForReview(entry) && (
                <button
                  type="button"
                  onClick={() => onSubmitForReview(entry)}
                  className="rounded bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-500 cursor-pointer shadow-sm"
                >
                  Submit for Review &rarr;
                </button>
              )}

              {/* Needs Review state actions */}
              {canValidate(entry) && canReject(entry) && (
                <>
                  <button
                    type="button"
                    onClick={() => onValidate(entry)}
                    className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer shadow-sm"
                  >
                    ✓ Validate
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(entry)}
                    className="rounded border border-rose-600 bg-rose-950/40 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 cursor-pointer"
                  >
                    ✕ Reject
                  </button>
                </>
              )}

              {/* Rejected state actions */}
              {canReopen(entry) && (
                <button
                  type="button"
                  onClick={() => onReopen(entry)}
                  className="rounded bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-600 cursor-pointer shadow-sm"
                >
                  ↺ Reopen for Revision
                </button>
              )}

              {/* Edit button */}
              <button
                type="button"
                onClick={() => onEdit(entry)}
                className={`rounded border px-2.5 py-1 text-xs font-medium cursor-pointer ${
                  status === "Validated"
                    ? "border-amber-500/50 bg-amber-950/20 text-amber-300 hover:bg-amber-900/40"
                    : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--trace)] hover:text-[var(--foreground)]"
                }`}
              >
                {status === "Validated" ? "✎ Edit (Re-validate)" : "✎ Edit"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => onTraceSelect(entry.id)}
              className="rounded border border-[var(--trace-border)] bg-[var(--trace)] px-2.5 py-1 text-xs font-semibold text-[#03121a] hover:bg-[var(--trace-text)] cursor-pointer"
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
              className="rounded border border-[var(--trace-border)] bg-[var(--trace)] px-2.5 py-1 text-xs font-semibold text-[#03121a] hover:bg-[var(--trace-text)] cursor-pointer"
            >
              Inspect Chain &rarr;
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
