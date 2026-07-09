"use client";

import React, { useEffect, useMemo, useState } from "react";
import type {
  DemoCase,
  EvidenceEntry,
  EvidenceEntryId,
  EvidenceStrength,
  Finding,
  FindingId,
  GoodPractice,
  GoodPracticeId,
  LessonLearned,
  LessonLearnedId,
  QAReviewItem,
  QAReviewStatus,
  Recommendation,
  RecommendationId,
  RecommendationPriority,
  SensitivityFlag,
  SourceRecord,
  SourceRecordId,
} from "@/lib/types";
import { generateQAReview } from "@/lib/qa";
import { generateLearningBriefMarkdown } from "@/lib/generateBrief";
import { demoCases } from "@/data/cases";

interface FieldLearningStudioAppProps {
  demoCase: DemoCase;
}

type EvidenceFilters = {
  theme: string;
  stakeholderType: string;
  evidenceStrength: string;
  sensitivityFlag: string;
};

type WorkspaceTabId =
  | "overview"
  | "evidence"
  | "findings"
  | "lessons"
  | "recommendations"
  | "qa"
  | "brief";

type TraceHandlers = {
  highlightedId: string | null;
  onTraceSelect: (id: string) => void;
};

const workspaceTabs: Array<{ id: WorkspaceTabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "evidence", label: "Evidence" },
  { id: "findings", label: "Findings" },
  { id: "lessons", label: "Lessons" },
  { id: "recommendations", label: "Recommendations" },
  { id: "qa", label: "QA Review" },
  { id: "brief", label: "Brief" },
];

const priorityOrder: RecommendationPriority[] = ["High", "Medium", "Low"];

