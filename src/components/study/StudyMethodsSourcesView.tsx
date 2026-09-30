"use client";

import React, { useState, useMemo } from "react";
import type { FieldStudy, StudyMeta, PlannedMethodTarget, CollectionMethod } from "@/lib/types";
import { PlannedMethodModal } from "./PlannedMethodModal";
import { canonicalizeCollectionMethod, getPlannedTargetSourceCount } from "@/lib/methodTaxonomy";

interface StudyMethodsSourcesViewProps {
  study: FieldStudy | StudyMeta;
  onRefreshStudy?: () => void;
  onSavePlannedMethod: (target: PlannedMethodTarget) => Promise<void>;
  onDeletePlannedMethod: (methodName: string) => Promise<void>;
}

export function StudyMethodsSourcesView({
  study,
  onSavePlannedMethod,
  onDeletePlannedMethod,
}: StudyMethodsSourcesViewProps) {
  const isDemo = study.isDemoCase;

  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<PlannedMethodTarget | null>(null);

  // Live sources & evidence arrays
  const sources = useMemo(() => {
    return ("sources" in study && Array.isArray(study.sources)) ? study.sources : [];
  }, [study]);

  const evidence = useMemo(() => {
    return ("evidence" in study && Array.isArray(study.evidence)) ? study.evidence : [];
  }, [study]);

  // Planned methods list
  const plannedMethods: PlannedMethodTarget[] = useMemo(() => {
    if (study.scope?.plannedMethods && study.scope.plannedMethods.length > 0) {
      return study.scope.plannedMethods;
    }
    if (study.scope?.expectedMethods && study.scope.expectedMethods.length > 0) {
      return study.scope.expectedMethods.map((m: CollectionMethod) => ({
        method: m,
        targetSourceCount: 0,
      }));
    }
    return [];
  }, [study.scope]);

  // Dynamic reconciliation: actual counts by method using canonical method taxonomy
  const methodReconciliation = useMemo(() => {
    // 1. Group actual source records by canonical collection method
    const counts = new Map<string, { sourcesCount: number; evidenceCount: number }>();

    for (const src of sources) {
      const canonMethod = canonicalizeCollectionMethod(src.sourceType);
      const existing = counts.get(canonMethod) || { sourcesCount: 0, evidenceCount: 0 };
      existing.sourcesCount += 1;
      counts.set(canonMethod, existing);
    }

    // 2. Count usable evidence items (excluding excluded/rejected)
    for (const ev of evidence) {
      if (ev.reviewStatus === "excluded" || ev.validationStatus === "Rejected") {
        continue;
      }
      const src = sources.find((s) => s.id === ev.sourceId);
      const canonMethod = canonicalizeCollectionMethod(src?.sourceType);
      const existing = counts.get(canonMethod) || { sourcesCount: 0, evidenceCount: 0 };
      existing.evidenceCount += 1;
      counts.set(canonMethod, existing);
    }

    // 3. Canonicalize planned methods map
    const plannedMap = new Map<string, PlannedMethodTarget>();
    for (const p of plannedMethods) {
      const canon = canonicalizeCollectionMethod(p.method);
      const existingP = plannedMap.get(canon);
      if (!existingP || getPlannedTargetSourceCount(p) > getPlannedTargetSourceCount(existingP)) {
        plannedMap.set(canon, p);
      }
    }

    // Combine planned and observed methods
    const allCanonicalMethods = new Set<string>();
    plannedMap.forEach((_, canon) => allCanonicalMethods.add(canon));
    counts.forEach((_, canon) => allCanonicalMethods.add(canon));

    return Array.from(allCanonicalMethods).map((canonName) => {
      const planned = plannedMap.get(canonName);
      const targetCount = planned ? getPlannedTargetSourceCount(planned) : undefined;
      const actual = counts.get(canonName) || { sourcesCount: 0, evidenceCount: 0 };

      let statusLabel = "No target set";
      let statusColor = "text-[var(--muted)]";

      if (targetCount !== undefined && targetCount > 0) {
        if (actual.sourcesCount >= targetCount) {
          statusLabel = "Target Reached";
          statusColor = "text-[var(--success)] font-semibold";
        } else if (actual.sourcesCount > 0) {
          statusLabel = `${actual.sourcesCount} of ${targetCount}`;
          statusColor = "text-[var(--warning)] font-semibold";
        } else {
          statusLabel = `0 of ${targetCount}`;
          statusColor = "text-[var(--danger)]";
        }
      } else if (actual.sourcesCount > 0) {
        statusLabel = `${actual.sourcesCount} collected`;
        statusColor = "text-[var(--foreground)]";
      }

      return {
        name: canonName,
        rawMethod: planned?.method || canonName,
        targetSourceCount: targetCount,
        plannedCount: targetCount,
        description: planned?.description,
        isPlanned: !!planned,
        sourcesCount: actual.sourcesCount,
        evidenceCount: actual.evidenceCount,
        statusLabel,
        statusColor,
      };
    });
  }, [plannedMethods, sources, evidence]);

  // Dynamic reconciliation: actual counts by site
  const siteReconciliation = useMemo(() => {
    const configuredSites = study.scope?.targetSites || [];
    const siteCounts = new Map<string, { sourcesCount: number; evidenceCount: number }>();

    for (const src of sources) {
      const loc = (src.location || "Unspecified").trim();
      const ex = siteCounts.get(loc) || { sourcesCount: 0, evidenceCount: 0 };
      ex.sourcesCount += 1;
      siteCounts.set(loc, ex);
    }

    for (const ev of evidence) {
      const site = (ev.siteId || "Unspecified").trim();
      const ex = siteCounts.get(site) || { sourcesCount: 0, evidenceCount: 0 };
      ex.evidenceCount += 1;
      siteCounts.set(site, ex);
    }

    const allSites = new Set([...configuredSites, ...Array.from(siteCounts.keys())]);

    return Array.from(allSites).map((site) => {
      const actual = siteCounts.get(site) || { sourcesCount: 0, evidenceCount: 0 };
      const isTarget = configuredSites.includes(site);
      return {
        site,
        isTarget,
        sourcesCount: actual.sourcesCount,
        evidenceCount: actual.evidenceCount,
      };
    });
  }, [study.scope?.targetSites, sources, evidence]);

  // Dynamic reconciliation: actual counts by stakeholder group
  const stakeholderReconciliation = useMemo(() => {
    const configuredGroups = study.scope?.targetStakeholderGroups || [];
    const stkCounts = new Map<string, { sourcesCount: number; evidenceCount: number }>();

    for (const src of sources) {
      const stk = (src.stakeholderType || "Unclassified").trim();
      const ex = stkCounts.get(stk) || { sourcesCount: 0, evidenceCount: 0 };
      ex.sourcesCount += 1;
      stkCounts.set(stk, ex);
    }

    for (const ev of evidence) {
      const stk = (ev.stakeholderType || "Unclassified").trim();
      const ex = stkCounts.get(stk) || { sourcesCount: 0, evidenceCount: 0 };
      ex.evidenceCount += 1;
      stkCounts.set(stk, ex);
    }

    const allGroups = new Set([...configuredGroups, ...Array.from(stkCounts.keys())]);

    return Array.from(allGroups).map((group) => {
      const actual = stkCounts.get(group) || { sourcesCount: 0, evidenceCount: 0 };
      const isTarget = configuredGroups.includes(group);
      return {
        group,
        isTarget,
        sourcesCount: actual.sourcesCount,
        evidenceCount: actual.evidenceCount,
      };
    });
  }, [study.scope?.targetStakeholderGroups, sources, evidence]);

  return (
    <div className="fls-study-methods-container space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--trace)]">
            Step 1 · DEFINE · Sub-View 3
          </span>
          <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
            Methods & Collection Design
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Planned inquiry methods, sample targets, and live reconciliation against collected field sources.
          </p>
        </div>

        {!isDemo && (
          <button
            type="button"
            onClick={() => {
              setEditingTarget(null);
              setIsMethodModalOpen(true);
            }}
            className="rounded bg-[var(--trace)] px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
          >
            + Add Planned Method
          </button>
        )}
      </div>

      {/* SECTION 1: METHODS RECONCILIATION TABLE */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)]">
              Methods Plan vs Live Field Intake
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Compares planned collection quotas against live sources registered in the Field Material workspace.
            </p>
          </div>
        </div>

        {methodReconciliation.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-8 text-center">
            <span className="text-2xl" aria-hidden="true">
              📋
            </span>
            <h4 className="mt-2 text-sm font-bold text-[var(--foreground)]">
              No collection methods configured
            </h4>
            <p className="mx-auto mt-1 max-w-md text-xs text-[var(--muted)] leading-relaxed">
              Add the methods you intend to use so Field Learning Studio can compare planned coverage with actual field material.
            </p>
            {!isDemo && (
              <button
                type="button"
                onClick={() => {
                  setEditingTarget(null);
                  setIsMethodModalOpen(true);
                }}
                className="mt-4 inline-flex items-center rounded bg-[var(--trace)] px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90"
              >
                + Add First Collection Method
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status / Strategy</th>
                  <th className="py-3 px-4 text-center">Planned Target</th>
                  <th className="py-3 px-4 text-center">Actual Sources</th>
                  <th className="py-3 px-4 text-center">Actual Observations</th>
                  <th className="py-3 px-4 text-right">Reconciliation</th>
                  {!isDemo && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {methodReconciliation.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[var(--surface-muted)] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[var(--foreground)]">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        {!item.isPlanned && (
                          <span className="rounded bg-[var(--surface-raised)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--muted)] border border-[var(--border)]">
                            Field Emergent
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-[var(--muted)] font-normal mt-0.5 max-w-sm">
                          {item.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[var(--muted)]">
                      {item.isPlanned ? "Planned Method" : "Unplanned Field Intake"}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-[var(--foreground)]">
                      {item.plannedCount !== undefined ? item.plannedCount : "—"}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-[var(--foreground)]">
                      {item.sourcesCount}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-[var(--foreground)]">
                      {item.evidenceCount}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-xs ${item.statusColor}`}>
                        {item.statusLabel}
                      </span>
                    </td>
                    {!isDemo && (
                      <td className="py-3 px-4 text-right">
                        {item.isPlanned && (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const target = plannedMethods.find(
                                  (p) => canonicalizeCollectionMethod(p.method) === item.name
                                );
                                setEditingTarget(target || null);
                                setIsMethodModalOpen(true);
                              }}
                              className="text-xs font-semibold text-[var(--trace)] hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const target = plannedMethods.find(
                                  (p) => canonicalizeCollectionMethod(p.method) === item.name
                                );
                                const targetName = target ? target.method : item.rawMethod;
                                if (confirm(`Remove planned method "${targetName}"?`)) {
                                  onDeletePlannedMethod(targetName);
                                }
                              }}
                              className="text-xs text-[var(--danger)] hover:underline"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 2: SITES & STAKEHOLDER COVERAGE MATRICES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sites Coverage */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                Field Site Coverage
              </h4>
              <p className="text-[11px] text-[var(--muted)]">
                Planned locations vs recorded field material.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[var(--trace)]">
              {siteReconciliation.filter((s) => s.sourcesCount > 0).length} / {siteReconciliation.length} active
            </span>
          </div>

          <div className="divide-y divide-[var(--border)] text-xs">
            {siteReconciliation.map((item, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--muted)] select-none">📍</span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {item.site}
                  </span>
                  {!item.isTarget && (
                    <span className="rounded bg-[var(--surface-raised)] px-1.5 py-0.2 text-[9px] text-[var(--muted)]">
                      Ad-hoc
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-[11px] text-[var(--muted)]">
                    {item.sourcesCount} source{item.sourcesCount === 1 ? "" : "s"}
                  </span>
                  <span className="text-[11px] text-[var(--muted)]">
                    {item.evidenceCount} obs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stakeholder Coverage */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                Stakeholder Coverage
              </h4>
              <p className="text-[11px] text-[var(--muted)]">
                Targeted constituent groups vs recorded sources.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[var(--trace)]">
              {stakeholderReconciliation.filter((s) => s.sourcesCount > 0).length} / {stakeholderReconciliation.length} consulted
            </span>
          </div>

          <div className="divide-y divide-[var(--border)] text-xs">
            {stakeholderReconciliation.map((item, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--muted)] select-none">👥</span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {item.group}
                  </span>
                  {!item.isTarget && (
                    <span className="rounded bg-[var(--surface-raised)] px-1.5 py-0.2 text-[9px] text-[var(--muted)]">
                      Ad-hoc
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-[11px] text-[var(--muted)]">
                    {item.sourcesCount} source{item.sourcesCount === 1 ? "" : "s"}
                  </span>
                  <span className="text-[11px] text-[var(--muted)]">
                    {item.evidenceCount} obs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Planned Method Modal */}
      {isMethodModalOpen && (
        <PlannedMethodModal
          isOpen={isMethodModalOpen}
          onClose={() => {
            setIsMethodModalOpen(false);
            setEditingTarget(null);
          }}
          onSave={async (target) => {
            await onSavePlannedMethod(target);
            setIsMethodModalOpen(false);
            setEditingTarget(null);
          }}
          initialTarget={editingTarget}
        />
      )}
    </div>
  );
}
