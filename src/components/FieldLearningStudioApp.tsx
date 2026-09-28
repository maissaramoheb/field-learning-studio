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
  FieldStudy,
  StudyMeta,
} from "@/lib/types";
import { generateQAReview } from "@/lib/qa";
import { generateLearningBriefMarkdown } from "@/lib/generateBrief";
import { demoCases } from "@/data/cases";
import { buildBriefExportModel } from "@/lib/buildBriefExportModel";
import { downloadBriefDocx } from "@/lib/exportDocx";
import { downloadBriefPdf } from "@/lib/exportPdf";
import { downloadBriefMarkdown } from "@/lib/exportMarkdown";
import { runSandboxSafetyCheck, parseSandboxInput } from "@/lib/sandboxParser";
import { FieldIntakeView } from "@/components/intake/FieldIntakeView";
import { DocxIntakeModal } from "@/components/intake/DocxIntakeModal";
import type { DocxImportResult } from "@/lib/intake";
import { MinimalStudyModal } from "@/components/studies/MinimalStudyModal";
import { BackupRestoreModal } from "@/components/studies/BackupRestoreModal";
import { EvidenceReviewWorkspace } from "@/components/evidence";
import { DailyDebriefView } from "@/components/debrief";
import { SynthesisWorkbench } from "@/components/synthesis";
import {
  submitForReview,
  validateArtifact,
  rejectArtifact,
  reopenRejectedArtifact,
  getRecommendationDependencyWarning,
  requiresFindingLimitationNote,
  applySubstantiveFindingEdit,
} from "@/lib/validation";
import { computeSupportProfile } from "@/lib/analytics/supportProfile";
import {
  bootstrapDemoTemplates,
  listStudies,
  assembleStudy,
  adaptFieldStudyToDemoCase,
  saveFinding,
  saveRecommendation,
} from "@/lib/storage";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

interface FieldLearningStudioAppProps {
  demoCase: DemoCase;
}

type EvidenceFilters = {
  theme: string;
  stakeholderType: string;
  evidenceStrength: string;
  sensitivityFlag: string;
  validationStatus?: string;
};

type WorkspaceTabId =
  | "overview"
  | "intake"
  | "evidence"
  | "debrief"
  | "synthesis"
  | "findings"
  | "lessons"
  | "recommendations"
  | "qa"
  | "brief";

export type PractitionerSpaceId = "study" | "field-material" | "analysis" | "deliverables";

export interface PractitionerSpaceTab {
  id: WorkspaceTabId;
  label: string;
  shortLabel: string;
}

export interface PractitionerSpace {
  id: PractitionerSpaceId;
  stepNumber: string;
  label: string;
  description: string;
  icon: string;
  defaultTab: WorkspaceTabId;
  tabs: PractitionerSpaceTab[];
}

export const PRACTITIONER_SPACES: PractitionerSpace[] = [
  {
    id: "study",
    stepNumber: "1",
    label: "Study",
    description: "Scope, Governance & Next Action",
    icon: "🧭",
    defaultTab: "overview",
    tabs: [
      { id: "overview", label: "Study Overview", shortLabel: "Study Home" },
    ],
  },
  {
    id: "field-material",
    stepNumber: "2",
    label: "Field Material",
    description: "Sources, Observations & Review",
    icon: "📋",
    defaultTab: "evidence",
    tabs: [
      { id: "evidence", label: "Evidence", shortLabel: "Evidence" },
      { id: "intake", label: "Field Intake", shortLabel: "Field Intake" },
    ],
  },
  {
    id: "analysis",
    stepNumber: "3",
    label: "Analysis",
    description: "Synthesis, Coverage & Findings",
    icon: "🔬",
    defaultTab: "synthesis",
    tabs: [
      { id: "synthesis", label: "Synthesis Workbench", shortLabel: "Synthesis" },
      { id: "findings", label: "Findings Ledger", shortLabel: "Findings" },
      { id: "debrief", label: "Daily Debrief", shortLabel: "Debrief" },
      { id: "lessons", label: "Lessons", shortLabel: "Lessons" },
    ],
  },
  {
    id: "deliverables",
    stepNumber: "4",
    label: "Deliverables",
    description: "Professional Draft, Recommendations & Final Review",
    icon: "📄",
    defaultTab: "brief",
    tabs: [
      { id: "brief", label: "Professional Draft", shortLabel: "Draft" },
      { id: "recommendations", label: "Recommendations", shortLabel: "Recommendations" },
      { id: "qa", label: "Final Review", shortLabel: "Final Review" },
    ],
  },
];

export function getSpaceForTab(tab: WorkspaceTabId): PractitionerSpaceId {
  for (const space of PRACTITIONER_SPACES) {
    if (space.tabs.some((t) => t.id === tab)) {
      return space.id;
    }
  }
  return "study";
}

export function computeNextAction(study: FieldStudy | null, demoCase: DemoCase) {
  const sources = study?.sources ?? demoCase.sources ?? [];
  const evidence = study?.evidence ?? demoCase.evidence ?? [];
  const findings = study?.findings ?? demoCase.findings ?? [];
  const recommendations = study?.recommendations ?? demoCase.recommendations ?? [];

  if (sources.length === 0) {
    return {
      stage: "1. Field Material",
      badge: "Step 1: Capture",
      title: "Add your first field source",
      description: "Begin by registering field interviews, focus groups, or observation notes in Field Intake.",
      buttonText: "Open Field Intake →",
      targetTab: "intake" as WorkspaceTabId,
      badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    };
  }

  const unreviewedEvidence = evidence.filter(
    (e) => e.validationStatus === "Draft" || e.validationStatus === "Needs Review"
  );
  if (unreviewedEvidence.length > 0) {
    return {
      stage: "2. Field Material",
      badge: "Action Required: Review Observations",
      title: `${unreviewedEvidence.length} field observation${unreviewedEvidence.length !== 1 ? "s" : ""} awaiting review`,
      description: "Verify observational rigor, check sensitivity flags, and approve draft evidence before synthesizing claims.",
      buttonText: "Resume Evidence Review →",
      targetTab: "evidence" as WorkspaceTabId,
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    };
  }

  if (findings.length === 0) {
    return {
      stage: "3. Analysis",
      badge: "Next Step: Synthesis",
      title: "Synthesize findings from validated evidence",
      description: "All current field observations have been reviewed. Synthesize evidence into grounded, validated findings.",
      buttonText: "Open Synthesis Workbench →",
      targetTab: "synthesis" as WorkspaceTabId,
      badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    };
  }

  const unreviewedFindings = findings.filter(
    (f) => f.validationStatus !== "Validated"
  );
  if (unreviewedFindings.length > 0) {
    return {
      stage: "3. Analysis",
      badge: "Action Required: Validate Claims",
      title: `${unreviewedFindings.length} finding${unreviewedFindings.length !== 1 ? "s" : ""} require validation or re-review`,
      description: "Inspect evidentiary support profiles, verify triangulated sources, and validate claims for the brief.",
      buttonText: "Review Findings Ledger →",
      targetTab: "findings" as WorkspaceTabId,
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    };
  }

  if (recommendations.length === 0) {
    return {
      stage: "4. Deliverables",
      badge: "Next Step: Recommendations",
      title: "Formulate programmatic recommendations",
      description: "Your findings are validated. Draft actionable, grounded recommendations linked directly to approved findings.",
      buttonText: "Add Recommendations →",
      targetTab: "recommendations" as WorkspaceTabId,
      badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    };
  }

  const unreviewedRecs = recommendations.filter(
    (r) => r.validationStatus !== "Validated"
  );
  if (unreviewedRecs.length > 0) {
    return {
      stage: "4. Deliverables",
      badge: "Action Required: Review Deliverables",
      title: `${unreviewedRecs.length} recommendation${unreviewedRecs.length !== 1 ? "s" : ""} require review`,
      description: "Ensure each recommendation links to a validated parent finding and specifies an intended actor.",
      buttonText: "Review Recommendations →",
      targetTab: "recommendations" as WorkspaceTabId,
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    };
  }

  return {
    stage: "4. Deliverables",
    badge: "Draft Ready for Review",
    title: "Professional Learning Brief draft ready for review",
    description: "All evidence, findings, and recommendations satisfy defined formal claim integrity rules. Ready for professional review and export.",
    buttonText: "Review Professional Draft →",
    targetTab: "brief" as WorkspaceTabId,
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  };
}

type TraceHandlers = {
  highlightedId: string | null;
  onTraceSelect: (id: string) => void;
};

const priorityOrder: RecommendationPriority[] = ["High", "Medium", "Low"];

