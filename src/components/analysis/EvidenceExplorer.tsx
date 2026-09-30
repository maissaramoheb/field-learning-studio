"use client";

import React, { useState, useMemo } from "react";
import type {
  EvidenceEntry,
  EvidenceEntryId,
  SourceRecord,
  StudyQuestion,
  FrameworkTheme,
} from "@/lib/types";
import { canonicalizeCollectionMethod, CANONICAL_COLLECTION_METHODS } from "@/lib/methodTaxonomy";

interface EvidenceExplorerProps {
  evidence: EvidenceEntry[];
  sources: SourceRecord[];
  questions: StudyQuestion[];
  frameworkThemes: FrameworkTheme[];
  selectedEvidenceIds: EvidenceEntryId[];
  onToggleSelectEvidence: (id: EvidenceEntryId) => void;
  onSelectAllGroup: (ids: EvidenceEntryId[]) => void;
  onInspectTrace: (id: string) => void;
  onViewOriginalSource: (ev: EvidenceEntry, src: SourceRecord | null) => void;
}

export function EvidenceExplorer({
  evidence,
  sources,
  questions,
  frameworkThemes,
  selectedEvidenceIds,
  onToggleSelectEvidence,
  onSelectAllGroup,
  onInspectTrace,
  onViewOriginalSource,
}: EvidenceExplorerProps) {
  // Filter States
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("all");
  const [selectedThemeId, setSelectedThemeId] = useState<string>("all");
  const [selectedMethod, setSelectedMethod] = useState<string>("all");
  const [selectedStakeholder, setSelectedStakeholder] = useState<string>("all");
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedSensitivity, setSelectedSensitivity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showNonUsable, setShowNonUsable] = useState<boolean>(false);

  const sourceMap = useMemo(() => {
    const map = new Map<string, SourceRecord>();
    for (const s of sources) {
      map.set(s.id, s);
    }
    return map;
  }, [sources]);

  // Unique filter options extracted from live study
  const filterOptions = useMemo(() => {
    const methods = new Set<string>(CANONICAL_COLLECTION_METHODS);
    const stakeholders = new Set<string>();
    const sites = new Set<string>();

    for (const ev of evidence) {
      if (ev.stakeholderType?.trim()) stakeholders.add(ev.stakeholderType.trim());
      if (ev.siteId?.trim()) sites.add(ev.siteId.trim());
      const src = sourceMap.get(ev.sourceId);
      if (src?.sourceType) {
        methods.add(canonicalizeCollectionMethod(src.sourceType));
      }
      if (src?.stakeholderType?.trim()) stakeholders.add(src.stakeholderType.trim());
      if (src?.location?.trim()) sites.add(src.location.trim());
    }

    return {
      methods: Array.from(methods),
      stakeholders: Array.from(stakeholders).sort(),
      sites: Array.from(sites).sort(),
    };
  }, [evidence, sourceMap]);

  // Filtered evidence calculation
  const filteredEvidence = useMemo(() => {
    return evidence.filter((ev) => {
      // 1. Boundary filter: usable vs all
      const isUsable = ev.reviewStatus === "usable" || (!ev.reviewStatus && ev.validationStatus !== "Rejected");
      if (!showNonUsable && !isUsable) {
        return false;
      }

      // 2. Study Question filter
      if (selectedQuestionId !== "all") {
        if (!ev.studyQuestionIds || !ev.studyQuestionIds.includes(selectedQuestionId)) {
          return false;
        }
      }

      // 3. Framework Theme filter
      if (selectedThemeId !== "all") {
        const matchesThemeId = ev.frameworkThemeIds?.includes(selectedThemeId);
        const matchesName = ev.primaryTheme === selectedThemeId || ev.secondaryTheme === selectedThemeId;
        if (!matchesThemeId && !matchesName) {
          return false;
        }
      }

      // 4. Collection Method filter
      const src = sourceMap.get(ev.sourceId);
      if (selectedMethod !== "all") {
        const canonicalMethod = src?.sourceType ? canonicalizeCollectionMethod(src.sourceType) : undefined;
        if (canonicalMethod !== selectedMethod && src?.sourceType !== selectedMethod) {
          return false;
        }
      }

      // 5. Stakeholder filter
      if (selectedStakeholder !== "all") {
        const st = ev.stakeholderType?.trim() || src?.stakeholderType?.trim();
        if (st !== selectedStakeholder) {
          return false;
        }
      }

      // 6. Site filter
      if (selectedSite !== "all") {
        const site = ev.siteId?.trim() || src?.siteId?.trim() || src?.location?.trim();
        if (site !== selectedSite) {
          return false;
        }
      }

      // 7. Sensitivity filter
      if (selectedSensitivity !== "all") {
        if ((ev.sensitivityFlag || "Low") !== selectedSensitivity) {
          return false;
        }
      }

      // 8. Search query text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const text = `${ev.id} ${ev.rawObservation || ""} ${ev.rawEvidence || ""} ${ev.interpretation || ""} ${ev.potentialFinding || ""}`.toLowerCase();
        if (!text.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [
    evidence,
    showNonUsable,
    selectedQuestionId,
    selectedThemeId,
    selectedMethod,
    selectedStakeholder,
    selectedSite,
    selectedSensitivity,
    searchQuery,
    sourceMap,
  ]);

  const activeFiltersCount =
    (selectedQuestionId !== "all" ? 1 : 0) +
    (selectedThemeId !== "all" ? 1 : 0) +
    (selectedMethod !== "all" ? 1 : 0) +
    (selectedStakeholder !== "all" ? 1 : 0) +
    (selectedSite !== "all" ? 1 : 0) +
    (selectedSensitivity !== "all" ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0) +
    (showNonUsable ? 1 : 0);

  const resetFilters = () => {
    setSelectedQuestionId("all");
    setSelectedThemeId("all");
    setSelectedMethod("all");
    setSelectedStakeholder("all");
    setSelectedSite("all");
    setSelectedSensitivity("all");
    setSearchQuery("");
    setShowNonUsable(false);
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredEvidence.map((e) => e.id);
    onSelectAllGroup(visibleIds);
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-muted)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
                Field Evidence Pool
              </span>
              <span className="rounded bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.2 text-[10px] font-semibold text-[var(--muted)]">
                {filteredEvidence.length} / {evidence.length} entries
              </span>
            </div>
            <h3 className="text-sm font-semibold text-[var(--foreground)] mt-0.5">
              Qualified Field Material Explorer
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] underline cursor-pointer"
              >
                Reset filters ({activeFiltersCount})
              </button>
            )}
            <button
              type="button"
              onClick={handleSelectAllVisible}
              className="rounded bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition cursor-pointer"
            >
              Select Visible ({filteredEvidence.length})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search observations by keyword, code, or phrase..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
          />
        </div>

        {/* Filter Pills Grid */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {/* Study Question */}
          <div>
            <label className="block text-[10px] font-medium text-[var(--muted)] mb-1">
              Study Question
            </label>
            <select
              value={selectedQuestionId}
              onChange={(e) => setSelectedQuestionId(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--foreground)]"
            >
              <option value="all">All Study Questions</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.shortLabel || q.id}: {q.question.slice(0, 35)}...
                </option>
              ))}
            </select>
          </div>

          {/* Framework Theme */}
          <div>
            <label className="block text-[10px] font-medium text-[var(--muted)] mb-1">
              Framework Theme
            </label>
            <select
              value={selectedThemeId}
              onChange={(e) => setSelectedThemeId(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--foreground)]"
            >
              <option value="all">All Framework Themes</option>
              {frameworkThemes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Collection Method */}
          <div>
            <label className="block text-[10px] font-medium text-[var(--muted)] mb-1">
              Collection Method
            </label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--foreground)]"
            >
              <option value="all">All Methods</option>
              {filterOptions.methods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Stakeholder */}
          <div>
            <label className="block text-[10px] font-medium text-[var(--muted)] mb-1">
              Stakeholder
            </label>
            <select
              value={selectedStakeholder}
              onChange={(e) => setSelectedStakeholder(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--foreground)]"
            >
              <option value="all">All Stakeholders</option>
              {filterOptions.stakeholders.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Site */}
          <div>
            <label className="block text-[10px] font-medium text-[var(--muted)] mb-1">
              Site / Location
            </label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--foreground)]"
            >
              <option value="all">All Sites</option>
              {filterOptions.sites.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Sensitivity */}
          <div>
            <label className="block text-[10px] font-medium text-[var(--muted)] mb-1">
              Sensitivity
            </label>
            <select
              value={selectedSensitivity}
              onChange={(e) => setSelectedSensitivity(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--foreground)]"
            >
              <option value="all">All Sensitivity Levels</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        {/* Input Boundary Indicator & Non-Usable Toggle */}
        <div className="mt-3 flex items-center justify-between gap-3 pt-2.5 border-t border-[var(--border)] text-[11px]">
          <div className="flex items-center gap-1.5 text-[var(--muted)]">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Default input: <strong>Qualified field material (usable)</strong></span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)] transition select-none">
            <input
              type="checkbox"
              checked={showNonUsable}
              onChange={(e) => setShowNonUsable(e.target.checked)}
              className="rounded border-[var(--border)] text-[var(--accent)]"
            />
            <span>Include pending / excluded records</span>
          </label>
        </div>
      </div>

      {/* Evidence Cards List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredEvidence.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--muted)]">
            No field evidence matches the active filters.
          </div>
        ) : (
          filteredEvidence.map((ev) => {
            const src = sourceMap.get(ev.sourceId);
            const isSelected = selectedEvidenceIds.includes(ev.id);
            const isUsable = ev.reviewStatus === "usable" || (!ev.reviewStatus && ev.validationStatus !== "Rejected");
            const coord = ev.sourceCoordinate;

            return (
              <div
                key={ev.id}
                className={`rounded-xl border p-4 transition text-xs space-y-2.5 ${
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                }`}
              >
                {/* Top Bar: Selector + ID + Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectEvidence(ev.id)}
                      className="rounded border-[var(--border)] text-[var(--accent)] cursor-pointer"
                      aria-label={`Select evidence ${ev.id}`}
                    />
                    <button
                      type="button"
                      onClick={() => onInspectTrace(ev.id)}
                      className="font-mono text-xs font-bold text-[var(--trace)] hover:underline"
                    >
                      {ev.id}
                    </button>
                    {!isUsable && (
                      <span className="rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.2 text-[9px] font-bold uppercase">
                        {ev.reviewStatus || "Non-Usable"}
                      </span>
                    )}
                    {ev.sensitivityFlag && ev.sensitivityFlag !== "Low" && (
                      <span className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 text-[9px] font-semibold">
                        {ev.sensitivityFlag}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px]">
                    {src?.sourceType && (
                      <span className="rounded bg-[var(--surface-muted)] border border-[var(--border)] px-1.5 py-0.5 text-[var(--muted)]">
                        {canonicalizeCollectionMethod(src.sourceType)}
                      </span>
                    )}
                    {(ev.stakeholderType || src?.stakeholderType) && (
                      <span className="rounded bg-[var(--surface-muted)] border border-[var(--border)] px-1.5 py-0.5 text-[var(--muted)]">
                        {ev.stakeholderType || src?.stakeholderType}
                      </span>
                    )}
                    {(ev.siteId || src?.location) && (
                      <span className="rounded bg-[var(--surface-muted)] border border-[var(--border)] px-1.5 py-0.5 text-[var(--muted)]">
                        📍 {ev.siteId || src?.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Excerpt text */}
                <p className="text-[var(--foreground)] leading-5 italic">
                  &ldquo;{ev.rawObservation || ev.rawEvidence}&rdquo;
                </p>

                {/* Interpretation */}
                {(ev.interpretation || ev.potentialFinding) && (
                  <div className="rounded bg-[var(--surface-subtle)] border border-[var(--border)] px-2.5 py-1.5 text-[11px] text-[var(--muted)]">
                    <span className="font-semibold text-[var(--foreground)]">Interpretation: </span>
                    {ev.interpretation || ev.potentialFinding}
                  </div>
                )}

                {/* Bottom Bar: Coordinates + Source Action */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[var(--border)] text-[10px]">
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <span>Source: <strong className="font-mono text-[var(--foreground)]">{ev.sourceId}</strong></span>
                    {coord?.blockIndex !== undefined && (
                      <span>¶ Block {coord.blockIndex}</span>
                    )}
                    {coord?.csvRowIndex !== undefined && (
                      <span>Row {coord.csvRowIndex + 1}</span>
                    )}
                    {coord?.cellAddress && (
                      <span>Cell {coord.cellAddress}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onViewOriginalSource(ev, src || null)}
                    className="rounded bg-[var(--surface-muted)] border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--trace)] hover:bg-[var(--surface-subtle)] transition cursor-pointer"
                  >
                    View Original Source ↗
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
