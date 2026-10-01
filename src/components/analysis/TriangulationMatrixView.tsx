"use client";

import React, { useState, useMemo } from "react";
import type {
  FieldStudy,
  EvidenceEntry,
  SourceRecord,
} from "@/lib/types";
import {
  computeTriangulationMatrix,
  type TriangulationRowDimension,
  type TriangulationColumnDimension,
  type TriangulationMatrixCell,
  type CellSignalDescriptor,
} from "@/lib/analytics/triangulation";
import { ViewOriginalSourceModal } from "./ViewOriginalSourceModal";
import { canonicalizeCollectionMethod } from "@/lib/methodTaxonomy";

interface TriangulationMatrixViewProps {
  study: FieldStudy;
  onInspectTrace: (id: string) => void;
  onOpenTab?: (tab: string) => void;
}

export function TriangulationMatrixView({
  study,
  onInspectTrace,
  onOpenTab,
}: TriangulationMatrixViewProps) {
  const [rowDimension, setRowDimension] = useState<TriangulationRowDimension>("theme");
  const [columnDimension, setColumnDimension] = useState<TriangulationColumnDimension>("method");
  const [selectedCell, setSelectedCell] = useState<TriangulationMatrixCell | null>(null);

  // View Original Source Modal
  const [viewSourceModalOpen, setViewSourceModalOpen] = useState(false);
  const [modalEvidence, setModalEvidence] = useState<EvidenceEntry | null>(null);
  const [modalSource, setModalSource] = useState<SourceRecord | null>(null);

  const sources = useMemo(() => study.sources || [], [study.sources]);
  const sourceMap = useMemo(() => {
    const map = new Map<string, SourceRecord>();
    for (const s of sources) {
      map.set(s.id, s);
    }
    return map;
  }, [sources]);

  const matrixResult = useMemo(() => {
    return computeTriangulationMatrix(
      {
        evidence: study.evidence,
        sources: study.sources,
        scope: study.scope,
        frameworkThemes: study.framework?.themes,
        studyQuestions: study.questions,
      },
      rowDimension,
      columnDimension
    );
  }, [study, rowDimension, columnDimension]);

  const getDescriptorBadge = (descriptor: CellSignalDescriptor) => {
    switch (descriptor) {
      case "CONVERGENT":
        return {
          label: "Convergent",
          badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        };
      case "MIXED":
        return {
          label: "Mixed",
          badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        };
      case "DIVERGENT":
        return {
          label: "Divergent",
          badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        };
      case "SPARSE":
        return {
          label: "Sparse",
          badgeClass: "bg-orange-500/15 text-orange-400 border-orange-500/30",
        };
      case "EMPTY":
      default:
        return {
          label: "Empty",
          badgeClass: "bg-slate-500/10 text-slate-500 border-transparent",
        };
    }
  };

  const handleOpenSourceModal = (ev: EvidenceEntry) => {
    const src = sourceMap.get(ev.sourceId) || null;
    setModalEvidence(ev);
    setModalSource(src);
    setViewSourceModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Dimension Switches */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
                Analysis Workspace 2 of 4
              </span>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                {matrixResult.totalQualifiedEvidenceCount} Qualified Observations
              </span>
              <span className="rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                {matrixResult.totalIndependentSourcesCount} Distinct Source Records
              </span>
            </div>
            <h1 className="text-xl font-bold text-[var(--foreground)] mt-1">
              Triangulation Matrix
            </h1>
            <p className="mt-1 text-xs text-[var(--muted)] max-w-3xl leading-relaxed">
              &ldquo;How is the evidence distributed across perspectives, methods, sites, and sources?&rdquo; Cross-tabulate qualified field material to inspect triangulation depth, detect single-source reliance, and verify multi-method convergence.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTab && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenTab("synthesis")}
                  className="rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition cursor-pointer"
                >
                  ← Synthesis Workbench
                </button>
                <button
                  type="button"
                  onClick={() => onOpenTab("findings")}
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition cursor-pointer"
                >
                  Findings Ledger →
                </button>
              </>
            )}
          </div>
        </div>

        {/* Matrix Controls */}
        <div className="mt-5 pt-4 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Row Dimension Switch */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--muted)] mb-1.5">
              Row Dimension (Analytical Framing)
            </label>
            <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-1">
              <button
                type="button"
                onClick={() => setRowDimension("theme")}
                className={`flex-1 rounded py-1.5 text-xs font-medium transition cursor-pointer ${
                  rowDimension === "theme"
                    ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                Framework Themes ({study.framework?.themes?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setRowDimension("question")}
                className={`flex-1 rounded py-1.5 text-xs font-medium transition cursor-pointer ${
                  rowDimension === "question"
                    ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                Study Questions ({study.questions?.length || 0})
              </button>
            </div>
          </div>

          {/* Column Dimension Switch */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--muted)] mb-1.5">
              Column Dimension (Triangulation Vector)
            </label>
            <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-1">
              <button
                type="button"
                onClick={() => setColumnDimension("method")}
                className={`flex-1 rounded py-1.5 text-xs font-medium transition cursor-pointer ${
                  columnDimension === "method"
                    ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                Methods
              </button>
              <button
                type="button"
                onClick={() => setColumnDimension("stakeholder")}
                className={`flex-1 rounded py-1.5 text-xs font-medium transition cursor-pointer ${
                  columnDimension === "stakeholder"
                    ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                Stakeholders
              </button>
              <button
                type="button"
                onClick={() => setColumnDimension("site")}
                className={`flex-1 rounded py-1.5 text-xs font-medium transition cursor-pointer ${
                  columnDimension === "site"
                    ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                Sites
              </button>
              <button
                type="button"
                onClick={() => setColumnDimension("materialCategory")}
                className={`flex-1 rounded py-1.5 text-xs font-medium transition cursor-pointer ${
                  columnDimension === "materialCategory"
                    ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                Category
              </button>
            </div>
          </div>
        </div>

        {/* Epistemic Transparency Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border)] text-[11px] text-[var(--muted)]">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
              <strong>Convergent:</strong> 2+ distinct eligible source records within this intersection with no recorded contradiction; substantive agreement is not assessed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <strong>Mixed:</strong> 2+ distinct eligible source records within this intersection with documented tensions or dissenting observations
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <strong>Divergent:</strong> Conflicting evidence or counter-evidence noted within this intersection
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500/80 inline-block" />
              <strong>Sparse:</strong> 1 observation or single source (limited source-record coverage)
            </span>
          </div>
          <span className="text-[10px] text-[var(--muted)] italic">
            * Cell labels describe source-record coverage and recorded tension inside this intersection; they do not establish truth, confidence, or substantive agreement. Supervisory debriefs are strictly excluded from corroborative source-record counts.
          </span>
        </div>
      </div>

      {/* Cross-Tabulation Grid */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
                <th className="p-3.5 font-semibold text-[var(--foreground)] min-w-[200px] border-r border-[var(--border)] sticky left-0 bg-[var(--surface-muted)] z-10">
                  {rowDimension === "theme" ? "Framework Theme" : "Study Question"}
                </th>
                {matrixResult.columns.map((col) => (
                  <th
                    key={col.id}
                    className="p-3.5 font-semibold text-[var(--foreground)] min-w-[130px] text-center border-r border-[var(--border)] last:border-r-0"
                  >
                    <div>{col.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {matrixResult.rows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--surface-subtle)] transition">
                  <td className="p-3.5 border-r border-[var(--border)] sticky left-0 bg-[var(--surface)] z-10">
                    <div className="font-semibold text-[var(--foreground)]">{row.label}</div>
                    {row.code && (
                      <span className="font-mono text-[10px] text-[var(--trace)] font-bold">
                        {row.code}
                      </span>
                    )}
                    {row.description && (
                      <p className="mt-1 text-[10px] text-[var(--muted)] line-clamp-2">
                        {row.description}
                      </p>
                    )}
                  </td>

                  {matrixResult.columns.map((col) => {
                    const cellKey = `${row.id}__${col.id}`;
                    const cell = matrixResult.cells[cellKey];
                    const descriptorInfo = getDescriptorBadge(cell.descriptor);
                    const isSelected =
                      selectedCell &&
                      selectedCell.rowId === cell.rowId &&
                      selectedCell.columnId === cell.columnId;

                    return (
                      <td
                        key={col.id}
                        role={cell.evidenceCount > 0 ? "button" : undefined}
                        tabIndex={cell.evidenceCount > 0 ? 0 : undefined}
                        aria-label={
                          cell.evidenceCount > 0
                            ? `Intersection ${row.label} and ${col.label}: ${cell.descriptor}, ${cell.evidenceCount} observations across ${cell.independentSourceCount} distinct eligible source records${cell.hasContradictions ? ", tensions present" : ""}`
                            : undefined
                        }
                        aria-pressed={cell.evidenceCount > 0 ? Boolean(isSelected) : undefined}
                        onKeyDown={(e) => {
                          if (cell.evidenceCount > 0 && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault();
                            setSelectedCell(cell);
                          }
                        }}
                        className={`p-3 text-center border-r border-[var(--border)] last:border-r-0 transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                          cell.evidenceCount > 0 ? "cursor-pointer hover:bg-[var(--accent)]/5" : ""
                        } ${isSelected ? "ring-2 ring-[var(--accent)] bg-[var(--accent)]/10" : ""}`}
                        onClick={() => {
                          if (cell.evidenceCount > 0) {
                            setSelectedCell(cell);
                          }
                        }}
                      >
                        {cell.evidenceCount === 0 ? (
                          <span className="text-[var(--muted)] opacity-40">—</span>
                        ) : (
                          <div className="space-y-1.5">
                            <span
                              className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${descriptorInfo.badgeClass}`}
                            >
                              {descriptorInfo.label}
                            </span>
                            <div className="text-[11px] font-semibold text-[var(--foreground)]">
                              {cell.evidenceCount} {cell.evidenceCount === 1 ? "obs" : "obs"}
                            </div>
                            <div className="text-[10px] text-[var(--muted)]">
                              {cell.independentSourceCount} {cell.independentSourceCount === 1 ? "source" : "sources"}
                            </div>
                            {cell.hasContradictions && (
                              <span className="inline-block rounded bg-rose-500/10 text-rose-400 px-1 py-0.2 text-[9px] font-medium">
                                ⚠ {cell.contradictionCount} tension
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cell Drill-down Drawer / Inspection Panel */}
      {selectedCell && (
        <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--surface)] p-5 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Cell Evidence Inspection
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                    getDescriptorBadge(selectedCell.descriptor).badgeClass
                  }`}
                >
                  {getDescriptorBadge(selectedCell.descriptor).label}
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)] mt-0.5">
                {selectedCell.rowLabel} &times; {selectedCell.columnLabel}
              </h3>
              <p className="text-xs text-[var(--muted)]">
                {selectedCell.evidenceCount} qualified observations across {selectedCell.independentSourceCount} distinct eligible source records.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition cursor-pointer"
            >
              Close Inspector ✕
            </button>
          </div>

          {/* Cell Observations List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs max-h-[400px] overflow-y-auto">
            {selectedCell.evidenceItems.map((ev) => {
              const src = sourceMap.get(ev.sourceId);
              const coord = ev.sourceCoordinate;

              return (
                <div
                  key={ev.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onInspectTrace(ev.id)}
                        className="font-mono text-xs font-bold text-[var(--trace)] hover:underline"
                      >
                        {ev.id}
                      </button>
                      <span className="text-[10px] text-[var(--muted)]">
                        via {ev.sourceId}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenSourceModal(ev)}
                      className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      View Source ↗
                    </button>
                  </div>

                  <p className="italic text-[var(--foreground)] leading-5">
                    &ldquo;{ev.rawObservation || ev.rawEvidence}&rdquo;
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border)] text-[10px] text-[var(--muted)]">
                    <span>
                      {src?.sourceType ? canonicalizeCollectionMethod(src.sourceType) : "Observation"}
                      {ev.stakeholderType ? ` · ${ev.stakeholderType}` : ""}
                    </span>
                    {coord?.blockIndex !== undefined && (
                      <span>Block {coord.blockIndex}</span>
                    )}
                    {coord?.csvRowIndex !== undefined && (
                      <span>Row {coord.csvRowIndex + 1}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Original Source Modal */}
      <ViewOriginalSourceModal
        isOpen={viewSourceModalOpen}
        onClose={() => {
          setViewSourceModalOpen(false);
          setModalEvidence(null);
          setModalSource(null);
        }}
        evidence={modalEvidence}
        source={modalSource}
      />
    </div>
  );
}
