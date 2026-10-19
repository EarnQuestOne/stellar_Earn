# Frontend Keyboard-Navigation and Focus Policy

This policy defines the keyboard and focus requirements for the StellarEarn
frontend. Every task that can be completed with a pointer must be completable
with a keyboard alone, with a visible and predictable focus path.

- **Owner:** Frontend maintainers, with accessibility as co-owner
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [PR guidelines](../PR_GUIDELINES.md), [CI/CD policy](../CICD_POLICY.md), [Issue lifecycle](../ISSUE_LIFECYCLE.md)

## Focus order

- Focus order follows the visual and DOM order. Do not reorder focus with
  positive `tabindex` values.
- Each page has one `<main>` landmark and a logical heading hierarchy.
- Interactive elements are native buttons, links, inputs, and selects wherever
  possible. A custom control must expose the correct role, state, and keyboard
  behaviour.
- Off-screen and visually hidden content is removed from the focus order unless
  it is intentionally available to assistive technology.
- Disabled controls are not focusable when they cannot be operated; controls
  that remain focusable must explain why they are unavailable.

## Visible focus

- Every focusable element has a visible focus indicator with at least 3:1
  contrast against adjacent colors.
- Focus styling is never removed without an equivalent visible replacement.
- The indicator remains visible in light and dark themes and on images or
  colored surfaces.
- Focus is not moved automatically while the user is typing or reading, except
  for an explicit navigation or dialog action.

## Skip links and landmarks

- Every page provides a "Skip to main content" link as the first focusable
  element. It becomes visible on focus and moves focus to the main content.
- Navigation regions, search, and complementary content use landmarks with
  accessible names when more than one of the same landmark exists.
- Repeated navigation blocks can be bypassed through landmarks or a skip link.

## Keyboard traps and overlays

- Keyboard focus must never become trapped in a region that the user cannot
  leave. A deliberate focus trap is allowed only inside a modal dialog, and it
  must:
  - move focus into the dialog when it opens;
  - cycle focus within the dialog while it is modal;
  - close on `Escape` unless closing would lose unsaved work, in which case the
    user is warned;
  - restore focus to the element that opened it when it closes.
- Menus, comboboxes, tooltips, and popovers close on `Escape` and return focus to
  their trigger.
- Scrollable regions that capture arrow keys provide a keyboard-accessible way to
  scroll the page.

## Interaction patterns

| Pattern | Required keys |
|---------|---------------|
| Button or link | `Enter` activates; `Space` activates buttons |
| Checkbox, radio, switch | `Space` toggles or selects; arrow keys move within a radio group |
| Tabs | Arrow keys move between tabs; `Home` and `End` jump to the first and last |
| Menu | Arrow keys move; `Escape` closes; type-ahead is supported where practical |
| Dialog | Focus enters and is trapped; `Escape` closes; focus returns to the trigger |
| Form | `Tab` moves between fields; submit is reachable without a pointer; errors are announced and linked to their fields |

## Route changes and dynamic content

- Client-side route changes move focus to the new page heading or main region and
  announce the page title.
- Content inserted dynamically is announced through an appropriate live region
  without stealing focus.
- Validation errors move focus to the first invalid field or an error summary and
  preserve the user's input.
- Loading states do not move focus away from the user's current position.

## Verification

- Automated accessibility checks run in CI for primary routes.
- Manual keyboard-only testing is required for new interactive components:
  tab through the flow, operate every control, confirm focus visibility, and
  confirm no traps.
- Screen-reader smoke testing is required for dialogs, menus, forms, and data
  tables.
- Keyboard defects are triaged as accessibility bugs and fixed before a feature
  graduates from beta.

## Ownership and review

The frontend maintainers own this policy; the accessibility owner reviews
exceptions and new interaction patterns. The policy is reviewed every six months
and whenever the design system or component library changes.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
