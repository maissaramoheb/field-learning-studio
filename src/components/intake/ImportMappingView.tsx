"use client";

import React, { useState, useMemo } from "react";
import type {
  FieldStudy,
  MaterialCategory,
  SourceRecord,
  EvidenceEntry,
  SourceFileId,
  SourceFileMetadata,
  SourceFileContent,
} from "@/lib/types";
import { cloneDemoStudy } from "@/lib/storage/studyStore";
import { sourceFileRepository } from "@/lib/storage/sourceFileRepository";
import {
  parseCsvOrTsv,
  suggestColumnMappings,
  type StandardSourceField,
  type TabularParseResult,
} from "@/lib/intake/csvParser";
import {
  mapTabularRowsToCandidates,
  importTabularCandidates,
  type TabularCandidateRow,
} from "@/lib/intake/tabularImporter";
import { parseDocxDocument } from "@/lib/intake/docxParser";
import { importDocxSourcesAndObservations } from "@/lib/intake/docxImporter";
import type { DocxSourceCandidate } from "@/lib/intake/docxTypes";
import { parseStructuredSourceBlocks, type ParsedSourceCandidate } from "@/lib/intake/structuredTextParser";
import { saveSourceAndEvidenceBatch } from "@/lib/storage/studyStore";
import { getNextSequenceOfSourceIds, getNextSequenceOfEvidenceIds } from "@/lib/idGenerator";

interface ImportMappingViewProps {
  study: FieldStudy;
  onRefreshStudy: () => Promise<void> | void;
  onStudyChange: (newStudyId: string) => void;
  onNavigateToTab: (tabId: string) => void;
}

type IntakeMode = "tabular" | "docx" | "structured_text";

const SAMPLE_CSV = `Source Title,Date,Site,Stakeholder,Method,Observation / Raw Excerpt,Observer Note
KII with Head Teacher,2026-09-22,Minya,Teachers,Key Informant Interview,"Morning meal delivery arrived 45 minutes late, disrupting mid-day classes.","Teacher appeared stressed; noted recurring logistics delay."
FGD with Mothers,2026-09-23,Assiut,Parents,Focus Group Discussion,"Children reported that cold meals lacked fresh fruit in early autumn.","High emotional consensus among 8 attendees."
Site Visit Sanitation Check,2026-09-24,Minya,Field Monitors,Direct Observation,"Handwashing station lacked soap refills; water pump functional.","Direct visual verification at north wing."`;

