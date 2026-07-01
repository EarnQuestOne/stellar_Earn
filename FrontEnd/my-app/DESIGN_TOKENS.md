# Design Tokens

This document describes the centralised design token system used to ensure consistent theming across the application.

## Token Architecture

Tokens are defined in two places:

1. **`app/globals.css`** — The `@theme inline` block registers tokens with Tailwind v4, making them available as utility classes (e.g., `bg-primary`, `text-dark-muted`).
2. **`tailwind.config.js`** — Mirrors the CSS tokens for IDE support (Tailwind CSS Intellisense) and backwards compatibility.

Theme-aware values (light/dark switching) are driven by CSS custom properties defined in **`styles/themes.css`**.

## Colour Tokens

### Theme-Aware Colours

These tokens switch between light and dark mode via `styles/themes.css`.

| Token           | Tailwind Class                                                 | Light Mode | Dark Mode |
| --------------- | -------------------------------------------------------------- | ---------- | --------- |
| `primary`       | `bg-primary`, `text-primary`, `border-primary`, `ring-primary` | `#089ec3`  | `#22b8d6` |
| `surface`       | `bg-surface`                                                   | `#ffffff`  | `#111827` |
| `surface-muted` | `bg-surface-muted`                                             | `#f1f5f9`  | `#1f2937` |
| `body`          | `text-body`                                                    | `#0f172a`  | `#e5e7eb` |
| `muted`         | `text-muted`                                                   | `#475569`  | `#94a3b8` |
| `border`        | `border-border`                                                | `#dbe2ea`  | `#263242` |
| `bg`            | `bg-bg`                                                        | `#f5f7fb`  | `#090d14` |

### Fixed Colours (Dark Mode Specific)

These tokens are fixed values used in dark-mode-first UI without theme switching.

| Token                   | Tailwind Class                   | Value     |
| ----------------------- | -------------------------------- | --------- |
| `secondary`             | `bg-secondary`, `text-secondary` | `#33C5E0` |
| `dark-surface`          | `bg-dark-surface`                | `#0F1621` |
| `dark-surface-elevated` | `bg-dark-surface-elevated`       | `#161E22` |
| `dark-surface-overlay`  | `bg-dark-surface-overlay`        | `#1a2333` |
| `dark-border`           | `border-dark-border`             | `#2A3338` |
| `dark-border-darker`    | `border-dark-border-darker`      | `#1e293b` |
| `dark-border-accent`    | `border-dark-border-accent`      | `#2d3b4f` |
| `dark-muted`            | `text-dark-muted`                | `#92A5A8` |
| `dark-muted-dimmer`     | `text-dark-muted-dimmer`         | `#5D6B6E` |
| `dark-surface-hero`     | `bg-dark-surface-hero`           | `#071020` |
| `dark-surface-hero-alt` | `bg-dark-surface-hero-alt`       | `#0a1628` |
| `dark-primary-darker`   | `to-dark-primary-darker`         | `#056d86` |
| `primary-hover`         | `hover:bg-primary-hover`         | `#078dae` |
| `primary-text-hover`    | `hover:text-primary-text-hover`  | `#067a96` |

## Typography Tokens

| Token | Tailwind Class | Value             |
| ----- | -------------- | ----------------- |
| `2xs` | `text-2xs`     | `0.625rem` (10px) |

## Spacing Tokens

| Token | Tailwind Class       | Value   |
| ----- | -------------------- | ------- |
| `200` | `max-w-200`, `w-200` | `200px` |

## Z-Index Tokens

| Token        | Tailwind Class | Value |
| ------------ | -------------- | ----- |
| `dropdown`   | `z-dropdown`   | `100` |
| `modal`      | `z-modal`      | `110` |
| `onboarding` | `z-onboarding` | `60`  |

## Shadow Tokens

| Token              | Tailwind Class            | Shadow Value                        |
| ------------------ | ------------------------- | ----------------------------------- |
| `glow-sm`          | `shadow-glow-sm`          | `0 0 8px #33C5E0`                   |
| `glow`             | `shadow-glow`             | `0 0 20px rgba(51, 197, 224, 0.3)`  |
| `glow-md`          | `shadow-glow-md`          | `0 0 20px rgba(51, 197, 224, 0.1)`  |
| `glow-lg`          | `shadow-glow-lg`          | `0 0 28px rgba(34, 211, 238, 0.45)` |
| `glow-xl`          | `shadow-glow-xl`          | `0 0 25px rgba(51, 197, 224, 0.3)`  |
| `glow-hero`        | `shadow-glow-hero`        | `0 0 24px rgba(34, 211, 238, 0.2)`  |
| `glow-step`        | `shadow-glow-step`        | `0 0 16px rgba(34, 211, 238, 0.35)` |
| `glow-cta`         | `shadow-glow-cta`         | `0 0 20px rgba(34, 211, 238, 0.3)`  |
| `tooltip-backdrop` | `shadow-tooltip-backdrop` | `0 0 0 9999px rgba(0, 0, 0, 0.45)`  |

## Usage Guide

### In JSX/TSX (Tailwind Utility Classes)

**Before:**

```tsx
<button className="bg-[#089ec3] text-white rounded-lg hover:bg-[#0ab8d4]">
```

**After:**

```tsx
<button className="bg-primary text-white rounded-lg hover:bg-primary">
```

### In Inline Styles / SVG

Use CSS custom properties for inline styles:

```tsx
<path fill="var(--color-secondary)" />
```

### Adding New Tokens

1. Add the CSS variable to the `@theme inline` block in `app/globals.css`.
2. Mirrors the token in `tailwind.config.js` for IDE support.
3. If the token needs light/dark variants, add a CSS custom property in `styles/themes.css`.
4. Update this document with the new token.

## Migration Notes

- Viewport-relative values (`vh`, `vw`, `%`) and complex `calc()` expressions are kept as arbitrary values since they cannot be meaningfully tokenised.
- Component-specific sizing (e.g., `h-[52px]` for step indicators) is kept as-is to preserve visual fidelity.
- Animation-specific values (`scale-[1.02]`, `tracking-[0.2em]`) are kept as arbitrary values since they serve a single specific purpose.
