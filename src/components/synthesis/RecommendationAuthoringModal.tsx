"use client";

import React, { useState } from "react";
import type { Recommendation, Finding, FieldStudy, FindingId, RecommendationPriority } from "@/lib/types";
import { getNextRecommendationId } from "@/lib/idGenerator";
import { getLinkedFindingIds, isFindingExportEligible } from "@/lib/exportPolicy";
import { WorkspaceDialog } from "@/components/WorkspaceDialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveRecommendation: (recommendation: Recommendation) => void | Promise<void>;
  existingRecommendations: Recommendation[];
  linkedFinding: Finding;
  study?: FieldStudy;
  initialRecommendation?: Recommendation | null;
}

export function RecommendationAuthoringModal(props: Props) {
  return props.isOpen ? <RecommendationForm key={props.initialRecommendation?.id || props.linkedFinding.id} {...props} /> : null;
}

function RecommendationForm({ onClose, onSaveRecommendation, existingRecommendations, linkedFinding, study, initialRecommendation }: Props) {
  const [text, setText] = useState(initialRecommendation?.recommendation || "");
  const [parents, setParents] = useState<string[]>(initialRecommendation ? getLinkedFindingIds(initialRecommendation) : [linkedFinding.id]);
  const [priority, setPriority] = useState<RecommendationPriority | "">(initialRecommendation?.priority || "");
  const [metadata, setMetadata] = useState({ responsibleActor: initialRecommendation?.responsibleActor || "", timeframe: initialRecommendation?.timeframe || "",
    feasibility: initialRecommendation?.feasibility || "", riskSensitivity: initialRecommendation?.riskSensitivity || "",
    expectedBenefit: initialRecommendation?.expectedBenefit || "", successIndicator: initialRecommendation?.successIndicator || "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const findings = study?.findings || [linkedFinding];
  const current = (finding: Finding) => study ? isFindingExportEligible(finding, study) : finding.validationStatus === "Validated" && !finding.supersededByFindingId && !finding.supersededAt;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim() || !parents.length || parents.some(id => !findings.some(f => f.id === id && current(f)))) {
      setError("Enter an action and select one or more current validated Findings. Remove or replace non-current parents before saving."); return;
    }
    setSaving(true); setError("");
    try {
      await onSaveRecommendation({ ...initialRecommendation,
        id: initialRecommendation?.id || getNextRecommendationId(existingRecommendations.map(r => r.id)),
        studyId: study?.id || linkedFinding.studyId, recommendation: text.trim(),
        linkedFindingId: parents[0] as FindingId, linkedFindingIds: parents as FindingId[],
        evidenceBase: [...new Set(findings.filter(f => parents.includes(f.id)).flatMap(f => f.supportingEvidenceIds))],
        ...Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, value.trim()])) as typeof metadata,
        priority: priority || undefined, validationStatus: initialRecommendation?.validationStatus || "Draft",
        revision: initialRecommendation?.revision || 1, createdAt: initialRecommendation?.createdAt || Date.now(), updatedAt: Date.now() });
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save Recommendation."); }
    finally { setSaving(false); }
  }

  return <WorkspaceDialog labelledBy="recommendation-title" onClose={onClose}>
    <div className="flex items-center justify-between gap-3"><h2 id="recommendation-title" className="text-lg font-semibold">{initialRecommendation ? "Edit Recommendation" : "Create Recommendation"}</h2>
      <button type="button" className="fls-button" onClick={onClose} disabled={saving}>Close</button></div>
    <p className="mt-2 text-sm text-[var(--muted)]">Ground the action in current Findings. Decision metadata is recorded only when you supply it. Editing reviewed substance requires review again.</p>
    <form onSubmit={submit} className="mt-4 space-y-4">
      {error && <p role="alert" className="text-sm text-[var(--danger-text)]">{error}</p>}
      <label className="block text-sm">Recommendation action<textarea required rows={3} value={text} onChange={event => setText(event.target.value)} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-muted)] p-3" /></label>
      <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">Supporting Findings — select all relied-upon parents</legend>
        {findings.filter(f => current(f) || parents.includes(f.id)).map(f => <label key={f.id} className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={parents.includes(f.id)} disabled={!current(f) && !parents.includes(f.id)} onChange={event => setParents(event.target.checked ? [...parents, f.id] : parents.filter(id => id !== f.id))} />
          <span>{f.id}: {f.statement}{!current(f) && " — NON-CURRENT; remove or replace"}</span></label>)}
      </fieldset>
      <details className="rounded border border-[var(--border)] p-3"><summary className="cursor-pointer text-sm">Optional decision metadata</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">Priority<select value={priority} onChange={event => setPriority(event.target.value as RecommendationPriority | "")} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2"><option value="">Not recorded</option>{["High", "Medium", "Low"].map(value => <option key={value}>{value}</option>)}</select></label>
          {Object.entries(metadata).map(([key, value]) => <label key={key} className="block text-sm">{{ responsibleActor: "Responsible actor", timeframe: "Timeframe", feasibility: "Feasibility / constraints", riskSensitivity: "Risk / sensitivity", expectedBenefit: "Expected benefit", successIndicator: "Success indicator" }[key]}<input value={value} onChange={event => setMetadata({ ...metadata, [key]: event.target.value })} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2" /></label>)}
        </div>
      </details>
      <button type="submit" disabled={saving} className="fls-button fls-button-primary">{saving ? "Saving…" : "Save Recommendation"}</button>
    </form>
  </WorkspaceDialog>;
}
