"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

type WorkflowStage = "study" | "evidence" | "analysis" | "deliverables";

interface WorkflowStageInfo {
  id: WorkflowStage;
  num: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  keyActions: string[];
  screenshotUrl: string;
  screenshotAlt: string;
}

const WORKFLOW_STAGES: WorkflowStageInfo[] = [
  {
    id: "study",
    num: "01",
    title: "Study Setup",
    shortDesc: "Define inquiry scope & governance",
    fullDesc:
      "Establish inquiry questions, geographic sites, target stakeholder groups, and methodological boundaries before analyzing raw material. Governance and limitations remain permanently visible.",
    keyActions: [
      "Explicit inquiry boundaries & target sites",
      "Governance & ethical handling parameters",
      "Methodological limitations recorded upfront",
    ],
    screenshotUrl: "/screenshots/study.png",
    screenshotAlt: "Field Learning Studio - Study Setup Space",
  },
  {
    id: "evidence",
    num: "02",
    title: "Field Material",
    shortDesc: "Capture notes & extract observations",
    fullDesc:
      "Review field notes and interview transcripts in a structured master/detail workstation. Extract candidate observations, record context clues, and conduct human evaluation review before validation.",
    keyActions: [
      "Master/detail observation inspector",
      "Provenance tracking to source transcripts",
      "Explicit human validation lifecycle (Draft → Needs Review → Validated)",
    ],
    screenshotUrl: "/screenshots/field_material.png",
    screenshotAlt: "Field Learning Studio - Field Material Space",
  },
  {
    id: "analysis",
    num: "03",
    title: "Analysis",
    shortDesc: "Cross-examine & author Findings",
    fullDesc:
      "Compare evidence across sites, stakeholder perspectives, and collection methods. Identify coverage gaps, surface conflicting testimonies, and author grounded Findings with live support profiles.",
    keyActions: [
      "Comparative matrix by site, stakeholder, and method",
      "Unresolved contradiction & gap detection",
      "Live support tier scoring (Strongly Supported / Partial / Emerging)",
    ],
    screenshotUrl: "/screenshots/analysis.png",
    screenshotAlt: "Field Learning Studio - Analysis Space",
  },
  {
    id: "deliverables",
    num: "04",
    title: "Deliverables",
    shortDesc: "Generate defensible working drafts",
    fullDesc:
      "Assemble reviewed Findings into actionable Recommendations and generate publication-ready Learning Briefs. Export directly to editable Microsoft Word (.docx) and PDF for formal clearance.",
    keyActions: [
      "Linked recommendations with feasibility and risk context",
      "Mandatory recording of challenging evidence and caveats",
      "One-click editable Word (.docx) and PDF export pack",
    ],
    screenshotUrl: "/screenshots/deliverables.png",
    screenshotAlt: "Field Learning Studio - Deliverables Space",
  },
];

