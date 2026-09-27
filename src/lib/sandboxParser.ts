import type {
  SourceRecord,
  EvidenceEntry,
  Finding,
  Recommendation,
} from "@/lib/types";

export interface SafetyScanResult {
  hasWarning: boolean;
  warnings: string[];
}

export function scanNarrativeSafety(text: string): SafetyScanResult {
  if (!text) return { hasWarning: false, warnings: [] };

  const warnings: string[] = [];

  // 1. Emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailRegex.test(text)) {
    warnings.push("Contains email address pattern");
  }

  // 2. Phone numbers (standard formats)
  const phoneRegex = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
  if (phoneRegex.test(text)) {
    warnings.push("Contains phone number pattern");
  }

  // 3. Exact dates (YYYY-MM-DD, MM-DD-YYYY, etc.)
  const dateRegex = /\b\d{4}[-/]\d{2}[-/]\d{2}\b|\b\d{2}[-/]\d{2}[-/]\d{4}\b/;
  if (dateRegex.test(text)) {
    warnings.push("Contains specific calendar date");
  }

  // 4. Child name indicators (named X, called X, age X, X years old)
  const childIndicatorRegex = /\b(named|called|age\s+\d{1,2}|\d{1,2}\s*years?\s+old)\b/i;
  if (childIndicatorRegex.test(text)) {
    warnings.push("Contains child name or age indicator");
  }

  // 5. Trigger words (abuse, violence, medical condition, pregnancy, harassment, assault)
  const triggerRegex = /\b(abuse|violence|medical\s+condition|pregnancy|harassment|assault)\b/i;
  if (triggerRegex.test(text)) {
    warnings.push("Contains sensitive protection trigger keyword");
  }

  // 6. Text length threshold
  if (text.length > 800) {
    warnings.push("Text length exceeds 800 character threshold");
  }

  return {
    hasWarning: warnings.length > 0,
    warnings,
  };
}

// Scans text for sensitive patterns. Does not guarantee anonymization.
export function runSandboxSafetyCheck(text: string): boolean {
  return scanNarrativeSafety(text).hasWarning;
}

export interface SandboxInputParams {
  text: string;
  stakeholderGroup: string;
  dataType: string;
  theme: string;
  sensitivity: "Low" | "Medium" | "High";
  siteLabel?: string;
  counter: number;
}

