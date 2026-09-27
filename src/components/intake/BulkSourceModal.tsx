"use client";

import React, { useState } from "react";
import { getNextSequenceOfSourceIds } from "@/lib/idGenerator";
import { saveSourceBatch, saveStudyMeta } from "@/lib/storage/studyStore";
import { parseStructuredSourceBlocks, type ParsedSourceCandidate } from "@/lib/intake/structuredTextParser";
import {
  parseCsvOrTsv,
  suggestColumnMappings,
  convertTabularRowsToSourceCandidates,
  type StandardSourceField,
  type TabularParseResult,
} from "@/lib/intake/csvParser";
import type { FieldStudy, SourceRecord } from "@/lib/types";

interface BulkSourceModalProps {
  isOpen: boolean;
  study: FieldStudy;
  onClose: () => void;
  onSourcesImported: (sources: SourceRecord[]) => void;
}

type ImportTab = "structured_text" | "tabular";

const SAMPLE_STRUCTURED_TEXT = `---
Title: KII with Minya Head Teacher
Date: 2026-09-20
Site: Minya
Stakeholder: Teachers
Method: Key Informant Interview
Consent: Oral
Anonymization: Pseudonymized
Sensitivity: None

Notes:
Delivery trucks arrived 90 minutes after recess. Teachers noted that morning delays are recurrent during hot weather.
---
---
Title: FGD with Assiut Mothers
Date: 2026-09-21
Site: Assiut
Stakeholder: Parents
Method: Focus Group Discussion
Consent: Oral
Anonymization: Anonymized
Sensitivity: None

Notes:
Parents expressed strong concern that meals arrive cold. Several mothers noted that children were forced to eat during lesson hours.
---`;

export function BulkSourceModal({
  isOpen,
  study,
  onClose,
  onSourcesImported,
}: BulkSourceModalProps) {
  if (!isOpen) return null;

  return (
    <BulkSourceModalContent
      study={study}
      onClose={onClose}
      onSourcesImported={onSourcesImported}
    />
  );
}

