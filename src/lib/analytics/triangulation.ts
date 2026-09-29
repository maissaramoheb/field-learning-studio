import type {
  Finding,
  EvidenceEntry,
  SourceRecord,
  CollectionMethod,
  TriangulationMetrics,
  StudyScopeConfig,
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

export interface TriangulationContext {
  sources: SourceRecord[];
  evidence: EvidenceEntry[];
  scope?: StudyScopeConfig;
}

/**
 * Computes deterministic TriangulationMetrics for a finding from the current live study state.
 *
 * Epistemic Rules:
 * - Evidence marked reviewStatus === "excluded" or validationStatus === "Rejected" is ignored.
 * - Supervisory debriefs (materialCategory === "supervisory_interpretation") are strictly
 *   excluded from the independentSourceCount.
 * - Material categorized as "legacy_unclassified" generates an independence warning rather
 *   than silently asserting independent support.
 * - Single-source dependency or contradictions are flagged for analytical review.
 */
export function computeTriangulationMetrics(
  finding: Finding,
  studyOrContext: TriangulationContext | { sources: SourceRecord[]; evidence: EvidenceEntry[] }
): TriangulationMetrics {
  const allEvidence = studyOrContext.evidence || [];
  const allSources = studyOrContext.sources || [];

  const sourceMap = new Map<string, SourceRecord>();
  for (const s of allSources) {
    sourceMap.set(s.id, s);
  }

  const supportingIds = new Set(finding.supportingEvidenceIds || []);
  const supportingEvidence = allEvidence.filter(
    (e) =>
      supportingIds.has(e.id) &&
      e.validationStatus !== "Rejected" &&
      e.reviewStatus !== "excluded"
  );

  const uniqueSourceIds = new Set<string>();
  const independentSourceIds = new Set<string>();
  let hasUnclassified = false;

  for (const ev of supportingEvidence) {
    if (ev.materialCategory === "legacy_unclassified") {
      hasUnclassified = true;
    }

    if (ev.sourceId && ev.sourceId.trim()) {
      const srcId = ev.sourceId.trim();
      uniqueSourceIds.add(srcId);

      const src = sourceMap.get(srcId);
      if (src) {
        if (src.materialCategory === "legacy_unclassified") {
          hasUnclassified = true;
        }

        // Epistemic check: exclude supervisory interpretation from independent source count
        const isSupervisory =
          src.materialCategory === "supervisory_interpretation" ||
          ev.materialCategory === "supervisory_interpretation";

        if (!isSupervisory) {
          independentSourceIds.add(srcId);
        }
      }
    }
  }

  const distinctSourceCount = uniqueSourceIds.size;
  const independentSourceCount = independentSourceIds.size;

  // Method diversity across supporting sources
  const methodsSet = new Set<CollectionMethod>();
  for (const srcId of uniqueSourceIds) {
    const src = sourceMap.get(srcId);
    if (src?.sourceType) {
      const normalized = normalizeCollectionMethod(src.sourceType);
      if (normalized) {
        methodsSet.add(normalized);
      }
    }
  }
  const methodsFound = Array.from(methodsSet);
  const methodDiversityCount = methodsFound.length;

  // Stakeholder coverage
  const stakeholdersSet = new Set<string>();
  for (const ev of supportingEvidence) {
    if (ev.stakeholderType && ev.stakeholderType.trim()) {
      stakeholdersSet.add(ev.stakeholderType.trim());
    }
    const src = sourceMap.get(ev.sourceId);
    if (src?.stakeholderType && src.stakeholderType.trim()) {
      stakeholdersSet.add(src.stakeholderType.trim());
    }
  }
  const stakeholdersFound = Array.from(stakeholdersSet);
  const stakeholderCoverageCount = stakeholdersFound.length;

  // Site coverage
  const sitesSet = new Set<string>();
  for (const ev of supportingEvidence) {
    if (ev.siteId && ev.siteId.trim()) {
      sitesSet.add(ev.siteId.trim());
    }
    const src = sourceMap.get(ev.sourceId);
    if (src?.location && src.location.trim()) {
      sitesSet.add(src.location.trim());
    }
  }
  const sitesFound = Array.from(sitesSet);
  const siteCoverageCount = sitesFound.length;

  // Contradiction checks
  const fndContraIds = finding.contradictoryEvidenceIds || [];
  const evContraIds = supportingEvidence.flatMap((e) => e.contradictionIds || []);
  const allContraIds = Array.from(new Set([...fndContraIds, ...evContraIds]));

  const contraText = (
    finding.contradictoryEvidenceSummary ||
    finding.contradictoryEvidence ||
    ""
  ).trim();

  const isPlaceholder =
    !contraText ||
    /^none(\s+documented|\s+noted)?\.?$/i.test(contraText) ||
    /^no(\s+contradictory\s+evidence|\s+contradictions)?(\s+documented|\s+found|\s+noted)?\.?$/i.test(
      contraText
    ) ||
    /^n\/a$/i.test(contraText) ||
    /^nil\.?$/i.test(contraText);

  let contradictionCount = allContraIds.length;
  if (contradictionCount === 0 && !isPlaceholder && contraText.length > 0) {
    contradictionCount = 1;
  }
  const hasContradictions = contradictionCount > 0;

  const isSingleSourceDependent = independentSourceCount <= 1;
  const isSparse = supportingEvidence.length < 2;

  const transparencyFlags: string[] = [];
  if (isSingleSourceDependent) {
    transparencyFlags.push(
      independentSourceCount === 0
        ? "Finding lacks independent primary field sources (supported only by debriefs or unlinked evidence)."
        : "Finding relies on a single independent source."
    );
  }
  if (hasContradictions) {
    transparencyFlags.push("Finding has active documented contradictory or limiting evidence.");
  }
  if (isSparse) {
    transparencyFlags.push("Sparse evidence support: fewer than 2 usable observations.");
  }
  if (hasUnclassified) {
    transparencyFlags.push(
      "Supporting material contains legacy unclassified records; independence is qualified."
    );
  }

  return {
    distinctSourceCount,
    independentSourceCount,
    methodDiversityCount,
    methodsFound,
    stakeholderCoverageCount,
    stakeholdersFound,
    siteCoverageCount,
    sitesFound,
    contradictionCount,
    hasContradictions,
    isSingleSourceDependent,
    isSparse,
    hasUnclassifiedMaterialWarning: hasUnclassified,
    transparencyFlags,
  };
}

export interface FindingValidationEligibility {
  eligible: boolean;
  reasons: string[];
  requiresLimitationNote: boolean;
}

/**
 * Evaluates whether a finding meets the hard validation requirements.
 *
 * Rules:
 * 1. Must cite at least 1 usable evidence item.
 * 2. All cited evidence IDs must resolve in the study.
 * 3. No rejected or excluded evidence may be cited.
 * 4. If single-source, sparse, or contradictory, a non-empty limitationNote is required.
 */
export function evaluateFindingValidationEligibility(
  finding: Finding,
  studyOrContext: TriangulationContext | { sources: SourceRecord[]; evidence: EvidenceEntry[] }
): FindingValidationEligibility {
  const reasons: string[] = [];
  const suppIds = finding.supportingEvidenceIds || [];

  if (suppIds.length === 0) {
    reasons.push("Finding has no supporting evidence linked.");
  }

  const allEvidence = studyOrContext.evidence || [];
  const evMap = new Map(allEvidence.map((e) => [e.id, e]));

  for (const id of suppIds) {
    const ev = evMap.get(id);
    if (!ev) {
      reasons.push(`Supporting evidence "${id}" was not found in the study.`);
    } else {
      if (ev.validationStatus === "Rejected") {
        reasons.push(`Supporting evidence "${id}" is Rejected and cannot support a finding.`);
      }
      if (ev.reviewStatus === "excluded") {
        reasons.push(`Supporting evidence "${id}" has been excluded from review.`);
      }
    }
  }

  const metrics = computeTriangulationMetrics(finding, studyOrContext);
  const requiresLimitationNote =
    metrics.isSingleSourceDependent || metrics.hasContradictions || metrics.isSparse;

  if (requiresLimitationNote) {
    const hasNote = Boolean(finding.limitationNote && finding.limitationNote.trim().length > 0);
    if (!hasNote) {
      reasons.push(
        "Finding relies on limited, single-source, or contradictory evidence. An explicit limitation note or caveat is required before validation."
      );
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    requiresLimitationNote,
  };
}