function isSandboxRecordId(id: string): boolean {
  return id.includes("SBX") || id.includes("TEMP");
}

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
    validationStatus: "All",
  });
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  // Multi-case architecture states
  const [selectedCaseId, setSelectedCaseId] = useState<string>(demoCase.id);
  const [allStudies, setAllStudies] = useState<StudyMeta[]>([]);
  const [currentStudy, setCurrentStudy] = useState<FieldStudy | null>(null);
  const [isNewStudyModalOpen, setIsNewStudyModalOpen] = useState(false);
  const [isBackupRestoreModalOpen, setIsBackupRestoreModalOpen] = useState(false);
  const [isDocxModalOpen, setIsDocxModalOpen] = useState(false);
  const [docxReceipt, setDocxReceipt] = useState<{
    sourcesCount: number;
    evidenceCount: number;
    needsReviewCount: number;
  } | null>(null);

  const refreshStudiesList = async (targetId?: string) => {
    try {
      await bootstrapDemoTemplates();
      const studies = await listStudies();
      setAllStudies(studies);

      const idToLoad = targetId || selectedCaseId || studies[0]?.id;
      if (idToLoad) {
        if (targetId && targetId !== selectedCaseId) {
          setSelectedCaseId(targetId);
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("fls_active_study_id", idToLoad);
        }
        const assembled = await assembleStudy(idToLoad);
        if (assembled) {
          setCurrentStudy(assembled);
        }
      }
    } catch (err) {
      console.error("Storage error:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function initStudies() {
      try {
        await bootstrapDemoTemplates();
        const studies = await listStudies();
        if (!isMounted) return;
        setAllStudies(studies);

        const savedStudyId =
          typeof window !== "undefined"
            ? localStorage.getItem("fls_active_study_id")
            : null;
        const targetId =
          savedStudyId && studies.some((s) => s.id === savedStudyId)
            ? savedStudyId
            : demoCase.id || studies[0]?.id;

        setSelectedCaseId(targetId);
        if (targetId) {
          const assembled = await assembleStudy(targetId);
          if (isMounted && assembled) {
            setCurrentStudy(assembled);
          }
        }
      } catch (err) {
        console.error("Storage initialization error:", err);
      }
    }
    initStudies();
    return () => {
      isMounted = false;
    };
  }, [demoCase.id]);

  const currentBaseCase = useMemo(() => {
    if (currentStudy) {
      return adaptFieldStudyToDemoCase(currentStudy);
    }
    return demoCases.find((c) => c.id === selectedCaseId) || demoCases[0];
  }, [currentStudy, selectedCaseId]);

  // v0.2/v0.8 local session sandbox additions
  const [sandboxEvidence, setSandboxEvidence] = useState<EvidenceEntry[]>([]);
  const [sandboxSources, setSandboxSources] = useState<SourceRecord[]>([]);
  const [sandboxFindings, setSandboxFindings] = useState<Finding[]>([]);
  const [sandboxRecommendations, setSandboxRecommendations] = useState<Recommendation[]>([]);

  const [sandboxStakeholder, setSandboxStakeholder] = useState("Children / youth");
  const [sandboxDataType, setSandboxDataType] = useState("Interview");
  const [sandboxTheme, setSandboxTheme] = useState("Access");
  const [sandboxSensitivity, setSandboxSensitivity] = useState<"Low" | "Medium" | "High">("Low");
  const [sandboxSiteLabel, setSandboxSiteLabel] = useState("");

  const [anonymizationConfirmed, setAnonymizationConfirmed] = useState(false);
  const [includeSandboxInBrief, setIncludeSandboxInBrief] = useState(false);

  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [sandboxText, setSandboxText] = useState("");
  const [sandboxCount, setSandboxCount] = useState(1);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditRun, setAuditRun] = useState(false);
  const [auditMessage, setAuditMessage] = useState("");

  const scannerTriggered = useMemo(() => {
    return runSandboxSafetyCheck(sandboxText);
  }, [sandboxText]);

  const updateSandboxText = (text: string) => {
    setSandboxText(text);
    setAnonymizationConfirmed(false);
  };

  // v0.2 walkthrough path progress (subtle & professional Suggested Walkthrough)
  const [demoProgress, setDemoProgress] = useState({
    step1: true,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
  });

  // Clear session sandbox and progress on case change
  async function handleSelectCase(caseId: string) {
    if (sandboxEvidence.length > 0) {
      const proceed = window.confirm("Changing cases will clear all your local sandbox drafts. Do you want to proceed?");
      if (!proceed) return;
    }
    setSelectedCaseId(caseId);
    if (typeof window !== "undefined") {
      localStorage.setItem("fls_active_study_id", caseId);
    }
    setSandboxEvidence([]);
    setSandboxSources([]);
    setSandboxFindings([]);
    setSandboxRecommendations([]);
    setSandboxText("");
    setSandboxCount(1);
    setSandboxStakeholder("Children / youth");
    setSandboxDataType("Interview");
    setSandboxTheme("Access");
    setSandboxSensitivity("Low");
    setSandboxSiteLabel("");
    setAnonymizationConfirmed(false);
    setIncludeSandboxInBrief(false);
    setAuditRun(false);
    setDrawerItemId(null);
    setDemoProgress({
      step1: true,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
    });

    try {
      const assembled = await assembleStudy(caseId);
      if (assembled) {
        setCurrentStudy(assembled);
      }
    } catch (err) {
      console.error("Failed to load study:", err);
    }
  }

  const handleRefreshCurrentStudy = async () => {
    if (selectedCaseId) {
      try {
        const assembled = await assembleStudy(selectedCaseId);
        if (assembled) {
          setCurrentStudy(assembled);
        }
        const studies = await listStudies();
        setAllStudies(studies);
      } catch (err) {
        console.error("Failed to refresh study:", err);
      }
    }
  };

  const handleDocxImportComplete = async (result: DocxImportResult) => {
    if (result.studyId && result.studyId !== selectedCaseId) {
      if (typeof window !== "undefined") {
        localStorage.setItem("fls_active_study_id", result.studyId);
      }
      setSelectedCaseId(result.studyId);
      await refreshStudiesList(result.studyId);
    } else {
      await handleRefreshCurrentStudy();
    }
    setDocxReceipt({
      sourcesCount: result.sourcesCount,
      evidenceCount: result.evidenceCount,
      needsReviewCount: result.needsReviewCount,
    });
    setActiveTab("evidence");
  };

  // Derived dynamic active case data mapping
  const activeDemoCase = useMemo(() => {
    return {
      ...currentBaseCase,
      evidence: [...sandboxEvidence, ...currentBaseCase.evidence],
      sources: [...sandboxSources, ...currentBaseCase.sources],
      findings: [...sandboxFindings, ...currentBaseCase.findings],
      recommendations: [...sandboxRecommendations, ...currentBaseCase.recommendations],
    };
  }, [sandboxEvidence, sandboxSources, sandboxFindings, sandboxRecommendations, currentBaseCase]);

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
        const itemStatus =
          entry.validationStatus || (currentStudy?.isDemoCase ? "Validated" : "Draft");
        return (
          (filters.theme === "All" || entry.primaryTheme === filters.theme) &&
          (filters.stakeholderType === "All" ||
            entry.stakeholderType === filters.stakeholderType) &&
          (filters.evidenceStrength === "All" ||
            entry.evidenceStrength === filters.evidenceStrength) &&
          (filters.sensitivityFlag === "All" ||
            entry.sensitivityFlag === filters.sensitivityFlag) &&
          (!filters.validationStatus ||
            filters.validationStatus === "All" ||
            itemStatus === filters.validationStatus)
        );
      }),
    [activeDemoCase.evidence, filters, currentStudy?.isDemoCase],
  );

  const currentQaItems = useMemo(() => {
    return generateQAReview(activeDemoCase);
  }, [activeDemoCase]);

  const currentBriefMarkdown = useMemo(() => {
    return generateLearningBriefMarkdown(activeDemoCase, includeSandboxInBrief);
  }, [activeDemoCase, includeSandboxInBrief]);

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
    window.scrollTo({ top: 0, behavior: "instant" });
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
    if (scannerTriggered && !anonymizationConfirmed) return;

    const { source, evidence, finding, recommendation } = parseSandboxInput({
      text: sandboxText.trim(),
      stakeholderGroup: sandboxStakeholder,
      dataType: sandboxDataType,
      theme: sandboxTheme,
      sensitivity: sandboxSensitivity,
      siteLabel: sandboxSiteLabel.trim() || undefined,
      counter: sandboxCount,
    });

    setSandboxSources((prev) => [source, ...prev]);
    setSandboxEvidence((prev) => [evidence, ...prev]);
    setSandboxFindings((prev) => [finding, ...prev]);
    setSandboxRecommendations((prev) => [recommendation, ...prev]);

    setSandboxCount((prev) => prev + 1);

    // Clear input text, but keep metadata selects for convenience
    setSandboxText("");
    setAnonymizationConfirmed(false);

    // Walkthrough step mapping
    setDemoProgress((prev) => ({ ...prev, step1: true, step2: true }));

    setActiveTab("evidence");
    setHighlightedId(evidence.id);
    setPendingTraceId(evidence.id);
  }

  function handleResetSandbox() {
    setSandboxEvidence([]);
    setSandboxSources([]);
    setSandboxFindings([]);
    setSandboxRecommendations([]);
    setSandboxCount(1);
    setSandboxText("");
    setSandboxStakeholder("Children / youth");
    setSandboxDataType("Interview");
    setSandboxTheme("Access");
    setSandboxSensitivity("Low");
    setSandboxSiteLabel("");
    setAnonymizationConfirmed(false);
    setIncludeSandboxInBrief(false);

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
        safeguardNote = `Status: ${qa.status}. Human review is still required before professional draft use.`;
      }
    } else if (id.startsWith("DBR-")) {
      itemType = "Daily Field Debrief";
      const debrief = currentStudy?.debriefs?.find((d) => d.id === id);
      if (debrief) {
        title = `Daily Debrief: ${debrief.date} (${debrief.id})`;
        textContent = debrief.whatSurprisedUs
          ? `Surprises & Patterns: ${debrief.whatSurprisedUs}`
          : debrief.emergingHypotheses
          ? `Working Theory: ${debrief.emergingHypotheses}`
          : "Field team sensemaking session";
        metadata = [
          { label: "Date", value: debrief.date },
          {
            label: "Sites Covered",
            value:
              debrief.siteIds && debrief.siteIds.length > 0
                ? debrief.siteIds.join(", ")
                : "Study-wide / Not specified",
          },
          {
            label: "Attendees",
            value:
              debrief.attendees && debrief.attendees.length > 0
                ? debrief.attendees.join(", ")
                : "Not recorded",
          },
          {
            label: "Tomorrow Priorities",
            value:
              debrief.tomorrowPriorities && debrief.tomorrowPriorities.length > 0
                ? debrief.tomorrowPriorities.join("; ")
                : "None recorded",
          },
          { label: "Surprises Noted", value: debrief.whatSurprisedUs || "None" },
          { label: "Patterns Repeated", value: debrief.whatRepeated || "None" },
          {
            label: "Contradictions Observed",
            value: debrief.contradictionsObserved || "None",
          },
          {
            label: "Assumptions Shaken",
            value: debrief.shakenAssumptions || "None",
          },
          { label: "Potential Biases", value: debrief.potentialBiases || "None" },
          {
            label: "Missing Perspectives",
            value: debrief.missingPerspectives || "None",
          },
          {
            label: "Emerging Hypotheses",
            value: debrief.emergingHypotheses || "None",
          },
        ];
        linkedIds = [
          ...(debrief.linkedSourceIds || []),
          ...(debrief.linkedEvidenceIds || []),
        ];
        linkedLabel = "Linked Sources & Evidence Considered";
        whyThisMatters =
          "Daily debriefs capture team sensemaking, emerging hypotheses, and contradictions while fresh from the field. They guide subsequent investigation without being treated as formal findings.";
        safeguardNote =
          "Debrief notes are internal methodological records and working theories. They are NOT approved findings.";
      }
    }

    if (id.startsWith("RQ-")) {
      const question = currentStudy?.questions?.find((q) => q.id === id);
      if (question) {
        itemType = "Study Question";
        title = question.question;
        textContent = question.shortLabel ? `Analytical Theme: ${question.shortLabel}` : "";
        metadata = [
          { label: "Question ID", value: question.id },
          { label: "Criterion", value: question.criterion || "General Evaluation Criterion" },
          { label: "Inquiry Status", value: question.isActive ? "Active Inquiry" : "Inactive" },
        ];
        const assignedEvidence = currentStudy?.evidence.filter((e) => e.studyQuestionIds?.includes(question.id)) || [];
        const assignedFindings = currentStudy?.findings.filter((f) => f.studyQuestionId === question.id) || [];
        linkedIds = [
          ...assignedEvidence.map((e) => e.id),
          ...assignedFindings.map((f) => f.id),
        ];
        linkedLabel = "Linked Validated Evidence & Findings";
        whyThisMatters =
          "Study questions establish the analytical spine of the evaluation, organizing raw field observations into disciplined comparative sensemaking.";
        safeguardNote =
          "Study questions guide lines of inquiry. They do not predetermine conclusions or findings.";
      }
    }

    if (id.startsWith("PAT-")) {
      const pattern = currentStudy?.patternNotes?.find((p) => p.id === id);
      if (pattern) {
        itemType = "Working Pattern";
        title = pattern.statement;
        textContent = pattern.contradictionNote ? `Contradiction / Exception: ${pattern.contradictionNote}` : "";
        metadata = [
          { label: "Pattern ID", value: pattern.id },
          { label: "Study Question", value: pattern.questionId || "Study-wide" },
          { label: "Theme", value: pattern.theme || "Uncategorized" },
          { label: "Linked Evidence Count", value: `${pattern.evidenceIds.length} entries` },
        ];
        linkedIds = pattern.evidenceIds || [];
        linkedLabel = "Underlying Evidence Base";
        whyThisMatters =
          "Working patterns allow evaluators to document recurring multi-source phenomena without prematurely committing to a formal finding.";
        safeguardNote =
          "Working patterns are intermediate sensemaking instruments and do NOT count as formal findings.";
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
                Defensible claim lineage
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

            {!id.startsWith("DBR-") && !id.startsWith("RQ-") && !id.startsWith("PAT-") && (
              <div className="rounded-lg border border-[var(--trace-border)] bg-[var(--trace-wash)] p-4">
                <span className="text-[11px] font-semibold text-[var(--trace)] block mb-2">
                  Source-to-brief path
                </span>
                <TraceChain id={id} demoCase={activeDemoCase} onSelect={setDrawerItemId} />
              </div>
            )}

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
      <a className="fls-skip-link" href="#workspace-panel">Skip to workspace</a>
      <div className="fls-sticky-frame">
        <CaseSelector
          selectedId={selectedCaseId}
          onSelect={handleSelectCase}
          editableStudies={allStudies.filter((s) => !s.isDemoCase)}
          currentStudy={currentStudy}
          onCreateNewStudy={() => setIsNewStudyModalOpen(true)}
          onOpenBackupRestore={() => setIsBackupRestoreModalOpen(true)}
        />

        <div className="fls-frame">
          <WorkspaceTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            evidenceCount={currentStudy?.evidence.length ?? activeDemoCase.evidence.length}
            findingsCount={currentStudy?.findings.length ?? activeDemoCase.findings.length}
            recommendationsCount={currentStudy?.recommendations.length ?? activeDemoCase.recommendations.length}
          />
        </div>
      </div>

      <div className="fls-frame">
        <div className="fls-workspace" id="workspace-panel" role="tabpanel" aria-labelledby={`workspace-tab-${activeTab}`} tabIndex={-1}>
          {activeTab === "overview" ? (
            <OverviewTab 
              currentStudy={currentStudy}
              onOpenBackupRestore={() => setIsBackupRestoreModalOpen(true)}
              demoCase={activeDemoCase} 
              onTabChange={handleTabChange}
              sandboxText={sandboxText}
              setSandboxText={updateSandboxText}
              sandboxStakeholder={sandboxStakeholder}
              setSandboxStakeholder={setSandboxStakeholder}
              sandboxDataType={sandboxDataType}
              setSandboxDataType={setSandboxDataType}
              sandboxTheme={sandboxTheme}
              setSandboxTheme={setSandboxTheme}
              sandboxSensitivity={sandboxSensitivity}
              setSandboxSensitivity={setSandboxSensitivity}
              sandboxSiteLabel={sandboxSiteLabel}
              setSandboxSiteLabel={setSandboxSiteLabel}
              scannerTriggered={scannerTriggered}
              anonymizationConfirmed={anonymizationConfirmed}
              setAnonymizationConfirmed={setAnonymizationConfirmed}
              onParse={handleParseSandbox}
              onReset={handleResetSandbox}
              hasSandboxItems={sandboxEvidence.length > 0}
              demoProgress={demoProgress}
              traceHandlers={traceHandlers}
            />
          ) : null}
          {activeTab === "intake" ? (
            currentStudy ? (
              <FieldIntakeView
                study={currentStudy}
                onStudyChange={handleSelectCase}
                onRefreshStudy={handleRefreshCurrentStudy}
                onOpenDocxModal={() => setIsDocxModalOpen(true)}
              />
            ) : (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-xs text-[var(--muted)]">
                Loading study repository...
              </div>
            )
          ) : null}
          {activeTab === "evidence" ? (
            <EvidenceTab
              evidence={filteredEvidence}
              rawEvidenceList={activeDemoCase.evidence}
              evidenceStrengths={evidenceStrengths}
              filters={filters}
              findings={activeDemoCase.findings}
              onFiltersChange={setFilters}
              sensitivityFlags={sensitivityFlags}
              sources={activeDemoCase.sources}
              stakeholderTypes={stakeholderTypes}
              themes={themes}
              traceHandlers={traceHandlers}
              currentStudy={currentStudy}
              onRefreshStudy={handleRefreshCurrentStudy}
              onOpenDocxModal={() => setIsDocxModalOpen(true)}
              docxReceipt={docxReceipt}
              onDismissReceipt={() => setDocxReceipt(null)}
            />
          ) : null}
          {activeTab === "debrief" ? (
            currentStudy ? (
              <DailyDebriefView
                study={currentStudy}
                onRefreshStudy={handleRefreshCurrentStudy}
                onStudyChange={handleSelectCase}
                traceHandlers={traceHandlers}
              />
            ) : (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-xs text-[var(--muted)]">
                Loading study repository...
              </div>
            )
          ) : null}
          {activeTab === "synthesis" ? (
            currentStudy ? (
              <SynthesisWorkbench
                study={currentStudy}
                onRefreshStudy={handleRefreshCurrentStudy}
                onInspectTrace={setDrawerItemId}
                onOpenTab={(tab) => handleTabChange(tab as WorkspaceTabId)}
              />
            ) : (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-xs text-[var(--muted)]">
                Loading study repository...
              </div>
            )
          ) : null}
          {activeTab === "findings" ? (
            <FindingsSection
              findings={activeDemoCase.findings}
              traceHandlers={traceHandlers}
              demoCase={activeDemoCase}
              currentStudy={currentStudy}
              onRefreshStudy={handleRefreshCurrentStudy}
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
              recommendations={activeDemoCase.recommendations}
              traceHandlers={traceHandlers}
              demoCase={activeDemoCase}
              currentStudy={currentStudy}
              onRefreshStudy={handleRefreshCurrentStudy}
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
              currentStudy={currentStudy}
              demoCase={activeDemoCase}
            />
          ) : null}
          {activeTab === "brief" ? (
            <LearningBriefSection
              copyStatus={copyStatus}
              demoCase={activeDemoCase}
              markdown={currentBriefMarkdown}
              onCopy={copyLearningBrief}
              traceHandlers={traceHandlers}
              includeSandboxInBrief={includeSandboxInBrief}
              setIncludeSandboxInBrief={setIncludeSandboxInBrief}
              hasSandboxItems={sandboxEvidence.length > 0}
            />
          ) : null}
        </div>

        {renderDrawer()}
      </div>

      <MinimalStudyModal
        isOpen={isNewStudyModalOpen}
        onClose={() => setIsNewStudyModalOpen(false)}
        onStudyCreated={async (studyId) => {
          if (typeof window !== "undefined") {
            localStorage.setItem("fls_active_study_id", studyId);
          }
          await refreshStudiesList(studyId);
          setActiveTab("intake");
        }}
      />

      <BackupRestoreModal
        isOpen={isBackupRestoreModalOpen}
        onClose={() => setIsBackupRestoreModalOpen(false)}
        currentStudy={currentStudy}
        allStudies={allStudies}
        onStudyRestored={async (studyId) => {
          if (typeof window !== "undefined") {
            localStorage.setItem("fls_active_study_id", studyId);
          }
          await refreshStudiesList(studyId);
          setActiveTab("intake");
        }}
      />

      {currentStudy && (
        <DocxIntakeModal
          isOpen={isDocxModalOpen}
          study={currentStudy}
          onClose={() => setIsDocxModalOpen(false)}
          onImportComplete={handleDocxImportComplete}
        />
      )}
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
  editableStudies = [],
  currentStudy,
  onCreateNewStudy,
  onOpenBackupRestore,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  editableStudies?: StudyMeta[];
  currentStudy: FieldStudy | null;
  onCreateNewStudy?: () => void;
  onOpenBackupRestore?: () => void;
}) {
  const localStudies = currentStudy && !currentStudy.isDemoCase && !editableStudies.some((study) => study.id === currentStudy.id)
    ? [...editableStudies, currentStudy]
    : editableStudies;
  const selectedDemo = demoCases.find((item) => item.id === selectedId);
  return (
    <header className="fls-app-header" id="case-selector">
      <div className="fls-app-bar">
        <span className="fls-brand">Field Learning <strong>Studio</strong></span>
        <div className="fls-study-switcher">
          <label htmlFor="active-study">Active study</label>
          <select id="active-study" value={selectedId} onChange={(event) => onSelect(event.target.value)}>
            {localStudies.length > 0 && (
              <optgroup label="Local studies">
                {localStudies.map((study) => <option key={study.id} value={study.id}>{study.title}</option>)}
              </optgroup>
            )}
            <optgroup label="Read-only examples">
              {demoCases.map((item) => <option key={item.id} value={item.id}>{item.project}</option>)}
            </optgroup>
          </select>
        </div>
        <span className="fls-mode">{selectedDemo ? "Read-only demo" : "Local study"}</span>
        <div className="fls-app-utilities">
          <ThemeSwitcher />
          {onOpenBackupRestore && <button type="button" className="fls-button fls-button-quiet" onClick={onOpenBackupRestore}>Backup / Restore</button>}
          {onCreateNewStudy && <button type="button" className="fls-button fls-button-quiet" onClick={onCreateNewStudy}>+ New study</button>}
        </div>
      </div>
      {selectedDemo && (
        <div className="fls-demo-notice">
          <span>{caseProfile(selectedDemo).note}</span>
          <span>Switching studies clears temporary sandbox drafts.</span>
        </div>
      )}
    </header>
  );
}

