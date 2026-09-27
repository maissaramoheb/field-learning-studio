"use client";

import React, { useState } from "react";
import { SourceCaptureForm } from "./SourceCaptureForm";
import { ObservationCaptureForm } from "./ObservationCaptureForm";
import { SourceHistory } from "./SourceHistory";
import { MinimalStudyModal } from "@/components/studies/MinimalStudyModal";
import { BulkSourceModal } from "./BulkSourceModal";
import { cloneDemoStudy } from "@/lib/storage/studyStore";
import type { FieldStudy, SourceRecord } from "@/lib/types";

interface FieldIntakeViewProps {
  study: FieldStudy;
  onStudyChange: (newStudyId: string) => void;
  onRefreshStudy: () => void;
}

export function FieldIntakeView({
  study,
  onStudyChange,
  onRefreshStudy,
}: FieldIntakeViewProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [isCapturingNewSource, setIsCapturingNewSource] = useState(
    () => study.sources.length === 0
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkSourceModalOpen, setIsBulkSourceModalOpen] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  // Reset selected source on study switch to prevent cross-study contamination
  const prevStudyIdRef = React.useRef(study.id);
  React.useEffect(() => {
    if (prevStudyIdRef.current !== study.id) {
      prevStudyIdRef.current = study.id;
      setSelectedSourceId(null);
      setIsCapturingNewSource(study.sources.length === 0);
    }
  }, [study.id, study.sources.length]);

  // Derive active source from study.sources and selectedSourceId without an effect
  const activeSource: SourceRecord | null = React.useMemo(() => {
    if (study.sources.length === 0) return null;
    if (selectedSourceId) {
      const found = study.sources.find(
        (s) => s.id === selectedSourceId && (s.studyId === study.id || !s.studyId)
      );
      if (found) return found;
    }
    return study.sources[0];
  }, [study.sources, selectedSourceId, study.id]);

  const handleSourceSaved = (newSource: SourceRecord) => {
    setSelectedSourceId(newSource.id);
    setIsCapturingNewSource(false);
    onRefreshStudy();
  };

  const handleSourcesImported = (importedSources: SourceRecord[]) => {
    onRefreshStudy();
    if (importedSources.length > 0) {
      setSelectedSourceId(importedSources[0].id);
      setIsCapturingNewSource(false);
    }
  };

  const handleEvidenceCreated = () => {
    onRefreshStudy();
  };

  const handleCloneDemo = async () => {
    try {
      setIsCloning(true);
      const newStudyId = await cloneDemoStudy(
        study.id,
        `${study.title} (Editable Copy)`
      );
      onStudyChange(newStudyId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to clone demo study.");
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Study Status & Mode */}
      <div className="rounded-xl border border-[var(--border)] bg-[rgba(11,22,37,0.85)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[var(--trace)]">
                {study.id}
              </span>
              <span className="text-xs text-[var(--muted)]">•</span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  study.isDemoCase
                    ? "border border-amber-500/40 bg-amber-950/30 text-amber-300"
                    : "border border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
                }`}
              >
                {study.isDemoCase ? "Read-Only Demo Template" : "Editable Field Study"}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-[var(--foreground)]">
              {study.title}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Sites: {study.scope.targetSites.join(", ")} | Stakeholders:{" "}
              {study.scope.targetStakeholderGroups.join(", ")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!study.isDemoCase && (
              <button
                type="button"
                onClick={() => setIsBulkSourceModalOpen(true)}
                className="rounded border border-indigo-500/40 bg-indigo-950/30 px-3.5 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-900/40 hover:border-indigo-400 transition cursor-pointer flex items-center gap-1.5"
                title="Bulk import multiple sources via structured text or CSV/TSV"
              >
                <span>⚡</span>
                <span>Bulk Source Intake</span>
              </button>
            )}

            {study.isDemoCase ? (
              <button
                type="button"
                onClick={handleCloneDemo}
                disabled={isCloning}
                className="rounded bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-600 disabled:opacity-50 transition cursor-pointer"
              >
                {isCloning ? "Cloning..." : "Create Editable Copy"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--trace)] transition cursor-pointer"
            >
              + New Blank Study
            </button>
          </div>
        </div>

        {/* Read-Only Notice for Demo Cases */}
        {study.isDemoCase && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200">
            <p className="font-semibold text-amber-300">
              Field Intake is locked for pristine demo templates.
            </p>
            <p className="mt-1 text-[11px] text-amber-200/90 leading-relaxed">
              Community Bridges and School Nutrition are preserved as reference benchmarks. To capture new field notes and extract observations, click &quot;Create Editable Copy&quot; above to spawn a fully editable study copy with isolated local persistence.
            </p>
          </div>
        )}
      </div>

      {/* Main Field Intake Workbench (Unlocked when study is editable) */}
      {!study.isDemoCase ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Note Capture or History (5 cols) */}
          <div className="space-y-6 lg:col-span-5">
            {isCapturingNewSource ? (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    New Note Form
                  </span>
                  {study.sources.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCapturingNewSource(false)}
                      className="text-xs text-[var(--trace)] hover:underline"
                    >
                      ← Back to Captured Sources
                    </button>
                  )}
                </div>
                <SourceCaptureForm study={study} onSourceSaved={handleSourceSaved} />
              </div>
            ) : (
              <SourceHistory
                study={study}
                activeSourceId={activeSource?.id || null}
                onSelectSource={(src) => {
                  setSelectedSourceId(src.id);
                  setIsCapturingNewSource(false);
                }}
                onStartNewSource={() => setIsCapturingNewSource(true)}
                onOpenBulkImport={() => setIsBulkSourceModalOpen(true)}
              />
            )}
          </div>

          {/* Right Column: Active Source Reader & Observation Extractor (7 cols) */}
          <div className="lg:col-span-7">
            {activeSource ? (
              <ObservationCaptureForm
                study={study}
                activeSource={activeSource}
                onEvidenceCreated={handleEvidenceCreated}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center bg-[var(--surface)]">
                <span className="text-2xl">📝</span>
                <h3 className="mt-3 text-sm font-bold text-[var(--foreground)]">
                  No Active Field Note Selected
                </h3>
                <p className="mt-1 text-xs text-[var(--muted)] max-w-sm mx-auto">
                  Select a source from the list on the left, or capture a new narrative field note to begin extracting discrete evidence observations.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCapturingNewSource(true)}
                  className="mt-4 rounded bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600 transition cursor-pointer"
                >
                  Capture First Field Note
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* New Study Creation Modal */}
      <MinimalStudyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onStudyCreated={(newId) => {
          onStudyChange(newId);
          setIsCapturingNewSource(true);
        }}
      />

      {/* Bulk Source Intake Modal */}
      <BulkSourceModal
        isOpen={isBulkSourceModalOpen}
        study={study}
        onClose={() => setIsBulkSourceModalOpen(false)}
        onSourcesImported={handleSourcesImported}
      />
    </div>
  );
}
