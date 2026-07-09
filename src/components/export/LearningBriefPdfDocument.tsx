import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { BriefExportModel } from "@/lib/buildBriefExportModel";

// Disable automatic word hyphenation to prevent awkward line breaks
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 45,
    fontSize: 9,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
    color: "#334155", // slate-700
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 12,
    marginBottom: 16,
  },
  titleEyebrow: {
    fontSize: 8,
    color: "#2563eb", // blue-600
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a", // slate-900
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    color: "#64748b", // slate-500
    marginBottom: 10,
  },
  metaGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 6,
    marginTop: 8,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
  },
  metaVal: {
    fontSize: 8.5,
    color: "#0f172a",
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a8a", // navy-900
    marginTop: 18,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 3,
  },
  subSectionHeading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 10,
    marginBottom: 4,
  },
  body: {
    fontSize: 9,
    color: "#334155",
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 8,
  },
  bulletPoint: {
    width: 8,
    fontSize: 9,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
  },
  detailsBox: {
    fontSize: 8,
    color: "#475569",
    marginTop: 2,
    marginBottom: 6,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: "#cbd5e1",
  },
  sandboxWarningBlock: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#fffbeb", // amber-50
    borderLeftWidth: 2,
    borderLeftColor: "#b45309", // amber-700
    marginBottom: 10,
  },
  sandboxWarningText: {
    fontSize: 8,
    color: "#b45309", // amber-700
    fontFamily: "Helvetica-Bold",
  },
  sandboxItemBlock: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: "#f8fafc", // slate-50
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  safetyBlock: {
    marginTop: 20,
    padding: 8,
    backgroundColor: "#fffbeb", // amber-50
    borderLeftWidth: 2,
    borderLeftColor: "#d97706", // amber-600
  },
  safetyText: {
    fontSize: 8,
    color: "#b45309", // amber-700
    fontFamily: "Helvetica-Oblique",
  },
  reviewBlock: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#eff6ff", // blue-50
    borderLeftWidth: 2,
    borderLeftColor: "#2563eb",
  },
  reviewText: {
    fontSize: 8,
    color: "#1e3a8a", // blue-900
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 45,
    right: 45,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#94a3b8",
  },
});

