"use client";

import React, { useState, useMemo } from "react";
import type {
  FieldStudy,
  StudyQuestion,
  PatternNote,
  Finding,
  Recommendation,
  LessonLearned,
  GoodPractice,
  EvidenceEntryId,
} from "@/lib/types";
import {
  saveStudyQuestion,
  deleteStudyQuestion,
  savePatternNote,
  deletePatternNote,
  saveFinding,
  saveRecommendation,
  saveLesson,
  saveGoodPractice,
  bulkAssignEvidenceToQuestion,
  bulkAssignEvidenceTheme,
  saveStudyMeta,
} from "@/lib/storage";
import { StudyQuestionSelector } from "./StudyQuestionSelector";
import { StudyQuestionModal } from "./StudyQuestionModal";
import { SynthesisComparisonView } from "./SynthesisComparisonView";
import { BulkActionBar } from "./BulkActionBar";
import { WorkingPatternsPanel } from "./WorkingPatternsPanel";
import { FieldTeamReflectionsCard } from "./FieldTeamReflectionsCard";
import { FindingAuthoringModal } from "./FindingAuthoringModal";
import { RecommendationAuthoringModal } from "./RecommendationAuthoringModal";
import { OptionalOutputsModal } from "./OptionalOutputsModal";

interface SynthesisWorkbenchProps {
  study: FieldStudy;
  onRefreshStudy: () => Promise<void>;
  onInspectTrace: (id: string) => void;
  onOpenTab?: (tab: string) => void;
}

