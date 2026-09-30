"use client";

import type { PractitionerSpaceId } from "@/components/FieldLearningStudioApp";
import { PRACTITIONER_SPACES } from "@/components/FieldLearningStudioApp";

interface WorkspaceLeftRailProps {
  activeSpaceId: PractitionerSpaceId;
  onSpaceChange: (spaceId: PractitionerSpaceId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  sourcesCount?: number;
  evidenceCount?: number;
  findingsCount?: number;
  recommendationsCount?: number;
}

export function WorkspaceLeftRail({
  activeSpaceId,
  onSpaceChange,
  isCollapsed,
  onToggleCollapse,
  sourcesCount,
  evidenceCount,
  findingsCount,
  recommendationsCount,
}: WorkspaceLeftRailProps) {
  const purposeLabels: Record<PractitionerSpaceId, string> = {
    study: "Define",
    "field-material": "Capture & Qualify",
    analysis: "Interpret & Validate",
    deliverables: "Communicate & Decide",
  };

  const spaceAccents: Record<
    PractitionerSpaceId,
    { border: string; bg: string; text: string; dot: string }
  > = {
    study: {
      border: "var(--workspace-study-accent)",
      bg: "var(--workspace-study-wash)",
      text: "var(--workspace-study-text)",
      dot: "bg-blue-400",
    },
    "field-material": {
      border: "var(--workspace-field-accent)",
      bg: "var(--workspace-field-wash)",
      text: "var(--workspace-field-text)",
      dot: "bg-sky-400",
    },
    analysis: {
      border: "var(--workspace-analysis-accent)",
      bg: "var(--workspace-analysis-wash)",
      text: "var(--workspace-analysis-text)",
      dot: "bg-purple-400",
    },
    deliverables: {
      border: "var(--workspace-deliverables-accent)",
      bg: "var(--workspace-deliverables-wash)",
      text: "var(--workspace-deliverables-text)",
      dot: "bg-fuchsia-400",
    },
  };

  return (
    <aside
      aria-label="Primary Workspace Navigation"
      className={`fls-workspace-rail transition-all duration-200 select-none flex flex-col shrink-0 border-r border-[var(--border)] bg-[var(--background-secondary)] ${
        isCollapsed ? "w-[64px]" : "w-[230px]"
      }`}
    >
      {/* Rail Header / Collapse Toggle */}
      <div
        className={`fls-rail-header flex items-center border-b border-[var(--border)] min-h-[44px] px-3 ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!isCollapsed && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-soft)] font-mono">
            Workspaces
          </span>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="fls-rail-toggle-btn p-1.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition flex items-center justify-center"
          title={isCollapsed ? "Expand workspace rail" : "Collapse workspace rail"}
          aria-label={isCollapsed ? "Expand workspace rail" : "Collapse workspace rail"}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Primary Workspace Navigation Items */}
      <nav className="fls-rail-nav flex-1 py-3 px-2 flex flex-col gap-1.5" aria-label="Practitioner Workspaces">
        {PRACTITIONER_SPACES.map((space) => {
          const isActive = space.id === activeSpaceId;
          const accent = spaceAccents[space.id];

          // Secondary metadata quiet counts
          let countLabel: string | null = null;
          if (space.id === "field-material") {
            const ev = evidenceCount ?? 0;
            const src = sourcesCount ?? 0;
            if (ev > 0 || src > 0) {
              countLabel = `${ev} obs · ${src} src`;
            }
          } else if (space.id === "analysis" && findingsCount !== undefined && findingsCount > 0) {
            countLabel = `${findingsCount} findings`;
          } else if (space.id === "deliverables" && recommendationsCount !== undefined && recommendationsCount > 0) {
            countLabel = `${recommendationsCount} recs`;
          }

          const buttonId = space.id === "study" ? "workspace-tab-overview" : `space-${space.id}`;

          return (
            <button
              key={space.id}
              id={buttonId}
              data-space-id={space.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${space.stepNumber}. ${space.label} — ${purposeLabels[space.id]}`}
              title={`${space.stepNumber}. ${space.label} (${purposeLabels[space.id]})${
                countLabel ? ` · ${countLabel}` : ""
              }`}
              onClick={() => onSpaceChange(space.id)}
              className={`fls-rail-item group relative flex items-center rounded-lg transition text-left ${
                isCollapsed
                  ? "justify-center p-2.5"
                  : "px-3 py-2.5 gap-3"
              } ${
                isActive
                  ? "border font-semibold shadow-xs"
                  : "border border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
              }`}
              style={
                isActive
                  ? {
                      borderColor: accent.border,
                      backgroundColor: accent.bg,
                      color: accent.text,
                    }
                  : undefined
              }
            >
              {/* Active Indicator Bar on Left */}
              {isActive && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r"
                  style={{ backgroundColor: accent.border }}
                  aria-hidden="true"
                />
              )}

              {/* Icon & Step Number */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-base" aria-hidden="true">
                  {space.icon}
                </span>
                {isCollapsed && (
                  <span className="text-[10px] font-mono font-bold opacity-80" aria-hidden="true">
                    {space.stepNumber}
                  </span>
                )}
              </div>

              {/* Text content when expanded */}
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 leading-tight">
                    <span className="text-xs font-semibold truncate flex items-center gap-1.5">
                      <span className="text-[11px] font-mono opacity-60 font-medium">
                        {space.stepNumber}.
                      </span>
                      <span>{space.label}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="text-[11px] font-normal opacity-75 truncate">
                      {purposeLabels[space.id]}
                    </span>
                    {countLabel && (
                      <span className="text-[10px] font-mono text-[var(--muted-soft)] font-normal tabular-nums shrink-0">
                        {countLabel}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Hover tooltip when collapsed */}
              {isCollapsed && (
                <div className="fls-rail-tooltip pointer-events-none absolute left-full ml-2 px-2.5 py-1.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity z-50">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span>{space.icon}</span>
                    <span>{space.stepNumber}. {space.label}</span>
                  </div>
                  <div className="text-[11px] text-[var(--muted-soft)] mt-0.5">
                    {purposeLabels[space.id]}
                  </div>
                  {countLabel && (
                    <div className="text-[10px] font-mono text-[var(--muted)] mt-1 pt-1 border-t border-[var(--border)]">
                      {countLabel}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Rail Footer Information */}
      {!isCollapsed ? (
        <div className="fls-rail-footer p-3 border-t border-[var(--border)] text-[11px] text-[var(--muted-soft)]">
          <div className="font-mono text-[10px] uppercase tracking-wider mb-1 font-semibold text-[var(--muted)]">
            Progression
          </div>
          <div className="text-[10.5px] leading-relaxed">
            Define → Capture → Interpret → Decide
          </div>
          <div className="fls-rail-copyright pt-2.5 mt-2.5 border-t border-[var(--border)] text-[11.5px] font-normal text-[var(--muted)] leading-tight select-none">
            <div>© 2026 Maissara Selim</div>
            <div className="text-[11px] text-[var(--muted-soft)] mt-0.5">
              Field Learning Studio. All rights reserved.
            </div>
          </div>
        </div>
      ) : (
        <div className="fls-rail-footer p-2.5 border-t border-[var(--border)] flex justify-center">
          <div
            className="fls-rail-copyright-compact group relative flex items-center justify-center cursor-default text-[11px] font-normal text-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label="© 2026 Maissara Selim. Field Learning Studio. All rights reserved."
            tabIndex={0}
          >
            <span aria-hidden="true">© 2026</span>
            <div
              role="tooltip"
              className="fls-rail-tooltip pointer-events-none absolute left-full ml-2 bottom-0 px-2.5 py-1.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] text-[11.5px] font-normal text-[var(--foreground)] whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity z-50"
            >
              © 2026 Maissara Selim. Field Learning Studio. All rights reserved.
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
