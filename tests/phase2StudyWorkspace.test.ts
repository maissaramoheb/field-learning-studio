import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  clearAllStores,
  bootstrapDemoTemplates,
  listStudies,
  assembleStudy,
  cloneDemoStudy,
  saveStudyMeta,
  saveStudyScopeConfig,
  saveStudyQuestion,
  deleteStudyQuestion,
  reorderStudyQuestions,
  savePlannedMethod,
  deletePlannedMethod,
  saveFrameworkTheme,
  deleteFrameworkTheme,
  reorderFrameworkThemes,
  saveStudyRole,
  deleteStudyRole,
  saveSource,
  saveEvidence,
} from "@/lib/storage";
import { communityBridgesCase } from "@/data/cases/communityBridgesCase";
import { nutritionFieldCase } from "@/data/cases/nutritionFieldCase";
import {
  PRACTITIONER_SPACES,
  getSpaceForTab,
} from "@/components/FieldLearningStudioApp";
import { computeStudyReadiness } from "@/lib/analytics/studyReadiness";
import type {
  StudyMeta,
  FieldStudy,
  StudyQuestion,
  StudyScopeConfig,
  PlannedMethodTarget,
  FrameworkTheme,
  StudyRoleAssignment,
} from "@/lib/types";

function createMinimalMeta(id: string, title: string, overrides: Partial<StudyMeta> = {}): StudyMeta {
  return {
    id,
    title,
    subtitle: "Subtitle",
    context: "Context",
    status: "Active Fieldwork",
    isDemoCase: false,
    scope: {
      targetSites: [],
      isSingleSiteStudy: false,
      targetStakeholderGroups: [],
    },
    executiveSummary: "",
    keyMessages: [],
    limitations: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("Phase 2: Study Workspace Architecture & Methodology Blueprint", () => {
  beforeEach(async () => {
    await clearAllStores();
  });

  describe("1. Study Workspace Sub-Navigation & Identity", () => {
    it("defines the 4 required sub-tabs in the Study practitioner space", () => {
      const studySpace = PRACTITIONER_SPACES.find((s) => s.id === "study");
      expect(studySpace).toBeDefined();
      expect(studySpace?.stepNumber).toBe("1");
      expect(studySpace?.defaultTab).toBe("study-brief");

      const tabIds = studySpace?.tabs.map((t) => t.id);
      expect(tabIds).toEqual([
        "study-brief",
        "study-questions",
        "study-methods",
        "study-framework",
      ]);
    });

    it("maps all Phase 2 study sub-tabs and legacy 'overview' to the 'study' space", () => {
      expect(getSpaceForTab("study-brief")).toBe("study");
      expect(getSpaceForTab("study-questions")).toBe("study");
      expect(getSpaceForTab("study-methods")).toBe("study");
      expect(getSpaceForTab("study-framework")).toBe("study");
      expect(getSpaceForTab("overview")).toBe("study");
    });
  });

  describe("2. Safe Phase 2 Defaults on Legacy / Minimal Studies", () => {
    it("evaluates readiness gracefully on minimal studies without throwing", () => {
      const bareStudy = createMinimalMeta("bare-study-1", "Minimal Test Study");

      const readiness = computeStudyReadiness(bareStudy);
      expect(readiness).toBeDefined();
      expect(readiness.state).toBe("incomplete");
      expect(readiness.passedCount).toBeLessThan(readiness.totalCount);
      expect(readiness.checks.length).toBe(9);
    });

    it("survives absent scope, framework, or teamRoles fields non-destructively", async () => {
      const studyId = "legacy-study-1";
      await saveStudyMeta({
        id: studyId,
        title: "Legacy Stored Study",
        subtitle: "",
        context: "",
        status: "Active Fieldwork",
        isDemoCase: false,
        executiveSummary: "",
        keyMessages: [],
        limitations: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as unknown as StudyMeta);

      const assembled = await assembleStudy(studyId);
      expect(assembled).toBeDefined();
      expect(assembled?.title).toBe("Legacy Stored Study");
      expect(assembled?.framework).toBeUndefined();
      expect(assembled?.teamRoles).toBeUndefined();
      expect(assembled?.scope).toBeUndefined();
    });
  });

  describe("3. Study Brief Editing & Persistence", () => {
    it("persists comprehensive charter metadata via saveStudyMeta", async () => {
      const studyId = "charter-study";
      const initialMeta = createMinimalMeta(studyId, "Initial Title", {
        subtitle: "Initial Subtitle",
      });
      await saveStudyMeta(initialMeta);

      const updatedMeta: StudyMeta = {
        ...initialMeta,
        title: "Updated Inquiry into Rural Water Schemes",
        subtitle: "A mixed-methods assessment of tariff sustainability",
        purpose: "Determine factors causing premature system downtime.",
        background: "Over 40% of boreholes failed within 24 months of transfer.",
        intendedAudience: "Regional Water Board and District Commissioners",
        decisionUse: "Inform 2027 maintenance contract re-tendering",
        geography: "Eastern Uplands (Districts A, B, C)",
        timeframe: "Q2 2025 - Q4 2025",
        ownerLead: "Dr. Evelyn Reed",
        limitations: ["Monsoon rains delayed site visits in District C"],
      };

      await saveStudyMeta(updatedMeta);
      const reloaded = await assembleStudy(studyId);

      expect(reloaded?.title).toBe(updatedMeta.title);
      expect(reloaded?.subtitle).toBe(updatedMeta.subtitle);
      expect(reloaded?.purpose).toBe(updatedMeta.purpose);
      expect(reloaded?.background).toBe(updatedMeta.background);
      expect(reloaded?.intendedAudience).toBe(updatedMeta.intendedAudience);
      expect(reloaded?.decisionUse).toBe(updatedMeta.decisionUse);
      expect(reloaded?.geography).toBe(updatedMeta.geography);
      expect(reloaded?.timeframe).toBe(updatedMeta.timeframe);
      expect(reloaded?.ownerLead).toBe(updatedMeta.ownerLead);
      expect(reloaded?.limitations).toEqual(updatedMeta.limitations);
    });
  });

  describe("4. Canonical Study Questions Operations", () => {
    it("creates, updates, and deletes study questions with order, primary flags, and sub-questions", async () => {
      const studyId = "questions-study";
      await saveStudyMeta(createMinimalMeta(studyId, "Questions Test Study"));

      const q1: StudyQuestion = {
        id: "SQ-01",
        question: "To what extent did communities participate in maintenance?",
        shortLabel: "Participation",
        criterion: "Effectiveness",
        order: 1,
        isPrimary: true,
        subQuestions: [
          "Were committee meetings held monthly?",
          "Did women participate in tariff setting?",
        ],
      };

      const q2: StudyQuestion = {
        id: "SQ-02",
        question: "What financial controls exist for collected fees?",
        shortLabel: "Financial Oversight",
        criterion: "Efficiency",
        order: 2,
        isPrimary: false,
      };

      await saveStudyQuestion(studyId, q1);
      await saveStudyQuestion(studyId, q2);

      let assembled = await assembleStudy(studyId);
      expect(assembled?.questions?.length).toBe(2);
      expect(assembled?.questions?.[0].subQuestions?.length).toBe(2);
      expect(assembled?.questions?.[0].isPrimary).toBe(true);

      // Reorder questions
      await reorderStudyQuestions(studyId, ["SQ-02", "SQ-01"]);
      assembled = await assembleStudy(studyId);
      const sorted = (assembled?.questions || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      expect(sorted[0].id).toBe("SQ-02");
      expect(sorted[0].order).toBe(1);
      expect(sorted[1].id).toBe("SQ-01");
      expect(sorted[1].order).toBe(2);

      // Delete question
      await deleteStudyQuestion(studyId, "SQ-01");
      assembled = await assembleStudy(studyId);
      expect(assembled?.questions?.length).toBe(1);
      expect(assembled?.questions?.[0].id).toBe("SQ-02");
    });
  });

  describe("5. Inquiry Scope Boundaries", () => {
    it("saves and retrieves full scope configuration including inclusion/exclusion criteria", async () => {
      const studyId = "scope-study";
      await saveStudyMeta(createMinimalMeta(studyId, "Scope Test Study"));

      const scopeConfig: StudyScopeConfig = {
        scopeStatement: "Assessment focused on community-managed rural schemes.",
        inScope: [
          "Gravity-flow systems commissioned between 2021-2024",
          "Water User Associations with active bank accounts",
        ],
        outOfScope: [
          "Privately owned deep boreholes",
          "Municipal utility concession zones",
        ],
        assumptions: [
          "Local leaders grant access to tariff collection books",
        ],
        constraints: [
          "Field travel restricted during monsoon flash-flood alerts",
        ],
        targetSites: ["Site Alpha", "Site Beta", "Site Gamma"],
        targetStakeholderGroups: ["Water Users", "Pump Caretakers", "District Engineers"],
        isSingleSiteStudy: false,
      };

      await saveStudyScopeConfig(studyId, scopeConfig);
      const assembled = await assembleStudy(studyId);

      expect(assembled?.scope?.scopeStatement).toBe(scopeConfig.scopeStatement);
      expect(assembled?.scope?.inScope).toEqual(scopeConfig.inScope);
      expect(assembled?.scope?.outOfScope).toEqual(scopeConfig.outOfScope);
      expect(assembled?.scope?.assumptions).toEqual(scopeConfig.assumptions);
      expect(assembled?.scope?.constraints).toEqual(scopeConfig.constraints);
      expect(assembled?.scope?.targetSites).toEqual(scopeConfig.targetSites);
      expect(assembled?.scope?.targetStakeholderGroups).toEqual(scopeConfig.targetStakeholderGroups);
      expect(assembled?.scope?.isSingleSiteStudy).toBe(false);
    });
  });

  describe("6. Planned Methods & Live Sources Reconciliation", () => {
    it("saves and deletes planned method targets without storing derived actual counts", async () => {
      const studyId = "methods-study";
      await saveStudyMeta(createMinimalMeta(studyId, "Methods Test Study"));

      const targetFGD: PlannedMethodTarget = {
        method: "Focus Group",
        targetSourceCount: 6,
        targetEvidenceCount: 30,
        notes: "Minimum 2 FGDs per target village",
      };

      const targetKII: PlannedMethodTarget = {
        method: "Key Informant Interview",
        targetSourceCount: 10,
        targetEvidenceCount: 40,
        notes: "District technical officers and elders",
      };

      await savePlannedMethod(studyId, targetFGD);
      await savePlannedMethod(studyId, targetKII);

      let assembled = await assembleStudy(studyId);
      expect(assembled?.scope?.plannedMethods?.length).toBe(2);
      expect(assembled?.scope?.plannedMethods?.find((m) => m.method === "Focus Group")?.targetSourceCount).toBe(6);

      // Verify deleting a planned method
      await deletePlannedMethod(studyId, "Focus Group");
      assembled = await assembleStudy(studyId);
      expect(assembled?.scope?.plannedMethods?.length).toBe(1);
      expect(assembled?.scope?.plannedMethods?.[0].method).toBe("Key Informant Interview");
    });

    it("verifies live reconciliation between planned quotas and active field records", async () => {
      const studyId = "recon-study";
      await saveStudyMeta({
        id: studyId,
        title: "Reconciliation Test Study",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as StudyMeta);

      await savePlannedMethod(studyId, {
        method: "Key Informant Interview",
        targetSourceCount: 2,
        targetEvidenceCount: 4,
      });

      // Add actual sources matching the method
      await saveSource({
        id: "SRC-001",
        studyId,
        title: "Interview with District Water Engineer",
        sourceType: "Key Informant Interview",
        date: "2025-06-01",
        stakeholderType: "Technical Expert",
        location: "Site Alpha",
        siteId: "Site Alpha",
        summary: "Summary of district engineer interview",
        sensitivityFlag: "Low",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await saveSource({
        id: "SRC-002",
        studyId,
        title: "Interview with Sub-county Health Officer",
        sourceType: "Key Informant Interview",
        date: "2025-06-02",
        stakeholderType: "Government / Authority",
        location: "Site Alpha",
        siteId: "Site Alpha",
        summary: "Summary of health officer interview",
        sensitivityFlag: "Low",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Add evidence for source 1
      await saveEvidence({
        id: "EV-001",
        studyId,
        sourceId: "SRC-001",
        stakeholderType: "Technical Expert",
        rawEvidence: "Spare parts supply chain experienced 3-month lead times.",
        primaryTheme: "Logistics",
        secondaryTheme: "Supply Chain",
        evidenceStrength: "High",
        sensitivityFlag: "Low",
        potentialFinding: "Spare parts delays hinder maintenance",
        qaStatus: "Reviewed",
        validationStatus: "Validated",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const assembled = await assembleStudy(studyId);
      expect(assembled).toBeDefined();

      // Derive actuals live without reading from any persisted 'actual' field
      const kiiSources = assembled?.sources.filter((s) => s.sourceType === "Key Informant Interview") || [];
      const kiiSourceIds = new Set(kiiSources.map((s) => s.id));
      const kiiEvidence = assembled?.evidence.filter((e) => kiiSourceIds.has(e.sourceId)) || [];

      expect(kiiSources.length).toBe(2);
      expect(kiiEvidence.length).toBe(1);

      // Planned was 2 sources, 4 evidence -> 100% source target reached, 25% evidence reached
      const planned = assembled?.scope?.plannedMethods?.find((m) => m.method === "Key Informant Interview");
      expect(planned?.targetSourceCount).toBe(2);
      expect(kiiSources.length / (planned?.targetSourceCount || 1)).toBe(1.0);
    });
  });

  describe("7. Framework Themes & Team Roles", () => {
    it("creates, reorders, and deletes analytical framework themes", async () => {
      const studyId = "framework-study";
      await saveStudyMeta(createMinimalMeta(studyId, "Framework Test Study"));

      const theme1: FrameworkTheme = {
        id: "THM-01",
        name: "Community Governance & Ownership",
        shortLabel: "Governance",
        description: "Local leadership and decision accountability",
        guidingQuestion: "Who controls tariff revenue allocation?",
        order: 1,
        isActive: true,
      };

      const theme2: FrameworkTheme = {
        id: "THM-02",
        name: "Financial Transparency",
        shortLabel: "Finance",
        description: "Accounting rigor and fraud safeguards",
        guidingQuestion: "Are bank statements displayed publicly?",
        order: 2,
        isActive: true,
      };

      await saveFrameworkTheme(studyId, theme1);
      await saveFrameworkTheme(studyId, theme2);

      let assembled = await assembleStudy(studyId);
      expect(assembled?.framework?.themes.length).toBe(2);

      // Reorder themes
      await reorderFrameworkThemes(studyId, ["THM-02", "THM-01"]);
      assembled = await assembleStudy(studyId);
      const sorted = (assembled?.framework?.themes || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      expect(sorted[0].id).toBe("THM-02");
      expect(sorted[1].id).toBe("THM-01");

      // Delete theme
      await deleteFrameworkTheme(studyId, "THM-01");
      assembled = await assembleStudy(studyId);
      expect(assembled?.framework?.themes.length).toBe(1);
      expect(assembled?.framework?.themes[0].id).toBe("THM-02");
    });

    it("assigns, updates, and deletes team roles across all defined governance roles", async () => {
      const studyId = "roles-study";
      await saveStudyMeta(createMinimalMeta(studyId, "Roles Test Study"));

      const roleLead: StudyRoleAssignment = {
        id: "role-1",
        role: "lead",
        actor: { kind: "human", displayName: "Amina Al-Mansoor" },
        notes: "Lead evaluation charter and synthesis",
      };

      const roleAdvisor: StudyRoleAssignment = {
        id: "role-2",
        role: "reviewer",
        actor: { kind: "human", displayName: "David Ochieng" },
        notes: "Qualitative triangulation oversight",
      };

      await saveStudyRole(studyId, roleLead);
      await saveStudyRole(studyId, roleAdvisor);

      let assembled = await assembleStudy(studyId);
      expect(assembled?.teamRoles?.length).toBe(2);
      expect(assembled?.teamRoles?.find((r) => r.role === "lead")?.actor.displayName).toBe("Amina Al-Mansoor");

      // Delete role
      await deleteStudyRole(studyId, "role-2");
      assembled = await assembleStudy(studyId);
      expect(assembled?.teamRoles?.length).toBe(1);
      expect(assembled?.teamRoles?.[0].id).toBe("role-1");
    });
  });

  describe("8. Study Readiness Checklist Engine", () => {
    it("calculates readiness dynamically and scores 100% when all criteria pass", () => {
      const readyStudy: FieldStudy = {
        ...createMinimalMeta("ready-study", "Comprehensive Health Evaluation", {
          subtitle: "District Level Healthcare Assessment",
          purpose: "Measure child nutrition interventions.",
          background: "Interventions began in 2022 across 14 clinics.",
          intendedAudience: "Ministry of Health",
          decisionUse: "Resource allocation for 2026 expansion",
          ownerLead: "Dr. Sarah Jenkins",
          questions: [
            {
              id: "Q1",
              question: "Did supplementation reach 80% coverage?",
              order: 1,
              isPrimary: true,
              isActive: true,
            },
          ],
          scope: {
            targetSites: ["District 1", "District 2"],
            targetStakeholderGroups: ["Mothers", "Nurses"],
            isSingleSiteStudy: false,
            scopeStatement: "Assessment of clinics in Region A.",
            inScope: ["Clinics commissioned before 2023"],
            outOfScope: ["Private hospitals"],
            plannedMethods: [
              {
                method: "Key Informant Interview",
                targetSourceCount: 10,
              },
            ],
          },
          framework: {
            frameworkName: "OECD/DAC Criteria",
            themes: [
              {
                id: "THM-EFF",
                name: "Effectiveness",
                isActive: true,
                order: 1,
              },
              {
                id: "THM-REL",
                name: "Relevance",
                isActive: true,
                order: 2,
              },
            ],
          },
          teamRoles: [
            {
              id: "R1",
              role: "lead",
              actor: { kind: "human", displayName: "Dr. Sarah Jenkins" },
            },
            {
              id: "R2",
              role: "validator",
              actor: { kind: "human", displayName: "Dr. Marcus Vance" },
            },
          ],
        }),
        sources: [],
        evidence: [],
        debriefs: [],
        findings: [],
        lessons: [],
        goodPractices: [],
        recommendations: [],
      };

      const readiness = computeStudyReadiness(readyStudy);
      expect(readiness.state).toBe("ready");
      expect(readiness.passedCount).toBe(9);
      expect(readiness.totalCount).toBe(9);
      expect(readiness.checks.every((c) => c.isSatisfied)).toBe(true);
    });

    it("correctly identifies 'needs_attention' when core components are defined but recommendations/governance are missing", () => {
      const partialStudy: FieldStudy = {
        ...createMinimalMeta("partial-study", "Partial Study", {
          purpose: "Evaluate program efficiency.",
          ownerLead: "Lead Person",
          questions: [
            {
              id: "Q1",
              question: "General inquiry question?",
              isPrimary: true,
              isActive: true,
            },
          ],
          scope: {
            targetSites: ["Site Alpha"],
            targetStakeholderGroups: ["Community Members"],
            isSingleSiteStudy: false,
          },
        }),
        sources: [],
        evidence: [],
        debriefs: [],
        findings: [],
        lessons: [],
        goodPractices: [],
        recommendations: [],
      };

      const readiness = computeStudyReadiness(partialStudy);
      expect(readiness.state).toBe("needs_attention");
      expect(readiness.passedCount).toBeLessThan(readiness.totalCount);

      const validatorCheck = readiness.checks.find((c) => c.id === "governance_validator");
      expect(validatorCheck?.isSatisfied).toBe(false);

      const frameworkCheck = readiness.checks.find((c) => c.id === "framework_themes");
      expect(frameworkCheck?.isSatisfied).toBe(false);
    });
  });

  describe("9. Enriched Showcase Demos & Cloning Safeguards", () => {
    it("ensures communityBridgesCase and nutritionFieldCase contain complete Phase 2 metadata", () => {
      [communityBridgesCase, nutritionFieldCase].forEach((demoCase) => {
        expect(demoCase.purpose).toBeTruthy();
        expect(demoCase.background).toBeTruthy();
        expect(demoCase.intendedAudience).toBeTruthy();
        expect(demoCase.decisionUse).toBeTruthy();
        expect(demoCase.ownerLead).toBeTruthy();

        // Scope planned methods
        expect(demoCase.scopeConfig?.plannedMethods).toBeDefined();
        expect((demoCase.scopeConfig?.plannedMethods || []).length).toBeGreaterThanOrEqual(2);

        // Questions with order and primary flags
        expect((demoCase.questions || []).length).toBeGreaterThanOrEqual(2);
        expect((demoCase.questions || []).some((q) => q.isPrimary)).toBe(true);

        // Framework and themes
        expect(demoCase.framework).toBeDefined();
        expect((demoCase.framework?.themes || []).length).toBeGreaterThanOrEqual(3);

        // Team governance roles
        expect(demoCase.teamRoles).toBeDefined();
        expect((demoCase.teamRoles || []).length).toBeGreaterThanOrEqual(2);
      });
    });

    it("clones a demo study into an independent, editable user study with all Phase 2 metadata preserved", async () => {
      await bootstrapDemoTemplates();
      const allDemos = await listStudies();
      const sourceDemo = allDemos.find((s) => s.id === communityBridgesCase.id);
      expect(sourceDemo).toBeDefined();

      const clonedId = await cloneDemoStudy(communityBridgesCase.id, "Cloned Community Bridges");
      const clonedStudy = await assembleStudy(clonedId);

      expect(clonedStudy).toBeDefined();
      expect(clonedStudy?.id).toBe(clonedId);
      expect(clonedStudy?.isDemoCase).toBe(false);
      expect(clonedStudy?.title).toBe("Cloned Community Bridges");
      expect(clonedStudy?.purpose).toBe(communityBridgesCase.purpose);
      expect(clonedStudy?.ownerLead).toBe(communityBridgesCase.ownerLead);
      expect(clonedStudy?.scope?.plannedMethods?.length).toBe(communityBridgesCase.scopeConfig?.plannedMethods?.length);
      expect(clonedStudy?.framework?.themes.length).toBe(communityBridgesCase.framework?.themes.length);
      expect(clonedStudy?.teamRoles?.length).toBe(communityBridgesCase.teamRoles?.length);
      expect(clonedStudy?.questions?.length).toBe(communityBridgesCase.questions?.length);

      // Mutating the clone does not affect the demo case
      await saveStudyQuestion(clonedId, {
        id: "SQ-NEW",
        question: "Is this question isolated to the clone?",
        order: 99,
        isPrimary: false,
        isActive: true,
      });

      const updatedClone = await assembleStudy(clonedId);
      const originalDemo = await assembleStudy(communityBridgesCase.id);

      expect(updatedClone?.questions?.some((q) => q.id === "SQ-NEW")).toBe(true);
      expect(originalDemo?.questions?.some((q) => q.id === "SQ-NEW")).toBe(false);
    });
  });
});
