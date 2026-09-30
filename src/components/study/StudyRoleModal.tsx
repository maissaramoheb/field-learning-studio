"use client";

import React, { useState } from "react";
import { WorkspaceDialog } from "@/components/WorkspaceDialog";
import type { StudyRoleAssignment, StudyRoleType } from "@/lib/types";

interface StudyRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleAssignment: StudyRoleAssignment) => Promise<void>;
  initialAssignment?: StudyRoleAssignment | null;
}

export const ROLE_DEFINITIONS: Record<
  StudyRoleType,
  { label: string; description: string; phase: string }
> = {
  lead: {
    label: "Study Lead / Principal Investigator",
    description: "Overall inquiry accountability, methodology adherence, and team coordination.",
    phase: "Design & Governance",
  },
  researcher: {
    label: "Field Researcher / Collector",
    description: "Conducts interviews, observations, and focus groups; intakes field notes.",
    phase: "Field Material",
  },
  debrief_supervisor: {
    label: "Daily Debrief Supervisor",
    description: "Facilitates end-of-day team sensemaking, contradictions, and next-day priorities.",
    phase: "Field Material",
  },
  reviewer: {
    label: "Evidence Reviewer",
    description: "Reviews factual observations, checks consent, and verifies anonymization.",
    phase: "Field Material",
  },
  analyst: {
    label: "Analyst / Synthesizer",
    description: "Performs cross-site comparative synthesis and matrix triangulation.",
    phase: "Analysis",
  },
  validator: {
    label: "Finding Validator",
    description: "Independent check on claim boundaries, strength of evidence, and limitations.",
    phase: "Analysis",
  },
  approver: {
    label: "Deliverable Approver",
    description: "Formal sign-off on published learning brief and final recommendations.",
    phase: "Deliverables",
  },
};

export function StudyRoleModal({
  isOpen,
  onClose,
  onSave,
  initialAssignment,
}: StudyRoleModalProps) {
  if (!isOpen) return null;

  return (
    <StudyRoleModalContent
      onClose={onClose}
      onSave={onSave}
      initialAssignment={initialAssignment}
    />
  );
}

function StudyRoleModalContent({
  onClose,
  onSave,
  initialAssignment,
}: Omit<StudyRoleModalProps, "isOpen">) {
  const isEditing = !!initialAssignment;

  const [role, setRole] = useState<StudyRoleType>(
    initialAssignment?.role || "researcher"
  );
  const [displayName, setDisplayName] = useState(
    initialAssignment?.actor.displayName || ""
  );
  const [notes, setNotes] = useState(initialAssignment?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = displayName.trim();
    if (!name) {
      setErrorMessage("Please enter the person's name.");
      return;
    }

    try {
      setIsSubmitting(true);
      const assignment: StudyRoleAssignment = {
        id: initialAssignment?.id || `ROLE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        role,
        actor: {
          kind: "human",
          displayName: name,
        },
        notes: notes.trim() || undefined,
        assignedAt: initialAssignment?.assignedAt || Date.now(),
      };

      await onSave(assignment);
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save role assignment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <WorkspaceDialog labelledBy="role-modal-title" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
              Team & Governance
            </span>
            <h3 id="role-modal-title" className="text-base font-bold text-[var(--foreground)]">
              {isEditing ? "Edit Role Assignment" : "Assign Study Role"}
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

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Methodological Role *
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as StudyRoleType)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
          >
            {(Object.keys(ROLE_DEFINITIONS) as StudyRoleType[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_DEFINITIONS[r].label} ({ROLE_DEFINITIONS[r].phase})
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            {ROLE_DEFINITIONS[role].description}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Practitioner / Person Name *
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Dr. Laila Al-Mansoor, Samira Haddad"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
            Role Responsibility Notes / Organization (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Lead for women's peace circle focus groups and safe access protocols..."
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--trace)]"
          />
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
            {isSubmitting ? "Saving..." : isEditing ? "Update Role" : "Assign Role"}
          </button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
