# Backend Data Retention and Purging Policy

This policy defines how long backend data is kept, how it is purged, and who is
accountable for retention decisions. It applies to primary databases, caches,
object storage, backups, logs, analytics stores, and exports produced by the
StellarEarn backend.

- **Owner:** Backend maintainers, with the security team as co-owner
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [PII classification](PII_CLASSIFICATION.md), [Log retention](LOG_RETENTION.md), [Data export](DATA_EXPORT.md), [Disaster recovery](DR_BACKUP.md)

## Retention windows

Retention starts when the record becomes inactive (for example, when an account
is closed or a quest is archived), unless stated otherwise. A documented legal
hold overrides these defaults.

| Data class | Default retention | Notes |
|------------|-------------------|-------|
| Active account and profile data | While the account is active | Purged or anonymized after closure |
| Closed-account personal data | 30 days after closure | Grace period for reversal and fraud checks |
| Authentication sessions and refresh tokens | Until expiry or revocation, maximum 30 days | Invalidated immediately on logout or compromise |
| Quest and submission content | Life of the quest plus 24 months | Anonymize participant identifiers after account deletion |
| Payout and financial records | 7 years | Retained for accounting, tax, and dispute handling |
| KYC and identity-verification records | 5 years after the end of the relationship | Retained only where required; otherwise deleted |
| Support conversations and attachments | 3 years after the last interaction | Attachments containing identity documents follow the KYC window |
| Application logs | Per [Log retention](LOG_RETENTION.md) | DEBUG logs are not retained in production |
| Security and audit logs | 12 months | Longer where an investigation or legal hold applies |
| Analytics events | 26 months | Aggregated after 90 days; direct identifiers removed |
| Backups | 35 days rolling | Expire automatically; restored data re-enters the retention schedule |
| Temporary uploads and exports | 7 days | Deleted after download or expiry |

Retention windows are maximums, not targets. Delete data earlier when there is
no continuing purpose.

## Purge mechanism

- Scheduled jobs perform deletions on a defined cadence (daily for expired
  sessions and temporary files, weekly for closed accounts, monthly for other
  classes).
- Deletion is soft-first: records are marked deleted, excluded from all reads,
  and hard-deleted after the documented grace period.
- Hard deletes remove the record and dependent rows, or replace direct
  identifiers with irreversible pseudonyms where referential integrity is
  required. Anonymization follows [Anonymization](ANONYMIZATION.md).
- Caches and search indexes are invalidated as part of the same job. Deleting a
  database row without evicting its cached copy is not a completed purge.
- Backups age out on their normal cycle. Individual records are not edited out
  of immutable backups; restored data is re-processed by the purge jobs.
- Third-party processors must delete or return data on the same schedule. The
  integration owner confirms deletion and records the confirmation.

## Verification and audit

- Each purge job emits a structured audit event with the data class, affected
  record count, cutoff date, and outcome. It never emits the deleted values.
- Jobs must be idempotent and safe to retry. Partial failures alert the backend
  on-call and leave the remaining records eligible for the next run.
- Quarterly, the backend maintainers sample each data class and confirm that
  records older than the window are absent.
- Purge results and verification evidence are retained for 12 months.

## Legal holds and exceptions

- The security or legal owner may place a documented hold on specific records
  during an investigation, dispute, or regulatory request.
- A hold must name the records, the reason, the owner, and an expiry or review
  date. Holds are reviewed every 90 days.
- When a hold ends, the records return to the normal purge schedule and are
  removed at the next run.
- Exceptions to a retention window require approval from the backend maintainers
  and the security team and are recorded in this document's change history.

## Ownership and review

The backend maintainers own this policy. The security team reviews legal-hold
handling and deletion evidence. The policy is reviewed every six months, when a
new data class or store is introduced, and when applicable regulations change.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
