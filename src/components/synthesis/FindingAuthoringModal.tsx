"use client";

import { WorkspaceDialog } from "@/components/WorkspaceDialog";
import React, { useState, useMemo } from "react";
import type {
  Finding,
  FindingId,
  EvidenceEntry,
  EvidenceEntryId,
  SourceRecord,
  StudyScopeConfig,
  StudyQuestion,
} from "@/lib/types";
import { computeSupportProfile } from "@/lib/analytics/supportProfile";
import { getNextFindingId } from "@/lib/idGenerator";
import { isEvidenceEligibleForAnalysis } from "@/lib/storage/normalization";

interface FindingAuthoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveFinding: (finding: Finding) => void;
  existingFindings: Finding[];
  qualifiedEvidence?: EvidenceEntry[];
  validatedEvidence?: EvidenceEntry[];
  allEvidence?: EvidenceEntry[];
  sources: SourceRecord[];
  scope: StudyScopeConfig;
  questions: StudyQuestion[];
  initialEvidenceIds?: EvidenceEntryId[];
  initialQuestionId?: string | null;
  initialStatement?: string;
  initialExplanation?: string;
  initialOriginPatternNoteId?: string;
  initialFrameworkThemeIds?: string[];
  initialContradictionNote?: string;
  initialFinding?: Finding | null;
}

export function FindingAuthoringModal(props: FindingAuthoringModalProps) {
  if (!props.isOpen) return null;

  const key =
    props.initialFinding?.id ||
    `${props.initialQuestionId || "none"}-${props.initialStatement || "blank"}`;

  return <FindingAuthoringModalContent key={key} {...props} />;
}

