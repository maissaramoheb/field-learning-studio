"use client";

import React, { useState } from "react";
import type { FieldStudy, DailyDebrief } from "@/lib/types";
import { saveDebrief, cloneDemoStudy } from "@/lib/storage/studyStore";
import { DebriefHistory } from "./DebriefHistory";
import { DebriefForm } from "./DebriefForm";
import { DebriefDetail } from "./DebriefDetail";

interface DailyDebriefViewProps {
  study: FieldStudy;
  onRefreshStudy: () => Promise<void> | void;
  onStudyChange: (newStudyId: string) => void;
  traceHandlers: {
    highlightedId: string | null;
    onTraceSelect: (id: string) => void;
  };
}

export function DailyDebriefView({
  study,
  onRefreshStudy,
  onStudyChange,
  traceHandlers,
}: DailyDebriefViewProps) {
  const [viewMode, setViewMode] = useState<"list" | "create" | "edit" | "detail">("list");
  const [selectedDebriefId, setSelectedDebriefId] = useState<string | null>(null);
  const [editingDebrief, setEditingDebrief] = useState<DailyDebrief | null>(null);
  const [isCloning, setIsCloning] = useState(false);

  const [prevHighlightedId, setPrevHighlightedId] = useState<string | null>(null);

  // If traceHandlers requests a specific DBR- ID, open it in detail
  if (traceHandlers.highlightedId !== prevHighlightedId) {
    setPrevHighlightedId(traceHandlers.highlightedId);
    if (traceHandlers.highlightedId?.startsWith("DBR-")) {
      setSelectedDebriefId(traceHandlers.highlightedId);
      setViewMode("detail");
    }
  }

  const debriefs = study.debriefs || [];
  const selectedDebrief = debriefs.find((d) => d.id === selectedDebriefId);

  const handleStartCreate = () => {
    setEditingDebrief(null);
    setViewMode("create");
  };

  const handleStartEdit = (debrief: DailyDebrief) => {
    setEditingDebrief(debrief);
    setViewMode("edit");
  };

  const handleSaveDebrief = async (saved: DailyDebrief) => {
    await saveDebrief(saved);
    await onRefreshStudy();
    setSelectedDebriefId(saved.id);
    setViewMode("detail");
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
      {/* Top Banner: Debrief Studio Header */}
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
                {study.isDemoCase ? "Read-Only Demo Template" : "Active Field Study"}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-[var(--foreground)]">
              Daily Field Debrief Studio
            </h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Structured end-of-day sensemaking to capture surprises, contradictions, researcher biases, and tomorrow&apos;s field priorities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {study.isDemoCase ? (
              <button
                type="button"
                onClick={handleCloneDemo}
                disabled={isCloning}
                className="rounded bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-600 disabled:opacity-50 transition cursor-pointer"
              >
                {isCloning ? "Cloning..." : "Create Editable Copy"}
              </button>
            ) : (
              viewMode === "list" && (
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="rounded bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-600 transition cursor-pointer"
                >
                  + Record Daily Debrief
                </button>
              )
            )}
          </div>
        </div>

        {/* Read-Only Demo Notice */}
        {study.isDemoCase && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
            <span className="text-base leading-none">ℹ️</span>
            <div>
              <span className="font-semibold text-amber-100">
                Reference Demo Case (Read-Only):
              </span>{" "}
              Daily Debriefs are living methodological reflection logs recorded by field teams during active data collection. To record, edit, or test debrief workflows for this project, click{" "}
              <button
                type="button"
                onClick={handleCloneDemo}
                className="font-semibold text-amber-300 underline hover:text-amber-100 cursor-pointer"
              >
                Create Editable Copy
              </button>
              .
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === "create" && (
        <DebriefForm
          study={study}
          onSave={handleSaveDebrief}
          onCancel={() => setViewMode("list")}
        />
      )}

      {viewMode === "edit" && editingDebrief && (
        <DebriefForm
          study={study}
          initialDebrief={editingDebrief}
          onSave={handleSaveDebrief}
          onCancel={() => {
            if (selectedDebriefId) {
              setViewMode("detail");
            } else {
              setViewMode("list");
            }
          }}
        />
      )}

      {viewMode === "detail" && selectedDebrief && (
        <DebriefDetail
          debrief={selectedDebrief}
          study={study}
          onEdit={() => handleStartEdit(selectedDebrief)}
          onBack={() => {
            setSelectedDebriefId(null);
            setViewMode("list");
          }}
          onTraceSelect={traceHandlers.onTraceSelect}
        />
      )}

      {viewMode === "list" && (
        <DebriefHistory
          study={study}
          onSelectDebrief={(id) => {
            setSelectedDebriefId(id);
            setViewMode("detail");
          }}
          onEditDebrief={handleStartEdit}
          onCreateNew={handleStartCreate}
        />
      )}
    </div>
  );
}
