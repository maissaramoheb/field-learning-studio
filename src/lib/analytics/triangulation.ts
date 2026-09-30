import type {
  Finding,
  EvidenceEntry,
  SourceRecord,
  CollectionMethod,
  TriangulationMetrics,
  StudyScopeConfig,
  FrameworkTheme,
  StudyQuestion,
  PatternNote,
  EvidenceEntryId,
} from "@/lib/types";

import { canonicalizeCollectionMethod, CANONICAL_COLLECTION_METHODS, isStandardCollectionMethod } from "@/lib/methodTaxonomy";

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
      const normalized = canonicalizeCollectionMethod(src.sourceType);
      if (isStandardCollectionMethod(normalized)) {
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

export type TriangulationRowDimension = "theme" | "question";
export type TriangulationColumnDimension = "method" | "stakeholder" | "site" | "materialCategory";

export type CellSignalDescriptor =
  | "CONVERGENT"
  | "MIXED"
  | "DIVERGENT"
  | "SPARSE"
  | "EMPTY";

export interface TriangulationMatrixCell {
  rowId: string;
  rowLabel: string;
  columnId: string;
  columnLabel: string;
  evidenceItems: EvidenceEntry[];
  evidenceCount: number;
  distinctSourceCount: number;
  independentSourceCount: number;
  independentSourceIds: string[];
  methodsFound: CollectionMethod[];
  stakeholdersFound: string[];
  sitesFound: string[];
  hasContradictions: boolean;
  contradictionCount: number;
  descriptor: CellSignalDescriptor;
}

export interface TriangulationMatrixDimensionItem {
  id: string;
  label: string;
  code?: string;
  description?: string;
}

export interface TriangulationMatrixResult {
  rowDimension: TriangulationRowDimension;
  columnDimension: TriangulationColumnDimension;
  rows: TriangulationMatrixDimensionItem[];
  columns: TriangulationMatrixDimensionItem[];
  cells: Record<string, TriangulationMatrixCell>;
  totalQualifiedEvidenceCount: number;
  totalIndependentSourcesCount: number;
}

export interface TriangulationMatrixStudyInput {
  evidence?: EvidenceEntry[];
  sources?: SourceRecord[];
  scope?: StudyScopeConfig;
  frameworkThemes?: FrameworkTheme[];
  studyQuestions?: StudyQuestion[];
  framework?: { themes?: FrameworkTheme[] };
  questions?: StudyQuestion[];
  patternNotes?: PatternNote[];
}

/**
 * Computes a deterministic cross-tabulation matrix of qualified field evidence
 * across analytical dimensions (Theme / Question) vs collection dimensions (Method / Stakeholder / Site / Category).
 */
export function computeTriangulationMatrix(
  study: TriangulationMatrixStudyInput,
  rowDimension: TriangulationRowDimension = "theme",
  columnDimension: TriangulationColumnDimension = "method"
): TriangulationMatrixResult {
  const allEvidence = study.evidence || [];
  const allSources = study.sources || [];
  const sourceMap = new Map<string, SourceRecord>(allSources.map((s) => [s.id, s]));

  // Usable/Qualified evidence only (exclude rejected or excluded)
  const qualifiedEvidence = allEvidence.filter(
    (ev) => ev.validationStatus !== "Rejected" && ev.reviewStatus !== "excluded"
  );

  // 1. Determine Rows
  const rows: TriangulationMatrixDimensionItem[] = [];
  if (rowDimension === "theme") {
    const rawThemes = study.frameworkThemes || study.framework?.themes || [];
    const activeThemes = rawThemes.filter((t) => t.isActive !== false);
    if (activeThemes.length > 0) {
      for (const t of activeThemes) {
        rows.push({
          id: t.id,
          label: t.name || t.id,
          code: t.shortLabel,
          description: t.description || t.guidingQuestion,
        });
      }
    } else {
      const themeSet = new Set<string>();
      for (const ev of qualifiedEvidence) {
        if (ev.primaryTheme?.trim()) themeSet.add(ev.primaryTheme.trim());
        if (ev.frameworkThemeIds) {
          for (const tid of ev.frameworkThemeIds) {
            if (tid.trim()) themeSet.add(tid.trim());
          }
        }
      }
      for (const t of themeSet) {
        rows.push({ id: t, label: t });
      }
    }
  } else {
    const rawQuestions = study.studyQuestions || study.questions || [];
    const activeQuestions = rawQuestions.filter((q) => q.isActive !== false);
    if (activeQuestions.length > 0) {
      for (const q of activeQuestions) {
        rows.push({
          id: q.id,
          label: q.question,
          code: q.shortLabel || q.id,
          description: q.criterion,
        });
      }
    } else {
      const qSet = new Set<string>();
      for (const ev of qualifiedEvidence) {
        if (ev.studyQuestionIds) {
          for (const qid of ev.studyQuestionIds) {
            if (qid.trim()) qSet.add(qid.trim());
          }
        }
      }
      for (const q of qSet) {
        rows.push({ id: q, label: q, code: q });
      }
    }
  }

  if (rows.length === 0) {
    rows.push({ id: "all", label: "All Field Material" });
  }

  // 2. Determine Columns
  const columns: TriangulationMatrixDimensionItem[] = [];
  if (columnDimension === "method") {
    for (const m of CANONICAL_COLLECTION_METHODS) {
      columns.push({ id: m, label: m });
    }
    const knownSet = new Set<string>(CANONICAL_COLLECTION_METHODS.map((m) => m.toLowerCase()));
    for (const s of allSources) {
      if (s.sourceType) {
        const canonical = canonicalizeCollectionMethod(s.sourceType);
        if (!canonical && !knownSet.has(s.sourceType.toLowerCase())) {
          knownSet.add(s.sourceType.toLowerCase());
          columns.push({ id: s.sourceType, label: s.sourceType });
        }
      }
    }
  } else if (columnDimension === "stakeholder") {
    const stakeholderSet = new Set<string>(study.scope?.targetStakeholderGroups || []);
    for (const ev of qualifiedEvidence) {
      if (ev.stakeholderType?.trim()) stakeholderSet.add(ev.stakeholderType.trim());
    }
    for (const s of allSources) {
      if (s.stakeholderType?.trim()) stakeholderSet.add(s.stakeholderType.trim());
    }
    for (const st of stakeholderSet) {
      columns.push({ id: st, label: st });
    }
    if (columns.length === 0) {
      columns.push({ id: "General", label: "General Stakeholders" });
    }
  } else if (columnDimension === "site") {
    const siteSet = new Set<string>(study.scope?.targetSites || []);
    for (const ev of qualifiedEvidence) {
      if (ev.siteId?.trim()) siteSet.add(ev.siteId.trim());
    }
    for (const s of allSources) {
      if (s.siteId?.trim()) siteSet.add(s.siteId.trim());
      if (s.location?.trim()) siteSet.add(s.location.trim());
    }
    for (const site of siteSet) {
      columns.push({ id: site, label: site });
    }
    if (columns.length === 0) {
      columns.push({ id: "Primary Site", label: "Primary Site" });
    }
  } else if (columnDimension === "materialCategory") {
    columns.push(
      { id: "primary_evidence", label: "Primary Evidence" },
      { id: "secondary_evidence", label: "Secondary Evidence" },
      { id: "supervisory_interpretation", label: "Supervisory Debrief" },
      { id: "legacy_unclassified", label: "Legacy / Unclassified" }
    );
  }

  // 3. Populate Cells
  const cells: Record<string, TriangulationMatrixCell> = {};
  const allCellIndependentSourceIds = new Set<string>();

  for (const row of rows) {
    for (const col of columns) {
      const cellKey = `${row.id}__${col.id}`;

      const matchingEvidence = qualifiedEvidence.filter((ev) => {
        let rowMatches = false;
        if (rows.length === 1 && rows[0].id === "all") {
          rowMatches = true;
        } else if (rowDimension === "theme") {
          const themeMatches = (themeStr?: string) => {
            if (!themeStr) return false;
            const t = themeStr.toLowerCase().trim();
            if (t === row.id.toLowerCase()) return true;
            if (t === row.label.toLowerCase()) return true;
            if (row.code && t === row.code.toLowerCase()) return true;
            if (row.label.toLowerCase().includes(t)) return true;
            if (row.code && (t.includes(row.code.toLowerCase()) || row.code.toLowerCase().includes(t))) return true;
            return false;
          };

          rowMatches =
            Boolean(ev.frameworkThemeIds?.includes(row.id)) ||
            themeMatches(ev.primaryTheme) ||
            themeMatches(ev.secondaryTheme);
        } else {
          rowMatches =
            Boolean(ev.studyQuestionIds?.includes(row.id)) ||
            (Boolean(row.code) && Boolean(ev.studyQuestionIds?.includes(row.code!)));
        }

        if (!rowMatches) return false;

        const src = sourceMap.get(ev.sourceId);
        if (columnDimension === "method") {
          const method = src ? canonicalizeCollectionMethod(src.sourceType) : undefined;
          return method === col.id || src?.sourceType === col.id;
        } else if (columnDimension === "stakeholder") {
          const st = ev.stakeholderType?.trim() || src?.stakeholderType?.trim();
          return st === col.id;
        } else if (columnDimension === "site") {
          const site = ev.siteId?.trim() || src?.siteId?.trim() || src?.location?.trim();
          return site === col.id;
        } else if (columnDimension === "materialCategory") {
          const cat = ev.materialCategory || src?.materialCategory || "primary_evidence";
          return cat === col.id;
        }
        return false;
      });

      const distinctSourceIds = new Set<string>();
      const independentSourceIds = new Set<string>();
      const cellMethods = new Set<CollectionMethod>();
      const cellStakeholders = new Set<string>();
      const cellSites = new Set<string>();
      let cellContradictionCount = 0;

      for (const ev of matchingEvidence) {
        if (ev.sourceId?.trim()) {
          distinctSourceIds.add(ev.sourceId.trim());
          const src = sourceMap.get(ev.sourceId.trim());
          const isSupervisory =
            src?.materialCategory === "supervisory_interpretation" ||
            ev.materialCategory === "supervisory_interpretation";
          if (!isSupervisory) {
            independentSourceIds.add(ev.sourceId.trim());
            allCellIndependentSourceIds.add(ev.sourceId.trim());
          }
          if (src?.sourceType) {
            const m = canonicalizeCollectionMethod(src.sourceType);
            if (isStandardCollectionMethod(m)) cellMethods.add(m);
          }
          if (src?.stakeholderType?.trim()) cellStakeholders.add(src.stakeholderType.trim());
          if (src?.location?.trim()) cellSites.add(src.location.trim());
        }
        if (ev.stakeholderType?.trim()) cellStakeholders.add(ev.stakeholderType.trim());
        if (ev.siteId?.trim()) cellSites.add(ev.siteId.trim());
        if (ev.contradictionIds && ev.contradictionIds.length > 0) {
          cellContradictionCount += ev.contradictionIds.length;
        }
      }

      if (study.patternNotes && study.patternNotes.length > 0) {
        const matchingEvIds = new Set(matchingEvidence.map((e) => e.id));
        for (const pn of study.patternNotes) {
          if (pn.reasoningType === "tension" || pn.reasoningType === "contradiction") {
            const intersects = pn.evidenceIds?.some((id: string) => matchingEvIds.has(id as EvidenceEntryId));
            if (intersects) {
              cellContradictionCount++;
            }
          }
        }
      }

      const evidenceCount = matchingEvidence.length;
      const independentSourceCount = independentSourceIds.size;
      const methodsFound = Array.from(cellMethods);
      const hasContradictions = cellContradictionCount > 0;

      let descriptor: CellSignalDescriptor;
      if (evidenceCount === 0) {
        descriptor = "EMPTY";
      } else if (hasContradictions) {
        descriptor = independentSourceCount >= 2 ? "MIXED" : "DIVERGENT";
      } else if (independentSourceCount <= 1) {
        descriptor = "SPARSE";
      } else {
        descriptor = "CONVERGENT";
      }

      cells[cellKey] = {
        rowId: row.id,
        rowLabel: row.label,
        columnId: col.id,
        columnLabel: col.label,
        evidenceItems: matchingEvidence,
        evidenceCount,
        distinctSourceCount: distinctSourceIds.size,
        independentSourceCount,
        independentSourceIds: Array.from(independentSourceIds),
        methodsFound,
        stakeholdersFound: Array.from(cellStakeholders),
        sitesFound: Array.from(cellSites),
        hasContradictions,
        contradictionCount: cellContradictionCount,
        descriptor,
      };
    }
  }

  return {
    rowDimension,
    columnDimension,
    rows,
    columns,
    cells,
    totalQualifiedEvidenceCount: qualifiedEvidence.length,
    totalIndependentSourcesCount: allCellIndependentSourceIds.size,
  };
}
