"use client";

import React, { useState, useEffect } from "react";
import { WorkspaceDialog } from "@/components/WorkspaceDialog";
import type { EvidenceEntry, SourceRecord, SourceFileMetadata, SourceFileContent } from "@/lib/types";
import { sourceFileRepository } from "@/lib/storage/sourceFileRepository";

interface ViewOriginalSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: EvidenceEntry | null;
  source: SourceRecord | null;
}

export function ViewOriginalSourceModal(props: ViewOriginalSourceModalProps) {
  if (!props.isOpen || (!props.evidence && !props.source)) return null;
  const fileKey = props.evidence?.sourceFileId || props.source?.sourceFileId || "nofile";
  return <ViewOriginalSourceModalContent key={fileKey} {...props} />;
}

function ViewOriginalSourceModalContent({
  onClose,
  evidence,
  source,
}: ViewOriginalSourceModalProps) {
  const fileId = evidence?.sourceFileId || source?.sourceFileId;
  const [fileContent, setFileContent] = useState<SourceFileContent | null>(null);
  const [fileMeta, setFileMeta] = useState<SourceFileMetadata | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(() => Boolean(fileId));

  useEffect(() => {
    let active = true;
    if (!fileId) return;

    Promise.all([sourceFileRepository.getFileMetadata(fileId), sourceFileRepository.getFileContent(fileId)])
      .then(([meta, content]) => {
        if (active) {
          const owner = evidence?.studyId || source?.studyId;
          const belongs = Boolean(meta && content && (!owner || (meta.studyId === owner && content.studyId === owner)));
          setFileMeta(belongs ? meta! : null);
          setFileContent(belongs ? content! : null);
          setLoadingMeta(false);
        }
      })
      .catch(() => {
        if (active) {
          setFileMeta(null);
          setLoadingMeta(false);
        }
      });

    return () => {
      active = false;
    };
  }, [fileId, evidence?.studyId, source?.studyId]);

  const coord = evidence?.sourceCoordinate;

  return (
    <WorkspaceDialog
      labelledBy="source-modal-title"
      onClose={onClose}
      wide={true}
    >
      <div className="flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
                Field Material Lineage
              </span>
              {coord?.sourceType && (
                <span className="rounded bg-[var(--surface-muted)] border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] text-[var(--foreground)]">
                  {coord.sourceType}
                </span>
              )}
            </div>
            <h2 id="source-modal-title" className="text-lg font-semibold text-[var(--foreground)] mt-0.5">
              Original Field Record Provenance
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs">
          {/* Source File Meta (if ingested from file) */}
          {loadingMeta ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-center text-[var(--muted)]">
              Loading source file provenance...
            </div>
          ) : fileMeta ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Underlying Ingestion Document
              </span>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="block text-[10px] text-[var(--muted)]">Filename</span>
                  <span className="font-medium text-[var(--foreground)] break-all">{fileMeta.filename}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[var(--muted)]">File Size</span>
                  <span className="font-mono text-[var(--foreground)]">
                    {(fileMeta.fileSizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-[var(--muted)]">MIME Type</span>
                  <span className="font-mono text-[var(--foreground)]">{fileMeta.mimeType}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[var(--muted)]">Imported</span>
                  <span className="text-[var(--foreground)]">
                    {new Date(fileMeta.importedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {fileContent && (
            <section className="rounded-xl border border-[var(--border)] p-4 space-y-2">
              <h3 className="font-semibold text-[var(--foreground)]">Stored original source context</h3>
              {fileContent.blob && <button type="button" className="text-[var(--trace)] underline" onClick={() => {
                const url = URL.createObjectURL(fileContent.blob!);
                const link = document.createElement("a"); link.href = url; link.download = fileMeta?.filename || "original-source";
                link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>Download stored original file</button>}
              {fileContent.extractedText !== undefined && <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{fileContent.extractedText}</pre>}
            </section>
          )}
          {fileId && !loadingMeta && !fileContent && <p role="status" className="text-amber-400">Original file content is unavailable in this study. A structured backup does not include original files.</p>}

          {/* Source Record Card */}
          {source && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-[var(--trace)]">
                    {source.id}
                  </span>
                  <span className="font-semibold text-sm text-[var(--foreground)]">
                    {source.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 px-2 py-0.5 font-medium text-[10px]">
                    {source.sourceType}
                  </span>
                  {source.sensitivityFlag && source.sensitivityFlag !== "Low" && (
                    <span className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold">
                      {source.sensitivityFlag} Sensitivity
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="block text-[10px] text-[var(--muted)]">Collector</span>
                  <span className="text-[var(--foreground)]">{source.collectorName || "—"}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[var(--muted)]">Date</span>
                  <span className="text-[var(--foreground)]">{source.date || "—"}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[var(--muted)]">Location / Site</span>
                  <span className="text-[var(--foreground)]">{source.location || source.siteId || "—"}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[var(--muted)]">Stakeholder</span>
                  <span className="text-[var(--foreground)]">{source.stakeholderType || "—"}</span>
                </div>
              </div>

              {source.summary && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                    Source Summary
                  </span>
                  <p className="mt-1 text-[var(--foreground)] leading-5">{source.summary}</p>
                </div>
              )}
            </div>
          )}

          {/* Coordinates Details */}
          {coord && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
                Document Location Coordinates
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {coord.blockIndex !== undefined && (
                  <span className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[11px]">
                    Block Index: <strong>{coord.blockIndex}</strong>
                  </span>
                )}
                {coord.segmentType && (
                  <span className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px]">
                    Segment: <strong>{coord.segmentType}</strong>
                  </span>
                )}
                {coord.sheetName && (
                  <span className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px]">
                    Sheet: <strong>{coord.sheetName}</strong>
                  </span>
                )}
                {coord.rowIndex !== undefined && (
                  <span className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[11px]">
                    Row: <strong>{coord.rowIndex + 1}</strong>
                  </span>
                )}
                {coord.cellAddress && (
                  <span className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[11px]">
                    Cell: <strong>{coord.cellAddress}</strong>
                  </span>
                )}
                {coord.csvRowIndex !== undefined && (
                  <span className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[11px]">
                    CSV Row: <strong>{coord.csvRowIndex + 1}</strong>
                  </span>
                )}
                {coord.csvHeader && (
                  <span className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px]">
                    Column: <strong>{coord.csvHeader}</strong>
                  </span>
                )}
                {coord.lineNumber !== undefined && (
                  <span className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[11px]">
                    Line: <strong>{coord.lineNumber}</strong>
                  </span>
                )}
              </div>

              {coord.headingPath && coord.headingPath.length > 0 && (
                <div className="mt-3 text-[11px]">
                  <span className="text-[10px] text-[var(--muted)] block">Heading Hierarchy:</span>
                  <div className="flex items-center gap-1.5 flex-wrap font-medium text-[var(--foreground)] mt-0.5">
                    {coord.headingPath.map((heading, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="text-[var(--muted)]">›</span>}
                        <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 border border-[var(--border)]">
                          {heading}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Evidence Observation */}
          {evidence && (
            <div className="rounded-xl border border-[var(--trace)]/40 bg-[var(--trace-wash)] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--trace)]/20 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[var(--trace)]">
                    {evidence.id}
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--foreground)]">
                    Extracted Observation
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                    Strength: {evidence.evidenceStrength}
                  </span>
                  <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold">
                    {evidence.reviewStatus || (evidence.validationStatus === "Validated" ? "Legacy eligible" : "Not qualified")}
                  </span>
                </div>
              </div>

              <blockquote className="border-l-2 border-[var(--trace)] pl-3 text-sm text-[var(--foreground)] leading-relaxed italic">
                &ldquo;{evidence.rawObservation || evidence.rawEvidence}&rdquo;
              </blockquote>

              {(evidence.interpretation || evidence.potentialFinding) && (
                <div className="pt-2 text-[11px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Field Team Interpretation
                  </span>
                  <p className="mt-0.5 text-[var(--foreground)] leading-5">
                    {evidence.interpretation || evidence.potentialFinding}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-[var(--border)] px-6 py-3 bg-[var(--surface-muted)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[var(--surface)] border border-[var(--border)] px-4 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition"
          >
            Close
          </button>
        </div>
      </div>
    </WorkspaceDialog>
  );
}
