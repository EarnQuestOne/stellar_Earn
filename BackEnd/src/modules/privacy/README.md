# Privacy Module — Account Erasure (Right to Erasure)

Implements the right-to-erasure ("right to be forgotten") pipeline: a user (or
an admin on a user's behalf) can request account erasure, cancel it within a
grace window, and track its status. Once the grace period elapses, a BullMQ
job anonymizes the user's PII across modules **inside a single transaction**.

## API

All endpoints require a valid JWT (`Authorization: Bearer <token>`).

| Method | Path                              | Access              | Description                                          |
| ------ | --------------------------------- | ------------------- | ---------------------------------------------------- |
| POST   | `/privacy/erasure/requests`       | authenticated user  | Request erasure of the caller's account              |
| POST   | `/privacy/erasure/requests/:id/cancel` | subject or admin | Cancel within the grace window                       |
| GET    | `/privacy/erasure/requests/:id`   | subject or admin    | Check request status                                 |
| POST   | `/privacy/erasure/admin/requests` | admin               | Initiate erasure on behalf of a user                 |

### Request body

```json
{ "reason": "Optional legal/operator reason" }
```

`POST /privacy/erasure/admin/requests` additionally requires `"userId"`.

### Lifecycle

```
REQUESTED ──(grace period elapses)──▶ PROCESSING ──▶ COMPLETED
    │                                      │
    └──(cancelled in grace window)──▶ CANCELLED
```

- The default grace period is **7 days**, configurable via
  `ERASURE_GRACE_PERIOD_MS`.
- A request is idempotent: completing twice is a no-op, and a cancelled
  request is never executed. A failed transaction rolls back the claim, so the
  job retries cleanly.

## Per-module erasure policy (single transaction)

| Module        | Action                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| users         | `email` / `stellarAddress` / profile PII replaced with per-user tombstone values; the row is retained so FKs and aggregate stats stay valid. |
| submissions   | Submitter PII and proof references detached (`proof` → `{ erased: true }`, notes nulled); quest integrity and reviewer decisions preserved. |
| notifications | Rows for the subject are deleted.                                      |
| payouts       | Retained for compliance but de-identified — the actor identifier is replaced with the tombstone (`erased:<subjectId>`). |
| moderation    | Submitter PII (snapshots, image URLs, notes) detached; review records retained. |
| audit         | An `privacy.erasure.executed` record is written to the event store inside the same transaction. |

Retention rationale: financial payout history and audit records are legally
required to be retained, but are de-identified so they can no longer be linked
to a natural person.
