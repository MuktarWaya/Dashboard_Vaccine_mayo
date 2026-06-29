---
name: Sukhaphap Mayo
colors:
  surface: '#f9faf6'
  surface-dim: '#d9dad7'
  surface-bright: '#f9faf6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f0'
  surface-container: '#edeeea'
  surface-container-high: '#e7e9e5'
  surface-container-highest: '#e2e3df'
  on-surface: '#1a1c1a'
  on-surface-variant: '#414943'
  inverse-surface: '#2e312f'
  inverse-on-surface: '#f0f1ed'
  outline: '#717973'
  outline-variant: '#c0c9c1'
  surface-tint: '#3a674f'
  primary: '#14422d'
  on-primary: '#ffffff'
  primary-container: '#2d5a43'
  on-primary-container: '#9fcfb2'
  inverse-primary: '#a1d1b4'
  secondary: '#9b4145'
  on-secondary: '#ffffff'
  secondary-container: '#fd8e90'
  on-secondary-container: '#76252a'
  tertiary: '#5b2d2f'
  on-tertiary: '#ffffff'
  tertiary-container: '#764345'
  on-tertiary-container: '#f8b3b5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bceecf'
  primary-fixed-dim: '#a1d1b4'
  on-primary-fixed: '#002112'
  on-primary-fixed-variant: '#224f39'
  secondary-fixed: '#ffdad9'
  secondary-fixed-dim: '#ffb3b3'
  on-secondary-fixed: '#400009'
  on-secondary-fixed-variant: '#7d2a2f'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#fab5b6'
  on-tertiary-fixed: '#350f12'
  on-tertiary-fixed-variant: '#69393b'
  background: '#f9faf6'
  on-background: '#1a1c1a'
  surface-variant: '#e2e3df'
  accent-gold: '#C5A059'
  status-ready: '#3E7B5A'
  status-pending: '#D97706'
  surface-warm: '#F9F8F6'
  border-muted: '#D1D5DB'
typography:
  display-lg:
    fontFamily: Noto Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Noto Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Noto Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Noto Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  caption:
    fontFamily: Noto Sans
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  card-gap: 12px
  section-margin: 32px
---

## Brand & Style
The design system is built on a "Service-First Corporate" philosophy. It balances the authoritative weight of a government institution with the warmth required for community health services. The aesthetic avoids the sterile, high-tech tropes of SaaS products in favor of a stable, trustworthy, and human-centric interface.

The style is characterized by:
*   **Structured Clarity:** High-contrast boundaries and clear information hierarchies.
*   **Operational Density:** A compact layout that respects the user's time and attention, prioritizing data over decoration.
*   **Tactile Reliability:** Subtle shadows and solid borders that provide a sense of physical permanence and "readiness."
*   **Cultural Context:** Typography and color choices that resonate with Thai public service values—stability, health, and dedication.

## Colors
This design system utilizes a palette rooted in institutional heritage and organic health.

*   **Primary (Muted Green):** Represents health, growth, and service readiness. It is used for primary actions, success states, and key navigational elements.
*   **Secondary (Deep Maroon):** Provides institutional weight and emphasis. Used for headers, critical alerts, and brand-identifying motifs to convey seriousness and authority.
*   **Restrained Gold:** Used sparingly for "Special Highlights" or "Official Certifications." It marks data points that have reached peak quality or district-wide milestones.
*   **Neutral Palette:** Bases are set in warm greys and off-whites (`#F9F8F6`) to prevent screen fatigue and maintain a "warm" community feel, avoiding the clinical coldness of pure white or the modernism of dark mode.

## Typography
The system uses **Noto Sans** (Thai-compatible) exclusively to ensure maximum legibility for older users and field staff. This sans-serif choice provides a modern, clean look that is far more readable on low-resolution mobile screens than traditional looped Thai fonts.

*   **Hierarchy:** Large display sizes are reserved for high-level aggregate numbers (KPIs). 
*   **Readability:** Line heights are slightly increased (1.5x for body text) to accommodate Thai diacritics and prevent visual "crowding."
*   **Emphasis:** Use weight (Bold/Semi-bold) rather than color to denote importance, ensuring accessibility for users with varying visual acuity.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. The dashboard content is centered with a max-width of 1280px on desktop, while margins and card widths become fluid on mobile and tablet.

*   **Grid:** A 12-column grid is used for desktop. KPI cards typically span 3 columns, while main charts/tables span 12 or 8/4 splits.
*   **Compact Density:** Spacing between related elements is kept tight (8px-12px) to minimize scrolling for operational users who need a "glanceable" overview.
*   **Mobile Adaptivity:** On mobile (below 768px), the 12-column grid collapses into a single column. Horizontal tables transform into "Data Cards" to prevent horizontal scrolling of critical vaccine counts.

## Elevation & Depth
This design system uses **Tonal Layers** and **Low-Contrast Outlines** rather than aggressive shadows. This creates a "flat-plus" look that feels institutional and reliable.

*   **Surface 1 (Background):** `#F9F8F6` (Warm neutral).
*   **Surface 2 (Cards/Containers):** Pure `#FFFFFF` with a 1px solid border of `#D1D5DB`.
*   **Depth:** Elevation is indicated by a very subtle 2px soft shadow (Alpha 5%) only on interactive elements like buttons or active tabs. 
*   **Separation:** Use background color shifts (e.g., a slightly darker grey header) to separate the app navigation from the dashboard content.

## Shapes
Shapes are **Soft (0.25rem / 4px)**. This subtle rounding removes the "sharpness" of a purely bureaucratic tool while maintaining a professional, structured appearance.

*   **Buttons & Inputs:** 4px radius.
*   **Cards:** 8px (`rounded-lg`) to provide a clear container for data.
*   **Status Tags/Chips:** Fully rounded (pill) to distinguish them from interactive buttons.

## Components
Consistent component behavior ensures the dashboard feels like a single, cohesive tool.

*   **Buttons:** 
    *   *Primary:* Muted Green background, white text. 
    *   *Secondary (Staff Login):* Outline style with Deep Maroon text/border to be visible but not dominant.
*   **Dashboard Tabs:** Large, easy-to-tap targets. The active tab uses a 3px Deep Maroon bottom border and Bold text.
*   **KPI Cards:** Feature a large display number (Primary Green) with a small Label (Deep Maroon) above it. A restrained gold bar can be used at the top of the card for "Verified" or "Completed" metrics.
*   **Data Tables:** High contrast. Header row has a soft grey background (`#F3F4F6`). Rows use alternating subtle tints for readability.
*   **Empty States:** When data is `NOT_READY`, use a centered, light-grey placeholder box within the card, featuring the text "กำลังเตรียมข้อมูลรายเดือน" in a medium-grey body-lg font. No "playful" illustrations; use a simple document icon if needed.
*   **Status Chips:** Used in the Quality Dashboard. 
    *   `ยืนยันแล้ว`: Green background (10% opacity) + Primary Green text.
    *   `ต้องติดตาม`: Maroon background (10% opacity) + Maroon text.