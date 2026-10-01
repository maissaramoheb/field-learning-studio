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
  return (
    <section className="space-y-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5" aria-label="Assemble Professional Draft">
      <div>
        <h3 className="text-base font-semibold text-[var(--foreground)] tracking-tight">Assemble from current validated records</h3>
        <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
          Choose structured analytical outputs deliberately. Selected learning and recommendations bring their current parent Findings into the output as linked context. Preview and downloads use saved choices after the first save. Before that, the existing automatic preview shows eligible records; it is not an intentionally assembled draft.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {draftKinds.map((kind) => (
          <fieldset key={kind} className="min-w-0 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3.5">
            <legend className="px-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">{labels[kind]}</legend>
            {!study[kind].some((record) => isDraftRecordCurrent(study, kind, record.id)) && (
              <p className="text-xs text-[var(--muted)] italic">No current validated records available.</p>
            )}
            {study[kind].filter((record) => isDraftRecordCurrent(study, kind, record.id)).map((record) => {
              const label = "statement" in record ? record.statement : "recommendation" in record ? record.recommendation : record.title;
              return (
                <label key={record.id} className="flex items-start gap-2.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface-elevated)] p-1.5 rounded transition cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-[var(--border)] text-[var(--accent)]"
                    checked={draft.items.some((item) => item.kind === kind && item.recordId === record.id)}
                    onChange={(event) => toggle(kind, record.id, event.target.checked)}
                  />
                  <span className="min-w-0 break-words leading-snug">
                    <strong className="font-mono text-[11px] text-[var(--foreground)]">{record.id}:</strong> {label}
                  </span>
                </label>
              );
            })}
          </fieldset>
        ))}
      </div>

      {review.selections.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
            Included records ({review.selections.length}) &amp; Historical Snapshots
          </h4>
          {review.selections.map(({ item, state, ready }) => (
            <article key={`${item.kind}:${item.recordId}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="break-words text-xs font-medium text-[var(--foreground)]">
                  <button type="button" className="text-[var(--trace-text)] font-semibold underline cursor-pointer hover:opacity-80" onClick={() => onInspect(item.recordId)}>
                    {item.recordId}
                  </button>
                  : {item.label}
                </p>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider ${
                    ready
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-[var(--warning-soft)] text-[var(--warning-text)] border border-[var(--warning-border)]"
                  }`}
                >
                  {state} — snapshot retained
                </span>
              </div>
              <details className="mt-2.5 rounded border border-[var(--border)] bg-[var(--surface-muted)] p-2">
                <summary className="cursor-pointer text-[11px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] select-none">
                  Inspect text at inclusion
                </summary>
                <pre className="mt-1.5 whitespace-pre-wrap break-words text-[11px] font-mono text-[var(--muted-soft)] leading-relaxed">
                  {item.snapshotText}
                </pre>
              </details>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {!ready && isDraftRecordCurrent(study, item.kind, item.recordId) && (
                  <button
                    type="button"
                    className="fls-button fls-button-quiet text-xs cursor-pointer border border-[var(--warning-border)] text-[var(--warning-text)] hover:bg-[var(--warning-soft)]"
                    onClick={() => setDraft({ ...draft, items: draft.items.map((old) => (old === item ? captureDraftItem(study, item.kind, item.recordId) : old)) })}
                  >
                    ↻ Refresh inclusion
                  </button>
                )}
                <button
                  type="button"
                  className="fls-button fls-button-quiet text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                  onClick={() => toggle(item.kind, item.recordId, false)}
                >
                  Remove from draft
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-wash)] p-4">
        <div className="flex items-center gap-1.5 text-[var(--warning-text)] font-bold text-xs uppercase tracking-wider">
          <span>⚠</span>
          <span>MANUAL — UNLINKED SUBSTANTIVE FREE TEXT</span>
        </div>
        <label className="block text-xs font-semibold text-[var(--foreground)]">
          Executive Summary
          <textarea
            rows={4}
            value={draft.manualExecutiveSummary}
            onChange={(event) => setDraft({ ...draft, manualExecutiveSummary: event.target.value })}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)] leading-relaxed focus:border-[var(--trace)] focus:outline-none"
          />
        </label>
        <label className="block text-xs font-semibold text-[var(--foreground)]">
          Key Messages — one per line
          <textarea
            rows={3}
            value={draft.manualKeyMessages.join("\n")}
            onChange={(event) => setDraft({ ...draft, manualKeyMessages: event.target.value.split("\n") })}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)] leading-relaxed focus:border-[var(--trace)] focus:outline-none"
          />
        </label>
        <p className="text-[11px] text-[var(--muted)] leading-relaxed">
          This prose has no structured claim-level lineage. Human review remains required; saving does not certify or validate free text.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          className="fls-button fls-button-primary cursor-pointer"
          onClick={save}
          disabled={saving || !dirty}
        >
          {saving ? "Saving…" : "Save Professional Draft"}
        </button>
        <p className="text-xs text-[var(--muted)]" role="status">
          {message || (dirty ? "Unsaved changes — save before leaving or exporting." : `Saved draft revision ${draft.revision}.`)}
        </p>
      </div>
    </section>
  );
}
