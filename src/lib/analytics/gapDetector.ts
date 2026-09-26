import { computeSupportProfile } from "./supportProfile";
import type {
  Finding,
  EvidenceEntry,
  SourceRecord,
  StudyScopeConfig,
  EvidenceGap,
  EvidenceSupportProfile,
  FieldStudy,
} from "@/lib/types";

/**
 * Detects analytical gaps for a specific finding using its EvidenceSupportProfile.
 * Generates transparent, actionable gap records with deterministic IDs and severities.
 */
export function detectFindingGaps(
  finding: Finding,
  scope: StudyScopeConfig,
  allEvidence: EvidenceEntry[],
  allSources: SourceRecord[],
  cachedProfile?: EvidenceSupportProfile
): EvidenceGap[] {
  const profile =
    cachedProfile || computeSupportProfile(finding, scope, allEvidence, allSources);

  const gaps: EvidenceGap[] = [];

  // 1. Insufficient Coverage: 0 sources
  if (profile.independentSourceCount === 0) {
    gaps.push({
      id: `gap-${finding.id}-insufficient-coverage`,
      gapType: "InsufficientCoverage",
      title: "No Supporting Evidence Linked",
      description: `Finding ${finding.id} has no valid supporting evidence entries or source records linked.`,
      severity: "Critical",
      findingId: finding.id,
      suggestedAction: "Link verified evidence entries to support this finding.",
    });
    return gaps;
  }

  // 2. Single Source Dependency
  if (profile.independentSourceCount === 1) {
    gaps.push({
      id: `gap-${finding.id}-single-source-dependency`,
      gapType: "SingleSourceDependency",
      title: "Single-Source Dependency",
      description: `Finding ${finding.id} relies on only 1 independent source. Multiple evidence excerpts from a single source do not provide triangulation.`,
      severity: "Needs Attention",
      findingId: finding.id,
      suggestedAction:
        "Gather supporting evidence from at least one additional independent source before finalizing this claim.",
    });
  }

  // 3. Method Concentration (multiple sources, but all from same collection method)
  if (
    profile.methodDiversity.methodsFound.length === 1 &&
    profile.independentSourceCount >= 2
  ) {
    const method = profile.methodDiversity.methodsFound[0];
    gaps.push({
      id: `gap-${finding.id}-method-concentration`,
      gapType: "MethodConcentration",
      title: `Method Concentration (${method})`,
      description: `All supporting evidence originates from a single collection method (${method}). Triangulation across distinct methods (e.g. combining interviews with observation or focus groups) is missing.`,
      severity: "Needs Attention",
      findingId: finding.id,
      missingDimension: method,
      suggestedAction: "Corroborate findings with an alternative data collection method.",
    });
  }

  // 4. Missing Stakeholder Perspective
  const isStakeholderSpecific = Boolean(
    finding.isStakeholderSpecific && finding.targetStakeholderGroup?.trim()
  );

  if (profile.stakeholderCoverage.missingTargetStakeholders.length > 0) {
    if (isStakeholderSpecific) {
      const target = profile.stakeholderCoverage.missingTargetStakeholders[0];
      gaps.push({
        id: `gap-${finding.id}-missing-target-stakeholder`,
        gapType: "MissingStakeholder",
        title: `Missing Target Stakeholder Group: ${target}`,
        description: `Finding ${finding.id} claims to reflect ${target}, but contains no direct evidence from this target stakeholder group.`,
        severity: "Critical",
        findingId: finding.id,
        missingDimension: target,
        suggestedAction: `Collect direct evidence from ${target} to defend this stakeholder-specific finding.`,
      });
    } else {
      const missingList = profile.stakeholderCoverage.missingTargetStakeholders;
      gaps.push({
        id: `gap-${finding.id}-missing-stakeholders`,
        gapType: "MissingStakeholder",
        title: `Missing Stakeholder Perspectives: ${missingList.join(", ")}`,
        description: `Configured target stakeholder group(s) [${missingList.join(
          ", "
        )}] are absent from the evidence base for finding ${finding.id}.`,
        severity: "Needs Attention",
        findingId: finding.id,
        missingDimension: missingList.join(", "),
        suggestedAction:
          "Engage underrepresented stakeholder groups to verify claim generalizability.",
      });
    }
  }

  // 5. Missing Site (Multi-site studies only)
  const isSingleSiteStudy = Boolean(
    scope.isSingleSiteStudy || (scope.targetSites && scope.targetSites.length <= 1)
  );

  if (!isSingleSiteStudy && profile.siteCoverage.missingSites.length > 0) {
    const missing = profile.siteCoverage.missingSites;
    const found = profile.siteCoverage.sitesFound;
    gaps.push({
      id: `gap-${finding.id}-missing-site`,
      gapType: "MissingSite",
      title: `Geographic Coverage Gap: Missing ${missing.join(", ")}`,
      description: `Evidence is confined to ${
        found.join(", ") || "unspecified site"
      }; missing configured study location(s): ${missing.join(", ")}.`,
      severity: "Needs Attention",
      findingId: finding.id,
      missingDimension: missing.join(", "),
      suggestedAction: `Expand fieldwork or qualify the finding as specific to ${found.join(
        ", "
      )} rather than cross-site.`,
    });
  }

  // 6. Unresolved Contradiction
  if (profile.contradictionState.hasContradictions) {
    gaps.push({
      id: `gap-${finding.id}-unresolved-contradiction`,
      gapType: "UnresolvedContradiction",
      title: "Unresolved Contradictory Evidence",
      description: `Finding ${finding.id} has ${profile.contradictionState.unresolvedCount} unresolved contradiction item(s). Contradictions must be transparently addressed or reconciled.`,
      severity: "Critical",
      findingId: finding.id,
      suggestedAction:
        "Document the contextual rationale for divergence or qualify the finding boundary.",
    });
  }

  return gaps;
}

/**
 * Scans an entire study projection for analytical gaps across all findings
 * and overall study configuration.
 */
export function detectStudyGaps(study: FieldStudy): EvidenceGap[] {
  const gaps: EvidenceGap[] = [];

  // Finding-level gaps
  for (const finding of study.findings) {
    const findingGaps = detectFindingGaps(
      finding,
      study.scope,
      study.evidence,
      study.sources
    );
    gaps.push(...findingGaps);
  }

  // Study-level scope coverage checks
  const allRepresentedSites = new Set<string>();
  for (const ev of study.evidence) {
    if (ev.siteId && ev.siteId.trim()) allRepresentedSites.add(ev.siteId.trim());
  }
  for (const src of study.sources) {
    if (src.location && src.location.trim()) allRepresentedSites.add(src.location.trim());
  }

  if (!study.scope.isSingleSiteStudy && study.scope.targetSites.length > 1) {
    const unvisitedSites = study.scope.targetSites.filter(
      (ts) => !Array.from(allRepresentedSites).some((s) => s.toLowerCase() === ts.toLowerCase())
    );
    if (unvisitedSites.length > 0) {
      gaps.push({
        id: `study-gap-unvisited-sites`,
        gapType: "MissingSite",
        title: `Study Scope Gap: No Data Collected from ${unvisitedSites.join(", ")}`,
        description: `Configured target site(s) [${unvisitedSites.join(
          ", "
        )}] have zero sources or evidence entries recorded in this study.`,
        severity: "Needs Attention",
        missingDimension: unvisitedSites.join(", "),
        suggestedAction: `Plan fieldwork at ${unvisitedSites.join(", ")} or update study scope.`,
      });
    }
  }

  return gaps;
}