function FindingAuthoringModalContent({
  onClose,
  onSaveFinding,
  existingFindings,
  qualifiedEvidence,
  validatedEvidence,
  allEvidence,
  sources,
  scope,
  questions,
  initialEvidenceIds = [],
  initialQuestionId,
  initialStatement = "",
  initialExplanation = "",
  initialOriginPatternNoteId,
  initialFrameworkThemeIds,
  initialContradictionNote = "",
  initialFinding = null,
}: Omit<FindingAuthoringModalProps, "isOpen">) {
  const [statement, setStatement] = useState(
    initialFinding ? initialFinding.statement : initialStatement
  );
  const [explanation, setExplanation] = useState(
    initialFinding ? initialFinding.explanation : initialExplanation
  );
  const [programmeImplication, setProgrammeImplication] = useState(
    initialFinding ? initialFinding.programmeImplication : ""
  );
  const [contradictoryEvidence, setContradictoryEvidence] = useState(
    initialFinding ? initialFinding.contradictoryEvidence || "" : initialContradictionNote
  );
  const [supportingEvidenceIds, setSupportingEvidenceIds] = useState<EvidenceEntryId[]>(
    initialFinding ? initialFinding.supportingEvidenceIds || [] : initialEvidenceIds
  );
  const [contradictoryEvidenceIds, setContradictoryEvidenceIds] = useState<EvidenceEntryId[]>(
    initialFinding?.contradictoryEvidenceIds || []
  );
  const [qualifyingEvidenceIds, setQualifyingEvidenceIds] = useState<EvidenceEntryId[]>(
    initialFinding?.qualifyingEvidenceIds || []
  );
  const [studyQuestionId, setStudyQuestionId] = useState(
    initialFinding ? initialFinding.studyQuestionId || "" : initialQuestionId || ""
  );
  const [isStakeholderSpecific, setIsStakeholderSpecific] = useState(
    initialFinding ? Boolean(initialFinding.isStakeholderSpecific) : false
  );
  const [targetStakeholderGroup, setTargetStakeholderGroup] = useState(
    initialFinding
      ? initialFinding.targetStakeholderGroup || ""
      : scope.targetStakeholderGroups?.[0] || ""
  );
  const [limitationNote, setLimitationNote] = useState(
    initialFinding ? initialFinding.limitationNote || "" : ""
  );
  const [roleFilter, setRoleFilter] = useState<"all" | "support" | "contradict" | "qualify">("all");
  const [error, setError] = useState<string | null>(null);

  // Available qualified evidence pool (plus any historical items linked in initialFinding)
  const candidatePool = useMemo(() => {
    if (qualifiedEvidence) return qualifiedEvidence;
    if (validatedEvidence) return validatedEvidence;
    if (allEvidence) return allEvidence.filter(isEvidenceEligibleForAnalysis);
    return [];
  }, [qualifiedEvidence, validatedEvidence, allEvidence]);

  const displayEvidenceList = useMemo(() => {
    const list = [...candidatePool];
    const existingIds = new Set(candidatePool.map((e) => e.id));
    if (allEvidence) {
      const historicalIds = new Set([
        ...supportingEvidenceIds,
        ...contradictoryEvidenceIds,
        ...qualifyingEvidenceIds,
      ]);
      for (const ev of allEvidence) {
        if (historicalIds.has(ev.id) && !existingIds.has(ev.id)) {
          list.push(ev);
        }
      }
    }
    return list;
  }, [candidatePool, allEvidence, supportingEvidenceIds, contradictoryEvidenceIds, qualifyingEvidenceIds]);

  const handleAssignRole = (
    id: EvidenceEntryId,
    targetRole: "SUPPORT" | "CONTRADICT" | "QUALIFY"
  ) => {
    const isSupp = supportingEvidenceIds.includes(id);
    const isContra = contradictoryEvidenceIds.includes(id);
    const isQual = qualifyingEvidenceIds.includes(id);

    // If already in target role, unassign (toggle off)
    if (
      (targetRole === "SUPPORT" && isSupp) ||
      (targetRole === "CONTRADICT" && isContra) ||
      (targetRole === "QUALIFY" && isQual)
    ) {
      setSupportingEvidenceIds((prev) => prev.filter((i) => i !== id));
      setContradictoryEvidenceIds((prev) => prev.filter((i) => i !== id));
      setQualifyingEvidenceIds((prev) => prev.filter((i) => i !== id));
      return;
    }

    // Move to target role (mutually exclusive across the 3 roles for this finding)
    setSupportingEvidenceIds((prev) =>
      targetRole === "SUPPORT" ? [...prev.filter((i) => i !== id), id] : prev.filter((i) => i !== id)
    );
    setContradictoryEvidenceIds((prev) =>
      targetRole === "CONTRADICT" ? [...prev.filter((i) => i !== id), id] : prev.filter((i) => i !== id)
    );
    setQualifyingEvidenceIds((prev) =>
      targetRole === "QUALIFY" ? [...prev.filter((i) => i !== id), id] : prev.filter((i) => i !== id)
    );
  };

  // Compute live Evidence Support Profile
  const tempFinding: Finding = useMemo(() => {
    return {
      id: (initialFinding?.id || "FND-DRAFT") as FindingId,
      statement: statement.trim(),
      explanation: explanation.trim(),
      supportingEvidenceIds,
      contradictoryEvidenceIds: contradictoryEvidenceIds.length > 0 ? contradictoryEvidenceIds : undefined,
      qualifyingEvidenceIds: qualifyingEvidenceIds.length > 0 ? qualifyingEvidenceIds : undefined,
      contradictoryEvidence: contradictoryEvidence.trim(),
      evidenceStrength: "Medium",
      programmeImplication: programmeImplication.trim(),
      linkedRecommendationIds: initialFinding?.linkedRecommendationIds || [],
      isStakeholderSpecific,
      targetStakeholderGroup: isStakeholderSpecific ? targetStakeholderGroup : undefined,
      studyQuestionId: studyQuestionId || undefined,
      limitationNote: limitationNote.trim() || undefined,
      validationStatus: initialFinding?.validationStatus || "Draft",
      revision: initialFinding?.revision || 1,
    };
  }, [
    initialFinding,
    statement,
    explanation,
    supportingEvidenceIds,
    contradictoryEvidenceIds,
    qualifyingEvidenceIds,
    contradictoryEvidence,
    programmeImplication,
    isStakeholderSpecific,
    targetStakeholderGroup,
    studyQuestionId,
    limitationNote,
  ]);

  const supportProfile = useMemo(() => {
    if (supportingEvidenceIds.length === 0) return null;
    return computeSupportProfile(tempFinding, scope, displayEvidenceList, sources);
  }, [tempFinding, scope, displayEvidenceList, sources, supportingEvidenceIds]);

  const isEmergingOrHasGaps = useMemo(() => {
    if (!supportProfile) return false;
    const isEmerging = supportProfile.supportTier === "Emerging";
    const hasContradictions =
      supportProfile.contradictionState.hasContradictions &&
      supportProfile.contradictionState.unresolvedCount > 0;
    const hasMissingSites = supportProfile.siteCoverage.missingSites.length > 0;
    const hasMissingStakeholders = supportProfile.stakeholderCoverage.missingTargetStakeholders.length > 0;
    return isEmerging || hasContradictions || hasMissingSites || hasMissingStakeholders;
  }, [supportProfile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) {
      setError("Finding statement is required.");
      return;
    }
    if (supportingEvidenceIds.length === 0) {
      setError("A finding must link to at least one qualified supporting evidence entry.");
      return;
    }

    const nextId =
      initialFinding?.id ||
      getNextFindingId(existingFindings.map((f) => f.id));

    const finalFinding: Finding = {
      ...initialFinding,
      ...tempFinding,
      id: nextId,
      statement: statement.trim(),
      explanation: explanation.trim(),
      programmeImplication: programmeImplication.trim(),
      contradictoryEvidence: contradictoryEvidence.trim() || "",
      supportingEvidenceIds,
      contradictoryEvidenceIds: contradictoryEvidenceIds.length > 0 ? contradictoryEvidenceIds : undefined,
      qualifyingEvidenceIds: qualifyingEvidenceIds.length > 0 ? qualifyingEvidenceIds : undefined,
      studyQuestionId: studyQuestionId || undefined,
      originPatternNoteId: initialFinding?.originPatternNoteId || initialOriginPatternNoteId,
      frameworkThemeIds: initialFinding?.frameworkThemeIds || initialFrameworkThemeIds,
      limitationNote: limitationNote.trim() || undefined,
      validationStatus: initialFinding ? initialFinding.validationStatus : "Draft",
      revision: initialFinding ? initialFinding.revision : 1,
      createdAt: initialFinding?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSaveFinding(finalFinding);
    onClose();
  };

  return (
    <WorkspaceDialog labelledBy="finding-modal-title" onClose={onClose} wide>
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
              Finding Authoring
            </span>
            <span className="rounded bg-slate-500/10 border border-slate-500/30 px-1.5 py-0.2 text-[9px] font-semibold text-[var(--muted)]">
              {initialFinding?.validationStatus || "Draft"} · Revision {initialFinding?.revision || 1}
            </span>
          </div>
          <h3 id="finding-modal-title" className="text-lg font-semibold text-[var(--foreground)]">
            {initialFinding ? `Edit Finding (${initialFinding.id})` : "Synthesize New Draft Finding"}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Transform qualified field evidence into an evaluator-authored claim.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {initialFinding?.validationStatus === "Validated" && (
          <div className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-soft)] p-3 text-xs text-[var(--warning-text)]">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--warning-text)]">
              <span>ℹ Substantive Edit Notice</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--warning-border)]/40 text-[var(--warning-text)]">
                Advances to Revision {(initialFinding.revision || 1) + 1}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--warning-text)] opacity-90">
              This finding is currently <strong>Validated</strong>. Saving changes to its statement, explanation, or evidence links will advance its revision and return its status to <strong>Needs Review</strong> for renewed evaluator re-certification. Prior validation history is safely preserved.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Finding Form Fields (7 cols) */}
          <div className="space-y-4 lg:col-span-7">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                Finding Statement <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="e.g. Late meal distribution appears to reduce consistent access to school meals."
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                Explanation & Context
              </label>
              <textarea
                rows={3}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Provide supporting context explaining why this pattern occurs..."
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                Programme Implication
              </label>
              <textarea
                rows={2}
                value={programmeImplication}
                onChange={(e) => setProgrammeImplication(e.target.value)}
                placeholder="What operational or strategic adjustments does this evidence demand?"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                Contradictory / Disconfirming Evidence
              </label>
              <textarea
                rows={2}
                value={contradictoryEvidence}
                onChange={(e) => setContradictoryEvidence(e.target.value)}
                placeholder="Note any counter-perspectives, exceptional sites, or contradictory evidence (or write 'None')."
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                  Associated Study Question
                </label>
                <select
                  aria-label="Associated Study Question"
                  value={studyQuestionId}
                  onChange={(e) => setStudyQuestionId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--trace)] focus:outline-none"
                >
                  <option value="">None / Cross-cutting</option>
                  {questions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.id}: {q.shortLabel || q.question.slice(0, 25)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                  Stakeholder Scope
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sh-specific"
                    checked={isStakeholderSpecific}
                    onChange={(e) => setIsStakeholderSpecific(e.target.checked)}
                    className="rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)]"
                  />
                  <label htmlFor="sh-specific" className="text-xs text-[var(--foreground)] cursor-pointer">
                    Group-Specific Claim
                  </label>
                </div>
                {isStakeholderSpecific && (
                  <select
                    aria-label="Target stakeholder group"
                    value={targetStakeholderGroup}
                    onChange={(e) => setTargetStakeholderGroup(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs text-[var(--foreground)]"
                  >
                    {scope.targetStakeholderGroups?.map((sh) => (
                      <option key={sh} value={sh}>
                        {sh}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Evidence Coverage Limitations & Contextual Boundaries */}
            {isEmergingOrHasGaps && (
              <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
                <div className="flex items-center gap-2 text-amber-300">
                  <span className="text-sm">⚠️</span>
                  <label className="text-xs font-bold uppercase tracking-wider">
                    Coverage Limitations & Contextual Boundaries
                  </label>
                </div>
                <p className="mt-1 text-[11px] text-amber-200/80">
                  Document any evidentiary gaps, unconsulted stakeholder perspectives, or geographic limitations for this finding before validation.
                </p>
                <textarea
                  rows={2}
                  value={limitationNote}
                  onChange={(e) => setLimitationNote(e.target.value)}
                  placeholder="e.g. Assiut evidence remains limited; conclusion is provisional for cross-site comparison."
                  className="mt-2 w-full rounded-lg border border-amber-700/50 bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)] placeholder-amber-400/40 focus:border-amber-400 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Right Column: Live Evidence Coverage & Supporting Evidence Selection (5 cols) */}
          <div className="space-y-4 lg:col-span-5">
            {/* Live Evidence Coverage Card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--trace)]">
                  Evidence Coverage & Limitations
                </h4>
                {supportProfile && (
                  <span className="rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)]">
                    {supportProfile.independentSourceCount} distinct source record{supportProfile.independentSourceCount !== 1 ? "s" : ""} · {supportProfile.methodDiversity.methodsFound.length} method{supportProfile.methodDiversity.methodsFound.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {supportProfile ? (
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-[var(--foreground)]">
                    <span className="text-[var(--muted)]">Distinct Source Records:</span>
                    <span className="font-semibold">{supportProfile.independentSourceCount} record{supportProfile.independentSourceCount !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="flex justify-between text-[var(--foreground)]">
                    <span className="text-[var(--muted)]">Methods Found:</span>
                    <span className="font-semibold">
                      {supportProfile.methodDiversity.methodsFound.length > 0
                        ? supportProfile.methodDiversity.methodsFound.join(", ")
                        : "None"}
                    </span>
                  </div>

                  <div className="flex justify-between text-[var(--foreground)]">
                    <span className="text-[var(--muted)]">Sites Represented:</span>
                    <span className="font-semibold">
                      {supportProfile.siteCoverage.sitesFound.length > 0
                        ? supportProfile.siteCoverage.sitesFound.join(", ")
                        : "None"}
                    </span>
                  </div>

                  {supportProfile.siteCoverage.missingSites.length > 0 && (
                    <div className="rounded bg-amber-950/30 p-1.5 text-[11px] text-amber-300">
                      Missing site coverage: {supportProfile.siteCoverage.missingSites.join(", ")}
                    </div>
                  )}

                  <div className="flex justify-between text-[var(--foreground)]">
                    <span className="text-[var(--muted)]">Stakeholders:</span>
                    <span className="font-semibold">
                      {supportProfile.stakeholderCoverage.stakeholdersFound.length > 0
                        ? supportProfile.stakeholderCoverage.stakeholdersFound.join(", ")
                        : "None"}
                    </span>
                  </div>

                  <div className="flex justify-between text-[var(--foreground)]">
                    <span className="text-[var(--muted)]">Challenging Evidence:</span>
                    <span className={`font-semibold ${supportProfile.contradictionState.hasContradictions ? "text-amber-400" : "text-emerald-400"}`}>
                      {supportProfile.contradictionState.hasContradictions
                        ? `${supportProfile.contradictionState.unresolvedCount} noted / unresolved`
                        : "None flagged"}
                    </span>
                  </div>

                  {supportProfile.transparencyFlags.length > 0 && (
                    <div className="mt-2 border-t border-[var(--border)] pt-2">
                      <span className="text-[10px] font-bold uppercase text-[var(--muted)]">
                        Diagnostic Flags:
                      </span>
                      <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px] text-[var(--muted)]">
                        {supportProfile.transparencyFlags.map((flag, idx) => {
                          const cleanedFlag = flag.replace(/independent sources?/gi, (m) =>
                            m.toLowerCase().endsWith("s") ? "distinct source records" : "distinct source record"
                          );
                          return <li key={idx}>{cleanedFlag}</li>;
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs italic text-[var(--muted)] text-center py-4">
                  Select at least 1 qualified supporting evidence entry below to calculate evidentiary support.
                </p>
              )}
            </div>

            {/* Typed Evidence Relationship Authoring */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-strong)]">
                  Link Evidence by Analytical Role
                </label>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-emerald-400 font-semibold">
                    {supportingEvidenceIds.length} Support
                  </span>
                  <span className="rounded bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 text-rose-400 font-semibold">
                    {contradictoryEvidenceIds.length} Contradict
                  </span>
                  <span className="rounded bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.5 text-indigo-400 font-semibold">
                    {qualifyingEvidenceIds.length} Qualify
                  </span>
                </div>
              </div>

              {/* Role Filter Tabs */}
              <div className="flex items-center gap-1 text-[11px] border-b border-[var(--border)] pb-2">
                <button
                  type="button"
                  onClick={() => setRoleFilter("all")}
                  className={`px-2 py-0.5 rounded cursor-pointer transition ${
                    roleFilter === "all"
                      ? "bg-[var(--surface)] text-[var(--foreground)] font-bold shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  All ({displayEvidenceList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("support")}
                  className={`px-2 py-0.5 rounded cursor-pointer transition ${
                    roleFilter === "support"
                      ? "bg-emerald-500/20 text-emerald-400 font-bold"
                      : "text-[var(--muted)] hover:text-emerald-400"
                  }`}
                >
                  Support ({supportingEvidenceIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("contradict")}
                  className={`px-2 py-0.5 rounded cursor-pointer transition ${
                    roleFilter === "contradict"
                      ? "bg-rose-500/20 text-rose-400 font-bold"
                      : "text-[var(--muted)] hover:text-rose-400"
                  }`}
                >
                  Contradict ({contradictoryEvidenceIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("qualify")}
                  className={`px-2 py-0.5 rounded cursor-pointer transition ${
                    roleFilter === "qualify"
                      ? "bg-indigo-500/20 text-indigo-400 font-bold"
                      : "text-[var(--muted)] hover:text-indigo-400"
                  }`}
                >
                  Qualify ({qualifyingEvidenceIds.length})
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-2 space-y-2">
                {displayEvidenceList
                  .filter((ev) => {
                    if (roleFilter === "support") return supportingEvidenceIds.includes(ev.id);
                    if (roleFilter === "contradict") return contradictoryEvidenceIds.includes(ev.id);
                    if (roleFilter === "qualify") return qualifyingEvidenceIds.includes(ev.id);
                    return true;
                  })
                  .map((ev) => {
                    const isSupp = supportingEvidenceIds.includes(ev.id);
                    const isContra = contradictoryEvidenceIds.includes(ev.id);
                    const isQual = qualifyingEvidenceIds.includes(ev.id);
                    const isAdmissible = isEvidenceEligibleForAnalysis(ev);
                    const isExcluded = ev.reviewStatus === "excluded";
                    const isNeedsClarification = ev.reviewStatus === "needs_clarification";

                    return (
                      <div
                        key={ev.id}
                        className={`rounded-lg border p-2.5 text-xs transition space-y-2 ${
                          isSupp
                            ? "border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                            : isContra
                            ? "border-rose-500/40 bg-rose-500/5 ring-1 ring-rose-500/30"
                            : isQual
                            ? "border-indigo-500/40 bg-indigo-500/5 ring-1 ring-indigo-500/30"
                            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-[var(--trace)]">
                              {ev.id}
                            </span>
                            {ev.siteId && (
                              <span className="text-[10px] text-[var(--muted)]">({ev.siteId})</span>
                            )}
                            <span className="text-[10px] text-[var(--muted)]">
                              • {ev.stakeholderType || "General"}
                            </span>
                            {isExcluded && (
                              <span className="rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1 py-0.2 text-[9px] font-bold uppercase">
                                Excluded
                              </span>
                            )}
                            {isNeedsClarification && (
                              <span className="rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0.2 text-[9px] font-bold uppercase">
                                Clarification
                              </span>
                            )}
                          </div>

                          {/* Role Action Buttons (mutually exclusive across the 3 roles) */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAssignRole(ev.id, "SUPPORT")}
                              disabled={!isAdmissible && !isSupp}
                              title={
                                isExcluded
                                  ? "Excluded evidence cannot support a finding"
                                  : isNeedsClarification
                                  ? "Evidence flagged for clarification cannot support a finding until clarified"
                                  : "Assign as Supporting Evidence"
                              }
                              className={`rounded px-2 py-0.5 text-[10px] font-semibold transition cursor-pointer ${
                                isSupp
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : isExcluded || isNeedsClarification
                                  ? "opacity-30 cursor-not-allowed bg-slate-500/10 text-slate-400"
                                  : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                              }`}
                            >
                              {isSupp ? "✓ Support" : "+ Support"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAssignRole(ev.id, "CONTRADICT")}
                              disabled={!isAdmissible && !isContra}
                              title="Assign as Challenging / Contradictory Evidence"
                              className={`rounded px-2 py-0.5 text-[10px] font-semibold transition cursor-pointer ${
                                isContra
                                  ? "bg-rose-600 text-white shadow-sm"
                                  : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30"
                              }`}
                            >
                              {isContra ? "✓ Contradict" : "+ Contradict"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAssignRole(ev.id, "QUALIFY")}
                              disabled={!isAdmissible && !isQual}
                              title="Assign as Qualifying / Bounding Evidence"
                              className={`rounded px-2 py-0.5 text-[10px] font-semibold transition cursor-pointer ${
                                isQual
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30"
                              }`}
                            >
                              {isQual ? "✓ Qualify" : "+ Qualify"}
                            </button>
                          </div>
                        </div>

                        <p className="line-clamp-2 text-[11px] text-[var(--foreground)] leading-relaxed italic">
                          &ldquo;{ev.rawObservation || ev.rawEvidence}&rdquo;
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        <div className="fls-dialog-actions">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)]"
          >
            {initialFinding ? "Save Finding Changes" : "Save as Draft Finding"}
          </button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
