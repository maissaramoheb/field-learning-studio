import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
} from "docx";
import {
  parseDocxDocument,
  isObviousNoise,
  cleanHtmlText,
  DocxParseError,
} from "@/lib/intake/docxParser";
import { importDocxSourcesAndObservations, DocxImportError } from "@/lib/intake/docxImporter";
import type { FieldStudy } from "@/lib/types";

// Helper to generate a DOCX buffer
async function createTestDocx(options: {
  headings?: string[];
  paragraphs?: string[];
  bullets?: string[];
  tableRows?: string[][];
  includeNoise?: boolean;
}): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  if (options.headings) {
    for (const h of options.headings) {
      children.push(new Paragraph({ text: h, heading: HeadingLevel.HEADING_1 }));
    }
  }

  if (options.paragraphs) {
    for (const p of options.paragraphs) {
      children.push(new Paragraph({ text: p }));
    }
  }

  if (options.bullets) {
    for (const b of options.bullets) {
      children.push(new Paragraph({ text: b, bullet: { level: 0 } }));
    }
  }

  if (options.tableRows && options.tableRows.length > 0) {
    children.push(
      new Table({
        rows: options.tableRows.map(
          (row) =>
            new TableRow({
              children: row.map(
                (cell) => new TableCell({ children: [new Paragraph(cell)] })
              ),
            })
        ),
      })
    );
  }

  if (options.includeNoise) {
    children.push(new Paragraph({ text: "Page 1 of 5" }));
    children.push(new Paragraph({ text: "   " }));
    children.push(new Paragraph({ text: "---" }));
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return await Packer.toBuffer(doc);
}