export function SynthesisWorkbench({
  study,
  onRefreshStudy,
  onInspectTrace,
  onOpenTab,
}: SynthesisWorkbenchProps) {
  const isDemo = Boolean(study.isDemoCase);

  // Analytical Framework & Filtering State
  const [activeFilter, setActiveFilter] = useState<"all" | "question" | "unassigned">("all");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<EvidenceEntryId[]>([]);

  // Modals state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<StudyQuestion | null>(null);

  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
  const [findingInitialEvidenceIds, setFindingInitialEvidenceIds] = useState<EvidenceEntryId[]>([]);
  const [findingInitialStatement, setFindingInitialStatement] = useState("");
  const [findingInitialContradiction, setFindingInitialContradiction] = useState("");

  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [recLinkedFinding, setRecLinkedFinding] = useState<Finding | null>(null);

  const [isOptionalModalOpen, setIsOptionalModalOpen] = useState(false);
  const [optionalMode, setOptionalMode] = useState<"lesson" | "goodPractice">("lesson");
  const [optionalLinkedFinding, setOptionalLinkedFinding] = useState<Finding | null>(null);

  const studyQuestions = useMemo(() => study.questions || [], [study.questions]);
  const patternNotes = useMemo(() => study.patternNotes || [], [study.patternNotes]);
  const debriefs = useMemo(() => study.debriefs || [], [study.debriefs]);

  // Validated Evidence entries
  const validatedEvidence = useMemo(
    () => study.evidence.filter((e) => (e.validationStatus ?? "Validated") === "Validated"),
    [study.evidence]
  );

  // Unassigned validated evidence
  const unassignedEvidence = useMemo(
    () =>
      validatedEvidence.filter(
        (e) => !e.studyQuestionIds || e.studyQuestionIds.length === 0
      ),
    [validatedEvidence]
  );

  // Filtered evidence based on question selector
  const displayedEvidence = useMemo(() => {
    if (activeFilter === "unassigned") {
      return unassignedEvidence;
    }
    if (activeFilter === "question" && selectedQuestionId) {
      return study.evidence.filter(
        (e) => e.studyQuestionIds && e.studyQuestionIds.includes(selectedQuestionId)
      );
    }
    return study.evidence;
  }, [study.evidence, activeFilter, selectedQuestionId, unassignedEvidence]);

  // Handle Question selection
  const handleSelectFilter = (
    filter: "all" | "question" | "unassigned",
    questionId?: string
  ) => {
    setActiveFilter(filter);
    setSelectedQuestionId(questionId || null);
    setSelectedEvidenceIds([]);
  };

  // Evidence Selection Toggles
  const handleToggleSelectEvidence = (id: EvidenceEntryId) => {
    setSelectedEvidenceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllGroup = (ids: EvidenceEntryId[]) => {
    setSelectedEvidenceIds((prev) => {
      const set = new Set([...prev, ...ids]);
      return Array.from(set);
    });
  };

  // Bulk operations
  const handleBulkAssignQuestion = async (questionId: string) => {
    if (isDemo) return;
    try {
      await bulkAssignEvidenceToQuestion(study.id, selectedEvidenceIds, questionId);
      await onRefreshStudy();
      setSelectedEvidenceIds([]);
    } catch (err) {
      console.error("Bulk assign question error:", err);
    }
  };

  const handleBulkAssignTheme = async (theme: string) => {
    if (isDemo) return;
    try {
      await bulkAssignEvidenceTheme(study.id, selectedEvidenceIds, theme);
      await onRefreshStudy();
      setSelectedEvidenceIds([]);
    } catch (err) {
      console.error("Bulk assign theme error:", err);
    }
  };

  const handleAssignSingleQuestion = async (
    evidenceId: EvidenceEntryId,
    questionId: string
  ) => {
    if (isDemo) return;
    try {
      await bulkAssignEvidenceToQuestion(study.id, [evidenceId], questionId);
      await onRefreshStudy();
    } catch (err) {
      console.error("Single assign question error:", err);
    }
  };

  // Study Question CRUD
  const handleSaveQuestion = async (question: StudyQuestion) => {
    if (isDemo) return;
    try {
      await saveStudyQuestion(study.id, question);
      await onRefreshStudy();
    } catch (err) {
      console.error("Save question error:", err);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (isDemo) return;
    try {
      await deleteStudyQuestion(study.id, questionId);
      if (selectedQuestionId === questionId) {
        setSelectedQuestionId(null);
        setActiveFilter("all");
      }
      await onRefreshStudy();
    } catch (err) {
      console.error("Delete question error:", err);
    }
  };

  // Pattern Notes CRUD
  const handleSavePattern = async (pattern: PatternNote) => {
    if (isDemo) return;
    try {
      await savePatternNote(study.id, { ...pattern, studyId: study.id });
      await onRefreshStudy();
    } catch (err) {
      console.error("Save pattern error:", err);
    }
  };

  const handleDeletePattern = async (patternId: string) => {
    if (isDemo) return;
    try {
      await deletePatternNote(study.id, patternId);
      await onRefreshStudy();
    } catch (err) {
      console.error("Delete pattern error:", err);
    }
  };

  // Promote Working Pattern to Finding
  const handlePromotePatternToFinding = (pattern: PatternNote) => {
    setEditingFinding(null);
    setFindingInitialStatement(pattern.statement);
    setFindingInitialEvidenceIds(pattern.evidenceIds);
    setFindingInitialContradiction(pattern.contradictionNote || "");
    setIsFindingModalOpen(true);
  };

  // Finding Creation from selected Evidence
  const handleCreateFindingFromSelected = (ids: EvidenceEntryId[]) => {
    setEditingFinding(null);
    setFindingInitialStatement("");
    setFindingInitialEvidenceIds(ids);
    setFindingInitialContradiction("");
    setIsFindingModalOpen(true);
  };

  const handleSaveFinding = async (finding: Finding) => {
    if (isDemo) return;
    try {
      await saveFinding({ ...finding, studyId: study.id });
      await onRefreshStudy();
    } catch (err) {
      console.error("Save finding error:", err);
    }
  };

  // Downstream Recommendation Creation
  const handleOpenCreateRecommendation = (finding: Finding) => {
    setRecLinkedFinding(finding);
    setIsRecModalOpen(true);
  };

  const handleSaveRecommendation = async (rec: Recommendation) => {
    if (isDemo) return;
    try {
      await saveRecommendation({ ...rec, studyId: study.id });
      await onRefreshStudy();
    } catch (err) {
      console.error("Save recommendation error:", err);
    }
  };

  // Optional Downstream Outputs
  const handleOpenOptionalOutput = (
    mode: "lesson" | "goodPractice",
    finding: Finding
  ) => {
    setOptionalMode(mode);
    setOptionalLinkedFinding(finding);
    setIsOptionalModalOpen(true);
  };

  const handleSaveLesson = async (lesson: LessonLearned) => {
    if (isDemo) return;
    try {
      await saveLesson({ ...lesson, studyId: study.id });
      await onRefreshStudy();
    } catch (err) {
      console.error("Save lesson error:", err);
    }
  };

  const handleSaveGoodPractice = async (gp: GoodPractice) => {
    if (isDemo) return;
    try {
      await saveGoodPractice({ ...gp, studyId: study.id });
      await onRefreshStudy();
    } catch (err) {
      console.error("Save good practice error:", err);
    }
  };

  // Output Config Toggle (Study Type Flexibility)
  const handleToggleOutputConfig = async (
    field: "includeRecommendations" | "includeLessons" | "includeGoodPractices"
  ) => {
    if (isDemo) return;
    const current = study.outputConfig || {
      includeRecommendations: true,
      includeLessons: true,
      includeGoodPractices: true,
    };
    const updated = {
      ...current,
      [field]: !current[field],
    };
    try {
      await saveStudyMeta({
        ...study,
        outputConfig: updated,
        updatedAt: Date.now(),
      });
      await onRefreshStudy();
    } catch (err) {
      console.error("Toggle output config error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workbench Header & Study Context */}
      <div className="rounded-xl border border-[var(--border)] bg-[rgba(11,22,37,0.7)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--trace)]">
                Phase 6 Workbench
              </span>
              <span className="rounded bg-[var(--surface-muted)] border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--foreground)]">
                {study.status}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">
              Synthesis Workbench
            </h1>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Cross-site and cross-stakeholder evidence comparison for defensible finding synthesis.
            </p>
          </div>

          {/* Study Type & Downstream Output Flags */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-strong)] block mb-1.5">
              Downstream Deliverables
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={study.outputConfig?.includeRecommendations ?? true}
                  disabled={isDemo}
                  onChange={() => handleToggleOutputConfig("includeRecommendations")}
                  className="rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)]"
                />
                <span className="text-[11px] text-[var(--foreground)]">Recommendations</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={study.outputConfig?.includeLessons ?? true}
                  disabled={isDemo}
                  onChange={() => handleToggleOutputConfig("includeLessons")}
                  className="rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)]"
                />
                <span className="text-[11px] text-[var(--foreground)]">Lessons Learned</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={study.outputConfig?.includeGoodPractices ?? true}
                  disabled={isDemo}
                  onChange={() => handleToggleOutputConfig("includeGoodPractices")}
                  className="rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)]"
                />
                <span className="text-[11px] text-[var(--foreground)]">Good Practices</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Study Questions Analytical Framework */}
      <StudyQuestionSelector
        questions={studyQuestions}
        selectedQuestionId={selectedQuestionId}
        activeFilter={activeFilter}
        unassignedCount={unassignedEvidence.length}
        isDemoCase={isDemo}
        onSelectFilter={handleSelectFilter}
        onAddQuestion={() => {
          setEditingQuestion(null);
          setIsQuestionModalOpen(true);
        }}
        onEditQuestion={(q) => {
          setEditingQuestion(q);
          setIsQuestionModalOpen(true);
        }}
        onDeleteQuestion={handleDeleteQuestion}
      />

      {/* 2. Main Comparative Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Synthesis Comparison View (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          <SynthesisComparisonView
            evidence={displayedEvidence}
            sources={study.sources}
            scope={study.scope}
            questions={studyQuestions}
            selectedEvidenceIds={selectedEvidenceIds}
            isDemoCase={isDemo}
            onToggleSelectEvidence={handleToggleSelectEvidence}
            onSelectAllGroup={handleSelectAllGroup}
            onInspectEvidence={onInspectTrace}
            onAssignQuestionToEntry={handleAssignSingleQuestion}
          />
        </div>

        {/* Right Column: Sensemaking & Deliverables (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Quick Finding Synthesizer CTA */}
          <div className="rounded-xl border border-[var(--trace)]/30 bg-[var(--trace-wash)] p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--trace)]">
              Findings Authoring Desk
            </h4>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Synthesize selected validated evidence into defensible findings with live Support Profiles.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCreateFindingFromSelected(selectedEvidenceIds)}
                className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition text-center"
              >
                + Author Draft Finding {selectedEvidenceIds.length > 0 ? `(${selectedEvidenceIds.length} linked)` : ""}
              </button>
            </div>
          </div>

          {/* Working Patterns Sensemaking Panel */}
          <WorkingPatternsPanel
            studyId={study.id}
            patterns={patternNotes}
            questions={studyQuestions}
            validatedEvidence={validatedEvidence}
            currentQuestionId={activeFilter === "question" ? selectedQuestionId : null}
            isDemoCase={isDemo}
            onSavePattern={handleSavePattern}
            onDeletePattern={handleDeletePattern}
            onPromoteToFinding={handlePromotePatternToFinding}
            onInspectEvidence={onInspectTrace}
          />

          {/* Daily Debrief Context (Field Team Reflections) */}
          <FieldTeamReflectionsCard
            debriefs={debriefs}
            onInspectDebrief={onInspectTrace}
          />

          {/* Existing Findings & Downstream Actions Card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                  Study Findings ({study.findings.length})
                </h4>
                <p className="text-[11px] text-[var(--muted)]">
                  Authored findings and linked downstream deliverables
                </p>
              </div>
              {onOpenTab && (
                <button
                  type="button"
                  onClick={() => onOpenTab("findings")}
                  className="text-xs text-[var(--trace)] hover:underline font-semibold"
                >
                  View Tab
                </button>
              )}
            </div>

            <div className="mt-3 space-y-3">
              {study.findings.length === 0 ? (
                <p className="text-xs italic text-[var(--muted)] py-3 text-center">
                  No findings created yet. Select validated evidence and click &quot;Author Draft Finding&quot; to begin.
                </p>
              ) : (
                study.findings.map((fnd) => {
                  const isValidated = fnd.validationStatus === "Validated";
                  const linkedRecs = study.recommendations.filter(
                    (r) => r.linkedFindingId === fnd.id
                  );
                  return (
                    <div
                      key={fnd.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onInspectTrace(fnd.id)}
                            className="font-mono font-bold text-[var(--trace)] hover:underline"
                          >
                            {fnd.id}
                          </button>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                              isValidated
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            }`}
                          >
                            {fnd.validationStatus || "Draft"}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--muted)]">
                          {fnd.supportingEvidenceIds.length} evidence
                        </span>
                      </div>

                      <p className="text-[11px] font-medium leading-4 text-[var(--foreground)]">
                        {fnd.statement}
                      </p>

                      {fnd.limitationNote && (
                        <p className="text-[10px] text-amber-300 italic border-l-2 border-amber-500/50 pl-1.5">
                          Limitation: {fnd.limitationNote}
                        </p>
                      )}

                      {/* Downstream Actions for Validated Findings */}
                      {isValidated && !isDemo && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--border)]">
                          <button
                            type="button"
                            onClick={() => handleOpenCreateRecommendation(fnd)}
                            className="rounded bg-emerald-600/30 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-600/50"
                          >
                            + Recommendation
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenOptionalOutput("lesson", fnd)}
                            className="rounded bg-amber-600/20 border border-amber-500/40 px-2 py-0.5 text-[10px] text-amber-200 hover:bg-amber-600/40"
                          >
                            + Lesson
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenOptionalOutput("goodPractice", fnd)}
                            className="rounded bg-indigo-600/20 border border-indigo-500/40 px-2 py-0.5 text-[10px] text-indigo-200 hover:bg-indigo-600/40"
                          >
                            + Practice
                          </button>
                        </div>
                      )}

                      {linkedRecs.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[10px] text-[var(--muted)] pt-1">
                          <span>Linked Recs:</span>
                          {linkedRecs.map((r) => (
                            <button
                              type="button"
                              key={r.id}
                              onClick={() => onInspectTrace(r.id)}
                              className="font-mono text-emerald-400 hover:underline"
                            >
                              {r.id}
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
        </div>
      </div>

      {/* 3. Floating Bulk Action Bar */}
      <BulkActionBar
        selectedIds={selectedEvidenceIds}
        questions={studyQuestions}
        isDemoCase={isDemo}
        onAssignToQuestion={handleBulkAssignQuestion}
        onAssignTheme={handleBulkAssignTheme}
        onCreateFinding={handleCreateFindingFromSelected}
        onClearSelection={() => setSelectedEvidenceIds([])}
      />

      {/* 4. Modals */}
      <StudyQuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        onSave={handleSaveQuestion}
        existingQuestions={studyQuestions}
        initialQuestion={editingQuestion}
      />

      <FindingAuthoringModal
        isOpen={isFindingModalOpen}
        onClose={() => setIsFindingModalOpen(false)}
        onSaveFinding={handleSaveFinding}
        existingFindings={study.findings}
        validatedEvidence={validatedEvidence}
        sources={study.sources}
        scope={study.scope}
        questions={studyQuestions}
        initialEvidenceIds={findingInitialEvidenceIds}
        initialQuestionId={selectedQuestionId}
        initialStatement={findingInitialStatement}
        initialContradictionNote={findingInitialContradiction}
        initialFinding={editingFinding}
      />

      {recLinkedFinding && (
        <RecommendationAuthoringModal
          isOpen={isRecModalOpen}
          onClose={() => setIsRecModalOpen(false)}
          onSaveRecommendation={handleSaveRecommendation}
          existingRecommendations={study.recommendations}
          linkedFinding={recLinkedFinding}
        />
      )}

      {optionalLinkedFinding && (
        <OptionalOutputsModal
          isOpen={isOptionalModalOpen}
          mode={optionalMode}
          onClose={() => setIsOptionalModalOpen(false)}
          onSaveLesson={handleSaveLesson}
          onSaveGoodPractice={handleSaveGoodPractice}
          existingLessons={study.lessons}
          existingGoodPractices={study.goodPractices}
          linkedFinding={optionalLinkedFinding}
        />
      )}
    </div>
  );
}
