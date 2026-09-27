"use client";

import { WorkspaceDialog } from "@/components/WorkspaceDialog";
import React, { useState } from "react";
import { saveStudyMeta } from "@/lib/storage/studyStore";
import type { CollectionMethod, StudyMeta } from "@/lib/types";

interface MinimalStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudyCreated: (studyId: string) => void;
}

const AVAILABLE_METHODS: CollectionMethod[] = [
  "Key Informant Interview",
  "Focus Group Discussion",
  "Direct Observation",
  "Document Review",
  "Community Meeting",
  "Survey / Questionnaire",
];

export function MinimalStudyModal({
  isOpen,
  onClose,
  onStudyCreated,
}: MinimalStudyModalProps) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [context, setContext] = useState("");
  const [targetSites, setTargetSites] = useState("");
  const [targetStakeholders, setTargetStakeholders] = useState("");
  const [selectedMethods, setSelectedMethods] = useState<CollectionMethod[]>([
    "Key Informant Interview",
    "Focus Group Discussion",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMethodToggle = (method: CollectionMethod) => {
    setSelectedMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    const trimmedContext = context.trim();
    const sites = targetSites
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const stakeholders = targetStakeholders
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!trimmedTitle) {
      setErrorMessage("Please enter a study title.");
      return;
    }
    if (!trimmedContext) {
      setErrorMessage("Please enter a brief context or description for this study.");
      return;
    }
    if (sites.length === 0) {
      setErrorMessage("Please enter at least one target site/location.");
      return;
    }
    if (stakeholders.length === 0) {
      setErrorMessage("Please enter at least one target stakeholder group.");
      return;
    }

    try {
      setIsSubmitting(true);
      const studyId = `study-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;
      const now = Date.now();

      const newStudy: StudyMeta = {
        id: studyId,
        title: trimmedTitle,
        subtitle: subtitle.trim() || "Active Field Study",
        context: trimmedContext,
        status: "Active Fieldwork",
        isDemoCase: false,
        scope: {
          targetSites: sites,
          isSingleSiteStudy: sites.length <= 1,
          targetStakeholderGroups: stakeholders,
          expectedMethods: selectedMethods.length > 0 ? selectedMethods : undefined,
        },
        executiveSummary: "",
        keyMessages: [],
        limitations: [],
        createdAt: now,
        updatedAt: now,
      };

      await saveStudyMeta(newStudy);
      onStudyCreated(studyId);
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to create study in local storage."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <WorkspaceDialog labelledBy="new-study-title" onClose={onClose}>
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--trace)]">
            Workspace Setup
          </span>
          <h3 id="new-study-title" className="mt-1 text-lg font-bold text-[var(--foreground)]">
            Create New Field Study
          </h3>
        </div>
        <button
          aria-label="Close"
          onClick={onClose}
          type="button"
          className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
        >
          ✕
        </button>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Study Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. PARTAGE Field Evaluation Mission"
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Subtitle (Optional)
          </label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="e.g. Mid-term synthesis and community feedback"
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Context & Objective <span className="text-rose-400">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Briefly describe the field evaluation purpose, geographical scope, and programmatic focus."
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Target Sites <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={targetSites}
              onChange={(e) => setTargetSites(e.target.value)}
              placeholder="e.g. Minya, Assiut (comma-separated)"
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Comma-separated list of field locations.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Target Stakeholders <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={targetStakeholders}
              onChange={(e) => setTargetStakeholders(e.target.value)}
              placeholder="e.g. Teachers, Parents, Children"
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Key participant groups to engage.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Expected Collection Methods (Optional)
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {AVAILABLE_METHODS.map((method) => (
              <label
                key={method}
                className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedMethods.includes(method)}
                  onChange={() => handleMethodToggle(method)}
                  className="accent-[var(--trace)]"
                />
                <span>{method}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="fls-dialog-actions mt-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Study"}
          </button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
