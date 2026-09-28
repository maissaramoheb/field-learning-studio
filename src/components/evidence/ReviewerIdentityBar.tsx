"use client";

import React, { useState } from "react";

interface ReviewerIdentityBarProps {
  reviewerName: string;
  onReviewerNameChange: (name: string) => void;
}

export function ReviewerIdentityBar({
  reviewerName,
  onReviewerNameChange,
}: ReviewerIdentityBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState("");

  const handleStartEditing = () => {
    setTempName(reviewerName);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tempName.trim();
    onReviewerNameChange(trimmed);
    if (typeof window !== "undefined") {
      localStorage.setItem("fls_reviewer_name", trimmed);
    }
    setIsEditing(false);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-[var(--trace)] font-bold">👤 Reviewer Identity:</span>
        {isEditing ? (
          <form onSubmit={handleSave} className="flex items-center gap-2">
            <input
              type="text"
              required
              autoFocus
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="e.g. Lead Evaluator Sarah"
              className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded bg-[var(--trace)] px-2.5 py-1 text-[11px] font-semibold text-[var(--trace-ink)] hover:bg-[var(--trace-text)] cursor-pointer"
            >
              Set
            </button>
            <button
              type="button"
              onClick={() => {
                setTempName("");
                setIsEditing(false);
              }}
              className="rounded border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--muted)] hover:bg-[var(--surface-muted)] cursor-pointer"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            {reviewerName ? (
              <span className="font-semibold text-[var(--foreground)]">
                {reviewerName}
              </span>
            ) : (
              <span className="italic text-amber-400">
                Not set (will prompt upon validation)
              </span>
            )}
            <button
              type="button"
              onClick={handleStartEditing}
              className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted)] hover:border-[var(--trace)] hover:text-[var(--foreground)] cursor-pointer"
            >
              {reviewerName ? "Change" : "Set Name"}
            </button>
          </div>
        )}
      </div>

      <div className="text-[11px] text-[var(--muted)]">
        Human accountability: Validation and rejection decisions are recorded under this name.
      </div>
    </div>
  );
}
