"use client";

import React, { useState } from "react";
import type {
  LessonLearned,
  GoodPractice,
  Finding,
} from "@/lib/types";
import { getNextLessonId, getNextGoodPracticeId } from "@/lib/idGenerator";

interface OptionalOutputsModalProps {
  isOpen: boolean;
  mode: "lesson" | "goodPractice";
  onClose: () => void;
  onSaveLesson: (lesson: LessonLearned) => void;
  onSaveGoodPractice: (practice: GoodPractice) => void;
  existingLessons: LessonLearned[];
  existingGoodPractices: GoodPractice[];
  linkedFinding: Finding;
}

export function OptionalOutputsModal(props: OptionalOutputsModalProps) {
  if (!props.isOpen) return null;

  return (
    <OptionalOutputsModalContent
      key={`${props.mode}-${props.linkedFinding.id}`}
      {...props}
    />
  );
}

function OptionalOutputsModalContent({
  mode,
  onClose,
  onSaveLesson,
  onSaveGoodPractice,
  existingLessons,
  existingGoodPractices,
  linkedFinding,
}: Omit<OptionalOutputsModalProps, "isOpen">) {
  // Lesson fields
  const [lessonStatement, setLessonStatement] = useState(
    mode === "lesson" ? linkedFinding.statement : ""
  );
  const [whatWorkedOrDidNotWork, setWhatWorkedOrDidNotWork] = useState("");
  const [whyItHappened, setWhyItHappened] = useState(
    mode === "lesson" ? linkedFinding.explanation : ""
  );
  const [conditionsRequired, setConditionsRequired] = useState("");
  const [transferability, setTransferability] = useState("Applicable across similar contexts");

  // Good Practice fields
  const [gpTitle, setGpTitle] = useState(
    mode === "goodPractice" ? `Practice: ${linkedFinding.statement.slice(0, 50)}` : ""
  );
  const [gpDescription, setGpDescription] = useState(
    mode === "goodPractice" ? linkedFinding.explanation : ""
  );
  const [whyItWorked, setWhyItWorked] = useState("");
  const [conditionsForReplication, setConditionsForReplication] = useState("");
  const [risksLimits, setRisksLimits] = useState("Requires dedicated supervision and resourcing");
  const [recommendedUse, setRecommendedUse] = useState("Recommended for phased expansion");

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "lesson") {
      if (!lessonStatement.trim()) {
        setError("Lesson statement is required.");
        return;
      }
      const nextId = getNextLessonId(existingLessons.map((l) => l.id));
      const newLesson: LessonLearned = {
        id: nextId,
        studyId: linkedFinding.studyId,
        statement: lessonStatement.trim(),
        whatWorkedOrDidNotWork: whatWorkedOrDidNotWork.trim(),
        whyItHappened: whyItHappened.trim(),
        conditionsRequired: conditionsRequired.trim(),
        evidenceBase: linkedFinding.supportingEvidenceIds || [],
        transferability: transferability.trim(),
        validationStatus: "Draft",
        revision: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onSaveLesson(newLesson);
    } else {
      if (!gpTitle.trim() || !gpDescription.trim()) {
        setError("Title and description are required.");
        return;
      }
      const nextId = getNextGoodPracticeId(existingGoodPractices.map((g) => g.id));
      const newPractice: GoodPractice = {
        id: nextId,
        studyId: linkedFinding.studyId,
        title: gpTitle.trim(),
        description: gpDescription.trim(),
        whyItWorked: whyItWorked.trim(),
        evidenceBase: linkedFinding.supportingEvidenceIds || [],
        conditionsForReplication: conditionsForReplication.trim(),
        risksLimits: risksLimits.trim(),
        recommendedUse: recommendedUse.trim(),
        validationStatus: "Draft",
        revision: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onSaveGoodPractice(newPractice);
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="optional-modal-title"
    >
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Optional Downstream Learning
              </span>
              <span className="rounded bg-slate-500/10 border border-slate-500/30 px-1.5 py-0.2 text-[9px] font-semibold text-[var(--muted)]">
                Draft · Linked to {linkedFinding.id}
              </span>
            </div>
            <h3 id="optional-modal-title" className="text-lg font-semibold text-[var(--foreground)]">
              {mode === "lesson" ? "Record Lesson Learned" : "Document Good Practice"}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Optional downstream product anchored in validated finding {linkedFinding.id}.
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

          {mode === "lesson" ? (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                  Lesson Statement <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={lessonStatement}
                  onChange={(e) => setLessonStatement(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                    What Worked or Did Not Work
                  </label>
                  <textarea
                    rows={2}
                    value={whatWorkedOrDidNotWork}
                    onChange={(e) => setWhatWorkedOrDidNotWork(e.target.value)}
                    placeholder="Specify implementation dynamics..."
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                    Why It Happened
                  </label>
                  <textarea
                    rows={2}
                    value={whyItHappened}
                    onChange={(e) => setWhyItHappened(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                    Conditions Required
                  </label>
                  <input
                    type="text"
                    value={conditionsRequired}
                    onChange={(e) => setConditionsRequired(e.target.value)}
                    placeholder="e.g. Dedicated focal point"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                    Transferability
                  </label>
                  <input
                    type="text"
                    value={transferability}
                    onChange={(e) => setTransferability(e.target.value)}
                    placeholder="e.g. Applicable across rural sites"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                  Good Practice Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={gpTitle}
                  onChange={(e) => setGpTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={gpDescription}
                  onChange={(e) => setGpDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                    Why It Worked
                  </label>
                  <textarea
                    rows={2}
                    value={whyItWorked}
                    onChange={(e) => setWhyItWorked(e.target.value)}
                    placeholder="Success factors..."
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                    Conditions for Replication
                  </label>
                  <textarea
                    rows={2}
                    value={conditionsForReplication}
                    onChange={(e) => setConditionsForReplication(e.target.value)}
                    placeholder="Prerequisites..."
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                    Risks / Limitations
                  </label>
                  <input
                    type="text"
                    value={risksLimits}
                    onChange={(e) => setRisksLimits(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                    Recommended Use
                  </label>
                  <input
                    type="text"
                    value={recommendedUse}
                    onChange={(e) => setRecommendedUse(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-4">
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
              {mode === "lesson" ? "Save as Draft Lesson" : "Save as Draft Good Practice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
