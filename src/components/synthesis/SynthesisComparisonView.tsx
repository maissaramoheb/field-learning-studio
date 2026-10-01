"use client";

import { isEvidenceEligibleForAnalysis } from "@/lib/storage/normalization";

import React, { useState, useMemo } from "react";
import type {
  EvidenceEntry,
  EvidenceEntryId,
  SourceRecord,
  StudyScopeConfig,
  StudyQuestion,
} from "@/lib/types";

interface SynthesisComparisonViewProps {
  evidence: EvidenceEntry[];
  sources: SourceRecord[];
  scope: StudyScopeConfig;
  questions: StudyQuestion[];
  selectedEvidenceIds: EvidenceEntryId[];
  isDemoCase: boolean;
  onToggleSelectEvidence: (id: EvidenceEntryId) => void;
  onSelectAllGroup: (ids: EvidenceEntryId[]) => void;
  onInspectEvidence: (id: string) => void;
  onAssignQuestionToEntry: (evidenceId: EvidenceEntryId, questionId: string) => void;
}

export type ComparisonDimension = "site" | "stakeholder" | "method" | "theme" | "matrix";

export function SynthesisComparisonView({
  evidence,
  sources,
  scope,
  questions,
  selectedEvidenceIds,
  isDemoCase,
  onToggleSelectEvidence,
  onSelectAllGroup,
  onInspectEvidence,
  onAssignQuestionToEntry,
}: SynthesisComparisonViewProps) {
  const [dimension, setDimension] = useState<ComparisonDimension>("site");
  const [showNonValidated, setShowNonValidated] = useState(false);

  // Map sources for fast lookup
  const sourceMap = useMemo(() => {
    const map = new Map<string, SourceRecord>();
    for (const s of sources) {
      map.set(s.id, s);
    }
    return map;
  }, [sources]);

  // Validation breakdown
  const validatedEvidence = useMemo(
    () => evidence.filter((e) => isEvidenceEligibleForAnalysis(e)),
    [evidence]
  );
  const needsReviewCount = useMemo(
    () => evidence.filter((e) => e.validationStatus === "Needs Review").length,
    [evidence]
  );
  const draftCount = useMemo(
    () => evidence.filter((e) => e.validationStatus === "Draft").length,
    [evidence]
  );
  const rejectedCount = useMemo(
    () => evidence.filter((e) => e.validationStatus === "Rejected").length,
    [evidence]
  );

  // Active items to display: validated by default, or all if toggled
  const activeItems = useMemo(
    () => (showNonValidated ? evidence : validatedEvidence),
    [showNonValidated, evidence, validatedEvidence]
  );

  // Target dimensions from scope
  const targetSites = useMemo(() => scope.targetSites || [], [scope.targetSites]);
  const targetStakeholders = useMemo(
    () => scope.targetStakeholderGroups || [],
    [scope.targetStakeholderGroups]
  );

  // Grouping by Site
  const siteGroups = useMemo(() => {
    const groups = new Map<string, EvidenceEntry[]>();
    for (const site of targetSites) {
      groups.set(site, []);
    }
    for (const entry of activeItems) {
      const site = entry.siteId?.trim() || "Unspecified Site";
      if (!groups.has(site)) {
        groups.set(site, []);
      }
      groups.get(site)!.push(entry);
    }
    return groups;
  }, [activeItems, targetSites]);

  // Common themes across sites
  const multiSiteThemes = useMemo(() => {
    const themeSites = new Map<string, Set<string>>();
    for (const entry of validatedEvidence) {
      const theme = entry.primaryTheme?.trim();
      const site = entry.siteId?.trim();
      if (theme && site) {
        if (!themeSites.has(theme)) themeSites.set(theme, new Set());
        themeSites.get(theme)!.add(site);
      }
    }
    const common: string[] = [];
    themeSites.forEach((sites, theme) => {
      if (sites.size >= 2) common.push(theme);
    });
    return common;
  }, [validatedEvidence]);

  // Grouping by Stakeholder
  const stakeholderGroups = useMemo(() => {
    const groups = new Map<string, EvidenceEntry[]>();
    for (const sh of targetStakeholders) {
      groups.set(sh, []);
    }
    for (const entry of activeItems) {
      const sh = entry.stakeholderType?.trim() || "Unspecified Stakeholder";
      if (!groups.has(sh)) {
        groups.set(sh, []);
      }
      groups.get(sh)!.push(entry);
    }
    return groups;
  }, [activeItems, targetStakeholders]);

  // Grouping by Method
  const methodGroups = useMemo(() => {
    const groups = new Map<string, EvidenceEntry[]>();
    for (const entry of activeItems) {
      const src = sourceMap.get(entry.sourceId);
      const method = src?.sourceType || "Unspecified Method";
      if (!groups.has(method)) {
        groups.set(method, []);
      }
      groups.get(method)!.push(entry);
    }
    return groups;
  }, [activeItems, sourceMap]);

  // Grouping by Theme
  const themeGroups = useMemo(() => {
    const groups = new Map<string, EvidenceEntry[]>();
    for (const entry of activeItems) {
      const theme = entry.primaryTheme?.trim() || "Uncategorized / No Theme";
      if (!groups.has(theme)) {
        groups.set(theme, []);
      }
      groups.get(theme)!.push(entry);
    }
    return groups;
  }, [activeItems]);

  return (
    <div className="space-y-4">
      {/* Evidence Validation Tally & Dimension Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-[var(--foreground)]">Evidence Base:</span>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 font-bold text-emerald-400">
            {validatedEvidence.length} Validated
          </span>
          {needsReviewCount > 0 && (
            <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 font-semibold text-amber-400">
              {needsReviewCount} Needs Review
            </span>
          )}
          {draftCount > 0 && (
            <span className="rounded-full bg-slate-500/10 border border-slate-500/30 px-2.5 py-0.5 text-[var(--muted)]">
              {draftCount} Draft
            </span>
          )}
          {rejectedCount > 0 && (
            <span className="rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 text-rose-400">
              {rejectedCount} Rejected
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(needsReviewCount > 0 || draftCount > 0 || rejectedCount > 0) && (
            <label className="flex items-center gap-1.5 text-xs text-[var(--muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={showNonValidated}
                onChange={(e) => setShowNonValidated(e.target.checked)}
                className="rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)]"
              />
              Show non-validated for context
            </label>
          )}

          {/* Grouping Selector */}
          <div className="flex flex-wrap items-center rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-1 text-xs">
            <span className="px-2 font-semibold text-[var(--muted)]">Compare by:</span>
            <button
              type="button"
              onClick={() => setDimension("site")}
              className={`rounded px-2.5 py-1 font-semibold transition ${
                dimension === "site"
                  ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border-strong)] shadow-xs"
                  : "text-[var(--muted-soft)] hover:text-[var(--foreground)] border border-transparent"
              }`}
            >
              Site
            </button>
            <button
              type="button"
              onClick={() => setDimension("stakeholder")}
              className={`rounded px-2.5 py-1 font-semibold transition ${
                dimension === "stakeholder"
                  ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border-strong)] shadow-xs"
                  : "text-[var(--muted-soft)] hover:text-[var(--foreground)] border border-transparent"
              }`}
            >
              Stakeholder
            </button>
            <button
              type="button"
              onClick={() => setDimension("method")}
              className={`rounded px-2.5 py-1 font-semibold transition ${
                dimension === "method"
                  ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border-strong)] shadow-xs"
                  : "text-[var(--muted-soft)] hover:text-[var(--foreground)] border border-transparent"
              }`}
            >
              Method
            </button>
            <button
              type="button"
              onClick={() => setDimension("theme")}
              className={`rounded px-2.5 py-1 font-semibold transition ${
                dimension === "theme"
                  ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border-strong)] shadow-xs"
                  : "text-[var(--muted-soft)] hover:text-[var(--foreground)] border border-transparent"
              }`}
            >
              Theme
            </button>
            <button
              type="button"
              onClick={() => setDimension("matrix")}
              className={`rounded px-2.5 py-1 font-semibold transition ${
                dimension === "matrix"
                  ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border-strong)] shadow-xs"
                  : "text-[var(--muted-soft)] hover:text-[var(--foreground)] border border-transparent"
              }`}
            >
              Matrix
            </button>
          </div>
        </div>
      </div>

      {/* Render Selected Dimension View */}
      {dimension === "site" && (
        <div className="space-y-4">
          {/* Cross-Site Common Patterns Highlight */}
          {multiSiteThemes.length > 0 && (
            <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">🌐</span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Common Themes Across Multiple Sites
                </h4>
              </div>
              <p className="mt-1 text-xs text-indigo-200/80">
                The following themes have validated evidence appearing across two or more sites:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {multiSiteThemes.map((thm) => (
                  <span
                    key={thm}
                    className="rounded-md border border-indigo-700/50 bg-indigo-900/40 px-2.5 py-1 text-xs font-semibold text-indigo-200"
                  >
                    {thm}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Site Cards Grid */}
          <div className="fls-comparison-groups">
            {Array.from(siteGroups.values()).some((items) => items.length === 0) && (
              <div className="fls-coverage-summary" role="note" aria-label="Sites without evidence">
                <p className="font-semibold">Missing coverage: no validated evidence for these sites</p>
                <p>{Array.from(siteGroups.entries()).filter(([, items]) => items.length === 0).map(([name]) => name).join(" · ")}</p>
              </div>
            )}

            {Array.from(siteGroups.entries()).filter(([, items]) => items.length > 0).map(([site, items]) => {
              return (
                <div
                  key={site}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-[var(--trace)]">
                          Site
                        </span>
                        <h3 className="text-base font-semibold text-[var(--foreground)]">
                          {site}
                        </h3>
                      </div>
                      <p className="text-xs text-[var(--muted)]">
                        {items.length === 1 ? "1 evidence entry" : `${items.length} evidence entries`}
                      </p>
                    </div>

                    {items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onSelectAllGroup(items.map((i) => i.id))}
                        className="text-xs text-[var(--trace)] hover:underline font-semibold"
                      >
                        Select All
                      </button>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    {items.map((entry) => (
                      <EvidenceRowCard
                        key={entry.id}
                        entry={entry}
                        source={sourceMap.get(entry.sourceId)}
                        isSelected={selectedEvidenceIds.includes(entry.id)}
                        isDemoCase={isDemoCase}
                        questions={questions}
                        onToggleSelect={() => onToggleSelectEvidence(entry.id)}
                        onInspect={() => onInspectEvidence(entry.id)}
                        onAssignQuestion={(qId) => onAssignQuestionToEntry(entry.id, qId)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dimension === "stakeholder" && (
        <div className="fls-comparison-groups">
          {Array.from(stakeholderGroups.values()).some((items) => items.length === 0) && (
            <div className="fls-coverage-summary" role="note" aria-label="Stakeholder groups without evidence">
              <p className="font-semibold">Unrepresented stakeholders: no validated evidence</p>
              <p>{Array.from(stakeholderGroups.entries()).filter(([, items]) => items.length === 0).map(([name]) => name).join(" · ")}</p>
            </div>
          )}

          {Array.from(stakeholderGroups.entries()).filter(([, items]) => items.length > 0).map(([sh, items]) => {
            return (
              <div
                key={sh}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase text-[var(--trace)]">
                        Stakeholder
                      </span>
                      <h3 className="text-base font-semibold text-[var(--foreground)]">
                        {sh}
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {items.length === 1 ? "1 evidence entry" : `${items.length} evidence entries`}
                    </p>
                  </div>

                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onSelectAllGroup(items.map((i) => i.id))}
                      className="text-xs text-[var(--trace)] hover:underline font-semibold"
                    >
                      Select All
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {items.map((entry) => (
                    <EvidenceRowCard
                      key={entry.id}
                      entry={entry}
                      source={sourceMap.get(entry.sourceId)}
                      isSelected={selectedEvidenceIds.includes(entry.id)}
                      isDemoCase={isDemoCase}
                      questions={questions}
                      onToggleSelect={() => onToggleSelectEvidence(entry.id)}
                      onInspect={() => onInspectEvidence(entry.id)}
                      onAssignQuestion={(qId) => onAssignQuestionToEntry(entry.id, qId)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dimension === "method" && (
        <div className="fls-comparison-groups">
          {Array.from(methodGroups.entries()).map(([method, items]) => (
            <div
              key={method}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-[var(--trace)]">
                      Collection Method
                    </span>
                    <h3 className="text-base font-semibold text-[var(--foreground)]">
                      {method}
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {items.length === 1 ? "1 evidence entry" : `${items.length} evidence entries`}
                  </p>
                </div>

                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectAllGroup(items.map((i) => i.id))}
                    className="text-xs text-[var(--trace)] hover:underline font-semibold"
                  >
                    Select All
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {items.map((entry) => (
                  <EvidenceRowCard
                    key={entry.id}
                    entry={entry}
                    source={sourceMap.get(entry.sourceId)}
                    isSelected={selectedEvidenceIds.includes(entry.id)}
                    isDemoCase={isDemoCase}
                    questions={questions}
                    onToggleSelect={() => onToggleSelectEvidence(entry.id)}
                    onInspect={() => onInspectEvidence(entry.id)}
                    onAssignQuestion={(qId) => onAssignQuestionToEntry(entry.id, qId)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {dimension === "theme" && (
        <div className="fls-comparison-groups">
          {Array.from(themeGroups.entries()).map(([theme, items]) => (
            <div
              key={theme}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-[var(--trace)]">
                      Analytical Theme
                    </span>
                    <h3 className="text-base font-semibold text-[var(--foreground)]">
                      {theme}
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {items.length === 1 ? "1 evidence entry" : `${items.length} evidence entries`}
                  </p>
                </div>

                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectAllGroup(items.map((i) => i.id))}
                    className="text-xs text-[var(--trace)] hover:underline font-semibold"
                  >
                    Select All
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {items.map((entry) => (
                  <EvidenceRowCard
                    key={entry.id}
                    entry={entry}
                    source={sourceMap.get(entry.sourceId)}
                    isSelected={selectedEvidenceIds.includes(entry.id)}
                    isDemoCase={isDemoCase}
                    questions={questions}
                    onToggleSelect={() => onToggleSelectEvidence(entry.id)}
                    onInspect={() => onInspectEvidence(entry.id)}
                    onAssignQuestion={(qId) => onAssignQuestionToEntry(entry.id, qId)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {dimension === "matrix" && (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Cross-Tabulation Matrix: Stakeholders vs. Sites
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Identifies evidentiary density and coverage gaps across sites and groups.
            </p>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
                <th className="p-3 font-semibold text-[var(--muted-strong)]">Stakeholder</th>
                {targetSites.map((site) => (
                  <th key={site} className="p-3 font-semibold text-[var(--foreground)]">
                    {site}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {targetStakeholders.map((sh) => (
                <tr key={sh} className="border-b border-[var(--border)] hover:bg-[var(--surface-muted)]/50">
                  <td className="p-3 font-medium text-[var(--foreground)]">{sh}</td>
                  {targetSites.map((site) => {
                    const matching = activeItems.filter(
                      (e) =>
                        (e.stakeholderType?.trim() || "") === sh &&
                        (e.siteId?.trim() || "") === site
                    );
                    return (
                      <td key={site} className="p-3">
                        {matching.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {matching.map((e) => (
                              <button
                                type="button"
                                key={e.id}
                                onClick={() => onInspectEvidence(e.id)}
                                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                  selectedEvidenceIds.includes(e.id)
                                    ? "bg-[var(--trace)] text-slate-950"
                                    : "bg-[var(--surface-muted)] text-[var(--trace)] border border-[var(--trace)]/30 hover:bg-[var(--trace-wash)]"
                                }`}
                              >
                                {e.id}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] italic text-amber-400/80">Gap (0)</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Compact Evidence Card Component for Comparison Columns
function EvidenceRowCard({
  entry,
  source,
  isSelected,
  isDemoCase,
  questions,
  onToggleSelect,
  onInspect,
  onAssignQuestion,
}: {
  entry: EvidenceEntry;
  source?: SourceRecord;
  isSelected: boolean;
  isDemoCase: boolean;
  questions: StudyQuestion[];
  onToggleSelect: () => void;
  onInspect: () => void;
  onAssignQuestion: (questionId: string) => void;
}) {
  const isNonValidated = entry.validationStatus && entry.validationStatus !== "Validated";
  const hasContradictions = Boolean(entry.contradictionIds && entry.contradictionIds.length > 0);

  return (
    <div
      className={`rounded-lg border p-3.5 transition flex flex-col justify-between ${
        isSelected
          ? "border-[var(--trace)] bg-[var(--trace-wash)] shadow-sm"
          : isNonValidated
          ? "border-slate-800 bg-slate-950/30 opacity-70"
          : "border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--border-strong)]"
      }`}
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!isNonValidated && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggleSelect}
                aria-label={`Select evidence ${entry.id}`}
                className="h-4 w-4 rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)] cursor-pointer"
              />
            )}
            <button
              type="button"
              onClick={onInspect}
              className="font-mono text-xs font-bold text-[var(--trace)] hover:underline"
            >
              {entry.id}
            </button>
            {source && (
              <span className="text-[11px] text-[var(--muted)]">
                via <span className="font-mono text-[10px]">{source.id}</span> ({source.sourceType})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {entry.validationStatus && entry.validationStatus !== "Validated" && (
              <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-400">
                {entry.validationStatus}
              </span>
            )}
            <span className="rounded bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
              {entry.primaryTheme}
            </span>
          </div>
        </div>

        {/* Observation text */}
        <p className="mt-2 text-xs leading-5 text-[var(--foreground)]">
          {entry.rawObservation || entry.rawEvidence}
        </p>

        {entry.potentialFinding && (
          <p className="mt-1.5 text-[11px] leading-4 text-[var(--muted)] italic">
            Interpretation: {entry.potentialFinding}
          </p>
        )}

        {hasContradictions && (
          <div className="mt-2 flex items-center gap-1.5 rounded border border-rose-900/40 bg-rose-950/20 px-2 py-1 text-[10px] text-rose-300">
            <span>⚡</span>
            <span>Contradiction noted: links to {entry.contradictionIds?.join(", ")}</span>
          </div>
        )}
      </div>

      {/* Footer with mapped questions or quick mapping */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)]/60 pt-2 text-[10px]">
        <div className="flex flex-wrap items-center gap-1">
          {entry.studyQuestionIds && entry.studyQuestionIds.length > 0 ? (
            entry.studyQuestionIds.map((qId) => {
              const matchedQ = questions.find((q) => q.id === qId);
              const isArchived = matchedQ?.isActive === false;
              return (
                <span
                  key={qId}
                  className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                    isArchived
                      ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                      : "bg-[var(--trace)]/15 border border-[var(--trace)]/30 text-[var(--trace)]"
                  }`}
                  title={isArchived ? `${qId} (Archived Question)` : qId}
                >
                  {qId}
                  {isArchived && <span className="ml-1 font-sans text-[8px] font-normal uppercase opacity-75">Archived</span>}
                </span>
              );
            })
          ) : (
            <span className="italic text-amber-400/90">No study question linked</span>
          )}
        </div>

        {!isDemoCase && questions.some((q) => q.isActive !== false) && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) onAssignQuestion(e.target.value);
            }}
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <option value="">+ Assign Question</option>
            {questions
              .filter((q) => q.isActive !== false)
              .map((q) => (
                <option key={q.id} value={q.id}>
                  {q.id} ({q.shortLabel || q.question.slice(0, 20)})
                </option>
              ))}
          </select>
        )}
      </div>
    </div>
  );
}
