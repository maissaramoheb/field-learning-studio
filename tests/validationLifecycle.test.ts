import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  submitForReview,
  validateArtifact,
  rejectArtifact,
  reopenRejectedArtifact,
  isSubstantiveEvidenceChange,
  applySubstantiveEvidenceEdit,
  canSubmitForReview,
  canValidate,
  canReject,
  canReopen,
  requiresRevalidation,
} from "@/lib/validation";
import {
  clearAllStores,
  saveStudyMeta,
  saveSource,
  saveEvidence,
  getEvidence,
  assembleStudy,
} from "@/lib/storage";
import type { EvidenceEntry, StudyMeta } from "@/lib/types";

describe("Validation Lifecycle Domain Logic (v0.9 Phase 4)", () => {
  const mockEvidence: EvidenceEntry = {
    id: "EV-TEST-001",
    studyId: "study-01",
    sourceId: "SRC-TEST-001",
    siteId: "Minya",
    stakeholderType: "Teachers",
    rawEvidence: "Teachers report classroom heating is non-functional during winter months.",
    rawObservation: "Teachers report classroom heating is non-functional during winter months.",
    interpretation: "Infrastructure deficiencies impede student attendance in winter.",
    potentialFinding: "Infrastructure deficiencies impede student attendance in winter.",
    primaryTheme: "Infrastructure",
    secondaryTheme: "Attendance",
    evidenceStrength: "Medium",
    sensitivityFlag: "Low",
    qaStatus: "Needs Review",
    validationStatus: "Draft",
    revision: 1,
    createdAt: 1000,
    updatedAt: 1000,
  };

  describe("1. State Transitions & Invariants", () => {
    it("transitions Draft to Needs Review via submitForReview", () => {
      const submitted = submitForReview(mockEvidence);
      expect(submitted.validationStatus).toBe("Needs Review");
      expect(submitted.updatedAt).toBeGreaterThanOrEqual(1000);
    });

    it("throws if submitting an artifact that is not in Draft state", () => {
      const inReview: EvidenceEntry = { ...mockEvidence, validationStatus: "Needs Review" };
      expect(() => submitForReview(inReview)).toThrow(/expected "Draft"/i);

      const validated: EvidenceEntry = { ...mockEvidence, validationStatus: "Validated" };
      expect(() => submitForReview(validated)).toThrow(/expected "Draft"/i);
    });

    it("validates an artifact from Needs Review with accountable reviewer identity", () => {
      const inReview: EvidenceEntry = { ...mockEvidence, validationStatus: "Needs Review" };
      const validated = validateArtifact(inReview, "Lead Evaluator Sarah");

      expect(validated.validationStatus).toBe("Validated");
      expect(validated.lastValidatedBy).toBe("Lead Evaluator Sarah");
      expect(validated.lastValidatedAt).toBeTypeOf("number");
      expect(validated.rejectionReason).toBeUndefined();
    });

    it("throws if validating without a non-empty reviewer name", () => {
      const inReview: EvidenceEntry = { ...mockEvidence, validationStatus: "Needs Review" };
      expect(() => validateArtifact(inReview, "")).toThrow(/non-empty reviewer name/i);
      expect(() => validateArtifact(inReview, "   ")).toThrow(/non-empty reviewer name/i);
    });

    it("blocks direct validation from Draft without submitting for review first", () => {
      expect(() => validateArtifact(mockEvidence, "Dr. Moheb")).toThrow(
        /must be submitted for review before validation/i
      );
    });

    it("rejects an artifact from Needs Review with a non-empty reason", () => {
      const inReview: EvidenceEntry = { ...mockEvidence, validationStatus: "Needs Review" };
      const rejected = rejectArtifact(
        inReview,
        "Insufficient triangulation: single anecdotal remark without corroborating log."
      );

      expect(rejected.validationStatus).toBe("Rejected");
      expect(rejected.rejectionReason).toBe(
        "Insufficient triangulation: single anecdotal remark without corroborating log."
      );
    });

    it("throws if rejecting without a non-empty reason", () => {
      const inReview: EvidenceEntry = { ...mockEvidence, validationStatus: "Needs Review" };
      expect(() => rejectArtifact(inReview, "")).toThrow(/non-empty reason/i);
      expect(() => rejectArtifact(inReview, "   ")).toThrow(/non-empty reason/i);
    });

    it("blocks direct rejection from Draft or Validated", () => {
      expect(() => rejectArtifact(mockEvidence, "Reason")).toThrow(
        /must be submitted for review before rejection/i
      );

      const validated: EvidenceEntry = { ...mockEvidence, validationStatus: "Validated" };
      expect(() => rejectArtifact(validated, "Reason")).toThrow(
        /validated evidence cannot be directly rejected/i
      );
    });

    it("reopens a Rejected artifact to Draft preserving previousValidationStatus", () => {
      const rejected: EvidenceEntry = {
        ...mockEvidence,
        validationStatus: "Rejected",
        rejectionReason: "Need direct observation data",
      };

      const reopened = reopenRejectedArtifact(rejected);
      expect(reopened.validationStatus).toBe("Draft");
      expect(reopened.previousValidationStatus).toBe("Rejected");
      expect(reopened.rejectionReason).toBe("Need direct observation data");
    });

    it("throws if attempting to reopen an artifact that is not Rejected", () => {
      expect(() => reopenRejectedArtifact(mockEvidence)).toThrow(/expected "Rejected"/i);
    });
  });

  describe("2. Substantive Change Detection", () => {
    it("detects substantive changes in observation, interpretation, themes, and strength", () => {
      expect(
        isSubstantiveEvidenceChange(mockEvidence, {
          rawObservation: "Substantively modified text here.",
        })
      ).toBe(true);

      expect(
        isSubstantiveEvidenceChange(mockEvidence, {
          interpretation: "Altered analytical interpretation.",
        })
      ).toBe(true);

      expect(
        isSubstantiveEvidenceChange(mockEvidence, {
          primaryTheme: "Governance",
        })
      ).toBe(true);

      expect(
        isSubstantiveEvidenceChange(mockEvidence, {
          evidenceStrength: "High",
        })
      ).toBe(true);

      expect(
        isSubstantiveEvidenceChange(mockEvidence, {
          sensitivityFlag: "High",
        })
      ).toBe(true);
    });

    it("ignores whitespace-only differences as non-substantive", () => {
      expect(
        isSubstantiveEvidenceChange(mockEvidence, {
          rawEvidence: "  Teachers report classroom heating is non-functional during winter months.  ",
        })
      ).toBe(false);

      expect(
        isSubstantiveEvidenceChange(mockEvidence, {
          rawObservation: "Teachers report classroom heating   is non-functional during winter months.",
        })
      ).toBe(false);

      expect(
        isSubstantiveEvidenceChange(mockEvidence, {
          primaryTheme: " Infrastructure ",
        })
      ).toBe(false);
    });
  });

  describe("3. Revision Increment & Re-Validation Triggers", () => {
    const validatedEvidence: EvidenceEntry = {
      ...mockEvidence,
      validationStatus: "Validated",
      revision: 1,
      lastValidatedBy: "Senior Evaluator",
      lastValidatedAt: 1718000000000,
    };

    it("substantive change to Validated evidence increments revision, resets to Needs Review, and preserves audit trail", () => {
      const result = applySubstantiveEvidenceEdit(validatedEvidence, {
        rawObservation: "Teachers and school administrators both confirmed chronic heater breakdowns.",
      });

      expect(result.requiredRevalidation).toBe(true);
      expect(result.updated.validationStatus).toBe("Needs Review");
      expect(result.updated.previousValidationStatus).toBe("Validated");
      expect(result.updated.revision).toBe(2);
      expect(result.updated.lastValidatedBy).toBe("Senior Evaluator");
      expect(result.updated.lastValidatedAt).toBe(1718000000000);
      expect(result.updated.rawObservation).toBe(
        "Teachers and school administrators both confirmed chronic heater breakdowns."
      );
      expect(result.updated.rawEvidence).toBe(
        "Teachers and school administrators both confirmed chronic heater breakdowns."
      );
    });

    it("non-substantive edit to Validated evidence retains Validated status and does not increment revision", () => {
      const result = applySubstantiveEvidenceEdit(validatedEvidence, {
        rawObservation: " Teachers report classroom heating is non-functional during winter months. ",
      });

      expect(result.requiredRevalidation).toBe(false);
      expect(result.updated.validationStatus).toBe("Validated");
      expect(result.updated.revision).toBe(1);
    });

    it("edits on Draft evidence do not mark requiredRevalidation", () => {
      const result = applySubstantiveEvidenceEdit(mockEvidence, {
        primaryTheme: "Logistics",
      });

      expect(result.requiredRevalidation).toBe(false);
      expect(result.updated.validationStatus).toBe("Draft");
      expect(result.updated.primaryTheme).toBe("Logistics");
    });
  });

  describe("4. Lifecycle UI State Helpers", () => {
    it("correctly identifies available actions per state", () => {
      expect(canSubmitForReview(mockEvidence)).toBe(true);
      expect(canValidate(mockEvidence)).toBe(false);
      expect(canReject(mockEvidence)).toBe(false);
      expect(canReopen(mockEvidence)).toBe(false);

      const inReview: EvidenceEntry = { ...mockEvidence, validationStatus: "Needs Review" };
      expect(canSubmitForReview(inReview)).toBe(false);
      expect(canValidate(inReview)).toBe(true);
      expect(canReject(inReview)).toBe(true);
      expect(canReopen(inReview)).toBe(false);

      const validated: EvidenceEntry = { ...mockEvidence, validationStatus: "Validated" };
      expect(canSubmitForReview(validated)).toBe(false);
      expect(canValidate(validated)).toBe(false);
      expect(canReject(validated)).toBe(false);

      const rejected: EvidenceEntry = { ...mockEvidence, validationStatus: "Rejected" };
      expect(canSubmitForReview(rejected)).toBe(false);
      expect(canValidate(rejected)).toBe(false);
      expect(canReject(rejected)).toBe(false);
      expect(canReopen(rejected)).toBe(true);
    });

    it("correctly identifies re-validation requirement", () => {
      const normalInReview: EvidenceEntry = {
        ...mockEvidence,
        validationStatus: "Needs Review",
        revision: 1,
      };
      expect(requiresRevalidation(normalInReview)).toBe(false);
      const editedValidated: EvidenceEntry = {
        ...mockEvidence,
        validationStatus: "Needs Review",
        previousValidationStatus: "Validated",
        revision: 2,
      };
      expect(requiresRevalidation(editedValidated)).toBe(true);
    });
  });

  describe("5. IndexedDB Persistence Round-Trip & Audit History", () => {
    const studyId = "study-val-test-01";

    beforeEach(async () => {
      await clearAllStores();
      const meta: StudyMeta = {
        id: studyId,
        title: "Validation Test Study",
        subtitle: "Testing validation persistence",
        context: "Evaluation context",
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
        createdAt: 1000,
        updatedAt: 1000,
      };
      await saveStudyMeta(meta);
      await saveSource({
        id: "SRC-TEST-001",
        studyId,
        title: "Test Source",
        date: "2026-09-20",
        location: "Minya",
        siteId: "Minya",
        stakeholderType: "Teachers",
        sourceType: "Key Informant Interview",
        consentStatus: "Oral",
        anonymizationStatus: "Pseudonymized",
        sensitivityFlag: "None",
        summary: "Test source summary",
        rawText: "Test source notes",
        createdAt: 1000,
        updatedAt: 1000,
      });
    });

    it("persists full lifecycle: Draft -> Needs Review -> Validated -> Edit (Requires Re-validation) -> Re-validated", async () => {
      // 1. Save Draft
      const draftEntry: EvidenceEntry = {
        ...mockEvidence,
        studyId,
        validationStatus: "Draft",
        revision: 1,
      };
      await saveEvidence(draftEntry as EvidenceEntry & { studyId: string });

      const fetchedDraft = await getEvidence(studyId, draftEntry.id);
      expect(fetchedDraft?.validationStatus).toBe("Draft");

      // 2. Submit for Review
      const inReview = submitForReview(fetchedDraft!);
      await saveEvidence(inReview as EvidenceEntry & { studyId: string });

      const fetchedInReview = await getEvidence(studyId, draftEntry.id);
      expect(fetchedInReview?.validationStatus).toBe("Needs Review");

      // 3. Validate
      const validated = validateArtifact(fetchedInReview!, "Lead Evaluator Amina");
      await saveEvidence(validated as EvidenceEntry & { studyId: string });

      const fetchedValidated = await getEvidence(studyId, draftEntry.id);
      expect(fetchedValidated?.validationStatus).toBe("Validated");
      expect(fetchedValidated?.lastValidatedBy).toBe("Lead Evaluator Amina");
      expect(fetchedValidated?.lastValidatedAt).toBeTypeOf("number");
      expect(fetchedValidated?.revision).toBe(1);

      // 4. Substantive Edit to Validated Evidence
      const editResult = applySubstantiveEvidenceEdit(fetchedValidated!, {
        rawObservation: "Observation updated with verified attendance logs from administration.",
      });
      expect(editResult.requiredRevalidation).toBe(true);
      await saveEvidence(editResult.updated as EvidenceEntry & { studyId: string });

      const fetchedAfterEdit = await getEvidence(studyId, draftEntry.id);
      expect(fetchedAfterEdit?.validationStatus).toBe("Needs Review");
      expect(fetchedAfterEdit?.previousValidationStatus).toBe("Validated");
      expect(fetchedAfterEdit?.revision).toBe(2);
      expect(fetchedAfterEdit?.lastValidatedBy).toBe("Lead Evaluator Amina"); // Preserves historical reviewer
      expect(fetchedAfterEdit?.rawObservation).toBe(
        "Observation updated with verified attendance logs from administration."
      );

      // 5. Re-validate
      const revalidated = validateArtifact(fetchedAfterEdit!, "Senior Evaluator Tarek");
      await saveEvidence(revalidated as EvidenceEntry & { studyId: string });

      const fetchedRevalidated = await getEvidence(studyId, draftEntry.id);
      expect(fetchedRevalidated?.validationStatus).toBe("Validated");
      expect(fetchedRevalidated?.lastValidatedBy).toBe("Senior Evaluator Tarek");
      expect(fetchedRevalidated?.revision).toBe(2);

      // Verify assembleStudy reflects this
      const assembled = await assembleStudy(studyId);
      expect(assembled?.evidence.length).toBe(1);
      expect(assembled?.evidence[0].validationStatus).toBe("Validated");
      expect(assembled?.evidence[0].revision).toBe(2);
      expect(assembled?.evidence[0].lastValidatedBy).toBe("Senior Evaluator Tarek");
    });

    it("persists rejection and reopening to Draft with audit reason intact", async () => {
      const inReviewEntry: EvidenceEntry = {
        ...mockEvidence,
        studyId,
        validationStatus: "Needs Review",
        revision: 1,
      };
      await saveEvidence(inReviewEntry as EvidenceEntry & { studyId: string });

      // Reject
      const rejected = rejectArtifact(
        inReviewEntry,
        "Methodological flaw: interviewed child without caregiver assent protocol."
      );
      await saveEvidence(rejected as EvidenceEntry & { studyId: string });

      const fetchedRejected = await getEvidence(studyId, inReviewEntry.id);
      expect(fetchedRejected?.validationStatus).toBe("Rejected");
      expect(fetchedRejected?.rejectionReason).toBe(
        "Methodological flaw: interviewed child without caregiver assent protocol."
      );

      // Reopen to Draft
      const reopened = reopenRejectedArtifact(fetchedRejected!);
      await saveEvidence(reopened as EvidenceEntry & { studyId: string });

      const fetchedReopened = await getEvidence(studyId, inReviewEntry.id);
      expect(fetchedReopened?.validationStatus).toBe("Draft");
      expect(fetchedReopened?.previousValidationStatus).toBe("Rejected");
      expect(fetchedReopened?.rejectionReason).toBe(
        "Methodological flaw: interviewed child without caregiver assent protocol."
      );
    });
  });
});
