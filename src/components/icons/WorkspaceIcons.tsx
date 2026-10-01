"use client";

import React from "react";
import type { PractitionerSpaceId } from "@/components/FieldLearningStudioApp";

export function WorkspaceStudyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fillOpacity={0.15} />
    </svg>
  );
}

export function WorkspaceFieldIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" fill="currentColor" fillOpacity={0.15} />
      <path d="M9 12h6m-6 4h6" />
    </svg>
  );
}

export function WorkspaceAnalysisIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="3" fill="currentColor" fillOpacity={0.15} />
      <circle cx="5" cy="19" r="3" fill="currentColor" fillOpacity={0.15} />
      <circle cx="19" cy="19" r="3" fill="currentColor" fillOpacity={0.15} />
      <line x1="12" y1="8" x2="6.5" y2="16.5" />
      <line x1="12" y1="8" x2="17.5" y2="16.5" />
      <line x1="8" y1="19" x2="16" y2="19" />
    </svg>
  );
}

export function WorkspaceDeliverablesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" fill="currentColor" fillOpacity={0.15} />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

export function WorkspaceSpaceIcon({
  spaceId,
  className = "w-4 h-4",
}: {
  spaceId: PractitionerSpaceId;
  className?: string;
}) {
  switch (spaceId) {
    case "study":
      return <WorkspaceStudyIcon className={className} />;
    case "field-material":
      return <WorkspaceFieldIcon className={className} />;
    case "analysis":
      return <WorkspaceAnalysisIcon className={className} />;
    case "deliverables":
      return <WorkspaceDeliverablesIcon className={className} />;
    default:
      return null;
  }
}
