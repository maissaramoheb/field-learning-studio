"use client";

import React, { useState } from "react";
import type { StudyQuestion, EvidenceEntryId } from "@/lib/types";

interface BulkActionBarProps {
  selectedIds: EvidenceEntryId[];
  questions: StudyQuestion[];
  isDemoCase: boolean;
  onAssignToQuestion: (questionId: string) => void;
  onAssignTheme: (theme: string) => void;
  onCreateFinding: (selectedIds: EvidenceEntryId[]) => void;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedIds,
  questions,
  isDemoCase,
  onAssignToQuestion,
  onAssignTheme,
  onCreateFinding,
  onClearSelection,
}: BulkActionBarProps) {
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [themeInput, setThemeInput] = useState("");
  const [showThemeInput, setShowThemeInput] = useState(false);

  if (selectedIds.length === 0) return null;

  const handleQuestionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const qId = e.target.value;
    if (qId) {
      onAssignToQuestion(qId);
      setSelectedQuestion("");
    }
  };

  const handleThemeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (themeInput.trim()) {
      onAssignTheme(themeInput.trim());
      setThemeInput("");
      setShowThemeInput(false);
    }
  };

  return (
    <aside
      aria-label="Bulk actions for selected evidence"
      className="sticky bottom-6 z-40 mx-auto mt-4 w-full max-w-4xl rounded-2xl border border-[var(--trace)]/50 bg-[rgba(11,22,37,0.95)] p-4 shadow-2xl backdrop-blur-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--trace)] text-xs font-bold text-slate-950">
            {selectedIds.length}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--trace)]">
              {selectedIds.length === 1 ? "1 Evidence Item Selected" : `${selectedIds.length} Evidence Items Selected`}
            </p>
            <p className="text-[11px] text-[var(--muted)]">
              Batch analytical actions for evidence organization
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Assign Question Dropdown */}
          {!isDemoCase && questions.length > 0 && (
            <select
              value={selectedQuestion}
              onChange={handleQuestionChange}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            >
              <option value="">Map to Study Question...</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.id}: {q.shortLabel || q.question.slice(0, 25)}
                </option>
              ))}
            </select>
          )}

          {/* Quick Theme Button / Input */}
          {!isDemoCase && (
            showThemeInput ? (
              <form onSubmit={handleThemeSubmit} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={themeInput}
                  onChange={(e) => setThemeInput(e.target.value)}
                  placeholder="Enter theme name..."
                  className="w-36 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-white"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setShowThemeInput(false)}
                  className="rounded-lg border border-[var(--border)] px-1.5 py-1 text-xs text-[var(--muted)]"
                >
                  ✕
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowThemeInput(true)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface)] transition"
              >
                Set Theme
              </button>
            )
          )}

          {/* Synthesize into Finding */}
          <button
            type="button"
            onClick={() => onCreateFinding(selectedIds)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition"
          >
            <span>✨</span> Synthesize into Finding
          </button>

          {/* Clear Selection */}
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition"
          >
            Clear
          </button>
        </div>
      </div>
    </aside>
  );
}
