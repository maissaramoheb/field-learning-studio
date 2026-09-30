"use client";

import React, { useState } from "react";
import type { FieldStudy, StudyMeta, StudyQuestion, StudyScopeConfig } from "@/lib/types";
import { StudyQuestionEditorModal } from "./StudyQuestionEditorModal";

interface StudyQuestionsScopeViewProps {
  study: FieldStudy | StudyMeta;
  onRefreshStudy?: () => void;
  onSaveQuestion: (question: StudyQuestion) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
  onReorderQuestions?: (questionIds: string[]) => Promise<void>;
  onUpdateScope?: (updatedScope: StudyScopeConfig) => Promise<void>;
}

export function StudyQuestionsScopeView({
  study,
  onSaveQuestion,
  onDeleteQuestion,
  onReorderQuestions,
  onUpdateScope,
}: StudyQuestionsScopeViewProps) {
  const isDemo = study.isDemoCase;
  const questions = (study.questions || []).slice().sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<StudyQuestion | null>(null);

  // Scope state
  const [isEditingScope, setIsEditingScope] = useState(false);
  const [scopeForm, setScopeForm] = useState({
    scopeStatement: study.scope?.scopeStatement || "",
    inScopeText: (study.scope?.inScope || []).join("\n"),
    outOfScopeText: (study.scope?.outOfScope || []).join("\n"),
    assumptionsText: (study.scope?.assumptions || []).join("\n"),
    constraintsText: (study.scope?.constraints || []).join("\n"),
    targetSitesText: (study.scope?.targetSites || []).join(", "),
    targetStakeholdersText: (study.scope?.targetStakeholderGroups || []).join(", "),
    isSingleSite: study.scope?.isSingleSiteStudy ?? false,
  });
  const [isSavingScope, setIsSavingScope] = useState(false);
  const [scopeSuccess, setScopeSuccess] = useState(false);

  const handleSaveScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateScope || isDemo) return;

    try {
      setIsSavingScope(true);
      const sites = scopeForm.targetSitesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const stakeholders = scopeForm.targetStakeholdersText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const inScope = scopeForm.inScopeText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const outOfScope = scopeForm.outOfScopeText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const assumptions = scopeForm.assumptionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const constraints = scopeForm.constraintsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const updatedScope: StudyScopeConfig = {
        ...study.scope,
        targetSites: sites.length > 0 ? sites : ["Primary Site"],
        isSingleSiteStudy: scopeForm.isSingleSite,
        targetStakeholderGroups: stakeholders.length > 0 ? stakeholders : ["Community Members"],
        scopeStatement: scopeForm.scopeStatement.trim() || undefined,
        inScope: inScope.length > 0 ? inScope : undefined,
        outOfScope: outOfScope.length > 0 ? outOfScope : undefined,
        assumptions: assumptions.length > 0 ? assumptions : undefined,
        constraints: constraints.length > 0 ? constraints : undefined,
      };

      await onUpdateScope(updatedScope);
      setIsEditingScope(false);
      setScopeSuccess(true);
      setTimeout(() => setScopeSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update scope:", err);
    } finally {
      setIsSavingScope(false);
    }
  };

  const handleMoveQuestion = async (index: number, direction: "up" | "down") => {
    if (!onReorderQuestions || isDemo) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const newOrder = [...questions];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    await onReorderQuestions(newOrder.map((q) => q.id));
  };

  return (
    <div className="fls-study-questions-container space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--trace)]">
            Step 1 · DEFINE · Sub-View 2
          </span>
          <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
            Study Questions & Operational Scope
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Canonical definition of what field material must answer and the explicit boundaries of this inquiry.
          </p>
        </div>

        {!isDemo && (
          <button
            type="button"
            onClick={() => {
              setEditingQuestion(null);
              setIsQuestionModalOpen(true);
            }}
            className="rounded bg-[var(--trace)] px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
          >
            + Add Study Question
          </button>
        )}
      </div>

      {/* PART 1: STUDY QUESTIONS LEDGER */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)]">
              Core Study Questions ({questions.length})
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Primary and secondary questions that structure evidence synthesis in the Analysis workspace.
            </p>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-8 text-center">
            <span className="text-2xl" aria-hidden="true">
              ❓
            </span>
            <h4 className="mt-2 text-sm font-bold text-[var(--foreground)]">
              No Study Questions yet
            </h4>
            <p className="mx-auto mt-1 max-w-md text-xs text-[var(--muted)] leading-relaxed">
              Study Questions define what evidence collection and analysis are intended to answer. Formulate at least one primary question to establish inquiry focus.
            </p>
            {!isDemo && (
              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null);
                  setIsQuestionModalOpen(true);
                }}
                className="mt-4 inline-flex items-center rounded bg-[var(--trace)] px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90"
              >
                + Add First Study Question
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className={`rounded-xl border p-4 transition-all duration-150 ${
                  q.isActive === false
                    ? "border-[var(--border)] bg-[var(--surface-muted)] opacity-60"
                    : q.isPrimary
                    ? "border-[var(--trace)] bg-[var(--surface)] shadow-sm"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-mono font-bold text-[var(--trace)] border border-[var(--border)]">
                        {q.id}
                      </span>
                      {q.isPrimary && (
                        <span className="rounded bg-[var(--trace-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
                          Primary Question
                        </span>
                      )}
                      {q.criterion && (
                        <span className="rounded bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)] border border-[var(--border)]">
                          {q.criterion}
                        </span>
                      )}
                      {q.isActive === false && (
                        <span className="rounded bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                          Archived / Inactive
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-[var(--foreground)] leading-snug">
                      {q.question}
                    </h4>

                    {q.shortLabel && (
                      <p className="text-xs text-[var(--muted)] font-medium">
                        Focus: {q.shortLabel}
                      </p>
                    )}

                    {q.subQuestions && q.subQuestions.length > 0 && (
                      <div className="mt-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-2.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                          Sub-Questions ({q.subQuestions.length})
                        </span>
                        <ul className="space-y-1">
                          {q.subQuestions.map((sub, sIdx) => (
                            <li key={sIdx} className="text-xs text-[var(--foreground)] flex items-start gap-1.5">
                              <span className="text-[var(--trace)] text-[10px] font-bold select-none">•</span>
                              <span>{sub}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {!isDemo && (
                    <div className="flex items-center gap-1 self-start">
                      {onReorderQuestions && (
                        <>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveQuestion(idx, "up")}
                            title="Move Question Up"
                            className="rounded p-1 text-xs text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={idx === questions.length - 1}
                            onClick={() => handleMoveQuestion(idx, "down")}
                            title="Move Question Down"
                            className="rounded p-1 text-xs text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:opacity-30"
                          >
                            ↓
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuestion(q);
                          setIsQuestionModalOpen(true);
                        }}
                        className="rounded px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)] border border-[var(--border)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${q.id}"? Evidence links to this question will be unassigned.`)) {
                            onDeleteQuestion(q.id);
                          }
                        }}
                        className="rounded p-1 text-xs text-[var(--danger)] hover:bg-[var(--danger-surface)]"
                        title="Delete Question"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* PART 2: OPERATIONAL SCOPE & BOUNDARIES */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)]">
              Operational Scope & Boundary Definitions
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Explicit scope statements, target sites, stakeholder groups, assumptions, and out-of-scope boundaries.
            </p>
          </div>

          {!isDemo && (
            <div>
              {scopeSuccess && (
                <span className="text-xs font-semibold text-[var(--success)] mr-3">
                  ✓ Scope updated
                </span>
              )}
              {isEditingScope ? (
                <div className="inline-flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingScope(false)}
                    disabled={isSavingScope}
                    className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveScope}
                    disabled={isSavingScope}
                    className="rounded bg-[var(--trace)] px-3.5 py-1 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {isSavingScope ? "Saving..." : "Save Scope"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingScope(true)}
                  className="rounded border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                >
                  ✎ Edit Scope Boundaries
                </button>
              )}
            </div>
          )}
        </div>

        {isEditingScope && !isDemo ? (
          <form onSubmit={handleSaveScope} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                Scope Statement
              </label>
              <textarea
                rows={2}
                value={scopeForm.scopeStatement}
                onChange={(e) => setScopeForm({ ...scopeForm, scopeStatement: e.target.value })}
                placeholder="High-level definition of the study boundaries, interventions, and cohorts..."
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Target Field Sites / Locations (comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  value={scopeForm.targetSitesText}
                  onChange={(e) => setScopeForm({ ...scopeForm, targetSitesText: e.target.value })}
                  placeholder="e.g. Al Noor District, River East, North Ridge"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Target Stakeholder Groups (comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  value={scopeForm.targetStakeholdersText}
                  onChange={(e) => setScopeForm({ ...scopeForm, targetStakeholdersText: e.target.value })}
                  placeholder="e.g. Youth participants, Women representatives, Municipal officials"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  In-Scope Activities & Interventions (one per line)
                </label>
                <textarea
                  rows={3}
                  value={scopeForm.inScopeText}
                  onChange={(e) => setScopeForm({ ...scopeForm, inScopeText: e.target.value })}
                  placeholder="Specific interventions, facilities, or groups explicitly covered..."
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Out-of-Scope Boundaries (one per line)
                </label>
                <textarea
                  rows={3}
                  value={scopeForm.outOfScopeText}
                  onChange={(e) => setScopeForm({ ...scopeForm, outOfScopeText: e.target.value })}
                  placeholder="Explicit exclusions to prevent scope creep..."
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Operational Assumptions (one per line)
                </label>
                <textarea
                  rows={2}
                  value={scopeForm.assumptionsText}
                  onChange={(e) => setScopeForm({ ...scopeForm, assumptionsText: e.target.value })}
                  placeholder="Underlying premises assumed true for fieldwork..."
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Operational Constraints (one per line)
                </label>
                <textarea
                  rows={2}
                  value={scopeForm.constraintsText}
                  onChange={(e) => setScopeForm({ ...scopeForm, constraintsText: e.target.value })}
                  placeholder="Security, mobility, seasonal, or linguistic limitations..."
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={scopeForm.isSingleSite}
                  onChange={(e) => setScopeForm({ ...scopeForm, isSingleSite: e.target.checked })}
                  className="rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)]"
                />
                <span>Single-Site Evaluation (Adjusts multi-site triangulation requirements accordingly)</span>
              </label>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {study.scope?.scopeStatement && (
              <div className="rounded-lg bg-[var(--surface-muted)] p-3 text-xs text-[var(--foreground)]">
                <span className="font-bold text-[var(--muted)] uppercase text-[10px] block mb-1">
                  Scope Boundary Statement
                </span>
                {study.scope.scopeStatement}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Target Sites */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Target Field Sites ({study.scope?.targetSites?.length || 0})
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(study.scope?.targetSites || []).map((site, sIdx) => (
                    <span
                      key={sIdx}
                      className="rounded bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] border border-[var(--border)]"
                    >
                      📍 {site}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stakeholders */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Target Stakeholder Groups ({study.scope?.targetStakeholderGroups?.length || 0})
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(study.scope?.targetStakeholderGroups || []).map((stk, sIdx) => (
                    <span
                      key={sIdx}
                      className="rounded bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] border border-[var(--border)]"
                    >
                      👥 {stk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* In-Scope vs Out-of-Scope Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="rounded-lg border border-[var(--success-border)] bg-[var(--success-surface)] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--success)] block mb-1.5">
                  ✓ Explicitly In-Scope
                </span>
                {study.scope?.inScope && study.scope.inScope.length > 0 ? (
                  <ul className="space-y-1 text-xs text-[var(--foreground)]">
                    {study.scope.inScope.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[var(--success)] font-bold select-none">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--muted)]">General program components as described in Brief.</p>
                )}
              </div>

              <div className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-surface)] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--danger)] block mb-1.5">
                  ✕ Explicitly Out-of-Scope (Boundaries)
                </span>
                {study.scope?.outOfScope && study.scope.outOfScope.length > 0 ? (
                  <ul className="space-y-1 text-xs text-[var(--foreground)]">
                    {study.scope.outOfScope.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[var(--danger)] font-bold select-none">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--muted)]">No formal out-of-scope boundaries recorded.</p>
                )}
              </div>
            </div>

            {/* Assumptions & Constraints */}
            {(study.scope?.assumptions?.length || study.scope?.constraints?.length) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {study.scope?.assumptions && study.scope.assumptions.length > 0 && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
                      Operational Assumptions
                    </span>
                    <ul className="space-y-1 text-xs text-[var(--foreground)]">
                      {study.scope.assumptions.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-[var(--muted)] select-none">↳</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {study.scope?.constraints && study.scope.constraints.length > 0 && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
                      Field Constraints & Caveats
                    </span>
                    <ul className="space-y-1 text-xs text-[var(--foreground)]">
                      {study.scope.constraints.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-[var(--muted)] select-none">↳</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Editor Modal */}
      {isQuestionModalOpen && (
        <StudyQuestionEditorModal
          isOpen={isQuestionModalOpen}
          onClose={() => {
            setIsQuestionModalOpen(false);
            setEditingQuestion(null);
          }}
          onSave={async (q) => {
            await onSaveQuestion(q);
            setIsQuestionModalOpen(false);
            setEditingQuestion(null);
          }}
          existingQuestions={questions}
          initialQuestion={editingQuestion}
        />
      )}
    </div>
  );
}