export function parseSandboxInput({
  text,
  stakeholderGroup,
  dataType,
  theme,
  sensitivity,
  siteLabel,
  counter,
}: SandboxInputParams): {
  source: SourceRecord;
  evidence: EvidenceEntry;
  finding: Finding;
  recommendation: Recommendation;
} {
  const pad = (n: number) => String(n).padStart(3, "0");
  const countStr = pad(counter);

  const sourceId = `SRC-SBX-${countStr}` as const;
  const evidenceId = `EV-SBX-${countStr}` as const;
  const findingId = `FND-SBX-${countStr}` as const;
  const recommendationId = `REC-SBX-${countStr}` as const;

  // 1. Dynamic title based on context
  const siteSuffix = siteLabel ? ` at ${siteLabel}` : "";
  const sourceTitle = `${theme} Sandbox ${dataType}${siteSuffix}`;

  // 2. Deterministic interpretations based on theme
  let interpretation = "";
  let findingStatement = "";
  let recStatement = "";

  const lowerTheme = theme.toLowerCase();
  if (lowerTheme.includes("access")) {
    interpretation = "Access conditions may be affecting participation or service uptake.";
    findingStatement = "Systemic barriers limit beneficiary access to distributions and services.";
    recStatement = "Conduct stakeholder surveys to optimize distribution timing and reduce access bottlenecks.";
  } else if (lowerTheme.includes("safety")) {
    interpretation = "Safety or protection concerns may be shaping participation and should be reviewed before professional draft use.";
    findingStatement = "Protection and safety concerns compromise participant engagement during evening or remote distribution.";
    recStatement = "Implement safety escort channels or relocate distribution centers closer to community hubs.";
  } else if (lowerTheme.includes("nutrition")) {
    interpretation = "Food acceptability, water, or nutrition-related implementation factors may be influencing programme experience.";
    findingStatement = "Nutrition distributions suffer from service delivery bottlenecks and lack of clean water inputs.";
    recStatement = "Establish safe water supply channels at distribution sites and verify food package acceptability.";
  } else if (lowerTheme.includes("coordination")) {
    interpretation = "Implementation coordination may be affecting consistency, coverage, or follow-up.";
    findingStatement = "Inconsistent coordination between local authorities and partner staff delays follow-up actions.";
    recStatement = "Form a joint monitoring task force with local partner staff to streamline communications.";
  } else if (lowerTheme.includes("inclusion")) {
    interpretation = "Some groups may face barriers to meaningful participation or access.";
    findingStatement = "Vulnerable stakeholder subgroups experience systemic exclusion from distribution spaces.";
    recStatement = "Design targeted outreach programs for marginalized subgroups to guarantee inclusion.";
  } else if (lowerTheme.includes("participation")) {
    interpretation = "Stakeholder participation or community engagement dynamics may be influencing ownership.";
    findingStatement = "Low youth or female group participation limits long-term project sustainability.";
    recStatement = "Establish local youth committees and feedback panels to raise civic participation rates.";
  } else if (lowerTheme.includes("training")) {
    interpretation = "Training and capacity building factors may be shaping implementation quality or ownership.";
    findingStatement = "Gaps in partner staff training levels affect the quality of field program tracking.";
    recStatement = "Deliver refresher training courses to partner staff with simplified monitoring trackers.";
  } else if (lowerTheme.includes("accountability")) {
    interpretation = "Accountability mechanisms, feedback loops, or communication pathways require review.";
    findingStatement = "Feedback channels are not fully accessible to illiterate community members.";
    recStatement = "Install audio and pictorial feedback collection channels at all monitoring sites.";
  } else {
    interpretation = `Theme ${theme} conditions may be influencing programme implementation.`;
    findingStatement = `Local sandbox notes indicate potential gaps in ${theme} implementation.`;
    recStatement = "Review local sandbox observations with programme managers to identify mitigation measures.";
  }

  // Source Record
  const newSource: SourceRecord = {
    id: sourceId,
    title: sourceTitle,
    sourceType: dataType,
    date: new Date().toISOString().split("T")[0],
    stakeholderType: stakeholderGroup,
    location: siteLabel || "Sandbox Environment",
    summary: `Sandbox text: "${text.substring(0, 100)}${text.length > 100 ? "..." : ""}"`,
    sensitivityFlag: sensitivity,
  };

  // Evidence Entry
  const newEvidence: EvidenceEntry = {
    id: evidenceId,
    sourceId: sourceId,
    stakeholderType: stakeholderGroup,
    rawEvidence: text,
    primaryTheme: theme,
    secondaryTheme: "Sandbox",
    evidenceStrength: "Medium",
    sensitivityFlag: sensitivity,
    potentialFinding: interpretation,
    qaStatus: "Needs Review",
  };

  // Finding
  const newFinding: Finding = {
    id: findingId,
    statement: findingStatement,
    explanation: `Draft finding inferred from sandbox theme "${theme}" and pasted observation note: "${text}"`,
    supportingEvidenceIds: [evidenceId],
    contradictoryEvidence: "None noted in draft simulator.",
    evidenceStrength: "Medium",
    programmeImplication: `Requires verification of ${theme} pathways with field personnel.`,
    linkedRecommendationIds: [recommendationId],
  };

  // Recommendation
  const newRecommendation: Recommendation = {
    id: recommendationId,
    recommendation: recStatement,
    linkedFindingId: findingId,
    evidenceBase: [evidenceId],
    responsibleActor: "Programme Director / MEL Lead",
    priority: sensitivity === "High" ? "High" : "Medium",
    timeframe: "Next Quarter",
    feasibility: "Medium",
    riskSensitivity: `Low risk if implemented via collaborative dialogue; verify sensitivity triggers due to "${sensitivity}" flag.`,
    expectedBenefit: `Directly improves ${theme} outcomes.`,
    successIndicator: `Verification report signed and filed by the MEL team.`,
  };

  return {
    source: newSource,
    evidence: newEvidence,
    finding: newFinding,
    recommendation: newRecommendation,
  };
}
