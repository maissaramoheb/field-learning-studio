"use client";

import React from "react";
import type { StudyMeta } from "@/lib/types";
import type { StudyStats } from "@/lib/storage/studyStore";

interface StudyCardProps {
  study: StudyMeta;
  stats?: StudyStats;
  onOpen: (id: string) => void;
}

function formatDate(timestamp: number): string {
  if (!timestamp) return "Recently updated";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(timestamp));
  } catch {
    return "Recently updated";
  }
}

export function StudyCard({
  study,
  stats,
  onOpen,
}: StudyCardProps) {
  const sourcesCount = stats?.sourcesCount ?? 0;
  const evidenceCount = stats?.evidenceCount ?? 0;
  const findingsCount = stats?.findingsCount ?? 0;
  const recommendationsCount = stats?.recommendationsCount ?? 0;

  return (
    <article
      className="fls-study-card"
      data-testid={`study-card-${study.id}`}
      aria-labelledby={`study-title-${study.id}`}
    >
      <div className="fls-study-card-top">
        <div className="fls-study-card-meta">
          <span className="fls-study-status-badge">
            {study.status || "Active Fieldwork"}
          </span>
          <span className="fls-bullet-divider" aria-hidden="true">·</span>
          <span className="text-[var(--muted-soft)]">
            Updated {formatDate(study.updatedAt || study.createdAt)}
          </span>
        </div>

        <h3 id={`study-title-${study.id}`} className="fls-study-card-title">
          {study.title}
        </h3>

        <p className="fls-study-card-desc">
          {study.subtitle || study.context || "Local field inquiry study"}
        </p>
      </div>

      <div className="fls-study-card-stats" aria-label="Study metrics summary">
        <div className="fls-stat-unit" title="Registered field sources">
          <span className="fls-stat-value">{sourcesCount}</span>
          <span>sources</span>
        </div>
        <div className="fls-stat-unit" title="Qualified field observations">
          <span className="fls-stat-value">{evidenceCount}</span>
          <span>observations</span>
        </div>
        <div className="fls-stat-unit" title="Triangulated findings">
          <span className="fls-stat-value">{findingsCount}</span>
          <span>findings</span>
        </div>
        <div className="fls-stat-unit" title="Policy & programmatic recommendations">
          <span className="fls-stat-value">{recommendationsCount}</span>
          <span>recs</span>
        </div>
      </div>

      <div className="fls-study-card-actions">
        <button
          type="button"
          className="fls-button fls-button-primary flex-1"
          onClick={() => onOpen(study.id)}
        >
          Open Study
        </button>
      </div>
    </article>
  );
}
