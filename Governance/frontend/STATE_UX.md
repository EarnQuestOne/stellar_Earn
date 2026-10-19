# Frontend Empty-State and Loading-State Policy

This policy defines the states every data-driven view in the StellarEarn
frontend must support: loading, empty, error, partial, offline, and
unauthorized. It applies to the Next.js application in `FrontEnd/my-app` and to
every component that fetches or displays remote data.

- **Owner:** Frontend maintainers, with product design as co-owner
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [PWA policy](PWA_POLICY.md), [Motion policy](MOTION_POLICY.md), [Color contrast](COLOR_CONTRAST.md), [CI/CD policy](../CICD_POLICY.md)

## Required states

| State | When it applies | Required behaviour |
|-------|-----------------|--------------------|
| Loading | A request is in flight and no usable data is available | Show a skeleton or progress indicator that matches the final layout; announce busy state to assistive technology |
| Refreshing | Data is already visible and is being revalidated | Keep the existing content visible and indicate background activity without blocking interaction |
| Empty | The request succeeded but returned no records | Explain why the view is empty and offer the next useful action |
| Error | The request failed | State what failed in plain language, offer retry, and preserve any previously loaded content when safe |
| Partial | Some sections loaded and others failed | Render the successful sections and isolate the failure to the affected section |
| Offline | The device has no usable connection | Show an offline notice and avoid retry loops; explain which actions are unavailable |
| Unauthorized | The session is missing, expired, or lacks permission | Explain the requirement and provide a sign-in or request-access action without exposing protected data |

## Rules

- Every data view implements all applicable states. A spinner that never
  resolves, a blank screen, or a raw stack trace is a defect.
- Loading placeholders must approximate the final layout to avoid cumulative
  layout shift. Do not replace the whole page when a single section is loading.
- Empty states are specific to the context. "No quests match these filters" is
  required; "No data" is not acceptable. Include a clear action such as clearing
  filters or creating the first item.
- Error messages must not reveal internal identifiers, stack traces, or whether
  a private resource exists.
- Retry actions are idempotent from the user's perspective and disable
  themselves while a retry is in flight.
- State changes must be announced through an appropriate live region, and busy
  containers use `aria-busy`. Focus must not be lost when content is replaced.
- Loading and error states must remain usable with a keyboard and with reduced
  motion enabled.
- Skeletons and spinners stop when the request settles, including on timeout and
  cancellation.

## Implementation conventions

- Data fetching uses the shared API-client conventions. Components derive state
  from the query or request result instead of duplicating booleans.
- Shared `LoadingState`, `EmptyState`, and `ErrorState` components are preferred
  over one-off markup so that copy, spacing, and accessibility stay consistent.
- Route-level loading uses framework loading boundaries; component-level loading
  stays inside the component that owns the request.
- Cached data is displayed while revalidating rather than replaced by a
  skeleton, unless the cache is known to be stale for the current user.

## Verification

- Unit or component tests cover loading, empty, error, and success for each data
  view.
- End-to-end or visual checks cover the authenticated and unauthenticated
  variants of primary routes.
- Accessibility checks confirm that state changes are announced and that focus
  management works.
- Reviewers reject new data views that lack an empty state or an actionable
  error state.

## Ownership and review

The frontend maintainers own this policy; product design owns the copy and visual
direction for shared state components. The policy is reviewed every six months
and whenever the design system or data-fetching layer changes.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
