"use client";

import React, { useState } from "react";
import type { PatternNote, StudyQuestion, EvidenceEntry, EvidenceEntryId } from "@/lib/types";
import { getNextPatternId } from "@/lib/idGenerator";

interface WorkingPatternsPanelProps {
  studyId: string;
  patterns: PatternNote[];
  questions: StudyQuestion[];
  validatedEvidence: EvidenceEntry[];
  currentQuestionId?: string | null;
  isDemoCase: boolean;
  onSavePattern: (pattern: PatternNote) => void;
  onDeletePattern: (patternId: string) => void;
  onPromoteToFinding: (pattern: PatternNote) => void;
  onInspectEvidence: (id: string) => void;
}

export function WorkingPatternsPanel({
  studyId,
  patterns,
  questions,
  validatedEvidence,
  currentQuestionId,
  isDemoCase,
  onSavePattern,
  onDeletePattern,
  onPromoteToFinding,
  onInspectEvidence,
}: WorkingPatternsPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [statement, setStatement] = useState("");
  const [questionId, setQuestionId] = useState(currentQuestionId || "");
  const [theme, setTheme] = useState("");
  const [contradictionNote, setContradictionNote] = useState("");
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<EvidenceEntryId[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filter patterns by current question if selected
  const displayedPatterns = currentQuestionId
    ? patterns.filter((p) => !p.questionId || p.questionId === currentQuestionId)
    : patterns;

  const handleToggleEvidence = (id: EvidenceEntryId) => {
    setSelectedEvidenceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) {
      setError("Pattern statement is required.");
      return;
    }

    const nextId = getNextPatternId(patterns.map((p) => p.id));
    const newPattern: PatternNote = {
      id: nextId,
      studyId,
      statement: statement.trim(),
      evidenceIds: selectedEvidenceIds,
      questionId: questionId.trim() || undefined,
      theme: theme.trim() || undefined,
      contradictionNote: contradictionNote.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onSavePattern(newPattern);
    setIsAdding(false);
    setStatement("");
    setTheme("");
    setContradictionNote("");
    setSelectedEvidenceIds([]);
    setError(null);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
              Sensemaking Space
            </span>
            <span className="rounded bg-purple-950/40 border border-purple-800/40 px-1.5 py-0.2 text-[9px] font-semibold text-purple-300">
              Working Notes · Not formal findings
            </span>
          </div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            Working Patterns & Synthesis Notes
          </h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Capture emerging multi-source observations without premature commitment to formal findings.
          </p>
        </div>

        {!isDemoCase && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface)] hover:border-[var(--trace)] transition"
          >
            <span>+</span> Record Working Pattern
          </button>
        )}
      </div>

      {/* Add Pattern Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="mt-4 rounded-lg border border-purple-900/40 bg-purple-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
              New Working Pattern
            </h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Cancel
            </button>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div>
            <label className="block text-[11px] font-bold uppercase text-[var(--muted-strong)]">
              Pattern Statement <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={2}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="e.g. Late meal distribution appears in teacher, parent and observation evidence across both sites."
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase text-[var(--muted-strong)]">
                Associated Study Question
              </label>
              <select
                value={questionId}
                onChange={(e) => setQuestionId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              >
                <option value="">None / Study-wide</option>
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.id}: {q.shortLabel || q.question.slice(0, 25)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-[var(--muted-strong)]">
                Analytical Theme
              </label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g. Logistics & Timing"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-[var(--muted-strong)]">
              Contradiction / Exception Note (Optional)
            </label>
            <input
              type="text"
              value={contradictionNote}
              onChange={(e) => setContradictionNote(e.target.value)}
              placeholder="e.g. Assiut school 2 reported timely delivery due to local vendor contract."
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            />
          </div>

          {/* Link Evidence */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[var(--muted-strong)] mb-1">
              Link Supporting Evidence ({selectedEvidenceIds.length} selected)
            </label>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 space-y-1">
              {validatedEvidence.map((ev) => (
                <label
                  key={ev.id}
                  className="flex items-center gap-2 rounded p-1 text-xs hover:bg-[var(--surface-muted)] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedEvidenceIds.includes(ev.id)}
                    onChange={() => handleToggleEvidence(ev.id)}
                    className="rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)]"
                  />
                  <span className="font-mono text-[10px] font-bold text-[var(--trace)]">{ev.id}</span>
                  <span className="truncate text-[11px] text-[var(--foreground)]">{ev.rawObservation || ev.rawEvidence}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-500"
            >
              Save Working Pattern
            </button>
          </div>
        </form>
      )}

      {/* Pattern Cards List */}
      <div className="mt-4 space-y-3">
        {displayedPatterns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--muted)]">
            No working patterns recorded yet. Use patterns to capture working hypotheses before formalizing them into findings.
          </div>
        ) : (
          displayedPatterns.map((pat) => (
            <div
              key={pat.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 transition hover:border-[var(--border-strong)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-purple-400">
                    {pat.id}
                  </span>
                  {pat.questionId && (
                    <span className="rounded bg-[var(--trace)]/15 border border-[var(--trace)]/30 px-1.5 py-0.5 font-mono text-[10px] text-[var(--trace)] font-bold">
                      {pat.questionId}
                    </span>
                  )}
                  {pat.theme && (
                    <span className="rounded bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                      {pat.theme}
                    </span>
                  )}
                </div>

                {!isDemoCase && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPromoteToFinding(pat)}
                      className="rounded bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[var(--accent-strong)] transition"
                    >
                      Promote to Draft Finding
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePattern(pat.id)}
                      className="text-[11px] text-[var(--muted)] hover:text-red-400"
                      aria-label="Delete pattern"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <p className="mt-2 text-xs font-medium leading-5 text-[var(--foreground)]">
                {pat.statement}
              </p>

              {pat.contradictionNote && (
                <p className="mt-1.5 rounded border border-amber-900/30 bg-amber-950/20 px-2 py-1 text-[11px] text-amber-300">
                  <span className="font-semibold">Contradiction:</span> {pat.contradictionNote}
                </p>
              )}

              {pat.evidenceIds.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-[var(--muted)]">Linked Evidence:</span>
                  {pat.evidenceIds.map((evId) => (
                    <button
                      type="button"
                      key={evId}
                      onClick={() => onInspectEvidence(evId)}
                      className="font-mono rounded bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.2 text-[var(--trace)] hover:underline"
                    >
                      {evId}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
