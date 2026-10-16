# Backend Bulk-Operation and Batching Policy

Bulk endpoints and jobs can overload services and leave data half-updated. This policy sets limits and defines what happens when part of a batch fails.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Limits

Each bulk endpoint documents a maximum batch size (default 100 items) and a maximum payload size. Larger work is split into background jobs.

## Partial failure

Each endpoint declares one of two modes: all-or-nothing (a transaction rolls back on any failure) or per-item (each item succeeds or fails independently). Per-item results are returned with an index, status, and error code for each item.

## Idempotency and retries

Bulk requests accept an idempotency key (see IDEMPOTENCY.md) so a retry does not repeat completed items.

## Safety

Bulk operations that move money or delete data require explicit authorisation and are audit-logged (AUDIT_LOGGING.md). Background jobs report progress and are throttled.

## Ownership and review

Owned by the backend maintainers. Reviewed every six months.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
