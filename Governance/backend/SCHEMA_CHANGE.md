# Backend Schema-Change Approval Governance

This policy defines who approves database schema changes, what evidence a change
must include, and how compatibility is preserved across deploys. It applies to
TypeORM migrations and any change to tables, columns, indexes, constraints,
enums, or persisted data shapes used by backend services.

- **Owner:** Backend maintainers, with the database reviewer as co-owner
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [Required approvals](../APPROVALS.md), [Zero downtime](ZERO_DOWNTIME.md), [Transactions](TRANSACTIONS.md), [Stability tiers](STABILITY_TIERS.md)

## Approval requirements

| Change | Required approvals |
|--------|--------------------|
| Additive change (new nullable column, new table, new index) | One backend maintainer |
| Backfill, data rewrite, or new non-null constraint | Two backend maintainers, including the database reviewer |
| Drop, rename, type change, or constraint tightening | Two backend maintainers, the database reviewer, and the security team when personal or financial data is involved |
| Emergency production fix | One backend maintainer and one on-call reviewer, followed by retrospective review within 2 business days |

The author may not approve their own migration. Approval means the reviewer has
read the migration, its rollback path, and its query plan.

## Compatibility requirements

- Changes must be backward compatible with the application version that is
  currently running during the deploy. Use the expand/contract pattern:
  1. **Expand:** add nullable columns, new tables, or dual-write paths.
  2. **Migrate:** backfill in bounded, resumable batches while both shapes are
     readable.
  3. **Contract:** remove the old shape only after every deployed service has
     stopped using it.
- Destructive changes must ship in a separate release from the code that stops
  using the removed shape.
- New columns are nullable or have a safe default. Adding a `NOT NULL` constraint
  to a large table requires a validated backfill and a lock-safe migration.
- Enum and status changes must be readable by the previous application version
  during the rollout window.
- API responses must not change shape solely because of an internal schema
  change; follow the API versioning policy for consumer-visible changes.

## Required evidence in the pull request

- The migration file, with an implemented and tested `down` path, or a written
  justification when a rollback is impossible.
- The expected row counts and an estimate of lock duration for large tables.
- Indexes added for new foreign keys and for query patterns introduced by the
  change.
- A backfill plan with batch size, idempotency, resume behaviour, and
  verification queries.
- Test evidence from a production-like dataset, including the migration running
  forward and backward.
- A rollout and rollback note describing what happens if the deploy fails
  midway.

## Naming and structure

- Migration names follow the repository's timestamp-and-description convention
  and clearly state the intent.
- One migration expresses one logical change. Do not mix unrelated table
  alterations in a single file.
- Migrations must be deterministic and must not depend on application code that
  can change later.
- Raw SQL is acceptable when the query builder cannot express a safe change, but
  it must be reviewed line by line and must use bound parameters.

## Review and verification

Reviewers check that the migration is reversible, lock-safe, idempotent where
retried, covered by tests, and compatible with the deployed application. The
database reviewer inspects the query plan for changes affecting large tables.
After deployment, the author confirms row counts, error rates, and replication
lag before the change is considered complete.

## Emergency changes

An emergency schema change may use the expedited approval above only to restore
service or close a security gap. The author records the reason, the risk, and the
follow-up work in the incident record. The retrospective must confirm that the
schema is in the intended state and that no temporary compatibility code remains.

## Ownership and review

The backend maintainers own this policy; the database reviewer owns the technical
review standard. The policy is reviewed every six months and whenever the
database engine, migration tooling, or deployment model changes.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
