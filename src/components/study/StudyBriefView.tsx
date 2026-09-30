"use client";

import React, { useState } from "react";
import type { FieldStudy, StudyMeta } from "@/lib/types";
import type { WorkspaceTabId } from "@/components/FieldLearningStudioApp";
import { StudyReadinessBanner } from "./StudyReadinessBanner";
import { computeStudyReadiness } from "@/lib/analytics/studyReadiness";

interface StudyBriefViewProps {
  study: FieldStudy | StudyMeta;
  onRefreshStudy?: () => void;
  onUpdateMeta?: (updatedMeta: StudyMeta) => Promise<void>;
  onNavigateToTab: (tabId: WorkspaceTabId) => void;
  onCloneDemoStudy?: (studyId: string) => void;
}

export function StudyBriefView({
  study,
  onUpdateMeta,
  onNavigateToTab,
  onCloneDemoStudy,
}: StudyBriefViewProps) {
  const isDemo = study.isDemoCase;
  const readiness = computeStudyReadiness(study);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: study.title || "",
    subtitle: study.subtitle || "",
    purpose: study.purpose || study.context || "",
    background: study.background || study.context || "",
    intendedAudience: study.intendedAudience || "",
    decisionUse: study.decisionUse || "",
    geography: study.geography || (study.scope?.targetSites || []).join(", "),
    timeframe: study.timeframe || "",
    ownerLead: study.ownerLead || "",
    status: study.status || "Active Fieldwork",
    limitations: (study.limitations || []).join("\n"),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateMeta || isDemo) return;

    try {
      setIsSaving(true);
      const parsedLimitations = formData.limitations
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const updated: StudyMeta = {
        ...study,
        title: formData.title.trim() || study.title,
        subtitle: formData.subtitle.trim() || study.subtitle,
        purpose: formData.purpose.trim(),
        context: formData.background.trim() || study.context,
        background: formData.background.trim(),
        intendedAudience: formData.intendedAudience.trim(),
        decisionUse: formData.decisionUse.trim(),
        geography: formData.geography.trim(),
        timeframe: formData.timeframe.trim(),
        ownerLead: formData.ownerLead.trim(),
        status: formData.status as StudyMeta["status"],
        limitations: parsedLimitations,
        updatedAt: Date.now(),
      };

      await onUpdateMeta(updated);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save study brief:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fls-study-brief-container space-y-6">
      {/* 1. Readiness Diagnostic Banner */}
      <StudyReadinessBanner
        readiness={readiness}
        onNavigateToTab={onNavigateToTab}
      />

      {/* 2. Top Banner / Mode Notice */}
      {isDemo && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="rounded bg-[var(--surface-raised)] px-2 py-0.5 font-bold uppercase tracking-wider text-[var(--muted)] text-[10px]">
              SHOWCASE DATA · READ-ONLY
            </span>
            <span className="text-[var(--foreground)]">
              This is a curated reference study blueprint. To edit or customize the charter, clone it to your local studies.
            </span>
          </div>
          {onCloneDemoStudy && (
            <button
              type="button"
              onClick={() => onCloneDemoStudy(study.id)}
              className="rounded bg-[var(--trace)] px-3 py-1 font-semibold text-white hover:opacity-90"
            >
              Clone to My Studies
            </button>
          )}
        </div>
      )}

      {/* 3. Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--trace)]">
            Step 1 · DEFINE · Sub-View 1
          </span>
          <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
            Study Brief & Operational Charter
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Foundational blueprint establishing what this inquiry is, why it exists, and how its findings will be applied.
          </p>
        </div>

        {!isDemo && (
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs font-semibold text-[var(--success)] animate-pulse">
                ✓ Saved successfully
              </span>
            )}
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded bg-[var(--trace)] px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Charter"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
              >
                ✎ Edit Study Brief
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Main Brief Content or Edit Form */}
      {isEditing && !isDemo ? (
        <form onSubmit={handleSave} className="space-y-6">
          {/* SECTION A: Core Identity (Mandatory / Core) */}
          <div className="rounded-xl border border-[var(--trace-subtle)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--trace-muted)] text-[10px] text-[var(--trace)] font-bold">
                  A
                </span>
                Core Charter & Purpose (Essential)
              </h3>
              <span className="text-[10px] uppercase font-bold text-[var(--trace)] bg-[var(--trace-muted)] px-2 py-0.5 rounded">
                Core
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Study Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Community Bridges Initiative"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Subtitle / Operational Descriptor
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Youth and Women's Participation in Local Peacebuilding"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Purpose & Core Objective *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Why does this study exist? What primary decision or learning need will it satisfy?"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Intended Audience
                </label>
                <input
                  type="text"
                  value={formData.intendedAudience}
                  onChange={(e) => setFormData({ ...formData, intendedAudience: e.target.value })}
                  placeholder="e.g. Steering Committee, Donor Program Officers, Local Councils"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Decision Use & Intended Action
                </label>
                <input
                  type="text"
                  value={formData.decisionUse}
                  onChange={(e) => setFormData({ ...formData, decisionUse: e.target.value })}
                  placeholder="e.g. Mid-term resource allocation, safety protocol revisions"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>
            </div>
          </div>

          {/* SECTION B: Operational Context & Timing (Contextual) */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[10px] text-[var(--muted)] font-bold">
                  B
                </span>
                Operating Context & Timing (Contextual)
              </h3>
              <span className="text-[10px] uppercase font-bold text-[var(--muted)] bg-[var(--surface-raised)] px-2 py-0.5 rounded">
                Context
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Background & Situational Context
                </label>
                <textarea
                  rows={3}
                  value={formData.background}
                  onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                  placeholder="Describe historical context, community dynamics, previous interventions, and operational setting..."
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Geography / Operational Sites
                </label>
                <input
                  type="text"
                  value={formData.geography}
                  onChange={(e) => setFormData({ ...formData, geography: e.target.value })}
                  placeholder="e.g. Al Noor District, River East, North Ridge"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Inquiry Timeframe
                </label>
                <input
                  type="text"
                  value={formData.timeframe}
                  onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                  placeholder="e.g. February 2026 – May 2026"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>
            </div>
          </div>

          {/* SECTION C: Governance & Delivery */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[10px] text-[var(--muted)] font-bold">
                  C
                </span>
                Governance & Accountability
              </h3>
              <span className="text-[10px] uppercase font-bold text-[var(--muted)] bg-[var(--surface-raised)] px-2 py-0.5 rounded">
                Governance
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Study Owner / Lead Researcher
                </label>
                <input
                  type="text"
                  value={formData.ownerLead}
                  onChange={(e) => setFormData({ ...formData, ownerLead: e.target.value })}
                  placeholder="e.g. Dr. Laila Al-Mansoor (Principal MEL Advisor)"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Current Study Lifecycle Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as StudyMeta["status"] })}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
                >
                  <option value="Active Fieldwork">Active Fieldwork</option>
                  <option value="Synthesis">Synthesis</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Methodological Limitations & Constraints (one per line)
                </label>
                <textarea
                  rows={3}
                  value={formData.limitations}
                  onChange={(e) => setFormData({ ...formData, limitations: e.target.value })}
                  placeholder="e.g. Lack of closed-loop clinic referral databases&#10;Limited road access in rainy season"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-[var(--trace)] px-6 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Charter Changes"}
            </button>
          </div>
        </form>
      ) : (
        /* Read-only Document Presentation (Structured Document Layout) */
        <article className="fls-study-charter-sheet space-y-6">
          {/* Header Card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--trace)]">
                  Study Charter · {study.status}
                </span>
                <h1 className="mt-1 text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
                  {study.title}
                </h1>
                {study.subtitle && (
                  <p className="mt-1 text-sm font-medium text-[var(--muted)]">
                    {study.subtitle}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] border border-[var(--border)]">
                  {study.status}
                </span>
              </div>
            </div>

            {/* Purpose Callout */}
            <div className="rounded-lg bg-[var(--trace-muted)] border-l-4 border-[var(--trace)] p-4 my-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
                Core Purpose & Intended Decision Use
              </span>
              <p className="mt-1 text-sm text-[var(--foreground)] leading-relaxed font-medium">
                {study.purpose || study.context || "No purpose statement defined yet."}
              </p>
            </div>

            {/* Audience & Decision Use */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Intended Audience
                </span>
                <p className="mt-1 text-xs text-[var(--foreground)] font-medium">
                  {study.intendedAudience || "Not specified (General MEL Reviewers)"}
                </p>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Decision Use
                </span>
                <p className="mt-1 text-xs text-[var(--foreground)] font-medium">
                  {study.decisionUse || "Inform ongoing field activities and milestone reports"}
                </p>
              </div>
            </div>
          </div>

          {/* Operating Context & Geography */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-3">
              Operating Context & Setting
            </h3>
            <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-line mb-4">
              {study.background || study.context || "No detailed background recorded."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-[var(--border)] pt-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Geography / Catchment
                </span>
                <p className="mt-1 text-xs font-medium text-[var(--foreground)]">
                  {study.geography || (study.scope?.targetSites || []).join(", ") || "Unspecified"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Inquiry Timeframe
                </span>
                <p className="mt-1 text-xs font-medium text-[var(--foreground)]">
                  {study.timeframe || "Ongoing fieldwork"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Study Lead
                </span>
                <p className="mt-1 text-xs font-medium text-[var(--foreground)]">
                  {study.ownerLead || "Unassigned"}
                </p>
              </div>
            </div>
          </div>

          {/* Methodological Limitations */}
          {study.limitations && study.limitations.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2">
                Recorded Methodological Limitations & Known Constraints
              </h3>
              <p className="text-xs text-[var(--muted)] mb-3">
                Explicit caveats recorded during study formulation to prevent overclaiming during evidence synthesis:
              </p>
              <ul className="space-y-2">
                {study.limitations.map((lim, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-[var(--foreground)]">
                    <span className="text-[var(--trace)] font-bold select-none">•</span>
                    <span>{lim}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Nav Footbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <span className="text-xs text-[var(--muted)]">
              Next Step: Define the core inquiry questions and target field boundaries.
            </span>
            <button
              type="button"
              onClick={() => onNavigateToTab("study-questions")}
              className="rounded bg-[var(--trace)] px-4 py-1.5 text-xs font-bold text-white hover:opacity-90"
            >
              Proceed to Questions & Scope →
            </button>
          </div>
        </article>
      )}
    </div>
  );
}
