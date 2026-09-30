"use client";

import React, { useState } from "react";
import type { WorkspaceTabId } from "@/components/FieldLearningStudioApp";
import type { StudyReadinessResult, ReadinessCheckItem } from "@/lib/analytics/studyReadiness";

interface StudyReadinessBannerProps {
  readiness: StudyReadinessResult;
  onNavigateToTab: (tabId: WorkspaceTabId) => void;
}

export function StudyReadinessBanner({
  readiness,
  onNavigateToTab,
}: StudyReadinessBannerProps) {
  const [isExpanded, setIsExpanded] = useState(readiness.state !== "ready");
  const [previousState, setPreviousState] = useState(readiness.state);

  if (readiness.state !== previousState) {
    setPreviousState(readiness.state);
    setIsExpanded(readiness.state !== "ready");
  }

  const stateColors: Record<
    StudyReadinessResult["state"],
    { bg: string; border: string; text: string; badgeBg: string; badgeText: string; icon: string }
  > = {
    ready: {
      bg: "bg-[var(--success-surface)]",
      border: "border-[var(--success-border)]",
      text: "text-[var(--success)]",
      badgeBg: "bg-[var(--success-muted)]",
      badgeText: "text-[var(--success)]",
      icon: "✓",
    },
    needs_attention: {
      bg: "bg-[var(--warning-surface)]",
      border: "border-[var(--warning-border)]",
      text: "text-[var(--warning)]",
      badgeBg: "bg-[var(--warning-muted)]",
      badgeText: "text-[var(--warning)]",
      icon: "△",
    },
    incomplete: {
      bg: "bg-[var(--surface-muted)]",
      border: "border-[var(--border)]",
      text: "text-[var(--foreground)]",
      badgeBg: "bg-[var(--surface-raised)]",
      badgeText: "text-[var(--muted)]",
      icon: "○",
    },
  };

  const currentTheme = stateColors[readiness.state];

  return (
    <aside
      aria-label="Study readiness status"
      className={`rounded-xl border ${currentTheme.border} ${currentTheme.bg} p-4 transition-all duration-200 mb-6`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${currentTheme.badgeBg} ${currentTheme.badgeText}`}
            aria-hidden="true"
          >
            {currentTheme.icon}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Study Readiness
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${currentTheme.badgeBg} ${currentTheme.badgeText}`}
              >
                {readiness.stateLabel}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--foreground)]">
              {readiness.summary}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted)]">
            <strong>{readiness.passedCount}</strong> / {readiness.totalCount} checks satisfied
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded px-2.5 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)] border border-[var(--border)] transition-colors"
            aria-expanded={isExpanded}
          >
            {isExpanded ? "Hide Checklist ↑" : "Inspect Checklist ↓"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {readiness.checks.map((check: ReadinessCheckItem) => {
              const categoryNames: Record<ReadinessCheckItem["category"], string> = {
                brief: "Study Brief",
                questions: "Questions & Scope",
                methods: "Methods & Sources",
                framework: "Analytical Framework",
                roles: "Governance & Roles",
              };

              return (
                <div
                  key={check.id}
                  className={`flex flex-col justify-between rounded-lg border p-3 ${
                    check.isSatisfied
                      ? "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                      : check.severity === "critical"
                      ? "border-[var(--danger-border)] bg-[var(--danger-surface)]"
                      : "border-[var(--warning-border)] bg-[var(--warning-surface)]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                        {categoryNames[check.category]}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          check.isSatisfied
                            ? "text-[var(--success)]"
                            : check.severity === "critical"
                            ? "text-[var(--danger)]"
                            : "text-[var(--warning)]"
                        }`}
                      >
                        {check.isSatisfied ? "✓ Satisfied" : check.severity === "critical" ? "✕ Missing" : "△ Optional"}
                      </span>
                    </div>
                    <h5 className="text-xs font-semibold text-[var(--foreground)]">
                      {check.label}
                    </h5>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)] leading-relaxed">
                      {check.description}
                    </p>
                  </div>

                  {!check.isSatisfied && (
                    <button
                      type="button"
                      onClick={() => onNavigateToTab(check.targetTab)}
                      className="mt-2.5 self-start text-[11px] font-semibold text-[var(--trace)] hover:underline"
                    >
                      Define in {categoryNames[check.category]} →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
