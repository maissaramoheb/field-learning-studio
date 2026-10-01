"use client";

import React, { useState } from "react";
import type {
  PatternNote,
  ReasoningType,
  StudyQuestion,
  FrameworkTheme,
  EvidenceEntryId,
} from "@/lib/types";
import { getNextPatternId } from "@/lib/idGenerator";

const REASONING_TYPES: Array<{
  value: ReasoningType;
  label: string;
  badgeClass: string;
  description: string;
}> = [
  {
    value: "pattern",
    label: "Recurring Pattern",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    description: "Consistent observation observed across multiple sources or sites",
  },
  {
    value: "tension",
    label: "Tension / Divergence",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    description: "Differential experience across stakeholder groups or contextual conditions",
  },
  {
    value: "contradiction",
    label: "Direct Contradiction",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    description: "Direct conflict between observations or between data and assumptions",
  },
  {
    value: "possible_explanation",
    label: "Possible Explanation",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    description: "Working hypothesis explaining observed patterns or divergences",
  },
  {
    value: "alternative_interpretation",
    label: "Alternative Interpretation",
    badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    description: "Plausible rival reading of the qualified evidence base",
  },
  {
    value: "evidence_gap",
    label: "Evidence Gap",
    badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    description: "Missing perspective, unvisited site, or unaddressed study question",
  },
  {
    value: "analyst_note",
    label: "Analyst Note",
    badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    description: "General analytical memo or methodological reflection",
  },
];

interface ReasoningWorkspaceProps {
  studyId: string;
  patternNotes: PatternNote[];
  questions: StudyQuestion[];
  frameworkThemes: FrameworkTheme[];
  selectedEvidenceIds: EvidenceEntryId[];
  isDemoCase: boolean;
  onSavePattern: (pattern: PatternNote) => void;
  onDeletePattern: (patternId: string) => void;
  onPromoteToFinding: (pattern: PatternNote) => void;
  onInspectEvidence: (id: string) => void;
  onClearEvidenceSelection: () => void;
}

