---
name: Field Learning Studio
description: Traceable Field Evidence Synthesis
colors:
  primary: "#2563EB"
  primary-strong: "#3B82F6"
  accent-wash-strong: "rgba(37, 99, 235, 0.16)"
  accent-wash: "rgba(37, 99, 235, 0.10)"
  trace: "#22D3EE"
  trace-text: "#67E8F9"
  trace-wash: "rgba(34, 211, 238, 0.10)"
  background: "#050B14"
  background-secondary: "#07111F"
  foreground: "#F8FAFC"
  muted: "#CBD5E1"
  muted-soft: "#94A3B8"
  border: "rgba(148, 163, 184, 0.22)"
  surface: "#101B2C"
  surface-muted: "#0B1625"
  surface-elevated: "#162338"
  surface-soft: "#1D2B42"
  warning: "#F59E0B"
  warning-text: "#FCD34D"
  danger: "#F87171"
  danger-text: "#FDA4AF"
  success: "#34D399"
  success-text: "#A7F3D0"
  document: "#F8FAFC"
  document-surface: "#FFFFFF"
  document-ink: "#0F172A"
  document-muted: "#475569"
  document-border: "rgba(15, 23, 42, 0.14)"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "0"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "8px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-strong}"
---

# Design System: Field Learning Studio

## 1. Overview

**Creative North Star: "The Blue Evidence Command Center"**

Field Learning Studio is designed as a premium analytical workspace for Monitoring, Evaluation, and Learning practitioners. The visual environment should feel like a blue-black evidence command center: calm, serious, institutional, donor-safe, and tuned for reviewing sensitive field evidence without cognitive fatigue.

### Key Characteristics

- **Restrained blue-slate color strategy**: Deep blue-black surfaces carry the workspace; primary blue is used for current selection and major actions.
- **Traceability as signature accent**: Cyan is reserved for traceability, focus rings, and active claim-lineage states.
- **Clear dark surfaces**: Depth comes from stepped slate surfaces, thin borders, and explicit content regions rather than shadow or decorative effects.
- **High-contrast readability**: Text must remain readable in dark mode for institutional review contexts.
- **Document contrast**: The learning brief remains a light paper canvas inside the dark workspace.

**The Command Center Rule.** Every interface element must support evidence review, claim tracing, recommendation checking, QA review, or brief preparation. Visual decoration that does not improve hierarchy, scanning speed, or claim validation is prohibited.

**The Restraint Rule.** Avoid green terminal styling, cyberpunk glow, decorative grids, heavy glassmorphism, purple AI gradients, and playful SaaS visuals. The product should look credible in a donor briefing room or senior evaluation review session.

---

## 2. Colors

The v0.6 palette is a restrained blue-slate dark system with separate roles for primary actions, traceability, safety, risk, and pass states.

### Primary

