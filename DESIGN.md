---
name: Field Learning Studio
description: Traceable Field Evidence Synthesis
colors:
  primary: "#0f766e"
  primary-strong: "#0f8f83"
  accent-wash-strong: "rgba(27, 165, 150, 0.13)"
  accent-wash: "rgba(27, 165, 150, 0.10)"
  trace: "#38d6c7"
  trace-text: "#8de9df"
  background: "#07110f"
  foreground: "#f2f7f3"
  muted: "#b8c7bf"
  muted-soft: "#7e9188"
  border: "rgba(180, 205, 190, 0.16)"
  surface: "#0f1b17"
  surface-muted: "#14231e"
  surface-elevated: "#162620"
  warning: "#d99a2b"
  warning-text: "#f2c66d"
  danger: "#f97066"
  danger-text: "#ffaaa2"
  success: "#46d38a"
  success-text: "#8af0b8"
  document: "#f6f3eb"
  document-surface: "#fffdf6"
  document-ink: "#1d211d"
  document-muted: "#5e665f"
  document-border: "rgba(58, 70, 60, 0.16)"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
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
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-strong}"
---

# Design System: Field Learning Studio

## 1. Overview

**Creative North Star: "The Evidence Command Room"**

Field Learning Studio is designed as a premium analytical workspace for Monitoring, Evaluation, and Learning (MEL) practitioners. The visual environment should feel like a calm evidence command room: dark, serious, structured, and tuned for reviewing sensitive field evidence. Space, boundaries, and typography are optimized for scanning dense programmatic findings, source logs, recommendations, QA checks, and donor-facing brief content without cognitive fatigue.

### Key Characteristics:
- **Restrained dark color strategy**: Deep green-black neutrals carry the workspace; teal is reserved for primary actions and traceability.
- **Clear dark surfaces**: Depth comes from stepped surface lightness, thin borders, and explicit content regions rather than drop shadows.
- **High-contrast readability**: Strict compliance with WCAG AA/AAA text legibility for institutional settings.
- **Explicit traceability**: Visual linking of claims to their exact raw source logs.

**The Command Room Rule.** Every interface element must support evidence review, claim tracing, recommendation checking, QA review, or brief preparation. Visual decoration that does not contribute to hierarchy, scanning speed, or validation of claims is prohibited.

**The Restraint Rule.** Avoid flashy trends, decorative background grids, neon highlights, glassmorphism, and purple AI gradients. The tool must look at home in a donor briefing room or senior evaluation review session.

---

## 2. Colors

The color palette is a restrained dark green-black neutral scale with a deep teal primary accent and controlled trace cyan. Teal must remain scarce and purposeful.

