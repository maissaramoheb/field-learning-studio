"use client";

import React, { useState } from "react";
import type {
  FieldStudy,
  StudyMeta,
  FrameworkTheme,
  StudyRoleAssignment,
  AnalyticalFrameworkConfig,
} from "@/lib/types";
import { FrameworkThemeModal } from "./FrameworkThemeModal";
import { StudyRoleModal, ROLE_DEFINITIONS } from "./StudyRoleModal";

interface StudyFrameworkRolesViewProps {
  study: FieldStudy | StudyMeta;
  onRefreshStudy?: () => void;
  onSaveTheme: (theme: FrameworkTheme) => Promise<void>;
  onDeleteTheme: (themeId: string) => Promise<void>;
  onReorderThemes?: (themeIds: string[]) => Promise<void>;
  onUpdateFrameworkConfig?: (config: AnalyticalFrameworkConfig) => Promise<void>;
  onSaveRole: (roleAssignment: StudyRoleAssignment) => Promise<void>;
  onDeleteRole: (roleAssignmentId: string) => Promise<void>;
}

const STARTER_FRAMEWORK_PRESETS: Array<{
  name: string;
  description: string;
  themes: FrameworkTheme[];
}> = [
  {
    name: "General Evaluation Lenses (Relevance, Effectiveness, Impact)",
    description: "Standard criteria for assessing program implementation and outcomes.",
    themes: [
      {
        id: "THM-REL",
        name: "Relevance & Alignment",
        shortLabel: "Relevance",
        description: "Consistency with local stakeholder priorities and operational realities.",
        guidingQuestion: "How well do activities align with community needs?",
        order: 1,
        isActive: true,
      },
      {
        id: "THM-EFF",
        name: "Effectiveness & Access",
        shortLabel: "Effectiveness",
        description: "Achievement of intended short-term outcomes and barrier removal.",
        guidingQuestion: "Are interventions achieving their intended immediate improvements?",
        order: 2,
        isActive: true,
      },
      {
        id: "THM-COH",
        name: "Coherence & Coordination",
        shortLabel: "Coherence",
        description: "Synergy and non-duplication with municipal and partner efforts.",
        guidingQuestion: "How harmoniously do activities integrate with existing services?",
        order: 3,
        isActive: true,
      },
      {
        id: "THM-SUS",
        name: "Sustainability & Local Ownership",
        shortLabel: "Sustainability",
        description: "Community capacity to maintain benefits over time.",
        guidingQuestion: "What mechanisms support continued operation beyond project subsidies?",
        order: 4,
        isActive: true,
      },
    ],
  },
];

