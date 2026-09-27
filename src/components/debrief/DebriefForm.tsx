"use client";

import React, { useState, useMemo } from "react";
import type {
  FieldStudy,
  DailyDebrief,
  SourceRecordId,
  EvidenceEntryId,
} from "@/lib/types";
import { getNextDebriefId } from "@/lib/idGenerator";
import { RecordLinkSelector } from "./RecordLinkSelector";

interface DebriefFormProps {
  study: FieldStudy;
  initialDebrief?: DailyDebrief | null;
  onSave: (debrief: DailyDebrief) => Promise<void> | void;
  onCancel: () => void;
}

export function DebriefForm({
  study,
  initialDebrief,
  onSave,
  onCancel,
}: DebriefFormProps) {
  const isEditing = Boolean(initialDebrief);

  // 1. Session Metadata
  const [date, setDate] = useState(
    () => initialDebrief?.date || new Date().toISOString().slice(0, 10)
  );

  // Multi-site selection
  const [selectedSites, setSelectedSites] = useState<string[]>(() => {
    if (initialDebrief && initialDebrief.siteIds?.length > 0) {
      return [...initialDebrief.siteIds];
    }
    return study.scope.targetSites?.[0] ? [study.scope.targetSites[0]] : ["All Sites / Study-Wide"];
  });
  const [customSiteInput, setCustomSiteInput] = useState("");

  // Attendees (comma separated input or tag list)
  const [attendeesText, setAttendeesText] = useState(
    () => initialDebrief?.attendees?.join(", ") || ""
  );

  // 2. Guided Reflection Prompts
  const [whatSurprisedUs, setWhatSurprisedUs] = useState(
    () => initialDebrief?.whatSurprisedUs || ""
  );
  const [whatRepeated, setWhatRepeated] = useState(
    () => initialDebrief?.whatRepeated || ""
  );
  const [contradictionsObserved, setContradictionsObserved] = useState(
    () => initialDebrief?.contradictionsObserved || ""
  );
  const [shakenAssumptions, setShakenAssumptions] = useState(
    () => initialDebrief?.shakenAssumptions || ""
  );
  const [potentialBiases, setPotentialBiases] = useState(
    () => initialDebrief?.potentialBiases || ""
  );
  const [missingPerspectives, setMissingPerspectives] = useState(
    () => initialDebrief?.missingPerspectives || ""
  );
  const [emergingHypotheses, setEmergingHypotheses] = useState(
    () => initialDebrief?.emergingHypotheses || ""
  );

  // 3. Tomorrow Priorities (Discrete string array)
  const [tomorrowPriorities, setTomorrowPriorities] = useState<string[]>(
    () => initialDebrief?.tomorrowPriorities || []
  );
  const [newPriorityInput, setNewPriorityInput] = useState("");
  const [editingPriorityIndex, setEditingPriorityIndex] = useState<number | null>(null);
  const [editingPriorityText, setEditingPriorityText] = useState("");

  // 4. Linked Sources & Evidence
  const [linkedSourceIds, setLinkedSourceIds] = useState<string[]>(
    () => (initialDebrief?.linkedSourceIds as string[]) || []
  );
  const [linkedEvidenceIds, setLinkedEvidenceIds] = useState<string[]>(
    () => (initialDebrief?.linkedEvidenceIds as string[]) || []
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check for system evidence-gap signals regarding missing perspectives
  const systemMissingStakeholders = useMemo(() => {
    const representedStakeholders = new Set<string>();
    for (const e of study.evidence) {
      if (e.stakeholderType?.trim()) {
        representedStakeholders.add(e.stakeholderType.trim().toLowerCase());
      }
    }
    for (const s of study.sources) {
      if (s.stakeholderType?.trim()) {
        representedStakeholders.add(s.stakeholderType.trim().toLowerCase());
      }
    }

    return (study.scope.targetStakeholderGroups || []).filter(
      (sg) => !representedStakeholders.has(sg.trim().toLowerCase())
    );
  }, [study.evidence, study.sources, study.scope.targetStakeholderGroups]);

  // Site toggling
  const handleToggleSite = (site: string) => {
    setSelectedSites((prev) => {
      if (prev.includes(site)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((s) => s !== site);
      }
      return [...prev, site];
    });
  };

  const handleAddCustomSite = () => {
    const trimmed = customSiteInput.trim();
    if (trimmed && !selectedSites.includes(trimmed)) {
      setSelectedSites((prev) => [...prev, trimmed]);
      setCustomSiteInput("");
    }
  };

  // Priorities management
  const handleAddPriority = () => {
    const trimmed = newPriorityInput.trim();
    if (!trimmed) return;
    setTomorrowPriorities((prev) => [...prev, trimmed]);
    setNewPriorityInput("");
  };

  const handleRemovePriority = (index: number) => {
    setTomorrowPriorities((prev) => prev.filter((_, i) => i !== index));
    if (editingPriorityIndex === index) {
      setEditingPriorityIndex(null);
    }
  };

  const handleStartEditPriority = (index: number) => {
    setEditingPriorityIndex(index);
    setEditingPriorityText(tomorrowPriorities[index] || "");
  };

  const handleSaveEditPriority = (index: number) => {
    const trimmed = editingPriorityText.trim();
    if (!trimmed) return;
    setTomorrowPriorities((prev) =>
      prev.map((item, i) => (i === index ? trimmed : item))
    );
    setEditingPriorityIndex(null);
    setEditingPriorityText("");
  };

  // Source & Evidence toggle
  const handleToggleSource = (id: string) => {
    setLinkedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleEvidence = (id: string) => {
    setLinkedEvidenceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date.trim()) {
      setErrorMessage("Debrief session date is required.");
      return;
    }
    if (selectedSites.length === 0) {
      setErrorMessage("At least one site must be selected.");
      return;
    }
    if (!whatSurprisedUs.trim() || !whatRepeated.trim()) {
      setErrorMessage("Please complete the required reflection prompts (Surprises and Patterns).");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const parsedAttendees = attendeesText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      const existingDebriefIds = (study.debriefs || []).map((d) => d.id);
      const debriefId =
        initialDebrief?.id || getNextDebriefId(existingDebriefIds);
      const now = Date.now();

      const debriefRecord: DailyDebrief = {
        id: debriefId,
        studyId: study.id,
        date: date.trim(),
        siteIds: [...selectedSites],
        attendees: parsedAttendees,
        whatSurprisedUs: whatSurprisedUs.trim(),
        whatRepeated: whatRepeated.trim(),
        contradictionsObserved: contradictionsObserved.trim(),
        shakenAssumptions: shakenAssumptions.trim(),
        potentialBiases: potentialBiases.trim(),
        missingPerspectives: missingPerspectives.trim(),
        emergingHypotheses: emergingHypotheses.trim(),
        tomorrowPriorities: [...tomorrowPriorities],
        linkedSourceIds: (linkedSourceIds || []) as SourceRecordId[],
        linkedEvidenceIds: (linkedEvidenceIds || []) as EvidenceEntryId[],
        createdAt: initialDebrief?.createdAt || now,
        updatedAt: now,
      };

      await onSave(debriefRecord);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save debrief.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 shadow-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--trace)]">
            Methodological Reflection Log
          </span>
          <h3 className="text-xl font-bold text-[var(--foreground)] mt-0.5">
            {isEditing ? `Edit Daily Debrief (${initialDebrief?.id})` : "Record New Daily Field Debrief"}
          </h3>
          <p className="text-xs text-[var(--muted)] mt-1">
            Turn daily field experiences into disciplined questions, interrogate assumptions, and plan tomorrow&apos;s inquiries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-600 disabled:opacity-50 transition cursor-pointer"
          >
            {isSaving ? "Saving Debrief..." : isEditing ? "Update Daily Debrief" : "Save Daily Debrief"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">
          ⚠️ {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Session Context */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
            1. Field Session Context
          </h4>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Session Date */}
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Session Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              />
            </div>

            {/* Attendees */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Attendees / Field Team Members
              </label>
              <input
                type="text"
                value={attendeesText}
                onChange={(e) => setAttendeesText(e.target.value)}
                placeholder="e.g. M. Selim, Field Researcher 2, Note-taker"
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
              />
              <span className="text-[10px] text-[var(--muted)] mt-0.5 block">
                Separate names with commas.
              </span>
            </div>
          </div>

          {/* Sites Covered (Multi-site support) */}
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
              Sites / Locations Covered Today <span className="text-rose-400">*</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {(study.scope.targetSites || []).map((site) => {
                const isSelected = selectedSites.includes(site);
                return (
                  <button
                    key={site}
                    type="button"
                    onClick={() => handleToggleSite(site)}
                    className={`rounded-lg border px-3 py-1 text-xs font-medium cursor-pointer transition select-none ${
                      isSelected
                        ? "border-emerald-500/50 bg-emerald-950/30 text-emerald-300 ring-1 ring-emerald-500/30"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {site}
                  </button>
                );
              })}

              {/* Custom site addition */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customSiteInput}
                  onChange={(e) => setCustomSiteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomSite();
                    }
                  }}
                  placeholder="Add other site..."
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none w-36"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSite}
                  disabled={!customSiteInput.trim()}
                  className="rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--trace)] disabled:opacity-40 cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Guided Methodological Reflection Prompts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              2. Guided Sensemaking &amp; Reflection Prompts
            </h4>
            <span className="text-[11px] text-[var(--muted)]">
              Internal field inquiries — not formal conclusions
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* What Surprised Us */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3.5 space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                ⚡ What surprised us today? <span className="text-rose-400">*</span>
              </label>
              <p className="text-[10px] text-[var(--muted)]">
                Unanticipated conditions, candid reactions, novel anecdotes, or unexpected institutional dynamics.
              </p>
              <textarea
                required
                rows={3}
                value={whatSurprisedUs}
                onChange={(e) => setWhatSurprisedUs(e.target.value)}
                placeholder="e.g. Late meal deliveries were mentioned independently by both teachers and parents, despite headmaster reporting normal logistics..."
                className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
              />
            </div>

            {/* What Repeated */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3.5 space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                🔁 What patterns repeated? <span className="text-rose-400">*</span>
              </label>
              <p className="text-[10px] text-[var(--muted)]">
                Recurring themes, shared behaviors, or widespread operational observations heard across encounters.
              </p>
              <textarea
                required
                rows={3}
                value={whatRepeated}
                onChange={(e) => setWhatRepeated(e.target.value)}
                placeholder="e.g. Timing concerns appeared across more than one stakeholder group, particularly regarding afternoon hunger..."
                className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
              />
            </div>

            {/* What Contradicted Earlier Evidence */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-amber-300">
                  ⚖️ What contradicted earlier information?
                </label>
                <span className="text-[9px] rounded bg-amber-950/60 border border-amber-800/40 px-1 text-amber-400">
                  Divergence note
                </span>
              </div>
              <p className="text-[10px] text-[var(--muted)]">
                Observations or participant accounts that challenge earlier notes or official registries.
              </p>
              <textarea
                rows={3}
                value={contradictionsObserved}
                onChange={(e) => setContradictionsObserved(e.target.value)}
                placeholder="e.g. Official delivery logs record 100% on-time completion, but field interviews report weekly late deliveries..."
                className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
              />
              <span className="text-[10px] text-amber-400/80 block">
                ℹ️ Debrief reflections record team sensemaking; they do not automatically alter evidence contradiction linkages.
              </span>
            </div>

            {/* Which Assumptions Should We Question */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3.5 space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                ❓ Which assumptions should we question?
              </label>
              <p className="text-[10px] text-[var(--muted)]">
                Programme theories of change, causal models, or evaluator assumptions shaken by today&apos;s findings.
              </p>
              <textarea
                rows={3}
                value={shakenAssumptions}
                onChange={(e) => setShakenAssumptions(e.target.value)}
                placeholder="e.g. Delivery completion may not necessarily mean children actually receive meals on time..."
                className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
              />
            </div>

            {/* Where Might Bias Influence Interpretation */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3.5 space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                🔍 Where might researcher/team bias be influencing interpretation?
              </label>
              <p className="text-[10px] text-[var(--muted)]">
                Reflexive inquiry: confirmation bias, framing bias, fatigue, presence effects, or translation nuances.
              </p>
              <textarea
                rows={3}
                value={potentialBiases}
                onChange={(e) => setPotentialBiases(e.target.value)}
                placeholder="e.g. The team may be giving greater weight to negative experiences because delays were discussed repeatedly today..."
                className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
              />
            </div>

            {/* Whose Perspective Is Still Missing */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3.5 space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                👥 Whose perspective is still missing?
              </label>
              <p className="text-[10px] text-[var(--muted)]">
                Stakeholders, geographic pockets, or vulnerable subgroups whose voices have not yet been heard.
              </p>
              <textarea
                rows={3}
                value={missingPerspectives}
                onChange={(e) => setMissingPerspectives(e.target.value)}
                placeholder="e.g. Children have not yet been directly consulted; kitchen workers and morning transport drivers remain unheard..."
                className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
              />
              {systemMissingStakeholders.length > 0 && (
                <div className="rounded border border-sky-500/20 bg-sky-950/20 p-2 text-[10px] text-sky-300">
                  <span className="font-semibold text-sky-200">System Evidence-Gap Signal:</span>{" "}
                  Study scope stakeholder group(s) with zero observations recorded so far:{" "}
                  <span className="font-semibold text-sky-100">{systemMissingStakeholders.join(", ")}</span>.
                  <span className="block text-[9px] text-sky-400/80 mt-0.5">
                    Read-only calibration hint from Phase 2 gap detector.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Emerging Hypotheses (Full width with prominent guardrail) */}
          <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                <span>💡</span> What hypotheses are emerging?
              </label>
              <span className="text-[10px] rounded bg-amber-900/40 border border-amber-700/50 px-2 py-0.5 text-amber-300 font-semibold uppercase">
                Working Interpretation
              </span>
            </div>
            <textarea
              rows={3}
              value={emergingHypotheses}
              onChange={(e) => setEmergingHypotheses(e.target.value)}
              placeholder="e.g. Distribution timing may be an important factor affecting actual meal uptake..."
              className="w-full rounded border border-amber-500/30 bg-[var(--surface)] p-3 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-amber-400 focus:outline-none"
            />
            <div className="rounded border border-amber-500/30 bg-amber-950/40 p-2.5 text-xs text-amber-200 flex items-center gap-2">
              <span>⚠️</span>
              <span className="text-[11px] leading-relaxed">
                <span className="font-semibold">Boundary Guardrail:</span> Emerging hypotheses are working interpretations for further field inquiry, <span className="font-semibold underline">NOT validated findings</span>. They will not be automatically promoted into the evidence matrix or final brief.
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Tomorrow Priorities */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                3. What should we investigate tomorrow?
              </h4>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                Concrete inquiry actions, interview leads, or verification tasks for the upcoming field session.
              </p>
            </div>
            <span className="text-xs font-semibold text-[var(--trace)]">
              {tomorrowPriorities.length} {tomorrowPriorities.length === 1 ? "priority" : "priorities"}
            </span>
          </div>

          {/* New Priority Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newPriorityInput}
              onChange={(e) => setNewPriorityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddPriority();
                }
              }}
              placeholder="e.g. Seek child perspectives; Interview kitchen staff; Compare delivery logs against meal serving times"
              className="flex-1 rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddPriority}
              disabled={!newPriorityInput.trim()}
              className="rounded bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-40 transition cursor-pointer"
            >
              + Add Priority
            </button>
          </div>

          {/* Priorities List */}
          {tomorrowPriorities.length > 0 && (
            <div className="space-y-2 pt-1">
              {tomorrowPriorities.map((priority, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs"
                >
                  <span className="font-mono text-xs font-bold text-[var(--trace)] w-6 text-center">
                    {index + 1}.
                  </span>
                  {editingPriorityIndex === index ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingPriorityText}
                        onChange={(e) => setEditingPriorityText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveEditPriority(index);
                          }
                        }}
                        className="flex-1 rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditPriority(index)}
                        className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPriorityIndex(null)}
                        className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-[var(--foreground)] font-medium">
                        {priority}
                      </span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleStartEditPriority(index)}
                          className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                        >
                          ✎ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePriority(index)}
                          className="text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Link Material to this Debrief */}
        <RecordLinkSelector
          sources={study.sources || []}
          evidence={study.evidence || []}
          selectedSourceIds={linkedSourceIds}
          selectedEvidenceIds={linkedEvidenceIds}
          debriefDate={date}
          onToggleSource={handleToggleSource}
          onToggleEvidence={handleToggleEvidence}
        />

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-[var(--accent)] px-5 py-2 text-xs font-semibold text-white shadow hover:bg-blue-600 disabled:opacity-50 transition cursor-pointer"
          >
            {isSaving ? "Saving Debrief..." : isEditing ? "Update Daily Debrief" : "Save Daily Debrief"}
          </button>
        </div>
      </form>
    </div>
  );
}
