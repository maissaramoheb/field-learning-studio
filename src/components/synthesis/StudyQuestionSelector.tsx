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
  onManageInBlueprint?: () => void;
}

export function StudyQuestionSelector({
  questions,
  selectedQuestionId,
  activeFilter,
  unassignedCount,
  onSelectFilter,
  onManageInBlueprint,
}: StudyQuestionSelectorProps) {
  const currentQuestion = questions.find((q) => q.id === selectedQuestionId);
  const activeQuestions = questions.filter((q) => q.isActive !== false);
  const archivedQuestions = questions.filter((q) => q.isActive === false);

  // If currently selected question is archived, ensure it is visible in the tab bar
  const isSelectedQuestionArchived = currentQuestion?.isActive === false;

  return (
    <div className="fls-question-toolbar">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Study questions
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Select a question to filter and compare validated evidence across sites and stakeholders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onManageInBlueprint && (
            <button
              type="button"
              onClick={onManageInBlueprint}
              className="fls-button fls-button-quiet text-xs font-semibold"
              title="Manage questions, ordering, and inquiry scope in Study Blueprint"
            >
              Manage in Study Blueprint →
            </button>
          )}
        </div>
      </div>

      {/* Question Selector Tabs */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSelectFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeFilter === "all"
              ? "bg-[var(--trace)] text-slate-950 shadow-sm"
              : "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          All Active Questions ({activeQuestions.length})
        </button>

        {activeQuestions.map((q) => {
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
              {q.isPrimary && (
                <span className="rounded bg-[var(--trace-soft)] px-1.5 py-0.2 text-[9px] font-bold text-[var(--trace)]">
                  Primary
                </span>
              )}
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

        {/* If selected question is archived, show it distinctly */}
        {isSelectedQuestionArchived && currentQuestion && (
          <button
            type="button"
            onClick={() => onSelectFilter("question", currentQuestion.id)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold border border-amber-500/40 bg-amber-950/30 text-amber-200"
          >
            <span className="font-mono text-[11px] font-bold">{currentQuestion.id}</span>
            <span>{currentQuestion.shortLabel || currentQuestion.question.slice(0, 25) + "…"}</span>
            <span className="rounded bg-amber-500/30 px-1.5 py-0.2 text-[9px] font-bold uppercase text-amber-200">
              Archived
            </span>
          </button>
        )}

        {/* Other archived questions (if any) rendered in secondary/muted style */}
        {archivedQuestions.map((q) => {
          if (q.id === selectedQuestionId) return null; // already rendered above
          return (
            <button
              type="button"
              key={q.id}
              onClick={() => onSelectFilter("question", q.id)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs opacity-60 border border-dashed border-[var(--border)] text-[var(--muted)] hover:opacity-90"
              title="Archived question (preserved for historical lineage)"
            >
              <span className="font-mono text-[10px]">{q.id}</span>
              <span className="text-[11px] truncate max-w-[120px]">{q.shortLabel || q.question}</span>
              <span className="text-[9px] uppercase tracking-wider text-[var(--muted)]">Archived</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onSelectFilter("unassigned")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeFilter === "unassigned"
              ? "bg-[var(--warning)] text-slate-950 shadow-sm"
              : "border border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-text)] hover:opacity-80"
          }`}
        >
          <span>Unassigned Evidence</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
              activeFilter === "unassigned"
                ? "bg-black/20 text-slate-950"
                : "bg-[var(--warning-border)] text-[var(--warning-text)]"
            }`}
          >
            {unassignedCount}
          </span>
        </button>
      </div>

      {/* Selected Question Detail Card */}
      {activeFilter === "question" && currentQuestion && (
        <div className={`mt-4 rounded-lg border p-4 ${
          currentQuestion.isActive === false
            ? "border-amber-500/30 bg-amber-950/20"
            : "border-[var(--trace)]/30 bg-[var(--trace-wash)]"
        }`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-[var(--trace)]">
                  {currentQuestion.id}
                </span>
                {currentQuestion.isActive === false && (
                  <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">
                    Archived Inquiry · Preserved for Historical Lineage
                  </span>
                )}
                {currentQuestion.isPrimary && (
                  <span className="rounded bg-[var(--trace-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--trace)]">
                    Primary Question
                  </span>
                )}
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

            {onManageInBlueprint && (
              <button
                type="button"
                onClick={onManageInBlueprint}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Manage in Study Blueprint →
              </button>
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
