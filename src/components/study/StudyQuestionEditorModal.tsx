"use client";

import React, { useState } from "react";
import { WorkspaceDialog } from "@/components/WorkspaceDialog";
import type { StudyQuestion } from "@/lib/types";

interface StudyQuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: StudyQuestion) => Promise<void>;
  existingQuestions: StudyQuestion[];
  initialQuestion?: StudyQuestion | null;
}

export function StudyQuestionEditorModal({
  isOpen,
  onClose,
  onSave,
  existingQuestions,
  initialQuestion,
}: StudyQuestionEditorModalProps) {
  if (!isOpen) return null;

  return (
    <StudyQuestionEditorContent
      onClose={onClose}
      onSave={onSave}
      existingQuestions={existingQuestions}
      initialQuestion={initialQuestion}
    />
  );
}

function StudyQuestionEditorContent({
  onClose,
  onSave,
  existingQuestions,
  initialQuestion,
}: Omit<StudyQuestionEditorModalProps, "isOpen">) {
  const isEditing = !!initialQuestion;

  const defaultId = (() => {
    if (initialQuestion?.id) return initialQuestion.id;
    const count = existingQuestions.length + 1;
    return `RQ-${count}`;
  })();

  const [id, setId] = useState(defaultId);
  const [question, setQuestion] = useState(initialQuestion?.question || "");
  const [shortLabel, setShortLabel] = useState(initialQuestion?.shortLabel || "");
  const [criterion, setCriterion] = useState(initialQuestion?.criterion || "");
  const [isPrimary, setIsPrimary] = useState(initialQuestion?.isPrimary || false);
  const [subQuestionsText, setSubQuestionsText] = useState(
    (initialQuestion?.subQuestions || []).join("\n")
  );
  const [isActive, setIsActive] = useState(initialQuestion?.isActive ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setErrorMessage("Please enter the study question statement.");
      return;
    }

    const subQuestions = subQuestionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      const studyQuestion: StudyQuestion = {
        id: id.trim() || defaultId,
        question: trimmedQuestion,
        shortLabel: shortLabel.trim() || undefined,
        criterion: criterion.trim() || undefined,
        isPrimary,
        subQuestions: subQuestions.length > 0 ? subQuestions : undefined,
        isActive,
        createdAt: initialQuestion?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };

      await onSave(studyQuestion);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save study question.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <WorkspaceDialog labelledBy="question-modal-title" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
              Questions & Scope
            </span>
            <h3 id="question-modal-title" className="text-base font-bold text-[var(--foreground)]">
              {isEditing ? "Edit Study Question" : "Add Study Question"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-md bg-[var(--danger-surface)] border border-[var(--danger-border)] p-3 text-xs text-[var(--danger)]">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
              Question ID *
            </label>
            <input
              type="text"
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g. RQ-1"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
              Short Descriptor / Label
            </label>
            <input
              type="text"
              value={shortLabel}
              onChange={(e) => setShortLabel(e.target.value)}
              placeholder="e.g. Youth Participation & Safe Access"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Study Question Formulation *
          </label>
          <textarea
            rows={3}
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What exact inquiry question must field material and comparative synthesis answer?"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
              Evaluation Criterion / Domain
            </label>
            <input
              type="text"
              value={criterion}
              onChange={(e) => setCriterion(e.target.value)}
              placeholder="e.g. Effectiveness, Social Cohesion, Targeting Precision"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
            />
          </div>

          <div className="flex items-center gap-4 pt-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)]"
              />
              <span className="font-semibold">Primary Inquiry Question</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)]"
              />
              <span>Active in Scope</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Secondary / Sub-Questions (Optional, one per line)
          </label>
          <textarea
            rows={3}
            value={subQuestionsText}
            onChange={(e) => setSubQuestionsText(e.target.value)}
            placeholder="Specific sub-dimensions to examine under this question..."
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-[var(--trace)] px-4 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : isEditing ? "Update Question" : "Add Question"}
          </button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
