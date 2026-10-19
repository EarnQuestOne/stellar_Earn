# Backend Database Migration Review Policy

This policy defines how database migrations are named, reviewed, tested, and
deployed. It supplements the project's change-approval rules with the day-to-day review
standard for migration files.

- **Owner:** Backend maintainers, with the database reviewer as co-owner
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [Required approvals](../APPROVALS.md), [Zero downtime](ZERO_DOWNTIME.md), [Transactions](TRANSACTIONS.md), [Seeding policy](SEEDING_POLICY.md)

## Naming and structure

- Migration filenames use the repository's timestamp prefix followed by a short,
  lowercase description, for example `1729000000000-add-quest-deadline-index.ts`.
- The description states the intent, not the mechanism: `add-payout-idempotency-key`
  rather than `alter-table-3`.
- One migration contains one logical change. Unrelated alterations are split so
  that each can be reviewed and rolled back independently.
- Migrations import only stable schema helpers. They must not import application
  services, models that can change later, or code that reads runtime
  configuration.
- Every migration implements `up` and `down`. A missing `down` requires an
  explicit explanation and database-reviewer approval.

## Review requirements

The reviewer confirms that the migration:

- is backward compatible with the application version currently deployed;
- uses the expand/migrate/contract sequence for renames, drops, and type changes;
- is safe under concurrent traffic and does not hold a long table lock;
- creates required indexes for new foreign keys and query patterns;
- validates constraints without blocking writes, using the database's concurrent
  or `NOT VALID` options where supported;
- is idempotent or can be retried safely after a partial failure;
- includes a bounded, resumable backfill with verification queries;
- does not mix schema changes with data seeding that belongs in a separate,
  reviewed seed step;
- preserves existing data and has a documented outcome for null or malformed
  values.

The pull request includes the migration file, the entity or model changes, tests,
and the rollout note. Reviewers read the generated SQL, not only the TypeScript.

## Testing

- Migrations run forward and backward against a production-like schema and
  dataset in CI or a dedicated review environment.
- Tests cover the application reading and writing through both the old and new
  shapes during the compatibility window.
- Large-table changes include an estimated row count, lock duration, and
  replication impact.
- Backfills are tested for restart behaviour and for duplicate-safe execution.

## Deployment sequence

1. Deploy the expand migration and compatibility code together.
2. Run the backfill and verify counts and constraints.
3. Deploy the code that reads the new shape.
4. Remove the old code, then ship the contract migration in a later release.
5. Confirm that the final schema has no leftover compatibility columns, triggers,
   or indexes that are no longer used.

The deploy pipeline runs migrations once, under a lock, before the new
application version receives traffic. A failed migration stops the rollout and
leaves the previous version serving.

## Post-deployment verification

The author checks row counts, constraint validity, query latency, error rate, and
replication lag. Any deviation from the rollout note is treated as an incident.
The migration is recorded in the release notes with its compatibility window.

## Emergency migrations

An emergency migration may skip the normal lead time only to restore service or
close a security gap. It still requires a second reviewer, a tested rollback, and
a retrospective within two business days. The retrospective confirms the final
schema state and schedules any deferred cleanup.

## Ownership and review

The backend maintainers own migration code; the database reviewer owns the review
standard and may block a change that is not lock-safe. The policy is reviewed
every six months and whenever the database engine or migration tool changes.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
