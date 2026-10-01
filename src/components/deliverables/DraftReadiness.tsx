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
  return <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4" aria-label="Professional Draft readiness">
    <h3 className="text-sm font-semibold">{review.ready ? "READY FOR PROFESSIONAL EXPORT" : "WORKING DRAFT — NEEDS ATTENTION"}</h3>
    <p className="mt-1 text-sm text-[var(--muted)]">{review.state}: selected records, inclusion changes and current parent authority. Human methodological review and sign-off remain required.</p>
    {review.blockers.length > 0 && <ul className="mt-2 list-disc space-y-1 ps-5 text-sm">{review.blockers.map(reason => <li key={reason}>{reason}</li>)}</ul>}
    <p className="mt-2 text-xs text-[var(--muted)]">{review.fileState}: original files referenced by selected records. No referenced original file means availability is UNAVAILABLE; stored source context remains linked.</p>
    {review.unlinkedText && <p className="mt-2 text-sm text-[var(--warning-text)]">NEEDS ATTENTION: UNLINKED SUBSTANTIVE FREE TEXT. Manual summary/key messages are not certified by structured-record checks.</p>}
    <p className="mt-2 text-xs text-[var(--muted)]">NOT CHECKED: substantive agreement, whether recorded contradictions are adequately addressed, and confidentiality clearance.</p>
  </section>;
}
