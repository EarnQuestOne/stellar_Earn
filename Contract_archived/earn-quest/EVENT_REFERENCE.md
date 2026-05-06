# EarnQuest Contract - Event Reference

## Overview
This document provides a complete reference for all events emitted by the EarnQuest contract. Events are critical for indexers, off-chain monitoring, and building user interfaces.

## Event Structure
All events follow Soroban's event structure:
```rust
env.events().publish((topic1, topic2), data)
```

## Event Categories

### 1. Contract Lifecycle Events

#### `init`
**Emitted when:** Contract is initialized
**Topics:** `("init", admin_address)`
**Data:** `contract_version: u32`
**Source:** `init.rs::initialize()`

```rust
env.events().publish(
    (Symbol::new(env, "init"), admin),
    CONTRACT_VERSION,
);
```

#### `admin_upd`
**Emitted when:** Admin address is updated
**Topics:** `("admin_upd", old_admin_address)`
**Data:** `new_admin_address: Address`
**Source:** `init.rs::update_config()`

```rust
env.events().publish(
    (Symbol::new(env, "admin_upd"), old_admin),
    new_admin_addr,
);
```

### 2. Quest Lifecycle Events

#### `quest_reg`
**Emitted when:** New quest is registered
**Topics:** `("quest_reg", quest_id)`
**Data:** `Quest` struct
**Source:** `quest.rs::create_quest()`

```rust
env.events().publish(
    (Symbol::new(env, "quest_reg"), id),
    quest,
);
```

#### `status_upd`
**Emitted when:** Quest status is manually updated
**Topics:** `("status_upd", quest_id)`
**Data:** `Quest` struct
**Source:** `quest.rs::update_quest_status()`

```rust
env.events().publish(
    (Symbol::new(env, "status_upd"), quest_id),
    quest,
);
```

#### `quest_full`
**Emitted when:** Quest reaches participant limit
**Topics:** `("quest_full", quest_id)`
**Data:** `Quest` struct
**Source:** `quest.rs::auto_complete_quest_if_full()`

```rust
env.events().publish(
    (Symbol::new(env, "quest_full"), quest.id),
    quest,
);
```

#### `quest_exp`
**Emitted when:** Quest is manually expired
**Topics:** `("quest_exp", quest_id)`
**Data:** `Quest` struct
**Source:** `quest.rs::expire_quest()`

```rust
env.events().publish(
    (Symbol::new(env, "quest_exp"), quest_id),
    quest,
);
```

#### `auto_exp`
**Emitted when:** Quest automatically expires due to deadline
**Topics:** `("auto_exp", quest_id)`
**Data:** `Quest` struct
**Source:** `quest.rs::auto_expire_quest_if_deadline_passed()`

```rust
env.events().publish(
    (Symbol::new(env, "auto_exp"), quest.id),
    quest,
);
```

#### `quest_can`
**Emitted when:** Quest is cancelled by creator
**Topics:** `("quest_can", quest_id)`
**Data:** `Quest` struct
**Source:** `quest.rs::cancel_quest()`

```rust
env.events().publish(
    (Symbol::new(env, "quest_can"), quest_id),
    quest,
);
```

### 3. Submission Events

#### `proof_sub`
**Emitted when:** User submits proof for a quest
**Topics:** `("proof_sub", quest_id)`
**Data:** `submitter: Address`
**Source:** `submission.rs::submit_proof()`

```rust
env.events().publish(
    (Symbol::new(env, "proof_sub"), quest_id),
    submitter,
);
```

#### `approved`
**Emitted when:** Submission is approved by verifier
**Topics:** `("approved", quest_id)`
**Data:** `submitter: Address`
**Source:** `submission.rs::approve_submission()`

```rust
env.events().publish(
    (Symbol::new(env, "approved"), quest_id),
    submitter,
);
```

#### `rejected`
**Emitted when:** Submission is rejected by verifier
**Topics:** `("rejected", quest_id)`
**Data:** `submitter: Address`
**Source:** `submission.rs::reject_submission()`