export function FieldLearningStudioApp({
  demoCase,
}: FieldLearningStudioAppProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>("overview");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [pendingTraceId, setPendingTraceId] = useState<string | null>(null);
  const [filters, setFilters] = useState<EvidenceFilters>({
    theme: "All",
    stakeholderType: "All",
    evidenceStrength: "All",
    sensitivityFlag: "All",
  });
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  // Multi-case architecture states
  const [selectedCaseId, setSelectedCaseId] = useState<string>(demoCase.id);

  const currentBaseCase = useMemo(() => {
    return demoCases.find((c) => c.id === selectedCaseId) || demoCases[0];
  }, [selectedCaseId]);

  // v0.2 local session sandbox additions
  const [sandboxEvidence, setSandboxEvidence] = useState<EvidenceEntry[]>([]);
  const [sandboxSources, setSandboxSources] = useState<SourceRecord[]>([]);

  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [sandboxText, setSandboxText] = useState("");
  const [sandboxCount, setSandboxCount] = useState(1);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditRun, setAuditRun] = useState(false);
  const [auditMessage, setAuditMessage] = useState("");

  // v0.2 walkthrough path progress (subtle & professional Suggested Walkthrough)
  const [demoProgress, setDemoProgress] = useState({
    step1: true,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
  });

  // Clear session sandbox and progress on case change
  function handleSelectCase(caseId: string) {
    setSelectedCaseId(caseId);
    setSandboxEvidence([]);
    setSandboxSources([]);
    setSandboxText("");
    setSandboxCount(1);
    setAuditRun(false);
    setDrawerItemId(null);
    setDemoProgress({
      step1: true,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
    });
  }

  // Derived dynamic active case data mapping
  const activeDemoCase = useMemo(() => {
    return {
      ...currentBaseCase,
      evidence: [...sandboxEvidence, ...currentBaseCase.evidence],
      sources: [...sandboxSources, ...currentBaseCase.sources],
    };
  }, [sandboxEvidence, sandboxSources, currentBaseCase]);

  const themes = useMemo(
    () => uniqueValues(activeDemoCase.evidence.map((entry) => entry.primaryTheme)),
    [activeDemoCase.evidence],
  );
  const stakeholderTypes = useMemo(
    () => uniqueValues(activeDemoCase.evidence.map((entry) => entry.stakeholderType)),
    [activeDemoCase.evidence],
  );
  const evidenceStrengths = useMemo(
    () => uniqueValues(activeDemoCase.evidence.map((entry) => entry.evidenceStrength)),
    [activeDemoCase.evidence],
  );
  const sensitivityFlags = useMemo(
    () => uniqueValues(activeDemoCase.evidence.map((entry) => entry.sensitivityFlag)),
    [activeDemoCase.evidence],
  );

  const filteredEvidence = useMemo(
    () =>
      activeDemoCase.evidence.filter((entry) => {
        return (
          (filters.theme === "All" || entry.primaryTheme === filters.theme) &&
          (filters.stakeholderType === "All" ||
            entry.stakeholderType === filters.stakeholderType) &&
          (filters.evidenceStrength === "All" ||
            entry.evidenceStrength === filters.evidenceStrength) &&
          (filters.sensitivityFlag === "All" ||
            entry.sensitivityFlag === filters.sensitivityFlag)
        );
      }),
    [activeDemoCase.evidence, filters],
  );

  const currentQaItems = useMemo(() => {
    return generateQAReview(activeDemoCase);
  }, [activeDemoCase]);

  const currentBriefMarkdown = useMemo(() => {
    return generateLearningBriefMarkdown(activeDemoCase);
  }, [activeDemoCase]);

  useEffect(() => {
    if (!pendingTraceId) {
      return;
    }

    const timeout = window.setTimeout(() => {
      document
        .getElementById(traceDomId(pendingTraceId))
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingTraceId(null);
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [activeTab, pendingTraceId]);

  useEffect(() => {
    if (!highlightedId) {
      return;
    }

    const timeout = window.setTimeout(() => setHighlightedId(null), 2600);

    return () => window.clearTimeout(timeout);
  }, [highlightedId]);

  function handleTabChange(tabId: WorkspaceTabId) {
    setActiveTab(tabId);
    setPendingTraceId(null);
    setHighlightedId(null);
    if (tabId === "brief") {
      setDemoProgress((prev) => ({ ...prev, step5: true }));
    }
  }

  function handleTraceSelect(id: string) {
    setDrawerItemId(id);
    setDemoProgress((prev) => ({ ...prev, step3: true }));
  }

  function handleOpenRelatedTab(id: string) {
    setActiveTab(tabForTraceId(id));
    setHighlightedId(id);
    setPendingTraceId(id);
    setDrawerItemId(null);
    setDemoProgress((prev) => ({ ...prev, step3: true }));
  }

  async function copyLearningBrief() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentBriefMarkdown);
      } else {
        fallbackCopyText(currentBriefMarkdown);
      }
      setCopyStatus("copied");
      setDemoProgress((prev) => ({ ...prev, step5: true }));
      window.setTimeout(() => setCopyStatus("idle"), 2200);
    } catch {
      try {
        fallbackCopyText(currentBriefMarkdown);
        setCopyStatus("copied");
        setDemoProgress((prev) => ({ ...prev, step5: true }));
        window.setTimeout(() => setCopyStatus("idle"), 2200);
      } catch {
        setCopyStatus("error");
      }
    }
  }

  function handleParseSandbox() {
    if (!sandboxText.trim()) return;

    const text = sandboxText.trim().toLowerCase();
    let inferredTheme = "General programme learning";
    let sensitivity: SensitivityFlag = "Low";

    if (selectedCaseId === "school-nutrition") {
      if (text.includes("water") || text.includes("spoilage") || text.includes("cheese") || text.includes("dairy")) {
        inferredTheme = "Food acceptability and water safety";
        sensitivity = "High";
      } else if (text.includes("father") || text.includes("mother") || text.includes("caregiver") || text.includes("gender")) {
        inferredTheme = "Gendered household caregiver roles";
        sensitivity = "Low";
      } else if (text.includes("teacher") || text.includes("training") || text.includes("volunteer")) {
        inferredTheme = "Volunteer capacity and training";
        sensitivity = "Low";
      } else if (text.includes("child") || text.includes("children") || text.includes("peer") || text.includes("committee")) {
        inferredTheme = "Child participation mechanisms";
        sensitivity = "Medium";
      } else if (text.includes("clinic") || text.includes("screening") || text.includes("health") || text.includes("malnutrition")) {
        inferredTheme = "Targeting and vulnerability assessment";
        sensitivity = "Medium";
      } else if (text.includes("storage") || text.includes("electricity") || text.includes("ventilation") || text.includes("canteen")) {
        inferredTheme = "School infrastructure and storage constraints";
        sensitivity = "Medium";
      }
    } else {
      if (text.includes("women") || text.includes("girls") || text.includes("safety") || text.includes("evening") || text.includes("transport") || text.includes("lighting")) {
        inferredTheme = "Women's safe participation";
        sensitivity = "Medium";
      } else if (text.includes("youth") || text.includes("young people") || text.includes("attendance") || text.includes("engagement")) {
        inferredTheme = "Youth participation";
        sensitivity = "Low";
      } else if (text.includes("training") || text.includes("materials") || text.includes("language") || text.includes("translation")) {
        inferredTheme = "Training accessibility";
        sensitivity = "Low";
      } else if (text.includes("reporting") || text.includes("partner") || text.includes("ngo") || text.includes("burden")) {
        inferredTheme = "Partner coordination";
        sensitivity = "Low";
      } else if (text.includes("procurement") || text.includes("budget") || text.includes("delay") || text.includes("supplies")) {
        inferredTheme = "Operational constraints";
        sensitivity = "Low";
      }
    }

    const tempId = `EV-TEMP-0${sandboxCount}` as `EV-${string}`;
    const tempSourceId = `SRC-TEMP-0${sandboxCount}` as `SRC-${string}`;

    const newEvidenceEntry: EvidenceEntry = {
      id: tempId,
      sourceId: tempSourceId,
      stakeholderType: "Community member",
      rawEvidence: sandboxText.trim(),
      primaryTheme: inferredTheme,
      secondaryTheme: "General learning",
      evidenceStrength: "Low",
      sensitivityFlag: sensitivity,
      potentialFinding: `Initial evidence suggests critical factors regarding ${inferredTheme.toLowerCase()}.`,
      qaStatus: "Needs Review",
    };

    setSandboxEvidence((prev) => [newEvidenceEntry, ...prev]);
    setSandboxCount((prev) => prev + 1);
    setSandboxText("");

    const newSourceEntry: SourceRecord = {
      id: tempSourceId,
      title: `Sandbox Field Note Log - ${tempId}`,
      sourceType: "Field Note",
      stakeholderType: "Community member",
      location: "Fictional Sandbox Environment",
      date: new Date().toLocaleDateString(),
      sensitivityFlag: sensitivity,
      summary: `User sandbox input: "${sandboxText.trim()}"`,
    };
    setSandboxSources((prev) => [newSourceEntry, ...prev]);

    // Walkthrough step mapping
    setDemoProgress((prev) => ({ ...prev, step1: true, step2: true }));

    setActiveTab("evidence");
    setHighlightedId(tempId);
    setPendingTraceId(tempId);
  }

  function handleResetSandbox() {
    setSandboxEvidence([]);
    setSandboxSources([]);
    setSandboxCount(1);
    setSandboxText("");
    setHighlightedId(null);
    setPendingTraceId(null);
    setDrawerItemId(null);
    setAuditRun(false);
    setDemoProgress({
      step1: true,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
    });
  }

  function handleRunQaAudit() {
    setIsAuditing(true);
    setAuditRun(false);
    setAuditMessage("Opening review gate...");

    setTimeout(() => setAuditMessage("Checking evidence-finding linkages..."), 450);
    setTimeout(() => setAuditMessage("Checking overclaiming and sensitivity flags..."), 900);
    setTimeout(() => setAuditMessage("Preparing reviewer checklist..."), 1350);
    setTimeout(() => {
      setIsAuditing(false);
      setAuditRun(true);
      setDemoProgress((prev) => ({ ...prev, step4: true }));
    }, 1800);
  }

  function renderDrawer() {
    if (!drawerItemId) return null;

    let itemType = "";
    let title = "";
    let textContent = "";
    let metadata: Array<{ label: string; value: string | React.ReactNode }> = [];
    let linkedIds: string[] = [];
    let linkedLabel = "";
    let whyThisMatters = "";
    let safeguardNote = "";

    const id = drawerItemId;
    if (id.startsWith("EV-") || id.startsWith("EV-TEMP-") || id.startsWith("TEMP-EV-")) {
      itemType = "Evidence Record";
      const entry = activeDemoCase.evidence.find((e) => e.id === id as EvidenceEntryId);
      if (entry) {
        title = `Evidence Note: ${id}`;
        textContent = entry.rawEvidence;
        metadata = [
          { label: "Primary Theme", value: entry.primaryTheme },
          { label: "Secondary Theme", value: entry.secondaryTheme },
          { label: "Stakeholder Type", value: entry.stakeholderType },
          { label: "Evidence Strength", value: entry.evidenceStrength },
          { label: "Sensitivity Flag", value: entry.sensitivityFlag },
          { label: "QA Status", value: entry.qaStatus },
          { label: "Potential Finding", value: entry.potentialFinding },
        ];
        linkedIds = [entry.sourceId];
        linkedLabel = "Linked Source Record";
        whyThisMatters =
          "Evidence records are the bridge between raw field material and synthesis claims. This item shows what was observed and how the app interprets it before it becomes a finding.";
        safeguardNote = `Strength: ${entry.evidenceStrength}. Sensitivity: ${entry.sensitivityFlag}. QA status: ${entry.qaStatus}.`;
      }
    } else if (id.startsWith("SRC-") || id.startsWith("SRC-TEMP-")) {
      itemType = "Source Record";
      const source = activeDemoCase.sources.find((s) => s.id === id as SourceRecordId);
      if (source) {
        title = source.title;
        textContent = source.summary;
        metadata = [
          { label: "Source Type", value: source.sourceType },
          { label: "Stakeholder Type", value: source.stakeholderType },
          { label: "Location", value: source.location },
          { label: "Date", value: source.date },
          { label: "Sensitivity Flag", value: source.sensitivityFlag },
        ];
        whyThisMatters =
          "Source records establish provenance. They help reviewers judge whether a claim is grounded in an appropriate stakeholder perspective and source type.";
        safeguardNote = `Sensitivity: ${source.sensitivityFlag}. Keep source details non-identifying in public demo outputs.`;
      }
    } else if (id.startsWith("FND-")) {
      itemType = "Synthesis Finding";
      const finding = activeDemoCase.findings.find((f) => f.id === id as FindingId);
      if (finding) {
        title = finding.statement;
        textContent = finding.explanation;
        metadata = [
          { label: "Evidence Strength", value: finding.evidenceStrength },
          { label: "Contradictory Evidence Summary", value: finding.contradictoryEvidence },
          { label: "Programme Implication", value: finding.programmeImplication },
        ];
        linkedIds = [...finding.supportingEvidenceIds, ...finding.linkedRecommendationIds];
        linkedLabel = "Linked Evidence & Recommendations";
        whyThisMatters =
          "Findings are the main synthesis claims. They should never stand alone; each one must show supporting evidence, limits, and programme implications.";
        safeguardNote = `Evidence strength: ${finding.evidenceStrength}. Contradictory evidence is shown to reduce overclaiming risk.`;
      }
    } else if (id.startsWith("LES-")) {
      itemType = "Lesson Learned";
      const lesson = activeDemoCase.lessons.find((l) => l.id === id as LessonLearnedId);
      if (lesson) {
        title = `Lesson: ${lesson.statement}`;
        textContent = `What worked / did not work: ${lesson.whatWorkedOrDidNotWork}`;
        metadata = [
          { label: "Why it happened", value: lesson.whyItHappened },
          { label: "Conditions required", value: lesson.conditionsRequired },
          { label: "Transferability", value: lesson.transferability },
        ];
        linkedIds = lesson.evidenceBase;
        linkedLabel = "Evidence Base";
        whyThisMatters =
          "Lessons explain what happened and why, including the conditions that make learning transferable rather than anecdotal.";
        safeguardNote =
          "Transferability should be reviewed before reusing this lesson in a different programme context.";
      }
    } else if (id.startsWith("GP-")) {
      itemType = "Good Practice";
      const practice = activeDemoCase.goodPractices.find((g) => g.id === id as GoodPracticeId);
      if (practice) {
        title = practice.title;
        textContent = practice.description;
        metadata = [
          { label: "Why it worked", value: practice.whyItWorked },
          { label: "Conditions for replication", value: practice.conditionsForReplication },
          { label: "Risks / limits", value: practice.risksLimits },
          { label: "Recommended use", value: practice.recommendedUse },
        ];
        linkedIds = practice.evidenceBase;
        linkedLabel = "Evidence Base";
        whyThisMatters =
          "Good practices are only useful when replication conditions and limits are visible alongside the positive example.";
        safeguardNote =
          "Replication should respect the documented risks, limits, and local conditions.";
      }
    } else if (id.startsWith("REC-")) {
      itemType = "Programmatic Recommendation";
      const rec = activeDemoCase.recommendations.find((r) => r.id === id as RecommendationId);
      if (rec) {
        title = `Recommendation: ${rec.recommendation}`;
        textContent = `Expected benefit: ${rec.expectedBenefit}`;
        metadata = [
          { label: "Priority", value: rec.priority },
          { label: "Responsible Actor", value: rec.responsibleActor },
          { label: "Timeframe", value: rec.timeframe },
          { label: "Feasibility", value: rec.feasibility },
          { label: "Risk / sensitivity", value: rec.riskSensitivity },
          { label: "Success Indicator", value: rec.successIndicator },
        ];
        linkedIds = [rec.linkedFindingId, ...rec.evidenceBase];
        linkedLabel = "Linked Finding & Evidence Base";
        whyThisMatters =
          "Recommendations are the action layer. This record shows whether a proposed action is tied to a finding, evidence base, owner, timeframe, and success indicator.";
        safeguardNote = `Priority: ${rec.priority}. Risk/sensitivity: ${rec.riskSensitivity}`;
      }
    } else if (id.startsWith("QA-")) {
      itemType = "QA Checklist Review Item";
      const qa = currentQaItems.find((q) => q.id === id);
      if (qa) {
        title = qa.title;
        textContent = qa.reviewQuestion;
        metadata = [
          { label: "Check Status", value: qa.status },
          { label: "Audit Notes", value: qa.notes },
        ];
        whyThisMatters =
          "QA checks protect the brief from unsupported claims, weak triangulation, and unsafe use of sensitive field evidence.";
        safeguardNote = `Status: ${qa.status}. Human review is still required before donor-facing use.`;
      }
    }

    if (!itemType) {
      return (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-[var(--surface)] border-l border-[var(--border-strong)] p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
              <h3 className="font-semibold text-lg">Not Found</h3>
              <button className="text-xl font-bold cursor-pointer" onClick={() => setDrawerItemId(null)}>×</button>
            </div>
            <p className="mt-4 text-sm text-[var(--muted)]">Item {id} could not be located in local memory.</p>
          </div>
        </div>
      );
    }

    return (
      <div 
        className="fixed inset-0 z-50 flex justify-end"
        role="dialog"
        aria-modal="true"
        aria-label={`${itemType} Details`}
      >
        <div 
          className="fixed inset-0 bg-black/62 transition-opacity"
          onClick={() => setDrawerItemId(null)}
        />

        <div className="relative w-full max-w-xl bg-[var(--surface)] flex flex-col p-6 overflow-y-auto border-l border-[var(--border-strong)] transition-transform duration-300">
          <div className="flex justify-between items-start pb-4 border-b border-[var(--border)]">
            <div>
              <span className="text-xs font-semibold text-[var(--trace)] block">
                Claim lineage
              </span>
              <h3 className="font-mono text-base font-bold text-[var(--foreground)] mt-1">
                {id}
              </h3>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                {itemType}
              </p>
            </div>
            <button 
              className="text-2xl font-bold cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--trace)] rounded p-1"
              onClick={() => setDrawerItemId(null)}
              aria-label="Close drawer"
            >
              ×
            </button>
          </div>

          <div className="mt-6 flex-1 space-y-5">
            <div>
              <h4 className="text-base font-semibold leading-6 text-[var(--foreground)]">
                {title}
              </h4>
              {textContent && (
                <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                  <p className="text-[11px] font-semibold text-[var(--muted)]">
                    Record summary
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--foreground)]">
                    {textContent}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[rgba(56,214,199,0.24)] bg-[rgba(27,165,150,0.08)] p-4">
              <span className="text-[11px] font-semibold text-[var(--trace)] block mb-2">
                Source-to-brief path
              </span>
              <TraceChain id={id} demoCase={activeDemoCase} onSelect={setDrawerItemId} />
            </div>

            {metadata.length > 0 && (
              <div className="border-t border-[var(--border)] pt-4">
                <h5 className="text-[11px] font-semibold text-[var(--muted)] mb-3">
                  Metadata Profile
                </h5>
                <dl className="grid grid-cols-1 gap-y-3 gap-x-4 sm:grid-cols-2 text-xs">
                  {metadata.map((meta) => (
                    <div key={meta.label} className="col-span-2 sm:col-span-1">
                      <dt className="font-semibold text-[var(--muted)] text-[11px] block mb-0.5">
                        {meta.label}
                      </dt>
                      <dd className="text-[var(--foreground)] leading-5 block font-medium">
                        {meta.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {whyThisMatters ? (
              <div className="border-t border-[var(--border)] pt-4">
                <h5 className="text-[11px] font-semibold text-[var(--muted)] mb-2">
                  Why this matters
                </h5>
                <p className="text-sm leading-6 text-[var(--foreground)]">
                  {whyThisMatters}
                </p>
              </div>
            ) : null}

            {safeguardNote ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-900">
                {safeguardNote}
              </div>
            ) : null}

            {linkedIds.length > 0 && (
              <div className="border-t border-[var(--border)] pt-4">
                <h5 className="text-[11px] font-semibold text-[var(--muted)] mb-2">
                  {linkedLabel}
                </h5>
                <div className="flex flex-wrap gap-2">
                  {linkedIds.map((linkId) => (
                    <TraceButton id={linkId} key={linkId} onSelect={setDrawerItemId} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border)] pt-4 mt-6 flex justify-between gap-3">
            <button 
              className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)] cursor-pointer font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--trace)]"
              onClick={() => setDrawerItemId(null)}
            >
              Close
            </button>
            <button 
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--accent-strong)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--trace)]"
              onClick={() => handleOpenRelatedTab(id)}
            >
              Open Related Tab
            </button>
          </div>
        </div>
      </div>
    );
  }

  const traceHandlers: TraceHandlers = {
    highlightedId,
    onTraceSelect: handleTraceSelect,
  };

  return (
    <main className="fls-dark-workbench min-h-screen text-[var(--foreground)]">
      <AppHeader demoCase={activeDemoCase} />
      <CaseSelector selectedId={selectedCaseId} onSelect={handleSelectCase} />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <WorkspaceTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        <div className="mt-5" id="workspace-panel">
          {activeTab === "overview" ? (
            <OverviewTab 
              demoCase={activeDemoCase} 
              onTabChange={handleTabChange}
              sandboxText={sandboxText}
              setSandboxText={setSandboxText}
              onParse={handleParseSandbox}
              onReset={handleResetSandbox}
              hasSandboxItems={sandboxEvidence.length > 0}
              demoProgress={demoProgress}
            />
          ) : null}
          {activeTab === "evidence" ? (
            <EvidenceTab
              evidence={filteredEvidence}
              evidenceStrengths={evidenceStrengths}
              filters={filters}
              findings={activeDemoCase.findings}
              onFiltersChange={setFilters}
              sensitivityFlags={sensitivityFlags}
              sources={activeDemoCase.sources}
              stakeholderTypes={stakeholderTypes}
              themes={themes}
              traceHandlers={traceHandlers}
            />
          ) : null}
          {activeTab === "findings" ? (
            <FindingsSection
              findings={currentBaseCase.findings}
              traceHandlers={traceHandlers}
              demoCase={activeDemoCase}
            />
          ) : null}
          {activeTab === "lessons" ? (
            <LessonsAndPractices
              goodPractices={currentBaseCase.goodPractices}
              lessons={currentBaseCase.lessons}
              traceHandlers={traceHandlers}
            />
          ) : null}
          {activeTab === "recommendations" ? (
            <RecommendationsSection
              recommendations={currentBaseCase.recommendations}
              traceHandlers={traceHandlers}
              demoCase={activeDemoCase}
            />
          ) : null}
          {activeTab === "qa" ? (
            <QAReviewSection 
              qaItems={currentQaItems} 
              traceHandlers={traceHandlers} 
              isAuditing={isAuditing}
              auditRun={auditRun}
              auditMessage={auditMessage}
              onRunAudit={handleRunQaAudit}
            />
          ) : null}
          {activeTab === "brief" ? (
            <LearningBriefSection
              copyStatus={copyStatus}
              demoCase={activeDemoCase}
              markdown={currentBriefMarkdown}
              onCopy={copyLearningBrief}
              traceHandlers={traceHandlers}
            />
          ) : null}
        </div>

        {renderDrawer()}
      </div>
    </main>
  );
}

