import type {
  ConsentStatus,
  AnonymizationStatus,
  SensitivityFlag,
  CollectionMethod,
  StudyScopeConfig,
  SourceRecord,
  SourceRecordId,
} from "@/lib/types";
import { scanNarrativeSafety } from "@/lib/sandboxParser";
import { checkSourceDuplicate } from "./duplicateDetector";
import type { ParsedSourceCandidate } from "./structuredTextParser";

export type StandardSourceField =
  | "title"
  | "date"
  | "siteId"
  | "stakeholderType"
  | "collectionMethod"
  | "collectorName"
  | "consentStatus"
  | "anonymizationStatus"
  | "sensitivityFlag"
  | "narrative"
  | "ignore";

export interface TabularParseResult {
  headers: string[];
  rows: string[][];
  delimiter: "," | "\t" | ";";
  totalRawRows: number;
}

/**
 * Robust RFC 4180 compliant CSV / TSV string parser.
 * Handles quoted fields, escaped quotes (""), newlines within quotes, and arbitrary delimiters.
 */
export function parseCsvOrTsv(rawText: string): TabularParseResult {
  if (!rawText || !rawText.trim()) {
    return { headers: [], rows: [], delimiter: ",", totalRawRows: 0 };
  }

  // Detect delimiter from first non-empty lines
  const firstLine = rawText.split(/\r?\n/).find((l) => l.trim().length > 0) || "";
  let delimiter: "," | "\t" | ";" = ",";
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;

  if (tabCount > commaCount && tabCount > semiCount) {
    delimiter = "\t";
  } else if (semiCount > commaCount) {
    delimiter = ";";
  } else {
    delimiter = ",";
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;
  let i = 0;
  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = "";
        i++;
        continue;
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        currentField = "";
        // Check if row has any non-empty fields
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push final field/row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], delimiter, totalRawRows: 0 };
  }

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  return {
    headers,
    rows: dataRows,
    delimiter,
    totalRawRows: dataRows.length,
  };
}

/**
 * Suggests default column mappings based on common field names.
 */
export function suggestColumnMappings(
  headers: string[]
): Record<number, StandardSourceField> {
  const mapping: Record<number, StandardSourceField> = {};

  headers.forEach((header, index) => {
    const norm = header.toLowerCase().replace(/[\s_-]+/g, "").trim();

    if (/title/i.test(norm) || /^(name|source|interviewname|recordname)$/.test(norm)) {
      mapping[index] = "title";
    } else if (/date/i.test(norm) || /^(day)$/.test(norm)) {
      mapping[index] = "date";
    } else if (/site|location/i.test(norm) || /^(district|community|school|place)$/.test(norm)) {
      mapping[index] = "siteId";
    } else if (/stakeholder|participant|respondent/i.test(norm) || /^(role|group)$/.test(norm)) {
      mapping[index] = "stakeholderType";
    } else if (/method/i.test(norm) || /^(sourcetype|type)$/.test(norm)) {
      mapping[index] = "collectionMethod";
    } else if (/collector|interviewer/i.test(norm) || /^(researcher|author|lead)$/.test(norm)) {
      mapping[index] = "collectorName";
    } else if (/consent/i.test(norm)) {
      mapping[index] = "consentStatus";
    } else if (/anon/i.test(norm)) {
      mapping[index] = "anonymizationStatus";
    } else if (/sensit/i.test(norm) || /^(risk|flag)$/.test(norm)) {
      mapping[index] = "sensitivityFlag";
    } else if (/note|narrative|transcript|content|observation|quote|excerpt/i.test(norm) || /^(text|summary)$/.test(norm)) {
      mapping[index] = "narrative";
    } else {
      mapping[index] = "ignore";
    }
  });

  return mapping;
}

