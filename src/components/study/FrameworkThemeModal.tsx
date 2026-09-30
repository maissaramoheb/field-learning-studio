"use client";

import React, { useState } from "react";
import { WorkspaceDialog } from "@/components/WorkspaceDialog";
import type { FrameworkTheme } from "@/lib/types";

interface FrameworkThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (theme: FrameworkTheme) => Promise<void>;
  existingThemes: FrameworkTheme[];
  initialTheme?: FrameworkTheme | null;
}

export function FrameworkThemeModal({
  isOpen,
  onClose,
  onSave,
  existingThemes,
  initialTheme,
}: FrameworkThemeModalProps) {
  if (!isOpen) return null;

  return (
    <FrameworkThemeModalContent
      onClose={onClose}
      onSave={onSave}
      existingThemes={existingThemes}
      initialTheme={initialTheme}
    />
  );
}

function FrameworkThemeModalContent({
  onClose,
  onSave,
  existingThemes,
  initialTheme,
}: Omit<FrameworkThemeModalProps, "isOpen">) {
  const isEditing = !!initialTheme;

  const defaultId = (() => {
    if (initialTheme?.id) return initialTheme.id;
    return `THM-${existingThemes.length + 1}`;
  })();

  const [id, setId] = useState(defaultId);
  const [name, setName] = useState(initialTheme?.name || "");
  const [shortLabel, setShortLabel] = useState(initialTheme?.shortLabel || "");
  const [description, setDescription] = useState(initialTheme?.description || "");
  const [guidingQuestion, setGuidingQuestion] = useState(
    initialTheme?.guidingQuestion || ""
  );
  const [isActive, setIsActive] = useState(initialTheme?.isActive ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter a theme name.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        id: id.trim() || defaultId,
        name: trimmedName,
        shortLabel: shortLabel.trim() || undefined,
        description: description.trim() || undefined,
        guidingQuestion: guidingQuestion.trim() || undefined,
        order: initialTheme?.order ?? existingThemes.length + 1,
        isActive,
      });
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save framework theme."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <WorkspaceDialog labelledBy="theme-modal-title" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
              Analytical Framework
            </span>
            <h3 id="theme-modal-title" className="text-base font-bold text-[var(--foreground)]">
              {isEditing ? "Edit Analytical Lens" : "Add Analytical Lens / Theme"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-md bg-[var(--danger-surface)] border border-[var(--danger-border)] p-3 text-xs text-[var(--danger)]">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
              Theme ID *
            </label>
            <input
              type="text"
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g. THM-1"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
              Lens / Theme Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Access & Inclusion Barriers"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Short Tag / Descriptor
          </label>
          <input
            type="text"
            value={shortLabel}
            onChange={(e) => setShortLabel(e.target.value)}
            placeholder="e.g. Access"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Description & Scope of Lens
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What operational aspects or relational dynamics does this lens focus on?"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Guiding Analytical Question
          </label>
          <input
            type="text"
            value={guidingQuestion}
            onChange={(e) => setGuidingQuestion(e.target.value)}
            placeholder="e.g. What conditions make participation physically and socially accessible?"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="theme-is-active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)]"
          />
          <label htmlFor="theme-is-active" className="text-xs text-[var(--foreground)] cursor-pointer">
            Active lens (available for synthesis coding and tagging)
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-[var(--trace)] px-4 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : isEditing ? "Update Theme" : "Add Theme"}
          </button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
