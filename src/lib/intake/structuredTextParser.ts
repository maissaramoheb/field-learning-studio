import type {
  ConsentStatus,
  AnonymizationStatus,
  SensitivityFlag,
  CollectionMethod,
  StudyScopeConfig,
  SourceRecord,
  SourceRecordId,
} from "@/lib/types";
import { scanNarrativeSafety, type SafetyScanResult } from "@/lib/sandboxParser";
import { checkSourceDuplicate, type DuplicateCheckResult } from "./duplicateDetector";

export interface ParsedSourceCandidate {
  tempId: string;
  title: string;
  date: string;
  siteId: string;
  stakeholderType: string;
  collectionMethod: CollectionMethod | string;
  consentStatus: ConsentStatus;
  anonymizationStatus: AnonymizationStatus;
  sensitivityFlag: SensitivityFlag;
  collectorName?: string;
  narrative: string;
  summary: string;

  // Validation & Audit metadata
  safetyScan: SafetyScanResult;
  duplicateCheck: DuplicateCheckResult;
  scopeMismatches: {
    isNewSite: boolean;
    isNewStakeholder: boolean;
    isNewMethod: boolean;
  };
  errors: string[];
  warnings: string[];
  status: "ready" | "needs_review" | "duplicate" | "error";
  isSkipped: boolean;
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
 * Parses structured text blocks separated by `---` (triple dash).
 */
export function parseStructuredSourceBlocks(
  rawText: string,
  scope: StudyScopeConfig,
  existingSources: SourceRecord[] = [],
  defaultDate: string = new Date().toISOString().slice(0, 10)
): ParsedSourceCandidate[] {
  if (!rawText || !rawText.trim()) return [];

  // Split on lines containing only `---` (or with optional trailing whitespace)
  const rawBlocks = rawText
    .split(/\n\s*---\s*\n|\n\s*---\s*$|^\s*---\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const candidates: ParsedSourceCandidate[] = [];
  const batchSeen: SourceRecord[] = [...existingSources];

  rawBlocks.forEach((block, index) => {
    const lines = block.split(/\n/);
    const headers: Record<string, string> = {};
    const narrativeLines: string[] = [];
    let inNarrative = false;

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const trimmed = line.trim();

      // Skip extra delimiter lines
      if (/^-{3,}$/.test(trimmed)) {
        continue;
      }

      // Skip blank lines before narrative begins
      if (!inNarrative && !trimmed) {
        continue;
      }

      if (inNarrative) {
        narrativeLines.push(rawLine);
        continue;
      }

      const match = line.match(/^([a-zA-Z\s_-]+):\s*(.*)$/);
      if (match) {
        const key = match[1].toLowerCase().replace(/[\s_-]+/g, "").trim();
        const value = match[2].trim();

        if (key === "notes" || key === "narrative" || key === "transcript" || key === "content") {
          inNarrative = true;
          if (value) narrativeLines.push(value);
        } else {
          headers[key] = value;
        }
      } else {
        // Line without key: value -> start of narrative
        inNarrative = true;
        narrativeLines.push(rawLine);
      }
    }

    const narrative = narrativeLines.join("\n").trim();
    const title = headers["title"] || headers["sourcetitle"] || headers["name"] || "";
    const date = headers["date"] || defaultDate;
    const siteId = headers["site"] || headers["siteid"] || headers["location"] || "Unspecified Site";
    const stakeholderType =
      headers["stakeholder"] ||
      headers["stakeholdertype"] ||
      headers["role"] ||
      headers["respondent"] ||
      "Unspecified Stakeholder";
    const collectorName = headers["collector"] || headers["interviewer"] || headers["researcher"] || undefined;

    // Normalizing method
    const rawMethod = (headers["method"] || headers["sourcetype"] || headers["type"] || "").toLowerCase().trim();
    const collectionMethod = KNOWN_METHODS[rawMethod] || (rawMethod ? headers["method"] : "Key Informant Interview");

    // Ethics defaults: Do not assume oral/written or anonymized!
    const rawConsent = (headers["consent"] || headers["consentstatus"] || "").toLowerCase().trim();
    const consentStatus: ConsentStatus = KNOWN_CONSENT[rawConsent] || "Restricted / Unclear";

    const rawAnon = (headers["anonymization"] || headers["anonymizationstatus"] || headers["anonymity"] || "").toLowerCase().trim();
    const anonymizationStatus: AnonymizationStatus = KNOWN_ANON[rawAnon] || "Identifiable / Restricted";

    const rawSens = (headers["sensitivity"] || headers["sensitivityflag"] || "").toLowerCase().trim();
    const sensitivityFlag: SensitivityFlag = KNOWN_SENSITIVITY[rawSens] || "None";

    // Validation errors & warnings
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!title) {
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

    const candidate: ParsedSourceCandidate = {
      tempId: `candidate-src-${index + 1}`,
      title: title || `Untitled Field Note ${index + 1}`,
      date,
      siteId,
      stakeholderType,
      collectionMethod,
      consentStatus,
      anonymizationStatus,
      sensitivityFlag,
      collectorName,
      narrative,
      summary: narrative.slice(0, 200).replace(/\s+/g, " ") + (narrative.length > 200 ? "…" : ""),
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
      isSkipped: duplicateCheck.isDuplicate, // default to skip if duplicate
    };

    candidates.push(candidate);

    // Add to batchSeen so duplicates within the same import paste are flagged!
    if (title) {
      batchSeen.push({
        id: `SRC-BATCH-${index + 1}` as SourceRecordId,
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
