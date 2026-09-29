"use client";

import React from "react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import type {
  PractitionerSpaceId,
  WorkspaceTabId,
  PractitionerSpace,
} from "@/components/FieldLearningStudioApp";
import { PRACTITIONER_SPACES, getSpaceForTab } from "@/components/FieldLearningStudioApp";
import type { FieldStudy, StudyMeta } from "@/lib/types";

interface StudyWorkspaceHeaderProps {
  currentStudy: FieldStudy | null;
  activeStudyMeta?: StudyMeta | null;
  activeTab: WorkspaceTabId;
  onTabChange: (tabId: WorkspaceTabId) => void;
  onBackToLibrary: () => void;
  onCreateNewStudy?: () => void;
  onOpenBackupRestore?: () => void;
  evidenceCount?: number;
  findingsCount?: number;
  recommendationsCount?: number;
}

function handleNavigationKeys(event: React.KeyboardEvent<HTMLDivElement>) {
  const buttons = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
  );
  const index = buttons.indexOf(event.target as HTMLButtonElement);
  if (index < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
  const forward = event.key === (rtl ? "ArrowLeft" : "ArrowRight");
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
      ? buttons.length - 1
      : (index + (forward ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next]?.focus();
  buttons[next]?.click();
}

export function StudyWorkspaceHeader({
  currentStudy,
  activeStudyMeta,
  activeTab,
  onTabChange,
  onBackToLibrary,
  onCreateNewStudy,
  onOpenBackupRestore,
  evidenceCount,
  findingsCount,
  recommendationsCount,
}: StudyWorkspaceHeaderProps) {
  const activeSpaceId = getSpaceForTab(activeTab);
  const activeSpace: PractitionerSpace =
    PRACTITIONER_SPACES.find((s) => s.id === activeSpaceId) ||
    PRACTITIONER_SPACES[0];

  const studyTitle = currentStudy?.title || activeStudyMeta?.title || "Active Field Study";
  const isDemoCase = Boolean(currentStudy?.isDemoCase ?? activeStudyMeta?.isDemoCase);

  return (
    <header className="fls-app-header" id="study-workspace-header">
      {/* LEVEL 1: Product Brand, Back to Library, Study Context & Utilities */}
      <div className="fls-app-bar">
        <button
          type="button"
          className="fls-back-to-library-btn"
          onClick={onBackToLibrary}
          aria-label="Back to Study Library"
          title="Return to the Study Library"
        >
          <span aria-hidden="true">←</span>
          <span>Study Library</span>
        </button>

        <span className="fls-brand">
          Field Learning <strong>Studio</strong>
        </span>

        <div className="fls-header-study-info">
          <span className="fls-bullet-divider" aria-hidden="true">/</span>
          <span
            className="fls-header-study-title"
            title={studyTitle}
          >
            {studyTitle}
          </span>
          {isDemoCase && (
            <span
              className="fls-badge-demo"
              title="Showcase dataset. Direct edits are disabled; use Clone to create an editable copy."
            >
              Demo Study · Read-Only
            </span>
          )}
        </div>

        <div className="fls-app-utilities">
          <ThemeSwitcher />
          {onOpenBackupRestore && (
            <button
              type="button"
              className="fls-button fls-button-quiet"
              onClick={onOpenBackupRestore}
            >
              Backup / Restore
            </button>
          )}
          {onCreateNewStudy && (
            <button
              type="button"
              className="fls-button fls-button-quiet"
              onClick={onCreateNewStudy}
            >
              + New study
            </button>
          )}
        </div>
      </div>

      {/* LEVEL 2 & LEVEL 3: Practitioner Space Navigation & Sub-Views */}
      <nav
        aria-label="Field Learning Studio practitioner spaces"
        className="fls-space-nav"
      >
        <div className="fls-frame">
          <div
            className="fls-primary-tabs"
            role="tablist"
            aria-label="Practitioner spaces"
            onKeyDown={handleNavigationKeys}
          >
            {PRACTITIONER_SPACES.map((space, idx) => {
              const isActive = space.id === activeSpaceId;
              const count =
                space.id === "field-material"
                  ? evidenceCount
                  : space.id === "analysis"
                  ? findingsCount
                  : space.id === "deliverables"
                  ? recommendationsCount
                  : undefined;

              const purposeLabels: Record<PractitionerSpaceId, string> = {
                study: "Define",
                "field-material": "Capture",
                analysis: "Interpret",
                deliverables: "Communicate",
              };

              return (
                <React.Fragment key={space.id}>
                  {idx > 0 && (
                    <span className="fls-space-arrow self-center" aria-hidden="true">
                      →
                    </span>
                  )}
                  <button
                    role="tab"
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    id={space.id === "study" ? "workspace-tab-overview" : `space-${space.id}`}
                    aria-controls="workspace-panel"
                    data-space-id={space.id}
                    type="button"
                    title={space.description}
                    onClick={() => {
                      if (!isActive) onTabChange(space.defaultTab);
                    }}
                    className="fls-space-tab"
                  >
                    <span className="fls-space-tab-step">{space.stepNumber}.</span>
                    <span>{space.label}</span>
                    <span className="fls-space-tab-purpose">
                      ({purposeLabels[space.id]})
                    </span>
                    {count !== undefined && (
                      <span className="fls-nav-count" aria-hidden="true">
                        {count}
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {activeSpace.tabs.length > 1 && (
            <div
              className="fls-secondary-tabs"
              role="tablist"
              aria-label={`${activeSpace.label} views`}
              onKeyDown={handleNavigationKeys}
            >
              {activeSpace.tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  id={`workspace-tab-${tab.id}`}
                  aria-controls="workspace-panel"
                  data-tab-id={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className="fls-view-tab"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