### Primary
- **Refined Teal** (#1ba596): Used for primary call-to-actions and active workspace navigation.
- **Deep Teal** (#0f8f83): Used for primary hover and active press states.
- **Trace Cyan** (#38d6c7): Used for traceability IDs, claim-lineage highlights, and focus rings.

### Neutral
- **Command Background** (#07110f / #08130f): The primary canvas background.
- **Main Surface** (#0f1b17): Primary workbench panels.
- **Elevated Card** (#14231e / #162620): Cards, drawers, filter panels, and active case surfaces.
- **Primary Text** (#f2f7f3): Main headings and body text.
- **Secondary Text** (#b8c7bf): Descriptions, captions, and metadata.
- **Muted Text** (#7e9188): Low-priority metadata only.
- **Dark Border** (rgba(180, 205, 190, 0.16)): Thin divider and frame borders.
- **Document Sheet** (#f6f3eb): Brief preview sheet only.

### Status
- **Amber Warning** (#d99a2b): Signals data sensitivity or checklist items that need human review.
- **Risk Red** (#f97066): Highlights critical warnings, risk, or failed QA rules.
- **Success Green** (#46d38a): Signals passed review checks.

**The Accent Rarity Rule.** Teal and trace cyan must not dominate the screen. Their strength lies in scarcity; they should only call out primary actions, active tabs, focus states, and traceability endpoints.

---

## 3. Typography

The default typography uses highly legible, standard system sans-serif font families to guarantee maximum compatibility, accessibility, and fast load times in low-bandwidth field environments.

**Display Font:** ui-sans-serif, system-ui, sans-serif
**Body Font:** ui-sans-serif, system-ui, sans-serif

### Hierarchy
- **Display / H1** (Semi-bold, 48-56px desktop, 1.15 line-height): Used for the main workspace title. Uses normal tracking to keep dark-mode headings readable.
- **Headline / H2** (Semi-bold, 30px / 1.875rem, 1.25 line-height): Used for workspace section headers (e.g. "Evidence Matrix", "QA Review").
- **Title / H3** (Semi-bold, 18px / 1.125rem, 1.4 line-height): Used for individual card headers, finding statements, and modal titles.
- **Body** (Regular, 16px / 1rem, 1.75 line-height): Used for descriptions, notes, explanations, and raw field logs. Max line length is restricted to 75ch.
- **Label / Mono** (Medium, 12px / 0.75rem, uppercase or monospace): Used for ID pills (e.g. `SRC-001`, `EV-010`), status badges, and metadata.

**The Monospace Identifier Rule.** Any reference to a record ID, source ID, finding ID, or recommendation ID must use a monospaced font family, structured as a pill, to make its status as a reference marker distinct.

---

## 4. Elevation

The system operates on a clean, layered flat aesthetic. It explicitly rejects deep blurs, heavy drop shadows, or floating cards in favor of thin borders and tonal shifts.

- **Flat Canvas**: The default state. Sections are separated by Dark Border 1px lines.
- **Low Layering**: Cards and interactive elements use stepped dark surfaces with no decorative shadow.
- **High Layering (Drawers/Popovers)**: Used only for overlay drawers or select dropdowns, utilizing a stronger border and dark overlay.

**The Shadow Ban Rule.** Do not pair a 1px solid border with a soft drop shadow on buttons, cards, or inputs. Choose either a solid 1px border at rest OR a flat background tint; never use shadows as decoration.

---

## 5. Components

### Buttons
- **Shape**: Rounded corners (8px radius / `rounded-md`).
- **Primary**: Solid Refined Teal (#1ba596) background with White text. Vertical padding: 8px, Horizontal padding: 16px.
- **Hover**: Transitions smoothly over 150ms to Deep Teal (#0f8f83).

### ID Pills
- **Style**: Monospace font, 11-12px, controlled trace border, dark tinted trace background, trace cyan text. Very low rounding (4px radius) to maintain a database-style appearance.

### Cards / Containers
- **Corner Style**: Rounded corners (8px radius).
- **Background**: Main Surface (#0f1b17) or Elevated Card (#14231e).
- **Border**: 1px solid Dark Border.
- **Internal Padding**: 16px (sm-md) to 20px (lg) to prevent cramped text.

### Inputs / Fields
- **Style**: Elevated Card background, 1px solid Dark Border, rounded corners (8px).
- **Focus**: Transitions to Trace Cyan (#38d6c7) focus ring.

### Navigation / Stepper
- **Style**: Sticky dark segmented tab bar, dark surface background, 1px border, active teal selection. Interactive links have a 4px corner radius and restrained dark hover state.

---

## 6. Do's and Don'ts

### Do:
- **Do** check contrast ratios for secondary and status text to guarantee at least 4.5:1 against the canvas.
- **Do** wrap display titles in `text-wrap: balance` to prevent awkward orphaned words.
- **Do** restrict body line lengths to a readable width (max 75ch).
- **Do** keep every ID pill linked to a source view or action.

### Don't:
- **Don't** look like a flashy AI startup landing page.
- **Don't** use purple-gradient AI aesthetics.
- **Don't** use playful SaaS visuals.
- **Don't** use heavy glassmorphism.
- **Don't** use excessive animations or motion.
- **Don't** make it look like a generic chatbot.
- **Don't** use side-stripe borders (e.g., border-left-4) as accents on findings or recommendations cards.
- **Don't** use gradient text under any circumstances.
- **Don't** use card corners with border-radius larger than 8px.
