"use client";

import React, { useState, useMemo } from "react";
import type { DailyDebrief, FieldStudy } from "@/lib/types";

interface DebriefHistoryProps {
  study: FieldStudy;
  onSelectDebrief: (debriefId: string) => void;
  onEditDebrief: (debrief: DailyDebrief) => void;
  onCreateNew: () => void;
}

export function DebriefHistory({
  study,
  onSelectDebrief,
  onEditDebrief,
  onCreateNew,
}: DebriefHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const isDemo = study.isDemoCase;

  // Sort reverse chronological
  const sortedDebriefs = useMemo(() => {
    const list = study.debriefs || [];
    return [...list].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [study.debriefs]);

  // Filtered by search
  const filteredDebriefs = useMemo(() => {
    if (!searchQuery.trim()) return sortedDebriefs;
    const q = searchQuery.toLowerCase();
    return sortedDebriefs.filter((d) => {
      return (
        d.id.toLowerCase().includes(q) ||
        d.date.toLowerCase().includes(q) ||
        d.siteIds.some((s) => s.toLowerCase().includes(q)) ||
        d.attendees.some((a) => a.toLowerCase().includes(q)) ||
        d.whatSurprisedUs.toLowerCase().includes(q) ||
        d.whatRepeated.toLowerCase().includes(q) ||
        d.emergingHypotheses.toLowerCase().includes(q) ||
        d.contradictionsObserved.toLowerCase().includes(q) ||
        d.tomorrowPriorities.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [sortedDebriefs, searchQuery]);

  if (sortedDebriefs.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-2xl">
          📓
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-base font-bold text-[var(--foreground)]">
            No field debrief has been recorded for this study yet.
          </h3>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            Use a debrief at the end of a field day or data-collection session to capture surprises, recurring patterns, contradictions, missing perspectives, and tomorrow&apos;s priorities.
          </p>
        </div>
        {!isDemo && (
          <button
            type="button"
            onClick={onCreateNew}
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-blue-600 transition cursor-pointer"
          >
            + Record First Field Debrief
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search debriefs by date, site, attendee, or keyword..."
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none flex-1 min-w-[280px]"
        />
        <span className="text-xs text-[var(--muted)]">
          Showing {filteredDebriefs.length} of {sortedDebriefs.length} debrief sessions
        </span>
      </div>

      {/* Debriefs Timeline List */}
      <div className="space-y-4">
        {filteredDebriefs.map((d) => (
          <div
            key={d.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--border-strong)] transition space-y-3"
          >
            {/* Header row */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[var(--trace)]">
                    {d.id}
                  </span>
                  <span className="text-xs text-[var(--muted)]">•</span>
                  <span className="text-xs font-bold text-[var(--foreground)]">
                    📅 {d.date}
                  </span>
                  <span className="text-xs text-[var(--muted)]">•</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {d.siteIds.map((site) => (
                      <span
                        key={site}
                        className="rounded bg-sky-950/40 border border-sky-800/40 px-1.5 py-0.2 text-[10px] text-sky-300 font-medium"
                      >
                        📍 {site}
                      </span>
                    ))}
                  </div>
                </div>

                {d.attendees.length > 0 && (
                  <p className="text-[11px] text-[var(--muted)] mt-1">
                    👥 Team: {d.attendees.join(", ")}
                  </p>
                )}
              </div>

              {/* Counters */}
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="rounded bg-[var(--surface-elevated)] border border-[var(--border)] px-2 py-0.5 text-[var(--foreground)] font-mono">
                  {d.linkedSourceIds?.length || 0} sources
                </span>
                <span className="rounded bg-[var(--surface-elevated)] border border-[var(--border)] px-2 py-0.5 text-[var(--foreground)] font-mono">
                  {d.linkedEvidenceIds?.length || 0} observations
                </span>
                <span className="rounded bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 text-amber-300 font-mono font-medium">
                  {d.tomorrowPriorities?.length || 0} priorities
                </span>
              </div>
            </div>

            {/* Reflection Snippets */}
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              {/* Surprise */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                  ⚡ What surprised us
                </span>
                <p className="text-[11px] text-[var(--foreground)] line-clamp-2 leading-relaxed">
                  {d.whatSurprisedUs}
                </p>
              </div>

              {/* Emerging Hypothesis */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    💡 Emerging Hypothesis
                  </span>
                  <span className="text-[9px] text-amber-400 font-medium">Working theory</span>
                </div>
                <p className="text-[11px] text-[var(--foreground)] line-clamp-2 leading-relaxed">
                  {d.emergingHypotheses || "None recorded for this session."}
                </p>
              </div>
            </div>

            {/* Contradiction note if present */}
            {d.contradictionsObserved && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-2.5 text-xs flex items-start gap-2">
                <span className="text-amber-400 text-xs mt-0.5">⚖️</span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-amber-300 text-[11px]">
                    Contradiction noted:
                  </span>{" "}
                  <span className="text-[11px] text-[var(--foreground)] line-clamp-1">
                    {d.contradictionsObserved}
                  </span>
                </div>
              </div>
            )}

            {/* Tomorrow Priorities Sneak Peek */}
            {d.tomorrowPriorities.length > 0 && (
              <div className="text-[11px] text-[var(--muted)] flex items-center gap-1.5 pt-1">
                <span className="font-semibold text-[var(--trace)]">🎯 Tomorrow:</span>
                <span className="truncate">
                  {d.tomorrowPriorities[0]}
                  {d.tomorrowPriorities.length > 1 && ` (+${d.tomorrowPriorities.length - 1} more)`}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs">
              <span className="text-[10px] text-[var(--muted)]">
                Logged {new Date(d.createdAt).toLocaleDateString()}
              </span>

              <div className="flex items-center gap-2">
                {!isDemo && (
                  <button
                    type="button"
                    onClick={() => onEditDebrief(d)}
                    className="rounded border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:border-[var(--trace)] hover:text-[var(--foreground)] transition cursor-pointer"
                  >
                    ✎ Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectDebrief(d.id)}
                  className="rounded bg-[var(--surface-elevated)] border border-[var(--border-strong)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--trace)] hover:text-[var(--trace)] transition cursor-pointer"
                >
                  View Full Reflections &rarr;
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