```rust
env.events().publish(
    (Symbol::new(env, "rejected"), quest_id),
    submitter,
);
```

#### `sub_paid`
**Emitted when:** Submission status is updated to Paid
**Topics:** `("sub_paid", quest_id)`
**Data:** `submitter: Address`
**Source:** `lib.rs::approve_submission()`

```rust
env.events().publish(
    (Symbol::new(env, "sub_paid"), quest_id),
    submitter,
);
```

### 4. Escrow Events

#### `escrow_dep`
**Emitted when:** Funds are deposited into escrow
**Topics:** `("escrow_dep", quest_id)`
**Data:** `amount: i128`
**Source:** `escrow.rs::deposit_escrow()`

```rust
env.events().publish(
    (Symbol::new(env, "escrow_dep"), quest_id),
    amount,
);
```

#### `escrow_pay`
**Emitted when:** Reward is paid out from escrow
**Topics:** `("escrow_pay", quest_id)`
**Data:** `recipient: Address`
**Source:** `escrow.rs::process_payout()`

```rust
env.events().publish(
    (Symbol::new(env, "escrow_pay"), quest_id),
    recipient,
);
```

#### `escrow_wd`
**Emitted when:** Unclaimed funds are withdrawn from escrow
**Topics:** `("escrow_wd", quest_id)`
**Data:** `amount: i128`
**Source:** `escrow.rs::withdraw_unclaimed()`

```rust
env.events().publish(
    (Symbol::new(env, "escrow_wd"), quest_id),
    balance,
);
```

### 5. Reputation Events

#### `xp_award`
**Emitted when:** XP is awarded to a user
**Topics:** `("xp_award", user_address)`
**Data:** `xp_amount: u32`
**Source:** `reputation.rs::award_xp()`

```rust
env.events().publish(
    (Symbol::new(env, "xp_award"), address),
    xp,
);
```

#### `badge_grant`
**Emitted when:** Badge is granted to a user
**Topics:** `("badge_grant", user_address)`
**Data:** `badge: Symbol`
**Source:** `reputation.rs::grant_badge()`

```rust
env.events().publish(
    (Symbol::new(env, "badge_grant"), address),
    badge,
);
```

### 6. Pause System Events

#### `pause_init`
**Emitted when:** Pause system is initialized
**Topics:** `("pause_init", timelock_delay)`
**Data:** `(required_signatures: u32, grace_period: u64)`
**Source:** `pausable.rs::initialize_pause_state()`

```rust
env.events().publish(
    (Symbol::new(env, "pause_init"), timelock_delay),
    (required_signatures, grace_period),
);
```

#### `pause.state_changed`
**Emitted when:** Contract pause state changes
**Topics:** `("pause", "state_changed")`
**Data:** `PauseEvent { is_paused, reason, timestamp }`
**Source:** `storage.rs::emit_pause_event()`

```rust
env.events().publish(
    ("pause", Symbol::new(env, "state_changed")),
    PauseEvent { is_paused, reason, timestamp },
);
```

#### `pause.contract_resumed`
**Emitted when:** Contract is unpaused
**Topics:** `("pause", "contract_resumed")`
**Data:** `UnpauseEvent { timestamp }`
**Source:** `storage.rs::emit_unpause_event()`

```rust
env.events().publish(
    ("pause", Symbol::new(env, "contract_resumed")),
    UnpauseEvent { timestamp },
);
```

#### `pause_cfg`
**Emitted when:** Pause configuration is updated
**Topics:** `("pause_cfg", admin_address)`
**Data:** `(timelock_delay: u64, required_signatures: u32, grace_period: u64)`
**Source:** `pausable.rs::update_pause_config()`

```rust
env.events().publish(
    (Symbol::new(env, "pause_cfg"), admin),
    (timelock_delay, required_signatures, grace_period),
);
```

#### `pause_cancel`
**Emitted when:** Pending pause request is cancelled
**Topics:** `("pause_cancel", admin_address)`
**Data:** `timestamp: u64`
**Source:** `pausable.rs::cancel_pause_request()`

```rust
env.events().publish(
    (Symbol::new(env, "pause_cancel"), admin),
    timestamp,
);
```

