---
name: OverWorld Music Dex
colors:
  surface: '#faf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#faf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f1'
  surface-container: '#efeeeb'
  surface-container-high: '#e9e8e5'
  surface-container-highest: '#e3e2e0'
  on-surface: '#1a1c1a'
  on-surface-variant: '#514345'
  inverse-surface: '#2f312f'
  inverse-on-surface: '#f2f1ee'
  outline: '#837375'
  outline-variant: '#d6c2c4'
  surface-tint: '#864e5a'
  primary: '#864e5a'
  on-primary: '#ffffff'
  primary-container: '#ffb7c5'
  on-primary-container: '#7b4551'
  inverse-primary: '#fbb3c1'
  secondary: '#2c6956'
  on-secondary: '#ffffff'
  secondary-container: '#aeedd5'
  on-secondary-container: '#316d5b'
  tertiary: '#356572'
  on-tertiary: '#ffffff'
  tertiary-container: '#a2d2e2'
  on-tertiary-container: '#2b5b69'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9df'
  primary-fixed-dim: '#fbb3c1'
  on-primary-fixed: '#360c19'
  on-primary-fixed-variant: '#6b3743'
  secondary-fixed: '#b1efd8'
  secondary-fixed-dim: '#96d3bd'
  on-secondary-fixed: '#002118'
  on-secondary-fixed-variant: '#0d503f'
  tertiary-fixed: '#baeafa'
  tertiary-fixed-dim: '#9ecede'
  on-tertiary-fixed: '#001f27'
  on-tertiary-fixed-variant: '#1a4d5a'
  background: '#faf9f6'
  on-background: '#1a1c1a'
  surface-variant: '#e3e2e0'
typography:
  headline-lg:
    fontFamily: Quicksand
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Quicksand
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Quicksand
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Quicksand
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Quicksand
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  label-sm:
    fontFamily: Quicksand
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  card-padding: 24px
---

## Brand & Style
The design system for this product is built on a "Calm Playfulness" aesthetic, merging the nostalgic comfort of a Pokémon Center with a modern, high-fidelity tactile interface. The target audience includes collectors, music enthusiasts, and gamers who appreciate a cozy, low-stress digital environment. 

The style is **Tactile Neomorphism**. UI elements should feel like physical, soft-plastic buttons that are "pressed" into or "extruded" from a continuous surface. The emotional response should be one of safety, approachability, and satisfaction, achieved through pillowy textures, generous whitespace, and a complete absence of sharp edges.

## Colors
The palette utilizes a "Creamy White" (`#FAF9F6`) base to allow soft shadows and highlights to remain visible. 
- **Primary (Soft Pink):** Used for main interactions, active states, and core branding elements.
- **Secondary (Mint Green):** Used for positive states, health bars (high), and success indicators.
- **Tertiary (Sky Blue):** Used for informational elements, backgrounds, and secondary navigation.
- **System Accents:** Yellow and Red are reserved for mid-range and low-range progress states, mirroring classic handheld game mechanics.

Avoid pure black; all text should use a deep, warm grey to maintain the soft-plastic aesthetic.

## Typography
The system uses **Quicksand** exclusively to leverage its rounded terminals and friendly character. 
- **Headlines:** Set with tight letter-spacing and high weights to create a "bubble" effect.
- **Body Text:** Uses a medium weight (`500`) as the standard for better legibility against low-contrast Neumorphic backgrounds.
- **Labels:** Always capitalized with increased letter spacing to provide a clear functional distinction from content.

## Layout & Spacing
The layout follows a **Fluid Grid** model with high internal padding to prevent the UI from feeling cramped. 
- **Desktop:** 12-column grid with wide 48px margins.
- **Mobile:** 4-column grid with 16px margins.
- **Philosophy:** Elements should be spaced generously to allow the "shadow halos" of the Neumorphic style enough room to bleed without overlapping, ensuring every element feels like a distinct physical object.

## Elevation & Depth
Depth is created using dual shadows:
1. **Extruded (Outer):** A light shadow (White, `-5px -5px 10px`) on the top-left and a dark shadow (Muted Grey-Pink, `5px 5px 10px`) on the bottom-right.
2. **Pressed (Inner):** Use `inset` shadows with the same logic for active button states or input fields.
3. **Surface Blending:** Elements must match the background color (`#FAF9F6`) exactly; the illusion of depth is created solely through these light and dark gradients.

## Shapes
This design system uses a **Pill-shaped** (`3`) philosophy. 
- **Small components:** Buttons and tags use a fully rounded/stadium radius.
- **Large components:** Cards and containers use a minimum of `2rem` (32px) radius to maintain the "squishy" feel.
- **Strict Rule:** No corner should ever be sharper than 16px, even in nested elements.

## Components
- **Health Bar (Progress):** A thick, rounded container with an inset shadow. The fill is a solid, vibrant color: Green (`>50%`), Yellow (`20-50%`), or Red (`<20%`). Use a "glossy" highlight on the top half of the fill.
- **Neumorphic Buttons:** Use the extruded shadow state by default. On hover, the shadows soften. On click/active, transition to the inset (pressed) shadow state.
- **Cards:** Large, expansive containers with `rounded-lg` or `rounded-xl`. Include a subtle inner glow (`#FFFFFF` at 50% opacity) on the top-left edge to simulate a plastic sheen.
- **Navigation Tree:** Use vertical lines with rounded joints to show hierarchy, appearing as if the paths are "carved" into the surface.
- **Input Fields:** Always use the inset shadow state to signify that they are "hollow" areas meant to be filled.