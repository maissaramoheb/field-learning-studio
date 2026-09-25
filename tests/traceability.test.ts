import { describe, it, expect } from "vitest";
import { communityBridgesCase } from "@/data/cases/communityBridgesCase";
import { nutritionFieldCase } from "@/data/cases/nutritionFieldCase";
import type { DemoCase, EvidenceEntryId } from "@/lib/types";

// Characterizes the underlying lineage resolution logic used in TraceChain (FieldLearningStudioApp.tsx:3362-3447)
function resolveTraceLineage(id: string, demoCase: DemoCase) {
  let sourceId = "";
  let evidenceId = "";
  let findingId = "";
  let recId = "";

  if (id.startsWith("SRC")) {
    sourceId = id;
    const ev = demoCase.evidence.find((e) => e.sourceId === id);
    if (ev) {
      evidenceId = ev.id;
      const fnd = demoCase.findings.find((f) => f.supportingEvidenceIds.includes(ev.id));
      if (fnd) {
        findingId = fnd.id;
        const rec = demoCase.recommendations.find((r) => r.linkedFindingId === fnd.id);
        if (rec) recId = rec.id;
      }
    }
  } else if (id.startsWith("EV")) {
    evidenceId = id;
    const ev = demoCase.evidence.find((e) => e.id === id);
    if (ev) sourceId = ev.sourceId;
    const fnd = demoCase.findings.find((f) => f.supportingEvidenceIds.includes(id as EvidenceEntryId));
    if (fnd) {
      findingId = fnd.id;
      const rec = demoCase.recommendations.find((r) => r.linkedFindingId === fnd.id);
      if (rec) recId = rec.id;
    }
  } else if (id.startsWith("FND")) {
    findingId = id;
    const fnd = demoCase.findings.find((f) => f.id === id);
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
    const rec = demoCase.recommendations.find((r) => r.id === id);
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

  return { sourceId, evidenceId, findingId, recId };
}

describe("v0.8 Baseline: Traceability Integrity Characterization", () => {
  describe("Relational Integrity of Community Bridges Fixture", () => {
    it("ensures every evidence entry points to a valid source", () => {
      const sourceIds = new Set(communityBridgesCase.sources.map((s) => s.id));
      for (const entry of communityBridgesCase.evidence) {
        expect(sourceIds.has(entry.sourceId), `Evidence ${entry.id} references missing source ${entry.sourceId}`).toBe(true);
      }
    });

    it("ensures every finding references valid evidence and recommendations", () => {
      const evidenceIds = new Set(communityBridgesCase.evidence.map((e) => e.id));
      const recIds = new Set(communityBridgesCase.recommendations.map((r) => r.id));

      for (const finding of communityBridgesCase.findings) {
        expect(finding.supportingEvidenceIds.length).toBeGreaterThan(0);
        for (const evId of finding.supportingEvidenceIds) {
          expect(evidenceIds.has(evId), `Finding ${finding.id} references missing evidence ${evId}`).toBe(true);
        }
        for (const recId of finding.linkedRecommendationIds) {
          expect(recIds.has(recId), `Finding ${finding.id} references missing rec ${recId}`).toBe(true);
        }
      }
    });

    it("ensures every recommendation references a valid finding and valid evidence base", () => {
      const findingIds = new Set(communityBridgesCase.findings.map((f) => f.id));
      const evidenceIds = new Set(communityBridgesCase.evidence.map((e) => e.id));

      for (const rec of communityBridgesCase.recommendations) {
        expect(findingIds.has(rec.linkedFindingId), `Rec ${rec.id} references missing finding ${rec.linkedFindingId}`).toBe(true);
        expect(rec.evidenceBase.length).toBeGreaterThan(0);
        for (const evId of rec.evidenceBase) {
          expect(evidenceIds.has(evId), `Rec ${rec.id} references missing evidence ${evId}`).toBe(true);
        }
      }
    });

    it("resolves bidirectional trace lineage starting from SRC, EV, FND, and REC", () => {
      // Trace from Source
      const fromSrc = resolveTraceLineage("SRC-001", communityBridgesCase);
      expect(fromSrc.sourceId).toBe("SRC-001");
      expect(fromSrc.evidenceId).toBe("EV-001");
      expect(fromSrc.findingId).toBe("FND-001");
      expect(fromSrc.recId).toBe("REC-001");

      // Trace from Evidence
      const fromEv = resolveTraceLineage("EV-001", communityBridgesCase);
      expect(fromEv.sourceId).toBe("SRC-001");
      expect(fromEv.findingId).toBe("FND-001");
      expect(fromEv.recId).toBe("REC-001");

      // Trace from Finding
      const fromFnd = resolveTraceLineage("FND-001", communityBridgesCase);
      expect(fromFnd.sourceId).toBe("SRC-001");
      expect(fromFnd.evidenceId).toBe("EV-001");
      expect(fromFnd.recId).toBe("REC-001");

      // Trace from Recommendation
      const fromRec = resolveTraceLineage("REC-001", communityBridgesCase);
      expect(fromRec.sourceId).toBe("SRC-001");
      expect(fromRec.evidenceId).toBe("EV-001");
      expect(fromRec.findingId).toBe("FND-001");
    });
  });

  describe("Relational Integrity of School Nutrition Fixture", () => {
    it("ensures every evidence entry points to a valid source", () => {
      const sourceIds = new Set(nutritionFieldCase.sources.map((s) => s.id));
      for (const entry of nutritionFieldCase.evidence) {
        expect(sourceIds.has(entry.sourceId), `Evidence ${entry.id} references missing source ${entry.sourceId}`).toBe(true);
      }
    });

    it("ensures every finding references valid evidence and recommendations", () => {
      const evidenceIds = new Set(nutritionFieldCase.evidence.map((e) => e.id));
      const recIds = new Set(nutritionFieldCase.recommendations.map((r) => r.id));

      for (const finding of nutritionFieldCase.findings) {
        expect(finding.supportingEvidenceIds.length).toBeGreaterThan(0);
        for (const evId of finding.supportingEvidenceIds) {
          expect(evidenceIds.has(evId), `Finding ${finding.id} references missing evidence ${evId}`).toBe(true);
        }
        for (const recId of finding.linkedRecommendationIds) {
          expect(recIds.has(recId), `Finding ${finding.id} references missing rec ${recId}`).toBe(true);
        }
      }
    });

    it("resolves bidirectional trace lineage starting from NUT IDs", () => {
      const fromEv = resolveTraceLineage("EV-NUT-001", nutritionFieldCase);
      expect(fromEv.sourceId).toBe("SRC-NUT-001");
      expect(fromEv.findingId).toBe("FND-NUT-001");
      expect(fromEv.recId).toBe("REC-NUT-001");
    });
  });
});
