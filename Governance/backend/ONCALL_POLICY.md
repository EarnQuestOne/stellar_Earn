# Backend Alerting and On-Call Policy

This document defines the alert severities used by backend services, how
alerts escalate, the responsibilities of the on-call engineer, and who owns
this policy and how it is reviewed.

## Scope

- All alerts raised for backend services operated by the project: the API,
  background workers, databases, caches, queues, and Stellar indexing and
  transaction-submission services.
- The on-call rotation that receives those alerts.

Out of scope: on-chain contract monitoring, which is governed by
[`../contract/CHAIN_MONITORING.md`](../contract/CHAIN_MONITORING.md), and the
release-manager rotation in
[`../roles/RELEASE_MANAGER.md`](../roles/RELEASE_MANAGER.md).

## Alert Severities

Alert severities map one-to-one onto the incident classes in
[INCIDENT_CLASSES.md](INCIDENT_CLASSES.md). An alert's severity is a starting
point; the responder re-classifies the resulting incident if needed.

| Alert    | Maps to | Delivery                                  | Acknowledge within | When to use                                                                                   |
| -------- | ------- | ----------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| Page-SEV1 | SEV1    | Page primary and secondary at once, any hour | 5 minutes          | Full outage, funds or rewards at risk, suspected breach, data loss beyond RPO.               |
| Page-SEV2 | SEV2    | Page primary, any hour                    | 15 minutes         | Core flow degraded, fast error-budget burn (see [SLO_POLICY.md](SLO_POLICY.md)), backup failure. |
| Ticket   | SEV3    | Incident channel + auto-created issue, on-call hours only | 1 hour (on-call hours) | Partial degradation, slow error-budget burn, non-core feature broken.                        |
| Info     | SEV4    | Dashboard / channel only, no notification | Next working day   | Trends and early warnings with no user impact.                                                |

### Alert quality rules

- **Every paging alert must be actionable.** It must name the affected service,
  the symptom, and link to a runbook. An alert with no runbook is not allowed to
  page.
- **Alert on symptoms, not causes.** Page on user-visible error rate, latency,
  and SLO burn; use cause-based signals (CPU, disk, queue depth) as tickets or
  info unless they reliably predict imminent user impact.
- **Every alert has an owner** (a team or named maintainer) recorded alongside
  its definition.
- An alert that pages more than three times in a rotation without requiring
  action must be tuned, demoted, or deleted before the next rotation.
- Alert definitions live in version control and change through pull requests.

## Escalation

If a page is not acknowledged within its target, it escalates automatically:

1. **Primary on-call** — paged first.
2. **Secondary on-call** — paged if the primary has not acknowledged within the
   target (5 minutes for SEV1, 15 minutes for SEV2). SEV1 pages both at once.
3. **Backend maintainers** — all paged if neither primary nor secondary has
   acknowledged within 15 minutes for SEV1 or 30 minutes for SEV2.
4. **Security team** — paged immediately and in parallel for any alert
   involving credentials, personal data, or funds, per
   [`../roles/SECURITY_TEAM.md`](../roles/SECURITY_TEAM.md).

Any responder may escalate manually at any time. Escalating early is never a
fault.

## On-Call Rotation

- The rotation is drawn from backend maintainers and volunteer reviewers who
  have completed on-call onboarding (shadowing at least one full rotation).
- Rotations are **one week** long, with a primary and a secondary. The current
  schedule is recorded alongside the roster in
  [`../MAINTAINERS.md`](../MAINTAINERS.md).
- Handover happens at a fixed weekly time with a written note covering open
  incidents, ongoing mitigations, and noisy alerts.
- Nobody is scheduled as primary for two consecutive weeks unless they agree to
  it.
- Swaps are allowed if the swap is recorded before it takes effect.
- Because contributors are spread across time zones, a rotation may be split
  into follow-the-sun shifts; each shift has its own named primary.

## On-Call Responsibilities

The primary on-call engineer:

- acknowledges pages within the targets above and acts as incident commander by
  default, following [INCIDENT_CLASSES.md](INCIDENT_CLASSES.md);
- mitigates first and diagnoses second;
- keeps the incident channel updated at the cadence required for the severity;
- hands off explicitly (named person, written summary) if they cannot continue;
- triages ticket-level alerts during on-call hours;
- records noisy or non-actionable alerts in the handover note.

The secondary on-call engineer backs up the primary, takes over if the primary
is unreachable, and joins every SEV1.

The on-call engineer is **not** expected to fix root causes during the shift;
they open issues for follow-up work.

### Sustainability

- After a night with a SEV1 or SEV2 page, the on-call engineer may take
  equivalent time off the next working day.
- If one rotation receives more than five out-of-hours pages, the backend
  maintainers review alert quality before the next rotation.
- Being on call is voluntary for non-maintainers and may be withdrawn with one
  rotation's notice.

## Ownership

- Owner: the backend maintainers (as listed in
  [`../MAINTAINERS.md`](../MAINTAINERS.md)).
- Reviewers: the Technical Steering Committee (TSC) for changes to escalation
  targets or rotation rules.
- Escalation: disputes follow
  [`../CONFLICT_RESOLUTION.md`](../CONFLICT_RESOLUTION.md).

## Review and Update Cadence

- This policy is reviewed at least once per quarter by the backend
  maintainers, together with the alert-noise data from the previous quarter.
- Changes to alert severities must be made in the same pull request as the
  matching update to [INCIDENT_CLASSES.md](INCIDENT_CLASSES.md).
- Emergency changes follow [`../HOTFIX_POLICY.md`](../HOTFIX_POLICY.md) and must
  be reconciled with this document within five working days.

## Related Documents

- [Backend Incident Classification Runbook](INCIDENT_CLASSES.md)
- [Backend SLO and Error-Budget Policy](SLO_POLICY.md)
- [Backend Disaster-Recovery and Backup Policy](DR_BACKUP.md)
- [Backend Metrics Policy](METRICS_POLICY.md)
- [Backend Health Checks](HEALTH_CHECKS.md)
