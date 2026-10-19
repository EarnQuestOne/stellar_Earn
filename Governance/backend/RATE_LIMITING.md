# Backend Rate-Limiting and Quota Governance

This policy defines default rate limits, per-tier quotas, and the approval path
for exceptions in StellarEarn backend services. It applies to public API routes,
authenticated endpoints, authentication flows, webhooks, and outbound provider
calls.

- **Owner:** Backend maintainers, with the security team as co-owner
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [API keys](API_KEYS.md), [SLO policy](SLO_POLICY.md), [Audit logging](AUDIT_LOGGING.md), [API versioning](API_VERSIONING.md)

## Default limits

Limits are applied at the edge and enforced again in the service so that a
misconfigured proxy cannot remove protection.

| Surface | Default limit | Key |
|---------|---------------|-----|
| Wallet challenge request | 10 per minute | IP and wallet address |
| Login and token exchange | 10 per minute, 50 per hour | IP and account |
| Public read endpoints | 60 per minute | IP |
| Authenticated read endpoints | 120 per minute | User or API key |
| Authenticated write endpoints | 30 per minute | User or API key |
| Submission creation | 10 per minute, 100 per hour | User |
| Payout and financial actions | 5 per minute | User and account |
| Webhook delivery attempts | 100 per minute | Destination |
| Administrative endpoints | 60 per minute | Administrator and IP |
| Internal service calls | 600 per minute | Workload identity |

Bursts are allowed within a token-bucket capacity of twice the per-minute rate.
Limits are intentionally conservative; legitimate high-volume consumers use the
tier and override process below.

## Tiers and quotas

| Tier | Eligibility | Quota model |
|------|-------------|-------------|
| Anonymous | No authenticated session | Per-IP limits, strictest burst |
| Authenticated user | Verified account | Per-user limits |
| Creator | Account with an active quest history | Higher read and submission limits |
| Partner / API key | Approved integration with a documented use case | Per-key quota agreed during onboarding |
| Internal service | Workload identity in the platform | High limit, monitored for anomalies |

Partner quotas are recorded with the integration record, reviewed at least
annually, and revoked when the integration is retired. A quota is a ceiling, not
a guarantee of capacity; the SLO policy governs availability.

## Enforcement

- The primary algorithm is a distributed token bucket or sliding-window counter
  backed by a shared store so that limits hold across replicas.
- Every limited response includes the applicable limit and remaining budget
  headers where the client can use them.
- Exceeded limits return HTTP 429 with `Retry-After` and the standard error
  envelope. The response does not reveal whether an account exists.
- Authentication failures are counted separately from successful requests so
  that a shared IP cannot lock out unrelated users.
- Limits are applied before expensive work such as database reads, signing, or
  outbound calls.
- Webhook retries and queue jobs have their own budgets; a retry storm must not
  consume the interactive API budget.

## Overrides and exceptions

- A temporary override requires a documented business reason, a named owner, an
  expiry date, and approval from a backend maintainer. Financial and
  authentication overrides also require security approval.
- Overrides are configured through the normal deployment path, not by manual
  database edits. Emergency changes follow the break-glass process and are reviewed afterwards.
- Permanent tier changes update this document, the integration record, and the
  automated tests in the same change.
- An override that remains after its expiry is removed automatically and the
  owner is notified.

## Monitoring and tuning

- The team monitors 429 rates, top limited consumers, latency near the limit, and
  false positives reported by support.
- A limit is changed only with evidence: observed traffic, abuse reports, or an
  SLO breach caused by load.
- Rate-limit changes are released like any other behaviour change and include
  tests for the boundary, the burst allowance, and the 429 response.
- During a suspected attack, the security team may lower limits globally or for
  a specific key, and must record the action in the incident timeline.

## Ownership and review

The backend maintainers own the implementation and default values; the security
team reviews abuse controls; the platform team owns edge enforcement. The policy
is reviewed every six months and after any availability incident involving
traffic volume.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