export function ImportMappingView({
  study,
  onRefreshStudy,
  onStudyChange,
  onNavigateToTab,
}: ImportMappingViewProps) {
  const [activeMode, setActiveMode] = useState<IntakeMode>("tabular");
  const [isCloning, setIsCloning] = useState(false);

  // Tabular state
  const [rawTabularText, setRawTabularText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileBlob, setUploadedFileBlob] = useState<Blob | null>(null);
  const [tabularResult, setTabularResult] = useState<TabularParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<number, StandardSourceField>>({});
  const [defaultCategory, setDefaultCategory] = useState<MaterialCategory>("primary_evidence");
  const [showTabularPreview, setShowTabularPreview] = useState(false);
  const [isTabularImporting, setIsTabularImporting] = useState(false);

  // DOCX state
  const [docxFiles, setDocxFiles] = useState<File[]>([]);
  const [isDocxParsing, setIsDocxParsing] = useState(false);
  const [docxParseError, setDocxParseError] = useState<string | null>(null);
  const [docxCandidates, setDocxCandidates] = useState<DocxSourceCandidate[]>([]);
  const [isDocxImporting, setIsDocxImporting] = useState(false);

  // Structured text state
  const [rawStructuredText, setRawStructuredText] = useState("");
  const [isTextImporting, setIsTextImporting] = useState(false);
  const [parsedStructuredCandidates, setParsedStructuredCandidates] = useState<ParsedSourceCandidate[] | null>(null);
  const [structuredParseError, setStructuredParseError] = useState<string | null>(null);

  // Receipt state
  const [importReceipt, setImportReceipt] = useState<{
    mode: string;
    sourcesCount: number;
    evidenceCount: number;
    sourceFileId?: string;
  } | null>(null);

  const handleCloneDemo = async () => {
    try {
      setIsCloning(true);
      const newStudyId = await cloneDemoStudy(
        study.id,
        `${study.title} (Editable Copy)`
      );
      onStudyChange(newStudyId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to clone demo study.");
    } finally {
      setIsCloning(false);
    }
  };

  // --- TABULAR HANDLERS ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadedFileBlob(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || "";
      setRawTabularText(text);
      processTabularText(text);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleCsv = () => {
    setUploadedFileName("sample_field_log.csv");
    setUploadedFileBlob(new Blob([SAMPLE_CSV], { type: "text/csv" }));
    setRawTabularText(SAMPLE_CSV);
    processTabularText(SAMPLE_CSV);
  };

  const processTabularText = (text: string) => {
    const res = parseCsvOrTsv(text);
    setTabularResult(res);
    const suggested = suggestColumnMappings(res.headers);
    setColumnMapping(suggested);
    setShowTabularPreview(true);
    setImportReceipt(null);
  };

  const mappedCandidates: TabularCandidateRow[] = useMemo(() => {
    if (!tabularResult || tabularResult.rows.length === 0) return [];
    return mapTabularRowsToCandidates(tabularResult, columnMapping, defaultCategory);
  }, [tabularResult, columnMapping, defaultCategory]);

  const handleConfirmTabularImport = async () => {
    if (mappedCandidates.length === 0) return;

    try {
      setIsTabularImporting(true);
      const res = await importTabularCandidates(
        study,
        mappedCandidates,
        uploadedFileName
          ? {
              filename: uploadedFileName,
              blob: uploadedFileBlob || undefined,
              rawText: rawTabularText,
              mimeType: "text/csv",
            }
          : undefined
      );

      await onRefreshStudy();
      setImportReceipt({
        mode: "Tabular Field Log (CSV / TSV)",
        sourcesCount: res.sourcesCount,
        evidenceCount: res.evidenceCount,
        sourceFileId: res.sourceFileId,
      });
      setShowTabularPreview(false);
      setTabularResult(null);
      setRawTabularText("");
      setUploadedFileName(null);
      setUploadedFileBlob(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to import tabular field material.");
    } finally {
      setIsTabularImporting(false);
    }
  };

  // --- DOCX HANDLERS ---
  const handleDocxDrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) =>
      f.name.toLowerCase().endsWith(".docx")
    );
    if (files.length === 0) return;

    setDocxFiles(files);
    setIsDocxParsing(true);
    setDocxParseError(null);
    setImportReceipt(null);

    try {
      const candidates: DocxSourceCandidate[] = [];
      let idx = 1;
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const cand = await parseDocxDocument(buffer, file.name, idx++);
        candidates.push(cand);
      }
      setDocxCandidates(candidates);
    } catch (err) {
      setDocxParseError(err instanceof Error ? err.message : "Failed to parse Word documents.");
    } finally {
      setIsDocxParsing(false);
    }
  };

  const handleConfirmDocxImport = async () => {
    if (docxCandidates.length === 0) return;

    try {
      setIsDocxImporting(true);

      // Save file preservation copies in SourceFileRepository
      const preparedCandidates: DocxSourceCandidate[] = [];
      for (let i = 0; i < docxCandidates.length; i++) {
        const file = docxFiles[i];
        const cand = docxCandidates[i];
        const sourceFileId = (cand?.sourceFileId || `SF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`) as SourceFileId;
        if (file && !cand.sourceFileId) {
          const meta: SourceFileMetadata = {
            id: sourceFileId,
            studyId: study.id,
            filename: file.name,
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            fileSizeBytes: file.size,
            importedAt: Date.now(),
            parsingVersion: 1,
            hasContent: true,
          };
          const content: SourceFileContent = {
            id: sourceFileId,
            studyId: study.id,
            blob: file,
          };
          try {
            await sourceFileRepository.saveFile(meta, content);
          } catch {
            // Non-fatal
          }
        }
        preparedCandidates.push({ ...cand, sourceFileId });
      }

      const res = await importDocxSourcesAndObservations(study, preparedCandidates);
      await onRefreshStudy();

      setImportReceipt({
        mode: "Word Documents (.docx)",
        sourcesCount: res.sourcesCount,
        evidenceCount: res.evidenceCount,
        sourceFileId: preparedCandidates[0]?.sourceFileId,
      });
      setDocxCandidates([]);
      setDocxFiles([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to import Word documents.");
    } finally {
      setIsDocxImporting(false);
    }
  };

  // --- STRUCTURED TEXT HANDLERS (2-step Parse -> Preview -> Confirm) ---
  const handleParseStructuredText = () => {
    if (!rawStructuredText.trim()) return;
    setStructuredParseError(null);
    try {
      const parsed = parseStructuredSourceBlocks(rawStructuredText, study.scope);
      if (parsed.length === 0) {
        setStructuredParseError("No valid structured blocks found. Ensure blocks start with Title and Narrative.");
        return;
      }
      setParsedStructuredCandidates(parsed);
    } catch (err) {
      setStructuredParseError(err instanceof Error ? err.message : "Failed to parse structured notes.");
    }
  };

  const handleCancelStructuredPreview = () => {
    setParsedStructuredCandidates(null);
    setStructuredParseError(null);
  };

  const handleConfirmStructuredTextImport = async () => {
    if (!parsedStructuredCandidates || parsedStructuredCandidates.length === 0) return;

    try {
      setIsTextImporting(true);
      const parsed = parsedStructuredCandidates;

      const existingSourceIds = (study.sources || []).map((s) => s.id);
      const existingEvidenceIds = (study.evidence || []).map((e) => e.id);
      const newSourceIds = getNextSequenceOfSourceIds(existingSourceIds, parsed.length);
      const newEvidenceIds = getNextSequenceOfEvidenceIds(existingEvidenceIds, parsed.length);
      const now = Date.now();

      const sourcesToSave: SourceRecord[] = [];
      const evidenceToSave: EvidenceEntry[] = [];

      parsed.forEach((item, idx) => {
        const sourceId = newSourceIds[idx];
        const evidenceId = newEvidenceIds[idx];

        sourcesToSave.push({
          id: sourceId,
          studyId: study.id,
          title: item.title,
          date: item.date || new Date().toISOString().slice(0, 10),
          location: item.siteId,
          siteId: item.siteId,
          stakeholderType: item.stakeholderType,
          sourceType: item.collectionMethod,
          collectorName: item.collectorName,
          consentStatus: item.consentStatus,
          anonymizationStatus: item.anonymizationStatus,
          sensitivityFlag: item.sensitivityFlag,
          materialCategory: "primary_evidence",
          summary: item.summary,
          rawText: item.narrative,
          createdAt: now,
          updatedAt: now,
        });

        evidenceToSave.push({
          id: evidenceId,
          studyId: study.id,
          sourceId,
          siteId: item.siteId,
          stakeholderType: item.stakeholderType,
          rawEvidence: item.narrative,
          rawObservation: item.narrative,
          primaryTheme: "Operational Execution",
          secondaryTheme: "General",
          evidenceStrength: "Medium",
          sensitivityFlag: item.sensitivityFlag,
          potentialFinding: item.summary,
          qaStatus: "Needs Review",
          validationStatus: "Draft",
          reviewStatus: "pending",
          materialCategory: "primary_evidence",
          revision: 1,
          createdAt: now,
          updatedAt: now,
        });
      });

      await saveSourceAndEvidenceBatch(study.id, sourcesToSave, evidenceToSave);
      await onRefreshStudy();

      setImportReceipt({
        mode: "Structured Field Notes",
        sourcesCount: sourcesToSave.length,
        evidenceCount: evidenceToSave.length,
      });
      setParsedStructuredCandidates(null);
      setRawStructuredText("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to import structured notes.");
    } finally {
      setIsTextImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="fls-page-heading">
        <div>
          <p className="fls-eyebrow">Field Material</p>
          <h1>Import & mapping studio</h1>
          <p>
            Ingest tabular field logs (CSV/TSV), Word evaluation notes (.docx), or structured text. Map schema, review qualification suggestions, and preserve original files in the local repository.
          </p>
        </div>
      </div>

      {/* Read-Only Notice for Demo Cases */}
      {study.isDemoCase && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-200 flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-amber-300">
              Import & Mapping is locked for reference demo cases.
            </p>
            <p className="mt-1 text-[11px] text-amber-200/90 leading-relaxed">
              To import real CSV field logs or Word documents into this evaluation blueprint, create an editable copy stored locally in your browser.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloneDemo}
            disabled={isCloning}
            className="shrink-0 fls-button fls-button-primary text-xs"
          >
            {isCloning ? "Cloning..." : "Create Editable Copy"}
          </button>
        </div>
      )}

      {/* Import Receipt Banner */}
      {importReceipt && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-5 flex flex-wrap items-center justify-between gap-4 animate-fade-in text-xs">
          <div className="flex items-center gap-3.5">
            <span className="text-2xl">📥</span>
            <div>
              <strong className="block text-sm font-semibold text-emerald-200">
                Material Ingestion Succeeded ({importReceipt.mode})
              </strong>
              <p className="mt-0.5 text-emerald-300">
                Created: <strong>{importReceipt.sourcesCount}</strong> Sources · <strong>{importReceipt.evidenceCount}</strong> Observations queued for qualification (status: <strong>Pending Review</strong>).
                {importReceipt.sourceFileId && (
                  <span className="ms-2 font-mono text-[10px] text-emerald-400">
                    Preserved File: {importReceipt.sourceFileId}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateToTab("evidence")}
              className="fls-button fls-button-primary text-xs cursor-pointer"
            >
              Proceed to Evidence Review &rarr;
            </button>
            <button
              type="button"
              onClick={() => setImportReceipt(null)}
              className="text-emerald-400 hover:text-emerald-200 px-2 py-1 text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!study.isDemoCase && (
        <>
          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-xs">
            <button
              type="button"
              onClick={() => setActiveMode("tabular")}
              className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                activeMode === "tabular"
                  ? "bg-[var(--surface-elevated)] border border-[var(--trace)] text-[var(--foreground)] font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              📄 Tabular Field Log (CSV / TSV)
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("docx")}
              className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                activeMode === "docx"
                  ? "bg-[var(--surface-elevated)] border border-[var(--trace)] text-[var(--foreground)] font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              📝 Word Document (.docx)
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("structured_text")}
              className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                activeMode === "structured_text"
                  ? "bg-[var(--surface-elevated)] border border-[var(--trace)] text-[var(--foreground)] font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              📋 Structured Notes / Text
            </button>
          </div>

          {/* TABULAR INTAKE MODE */}
          {activeMode === "tabular" && (
            <div className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Upload or Paste Tabular Field Log
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Parse comma-separated or tab-separated tables into discrete field sources and observations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleCsv}
                  className="text-xs font-semibold text-[var(--trace)] hover:underline cursor-pointer"
                >
                  ⚡ Load Sample CSV
                </button>
              </div>

              {/* Upload Input */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--surface-elevated)] p-6 text-center hover:border-[var(--trace)] transition">
                  <span className="text-2xl">📁</span>
                  <p className="mt-2 text-xs font-medium text-[var(--foreground)]">
                    Drop CSV/TSV file or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileUpload}
                    className="mt-3 block w-full text-xs text-[var(--muted)] file:mr-2 file:rounded file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white file:cursor-pointer"
                  />
                  {uploadedFileName && (
                    <p className="mt-2 text-[11px] font-mono text-[var(--trace)]">
                      Loaded: {uploadedFileName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] mb-1">
                    Or paste raw table text:
                  </label>
                  <textarea
                    rows={6}
                    value={rawTabularText}
                    onChange={(e) => {
                      setRawTabularText(e.target.value);
                      processTabularText(e.target.value);
                    }}
                    placeholder="Source Title,Date,Site,Stakeholder,Method,Observation / Raw Excerpt,Observer Note..."
                    className="w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] p-2.5 font-mono text-[11.5px] text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Column Mapping Section */}
              {tabularResult && tabularResult.headers.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--trace)]">
                        Step 2: Map Columns & Select Category
                      </h4>
                      <p className="text-xs text-[var(--muted)]">
                        Map file columns to Field Learning Studio attributes. Detected delimiter:{" "}
                        <span className="font-mono font-bold text-[var(--foreground)]">
                          {tabularResult.delimiter === "\t" ? "TAB" : tabularResult.delimiter}
                        </span>{" "}
                        · Total rows: <strong>{tabularResult.totalRawRows}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-[var(--muted)]">
                        Default Material Category:
                      </label>
                      <select
                        value={defaultCategory}
                        onChange={(e) => setDefaultCategory(e.target.value as MaterialCategory)}
                        className="rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                      >
                        <option value="primary_evidence">Primary Field Observation</option>
                        <option value="secondary_evidence">Secondary Document Excerpt</option>
                        <option value="supervisory_interpretation">Supervisory Debrief / Reflection</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]">
                        <tr>
                          <th className="p-2.5">File Column</th>
                          <th className="p-2.5">Sample Values</th>
                          <th className="p-2.5">Target Studio Attribute</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                        {tabularResult.headers.map((hdr, idx) => {
                          const sampleVal1 = tabularResult.rows[0]?.[idx] || "";
                          const sampleVal2 = tabularResult.rows[1]?.[idx] || "";
                          const currentField = columnMapping[idx] || "ignore";

                          return (
                            <tr key={idx} className="hover:bg-[var(--surface-muted)]/50">
                              <td className="p-2.5 font-semibold text-[var(--foreground)]">
                                {hdr || `Col ${idx + 1}`}
                              </td>
                              <td className="p-2.5 text-[var(--muted)] max-w-xs truncate">
                                {sampleVal1}
                                {sampleVal2 ? ` | ${sampleVal2}` : ""}
                              </td>
                              <td className="p-2.5">
                                <select
                                  value={currentField}
                                  onChange={(e) =>
                                    setColumnMapping({
                                      ...columnMapping,
                                      [idx]: e.target.value as StandardSourceField,
                                    })
                                  }
                                  className="rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                                >
                                  <option value="title">Source Title / Label</option>
                                  <option value="date">Collection Date</option>
                                  <option value="siteId">Site / Location</option>
                                  <option value="stakeholderType">Stakeholder Group</option>
                                  <option value="collectionMethod">Collection Method</option>
                                  <option value="collectorName">Collector Name / Role</option>
                                  <option value="narrative">Raw Excerpt / Observation</option>
                                  <option value="ignore">-- Skip Column --</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Candidate Preview Section */}
                  {showTabularPreview && mappedCandidates.length > 0 && (
                    <div className="space-y-3 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--muted)]">
                          Candidate Records Preview ({mappedCandidates.length} rows):
                        </span>
                      </div>

                      <div className="max-h-60 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]">
                        <table className="w-full text-left text-[11.5px]">
                          <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)] sticky top-0">
                            <tr>
                              <th className="p-2">#</th>
                              <th className="p-2">Source Title</th>
                              <th className="p-2">Method</th>
                              <th className="p-2">Site</th>
                              <th className="p-2">Category</th>
                              <th className="p-2">Raw Excerpt</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {mappedCandidates.slice(0, 10).map((cand, idx) => (
                              <tr key={idx}>
                                <td className="p-2 font-mono text-[var(--muted)]">{idx + 1}</td>
                                <td className="p-2 font-semibold text-[var(--foreground)] truncate max-w-[120px]">
                                  {cand.title}
                                </td>
                                <td className="p-2 text-[var(--trace)]">{cand.collectionMethod}</td>
                                <td className="p-2 text-[var(--muted)]">{cand.siteId}</td>
                                <td className="p-2">
                                  <span className="rounded border px-1.5 py-0.5 text-[10px] font-semibold border-sky-500/30 bg-sky-950/20 text-sky-300">
                                    {cand.materialCategory}
                                  </span>
                                </td>
                                <td className="p-2 text-[var(--foreground)] truncate max-w-sm">
                                  {cand.excerpt}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {mappedCandidates.length > 10 && (
                        <p className="text-[11px] text-[var(--muted)] italic">
                          Showing first 10 of {mappedCandidates.length} candidates.
                        </p>
                      )}

                      {/* Human Confirmation Button */}
                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                        <button
                          type="button"
                          disabled={isTabularImporting}
                          onClick={handleConfirmTabularImport}
                          className="fls-button fls-button-primary text-xs cursor-pointer shadow"
                        >
                          {isTabularImporting
                            ? "Ingesting..."
                            : `Confirm & Ingest ${mappedCandidates.length} Records into Study Repository`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* WORD DOCUMENT (.DOCX) INTAKE MODE */}
          {activeMode === "docx" && (
            <div className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Word Document (.docx) Field Report & Transcript Intake
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  Extracts structured sources, metadata, and observations directly from Word documents using Mammoth.
                </p>
              </div>

              <div className="rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--surface-elevated)] p-8 text-center hover:border-[var(--trace)] transition">
                <span className="text-3xl">📄</span>
                <p className="mt-2 text-xs font-medium text-[var(--foreground)]">
                  Select Word (.docx) documents to parse
                </p>
                <input
                  type="file"
                  multiple
                  accept=".docx"
                  onChange={handleDocxDrop}
                  className="mt-3 block w-full text-xs text-[var(--muted)] file:mr-2 file:rounded file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white file:cursor-pointer"
                />
                {isDocxParsing && (
                  <p className="mt-2 text-xs text-[var(--trace)] font-semibold animate-pulse">
                    Parsing Word document contents...
                  </p>
                )}
                {docxParseError && (
                  <p className="mt-2 text-xs text-rose-400 font-semibold">{docxParseError}</p>
                )}
              </div>

              {/* DOCX Candidates Preview */}
              {docxCandidates.length > 0 && (
                <div className="space-y-4 pt-3 border-t border-[var(--border)]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--trace)]">
                    Parsed Documents Preview ({docxCandidates.length} documents)
                  </h4>
                  <div className="space-y-3">
                    {docxCandidates.map((cand, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[var(--foreground)]">
                            {cand.title || cand.filename}
                          </span>
                          <span className="text-[11px] text-[var(--muted)]">
                            {cand.candidateObservations.length} candidate observations
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--muted)] truncate">
                          Method: {cand.collectionMethod} · Site: {cand.siteId} · Stakeholder: {cand.stakeholderType}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                    <button
                      type="button"
                      disabled={isDocxImporting}
                      onClick={handleConfirmDocxImport}
                      className="fls-button fls-button-primary text-xs cursor-pointer shadow"
                    >
                      {isDocxImporting
                        ? "Ingesting..."
                        : `Confirm & Ingest ${docxCandidates.length} Word Documents into Study Repository`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STRUCTURED TEXT / NOTES INTAKE MODE */}
          {activeMode === "structured_text" && (
            <div className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              {!parsedStructuredCandidates ? (
                // Step 1: Input & Parse
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">
                      Structured Text Ingestion
                    </h3>
                    <p className="text-xs text-[var(--muted)]">
                      Paste structured field note blocks separated by &quot;---&quot;. Click &quot;Parse Structured Notes&quot; to review extracted observations before persistence.
                    </p>
                  </div>

                  {structuredParseError && (
                    <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">
                      {structuredParseError}
                    </div>
                  )}

                  <textarea
                    rows={10}
                    value={rawStructuredText}
                    onChange={(e) => setRawStructuredText(e.target.value)}
                    placeholder={`---\nTitle: KII with Health Coordinator\nDate: 2026-09-21\nSite: Assiut\nStakeholder: Health Workers\nMethod: Key Informant Interview\n\nNotes:\nVaccine refrigerator temperature logs were recorded daily but backup battery was unserviced.\n---`}
                    className="w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] p-3 font-mono text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                  />

                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      disabled={!rawStructuredText.trim()}
                      onClick={handleParseStructuredText}
                      className="fls-button fls-button-primary text-xs cursor-pointer shadow disabled:opacity-50"
                    >
                      Parse Structured Notes &rarr;
                    </button>
                  </div>
                </div>
              ) : (
                // Step 2: Extraction Preview & Ingestion Confirmation
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">
                        Structured Notes Extraction Preview
                      </h3>
                      <p className="text-xs text-[var(--muted)]">
                        {parsedStructuredCandidates.length} structured observation block{parsedStructuredCandidates.length === 1 ? "" : "s"} ready for review. Nothing has been committed to database storage.
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-950/40 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                      {parsedStructuredCandidates.length} Blocks Parsed
                    </span>
                  </div>

                  <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
                    {parsedStructuredCandidates.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-[var(--foreground)] text-sm">
                              {item.title}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[var(--muted)]">
                              <span>📅 {item.date || "Unknown Date"}</span>
                              <span>•</span>
                              <span>📍 {item.siteId}</span>
                              <span>•</span>
                              <span>👥 {item.stakeholderType}</span>
                              <span>•</span>
                              <span className="font-medium text-[var(--trace)]">🔍 {item.collectionMethod}</span>
                            </div>
                          </div>
                          <span className="font-mono text-[10px] text-[var(--muted)]">
                            #{idx + 1}
                          </span>
                        </div>

                        <div className="rounded bg-[var(--surface)] p-2.5 border border-[var(--border)] text-xs text-[var(--foreground)] leading-relaxed">
                          {item.narrative}
                        </div>

                        {item.warnings && item.warnings.length > 0 && (
                          <div className="text-[11px] text-amber-300 bg-amber-950/20 rounded p-1.5 border border-amber-500/30">
                            {item.warnings.join("; ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
                    <button
                      type="button"
                      disabled={isTextImporting}
                      onClick={handleCancelStructuredPreview}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] cursor-pointer"
                    >
                      &larr; Back to Edit
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={isTextImporting}
                        onClick={handleCancelStructuredPreview}
                        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isTextImporting}
                        onClick={handleConfirmStructuredTextImport}
                        className="fls-button fls-button-primary text-xs cursor-pointer shadow disabled:opacity-50"
                      >
                        {isTextImporting
                          ? "Ingesting..."
                          : `Confirm & Ingest ${parsedStructuredCandidates.length} Records`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
