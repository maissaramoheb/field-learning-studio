"use client";

import React from "react";
import type { SourceRecord, FieldStudy } from "@/lib/types";

interface SourceHistoryProps {
  study: FieldStudy;
  activeSourceId: string | null;
  onSelectSource: (source: SourceRecord) => void;
  onStartNewSource: () => void;
  onOpenBulkImport?: () => void;
}

export function SourceHistory({
  study,
  activeSourceId,
  onSelectSource,
  onStartNewSource,
  onOpenBulkImport,
}: SourceHistoryProps) {
  // Count evidence entries per source
  const evidenceCountBySource = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of study.evidence) {
      if (ev.sourceId) {
        map.set(ev.sourceId, (map.get(ev.sourceId) || 0) + 1);
      }
    }
    return map;
  }, [study.evidence]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Sources ({study.sources.length})
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {onOpenBulkImport && (
            <button
              type="button"
              onClick={onOpenBulkImport}
              className="fls-button fls-button-quiet"
              title="Bulk import multiple sources via structured text or CSV/TSV"
            >
              Import
            </button>
          )}
          <button
            type="button"
            onClick={onStartNewSource}
            className="fls-button fls-button-quiet"
          >
            + New note
          </button>
        </div>
      </div>

      {study.sources.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-[var(--border)] p-8 text-center">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            No field notes captured yet
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Begin by capturing your first interview, focus group, or observation note in this study, or import a batch.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onStartNewSource}
              className="rounded bg-[var(--surface-elevated)] border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--trace)] hover:border-[var(--trace)] transition cursor-pointer"
            >
              Start Note Capture
            </button>
            {onOpenBulkImport && (
              <button
                type="button"
                onClick={onOpenBulkImport}
                className="rounded border border-indigo-500/50 bg-indigo-950/30 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/40 transition cursor-pointer"
              >
                ⚡ Bulk Source Import
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
          {study.sources.map((src) => {
            const isSelected = src.id === activeSourceId;
            const evCount = evidenceCountBySource.get(src.id) || 0;

            return (
              <button
                type="button"
                aria-pressed={isSelected}
                key={src.id}
                onClick={() => onSelectSource(src)}
                className={`w-full text-start rounded-md border p-3 transition cursor-pointer ${
                  isSelected
                    ? "border-[var(--trace)] bg-[var(--surface-elevated)] ring-1 ring-[var(--trace)]"
                    : "border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]"
                }`}
              >
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--trace)]">
                      {src.id}
                    </span>
                    <span className="text-[11px] text-[var(--muted)]">•</span>
                    <span className="text-[11px] text-[var(--muted)]">{src.date}</span>
                  </span>

                  <span className="flex items-center gap-1.5">
                    {src.sensitivityFlag && src.sensitivityFlag !== "None" && (
                      <span className="rounded bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                        {src.sensitivityFlag} Sensitivity
                      </span>
                    )}
                    <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--foreground)]">
                      {evCount} {evCount === 1 ? "obs" : "obs"}
                    </span>
                  </span>
                </span>

                <span className="block mt-1.5 text-[13px] leading-5 font-medium text-[var(--foreground)]">
                  {src.title}
                </span>

                <span className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                  <span>{src.sourceType}</span>
                  <span>•</span>
                  <span>{src.stakeholderType}</span>
                  <span>•</span>
                  <span>{src.location || src.siteId}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
