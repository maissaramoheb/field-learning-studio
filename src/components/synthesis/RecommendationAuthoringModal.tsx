"use client";

import React, { useState } from "react";
import type {
  Recommendation,
  Finding,
  RecommendationPriority,
} from "@/lib/types";
import { getNextRecommendationId } from "@/lib/idGenerator";

interface RecommendationAuthoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRecommendation: (recommendation: Recommendation) => void;
  existingRecommendations: Recommendation[];
  linkedFinding: Finding;
  initialRecommendation?: Recommendation | null;
}

export function RecommendationAuthoringModal(props: RecommendationAuthoringModalProps) {
  if (!props.isOpen) return null;

  return (
    <RecommendationAuthoringModalContent
      key={props.initialRecommendation?.id || props.linkedFinding.id}
      {...props}
    />
  );
}

function RecommendationAuthoringModalContent({
  onClose,
  onSaveRecommendation,
  existingRecommendations,
  linkedFinding,
  initialRecommendation = null,
}: Omit<RecommendationAuthoringModalProps, "isOpen">) {
  const [recommendationText, setRecommendationText] = useState(
    initialRecommendation ? initialRecommendation.recommendation : ""
  );
  const [responsibleActor, setResponsibleActor] = useState(
    initialRecommendation ? initialRecommendation.responsibleActor : ""
  );
  const [priority, setPriority] = useState<RecommendationPriority>(
    initialRecommendation ? initialRecommendation.priority : "Medium"
  );
  const [timeframe, setTimeframe] = useState(
    initialRecommendation ? initialRecommendation.timeframe : ""
  );
  const [feasibility, setFeasibility] = useState(
    initialRecommendation ? initialRecommendation.feasibility : "Medium"
  );
  const [riskSensitivity, setRiskSensitivity] = useState(
    initialRecommendation ? initialRecommendation.riskSensitivity : "Medium"
  );
  const [expectedBenefit, setExpectedBenefit] = useState(
    initialRecommendation ? initialRecommendation.expectedBenefit : ""
  );
  const [successIndicator, setSuccessIndicator] = useState(
    initialRecommendation ? initialRecommendation.successIndicator : ""
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recommendationText.trim()) {
      setError("Recommendation action is required.");
      return;
    }

    const nextId =
      initialRecommendation?.id ||
      getNextRecommendationId(existingRecommendations.map((r) => r.id));

    const finalRec: Recommendation = {
      id: nextId,
      studyId: linkedFinding.studyId,
      recommendation: recommendationText.trim(),
      linkedFindingId: linkedFinding.id,
      evidenceBase: linkedFinding.supportingEvidenceIds || [],
      responsibleActor: responsibleActor.trim() || "Unassigned",
      priority,
      timeframe: timeframe.trim() || "Not specified",
      feasibility: feasibility.trim() || "Medium",
      riskSensitivity: riskSensitivity.trim() || "Medium",
      expectedBenefit: expectedBenefit.trim() || "",
      successIndicator: successIndicator.trim() || "",
      validationStatus: initialRecommendation ? initialRecommendation.validationStatus : "Draft",
      revision: initialRecommendation ? initialRecommendation.revision : 1,
      createdAt: initialRecommendation?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSaveRecommendation(finalRec);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rec-modal-title"
    >
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Actionable Output
              </span>
              <span className="rounded bg-slate-500/10 border border-slate-500/30 px-1.5 py-0.2 text-[9px] font-semibold text-[var(--muted)]">
                Draft · Linked to {linkedFinding.id}
              </span>
            </div>
            <h3 id="rec-modal-title" className="text-lg font-semibold text-[var(--foreground)]">
              {initialRecommendation ? "Edit Recommendation" : "Draft Recommendation"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-lg text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Linked Finding Banner */}
        <div className="mt-4 rounded-lg border border-[var(--trace)]/30 bg-[var(--trace-wash)] p-3.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[var(--trace)]">
              Anchored Finding: {linkedFinding.id}
            </span>
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold uppercase text-emerald-300">
              {linkedFinding.validationStatus || "Validated"}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-[var(--foreground)]">
            {linkedFinding.statement}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <span>Evidence lineage:</span>
            {linkedFinding.supportingEvidenceIds.map((evId) => (
              <span key={evId} className="font-mono font-bold text-[var(--trace)]">
                {evId}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Primary Action */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
              Action / Recommendation Statement <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={recommendationText}
              onChange={(e) => setRecommendationText(e.target.value)}
              placeholder="e.g. Introduce routine comparison of delivery logs with observed serving times and beneficiary feedback."
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              required
            />
          </div>

          {/* Intended Actor (when known) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
              Intended Actor / Responsible Body <span className="text-[var(--muted)] font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={responsibleActor}
              onChange={(e) => setResponsibleActor(e.target.value)}
              placeholder="e.g. Program Coordinator, Field Team, or leave blank if unassigned"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            />
          </div>

          {/* Progressive Disclosure: Implementation Parameters */}
          <details className="group rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 transition">
            <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-[var(--muted-strong)] hover:text-[var(--foreground)] select-none">
              <span>Implementation Parameters (Priority, Timeframe, Feasibility, Risks, Indicators)</span>
              <span className="text-xs text-[var(--muted)] transition-transform group-open:rotate-180">▼</span>
            </summary>

            <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as RecommendationPriority)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Timeframe
                  </label>
                  <input
                    type="text"
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    placeholder="e.g. Next grant cycle, 1-3 months"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Feasibility
                  </label>
                  <select
                    value={feasibility}
                    onChange={(e) => setFeasibility(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Risk / Sensitivity
                  </label>
                  <select
                    value={riskSensitivity}
                    onChange={(e) => setRiskSensitivity(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  >
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Expected Benefit
                  </label>
                  <input
                    type="text"
                    value={expectedBenefit}
                    onChange={(e) => setExpectedBenefit(e.target.value)}
                    placeholder="e.g. Reduces distribution delays by 75%"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Success Indicator
                  </label>
                  <input
                    type="text"
                    value={successIndicator}
                    onChange={(e) => setSuccessIndicator(e.target.value)}
                    placeholder="e.g. Monthly delivery audit reconciliation signed"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </details>

          <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] cursor-pointer"
            >
              {initialRecommendation ? "Save Recommendation Changes" : "Save as Draft Recommendation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