function handleNavigationKeys(event: React.KeyboardEvent<HTMLDivElement>) {
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const index = buttons.indexOf(event.target as HTMLButtonElement);
  if (index < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
  const forward = event.key === (rtl ? "ArrowLeft" : "ArrowRight");
  const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (forward ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next]?.focus();
  buttons[next]?.click();
}

function WorkspaceTabs({
  activeTab,
  onTabChange,
  evidenceCount,
  findingsCount,
  recommendationsCount,
}: {
  activeTab: WorkspaceTabId;
  onTabChange: (tabId: WorkspaceTabId) => void;
  evidenceCount?: number;
  findingsCount?: number;
  recommendationsCount?: number;
}) {
  const activeSpaceId = getSpaceForTab(activeTab);
  const activeSpace = PRACTITIONER_SPACES.find((s) => s.id === activeSpaceId) || PRACTITIONER_SPACES[0];

  return (
    <nav aria-label="Field Learning Studio practitioner spaces" className="fls-space-nav">
      <div className="fls-primary-tabs" role="tablist" aria-label="Practitioner spaces" onKeyDown={handleNavigationKeys}>
        {PRACTITIONER_SPACES.map((space) => {
          const isActive = space.id === activeSpaceId;
          const count = space.id === "field-material" ? evidenceCount : space.id === "analysis" ? findingsCount : space.id === "deliverables" ? recommendationsCount : undefined;
          return (
            <button
              key={space.id}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              id={space.id === "study" ? "workspace-tab-overview" : `space-${space.id}`}
              aria-controls="workspace-panel"
              data-space-id={space.id}
              type="button"
              title={space.description}
              onClick={() => {
                if (!isActive) onTabChange(space.defaultTab);
              }}
              className="fls-space-tab"
            >
              <span>{space.label}</span>
              {count !== undefined && <span className="fls-nav-count" aria-hidden="true">{count}</span>}
            </button>
          );
        })}
      </div>
      {activeSpace.tabs.length > 1 && (
        <div className="fls-secondary-tabs" role="tablist" aria-label={`${activeSpace.label} views`} onKeyDown={handleNavigationKeys}>
          {activeSpace.tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              id={`workspace-tab-${tab.id}`}
              aria-controls="workspace-panel"
              data-tab-id={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="fls-view-tab"
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}

function OverviewTab({
  demoCase,
  currentStudy,
  onOpenBackupRestore,
  onTabChange,
  sandboxText,
  setSandboxText,
  sandboxStakeholder,
  setSandboxStakeholder,
  sandboxDataType,
  setSandboxDataType,
  sandboxTheme,
  setSandboxTheme,
  sandboxSensitivity,
  setSandboxSensitivity,
  sandboxSiteLabel,
  setSandboxSiteLabel,
  scannerTriggered,
  anonymizationConfirmed,
  setAnonymizationConfirmed,
  onParse,
  onReset,
  hasSandboxItems,
  demoProgress,
  traceHandlers,
}: {
  demoCase: DemoCase;
  currentStudy?: FieldStudy | null;
  onOpenBackupRestore?: () => void;
  onTabChange: (tabId: WorkspaceTabId) => void;
  sandboxText: string;
  setSandboxText: (text: string) => void;
  sandboxStakeholder: string;
  setSandboxStakeholder: (val: string) => void;
  sandboxDataType: string;
  setSandboxDataType: (val: string) => void;
  sandboxTheme: string;
  setSandboxTheme: (val: string) => void;
  sandboxSensitivity: "Low" | "Medium" | "High";
  setSandboxSensitivity: (val: "Low" | "Medium" | "High") => void;
  sandboxSiteLabel: string;
  setSandboxSiteLabel: (val: string) => void;
  scannerTriggered: boolean;
  anonymizationConfirmed: boolean;
  setAnonymizationConfirmed: (val: boolean) => void;
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
  traceHandlers: TraceHandlers;
}) {
  const latestSandboxEvidence = demoCase.evidence.find((entry) =>
    isSandboxRecordId(entry.id),
  );

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
      id: "debrief",
      label: "Daily debrief",
      description: "End-of-day sensemaking and priorities",
    },
    {
      id: "synthesis",
      label: "Synthesis workbench",
      description: "Cross-site and cross-stakeholder comparative evidence synthesis",
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
      description: "Professional draft output with trace annex",
    },
  ];

  const nextAction = computeNextAction(currentStudy ?? null, demoCase);
  const sources = currentStudy?.sources ?? demoCase.sources ?? [];
  const evidence = currentStudy?.evidence ?? demoCase.evidence ?? [];
  const findings = currentStudy?.findings ?? demoCase.findings ?? [];
  const recommendations = currentStudy?.recommendations ?? demoCase.recommendations ?? [];
  const limitations = currentStudy?.limitations ?? demoCase.limitations ?? [];
  const sites = currentStudy?.scope?.targetSites ?? [];
  const stakeholders = currentStudy?.scope?.targetStakeholderGroups ?? [];

  return (
    <div className="fls-study-overview">
      {/* 1. Study Identity Header */}
      <header className="fls-study-header">
        <div className="fls-study-meta-line">
          <span className="fls-tag-primary">Study 01</span>
          <span className="fls-study-status-badge">{currentStudy?.status ?? demoCase.status}</span>
          <span className="fls-bullet-divider">·</span>
          <span className="fls-study-period">{currentStudy?.isDemoCase ?? true ? "Curated Reference" : "Local Workspace"}</span>
        </div>
        <h1 className="fls-study-heading">{currentStudy?.title ?? demoCase.project}</h1>
        <p className="fls-study-subtitle">{currentStudy?.subtitle ?? demoCase.subtitle}</p>
      </header>

      {/* 2. Action Band (Mobbin pattern): Compact horizontal continuity strip */}
      <section className="fls-action-band" aria-label="Continue work">
        <div className="fls-action-content">
          <span className="fls-action-lead">Next Milestone:</span>
          <span className="fls-action-title">{nextAction.title}</span>
          <span className="fls-action-desc">— {nextAction.description}</span>
        </div>
        <button
          type="button"
          onClick={() => onTabChange(nextAction.targetTab)}
          className="fls-action-button"
        >
          <span>{nextAction.buttonText}</span>
        </button>
      </section>

      {/* 3. Refined Information Rail (shadcn pattern): Horizontal tabular metric strip */}
      <div className="fls-status-rail" aria-label="Study progress inventory">
        <div className="fls-rail-item">
          <span className="fls-rail-count">{sources.length}</span>
          <div className="fls-rail-meta">
            <span className="fls-rail-label">Sources</span>
            <span className="fls-rail-sub">Field records</span>
          </div>
        </div>
        <span className="fls-rail-sep">/</span>
        <div className="fls-rail-item">
          <span className="fls-rail-count">{evidence.length}</span>
          <div className="fls-rail-meta">
            <span className="fls-rail-label">Observations</span>
            <span className="fls-rail-sub text-emerald-400">
              {evidence.filter((item) => item.validationStatus === "Validated").length} approved
            </span>
          </div>
        </div>
        <span className="fls-rail-sep">/</span>
        <div className="fls-rail-item">
          <span className="fls-rail-count">{findings.length}</span>
          <div className="fls-rail-meta">
            <span className="fls-rail-label">Findings</span>
            <span className="fls-rail-sub text-emerald-400">
              {findings.filter((item) => item.validationStatus === "Validated").length} validated
            </span>
          </div>
        </div>
        <span className="fls-rail-sep">/</span>
        <div className="fls-rail-item">
          <span className="fls-rail-count">{recommendations.length}</span>
          <div className="fls-rail-meta">
            <span className="fls-rail-label">Recommendations</span>
            <span className="fls-rail-sub">Actionable draft</span>
          </div>
        </div>
      </div>

      {/* 4. Purpose, Scope, and Limitations (Layers.to / Godly asymmetrical editorial grid) */}
      <div className="fls-editorial-grid">
        <div className="fls-editorial-main">
          {/* Purpose */}
          <div className="fls-purpose-block">
            <h2>Evaluation Purpose &amp; Context</h2>
            <p className="fls-purpose-text">{currentStudy?.context || demoCase.context}</p>
          </div>

          {/* Scope metadata chips */}
          <div className="fls-scope-chips-block">
            <h3 className="fls-chips-label">Scope Parameters</h3>
            <div className="fls-chips-list">
              <div className="fls-chip">
                <span className="fls-chip-key">Target Sites:</span>
                <span className="fls-chip-val">{sites.join(", ") || "Target Project Sites"}</span>
              </div>
              <div className="fls-chip">
                <span className="fls-chip-key">Stakeholders:</span>
                <span className="fls-chip-val">{stakeholders.join(", ") || "Key Stakeholders"}</span>
              </div>
            </div>
          </div>

          {/* Core Analytical Questions */}
          {(currentStudy?.questions?.length ?? 0) > 0 && (
            <div className="fls-questions-block">
              <h3 className="fls-questions-heading">
                Analytical Study Questions ({currentStudy!.questions!.length})
              </h3>
              <ul className="fls-questions-flow">
                {currentStudy!.questions!.map((q) => (
                  <li key={q.id} className="fls-question-card">
                    <span className="fls-question-tag">{q.id}</span>
                    <span className="fls-question-body">{q.question}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right column: Methodological Boundaries & Limitations */}
        <aside className="fls-editorial-aside">
          <div className="fls-limitations-panel">
            <div className="fls-limitations-header">
              <svg className="fls-limitations-icon" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M8.22 1.754a.75.75 0 0 0-1.44 0L1.68 13.5A.75.75 0 0 0 2.36 14.5h11.28a.75.75 0 0 0 .68-1l-5.1-11.746ZM8 5.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 5.5Zm0 6.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <h3>Methodological Boundaries &amp; Limitations</h3>
            </div>
            {limitations.length > 0 ? (
              <ul className="fls-limitations-list">
                {limitations.map((lim, index) => (
                  <li key={index}>
                    <span>{lim}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fls-limitations-empty">No specific methodological limitations recorded.</p>
            )}
          </div>

          {onOpenBackupRestore && (
            <div className="fls-governance-panel">
              <h4>Study Governance</h4>
              <p>All data persists locally in browser IndexedDB. Regular JSON recovery archives preserve analytical state.</p>
              <button type="button" className="fls-text-button" onClick={onOpenBackupRestore}>
                Manage Backup &amp; Recovery Archives →
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* 5. Structured Learning Workflow Band */}
      <section className="fls-pipeline-band" aria-label="Evidence-to-learning pipeline">
        <div className="fls-pipeline-header">
          <span className="fls-eyebrow">PRACTITIONER SPACES</span>
          <span className="text-xs text-[var(--muted-soft)]">Sequential sensemaking workflow</span>
        </div>
        <div className="fls-pipeline-steps">
          <button type="button" onClick={() => onTabChange("overview")} className="fls-pipeline-node fls-node-active">
            <span className="fls-node-num">01</span>
            <div className="fls-node-info">
              <strong>Study Setup</strong>
              <span>Scope &amp; governance</span>
            </div>
          </button>
          <span className="fls-node-arrow">→</span>
          <button type="button" onClick={() => onTabChange("evidence")} className="fls-pipeline-node">
            <span className="fls-node-num">02</span>
            <div className="fls-node-info">
              <strong>Field Material</strong>
              <span>Intake &amp; observations</span>
            </div>
          </button>
          <span className="fls-node-arrow">→</span>
          <button type="button" onClick={() => onTabChange("synthesis")} className="fls-pipeline-node">
            <span className="fls-node-num">03</span>
            <div className="fls-node-info">
              <strong>Analysis</strong>
              <span>Comparative synthesis</span>
            </div>
          </button>
          <span className="fls-node-arrow">→</span>
          <button type="button" onClick={() => onTabChange("brief")} className="fls-pipeline-node">
            <span className="fls-node-num">04</span>
            <div className="fls-node-info">
              <strong>Deliverables</strong>
              <span>Learning Brief draft</span>
            </div>
          </button>
        </div>
      </section>

      {/* 6. Expandable Demo Tools & Sandbox Note Intake */}
      <details className="fls-demo-drawer">
        <summary>
          <span className="fls-drawer-title">Demo Tools &amp; Local Sandbox Note Intake</span>
          <span className="fls-drawer-sub">Walkthrough, sample field notes and signature traceability</span>
        </summary>
        <div className="space-y-5 pt-4 px-4 pb-4">
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
                "Final review checks flag overclaiming, sensitivity, and draft readiness before export.",
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
                    Check overclaiming, sensitivity, traceability, and draft safeguards.
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
          <section id="sandbox-note-section" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 scroll-mt-20">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4 mb-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--foreground)]">
                  Try your own field note
                </h3>
                <p className="mt-1 text-xs text-[var(--muted)] leading-5">
                  Paste a short anonymized note to see how Field Learning Studio structures evidence locally.
                </p>
              </div>
              {hasSandboxItems && (
                <button
                  className="px-3 py-1 bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] rounded-md text-xs font-semibold hover:bg-[var(--surface-elevated)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--trace)]"
                  onClick={onReset}
                >
                  Clear sandbox
                </button>
              )}
            </div>

            {/* Safety Warning Copy (Always Visible) */}
            <div className="mb-4 rounded border border-amber-900/30 bg-amber-500/5 p-3 text-[11px] leading-5 text-amber-600/90">
              <span className="font-bold">Local sandbox only:</span> This text is not uploaded, saved, or analyzed by an external AI service. Do not enter real names, exact locations, child-identifying details, or sensitive case information.
            </div>

            <div className="flex flex-col gap-4">
              {/* Field Note Textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]" htmlFor="sandbox-note-textarea">
                  Field Note text
                </label>
                <textarea
                  id="sandbox-note-textarea"
                  className="w-full min-h-[100px] p-3 border border-[var(--border)] bg-[var(--surface-muted)] rounded-lg text-sm text-[var(--foreground)] outline-none focus:border-[var(--trace)] focus:ring-1 focus:ring-[var(--trace)] placeholder-[var(--muted-soft)] font-sans"
                  placeholder="Example: During a school visit, staff described low attendance during meal distribution because children preferred packaged food and clean water was not always available."
                  value={sandboxText}
                  onChange={(e) => setSandboxText(e.target.value)}
                />
              </div>

              {/* Dynamic Sensitive Warning Check Panel */}
              {scannerTriggered && (
                <div className="rounded border border-amber-600/50 bg-amber-500/10 p-3.5 flex flex-col gap-2.5">
                  <p className="text-xs text-amber-600 font-semibold leading-5">
                    This note may contain sensitive or identifying details. Please anonymize before continuing, or confirm it is safe for demo processing.
                  </p>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)] bg-[var(--surface)]"
                      checked={anonymizationConfirmed}
                      onChange={(e) => setAnonymizationConfirmed(e.target.checked)}
                    />
                    I confirm this note is anonymized and safe for demo processing.
                  </label>
                </div>
              )}

              {/* Metadata Inputs Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Stakeholder Group Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Stakeholder group
                  </label>
                  <select
                    className="p-2 border border-[var(--border)] bg-[var(--surface-muted)] rounded text-xs text-[var(--foreground)] outline-none focus:border-[var(--trace)] focus:ring-1 focus:ring-[var(--trace)] cursor-pointer"
                    value={sandboxStakeholder}
                    onChange={(e) => setSandboxStakeholder(e.target.value)}
                  >
                    <option value="Children / youth">Children / youth</option>
                    <option value="Women / caregivers">Women / caregivers</option>
                    <option value="School staff">School staff</option>
                    <option value="Community leaders">Community leaders</option>
                    <option value="Partner staff">Partner staff</option>
                    <option value="Programme team">Programme team</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Data Type Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Data type
                  </label>
                  <select
                    className="p-2 border border-[var(--border)] bg-[var(--surface-muted)] rounded text-xs text-[var(--foreground)] outline-none focus:border-[var(--trace)] focus:ring-1 focus:ring-[var(--trace)] cursor-pointer"
                    value={sandboxDataType}
                    onChange={(e) => setSandboxDataType(e.target.value)}
                  >
                    <option value="Interview">Interview</option>
                    <option value="Focus group">Focus group</option>
                    <option value="Observation">Observation</option>
                    <option value="Monitoring note">Monitoring note</option>
                    <option value="Meeting note">Meeting note</option>
                    <option value="Feedback channel">Feedback channel</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Theme Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Theme
                  </label>
                  <select
                    className="p-2 border border-[var(--border)] bg-[var(--surface-muted)] rounded text-xs text-[var(--foreground)] outline-none focus:border-[var(--trace)] focus:ring-1 focus:ring-[var(--trace)] cursor-pointer"
                    value={sandboxTheme}
                    onChange={(e) => setSandboxTheme(e.target.value)}
                  >
                    <option value="Access">Access</option>
                    <option value="Safety">Safety</option>
                    <option value="Participation">Participation</option>
                    <option value="Nutrition">Nutrition</option>
                    <option value="Coordination">Coordination</option>
                    <option value="Training">Training</option>
                    <option value="Inclusion">Inclusion</option>
                    <option value="Accountability">Accountability</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Sensitivity Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Sensitivity
                  </label>
                  <select
                    className="p-2 border border-[var(--border)] bg-[var(--surface-muted)] rounded text-xs text-[var(--foreground)] outline-none focus:border-[var(--trace)] focus:ring-1 focus:ring-[var(--trace)] cursor-pointer"
                    value={sandboxSensitivity}
                    onChange={(e) => setSandboxSensitivity(e.target.value as "Low" | "Medium" | "High")}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                {/* Optional Site Label */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Optional anonymized site label
                  </label>
                  <input
                    type="text"
                    className="p-2 border border-[var(--border)] bg-[var(--surface-muted)] rounded text-xs text-[var(--foreground)] outline-none focus:border-[var(--trace)] focus:ring-1 focus:ring-[var(--trace)]"
                    placeholder="Example: School A, Community Site 2, Partner Workshop"
                    value={sandboxSiteLabel}
                    onChange={(e) => setSandboxSiteLabel(e.target.value)}
                  />
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
                {/* Sample note templates */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] font-bold text-[var(--muted)]">Sample Notes:</span>
                  {demoCase.id === "school-nutrition" ? (
                    <>
                      <button 
                        className="px-2.5 py-1 bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] text-[11px] rounded hover:bg-[var(--surface-elevated)] cursor-pointer transition font-semibold"
                        onClick={() => {
                          setSandboxText("Children are skipping the dry meal snack because there is no clean drinking water available during lunch, and some report stomach aches from unpackaged cheese stored in open bins.");
                          setSandboxStakeholder("Children / youth");
                          setSandboxDataType("Observation");
                          setSandboxTheme("Nutrition");
                          setSandboxSensitivity("High");
                          setSandboxSiteLabel("School A Canteen");
                        }}
                      >
                        Water & Spoilage
                      </button>
                      <button 
                        className="px-2.5 py-1 bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] text-[11px] rounded hover:bg-[var(--surface-elevated)] cursor-pointer transition font-semibold"
                        onClick={() => {
                          setSandboxText("Social workers report that fathers do not attend any school nutrition PTA sessions, claiming cooking is a female duty, but they control the household food budget.");
                          setSandboxStakeholder("Women / caregivers");
                          setSandboxDataType("Interview");
                          setSandboxTheme("Inclusion");
                          setSandboxSensitivity("Low");
                          setSandboxSiteLabel("PTA Meeting");
                        }}
                      >
                        Caregiver Roles
                      </button>
                      <button 
                        className="px-2.5 py-1 bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] text-[11px] rounded hover:bg-[var(--surface-elevated)] cursor-pointer transition font-semibold"
                        onClick={() => {
                          setSandboxText("Teachers state they are expected to deliver weekly health and nutrition lessons but have never received training materials or guidelines.");
                          setSandboxStakeholder("School staff");
                          setSandboxDataType("Interview");
                          setSandboxTheme("Training");
                          setSandboxSensitivity("Medium");
                          setSandboxSiteLabel("Staff Room");
                        }}
                      >
                        Teacher Capacity
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="px-2.5 py-1 bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] text-[11px] rounded hover:bg-[var(--surface-elevated)] cursor-pointer transition font-semibold"
                        onClick={() => {
                          setSandboxText("Women report feeling unsafe at evening peacebuilding committee meetings due to poor street lighting and lack of public transport.");
                          setSandboxStakeholder("Women / caregivers");
                          setSandboxDataType("Focus group");
                          setSandboxTheme("Safety");
                          setSandboxSensitivity("Medium");
                          setSandboxSiteLabel("Community Hall");
                        }}
                      >
                        Safe Access
                      </button>
                      <button 
                        className="px-2.5 py-1 bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] text-[11px] rounded hover:bg-[var(--surface-elevated)] cursor-pointer transition font-semibold"
                        onClick={() => {
                          setSandboxText("Youth committee attendance declines because meetings are unpredictable and do not link to practical local action budgets.");
                          setSandboxStakeholder("Children / youth");
                          setSandboxDataType("Monitoring note");
                          setSandboxTheme("Participation");
                          setSandboxSensitivity("Low");
                          setSandboxSiteLabel("Youth Center");
                        }}
                      >
                        Youth Engagement
                      </button>
                      <button 
                        className="px-2.5 py-1 bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--foreground)] text-[11px] rounded hover:bg-[var(--surface-elevated)] cursor-pointer transition font-semibold"
                        onClick={() => {
                          setSandboxText("Local partner staff spend more than 40% of their working hours compiling donor compliance reports, leaving little time for direct field engagement.");
                          setSandboxStakeholder("Partner staff");
                          setSandboxDataType("Meeting note");
                          setSandboxTheme("Coordination");
                          setSandboxSensitivity("Low");
                          setSandboxSiteLabel("Partner Office");
                        }}
                      >
                        Reporting Burden
                      </button>
                    </>
                  )}
                </div>

                {/* Submit button */}
                <button
                  className={`min-h-9 px-4 rounded text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[var(--trace)] ${
                    sandboxText.trim() && (!scannerTriggered || anonymizationConfirmed)
                      ? "bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-white cursor-pointer"
                      : "bg-[var(--surface-muted)] text-[var(--muted-soft)] cursor-not-allowed border border-[var(--border)]"
                  }`}
                  disabled={!sandboxText.trim() || (scannerTriggered && !anonymizationConfirmed)}
                  onClick={onParse}
                >
                  Generate draft evidence
                </button>
              </div>
            </div>
          </section>

          {/* 5. Active Traceability Chain Section */}
          {hasSandboxItems && latestSandboxEvidence && (
            <section className="rounded-lg border border-[var(--trace-border)] bg-[var(--trace-wash)] p-5">
              <h3 className="text-base font-semibold text-[var(--foreground)]">
                Latest sandbox trace
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Below is the visual linkage path inferred for your ingested sandbox note. Click any ID pill to inspect its parameters.
              </p>
              <div className="mt-4 bg-[var(--surface)] p-3 rounded-lg border border-[var(--trace-border)]">
                <TraceChain id={latestSandboxEvidence.id} demoCase={demoCase} onSelect={traceHandlers.onTraceSelect} />
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
              can test whether a drafted claim is grounded in evidence.
            </p>
            <div className="mt-4">
              <TraceChain
                id={demoCase.findings[0]?.id || "QA-001"}
                demoCase={demoCase}
                onSelect={traceHandlers.onTraceSelect}
              />
            </div>
          </section>
        </div>
      </div>
        </div>
      </details>
    </div>
  );
}

function EvidenceTab({
  evidence,
  rawEvidenceList,
  evidenceStrengths,
  filters,
  findings,
  onFiltersChange,
  sensitivityFlags,
  sources,
  stakeholderTypes,
  themes,
  traceHandlers,
  currentStudy,
  onRefreshStudy,
  onOpenDocxModal,
  docxReceipt,
  onDismissReceipt,
}: {
  evidence: EvidenceEntry[];
  rawEvidenceList: EvidenceEntry[];
  evidenceStrengths: string[];
  filters: EvidenceFilters;
  findings: Finding[];
  onFiltersChange: (filters: EvidenceFilters) => void;
  sensitivityFlags: string[];
  sources: SourceRecord[];
  stakeholderTypes: string[];
  themes: string[];
  traceHandlers: TraceHandlers;
  currentStudy: FieldStudy | null;
  onRefreshStudy: () => Promise<void> | void;
  onOpenDocxModal?: () => void;
  docxReceipt?: {
    sourcesCount: number;
    evidenceCount: number;
    needsReviewCount: number;
  } | null;
  onDismissReceipt?: () => void;
}) {
  return (
    <div className="grid gap-8">
      <EvidenceReviewWorkspace
        evidence={evidence}
        rawEvidenceList={rawEvidenceList}
        evidenceStrengths={evidenceStrengths}
        filters={filters}
        findings={findings}
        onFiltersChange={onFiltersChange}
        sensitivityFlags={sensitivityFlags}
        sources={sources}
        stakeholderTypes={stakeholderTypes}
        themes={themes}
        traceHandlers={traceHandlers}
        currentStudy={currentStudy}
        onRefreshStudy={onRefreshStudy}
        onOpenDocxModal={onOpenDocxModal}
        docxReceipt={docxReceipt}
        onDismissReceipt={onDismissReceipt}
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


function FindingsSection({
  findings,
  traceHandlers,
  demoCase,
  currentStudy,
  onRefreshStudy,
}: {
  findings: Finding[];
  traceHandlers: TraceHandlers;
  demoCase: DemoCase;
  currentStudy?: FieldStudy | null;
  onRefreshStudy?: () => Promise<void>;
}) {
  const normalFindings = findings.filter((f) => !f.id.includes("SBX"));
  const sandboxFindings = findings.filter((f) => f.id.includes("SBX"));
  const isEditable = Boolean(currentStudy && !currentStudy.isDemoCase);

  const handleFindingSubmitForReview = async (finding: Finding) => {
    if (!currentStudy || !onRefreshStudy) return;
    try {
      const updated = submitForReview(finding);
      await saveFinding({ ...updated, studyId: currentStudy.id });
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to submit finding for review.");
    }
  };

  const handleFindingValidate = async (finding: Finding) => {
    if (!currentStudy || !onRefreshStudy) return;
    const cachedReviewer = typeof window !== "undefined" ? localStorage.getItem("fls_reviewer_name") : null;
    const reviewerName = window.prompt(
      "Enter reviewer identity for finding validation:",
      cachedReviewer || "Lead Evaluator"
    );
    if (!reviewerName?.trim()) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("fls_reviewer_name", reviewerName.trim());
    }

    let limitationNote = finding.limitationNote;
    const profile = computeSupportProfile(
      finding,
      currentStudy.scope,
      currentStudy.evidence,
      currentStudy.sources
    );
    if (requiresFindingLimitationNote(finding, profile) && !limitationNote?.trim()) {
      const note = window.prompt(
        "Support tier is Emerging or coverage gaps exist. Document a concise limitation note:",
        "Conclusion is provisional pending further site data."
      );
      if (!note?.trim()) {
        alert("Validation cancelled: A limitation note is required for Emerging findings or coverage gaps.");
        return;
      }
      limitationNote = note.trim();
    }

    try {
      const updated = validateArtifact(finding, reviewerName.trim(), limitationNote, {
        evidence: currentStudy.evidence,
        sources: currentStudy.sources,
        findings: currentStudy.findings,
      });
      await saveFinding({ ...updated, studyId: currentStudy.id });
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to validate finding.");
    }
  };

  const handleFindingReject = async (finding: Finding) => {
    if (!currentStudy || !onRefreshStudy) return;
    const reason = window.prompt(
      "Enter rejection rationale:",
      "Insufficient distinct source record triangulation."
    );
    if (!reason?.trim()) return;

    try {
      const updated = rejectArtifact(finding, reason.trim());
      await saveFinding({ ...updated, studyId: currentStudy.id });
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reject finding.");
    }
  };

  const handleFindingReopen = async (finding: Finding) => {
    if (!currentStudy || !onRefreshStudy) return;
    try {
      const updated = reopenRejectedArtifact(finding);
      await saveFinding({ ...updated, studyId: currentStudy.id });
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reopen finding.");
    }
  };

  return (
    <Section
      description="Authored findings with supporting evidence, contradictions, implications, and claim lineage. Use Synthesis Workbench to author new findings."
      eyebrow="Findings Ledger"
      title="Study Findings Ledger"
    >
      {/* Contextual link to Synthesis Workbench to make the single finding-authoring journey obvious */}
      <div className="mb-6 rounded-xl border border-[var(--trace)]/30 bg-[var(--trace-wash)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--trace)]">
            Primary Analysis Pathway
          </span>
          <p className="mt-0.5 text-xs text-[var(--foreground)]">
            Findings are developed from validated evidence. To compare material across study questions, draft new findings, and inspect live coverage &amp; limitations, use the Synthesis Workbench.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const synthTab = document.querySelector("button[data-tab-id='synthesis']");
            if (synthTab instanceof HTMLElement) synthTab.click();
          }}
          className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)] transition cursor-pointer text-center"
        >
          Open Synthesis Workbench →
        </button>
      </div>
      {/* Sandbox Drafts Section */}
      {sandboxFindings.length > 0 && (
        <div className="mb-6 rounded-lg border border-cyan-800 bg-cyan-950/10 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-800/40 pb-3">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--trace)]">
                Sandbox Draft Findings (Local only)
              </h4>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Temporary drafts generated during this session.
              </p>
            </div>
            <div className="flex gap-1.5">
              <span className="inline-flex items-center rounded border border-cyan-800/30 bg-cyan-950/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--trace)]">
                Sandbox draft
              </span>
              <span className="inline-flex items-center rounded border border-amber-900/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-500">
                Not validated
              </span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {sandboxFindings.map((finding) => (
              <article
                className={`scroll-mt-32 rounded-lg border p-5 flex flex-col justify-between border-cyan-800/40 bg-[rgba(11,22,37,0.6)] ${
                  traceHandlers.highlightedId === finding.id ? "ring-2 ring-[var(--trace)]" : ""
                }`}
                id={traceDomId(finding.id)}
                key={finding.id}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <TraceButton
                      id={finding.id}
                      onSelect={traceHandlers.onTraceSelect}
                    />
                    <StrengthBadge value={finding.evidenceStrength} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold leading-7 text-[var(--foreground)]">
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
                  <div className="mt-4 rounded-lg border border-amber-950/30 bg-amber-950/10 p-3 text-sm leading-6 text-amber-400">
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
                </div>
                <div className="mt-5 pt-4 border-t border-[var(--border)]">
                  <span className="text-[11px] font-semibold text-[var(--muted)] block mb-2">
                    Claim lineage
                  </span>
                  <TraceChain id={finding.id} demoCase={demoCase} onSelect={traceHandlers.onTraceSelect} />
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Normal Findings Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {normalFindings.map((finding) => (
          <article
            className={traceCardClass(
              finding.id,
              traceHandlers.highlightedId,
              "p-5",
            )}
            id={traceDomId(finding.id)}
            key={finding.id}
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TraceButton
                    id={finding.id}
                    onSelect={traceHandlers.onTraceSelect}
                  />
                  {finding.validationStatus && (
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        finding.validationStatus === "Validated"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : finding.validationStatus === "Needs Review"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : finding.validationStatus === "Rejected"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                      }`}
                    >
                      {finding.validationStatus}
                    </span>
                  )}
                  {finding.revision && finding.revision > 1 && (
                    <span className="rounded bg-[var(--surface-muted)] border border-[var(--border)] px-1.5 py-0.2 text-[9px] text-[var(--muted)]">
                      Rev {finding.revision}
                    </span>
                  )}
                </div>
                <StrengthBadge value={finding.evidenceStrength} />
              </div>

              <h3 className="mt-4 text-lg font-semibold leading-7">
                {finding.statement}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {finding.explanation}
              </p>

              {finding.limitationNote && (
                <div className="mt-3 rounded-lg border border-amber-900/40 bg-amber-950/20 p-2.5 text-xs text-amber-300">
                  <span className="font-semibold">Evaluator Limitation Note: </span>
                  {finding.limitationNote}
                </div>
              )}

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
            </div>

            {/* Governance Action Bar for Editable Studies */}
            {isEditable && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3 text-xs">
                {(!finding.validationStatus || finding.validationStatus === "Draft") && (
                  <button
                    type="button"
                    onClick={() => handleFindingSubmitForReview(finding)}
                    className="rounded bg-amber-600/20 border border-amber-500/40 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-600/40"
                  >
                    Submit for Review
                  </button>
                )}

                {finding.validationStatus === "Needs Review" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleFindingValidate(finding)}
                      className="rounded bg-emerald-600/30 border border-emerald-500/40 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-600/50"
                    >
                      Validate Finding
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFindingReject(finding)}
                      className="rounded bg-rose-600/20 border border-rose-500/40 px-2.5 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-600/40"
                    >
                      Reject
                    </button>
                  </>
                )}

                {finding.validationStatus === "Validated" && (
                  <button
                    type="button"
                    onClick={async () => {
                      const newStatement = window.prompt(
                        "Edit Finding Statement (substantive changes require re-validation):",
                        finding.statement
                      );
                      if (newStatement === null || !newStatement.trim() || newStatement.trim() === finding.statement.trim()) {
                        return;
                      }
                      const { updated } = applySubstantiveFindingEdit(finding, {
                        statement: newStatement.trim(),
                      });
                      if (!currentStudy || !onRefreshStudy) return;
                      await saveFinding({ ...updated, studyId: currentStudy.id });
                      await onRefreshStudy();
                    }}
                    className="rounded bg-slate-600/20 border border-slate-500/40 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-600/40"
                  >
                    Edit Finding
                  </button>
                )}

                {finding.validationStatus === "Rejected" && (
                  <button
                    type="button"
                    onClick={() => handleFindingReopen(finding)}
                    className="rounded bg-slate-600/20 border border-slate-500/40 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-600/40"
                  >
                    Reopen to Draft
                  </button>
                )}
              </div>
            )}

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
      <div className="grid gap-5 xl:grid-cols-2">
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
  currentStudy,
  onRefreshStudy,
}: {
  recommendations: Recommendation[];
  traceHandlers: TraceHandlers;
  demoCase: DemoCase;
  currentStudy?: FieldStudy | null;
  onRefreshStudy?: () => Promise<void>;
}) {
  const normalRecommendations = recommendations.filter((r) => !r.id.includes("SBX"));
  const sandboxRecommendations = recommendations.filter((r) => r.id.includes("SBX"));
  const isEditable = Boolean(currentStudy && !currentStudy.isDemoCase);

  const handleRecSubmitForReview = async (rec: Recommendation) => {
    if (!currentStudy || !onRefreshStudy) return;
    try {
      const updated = submitForReview(rec);
      await saveRecommendation({ ...updated, studyId: currentStudy.id });
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to submit recommendation for review.");
    }
  };

  const handleRecValidate = async (rec: Recommendation) => {
    if (!currentStudy || !onRefreshStudy) return;
    const cachedReviewer = typeof window !== "undefined" ? localStorage.getItem("fls_reviewer_name") : null;
    const reviewerName = window.prompt(
      "Enter reviewer identity for recommendation validation:",
      cachedReviewer || "Lead Evaluator"
    );
    if (!reviewerName?.trim()) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("fls_reviewer_name", reviewerName.trim());
    }
    try {
      const updated = validateArtifact(rec, reviewerName.trim(), undefined, {
        findings: currentStudy.findings,
        evidence: currentStudy.evidence,
        sources: currentStudy.sources,
      });
      await saveRecommendation({ ...updated, studyId: currentStudy.id });
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to validate recommendation.");
    }
  };

  const handleRecReject = async (rec: Recommendation) => {
    if (!currentStudy || !onRefreshStudy) return;
    const reason = window.prompt(
      "Enter rejection rationale:",
      "Feasibility constraints or misaligned actor."
    );
    if (!reason?.trim()) return;
    try {
      const updated = rejectArtifact(rec, reason.trim());
      await saveRecommendation({ ...updated, studyId: currentStudy.id });
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reject recommendation.");
    }
  };

  const handleRecReopen = async (rec: Recommendation) => {
    if (!currentStudy || !onRefreshStudy) return;
    try {
      const updated = reopenRejectedArtifact(rec);
      await saveRecommendation({ ...updated, studyId: currentStudy.id });
      await onRefreshStudy();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reopen recommendation.");
    }
  };

  return (
    <Section
      description="Recommendations are grouped by priority and linked to findings and evidence."
      eyebrow="Recommendations"
      title="No recommendation without a finding"
    >
      <div className="space-y-5">
        {/* Sandbox Draft Recommendations Block */}
        {sandboxRecommendations.length > 0 && (
          <section className="rounded-lg border border-cyan-800 bg-cyan-950/10 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-800/40 pb-3">
              <div>
                <h3 className="text-base font-semibold text-[var(--trace)]">
                  Sandbox Draft Recommendations (Local only)
                </h3>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Temporary actions inferred from sandbox themes.
                </p>
              </div>
              <div className="flex gap-1.5">
                <span className="inline-flex items-center rounded border border-cyan-800/30 bg-cyan-950/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--trace)]">
                  Sandbox draft
                </span>
                <span className="inline-flex items-center rounded border border-amber-900/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-500">
                  Not validated
                </span>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {sandboxRecommendations.map((recommendation) => (
                <article
                  className={`scroll-mt-32 rounded-lg border p-5 flex flex-col justify-between border-cyan-800/40 bg-[rgba(11,22,37,0.6)] ${
                    traceHandlers.highlightedId === recommendation.id ? "ring-2 ring-[var(--trace)]" : ""
                  }`}
                  id={traceDomId(recommendation.id)}
                  key={recommendation.id}
                >
                  <div>
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
        )}

        {/* Normal recommendations grouped by priority */}
        {priorityOrder.map((priority) => {
          const items = normalRecommendations.filter(
            (recommendation) => recommendation.priority === priority,
          );

          if (items.length === 0) return null;

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
                {items.map((recommendation) => {
                  const linkedFinding = demoCase.findings.find(
                    (f) => f.id === recommendation.linkedFindingId
                  );
                  const depWarning = getRecommendationDependencyWarning(
                    recommendation,
                    linkedFinding
                  );

                  return (
                    <article
                      className={traceCardClass(
                        recommendation.id,
                        traceHandlers.highlightedId,
                        "p-5 min-w-0 flex flex-col justify-between",
                      )}
                      id={traceDomId(recommendation.id)}
                      key={recommendation.id}
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <TraceButton
                              id={recommendation.id}
                              onSelect={traceHandlers.onTraceSelect}
                            />
                            {recommendation.validationStatus && (
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  recommendation.validationStatus === "Validated"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                    : recommendation.validationStatus === "Needs Review"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                    : recommendation.validationStatus === "Rejected"
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                    : "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                                }`}
                              >
                                {recommendation.validationStatus}
                              </span>
                            )}
                          </div>
                          <LinkedTraceField
                            className=""
                            id={recommendation.linkedFindingId}
                            label="Finding"
                            onTraceSelect={traceHandlers.onTraceSelect}
                          />
                        </div>

                        {depWarning && (
                          <div className="mt-2.5 rounded-lg border border-amber-800/40 bg-amber-950/20 p-2 text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                            <span>⚠️</span>
                            <span>{depWarning} (temporarily excluded from formal export)</span>
                          </div>
                        )}

                        <h4 className="mt-3 text-base font-semibold leading-6 text-[var(--foreground)]">
                          {recommendation.recommendation}
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
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
                      </div>

                      <div>
                        {/* Governance Action Bar for Editable Studies */}
                        {isEditable && (
                          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3 text-xs">
                            {(!recommendation.validationStatus ||
                              recommendation.validationStatus === "Draft") && (
                              <button
                                type="button"
                                onClick={() => handleRecSubmitForReview(recommendation)}
                                className="rounded bg-amber-600/20 border border-amber-500/40 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-600/40"
                              >
                                Submit for Review
                              </button>
                            )}

                            {recommendation.validationStatus === "Needs Review" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleRecValidate(recommendation)}
                                  className="rounded bg-emerald-600/30 border border-emerald-500/40 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-600/50"
                                >
                                  Validate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRecReject(recommendation)}
                                  className="rounded bg-rose-600/20 border border-rose-500/40 px-2.5 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-600/40"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {recommendation.validationStatus === "Rejected" && (
                              <button
                                type="button"
                                onClick={() => handleRecReopen(recommendation)}
                                className="rounded bg-slate-600/20 border border-slate-500/40 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-600/40"
                              >
                                Reopen to Draft
                              </button>
                            )}
                          </div>
                        )}

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
                      </div>
                    </article>
                  );
                })}
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
  const parts = text.split(/(\b(?:SRC|EV|FND|LES|GP|REC|QA)-(?:\d+|SBX-\d+|TEMP-\d+)\b)/g);
  return parts.map((part, index) => {
    if (/^(?:SRC|EV|FND|LES|GP|REC|QA)-(?:\d+|SBX-\d+|TEMP-\d+)$/.test(part)) {
      return (
        <button
          key={index}
          onClick={() => onSelect(part)}
          className="mx-0.5 inline-flex items-center rounded border border-[var(--trace-border)] bg-[var(--trace-wash)] px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[var(--trace-text)] hover:border-[var(--trace)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--trace)]"
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
  currentStudy,
  demoCase,
}: {
  qaItems: QAReviewItem[];
  traceHandlers: TraceHandlers;
  isAuditing: boolean;
  auditRun: boolean;
  auditMessage: string;
  onRunAudit: () => void;
  currentStudy?: FieldStudy | null;
  demoCase: DemoCase;
}) {
  const activeFindings = currentStudy?.findings ?? demoCase.findings ?? [];
  const activeRecs = currentStudy?.recommendations ?? demoCase.recommendations ?? [];
  const activeEvidence = currentStudy?.evidence ?? demoCase.evidence ?? [];

  const eligibleFindings = activeFindings.filter((f) => f.validationStatus === "Validated");
  const linkedRecommendations = activeRecs.filter((r) =>
    activeFindings.some((f) => f.id === r.linkedFindingId && f.validationStatus === "Validated")
  );
  const needsReviewItems = [
    ...activeEvidence.filter((e) => e.validationStatus === "Needs Review" || e.validationStatus === "Draft"),
    ...activeFindings.filter((f) => f.validationStatus !== "Validated"),
    ...activeRecs.filter((r) => r.validationStatus !== "Validated"),
  ];
  const findingsWithLimitations = activeFindings.filter(
    (f) => Boolean(f.limitationNote && f.limitationNote.trim().length > 0)
  );
  const challengingEvidenceCount = activeFindings.reduce(
    (acc, f) => acc + (f.contradictoryEvidenceIds?.length || (f.contradictoryEvidence ? 1 : 0)),
    0
  );

  const stats = {
    pass: qaItems.filter((i) => i.status === "Pass").length,
    needsReview: qaItems.filter((i) => i.status === "Needs Review" || i.status === "Human Review Required").length,
    warning: qaItems.filter((i) => i.status === "Warning" || i.status === "Check Required" || i.status === "Evidence Missing").length,
    notAssessed: qaItems.filter((i) => i.status === "Not Assessed" || i.status === "Informational").length,
  };

  const sortedQaItems = [...qaItems].sort((a, b) => {
    const score: Record<string, number> = {
      "Warning": 4,
      "Check Required": 4,
      "Evidence Missing": 4,
      "Needs Review": 3,
      "Human Review Required": 3,
      "Not Assessed": 2,
      "Informational": 1,
      "Pass": 0,
    };
    return (score[b.status] || 0) - (score[a.status] || 0);
  });
  const qaGroups: Array<{ status: QAReviewStatus; label: string; items: QAReviewItem[] }> = [
    {
      status: "Warning",
      label: "Warnings & Checks Required",
      items: sortedQaItems.filter((item) => ["Warning", "Check Required", "Evidence Missing"].includes(item.status)),
    },
    {
      status: "Needs Review",
      label: "Actionable Review Required",
      items: sortedQaItems.filter((item) => ["Needs Review", "Human Review Required"].includes(item.status)),
    },
    {
      status: "Not Assessed",
      label: "Contextual / Informational",
      items: sortedQaItems.filter((item) => ["Not Assessed", "Informational"].includes(item.status)),
    },
    {
      status: "Pass",
      label: "Passed Verified Checks",
      items: sortedQaItems.filter((item) => item.status === "Pass"),
    },
  ];

  return (
    <Section
      description="Actionable verification checks required before circulating or exporting the professional draft."
      eyebrow="Deliverables Check"
      title="Final Review before Professional Draft"
    >
      {/* Actionable Pre-Draft Verification Checks */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--trace)]">
              Pre-Draft Actionable Checks
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Key checks required before final draft circulation.
            </p>
          </div>
          <span className="rounded bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
            Actionable Verification
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
            <span className="text-[10px] font-bold uppercase text-[var(--muted)]">1. Eligible Findings</span>
            <p className="mt-1 font-semibold text-[var(--foreground)]">
              {eligibleFindings.length} of {activeFindings.length} findings validated
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">Only validated, non-stale findings appear in draft.</p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
            <span className="text-[10px] font-bold uppercase text-[var(--muted)]">2. Linked Recommendations</span>
            <p className="mt-1 font-semibold text-[var(--foreground)]">
              {linkedRecommendations.length} of {activeRecs.length} recommendations anchored
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">Each action is tied to an approved finding.</p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
            <span className="text-[10px] font-bold uppercase text-[var(--muted)]">3. Unresolved Items</span>
            <p className={`mt-1 font-semibold ${needsReviewItems.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {needsReviewItems.length} items awaiting review
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">Draft or in-review observations/claims.</p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
            <span className="text-[10px] font-bold uppercase text-[var(--muted)]">4. Recorded Limitations</span>
            <p className="mt-1 font-semibold text-[var(--foreground)]">
              {findingsWithLimitations.length} documented limitations
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">Contextual qualifications and boundaries noted.</p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
            <span className="text-[10px] font-bold uppercase text-[var(--muted)]">5. Challenging Material</span>
            <p className="mt-1 font-semibold text-[var(--foreground)]">
              {challengingEvidenceCount > 0 ? `${challengingEvidenceCount} items considered` : "None flagged"}
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">Contradictory and counter-perspectives reviewed.</p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
            <span className="text-[10px] font-bold uppercase text-[var(--muted)]">6. Traceability Verified</span>
            <p className="mt-1 font-semibold text-emerald-400">
              Complete source-to-brief lineage
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">Clickable audit IDs linked for all claims.</p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
            <span className="text-[10px] font-bold uppercase text-[var(--muted)]">7. Scope Confirmed</span>
            <p className="mt-1 font-semibold text-emerald-400">
              Inquiry boundaries active
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">
              {currentStudy?.scope ? `${currentStudy.scope.targetSites.length} sites · ${(currentStudy.questions || []).length} questions` : "Standard evaluation scope active"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h3 className="text-base font-semibold text-[var(--foreground)]">
              Review checks help prevent overclaiming and protect sensitive field evidence.
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              This deterministic review checks whether claims are linked,
              limitations are visible, sensitive evidence is flagged, and the
              brief remains suitable for draft professional review.
            </p>
          </div>
          <span className="rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
            Deterministic verification gate
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
          <h3 className="text-base font-semibold text-[var(--foreground)]">Final review not yet triggered</h3>
          <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
            Run the check to reveal grouped warnings, needs-review items,
            and passed safeguards for the selected case.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              className="min-h-11 px-5 bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-white font-semibold text-sm rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--trace)] transition"
              onClick={onRunAudit}
            >
              Run final review
            </button>
            <span className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider">
              Deterministic verification gate — not an external certification
            </span>
          </div>
        </div>
      ) : null}

      {isAuditing ? (
        <div className="rounded-lg border border-[var(--trace-border)] bg-[var(--trace-wash)] p-12 text-center max-w-xl mx-auto animate-pulse">
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
  includeSandboxInBrief,
  setIncludeSandboxInBrief,
  hasSandboxItems,
}: {
  demoCase: DemoCase;
  markdown: string;
  copyStatus: "idle" | "copied" | "error";
  onCopy: () => void;
  traceHandlers: TraceHandlers;
  includeSandboxInBrief: boolean;
  setIncludeSandboxInBrief: (val: boolean) => void;
  hasSandboxItems: boolean;
}) {
  const [exportStatus, setExportStatus] = React.useState<"idle" | "docx-loading" | "pdf-loading" | "md-loading" | "error">("idle");

  const handleDownloadDocx = async () => {
    try {
      setExportStatus("docx-loading");
      const model = buildBriefExportModel(demoCase, includeSandboxInBrief);
      downloadBriefDocx(model);
      setExportStatus("idle");
    } catch (err) {
      console.error("Docx export error:", err);
      setExportStatus("error");
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setExportStatus("pdf-loading");
      const model = buildBriefExportModel(demoCase, includeSandboxInBrief);
      await downloadBriefPdf(model);
      setExportStatus("idle");
    } catch (err) {
      console.error("PDF export error:", err);
      setExportStatus("error");
    }
  };

  const handleDownloadMarkdown = async () => {
    try {
      setExportStatus("md-loading");
      const model = buildBriefExportModel(demoCase, includeSandboxInBrief);
      downloadBriefMarkdown(model);
      setExportStatus("idle");
    } catch (err) {
      console.error("Markdown export error:", err);
      setExportStatus("error");
    }
  };

  return (
    <Section
      description={
        demoCase.id === "school-nutrition"
          ? "Sanitized real-world-inspired demo data formatted as a draft for professional review."
          : "Fictional workspace demo data formatted as a draft for professional review."
      }
      eyebrow="Draft for Professional Review"
      title="Professional Draft Preview"
    >
      <div className="flex flex-col gap-4">
        <div className="fls-export-toolbar">
          <div className="flex flex-wrap items-center gap-2" role="status">
            {exportStatus === "pdf-loading" && <span className="text-xs text-[var(--warning-text)]">Preparing PDF…</span>}
            {exportStatus === "error" && <span className="text-xs text-[var(--danger-text)]">Export failed. Please try again.</span>}
          </div>
          {/* Toggle sandbox inclusion */}
          {hasSandboxItems && (
            <div className="w-full rounded border border-amber-900/30 bg-amber-500/5 p-3 flex flex-col gap-2">
              <label className="inline-flex items-center gap-3 text-xs font-semibold text-amber-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-[var(--border)] text-[var(--trace)] focus:ring-[var(--trace)] bg-[var(--surface)]"
                  checked={includeSandboxInBrief}
                  onChange={(e) => setIncludeSandboxInBrief(e.target.checked)}
                />
                Include sandbox draft evidence in brief export
              </label>
              <p className="text-[11px] text-amber-600/90 leading-relaxed pl-6">
                {includeSandboxInBrief
                  ? "Warning: Sandbox content will be included in Word, PDF, and Markdown exports as unvalidated draft evidence."
                  : "Sandbox drafts are currently excluded from exports. Check this box to append them as draft evidence."
                }
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="fls-button fls-button-primary"
              disabled={exportStatus !== "idle"}
              onClick={handleDownloadDocx}
              type="button"
            >
              {exportStatus === "docx-loading" ? "Generating Word..." : "Download Word draft (.docx)"}
            </button>

            <div className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-0.5 text-xs">
              <button
                className="rounded px-3 py-1 font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition disabled:opacity-50 cursor-pointer"
                disabled={exportStatus !== "idle"}
                onClick={handleDownloadPdf}
                type="button"
              >
                {exportStatus === "pdf-loading" ? "Preparing PDF..." : "PDF"}
              </button>

              <button
                className="rounded px-3 py-1 font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition disabled:opacity-50 cursor-pointer"
                disabled={exportStatus !== "idle"}
                onClick={handleDownloadMarkdown}
                type="button"
              >
                {exportStatus === "md-loading" ? "Generating..." : "Markdown"}
              </button>

              <button
                className="rounded px-3 py-1 font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition cursor-pointer"
                onClick={onCopy}
                type="button"
              >
                {copyStatus === "copied" ? "✓ Copied" : "Copy MD"}
              </button>
            </div>
          </div>
          <p className="fls-export-note">Internal workspace draft · Review and clearance required before external distribution. Exports are generated locally.</p>
        </div>

        <StyledBriefPreview
          demoCase={demoCase}
          traceHandlers={traceHandlers}
          includeSandbox={includeSandboxInBrief}
        />

        <details className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]">
          <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-[var(--foreground)] select-none">
            View Markdown source
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
  includeSandbox,
}: {
  demoCase: DemoCase;
  traceHandlers: TraceHandlers;
  includeSandbox: boolean;
}) {
  const model = useMemo(
    () => buildBriefExportModel(demoCase, includeSandbox),
    [demoCase, includeSandbox]
  );
  const mainFindings = model.findings;
  const mainLessons = model.lessons;
  const mainGoodPractices = model.goodPractices;
  const mainRecommendations = model.recommendations;
  const sandboxEvidence = model.sandboxEvidence || [];

  return (
    <div className="fls-draft-canvas">
      <article className="brief-document mx-auto max-w-[820px] border border-[var(--document-border)] rounded-md overflow-hidden p-8 sm:p-12">
        <header className="border-b border-[var(--border)] pb-6 mb-8">
          <span className="text-[11px] font-semibold text-[var(--accent)] block mb-2 uppercase tracking-wide">
            Programme Learning Brief &bull; Draft for Professional Review
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
            <BriefMetric label="Sources" value={demoCase.evidenceBase?.sourceRecords ?? demoCase.sources.length} />
            <BriefMetric label="Evidence entries" value={demoCase.evidenceBase?.evidenceEntries ?? demoCase.evidence.length} />
            <BriefMetric label="Findings" value={mainFindings.length} />
            <BriefMetric
              label="Recommendations"
              value={mainRecommendations.length}
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
            This brief is generated from {demoCase.sources.length} source records,
            {" "}{demoCase.evidence.length} evidence entries,
            {" "}{mainFindings.length} eligible findings, and
            {" "}{mainRecommendations.length} eligible recommendations in the selected case.
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
          {mainFindings.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center text-xs text-[var(--muted)]">
              No formally eligible findings. Only approved findings with verified, current supporting evidence appear in the formal Learning Brief deliverable.
            </div>
          ) : (
            <div className="space-y-4">
              {mainFindings.map((finding) => (
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
                    ids={finding.evidenceBase || []}
                    label="Evidence base"
                    onTraceSelect={traceHandlers.onTraceSelect}
                  />
                </div>
              ))}
            </div>
          )}
        </BriefSection>

        <BriefSection title="Lessons Learned">
          <div className="grid gap-3 md:grid-cols-2">
            {mainLessons.map((lesson) => (
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
            {mainGoodPractices.map((practice) => (
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
          {mainRecommendations.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center text-xs text-[var(--muted)]">
              No formally eligible recommendations. Only recommendations linked to eligible, approved findings appear in the formal Learning Brief deliverable.
            </div>
          ) : (
            <div className="space-y-3">
              {priorityOrder.map((priority) => {
                const recommendations = mainRecommendations.filter(
                  (recommendation) => recommendation.priority === priority,
                );
                if (recommendations.length === 0) return null;

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
          )}
        </BriefSection>

        {(demoCase.safeguardingNotes || demoCase.safetyNote) ? (
          <BriefSection title="Safeguarding and Sensitivity Note">
            <p>{demoCase.safeguardingNotes || demoCase.safetyNote}</p>
          </BriefSection>
        ) : null}

        {includeSandbox && sandboxEvidence.length > 0 && (
          <BriefSection title="Sandbox Draft Evidence — Requires Review">
            <div className="rounded border border-amber-900/30 bg-amber-500/5 p-4 mb-4 text-xs text-amber-600/90 leading-5">
              <span className="font-bold">Sandbox Warning:</span> Sandbox draft content is user-provided, local-only, and not validated.
            </div>
            <div className="space-y-4">
              {sandboxEvidence.map((e) => {
                const fnd = demoCase.findings.find((f) => f.supportingEvidenceIds.includes(e.id as EvidenceEntryId));
                const rec = fnd ? demoCase.recommendations.find((r) => r.linkedFindingId === fnd.id) : null;
                return (
                  <div key={e.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <TraceButton id={e.id} onSelect={traceHandlers.onTraceSelect} />
                      <span className="text-[10px] font-bold text-[var(--muted)]">Evidence ID: {e.id}</span>
                      <span className="text-[10px] font-bold text-[var(--muted)]">Source ID: {e.sourceId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">Observation Summary</span>
                      <p className="text-sm text-[var(--foreground)]">{e.rawEvidence}</p>
                    </div>
                    {fnd && (
                      <div>
                        <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">Draft Finding ({fnd.id})</span>
                        <p className="text-xs text-[var(--foreground)] font-medium">{fnd.statement}</p>
                      </div>
                    )}
                    {rec && (
                      <div>
                        <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">Draft Recommendation ({rec.id})</span>
                        <p className="text-xs text-[var(--foreground)] font-medium">{rec.recommendation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </BriefSection>
        )}

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
            {model.traceability.map((item) => {
              const finding = mainFindings.find((f) => f.id === item.findingId);
              return (
                <div
                  className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4"
                  key={item.findingId}
                >
                  <TraceButton
                    id={item.findingId}
                    onSelect={traceHandlers.onTraceSelect}
                  />
                  <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
                    {finding?.statement || item.findingId}
                  </p>
                  <TraceIdList
                    ids={item.evidenceIds}
                    label="Evidence"
                    onTraceSelect={traceHandlers.onTraceSelect}
                  />
                  <TraceIdList
                    ids={item.recommendationIds}
                    label="Recommendations"
                    onTraceSelect={traceHandlers.onTraceSelect}
                  />
                </div>
              );
            })}
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
    <section>
      <div className="fls-page-heading mb-5">
        <div>
          <p className="fls-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
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




function TraceButton({
  id,
  onSelect,
}: {
  id: string;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      className="inline-flex min-h-7 items-center rounded border border-[var(--trace-border)] bg-[var(--trace-wash)] px-2.5 py-1 font-mono text-[11px] font-semibold text-[var(--trace-text)] cursor-pointer transition hover:border-[var(--trace)] hover:bg-[rgba(34,211,238,0.14)] focus:outline-none focus:ring-2 focus:ring-[var(--trace)]"
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
      ? "border-[rgba(59,130,246,0.34)] bg-[rgba(37,99,235,0.12)] text-[var(--accent-strong)]"
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
  let className = "border-slate-500/30 bg-slate-800/40 text-slate-300";
  if (value === "Pass") {
    className = "border-emerald-500/40 bg-emerald-950/40 text-emerald-300";
  } else if (value === "Needs Review" || value === "Human Review Required") {
    className = "border-amber-500/40 bg-amber-950/40 text-amber-300";
  } else if (value === "Warning" || value === "Check Required" || value === "Evidence Missing") {
    className = "border-rose-500/40 bg-rose-950/40 text-rose-300";
  } else if (value === "Not Assessed" || value === "Informational") {
    className = "border-sky-500/40 bg-sky-950/40 text-sky-300";
  }

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
  const chainNodes: Array<{
    label: string;
    display: string;
    id?: string;
    interactive: boolean;
  }> = [];

  if (sourceId) {
    chainNodes.push({
      label: "Source",
      display: sourceId,
      id: sourceId,
      interactive: true,
    });
  }

  if (evidenceId) {
    chainNodes.push({
      label: "Evidence",
      display: evidenceId,
      id: evidenceId,
      interactive: true,
    });
  }

  if (findingId) {
    chainNodes.push({
      label: "Finding",
      display: findingId,
      id: findingId,
      interactive: true,
    });
  }

  if (recId) {
    chainNodes.push({
      label: "Recommendation",
      display: recId,
      id: recId,
      interactive: true,
    });
  }

  if (showQaAndBrief) {
    chainNodes.push({
      label: "QA review",
      display: "QA",
      id: qaId,
      interactive: true,
    });
    chainNodes.push({
      label: "Output",
      display: "Brief",
      interactive: false,
    });
  }

  if (chainNodes.length === 0) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--muted)]">
        No lineage path is available for this item.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-stretch gap-2 text-[10px] text-[var(--muted-soft)]">
      {chainNodes.map((node, index) => {
        const isActive = node.id === id;
        const nodeClass = `min-h-12 rounded-md border px-2.5 py-2 text-left transition ${
          isActive
            ? "border-[var(--trace)] bg-[var(--trace-wash)] text-[var(--trace-text)]"
            : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"
        }`;
        const content = (
          <>
            <span className="block text-[9px] font-semibold uppercase tracking-wide">
              {node.label}
            </span>
            <span className="mt-1 block font-mono text-[10px] font-bold">
              {node.display}
            </span>
          </>
        );

        return (
          <React.Fragment key={`${node.label}-${node.display}-${index}`}>
            {node.interactive && node.id ? (
              <button
                className={`${nodeClass} cursor-pointer hover:border-[var(--trace)] hover:bg-[rgba(34,211,238,0.14)] focus:outline-none focus:ring-2 focus:ring-[var(--trace)]`}
                onClick={() => onSelect(node.id as string)}
                type="button"
              >
                {content}
              </button>
            ) : (
              <span className={nodeClass}>{content}</span>
            )}
            {index < chainNodes.length - 1 ? (
              <span className="self-center text-[var(--muted-soft)]">&rarr;</span>
            ) : null}
          </React.Fragment>
        );
      })}
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
    <div
      className={`rounded border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 ${
        fullWidth ? "sm:col-span-2" : ""
      }`}
    >
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
  if (id.startsWith("DBR-")) {
    return "debrief";
  }

  if (id.startsWith("RQ-") || id.startsWith("PAT-")) {
    return "synthesis";
  }

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
      ? "border-[var(--trace)] bg-[var(--trace-wash)]"
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
    return "border-zinc-200 bg-zinc-50 text-zinc-700";
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
