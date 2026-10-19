# Frontend Animation and Motion-Reduction Policy

This policy defines acceptable motion in the StellarEarn frontend and the
requirements for respecting a user's reduced-motion preference. It applies to
CSS transitions, animation libraries such as Framer Motion, loading indicators,
page transitions, and any component that moves or changes content automatically.

- **Owner:** Frontend maintainers, with product design and accessibility as co-owners
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [State UX](STATE_UX.md), [Color contrast](COLOR_CONTRAST.md), [PWA policy](PWA_POLICY.md)

## Principles

- Motion communicates a change in state or spatial relationship. It is not
  decoration that delays the user.
- Motion must never block access to content or an action.
- Users who request reduced motion receive a calm, functional interface with the
  same information and capabilities.

## Motion limits

| Motion type | Guideline |
|-------------|-----------|
| Micro-feedback (hover, press, focus) | 100-150 ms |
| Component enter/exit | 150-250 ms |
| Page or route transition | 200-300 ms, never more than 400 ms |
| Loading indicator | Continuous but subtle; no rapid pulsing |
| Attention-seeking motion (shake, bounce) | Reserved for validation feedback and used sparingly |

- Animate `transform` and `opacity` where possible. Avoid animating layout
  properties that trigger repeated reflow.
- Content must not flash more than three times per second. Strobing, rapid
  zooming, and large-area flashing are prohibited.
- Autoplaying motion that lasts longer than five seconds must be pausable, or it
  must not autoplay at all.
- Parallax, background video, and scroll-jacking are not part of the product
  design and require explicit design and accessibility approval.
- Animations must not delay the display of data or the ability to interact.

## Reduced-motion handling

- The application honors `prefers-reduced-motion: reduce` globally and does not
  require the user to find an in-app setting.
- Under reduced motion:
  - non-essential transitions are removed or reduced to an instant state change;
  - page and route transitions do not slide or scale;
  - attention-seeking animation becomes a static highlight or message;
  - loading indicators remain but avoid pulsing or spinning where a static
    progress treatment is sufficient.
- Framer Motion components use the library's reduced-motion support or an
  equivalent guard. CSS uses a global reduced-motion media query.
- The preference is read at render time and reacts if the operating-system
  setting changes.

## Implementation

- Shared motion tokens define duration and easing so that components do not
  invent their own values.
- Motion is applied through shared primitives or utility classes; direct,
  one-off keyframes require review.
- Animations are cancelled when a component unmounts or a request is cancelled.
- Users can complete every task with animation disabled and with JavaScript
  animation libraries failing to load.

## Verification

- Automated accessibility checks run with reduced motion enabled and disabled.
- Component tests assert that critical content is visible immediately when
  reduced motion is requested.
- Reviewers check new motion for duration, purpose, and reduced-motion handling.
- Motion-related complaints are triaged under the feedback process.

## Ownership and review

The frontend maintainers own this policy; design owns the motion language and
the accessibility owner approves exceptions. The policy is reviewed every six
months and whenever the animation library or design system changes.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
