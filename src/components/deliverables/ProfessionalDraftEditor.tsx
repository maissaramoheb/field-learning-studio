"use client";
import { useState } from "react";
import type { FieldStudy, DraftRecordKind, ProfessionalDraft } from "@/lib/types";
import { assessProfessionalDraft, captureDraftItem, createProfessionalDraft, draftKinds, isDraftRecordCurrent } from "@/lib/professionalDraft";
import { saveProfessionalDraft } from "@/lib/storage/studyStore";

const labels = { findings: "Findings", lessons: "Lessons Learned", goodPractices: "Good Practices", recommendations: "Recommendations" };
export function ProfessionalDraftEditor({ study, onSaved, onInspect }: { study: FieldStudy; onSaved: () => Promise<void>; onInspect: (id: string) => void }) {
  const [draft, setDraft] = useState<ProfessionalDraft>(() => study.professionalDraft || createProfessionalDraft(study));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(study.professionalDraft);
  const review = assessProfessionalDraft(study, draft);
  function toggle(kind: DraftRecordKind, id: string, include: boolean) {
    setMessage("");
    setDraft({ ...draft, items: include ? [...draft.items, captureDraftItem(study, kind, id)] : draft.items.filter(item => item.kind !== kind || item.recordId !== id) });
  }
  async function save() {
    setSaving(true); setMessage("");
    try { await saveProfessionalDraft(study.id, draft); await onSaved(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save draft."); }
    finally { setSaving(false); }
  }
  return <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4" aria-label="Assemble Professional Draft">
    <h3 className="text-base font-semibold">Assemble from current validated records</h3>
    <p className="text-sm text-[var(--muted)]">Choose structured analytical outputs deliberately. Selected learning and recommendations bring their current parent Findings into the output as linked context. Preview and downloads use saved choices after the first save. Before that, the existing automatic preview shows eligible records; it is not an intentionally assembled draft.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {draftKinds.map(kind => <fieldset key={kind} className="min-w-0 space-y-2 rounded border border-[var(--border)] p-3">
        <legend className="px-1 text-sm font-semibold">{labels[kind]}</legend>
        {!study[kind].some(record => isDraftRecordCurrent(study, kind, record.id)) && <p className="text-xs text-[var(--muted)]">No current validated records available.</p>}
        {study[kind].filter(record => isDraftRecordCurrent(study, kind, record.id)).map(record => {
          const label = "statement" in record ? record.statement : "recommendation" in record ? record.recommendation : record.title;
          return <label key={record.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={draft.items.some(item => item.kind === kind && item.recordId === record.id)} onChange={event => toggle(kind, record.id, event.target.checked)} /><span className="min-w-0 break-words">{record.id}: {label}</span></label>;
        })}
      </fieldset>)}
    </div>
    {review.selections.length > 0 && <div className="space-y-3"><h4 className="text-sm font-semibold">Included records and historical snapshots</h4>
      {review.selections.map(({ item, state, ready }) => <article key={`${item.kind}:${item.recordId}`} className="rounded border border-[var(--border)] p-3">
        <p className="break-words text-sm"><button type="button" className="text-[var(--trace-text)] underline" onClick={() => onInspect(item.recordId)}>{item.recordId}</button>: {item.label}</p>
        <p className={`mt-1 text-xs ${ready ? "text-[var(--muted)]" : "text-[var(--warning-text)]"}`}>{state} — inclusion snapshot retained</p>
        <details className="mt-2"><summary className="cursor-pointer text-xs">Inspect text at inclusion</summary><pre className="mt-2 whitespace-pre-wrap break-words text-xs">{item.snapshotText}</pre></details>
        <div className="mt-2 flex flex-wrap gap-2">
          {!ready && isDraftRecordCurrent(study, item.kind, item.recordId) && <button type="button" className="fls-button" onClick={() => setDraft({ ...draft, items: draft.items.map(old => old === item ? captureDraftItem(study, item.kind, item.recordId) : old) })}>Refresh inclusion</button>}
          <button type="button" className="fls-button" onClick={() => toggle(item.kind, item.recordId, false)}>Remove from draft</button>
        </div>
      </article>)}
    </div>}
    <div className="space-y-3 rounded border border-[var(--border)] p-3">
      <p className="text-xs font-semibold text-[var(--warning-text)]">MANUAL — UNLINKED SUBSTANTIVE FREE TEXT</p>
      <label className="block text-sm">Executive Summary<textarea rows={4} value={draft.manualExecutiveSummary} onChange={event => setDraft({ ...draft, manualExecutiveSummary: event.target.value })} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-muted)] p-2" /></label>
      <label className="block text-sm">Key Messages — one per line<textarea rows={3} value={draft.manualKeyMessages.join("\n")} onChange={event => setDraft({ ...draft, manualKeyMessages: event.target.value.split("\n") })} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-muted)] p-2" /></label>
      <p className="text-xs text-[var(--muted)]">This prose has no structured claim-level lineage. Human review remains required; it does not become validated by saving.</p>
    </div>
    <div className="flex flex-wrap items-center gap-3"><button type="button" className="fls-button fls-button-primary" onClick={save} disabled={saving || !dirty}>{saving ? "Saving…" : "Save Professional Draft"}</button>
      <p className="text-sm text-[var(--muted)]" role="status">{message || (dirty ? "Unsaved changes — save before leaving or exporting." : `Saved draft revision ${draft.revision}.`)}</p></div>
  </section>;
}
