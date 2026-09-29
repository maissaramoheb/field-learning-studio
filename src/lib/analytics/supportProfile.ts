import type {
  Finding,
  EvidenceEntry,
  SourceRecord,
  StudyScopeConfig,
  CollectionMethod,
  SupportTier,
  EvidenceSupportProfile,
} from "@/lib/types";

const KNOWN_COLLECTION_METHODS: CollectionMethod[] = [
  "Key Informant Interview",
  "Focus Group Discussion",
  "Direct Observation",
  "Document Review",
  "Community Meeting",
  "Survey / Questionnaire",
];

function normalizeCollectionMethod(rawType?: string): CollectionMethod | undefined {
  if (!rawType) return undefined;
  const trimmed = rawType.trim().toLowerCase();
  return KNOWN_COLLECTION_METHODS.find((m) => m.toLowerCase() === trimmed);
}

export interface SupportProfileContext {
  scope: StudyScopeConfig;
  evidence: EvidenceEntry[];
  sources: SourceRecord[];
}

/**
 * Computes an Evidence Support Profile for a given finding based on its
 * supporting evidence, distinct sources, study scope, and contradiction status.
 *
 * Implements pure deterministic analytical evaluation with:
 * - Source independence rule (multiple evidence items from 1 source = 1 source)
 * - Study-aware scope handling (single-site vs multi-site)
 * - Stakeholder-specific claim handling (targeted vs general claims)
 * - Unresolved contradiction detection and tier downgrading
 * - Deterministic, explainable transparency flags
 */
