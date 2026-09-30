"use client";

import React, { useState, useMemo } from "react";
import type {
  FieldStudy,
  PatternNote,
  Finding,
  EvidenceEntry,
  SourceRecord,
  EvidenceEntryId,
} from "@/lib/types";
import { savePatternNote, deletePatternNote, saveFinding } from "@/lib/storage";
import { isEvidenceEligibleForAnalysis } from "@/lib/storage/normalization";
import { EvidenceExplorer } from "./EvidenceExplorer";
import { ReasoningWorkspace } from "./ReasoningWorkspace";
import { FindingAuthoringModal } from "@/components/synthesis/FindingAuthoringModal";
import { ViewOriginalSourceModal } from "./ViewOriginalSourceModal";

interface SynthesisWorkbenchViewProps {
  study: FieldStudy;
  onRefreshStudy: () => Promise<void>;
  onInspectTrace: (id: string) => void;
  onOpenTab?: (tab: string) => void;
}

export function SynthesisWorkbenchView({
  study,
  onRefreshStudy,
  onInspectTrace,
  onOpenTab,
}: SynthesisWorkbenchViewProps) {
  const isDemo = Boolean(study.isDemoCase);

  // Staged evidence items from explorer for synthesis
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<EvidenceEntryId[]>([]);

  // Modals state
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  const [findingInitialPattern, setFindingInitialPattern] = useState<PatternNote | null>(null);

  // View Original Source Modal state
  const [viewSourceModalOpen, setViewSourceModalOpen] = useState(false);
  const [modalEvidence, setModalEvidence] = useState<EvidenceEntry | null>(null);
  const [modalSource, setModalSource] = useState<SourceRecord | null>(null);

  const studyQuestions = useMemo(() => study.questions || [], [study.questions]);
  const frameworkThemes = useMemo(
    () => study.framework?.themes || [],
    [study.framework]
  );
  const patternNotes = useMemo(() => study.patternNotes || [], [study.patternNotes]);
  const sources = useMemo(() => study.sources || [], [study.sources]);
  const allEvidence = useMemo(() => study.evidence || [], [study.evidence]);

  // Usable evidence count
  const usableEvidenceCount = useMemo(
    () => allEvidence.filter(isEvidenceEligibleForAnalysis).length,
    [allEvidence]
  );

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

  const handleSavePattern = async (pattern: PatternNote) => {
    if (isDemo) return;
    try {
      await savePatternNote(study.id, pattern);
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save reasoning note.");
    }
  };

  const handleDeletePattern = async (patternId: string) => {
    if (isDemo) return;
    try {
      await deletePatternNote(study.id, patternId);
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete reasoning note.");
    }
  };

  const handlePromoteToFinding = (pattern: PatternNote) => {
    setFindingInitialPattern(pattern);
    setIsFindingModalOpen(true);
  };

  const handleSaveFinding = async (finding: Finding) => {
    if (isDemo) return;
    try {
      await saveFinding({ ...finding, studyId: study.id });
      await onRefreshStudy();
      if (onOpenTab) {
        onOpenTab("findings");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save candidate finding.");
    }
  };

  const handleOpenSourceModal = (ev: EvidenceEntry, src: SourceRecord | null) => {
    setModalEvidence(ev);
    setModalSource(src);
    setViewSourceModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
                Analysis Workspace 1 of 4
              </span>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                {usableEvidenceCount} Qualified Observations
              </span>
              <span className="rounded bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
                {patternNotes.length} Reasoning Notes
              </span>
            </div>
            <h1 className="text-xl font-bold text-[var(--foreground)] mt-1">
              Synthesis Workbench
            </h1>
            <p className="mt-1 text-xs text-[var(--muted)] max-w-3xl leading-relaxed">
              &ldquo;What patterns, tensions, contradictions, explanations, and gaps can I see?&rdquo; Explore qualified field evidence, articulate multi-source patterns, and develop candidate claims before advancing them into formal findings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTab && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenTab("triangulation")}
                  className="rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition cursor-pointer"
                >
                  Triangulation Matrix →
                </button>
                <button
                  type="button"
                  onClick={() => onOpenTab("findings")}
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition cursor-pointer"
                >
                  Findings Ledger →
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Workbench Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-280px)] min-h-[640px]">
        {/* Left Column: Evidence Explorer (7 cols) */}
        <div className="lg:col-span-7 h-full">
          <EvidenceExplorer
            evidence={allEvidence}
            sources={sources}
            questions={studyQuestions}
            frameworkThemes={frameworkThemes}
            selectedEvidenceIds={selectedEvidenceIds}
            onToggleSelectEvidence={handleToggleSelectEvidence}
            onSelectAllGroup={handleSelectAllGroup}
            onInspectTrace={onInspectTrace}
            onViewOriginalSource={handleOpenSourceModal}
          />
        </div>

        {/* Right Column: Reasoning Workspace (5 cols) */}
        <div className="lg:col-span-5 h-full">
          <ReasoningWorkspace
            studyId={study.id}
            patternNotes={patternNotes}
            questions={studyQuestions}
            frameworkThemes={frameworkThemes}
            selectedEvidenceIds={selectedEvidenceIds}
            isDemoCase={isDemo}
            onSavePattern={handleSavePattern}
            onDeletePattern={handleDeletePattern}
            onPromoteToFinding={handlePromoteToFinding}
            onInspectEvidence={onInspectTrace}
            onClearEvidenceSelection={() => setSelectedEvidenceIds([])}
          />
        </div>
      </div>

      {/* Finding Authoring Modal */}
      {isFindingModalOpen && (
        <FindingAuthoringModal
          isOpen={isFindingModalOpen}
          onClose={() => {
            setIsFindingModalOpen(false);
            setFindingInitialPattern(null);
          }}
          onSaveFinding={handleSaveFinding}
          existingFindings={study.findings || []}
          qualifiedEvidence={allEvidence.filter(isEvidenceEligibleForAnalysis)}
          allEvidence={allEvidence}
          sources={sources}
          scope={study.scope}
          questions={studyQuestions}
          initialEvidenceIds={findingInitialPattern?.evidenceIds || []}
          initialQuestionId={findingInitialPattern?.questionId || null}
          initialStatement={findingInitialPattern?.statement || ""}
          initialExplanation={findingInitialPattern?.explanation || ""}
          initialOriginPatternNoteId={findingInitialPattern?.id}
          initialFrameworkThemeIds={findingInitialPattern?.frameworkThemeIds}
          initialContradictionNote={findingInitialPattern?.contradictionNote || ""}
        />
      )}

      {/* View Original Source Modal */}
      <ViewOriginalSourceModal
        isOpen={viewSourceModalOpen}
        onClose={() => {
          setViewSourceModalOpen(false);
          setModalEvidence(null);
          setModalSource(null);
        }}
        evidence={modalEvidence}
        source={modalSource}
      />
    </div>
  );
}
