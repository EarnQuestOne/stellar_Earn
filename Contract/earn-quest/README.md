# EarnQuest Soroban Smart Contract

A Soroban smart contract for quest-based earning with participant limit management on the Stellar blockchain.

## Features

- ✅ Quest registration with customizable participant limits
- ✅ Proof submission and verification workflow
- ✅ Automatic quest completion when participant limit reached
- ✅ Claim counter tracking with race condition protection
- ✅ User reputation system (XP, levels, badges)
- ✅ Comprehensive error handling
- ✅ Event emission for off-chain monitoring

## Quick Start

### Prerequisites

- Rust ≥ 1.74
- Cargo
- wasm32-unknown-unknown target

### Build

```bash
cd earn-quest
cargo build --target wasm32-unknown-unknown --release
```

### Test

```bash
cargo test
```

Expected output:
```
test result: ok. 6 passed; 0 failed
```

### Deploy

```bash
# Install Soroban CLI (if not already installed)
cargo install --locked soroban-cli

# Deploy to testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/earn_quest.wasm \
  --network testnet \
  --source <your-secret-key>
```

## Contract API

### Quest Management

- `register_quest(id, creator, reward_asset, reward_amount, verifier, deadline, max_participants)` - Create new quest
- `get_quest(id)` - Get quest details
- `is_quest_full(quest_id)` - Check if quest reached participant limit
- `update_quest_status(quest_id, caller, status)` - Update quest status (creator only)

### Submissions

- `submit_proof(quest_id, submitter, proof_hash)` - Submit quest completion proof
- `get_submission(quest_id, submitter)` - Get submission details
- `approve_submission(quest_id, submitter, verifier)` - Approve and payout (verifier only)
- `reject_submission(quest_id, submitter, verifier)` - Reject submission (verifier only)

### Reputation

- `get_user_stats(address)` - Get user XP, level, and badges
- `grant_badge(address, badge, admin)` - Award badge (admin only)

## Data Structures

### Quest

```rust
{
    id: Symbol,
    creator: Address,
    reward_asset: Address,
    reward_amount: i128,
    verifier: Address,
    deadline: u64,
    status: QuestStatus,        // Active | Paused | Completed | Expired
    max_participants: u32,      // Maximum allowed participants
    total_claims: u32,          // Current number of approved claims
}
```

### Submission

```rust
{
    quest_id: Symbol,
    submitter: Address,
    proof_hash: BytesN<32>,
    status: SubmissionStatus,   // Pending | Approved | Rejected | Paid
    timestamp: u64,
}
```

## Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 1 | QuestAlreadyExists | Quest with this ID already exists |
| 2 | QuestNotFound | Quest not found |
| 3 | **QuestFull** | Quest has reached maximum participants |
| 4 | QuestExpired | Quest deadline has passed |
| 5 | QuestNotActive | Quest is paused or completed |
| 6 | InvalidRewardAmount | Reward amount must be positive |
| 7 | **InvalidParticipantLimit** | Participant limit must be positive |
| 8 | Unauthorized | Caller not authorized |
| 9 | SubmissionNotFound | Submission not found |
| 10 | SubmissionAlreadyExists | Duplicate submission |
| 11 | InvalidSubmissionStatus | Invalid status transition |
| 12 | UserStatsNotFound | User stats not found |

## Example Usage

```rust
// Register a quest with max 10 participants
client.register_quest(
    &symbol_short!("QUEST1"),
    &creator_address,
    &usdc_token_address,
    &1000,  // 10 USDC reward
    &verifier_address,
    &1735689600,  // Deadline
    &10,  // Max 10 participants
);

// Submit proof
client.submit_proof(
    &symbol_short!("QUEST1"),
    &user_address,
    &proof_hash,
);

// Approve (verifier only)
client.approve_submission(
    &symbol_short!("QUEST1"),
    &user_address,
    &verifier_address,
);

// Check if quest is full
let is_full = client.is_quest_full(&symbol_short!("QUEST1"));
```

## Testing

The contract includes comprehensive tests covering:

- Quest registration with participant limits
- Participant limit enforcement
- Claim counter accuracy
- Automatic quest completion
- Edge cases (zero participants, simultaneous claims, full quest rejection)
- User reputation tracking

Run tests with:
```bash
cargo test -- --nocapture
```

## Security

- ✅ Authorization checks on all state-changing functions
- ✅ Input validation (participant limits, reward amounts)
- ✅ Race condition protection in approval logic
- ✅ Access control (creator, verifier, admin roles)
- ✅ Event emission for transparency

## License

MIT

## Contributing

See main repository [CONTRIBUTING.md](../../CONTRIBUTING.md)
