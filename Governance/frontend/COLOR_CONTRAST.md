# Frontend Color-Contrast and Palette Governance

This policy sets the minimum contrast requirements for the StellarEarn frontend
and defines how palette changes are proposed, reviewed, and released. It applies
to all themes, components, illustrations, charts, and state indicators in
`FrontEnd/my-app`.

- **Owner:** Frontend maintainers, with product design and accessibility as co-owners
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [Motion policy](MOTION_POLICY.md), [State UX](STATE_UX.md), [CI/CD policy](../CICD_POLICY.md)

## Minimum contrast ratios

StellarEarn targets WCAG 2.2 Level AA as the minimum for every shipped surface.

| Element | Minimum ratio |
|---------|---------------|
| Normal body text | 4.5:1 against its background |
| Large text (18 pt regular or 14 pt bold) | 3:1 |
| Icons and controls needed to understand or operate the interface | 3:1 |
| Focus indicators | 3:1 against adjacent colors |
| Chart lines, data marks, and meaningful graphics | 3:1 |
| Disabled controls | Exempt from the formal ratio, but must remain legible and clearly disabled |
| Decorative elements | No requirement; must not carry meaning |

Text over images, gradients, or translucent surfaces must meet the ratio against
the lightest and darkest parts of the background, not only an average color.

## Palette rules

- Color is never the only way to convey status, error, selection, or required
  fields. Pair it with text, an icon, or a pattern.
- Semantic tokens are used instead of raw hex values. Tokens cover text,
  background, border, focus, success, warning, error, and informational roles.
- Every token pair used for text or controls is documented with its measured
  contrast ratio for light and dark themes.
- Hover, focus, active, visited, and disabled states each have a defined token.
- Dark mode is a first-class theme. A palette is not complete until both themes
  pass the ratios above.
- Charts must remain distinguishable in grayscale and for common color-vision
  deficiencies.

## Palette-change approval

- A palette change is proposed with before-and-after values, measured ratios for
  affected token pairs, and screenshots of representative screens in both themes.
- The accessibility owner reviews the proposal. The frontend maintainers approve
  the implementation.
- Changes that lower contrast below the minimums are rejected unless they are
  limited to decorative elements with a documented justification.
- A palette change that affects brand identity also requires product sign-off.
- Token removals or renames follow the frontend type and changelog policy so that
  consumers are not broken silently.

## Verification

- Automated accessibility checks (axe or equivalent) run in CI for primary
  routes and fail on contrast violations.
- New or changed components include a visual check in light and dark themes.
- Manual review covers focus visibility, disabled states, charts, and text over
  media.
- Contrast regressions are treated as bugs and triaged with high priority when
  they block reading or operating the interface.

## Ownership and review

The frontend maintainers own this policy; design owns the palette and the
accessibility owner approves contrast decisions. The policy is reviewed every six
months and whenever the design system, theme model, or accessibility standard
changes.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
