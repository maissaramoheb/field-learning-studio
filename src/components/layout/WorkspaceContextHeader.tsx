"use client";

import React from "react";
import type { PractitionerSpaceId, WorkspaceTabId } from "@/components/FieldLearningStudioApp";

export interface WorkspaceContextDefinition {
  stepNumber: string;
  label: string;
  purpose: string;
  mentalModel: string;
  description: string;
  icon: string;
}

export const WORKSPACE_CONTEXT_MAP: Record<PractitionerSpaceId, WorkspaceContextDefinition> = {
  study: {
    stepNumber: "1",
    label: "Study",
    purpose: "DEFINE",
    mentalModel: "Blueprint / Compass",
    description: "Establish study scope, core inquiry questions, operational context, and governance boundaries before entering the field.",
    icon: "🧭",
  },
  "field-material": {
    stepNumber: "2",
    label: "Field Material",
    purpose: "CAPTURE & QUALIFY",
    mentalModel: "Evidence Notebook / Source Tray",
    description: "Intake raw field notes and qualify factual observations with source attribution and review states.",
    icon: "📋",
  },
  analysis: {
    stepNumber: "3",
    label: "Analysis",
    purpose: "INTERPRET & VALIDATE",
    mentalModel: "Analytical Desk / Lens",
    description: "Compare evidence across sites, methods, and stakeholders to develop supported, triangulated analytical claims.",
    icon: "🔬",
  },
  deliverables: {
    stepNumber: "4",
    label: "Deliverables",
    purpose: "COMMUNICATE & DECIDE",
    mentalModel: "Brief / Publication Desk",
    description: "Assemble grounded recommendations and compile professional learning briefs with full evidentiary lineage.",
    icon: "📄",
  },
};

interface WorkspaceContextHeaderProps {
  spaceId: PractitionerSpaceId;
  activeTab: WorkspaceTabId;
  tabLabel?: string;
}

export function WorkspaceContextHeader({
  spaceId,
  tabLabel,
}: WorkspaceContextHeaderProps) {
  const context = WORKSPACE_CONTEXT_MAP[spaceId] || WORKSPACE_CONTEXT_MAP.study;

  return (
    <aside
      className="fls-workspace-context-header"
      data-space={spaceId}
      aria-label={`Workspace context: ${context.label}`}
    >
      <div className="fls-workspace-context-meta">
        <div className="flex items-center gap-2">
          <span className="fls-workspace-badge" data-space={spaceId}>
            <span aria-hidden="true">{context.icon}</span>
            <span>{context.stepNumber}. {context.label}</span>
            <span className="opacity-50">·</span>
            <span>{context.purpose}</span>
          </span>
          {tabLabel && (
            <span className="fls-workspace-context-title">
              {tabLabel}
            </span>
          )}
        </div>
        <span className="fls-workspace-context-purpose">
          {context.description}
        </span>
      </div>

      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <span className="fls-workspace-context-model">
          {context.mentalModel}
        </span>
      </div>
    </aside>
  );
}