- **Command Blue** (#2563EB): Primary actions, selected navigation, and selected case state.
- **Command Blue Hover** (#3B82F6): Hover and active primary action states.
- **Trace Cyan** (#22D3EE): Traceability IDs, claim-lineage active nodes, and focus rings.
- **Trace Cyan Text** (#67E8F9): Trace labels and active lineage text.

### Neutral

- **Main Background** (#050B14): Primary page canvas.
- **Secondary Background** (#07111F): Subtle depth layer for the top shell.
- **Primary Surface** (#101B2C): Main workbench panels.
- **Secondary Surface** (#0B1625): Toolbars, filters, compact metadata, and nested panels.
- **Elevated Surface** (#162338): Active case and selected surfaces.
- **Soft Surface** (#1D2B42): Rare, stronger depth surface.
- **Primary Text** (#F8FAFC): Main headings and high-priority content.
- **Secondary Text** (#CBD5E1): Body copy and explanatory text.
- **Muted Text** (#94A3B8): Low-priority metadata only.
- **Border** (rgba(148, 163, 184, 0.22)): Standard boundaries.

### Semantic

- **Amber Warning** (#F59E0B): Safety notices, needs-review states, and sanitized-data warnings.
- **Risk Red** (#F87171): Warnings and failed QA/risk states.
- **Success Green** (#34D399): Pass and completion states only.
- **Document Paper** (#F8FAFC / #FFFFFF): Learning brief preview only.

**The Color Role Rule.** Blue is the product primary. Cyan is mainly traceability. Amber is safety and review. Red is risk. Green is only pass/success.

---

## 3. Typography

The product uses a single highly legible system sans-serif stack for compatibility, performance, and density. This is product UI; typography should support executive analysis rather than marketing display.

**Display Font:** ui-sans-serif, system-ui, sans-serif
**Body Font:** ui-sans-serif, system-ui, sans-serif

### Hierarchy

- **Display / H1**: Semi-bold, 40-48px desktop, 1.15 line-height, no negative tracking.
- **Headline / H2**: Semi-bold, 24-30px, 1.25 line-height.
- **Title / H3**: Semi-bold, 16-18px, 1.4 line-height.
- **Body**: Regular, 16px, 1.7 line-height, max 75ch for prose.
- **Metadata**: 11-12px, medium or semibold, used sparingly.
- **Identifier**: Monospaced 10-12px pill or trace node.

**The Metadata Restraint Rule.** Metadata must support scanning, not dominate content. Avoid excessive uppercase labels and tiny grey text.

---

## 4. Elevation

The system uses flat layered surfaces, not decorative shadows.

- **Canvas**: Main blue-black page background.
- **Workbench Surface**: Primary cards, sections, and panels.
- **Nested Surface**: Filters, compact metadata, observation panels, and toolbars.
- **Elevated Surface**: Selected cards, active case intelligence panel, drawer, and active navigation surfaces.
- **Document Surface**: Light paper canvas for final brief output.

**The Shadow Ban Rule.** Do not pair a 1px solid border with a soft drop shadow on buttons, cards, or inputs. Use tonal surface steps and borders instead.

---

## 5. Components

### Buttons

- **Shape**: 8px radius.
- **Primary**: Solid Command Blue with white text.
- **Hover**: Command Blue Hover.
- **Focus**: Trace Cyan ring.

### Trace Buttons and Trace Nodes

- **TraceButton**: Monospaced ID pill with cyan text, cyan border, and low-opacity cyan wash.
- **TraceChain**: Labeled source-to-brief lineage nodes, not a row of tiny tags. Active node uses Trace Cyan; inactive nodes use slate surfaces.
- **Trace Drawer**: Must feel like the most important inspection interaction in the product.

### Cards / Containers

- **Corner Style**: 8px radius.
- **Background**: Primary Surface or Secondary Surface.
- **Border**: 1px solid Border.
- **Padding**: 16-24px depending on density.
- **Nested cards**: Avoid unless the nested area is a tool, drawer, repeated item, or document region.

### Inputs / Fields

- **Style**: Secondary Surface background, 1px border, 8px radius.
- **Focus**: Trace Cyan border/ring.

### Navigation / Tabs

- **Style**: Sticky blue-slate segmented tab bar.
- **Active**: Command Blue fill with white text.
- **Hover**: Secondary/elevated slate surface.
- **Focus**: Trace Cyan ring.

### Brief Preview

- **Document**: Light paper canvas, cool off-white, dark slate ink.
- **Markdown Source**: Secondary and hidden behind disclosure by default.

---

## 6. Do's and Don'ts

### Do

- Do preserve the evidence-to-learning workflow.
- Do keep traceability visually inspectable and interactive.
- Do check contrast for dark-mode body and metadata text.
- Do keep cyan scarce and tied to traceability.
- Do keep amber safety notes visible but refined.
- Do use green only for pass/completion states.
- Do keep card radius at 8px.
- Do preserve future RTL compatibility.

### Don't

- Don't make the product green, terminal-like, cyberpunk, or security-console-like.
- Don't use purple AI gradients.
- Don't use heavy glassmorphism.
- Don't use decorative grid backgrounds.
- Don't use side-stripe borders as accents.
- Don't use gradient text.
- Don't use over-rounded cards.
- Don't introduce auth, database, file upload, backend, external AI calls, or real sensitive data processing in v0.6.
