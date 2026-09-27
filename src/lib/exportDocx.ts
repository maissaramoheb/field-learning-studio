import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { BriefExportModel } from "./buildBriefExportModel";

function createParagraph(
  text: string,
  options: {
    bold?: boolean;
    italic?: boolean;
    size?: number;
    heading?: "Heading1" | "Heading2" | "Heading3" | "Heading4" | "Heading5" | "Heading6" | "Title";
    bullet?: boolean;
    spaceBefore?: number;
    spaceAfter?: number;
    color?: string;
  } = {},
): Paragraph {
  return new Paragraph({
    heading: options.heading,
    bullet: options.bullet ? { level: 0 } : undefined,
    spacing: {
      before: options.spaceBefore !== undefined ? options.spaceBefore : (options.heading ? 240 : 0),
      after: options.spaceAfter !== undefined ? options.spaceAfter : 120,
    },
    children: [
      new TextRun({
        text,
        font: "Arial",
        bold: options.bold,
        italics: options.italic,
        size: options.size || 22, // default 11pt
        color: options.color,
      }),
    ],
  });
}

export function buildBriefDocxDocument(model: BriefExportModel): Document {
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    createParagraph(model.title, {
      bold: true,
      size: 48, // 24pt
      spaceBefore: 0,
      spaceAfter: 120,
      color: "2563eb", // blue-600
    }),
  );

  // Subtitle
  children.push(
    createParagraph(model.subtitle, {
      italic: true,
      size: 24, // 12pt
      spaceAfter: 360,
      color: "475569", // slate-600
    }),
  );

  // Metadata block (simple clean tables rather than over-styled block)
  const metadataTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [createParagraph("Date Generated", { bold: true, size: 20 })],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            children: [createParagraph(model.generatedDate, { size: 20 })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [createParagraph("Context Mode", { bold: true, size: 20 })],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            children: [createParagraph(model.demoNote, { size: 20 })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [createParagraph("Review Status", { bold: true, size: 20 })],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            children: [createParagraph(model.reviewNote, { size: 20 })],
          }),
        ],
      }),
    ],
  });

  children.push(metadataTable);
  // Add some space
  children.push(createParagraph("", { spaceAfter: 240 }));

  // Executive Summary
  children.push(
    createParagraph("Executive Summary", {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 32, // 16pt
      color: "1e3a8a", // navy-900
      spaceBefore: 360,
      spaceAfter: 120,
    }),
  );
  children.push(createParagraph(model.executiveSummary));

  // Key Messages
  children.push(
    createParagraph("Key Messages", {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 32,
      color: "1e3a8a",
      spaceBefore: 360,
      spaceAfter: 120,
    }),
  );
  model.keyMessages.forEach(msg => {
    children.push(createParagraph(msg, { bullet: true }));
  });

  // Purpose and Scope
  if (model.purposeAndScope) {
    children.push(
      createParagraph("Purpose and Scope", {
        heading: HeadingLevel.HEADING_2,
        bold: true,
        size: 32,
        color: "1e3a8a",
        spaceBefore: 360,
        spaceAfter: 120,
      }),
    );
    children.push(createParagraph(model.purposeAndScope));
  }

  // Key Themes
  if (model.keyThemes && model.keyThemes.length > 0) {
    children.push(
      createParagraph("Key Themes", {
        heading: HeadingLevel.HEADING_2,
        bold: true,
        size: 32,
        color: "1e3a8a",
        spaceBefore: 360,
        spaceAfter: 120,
      }),
    );
    model.keyThemes.forEach(theme => {
      children.push(createParagraph(theme, { bullet: true }));
    });
  }

  // Main Findings
  children.push(
    createParagraph("Main Findings", {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 32,
      color: "1e3a8a",
      spaceBefore: 360,
      spaceAfter: 120,
    }),
  );
  model.findings.forEach(finding => {
    children.push(
      createParagraph(`${finding.id}: ${finding.statement}`, {
        heading: HeadingLevel.HEADING_3,
        bold: true,
        size: 26, // 13pt
        color: "1e293b",
        spaceBefore: 240,
        spaceAfter: 120,
      }),
    );
    children.push(createParagraph(finding.explanation));
    children.push(
      createParagraph(`Evidence base: ${finding.evidenceBase.join(", ")}`, {
        italic: true,
        size: 20,
        color: "475569",
      }),
    );
    children.push(
      createParagraph(`Programme implication: ${finding.programmeImplication}`, {
        size: 20,
        color: "1e293b",
      }),
    );
  });

  // Lessons Learned
  if (model.lessons && model.lessons.length > 0) {
    children.push(
      createParagraph("Lessons Learned", {
        heading: HeadingLevel.HEADING_2,
        bold: true,
        size: 32,
        color: "1e3a8a",
        spaceBefore: 360,
        spaceAfter: 120,
      }),
    );
    model.lessons.forEach(lesson => {
      children.push(
        createParagraph(`${lesson.id}: ${lesson.statement}`, {
          heading: HeadingLevel.HEADING_3,
          bold: true,
          size: 26,
          color: "1e293b",
          spaceBefore: 240,
          spaceAfter: 120,
        }),
      );
      children.push(
        createParagraph(`What worked / did not work: ${lesson.whatWorkedOrDidNotWork}`),
      );
      children.push(createParagraph(`Why it happened: ${lesson.whyItHappened}`));
      children.push(createParagraph(`Conditions required: ${lesson.conditionsRequired}`));
      children.push(
        createParagraph(`Evidence base: ${lesson.evidenceBase.join(", ")}`, {
          italic: true,
          size: 20,
          color: "475569",
        }),
      );
      children.push(
        createParagraph(`Transferability: ${lesson.transferability}`, {
          size: 20,
          color: "1e293b",
        }),
      );
    });
  }

  // Good Practices
  if (model.goodPractices && model.goodPractices.length > 0) {
    children.push(
      createParagraph("Good Practices", {
        heading: HeadingLevel.HEADING_2,
        bold: true,
        size: 32,
        color: "1e3a8a",
        spaceBefore: 360,
        spaceAfter: 120,
      }),
    );
    model.goodPractices.forEach(practice => {
      children.push(
        createParagraph(`${practice.id}: ${practice.title}`, {
          heading: HeadingLevel.HEADING_3,
          bold: true,
          size: 26,
          color: "1e293b",
          spaceBefore: 240,
          spaceAfter: 120,
        }),
      );
      children.push(createParagraph(practice.description));
      children.push(createParagraph(`Why it worked: ${practice.whyItWorked}`));
      children.push(
        createParagraph(`Evidence base: ${practice.evidenceBase.join(", ")}`, {
          italic: true,
          size: 20,
          color: "475569",
        }),
      );
      children.push(
        createParagraph(`Conditions for replication: ${practice.conditionsForReplication}`),
      );
      children.push(createParagraph(`Risks / limits: ${practice.risksLimits}`));
      children.push(
        createParagraph(`Recommended use: ${practice.recommendedUse}`, {
          size: 20,
          color: "1e293b",
        }),
      );
    });
  }

  // Recommendations
  children.push(
    createParagraph("Recommendations", {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 32,
      color: "1e3a8a",
      spaceBefore: 360,
      spaceAfter: 120,
    }),
  );
  model.recommendations.forEach(rec => {
    children.push(
      createParagraph(`${rec.id}: ${rec.recommendation}`, {
        heading: HeadingLevel.HEADING_3,
        bold: true,
        size: 26,
        color: "1e293b",
        spaceBefore: 240,
        spaceAfter: 120,
      }),
    );
    children.push(createParagraph(`Linked finding: ${rec.linkedFindingId}`));
    children.push(
      createParagraph(`Evidence base: ${rec.evidenceBase.join(", ")}`, {
        italic: true,
        size: 20,
        color: "475569",
      }),
    );
    children.push(createParagraph(`Responsible actor: ${rec.responsibleActor}`));
    children.push(createParagraph(`Priority: ${rec.priority}`));
    children.push(createParagraph(`Timeframe: ${rec.timeframe}`));
    children.push(createParagraph(`Feasibility: ${rec.feasibility}`));
    children.push(createParagraph(`Risk / sensitivity: ${rec.riskSensitivity}`));
    children.push(createParagraph(`Expected benefit: ${rec.expectedBenefit}`));
    children.push(
      createParagraph(`Success indicator: ${rec.successIndicator}`, {
        size: 20,
        color: "1e293b",
      }),
    );
  });

  // Safeguarding Notes
  if (model.safeguardingNotes) {
    children.push(
      createParagraph("Safeguarding and Sensitivity Notes", {
        heading: HeadingLevel.HEADING_2,
        bold: true,
        size: 32,
        color: "1e3a8a",
        spaceBefore: 360,
        spaceAfter: 120,
      }),
    );
    children.push(createParagraph(model.safeguardingNotes));
  }

  // Sandbox Draft Evidence — Requires Review
  if (model.includeSandbox && model.sandboxEvidence && model.sandboxEvidence.length > 0) {
    children.push(
      createParagraph("Sandbox Draft Evidence — Requires Review", {
        heading: HeadingLevel.HEADING_2,
        bold: true,
        size: 32,
        color: "b45309",
        spaceBefore: 360,
        spaceAfter: 120,
      }),
    );
    children.push(
      createParagraph(
        "Sandbox Warning: Sandbox draft content is user-provided, local-only, and not validated.",
        { bold: true, color: "b45309", italic: true },
      ),
    );

    model.sandboxEvidence.forEach((e) => {
      children.push(
        createParagraph(`${e.id}`, {
          heading: HeadingLevel.HEADING_3,
          bold: true,
          size: 26,
          color: "1e293b",
          spaceBefore: 240,
          spaceAfter: 120,
        }),
      );
      children.push(createParagraph(`Evidence ID: ${e.id}`));
      children.push(createParagraph(`Source ID: ${e.sourceId}`));
      children.push(createParagraph(`Stakeholder: ${e.stakeholderType}`));
      children.push(createParagraph(`Observation Summary: ${e.rawEvidence}`));
      children.push(createParagraph(`Theme: ${e.primaryTheme}`));
      children.push(createParagraph(`Sensitivity: ${e.sensitivityFlag}`));
      if (e.draftFindingId) {
        children.push(createParagraph(`Draft Finding: ${e.draftFindingId} - ${e.draftFindingStatement}`));
      }
      if (e.draftRecommendationId) {
        children.push(createParagraph(`Draft Recommendation: ${e.draftRecommendationId} - ${e.draftRecommendationStatement}`));
      }
    });
  }

  // Limitations
  children.push(
    createParagraph("Limitations", {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 32,
      color: "1e3a8a",
      spaceBefore: 360,
      spaceAfter: 120,
    }),
  );
  model.limitations.forEach(lim => {
    children.push(createParagraph(lim, { bullet: true }));
  });

  // Annex: Traceability Summary
  children.push(
    createParagraph("Annex: Traceability Summary", {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 32,
      color: "1e3a8a",
      spaceBefore: 360,
      spaceAfter: 120,
    }),
  );
  model.traceability.forEach(trace => {
    children.push(
      createParagraph(
        `${trace.findingId}: evidence ${trace.evidenceIds.join(", ")} -> recommendations ${trace.recommendationIds.join(", ")}`,
        { bullet: true },
      ),
    );
  });

  // Safety Note
  children.push(
    createParagraph("Safety Note", {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      size: 32,
      color: "b45309", // amber-700
      spaceBefore: 360,
      spaceAfter: 120,
    }),
  );
  children.push(createParagraph(model.safetyNote, { italic: true, color: "b45309" }));

  // Create the Document
  return new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });
}

export function downloadBriefDocx(model: BriefExportModel): void {
  const doc = buildBriefDocxDocument(model);

  // Pack and Download
  Packer.toBlob(doc).then(blob => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const dateStr = new Date().toISOString().split("T")[0];
    link.download = `field-learning-brief-${model.caseId}-${dateStr}.docx`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}
