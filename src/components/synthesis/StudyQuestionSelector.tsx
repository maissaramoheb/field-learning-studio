"use client";

import React from "react";
import type { StudyQuestion } from "@/lib/types";

interface StudyQuestionSelectorProps {
  questions: StudyQuestion[];
  selectedQuestionId: string | null; // null means all or unassigned
  activeFilter: "all" | "question" | "unassigned";
  unassignedCount: number;
  isDemoCase: boolean;
  onSelectFilter: (filter: "all" | "question" | "unassigned", questionId?: string) => void;
  onAddQuestion: () => void;
  onEditQuestion: (question: StudyQuestion) => void;
  onDeleteQuestion?: (questionId: string) => void;
}

export function StudyQuestionSelector({
  questions,
  selectedQuestionId,
  activeFilter,
  unassignedCount,
  isDemoCase,
  onSelectFilter,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
}: StudyQuestionSelectorProps) {
  const currentQuestion = questions.find((q) => q.id === selectedQuestionId);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
            Analytical Spine
          </span>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Study Questions & Analytical Focus
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Select a question to filter and compare validated evidence across sites and stakeholders.
          </p>
        </div>

        {!isDemoCase && (
          <button
            type="button"
            onClick={onAddQuestion}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition"
          >
            <span>+</span> Add Study Question
          </button>
        )}
      </div>

      {/* Question Selector Tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSelectFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeFilter === "all"
              ? "bg-[var(--trace)] text-slate-950 shadow-sm"
              : "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          All Questions ({questions.length})
        </button>

        {questions.map((q) => {
          const isSelected = activeFilter === "question" && selectedQuestionId === q.id;
          return (
            <button
              type="button"
              key={q.id}
              onClick={() => onSelectFilter("question", q.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                isSelected
                  ? "bg-[var(--trace)] text-slate-950 shadow-sm"
                  : "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="font-mono text-[11px] font-bold">{q.id}</span>
              <span>{q.shortLabel || q.question.slice(0, 30) + (q.question.length > 30 ? "…" : "")}</span>
              {q.criterion && (
                <span
                  className={`rounded px-1.5 py-0.2 text-[9px] uppercase ${
                    isSelected
                      ? "bg-slate-900/20 text-slate-950 font-bold"
                      : "bg-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  {q.criterion}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onSelectFilter("unassigned")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeFilter === "unassigned"
              ? "bg-amber-400 text-slate-950 shadow-sm"
              : "border border-amber-900/40 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40"
          }`}
        >
          <span>Unassigned Evidence</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
              activeFilter === "unassigned"
                ? "bg-amber-950 text-amber-200"
                : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {unassignedCount}
          </span>
        </button>
      </div>

      {/* Selected Question Detail Card */}
      {activeFilter === "question" && currentQuestion && (
        <div className="mt-4 rounded-lg border border-[var(--trace)]/30 bg-[var(--trace-wash)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[var(--trace)]">
                  {currentQuestion.id}
                </span>
                {currentQuestion.criterion && (
                  <span className="rounded border border-[var(--trace)]/40 bg-[var(--trace)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--trace)]">
                    Criterion: {currentQuestion.criterion}
                  </span>
                )}
                {currentQuestion.shortLabel && (
                  <span className="text-xs text-[var(--muted)]">
                    ({currentQuestion.shortLabel})
                  </span>
                )}
              </div>
              <h3 className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                {currentQuestion.question}
              </h3>
            </div>

            {!isDemoCase && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEditQuestion(currentQuestion)}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Edit Question
                </button>
                {onDeleteQuestion && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete question ${currentQuestion.id}? Evidence mappings to this question will be detached.`)) {
                        onDeleteQuestion(currentQuestion.id);
                      }
                    }}
                    className="rounded border border-red-500/30 bg-red-950/20 px-2.5 py-1 text-xs text-red-300 hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeFilter === "unassigned" && (
        <div className="mt-4 rounded-lg border border-amber-800/40 bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 text-amber-300">
            <span className="text-sm">⚠️</span>
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Validated evidence not yet linked to a study question
            </h3>
          </div>
          <p className="mt-1 text-xs text-amber-200/80">
            This is an analytical gap view. Select evidence below and use the bulk action bar or card assignment to map them to your analytical framework.
          </p>
        </div>
      )}
    </div>
  );
}