function BulkSourceModalContent({
  study,
  onClose,
  onSourcesImported,
}: Omit<BulkSourceModalProps, "isOpen">) {
  const [activeTab, setActiveTab] = useState<ImportTab>("structured_text");

  // Structured Text state
  const [structuredText, setStructuredText] = useState("");

  // Tabular state
  const [tabularText, setTabularText] = useState("");
  const [tabularResult, setTabularResult] = useState<TabularParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<number, StandardSourceField>>({});
  const [filename, setFilename] = useState<string | undefined>(undefined);

  // Workflow steps: 1 = Input, 2 = Mapping (Tabular only), 3 = Preview & Validate, 4 = Receipt
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Candidates & options
  const [candidates, setCandidates] = useState<ParsedSourceCandidate[]>([]);
  const [addSitesToScope, setAddSitesToScope] = useState<Record<string, boolean>>({});
  const [addStakeholdersToScope, setAddStakeholdersToScope] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [receipt, setReceipt] = useState<{
    createdCount: number;
    skippedCount: number;
    warningsCount: number;
  } | null>(null);

  // Parse structured text and advance to Preview
  const handleParseStructured = () => {
    if (!structuredText.trim()) {
      alert("Please paste formatted source blocks first.");
      return;
    }
    const parsed = parseStructuredSourceBlocks(
      structuredText,
      study.scope,
      study.sources
    );
    if (parsed.length === 0) {
      alert("No valid source blocks found. Please ensure blocks are separated by '---'.");
      return;
    }
    setCandidates(parsed);
    initScopeOptions(parsed);
    setStep(3);
  };

  // Parse Tabular data and advance to Mapping
  const handleParseTabular = () => {
    if (!tabularText.trim()) {
      alert("Please paste tabular data or choose a CSV/TSV file first.");
      return;
    }
    const res = parseCsvOrTsv(tabularText);
    if (res.headers.length === 0 || res.rows.length === 0) {
      alert("Could not parse tabular rows. Ensure headers and at least one data row exist.");
      return;
    }
    setTabularResult(res);
    const suggested = suggestColumnMappings(res.headers);
    setColumnMapping(suggested);
    setStep(2);
  };

  // File upload reader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setTabularText(content || "");
    };
    reader.readAsText(file);
  };

  // Convert mapped tabular data to candidates and advance to Preview
  const handleConfirmMapping = () => {
    if (!tabularResult) return;
    const parsed = convertTabularRowsToSourceCandidates(
      tabularResult.rows,
      columnMapping,
      study.scope,
      study.sources,
      new Date().toISOString().slice(0, 10),
      filename
    );
    setCandidates(parsed);
    initScopeOptions(parsed);
    setStep(3);
  };

  // Initialize scope additions
  const initScopeOptions = (items: ParsedSourceCandidate[]) => {
    const sites: Record<string, boolean> = {};
    const stakeholders: Record<string, boolean> = {};
    items.forEach((c) => {
      if (c.scopeMismatches.isNewSite && c.siteId !== "Unspecified Site") {
        sites[c.siteId] = true;
      }
      if (c.scopeMismatches.isNewStakeholder && c.stakeholderType !== "Unspecified Stakeholder") {
        stakeholders[c.stakeholderType] = true;
      }
    });
    setAddSitesToScope(sites);
    setAddStakeholdersToScope(stakeholders);
  };

  // Candidate toggle
  const handleToggleCandidate = (tempId: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.tempId === tempId ? { ...c, isSkipped: !c.isSkipped } : c))
    );
  };

  // Toggle select all
  const handleToggleSelectAll = (select: boolean) => {
    setCandidates((prev) => prev.map((c) => ({ ...c, isSkipped: !select })));
  };

  // Persistence Execution
  const handleExecuteImport = async () => {
    const selected = candidates.filter((c) => !c.isSkipped && c.status !== "error");
    if (selected.length === 0) {
      alert("No valid sources selected for import.");
      return;
    }

    try {
      setIsSaving(true);
      const existingSourceIds = study.sources.map((s) => s.id);
      const newIds = getNextSequenceOfSourceIds(existingSourceIds, selected.length);
      const now = Date.now();

      const newSources: (SourceRecord & { studyId: string })[] = selected.map((c, idx) => ({
        id: newIds[idx],
        studyId: study.id,
        title: c.title,
        date: c.date,
        location: c.siteId,
        siteId: c.siteId,
        stakeholderType: c.stakeholderType,
        sourceType: c.collectionMethod,
        collectorName: c.collectorName,
        consentStatus: c.consentStatus,
        anonymizationStatus: c.anonymizationStatus,
        sensitivityFlag: c.sensitivityFlag,
        summary: c.summary,
        rawText: c.narrative,
        createdAt: now + idx,
        updatedAt: now + idx,
      }));

      // Update study scope if user approved additions for non-skipped candidates
      const selectedSites = new Set(selected.map((c) => c.siteId));
      const selectedStakeholders = new Set(selected.map((c) => c.stakeholderType));
      const newSitesToAdd = Object.keys(addSitesToScope).filter(
        (k) => addSitesToScope[k] && selectedSites.has(k)
      );
      const newStakeholdersToAdd = Object.keys(addStakeholdersToScope).filter(
        (k) => addStakeholdersToScope[k] && selectedStakeholders.has(k)
      );

      if (newSitesToAdd.length > 0 || newStakeholdersToAdd.length > 0) {
        const combinedSites = Array.from(new Set([...study.scope.targetSites, ...newSitesToAdd]));
        const updatedScope = {
          ...study.scope,
          targetSites: combinedSites,
          isSingleSiteStudy: combinedSites.length > 1 ? false : study.scope.isSingleSiteStudy,
          targetStakeholderGroups: Array.from(
            new Set([...study.scope.targetStakeholderGroups, ...newStakeholdersToAdd])
          ),
        };
        await saveStudyMeta({
          ...study,
          scope: updatedScope,
          updatedAt: Date.now(),
        });
      }

      await saveSourceBatch(newSources);

      const skippedCount = candidates.filter((c) => c.isSkipped || c.status === "error").length;
      const warningsCount = selected.reduce((acc, c) => acc + c.warnings.length, 0);

      setReceipt({
        createdCount: newSources.length,
        skippedCount,
        warningsCount,
      });

      onSourcesImported(newSources);
      setStep(4);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to import sources.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = candidates.filter((c) => !c.isSkipped && c.status !== "error").length;
  const duplicateCount = candidates.filter((c) => c.duplicateCheck.isDuplicate).length;
  const warningCount = candidates.filter((c) => c.status === "needs_review").length;
  const errorCount = candidates.filter((c) => c.status === "error").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-source-title"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] p-5 bg-[var(--surface-muted)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
                Bulk Intake Studio
              </span>
              <span className="text-xs text-[var(--muted)]">•</span>
              <span className="text-xs text-[var(--muted)]">Phase 7 Intake Scaler</span>
            </div>
            <h3 id="bulk-source-title" className="text-base font-bold text-[var(--foreground)]">
              Bulk Source Intake & Structured Import
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: Input (Paste / Upload) */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex border-b border-[var(--border)] gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("structured_text")}
                  className={`pb-2.5 text-xs font-semibold transition border-b-2 ${
                    activeTab === "structured_text"
                      ? "border-[var(--trace)] text-[var(--trace)]"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  Structured Text Paste
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("tabular")}
                  className={`pb-2.5 text-xs font-semibold transition border-b-2 ${
                    activeTab === "tabular"
                      ? "border-[var(--trace)] text-[var(--trace)]"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  Tabular Import (CSV / TSV)
                </button>
              </div>

              {activeTab === "structured_text" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--muted)]">
                      Paste multiple structured field note blocks separated by <code className="text-[var(--trace)]">---</code>.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStructuredText(SAMPLE_STRUCTURED_TEXT)}
                      className="text-[11px] font-semibold text-[var(--trace)] hover:underline"
                    >
                      Insert Sample Template
                    </button>
                  </div>

                  <textarea
                    rows={12}
                    value={structuredText}
                    onChange={(e) => setStructuredText(e.target.value)}
                    placeholder="Paste structured blocks here..."
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs font-mono text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--muted)]">
                      Upload a CSV file or paste tabular rows directly from Excel or Google Sheets.
                    </p>
                    {filename && (
                      <span className="text-xs text-[var(--trace)] font-mono">
                        Loaded: {filename}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--trace)]">
                      Choose .csv / .tsv file
                      <input
                        type="file"
                        accept=".csv,.tsv,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-[var(--muted)]">or paste directly below</span>
                  </div>

                  <textarea
                    rows={10}
                    value={tabularText}
                    onChange={(e) => setTabularText(e.target.value)}
                    placeholder="Paste CSV or Tab-separated rows here (including header row)..."
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs font-mono text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Column Mapping (Tabular Only) */}
          {step === 2 && tabularResult && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-[var(--foreground)]">
                  Confirm Column Mapping ({tabularResult.totalRawRows} rows detected)
                </h4>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Map incoming table columns to Field Learning Studio source fields. Unknown or unwanted columns can be set to Ignore.
                </p>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-[var(--muted-strong)]">
                    <tr>
                      <th className="p-2.5">Incoming Header</th>
                      <th className="p-2.5">First Row Sample</th>
                      <th className="p-2.5">Maps To Field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {tabularResult.headers.map((header, idx) => (
                      <tr key={idx} className="hover:bg-[var(--surface-muted)]">
                        <td className="p-2.5 font-mono font-bold text-[var(--foreground)]">
                          {header}
                        </td>
                        <td className="p-2.5 text-[var(--muted)] truncate max-w-xs">
                          {tabularResult.rows[0]?.[idx] || "—"}
                        </td>
                        <td className="p-2.5">
                          <select
                            value={columnMapping[idx] || "ignore"}
                            onChange={(e) =>
                              setColumnMapping((prev) => ({
                                ...prev,
                                [idx]: e.target.value as StandardSourceField,
                              }))
                            }
                            className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--foreground)] focus:outline-none"
                          >
                            <option value="title">Source Title (Required)</option>
                            <option value="narrative">Narrative / Notes</option>
                            <option value="date">Date</option>
                            <option value="siteId">Site / Location</option>
                            <option value="stakeholderType">Stakeholder Group</option>
                            <option value="collectionMethod">Collection Method</option>
                            <option value="collectorName">Collector Name</option>
                            <option value="consentStatus">Consent Status</option>
                            <option value="anonymizationStatus">Anonymization Status</option>
                            <option value="sensitivityFlag">Sensitivity Flag</option>
                            <option value="ignore">— Ignore Column —</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Validation */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Summary Stats Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[var(--foreground)]">
                    {candidates.length} Sources Analyzed
                  </span>
                  <span className="text-xs text-[var(--muted)]">•</span>
                  <span className="rounded bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                    {selectedCount} Ready to Import
                  </span>
                  {warningCount > 0 && (
                    <span className="rounded bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                      {warningCount} Warnings
                    </span>
                  )}
                  {duplicateCount > 0 && (
                    <span className="rounded bg-rose-950/40 border border-rose-800/40 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                      {duplicateCount} Duplicates
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span className="rounded bg-red-950/40 border border-red-800/40 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                      {errorCount} Errors
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-[11px] text-[var(--trace)] hover:underline font-semibold"
                  >
                    Select All
                  </button>
                  <span className="text-[11px] text-[var(--muted)]">/</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-[11px] text-[var(--muted)] hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Safety Summary Banner */}
              <div className="rounded-lg border border-slate-700/40 bg-slate-900/30 p-3 text-xs text-slate-300 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[var(--foreground)]">
                    Narrative Safety Scan:
                  </span>{" "}
                  {candidates.every((c) => !c.safetyScan.hasWarning) ? (
                    <span className="text-emerald-300">
                      No automated warning detected across all {candidates.length} records.
                    </span>
                  ) : (
                    <span className="text-amber-300">
                      {candidates.filter((c) => c.safetyScan.hasWarning).length} of {candidates.length} records flagged for potential sensitive patterns.
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[var(--muted)]">
                  Rule: Does not certify anonymization. Practitioner review required.
                </span>
              </div>

              {/* Scope Mismatch Options */}
              {(Object.keys(addSitesToScope).length > 0 ||
                Object.keys(addStakeholdersToScope).length > 0) && (
                <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3.5 space-y-2 text-xs">
                  <span className="font-bold text-amber-300">
                    ⚠️ Planned Study Scope Mismatch Detected
                  </span>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    Some incoming records reference sites or stakeholder groups not listed in the study&apos;s planned scope. Choose whether to formally expand the planned scope or import records as out-of-scope fieldwork observations:
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {Object.keys(addSitesToScope).map((site) => (
                      <label key={site} className="flex items-center gap-2 cursor-pointer text-amber-100">
                        <input
                          type="checkbox"
                          checked={addSitesToScope[site]}
                          onChange={(e) =>
                            setAddSitesToScope((prev) => ({ ...prev, [site]: e.target.checked }))
                          }
                          className="rounded border-amber-700 text-amber-500 focus:ring-amber-500"
                        />
                        Add <strong className="underline">{site}</strong> to study scope target sites
                      </label>
                    ))}
                    {Object.keys(addStakeholdersToScope).map((stakeholder) => (
                      <label key={stakeholder} className="flex items-center gap-2 cursor-pointer text-amber-100">
                        <input
                          type="checkbox"
                          checked={addStakeholdersToScope[stakeholder]}
                          onChange={(e) =>
                            setAddStakeholdersToScope((prev) => ({
                              ...prev,
                              [stakeholder]: e.target.checked,
                            }))
                          }
                          className="rounded border-amber-700 text-amber-500 focus:ring-amber-500"
                        />
                        Add <strong className="underline">{stakeholder}</strong> to study scope stakeholder groups
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Candidates Preview Table */}
              <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-[var(--muted-strong)] sticky top-0">
                    <tr>
                      <th className="p-2.5 w-10 text-center">Import</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Source Title</th>
                      <th className="p-2.5">Date / Site</th>
                      <th className="p-2.5">Stakeholder</th>
                      <th className="p-2.5">Ethics Defaults</th>
                      <th className="p-2.5">Warnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {candidates.map((c) => (
                      <tr
                        key={c.tempId}
                        className={`hover:bg-[var(--surface-muted)] transition ${
                          c.isSkipped ? "opacity-50" : ""
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={!c.isSkipped}
                            disabled={c.status === "error"}
                            onChange={() => handleToggleCandidate(c.tempId)}
                            className="rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)] cursor-pointer"
                          />
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          {c.status === "ready" && (
                            <span className="rounded bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 text-[10px] text-emerald-300 font-semibold">
                              Ready
                            </span>
                          )}
                          {c.status === "needs_review" && (
                            <span className="rounded bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 text-[10px] text-amber-300 font-semibold">
                              Review
                            </span>
                          )}
                          {c.status === "duplicate" && (
                            <span className="rounded bg-rose-950/40 border border-rose-800/40 px-1.5 py-0.5 text-[10px] text-rose-300 font-semibold">
                              Duplicate
                            </span>
                          )}
                          {c.status === "error" && (
                            <span className="rounded bg-red-950/40 border border-red-800/40 px-1.5 py-0.5 text-[10px] text-red-300 font-semibold">
                              Error
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-[var(--foreground)]">
                            {c.title}
                          </div>
                          <div className="text-[10px] text-[var(--muted)] truncate max-w-xs">
                            {c.narrative.slice(0, 80) || "No narrative"}
                          </div>
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-[11px] text-[var(--muted)]">
                          <div>{c.date}</div>
                          <div className="font-medium text-[var(--foreground)]">{c.siteId}</div>
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-[11px] text-[var(--foreground)]">
                          {c.stakeholderType}
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-[10px] space-y-0.5">
                          <div className="text-[var(--muted)]">Consent: {c.consentStatus}</div>
                          <div className="text-[var(--muted)]">Anon: {c.anonymizationStatus}</div>
                        </td>
                        <td className="p-2.5 text-[10px] text-amber-300 max-w-xs">
                          {c.warnings.length > 0
                            ? c.warnings.join("; ")
                            : c.errors.length > 0
                            ? c.errors.join("; ")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: Import Receipt */}
          {step === 4 && receipt && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center space-y-4">
              <span className="text-3xl">🎉</span>
              <h4 className="text-base font-bold text-emerald-300">
                Bulk Source Import Complete!
              </h4>
              <p className="text-xs text-emerald-200/90 max-w-md mx-auto">
                Successfully created <strong>{receipt.createdCount}</strong> new field source records in study &ldquo;{study.title}&rdquo;.
              </p>

              <div className="flex justify-center gap-4 text-xs font-mono pt-2">
                <span className="rounded bg-[var(--surface)] border border-[var(--border)] px-3 py-1 text-[var(--foreground)]">
                  Sources Created: {receipt.createdCount}
                </span>
                <span className="rounded bg-[var(--surface)] border border-[var(--border)] px-3 py-1 text-[var(--muted)]">
                  Skipped / Errors: {receipt.skippedCount}
                </span>
                <span className="rounded bg-[var(--surface)] border border-[var(--border)] px-3 py-1 text-amber-300">
                  Warnings Handled: {receipt.warningsCount}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between border-t border-[var(--border)] p-4 bg-[var(--surface-muted)]">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={activeTab === "structured_text" ? handleParseStructured : handleParseTabular}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition cursor-pointer"
              >
                {activeTab === "structured_text" ? "Parse & Preview Sources →" : "Next: Map Columns →"}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ← Back to Input
              </button>

              <button
                type="button"
                onClick={handleConfirmMapping}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition cursor-pointer"
              >
                Confirm Mapping & Preview →
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button
                type="button"
                onClick={() => setStep(activeTab === "tabular" ? 2 : 1)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ← Back
              </button>

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isSaving || selectedCount === 0}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] disabled:opacity-50 transition cursor-pointer"
              >
                {isSaving ? "Importing Sources..." : `Import Selected Sources (${selectedCount})`}
              </button>
            </>
          )}

          {step === 4 && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-[var(--accent)] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition cursor-pointer"
              >
                Return to Field Intake Desk
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
