import type { DemoCase, FieldStudy } from "@/lib/types";
import { assessProfessionalDraft, assertProfessionalExportReady } from "@/lib/professionalDraft";
import { sourceFileRepository } from "./sourceFileRepository";
import { assembleStudy } from "./studyStore";
import { buildBriefExportModel } from "@/lib/buildBriefExportModel";

export async function checkDraftFiles(study: FieldStudy | DemoCase): Promise<Record<string, boolean>> {
  const ids = assessProfessionalDraft(study).files;
  const entries = await Promise.all(ids.map(async id => {
    try {
      const [meta, content] = await Promise.all([sourceFileRepository.getFileMetadata(id), sourceFileRepository.getFileContent(id)]);
      return [id, Boolean(meta && content && meta.studyId === study.id && content.studyId === study.id && (content.blob || content.extractedText !== undefined))] as const;
    } catch { return [id, false] as const; }
  }));
  return Object.fromEntries(entries);
}

/** Re-read local records/files at download time rather than relying on preview authority. */
export async function prepareDraftExport(study: FieldStudy | DemoCase, includeSandbox: boolean, professionalExport: boolean) {
  const current = study.isDemoCase ? study : await assembleStudy(study.id);
  if (!current) throw new Error("Study unavailable; reload before exporting.");
  const fileAvailability = await checkDraftFiles(current);
  if (professionalExport) {
    if (includeSandbox) throw new Error("Sandbox drafts are excluded from professional export. Use a working draft instead.");
    assertProfessionalExportReady(current, fileAvailability);
  }
  const output = includeSandbox && !current.isDemoCase ? { ...current,
    sources: [...current.sources, ...study.sources.filter(record => record.id.includes("SBX") || record.id.includes("TEMP"))],
    evidence: [...current.evidence, ...study.evidence.filter(record => record.id.includes("SBX") || record.id.includes("TEMP"))],
    findings: [...current.findings, ...study.findings.filter(record => record.id.includes("SBX") || record.id.includes("TEMP"))],
    recommendations: [...current.recommendations, ...study.recommendations.filter(record => record.id.includes("SBX") || record.id.includes("TEMP"))],
  } : current;
  return buildBriefExportModel(output, includeSandbox, { fileAvailability, professionalExport });
}
