"use client";

import React, { useState } from "react";
import type { DemoCase } from "@/lib/types";

interface DemoStudyCardProps {
  demoCase: DemoCase;
  onOpen: (id: string) => void;
  onClone: (id: string) => Promise<void>;
}

export function DemoStudyCard({
  demoCase,
  onOpen,
  onClone,
}: DemoStudyCardProps) {
  const [isCloning, setIsCloning] = useState(false);

  const handleCloneClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsCloning(true);
      await onClone(demoCase.id);
    } catch (err) {
      console.error("Failed to clone demo study:", err);
    } finally {
      setIsCloning(false);
    }
  };

  const sourcesCount = demoCase.sources?.length ?? 0;
  const evidenceCount = demoCase.evidence?.length ?? 0;
  const findingsCount = demoCase.findings?.length ?? 0;
  const recommendationsCount = demoCase.recommendations?.length ?? 0;

  return (
    <article
      className="fls-study-card"
      data-testid={`demo-card-${demoCase.id}`}
      aria-labelledby={`demo-title-${demoCase.id}`}
    >
      <div className="fls-study-card-top">
        <div className="fls-study-card-meta">
          <span className="fls-badge-demo">
            Showcase Data · Read-Only
          </span>
          <span className="fls-bullet-divider" aria-hidden="true">·</span>
          <span className="text-[var(--muted-soft)]">{demoCase.status || "Reference Case"}</span>
        </div>

        <h3 id={`demo-title-${demoCase.id}`} className="fls-study-card-title">
          {demoCase.project}
        </h3>

        <p className="fls-study-card-desc">
          {demoCase.subtitle || demoCase.context || "Showcase evaluation study"}
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
          onClick={() => onOpen(demoCase.id)}
        >
          Open Demo Study
        </button>
        <button
          type="button"
          className="fls-button fls-button-quiet"
          onClick={handleCloneClick}
          disabled={isCloning}
          title="Clone this showcase dataset into My Studies as a fully editable study"
        >
          {isCloning ? "Cloning..." : "Clone to My Studies"}
        </button>
      </div>
    </article>
  );
}
