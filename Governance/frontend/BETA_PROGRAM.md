# Frontend Beta-Program Governance

This policy governs how experimental frontend features are introduced, gated,
measured, and either graduated to general availability or removed. It applies to
the Next.js application in `FrontEnd/my-app` and to any user-facing surface that
ships behind a beta label.

- **Owner:** Frontend maintainers, with product management as co-owner
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [Feature flags (backend)](../backend/FEATURE_FLAGS_BE.md), [Telemetry opt-out](TELEMETRY_OPTOUT.md), [Feedback triage](FEEDBACK_TRIAGE.md)

## Entry criteria

A feature may enter beta only when:

- It has an owner, a written hypothesis, and success and guardrail metrics.
- The user-facing surface is clearly labelled as beta or preview.
- It is gated by a server-evaluated feature flag or an equivalent runtime
  control; merging code does not expose it to all users.
- Accessibility, keyboard navigation, and reduced-motion behaviour are
  implemented to the same standard as generally available features.
- Telemetry respects [Telemetry opt-out](TELEMETRY_OPTOUT.md).
- A rollback path exists that does not require a database rollback or a hotfix
  when the flag can simply be disabled.

## Gating and rollout

- Flags are evaluated server-side by default so that clients cannot force a
  beta on themselves.
- Rollout proceeds in controlled stages: internal accounts, an explicit
  allowlist, a small percentage of eligible users, then a wider percentage.
- Cohorts are defined by stable, non-sensitive attributes. Do not build cohorts
  from special-category personal data.
- Each stage has a minimum observation period and explicit promotion criteria
  agreed before launch.
- A beta feature must not change data in a way that cannot be read by the
  generally available version of the application.

## Graduation criteria

A beta graduates to general availability when:

- Success metrics meet the agreed target for a sustained period.
- Guardrail metrics (error rate, latency, support contacts, accessibility
  defects) show no material regression.
- The feature has passed the frontend CI checks, an accessibility review, and a
  product review.
- Documentation, empty and error states, and analytics events are complete.
- The owner has removed the beta label and scheduled removal of the flag.

Flags are removed within 30 days of graduation, or the owner records why the
flag must remain and sets a review date.

## Exit and rollback

A beta is paused or withdrawn when guardrails are breached, a security or
privacy issue is found, or the owner cannot sustain maintenance. Withdrawal
means disabling the flag, communicating to affected users, and either fixing the
feature or deleting the dead code within one release cycle.

Rollback must be possible without a deploy whenever practical. If a data
migration cannot be reversed, the beta plan must say so before launch and
include a forward-fix procedure.

## Communication and support

- Beta surfaces link to a short description of the experiment and a feedback
  route.
- Support and moderation teams receive a briefing before each rollout stage.
- Release notes identify beta features and their limitations.
- Users can leave the beta at any time where the feature changes their workflow.

## Ownership and review

The frontend maintainers own this policy; product management owns individual
beta decisions. The policy is reviewed every six months and after any beta that
causes a user-impacting incident. Each active beta is reviewed at least once per
quarter.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
