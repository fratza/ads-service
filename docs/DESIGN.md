# Design Guidelines for This Repo

This document defines the visual and UI consistency rules for this app.

It is based on three sources, in this order:

1. **The current repo implementation**
2. **`@ntv360/component-pantry` usage already present in the app**
3. **Visible NTV360 brand cues from https://ntv360.com/**

If these sources conflict, **the repo is the source of truth** until the theme is intentionally updated.

## 1. Design Principles

- Keep the UI clean, modern, and business-oriented.
- Prefer clarity over decoration.
- Reuse existing visual tokens before inventing new ones.
- Build new screens so they look like part of the same product family.
- Favor consistency in spacing, typography, color, radius, and elevation.

## 2. Primary UI System

This repo already uses:

- `@ntv360/component-pantry`
- Tailwind CSS
- SCSS
- custom theme tokens in `tailwind.config.js`

### Rule

When building UI:

- Prefer **Component Pantry components first** for buttons, cards, and common interactive UI.
- Use Tailwind utilities and SCSS to compose layout and local styling around those components.
- Do not create custom replacements for Component Pantry primitives unless the package cannot support the required behavior.

## 3. Brand Direction

The current repo theme already aligns with an NTV360-style visual direction:

- deep blue / navy primary palette
- bright green accent palette
- soft neutral surfaces
- rounded corners
- light elevation and subtle interaction states

These choices should remain the default visual language for the app.

## 4. Color Rules

Use the colors already defined in `tailwind.config.js`.

### Primary colors

Use the existing `primary` scale for major brand structure:

- `primary.main` / `primary.500` for primary actions and branded emphasis
- darker `primary.600+` for stronger emphasis, headers, and contrast-heavy areas
- lighter `primary.50-200` for soft backgrounds and selected states

### Accent colors

Use the existing `accent` scale for secondary branded emphasis:

- `accent.main` / `accent.500` for success-leaning highlights and branded accent moments
- avoid overusing accent green as a page background
- use accent more sparingly than primary

### Neutral colors

Use neutrals for structure:

- `neutral.*`, `porcelain`, `platinum`, `lightGrey`, `iron`
- use these for page backgrounds, borders, dividers, and muted surfaces

### Semantic colors

Use only the semantic theme tokens for status UI:

- `success.*`
- `warning.*`
- `danger.*`
- `info.*` / `information.*`

Do not invent one-off status colors in components.

## 5. Typography Rules

### Current repo truth

The repo currently uses **Nunito** in `src/styles.scss` and `tailwind.config.js`.

### Brand cue note

The NTV360 website visibly loads fonts including:

- `Plus Jakarta Sans`
- `Poppins`
- `Archivo`

### Rule

- For this app, continue using **Nunito** unless the repo explicitly migrates typography globally.
- Do not introduce per-page or per-component font changes.
- Maintain strong hierarchy using size, weight, spacing, and color rather than swapping fonts.

### Practical hierarchy

- Page titles: bold, high contrast
- Section titles: semibold or bold
- Body copy: readable, neutral contrast
- Supporting text: muted neutral tone
- Avoid dense all-caps UI unless needed for labels/badges

## 6. Component Pantry Usage Rules

### Buttons

- Prefer `ntv-button` over custom button markup for standard actions.
- Use variant choices intentionally:
  - primary → main action
  - success → positive/confirming action
  - outline → lower emphasis action
- Keep a clear primary action per section.
- Avoid too many equal-weight CTA buttons in one area.

### Cards

- Prefer `ntv-card` for grouped content panels.
- Default style direction:
  - rounded corners
  - subtle shadow or outlined treatment
  - clear padding
  - strong title + concise supporting text
- Use clickable cards only when the whole card is truly interactive.

### Interaction styling

- Use hover states subtly.
- Keep shadows moderate.
- Prefer one interaction cue at a time: shadow, border, or color shift.

## 7. Layout and Spacing

- Use consistent spacing scales; avoid arbitrary pixel values when existing spacing utilities work.
- Prefer breathable layouts with clear grouping.
- Keep content aligned to a predictable grid.
- Avoid cramped panels and excessive nesting.

### General spacing direction

- page sections should have generous vertical rhythm
- card content should have comfortable internal padding
- related controls should be grouped closely
- unrelated groups should have stronger separation

## 8. Surface, Radius, and Elevation

- Prefer soft, modern surfaces.
- Rounded corners are part of the current app direction.
- Use elevation sparingly:
  - flat/outlined for low emphasis
  - light elevation for standard content containers
  - stronger elevation only for focus areas

Do not mix too many radius and shadow styles in the same screen.

## 9. Dark Mode

The repo contains dark mode tokens in `tailwind.config.js`.

### Rule

- Any new dark-mode-aware work must use the existing `dark.*` tokens.
- Do not introduce custom dark palettes outside the existing theme unless the design system is being intentionally expanded.

## 10. Content Tone in UI

UI copy should feel:

- direct
- professional
- helpful
- concise

Avoid playful or overly marketing-heavy language inside product workflows unless the feature explicitly calls for it.

## 11. Do and Don’t

### Do

- use Component Pantry first
- reuse repo color tokens
- keep rounded corners and soft elevation consistent
- use Nunito consistently
- design around clear hierarchy and readable spacing
- keep pages visually aligned with the current blue/green NTV360-style palette

### Don’t

- introduce random new brand colors
- mix multiple visual systems on one page
- add custom primitives when Component Pantry already covers the need
- switch fonts locally
- create overly saturated or noisy screens
- use heavy shadows, dense borders, or inconsistent radii

## 12. Working Rule for Future Tasks

For every UI task in this repo:

1. Start with `@ntv360/component-pantry`.
2. Use the existing tokens from `tailwind.config.js`.
3. Preserve the current blue/green/neutral NTV360-style palette.
4. Keep typography on Nunito unless the app globally changes fonts.
5. Make the new UI look native to the rest of the app, not like a standalone redesign.
