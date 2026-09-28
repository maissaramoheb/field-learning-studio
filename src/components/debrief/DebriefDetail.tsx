"use client";

import React from "react";
import type { DailyDebrief, FieldStudy } from "@/lib/types";
import { ValidationStatusBadge } from "@/components/evidence/ValidationStatusBadge";

interface DebriefDetailProps {
  debrief: DailyDebrief;
  study: FieldStudy;
  onEdit: () => void;
  onBack: () => void;
  onTraceSelect: (id: string) => void;
}

export function DebriefDetail({
  debrief,
  study,
  onEdit,
  onBack,
  onTraceSelect,
}: DebriefDetailProps) {
  const isDemo = study.isDemoCase;

  // Resolve linked sources and evidence
  const linkedSources = (study.sources || []).filter((s) =>
    debrief.linkedSourceIds?.includes(s.id)
  );

  const linkedEvidence = (study.evidence || []).filter((e) =>
    debrief.linkedEvidenceIds?.includes(e.id)
  );

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition cursor-pointer"
          >
            ← Back to Debriefs
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[var(--trace)]">
                {debrief.id}
              </span>
              <span className="text-xs text-[var(--muted)]">•</span>
              <span className="text-xs font-semibold text-[var(--foreground)]">
                📅 {debrief.date}
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">
              Field Methodological Reflection Log
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isDemo && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--trace)] hover:bg-[var(--surface-elevated)] transition cursor-pointer"
            >
              ✎ Edit Debrief
            </button>
          )}
          <button
            type="button"
            onClick={() => onTraceSelect(debrief.id)}
            className="rounded-lg border border-[var(--trace-border)] bg-[var(--trace)] px-3 py-1.5 text-xs font-semibold text-[var(--trace-ink)] hover:bg-[var(--trace-text)] cursor-pointer"
          >
            Inspect in Drawer &rarr;
          </button>
        </div>
      </div>

      {/* Session Metadata Banner */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
              Locations / Sites
            </span>
            <div className="flex flex-wrap gap-1.5">
              {debrief.siteIds.map((site) => (
                <span
                  key={site}
                  className="rounded bg-sky-950/40 border border-sky-800/40 px-2 py-0.5 text-sky-300 font-medium"
                >
                  📍 {site}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
              Field Team Attendees
            </span>
            <p className="font-medium text-[var(--foreground)]">
              {debrief.attendees.length > 0
                ? debrief.attendees.join(", ")
                : "None recorded"}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
              Linked Grounding Material
            </span>
            <p className="text-[var(--foreground)] font-mono">
              {debrief.linkedSourceIds?.length || 0} sources /{" "}
              {debrief.linkedEvidenceIds?.length || 0} observations
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
              Timestamps
            </span>
            <p className="text-[11px] text-[var(--muted)]">
              Created: {new Date(debrief.createdAt).toLocaleDateString()}
              {debrief.updatedAt && debrief.updatedAt !== debrief.createdAt && (
                <span className="block text-[10px] text-amber-400/80">
                  Updated: {new Date(debrief.updatedAt).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Guided Reflections Grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* What Surprised Us */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚡</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              What surprised us today?
            </h4>
          </div>
          <p className="text-xs leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">
            {debrief.whatSurprisedUs}
          </p>
        </div>

        {/* What Repeated */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔁</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              What patterns repeated?
            </h4>
          </div>
          <p className="text-xs leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">
            {debrief.whatRepeated}
          </p>
        </div>

        {/* Contradictions Observed */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">⚖️</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                What contradicted earlier information?
              </h4>
            </div>
            <span className="text-[9px] rounded bg-amber-950/60 border border-amber-800/40 px-1 text-amber-400">
              Reflexive Divergence
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">
            {debrief.contradictionsObserved || "No contradictions noted for this session."}
          </p>
          <span className="text-[10px] text-amber-400/80 block pt-1 border-t border-[var(--border)]">
            ℹ️ Note: Debrief reflections capture working divergence; they do not automatically alter formal Evidence contradiction linkages.
          </span>
        </div>

        {/* Assumptions Shaken */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">❓</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              Which assumptions should we question?
            </h4>
          </div>
          <p className="text-xs leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">
            {debrief.shakenAssumptions || "No assumptions flagged for re-examination."}
          </p>
        </div>

        {/* Potential Biases */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔍</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              Where might our own bias be influencing interpretation?
            </h4>
          </div>
          <p className="text-xs leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">
            {debrief.potentialBiases || "No specific researcher bias factors recorded."}
          </p>
        </div>

        {/* Missing Perspectives */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">👥</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              Whose perspective is still missing?
            </h4>
          </div>
          <p className="text-xs leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">
            {debrief.missingPerspectives || "No missing perspectives identified."}
          </p>
        </div>
      </div>

      {/* Emerging Hypotheses (Full width with prominent guardrail) */}
      <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <h4 className="text-sm font-bold text-amber-200">
              What hypotheses are emerging?
            </h4>
          </div>
          <span className="text-[10px] rounded bg-amber-900/50 border border-amber-700/50 px-2.5 py-0.5 text-amber-300 font-semibold uppercase">
            Working Interpretation Only
          </span>
        </div>
        <p className="text-xs leading-relaxed text-[var(--foreground)] whitespace-pre-wrap font-medium">
          {debrief.emergingHypotheses || "No emerging hypotheses documented."}
        </p>
        <div className="rounded border border-amber-500/30 bg-amber-950/50 p-2.5 text-xs text-amber-200 flex items-center gap-2">
          <span>⚠️</span>
          <span className="text-[11px] leading-relaxed">
            <span className="font-semibold">Boundary Guardrail:</span> Emerging hypotheses are internal working interpretations to guide subsequent fieldwork, <span className="font-semibold underline">NOT validated findings</span>. They are not promoted automatically into the formal evidence base or learning brief.
          </span>
        </div>
      </div>

      {/* Tomorrow Priorities */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              What should we investigate tomorrow?
            </h4>
          </div>
          <span className="text-xs font-semibold text-[var(--trace)]">
            {debrief.tomorrowPriorities.length} {debrief.tomorrowPriorities.length === 1 ? "priority" : "priorities"}
          </span>
        </div>

        {debrief.tomorrowPriorities.length === 0 ? (
          <p className="text-xs text-[var(--muted)] italic">
            No priorities logged for tomorrow.
          </p>
        ) : (
          <ol className="space-y-2 pt-1">
            {debrief.tomorrowPriorities.map((priority, index) => (
              <li
                key={index}
                className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs"
              >
                <span className="font-mono text-xs font-bold text-[var(--trace)] w-5 text-center mt-0.5">
                  {index + 1}.
                </span>
                <span className="text-[var(--foreground)] font-medium leading-relaxed">
                  {priority}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Linked Sources Section */}
      {linkedSources.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--trace)]">
            Linked Source Records ({linkedSources.length})
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {linkedSources.map((src) => (
              <div
                key={src.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-[var(--trace-text)]">
                      {src.id}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">
                      📅 {src.date}
                    </span>
                  </div>
                  <h5 className="font-semibold text-[var(--foreground)] mt-1 truncate">
                    {src.title}
                  </h5>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--muted)] mt-1">
                    <span>📍 {src.location}</span>
                    <span>•</span>
                    <span>👥 {src.stakeholderType}</span>
                    <span>•</span>
                    <span>📋 {src.sourceType}</span>
                  </div>
                </div>
                <div className="flex justify-end pt-1 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => onTraceSelect(src.id)}
                    className="font-mono text-[10px] font-bold text-[var(--trace)] hover:underline cursor-pointer"
                  >
                    Inspect Source &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked Evidence Section */}
      {linkedEvidence.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--trace)]">
            Linked Evidence Observations ({linkedEvidence.length})
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {linkedEvidence.map((ev) => (
              <div
                key={ev.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[var(--trace-text)]">
                        {ev.id}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--muted)]">
                        from {ev.sourceId}
                      </span>
                    </div>
                    <ValidationStatusBadge
                      status={ev.validationStatus}
                      revision={ev.revision}
                    />
                  </div>
                  <p className="text-[11px] text-[var(--foreground)] font-medium mt-1 line-clamp-3">
                    {ev.rawObservation || ev.rawEvidence}
                  </p>
                  {ev.interpretation && (
                    <p className="text-[10px] text-sky-300 italic mt-1 line-clamp-2">
                      Meaning: {ev.interpretation}
                    </p>
                  )}
                </div>
                <div className="flex justify-end pt-1 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => onTraceSelect(ev.id)}
                    className="font-mono text-[10px] font-bold text-[var(--trace)] hover:underline cursor-pointer"
                  >
                    Inspect Observation &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