const KNOWN_METHODS: Record<string, CollectionMethod> = {
  "key informant interview": "Key Informant Interview",
  "kii": "Key Informant Interview",
  "interview": "Key Informant Interview",
  "focus group discussion": "Focus Group Discussion",
  "fgd": "Focus Group Discussion",
  "focus group": "Focus Group Discussion",
  "direct observation": "Direct Observation",
  "observation": "Direct Observation",
  "document review": "Document Review",
  "document": "Document Review",
  "community meeting": "Community Meeting",
  "survey / questionnaire": "Survey / Questionnaire",
  "survey": "Survey / Questionnaire",
  "questionnaire": "Survey / Questionnaire",
};

const KNOWN_CONSENT: Record<string, ConsentStatus> = {
  "written": "Written",
  "oral": "Oral",
  "verbal": "Oral",
  "not required": "Not Required / Public Source",
  "not required / public source": "Not Required / Public Source",
  "public": "Not Required / Public Source",
  "restricted / unclear": "Restricted / Unclear",
  "unclear": "Restricted / Unclear",
  "restricted": "Restricted / Unclear",
};

const KNOWN_ANON: Record<string, AnonymizationStatus> = {
  "anonymized": "Anonymized",
  "pseudonymized": "Pseudonymized",
  "identifiable": "Identifiable / Restricted",
  "identifiable / restricted": "Identifiable / Restricted",
  "restricted": "Identifiable / Restricted",
};

const KNOWN_SENSITIVITY: Record<string, SensitivityFlag> = {
  "none": "None",
  "low": "Low",
  "medium": "Medium",
  "high": "High",
};

/**
 * Converts tabular rows into parsed Source candidates using confirmed column mappings.
 */
