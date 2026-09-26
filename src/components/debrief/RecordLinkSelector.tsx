"use client";

import React, { useState, useMemo } from "react";
import type { SourceRecord, EvidenceEntry } from "@/lib/types";
import { ValidationStatusBadge } from "@/components/evidence/ValidationStatusBadge";

interface RecordLinkSelectorProps {
  sources: SourceRecord[];
  evidence: EvidenceEntry[];
  selectedSourceIds: string[];
  selectedEvidenceIds: string[];
  debriefDate: string;
  onToggleSource: (sourceId: string) => void;
  onToggleEvidence: (evidenceId: string) => void;
}

export function RecordLinkSelector({
  sources,
  evidence,
  selectedSourceIds,
  selectedEvidenceIds,
  debriefDate,
  onToggleSource,
  onToggleEvidence,
}: RecordLinkSelectorProps) {
  const [activeSubTab, setActiveSubTab] = useState<"sources" | "evidence">("sources");
  const [filterTodayOnly, setFilterTodayOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter sources
  const filteredSources = useMemo(() => {
    return sources.filter((src) => {
      if (filterTodayOnly && debriefDate && src.date !== debriefDate) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        src.id.toLowerCase().includes(q) ||
        src.title.toLowerCase().includes(q) ||
        src.location.toLowerCase().includes(q) ||
        src.stakeholderType.toLowerCase().includes(q) ||
        (src.sourceType && src.sourceType.toLowerCase().includes(q))
      );
    });
  }, [sources, filterTodayOnly, debriefDate, searchQuery]);

  // Filter evidence
  const filteredEvidence = useMemo(() => {
    return evidence.filter((ev) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const obs = ev.rawObservation || ev.rawEvidence || "";
      const interp = ev.interpretation || ev.potentialFinding || "";
      return (
        ev.id.toLowerCase().includes(q) ||
        ev.sourceId.toLowerCase().includes(q) ||
        ev.primaryTheme.toLowerCase().includes(q) ||
        obs.toLowerCase().includes(q) ||
        interp.toLowerCase().includes(q)
      );
    });
  }, [evidence, searchQuery]);

  const sourcesTodayCount = useMemo(() => {
    return sources.filter((s) => s.date === debriefDate).length;
  }, [sources, debriefDate]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 text-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
            Grounding & Provenance
          </span>
          <h4 className="font-semibold text-[var(--foreground)] text-sm">
            Link Field Material to this Debrief
          </h4>
          <p className="text-[11px] text-[var(--muted)] mt-0.5">
            Explicitly link today&apos;s sources and observations. Records are referenced, not altered or validated.
          </p>
        </div>

        {/* Tab switch and selection counter */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
            <button
              type="button"
              onClick={() => setActiveSubTab("sources")}
              className={`rounded px-2.5 py-1 text-xs font-semibold cursor-pointer transition ${
                activeSubTab === "sources"
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Sources ({selectedSourceIds.length} linked)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("evidence")}
              className={`rounded px-2.5 py-1 text-xs font-semibold cursor-pointer transition ${
                activeSubTab === "evidence"
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Evidence ({selectedEvidenceIds.length} linked)
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            activeSubTab === "sources"
              ? "Search sources by ID, title, site, stakeholder..."
              : "Search evidence by ID, theme, observation..."
          }
          className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none flex-1 min-w-[240px]"
        />

        {activeSubTab === "sources" && debriefDate && (
          <label className="flex items-center gap-2 text-xs text-[var(--foreground)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterTodayOnly}
              onChange={(e) => setFilterTodayOnly(e.target.checked)}
              className="accent-[var(--accent)] rounded"
            />
            <span className="text-[11px] text-[var(--muted)]">
              Show only session date ({debriefDate}){" "}
              <span className="font-semibold text-[var(--foreground)]">({sourcesTodayCount})</span>
            </span>
          </label>
        )}
      </div>

      {/* Content: Sources List */}
      {activeSubTab === "sources" && (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {filteredSources.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-center text-xs text-[var(--muted)]">
              {filterTodayOnly && sourcesTodayCount === 0
                ? `No source records collected on ${debriefDate}. Uncheck the date filter above to link sources from other days.`
                : "No source records match the search filter."}
            </div>
          ) : (
            filteredSources.map((src) => {
              const isSelected = selectedSourceIds.includes(src.id);
              return (
                <label
                  key={src.id}
                  className={`flex items-start gap-3 rounded-lg border p-2.5 transition cursor-pointer select-none ${
                    isSelected
                      ? "border-[var(--trace)] bg-[var(--trace-wash)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSource(src.id)}
                    className="mt-0.5 accent-[var(--accent)] rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-[var(--trace-text)]">
                        {src.id}
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--foreground)] truncate">
                        {src.title}
                      </span>
                      <span className="text-[10px] text-[var(--muted)] ml-auto">
                        📅 {src.date}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[var(--muted)]">
                      <span>📍 {src.location}</span>
                      <span>•</span>
                      <span>👥 {src.stakeholderType}</span>
                      <span>•</span>
                      <span>📋 {src.sourceType}</span>
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>
      )}

      {/* Content: Evidence List */}
      {activeSubTab === "evidence" && (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {filteredEvidence.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-center text-xs text-[var(--muted)]">
              No evidence observations match the search filter.
            </div>
          ) : (
            filteredEvidence.map((ev) => {
              const isSelected = selectedEvidenceIds.includes(ev.id);
              return (
                <label
                  key={ev.id}
                  className={`flex items-start gap-3 rounded-lg border p-2.5 transition cursor-pointer select-none ${
                    isSelected
                      ? "border-[var(--trace)] bg-[var(--trace-wash)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleEvidence(ev.id)}
                    className="mt-0.5 accent-[var(--accent)] rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-[var(--trace-text)]">
                        {ev.id}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--muted)]">
                        from {ev.sourceId}
                      </span>
                      <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.2 text-[10px] text-[var(--muted-strong)] border border-[var(--border)] font-medium">
                        {ev.primaryTheme}
                      </span>
                      <div className="ml-auto">
                        <ValidationStatusBadge
                          status={ev.validationStatus}
                          revision={ev.revision}
                        />
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--foreground)] line-clamp-2">
                      {ev.rawObservation || ev.rawEvidence}
                    </p>
                  </div>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
