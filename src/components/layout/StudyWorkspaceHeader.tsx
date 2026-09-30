"use client";

import React from "react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import type {
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
        <div className="fls-app-bar-context">
          <button
            type="button"
            className="fls-back-to-library-btn"
            onClick={onBackToLibrary}
            aria-label="Back to Study Library"
            title="Return to the Study Library"
          >
            <span aria-hidden="true">←</span>
            <span className="fls-back-btn-label">Study Library</span>
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
                <span className="fls-demo-label-full">Demo Study · Read-Only</span>
                <span className="fls-demo-label-compact" aria-hidden="true">Demo</span>
              </span>
            )}
          </div>
        </div>

        <div className="fls-app-utilities">
          <span className="fls-brand-mobile" aria-hidden="true">
            Field Learning <strong>Studio</strong>
          </span>
          <div className="fls-utilities-group">
            <ThemeSwitcher />
            {onOpenBackupRestore && (
              <button
                type="button"
                className="fls-button fls-button-quiet"
                onClick={onOpenBackupRestore}
                title="Backup / Restore study data"
              >
                Backup / Restore
              </button>
            )}
            {onCreateNewStudy && (
              <button
                type="button"
                className="fls-button fls-button-quiet"
                onClick={onCreateNewStudy}
                title="Create a new study"
              >
                + New study
              </button>
            )}
          </div>
        </div>
      </div>

      {/* LEVEL 2: Mobile Workspace Switcher (< lg) & Local Sub-View Navigation */}
      <nav
        aria-label="Field Learning Studio local views"
        className="fls-space-nav"
      >
        <div className="fls-frame">
          {/* Mobile Workspace Switcher: Visible only on tablet/mobile (< 1024px) */}
          <div
            className="fls-mobile-space-tabs lg:hidden"
            role="tablist"
            aria-label="Mobile practitioner spaces"
          >
            {PRACTITIONER_SPACES.map((space) => {
              const isActive = space.id === activeSpaceId;
              return (
                <button
                  key={space.id}
                  id={`mobile-space-${space.id}`}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => {
                    if (!isActive) onTabChange(space.defaultTab);
                  }}
                  className={`fls-mobile-space-btn ${isActive ? "active" : ""}`}
                >
                  <span className="fls-mobile-space-icon" aria-hidden="true">{space.icon}</span>
                  <span className="fls-mobile-space-name">{space.label}</span>
                </button>
              );
            })}
          </div>

          {/* Local Sub-Views Navigation */}
          {activeSpace.tabs.length > 0 && (
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
