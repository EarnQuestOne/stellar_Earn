# Dispute Resolution

## Overview

Dispute resolution in `earn-quest` is a hybrid process:

- the contract stores the dispute record and emits the lifecycle events
- evidence gathering, reviewer discussion, and final adjudication happen off-chain
- the assigned arbitrator writes the outcome back on-chain by resolving or leaving the dispute withdrawn

This matches the current implementation surface. The contract does **not** execute a full on-chain evidence review or automated verdict engine.

## Roles

- `initiator`: the user opening the dispute
- `arbitrator`: the account allowed to resolve that dispute on-chain
- `operator team`: off-chain reviewers who gather context, verify evidence, and coordinate the final decision

## On-Chain Flow

### 1. Open

`open_dispute(quest_id, initiator, arbitrator)` creates a dispute record with status `Pending` and emits `disp_open`.

Indexed topics:
- event name
- quest id
- initiator
- arbitrator

Stored fields:
- quest id
- initiator
- arbitrator
- status
- filed timestamp

### 2. Review Off-Chain

The contract does not ingest evidence blobs or run adjudication logic. Review happens off-chain and should collect:

- submission identifiers and timestamps
- proof hashes or external evidence references
- moderator or verifier notes
- the final decision and rationale

Recommended practice is to archive this evidence in the project support system and reference the dispute identifiers in moderator notes.

### 3. Resolve or Withdraw

- `resolve_dispute(quest_id, initiator, arbitrator)` marks the dispute as `Resolved` and emits `disp_res`
- `withdraw_dispute(quest_id, initiator)` marks a pending dispute as `Withdrawn` and emits `disp_wd`

`resolve_dispute` is restricted to the assigned arbitrator. `withdraw_dispute` is restricted to the initiator while the dispute is still pending.

## Event Mapping

| Action | Event | Indexed Topics |
|--------|-------|----------------|
| Open dispute | `disp_open` | `quest_id`, `initiator`, `arbitrator` |
| Resolve dispute | `disp_res` | `quest_id`, `initiator`, `arbitrator` |
| Withdraw dispute | `disp_wd` | `quest_id`, `initiator` |

These topics are structured for indexers to answer questions like:

- all disputes for a quest
- all disputes opened by a user
- all disputes assigned to an arbitrator

## Operational Guidance

1. Record the off-chain evidence bundle before changing on-chain dispute status.
2. Keep the chosen arbitrator stable for the life of a dispute so event history remains easy to index.
3. Resolve on-chain promptly after the off-chain decision so explorers and dashboards reflect the final state.

## Current Limitations

- no on-chain evidence storage
- no native appeal workflow
- no automatic payout reversal or settlement tied to dispute resolution
- no contract-level enforcement that a submission was rejected before a dispute is opened

Those constraints should be surfaced in any operator or frontend experience that exposes disputes.