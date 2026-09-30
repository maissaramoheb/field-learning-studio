"use client";

import React from "react";

export interface StatusCounts {
  total: number;
  draft: number;
  needsReview: number;
  validated: number;
  rejected: number;
  pending?: number;
  usable?: number;
  needsClarification?: number;
  excluded?: number;
}

interface StatusFilterPillsProps {
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  counts: StatusCounts;
}

export function StatusFilterPills({
  selectedStatus,
  onSelectStatus,
  counts,
}: StatusFilterPillsProps) {
  // Use qualification workflow counts if available, falling back to legacy validation counts
  const pendingCount = counts.pending ?? (counts.draft + counts.needsReview);
  const usableCount = counts.usable ?? counts.validated;
  const needsClarificationCount = counts.needsClarification ?? counts.needsReview;
  const excludedCount = counts.excluded ?? counts.rejected;

  const options = [
    { id: "All", label: "All Material", count: counts.total },
    { id: "pending", label: "Pending Review", count: pendingCount, tone: "amber" },
    { id: "usable", label: "Qualified / Usable", count: usableCount, tone: "emerald" },
    { id: "needs_clarification", label: "Needs Clarification", count: needsClarificationCount, tone: "sky" },
    { id: "excluded", label: "Excluded", count: excludedCount, tone: "rose" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-[var(--muted)] mr-1">
        Qualification Gate:
      </span>
      {options.map((opt) => {
        const isSelected = selectedStatus === opt.id || (opt.id === "All" && selectedStatus === "All");
        let badgeColor = "bg-[var(--surface-muted)] text-[var(--muted)]";

        if (opt.id === "pending") {
          badgeColor = isSelected ? "bg-amber-600 text-white" : "bg-amber-950/40 text-amber-300";
        } else if (opt.id === "usable") {
          badgeColor = isSelected ? "bg-emerald-600 text-white" : "bg-emerald-950/40 text-emerald-300";
        } else if (opt.id === "needs_clarification") {
          badgeColor = isSelected ? "bg-sky-600 text-white" : "bg-sky-950/40 text-sky-300";
        } else if (opt.id === "excluded") {
          badgeColor = isSelected ? "bg-rose-600 text-white" : "bg-rose-950/40 text-rose-300";
        }

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectStatus(opt.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              isSelected
                ? "border-[var(--trace)] bg-[var(--surface-elevated)] text-[var(--foreground)] font-semibold shadow-sm"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
            }`}
          >
            <span>{opt.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${badgeColor}`}
            >
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
