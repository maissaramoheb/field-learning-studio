import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  clearAllStores,
  bootstrapDemoTemplates,
  listStudies,
  assembleStudy,
  cloneDemoStudy,
  saveStudyMeta,
  saveCompleteStudy,
  getStudyStats,
} from "@/lib/storage";
import { demoCases } from "@/data/cases";
import {
  PRACTITIONER_SPACES,
  getSpaceForTab,
  resolveStudioNavigation,
  type PractitionerSpaceId,
  type WorkspaceTabId,
} from "@/components/FieldLearningStudioApp";
import {
  WORKSPACE_CONTEXT_MAP,
} from "@/components/layout/WorkspaceContextHeader";
import type { StudyMeta, FieldStudy, PatternNote } from "@/lib/types";

describe("Phase 1: Study Library & Workspace Identity Foundation", () => {
  beforeEach(async () => {
    await clearAllStores();
  });

  describe("1. Demo / Real Separation", () => {
    it("bootstraps showcase templates with isDemoCase === true and separates them from user studies", async () => {
      await bootstrapDemoTemplates();
      const allStudies = await listStudies();

      expect(allStudies.length).toBe(demoCases.length);
      allStudies.forEach((study) => {
        expect(study.isDemoCase).toBe(true);
      });

      const showcaseStudies = allStudies.filter((s) => s.isDemoCase);
      const userStudies = allStudies.filter((s) => !s.isDemoCase);

      expect(showcaseStudies.length).toBe(demoCases.length);
      expect(userStudies.length).toBe(0);
    });

    it("correctly identifies real studies when created alongside demo cases", async () => {
      await bootstrapDemoTemplates();

      const userStudy: StudyMeta = {
        id: "study-real-101",
        title: "Kajiado Water Security Evaluation",
        subtitle: "Field Inquiry",
        context: "Assessment of borehole infrastructure in arid pastoralist communities",
        status: "Active Fieldwork",
        isDemoCase: false,
        scope: {
          targetSites: ["Site A", "Site B"],
          isSingleSiteStudy: false,
          targetStakeholderGroups: ["Pastoralists", "County Water Officers"],
        },
        executiveSummary: "",
        keyMessages: [],
        limitations: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveStudyMeta(userStudy);

      const allStudies = await listStudies();
      const showcaseStudies = allStudies.filter((s) => s.isDemoCase);
      const userStudies = allStudies.filter((s) => !s.isDemoCase);

      expect(showcaseStudies.length).toBe(demoCases.length);
      expect(userStudies.length).toBe(1);
      expect(userStudies[0].id).toBe("study-real-101");
      expect(userStudies[0].title).toBe("Kajiado Water Security Evaluation");
      expect(userStudies[0].isDemoCase).toBe(false);
    });
  });

  describe("2. Library Selection Behavior", () => {
    it("assembles a selected demo study with read-only showcase semantics", async () => {
      await bootstrapDemoTemplates();
      const targetDemoId = demoCases[0].id;

      const assembled = await assembleStudy(targetDemoId);
      expect(assembled).toBeDefined();
      expect(assembled?.id).toBe(targetDemoId);
      expect(assembled?.isDemoCase).toBe(true);
      expect(assembled?.sources.length).toBeGreaterThan(0);
      expect(assembled?.evidence.length).toBeGreaterThan(0);
      expect(assembled?.findings.length).toBeGreaterThan(0);
    });

    it("assembles a selected user study with editable semantics", async () => {
      const userStudy: StudyMeta = {
        id: "study-user-selected",
        title: "Urban Youth Employment Pilot",
        subtitle: "Baseline Study",
        context: "Vocational skills training assessment",
        status: "Active Fieldwork",
        isDemoCase: false,
        scope: {
          targetSites: ["Eastleigh"],
          isSingleSiteStudy: true,
          targetStakeholderGroups: ["Youth trainees"],
        },
        executiveSummary: "",
        keyMessages: [],
        limitations: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveStudyMeta(userStudy);

      const assembled = await assembleStudy("study-user-selected");
      expect(assembled).toBeDefined();
      expect(assembled?.id).toBe("study-user-selected");
      expect(assembled?.isDemoCase).toBe(false);
      expect(assembled?.status).toBe("Active Fieldwork");
    });
  });

  describe("3. Demo Study Cloning into Real Studies", () => {
    it("clones a showcase study into an editable real study without modifying the showcase original", async () => {
      await bootstrapDemoTemplates();
      const demoId = demoCases[0].id;

      const clonedId = await cloneDemoStudy(demoId, "Custom Cloned Study Title");
      expect(clonedId).toBeDefined();
      expect(clonedId).not.toBe(demoId);

      const allStudies = await listStudies();
      const showcaseStudies = allStudies.filter((s) => s.isDemoCase);
      const userStudies = allStudies.filter((s) => !s.isDemoCase);

      expect(showcaseStudies.length).toBe(demoCases.length);
      expect(userStudies.length).toBe(1);
      expect(userStudies[0].id).toBe(clonedId);
      expect(userStudies[0].title).toBe("Custom Cloned Study Title");
      expect(userStudies[0].isDemoCase).toBe(false);

      // Verify the cloned study has full child records rebound to clonedId
      const assembledClone = await assembleStudy(clonedId);
      expect(assembledClone).toBeDefined();
      expect(assembledClone?.id).toBe(clonedId);
      expect(assembledClone?.isDemoCase).toBe(false);
      expect(assembledClone?.sources.length).toBeGreaterThan(0);
      expect(assembledClone?.sources.every((s) => s.studyId === clonedId)).toBe(true);
      expect(assembledClone?.evidence.every((e) => e.studyId === clonedId)).toBe(true);
      expect(assembledClone?.findings.every((f) => f.studyId === clonedId)).toBe(true);
      expect(assembledClone?.recommendations.every((r) => r.studyId === clonedId)).toBe(true);

      // Verify the original showcase study remains intact
      const assembledOriginal = await assembleStudy(demoId);
      expect(assembledOriginal?.isDemoCase).toBe(true);
      expect(assembledOriginal?.sources.every((s) => s.studyId === demoId)).toBe(true);
    });
  });

  describe("4. Empty Real Study State Detection", () => {
    it("detects empty state when only demo studies exist", async () => {
      await bootstrapDemoTemplates();
      const allStudies = await listStudies();
      const realStudies = allStudies.filter((s) => !s.isDemoCase);

      const isEmptyRealState = realStudies.length === 0;
      expect(isEmptyRealState).toBe(true);
    });

    it("exits empty state immediately after first real study is saved", async () => {
      await bootstrapDemoTemplates();

      const newStudy: StudyMeta = {
        id: "study-first-real",
        title: "Community Resilience Study",
        subtitle: "Midterm Review",
        context: "Evaluation of drought response measures",
        status: "Active Fieldwork",
        isDemoCase: false,
        scope: {
          targetSites: ["Marsabit"],
          isSingleSiteStudy: true,
          targetStakeholderGroups: ["Pastoralists"],
        },
        executiveSummary: "",
        keyMessages: [],
        limitations: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveStudyMeta(newStudy);

      const allStudies = await listStudies();
      const realStudies = allStudies.filter((s) => !s.isDemoCase);

      expect(realStudies.length).toBe(1);
      expect(realStudies.length === 0).toBe(false);
    });
  });

  describe("5. Active Workspace Context & Practitioner Spaces", () => {
    it("defines exactly the 4 required practitioner spaces with progression metadata", () => {
      expect(PRACTITIONER_SPACES.length).toBe(4);
      const spaceIds = PRACTITIONER_SPACES.map((s) => s.id);
      expect(spaceIds).toEqual(["study", "field-material", "analysis", "deliverables"]);

      expect(PRACTITIONER_SPACES[0].stepNumber).toBe("1");
      expect(PRACTITIONER_SPACES[1].stepNumber).toBe("2");
      expect(PRACTITIONER_SPACES[2].stepNumber).toBe("3");
      expect(PRACTITIONER_SPACES[3].stepNumber).toBe("4");
    });

    it("verifies the exact locked cognitive purpose and mental model for all 4 spaces", () => {
      const studyCtx = WORKSPACE_CONTEXT_MAP.study;
      expect(studyCtx.purpose).toBe("DEFINE");
      expect(studyCtx.mentalModel).toBe("Blueprint / Compass");
      expect(studyCtx.stepNumber).toBe("1");

      const fieldCtx = WORKSPACE_CONTEXT_MAP["field-material"];
      expect(fieldCtx.purpose).toBe("CAPTURE & QUALIFY");
      expect(fieldCtx.mentalModel).toBe("Evidence Notebook / Source Tray");
      expect(fieldCtx.stepNumber).toBe("2");

      const analysisCtx = WORKSPACE_CONTEXT_MAP.analysis;
      expect(analysisCtx.purpose).toBe("INTERPRET & VALIDATE");
      expect(analysisCtx.mentalModel).toBe("Analytical Desk / Lens");
      expect(analysisCtx.stepNumber).toBe("3");

      const deliverablesCtx = WORKSPACE_CONTEXT_MAP.deliverables;
      expect(deliverablesCtx.purpose).toBe("COMMUNICATE & DECIDE");
      expect(deliverablesCtx.mentalModel).toBe("Brief / Publication Desk");
      expect(deliverablesCtx.stepNumber).toBe("4");
    });

    it("accurately maps all sub-tabs to their parent practitioner space", () => {
      const tabSpaceExpectations: Record<WorkspaceTabId, PractitionerSpaceId> = {
        overview: "study",
        "study-brief": "study",
        "study-questions": "study",
        "study-methods": "study",
        "study-framework": "study",
        intake: "field-material",
        evidence: "field-material",
        debrief: "analysis",
        synthesis: "analysis",
        findings: "analysis",
        lessons: "analysis",
        recommendations: "deliverables",
        qa: "deliverables",
        brief: "deliverables",
      };

      (Object.keys(tabSpaceExpectations) as WorkspaceTabId[]).forEach((tab) => {
        expect(getSpaceForTab(tab)).toBe(tabSpaceExpectations[tab]);
      });
    });
  });

  describe("6. Study Metrics & Data Selection Integrity", () => {
    it("accurately computes indexed study stats for user and demo studies via getStudyStats", async () => {
      await bootstrapDemoTemplates();
      const demoId = demoCases[0].id;

      const stats = await getStudyStats(demoId);
      expect(stats.sourcesCount).toBe(demoCases[0].sources.length);
      expect(stats.evidenceCount).toBe(demoCases[0].evidence.length);
      expect(stats.findingsCount).toBe(demoCases[0].findings.length);
      expect(stats.recommendationsCount).toBe(demoCases[0].recommendations.length);
    });

    it("preserves unbroken data lineage and relationships after demo bootstrap", async () => {
      await bootstrapDemoTemplates();
      const demoCase = demoCases[0];
      const assembled = await assembleStudy(demoCase.id);

      expect(assembled).toBeDefined();
      expect(assembled?.findings.length).toBeGreaterThan(0);

      // Verify findings have supportingEvidenceIds pointing to valid evidence
      const findingWithEvidence = assembled?.findings.find((f) => f.supportingEvidenceIds && f.supportingEvidenceIds.length > 0);
      expect(findingWithEvidence).toBeDefined();
      if (findingWithEvidence && findingWithEvidence.supportingEvidenceIds) {
        const evidenceExists = assembled?.evidence.some(
          (e) => e.id === findingWithEvidence.supportingEvidenceIds[0]
        );
        expect(evidenceExists).toBe(true);
      }
    });
  });

  describe("7. Cold Deep-Link Priority & URL History Navigation", () => {
    it("1. ?study=<valid-id> overrides cached active study from localStorage", () => {
      const mockStudies: StudyMeta[] = [
        { id: "demo-1", title: "Demo 1", isDemoCase: true } as StudyMeta,
        { id: "study-cached", title: "Cached Study", isDemoCase: false } as StudyMeta,
        { id: "study-deep-link", title: "Target Deep Link", isDemoCase: false } as StudyMeta,
      ];

      const result = resolveStudioNavigation({
        search: "?study=study-deep-link",
        cachedStudyId: "study-cached",
        studies: mockStudies,
        defaultStudyId: "demo-1",
      });

      expect(result.viewMode).toBe("workspace");
      expect(result.targetStudyId).toBe("study-deep-link");
      expect(result.urlToReplace).toBeUndefined();
    });

    it("2. invalid ?study=<id> safely falls back to Study Library without opening unrelated cached study", () => {
      const mockStudies: StudyMeta[] = [
        { id: "demo-1", title: "Demo 1", isDemoCase: true } as StudyMeta,
        { id: "study-cached", title: "Cached Study", isDemoCase: false } as StudyMeta,
      ];

      const result = resolveStudioNavigation({
        search: "?study=non-existent-or-deleted-id",
        cachedStudyId: "study-cached",
        studies: mockStudies,
        defaultStudyId: "demo-1",
      });

      expect(result.viewMode).toBe("library");
      expect(result.urlToReplace).toBe("/studio?view=library");
    });

    it("3. popstate history traversal: Library -> Open Study -> Back = Library", () => {
      const mockStudies: StudyMeta[] = [
        { id: "demo-1", title: "Demo 1", isDemoCase: true } as StudyMeta,
      ];

      // Step 1: Initial state is Library
      const step1 = resolveStudioNavigation({
        search: "?view=library",
        cachedStudyId: null,
        studies: mockStudies,
        defaultStudyId: "demo-1",
      });
      expect(step1.viewMode).toBe("library");

      // Step 2: Open Study
      const step2 = resolveStudioNavigation({
        search: "?study=demo-1",
        cachedStudyId: null,
        studies: mockStudies,
        defaultStudyId: "demo-1",
      });
      expect(step2.viewMode).toBe("workspace");
      expect(step2.targetStudyId).toBe("demo-1");

      // Step 3: Browser Back pressed -> URL becomes ?view=library
      const step3 = resolveStudioNavigation({
        search: "?view=library",
        cachedStudyId: "demo-1",
        studies: mockStudies,
        defaultStudyId: "demo-1",
      });
      expect(step3.viewMode).toBe("library");
    });

    it("4. popstate history traversal: Forward restores previously opened Study", () => {
      const mockStudies: StudyMeta[] = [
        { id: "demo-1", title: "Demo 1", isDemoCase: true } as StudyMeta,
        { id: "study-2", title: "Study 2", isDemoCase: false } as StudyMeta,
      ];

      // Browser Forward pressed -> URL becomes ?study=study-2
      const forwardResult = resolveStudioNavigation({
        search: "?study=study-2",
        cachedStudyId: "demo-1",
        studies: mockStudies,
        defaultStudyId: "demo-1",
      });
      expect(forwardResult.viewMode).toBe("workspace");
      expect(forwardResult.targetStudyId).toBe("study-2");
    });

    it("handles multi-step history sequence: Study A -> Library -> Study B -> Back (Library) -> Back (Study A)", () => {
      const mockStudies: StudyMeta[] = [
        { id: "study-a", title: "Study A", isDemoCase: false } as StudyMeta,
        { id: "study-b", title: "Study B", isDemoCase: false } as StudyMeta,
      ];

      // State 1: Study A
      expect(resolveStudioNavigation({ search: "?study=study-a", cachedStudyId: null, studies: mockStudies }).viewMode).toBe("workspace");
      // State 2: Library
      expect(resolveStudioNavigation({ search: "?view=library", cachedStudyId: "study-a", studies: mockStudies }).viewMode).toBe("library");
      // State 3: Study B
      expect(resolveStudioNavigation({ search: "?study=study-b", cachedStudyId: "study-a", studies: mockStudies }).viewMode).toBe("workspace");
      // Back 1 -> Library
      expect(resolveStudioNavigation({ search: "?view=library", cachedStudyId: "study-b", studies: mockStudies }).viewMode).toBe("library");
      // Back 2 -> Study A
      const back2 = resolveStudioNavigation({ search: "?study=study-a", cachedStudyId: "study-b", studies: mockStudies });
      expect(back2.viewMode).toBe("workspace");
      expect(back2.targetStudyId).toBe("study-a");
    });
  });

  describe("8. Demo Clone PatternNote Remapping & Immutability", () => {
    it("5 & 6. clones PatternNotes with remapped studyId without mutating original demo", async () => {
      await bootstrapDemoTemplates();
      const demoId = demoCases[0].id;
      const originalStudy = await assembleStudy(demoId);
      expect(originalStudy).toBeDefined();

      // Seed a realistic pattern note into the demo study
      const patternNoteId = "pn-test-001";
      const originalPatternNote: PatternNote = {
        id: patternNoteId,
        studyId: demoId,
        statement: "Youth advisory committees experienced systematic exclusion during resource allocation",
        evidenceIds: originalStudy?.evidence.slice(0, 2).map((e) => e.id) || [],
        theme: "Inclusion",
        contradictionNote: "No opposing evidence noted",
        createdAt: Date.now() - 50000,
        updatedAt: Date.now() - 50000,
      };

      const studyWithPattern: FieldStudy = {
        ...originalStudy!,
        patternNotes: [originalPatternNote],
      };
      await saveCompleteStudy(studyWithPattern);

      // Verify the pattern note exists on the demo study
      const verifiedOriginal = await assembleStudy(demoId);
      expect(verifiedOriginal?.patternNotes?.length).toBe(1);
      expect(verifiedOriginal?.patternNotes?.[0].studyId).toBe(demoId);

      // Clone the demo study
      const clonedId = await cloneDemoStudy(demoId, "Cloned Study with Pattern Note");

      // Verify cloned study has patternNotes remapped
      const assembledClone = await assembleStudy(clonedId);
      expect(assembledClone).toBeDefined();
      expect(assembledClone?.id).toBe(clonedId);
      expect(assembledClone?.patternNotes).toBeDefined();
      expect(assembledClone?.patternNotes?.length).toBe(1);

      const clonedNote = assembledClone!.patternNotes![0];
      // Requirement 5: cloned PatternNote receives new studyId
      expect(clonedNote.id).toBe(patternNoteId);
      expect(clonedNote.statement).toBe(originalPatternNote.statement);
      expect(clonedNote.studyId).toBe(clonedId);
      expect(clonedNote.studyId).not.toBe(demoId);

      // Requirement 6: original demo PatternNote remains unchanged
      const intactOriginal = await assembleStudy(demoId);
      expect(intactOriginal?.patternNotes?.length).toBe(1);
      expect(intactOriginal?.patternNotes?.[0].studyId).toBe(demoId);
      expect(intactOriginal?.patternNotes?.[0].id).toBe(patternNoteId);
    });
  });
});