export function ReasoningWorkspace({
  studyId,
  patternNotes,
  questions,
  frameworkThemes,
  selectedEvidenceIds,
  isDemoCase,
  onSavePattern,
  onDeletePattern,
  onPromoteToFinding,
  onInspectEvidence,
  onClearEvidenceSelection,
}: ReasoningWorkspaceProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [statement, setStatement] = useState("");
  const [explanation, setExplanation] = useState("");
  const [reasoningType, setReasoningType] = useState<ReasoningType>("pattern");
  const [questionId, setQuestionId] = useState("");
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [contradictionNote, setContradictionNote] = useState("");
  const [linkedEvidenceIds, setLinkedEvidenceIds] = useState<EvidenceEntryId[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Active filter for viewing notes
  const [filterReasoningType, setFilterReasoningType] = useState<string>("all");
  const [filterQuestionId, setFilterQuestionId] = useState<string>("all");

  const startAdding = () => {
    setIsAdding(true);
    setStatement("");
    setExplanation("");
    setReasoningType("pattern");
    setQuestionId("");
    setSelectedThemeIds([]);
    setContradictionNote("");
    setLinkedEvidenceIds([...selectedEvidenceIds]);
    setError(null);
  };

  const handleToggleTheme = (themeId: string) => {
    setSelectedThemeIds((prev) =>
      prev.includes(themeId) ? prev.filter((id) => id !== themeId) : [...prev, themeId]
    );
  };

  const handleRemoveLinkedEvidence = (id: EvidenceEntryId) => {
    setLinkedEvidenceIds((prev) => prev.filter((eId) => eId !== id));
  };

  const handleAddSelectedEvidenceToForm = () => {
    const combined = Array.from(new Set([...linkedEvidenceIds, ...selectedEvidenceIds]));
    setLinkedEvidenceIds(combined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) {
      setError("Note statement or claim summary is required.");
      return;
    }

    const nextId = getNextPatternId(patternNotes.map((p) => p.id));
    const now = Date.now();

    const newPattern: PatternNote = {
      id: nextId,
      studyId,
      statement: statement.trim(),
      reasoningType,
      explanation: explanation.trim() || undefined,
      evidenceIds: linkedEvidenceIds,
      questionId: questionId.trim() || undefined,
      frameworkThemeIds: selectedThemeIds.length > 0 ? selectedThemeIds : undefined,
      contradictionNote: contradictionNote.trim() || undefined,
      audit: {
        provenance: "human",
        createdActor: { kind: "human", displayName: "Analyst" },
        createdAt: now,
        updatedActor: { kind: "human", displayName: "Analyst" },
        updatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    onSavePattern(newPattern);
    setIsAdding(false);
    setStatement("");
    setExplanation("");
    setContradictionNote("");
    setLinkedEvidenceIds([]);
    setError(null);
  };

  const filteredNotes = patternNotes.filter((note) => {
    if (filterReasoningType !== "all" && (note.reasoningType || "pattern") !== filterReasoningType) {
      return false;
    }
    if (filterQuestionId !== "all" && note.questionId !== filterQuestionId) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-muted)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                Sensemaking &amp; Reasoning Canvas
              </span>
              <span className="rounded bg-purple-950/40 border border-purple-800/40 px-1.5 py-0.2 text-[9px] font-semibold text-purple-300">
                Working Notes · Not formal findings
              </span>
            </div>
            <h3 className="text-sm font-semibold text-[var(--foreground)] mt-0.5">
              Synthesis Notes &amp; Patterns
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Document patterns, tensions, explanations, and evidence gaps before promoting to formal findings.
            </p>
          </div>

          {!isDemoCase && !isAdding && (
            <button
              type="button"
              onClick={startAdding}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition cursor-pointer"
            >
              + New Reasoning Note
            </button>
          )}
        </div>

        {/* Selected Evidence Staging Banner */}
        {selectedEvidenceIds.length > 0 && !isAdding && (
          <div className="mt-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-2.5 flex items-center justify-between gap-2 text-xs">
            <span className="text-[var(--foreground)]">
              <strong>{selectedEvidenceIds.length}</strong> evidence items staged in Explorer.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startAdding}
                className="font-semibold text-[var(--accent)] hover:underline"
              >
                Synthesize into Note →
              </button>
              <button
                type="button"
                onClick={onClearEvidenceSelection}
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <select
            aria-label="Reasoning type filter"
            value={filterReasoningType}
            onChange={(e) => setFilterReasoningType(e.target.value)}
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--foreground)]"
          >
            <option value="all">All Reasoning Types ({patternNotes.length})</option>
            {REASONING_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Reasoning study question filter"
            value={filterQuestionId}
            onChange={(e) => setFilterQuestionId(e.target.value)}
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--foreground)]"
          >
            <option value="all">All Study Questions</option>
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.shortLabel || q.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Body: Form or Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isAdding ? (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-[var(--accent)]/40 bg-[var(--surface-subtle)] p-4 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="font-semibold text-sm text-[var(--foreground)]">
                Author Synthesis / Reasoning Note
              </span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ✕ Cancel
              </button>
            </div>

            {error && (
              <div className="rounded bg-rose-500/10 border border-rose-500/30 p-2 text-rose-300">
                {error}
              </div>
            )}

            {/* Reasoning Type Selection */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                Reasoning Mode / Cognitive Classification *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {REASONING_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setReasoningType(t.value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition cursor-pointer ${
                      reasoningType === t.value
                        ? `${t.badgeClass} ring-1 ring-[var(--accent)] font-semibold`
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <div className="font-medium">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Statement */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                Claim / Pattern Statement *
              </label>
              <textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="What pattern, tension, explanation, or evidence gap do you observe across qualified sources?"
                rows={3}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Detailed Explanation */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                Analytical Explanation &amp; Rationale
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Explain the causal mechanics, contextual constraints, or reasons for this observation..."
                rows={2}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Question & Themes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                  Study Question Focus
                </label>
                <select
                  aria-label="Study Question Focus"
                  value={questionId}
                  onChange={(e) => setQuestionId(e.target.value)}
                  className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--foreground)]"
                >
                  <option value="">(None / Cross-cutting)</option>
                  {questions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.shortLabel || q.id}: {q.question.slice(0, 35)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                  Framework Themes
                </label>
                <div className="flex flex-wrap gap-1">
                  {frameworkThemes.map((t) => {
                    const active = selectedThemeIds.includes(t.id);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => handleToggleTheme(t.id)}
                        className={`rounded px-2 py-0.5 text-[10px] border cursor-pointer ${
                          active
                            ? "bg-[var(--accent)] text-white border-[var(--accent)] font-semibold"
                            : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Contradiction / Divergence Note */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                Contradiction or Limiting Condition (if any)
              </label>
              <input
                type="text"
                value={contradictionNote}
                onChange={(e) => setContradictionNote(e.target.value)}
                placeholder="Note any negative cases, contradictory observations, or exceptions..."
                className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)]"
              />
            </div>

            {/* Linked Evidence */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-[var(--muted)]">
                  Linked Evidence Items ({linkedEvidenceIds.length})
                </label>
                {selectedEvidenceIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddSelectedEvidenceToForm}
                    className="text-[10px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    + Add {selectedEvidenceIds.length} staged from Explorer
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded border border-[var(--border)] bg-[var(--surface)]">
                {linkedEvidenceIds.length === 0 ? (
                  <span className="text-[11px] text-[var(--muted)] italic">
                    Select evidence items in Explorer to link supporting material.
                  </span>
                ) : (
                  linkedEvidenceIds.map((evId) => (
                    <span
                      key={evId}
                      className="inline-flex items-center gap-1 rounded bg-[var(--surface-muted)] border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--trace)]"
                    >
                      {evId}
                      <button
                        type="button"
                        onClick={() => handleRemoveLinkedEvidence(evId)}
                        className="text-[var(--muted)] hover:text-rose-400"
                        aria-label={`Remove ${evId}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface)] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition cursor-pointer"
              >
                Save Reasoning Note
              </button>
            </div>
          </form>
        ) : filteredNotes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--muted)]">
            No reasoning notes recorded yet. Explore qualified field material on the left and synthesize recurring patterns, tensions, or contradictions.
          </div>
        ) : (
          filteredNotes.map((note) => {
            const typeConfig = REASONING_TYPES.find(
              (t) => t.value === (note.reasoningType || "pattern")
            ) || REASONING_TYPES[0];

            return (
              <div
                key={note.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--border-strong)] space-y-2.5 text-xs"
              >
                {/* Top Bar: Badges + Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-400">
                      {note.id}
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${typeConfig.badgeClass}`}
                    >
                      {typeConfig.label}
                    </span>
                    {note.questionId && (
                      <span className="rounded bg-[var(--trace)]/10 border border-[var(--trace)]/20 px-1.5 py-0.5 font-mono text-[10px] text-[var(--trace)] font-bold">
                        {note.questionId}
                      </span>
                    )}
                  </div>

                  {!isDemoCase && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onPromoteToFinding(note)}
                        className="rounded bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[var(--accent-strong)] transition cursor-pointer"
                      >
                        Promote to Candidate Finding →
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePattern(note.id)}
                        className="text-[11px] text-[var(--muted)] hover:text-rose-400 p-1 cursor-pointer"
                        aria-label="Delete note"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Statement */}
                <p className="text-sm font-medium leading-relaxed text-[var(--foreground)]">
                  {note.statement}
                </p>

                {/* Explanation */}
                {note.explanation && (
                  <p className="text-[11.5px] leading-5 text-[var(--muted)]">
                    {note.explanation}
                  </p>
                )}

                {/* Contradiction note */}
                {note.contradictionNote && (
                  <div className="rounded border border-amber-900/30 bg-amber-950/20 px-2.5 py-1.5 text-[11px] text-amber-300">
                    <span className="font-semibold">Contradiction / Exception: </span>
                    {note.contradictionNote}
                  </div>
                )}

                {/* Linked Evidence Base */}
                {note.evidenceIds && note.evidenceIds.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[var(--border)] text-[10px]">
                    <span className="text-[var(--muted)]">Supporting Material:</span>
                    {note.evidenceIds.map((evId) => (
                      <button
                        type="button"
                        key={evId}
                        onClick={() => onInspectEvidence(evId)}
                        className="font-mono rounded bg-[var(--surface-muted)] border border-[var(--border)] px-1.5 py-0.2 text-[var(--trace)] hover:underline cursor-pointer"
                      >
                        {evId}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
