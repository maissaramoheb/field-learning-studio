import mammoth from "mammoth";
import type {
  DocxSourceCandidate,
  DocxCandidateObservation,
  DocxCandidateStatus,
} from "./docxTypes";

export class DocxParseError extends Error {
  constructor(message: string, public readonly filename: string) {
    super(`Error parsing "${filename}": ${message}`);
    this.name = "DocxParseError";
  }
}

/**
 * Checks whether a text snippet is obvious noise (page numbers, tiny formatting crumbs).
 */
export function isObviousNoise(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  // Page number patterns: "1", "12", "Page 1", "Page 1 of 5", "p. 12"
  if (/^(?:page\s+)?\d+(?:\s*(?:of|\/)\s*\d+)?$/i.test(trimmed)) {
    return true;
  }
  if (/^p\.\s*\d+$/i.test(trimmed)) {
    return true;
  }

  // Very short formatting crumbs (single punctuation marks, isolated brackets, bullets)
  if (/^[-*•_~–—=+#/\\|]+$/.test(trimmed)) {
    return true;
  }

  // Under 2 characters that are non-alphanumeric or trivial
  if (trimmed.length < 3 && !/[a-zA-Z0-9]/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Strips HTML tags and normalizes whitespace while preserving readable text.
 */
export function cleanHtmlText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts candidate observation segments from Mammoth HTML output deterministically.
 */
export function extractObservationsFromHtml(
  html: string,
  sourceTempId: string,
  sourceFilename: string,
  defaultTheme: string = "Operational Execution"
): { observations: DocxCandidateObservation[]; headings: string[] } {
  const observations: DocxCandidateObservation[] = [];
  const headings: string[] = [];

  // Match top-level or block semantic tags: h1-h6, p, li, tr
  const blockRegex = /<(h[1-6]|p|li|tr)[^>]*>([\s\S]*?)<\/\1>/gi;

  let currentHeading = "";
  let paragraphIndexUnderHeading = 0;
  let overallSegmentIndex = 0;
  let tableIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const innerHtml = match[2];
    const text = cleanHtmlText(innerHtml);

    if (isObviousNoise(text)) {
      continue;
    }

    if (tag.startsWith("h")) {
      currentHeading = text;
      paragraphIndexUnderHeading = 0;
      headings.push(text);
      continue;
    }

    overallSegmentIndex += 1;
    let locationClue = "";
    let segmentType: DocxCandidateObservation["segmentType"] = "paragraph";

    if (tag === "li") {
      segmentType = "bullet";
      locationClue = currentHeading
        ? `${currentHeading} › Bullet ${overallSegmentIndex}`
        : `Bullet ${overallSegmentIndex}`;
    } else if (tag === "tr") {
      segmentType = "table_row";
      // If table row has multiple cells, clean text provides cell contents joined by spaces
      tableIndex += 1;
      locationClue = currentHeading
        ? `${currentHeading} › Table Row ${tableIndex}`
        : `Table Row ${tableIndex}`;
    } else {
      paragraphIndexUnderHeading += 1;
      segmentType = "paragraph";
      locationClue = currentHeading
        ? `${currentHeading} › Paragraph ${paragraphIndexUnderHeading}`
        : `Paragraph ${overallSegmentIndex}`;
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    // Require at least 2 words to form a candidate observation
    if (wordCount < 2) {
      continue;
    }

    observations.push({
      tempId: `cand-obs-${sourceTempId}-${overallSegmentIndex}`,
      sourceTempId,
      sourceFilename,
      locationClue,
      headingContext: currentHeading || undefined,
      originalText: text,
      rawObservation: text,
      primaryTheme: defaultTheme,
      secondaryTheme: "General",
      evidenceStrength: "Medium",
      sensitivityFlag: "None",
      status: "accepted" as DocxCandidateStatus, // Pre-selected by default so practitioner can review & accept or skip
      segmentType,
      segmentIndex: overallSegmentIndex,
      wordCount,
    });
  }

  return { observations, headings };
}

/**
 * Parses a single DOCX file (ArrayBuffer or Buffer) into a DocxSourceCandidate.
 */
export async function parseDocxDocument(
  fileData: ArrayBuffer | Buffer,
  filename: string,
  tempIdIndex: number = 1
): Promise<DocxSourceCandidate> {
  const cleanFilename = filename.trim();
  if (!cleanFilename.toLowerCase().endsWith(".docx")) {
    throw new DocxParseError("Unsupported file type. Only .docx Word files are supported.", cleanFilename);
  }

  // Ensure file data is non-empty
  const byteLength = "byteLength" in fileData ? fileData.byteLength : (fileData as Buffer).length;
  if (!byteLength || byteLength === 0) {
    throw new DocxParseError("File is empty (0 bytes).", cleanFilename);
  }

  let htmlResult: mammoth.ConvertResult;
  let rawTextResult: mammoth.ConvertResult;

  try {
    const inputOption = Buffer.isBuffer(fileData)
      ? { buffer: fileData }
      : { arrayBuffer: fileData };

    [htmlResult, rawTextResult] = await Promise.all([
      mammoth.convertToHtml(inputOption),
      mammoth.extractRawText(inputOption),
    ]);
  } catch (err) {
    throw new DocxParseError(
      `Corrupted or invalid Word document format: ${err instanceof Error ? err.message : String(err)}`,
      cleanFilename
    );
  }

  const rawText = rawTextResult.value.trim();
  if (!rawText) {
    throw new DocxParseError("Document contains no readable text content.", cleanFilename);
  }

  const tempId = `cand-src-${tempIdIndex}`;
  const baseTitle = cleanFilename.replace(/\.docx$/i, "").replace(/[_-]+/g, " ");

  const { observations, headings } = extractObservationsFromHtml(
    htmlResult.value,
    tempId,
    cleanFilename
  );

  const warnings: string[] = [];
  const errors: string[] = [];

  if (observations.length === 0) {
    warnings.push("No candidate observations could be segmented from document text.");
  }

  // Unknown metadata remains explicitly unknown
  const isDateUnknown = true;
  const isMethodUnspecified = true;
  warnings.push("Field material date is not specified (recorded as Unknown).");
  warnings.push("Collection method is not specified (recorded as Unspecified Method).");

  return {
    tempId,
    filename: cleanFilename,
    fileSizeBytes: byteLength,
    importedAt: Date.now(),
    title: baseTitle,
    date: "",
    isDateUnknown,
    siteId: "",
    stakeholderType: "",
    collectionMethod: "Unspecified Method",
    isMethodUnspecified,
    consentStatus: "Restricted / Unclear",
    anonymizationStatus: "Identifiable / Restricted",
    sensitivityFlag: "None",
    notes: `Imported from ${cleanFilename}`,
    rawText,
    htmlContent: htmlResult.value,
    headings,
    candidateObservations: observations,
    warnings,
    errors,
  };
}
