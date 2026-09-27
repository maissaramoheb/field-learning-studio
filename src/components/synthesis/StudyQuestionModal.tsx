"use client";

import React, { useState } from "react";
import type { StudyQuestion } from "@/lib/types";
import { getNextQuestionId } from "@/lib/idGenerator";

interface StudyQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: StudyQuestion) => void;
  existingQuestions: StudyQuestion[];
  initialQuestion?: StudyQuestion | null;
}

const EVALUATION_CRITERIA = [
  "Relevance",
  "Effectiveness",
  "Efficiency",
  "Equity / Inclusion",
  "Impact",
  "Sustainability",
  "Coherence",
  "Contextual / Process",
];

export function StudyQuestionModal({
  isOpen,
  onClose,
  onSave,
  existingQuestions,
  initialQuestion,
}: StudyQuestionModalProps) {
  if (!isOpen) return null;

  return (
    <StudyQuestionModalContent
      key={initialQuestion?.id || "new"}
      onClose={onClose}
      onSave={onSave}
      existingQuestions={existingQuestions}
      initialQuestion={initialQuestion}
    />
  );
}

function StudyQuestionModalContent({
  onClose,
  onSave,
  existingQuestions,
  initialQuestion,
}: Omit<StudyQuestionModalProps, "isOpen">) {
  const isPredefined =
    initialQuestion?.criterion &&
    EVALUATION_CRITERIA.includes(initialQuestion.criterion);
  const initialMode = !initialQuestion?.criterion
    ? ""
    : isPredefined
    ? initialQuestion.criterion
    : "custom";

  const [questionText, setQuestionText] = useState(
    initialQuestion ? initialQuestion.question : ""
  );
  const [shortLabel, setShortLabel] = useState(
    initialQuestion?.shortLabel || ""
  );
  const [selectedMode, setSelectedMode] = useState<string>(initialMode);
  const [customCriterion, setCustomCriterion] = useState<string>(
    !isPredefined && initialQuestion?.criterion ? initialQuestion.criterion : ""
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = questionText.trim();
    if (!trimmed) {
      setError("Study question text is required.");
      return;
    }

    const nextId =
      initialQuestion?.id ||
      getNextQuestionId(existingQuestions.map((q) => q.id));

    const resolvedCriterion =
      selectedMode === "custom"
        ? customCriterion.trim() || undefined
        : selectedMode.trim() || undefined;

    const updated: StudyQuestion = {
      id: nextId,
      question: trimmed,
      shortLabel: shortLabel.trim() || undefined,
      criterion: resolvedCriterion,
      isActive: initialQuestion ? initialQuestion.isActive : true,
      createdAt: initialQuestion?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(updated);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <h3
              id="question-modal-title"
              className="text-lg font-semibold text-[var(--foreground)]"
            >
              {initialQuestion ? "Edit Study Question" : "Add Study Question"}
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Defines the analytical spine connecting validated evidence to findings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
              Question Text <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="e.g. What factors affect children's actual access to school meals?"
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                Short Label / Theme
              </label>
              <input
                type="text"
                value={shortLabel}
                onChange={(e) => setShortLabel(e.target.value)}
                placeholder="e.g. Meal Access Factors"
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                Criterion / Dimension
              </label>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              >
                <option value="">None / Blank</option>
                <optgroup label="Standard Evaluation Criteria">
                  {EVALUATION_CRITERIA.map((crit) => (
                    <option key={crit} value={crit}>
                      {crit}
                    </option>
                  ))}
                </optgroup>
                <option value="custom">Custom Criterion / Dimension...</option>
              </select>

              {selectedMode === "custom" && (
                <input
                  type="text"
                  value={customCriterion}
                  onChange={(e) => setCustomCriterion(e.target.value)}
                  placeholder="e.g. Operational Readiness, Governance, Service Quality"
                  className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
                  autoFocus
                />
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)]"
            >
              {initialQuestion ? "Update Question" : "Save Question"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
