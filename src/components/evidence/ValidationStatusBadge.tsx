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
  let colorClass = "border-slate-600 bg-slate-800/60 text-slate-300";
  if (s === "Needs Review") {
    colorClass = "border-amber-500/40 bg-amber-950/40 text-amber-300";
  } else if (s === "Validated") {
    colorClass = "border-emerald-500/40 bg-emerald-950/40 text-emerald-300";
  } else if (s === "Rejected") {
    colorClass = "border-rose-500/40 bg-rose-950/40 text-rose-300";
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
      >
        {s}
      </span>
      {revision !== undefined && revision > 1 && (
        <span className="rounded border border-sky-800/40 bg-sky-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400">
          Rev {revision}
        </span>
      )}
    </div>
  );
}
