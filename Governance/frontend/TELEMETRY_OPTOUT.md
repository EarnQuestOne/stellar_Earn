# Frontend Telemetry Opt-Out Governance

This policy defines which frontend telemetry StellarEarn collects, how users opt
out, and what the application must stop doing when an opt-out is recorded. It
applies to the Next.js application in `FrontEnd/my-app`, including analytics,
error monitoring, performance reporting, and any third-party script that
observes user behaviour.

- **Owner:** Frontend maintainers, with the privacy owner as co-owner
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [Data export](../backend/DATA_EXPORT.md), [Log redaction](../backend/LOG_REDACTION.md), [Release policy](../RELEASE_POLICY.md)

## Telemetry categories

| Category | Purpose | Opt-out behaviour |
|----------|---------|-------------------|
| Essential operational signals | Load balancing, security, and aggregate availability | Not telemetry in this policy; limited to what is required to serve the request |
| Product analytics | Feature usage, funnels, and experiment metrics | Disabled when the user opts out |
| Error monitoring | Crash and exception diagnostics | Disabled or reduced to scrubbed, non-identifying operational events |
| Performance metrics | Web vitals and route timing | Aggregated only; disabled when the user opts out |
| Marketing and cross-site measurement | Campaign attribution | Prohibited without explicit consent and never enabled by default |

Session replay, cross-site behavioural advertising, and fingerprinting are not
permitted in the frontend.

## Consent and opt-out

- Non-essential telemetry is off until the user has been presented with a clear
  choice where consent is required by applicable law. Where consent is not
  required, the product provides an equally clear opt-out before or at first use.
- The opt-out control is available in the application's privacy or settings
  surface and is reachable without contacting support.
- The choice is stored locally under a versioned key and, where the user is
  authenticated, on the account so that it follows the user across devices.
- The application honors Global Privacy Control and Do Not Track signals where
  the law or the project's privacy commitments require it.
- Opt-out is as easy as opt-in, takes effect without a page reload where
  practical, and is never bundled with unrelated consent.
- Withdrawal of consent is applied to future collection. Previously collected
  data is handled under the retention policy.

## What an opt-out must stop

When a user opts out, the frontend must:

- stop loading non-essential analytics and marketing scripts;
- stop emitting product analytics events and experiment exposures;
- stop sending performance beacons that can be linked to the user;
- stop attaching user identifiers to error reports, and either disable error
  reporting or send only scrubbed, aggregated diagnostics;
- avoid setting non-essential cookies or writing telemetry identifiers to
  storage.

Authentication, security, and load-balancing signals required to deliver the
requested page continue, but must not be repurposed as product telemetry.

## Data minimisation

- Telemetry events must not contain email addresses, wallet addresses, names,
  free-text user content, or authentication tokens.
- Use opaque identifiers and truncate or hash values when correlation is
  necessary.
- Do not send full URLs that contain search terms, tokens, or personal data; send
  the route pattern instead.
- Telemetry providers must be documented, reviewed, and bound by the project's
  data-processing requirements.

## Implementation and verification

- A single telemetry module evaluates consent and exposes one guarded emit
  function. Components must not call third-party SDKs directly.
- The guard is evaluated before the SDK initialises, not only before an event is
  sent.
- Tests cover: opted out by default where consent is required, opted out after a
  stored choice, opt-in, withdrawal, and reload persistence.
- A release that adds a telemetry provider or event category updates this policy
  and the privacy notice in the same change.

## Ownership and review

The frontend maintainers own the implementation; the privacy owner approves
category changes and consent wording. The policy is reviewed every six months
and whenever a telemetry provider, consent requirement, or applicable privacy
law changes.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
