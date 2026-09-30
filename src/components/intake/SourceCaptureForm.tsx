"use client";

import React, { useState, useMemo } from "react";
import { scanNarrativeSafety } from "@/lib/sandboxParser";
import { getNextSourceId } from "@/lib/idGenerator";
import { saveSource } from "@/lib/storage/studyStore";
import { CANONICAL_COLLECTION_METHODS } from "@/lib/methodTaxonomy";
import type {
  SourceRecord,
  CollectionMethod,
  ConsentStatus,
  AnonymizationStatus,
  SensitivityFlag,
  FieldStudy,
  MaterialCategory,
} from "@/lib/types";

interface SourceCaptureFormProps {
  study: FieldStudy;
  onSourceSaved: (newSource: SourceRecord) => void;
}

const CONSENT_OPTIONS: ConsentStatus[] = [
  "Written",
  "Oral",
  "Not Required / Public Source",
  "Restricted / Unclear",
];

const ANONYMIZATION_OPTIONS: AnonymizationStatus[] = [
  "Anonymized",
  "Pseudonymized",
  "Identifiable / Restricted",
];

const SENSITIVITY_FLAGS: SensitivityFlag[] = ["None", "Low", "Medium", "High"];

export function SourceCaptureForm({ study, onSourceSaved }: SourceCaptureFormProps) {
  // Aggregate available sites from study scope and existing sources
  const availableSites = useMemo(() => {
    const list: string[] = [];
    if (study.scope?.targetSites) {
      study.scope.targetSites.forEach((s) => {
        if (s && !list.includes(s)) list.push(s);
      });
    }
    study.sources?.forEach((src) => {
      const s = src.siteId || src.location;
      if (s && !list.includes(s)) list.push(s);
    });
    return list.length > 0 ? list : ["Unspecified Site"];
  }, [study.scope, study.sources]);

  // Aggregate available stakeholders from study scope and existing sources
  const availableStakeholders = useMemo(() => {
    const list: string[] = [];
    if (study.scope?.targetStakeholderGroups) {
      study.scope.targetStakeholderGroups.forEach((g) => {
        if (g && !list.includes(g)) list.push(g);
      });
    }
    study.sources?.forEach((src) => {
      if (src.stakeholderType && !list.includes(src.stakeholderType)) {
        list.push(src.stakeholderType);
      }
    });
    return list.length > 0 ? list : ["General Community"];
  }, [study.scope, study.sources]);

  // Aggregate available team roles
  const availableRoles = useMemo(() => {
    const list: string[] = [];
    if (study.teamRoles) {
      study.teamRoles.forEach((r) => {
        const actorName = r.actor?.displayName;
        const title = actorName ? `${actorName} (${r.role})` : r.role;
        if (title && !list.includes(title)) list.push(title);
      });
    }
    return list;
  }, [study.teamRoles]);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [site, setSite] = useState(() => availableSites[0] || "");
  const [customSite, setCustomSite] = useState("");
  const [stakeholder, setStakeholder] = useState(() => availableStakeholders[0] || "");
  const [customStakeholder, setCustomStakeholder] = useState("");
  const [sourceType, setSourceType] = useState<CollectionMethod>(() => {
    return (study.scope?.expectedMethods?.[0] as CollectionMethod) || "Key Informant Interview";
  });
  const [materialCategory, setMaterialCategory] = useState<MaterialCategory>(() => {
    return sourceType === "Document Review" ? "secondary_evidence" : "primary_evidence";
  });
  const [collectorName, setCollectorName] = useState("");
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>("Written");
  const [anonymizationStatus, setAnonymizationStatus] =
    useState<AnonymizationStatus>("Anonymized");
  const [sensitivityFlag, setSensitivityFlag] = useState<SensitivityFlag>("None");
  const [rawText, setRawText] = useState("");
  const [isBypassConfirmed, setIsBypassConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Run deterministic privacy check
  const safetyCheck = useMemo(() => {
    return scanNarrativeSafety(rawText);
  }, [rawText]);

  const effectiveSite = site === "__custom__" ? customSite.trim() : site;
  const effectiveStakeholder =
    stakeholder === "__custom__" ? customStakeholder.trim() : stakeholder;

  const isSaveDisabled =
    isSaving ||
    !title.trim() ||
    !rawText.trim() ||
    !effectiveSite ||
    !effectiveStakeholder ||
    (safetyCheck.hasWarning && !isBypassConfirmed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaveDisabled) return;

    try {
      setIsSaving(true);
      setSaveSuccessMsg(null);

      const existingSourceIds = study.sources.map((s) => s.id);
      const nextId = getNextSourceId(existingSourceIds);
      const now = Date.now();

      const newSource: SourceRecord & { studyId: string } = {
        id: nextId,
        studyId: study.id,
        title: title.trim(),
        date,
        location: effectiveSite,
        siteId: effectiveSite,
        stakeholderType: effectiveStakeholder,
        sourceType,
        collectorName: collectorName.trim() || undefined,
        consentStatus,
        anonymizationStatus,
        sensitivityFlag,
        materialCategory,
        summary:
          rawText.length > 200
            ? `${rawText.trim().slice(0, 197)}...`
            : rawText.trim(),
        rawText: rawText.trim(),
        createdAt: now,
        updatedAt: now,
      };

      await saveSource(newSource);
      onSourceSaved(newSource);

      setSaveSuccessMsg(`Source ${nextId} saved successfully.`);
      setTitle("");
      setRawText("");
      setCollectorName("");
      setIsBypassConfirmed(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save field note.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fls-source-form rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--trace)]">
            Primary Note Intake
          </span>
          <h3 className="text-base font-bold text-[var(--foreground)]">
            Capture Narrative Field Note
          </h3>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="mt-4 flex items-center justify-between rounded border border-emerald-500/40 bg-emerald-950/30 p-3 text-xs text-emerald-300">
          <span>✓ {saveSuccessMsg}</span>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-400 hover:text-emerald-200"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Source Title */}
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Source Title / Short Label <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. KII with School Principal on Meal Hygiene"
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
          />
        </div>

        {/* Provenance Row 1 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Collection Date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Site / Location <span className="text-rose-400">*</span>
            </label>
            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            >
              {availableSites.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="__custom__">+ Custom Site...</option>
            </select>
            {site === "__custom__" && (
              <input
                type="text"
                required
                value={customSite}
                onChange={(e) => setCustomSite(e.target.value)}
                placeholder="Enter custom site name"
                className="mt-1.5 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Stakeholder Group <span className="text-rose-400">*</span>
            </label>
            <select
              value={stakeholder}
              onChange={(e) => setStakeholder(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            >
              {availableStakeholders.map((sg) => (
                <option key={sg} value={sg}>
                  {sg}
                </option>
              ))}
              <option value="__custom__">+ Custom Stakeholder...</option>
            </select>
            {stakeholder === "__custom__" && (
              <input
                type="text"
                required
                value={customStakeholder}
                onChange={(e) => setCustomStakeholder(e.target.value)}
                placeholder="Enter custom stakeholder"
                className="mt-1.5 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              />
            )}
          </div>
        </div>

        {/* Provenance Row 2 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Collection Method <span className="text-rose-400">*</span>
            </label>
            <select
              value={sourceType}
              onChange={(e) => {
                const m = e.target.value as CollectionMethod;
                setSourceType(m);
                if (m === "Document Review") {
                  setMaterialCategory("secondary_evidence");
                } else {
                  setMaterialCategory("primary_evidence");
                }
              }}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            >
              {CANONICAL_COLLECTION_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Material Category
            </label>
            <select
              value={materialCategory}
              onChange={(e) => setMaterialCategory(e.target.value as MaterialCategory)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            >
              <option value="primary_evidence">Primary Field Observation / Interview</option>
              <option value="secondary_evidence">Secondary Document / Review</option>
              <option value="supervisory_interpretation">Supervisory Reflection / Debrief</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Collector / Practitioner Role
            </label>
            <input
              type="text"
              list="study-roles-list"
              value={collectorName}
              onChange={(e) => setCollectorName(e.target.value)}
              placeholder="e.g. Lead Evaluator or Field Officer"
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
            />
            {availableRoles.length > 0 && (
              <datalist id="study-roles-list">
                {availableRoles.map((role) => (
                  <option key={role} value={role} />
                ))}
              </datalist>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Consent Status
            </label>
            <select
              value={consentStatus}
              onChange={(e) => setConsentStatus(e.target.value as ConsentStatus)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            >
              {CONSENT_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Provenance Row 3 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Anonymization Status
            </label>
            <select
              value={anonymizationStatus}
              onChange={(e) =>
                setAnonymizationStatus(e.target.value as AnonymizationStatus)
              }
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            >
              {ANONYMIZATION_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Sensitivity Flag
            </label>
            <select
              value={sensitivityFlag}
              onChange={(e) =>
                setSensitivityFlag(e.target.value as SensitivityFlag)
              }
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
            >
              {SENSITIVITY_FLAGS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Narrative Text */}
        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Narrative Field Note <span className="text-rose-400">*</span>
          </label>
          <textarea
            required
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste or write detailed field notes here. Include chronological context, direct observations, participant responses, and contextual constraints..."
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] p-3 font-sans text-sm leading-relaxed text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--trace)] focus:outline-none"
          />
        </div>

        {/* Safety & Sensitivity Scanner Feedback */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--foreground)]">
              Local Privacy & Safety Check:
            </span>
            {safetyCheck.hasWarning ? (
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                ⚠ Warning Triggered ({safetyCheck.warnings.length})
              </span>
            ) : (
              <span className="text-xs text-[var(--muted)]">
                ✓ No automated warning detected
              </span>
            )}
          </div>

          {safetyCheck.hasWarning ? (
            <div className="mt-3 space-y-2">
              <div className="rounded border border-amber-500/30 bg-amber-950/20 p-2.5 text-xs text-amber-200">
                <p className="font-semibold">
                  This note may contain sensitive or identifying details:
                </p>
                <ul className="mt-1 list-disc pl-4 text-[11px] text-amber-300">
                  {safetyCheck.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
                <p className="mt-1.5 text-[11px] text-amber-400">
                  Please review and remove sensitive identifying details before continuing, or confirm authorization for local intake.
                </p>
              </div>

              <label className="flex items-center gap-2 pt-1 text-xs text-[var(--foreground)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBypassConfirmed}
                  onChange={(e) => setIsBypassConfirmed(e.target.checked)}
                  className="accent-amber-400"
                />
                <span>
                  I have reviewed the warning and confirm I am authorized to save this information in this local study.
                </span>
              </label>
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Regex scanner checked for common PII patterns (names, dates, emails,
              phone numbers). Notice: automated checks do not guarantee complete
              anonymization.
            </p>
          )}
        </div>

        {/* Submit Action */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaveDisabled}
            className="rounded bg-[var(--accent)] px-5 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? "Saving..." : "Save Source Record"}
          </button>
        </div>
      </form>
    </div>
  );
}