export function StudyFrameworkRolesView({
  study,
  onSaveTheme,
  onDeleteTheme,
  onReorderThemes,
  onUpdateFrameworkConfig,
  onSaveRole,
  onDeleteRole,
}: StudyFrameworkRolesViewProps) {
  const isDemo = study.isDemoCase;

  const themes = (study.framework?.themes || []).slice().sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  const roles = study.teamRoles || [];

  // Theme modal state
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<FrameworkTheme | null>(null);

  // Role modal state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<StudyRoleAssignment | null>(null);

  // Framework name/description editor
  const [isEditingFrameworkMeta, setIsEditingFrameworkMeta] = useState(false);
  const [frameworkName, setFrameworkName] = useState(study.framework?.name || "");
  const [frameworkDesc, setFrameworkDesc] = useState(study.framework?.description || "");
  const [isSavingFrameworkMeta, setIsSavingFrameworkMeta] = useState(false);

  const handleSaveFrameworkMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateFrameworkConfig || isDemo) return;

    try {
      setIsSavingFrameworkMeta(true);
      await onUpdateFrameworkConfig({
        name: frameworkName.trim() || undefined,
        description: frameworkDesc.trim() || undefined,
        themes,
      });
      setIsEditingFrameworkMeta(false);
    } catch (err) {
      console.error("Failed to update framework metadata:", err);
    } finally {
      setIsSavingFrameworkMeta(false);
    }
  };

  const handleApplyPreset = async (preset: (typeof STARTER_FRAMEWORK_PRESETS)[0]) => {
    if (!onUpdateFrameworkConfig || isDemo) return;
    if (themes.length > 0 && !confirm("Applying this template will replace existing framework lenses. Continue?")) {
      return;
    }
    await onUpdateFrameworkConfig({
      name: preset.name,
      description: preset.description,
      themes: preset.themes,
    });
  };

  const handleMoveTheme = async (index: number, direction: "up" | "down") => {
    if (!onReorderThemes || isDemo) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= themes.length) return;

    const newOrder = [...themes];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    await onReorderThemes(newOrder.map((t) => t.id));
  };

  return (
    <div className="fls-study-framework-container space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--trace)]">
            Step 1 · DEFINE · Sub-View 4
          </span>
          <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
            Analytical Framework & Governance Roles
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Configure the thematic lenses used to interpret field observations and assign lightweight methodological roles.
          </p>
        </div>
      </div>

      {/* SECTION A: ANALYTICAL FRAMEWORK */}
      <section className="space-y-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--trace-muted)] text-[10px] text-[var(--trace)] font-bold">
                  A
                </span>
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  Analytical Framework & Lenses
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Categories and dimensions through which evidence will be tagged, synthesized, and triangulated.
              </p>
            </div>

            {!isDemo && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingFrameworkMeta(!isEditingFrameworkMeta)}
                  className="rounded border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                >
                  {isEditingFrameworkMeta ? "Done Editing Details" : "✎ Edit Framework Name"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTheme(null);
                    setIsThemeModalOpen(true);
                  }}
                  className="rounded bg-[var(--trace)] px-3 py-1 text-xs font-bold text-white hover:opacity-90"
                >
                  + Add Theme / Lens
                </button>
              </div>
            )}
          </div>

          {/* Epistemic Clarification Callout */}
          <div className="rounded-lg bg-[var(--surface-muted)] border-l-4 border-[var(--border-strong)] p-3 text-xs text-[var(--muted)]">
            <strong className="text-[var(--foreground)] font-semibold">Methodological Boundary:</strong>{" "}
            Framework themes are analytical lenses for categorizing observations and comparing patterns. They are{" "}
            <strong>NOT Findings</strong>, <strong>NOT Conclusions</strong>, and <strong>NOT Evidence</strong>.
          </div>

          {/* Framework Name & Description */}
          {isEditingFrameworkMeta && !isDemo ? (
            <form onSubmit={handleSaveFrameworkMeta} className="space-y-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Framework Name
                </label>
                <input
                  type="text"
                  value={frameworkName}
                  onChange={(e) => setFrameworkName(e.target.value)}
                  placeholder="e.g. Community Peacebuilding & Inclusive Governance Framework"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Framework Description / Methodological Purpose
                </label>
                <textarea
                  rows={2}
                  value={frameworkDesc}
                  onChange={(e) => setFrameworkDesc(e.target.value)}
                  placeholder="Explain why this set of lenses is appropriate for this study..."
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingFrameworkMeta(false)}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--foreground)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFrameworkMeta}
                  className="rounded bg-[var(--trace)] px-3.5 py-1 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isSavingFrameworkMeta ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          ) : (
            study.framework?.name && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                  {study.framework.name}
                </h4>
                {study.framework.description && (
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    {study.framework.description}
                  </p>
                )}
              </div>
            )
          )}

          {/* Themes List */}
          {themes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center">
              <span className="text-2xl" aria-hidden="true">
                🔬
              </span>
              <h4 className="mt-2 text-sm font-bold text-[var(--foreground)]">
                No analytical themes defined yet
              </h4>
              <p className="mx-auto mt-1 max-w-md text-xs text-[var(--muted)] leading-relaxed">
                Analytical lenses allow you to group field observations and compare insights across sites without imposing rigid institutional standards.
              </p>
              {!isDemo && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTheme(null);
                      setIsThemeModalOpen(true);
                    }}
                    className="rounded bg-[var(--trace)] px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90"
                  >
                    + Create Custom Theme
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(STARTER_FRAMEWORK_PRESETS[0])}
                    className="rounded border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                  >
                    Use Standard Evaluation Lenses
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {themes.map((theme, idx) => (
                <div
                  key={theme.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3.5 flex flex-wrap items-start justify-between gap-3 hover:border-[var(--border-strong)] transition-colors"
                >
                  <div className="space-y-1 flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[var(--muted)] border border-[var(--border)]">
                        {theme.id}
                      </span>
                      <h5 className="text-xs font-bold text-[var(--foreground)]">
                        {theme.name}
                      </h5>
                      {theme.shortLabel && (
                        <span className="rounded bg-[var(--trace-muted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--trace)]">
                          {theme.shortLabel}
                        </span>
                      )}
                    </div>

                    {theme.description && (
                      <p className="text-xs text-[var(--muted)] leading-relaxed">
                        {theme.description}
                      </p>
                    )}

                    {theme.guidingQuestion && (
                      <p className="text-[11px] text-[var(--foreground)] italic mt-1">
                        Inquiry prompt: “{theme.guidingQuestion}”
                      </p>
                    )}
                  </div>

                  {!isDemo && (
                    <div className="flex items-center gap-1 self-start">
                      {onReorderThemes && (
                        <>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveTheme(idx, "up")}
                            title="Move Theme Up"
                            className="rounded p-1 text-xs text-[var(--muted)] hover:bg-[var(--surface)] disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={idx === themes.length - 1}
                            onClick={() => handleMoveTheme(idx, "down")}
                            title="Move Theme Down"
                            className="rounded p-1 text-xs text-[var(--muted)] hover:bg-[var(--surface)] disabled:opacity-30"
                          >
                            ↓
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTheme(theme);
                          setIsThemeModalOpen(true);
                        }}
                        className="rounded px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface)] border border-[var(--border)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove theme "${theme.name}"?`)) {
                            onDeleteTheme(theme.id);
                          }
                        }}
                        className="rounded p-1 text-xs text-[var(--danger)] hover:bg-[var(--danger-surface)]"
                        title="Delete Theme"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION B: TEAM & GOVERNANCE */}
      <section className="space-y-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--trace-muted)] text-[10px] text-[var(--trace)] font-bold">
                  B
                </span>
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  Team & Methodological Governance
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Assign methodological roles to ensure accountability for intake, review, synthesis, validation, and publication sign-off.
              </p>
            </div>

            {!isDemo && (
              <button
                type="button"
                onClick={() => {
                  setEditingRole(null);
                  setIsRoleModalOpen(true);
                }}
                className="rounded bg-[var(--trace)] px-3 py-1 text-xs font-bold text-white hover:opacity-90"
              >
                + Assign Study Role
              </button>
            )}
          </div>

          {roles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center">
              <span className="text-2xl" aria-hidden="true">
                👥
              </span>
              <h4 className="mt-2 text-sm font-bold text-[var(--foreground)]">
                No governance roles assigned yet
              </h4>
              <p className="mx-auto mt-1 max-w-md text-xs text-[var(--muted)] leading-relaxed">
                Lightweight role assignments establish methodological accountability without requiring complex system permissions or login accounts.
              </p>
              {!isDemo && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRole(null);
                    setIsRoleModalOpen(true);
                  }}
                  className="mt-4 inline-flex items-center rounded bg-[var(--trace)] px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90"
                >
                  + Assign First Role
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    <th className="py-3 px-4">Role Responsibility</th>
                    <th className="py-3 px-4">Practitioner / Person</th>
                    <th className="py-3 px-4">Phase & Scope</th>
                    <th className="py-3 px-4">Notes / Focus</th>
                    {!isDemo && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {roles.map((r) => {
                    const def = ROLE_DEFINITIONS[r.role] || {
                      label: r.role,
                      phase: "Study Governance",
                      description: "",
                    };

                    return (
                      <tr key={r.id} className="hover:bg-[var(--surface-muted)] transition-colors">
                        <td className="py-3 px-4 font-semibold text-[var(--foreground)]">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="rounded bg-[var(--trace-muted)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--trace)]">
                              {r.role}
                            </span>
                            <span>{def.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-[var(--foreground)]">
                          {r.actor.displayName}
                        </td>
                        <td className="py-3 px-4 text-[var(--muted)]">
                          {def.phase}
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--muted)] max-w-xs">
                          {r.notes || "—"}
                        </td>
                        {!isDemo && (
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRole(r);
                                  setIsRoleModalOpen(true);
                                }}
                                className="text-xs font-semibold text-[var(--trace)] hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Remove role assignment for "${r.actor.displayName}"?`)) {
                                    onDeleteRole(r.id);
                                  }
                                }}
                                className="text-xs text-[var(--danger)] hover:underline"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      {isThemeModalOpen && (
        <FrameworkThemeModal
          isOpen={isThemeModalOpen}
          onClose={() => {
            setIsThemeModalOpen(false);
            setEditingTheme(null);
          }}
          onSave={async (theme) => {
            await onSaveTheme(theme);
            setIsThemeModalOpen(false);
            setEditingTheme(null);
          }}
          existingThemes={themes}
          initialTheme={editingTheme}
        />
      )}

      {isRoleModalOpen && (
        <StudyRoleModal
          isOpen={isRoleModalOpen}
          onClose={() => {
            setIsRoleModalOpen(false);
            setEditingRole(null);
          }}
          onSave={async (roleAssignment) => {
            await onSaveRole(roleAssignment);
            setIsRoleModalOpen(false);
            setEditingRole(null);
          }}
          initialAssignment={editingRole}
        />
      )}
    </div>
  );
}
