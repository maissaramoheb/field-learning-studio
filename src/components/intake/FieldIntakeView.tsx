"use client";

import React, { useState } from "react";
import { SourceCaptureForm } from "./SourceCaptureForm";
import { ObservationCaptureForm } from "./ObservationCaptureForm";
import { SourceHistory } from "./SourceHistory";
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
      <div className="fls-page-heading">
        <div>
          <p className="fls-eyebrow">Field Material</p>
          <h1>Field intake</h1>
          <p>Capture source notes and extract observations for review.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {!study.isDemoCase && (
            <button
              type="button"
              onClick={() => setIsBulkSourceModalOpen(true)}
              className="fls-button fls-button-quiet"
              title="Bulk import multiple sources via structured text or CSV/TSV"
            >
              <span>Bulk Source Intake</span>
            </button>
          )}

          {study.isDemoCase ? (
            <button
              type="button"
              onClick={handleCloneDemo}
              disabled={isCloning}
              className="fls-button fls-button-primary disabled:opacity-50"
            >
              {isCloning ? "Cloning..." : "Create Editable Copy"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Read-Only Notice for Demo Cases */}
      {study.isDemoCase && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-200">
          <p className="font-semibold text-amber-300">
            Field Intake is locked for pristine demo templates.
          </p>
          <p className="mt-1 text-[11px] text-amber-200/90 leading-relaxed">
            Community Bridges and School Nutrition are preserved as reference benchmarks. To capture new field notes and extract observations, click &quot;Create Editable Copy&quot; above. The copy is stored locally in your browser.
          </p>
        </div>
      )}

      {/* Main Field Intake Workbench (Unlocked when study is editable) */}
      {!study.isDemoCase ? (
        <div className="fls-intake-grid">
          {/* Left Column: Note Capture or History */}
          <div className="min-w-0">
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

          {/* Right Column: Active Source Reader & Observation Extractor */}
          <div className="min-w-0">
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
