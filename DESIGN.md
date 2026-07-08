---
name: Field Learning Studio
description: Traceable Field Evidence Synthesis
colors:
  primary: "#0f766e"
  primary-strong: "#0b5f59"
  background: "#f8faf9"
  foreground: "#17211c"
  muted: "#5d6962"
  border: "#d9e1dc"
  surface: "#ffffff"
  surface-muted: "#eef5f2"
  warning: "#a16207"
  danger: "#b42318"
typography:
  display:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
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

**Creative North Star: "The Institutional Ledger"**

Field Learning Studio is designed as a professional analytical workspace for Monitoring, Evaluation, and Learning (MEL) practitioners. The visual environment mimics a clean, authoritative reporting ledger rather than a consumer web application. Space, boundaries, and typography are optimized for scanning dense programmatic findings, source logs, and evidence matrices without cognitive fatigue. The design prioritizes structured layout, visual hierarchy, and explicit content regions.

### Key Characteristics:
- **Restrained color strategy**: Primarily neutral palette with a teal accent (≤10% of surface) to direct focus.
- **Clear boundaries**: Strict grid divisions, thin borders, and structured headers keep data compartmentalized.
- **High-contrast readability**: Strict compliance with WCAG AA/AAA text legibility for institutional settings.
- **Explicit traceability**: Visual linking of claims to their exact raw source logs.

**The Ledger Rule.** Every interface element must behave like a part of an official evaluation document. Visual decoration that does not contribute to hierarchy, scanning speed, or validation of claims is prohibited.

**The Restraint Rule.** Avoid flashy trends, decorative background grids, neon highlights, and dark mode by default. The tool must look at home in a ministerial department or a donor briefing room.

---

## 2. Colors

The color palette is a restrained, nature-inspired neutral scale with a deep teal primary accent that signals professional authority.

### Primary
- **Muted Teal** (#0f766e): Used exclusively for primary call-to-actions, workflow stepper indicators, and high-priority active navigation states.
- **Deep Teal** (#0b5f59): Used for primary hover and active press states.

### Neutral
- **Off-White / Cool Paper** (#f8faf9): The primary canvas background color, reducing eye strain during long synthesis sessions.
- **Ink / Obsidian** (#17211c): The primary body copy and title color, chosen for crisp contrast.
- **Faded Ink / Sage-Muted** (#5d6962): Used for descriptions, subtitles, table headers, and secondary copy.
- **Border Sage** (#d9e1dc): 1px divider and frame borders separating sections and cards.
- **Pure White** (#ffffff): Background color for interactive cards, input containers, and active document elements.
- **Surface Muted** (#eef5f2): Background for table headers, inactive tabs, and metric tiles.

### Status
- **Amber Warning** (#a16207): Signals data sensitivity or checklist items that need human review.
- **Red Danger** (#b42318): Highlights critical warnings, data breaches, or failed QA rules.

**The Accent Rarity Rule.** Muted Teal (#0f766e) must not cover more than 10% of any screen. Its strength lies in its scarcity; it should only call out focus areas and interactive endpoints.

---

## 3. Typography

The default typography uses highly legible, standard system sans-serif font families to guarantee maximum compatibility, accessibility, and fast load times in low-bandwidth field environments.

**Display Font:** Arial, Helvetica, sans-serif
**Body Font:** Arial, Helvetica, sans-serif

### Hierarchy
- **Display / H1** (Bold, 60px / 3.75rem max, 1.15 line-height): Used for the main workspace title. Uses tight letter-spacing (-0.02em) to prevent letter collision.
- **Headline / H2** (Semi-bold, 30px / 1.875rem, 1.25 line-height): Used for workspace section headers (e.g. "Evidence Matrix", "QA Review").
- **Title / H3** (Semi-bold, 18px / 1.125rem, 1.4 line-height): Used for individual card headers, finding statements, and modal titles.
- **Body** (Regular, 16px / 1rem, 1.75 line-height): Used for descriptions, notes, explanations, and raw field logs. Max line length is restricted to 75ch.
- **Label / Mono** (Medium, 12px / 0.75rem, uppercase or monospace): Used for ID pills (e.g. `SRC-001`, `EV-010`), status badges, and metadata.

**The Monospace Identifier Rule.** Any reference to a record ID, source ID, finding ID, or recommendation ID must use a monospaced font family, structured as a pill, to make its status as a reference marker distinct.

---

## 4. Elevation

The system operates on a clean, layered flat aesthetic. It explicitly rejects deep blurs, heavy drop shadows, or floating cards in favor of thin borders and tonal shifts.

- **Flat Canvas**: The default state. Sections are separated by Border Sage (#d9e1dc) 1px lines.
- **Low Layering**: Cards and interactive elements use a Pure White (#ffffff) background on the Off-White (#f8faf9) canvas with no shadow, but are bound by a 1px Border Sage.
- **High Layering (Dialogs/Popovers)**: Used only for overlay drawers or select dropdowns, utilizing a thin 1px border and a tight, ambient-low shadow (`0 2px 8px rgba(0,0,0,0.08)`).

**The Shadow Ban Rule.** Do not pair a 1px solid border with a soft drop shadow on buttons, cards, or inputs. Choose either a solid 1px border at rest OR a flat background tint; never use shadows as decoration.

---

## 5. Components

### Buttons
- **Shape**: Rounded corners (8px radius / `rounded-md`).
- **Primary**: Solid Muted Teal (#0f766e) background with White text. Vertical padding: 8px, Horizontal padding: 16px.
- **Hover**: Transitions smoothly over 150ms to Deep Teal (#0b5f59).

### ID Pills
- **Style**: Monospace font, 12px, border Sage (#d9e1dc), background Surface Muted (#eef5f2), text Muted Teal (#0f766e) or primary color. Very low rounding (4px radius) to maintain a database-style appearance.

### Cards / Containers
- **Corner Style**: Rounded corners (8px radius).
- **Background**: Pure White (#ffffff).
- **Border**: 1px solid Border Sage (#d9e1dc).
- **Internal Padding**: 16px (sm-md) to 20px (lg) to prevent cramped text.

### Inputs / Fields
- **Style**: Pure White (#ffffff) background, 1px solid Border Sage (#d9e1dc), rounded corners (8px).
- **Focus**: Transitions to border Muted Teal (#0f766e) with no outline glow.

### Navigation / Stepper
- **Style**: Sticky top bar, white background with backdrop-blur (95% opacity), border-b 1px solid Border Sage. Interactive links have a 4px corner radius and a light background hover state.

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
