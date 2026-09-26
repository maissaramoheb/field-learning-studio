"use client";

import React from "react";

export interface StatusCounts {
  total: number;
  draft: number;
  needsReview: number;
  validated: number;
  rejected: number;
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
  const options = [
    { id: "All", label: "All Evidence", count: counts.total },
    { id: "Draft", label: "Draft", count: counts.draft, tone: "slate" },
    { id: "Needs Review", label: "Needs Review", count: counts.needsReview, tone: "amber" },
    { id: "Validated", label: "Validated", count: counts.validated, tone: "emerald" },
    { id: "Rejected", label: "Rejected", count: counts.rejected, tone: "rose" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-[var(--muted)] mr-1">
        Validation State:
      </span>
      {options.map((opt) => {
        const isSelected = selectedStatus === opt.id;
        let badgeColor = "bg-[var(--surface-muted)] text-[var(--muted)]";

        if (opt.id === "Draft") {
          badgeColor = isSelected ? "bg-slate-700 text-white" : "bg-slate-800/40 text-slate-300";
        } else if (opt.id === "Needs Review") {
          badgeColor = isSelected ? "bg-amber-600 text-white" : "bg-amber-950/40 text-amber-300";
        } else if (opt.id === "Validated") {
          badgeColor = isSelected ? "bg-emerald-600 text-white" : "bg-emerald-950/40 text-emerald-300";
        } else if (opt.id === "Rejected") {
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
