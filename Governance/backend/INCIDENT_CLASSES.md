# Backend Incident Classification Runbook

This document defines how backend incidents are classified by severity, the
first-response actions required for each class, and who owns this runbook and
how it is reviewed.

It applies to every incident affecting backend services operated by the project
(the API, background workers, databases, caches, queues, and the services that
index or submit Stellar transactions). On-chain contract incidents are governed
by the contract documents in [`../contract/`](../contract/), but a contract
incident that also degrades the backend is classified here as well.

## Scope

- Outages, degradations, data-integrity problems, and security events in
  backend services.
- The severity scale used by alerts ([ONCALL_POLICY.md](ONCALL_POLICY.md)),
  service-level objectives ([SLO_POLICY.md](SLO_POLICY.md)), and disaster
  recovery ([DR_BACKUP.md](DR_BACKUP.md)).
- First-response actions taken in the first hour of an incident.

Out of scope: long-running remediation work, which is tracked as ordinary
issues, and Code of Conduct incidents, which follow
[`../COC_REPORTING.md`](../COC_REPORTING.md).

## Severity Classes

Classify on **user impact first**, then on data and security impact. When in
doubt, pick the higher severity; downgrading later is cheap, under-reacting is
not.

| Severity | Name     | Criteria (any one is sufficient)                                                                                                                                                                                                       | Examples                                                                                                     |
| -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| SEV1     | Critical | Full outage of a user-facing service; any confirmed or suspected loss, corruption, or incorrect movement of funds or rewards; confirmed security breach or exposure of secrets or personal data; data loss beyond the RPO in [DR_BACKUP.md](DR_BACKUP.md). | API returns 5xx for all users; payouts sent to wrong accounts; leaked signing or database credentials.        |
| SEV2     | Major    | Major degradation of a core user flow (sign-in, quest submission, reward payout) for a significant share of users; error budget for a core SLO burning at a rate that would exhaust it within 24 hours; backups failing with no valid backup inside the RPO. | Quest submissions failing for 20% of users; payout queue stalled for over 30 minutes; nightly backup failed. |
| SEV3     | Minor    | Partial degradation of a non-core feature, or a core feature degraded for a small share of users, with a workaround available; elevated latency still inside the SLO.                                                                  | Leaderboard stale; notification emails delayed; one region slower than normal.                              |
| SEV4     | Low      | No current user impact; a risk or defect that could become an incident if left alone.                                                                                                                                                  | Disk usage trending toward its limit; a single worker replica crash-looping behind healthy replicas.         |

### Classification rules

- Any incident involving funds, rewards, credentials, or personal data is at
  least **SEV2** until shown otherwise, and **SEV1** if impact is confirmed.
- The incident commander may raise or lower the severity at any time and must
  record the change and the reason in the incident channel.
- Severity is set by **current impact**, not by root cause. A trivial
  configuration error that takes the API down is still SEV1.
- An incident that exceeds its class's response targets without mitigation is
  escalated one class up.

## Roles During an Incident

- **Incident commander (IC):** the first responder by default (normally the
  on-call engineer). Owns classification, coordination, and communication until
  explicitly handed over.
- **Operations lead:** performs the technical investigation and mitigation. For
  SEV3 and SEV4 the IC may hold this role as well.
- **Communications lead:** posts status updates. Required for SEV1, optional for
  SEV2.
- **Security team:** joins every incident involving a suspected breach, per
  [`../roles/SECURITY_TEAM.md`](../roles/SECURITY_TEAM.md).

## First-Response Actions

Response targets are measured from the moment the incident is detected (alert
fired or report received).

### SEV1 — Critical

Acknowledge within **5 minutes**; first status update within **15 minutes**;
updates every **30 minutes** until mitigated.

1. Acknowledge the page and declare the incident in the incident channel with
   severity, a one-line summary, and the IC's name.
2. Page the secondary on-call and the backend maintainers per
   [ONCALL_POLICY.md](ONCALL_POLICY.md). If funds, credentials, or personal
   data are involved, page the security team immediately.
3. **Stop the bleeding before diagnosing:** roll back the last deploy, disable
   the offending feature flag, pause payout or transaction-submission workers,
   or fail over, whichever stops the impact fastest.
4. If funds may be at risk on-chain, follow the contract emergency path in
   [`../contract/EMERGENCY_PAUSE.md`](../contract/EMERGENCY_PAUSE.md) and
   [`../EMERGENCY_POWERS.md`](../EMERGENCY_POWERS.md).
5. Preserve evidence: do not delete logs, rotate away audit trails, or
   overwrite databases. Take a snapshot before any destructive recovery step.
6. If data restoration is required, invoke [DR_BACKUP.md](DR_BACKUP.md).
7. Freeze all non-incident deploys until the IC lifts the freeze.

### SEV2 — Major

Acknowledge within **15 minutes**; first status update within **30 minutes**;
updates every **hour** until mitigated.

1. Acknowledge and declare the incident in the incident channel.
2. Page the secondary on-call if the primary has not identified a mitigation
   within 30 minutes.
3. Mitigate with the least risky option available: rollback, feature-flag
   disable, scaling out, or failover.
4. Involve the security team if any security dimension is suspected.
5. Freeze deploys to the affected service until mitigated.

### SEV3 — Minor

Acknowledge within **1 hour** during on-call hours; no paging outside them.

1. Open a tracking issue labelled with the severity and the affected service.
2. Mitigate within the current working day or document a workaround.
3. Re-classify upward if impact grows.

### SEV4 — Low

Handled during working hours.

1. Open a tracking issue with the risk, the likely trigger, and a proposed fix.
2. Schedule the fix through normal triage per
   [`../TRIAGE_POLICY.md`](../TRIAGE_POLICY.md).

## After the Incident

- **SEV1 and SEV2:** a blameless postmortem using
  [`../templates/POSTMORTEM_TEMPLATE.md`](../templates/POSTMORTEM_TEMPLATE.md)
  is published within **five working days** of resolution, with owned action
  items.
- **SEV3:** a short written summary on the tracking issue; a postmortem is
  optional but encouraged for repeated incidents.
- **SEV4:** no postmortem required.
- Incidents consume the error budget as described in
  [SLO_POLICY.md](SLO_POLICY.md).

## Ownership

- Owner: the backend maintainers (as listed in
  [`../MAINTAINERS.md`](../MAINTAINERS.md)).
- Reviewers: the security team for any change to how security incidents are
  classified; the Technical Steering Committee (TSC) for changes to the
  severity scale itself.
- Escalation: disputes follow
  [`../CONFLICT_RESOLUTION.md`](../CONFLICT_RESOLUTION.md).

## Review and Update Cadence

- This runbook is reviewed at least once per quarter by the backend
  maintainers, and after every SEV1 postmortem.
- Changes to the severity scale must be made in the same pull request as the
  matching updates to [ONCALL_POLICY.md](ONCALL_POLICY.md) and
  [SLO_POLICY.md](SLO_POLICY.md), so the three documents never disagree.
- Emergency changes follow [`../HOTFIX_POLICY.md`](../HOTFIX_POLICY.md) and must
  be reconciled with this document within five working days.

## Related Documents

- [Backend Alerting and On-Call Policy](ONCALL_POLICY.md)
- [Backend SLO and Error-Budget Policy](SLO_POLICY.md)
- [Backend Disaster-Recovery and Backup Policy](DR_BACKUP.md)
- [Backend Deploy Runbook](DEPLOY_RUNBOOK.md)
- [Postmortem template](../templates/POSTMORTEM_TEMPLATE.md)
- [Emergency decision powers](../EMERGENCY_POWERS.md)
