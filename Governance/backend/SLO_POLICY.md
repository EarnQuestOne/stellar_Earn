# Backend SLO and Error-Budget Policy

This document defines the service-level objectives (SLOs) for backend
services, how error budgets are calculated, how they gate releases, and who
owns this policy and how it is reviewed.

## Scope

- User-facing backend services operated by the project: the public API,
  authentication, quest submission and verification, reward payout, and the
  Stellar indexing and transaction-submission services.
- Release decisions for those services.

Out of scope: on-chain contract availability (which the project does not
control), third-party provider SLAs, and internal tooling.

## Definitions

- **SLI (service-level indicator):** a measured ratio of good events to valid
  events, for example successful requests over all requests.
- **SLO (service-level objective):** the target for an SLI over a rolling
  window.
- **Error budget:** `1 − SLO`, the share of events allowed to fail in the
  window. A 99.9% SLO over 28 days allows about 40 minutes of total failure.
- **Burn rate:** how fast the budget is being consumed relative to an even
  spend across the window. A burn rate of 1 exhausts the budget exactly at the
  end of the window.

All SLOs use a **rolling 28-day window**. Planned maintenance announced at
least 48 hours in advance is excluded; everything else counts.

## Service SLOs

| Service / flow               | SLI                                                                         | SLO     |
| ---------------------------- | --------------------------------------------------------------------------- | ------- |
| Public API availability      | Non-5xx responses / all valid requests (4xx client errors excluded)         | 99.9%   |
| Public API latency           | Requests served under 500 ms / all valid requests                           | 99%     |
| Authentication               | Successful sign-ins / valid sign-in attempts                                | 99.9%   |
| Quest submission             | Submissions accepted and persisted / valid submissions                      | 99.9%   |
| Reward payout                | Payouts submitted to Stellar within 10 minutes of approval / approved payouts | 99.5%   |
| Payout correctness           | Payouts with correct recipient and amount / all payouts                     | 100%    |
| Chain indexing freshness     | Minutes where the indexer is within 2 ledgers of the network / all minutes  | 99.5%   |

Payout correctness has no error budget. Any violation is a SEV1 incident under
[INCIDENT_CLASSES.md](INCIDENT_CLASSES.md) and freezes releases to the payout
path until the postmortem is accepted.

Each SLO must have its SLI implemented as a metric (per
[METRICS_POLICY.md](METRICS_POLICY.md)) and shown on a shared dashboard.
An SLO without a working measurement is treated as **exhausted** for release
gating.

## Burn-Rate Alerting

Error-budget burn is alerted through [ONCALL_POLICY.md](ONCALL_POLICY.md):

| Condition                                             | Alert     |
| ----------------------------------------------------- | --------- |
| Burn rate ≥ 14 over 1 hour (≈2% of budget in 1 hour)  | Page-SEV2 |
| Burn rate ≥ 6 over 6 hours (≈5% of budget in 6 hours) | Page-SEV2 |
| Burn rate ≥ 1 over 3 days (≈10% of budget in 3 days)  | Ticket    |

## Error-Budget Release Gating

The remaining budget for each service sets what may ship to that service:

| Budget remaining | State     | Release rules                                                                                                                                                                  |
| ---------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| > 50%            | Healthy   | Normal releases per [`../RELEASE_POLICY.md`](../RELEASE_POLICY.md).                                                                                                            |
| 25%–50%          | Caution   | Releases continue, but risky changes (schema migrations, new external integrations, payout-path changes) must ship behind a feature flag or canary ([CANARY_DELIVERY.md](CANARY_DELIVERY.md)). |
| 0%–25%           | Warning   | Only bug fixes, reliability improvements, and security fixes ship. Feature releases need explicit approval from two backend maintainers.                                      |
| Exhausted (≤ 0%) | Frozen    | **Release freeze.** Only changes that restore reliability or fix security issues ship. The freeze lifts when the budget recovers above 0% and the related postmortems have owned action items. |

### Gating rules

- Gating is per service. An exhausted budget on the payout service does not
  freeze unrelated API changes, unless the change touches the payout path.
- Security fixes and fixes for active incidents are **never** blocked by the
  error budget; they follow [`../HOTFIX_POLICY.md`](../HOTFIX_POLICY.md).
- The release manager checks the budget state before each production release
  and records it in the release notes.
- If a single incident consumes more than 20% of a budget, its postmortem must
  include at least one action item that prevents recurrence.
- Exceptions to a freeze require approval from the Technical Steering Committee
  (TSC), recorded on the release's pull request.

## Ownership

- Owner: the backend maintainers (as listed in
  [`../MAINTAINERS.md`](../MAINTAINERS.md)).
- Release gating is enforced by the release manager per
  [`../roles/RELEASE_MANAGER.md`](../roles/RELEASE_MANAGER.md).
- Reviewers: the TSC for any change to SLO targets or gating thresholds.
- Escalation: disputes follow
  [`../CONFLICT_RESOLUTION.md`](../CONFLICT_RESOLUTION.md).

## Review and Update Cadence

- SLO targets are reviewed once per quarter against the previous quarter's
  measurements. A target that was never at risk may be tightened; one that was
  missed every window must be either fixed through reliability work or lowered
  with documented reasoning.
- Adding a new user-facing service requires adding its SLO to this document in
  the same release.
- Changes to severity mapping must stay consistent with
  [INCIDENT_CLASSES.md](INCIDENT_CLASSES.md) and
  [ONCALL_POLICY.md](ONCALL_POLICY.md).
- Emergency changes follow [`../HOTFIX_POLICY.md`](../HOTFIX_POLICY.md) and must
  be reconciled with this document within five working days.

## Related Documents

- [Backend Incident Classification Runbook](INCIDENT_CLASSES.md)
- [Backend Alerting and On-Call Policy](ONCALL_POLICY.md)
- [Backend Metrics Policy](METRICS_POLICY.md)
- [Backend Canary Delivery](CANARY_DELIVERY.md)
- [Release and versioning policy](../RELEASE_POLICY.md)
