"use client";

import React, { useEffect, useMemo, useState } from "react";
import type {
  DemoCase,
  EvidenceEntry,
  EvidenceStrength,
  Finding,
  GoodPractice,
  LessonLearned,
  QAReviewItem,
  QAReviewStatus,
  Recommendation,
  RecommendationPriority,
  SensitivityFlag,
  SourceRecord,
} from "@/lib/types";
import { generateQAReview } from "@/lib/qa";
import { generateLearningBriefMarkdown } from "@/lib/generateBrief";

interface FieldLearningStudioAppProps {
  demoCase: DemoCase;
  learningBriefMarkdown: string;
  qaItems: QAReviewItem[];
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

  // v0.2 workspace states
  const [evidenceList, setEvidenceList] = useState<EvidenceEntry[]>(demoCase.evidence);
  const [sourcesList, setSourcesList] = useState<SourceRecord[]>(demoCase.sources);
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [sandboxText, setSandboxText] = useState("");
  const [sandboxCount, setSandboxCount] = useState(1);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditRun, setAuditRun] = useState(false);
  const [auditMessage, setAuditMessage] = useState("");

  const activeDemoCase = useMemo(() => {
    return {
      ...demoCase,
      evidence: evidenceList,
      sources: sourcesList,
    };
  }, [evidenceList, sourcesList, demoCase]);

  const themes = useMemo(
    () => uniqueValues(evidenceList.map((entry) => entry.primaryTheme)),
    [evidenceList],
  );
  const stakeholderTypes = useMemo(
    () => uniqueValues(evidenceList.map((entry) => entry.stakeholderType)),
    [evidenceList],
  );
  const evidenceStrengths = useMemo(
    () =>
      uniqueValues(evidenceList.map((entry) => entry.evidenceStrength)),
    [evidenceList],
  );
  const sensitivityFlags = useMemo(
    () => uniqueValues(evidenceList.map((entry) => entry.sensitivityFlag)),
    [evidenceList],
  );

  const filteredEvidence = useMemo(
    () =>
      evidenceList.filter((entry) => {
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
    [evidenceList, filters],
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
  }

  function handleTraceSelect(id: string) {
    setDrawerItemId(id);
  }

  function handleOpenRelatedTab(id: string) {
    setActiveTab(tabForTraceId(id));
    setHighlightedId(id);
    setPendingTraceId(id);
    setDrawerItemId(null);
  }

  async function copyLearningBrief() {
    try {
      await navigator.clipboard.writeText(currentBriefMarkdown);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2200);
    } catch {
      setCopyStatus("error");
    }
  }

  function handleParseSandbox() {
    if (!sandboxText.trim()) return;

    const text = sandboxText.trim().toLowerCase();
    let inferredTheme = "General programme learning";
    let sensitivity: SensitivityFlag = "Low";

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

    setEvidenceList((prev) => [newEvidenceEntry, ...prev]);
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
    setSourcesList((prev) => [newSourceEntry, ...prev]);

    setActiveTab("evidence");
    setHighlightedId(tempId);
    setPendingTraceId(tempId);
  }

  function handleResetSandbox() {
    setEvidenceList(demoCase.evidence);
    setSourcesList(demoCase.sources);
    setSandboxCount(1);
    setSandboxText("");
    setHighlightedId(null);
    setPendingTraceId(null);
    setDrawerItemId(null);
    setAuditRun(false);
  }

  function handleRunQaAudit() {
    setIsAuditing(true);
    setAuditRun(false);
    setAuditMessage("Initiating compliance audit...");

    setTimeout(() => setAuditMessage("Checking evidence-finding linkages..."), 450);
    setTimeout(() => setAuditMessage("Analyzing overclaiming indicators & sensitivity flags..."), 900);
    setTimeout(() => setAuditMessage("Finalizing QA check summary..."), 1350);
    setTimeout(() => {
      setIsAuditing(false);
      setAuditRun(true);
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

    const id = drawerItemId;
    if (id.startsWith("EV-") || id.startsWith("EV-TEMP-") || id.startsWith("TEMP-EV-")) {
      itemType = "Evidence Record";
      const entry = evidenceList.find((e) => e.id === id);
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
      }
    } else if (id.startsWith("SRC-") || id.startsWith("SRC-TEMP-")) {
      itemType = "Source Record";
      const source = demoCase.sources.find((s) => s.id === id);
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
      }
    } else if (id.startsWith("FND-")) {
      itemType = "Synthesis Finding";
      const finding = demoCase.findings.find((f) => f.id === id);
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
      }
    } else if (id.startsWith("LES-")) {
      itemType = "Lesson Learned";
      const lesson = demoCase.lessons.find((l) => l.id === id);
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
      }
    } else if (id.startsWith("GP-")) {
      itemType = "Good Practice";
      const practice = demoCase.goodPractices.find((g) => g.id === id);
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
      }
    } else if (id.startsWith("REC-")) {
      itemType = "Programmatic Recommendation";
      const rec = demoCase.recommendations.find((r) => r.id === id);
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
      }
    }

    if (!itemType) {
      return (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-[var(--border)] p-6 flex flex-col justify-between">
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
          className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs transition-opacity" 
          onClick={() => setDrawerItemId(null)}
        />

        <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col p-6 overflow-y-auto border-l border-[var(--border)] transition-transform duration-300">
          <div className="flex justify-between items-start pb-4 border-b border-[var(--border)]">
            <div>
              <span className="font-mono text-[10px] uppercase font-semibold text-[var(--accent)] tracking-wider block">
                {itemType}
              </span>
              <h3 className="font-mono text-base font-bold text-[var(--foreground)] mt-1">
                {id}
              </h3>
            </div>
            <button 
              className="text-2xl font-bold cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--accent)] rounded p-1"
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
                <p className="mt-2 text-sm leading-6 text-[var(--muted)] bg-[var(--surface-muted)] p-3 rounded-lg border border-[var(--border)]">
                  {textContent}
                </p>
              )}
            </div>

            {metadata.length > 0 && (
              <div className="border-t border-[var(--border)] pt-4">
                <h5 className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)] mb-3">
                  Metadata Profile
                </h5>
                <dl className="grid grid-cols-1 gap-y-3 gap-x-4 sm:grid-cols-2 text-xs">
                  {metadata.map((meta) => (
                    <div key={meta.label} className="col-span-2 sm:col-span-1">
                      <dt className="font-semibold text-[var(--muted)] uppercase tracking-wider text-[9px] block mb-0.5">
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

            {linkedIds.length > 0 && (
              <div className="border-t border-[var(--border)] pt-4">
                <h5 className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)] mb-2">
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
              className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)] cursor-pointer font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              onClick={() => setDrawerItemId(null)}
            >
              Close
            </button>
            <button 
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--accent-strong)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
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
    <main>
      <AppHeader demoCase={demoCase} />

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
              hasSandboxItems={evidenceList.length > demoCase.evidence.length}
            />
          ) : null}
          {activeTab === "evidence" ? (
            <EvidenceTab
              evidence={filteredEvidence}
              evidenceStrengths={evidenceStrengths}
              filters={filters}
              onFiltersChange={setFilters}
              sensitivityFlags={sensitivityFlags}
              sources={demoCase.sources}
              stakeholderTypes={stakeholderTypes}
              themes={themes}
              traceHandlers={traceHandlers}
            />
          ) : null}
          {activeTab === "findings" ? (
            <FindingsSection
              findings={demoCase.findings}
              traceHandlers={traceHandlers}
            />
          ) : null}
          {activeTab === "lessons" ? (
            <LessonsAndPractices
              goodPractices={demoCase.goodPractices}
              lessons={demoCase.lessons}
              traceHandlers={traceHandlers}
            />
          ) : null}
          {activeTab === "recommendations" ? (
            <RecommendationsSection
              recommendations={demoCase.recommendations}
              traceHandlers={traceHandlers}
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

function AppHeader({ demoCase }: { demoCase: DemoCase }) {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
        <div>
          <div className="w-fit rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            Demo Mode: This version uses fictional data only. Do not enter real
            sensitive field evidence.
          </div>
          <p className="mt-5 text-sm font-semibold uppercase text-[var(--accent)]">
            Field evidence to learning brief
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal text-[var(--foreground)] sm:text-5xl">
            Field Learning Studio
          </h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-[var(--muted)]">
            AI-assisted evidence synthesis for MEL, evaluation, and donor-ready
            learning briefs.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5">
          <p className="text-sm font-semibold text-[var(--accent)]">
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
      className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/95 px-4 shadow-sm backdrop-blur"
    >
      <div className="flex gap-6 overflow-x-auto" role="tablist">
        {workspaceTabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              aria-selected={isActive}
              className={`min-h-12 min-w-fit px-1 py-3 text-sm font-semibold transition focus:outline-none focus:text-[var(--accent)] border-b-2 cursor-pointer ${
                isActive
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--border)]"
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
}: {
  demoCase: DemoCase;
  onTabChange: (tabId: WorkspaceTabId) => void;
  sandboxText: string;
  setSandboxText: (text: string) => void;
  onParse: () => void;
  onReset: () => void;
  hasSandboxItems: boolean;
}) {
  const valueCards = [
    {
      title: "Evidence-first synthesis",
      text: "Every claim starts with a visible evidence base and source trail.",
    },
    {
      title: "Traceable findings",
      text: "Findings, lessons, practices, and recommendations stay linked.",
    },
    {
      title: "Donor-ready outputs",
      text: "Styled brief preview and Markdown copy support careful review.",
    },
  ];

  const pipelineSteps: Array<{ id: WorkspaceTabId; label: string }> = [
    { id: "evidence", label: "Raw Evidence" },
    { id: "findings", label: "Findings" },
    { id: "lessons", label: "Lessons Learned" },
    { id: "recommendations", label: "Recommendations" },
    { id: "qa", label: "QA Review" },
    { id: "brief", label: "Learning Brief" },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
      <div className="flex flex-col gap-5">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm font-semibold uppercase text-[var(--accent)]">
            Overview
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl">
            {demoCase.project}
          </h2>
          <p className="mt-2 text-base leading-7 text-[var(--muted)]">
            {demoCase.subtitle}
          </p>
          <p className="mt-5 text-base leading-7 text-[var(--muted)]">
            {demoCase.context}
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {valueCards.map((card) => (
              <div
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4"
                key={card.title}
              >
                <h3 className="text-base font-semibold text-[var(--foreground)]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Clickable Flowchart Pipeline */}
        <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
            Synthesis Pipeline Flow
          </h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Click any step in the flow to navigate directly to that workspace stage.
          </p>
          <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3 overflow-x-auto pb-2">
            {pipelineSteps.map((step, idx) => (
              <React.Fragment key={step.id}>
                <button
                  className="w-full md:w-auto min-h-11 px-4 py-2.5 rounded-lg border border-teal-200 bg-teal-50/50 hover:bg-teal-50 text-xs font-semibold text-[var(--accent-strong)] cursor-pointer text-center transition flex-1 hover:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  onClick={() => onTabChange(step.id)}
                >
                  {step.label}
                </button>
                {idx < pipelineSteps.length - 1 && (
                  <span className="text-[var(--muted)] font-bold text-sm select-none rotate-90 md:rotate-0">
                    →
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* Sandbox Note card */}
        <section className="rounded-lg border border-amber-200 bg-amber-50/20 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-amber-900">
                Try a field note — local demo only
              </h3>
              <p className="mt-1 text-xs text-amber-800/80 leading-5">
                Local demo only. This text is not uploaded, saved, or analyzed by an external AI service. Do not enter real sensitive field evidence.
              </p>
            </div>
            {hasSandboxItems && (
              <button
                className="px-3 py-1 bg-white border border-amber-300 text-amber-900 rounded-md text-xs font-semibold hover:bg-amber-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
                onClick={onReset}
              >
                Reset Sandbox
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <textarea
              className="w-full min-h-[100px] p-3 border border-amber-300/60 bg-white rounded-lg text-sm text-zinc-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder-zinc-400"
              placeholder="Type or paste 2-3 sentences of monitoring notes here..."
              value={sandboxText}
              onChange={(e) => setSandboxText(e.target.value)}
            />
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">Quick Samples:</span>
                <button 
                  className="px-2.5 py-1 bg-white border border-amber-200 text-amber-800 text-[11px] rounded hover:bg-amber-50/50 cursor-pointer transition"
                  onClick={() => setSandboxText("Women report feeling unsafe at evening peacebuilding committee meetings due to poor street lighting and lack of public transport.")}
                >
                  Safe Access
                </button>
                <button 
                  className="px-2.5 py-1 bg-white border border-amber-200 text-amber-800 text-[11px] rounded hover:bg-amber-50/50 cursor-pointer transition"
                  onClick={() => setSandboxText("Youth attendance at the conflict mediation training was high, but their active verbal engagement in the plenary sessions remained very low.")}
                >
                  Youth Engagement
                </button>
                <button 
                  className="px-2.5 py-1 bg-white border border-amber-200 text-amber-800 text-[11px] rounded hover:bg-amber-50/50 cursor-pointer transition"
                  onClick={() => setSandboxText("Local partner staff spend more than 40% of their working hours compiling donor compliance reports, leaving little time for direct field engagement.")}
                >
                  Reporting Burden
                </button>
              </div>

              <button
                className={`min-h-10 px-4 rounded-lg text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                  sandboxText.trim() 
                    ? "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs" 
                    : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                }`}
                disabled={!sandboxText.trim()}
                onClick={onParse}
              >
                Parse into Evidence
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-5">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-base font-semibold">Evidence base</h2>
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
          <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            This workspace uses fictional data only and remains local to the demo
            app.
          </div>
        </section>

        {/* How to Demo card */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">
            How to Demo Field Learning Studio
          </h3>
          <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
            Follow this structured walkthrough to showcase the core traceability value proposition in 5 minutes:
          </p>
          <ol className="mt-4 space-y-3 text-xs text-[var(--muted)] leading-5 list-decimal pl-4">
            <li>
              <span className="font-semibold text-[var(--foreground)]">Try Sandbox Note:</span> Paste a custom note or click one of the quick sample buttons below to parse local evidence.
            </li>
            <li>
              <span className="font-semibold text-[var(--foreground)]">Review Ingestion:</span> Go to the <button onClick={() => onTabChange("evidence")} className="text-[var(--accent)] underline hover:text-[var(--accent-strong)] font-semibold cursor-pointer">Evidence</button> tab to verify the dynamic theme-coding.
            </li>
            <li>
              <span className="font-semibold text-[var(--foreground)]">Trace Source Trail:</span> Click the evidence ID or source ID button to open the side drawer and inspect the lineage overlay.
            </li>
            <li>
              <span className="font-semibold text-[var(--foreground)]">Run QA Audit:</span> Jump to the <button onClick={() => onTabChange("qa")} className="text-[var(--accent)] underline hover:text-[var(--accent-strong)] font-semibold cursor-pointer">QA Review</button> tab and execute the QA Audit scanner.
            </li>
            <li>
              <span className="font-semibold text-[var(--foreground)]">Export Brief:</span> Review the printable A4 document sheet on the <button onClick={() => onTabChange("brief")} className="text-[var(--accent)] underline hover:text-[var(--accent-strong)] font-semibold cursor-pointer">Brief</button> tab and copy the Markdown.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function EvidenceTab({
  evidence,
  evidenceStrengths,
  filters,
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
        onFiltersChange={onFiltersChange}
        sensitivityFlags={sensitivityFlags}
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
  onFiltersChange,
  themes,
  stakeholderTypes,
  evidenceStrengths,
  sensitivityFlags,
  traceHandlers,
}: {
  evidence: EvidenceEntry[];
  filters: EvidenceFilters;
  onFiltersChange: (filters: EvidenceFilters) => void;
  themes: string[];
  stakeholderTypes: string[];
  evidenceStrengths: string[];
  sensitivityFlags: string[];
  traceHandlers: TraceHandlers;
}) {
  return (
    <Section
      description="This demo uses fictional data only. Evidence IDs are clickable traceability anchors."
      eyebrow="Evidence matrix"
      title="Theme-coded evidence"
    >
      <div className="text-xs font-semibold text-amber-700 bg-amber-50/60 border border-amber-200/50 rounded-lg px-3 py-1.5 w-fit">
        Fictional demo data
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

          return (
            <article
              className={`scroll-mt-32 rounded-lg border transition p-5 flex flex-col justify-between ${
                isHighlighted
                  ? "border-[var(--accent)] bg-teal-50 shadow-[0_0_0_3px_rgba(15,118,110,0.18)]"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
              id={traceDomId(entry.id)}
              key={entry.id}
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <TraceButton
                      id={entry.id}
                      onSelect={traceHandlers.onTraceSelect}
                    />
                    {isSandbox && (
                      <span className="text-[9px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200/50 rounded-md px-1.5 py-0.5 animate-pulse">
                        Sandbox Item
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[var(--muted)]">Source:</span>
                    <TraceButton
                      id={entry.sourceId}
                      onSelect={traceHandlers.onTraceSelect}
                    />
                    <StatusBadge label={entry.qaStatus} tone="qa" />
                  </div>
                </div>

                <div className="mt-4">
                  <blockquote className="text-sm font-medium leading-6 text-[var(--foreground)] italic border-l-2 border-teal-600/30 pl-3">
                    &ldquo;{entry.rawEvidence}&rdquo;
                  </blockquote>
                  <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
                    <span className="font-semibold text-[var(--foreground)] text-[10px] uppercase tracking-wider block mb-0.5">Potential Finding:</span> {entry.potentialFinding}
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-zinc-100 pt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mr-1">Profile:</span>
                <span className="text-[10px] font-semibold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full border border-zinc-200/60">
                  {entry.stakeholderType}
                </span>
                <span className="text-[10px] font-semibold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full border border-zinc-200/60">
                  {entry.primaryTheme}
                </span>
                <StrengthBadge value={entry.evidenceStrength} />
                <StatusBadge label={entry.sensitivityFlag} tone="sensitivity" />
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
}: {
  findings: Finding[];
  traceHandlers: TraceHandlers;
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
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">Lessons Learned</h3>
          {lessons.map((lesson) => (
            <article
              className={traceCardClass(
                lesson.id,
                traceHandlers.highlightedId,
                "p-5",
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

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">Good Practices</h3>
          {goodPractices.map((practice) => (
            <article
              className={traceCardClass(
                practice.id,
                traceHandlers.highlightedId,
                "p-5",
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
    </Section>
  );
}

function RecommendationsSection({
  recommendations,
  traceHandlers,
}: {
  recommendations: Recommendation[];
  traceHandlers: TraceHandlers;
}) {
  return (
    <Section
      description="Recommendations are grouped by priority and linked to findings and evidence."
      eyebrow="Recommendations"
      title="No recommendation without a finding"
    >
      <div className="grid gap-4 xl:grid-cols-3">
        {priorityOrder.map((priority) => {
          const items = recommendations.filter(
            (recommendation) => recommendation.priority === priority,
          );

          return (
            <div className="flex flex-col gap-4" key={priority}>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
                <h3 className="text-base font-semibold">{priority} Priority</h3>
              </div>
              {items.map((recommendation) => (
                <article
                  className={traceCardClass(
                    recommendation.id,
                    traceHandlers.highlightedId,
                    "p-5",
                  )}
                  id={traceDomId(recommendation.id)}
                  key={recommendation.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
                    <TraceButton
                      id={recommendation.id}
                      onSelect={traceHandlers.onTraceSelect}
                    />
                    <PriorityBadge value={recommendation.priority} />
                  </div>
                  <h4 className="mt-3 text-base font-semibold leading-6 text-[var(--foreground)]">
                    {recommendation.recommendation}
                  </h4>
                  <div className="mt-4 border-t border-[var(--border)] pt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div className="col-span-2">
                      <LinkedTraceField
                        className=""
                        id={recommendation.linkedFindingId}
                        label="Linked finding"
                        onTraceSelect={traceHandlers.onTraceSelect}
                      />
                    </div>
                    <div className="col-span-2">
                      <TraceIdList
                        className=""
                        ids={recommendation.evidenceBase}
                        label="Evidence base"
                        onTraceSelect={traceHandlers.onTraceSelect}
                      />
                    </div>
                    <CompactField
                      label="Responsible actor"
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
                      label="Expected benefit"
                      value={recommendation.expectedBenefit}
                      fullWidth
                    />
                    <CompactField
                      label="Success indicator"
                      value={recommendation.successIndicator}
                      fullWidth
                    />
                  </div>
                </article>
              ))}
            </div>
          );
        })}
      </div>
    </Section>
  );
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
  return (
    <Section
      description="The checklist flags traceability, sensitivity, overclaiming, and donor-readiness risks."
      eyebrow="QA review"
      title="Human review required"
    >
      {!auditRun && !isAuditing ? (
        <div className="rounded-lg border border-[var(--border)] bg-white p-8 text-center max-w-xl mx-auto shadow-xs">
          <div className="flex justify-center mb-4 text-[var(--accent)]">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-[var(--foreground)]">Workspace Audit Required</h3>
          <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
            Traceability constraints, triangulation quotas, conflict safety thresholds, and structural integrity checks have not been verified for the current workspace.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              className="min-h-11 px-5 bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-white font-semibold text-sm rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-xs transition"
              onClick={onRunAudit}
            >
              Run QA Audit
            </button>
            <span className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">
              Deterministic demo check — not an AI or human evaluation
            </span>
          </div>
        </div>
      ) : null}

      {isAuditing ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50/30 p-12 text-center max-w-xl mx-auto shadow-xs animate-pulse">
          <div className="flex justify-center mb-4">
            <div className="h-10 w-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-base font-bold text-[var(--accent-strong)]">Running Workspace Audit</h3>
          <p className="mt-2 text-xs text-[var(--accent-strong)]/80 font-medium">
            {auditMessage}
          </p>
        </div>
      ) : null}

      {auditRun && !isAuditing ? (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <p className="text-xs text-[var(--muted)] font-semibold uppercase tracking-wider">
                Audit Status: Complete
              </p>
              <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider bg-amber-50 border border-amber-200/50 rounded px-2 py-0.5 mt-1 w-fit">
                Deterministic demo check — not an AI or human evaluation
              </p>
            </div>
            <button
              className="px-3 py-1.5 border border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--foreground)] font-semibold text-xs rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              onClick={onRunAudit}
            >
              Re-Run Audit
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {qaItems.map((item) => (
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
                <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {item.reviewQuestion}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">
                  {item.notes}
                </p>
              </article>
            ))}
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
      description="Styled donor-ready preview with Markdown copy preserved for v0.1 export."
      eyebrow="Learning brief"
      title="Donor-ready brief preview"
    >
      <div className="text-xs font-semibold text-amber-700 bg-amber-50/60 border border-amber-200/50 rounded-lg px-3 py-1.5 w-fit">
        Fictional demo data | Markdown export for validation only
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">
              {demoCase.project}: Learning Brief
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {demoCase.subtitle}
            </p>
          </div>
          <button
            className="min-h-11 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
            onClick={onCopy}
            type="button"
          >
            {copyStatus === "copied"
              ? "Copied"
              : copyStatus === "error"
                ? "Copy failed"
                : "Copy Learning Brief Markdown"}
          </button>
        </div>

        <StyledBriefPreview
          demoCase={demoCase}
          traceHandlers={traceHandlers}
        />

        <details className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--background)]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--foreground)]">
            Markdown source
          </summary>
          <textarea
            className="h-[340px] w-full resize-y border-t border-[var(--border)] bg-white p-4 font-mono text-sm leading-6 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
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
    <div className="bg-zinc-100/60 p-4 sm:p-8 rounded-lg border border-[var(--border)] mt-5">
      <article className="mx-auto max-w-[800px] bg-white shadow-lg border border-[var(--border)] rounded-md overflow-hidden p-8 sm:p-12">
        <header className="border-b border-[var(--border)] pb-6 mb-8">
          <span className="text-[10px] font-bold uppercase text-[var(--accent)] tracking-widest block mb-2">
            Official Programme Learning Brief
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
            {demoCase.project}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)] font-medium">
            {demoCase.subtitle}
          </p>
          <dl className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-4 border-t border-[var(--border)] pt-4 text-xs sm:text-sm">
            <BriefMetric label="Sources" value={demoCase.evidenceBase.sourceRecords} />
            <BriefMetric label="Evidence entries" value={demoCase.evidenceBase.evidenceEntries} />
            <BriefMetric label="Findings" value={demoCase.evidenceBase.findings} />
            <BriefMetric
              label="Recommendations"
              value={demoCase.evidenceBase.recommendations}
            />
          </dl>
        </header>

      <div className="space-y-8 px-5 py-6 sm:px-8">
        <BriefSection title="Executive Summary">
          <p>{demoCase.executiveSummary}</p>
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
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">
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
      <dt className="text-xs font-medium uppercase text-[var(--muted)]">
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
      <dt className="text-xs font-semibold uppercase text-[var(--muted)]">
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
        className="min-h-11 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
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
      className="inline-flex min-h-7 items-center rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 font-mono text-xs font-semibold text-[var(--accent-strong)] cursor-pointer transition hover:border-[var(--accent)] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
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
      <p className="text-xs font-semibold uppercase text-[var(--muted)]">
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
      <span className="font-semibold text-[var(--muted)] uppercase tracking-wider text-[10px] block mb-0.5">
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
      <p className="text-xs font-semibold uppercase text-[var(--muted)]">
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
      ? "border-[var(--accent)] bg-teal-50 shadow-[0_0_0_3px_rgba(15,118,110,0.18)]"
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
