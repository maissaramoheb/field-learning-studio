"use client";

import React, { useState } from "react";
import type { DailyDebrief } from "@/lib/types";

interface FieldTeamReflectionsCardProps {
  debriefs: DailyDebrief[];
  onInspectDebrief?: (debriefId: string) => void;
}

export function FieldTeamReflectionsCard({
  debriefs,
  onInspectDebrief,
}: FieldTeamReflectionsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (debriefs.length === 0) return null;

  // Filter debriefs that have hypotheses, missing perspectives, or contradictions
  const meaningfulDebriefs = debriefs.filter(
    (d) =>
      d.emergingHypotheses?.trim() ||
      d.missingPerspectives?.trim() ||
      d.contradictionsObserved?.trim()
  );

  if (meaningfulDebriefs.length === 0) return null;

  return (
    <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-900/40 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
              Methodological Log
            </span>
            <span className="rounded bg-blue-900/50 border border-blue-700/50 px-1.5 py-0.2 text-[9px] font-semibold text-blue-200">
              Context only · Non-evidentiary
            </span>
          </div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            Field Team Reflections (from Daily Debriefs)
          </h3>
          <p className="mt-0.5 text-xs text-blue-200/70">
            Insights, emerging hypotheses, and missing angles logged during daily field sensemaking sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded border border-blue-800/50 bg-blue-900/30 px-2.5 py-1 text-xs text-blue-300 hover:text-white"
        >
          {isExpanded ? "Collapse Reflections" : `View Reflections (${meaningfulDebriefs.length})`}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-blue-800/30 bg-blue-950/40 p-3 text-[11px] text-blue-200/80">
            <strong>Boundary Guardrail:</strong> These reflections are qualitative team observations. They do not count toward Evidence Support Profiles, do not increase source counts, and cannot become Findings without independent validated evidence.
          </div>

          <div className="space-y-3">
            {meaningfulDebriefs.slice(0, 5).map((d) => (
              <div
                key={d.id}
                className="rounded-lg border border-blue-900/30 bg-[var(--surface)] p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-blue-400">
                      {d.id}
                    </span>
                    <span className="text-[11px] text-[var(--muted)]">
                      {d.date}
                    </span>
                    {d.siteIds && d.siteIds.length > 0 ? (
                      <span className="text-[10px] text-[var(--muted)]">
                        ({d.siteIds.join(", ")})
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--muted)]">
                        (Study-wide)
                      </span>
                    )}
                  </div>
                  {onInspectDebrief && (
                    <button
                      type="button"
                      onClick={() => onInspectDebrief(d.id)}
                      className="text-[11px] text-[var(--trace)] hover:underline"
                    >
                      Inspect Debrief
                    </button>
                  )}
                </div>

                {d.emergingHypotheses && (
                  <div className="mt-2">
                    <span className="font-semibold text-blue-300">Emerging Hypothesis: </span>
                    <span className="text-[var(--foreground)]">{d.emergingHypotheses}</span>
                  </div>
                )}

                {d.missingPerspectives && (
                  <div className="mt-1.5">
                    <span className="font-semibold text-amber-300">Missing Perspectives: </span>
                    <span className="text-[var(--foreground)]">{d.missingPerspectives}</span>
                  </div>
                )}

                {d.contradictionsObserved && (
                  <div className="mt-1.5">
                    <span className="font-semibold text-rose-300">Contradictions Noted: </span>
                    <span className="text-[var(--foreground)]">{d.contradictionsObserved}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