export function LearningBriefPdfDocument({ model }: { model: BriefExportModel }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header section */}
        <View style={styles.header}>
          <Text style={styles.titleEyebrow}>Programme Learning Brief</Text>
          <Text style={styles.title}>{model.title}</Text>
          <Text style={styles.subtitle}>{model.subtitle}</Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Date Generated</Text>
              <Text style={styles.metaVal}>{model.generatedDate}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Context Mode</Text>
              <Text style={styles.metaVal}>{model.demoNote}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Review Status</Text>
              <Text style={styles.metaVal}>{model.reviewNote}</Text>
            </View>
          </View>
        </View>

        {/* Executive Summary */}
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.sectionHeading}>Executive Summary</Text>
          <Text style={styles.body}>{model.executiveSummary}</Text>
        </View>

        {/* Key Messages */}
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.sectionHeading}>Key Messages</Text>
          {model.keyMessages.map((msg, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>{msg}</Text>
            </View>
          ))}
        </View>

        {/* Purpose & Scope if present */}
        {model.purposeAndScope && (
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.sectionHeading}>Purpose and Scope</Text>
            <Text style={styles.body}>{model.purposeAndScope}</Text>
          </View>
        )}

        {/* Key Themes if present */}
        {model.keyThemes && model.keyThemes.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.sectionHeading}>Key Themes</Text>
            {model.keyThemes.map((theme, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletText}>{theme}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Main Findings */}
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.sectionHeading}>Main Findings</Text>
          {model.findings.map(f => (
            <View key={f.id} style={{ marginBottom: 8 }} wrap={false}>
              <Text style={styles.subSectionHeading}>
                {f.id}: {f.statement}
              </Text>
              <Text style={styles.body}>{f.explanation}</Text>
              <Text style={styles.detailsBox}>
                Evidence base: {f.evidenceBase.join(", ")} | Programme implication:{" "}
                {f.programmeImplication}
              </Text>
            </View>
          ))}
        </View>

        {/* Lessons Learned */}
        {model.lessons && model.lessons.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.sectionHeading}>Lessons Learned</Text>
            {model.lessons.map(l => (
              <View key={l.id} style={{ marginBottom: 8 }} wrap={false}>
                <Text style={styles.subSectionHeading}>
                  {l.id}: {l.statement}
                </Text>
                <Text style={styles.body}>
                  What worked / did not work: {l.whatWorkedOrDidNotWork}
                </Text>
                <Text style={styles.body}>Why it happened: {l.whyItHappened}</Text>
                <Text style={styles.body}>Conditions required: {l.conditionsRequired}</Text>
                <Text style={styles.detailsBox}>
                  Evidence base: {l.evidenceBase.join(", ")} | Transferability:{" "}
                  {l.transferability}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Good Practices */}
        {model.goodPractices && model.goodPractices.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.sectionHeading}>Good Practices</Text>
            {model.goodPractices.map(g => (
              <View key={g.id} style={{ marginBottom: 8 }} wrap={false}>
                <Text style={styles.subSectionHeading}>
                  {g.id}: {g.title}
                </Text>
                <Text style={styles.body}>{g.description}</Text>
                <Text style={styles.body}>Why it worked: {g.whyItWorked}</Text>
                <Text style={styles.body}>
                  Conditions for replication: {g.conditionsForReplication}
                </Text>
                <Text style={styles.body}>Risks / limits: {g.risksLimits}</Text>
                <Text style={styles.detailsBox}>
                  Evidence base: {g.evidenceBase.join(", ")} | Recommended use:{" "}
                  {g.recommendedUse}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommendations */}
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.sectionHeading}>Recommendations</Text>
          {model.recommendations.map(r => (
            <View key={r.id} style={{ marginBottom: 8 }} wrap={false}>
              <Text style={styles.subSectionHeading}>
                {r.id}: {r.recommendation}
              </Text>
              <Text style={styles.body}>
                Linked finding: {r.linkedFindingId} | Responsible: {r.responsibleActor}
              </Text>
              <Text style={styles.body}>
                Priority: {r.priority} | Timeframe: {r.timeframe} | Feasibility: {r.feasibility}
              </Text>
              <Text style={styles.body}>
                Risk/Sensitivity: {r.riskSensitivity} | Expected Benefit: {r.expectedBenefit}
              </Text>
              <Text style={styles.detailsBox}>
                Evidence base: {r.evidenceBase.join(", ")} | Success indicator:{" "}
                {r.successIndicator}
              </Text>
            </View>
          ))}
        </View>

        {/* Safeguarding Notes */}
        {model.safeguardingNotes && (
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.sectionHeading}>Safeguarding and Sensitivity Notes</Text>
            <Text style={styles.body}>{model.safeguardingNotes}</Text>
          </View>
        )}

        {/* Sandbox Draft Evidence */}
        {model.includeSandbox && model.sandboxEvidence && model.sandboxEvidence.length > 0 && (
          <View style={{ marginBottom: 10 }} wrap={false}>
            <Text style={styles.sectionHeading}>Sandbox Draft Evidence — Requires Review</Text>
            <View style={styles.sandboxWarningBlock}>
              <Text style={styles.sandboxWarningText}>
                Sandbox Warning: Sandbox draft content is user-provided, local-only, and not validated.
              </Text>
            </View>
            {model.sandboxEvidence.map((e) => (
              <View key={e.id} style={styles.sandboxItemBlock}>
                <Text style={styles.subSectionHeading}>{e.id}</Text>
                <Text style={styles.body}>Source: {e.sourceId}</Text>
                <Text style={styles.body}>Stakeholder: {e.stakeholderType}</Text>
                <Text style={styles.body}>Observation Summary: {e.rawEvidence}</Text>
                <Text style={styles.body}>Theme: {e.primaryTheme}</Text>
                <Text style={styles.body}>Sensitivity: {e.sensitivityFlag}</Text>
                {e.draftFindingId && (
                  <Text style={styles.body}>Draft Finding: {e.draftFindingId} - {e.draftFindingStatement}</Text>
                )}
                {e.draftRecommendationId && (
                  <Text style={styles.body}>Draft Recommendation: {e.draftRecommendationId} - {e.draftRecommendationStatement}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Limitations */}
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.sectionHeading}>Limitations</Text>
          {model.limitations.map((lim, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>{lim}</Text>
            </View>
          ))}
        </View>

        {/* Annex */}
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.sectionHeading}>Annex: Traceability Summary</Text>
          {model.traceability.map((t, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bulletText}>
                {t.findingId}: evidence {t.evidenceIds.join(", ")} -&gt; recommendations{" "}
                {t.recommendationIds.join(", ")}
              </Text>
            </View>
          ))}
        </View>

        {/* Safety Note */}
        <View style={styles.safetyBlock}>
          <Text style={styles.safetyText}>Safety Note: {model.safetyNote}</Text>
        </View>

        {/* Review Note */}
        <View style={styles.reviewBlock}>
          <Text style={styles.reviewText}>Notice: {model.reviewNote}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Field Learning Studio Demo</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
