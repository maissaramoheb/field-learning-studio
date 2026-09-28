"use client";

import React from "react";
import type { ValidationStatus } from "@/lib/types";

export function ValidationStatusBadge({
  status,
  revision,
}: {
  status?: ValidationStatus;
  revision?: number;
}) {
  const s = status || "Draft";
  let colorClass = "border-[var(--border-strong)] bg-[var(--surface-muted)] text-[var(--muted)]";
  if (s === "Needs Review") {
    colorClass = "border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-text)]";
  } else if (s === "Validated") {
    colorClass = "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success-text)]";
  } else if (s === "Rejected") {
    colorClass = "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-text)]";
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
      >
        {s}
      </span>
      {revision !== undefined && revision > 1 && (
        <span className="rounded border border-[var(--info-border)] bg-[var(--info-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--info-text)]">
          Rev {revision}
        </span>
      )}
    </div>
  );
}
