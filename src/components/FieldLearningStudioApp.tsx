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
    step1: false,
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
      step1: false,
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
    } else if (tabId === "evidence" && demoProgress.step1) {
      setDemoProgress((prev) => ({ ...prev, step2: true }));
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
    setDemoProgress((prev) => ({ ...prev, step2: true }));
  }

  async function copyLearningBrief() {
    try {
      await navigator.clipboard.writeText(currentBriefMarkdown);
      setCopyStatus("copied");
      setDemoProgress((prev) => ({ ...prev, step5: true }));
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
      step1: false,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
    });
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

            {/* Reusable Visual Traceability Chain */}
            <div className="border-t border-b border-zinc-150/60 py-3.5 my-1">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--muted)] block mb-1.5">
                Visual Traceability Chain
              </span>
              <TraceChain id={id} demoCase={activeDemoCase} onSelect={setDrawerItemId} />
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
              onFiltersChange={setFilters}
              sensitivityFlags={sensitivityFlags}
              sources={currentBaseCase.sources}
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

function CaseSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="border-b border-[var(--border)] bg-zinc-50/50 py-5 px-4">
      <div className="mx-auto max-w-7xl">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-3">
          Select Active Field Synthesis Case
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {demoCases.map((c) => {
            const isSelected = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                type="button"
                className={`text-left p-4 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "border-[var(--accent)] bg-white shadow-xs ring-1 ring-[var(--accent)]"
                    : "border-[var(--border)] bg-white hover:bg-zinc-50 hover:border-zinc-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[var(--foreground)]">
                      {c.project}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        c.id === "school-nutrition"
                          ? "bg-teal-50 text-teal-800 border border-teal-200"
                          : "bg-zinc-100 text-zinc-800 border border-zinc-200"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed font-medium">
                    {c.subtitle}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--muted)] border-t border-zinc-100 pt-2.5 font-semibold">
                  <span>{c.phaseStatus || "Phase 1"}</span>
                  <span className="font-mono">
                    {c.evidenceBase.sourceRecords} Sources · {c.evidenceBase.evidenceEntries} Evidence
                  </span>
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
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
        <div>
          <div className="w-fit rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            {demoCase.id === "school-nutrition"
              ? "Sanitized real-world-inspired demo. No identifiable field data is displayed."
              : "Demo Mode: This version uses fictional data only. Do not enter real sensitive field evidence."}
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
  const pipelineSteps: Array<{ id: WorkspaceTabId; label: string }> = [
    { id: "evidence", label: "Raw Evidence" },
    { id: "findings", label: "Findings" },
    { id: "lessons", label: "Lessons Learned" },
    { id: "recommendations", label: "Recommendations" },
    { id: "qa", label: "QA Review" },
    { id: "brief", label: "Learning Brief" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Hero promise section */}
      <section className="rounded-lg border border-[var(--border)] bg-teal-50/10 p-8 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded bg-amber-50 border border-amber-200/60 px-2.5 py-1 text-xs font-semibold text-amber-900 mb-4 select-none">
            {demoCase.id === "school-nutrition"
              ? "Sanitized Real-World-Inspired Demo Case"
              : "Fictional Sandbox Demo Mode — Safe Workspace"}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--foreground)] text-wrap-balance">
            Turn field notes into traceable programme learning.
          </h1>
          <p className="mt-3 text-base sm:text-lg leading-7 text-[var(--muted)] text-wrap-balance">
            An evidence-first workspace for MEL, evaluation, and donor-reporting teams. synthesis is grounded in visible source records and auditable linkages.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button 
              onClick={() => {
                document.getElementById("guided-demo-path")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="min-h-10 px-5 bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-white font-semibold text-sm rounded-lg cursor-pointer transition shadow-xs"
            >
              Start Guided Demo
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
              className="min-h-10 px-5 bg-white border border-[var(--border)] text-[var(--foreground)] font-semibold text-sm rounded-lg hover:bg-zinc-50 cursor-pointer transition"
            >
              Try Sample Field Note
            </button>
          </div>
        </div>
      </section>

      {/* Main split grid */}
      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="flex flex-col gap-5">
          {/* 2. Suggested Walkthrough Path Card */}
          <section id="guided-demo-path" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs scroll-mt-20">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">
                Suggested Walkthrough Path
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
                    Ingest a Field Note
                  </p>
                  <p className="text-[var(--muted)]">
                    Type a qualitative log or click the &apos;Try Sample Field Note&apos; template button to simulate ingestion.
                  </p>
                  <button 
                    onClick={() => {
                      document.getElementById("sandbox-note-section")?.scrollIntoView({ behavior: "smooth" });
                      document.getElementById("sandbox-note-textarea")?.focus();
                    }}
                    className="text-[var(--accent)] hover:underline font-semibold mt-1 cursor-pointer"
                  >
                    Go to Ingest Area &rarr;
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
                    Review Coded Evidence Grid
                  </p>
                  <p className="text-[var(--muted)]">
                    Verify how raw notes are assigned to thematic tags, stakeholders, and sensitivity levels.
                  </p>
                  <button 
                    onClick={() => onTabChange("evidence")}
                    className="text-[var(--accent)] hover:underline font-semibold mt-1 cursor-pointer"
                  >
                    View Evidence Matrix &rarr;
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
                    Inspect Context-Preserving Traceability Chain
                  </p>
                  <p className="text-[var(--muted)]">
                    Click any ID pill to inspect its lineage trail in the side drawer without switching tabs.
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
                    Execute Safeguards QA Audit
                  </p>
                  <p className="text-[var(--muted)]">
                    Run the animated compliance checklist to verify triangulation and sensitivity safeguards.
                  </p>
                  <button 
                    onClick={() => onTabChange("qa")}
                    className="text-[var(--accent)] hover:underline font-semibold mt-1 cursor-pointer"
                  >
                    Run QA Review Audit &rarr;
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
                    Review and Copy Learning Brief
                  </p>
                  <p className="text-[var(--muted)]">
                    Inspect the formatted printable deliverable page and copy the structured Markdown payload.
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
          <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
              Synthesis Pipeline Flow
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Click any pipeline node to inspect that synthesis workspace step.
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
                      &rarr;
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </section>

          {/* 4. Sandbox Intake Section */}
          <section id="sandbox-note-section" className="rounded-lg border border-amber-200 bg-amber-50/20 p-5 shadow-xs scroll-mt-20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-amber-900">
                  Ingest Local Field Note Log
                </h3>
                <p className="mt-1 text-xs text-amber-800/80 leading-5">
                  Deterministic demo parsing — no AI call, no upload, no storage. Do not enter real sensitive field evidence.
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
                id="sandbox-note-textarea"
                className="w-full min-h-[100px] p-3 border border-amber-300/60 bg-white rounded-lg text-sm text-zinc-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder-zinc-400 font-sans"
                placeholder="Type or paste 2-3 sentences of monitoring notes here..."
                value={sandboxText}
                onChange={(e) => setSandboxText(e.target.value)}
              />
              
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">Templates:</span>
                  {demoCase.id === "school-nutrition" ? (
                    <>
                      <button 
                        className="px-2.5 py-1 bg-white border border-amber-200 text-amber-800 text-[11px] rounded hover:bg-amber-50/50 cursor-pointer transition font-semibold"
                        onClick={() => setSandboxText("Children are skipping the dry meal snack because there is no clean drinking water available during lunch, and some report stomach aches from unpackaged cheese stored in open bins.")}
                      >
                        Water & Spoilage
                      </button>
                      <button 
                        className="px-2.5 py-1 bg-white border border-amber-200 text-amber-800 text-[11px] rounded hover:bg-amber-50/50 cursor-pointer transition font-semibold"
                        onClick={() => setSandboxText("Social workers report that fathers do not attend any school nutrition PTA sessions, claiming cooking is a female duty, but they control the household food budget.")}
                      >
                        Caregiver Roles
                      </button>
                      <button 
                        className="px-2.5 py-1 bg-white border border-amber-200 text-amber-800 text-[11px] rounded hover:bg-amber-50/50 cursor-pointer transition font-semibold"
                        onClick={() => setSandboxText("Teachers state they are expected to deliver weekly health and nutrition lessons but have never received training materials or guidelines.")}
                      >
                        Teacher Capacity
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="px-2.5 py-1 bg-white border border-amber-200 text-amber-800 text-[11px] rounded hover:bg-amber-50/50 cursor-pointer transition font-semibold"
                        onClick={() => setSandboxText("Women report feeling unsafe at evening peacebuilding committee meetings due to poor street lighting and lack of public transport.")}
                      >
                        Safe Access
                      </button>
                      <button 
                        className="px-2.5 py-1 bg-white border border-amber-200 text-amber-800 text-[11px] rounded hover:bg-amber-50/50 cursor-pointer transition font-semibold"
                        onClick={() => setSandboxText("Youth committee attendance declines because meetings are unpredictable and do not link to practical local action budgets.")}
                      >
                        Youth Engagement
                      </button>
                      <button 
                        className="px-2.5 py-1 bg-white border border-amber-200 text-amber-800 text-[11px] rounded hover:bg-amber-50/50 cursor-pointer transition font-semibold"
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

          {/* 5. Active Traceability Chain Section */}
          {hasSandboxItems && (
            <section className="rounded-lg border border-teal-200 bg-teal-50/10 p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-strong)]">
                Latest Sandbox Evidence Trace
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Below is the visual linkage path inferred for your ingested sandbox note. Click any ID pill to inspect its parameters.
              </p>
              <div className="mt-4 bg-white p-3 rounded-lg border border-teal-200/50">
                <TraceChain id="EV-TEMP-01" demoCase={demoCase} onSelect={(id) => onTabChange(tabForTraceId(id))} />
              </div>
            </section>
          )}
        </div>

        {/* Sidebar right column */}
        <div className="flex flex-col gap-5">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">
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
              This workspace uses fictional sandbox data only. Any custom content remains local in component state.
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
              className={`scroll-mt-32 rounded-lg border transition p-6 flex flex-col justify-between ${
                isHighlighted
                  ? "border-[var(--accent)] bg-teal-50/10 shadow-xs"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-zinc-300"
              }`}
              id={traceDomId(entry.id)}
              key={entry.id}
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <TraceButton
                      id={entry.id}
                      onSelect={traceHandlers.onTraceSelect}
                    />
                    {isSandbox && (
                      <span className="text-[9px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200/50 rounded px-1.5 py-0.5 animate-pulse">
                        Sandbox evidence item — local demo only, not validated.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-[var(--muted)]">Source:</span>
                    <TraceButton
                      id={entry.sourceId}
                      onSelect={traceHandlers.onTraceSelect}
                    />
                    <StatusBadge label={entry.qaStatus} tone="qa" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Observation Summary
                    </span>
                    <blockquote className="text-sm font-medium leading-relaxed text-[var(--foreground)] italic border-l-2 border-teal-600/30 pl-3">
                      &ldquo;{entry.rawEvidence}&rdquo;
                    </blockquote>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200/60 p-3 rounded-lg text-xs leading-relaxed">
                    <span className="font-bold text-[var(--foreground)] uppercase tracking-wider text-[9px] block mb-1">
                      Synthesized Finding Interpretation
                    </span>
                    <p className="text-[var(--muted)] font-medium">
                      {entry.potentialFinding}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-zinc-100 pt-4 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-200/40">
                  {entry.stakeholderType}
                </span>
                <span className="text-[10px] font-semibold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-200/40">
                  {entry.primaryTheme}
                </span>
                <StrengthBadge value={entry.evidenceStrength} />
                <StatusBadge label={entry.sensitivityFlag} tone="sensitivity" />
                
                <button
                  onClick={() => traceHandlers.onTraceSelect(entry.id)}
                  className="ml-auto text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)] hover:underline cursor-pointer flex items-center gap-1 focus:outline-none"
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
            <div className="mt-5 pt-4 border-t border-zinc-100">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--muted)] block mb-1">
                Visual Traceability Chain
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
                  <div className="mt-5 pt-4 border-t border-zinc-100">
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--muted)] block mb-1">
                      Visual Traceability Chain
                    </span>
                    <TraceChain id={recommendation.id} demoCase={demoCase} onSelect={traceHandlers.onTraceSelect} />
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

function renderTextWithPills(text: string, onSelect: (id: string) => void) {
  if (!text) return "";
  const parts = text.split(/(\b(?:SRC|EV|FND|LES|GP|REC|QA)-\d+\b|\bEV-TEMP-\d+\b|\bSRC-TEMP-\d+\b)/g);
  return parts.map((part, index) => {
    if (/^(?:SRC|EV|FND|LES|GP|REC|QA)-\d+$/.test(part) || /^(?:EV|SRC)-TEMP-\d+$/.test(part)) {
      return (
        <button
          key={index}
          onClick={() => onSelect(part)}
          className="mx-0.5 inline-flex items-center rounded border border-teal-200 bg-teal-50 px-1.5 py-0.2 text-[10px] font-mono font-bold text-[var(--accent)] hover:underline cursor-pointer focus:outline-none"
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
          {/* Simple audit-oriented statistics counters */}
          <div className="mb-6 grid gap-4 grid-cols-3">
            <div className="rounded-lg border border-emerald-100 bg-white p-4 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 block">
                Passed Checks
              </span>
              <span className="mt-1 text-2xl font-bold text-emerald-700 block">
                {stats.pass}
              </span>
            </div>
            <div className="rounded-lg border border-amber-100 bg-white p-4 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 block">
                Needs Review
              </span>
              <span className="mt-1 text-2xl font-bold text-amber-700 block">
                {stats.needsReview}
              </span>
            </div>
            <div className="rounded-lg border border-red-100 bg-white p-4 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-red-800 block">
                Warnings Flagged
              </span>
              <span className="mt-1 text-2xl font-bold text-red-700 block">
                {stats.warning}
              </span>
            </div>
          </div>

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
            {sortedQaItems.map((item) => (
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
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  {renderTextWithPills(item.reviewQuestion, traceHandlers.onTraceSelect)}
                </p>
                <p className="mt-3 text-xs leading-5 text-[var(--foreground)] font-medium bg-zinc-50 border border-zinc-150 p-2.5 rounded">
                  {renderTextWithPills(item.notes, traceHandlers.onTraceSelect)}
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
      description="Fictional workspace demo data formatted as a printable donor learning brief draft."
      eyebrow="Learning brief"
      title="Donor-ready brief preview"
    >
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs flex flex-col gap-6">
        {/* Professional Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">
              Output Format: Donor Deliverable Draft
            </span>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Verify recommendations alignment, key messages, and annex evidence trace links below.
            </p>
          </div>
          <button
            className="min-h-10 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-white px-5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 cursor-pointer shadow-xs"
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

        <details className="mt-2 rounded-lg border border-[var(--border)] bg-zinc-50/50">
          <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-[var(--foreground)] uppercase tracking-wider select-none">
            View raw Markdown payload source
          </summary>
          <textarea
            className="h-[300px] w-full resize-y border-t border-[var(--border)] bg-white p-4 font-mono text-xs leading-5 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
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
  }

  return (
    <div className="flex flex-wrap items-center gap-1 font-mono text-[10px] text-zinc-400">
      {sourceId && (
        <button
          onClick={() => onSelect(sourceId)}
          className={`px-1.5 py-0.5 rounded border hover:bg-teal-50 cursor-pointer transition ${
            id === sourceId
              ? "border-[var(--accent)] bg-teal-50 text-[var(--accent)] font-bold"
              : "border-zinc-200 bg-zinc-50 text-zinc-600"
          }`}
        >
          {sourceId}
        </button>
      )}
      {sourceId && evidenceId && <span>&rarr;</span>}
      {evidenceId && (
        <button
          onClick={() => onSelect(evidenceId)}
          className={`px-1.5 py-0.5 rounded border hover:bg-teal-50 cursor-pointer transition ${
            id === evidenceId
              ? "border-[var(--accent)] bg-teal-50 text-[var(--accent)] font-bold"
              : "border-zinc-200 bg-zinc-50 text-zinc-600"
          }`}
        >
          {evidenceId}
        </button>
      )}
      {evidenceId && findingId && <span>&rarr;</span>}
      {findingId && (
        <button
          onClick={() => onSelect(findingId)}
          className={`px-1.5 py-0.5 rounded border hover:bg-teal-50 cursor-pointer transition ${
            id === findingId
              ? "border-[var(--accent)] bg-teal-50 text-[var(--accent)] font-bold"
              : "border-zinc-200 bg-zinc-50 text-zinc-600"
          }`}
        >
          {findingId}
        </button>
      )}
      {findingId && recId && <span>&rarr;</span>}
      {recId && (
        <button
          onClick={() => onSelect(recId)}
          className={`px-1.5 py-0.5 rounded border hover:bg-teal-50 cursor-pointer transition ${
            id === recId
              ? "border-[var(--accent)] bg-teal-50 text-[var(--accent)] font-bold"
              : "border-zinc-200 bg-zinc-50 text-zinc-600"
          }`}
        >
          {recId}
        </button>
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
