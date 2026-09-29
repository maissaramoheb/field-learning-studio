"use client";

import React from "react";

interface EmptyStudyStateProps {
  onCreateStudy: () => void;
}

export function EmptyStudyState({ onCreateStudy }: EmptyStudyStateProps) {
  return (
    <div className="fls-empty-study-card" data-testid="empty-study-state">
      <div className="max-w-md text-center">
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">
          No studies yet.
        </h3>
        <p className="text-xs text-[var(--muted)] leading-relaxed mb-4">
          Create a study to begin organizing field material, evidence, analysis,
          and professional outputs.
        </p>
        <button
          type="button"
          className="fls-button fls-button-primary"
          onClick={onCreateStudy}
        >
          Create Study
        </button>
      </div>
    </div>
  );
}