export function convertTabularRowsToSourceCandidates(
  rows: string[][],
  columnMapping: Record<number, StandardSourceField>,
  scope: StudyScopeConfig,
  existingSources: SourceRecord[] = [],
  defaultDate: string = new Date().toISOString().slice(0, 10),
  importFilename?: string
): ParsedSourceCandidate[] {
  const candidates: ParsedSourceCandidate[] = [];
  const batchSeen: SourceRecord[] = [...existingSources];

  rows.forEach((row, rowIndex) => {
    // If all cells in row are empty, skip row safely
    if (!row.some((cell) => cell.trim().length > 0)) {
      return;
    }

    const fieldMap: Partial<Record<StandardSourceField, string>> = {};
    row.forEach((cell, colIndex) => {
      const field = columnMapping[colIndex];
      if (field && field !== "ignore") {
        fieldMap[field] = cell ? cell.trim() : "";
      }
    });

    const title = fieldMap.title || `Row ${rowIndex + 1}`;

    // Explicit date validation & handling
    const rawDate = (fieldMap.date || "").trim();
    let date = rawDate;
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!rawDate) {
      date = defaultDate || "";
      if (!defaultDate) {
        warnings.push("Date is missing; recorded with empty date.");
      } else {
        warnings.push(`Date omitted in tabular data; applied default date ${defaultDate}.`);
      }
    } else if (isNaN(Date.parse(rawDate))) {
      warnings.push(`Date "${rawDate}" is not a recognized date format.`);
    }

    const siteId = fieldMap.siteId || "Unspecified Site";
    const stakeholderType = fieldMap.stakeholderType || "Unspecified Stakeholder";
    const collectorName = fieldMap.collectorName || undefined;
    const narrative = fieldMap.narrative || "";

    // Method normalization: Unknown metadata remains unknown (no silent KII default)
    const rawMethod = (fieldMap.collectionMethod || "").toLowerCase().trim();
    const collectionMethod = KNOWN_METHODS[rawMethod] || (rawMethod ? fieldMap.collectionMethod! : "Unspecified Method");
    if (!rawMethod) {
      warnings.push("Collection method omitted; recorded as 'Unspecified Method'.");
    }

    // Ethics defaults: Missing consent/anonymization NEVER assumed oral/written/anonymized!
    const rawConsent = (fieldMap.consentStatus || "").toLowerCase().trim();
    const consentStatus: ConsentStatus = KNOWN_CONSENT[rawConsent] || "Restricted / Unclear";

    const rawAnon = (fieldMap.anonymizationStatus || "").toLowerCase().trim();
    const anonymizationStatus: AnonymizationStatus = KNOWN_ANON[rawAnon] || "Identifiable / Restricted";

    const rawSens = (fieldMap.sensitivityFlag || "").toLowerCase().trim();
    const sensitivityFlag: SensitivityFlag = KNOWN_SENSITIVITY[rawSens] || "None";

    if (!fieldMap.title) {
      errors.push("Missing required field: Title");
    }
    if (!narrative) {
      warnings.push("Narrative text is empty; source will have no text for observation extraction.");
    }
    if (consentStatus === "Restricted / Unclear") {
      warnings.push("Consent status missing or unclear (defaulted to 'Restricted / Unclear').");
    }
    if (anonymizationStatus === "Identifiable / Restricted") {
      warnings.push("Anonymization status unverified (defaulted to 'Identifiable / Restricted').");
    }

    // Safety scan
    const safetyScan = scanNarrativeSafety(narrative);
    if (safetyScan.hasWarning) {
      warnings.push(...safetyScan.warnings.map((w) => `Safety flag: ${w}`));
    }

    // Scope check
    const isNewSite = Boolean(
      siteId &&
        siteId !== "Unspecified Site" &&
        scope.targetSites &&
        scope.targetSites.length > 0 &&
        !scope.targetSites.some((s) => s.toLowerCase() === siteId.toLowerCase())
    );
    if (isNewSite) {
      warnings.push(`Site "${siteId}" is not in current study scope.`);
    }

    const isNewStakeholder = Boolean(
      stakeholderType &&
        stakeholderType !== "Unspecified Stakeholder" &&
        scope.targetStakeholderGroups &&
        scope.targetStakeholderGroups.length > 0 &&
        !scope.targetStakeholderGroups.some((s) => s.toLowerCase() === stakeholderType.toLowerCase())
    );
    if (isNewStakeholder) {
      warnings.push(`Stakeholder "${stakeholderType}" is not in current study scope.`);
    }

    const isNewMethod = Boolean(
      scope.expectedMethods &&
        scope.expectedMethods.length > 0 &&
        !scope.expectedMethods.some((m) => m.toLowerCase() === collectionMethod.toLowerCase())
    );

    // Duplicate check
    const duplicateCheck = checkSourceDuplicate(
      {
        title,
        date,
        rawText: narrative,
        summary: narrative.slice(0, 150),
      },
      batchSeen
    );

    let status: ParsedSourceCandidate["status"] = "ready";
    if (errors.length > 0) {
      status = "error";
    } else if (duplicateCheck.isDuplicate) {
      status = "duplicate";
      warnings.push(`Duplicate detected: ${duplicateCheck.duplicateReason}`);
    } else if (warnings.length > 0) {
      status = "needs_review";
    }

    const provenancePrefix = importFilename ? `Imported from ${importFilename}. ` : "";
    const summary = `${provenancePrefix}${narrative.slice(0, 200).replace(/\s+/g, " ")}${narrative.length > 200 ? "…" : ""}`;

    const candidate: ParsedSourceCandidate = {
      tempId: `candidate-csv-${rowIndex + 1}`,
      title,
      date,
      siteId,
      stakeholderType,
      collectionMethod,
      consentStatus,
      anonymizationStatus,
      sensitivityFlag,
      collectorName,
      narrative,
      summary,
      safetyScan,
      duplicateCheck,
      scopeMismatches: {
        isNewSite,
        isNewStakeholder,
        isNewMethod,
      },
      errors,
      warnings,
      status,
      isSkipped: duplicateCheck.isDuplicate,
    };

    candidates.push(candidate);

    if (title) {
      batchSeen.push({
        id: `SRC-ROW-${rowIndex + 1}` as SourceRecordId,
        title,
        date,
        location: siteId,
        siteId,
        stakeholderType,
        sourceType: collectionMethod,
        summary: candidate.summary,
        rawText: narrative,
        sensitivityFlag,
      });
    }
  });

  return candidates;
}