export function LandingPage() {
  const [activeStage, setActiveStage] = useState<WorkflowStage>("study");

  const currentStage =
    WORKFLOW_STAGES.find((s) => s.id === activeStage) || WORKFLOW_STAGES[0];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--accent)] selection:text-white">
      {/* -------------------------------------------------------------
          1. NAVIGATION
      ------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-[var(--accent)] font-mono text-xs font-bold text-white shadow-xs group-hover:bg-[var(--accent-strong)] transition">
              FLS
            </span>
            <span className="text-sm font-semibold tracking-tight text-[var(--foreground)] hidden sm:inline">
              Field Learning Studio
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs text-[var(--muted)]">
            <a href="#problem" className="hover:text-[var(--foreground)] transition">
              The Problem
            </a>
            <a href="#workflow" className="hover:text-[var(--foreground)] transition">
              Workflow
            </a>
            <a href="#traceability" className="hover:text-[var(--foreground)] transition">
              Traceability
            </a>
            <a href="#human-judgment" className="hover:text-[var(--foreground)] transition">
              Human Judgment
            </a>
            <a href="#docx-intake" className="hover:text-[var(--foreground)] transition">
              Word Intake
            </a>
            <a href="#output" className="hover:text-[var(--foreground)] transition">
              Deliverables
            </a>
            <a href="#principles" className="hover:text-[var(--foreground)] transition">
              Principles
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/studio"
              className="fls-button fls-button-primary text-xs font-semibold px-3 py-1.5 rounded-md shadow-xs hover:shadow-md transition whitespace-nowrap"
            >
              Launch Studio →
            </Link>
          </div>
        </div>
      </header>

      <main className="space-y-24 sm:space-y-32 pb-24">
        {/* -------------------------------------------------------------
            2. HERO SECTION
        ------------------------------------------------------------- */}
        <section className="relative pt-10 sm:pt-20 px-4 sm:px-6 overflow-hidden">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 py-1 font-mono text-[10px] sm:text-[11px] text-[var(--muted-strong)] shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--trace)] animate-pulse" />
              <span>METHODOLOGY-FIRST FIELD INQUIRY WORKSPACE</span>
            </div>

            <h1 className="text-2xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.15] text-[var(--foreground)]">
              From field material to a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
                defensible professional draft.
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-sm sm:text-lg text-[var(--muted)] leading-relaxed font-normal">
              Turn interviews, observations, and field notes into traceable Findings, practical Recommendations, and an executive working draft — keeping human judgment visible at every step.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full max-w-sm sm:max-w-none mx-auto">
              <Link
                href="/studio"
                className="fls-button fls-button-primary w-full sm:w-auto text-center justify-center text-sm font-semibold px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer"
              >
                Launch Field Learning Studio →
              </Link>
              <a
                href="#workflow"
                className="fls-button fls-button-quiet w-full sm:w-auto text-center justify-center text-sm font-medium px-5 py-2.5 rounded-lg text-[var(--muted-strong)] hover:text-white transition cursor-pointer"
              >
                See how it works ↓
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 text-xs font-mono text-[var(--muted-soft)]">
              <span>✓ 100% Local Storage</span>
              <span className="hidden sm:inline">·</span>
              <span>✓ Zero Cloud Telemetry</span>
              <span className="hidden sm:inline">·</span>
              <span>✓ No Account Required</span>
            </div>
          </div>

          {/* Hero Browser Frame Embed */}
          <div className="mx-auto mt-10 sm:mt-12 max-w-5xl">
            <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-1 sm:p-1.5 shadow-2xl">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-muted)] rounded-t-lg">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-rose-500/70" />
                  <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-amber-500/70" />
                  <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <div className="flex items-center gap-1.5 rounded bg-[var(--surface)] px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-mono text-[var(--muted)] border border-[var(--border)] max-w-[190px] sm:max-w-none overflow-hidden">
                  <span className="text-[var(--trace)] shrink-0">🔒</span>
                  <span className="truncate">field-learning-studio.app/studio</span>
                  <span className="hidden sm:inline text-[var(--muted-soft)]"> · Community Bridges</span>
                </div>
                <span className="hidden sm:inline font-mono text-[10px] text-[var(--muted-soft)]">
                  Active Fieldwork
                </span>
              </div>
              <div className="relative aspect-[16/10] overflow-hidden rounded-b-lg bg-[var(--surface)]">
                <Image
                  src="/screenshots/study.png"
                  alt="Field Learning Studio - Active Study Workspace"
                  fill
                  priority
                  className="object-cover object-top"
                  sizes="(max-width: 1200px) 100vw, 1200px"
                />
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            3. THE REAL PROBLEM SECTION
        ------------------------------------------------------------- */}
        <section id="problem" className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="border-t border-[var(--border)] pt-16 space-y-10">
            <div className="space-y-3">
              <span className="fls-eyebrow">THE FIELD REALITY</span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                The problem is not a lack of field information.
              </h2>
              <p className="max-w-3xl text-sm sm:text-base text-[var(--muted)] leading-relaxed">
                Practitioners return from multi-site field missions with dozens of Word documents, interview audio notes, divergent community perspectives, and tight deadlines. The hard part is turning that raw material into work that stands up to scrutiny.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
                <div className="font-mono text-xs font-semibold text-rose-400">
                  01 / FRAGMENTATION
                </div>
                <h3 className="text-base font-semibold text-[var(--foreground)]">
                  Scattered Field Material
                </h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Interviews, focus groups, and site observations remain locked in separate files. Cross-site comparisons require tedious copy-pasting and manual cross-referencing.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
                <div className="font-mono text-xs font-semibold text-amber-400">
                  02 / BURIED CONTRADICTIONS
                </div>
                <h3 className="text-base font-semibold text-[var(--foreground)]">
                  Lost Divergent Evidence
                </h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Under time pressure, dissenting community voices and outlier observations are smoothed over into generic consensus summaries, eroding evaluation integrity.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
                <div className="font-mono text-xs font-semibold text-sky-400">
                  03 / BROKEN TRACEABILITY
                </div>
                <h3 className="text-base font-semibold text-[var(--foreground)]">
                  Unsubstantiated Claims
                </h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  When recommendations reach senior review or donor evaluation committees, it is nearly impossible to inspect the exact ground observations that support them.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <strong className="block text-sm font-semibold text-[var(--foreground)]">
                  Field Learning Studio bridges the gap.
                </strong>
                <p className="text-xs text-[var(--muted)]">
                  A structured environment that turns raw notes into an audit-proof evidence base without opaque automation.
                </p>
              </div>
              <Link
                href="/studio"
                className="fls-button fls-button-quiet text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
              >
                Open Studio →
              </Link>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            4. THE 4-SPACE WORKFLOW
        ------------------------------------------------------------- */}
        <section id="workflow" className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="border-t border-[var(--border)] pt-16 space-y-8">
            <div className="space-y-3">
              <span className="fls-eyebrow">FOUR PRACTITIONER SPACES</span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                A disciplined, sequential journey from notes to draft.
              </h2>
              <p className="max-w-2xl text-sm text-[var(--muted)] leading-relaxed">
                Field Learning Studio organizes the evaluative process into four dedicated spaces, preventing premature synthesis and ensuring every claim is validated.
              </p>
            </div>

            {/* Stepper Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-b border-[var(--border)] pb-3">
              {WORKFLOW_STAGES.map((stage) => {
                const isActive = stage.id === activeStage;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setActiveStage(stage.id)}
                    className={`rounded-lg p-3 text-left transition cursor-pointer ${
                      isActive
                        ? "bg-[var(--surface-elevated)] border border-[var(--border-strong)] shadow-xs"
                        : "hover:bg-[var(--surface)] border border-transparent text-[var(--muted)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-xs font-bold ${
                          isActive ? "text-[var(--accent-strong)]" : "text-[var(--muted-soft)]"
                        }`}
                      >
                        {stage.num}
                      </span>
                      <strong
                        className={`text-xs font-semibold ${
                          isActive ? "text-[var(--foreground)]" : "text-[var(--muted-strong)]"
                        }`}
                      >
                        {stage.title}
                      </strong>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--muted-soft)] line-clamp-1">
                      {stage.shortDesc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Active Stage Presentation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Explanatory Column */}
              <div className="lg:col-span-5 space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <div>
                  <span className="font-mono text-xs font-bold text-[var(--accent-strong)]">
                    SPACE {currentStage.num}
                  </span>
                  <h3 className="text-xl font-semibold tracking-tight text-[var(--foreground)] mt-1">
                    {currentStage.title}
                  </h3>
                </div>

                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  {currentStage.fullDesc}
                </p>

                <div className="space-y-2 border-t border-[var(--border)] pt-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-soft)]">
                    Core Capabilities
                  </span>
                  <ul className="space-y-2 text-xs text-[var(--muted-strong)]">
                    {currentStage.keyActions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[var(--accent-strong)] mt-0.5">✓</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2">
                  <Link
                    href="/studio"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-strong)] hover:text-blue-300 transition"
                  >
                    <span>Try this in the studio</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Right Screenshot Column */}
              <div className="lg:col-span-7">
                <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-1 shadow-xl">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-muted)] rounded-t-lg">
                    <span className="font-mono text-[10px] text-[var(--muted)]">
                      {currentStage.screenshotAlt}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--muted-soft)]">
                      1440 × 900
                    </span>
                  </div>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-b-lg bg-[var(--surface)]">
                    <Image
                      src={currentStage.screenshotUrl}
                      alt={currentStage.screenshotAlt}
                      fill
                      className="object-cover object-top transition duration-300"
                      sizes="(max-width: 1024px) 100vw, 600px"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            5. TRACEABILITY — THE DIFFERENTIATOR
        ------------------------------------------------------------- */}
        <section id="traceability" className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="border-t border-[var(--border)] pt-16 space-y-10">
            <div className="space-y-3">
              <span className="fls-eyebrow">UNBROKEN LINEAGE</span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                Every claim connected to the ground.
              </h2>
              <p className="max-w-2xl text-sm text-[var(--muted)] leading-relaxed">
                Traceability does not prove truth — it keeps the reasoning visible. From raw transcript notes to executive recommendations, follow the exact path of evidence without black-box leaps.
              </p>
            </div>

            {/* Visual Lineage Diagram */}
            <div className="relative rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 sm:p-8 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
                {/* 1. Source */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 space-y-2">
                  <span className="font-mono text-[10px] font-bold text-sky-400">SRC-001</span>
                  <h4 className="text-xs font-semibold text-[var(--foreground)]">
                    Source Note
                  </h4>
                  <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                    KII with Minya Head Teacher (2026-09-20, Minya)
                  </p>
                  <span className="block font-mono text-[10px] text-[var(--muted-soft)]">
                    Method: Interview
                  </span>
                </div>

                {/* 2. Observation */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 space-y-2">
                  <span className="font-mono text-[10px] font-bold text-emerald-400">EV-003</span>
                  <h4 className="text-xs font-semibold text-[var(--foreground)]">
                    Observation
                  </h4>
                  <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                    &ldquo;Delivery trucks arrived 90 mins after recess during summer heatwaves.&rdquo;
                  </p>
                  <span className="inline-block rounded bg-emerald-950/40 text-emerald-300 px-1.5 py-0.5 font-mono text-[10px] border border-emerald-500/30">
                    Validated
                  </span>
                </div>

                {/* 3. Finding */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 space-y-2">
                  <span className="font-mono text-[10px] font-bold text-amber-400">FND-001</span>
                  <h4 className="text-xs font-semibold text-[var(--foreground)]">
                    Finding
                  </h4>
                  <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                    Morning delivery delays disrupt scheduled meal service in rural schools during high-heat periods.
                  </p>
                  <span className="block font-mono text-[10px] text-amber-300">
                    3 Sources · 1 Divergent
                  </span>
                </div>

                {/* 4. Recommendation */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 space-y-2">
                  <span className="font-mono text-[10px] font-bold text-purple-400">REC-001</span>
                  <h4 className="text-xs font-semibold text-[var(--foreground)]">
                    Recommendation
                  </h4>
                  <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                    Establish decentralized morning dispatch buffers and refrigerated transit protocols.
                  </p>
                  <span className="block font-mono text-[10px] text-[var(--muted-soft)]">
                    Priority: High · 3-6 mos
                  </span>
                </div>

                {/* 5. Professional Draft */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 space-y-2">
                  <span className="font-mono text-[10px] font-bold text-blue-400">BRIEF DRAFT</span>
                  <h4 className="text-xs font-semibold text-[var(--foreground)]">
                    Learning Brief
                  </h4>
                  <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                    Executive Word (.docx) &amp; PDF draft with linked evidence citations and limitations.
                  </p>
                  <span className="block font-mono text-[10px] text-blue-300">
                    Audit-Ready Export
                  </span>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--muted)]">
                <p>
                  If an underlying observation is edited or rejected, FLS triggers an invalidation cascade alerting the practitioner that dependent Findings require re-evaluation.
                </p>
                <span className="font-mono text-[11px] text-[var(--trace)] whitespace-nowrap">
                  MEP-01 Integrity Guarded
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            6. HUMAN JUDGMENT STAYS CENTRAL
        ------------------------------------------------------------- */}
        <section id="human-judgment" className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="border-t border-[var(--border)] pt-16 space-y-10">
            <div className="space-y-3">
              <span className="fls-eyebrow">ETHICAL &amp; METHODOLOGICAL POSITION</span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                Human judgment remains central.
              </h2>
              <p className="max-w-2xl text-sm text-[var(--muted)] leading-relaxed">
                Field Learning Studio is not an autonomous evaluator. It does not replace human insight with automated consensus. It gives practitioners the rigor to defend their own conclusions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Column 1: FLS Role */}
              <div className="rounded-xl border border-sky-500/30 bg-sky-950/10 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sky-400 text-lg">⚙️</span>
                  <h3 className="text-base font-semibold text-sky-200">
                    What Field Learning Studio Does
                  </h3>
                </div>
                <ul className="space-y-3 text-xs text-sky-300 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">•</span>
                    <span><strong>Structures narrative materials:</strong> Segments long notes, transcripts, and tables into reviewable candidates.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">•</span>
                    <span><strong>Preserves referential chains:</strong> Keeps observations tied to exact source documents and line references.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">•</span>
                    <span><strong>Flags coverage gaps:</strong> Highlights missing stakeholder perspectives or unverified site claims.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">•</span>
                    <span><strong>Formats professional documents:</strong> Prepares formatted Word drafts and PDFs with audit trails.</span>
                  </li>
                </ul>
              </div>

              {/* Column 2: Practitioner Role */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-lg">👤</span>
                  <h3 className="text-base font-semibold text-emerald-200">
                    What the Practitioner Decides
                  </h3>
                </div>
                <ul className="space-y-3 text-xs text-emerald-300 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Evaluates truth &amp; reliability:</strong> Assesses whether an interviewee statement is factual, biased, or speculative.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Weighs analytical significance:</strong> Decides which observations constitute genuine evaluative patterns.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Authors and validates Findings:</strong> Writes nuanced statements incorporating cultural and political context.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Formulates Recommendations:</strong> Tailors actionable policy changes to institutional feasibility.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            7. WORD / DOCX INTAKE STORY
        ------------------------------------------------------------- */}
        <section id="docx-intake" className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="border-t border-[var(--border)] pt-16 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div className="space-y-2">
                <span className="fls-eyebrow">FIELDWORK INTAKE ENGINE</span>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                  Bring field notes straight from Word.
                </h2>
              </div>
              <span className="rounded-full bg-[var(--surface-elevated)] border border-[var(--border-strong)] px-3 py-1 font-mono text-[11px] text-[var(--accent-strong)] self-start sm:self-auto">
                Client-Side Engine · In Validation
              </span>
            </div>

            <p className="max-w-2xl text-sm text-[var(--muted)] leading-relaxed">
              No need to manually retype interview notes. Drop single or multiple Microsoft Word (.docx) files into FLS. The deterministic parser segments text into candidate observations, extracts table rows, and keeps you in full editorial control.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <strong className="block text-xs font-semibold text-[var(--foreground)]">
                  100% Local-First Extraction
                </strong>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Word files are parsed entirely in your browser using pure JavaScript. No document content is ever transmitted to cloud servers.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <strong className="block text-xs font-semibold text-[var(--foreground)]">
                  Candidate Segmentation
                </strong>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Headings, meaningful paragraphs, bullet points, and tables become scannable candidate cards with Accept, Edit, and Skip controls.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <strong className="block text-xs font-semibold text-[var(--foreground)]">
                  Methodological Honesty
                </strong>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Unknown dates, unspecified methods, or unverified consent remain explicitly recorded as Unknown. FLS never fabricates reassuring defaults.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            8. ANALYSIS EXPERIENCE
        ------------------------------------------------------------- */}
        <section id="analysis" className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="border-t border-[var(--border)] pt-16 space-y-8">
            <div className="space-y-3">
              <span className="fls-eyebrow">ANALYTICAL WORKBENCH</span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                Compare perspectives before concluding.
              </h2>
              <p className="max-w-2xl text-sm text-[var(--muted)] leading-relaxed">
                Inspect evidence side-by-side by site, stakeholder group, collection method, or inquiry theme. Spot where your evidence is robust, and where gaps demand further investigation.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-1.5 shadow-xl">
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-[var(--surface)]">
                <Image
                  src="/screenshots/analysis.png"
                  alt="Field Learning Studio - Synthesis Comparative Matrix"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 1200px) 100vw, 1000px"
                />
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            9. PROFESSIONAL OUTPUT SECTION
        ------------------------------------------------------------- */}
        <section id="output" className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="border-t border-[var(--border)] pt-16 space-y-8">
            <div className="space-y-3">
              <span className="fls-eyebrow">CLEARANCE &amp; REPORTING</span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                A working draft ready for serious review.
              </h2>
              <p className="max-w-2xl text-sm text-[var(--muted)] leading-relaxed">
                Outputs are not generic dashboard prints. Field Learning Studio compiles reviewed Findings and linked Recommendations into an editorial, publication-ready working draft with recorded limitations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 space-y-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    What the Learning Brief Includes
                  </h3>
                  <ul className="space-y-2 text-xs text-[var(--muted)]">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">📄</span>
                      <span><strong>Executive Word Draft (.docx):</strong> Formatted with native styles, ready for institutional clearance and markup.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-400">📑</span>
                      <span><strong>Print-Ready PDF:</strong> Clean typography, balanced margins, and page budget discipline.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400">⚠️</span>
                      <span><strong>Challenging Evidence &amp; Caveats:</strong> Divergent field observations and inquiry limitations are clearly stated.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400">🔗</span>
                      <span><strong>Traceability Index:</strong> Full mapping from finding back to underlying source entries.</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs text-[var(--muted-soft)] font-mono">
                  &ldquo;Internal workspace draft · Review and clearance required before external distribution.&rdquo;
                </div>
              </div>

              <div className="md:col-span-7">
                <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-1.5 shadow-2xl">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-[var(--surface)]">
                    <Image
                      src="/screenshots/deliverables.png"
                      alt="Field Learning Studio - Deliverables Learning Brief Document"
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 1024px) 100vw, 600px"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            10. PRINCIPLES / TRUST
        ------------------------------------------------------------- */}
        <section id="principles" className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="border-t border-[var(--border)] pt-16 space-y-10">
            <div className="space-y-3">
              <span className="fls-eyebrow">CORE TRUST PILLARS</span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                Built around professional evaluation standards.
              </h2>
              <p className="max-w-2xl text-sm text-[var(--muted)] leading-relaxed">
                Designed for teams that answer to steering committees, donors, and affected communities where rigor and defensibility are non-negotiable.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <span className="font-mono text-xs font-bold text-sky-400">01 / HUMAN REVIEW</span>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">No Auto-Findings</h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Findings must be explicitly authored and validated by evaluators. FLS organizes; humans judge.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <span className="font-mono text-xs font-bold text-emerald-400">02 / TRACEABILITY</span>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Unbroken Evidence Chain</h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Every recommendation connects back to findings, and findings connect back to source observations.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <span className="font-mono text-xs font-bold text-amber-400">03 / UNCERTAINTY</span>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Honest Divergence</h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Contradictory observations and inquiry limitations are highlighted, never concealed.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <span className="font-mono text-xs font-bold text-purple-400">04 / LOCAL-FIRST</span>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Private &amp; Offline-Ready</h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Working data lives in your browser&apos;s local IndexedDB. No sensitive beneficiary data is uploaded to remote servers.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <span className="font-mono text-xs font-bold text-blue-400">05 / WORKING DRAFT</span>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Draft for Clearance</h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Outputs are designed for professional human review and peer critique, not sold as a substitute for it.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <span className="font-mono text-xs font-bold text-rose-400">06 / SAFETY BOUNDARIES</span>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">MEP-01 &amp; MEP-02</h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Architectural integrity boundaries block wrong-order approvals and cascading data loss.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            11. WHO IT IS FOR
        ------------------------------------------------------------- */}
        <section className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="border-t border-[var(--border)] pt-16 space-y-8">
            <div className="space-y-3">
              <span className="fls-eyebrow">COMMUNITY &amp; PRACTICE</span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                Designed for professional sensemaking teams.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <strong className="block text-sm font-semibold text-[var(--foreground)]">
                  Monitoring, Evaluation &amp; Learning (MEL) Teams
                </strong>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Synthesize multi-site field missions under tight donor deadlines without losing minority perspectives or qualitative nuances.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <strong className="block text-sm font-semibold text-[var(--foreground)]">
                  Independent Evaluation Consultants
                </strong>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Build audit-proof evidence bases that withstand peer review, donor inspection, and steering committee defense.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <strong className="block text-sm font-semibold text-[var(--foreground)]">
                  Programme Learning Teams &amp; NGOs
                </strong>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Turn recurring field debriefs and supervision visits into actionable operational adjustments and organizational learning.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
                <strong className="block text-sm font-semibold text-[var(--foreground)]">
                  Research &amp; Peacebuilding Organizations
                </strong>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Preserve divergent community testimonies, sensitive context markers, and geographic disaggregation with absolute local privacy.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            12. FINAL CALL TO ACTION
        ------------------------------------------------------------- */}
        <section className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-2xl border border-[var(--border-strong)] bg-gradient-to-b from-[var(--surface-elevated)] to-[var(--surface)] p-8 sm:p-12 text-center space-y-6 shadow-2xl">
            <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-[var(--foreground)]">
              Turn field material into work you can defend.
            </h2>
            <p className="mx-auto max-w-xl text-sm sm:text-base text-[var(--muted)] leading-relaxed">
              Open Field Learning Studio in your browser today. Preloaded with realistic reference studies, zero account setup required.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/studio"
                className="fls-button fls-button-primary text-sm font-semibold px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer"
              >
                Launch Field Learning Studio →
              </Link>
            </div>
            <p className="text-xs font-mono text-[var(--muted-soft)]">
              Local-first · No credit card · No server data transfer
            </p>
          </div>
        </section>
      </main>

      {/* -------------------------------------------------------------
          13. FOOTER
      ------------------------------------------------------------- */}
      <footer className="border-t border-[var(--border)] py-8 px-4 sm:px-6 text-xs text-[var(--muted-soft)]">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--foreground)]">Field Learning Studio</span>
            <span>·</span>
            <span>Local-First Evidence Synthesis for MEL &amp; Evaluation</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/studio" className="hover:text-[var(--foreground)] transition">
              Open Studio
            </Link>
            <a
              href="https://github.com/maissaramoheb/field-learning-studio"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--foreground)] transition"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