function createBaseStudy(id: string = "STUDY-TEST-01"): FieldStudy {
  return {
    id,
    title: "Test Learning Study",
    subtitle: "Evaluation study",
    context: "Field context",
    status: "Active Fieldwork",
    isDemoCase: false,
    executiveSummary: "",
    keyMessages: [],
    limitations: [],
    scope: {
      targetSites: ["Site Alpha", "Site Beta"],
      isSingleSiteStudy: false,
      targetStakeholderGroups: ["Clinicians", "Patients"],
    },
    sources: [],
    evidence: [],
    findings: [],
    lessons: [],
    goodPractices: [],
    recommendations: [],
    debriefs: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe("DOCX Field-Visit Intake Engine", () => {
  describe("1. Noise Filtering and HTML Text Normalization", () => {
    it("identifies obvious noise (page numbers, empty strings, punctuation lines)", () => {
      expect(isObviousNoise("")).toBe(true);
      expect(isObviousNoise("   ")).toBe(true);
      expect(isObviousNoise("1")).toBe(true);
      expect(isObviousNoise("Page 1")).toBe(true);
      expect(isObviousNoise("Page 1 of 4")).toBe(true);
      expect(isObviousNoise("p. 14")).toBe(true);
      expect(isObviousNoise("---")).toBe(true);
      expect(isObviousNoise("•")).toBe(true);
      expect(isObviousNoise("===")).toBe(true);

      // Real content must NOT be flagged as noise
      expect(isObviousNoise("Clinic opened at 8:00 AM.")).toBe(false);
      expect(isObviousNoise("Community elders reported high satisfaction.")).toBe(false);
    });

    it("cleans HTML entities and tags cleanly", () => {
      const html = "<p>Text with &amp; entity and &lt;tag&gt; and&nbsp;spaces</p>";
      expect(cleanHtmlText(html)).toBe("Text with & entity and <tag> and spaces");
    });
  });

  describe("2. Valid DOCX and Structural Extraction", () => {
    it("extracts headings, paragraphs, bullets, and table content deterministically", async () => {
      const buffer = await createTestDocx({
        headings: ["Field Observations - Facility 1"],
        paragraphs: [
          "Staff attendance was at 92% during the morning shift.",
          "Stockout of primary vaccines was reported for the third consecutive week.",
        ],
        bullets: [
          "Refrigeration unit was running at 4 degrees Celsius.",
          "Backup generator lacked diesel fuel.",
        ],
        tableRows: [
          ["Ward", "Patient Count", "Status"],
          ["Pediatrics", "28 patients", "Exceeded bed capacity"],
        ],
        includeNoise: true,
      });

      const parsed = await parseDocxDocument(buffer, "field_visit_day1.docx", 1);

      expect(parsed.title).toBe("field visit day1");
      expect(parsed.filename).toBe("field_visit_day1.docx");
      expect(parsed.headings).toContain("Field Observations - Facility 1");
      expect(parsed.candidateObservations.length).toBeGreaterThanOrEqual(4);

      // Verify paragraphs extracted
      const para1 = parsed.candidateObservations.find((o) =>
        o.originalText.includes("Staff attendance was at 92%")
      );
      expect(para1).toBeDefined();
      expect(para1?.segmentType).toBe("paragraph");
      expect(para1?.locationClue).toContain("Field Observations - Facility 1");

      // Verify bullets extracted
      const bullet1 = parsed.candidateObservations.find((o) =>
        o.originalText.includes("Refrigeration unit was running")
      );
      expect(bullet1).toBeDefined();
      expect(bullet1?.segmentType).toBe("bullet");

      // Verify table row extracted
      const tableRow = parsed.candidateObservations.find((o) =>
        o.originalText.includes("Pediatrics")
      );
      expect(tableRow).toBeDefined();
      expect(tableRow?.segmentType).toBe("table_row");

      // Verify noise like 'Page 1 of 5' was ignored
      const noise = parsed.candidateObservations.find((o) =>
        o.originalText.includes("Page 1 of 5")
      );
      expect(noise).toBeUndefined();
    });

    it("supports parsing multiple DOCX files concurrently", async () => {
      const buf1 = await createTestDocx({
        headings: ["KII with Clinic Director"],
        paragraphs: ["Director explained that budget delays caused supply bottlenecks."],
      });
      const buf2 = await createTestDocx({
        headings: ["FGD with Community Elders"],
        paragraphs: ["Elders noted transportation vouchers improved clinic attendance."],
      });

      const [res1, res2] = await Promise.all([
        parseDocxDocument(buf1, "interview_director.docx", 1),
        parseDocxDocument(buf2, "focus_group_elders.docx", 2),
      ]);

      expect(res1.filename).toBe("interview_director.docx");
      expect(res1.tempId).toBe("cand-src-1");
      expect(res2.filename).toBe("focus_group_elders.docx");
      expect(res2.tempId).toBe("cand-src-2");
      expect(res1.candidateObservations[0].originalText).toContain("Director explained");
      expect(res2.candidateObservations[0].originalText).toContain("Elders noted");
    });
  });

  describe("3. Error and Corrupt File Handling", () => {
    it("rejects unsupported non-DOCX file extension", async () => {
      const dummyBuffer = Buffer.from("hello world");
      await expect(
        parseDocxDocument(dummyBuffer, "report.pdf", 1)
      ).rejects.toThrowError(DocxParseError);

      await expect(
        parseDocxDocument(dummyBuffer, "notes.doc", 1)
      ).rejects.toThrowError("Unsupported file type");
    });

    it("rejects empty DOCX file", async () => {
      const emptyBuffer = Buffer.alloc(0);
      await expect(
        parseDocxDocument(emptyBuffer, "empty.docx", 1)
      ).rejects.toThrowError("File is empty (0 bytes)");
    });

    it("rejects corrupt binary DOCX file", async () => {
      const corruptBuffer = Buffer.from("Not a real zip or docx content at all");
      await expect(
        parseDocxDocument(corruptBuffer, "corrupt.docx", 1)
      ).rejects.toThrowError(/Corrupted or invalid Word document format/);
    });
  });

  describe("4. Methodological Honesty: Unknown Metadata Preservation", () => {
    it("preserves missing metadata as explicitly Unknown rather than inventing reassuring defaults", async () => {
      const buffer = await createTestDocx({
        paragraphs: ["Observation of drug distribution in district warehouse."],
      });

      const parsed = await parseDocxDocument(buffer, "warehouse_audit.docx", 1);

      // Method must not default to KII or Interview
      expect(parsed.isMethodUnspecified).toBe(true);
      expect(parsed.collectionMethod).toBe("Unspecified Method");

      // Date must not default to today's date silently
      expect(parsed.isDateUnknown).toBe(true);
      expect(parsed.date).toBe("");

      // Ethics must not default to reassuring Oral/Written consent or Anonymized
      expect(parsed.consentStatus).toBe("Restricted / Unclear");
      expect(parsed.anonymizationStatus).toBe("Identifiable / Restricted");

      // Warnings must be transparently surfaced
      expect(parsed.warnings.some((w) => w.includes("Unknown"))).toBe(true);
      expect(parsed.warnings.some((w) => w.includes("Unspecified"))).toBe(true);
    });
  });

  describe("5. Transactional Import & MEP-02 Safety Guarantees", () => {
    it("imports multiple DOCX sources and accepted observations with collision-free sequential IDs", async () => {
      const study = createBaseStudy("STUDY-001");
      study.sources = [
        {
          id: "SRC-001",
          studyId: "STUDY-001",
          title: "Existing Source",
          sourceType: "Key Informant Interview",
          date: "2026-09-01",
          stakeholderType: "Elders",
          location: "Site Alpha",
          summary: "Pre-existing summary",
          sensitivityFlag: "None",
        },
      ];
      study.evidence = [
        {
          id: "EV-001",
          studyId: "STUDY-001",
          sourceId: "SRC-001",
          stakeholderType: "Staff",
          rawEvidence: "Pre-existing evidence",
          primaryTheme: "Operational Execution",
          secondaryTheme: "General",
          evidenceStrength: "High",
          sensitivityFlag: "None",
          potentialFinding: "",
          qaStatus: "Reviewed",
          validationStatus: "Validated",
        },
      ];

      const buf1 = await createTestDocx({
        headings: ["Site A Field Notes"],
        paragraphs: ["Medical officer noted syringe shortages."],
      });
      const cand1 = await parseDocxDocument(buf1, "site_a_notes.docx", 1);
      cand1.date = "2026-09-25";
      cand1.isDateUnknown = false;
      cand1.siteId = "Site Alpha";
      cand1.collectionMethod = "Direct Observation";
      cand1.isMethodUnspecified = false;

      const buf2 = await createTestDocx({
        headings: ["Site B Field Notes"],
        paragraphs: ["Community leader reported water pump repairs delayed."],
        bullets: ["Community volunteered labor for pipeline trench."],
      });
      const cand2 = await parseDocxDocument(buf2, "site_b_notes.docx", 2);
      // Leave cand2 date and method unknown to test preservation
      cand2.siteId = "Site Beta";

      const importResult = await importDocxSourcesAndObservations(study, [cand1, cand2]);

      expect(importResult.studyId).toBe("STUDY-001");
      expect(importResult.sourcesCount).toBe(2);
      expect(importResult.createdSources.length).toBe(2);

      // Verify sequential ID generation starting after SRC-001
      expect(importResult.createdSources[0].id).toBe("SRC-002");
      expect(importResult.createdSources[1].id).toBe("SRC-003");
      expect(importResult.createdSources[0].studyId).toBe("STUDY-001");
      expect(importResult.createdSources[1].studyId).toBe("STUDY-001");

      // Verify candidate observations imported with sequential EV-002, EV-003, EV-004
      expect(importResult.evidenceCount).toBe(3);
      expect(importResult.createdEvidence[0].id).toBe("EV-002");
      expect(importResult.createdEvidence[1].id).toBe("EV-003");
      expect(importResult.createdEvidence[2].id).toBe("EV-004");

      // Verify parent linkage
      expect(importResult.createdEvidence[0].sourceId).toBe("SRC-002");
      expect(importResult.createdEvidence[1].sourceId).toBe("SRC-003");
      expect(importResult.createdEvidence[2].sourceId).toBe("SRC-003");

      // Verify study isolation: all records strictly have studyId === "STUDY-001"
      for (const e of importResult.createdEvidence) {
        expect(e.studyId).toBe("STUDY-001");
        expect(e.validationStatus).toBe("Draft");
        expect(e.qaStatus).toBe("Needs Review");
      }
    });

    it("respects practitioner accept, edit, and skip selections during import", async () => {
      const study = createBaseStudy("STUDY-002");
      const buffer = await createTestDocx({
        paragraphs: [
          "Candidate 1: Morning queue exceeded 40 patients.",
          "Candidate 2: Staff took afternoon tea break.",
          "Candidate 3: Solar inverter battery was depleted.",
        ],
      });

      const cand = await parseDocxDocument(buffer, "clinic_intake.docx", 1);
      expect(cand.candidateObservations.length).toBe(3);

      // Practitioner accepts candidate 0
      cand.candidateObservations[0].status = "accepted";

      // Practitioner edits candidate 1
      cand.candidateObservations[1].status = "edited";
      cand.candidateObservations[1].rawObservation = "Staff break occurred during clinic hours without relief coverage.";

      // Practitioner skips candidate 2
      cand.candidateObservations[2].status = "skipped";

      const importResult = await importDocxSourcesAndObservations(study, [cand]);

      // Only 2 observations should be imported (Candidate 1 and Candidate 2)
      expect(importResult.evidenceCount).toBe(2);

      const imported0 = importResult.createdEvidence.find((e) =>
        e.rawEvidence.includes("Morning queue exceeded 40 patients")
      );
      expect(imported0).toBeDefined();
      expect(imported0?.rawObservation).toBe("Candidate 1: Morning queue exceeded 40 patients.");

      const imported1 = importResult.createdEvidence.find((e) =>
        e.rawEvidence.includes("without relief coverage")
      );
      expect(imported1).toBeDefined();
      // Crucial: rawObservation retains original unedited text for auditability!
      expect(imported1?.rawObservation).toBe("Candidate 2: Staff took afternoon tea break.");

      // Skipped candidate 3 must not exist in imported evidence
      const imported2 = importResult.createdEvidence.find((e) =>
        e.rawEvidence.includes("Solar inverter")
      );
      expect(imported2).toBeUndefined();
    });

    it("preserves full Traceability: DOCX Filename -> Source -> Original Text -> Observation", async () => {
      const study = createBaseStudy("STUDY-TRACE-01");
      const buffer = await createTestDocx({
        headings: ["Community Governance Assessment"],
        paragraphs: [
          "Water committee has not held a general assembly in 14 months.",
        ],
      });

      const cand = await parseDocxDocument(buffer, "governance_review.docx", 1);
      const importResult = await importDocxSourcesAndObservations(study, [cand]);

      const source = importResult.createdSources[0];
      const evidence = importResult.createdEvidence[0];

      // Traceability checks
      expect(source.notes).toContain("governance_review.docx");
      expect(evidence.sourceId).toBe(source.id);
      expect(evidence.rawObservation).toBe("Water committee has not held a general assembly in 14 months.");
      expect(evidence.potentialFinding).toContain("Community Governance Assessment");
      expect(evidence.potentialFinding).toContain("Paragraph 1");
    });

    it("aborts transaction and throws if study ID is missing or target is invalid", async () => {
      const invalidStudy = { ...createBaseStudy(), id: "" };
      const buffer = await createTestDocx({ paragraphs: ["Some text"] });
      const cand = await parseDocxDocument(buffer, "test.docx", 1);

      await expect(
        importDocxSourcesAndObservations(invalidStudy, [cand])
      ).rejects.toThrowError(DocxImportError);
    });
  });
});
