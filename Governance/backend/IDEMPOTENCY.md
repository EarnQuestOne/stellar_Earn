# Backend Idempotency and Retry Convention

Network retries must not repeat payments or duplicate records. This convention defines idempotency keys and safe retry behaviour.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Which endpoints

Non-idempotent write endpoints that create records or move value — submissions, payouts, claims, and bulk operations — require an `Idempotency-Key` header. `GET`, `PUT`, and `DELETE` are expected to be idempotent by design.

## Semantics

The key is a client-generated unique string (UUID recommended). The first request with a key is processed and its response stored for at least 24 hours. A repeat with the same key and same body returns the stored response; the same key with a different body returns `409 CONFLICT`. A request still in progress returns 409 with a retry hint.

## Client retries

Clients retry only on network errors, 408, 429, and 5xx, using exponential backoff with jitter, and reuse the same key for the same operation.

## Server retries

Background jobs that retry must be safe to run more than once, using the same techniques.

## Ownership and review

Owned by the backend maintainers. Reviewed every six months.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