### 7. Emergency Events

#### `emergency.withdrawal`
**Emitted when:** Emergency withdrawal is performed during pause
**Topics:** `("emergency", "withdrawal")`
**Data:** `EmergencyWithdrawalEvent { user, amount, quest_id, timestamp }`
**Source:** `storage.rs::emit_emergency_withdrawal()`

```rust
env.events().publish(
    ("emergency", Symbol::new(env, "withdrawal")),
    EmergencyWithdrawalEvent { user, amount, quest_id, timestamp },
);
```

### 8. Upgrade Events

#### `upgrade`
**Emitted when:** Contract WASM is upgraded
**Topics:** `("upgrade", admin_address)`
**Data:** `new_wasm_hash: BytesN<32>`
**Source:** `admin.rs::upgrade_contract()`

```rust
env.events().publish(
    (Symbol::new(env, "upgrade"), admin),
    new_wasm_hash,
);
```

#### `migrate`
**Emitted when:** Data migration is triggered
**Topics:** `("migrate", admin_address)`
**Data:** `(old_version: u32, new_version: u32)`
**Source:** `admin.rs::trigger_migration()`

```rust
env.events().publish(
    (Symbol::new(env, "migrate"), admin),
    (old_version, new_version),
);
```

#### `rollback`
**Emitted when:** Data rollback is triggered
**Topics:** `("rollback", admin_address)`
**Data:** `(old_version: u32, target_version: u32)`
**Source:** `admin.rs::trigger_rollback()`

```rust
env.events().publish(
    (Symbol::new(env, "rollback"), admin),
    (old_version, target_version),
);
```

## Event Naming Conventions

- **Registration/Creation:** `*_reg` (e.g., `quest_reg`)
- **Updates:** `*_upd` (e.g., `status_upd`, `admin_upd`)
- **Deposits:** `*_dep` (e.g., `escrow_dep`)
- **Withdrawals:** `*_wd` (e.g., `escrow_wd`)
- **Payments:** `*_pay` (e.g., `escrow_pay`)
- **Expiration:** `*_exp` (e.g., `quest_exp`, `auto_exp`)
- **Cancellation:** `*_can` (e.g., `quest_can`, `pause_cancel`)
- **Grants/Awards:** `*_grant`, `*_award` (e.g., `badge_grant`, `xp_award`)
- **Initialization:** `*_init` (e.g., `init`, `pause_init`)
- **Configuration:** `*_cfg` (e.g., `pause_cfg`)

## Indexer Integration Guide

### Recommended Event Subscriptions

1. **Quest Tracking:**
   - `quest_reg` - Track new quests
   - `status_upd`, `quest_full`, `quest_exp`, `auto_exp`, `quest_can` - Track quest lifecycle

2. **User Activity:**
   - `proof_sub`, `approved`, `rejected`, `sub_paid` - Track submissions
   - `xp_award`, `badge_grant` - Track reputation

3. **Financial Tracking:**
   - `escrow_dep`, `escrow_pay`, `escrow_wd` - Track fund movements

4. **System Monitoring:**
   - `init`, `admin_upd` - Track admin changes
   - `upgrade`, `migrate`, `rollback` - Track contract upgrades
   - `pause.*`, `pause_cfg`, `pause_cancel` - Track pause system

5. **Emergency Monitoring:**
   - `emergency.withdrawal` - Track emergency actions

### Event Filtering Examples

```rust
// Filter quest events
events.filter(|e| e.topics[0] == "quest_reg" || e.topics[0] == "quest_can")

// Filter user-specific events
events.filter(|e| e.topics[1] == user_address)

// Filter quest-specific events
events.filter(|e| e.topics[1] == quest_id)
```

## Testing Events

All events should be tested for:
1. Correct topic structure
2. Correct data payload
3. Emission timing
4. Event ordering

See `tests/test_events.rs` for comprehensive event testing examples.

## Version History

- **v1.0** - Initial event implementation
- **v1.1** - Added missing events for init, admin, upgrade, pause, and emergency operations
