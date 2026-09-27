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
import { parseDocxDocument } from "@/lib/intake/docxParser";
import { importDocxSourcesAndObservations } from "@/lib/intake/docxImporter";
import { submitForReview, validateArtifact } from "@/lib/validation";
import { buildBriefExportModel } from "@/lib/buildBriefExportModel";
import { buildBriefDocxDocument } from "@/lib/exportDocx";
import type {
  FieldStudy,
  Finding,
  Recommendation,
} from "@/lib/types";

describe("DOCX Field-Visit Full Acceptance Journey (Requirement G)", () => {
  it("executes the complete practitioner journey from 3 realistic field DOCX files to professional export", async () => {
    // -------------------------------------------------------------
    // FIXTURE 1: Interview Notes (KII)
    // -------------------------------------------------------------
    const interviewDoc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: "Key Informant Interview: Dr. Salma El-Sayed, District Health Officer",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: "Date: 2026-09-18 | Location: Assiut District Health Directorate",
            }),
            new Paragraph({
              text: "Dr. Salma highlighted that cold chain equipment in peripheral health posts is operating beyond expected lifespan, leading to intermittent vaccine spoilage during peak summer heatwaves.",
            }),
            new Paragraph({
              text: "Budget allocations from central ministry for diesel generator fuel arrived 7 weeks late.",
              bullet: { level: 0 },
            }),
            new Paragraph({
              text: "District technicians improvised ice-pack rotations to prevent total batch spoilage.",
              bullet: { level: 0 },
            }),
          ],
        },
      ],
    });
    const interviewBuffer = await Packer.toBuffer(interviewDoc);

    // -------------------------------------------------------------
    // FIXTURE 2: Focus Group / Stakeholder Notes (FGD)
    // -------------------------------------------------------------
    const fgdDoc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: "Focus Group Discussion: Community Health Workers (CHWs)",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: "Date: 2026-09-19 | Location: Al-Amal Village Center",
            }),
            new Paragraph({
              text: "Six female community health workers reported that households in remote hamlets frequently decline vaccination visits when female mobilizers are not accompanied by community elders.",
            }),
            new Paragraph({
              text: "CHWs expressed exhaustion over unreimbursed motorcycle fuel costs for outreach visits.",
              bullet: { level: 0 },
            }),
            new Paragraph({
              text: "Mothers welcomed nutritional biscuits when distributed alongside vaccination sessions.",
              bullet: { level: 0 },
            }),
            new Paragraph({
              text: "Trivial formatting artifact to test skip selection.",
            }),
          ],
        },
      ],
    });
    const fgdBuffer = await Packer.toBuffer(fgdDoc);

    // -------------------------------------------------------------
    // FIXTURE 3: Field Observation / Report with Headings, Bullets & Table
    // -------------------------------------------------------------
    const fieldReportDoc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: "Field Site Inspection: Al-Amal Primary Healthcare Clinic",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: "Facility Cold Chain Verification & Physical Assessment",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              text: "Physical inspection of the main clinic revealed a functional solar-powered direct drive refrigerator, but temperature logging sheets were missing for the preceding 12 days.",
            }),
            new Paragraph({
              text: "Logistics Inventory Status",
              heading: HeadingLevel.HEADING_2,
            }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Item")] }),
                    new TableCell({ children: [new Paragraph("Status")] }),
                    new TableCell({ children: [new Paragraph("Condition")] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Solar Fridge 01")] }),
                    new TableCell({ children: [new Paragraph("Operational")] }),
                    new TableCell({ children: [new Paragraph("Temp logged 4C")] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Backup Battery Bank")] }),
                    new TableCell({ children: [new Paragraph("Degraded")] }),
                    new TableCell({ children: [new Paragraph("Runtime under 40 mins")] }),
                  ],
                }),
              ],
            }),
            new Paragraph({
              text: "Staff was present and registered 64 patient visits before noon.",
              bullet: { level: 0 },
            }),
          ],
        },
      ],
    });
    const fieldReportBuffer = await Packer.toBuffer(fieldReportDoc);

    // -------------------------------------------------------------
    // STEP 1: PARSE ALL 3 DOCX FILES
    // -------------------------------------------------------------
    const [cand1, cand2, cand3] = await Promise.all([
      parseDocxDocument(interviewBuffer, "interview_director_salma.docx", 1),
      parseDocxDocument(fgdBuffer, "fgd_chw_alamal.docx", 2),
      parseDocxDocument(fieldReportBuffer, "field_inspection_alamal_clinic.docx", 3),
    ]);

    expect(cand1.candidateObservations.length).toBeGreaterThanOrEqual(3);
    expect(cand2.candidateObservations.length).toBeGreaterThanOrEqual(4);
    expect(cand3.candidateObservations.length).toBeGreaterThanOrEqual(4);

    // -------------------------------------------------------------
    // STEP 2: CONFIRM / EDIT SOURCE METADATA (Practitioner control)
    // -------------------------------------------------------------
    // Source 1
    cand1.title = "KII with District Health Officer Dr. Salma";
    cand1.date = "2026-09-18";
    cand1.isDateUnknown = false;
    cand1.siteId = "Assiut District Directorate";
    cand1.stakeholderType = "District Health Leadership";
    cand1.collectionMethod = "Key Informant Interview";
    cand1.isMethodUnspecified = false;

    // Source 2
    cand2.title = "FGD with Community Health Workers";
    cand2.date = "2026-09-19";
    cand2.isDateUnknown = false;
    cand2.siteId = "Al-Amal Village";
    cand2.stakeholderType = "Community Health Workers";
    cand2.collectionMethod = "Focus Group Discussion";
    cand2.isMethodUnspecified = false;

    // Source 3
    cand3.title = "Physical Inspection of Al-Amal PHC";
    cand3.date = "2026-09-20";
    cand3.isDateUnknown = false;
    cand3.siteId = "Al-Amal PHC Clinic";
    cand3.stakeholderType = "Facility Staff";
    cand3.collectionMethod = "Direct Observation";
    cand3.isMethodUnspecified = false;

    // -------------------------------------------------------------
    // STEP 3: PRACTITIONER ACCEPTS, EDITS, AND SKIPS CANDIDATES
    // -------------------------------------------------------------
    // In cand2, practitioner skips the trivial artifact:
    const trivialObs = cand2.candidateObservations.find((o) =>
      o.originalText.includes("Trivial formatting artifact")
    );
    if (trivialObs) {
      trivialObs.status = "skipped";
    }

    // In cand1, practitioner edits candidate 1 to clarify practitioner phrasing:
    const coldChainObs = cand1.candidateObservations.find((o) =>
      o.originalText.includes("cold chain equipment in peripheral health posts")
    );
    expect(coldChainObs).toBeDefined();
    coldChainObs!.status = "edited";
    coldChainObs!.rawObservation =
      "Peripheral health posts experience recurrent cold chain vulnerabilities during summer heatwaves due to aging equipment.";

    // -------------------------------------------------------------
    // STEP 4: TRANSACTIONAL IMPORT INTO STUDY
    // -------------------------------------------------------------
    const initialStudy: FieldStudy = {
      id: "STUDY-DOCX-E2E",
      title: "Upper Egypt Child Immunization & Cold Chain Study",
      subtitle: "Operational evaluation across rural primary healthcare facilities",
      context: "Fieldwork conducted across Assiut and rural satellite clinics.",
      status: "Active Fieldwork",
      isDemoCase: false,
      executiveSummary: "Initial baseline assessment of rural cold chain resiliency.",
      keyMessages: ["Cold chain maintenance requires localized contingency protocols."],
      limitations: [
        "Road accessibility limited site inspections to 3 primary units.",
        "Observations reflect late-summer high-temperature operating conditions.",
      ],
      scope: {
        targetSites: ["Assiut District Directorate", "Al-Amal Village", "Al-Amal PHC Clinic"],
        isSingleSiteStudy: false,
        targetStakeholderGroups: [
          "District Health Leadership",
          "Community Health Workers",
          "Facility Staff",
        ],
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

    const importResult = await importDocxSourcesAndObservations(initialStudy, [
      cand1,
      cand2,
      cand3,
    ]);

    expect(importResult.sourcesCount).toBe(3);
    expect(importResult.createdSources.length).toBe(3);
    expect(importResult.createdEvidence.length).toBeGreaterThanOrEqual(8);

    // Verify all imported observations start in Draft and Needs Review
    for (const ev of importResult.createdEvidence) {
      expect(ev.validationStatus).toBe("Draft");
      expect(ev.qaStatus).toBe("Needs Review");
      expect(ev.studyId).toBe("STUDY-DOCX-E2E");
    }

    // Update study in-memory state
    initialStudy.sources = importResult.createdSources;
    initialStudy.evidence = importResult.createdEvidence;

    // -------------------------------------------------------------
    // STEP 5: EVIDENCE REVIEW & VALIDATION WORKFLOW
    // -------------------------------------------------------------
    const ev1 = initialStudy.evidence.find((e) =>
      e.rawEvidence.includes("recurrent cold chain vulnerabilities")
    )!;
    const ev2 = initialStudy.evidence.find((e) =>
      e.rawEvidence.includes("diesel generator fuel arrived 7 weeks late")
    )!;
    const ev3 = initialStudy.evidence.find((e) =>
      e.rawEvidence.includes("Backup Battery Bank")
    )!;
    // Challenging / divergent evidence:
    const ev4Divergent = initialStudy.evidence.find((e) =>
      e.rawEvidence.includes("improvised ice-pack rotations to prevent total batch spoilage")
    )!;

    expect(ev1).toBeDefined();
    expect(ev2).toBeDefined();
    expect(ev3).toBeDefined();
    expect(ev4Divergent).toBeDefined();

    // Human evaluation validation: first submit for review, then validate with reviewer name
    const valEv1 = validateArtifact(submitForReview(ev1), "Senior Evaluator Nora");
    const valEv2 = validateArtifact(submitForReview(ev2), "Senior Evaluator Nora");
    const valEv3 = validateArtifact(submitForReview(ev3), "Senior Evaluator Nora");
    const valEv4 = validateArtifact(submitForReview(ev4Divergent), "Senior Evaluator Nora");

    // Replace in study evidence list
    initialStudy.evidence = initialStudy.evidence.map((e) => {
      if (e.id === valEv1.id) return valEv1;
      if (e.id === valEv2.id) return valEv2;
      if (e.id === valEv3.id) return valEv3;
      if (e.id === valEv4.id) return valEv4;
      return e;
    });

    // -------------------------------------------------------------
    // STEP 6: SYNTHESIS - CREATE FINDING WITH SUPPORTING & DIVERGENT EVIDENCE
    // -------------------------------------------------------------
    const finding: Finding = {
      id: "FND-001",
      studyId: "STUDY-DOCX-E2E",
      statement:
        "Cold chain integrity in rural clinics is compromised by secondary power backup failures during seasonal heatwaves.",
      explanation:
        "Field observations and direct leadership interviews confirm that while solar refrigerators operate normally, battery degradation and delayed fuel allocations leave facilities vulnerable during grid outages.",
      supportingEvidenceIds: [valEv1.id, valEv2.id, valEv3.id],
      contradictoryEvidence:
        "Facility staff deployed manual ice-pack rotation protocols that temporarily prevented spoilage, mitigating losses despite equipment vulnerabilities.",
      contradictoryEvidenceIds: [valEv4.id],
      evidenceStrength: "High",
      programmeImplication:
        "Contingency fuel vouchers and battery maintenance cycles must be decentralized to district level.",
      linkedRecommendationIds: [],
      validationStatus: "Draft",
      revision: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Validate Finding: submit for review first
    const valFinding = validateArtifact(submitForReview(finding), "Lead Evaluator Karim");
    initialStudy.findings = [valFinding];

    // -------------------------------------------------------------
    // STEP 7: AUTHOR RECOMMENDATION LINKED TO FINDING & EVIDENCE BASE
    // -------------------------------------------------------------
    const recommendation: Recommendation = {
      id: "REC-001",
      studyId: "STUDY-DOCX-E2E",
      recommendation:
        "Establish an emergency decentralized fuel contingency fund and mandate bi-monthly battery bank diagnostic testing.",
      linkedFindingId: valFinding.id,
      evidenceBase: [valEv1.id, valEv2.id, valEv3.id],
      responsibleActor: "Directorate of Preventive Medicine & District Logistics Team",
      priority: "High",
      timeframe: "3-6 months",
      feasibility: "High feasibility using existing district operational contingency budgets",
      riskSensitivity: "Low risk; directly strengthens cold chain resilience",
      expectedBenefit: "Zero vaccine batch spoilage during subsequent summer seasons",
      successIndicator: "100% of peripheral units complete monthly power test logs",
      validationStatus: "Validated",
      revision: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    valFinding.linkedRecommendationIds = [recommendation.id];
    initialStudy.recommendations = [recommendation];

    // -------------------------------------------------------------
    // STEP 8: FINAL REVIEW & PROFESSIONAL EXPORT DRAFT GENERATION
    // -------------------------------------------------------------
    const exportModel = buildBriefExportModel(initialStudy, false);

    // Verify Qualifications and Methodology
    expect(exportModel.title).toContain("Upper Egypt Child Immunization & Cold Chain Study");
    expect(exportModel.limitations).toContain(
      "Road accessibility limited site inspections to 3 primary units."
    );

    // Verify Finding and Evidence Base Traceability
    expect(exportModel.findings.length).toBe(1);
    const expFinding = exportModel.findings[0];
    expect(expFinding.id).toBe("FND-001");
    expect(expFinding.evidenceBase).toEqual([valEv1.id, valEv2.id, valEv3.id]);

    // Verify Linked Recommendation
    expect(exportModel.recommendations.length).toBe(1);
    const expRec = exportModel.recommendations[0];
    expect(expRec.id).toBe("REC-001");
    expect(expRec.linkedFindingId).toBe("FND-001");

    // Verify Traceability mapping
    expect(exportModel.traceability.length).toBeGreaterThan(0);
    const trace = exportModel.traceability.find((t) => t.findingId === "FND-001");
    expect(trace).toBeDefined();
    expect(trace?.evidenceIds).toContain(valEv1.id);
    expect(trace?.recommendationIds).toContain("REC-001");

    // -------------------------------------------------------------
    // STEP 9: GENERATE PROFESSIONAL WORD DRAFT (.DOCX)
    // -------------------------------------------------------------
    const docxDocument = buildBriefDocxDocument(exportModel);
    expect(docxDocument).toBeDefined();
    const docxBlobBuffer = await Packer.toBuffer(docxDocument);
    expect(docxBlobBuffer.length).toBeGreaterThan(1000);

    // Re-verify that generated DOCX can be parsed back and retains content
    const reParsedDocx = await parseDocxDocument(
      docxBlobBuffer,
      "generated_field_brief.docx",
      99
    );
    expect(reParsedDocx.rawText).toContain("Upper Egypt Child Immunization");
    expect(reParsedDocx.rawText).toContain("Cold chain integrity in rural clinics");
  });
});