export function computeSupportProfile(
  finding: Finding,
  scopeOrContext: StudyScopeConfig | SupportProfileContext,
  evidenceParam?: EvidenceEntry[],
  sourcesParam?: SourceRecord[]
): EvidenceSupportProfile {
  let scope: StudyScopeConfig;
  let allEvidence: EvidenceEntry[];
  let allSources: SourceRecord[];

  if ("scope" in scopeOrContext && "evidence" in scopeOrContext && "sources" in scopeOrContext) {
    scope = scopeOrContext.scope;
    allEvidence = scopeOrContext.evidence;
    allSources = scopeOrContext.sources;
  } else {
    scope = scopeOrContext;
    allEvidence = evidenceParam || [];
    allSources = sourcesParam || [];
  }

  const supportingEvidenceIds = new Set(finding.supportingEvidenceIds || []);
  // Reject ineligible/rejected evidence from contributing to support profile
  const supportingEvidence = allEvidence.filter(
    (e) => supportingEvidenceIds.has(e.id) && e.validationStatus !== "Rejected"
  );

  // Map sources for fast lookup
  const sourceMap = new Map<string, SourceRecord>();
  for (const s of allSources) {
    sourceMap.set(s.id, s);
  }

  // 1. Source Independence Rule: count distinct valid sourceId values that exist in this study
  // Epistemic exclusion: supervisory debriefs do not count as independent corroboration
  const uniqueSourceIds = new Set<string>();
  const independentSourceIds = new Set<string>();
  for (const ev of supportingEvidence) {
    if (ev.sourceId && ev.sourceId.trim()) {
      const trimmedSourceId = ev.sourceId.trim();
      const src = sourceMap.get(trimmedSourceId);
      if (src) {
        uniqueSourceIds.add(trimmedSourceId);
        const isSupervisory =
          src.materialCategory === "supervisory_interpretation" ||
          ev.materialCategory === "supervisory_interpretation" ||
          src.sourceType?.toLowerCase() === "debrief";
        if (!isSupervisory) {
          independentSourceIds.add(trimmedSourceId);
        }
      }
    }
  }
  const independentSourceCount = independentSourceIds.size;

  // 2. Method Diversity: methods found across supporting sources
  const methodsSet = new Set<CollectionMethod>();
  for (const srcId of uniqueSourceIds) {
    const src = sourceMap.get(srcId);
    if (src && src.sourceType) {
      const normalized = normalizeCollectionMethod(src.sourceType);
      if (normalized) {
        methodsSet.add(normalized);
      }
    }
  }
  const methodsFound = Array.from(methodsSet);
  const isMultiMethod = methodsFound.length >= 2;

  // 3. Stakeholder Coverage:
  const isStakeholderSpecific = Boolean(
    finding.isStakeholderSpecific && finding.targetStakeholderGroup?.trim()
  );
  const targetStakeholderGroup = finding.targetStakeholderGroup?.trim();

  const stakeholdersSet = new Set<string>();
  for (const ev of supportingEvidence) {
    if (ev.stakeholderType && ev.stakeholderType.trim()) {
      stakeholdersSet.add(ev.stakeholderType.trim());
    }
    const src = sourceMap.get(ev.sourceId);
    if (src && src.stakeholderType && src.stakeholderType.trim()) {
      stakeholdersSet.add(src.stakeholderType.trim());
    }
  }
  const stakeholdersFound = Array.from(stakeholdersSet);
  const isMultiStakeholder = stakeholdersFound.length >= 2;

  let missingTargetStakeholders: string[] = [];
  if (isStakeholderSpecific && targetStakeholderGroup) {
    const targetRepresented = stakeholdersFound.some(
      (s) => s.toLowerCase() === targetStakeholderGroup.toLowerCase()
    );
    if (!targetRepresented) {
      missingTargetStakeholders = [targetStakeholderGroup];
    }
  } else {
    const configuredStakeholders = scope.targetStakeholderGroups || [];
    missingTargetStakeholders = configuredStakeholders.filter(
      (cs) => !stakeholdersFound.some((sf) => sf.toLowerCase() === cs.toLowerCase())
    );
  }

  // 4. Site Coverage:
  const isSingleSiteStudy = Boolean(
    scope.isSingleSiteStudy || (scope.targetSites && scope.targetSites.length <= 1)
  );

  const sitesSet = new Set<string>();
  for (const ev of supportingEvidence) {
    if (ev.siteId && ev.siteId.trim()) {
      sitesSet.add(ev.siteId.trim());
    }
    const src = sourceMap.get(ev.sourceId);
    if (src && src.location && src.location.trim()) {
      sitesSet.add(src.location.trim());
    }
  }
  const sitesFound = Array.from(sitesSet);

  let isCrossSite = false;
  let missingSites: string[] = [];

  if (isSingleSiteStudy) {
    isCrossSite = false;
    const targetSite = scope.targetSites?.[0];
    if (targetSite) {
      const targetMatches = sitesFound.some(
        (sf) => sf.toLowerCase() === targetSite.toLowerCase()
      );
      if (!targetMatches) {
        missingSites = [targetSite];
      } else {
        missingSites = [];
      }
    } else {
      missingSites = sitesFound.length === 0 ? ["Configured Site"] : [];
    }
  } else {
    isCrossSite = sitesFound.length >= 2;
    const configuredSites = scope.targetSites || [];
    missingSites = configuredSites.filter(
      (cs) => !sitesFound.some((sf) => sf.toLowerCase() === cs.toLowerCase())
    );
  }

  // 5. Contradiction State:
  const fndContradictionIds = finding.contradictoryEvidenceIds || [];
  const evContradictionIds = supportingEvidence.flatMap((e) => e.contradictionIds || []);
  const allContradictionIds = Array.from(
    new Set([...fndContradictionIds, ...evContradictionIds])
  );

  const contradictionText = (
    finding.contradictoryEvidenceSummary ||
    finding.contradictoryEvidence ||
    ""
  ).trim();

  // Robust placeholder detection (do not infer contradiction from placeholder text)
  const isPlaceholder =
    !contradictionText ||
    /^none(\s+documented|\s+noted)?\.?$/i.test(contradictionText) ||
    /^no(\s+contradictory\s+evidence|\s+contradictions)?(\s+documented|\s+found|\s+noted)?\.?$/i.test(contradictionText) ||
    /^n\/a$/i.test(contradictionText) ||
    /^nil\.?$/i.test(contradictionText);

  const textHasSubstance = !isPlaceholder;

  let unresolvedCount = allContradictionIds.length;
  if (unresolvedCount === 0 && textHasSubstance) {
    unresolvedCount = 1;
  }
  const hasContradictions = unresolvedCount > 0;

  const notes: string[] = [];
  if (textHasSubstance && contradictionText) {
    notes.push(contradictionText);
  }
  if (allContradictionIds.length > 0) {
    notes.push(`Referenced contradictory evidence IDs: ${allContradictionIds.join(", ")}`);
  }

  // 6. Support Tier Derivation:
  let supportTier: SupportTier;

  if (independentSourceCount <= 1 || hasContradictions) {
    supportTier = "Emerging";
  } else if (
    isStakeholderSpecific &&
    missingTargetStakeholders.length > 0
  ) {
    supportTier = "Emerging";
  } else if (sitesFound.length === 0) {
    supportTier = "Emerging";
  } else {
    const hasAdequateSources = independentSourceCount >= 3;
    const hasMultiMethod = isMultiMethod;

    let hasAdequateSite = false;
    if (isSingleSiteStudy) {
      const targetSite = scope.targetSites?.[0];
      hasAdequateSite = targetSite
        ? sitesFound.some((sf) => sf.toLowerCase() === targetSite.toLowerCase())
        : sitesFound.length >= 1;
    } else {
      hasAdequateSite = isCrossSite && missingSites.length === 0;
    }

    let hasAdequateStakeholder = false;
    if (isStakeholderSpecific) {
      hasAdequateStakeholder = missingTargetStakeholders.length === 0;
    } else {
      hasAdequateStakeholder = isMultiStakeholder && missingTargetStakeholders.length === 0;
    }

    if (
      hasAdequateSources &&
      hasMultiMethod &&
      hasAdequateSite &&
      hasAdequateStakeholder
    ) {
      supportTier = "Strongly Supported";
    } else {
      supportTier = "Partially Supported";
    }
  }

  // 7. Transparency Flags:
  const transparencyFlags: string[] = [];

  // Source count flag
  if (independentSourceCount === 0) {
    transparencyFlags.push("No supporting sources identified");
  } else if (independentSourceCount === 1) {
    transparencyFlags.push("Only 1 independent source");
  } else {
    transparencyFlags.push(`${independentSourceCount} independent sources identified`);
  }

  // Method diversity flag
  if (methodsFound.length === 1) {
    transparencyFlags.push(
      `All supporting evidence comes from ${methodsFound[0]} (method concentration)`
    );
  } else if (methodsFound.length >= 2) {
    transparencyFlags.push(
      `Multi-method triangulation achieved (${methodsFound.join(", ")})`
    );
  } else if (independentSourceCount > 0) {
    transparencyFlags.push("Collection method unspecified in source records");
  }

  // Stakeholder flag
  if (isStakeholderSpecific && targetStakeholderGroup) {
    if (missingTargetStakeholders.length === 0) {
      transparencyFlags.push(
        `Stakeholder-specific claim supported by target group: ${targetStakeholderGroup}`
      );
    } else {
      transparencyFlags.push(
        `Target stakeholder group not represented in evidence: ${targetStakeholderGroup}`
      );
    }
  } else {
    if (missingTargetStakeholders.length > 0) {
      transparencyFlags.push(
        `Missing perspective(s): ${missingTargetStakeholders.join(", ")}`
      );
    }
    if (isMultiStakeholder) {
      transparencyFlags.push(
        `Multi-stakeholder triangulation achieved (${stakeholdersFound.join(", ")})`
      );
    } else if (stakeholdersFound.length === 1) {
      transparencyFlags.push(
        `Evidence limited to single stakeholder perspective: ${stakeholdersFound[0]}`
      );
    }
  }

  // Site flag
  if (isSingleSiteStudy) {
    transparencyFlags.push("Single-site study: site coverage requirement satisfied");
  } else {
    if (missingSites.length > 0) {
      transparencyFlags.push(
        `Evidence currently limited to ${sitesFound.join(", ") || "unspecified site"}; missing ${missingSites.join(", ")}`
      );
    } else if (isCrossSite) {
      transparencyFlags.push(
        `Cross-site evidence confirmed across ${sitesFound.join(", ")}`
      );
    } else {
      transparencyFlags.push("Single-site evidence in a multi-site study configuration");
    }
  }

  // Contradiction flag
  if (hasContradictions) {
    transparencyFlags.push(
      `Contradictory evidence remains unresolved (${unresolvedCount} item${
        unresolvedCount === 1 ? "" : "s"
      })`
    );
  } else {
    transparencyFlags.push("No unresolved contradictory evidence noted");
  }

  return {
    independentSourceCount,
    methodDiversity: {
      methodsFound,
      isMultiMethod,
    },
    stakeholderCoverage: {
      stakeholdersFound,
      isMultiStakeholder,
      missingTargetStakeholders,
    },
    siteCoverage: {
      sitesFound,
      isCrossSite,
      missingSites,
    },
    contradictionState: {
      hasContradictions,
      unresolvedCount,
      notes,
    },
    supportTier,
    transparencyFlags,
  };
}
