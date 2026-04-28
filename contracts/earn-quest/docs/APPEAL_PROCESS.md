# Appeal Process

## Overview

The appeal process provides a mechanism for users to challenge the resolution of a dispute. If an initiator is unsatisfied with the decision made by the initial arbitrator, they can escalate the matter to a higher authority (typically a system admin or a designated senior arbitrator).

This process is **hybrid**:
- **On-chain**: The appeal status, initiator, and new arbitrator are recorded. Lifecycle events are emitted.
- **Off-chain**: Evidence re-evaluation and final adjudication are performed by the senior review team.

## Roles

- **Initiator**: The user who opened the original dispute and is now appealing the resolution.
- **Initial Arbitrator**: The entity that resolved the original dispute.
- **Appeals Arbitrator**: A senior reviewer or admin responsible for the final verdict on the appeal.

## Appeal Flow

### 1. Initiate Appeal
An appeal can only be opened after a dispute has been marked as `Resolved`. The initiator calls `appeal_dispute(quest_id, initiator, new_arbitrator)`.

**Requirements:**
- The dispute must exist and be in `Resolved` status.
- Only the original initiator can call this.
- A `new_arbitrator` (Appeals Arbitrator) must be specified.

**On-chain effect:**
- Status changes from `Resolved` to `Appealed`.
- `arbitrator` field is updated to the `new_arbitrator`.
- `disp_appl` event is emitted.

### 2. Senior Review (Off-Chain)
The senior review team gathers:
- The original dispute evidence.
- The rationale for the initial resolution.
- Any new evidence or arguments provided by the initiator for the appeal.

This review happens entirely off-chain to keep contract gas costs low and allow for complex evidence (screenshots, logs, etc.) to be considered.

### 3. Final Resolution
The Appeals Arbitrator (who must have **Admin** privileges in the contract) calls `resolve_dispute`.

**On-chain effect:**
- Status changes back to `Resolved`.
- `disp_res` event is emitted.
- The decision is now final and cannot be appealed again on-chain.

## Event Mapping

| Action | Event | Indexed Topics |
|--------|-------|----------------|
| Appeal dispute | `disp_appl` | `quest_id`, `initiator`, `arbitrator` |
| Resolve appeal | `disp_res` | `quest_id`, `initiator`, `arbitrator` |

## Operational Guidance

1. **Wait Period**: It is recommended to allow a specific window (e.g., 7 days) after a dispute resolution for an appeal to be filed.
2. **Admin Requirement**: For security and fairness, only accounts with the `Admin` role can resolve an appeal. This ensures that the final decision is made by a trusted member of the platform team.
3. **Documentation**: All off-chain review notes should be archived and linked to the dispute ID for auditability.
