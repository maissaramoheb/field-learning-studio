"use client";

import React, { useState, useMemo } from "react";
import type {
  FieldStudy,
  LessonLearned,
  LessonLearnedId,
  GoodPractice,
  GoodPracticeId,
  Finding,
  ValidationStatus,
} from "@/lib/types";
import type { TraceHandlers } from "@/components/FieldLearningStudioApp";
import {
  saveLesson,
  deleteLesson,
  saveGoodPractice,
  deleteGoodPractice,
} from "@/lib/storage";
import {
  submitForReview,
  validateArtifact,
  rejectArtifact,
  reopenRejectedArtifact,
} from "@/lib/validation/validationLifecycle";
import { WorkspaceDialog } from "@/components/WorkspaceDialog";
import { getNextLessonId, getNextGoodPracticeId } from "@/lib/idGenerator";

interface LessonsWorkspaceViewProps {
  study: FieldStudy;
  traceHandlers: TraceHandlers;
  onRefreshStudy?: () => Promise<void>;
  onOpenTab?: (tab: string) => void;
}

export function LessonsWorkspaceView({
  study,
  traceHandlers,
  onRefreshStudy,
  onOpenTab,
}: LessonsWorkspaceViewProps) {
  const isEditable = Boolean(!study.isDemoCase);

  const [activeSubTab, setActiveSubTab] = useState<"lessons" | "practices">("lessons");
  const [isAuthoringOpen, setIsAuthoringOpen] = useState(false);
  const [authoringType, setAuthoringType] = useState<"lesson" | "goodPractice">("lesson");

  // Form State
  const [selectedFindingId, setSelectedFindingId] = useState<string>("");
  const [statement, setStatement] = useState("");
  const [whatWorkedOrDidNotWork, setWhatWorkedOrDidNotWork] = useState("");
  const [whyItHappened, setWhyItHappened] = useState("");
  const [conditionsRequired, setConditionsRequired] = useState("");
  const [transferability, setTransferability] = useState("Applicable across comparable programme contexts");
  // Good Practice specific
  const [gpTitle, setGpTitle] = useState("");
  const [gpDescription, setGpDescription] = useState("");
  const [whyItWorked, setWhyItWorked] = useState("");
  const [conditionsForReplication, setConditionsForReplication] = useState("");
  const [risksLimits, setRisksLimits] = useState("");
  const [recommendedUse, setRecommendedUse] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const findings = useMemo(() => study.findings || [], [study.findings]);
  const validatedFindings = useMemo(
    () => findings.filter((f) => f.validationStatus === "Validated"),
    [findings]
  );
  const findingMap = useMemo(
    () => new Map<string, Finding>(findings.map((f) => [f.id, f])),
    [findings]
  );

  const lessons = useMemo(() => study.lessons || [], [study.lessons]);
  const goodPractices = useMemo(() => study.goodPractices || [], [study.goodPractices]);

  const handleOpenAuthoring = (type: "lesson" | "goodPractice") => {
    setAuthoringType(type);
    setSelectedFindingId(validatedFindings[0]?.id || "");
    const initialF = validatedFindings[0];
    if (type === "lesson") {
      setStatement(initialF ? `Lesson: ${initialF.statement}` : "");
      setWhatWorkedOrDidNotWork("");
      setWhyItHappened(initialF ? initialF.explanation : "");
      setConditionsRequired("");
      setTransferability("Applicable across comparable programme contexts");
    } else {
      setGpTitle(initialF ? `Practice: ${initialF.statement.slice(0, 50)}` : "");
      setGpDescription(initialF ? initialF.explanation : "");
      setWhyItWorked("");
      setConditionsForReplication("");
      setRisksLimits("Requires dedicated supervision and resourcing");
      setRecommendedUse("Recommended for phased institutional expansion");
    }
    setFormError(null);
    setIsAuthoringOpen(true);
  };

  const handleParentFindingChange = (fId: string) => {
    setSelectedFindingId(fId);
    const f = findingMap.get(fId);
    if (!f) return;
    if (authoringType === "lesson") {
      if (!statement || statement.startsWith("Lesson:")) {
        setStatement(`Lesson: ${f.statement}`);
      }
      if (!whyItHappened) {
        setWhyItHappened(f.explanation);
      }
    } else {
      if (!gpTitle || gpTitle.startsWith("Practice:")) {
        setGpTitle(`Practice: ${f.statement.slice(0, 50)}`);
      }
      if (!gpDescription) {
        setGpDescription(f.explanation);
      }
    }
  };

  const handleSaveOutput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable || !onRefreshStudy) return;

    if (!selectedFindingId) {
      setFormError("A parent validated finding is required to ground this transferable output.");
      return;
    }

    const parentFinding = findingMap.get(selectedFindingId);
    if (!parentFinding || parentFinding.validationStatus !== "Validated") {
      setFormError("The selected parent finding must be in 'Validated' status.");
      return;
    }

    const now = Date.now();

    try {
      if (authoringType === "lesson") {
        if (!statement.trim()) {
          setFormError("Lesson statement is required.");
          return;
        }
        const nextId = getNextLessonId(lessons.map((l) => l.id));
        const newLesson: LessonLearned = {
          id: nextId,
          studyId: study.id,
          statement: statement.trim(),
          whatWorkedOrDidNotWork: whatWorkedOrDidNotWork.trim() || statement.trim(),
          whyItHappened: whyItHappened.trim() || parentFinding.explanation,
          conditionsRequired: conditionsRequired.trim() || "Local contextual alignment and stakeholder consent",
          evidenceBase: parentFinding.supportingEvidenceIds || [],
          linkedFindingIds: [parentFinding.id],
          lineageStatus: "resolved",
          transferability: transferability.trim() || "Applicable across similar contexts",
          validationStatus: "Draft",
          revision: 1,
          audit: {
            provenance: "human",
            createdActor: { kind: "human", displayName: "Analyst" },
            createdAt: now,
            updatedActor: { kind: "human", displayName: "Analyst" },
            updatedAt: now,
          },
          createdAt: now,
          updatedAt: now,
        };
        await saveLesson({ ...newLesson, studyId: study.id });
      } else {
        if (!gpTitle.trim()) {
          setFormError("Good Practice title is required.");
          return;
        }
        const nextId = getNextGoodPracticeId(goodPractices.map((g) => g.id));
        const newPractice: GoodPractice = {
          id: nextId,
          studyId: study.id,
          title: gpTitle.trim(),
          description: gpDescription.trim() || parentFinding.explanation,
          whyItWorked: whyItWorked.trim() || "Demonstrated positive outcome in field implementation",
          conditionsForReplication: conditionsForReplication.trim() || "Adequate staff training and operational oversight",
          risksLimits: risksLimits.trim() || "Resource constraints and logistical barriers",
          recommendedUse: recommendedUse.trim() || "Recommended for phased deployment",
          evidenceBase: parentFinding.supportingEvidenceIds || [],
          linkedFindingIds: [parentFinding.id],
          lineageStatus: "resolved",
          validationStatus: "Draft",
          revision: 1,
          audit: {
            provenance: "human",
            createdActor: { kind: "human", displayName: "Analyst" },
            createdAt: now,
            updatedActor: { kind: "human", displayName: "Analyst" },
            updatedAt: now,
          },
          createdAt: now,
          updatedAt: now,
        };
        await saveGoodPractice({ ...newPractice, studyId: study.id });
      }

      await onRefreshStudy();
      setIsAuthoringOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save transferable output.");
    }
  };

  // Lifecycle actions
  const handleSubmitForReview = async (item: LessonLearned | GoodPractice, type: "lesson" | "practice") => {
    if (!isEditable || !onRefreshStudy) return;
    try {
      const updated = submitForReview(item);
      if (type === "lesson") {
        await saveLesson({ ...(updated as LessonLearned), studyId: study.id });
      } else {
        await saveGoodPractice({ ...(updated as GoodPractice), studyId: study.id });
      }
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to submit for review.");
    }
  };

  const handleValidate = async (item: LessonLearned | GoodPractice, type: "lesson" | "practice") => {
    if (!isEditable || !onRefreshStudy) return;
    const configuredValidator = study.teamRoles?.find((r) => r.role === "validator")?.actor?.displayName;
    const defaultValidator = configuredValidator || "Lead Evaluator";
    const reviewerName = window.prompt("Enter evaluator identity for validation certification:", defaultValidator);
    if (!reviewerName?.trim()) return;

    try {
      const updated = validateArtifact(item, reviewerName.trim(), undefined, {
        evidence: study.evidence,
        sources: study.sources,
        findings: study.findings,
      });
      if (type === "lesson") {
        await saveLesson({ ...(updated as LessonLearned), studyId: study.id });
      } else {
        await saveGoodPractice({ ...(updated as GoodPractice), studyId: study.id });
      }
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to validate.");
    }
  };

  const handleReject = async (item: LessonLearned | GoodPractice, type: "lesson" | "practice") => {
    if (!isEditable || !onRefreshStudy) return;
    const reason = window.prompt("Enter rejection rationale:", "Insufficient transferability grounding.");
    if (!reason?.trim()) return;

    try {
      const updated = rejectArtifact(item, reason.trim());
      if (type === "lesson") {
        await saveLesson({ ...(updated as LessonLearned), studyId: study.id });
      } else {
        await saveGoodPractice({ ...(updated as GoodPractice), studyId: study.id });
      }
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reject.");
    }
  };

  const handleReopen = async (item: LessonLearned | GoodPractice, type: "lesson" | "practice") => {
    if (!isEditable || !onRefreshStudy) return;
    try {
      const updated = reopenRejectedArtifact(item);
      if (type === "lesson") {
        await saveLesson({ ...(updated as LessonLearned), studyId: study.id });
      } else {
        await saveGoodPractice({ ...(updated as GoodPractice), studyId: study.id });
      }
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reopen.");
    }
  };

  const handleDelete = async (id: string, type: "lesson" | "practice") => {
    if (!isEditable || !onRefreshStudy) return;
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      if (type === "lesson") {
        await deleteLesson(study.id, id as LessonLearnedId);
      } else {
        await deleteGoodPractice(study.id, id as GoodPracticeId);
      }
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  };

  const getStatusBadge = (status?: ValidationStatus) => {
    const s = status || "Draft";
    switch (s) {
      case "Validated":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "Needs Review":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "Rejected":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "Draft":
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
                Analysis Workspace 4 of 4
              </span>
              <span className="rounded bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                {lessons.length} Lessons Learned
              </span>
              <span className="rounded bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 text-[10px] font-semibold text-teal-400">
                {goodPractices.length} Good Practices
              </span>
            </div>
            <h1 className="text-xl font-bold text-[var(--foreground)] mt-1">
              Lessons &amp; Good Practices
            </h1>
            <p className="mt-1 text-xs text-[var(--muted)] max-w-3xl leading-relaxed">
              &ldquo;What transferable learning emerges from validated findings?&rdquo; Distill generalizable operational insight, contextual conditions, and replication guidelines strictly grounded in validated findings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTab && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenTab("findings")}
                  className="rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition cursor-pointer"
                >
                  ← Findings Ledger
                </button>
                <button
                  type="button"
                  onClick={() => onOpenTab("recommendations")}
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition cursor-pointer"
                >
                  Deliverables Workspace →
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sub-tab switcher + Action buttons */}
        <div className="mt-5 pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-1">
            <button
              type="button"
              onClick={() => setActiveSubTab("lessons")}
              className={`rounded px-4 py-1.5 font-medium transition cursor-pointer ${
                activeSubTab === "lessons"
                  ? "bg-[var(--surface)] text-[var(--foreground)] font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Lessons Learned ({lessons.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("practices")}
              className={`rounded px-4 py-1.5 font-medium transition cursor-pointer ${
                activeSubTab === "practices"
                  ? "bg-[var(--surface)] text-[var(--foreground)] font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Good Practices ({goodPractices.length})
            </button>
          </div>

          {isEditable && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenAuthoring("lesson")}
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition cursor-pointer"
              >
                + New Lesson Learned
              </button>
              <button
                type="button"
                onClick={() => handleOpenAuthoring("goodPractice")}
                className="rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition cursor-pointer"
              >
                + New Good Practice
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === "lessons" ? (
        <div className="space-y-3">
          {lessons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center text-xs text-[var(--muted)]">
              No lessons learned recorded yet. Synthesize transferable lessons from validated findings.
            </div>
          ) : (
            lessons.map((lesson) => {
              const parentFinding = lesson.linkedFindingIds?.[0]
                ? findingMap.get(lesson.linkedFindingIds[0])
                : null;

              return (
                <div
                  key={lesson.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3 text-xs shadow-sm hover:border-[var(--border-strong)] transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400">
                        {lesson.id}
                      </span>
                      <span
                        className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase ${getStatusBadge(
                          lesson.validationStatus
                        )}`}
                      >
                        {lesson.validationStatus || "Draft"}
                      </span>
                      {parentFinding && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenTab) onOpenTab("findings");
                            traceHandlers.onTraceSelect(parentFinding.id);
                          }}
                          className="font-mono text-[10px] text-[var(--trace)] hover:underline"
                        >
                          Parent Finding: {parentFinding.id}
                        </button>
                      )}
                    </div>

                    {isEditable && (
                      <div className="flex items-center gap-1.5">
                        {(lesson.validationStatus === "Draft" || !lesson.validationStatus) && (
                          <button
                            type="button"
                            onClick={() => handleSubmitForReview(lesson, "lesson")}
                            className="rounded bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[var(--accent-strong)] transition cursor-pointer"
                          >
                            Submit for Review
                          </button>
                        )}
                        {lesson.validationStatus === "Needs Review" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleValidate(lesson, "lesson")}
                              className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 transition cursor-pointer"
                            >
                              Validate
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(lesson, "lesson")}
                              className="rounded bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-500 transition cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {lesson.validationStatus === "Rejected" && (
                          <button
                            type="button"
                            onClick={() => handleReopen(lesson, "lesson")}
                            className="rounded border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition cursor-pointer"
                          >
                            Reopen
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(lesson.id, "lesson")}
                          className="text-[11px] text-[var(--muted)] hover:text-rose-400 p-1 cursor-pointer"
                          aria-label="Delete lesson"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[var(--foreground)] leading-snug">
                    {lesson.statement}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11.5px]">
                    <div className="rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] p-3">
                      <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--muted)] block">
                        What Worked / What Did Not
                      </span>
                      <p className="mt-1 text-[var(--foreground)] leading-relaxed">
                        {lesson.whatWorkedOrDidNotWork}
                      </p>
                    </div>

                    <div className="rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] p-3">
                      <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--muted)] block">
                        Underlying Mechanics / Why
                      </span>
                      <p className="mt-1 text-[var(--foreground)] leading-relaxed">
                        {lesson.whyItHappened}
                      </p>
                    </div>

                    <div className="rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] p-3">
                      <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--muted)] block">
                        Conditions for Transferability
                      </span>
                      <p className="mt-1 text-[var(--foreground)] leading-relaxed">
                        {lesson.conditionsRequired}
                      </p>
                      {lesson.transferability && (
                        <p className="mt-1 text-[10px] text-[var(--muted)] italic">
                          Scope: {lesson.transferability}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {goodPractices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center text-xs text-[var(--muted)]">
              No good practices documented yet. Record replicable practices grounded in validated findings.
            </div>
          ) : (
            goodPractices.map((practice) => {
              const parentFinding = practice.linkedFindingIds?.[0]
                ? findingMap.get(practice.linkedFindingIds[0])
                : null;

              return (
                <div
                  key={practice.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3 text-xs shadow-sm hover:border-[var(--border-strong)] transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-400">
                        {practice.id}
                      </span>
                      <span
                        className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase ${getStatusBadge(
                          practice.validationStatus
                        )}`}
                      >
                        {practice.validationStatus || "Draft"}
                      </span>
                      {parentFinding && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenTab) onOpenTab("findings");
                            traceHandlers.onTraceSelect(parentFinding.id);
                          }}
                          className="font-mono text-[10px] text-[var(--trace)] hover:underline"
                        >
                          Parent Finding: {parentFinding.id}
                        </button>
                      )}
                    </div>

                    {isEditable && (
                      <div className="flex items-center gap-1.5">
                        {(practice.validationStatus === "Draft" || !practice.validationStatus) && (
                          <button
                            type="button"
                            onClick={() => handleSubmitForReview(practice, "practice")}
                            className="rounded bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[var(--accent-strong)] transition cursor-pointer"
                          >
                            Submit for Review
                          </button>
                        )}
                        {practice.validationStatus === "Needs Review" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleValidate(practice, "practice")}
                              className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 transition cursor-pointer"
                            >
                              Validate
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(practice, "practice")}
                              className="rounded bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-500 transition cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {practice.validationStatus === "Rejected" && (
                          <button
                            type="button"
                            onClick={() => handleReopen(practice, "practice")}
                            className="rounded border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition cursor-pointer"
                          >
                            Reopen
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(practice.id, "practice")}
                          className="text-[11px] text-[var(--muted)] hover:text-rose-400 p-1 cursor-pointer"
                          aria-label="Delete practice"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[var(--foreground)] leading-snug">
                    {practice.title}
                  </h3>
                  <p className="text-[12px] text-[var(--foreground)] leading-relaxed">
                    {practice.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11.5px]">
                    <div className="rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] p-3">
                      <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--muted)] block">
                        Why It Worked
                      </span>
                      <p className="mt-1 text-[var(--foreground)] leading-relaxed">
                        {practice.whyItWorked}
                      </p>
                    </div>

                    <div className="rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] p-3">
                      <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--muted)] block">
                        Conditions for Replication
                      </span>
                      <p className="mt-1 text-[var(--foreground)] leading-relaxed">
                        {practice.conditionsForReplication}
                      </p>
                    </div>

                    <div className="rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] p-3">
                      <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--muted)] block">
                        Risks &amp; Recommended Use
                      </span>
                      <p className="mt-1 text-[var(--foreground)] leading-relaxed">
                        {practice.recommendedUse}
                      </p>
                      {practice.risksLimits && (
                        <p className="mt-1 text-[10px] text-amber-300">
                          Limit: {practice.risksLimits}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Authoring Dialog */}
      {isAuthoringOpen && (
        <WorkspaceDialog
          labelledBy="authoring-modal-title"
          onClose={() => setIsAuthoringOpen(false)}
          wide={true}
        >
          <form onSubmit={handleSaveOutput} className="p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
                  Grounding in Validated Evidence
                </span>
                <h2 id="authoring-modal-title" className="text-base font-bold text-[var(--foreground)] mt-0.5">
                  Author {authoringType === "lesson" ? "Lesson Learned" : "Good Practice"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthoringOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="rounded bg-rose-500/10 border border-rose-500/30 p-2.5 text-rose-300">
                {formError}
              </div>
            )}

            {/* Parent Validated Finding Selection */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                Parent Validated Finding (Epistemic Anchor) *
              </label>
              {validatedFindings.length === 0 ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300 text-xs">
                  ⚠ No findings are currently Validated in this study. Lessons and Good Practices must derive strictly from Validated findings. Please validate findings in the Findings Ledger first.
                </div>
              ) : (
                <select
                  value={selectedFindingId}
                  onChange={(e) => handleParentFindingChange(e.target.value)}
                  className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)] font-medium"
                >
                  {validatedFindings.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.id}: {f.statement.slice(0, 80)}...
                    </option>
                  ))}
                </select>
              )}
            </div>

            {authoringType === "lesson" ? (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                    Lesson Learned Statement *
                  </label>
                  <textarea
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    rows={2}
                    placeholder="Concise, transferable lesson statement..."
                    className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                      What Worked / What Did Not
                    </label>
                    <textarea
                      value={whatWorkedOrDidNotWork}
                      onChange={(e) => setWhatWorkedOrDidNotWork(e.target.value)}
                      rows={2}
                      placeholder="Empirical outcome..."
                      className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                      Why It Happened (Causal Mechanics)
                    </label>
                    <textarea
                      value={whyItHappened}
                      onChange={(e) => setWhyItHappened(e.target.value)}
                      rows={2}
                      placeholder="Mechanisms driving this outcome..."
                      className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                      Conditions Required for Replication
                    </label>
                    <input
                      type="text"
                      value={conditionsRequired}
                      onChange={(e) => setConditionsRequired(e.target.value)}
                      placeholder="Contextual preconditions..."
                      className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                      Transferability Scope
                    </label>
                    <input
                      type="text"
                      value={transferability}
                      onChange={(e) => setTransferability(e.target.value)}
                      placeholder="e.g. Applicable across rural health clinics"
                      className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)]"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                    Good Practice Title *
                  </label>
                  <input
                    type="text"
                    value={gpTitle}
                    onChange={(e) => setGpTitle(e.target.value)}
                    placeholder="Descriptive title of the practice..."
                    className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                    Practice Description
                  </label>
                  <textarea
                    value={gpDescription}
                    onChange={(e) => setGpDescription(e.target.value)}
                    rows={2}
                    placeholder="How is this practice implemented in the field?"
                    className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                      Why It Worked
                    </label>
                    <input
                      type="text"
                      value={whyItWorked}
                      onChange={(e) => setWhyItWorked(e.target.value)}
                      placeholder="Evidence of success..."
                      className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                      Conditions for Replication
                    </label>
                    <input
                      type="text"
                      value={conditionsForReplication}
                      onChange={(e) => setConditionsForReplication(e.target.value)}
                      placeholder="Requirements for successful adoption..."
                      className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                      Recommended Use
                    </label>
                    <input
                      type="text"
                      value={recommendedUse}
                      onChange={(e) => setRecommendedUse(e.target.value)}
                      placeholder="Guidance on where and how to apply..."
                      className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                      Risks / Boundary Limits
                    </label>
                    <input
                      type="text"
                      value={risksLimits}
                      onChange={(e) => setRisksLimits(e.target.value)}
                      placeholder="When this practice should NOT be used..."
                      className="w-full rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[var(--foreground)]"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsAuthoringOpen(false)}
                className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-muted)] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={validatedFindings.length === 0}
                className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition cursor-pointer disabled:opacity-50"
              >
                Save {authoringType === "lesson" ? "Lesson" : "Practice"}
              </button>
            </div>
          </form>
        </WorkspaceDialog>
      )}
    </div>
  );
}
