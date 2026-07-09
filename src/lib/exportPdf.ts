import React from "react";
import { BriefExportModel } from "./buildBriefExportModel";

export async function downloadBriefPdf(model: BriefExportModel): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const { LearningBriefPdfDocument } = await import("../components/export/LearningBriefPdfDocument");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(React.createElement(LearningBriefPdfDocument, { model }) as any).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  const dateStr = new Date().toISOString().split("T")[0];
  link.download = `field-learning-brief-${model.caseId}-${dateStr}.pdf`;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
