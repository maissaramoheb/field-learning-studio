import type { DemoCase } from "@/lib/types";
import { buildBriefExportModel } from "./buildBriefExportModel";
import { generateMarkdownFromModel } from "./exportMarkdown";

/**
 * Generates the learning brief markdown string from the canonical BriefExportModel.
 * Ensures 100% parity between the in-app preview, clipboard copy, and all downloadable formats.
 */
export function generateLearningBriefMarkdown(
  demoCase: DemoCase,
  includeSandbox: boolean = false
): string {
  const model = buildBriefExportModel(demoCase, includeSandbox);
  return generateMarkdownFromModel(model);
}
