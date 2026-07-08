"use client";

import { useEffect, useMemo, useState } from "react";
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
  learningBriefMarkdown,
  qaItems,
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

  const themes = useMemo(
    () => uniqueValues(demoCase.evidence.map((entry) => entry.primaryTheme)),
    [demoCase.evidence],
  );
  const stakeholderTypes = useMemo(
    () => uniqueValues(demoCase.evidence.map((entry) => entry.stakeholderType)),
    [demoCase.evidence],
  );
  const evidenceStrengths = useMemo(
    () =>
      uniqueValues(demoCase.evidence.map((entry) => entry.evidenceStrength)),
    [demoCase.evidence],
  );
  const sensitivityFlags = useMemo(
    () => uniqueValues(demoCase.evidence.map((entry) => entry.sensitivityFlag)),
    [demoCase.evidence],
  );

  const filteredEvidence = useMemo(
    () =>
      demoCase.evidence.filter((entry) => {
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
    [demoCase.evidence, filters],
  );

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
    setActiveTab(tabForTraceId(id));
    setHighlightedId(id);
    setPendingTraceId(id);
  }

  async function copyLearningBrief() {
    try {
      await navigator.clipboard.writeText(learningBriefMarkdown);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2200);
    } catch {
      setCopyStatus("error");
    }
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
            <OverviewTab demoCase={demoCase} />
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
            <QAReviewSection qaItems={qaItems} traceHandlers={traceHandlers} />
          ) : null}
          {activeTab === "brief" ? (
            <LearningBriefSection
              copyStatus={copyStatus}
              demoCase={demoCase}
              markdown={learningBriefMarkdown}
              onCopy={copyLearningBrief}
              traceHandlers={traceHandlers}
            />
          ) : null}
        </div>
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

function OverviewTab({ demoCase }: { demoCase: DemoCase }) {
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

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
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

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] border-collapse text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--muted)]">
              <tr>
                <TableHead>Evidence ID</TableHead>
                <TableHead>Source ID</TableHead>
                <TableHead>Stakeholder Type</TableHead>
                <TableHead>Raw Evidence / Note</TableHead>
                <TableHead>Primary Theme</TableHead>
                <TableHead>Secondary Theme</TableHead>
                <TableHead>Evidence Strength</TableHead>
                <TableHead>Sensitivity Flag</TableHead>
                <TableHead>Potential Finding</TableHead>
                <TableHead>QA Status</TableHead>
              </tr>
            </thead>
            <tbody>
              {evidence.map((entry) => {
                const isHighlighted = traceHandlers.highlightedId === entry.id;

                return (
                  <tr
                    className={`scroll-mt-32 border-t border-[var(--border)] align-top transition ${
                      isHighlighted
                        ? "bg-teal-50 shadow-[inset_4px_0_0_var(--accent)]"
                        : ""
                    }`}
                    id={traceDomId(entry.id)}
                    key={entry.id}
                  >
                    <TableCell>
                      <TraceButton
                        id={entry.id}
                        onSelect={traceHandlers.onTraceSelect}
                      />
                    </TableCell>
                    <TableCell>
                      <TraceButton
                        id={entry.sourceId}
                        onSelect={traceHandlers.onTraceSelect}
                      />
                    </TableCell>
                    <TableCell>{entry.stakeholderType}</TableCell>
                    <TableCell className="max-w-[300px] leading-6">
                      {entry.rawEvidence}
                    </TableCell>
                    <TableCell>{entry.primaryTheme}</TableCell>
                    <TableCell>{entry.secondaryTheme}</TableCell>
                    <TableCell>
                      <StrengthBadge value={entry.evidenceStrength} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={entry.sensitivityFlag}
                        tone="sensitivity"
                      />
                    </TableCell>
                    <TableCell className="max-w-[280px] leading-6">
                      {entry.potentialFinding}
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={entry.qaStatus} tone="qa" />
                    </TableCell>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {evidence.length === 0 ? (
          <div className="p-6 text-sm text-[var(--muted)]">
            No evidence entries match the selected filters.
          </div>
        ) : null}
      </div>
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
}: {
  qaItems: QAReviewItem[];
  traceHandlers: TraceHandlers;
}) {
  return (
    <Section
      description="The checklist flags traceability, sensitivity, overclaiming, and donor-readiness risks."
      eyebrow="QA review"
      title="Human review required"
    >
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
    <article className="mt-5 overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-sm">
      <header className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-5 py-6 sm:px-8">
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">
          Learning Brief
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-normal">
          {demoCase.project}
        </h2>
        <p className="mt-2 max-w-3xl text-base leading-7 text-[var(--muted)]">
          {demoCase.subtitle}
        </p>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
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

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}

function TableCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-4 text-[var(--foreground)] ${className}`}>
      {children}
    </td>
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
