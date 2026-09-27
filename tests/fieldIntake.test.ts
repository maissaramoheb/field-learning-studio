import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  clearAllStores,
  saveStudyMeta,
  getStudyMeta,
  assembleStudy,
  saveSource,
  getSource,
  listSources,
  saveEvidence,
  listEvidence,
  bootstrapDemoTemplates,
  cloneDemoStudy,
} from "@/lib/storage";
import { getNextSourceId, getNextEvidenceId } from "@/lib/idGenerator";
import { runSandboxSafetyCheck, scanNarrativeSafety } from "@/lib/sandboxParser";
import { computeSupportProfile } from "@/lib/analytics/supportProfile";
import type {
  StudyMeta,
  SourceRecord,
  EvidenceEntry,
  Finding,
} from "@/lib/types";

describe("Field Intake Studio Operations (v0.9 Phase 3)", () => {
  beforeEach(async () => {
    await clearAllStores();
  });

  describe("1. Blank Editable Study Creation", () => {
    it("creates, persists, and reloads a blank editable field study with required scope metadata", async () => {
      const studyId = "study-partage-test-01";
      const now = Date.now();

      const studyMeta: StudyMeta = {
        id: studyId,
        title: "PARTAGE Field Test",
        subtitle: "Mid-term evaluation",
        context: "Evaluating child wellbeing and educational support in Upper Egypt.",
        status: "Active Fieldwork",
        isDemoCase: false,
        scope: {
          targetSites: ["Minya", "Assiut"],
          isSingleSiteStudy: false,
          targetStakeholderGroups: ["Teachers", "Parents", "Children"],
          expectedMethods: [
            "Key Informant Interview",
            "Focus Group Discussion",
            "Direct Observation",
          ],
        },
        executiveSummary: "",
        keyMessages: [],
        limitations: [],
        createdAt: now,
        updatedAt: now,
      };

      await saveStudyMeta(studyMeta);

      const retrieved = await getStudyMeta(studyId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(studyId);
      expect(retrieved?.isDemoCase).toBe(false);
      expect(retrieved?.status).toBe("Active Fieldwork");
      expect(retrieved?.scope.targetSites).toEqual(["Minya", "Assiut"]);
      expect(retrieved?.scope.targetStakeholderGroups).toEqual([
        "Teachers",
        "Parents",
        "Children",
      ]);

      const assembled = await assembleStudy(studyId);
      expect(assembled).toBeDefined();
      expect(assembled?.sources).toEqual([]);
      expect(assembled?.evidence).toEqual([]);
    });
  });

  describe("2. Demo Template Cloning", () => {
    it("clones pristine template to an editable copy while keeping original template intact", async () => {
      await bootstrapDemoTemplates();

      const templateBefore = await getStudyMeta("school-nutrition");
      expect(templateBefore?.isDemoCase).toBe(true);

      const cloneId = await cloneDemoStudy(
        "school-nutrition",
        "School Nutrition (Editable Mission Copy)"
      );

      const clonedStudy = await assembleStudy(cloneId);
      expect(clonedStudy).toBeDefined();
      expect(clonedStudy?.id).not.toBe("school-nutrition");
      expect(clonedStudy?.isDemoCase).toBe(false);
      expect(clonedStudy?.title).toBe("School Nutrition (Editable Mission Copy)");
      expect(clonedStudy?.status).toBe("Active Fieldwork");

      // Verify pristine template remains untouched
      const templateAfter = await getStudyMeta("school-nutrition");
      expect(templateAfter?.isDemoCase).toBe(true);
      expect(templateAfter?.title).toBe(templateBefore?.title);
    });
  });

  describe("3. Narrative Field Note Capture & Persistence", () => {
    it("saves and reloads a narrative SourceRecord with complete provenance", async () => {
      const studyId = "study-intake-test";
      const now = Date.now();

      await saveStudyMeta({
        id: studyId,
        title: "Intake Test Study",
        subtitle: "",
        context: "Testing intake",
        status: "Active Fieldwork",
        isDemoCase: false,
        scope: {
          targetSites: ["Minya"],
          isSingleSiteStudy: true,
          targetStakeholderGroups: ["Teachers"],
        },
        executiveSummary: "",
        keyMessages: [],
        limitations: [],
        createdAt: now,
        updatedAt: now,
      });

      const existingSourceIds = (await listSources(studyId)).map((s) => s.id);
      const nextSourceId = getNextSourceId(existingSourceIds);
      expect(nextSourceId).toBe("SRC-001");

      const narrativeNote: SourceRecord & { studyId: string } = {
        id: nextSourceId,
        studyId,
        title: "KII with School Principal on Meal Delivery",
        sourceType: "Key Informant Interview",
        date: "2026-03-20",
        location: "Minya",
        siteId: "Minya",
        stakeholderType: "Teachers",
        collectorName: "Lead Researcher",
        consentStatus: "Written",
        anonymizationStatus: "Anonymized",
        sensitivityFlag: "None",
        summary: "Principal noted delivery delays on Mondays.",
        rawText:
          "Met with Principal at 10am in administrative office. Discussed school meal storage conditions and weekly delivery timelines. Principal noted delivery trucks frequently arrive late on Monday mornings due to regional depot loading bottlenecks.",
        createdAt: now,
        updatedAt: now,
      };

      await saveSource(narrativeNote);

      const retrievedSource = await getSource(studyId, nextSourceId);
      expect(retrievedSource).toBeDefined();
      expect(retrievedSource?.title).toBe("KII with School Principal on Meal Delivery");
      expect(retrievedSource?.collectorName).toBe("Lead Researcher");
      expect(retrievedSource?.consentStatus).toBe("Written");
      expect(retrievedSource?.anonymizationStatus).toBe("Anonymized");
      expect(retrievedSource?.rawText).toContain("regional depot loading bottlenecks");

      // Verify next ID increments safely
      const updatedSourceIds = (await listSources(studyId)).map((s) => s.id);
      expect(getNextSourceId(updatedSourceIds)).toBe("SRC-002");
    });
  });

  describe("4. Discrete Evidence Extraction & Analytical Distinction", () => {
    it("extracts multiple discrete observations from one source, inheriting provenance and starting as Draft", async () => {
      const studyId = "study-intake-test";
      const now = Date.now();

      await saveStudyMeta({
        id: studyId,
        title: "Intake Test Study",
        subtitle: "",
        context: "Testing intake",
        status: "Active Fieldwork",
        isDemoCase: false,
        scope: {
          targetSites: ["Minya"],
          isSingleSiteStudy: true,
          targetStakeholderGroups: ["Teachers"],
        },
        executiveSummary: "",
        keyMessages: [],
        limitations: [],
        createdAt: now,
        updatedAt: now,
      });

      const sourceId = "SRC-001";
      await saveSource({
        id: sourceId,
        studyId,
        title: "KII with School Principal",
        sourceType: "Key Informant Interview",
        date: "2026-03-20",
        location: "Minya",
        siteId: "Minya",
        stakeholderType: "Teachers",
        summary: "Discussion",
        rawText: "Full note text",
        sensitivityFlag: "None",
      });

      // Extract Observation 1
      const ev1Id = getNextEvidenceId([]);
      expect(ev1Id).toBe("EV-001");

      const ev1: EvidenceEntry & { studyId: string } = {
        id: ev1Id,
        studyId,
        sourceId,
        siteId: "Minya",
        stakeholderType: "Teachers",
        rawEvidence: "Delivery trucks arrive late on Monday mornings.",
        rawObservation: "Delivery trucks arrive late on Monday mornings.",
        interpretation:
          "Regional transport scheduling is misaligned with school start times.",
        primaryTheme: "Logistics",
        secondaryTheme: "School Schedule",
        evidenceStrength: "High",
        sensitivityFlag: "None",
        potentialFinding: "Monday morning delivery bottleneck",
        qaStatus: "Needs Review",
        validationStatus: "Draft", // Must start as Draft
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };

      await saveEvidence(ev1);

      // Extract Observation 2 from the same source
      const existingEvIds = (await listEvidence(studyId)).map((e) => e.id);
      const ev2Id = getNextEvidenceId(existingEvIds);
      expect(ev2Id).toBe("EV-002");

      const ev2: EvidenceEntry & { studyId: string } = {
        id: ev2Id,
        studyId,
        sourceId,
        siteId: "Minya",
        stakeholderType: "Teachers",
        rawEvidence: "Storage room temperature exceeded 28 degrees in early afternoon.",
        rawObservation: "Storage room temperature exceeded 28 degrees in early afternoon.",
        interpretation:
          "Lack of passive cooling or ventilation creates risk of perishable food spoilage.",
        primaryTheme: "Storage & Hygiene",
        secondaryTheme: "Infrastructure",
        evidenceStrength: "Medium",
        sensitivityFlag: "None",
        potentialFinding: "Afternoon temperature spike in food store",
        qaStatus: "Needs Review",
        validationStatus: "Draft",
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };

      await saveEvidence(ev2);

      // Verify both are persisted and linked
      const evidenceList = await listEvidence(studyId);
      expect(evidenceList.length).toBe(2);
      expect(evidenceList[0].validationStatus).toBe("Draft");
      expect(evidenceList[1].validationStatus).toBe("Draft");
      expect(evidenceList[0].sourceId).toBe(sourceId);
      expect(evidenceList[1].sourceId).toBe(sourceId);

      // Verify relationship integrity: every evidence sourceId resolves to the actual Source
      const sources = await listSources(studyId);
      const sourceIds = new Set(sources.map((s) => s.id));
      for (const entry of evidenceList) {
        expect(sourceIds.has(entry.sourceId)).toBe(true);
      }

      // Verify conceptual source independence:
      // Even though there are 2 evidence entries, they originate from 1 source!
      const dummyFinding: Finding = {
        id: "FND-001",
        statement: "Food logistics face timing and storage challenges.",
        explanation: "",
        supportingEvidenceIds: ["EV-001", "EV-002"],
        contradictoryEvidence: "",
        evidenceStrength: "Medium",
        programmeImplication: "",
        linkedRecommendationIds: [],
      };

      const scope = (await getStudyMeta(studyId))!.scope;
      const profile = computeSupportProfile(dummyFinding, scope, evidenceList, sources);
      expect(profile.independentSourceCount).toBe(1); // Crucial: 2 observations from 1 source = 1 independent source!
      expect(profile.supportTier).toBe("Emerging");
    });
  });

  describe("5. Privacy & Sensitivity Local Scanner", () => {
    it("detects sensitive patterns without sending data external or claiming false safety", () => {
      const sensitiveNote =
        "Interview with John Doe at john.doe@example.com, phone 010-1234-5678 on 2026-04-12 regarding incident.";
      const sensitiveFlag = runSandboxSafetyCheck(sensitiveNote);
      expect(sensitiveFlag).toBe(true);

      const detailedScan = scanNarrativeSafety(sensitiveNote);
      expect(detailedScan.hasWarning).toBe(true);
      expect(detailedScan.warnings.length).toBeGreaterThan(0);

      const cleanNote =
        "General discussion with teachers about classroom attendance trends during the winter term.";
      const cleanFlag = runSandboxSafetyCheck(cleanNote);
      expect(cleanFlag).toBe(false);

      const cleanDetailedScan = scanNarrativeSafety(cleanNote);
      expect(cleanDetailedScan.hasWarning).toBe(false);
      expect(cleanDetailedScan.warnings.length).toBe(0);
    });
  });
});
