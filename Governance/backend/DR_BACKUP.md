# Backend Disaster-Recovery and Backup Policy

This document defines what backend data is backed up, how often and where
backups are stored, the recovery objectives (RTO and RPO) for each system, how
disaster recovery is invoked and rehearsed, and who owns this policy and how it
is reviewed.

How backups are **verified** (restore drills, integrity checks) is covered in
[BACKUP_VERIFICATION.md](BACKUP_VERIFICATION.md). This document sets the
policy; that one proves it works. The production database targets below match
the ones in that document.

## Scope

- Every stateful backend system operated by the project: the primary
  database, object storage (uploads and exports), the cache and queues where
  they hold durable state, configuration, and secrets.
- Recovery from data loss, corruption, region or provider outage, and
  destructive operator error.

Out of scope: on-chain state, which the Stellar network itself replicates. The
backend's derived chain data (the indexer's tables) is in scope and can also be
rebuilt by re-indexing from the network.

## Backup Frequency and Retention

| System                         | Method                                                  | Frequency                         | Retention                                    |
| ------------------------------ | ------------------------------------------------------- | --------------------------------- | -------------------------------------------- |
| Primary database (production)  | Continuous WAL / point-in-time recovery (PITR)          | Continuous                        | 30 days of PITR                              |
| Primary database (production)  | Full snapshot                                           | Daily                             | 30 daily, 12 monthly                         |
| Object storage (uploads, exports) | Versioning + cross-region replication                | Continuous                        | Previous versions kept 30 days               |
| Queues with durable messages   | Provider-managed replication; outbox table in database  | Continuous (via database backups) | As database                                  |
| Cache                          | Not backed up — rebuildable from the database           | —                                 | —                                            |
| Indexer-derived chain data     | Covered by database backups; rebuildable by re-indexing | As database                       | As database                                  |
| Infrastructure configuration   | Version control (infrastructure-as-code)                | Every change                      | Full history                                 |
| Secrets                        | Secret manager with versioning; recovery keys held offline | Every change                   | Previous versions kept 90 days               |
| Staging database               | Full snapshot                                           | Weekly                            | 4 weekly                                     |

Retention for personal data must also respect
[DATA_EXPORT.md](DATA_EXPORT.md) and [ANONYMIZATION.md](ANONYMIZATION.md):
an erasure request is honoured in backups by expiring them on schedule and by
re-applying erasures after any restore.

## Backup Storage

- Backups are stored in a **different region** from the production data they
  protect, and at least one copy of the monthly snapshots is held with a
  **different account or provider** so that compromise of the production
  account cannot delete them.
- Backups are **encrypted at rest** (AES-256 or equivalent) with keys managed
  in the secret manager. Backup encryption keys are themselves backed up
  separately from the backups.
- Backup storage is **immutable** (write-once / object lock) for the retention
  period. Production service credentials can write new backups but cannot
  delete or overwrite existing ones.
- Access to read or restore backups is limited to the backend maintainers on
  the DR access list and is audit-logged per
  [AUDIT_LOGGING.md](AUDIT_LOGGING.md).
- Backups never land on developer laptops or in issue trackers. Restoring
  production data into a non-production environment requires anonymisation per
  [ANONYMIZATION.md](ANONYMIZATION.md).

## Recovery Objectives

- **RPO (recovery point objective):** the maximum amount of data, measured in
  time, that may be lost.
- **RTO (recovery time objective):** the maximum time from declaring a disaster
  to restoring service.

| System / scenario                                 | RPO          | RTO        |
| ------------------------------------------------- | ------------ | ---------- |
| Primary database — corruption or operator error   | 5 minutes    | 1 hour     |
| Primary database — full region outage             | 5 minutes    | 4 hours    |
| Object storage                                    | 15 minutes   | 4 hours    |
| Indexer-derived chain data                        | 0 (rebuilt from network) | 8 hours |
| Cache                                             | n/a (rebuilt) | 15 minutes |
| Infrastructure and configuration                  | 0 (version control) | 4 hours |
| Staging environment                               | 7 days       | 2 working days |

Missing an RPO or RTO during a real incident is a SEV1 under
[INCIDENT_CLASSES.md](INCIDENT_CLASSES.md) and must be covered in the
postmortem.

## Invoking Disaster Recovery

1. The incident commander declares a disaster when data loss or corruption is
   confirmed, or when a region or provider outage is expected to exceed the RTO
   for the affected system.
2. Pause writers that would make things worse: reward payout and
   transaction-submission workers first, then other background workers.
3. Snapshot the current (damaged) state before any restore, to preserve
   evidence and allow comparison.
4. Restore to the latest point before the damage, into a fresh instance; never
   restore over the damaged instance.
5. Re-apply any personal-data erasures processed since the restore point.
6. Reconcile with the Stellar network: compare payouts and transactions
   recorded on-chain since the restore point with the restored database, and
   re-index as needed so no reward is paid twice or lost.
7. Run the verification checks from
   [BACKUP_VERIFICATION.md](BACKUP_VERIFICATION.md) before switching traffic.
8. Switch traffic, resume workers, and keep the incident open until
   reconciliation is complete.

Each step is recorded in the incident channel with timestamps so the actual RPO
and RTO can be measured.

## Rehearsal

- Restore drills run at least monthly, per
  [BACKUP_VERIFICATION.md](BACKUP_VERIFICATION.md).
- A full DR exercise (simulated region loss, including reconciliation with the
  network) runs at least **twice a year**. Results — achieved RPO and RTO,
  problems found, follow-up issues — are recorded and reviewed alongside this
  document.

## Ownership

- Owner: the backend maintainers (as listed in
  [`../MAINTAINERS.md`](../MAINTAINERS.md)).
- Reviewers: the security team for changes to backup storage, encryption, or
  access; the Technical Steering Committee (TSC) for changes to RPO or RTO
  targets.
- Escalation: disputes follow
  [`../CONFLICT_RESOLUTION.md`](../CONFLICT_RESOLUTION.md).

## Review and Update Cadence

- This document is reviewed at least once per quarter by the backend
  maintainers, after every full DR exercise, and after any incident that
  invoked disaster recovery.
- Adding a new stateful system requires adding it to the tables above in the
  same pull request that introduces it.
- RPO and RTO targets for the production database must stay consistent with
  [BACKUP_VERIFICATION.md](BACKUP_VERIFICATION.md); a change to one requires a
  change to the other.
- Emergency changes follow [`../HOTFIX_POLICY.md`](../HOTFIX_POLICY.md) and must
  be reconciled with this document within five working days.

## Related Documents

- [Backend Database Backup Verification Policy](BACKUP_VERIFICATION.md)
- [Backend Incident Classification Runbook](INCIDENT_CLASSES.md)
- [Backend Alerting and On-Call Policy](ONCALL_POLICY.md)
- [Backend SLO and Error-Budget Policy](SLO_POLICY.md)
- [Backend Data-Export and Subject-Rights Request Policy](DATA_EXPORT.md)
- [Backend Audit Logging for Sensitive Actions](AUDIT_LOGGING.md)