function caseProfile(demoCase: DemoCase) {
  if (demoCase.id === "school-nutrition") {
    return {
      useCase: "School nutrition / child wellbeing / field monitoring",
      sensitivity: "Sanitized real-world-inspired case",
      demonstrates:
        "Safeguarding-aware evidence synthesis from field monitoring patterns",
      note:
        "Sanitized demo derived from prior fieldwork. No identifiable school, child, staff, or community data is displayed.",
    };
  }

  return {
    useCase: "Peacebuilding / social cohesion learning",
    sensitivity: "Fictional safe demo case",
    demonstrates:
      "Evidence-to-learning workflow for participation, access, and coordination",
    note:
      "Fictional demo data for product validation. No real sensitive field evidence is processed.",
  };
}

function CaseSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="border-b border-[var(--border)] bg-[rgba(15,27,23,0.82)] px-4 py-5"
      id="case-selector"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[var(--trace)]">
              Demo pathway
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
              Select the evidence context you want to inspect
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Each case uses static demo data to show how field evidence becomes
            findings, recommendations, QA checks, and a donor-ready brief.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {demoCases.map((c) => {
            const isSelected = c.id === selectedId;
            const profile = caseProfile(c);
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                type="button"
                className={`text-left rounded-lg border p-5 transition cursor-pointer ${
                  isSelected
                    ? "border-[var(--trace)] bg-[var(--surface-elevated)] ring-1 ring-[rgba(56,214,199,0.34)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <span className="text-base font-semibold leading-6 text-[var(--foreground)]">
                      {c.project}
                    </span>
                    <span
                      className={`inline-flex items-center rounded px-2 py-1 text-[10px] font-bold uppercase ${
                        c.id === "school-nutrition"
                          ? "border border-amber-300 bg-amber-50 text-amber-900"
                          : "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {c.subtitle}
                  </p>
                </div>

                <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-[var(--muted)]">
                      Use case
                    </dt>
                    <dd className="mt-1 leading-5 text-[var(--foreground)]">
                      {profile.useCase}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--muted)]">
                      Evidence base
                    </dt>
                    <dd className="mt-1 font-mono leading-5 text-[var(--foreground)]">
                      {c.evidenceBase.sourceRecords} sources / {c.evidenceBase.evidenceEntries} evidence entries
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--muted)]">
                      Sensitivity level
                    </dt>
                    <dd className="mt-1 leading-5 text-[var(--foreground)]">
                      {profile.sensitivity}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--muted)]">
                      Demonstrates
                    </dt>
                    <dd className="mt-1 leading-5 text-[var(--foreground)]">
                      {profile.demonstrates}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-[var(--border)] pt-3">
                  <p className="text-xs font-medium leading-5 text-[var(--muted)]">
                    {profile.note}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AppHeader({ demoCase }: { demoCase: DemoCase }) {
  return (
    <header className="border-b border-[var(--border)] bg-[rgba(7,17,15,0.94)]">
      <div className="mx-auto grid w-full max-w-7xl gap-7 px-4 py-10 sm:px-6 lg:grid-cols-[1.18fr_0.82fr] lg:px-8">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex w-fit rounded border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]">
              v0.5 dark workbench
            </span>
            <span className="inline-flex w-fit rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
              {demoCase.id === "school-nutrition"
                ? "Sanitized demo - no identifiable field data"
                : "Fictional demo - local-only sandbox"}
            </span>
          </div>
          <p className="mt-6 text-sm font-semibold text-[var(--trace)]">
            Premium evidence command room
          </p>
          <h1 className="mt-2 max-w-4xl text-4xl font-semibold leading-tight tracking-normal text-[var(--foreground)] sm:text-5xl">
            Field notes become defensible learning outputs.
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--muted)]">
            Field Learning Studio gives MEL, evaluation, and programme teams a
            controlled workspace for tracing evidence into findings,
            recommendations, QA review, and a donor-ready learning brief.
          </p>

          <div className="mt-7 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
              {[
                ["Field notes", "Source material"],
                ["Evidence", "Coded observations"],
                ["Brief", "Donor-ready output"],
              ].map(([title, body], index) => (
                <React.Fragment key={title}>
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">
                      {title}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      {body}
                    </p>
                  </div>
                  {index < 2 ? (
                    <span className="hidden text-[var(--trace)] sm:block">&rarr;</span>
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["Evidence hierarchy", "Observation, interpretation, finding, and recommendation stay visibly connected."],
              ["Claim lineage", "Clickable IDs open the source-to-brief chain for reviewer inspection."],
              ["Human review gate", "QA stays deterministic and transparent before donor-facing use."],
            ].map(([title, body]) => (
              <div
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4"
                key={title}
              >
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  {title}
                </h2>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-5">
          <p className="text-xs font-semibold text-[var(--trace)]">
            Active demo case
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{demoCase.project}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {demoCase.subtitle}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric label="Sources" value={demoCase.evidenceBase.sourceRecords} />
            <Metric label="Evidence" value={demoCase.evidenceBase.evidenceEntries} />
            <Metric label="Findings" value={demoCase.evidenceBase.findings} />
            <Metric
              label="Recommendations"
              value={demoCase.evidenceBase.recommendations}
            />
          </div>
          <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            {demoCase.safetyNote}
          </p>
        </div>
      </div>
    </header>
  );
}

function WorkspaceTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: WorkspaceTabId;
  onTabChange: (tabId: WorkspaceTabId) => void;
}) {
  return (
    <nav
      aria-label="Field Learning Studio workspace"
      className="sticky top-0 z-20 rounded-lg border border-[var(--border)] bg-[rgba(15,27,23,0.94)] px-3 backdrop-blur"
    >
      <div className="flex gap-1 overflow-x-auto py-2" role="tablist">
        {workspaceTabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              aria-selected={isActive}
              className={`min-h-10 min-w-fit rounded px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--trace)] cursor-pointer ${
                isActive
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              }`}
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function OverviewTab({
  demoCase,
  onTabChange,
  sandboxText,
  setSandboxText,
  onParse,
  onReset,
  hasSandboxItems,
  demoProgress,
}: {
  demoCase: DemoCase;
  onTabChange: (tabId: WorkspaceTabId) => void;
  sandboxText: string;
  setSandboxText: (text: string) => void;
  onParse: () => void;
  onReset: () => void;
  hasSandboxItems: boolean;
  demoProgress: {
    step1: boolean;
    step2: boolean;
    step3: boolean;
    step4: boolean;
    step5: boolean;
  };
}) {
  const pipelineSteps: Array<{
    id: WorkspaceTabId;
    label: string;
    description: string;
  }> = [
    {
      id: "overview",
      label: "Field notes",
      description: "Local sandbox note or selected demo case",
    },
    {
      id: "evidence",
      label: "Source inventory",
      description: "Provenance and stakeholder context",
    },
    {
      id: "evidence",
      label: "Evidence matrix",
      description: "Theme-coded observations and meaning",
    },
    {
      id: "findings",
      label: "Findings",
      description: "Evidence-backed synthesis claims",
    },
    {
      id: "lessons",
      label: "Lessons & practices",
      description: "Reusable learning with conditions",
    },
    {
      id: "recommendations",
      label: "Recommendations",
      description: "Actions tied to findings",
    },
    {
      id: "qa",
      label: "QA review",
      description: "Safeguards against weak claims",
    },
    {
      id: "brief",
      label: "Learning brief",
      description: "Donor-ready output with trace annex",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded border border-amber-200/60 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 select-none">
            {demoCase.id === "school-nutrition"
              ? "Sanitized Real-World-Inspired Demo Case"
              : "Fictional Sandbox Demo Mode — Safe Workspace"}
            </div>
            <h2 className="max-w-3xl text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">
              Review the full claim chain before anything becomes a brief.
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
              This workspace makes the analytical chain visible: what was
              observed, how it was interpreted, which claim it supports, what
              recommendation follows, and what QA safeguard should be checked.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  document.getElementById("guided-demo-path")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="min-h-10 rounded-lg bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--trace)]"
              >
                Start guided demo
              </button>
              <button
                onClick={() => {
                  const text = demoCase.id === "school-nutrition"
                    ? "Children are skipping the dry meal snack because there is no clean drinking water available during lunch, and some report stomach aches from unpackaged cheese stored in open bins."
                    : "Women report feeling unsafe at evening peacebuilding committee meetings due to poor street lighting and lack of public transport.";
                  setSandboxText(text);
                  document.getElementById("sandbox-note-textarea")?.focus();
                  document.getElementById("sandbox-note-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--trace)]"
              >
                Try sample field note
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-5">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Senior reviewer view
            </h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
              {[
                "The case is safe to demo and clearly labelled.",
                "Every finding can be inspected back to evidence IDs.",
                "Recommendations show the finding and evidence base behind them.",
                "QA checks flag overclaiming, sensitivity, and donor-readiness before export.",
              ].map((item) => (
                <li className="flex gap-3" key={item}>
                  <span className="mt-2 h-2 w-2 flex-none rounded-full bg-[var(--trace)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Main split grid */}
      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="flex flex-col gap-5">
          {/* 2. Suggested Walkthrough Path Card */}
          <section id="guided-demo-path" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 scroll-mt-20">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
              <h3 className="text-base font-semibold text-[var(--foreground)]">
                Review path
              </h3>
              <span className="text-[10px] text-[var(--muted)] font-mono">
                {Object.values(demoProgress).filter(Boolean).length} / 5 tasks completed
              </span>
            </div>
            
            <div className="space-y-3.5">
              {/* Step 1 */}
              <div className="flex items-start gap-3 text-xs leading-5">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold flex-none text-[10px] ${
                  demoProgress.step1 
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                    : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                }`}>
                  {demoProgress.step1 ? "✓" : "1"}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--foreground)]">
                    Select a case
                  </p>
                  <p className="text-[var(--muted)]">
                    Start with the fictional pathway or the sanitized real-world-inspired case.
                  </p>
                  <button 
                    onClick={() => {
                      document.getElementById("case-selector")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="text-[var(--accent)] hover:underline font-semibold mt-1 cursor-pointer"
                  >
                    Review case choices &rarr;
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 text-xs leading-5">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold flex-none text-[10px] ${
                  demoProgress.step2 
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                    : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                }`}>
                  {demoProgress.step2 ? "✓" : "2"}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--foreground)]">
                    Try a sample field note
                  </p>
                  <p className="text-[var(--muted)]">
                    Use a template note to see local deterministic parsing into evidence.
                  </p>
                  <button 
                    onClick={() => {
                      document.getElementById("sandbox-note-section")?.scrollIntoView({ behavior: "smooth" });
                      document.getElementById("sandbox-note-textarea")?.focus();
                    }}
                    className="text-[var(--accent)] hover:underline font-semibold mt-1 cursor-pointer"
                  >
                    Go to sandbox note &rarr;
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 text-xs leading-5">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold flex-none text-[10px] ${
                  demoProgress.step3 
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                    : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                }`}>
                  {demoProgress.step3 ? "✓" : "3"}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--foreground)]">
                    Inspect the evidence chain
                  </p>
                  <p className="text-[var(--muted)]">
                    Click any ID pill to open its lineage in the traceability drawer.
                  </p>
                  <button 
                    onClick={() => onTabChange("evidence")}
                    className="text-[var(--accent)] hover:underline font-semibold mt-1 cursor-pointer"
                  >
                    Click any ID pill &rarr;
                  </button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 text-xs leading-5">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold flex-none text-[10px] ${
                  demoProgress.step4 
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                    : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                }`}>
                  {demoProgress.step4 ? "✓" : "4"}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--foreground)]">
                    Run QA review
                  </p>
                  <p className="text-[var(--muted)]">
                    Check overclaiming, sensitivity, traceability, and donor-readiness safeguards.
                  </p>
                  <button 
                    onClick={() => onTabChange("qa")}
                    className="text-[var(--accent)] hover:underline font-semibold mt-1 cursor-pointer"
                  >
                    Open QA review &rarr;
                  </button>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex items-start gap-3 text-xs leading-5">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold flex-none text-[10px] ${
                  demoProgress.step5 
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                    : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                }`}>
                  {demoProgress.step5 ? "✓" : "5"}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--foreground)]">
                    Review the learning brief
                  </p>
                  <p className="text-[var(--muted)]">
                    Inspect the document preview, then copy the Markdown export if needed.
                  </p>
                  <button 
                    onClick={() => onTabChange("brief")}
                    className="text-[var(--accent)] hover:underline font-semibold mt-1 cursor-pointer"
                  >
                    Open Learning Brief &rarr;
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Synthesis Pipeline Flowchart */}
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="text-base font-semibold text-[var(--foreground)]">
              Evidence-to-learning workflow
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              The product logic is intentionally linear: source material first,
              then interpretation, QA, and final communication. Click any stage
              to inspect the relevant workspace.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {pipelineSteps.map((step, idx) => (
                <React.Fragment key={`${step.label}-${idx}`}>
                  <button
                    className="min-h-28 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-left transition hover:border-[var(--trace)] hover:bg-[var(--surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--trace)]"
                    onClick={() => onTabChange(step.id)}
                  >
                    <span className="font-mono text-[10px] font-semibold text-[var(--trace)]">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="mt-2 block text-sm font-semibold text-[var(--foreground)]">
                      {step.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                      {step.description}
                    </span>
                  </button>
                </React.Fragment>
              ))}
            </div>
          </section>

          {/* 4. Sandbox Intake Section */}
          <section id="sandbox-note-section" className="rounded-lg border border-amber-300 bg-amber-50/20 p-5 scroll-mt-20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-amber-900">
                  Try a local sandbox field note
                </h3>
                <p className="mt-1 text-xs text-amber-800/80 leading-5">
                  Deterministic demo parsing only: no AI call, no upload, no storage. Do not enter real sensitive field evidence.
                </p>
              </div>
              {hasSandboxItems && (
                <button
                  className="px-3 py-1 bg-[var(--surface)] border border-amber-300 text-amber-900 rounded-md text-xs font-semibold hover:bg-[var(--surface-elevated)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
                  onClick={onReset}
                >
                  Reset Sandbox
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <textarea
                id="sandbox-note-textarea"
                className="w-full min-h-[100px] p-3 border border-amber-300/60 bg-[var(--surface)] rounded-lg text-sm text-[var(--foreground)] outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder-[var(--muted-soft)] font-sans"
                placeholder="Type or paste 2-3 sentences of monitoring notes here..."
                value={sandboxText}
                onChange={(e) => setSandboxText(e.target.value)}
              />
              
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] font-semibold text-amber-800">Templates:</span>
                  {demoCase.id === "school-nutrition" ? (
                    <>
                      <button 
                        className="px-2.5 py-1 bg-[var(--surface)] border border-amber-200 text-amber-800 text-[11px] rounded hover:bg-[var(--surface-elevated)] cursor-pointer transition font-semibold"
                        onClick={() => setSandboxText("Children are skipping the dry meal snack because there is no clean drinking water available during lunch, and some report stomach aches from unpackaged cheese stored in open bins.")}
                      >
                        Water & Spoilage
                      </button>
                      <button 
                        className="px-2.5 py-1 bg-[var(--surface)] border border-amber-200 text-amber-800 text-[11px] rounded hover:bg-[var(--surface-elevated)] cursor-pointer transition font-semibold"
                        onClick={() => setSandboxText("Social workers report that fathers do not attend any school nutrition PTA sessions, claiming cooking is a female duty, but they control the household food budget.")}
                      >
                        Caregiver Roles
                      </button>
                      <button 
                        className="px-2.5 py-1 bg-[var(--surface)] border border-amber-200 text-amber-800 text-[11px] rounded hover:bg-[var(--surface-elevated)] cursor-pointer transition font-semibold"
                        onClick={() => setSandboxText("Teachers state they are expected to deliver weekly health and nutrition lessons but have never received training materials or guidelines.")}
                      >
                        Teacher Capacity
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="px-2.5 py-1 bg-[var(--surface)] border border-amber-200 text-amber-800 text-[11px] rounded hover:bg-[var(--surface-elevated)] cursor-pointer transition font-semibold"
                        onClick={() => setSandboxText("Women report feeling unsafe at evening peacebuilding committee meetings due to poor street lighting and lack of public transport.")}
                      >
                        Safe Access
                      </button>
                      <button 
                        className="px-2.5 py-1 bg-[var(--surface)] border border-amber-200 text-amber-800 text-[11px] rounded hover:bg-[var(--surface-elevated)] cursor-pointer transition font-semibold"
                        onClick={() => setSandboxText("Youth committee attendance declines because meetings are unpredictable and do not link to practical local action budgets.")}
                      >
                        Youth Engagement
                      </button>
                      <button 
                        className="px-2.5 py-1 bg-[var(--surface)] border border-amber-200 text-amber-800 text-[11px] rounded hover:bg-[var(--surface-elevated)] cursor-pointer transition font-semibold"
                        onClick={() => setSandboxText("Local partner staff spend more than 40% of their working hours compiling donor compliance reports, leaving little time for direct field engagement.")}
                      >
                        Reporting Burden
                      </button>
                    </>
                  )}
                </div>

                <button
                  className={`min-h-10 px-4 rounded-lg text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                    sandboxText.trim() 
                      ? "bg-[var(--warning)] hover:bg-[#bf8121] text-[#08130f] cursor-pointer"
                      : "bg-[var(--surface-muted)] text-[var(--muted-soft)] cursor-not-allowed"
                  }`}
                  disabled={!sandboxText.trim()}
                  onClick={onParse}
                >
                  Parse into evidence
                </button>
              </div>
            </div>
          </section>

          {/* 5. Active Traceability Chain Section */}
          {hasSandboxItems && (
            <section className="rounded-lg border border-[rgba(56,214,199,0.28)] bg-[rgba(27,165,150,0.08)] p-5">
              <h3 className="text-base font-semibold text-[var(--foreground)]">
                Latest sandbox trace
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Below is the visual linkage path inferred for your ingested sandbox note. Click any ID pill to inspect its parameters.
              </p>
              <div className="mt-4 bg-[var(--surface)] p-3 rounded-lg border border-[rgba(56,214,199,0.28)]">
                <TraceChain id="EV-TEMP-01" demoCase={demoCase} onSelect={(id) => onTabChange(tabForTraceId(id))} />
              </div>
            </section>
          )}
        </div>

        {/* Sidebar right column */}
        <div className="flex flex-col gap-5">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Evidence Base
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="Source records" value={demoCase.evidenceBase.sourceRecords} />
              <Metric label="Evidence entries" value={demoCase.evidenceBase.evidenceEntries} />
              <Metric label="Findings" value={demoCase.evidenceBase.findings} />
              <Metric label="Lessons" value={demoCase.evidenceBase.lessonsLearned} />
              <Metric label="Good practices" value={demoCase.evidenceBase.goodPractices} />
              <Metric
                label="Recommendations"
                value={demoCase.evidenceBase.recommendations}
              />
            </dl>
            <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 leading-relaxed">
              {demoCase.id === "school-nutrition"
                ? "Sanitized demo derived from prior fieldwork. No identifiable school, child, staff, or community data is displayed. Any custom sandbox content remains local in component state."
                : "This workspace uses fictional demo data only. Any custom sandbox content remains local in component state."}
            </div>
          </section>
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Signature traceability path
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              The drawer turns each ID into a verifiable chain, so a reviewer
              can test whether a donor-facing claim is grounded in evidence.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[10px] font-semibold text-[var(--muted)]">
              {["Source", "Evidence", "Finding", "Recommendation", "QA", "Brief"].map((label, index, list) => (
                <React.Fragment key={label}>
                  <span className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1">
                    {label}
                  </span>
                  {index < list.length - 1 ? <span>&rarr;</span> : null}
                </React.Fragment>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function EvidenceTab({
  evidence,
  evidenceStrengths,
  filters,
  findings,
  onFiltersChange,
  sensitivityFlags,
  sources,
  stakeholderTypes,
  themes,
  traceHandlers,
}: {
  evidence: EvidenceEntry[];
  evidenceStrengths: string[];
  filters: EvidenceFilters;
  findings: Finding[];
  onFiltersChange: (filters: EvidenceFilters) => void;
  sensitivityFlags: string[];
  sources: SourceRecord[];
  stakeholderTypes: string[];
  themes: string[];
  traceHandlers: TraceHandlers;
}) {
  return (
    <div className="grid gap-5">
      <EvidenceMatrix
        evidence={evidence}
        evidenceStrengths={evidenceStrengths}
        filters={filters}
        findings={findings}
        onFiltersChange={onFiltersChange}
        sensitivityFlags={sensitivityFlags}
        sources={sources}
        stakeholderTypes={stakeholderTypes}
        themes={themes}
        traceHandlers={traceHandlers}
      />
      <SourceInventory sources={sources} traceHandlers={traceHandlers} />
    </div>
  );
}

function SourceInventory({
  sources,
  traceHandlers,
}: {
  sources: SourceRecord[];
  traceHandlers: TraceHandlers;
}) {
  return (
    <Section
      description="A compact inventory of the fictional source records behind the evidence matrix."
      eyebrow="Source inventory"
      title="Fictional source records"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sources.map((source) => (
          <article
            className={traceCardClass(
              source.id,
              traceHandlers.highlightedId,
              "p-4",
            )}
            id={traceDomId(source.id)}
            key={source.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <TraceButton
                id={source.id}
                onSelect={traceHandlers.onTraceSelect}
              />
              <StatusBadge label={source.sensitivityFlag} tone="sensitivity" />
            </div>
            <h3 className="mt-3 text-base font-semibold">{source.title}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {source.sourceType} | {source.stakeholderType}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {source.summary}
            </p>
            <p className="mt-3 text-xs font-medium text-[var(--muted)]">
              {source.location} | {source.date}
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}

function EvidenceMatrix({
  evidence,
  filters,
  findings,
  onFiltersChange,
  themes,
  sources,
  stakeholderTypes,
  evidenceStrengths,
  sensitivityFlags,
  traceHandlers,
}: {
  evidence: EvidenceEntry[];
  filters: EvidenceFilters;
  findings: Finding[];
  onFiltersChange: (filters: EvidenceFilters) => void;
  themes: string[];
  sources: SourceRecord[];
  stakeholderTypes: string[];
  evidenceStrengths: string[];
  sensitivityFlags: string[];
  traceHandlers: TraceHandlers;
}) {
  return (
    <Section
      description="Evidence IDs are clickable traceability anchors. Demo data remains static and safe for product validation."
      eyebrow="Evidence matrix"
      title="Theme-coded evidence"
    >
      <div className="text-xs font-semibold text-amber-700 bg-amber-50/60 border border-amber-200/50 rounded-lg px-3 py-1.5 w-fit">
        Static demo data
      </div>

      <div className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-4">
        <FilterSelect
          label="Theme"
          onChange={(theme) => onFiltersChange({ ...filters, theme })}
          options={themes}
          value={filters.theme}
        />
        <FilterSelect
          label="Stakeholder"
          onChange={(stakeholderType) =>
            onFiltersChange({ ...filters, stakeholderType })
          }
          options={stakeholderTypes}
          value={filters.stakeholderType}
        />
        <FilterSelect
          label="Strength"
          onChange={(evidenceStrength) =>
            onFiltersChange({ ...filters, evidenceStrength })
          }
          options={evidenceStrengths}
          value={filters.evidenceStrength}
        />
        <FilterSelect
          label="Sensitivity"
          onChange={(sensitivityFlag) =>
            onFiltersChange({ ...filters, sensitivityFlag })
          }
          options={sensitivityFlags}
          value={filters.sensitivityFlag}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {evidence.map((entry) => {
          const isHighlighted = traceHandlers.highlightedId === entry.id;
          const isSandbox = entry.id.startsWith("EV-TEMP-");
          const source = sources.find((item) => item.id === entry.sourceId);
          const linkedFinding = findings.find((finding) =>
            finding.supportingEvidenceIds.includes(entry.id),
          );

          return (
            <article
              className={`scroll-mt-32 rounded-lg border transition p-6 flex flex-col justify-between ${
                isHighlighted
                  ? "border-[var(--trace)] bg-[rgba(56,214,199,0.08)]"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
              }`}
              id={traceDomId(entry.id)}
              key={entry.id}
            >
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-3 mb-4">
                  <div>
                    <TraceButton
                      id={entry.id}
                      onSelect={traceHandlers.onTraceSelect}
                    />
                    <h3 className="mt-3 text-lg font-semibold leading-7 text-[var(--foreground)]">
                      {entry.primaryTheme}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      {entry.stakeholderType}
                      {source ? ` from ${source.sourceType}` : ""}
                    </p>
                    {isSandbox && (
                      <span className="mt-2 inline-flex text-[9px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200/50 rounded px-1.5 py-0.5">
                        Sandbox evidence item — local demo only, not validated.
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <TraceButton
                      id={entry.sourceId}
                      onSelect={traceHandlers.onTraceSelect}
                    />
                    <StatusBadge label={entry.qaStatus} tone="qa" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                    <span className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
                      Observation
                    </span>
                    <p className="text-sm font-medium leading-6 text-[var(--foreground)]">
                      {entry.rawEvidence}
                    </p>
                  </div>

                  <div className="rounded-lg border border-[rgba(56,214,199,0.24)] bg-[rgba(27,165,150,0.08)] p-3 text-xs leading-relaxed">
                    <span className="font-semibold text-[var(--muted)] text-[11px] block mb-1">
                      Interpretation
                    </span>
                    <p className="text-[var(--foreground)] font-medium">
                      {entry.potentialFinding}
                    </p>
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                    <span className="text-[11px] font-semibold text-[var(--muted)] block mb-2">
                      Linked finding
                    </span>
                    {linkedFinding ? (
                      <div>
                        <TraceButton
                          id={linkedFinding.id}
                          onSelect={traceHandlers.onTraceSelect}
                        />
                        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                          {linkedFinding.statement}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs leading-5 text-[var(--muted)]">
                        Not yet linked to a validated finding.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-[var(--border)] pt-4 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold bg-[var(--surface-muted)] text-[var(--muted)] px-2 py-0.5 rounded border border-[var(--border)]">
                  {entry.secondaryTheme}
                </span>
                <StrengthBadge value={entry.evidenceStrength} />
                <StatusBadge label={entry.sensitivityFlag} tone="sensitivity" />
                
                <button
                  onClick={() => traceHandlers.onTraceSelect(entry.id)}
                  className="ml-auto min-h-8 rounded border border-[rgba(56,214,199,0.28)] bg-[rgba(27,165,150,0.12)] px-3 text-xs font-semibold text-[var(--trace)] hover:border-[var(--trace)] hover:text-[var(--foreground)] cursor-pointer flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[var(--trace)]"
                >
                  Inspect Chain &rarr;
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {evidence.length === 0 ? (
        <div className="p-6 text-sm text-[var(--muted)] border border-[var(--border)] rounded-lg bg-[var(--surface)] text-center">
          No evidence entries match the selected filters.
        </div>
      ) : null}
    </Section>
  );
}

function FindingsSection({
  findings,
  traceHandlers,
  demoCase,
}: {
  findings: Finding[];
  traceHandlers: TraceHandlers;
  demoCase: DemoCase;
}) {
  return (
    <Section
      description="Each finding shows supporting evidence, contradictions, implications, and linked recommendations."
      eyebrow="Findings"
      title="No finding without evidence"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {findings.map((finding) => (
          <article
            className={traceCardClass(
              finding.id,
              traceHandlers.highlightedId,
              "p-5",
            )}
            id={traceDomId(finding.id)}
            key={finding.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TraceButton
                id={finding.id}
                onSelect={traceHandlers.onTraceSelect}
              />
              <StrengthBadge value={finding.evidenceStrength} />
            </div>
            <h3 className="mt-4 text-lg font-semibold leading-7">
              {finding.statement}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {finding.explanation}
            </p>
            <TraceIdList
              ids={finding.supportingEvidenceIds}
              label="Supporting evidence"
              onTraceSelect={traceHandlers.onTraceSelect}
            />
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
              <span className="font-semibold">Contradictory evidence: </span>
              {finding.contradictoryEvidence}
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              <span className="font-semibold text-[var(--foreground)]">
                Programme implication:
              </span>{" "}
              {finding.programmeImplication}
            </p>
            <TraceIdList
              ids={finding.linkedRecommendationIds}
              label="Linked recommendations"
              onTraceSelect={traceHandlers.onTraceSelect}
            />
            <div className="mt-5 pt-4 border-t border-[var(--border)]">
              <span className="text-[11px] font-semibold text-[var(--muted)] block mb-2">
                Claim lineage
              </span>
              <TraceChain id={finding.id} demoCase={demoCase} onSelect={traceHandlers.onTraceSelect} />
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

function LessonsAndPractices({
  lessons,
  goodPractices,
  traceHandlers,
}: {
  lessons: LessonLearned[];
  goodPractices: GoodPractice[];
  traceHandlers: TraceHandlers;
}) {
  return (
    <Section
      description="Lessons explain what happened and why. Good practices identify conditions for responsible replication."
      eyebrow="Lessons and good practices"
      title="Reusable learning"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="text-lg font-semibold">Lessons learned</h3>
          <div className="mt-4 flex flex-col gap-4">
          {lessons.map((lesson) => (
            <article
              className={traceCardClass(
                lesson.id,
                traceHandlers.highlightedId,
                "p-5 min-w-0",
              )}
              id={traceDomId(lesson.id)}
              key={lesson.id}
            >
              <TraceButton
                id={lesson.id}
                onSelect={traceHandlers.onTraceSelect}
              />
              <h4 className="mt-3 text-lg font-semibold leading-7">
                {lesson.statement}
              </h4>
              <Detail label="What worked / did not work">
                {lesson.whatWorkedOrDidNotWork}
              </Detail>
              <Detail label="Why it happened">{lesson.whyItHappened}</Detail>
              <Detail label="Conditions required">
                {lesson.conditionsRequired}
              </Detail>
              <TraceIdList
                ids={lesson.evidenceBase}
                label="Evidence base"
                onTraceSelect={traceHandlers.onTraceSelect}
              />
              <Detail label="Transferability">{lesson.transferability}</Detail>
            </article>
          ))}
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="text-lg font-semibold">Good practices</h3>
          <div className="mt-4 flex flex-col gap-4">
          {goodPractices.map((practice) => (
            <article
              className={traceCardClass(
                practice.id,
                traceHandlers.highlightedId,
                "p-5 min-w-0",
              )}
              id={traceDomId(practice.id)}
              key={practice.id}
            >
              <TraceButton
                id={practice.id}
                onSelect={traceHandlers.onTraceSelect}
              />
              <h4 className="mt-3 text-lg font-semibold leading-7">
                {practice.title}
              </h4>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {practice.description}
              </p>
              <Detail label="Why it worked">{practice.whyItWorked}</Detail>
              <TraceIdList
                ids={practice.evidenceBase}
                label="Evidence base"
                onTraceSelect={traceHandlers.onTraceSelect}
              />
              <Detail label="Conditions for replication">
                {practice.conditionsForReplication}
              </Detail>
              <Detail label="Risks / limits">{practice.risksLimits}</Detail>
              <Detail label="Recommended use">{practice.recommendedUse}</Detail>
            </article>
          ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function RecommendationsSection({
  recommendations,
  traceHandlers,
  demoCase,
}: {
  recommendations: Recommendation[];
  traceHandlers: TraceHandlers;
  demoCase: DemoCase;
}) {
  return (
    <Section
      description="Recommendations are grouped by priority and linked to findings and evidence."
      eyebrow="Recommendations"
      title="No recommendation without a finding"
    >
      <div className="space-y-5">
        {priorityOrder.map((priority) => {
          const items = recommendations.filter(
            (recommendation) => recommendation.priority === priority,
          );

          return (
            <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4" key={priority}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                <div>
                  <h3 className="text-lg font-semibold">{priority} priority</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    {items.length} recommendation{items.length === 1 ? "" : "s"} requiring executive review.
                  </p>
                </div>
                <PriorityBadge value={priority} />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {items.map((recommendation) => (
                  <article
                    className={traceCardClass(
                      recommendation.id,
                      traceHandlers.highlightedId,
                      "p-5 min-w-0",
                    )}
                    id={traceDomId(recommendation.id)}
                    key={recommendation.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <TraceButton
                        id={recommendation.id}
                        onSelect={traceHandlers.onTraceSelect}
                      />
                      <LinkedTraceField
                        className=""
                        id={recommendation.linkedFindingId}
                        label="Finding"
                        onTraceSelect={traceHandlers.onTraceSelect}
                      />
                    </div>
                    <h4 className="mt-4 text-base font-semibold leading-6 text-[var(--foreground)]">
                      {recommendation.recommendation}
                    </h4>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      <span className="font-semibold text-[var(--foreground)]">Expected benefit: </span>
                      {recommendation.expectedBenefit}
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 border-t border-[var(--border)] pt-3 text-xs sm:grid-cols-2">
                      <CompactField
                        label="Owner"
                        value={recommendation.responsibleActor}
                      />
                      <CompactField
                        label="Timeframe"
                        value={recommendation.timeframe}
                      />
                      <CompactField
                        label="Feasibility"
                        value={recommendation.feasibility}
                      />
                      <CompactField
                        label="Risk / sensitivity"
                        value={recommendation.riskSensitivity}
                      />
                      <CompactField
                        label="Success indicator"
                        value={recommendation.successIndicator}
                        fullWidth
                      />
                    </div>
                    <div className="mt-4 border-t border-[var(--border)] pt-3">
                      <TraceIdList
                        className=""
                        ids={recommendation.evidenceBase}
                        label="Evidence base"
                        onTraceSelect={traceHandlers.onTraceSelect}
                      />
                    </div>
                    <div className="mt-4 border-t border-[var(--border)] pt-4">
                      <span className="text-[11px] font-semibold text-[var(--muted)] block mb-2">
                        Claim lineage
                      </span>
                      <TraceChain id={recommendation.id} demoCase={demoCase} onSelect={traceHandlers.onTraceSelect} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Section>
  );
}

function renderTextWithPills(text: string, onSelect: (id: string) => void) {
  if (!text) return "";
  const parts = text.split(/(\b(?:SRC|EV|FND|LES|GP|REC|QA)-\d+\b|\bEV-TEMP-\d+\b|\bSRC-TEMP-\d+\b)/g);
  return parts.map((part, index) => {
    if (/^(?:SRC|EV|FND|LES|GP|REC|QA)-\d+$/.test(part) || /^(?:EV|SRC)-TEMP-\d+$/.test(part)) {
      return (
        <button
          key={index}
          onClick={() => onSelect(part)}
          className="mx-0.5 inline-flex items-center rounded border border-[rgba(56,214,199,0.28)] bg-[rgba(27,165,150,0.12)] px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[var(--trace)] hover:border-[var(--trace)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
        >
          {part}
        </button>
      );
    }
    return part;
  });
}

function QAReviewSection({
  qaItems,
  traceHandlers,
  isAuditing,
  auditRun,
  auditMessage,
  onRunAudit,
}: {
  qaItems: QAReviewItem[];
  traceHandlers: TraceHandlers;
  isAuditing: boolean;
  auditRun: boolean;
  auditMessage: string;
  onRunAudit: () => void;
}) {
  const stats = {
    pass: qaItems.filter((i) => i.status === "Pass").length,
    needsReview: qaItems.filter((i) => i.status === "Needs Review").length,
    warning: qaItems.filter((i) => i.status === "Warning").length,
  };

  const sortedQaItems = [...qaItems].sort((a, b) => {
    const score = { "Warning": 3, "Needs Review": 2, "Pass": 1 };
    return (score[b.status] || 0) - (score[a.status] || 0);
  });
  const qaGroups: Array<{ status: QAReviewStatus; label: string; items: QAReviewItem[] }> = [
    {
      status: "Warning",
      label: "Warnings",
      items: sortedQaItems.filter((item) => item.status === "Warning"),
    },
    {
      status: "Needs Review",
      label: "Needs review",
      items: sortedQaItems.filter((item) => item.status === "Needs Review"),
    },
    {
      status: "Pass",
      label: "Passed checks",
      items: sortedQaItems.filter((item) => item.status === "Pass"),
    },
  ];

  return (
    <Section
      description="The checklist flags traceability, sensitivity, overclaiming, and donor-readiness risks."
      eyebrow="QA review"
      title="Human review required"
    >
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h3 className="text-base font-semibold text-[var(--foreground)]">
              QA checks help prevent overclaiming and protect sensitive field evidence.
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              This deterministic demo review checks whether claims are linked,
              limitations are visible, sensitive evidence is flagged, and the
              brief remains suitable for human donor-facing review.
            </p>
          </div>
          <span className="rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
            Local deterministic demo check
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-red-100 bg-red-50/40 p-4">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-red-800">
              Warnings
            </span>
            <span className="mt-1 block text-2xl font-semibold text-red-800">
              {stats.warning}
            </span>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Needs review
            </span>
            <span className="mt-1 block text-2xl font-semibold text-amber-800">
              {stats.needsReview}
            </span>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Pass
            </span>
            <span className="mt-1 block text-2xl font-semibold text-emerald-800">
              {stats.pass}
            </span>
          </div>
        </div>
      </div>

      {!auditRun && !isAuditing ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center max-w-xl mx-auto">
          <div className="flex justify-center mb-4 text-[var(--accent)]">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">Review gate not yet complete</h3>
          <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
            Run the checklist to reveal grouped warnings, needs-review items,
            and passed safeguards for the selected case.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              className="min-h-11 px-5 bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-white font-semibold text-sm rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--trace)] transition"
              onClick={onRunAudit}
            >
              Run review gate
            </button>
            <span className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">
              Deterministic demo check — not an AI or human evaluation
            </span>
          </div>
        </div>
      ) : null}

      {isAuditing ? (
        <div className="rounded-lg border border-[rgba(56,214,199,0.28)] bg-[rgba(27,165,150,0.08)] p-12 text-center max-w-xl mx-auto animate-pulse">
          <div className="flex justify-center mb-4">
            <div className="h-10 w-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">Running review gate</h3>
          <p className="mt-2 text-xs text-[var(--muted)] font-medium">
            {auditMessage}
          </p>
        </div>
      ) : null}

      {auditRun && !isAuditing ? (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <p className="text-xs text-[var(--muted)] font-semibold uppercase tracking-wider">
                Review gate complete
              </p>
              <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider bg-amber-50 border border-amber-200/50 rounded px-2 py-0.5 mt-1 w-fit">
                Deterministic demo check — not an AI or human evaluation
              </p>
            </div>
            <button
              className="px-3 py-1.5 border border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--foreground)] font-semibold text-xs rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--trace)]"
              onClick={onRunAudit}
            >
              Re-run gate
            </button>
          </div>

          <div className="space-y-6">
            {qaGroups.map((group) =>
              group.items.length > 0 ? (
                <div key={group.status}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground)]">
                      {group.label}
                    </h3>
                    <QAStatusBadge value={group.status} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((item) => (
                      <article
                        className={traceCardClass(
                          item.id,
                          traceHandlers.highlightedId,
                          "p-4",
                        )}
                        id={traceDomId(item.id)}
                        key={item.id}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <TraceButton
                            id={item.id}
                            onSelect={traceHandlers.onTraceSelect}
                          />
                          <QAStatusBadge value={item.status} />
                        </div>
                        <h4 className="mt-3 text-base font-semibold">{item.title}</h4>
                        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                          {renderTextWithPills(item.reviewQuestion, traceHandlers.onTraceSelect)}
                        </p>
                        <p className="mt-3 text-xs leading-5 text-[var(--foreground)] font-medium bg-[var(--surface-muted)] border border-[var(--border)] p-2.5 rounded">
                          {renderTextWithPills(item.notes, traceHandlers.onTraceSelect)}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </>
      ) : null}
    </Section>
  );
}

function LearningBriefSection({
  demoCase,
  markdown,
  copyStatus,
  onCopy,
  traceHandlers,
}: {
  demoCase: DemoCase;
  markdown: string;
  copyStatus: "idle" | "copied" | "error";
  onCopy: () => void;
  traceHandlers: TraceHandlers;
}) {
  return (
    <Section
      description={
        demoCase.id === "school-nutrition"
          ? "Sanitized real-world-inspired demo data formatted as a donor learning brief draft."
          : "Fictional workspace demo data formatted as a donor learning brief draft."
      }
      eyebrow="Learning brief"
      title="Donor-ready brief preview"
    >
      <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-5 sm:p-6 flex flex-col gap-6">
        {/* Professional Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div>
            <span className="text-xs font-semibold text-[var(--trace)]">
              Donor deliverable draft
            </span>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Verify recommendations alignment, key messages, and annex evidence trace links below.
            </p>
          </div>
          <button
            className="min-h-10 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-white px-5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[var(--trace)] cursor-pointer"
            onClick={onCopy}
            type="button"
          >
            {copyStatus === "copied"
              ? "✓ Copied to Clipboard"
              : copyStatus === "error"
                ? "Copy failed"
                : "Copy Brief Markdown"}
          </button>
        </div>

        <StyledBriefPreview
          demoCase={demoCase}
          traceHandlers={traceHandlers}
        />

        <details className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]">
          <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-[var(--foreground)] select-none">
            View raw Markdown payload source
          </summary>
          <textarea
            className="h-[300px] w-full resize-y border-t border-[var(--border)] bg-[var(--surface)] p-4 font-mono text-xs leading-5 text-[var(--foreground)] outline-none focus:border-[var(--trace)]"
            readOnly
            value={markdown}
          />
        </details>
      </div>
    </Section>
  );
}

function StyledBriefPreview({
  demoCase,
  traceHandlers,
}: {
  demoCase: DemoCase;
  traceHandlers: TraceHandlers;
}) {
  return (
    <div className="bg-[rgba(242,247,243,0.05)] p-4 sm:p-8 rounded-lg border border-[var(--border)] mt-5">
      <article className="brief-document mx-auto max-w-[820px] border border-[rgba(58,70,60,0.16)] rounded-md overflow-hidden p-8 sm:p-12">
        <header className="border-b border-[var(--border)] pb-6 mb-8">
          <span className="text-[11px] font-semibold text-[var(--accent)] block mb-2">
            Programme Learning Brief
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
            {demoCase.project}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)] font-medium">
            {demoCase.subtitle}
          </p>

          <div className="mt-5 grid gap-2 border-y border-[var(--border)] py-3 text-xs sm:grid-cols-3">
            <div>
              <span className="block font-semibold text-[var(--muted)]">
                Case status
              </span>
              <span className="mt-1 block text-[var(--foreground)]">
                {demoCase.status}
              </span>
            </div>
            <div>
              <span className="block font-semibold text-[var(--muted)]">
                Review mode
              </span>
              <span className="mt-1 block text-[var(--foreground)]">
                Human review required
              </span>
            </div>
            <div>
              <span className="block font-semibold text-[var(--muted)]">
                Export
              </span>
              <span className="mt-1 block text-[var(--foreground)]">
                Styled preview plus Markdown
              </span>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-4 text-xs sm:text-sm">
            <BriefMetric label="Sources" value={demoCase.evidenceBase.sourceRecords} />
            <BriefMetric label="Evidence entries" value={demoCase.evidenceBase.evidenceEntries} />
            <BriefMetric label="Findings" value={demoCase.evidenceBase.findings} />
            <BriefMetric
              label="Recommendations"
              value={demoCase.evidenceBase.recommendations}
            />
          </dl>

          <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium leading-5 text-amber-900">
            {demoCase.safetyNote ||
              "This demo brief uses safe static data and requires human review before any external use."}
          </p>
        </header>

      <div className="space-y-8">
        <BriefSection title="Executive Summary">
          <p>{demoCase.executiveSummary}</p>
        </BriefSection>

        {demoCase.purposeAndScope ? (
          <BriefSection title="Purpose and Scope">
            <p>{demoCase.purposeAndScope}</p>
          </BriefSection>
        ) : null}

        <BriefSection title="Evidence Base">
          <p>
            This brief is generated from {demoCase.evidenceBase.sourceRecords} source records,
            {" "}{demoCase.evidenceBase.evidenceEntries} evidence entries,
            {" "}{demoCase.evidenceBase.findings} findings, and
            {" "}{demoCase.evidenceBase.recommendations} recommendations in the selected demo case.
          </p>
        </BriefSection>

        <BriefSection title="Key Messages">
          <ul className="space-y-2">
            {demoCase.keyMessages.map((message) => (
              <li className="flex gap-3" key={message}>
                <span className="mt-2 h-2 w-2 flex-none rounded-full bg-[var(--accent)]" />
                <span>{message}</span>
              </li>
            ))}
          </ul>
        </BriefSection>

        {demoCase.keyThemes ? (
          <BriefSection title="Themes">
            <div className="flex flex-wrap gap-2">
              {demoCase.keyThemes.map((theme) => (
                <span
                  className="rounded border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground)]"
                  key={theme}
                >
                  {theme}
                </span>
              ))}
            </div>
          </BriefSection>
        ) : null}

        <BriefSection title="Main Findings">
          <div className="space-y-4">
            {demoCase.findings.map((finding) => (
              <div
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4"
                key={finding.id}
              >
                <TraceButton
                  id={finding.id}
                  onSelect={traceHandlers.onTraceSelect}
                />
                <h4 className="mt-3 font-semibold text-[var(--foreground)]">
                  {finding.statement}
                </h4>
                <p className="mt-2">{finding.explanation}</p>
                <TraceIdList
                  ids={finding.supportingEvidenceIds}
                  label="Evidence base"
                  onTraceSelect={traceHandlers.onTraceSelect}
                />
              </div>
            ))}
          </div>
        </BriefSection>

        <BriefSection title="Lessons Learned">
          <div className="grid gap-3 md:grid-cols-2">
            {demoCase.lessons.map((lesson) => (
              <div
                className="rounded-lg border border-[var(--border)] p-4"
                key={lesson.id}
              >
                <TraceButton
                  id={lesson.id}
                  onSelect={traceHandlers.onTraceSelect}
                />
                <p className="mt-3 font-semibold text-[var(--foreground)]">
                  {lesson.statement}
                </p>
                <p className="mt-2">{lesson.transferability}</p>
              </div>
            ))}
          </div>
        </BriefSection>

        <BriefSection title="Good Practices">
          <div className="grid gap-3 md:grid-cols-2">
            {demoCase.goodPractices.map((practice) => (
              <div
                className="rounded-lg border border-[var(--border)] p-4"
                key={practice.id}
              >
                <TraceButton
                  id={practice.id}
                  onSelect={traceHandlers.onTraceSelect}
                />
                <p className="mt-3 font-semibold text-[var(--foreground)]">
                  {practice.title}
                </p>
                <p className="mt-2">{practice.description}</p>
              </div>
            ))}
          </div>
        </BriefSection>

        <BriefSection title="Recommendations">
          <div className="space-y-3">
            {priorityOrder.map((priority) => {
              const recommendations = demoCase.recommendations.filter(
                (recommendation) => recommendation.priority === priority,
              );

              return (
                <div
                  className="rounded-lg border border-[var(--border)] p-4"
                  key={priority}
                >
                  <h4 className="font-semibold text-[var(--foreground)]">
                    {priority} Priority
                  </h4>
                  <div className="mt-3 space-y-3">
                    {recommendations.map((recommendation) => (
                      <div
                        className="border-t border-[var(--border)] pt-3 first:border-t-0 first:pt-0"
                        key={recommendation.id}
                      >
                        <TraceButton
                          id={recommendation.id}
                          onSelect={traceHandlers.onTraceSelect}
                        />
                        <p className="mt-2 font-semibold text-[var(--foreground)]">
                          {recommendation.recommendation}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-[var(--muted)]">
                            Linked finding
                          </span>
                          <TraceButton
                            id={recommendation.linkedFindingId}
                            onSelect={traceHandlers.onTraceSelect}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </BriefSection>

        {(demoCase.safeguardingNotes || demoCase.safetyNote) ? (
          <BriefSection title="Safeguarding and Sensitivity Note">
            <p>{demoCase.safeguardingNotes || demoCase.safetyNote}</p>
          </BriefSection>
        ) : null}

        <BriefSection title="Limitations">
          <ul className="space-y-2">
            {demoCase.limitations.map((limitation) => (
              <li className="flex gap-3" key={limitation}>
                <span className="mt-2 h-2 w-2 flex-none rounded-full bg-[var(--muted)]" />
                <span>{limitation}</span>
              </li>
            ))}
          </ul>
        </BriefSection>

        <BriefSection title="Annex: Traceability Summary">
          <div className="space-y-3">
            {demoCase.findings.map((finding) => (
              <div
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4"
                key={finding.id}
              >
                <TraceButton
                  id={finding.id}
                  onSelect={traceHandlers.onTraceSelect}
                />
                <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
                  {finding.statement}
                </p>
                <TraceIdList
                  ids={finding.supportingEvidenceIds}
                  label="Evidence"
                  onTraceSelect={traceHandlers.onTraceSelect}
                />
                <TraceIdList
                  ids={finding.linkedRecommendationIds}
                  label="Recommendations"
                  onTraceSelect={traceHandlers.onTraceSelect}
                />
              </div>
            ))}
          </div>
        </BriefSection>
      </div>
    </article>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section role="tabpanel">
      <div className="mb-4">
        <p className="text-sm font-semibold text-[var(--trace)]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
          {description}
        </p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function BriefSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="text-sm leading-7 text-[var(--muted)] sm:text-base">
      <h3 className="border-b border-[var(--border)] pb-2 text-xl font-semibold text-[var(--foreground)]">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <dt className="text-xs font-medium text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
        {value}
      </dd>
    </div>
  );
}

function BriefMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white px-3 py-2">
      <dt className="text-xs font-semibold text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold text-[var(--foreground)]">
        {value}
      </dd>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
      {label}
      <select
        className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--trace)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="All">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}



function TraceButton({
  id,
  onSelect,
}: {
  id: string;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      className="inline-flex min-h-7 items-center rounded border border-[rgba(56,214,199,0.28)] bg-[rgba(27,165,150,0.12)] px-2.5 py-1 font-mono text-[11px] font-semibold text-[var(--trace)] cursor-pointer transition hover:border-[var(--trace)] hover:bg-[rgba(56,214,199,0.12)] focus:outline-none focus:ring-2 focus:ring-[var(--trace)]"
      onClick={() => onSelect(id)}
      title={`Trace and view details for ${id}`}
      aria-label={`Trace and view details for ${id}`}
      type="button"
    >
      {id}
    </button>
  );
}


function StrengthBadge({ value }: { value: EvidenceStrength }) {
  const className =
    value === "High"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : value === "Medium"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {value}
    </span>
  );
}

function PriorityBadge({ value }: { value: RecommendationPriority }) {
  const className =
    value === "High"
      ? "border-red-200 bg-red-50 text-red-800"
      : value === "Medium"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {value}
    </span>
  );
}

function QAStatusBadge({ value }: { value: QAReviewStatus }) {
  const className =
    value === "Pass"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : value === "Needs Review"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-red-50 text-red-800";

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {value}
    </span>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: SensitivityFlag | string;
  tone: "sensitivity" | "qa";
}) {
  const className =
    tone === "sensitivity" ? sensitivityClass(label) : qaClass(label);

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function TraceChain({
  id,
  demoCase,
  onSelect,
}: {
  id: string;
  demoCase: DemoCase;
  onSelect: (id: string) => void;
}) {
  let sourceId = "";
  let evidenceId = "";
  let findingId = "";
  let recId = "";

  if (id.startsWith("SRC")) {
    sourceId = id;
    const ev = demoCase.evidence.find((e) => e.sourceId === id as SourceRecordId);
    if (ev) {
      evidenceId = ev.id;
      const fnd = demoCase.findings.find((f) =>
        f.supportingEvidenceIds.includes(ev.id)
      );
      if (fnd) {
        findingId = fnd.id;
        const rec = demoCase.recommendations.find(
          (r) => r.linkedFindingId === fnd.id
        );
        if (rec) recId = rec.id;
      }
    }
  } else if (id.startsWith("EV")) {
    evidenceId = id;
    const ev = demoCase.evidence.find((e) => e.id === id as EvidenceEntryId);
    if (ev) sourceId = ev.sourceId;
    const fnd = demoCase.findings.find((f) => f.supportingEvidenceIds.includes(id as EvidenceEntryId));
    if (fnd) {
      findingId = fnd.id;
      const rec = demoCase.recommendations.find(
        (r) => r.linkedFindingId === fnd.id
      );
      if (rec) recId = rec.id;
    }
  } else if (id.startsWith("FND")) {
    findingId = id;
    const fnd = demoCase.findings.find((f) => f.id === id as FindingId);
    if (fnd) {
      if (fnd.supportingEvidenceIds.length > 0) {
        evidenceId = fnd.supportingEvidenceIds[0];
        const ev = demoCase.evidence.find((e) => e.id === evidenceId);
        if (ev) sourceId = ev.sourceId;
      }
      if (fnd.linkedRecommendationIds.length > 0) {
        recId = fnd.linkedRecommendationIds[0];
      }
    }
  } else if (id.startsWith("REC")) {
    recId = id;
    const rec = demoCase.recommendations.find((r) => r.id === id as RecommendationId);
    if (rec) {
      findingId = rec.linkedFindingId;
      const fnd = demoCase.findings.find((f) => f.id === findingId);
      if (fnd && fnd.supportingEvidenceIds.length > 0) {
        evidenceId = fnd.supportingEvidenceIds[0];
        const ev = demoCase.evidence.find((e) => e.id === evidenceId);
        if (ev) sourceId = ev.sourceId;
      }
    }
  } else if (id.startsWith("LES")) {
    const lesson = demoCase.lessons.find((l) => l.id === id as LessonLearnedId);
    if (lesson && lesson.evidenceBase.length > 0) {
      evidenceId = lesson.evidenceBase[0];
      const ev = demoCase.evidence.find((e) => e.id === evidenceId);
      if (ev) sourceId = ev.sourceId;
      const fnd = demoCase.findings.find((f) =>
        f.supportingEvidenceIds.includes(evidenceId as EvidenceEntryId)
      );
      if (fnd) {
        findingId = fnd.id;
        if (fnd.linkedRecommendationIds.length > 0) {
          recId = fnd.linkedRecommendationIds[0];
        }
      }
    }
  } else if (id.startsWith("GP")) {
    const practice = demoCase.goodPractices.find((g) => g.id === id as GoodPracticeId);
    if (practice && practice.evidenceBase.length > 0) {
      evidenceId = practice.evidenceBase[0];
      const ev = demoCase.evidence.find((e) => e.id === evidenceId);
      if (ev) sourceId = ev.sourceId;
      const fnd = demoCase.findings.find((f) =>
        f.supportingEvidenceIds.includes(evidenceId as EvidenceEntryId)
      );
      if (fnd) {
        findingId = fnd.id;
        if (fnd.linkedRecommendationIds.length > 0) {
          recId = fnd.linkedRecommendationIds[0];
        }
      }
    }
  }

  const showQaAndBrief = Boolean(sourceId || evidenceId || findingId || recId || id.startsWith("QA"));
  const qaId = "QA-001";

  return (
    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-[var(--muted-soft)]">
      {sourceId && (
        <button
          onClick={() => onSelect(sourceId)}
          className={`px-1.5 py-0.5 rounded border hover:bg-[rgba(56,214,199,0.12)] cursor-pointer transition ${
            id === sourceId
              ? "border-[var(--trace)] bg-[rgba(56,214,199,0.12)] text-[var(--trace)] font-bold"
              : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"
          }`}
        >
          {sourceId}
        </button>
      )}
      {sourceId && evidenceId && <span>&rarr;</span>}
      {evidenceId && (
        <button
          onClick={() => onSelect(evidenceId)}
          className={`px-1.5 py-0.5 rounded border hover:bg-[rgba(56,214,199,0.12)] cursor-pointer transition ${
            id === evidenceId
              ? "border-[var(--trace)] bg-[rgba(56,214,199,0.12)] text-[var(--trace)] font-bold"
              : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"
          }`}
        >
          {evidenceId}
        </button>
      )}
      {evidenceId && findingId && <span>&rarr;</span>}
      {findingId && (
        <button
          onClick={() => onSelect(findingId)}
          className={`px-1.5 py-0.5 rounded border hover:bg-[rgba(56,214,199,0.12)] cursor-pointer transition ${
            id === findingId
              ? "border-[var(--trace)] bg-[rgba(56,214,199,0.12)] text-[var(--trace)] font-bold"
              : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"
          }`}
        >
          {findingId}
        </button>
      )}
      {findingId && recId && <span>&rarr;</span>}
      {recId && (
        <button
          onClick={() => onSelect(recId)}
          className={`px-1.5 py-0.5 rounded border hover:bg-[rgba(56,214,199,0.12)] cursor-pointer transition ${
            id === recId
              ? "border-[var(--trace)] bg-[rgba(56,214,199,0.12)] text-[var(--trace)] font-bold"
              : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"
          }`}
        >
          {recId}
        </button>
      )}
      {showQaAndBrief && <span>&rarr;</span>}
      {showQaAndBrief && (
        <button
          onClick={() => onSelect(qaId)}
          className={`px-1.5 py-0.5 rounded border hover:bg-[rgba(56,214,199,0.12)] cursor-pointer transition ${
            id === qaId
              ? "border-[var(--trace)] bg-[rgba(56,214,199,0.12)] text-[var(--trace)] font-bold"
              : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"
          }`}
        >
          QA
        </button>
      )}
      {showQaAndBrief && <span>&rarr;</span>}
      {showQaAndBrief && (
        <span className="px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]">
          Brief
        </span>
      )}
    </div>
  );
}

function TraceIdList({
  label,
  ids,
  onTraceSelect,
  className = "mt-4",
}: {
  label: string;
  ids: string[];
  onTraceSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-[var(--muted)]">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {ids.map((id) => (
          <TraceButton id={id} key={id} onSelect={onTraceSelect} />
        ))}
      </div>
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
      <span className="font-semibold text-[var(--foreground)]">{label}: </span>
      {children}
    </p>
  );
}

function CompactField({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "col-span-2" : "col-span-1"}>
      <span className="font-semibold text-[var(--muted)] text-[11px] block mb-0.5">
        {label}
      </span>
      <span className="text-[var(--foreground)] leading-5 block">{value}</span>
    </div>
  );
}

function LinkedTraceField({
  label,
  id,
  onTraceSelect,
  className = "mt-4",
}: {
  label: string;
  id: string;
  onTraceSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-[var(--muted)]">
        {label}
      </p>
      <div className="mt-2">
        <TraceButton id={id} onSelect={onTraceSelect} />
      </div>
    </div>
  );
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function fallbackCopyText(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "0";
  textarea.style.top = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Clipboard copy failed");
  }
}

function traceDomId(id: string) {
  return `trace-${id}`;
}

function tabForTraceId(id: string): WorkspaceTabId {
  if (id.startsWith("EV-") || id.startsWith("SRC-")) {
    return "evidence";
  }

  if (id.startsWith("FND-")) {
    return "findings";
  }

  if (id.startsWith("LES-") || id.startsWith("GP-")) {
    return "lessons";
  }

  if (id.startsWith("REC-")) {
    return "recommendations";
  }

  if (id.startsWith("QA-")) {
    return "qa";
  }

  return "overview";
}

function traceCardClass(id: string, highlightedId: string | null, padding: string) {
  const highlighted = highlightedId === id;

  return `scroll-mt-32 rounded-lg border transition ${padding} ${
    highlighted
      ? "border-[var(--trace)] bg-[rgba(56,214,199,0.08)]"
      : "border-[var(--border)] bg-[var(--surface)]"
  }`;
}

function sensitivityClass(label: string) {
  if (label === "High") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (label === "Medium") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (label === "Low") {
    return "border-teal-200 bg-teal-50 text-teal-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function qaClass(label: string) {
  if (label === "Warning") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (label === "Needs Review") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}
