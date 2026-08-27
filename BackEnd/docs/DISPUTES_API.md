# Disputes API

All endpoints require the normal JWT cookie authentication.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/disputes` | Submission participant | Open a dispute with `submissionId` and `arbitratorAddress`. |
| `POST` | `/api/v1/disputes/:id/appeal` | Participant | Appeal a resolved dispute with `newArbitratorAddress`. |
| `POST` | `/api/v1/disputes/:id/resolve` | Assigned arbitrator or admin | Resolve with `upheld` and optional `slashBps` (0-10000). |
| `GET` | `/api/v1/disputes/:id` | Authenticated user | Read one mirrored dispute. |
| `GET` | `/api/v1/disputes` | User or admin | List the caller's disputes, or all disputes for admins. |

The mirror stores the quest contract id, submission reference, participants,
status, lifecycle transaction hashes, and resolution outcome. The contract
remains authoritative for state; transaction submission failures do not create
a local mirror row.

The current shared Stellar infrastructure signs contract calls with the
configured server key. For participant-owned `open_dispute` and
`appeal_dispute` calls, deployment must configure that signer as the participant
or extend the API to accept and submit a wallet-signed Soroban transaction.
Event-to-mirror reconciliation is also still a follow-up to the generic event
store ingestion path.