"use client";
import { useEffect, useState } from "react";
import type { DemoCase, FieldStudy } from "@/lib/types";
import { assessProfessionalDraft } from "@/lib/professionalDraft";
import { checkDraftFiles } from "@/lib/storage/draftExport";

export function useDraftReview(study: FieldStudy | DemoCase) {
  const [check, setCheck] = useState<{ study: typeof study; availability: Record<string, boolean> } | null>(null);
  useEffect(() => {
    let active = true;
    checkDraftFiles(study).then(availability => { if (active) setCheck({ study, availability }); });
    return () => { active = false; };
  }, [study]);
  return assessProfessionalDraft(study, study.professionalDraft, check?.study === study ? check.availability : undefined);
}

export function DraftReadiness({ study }: { study: FieldStudy | DemoCase }) {
  const review = useDraftReview(study);
  const isReady = review.ready;

  return (
    <section
      className={`rounded-lg border p-4 transition ${
        isReady
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-[var(--warning-border)] bg-[var(--warning-wash)]"
      }`}
      aria-label="Professional Draft readiness"
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
            isReady
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-[var(--warning-soft)] text-[var(--warning-text)]"
          }`}
          aria-hidden="true"
        >
          {isReady ? "✓" : "⚠"}
        </span>
        <h3
          className={`text-sm font-semibold tracking-wide ${
            isReady ? "text-emerald-400" : "text-[var(--warning-text)]"
          }`}
        >
          {isReady ? "READY FOR PROFESSIONAL EXPORT" : "WORKING DRAFT — NEEDS ATTENTION"}
        </h3>
      </div>

      <p className="mt-1.5 text-xs text-[var(--foreground)] leading-relaxed">
        <span className="font-semibold">{review.state}:</span> selected records, inclusion changes and current parent authority. Human methodological review and sign-off remain required.
      </p>

      {review.blockers.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 ps-5 text-xs text-[var(--warning-text)] font-medium">
          {review.blockers.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`px-2 py-0.5 rounded font-mono font-semibold text-[10px] uppercase tracking-wider ${
            review.fileState === "CHECKED"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : review.fileState === "NEEDS ATTENTION"
              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
              : "bg-slate-500/15 text-slate-400 border border-slate-500/30"
          }`}
        >
          FILES: {review.fileState}
        </span>
        <span className="text-xs text-[var(--muted)]">
          {review.fileState === "UNAVAILABLE"
            ? "No original files referenced; source records remain linked."
            : review.fileState === "CHECKED"
            ? "All referenced original files verified in storage."
            : "Referenced original files missing from storage."}
        </span>
      </div>

      {review.unlinkedText && (
        <div className="mt-3 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-soft)] p-3 text-xs text-[var(--warning-text)]">
          <div className="font-semibold flex items-center gap-1.5 text-[var(--warning-text)]">
            <span>⚠</span>
            <span>NEEDS ATTENTION: UNLINKED SUBSTANTIVE FREE TEXT</span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--warning-text)] opacity-90 leading-relaxed">
            Manual summary and key messages have no claim-level structured lineage. Evaluator review remains required before external release.
          </p>
        </div>
      )}

      <p className="mt-3 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted-soft)] italic">
        NOT CHECKED: substantive agreement, whether recorded contradictions are adequately addressed, and confidentiality clearance.
      </p>
    </section>
  );
}
