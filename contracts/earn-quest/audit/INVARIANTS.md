# EarnQuest Contract - Invariants & Properties

**Version:** 1.0  
**Date:** May 30, 2026

## Overview

This document defines the mathematical and operational invariants that must hold true for the EarnQuest contract to function correctly. These invariants serve as critical checkpoints for auditors and are used to verify contract correctness.

## Core Invariants

### I1: Authorization Invariant

**Statement:** Every sensitive state-changing operation must be preceded by verification that the caller has the required role.

**Formal Definition:**

```
∀ operation in {create_quest, approve_submission, update_settings}:
    operation.execute() ⟹ verify_role(caller, required_role)
```

**Implications:**

- No operation bypasses role checks
- Role verification occurs before state modifications
- SuperAdmin role cannot be revoked from all users

**Verification Points:**

```rust
// Every sensitive function must start with:
admin::require_role(&env, &caller, required_role)?;
// OR
address.require_auth();
```

**Test Scenarios:**

- Unauthorized user attempts operation → Must fail
- Authorized user attempts operation → Must succeed
- Role is revoked then operation attempted → Must fail
- Role is granted then operation attempted → Must succeed

---

### I2: Fund Conservation Invariant

**Statement:** The total value of funds in the contract is conserved across all operations.

**Formal Definition:**

```
Total_Funds_Before = Total_Funds_After
Where:
  Total_Funds = user_balances + escrow_amount + contract_reserves
```

**Implications:**

- No funds are created or destroyed arbitrarily
- Fund transfers are atomic
- Fractional amounts are handled consistently

**Verification Method:**

```rust
// Pseudocode for verification
let total_before = sum(all_balances) + sum(all_escrows) + reserves;
// ... perform operations ...
let total_after = sum(all_balances) + sum(all_escrows) + reserves;
assert!(total_before == total_after);
```

**Critical Operations to Verify:**

1. Quest creation with reward pool
2. Submission approval with payout
3. Escrow creation and release
4. Batch payout processing
5. Refund operations

---

### I3: Quest Lifecycle Invariant

**Statement:** Each quest follows a defined state machine with valid transitions only.

**State Machine:**

```
┌─────────────────────────────────────────────────────┐
│                   Quest States                       │
└─────────────────────────────────────────────────────┘

  [Created] → [Active] → [Completed]
     │          │
     │          └─→ [Cancelled] ──→ [Archived]
     │
     └──────────────→ [Cancelled]

Valid Transitions:
- Created → Active (when metadata finalized)
- Active → Completed (when end time reached)
- Active/Created → Cancelled (by admin)
- Any → Archived (after retention period)

Invalid Transitions (must be prevented):
- Completed → Active
- Cancelled → Active
- Archived → *
```

**Formal Definition:**

```
∀ quest q: state_transition(q.current_state, q.new_state) ∈ valid_transitions
```

**Invariant Properties:**

1. A quest can only be in one state at a time
2. Terminal states (Completed, Cancelled, Archived) are irreversible
3. Active quests must have reward pool allocated
4. All submissions must be resolved before completing quest

**Verification Points:**

```rust
// Verify state consistency
match quest.status {
    QuestStatus::Active => {
        assert!(quest.has_reward_pool());
        assert!(quest.end_time > current_time);
    },
    QuestStatus::Completed => {
        assert!(all_submissions_resolved(&quest));
    },
    _ => {}
}
```

---

### I4: Reputation Invariant

**Statement:** User reputation is non-negative, accumulates through valid activities, and decays over time.

**Formal Definition:**

```
reputation(user, t) ≥ 0
reputation(user, t2) ≤ reputation(user, t1) where t2 > t1 (due to decay)
Δreputation > 0 ⟹ valid_quest_activity(quest, user)
```

**Reputation Rules:**

1. **Accumulation:**
   - Quest completion: +10 base reputation + difficulty_bonus
   - Badge award: +5 reputation
   - User rating: +1 per positive rating (max 5 per quest)

2. **Decay:**
   - Daily decay rate: 0.1% of accumulated reputation
   - Minimum reputation: 0 (clamped)
   - Maximum reputation: 1,000,000 (overflow protection)

3. **Penalties:**
   - Failed quest: -2 reputation
   - Rejected submission: -1 reputation
   - Dispute loss: -5 reputation
   - Ban prevents all reputation changes

**Verification Properties:**

```rust
// Reputation bounds check
assert!(user.reputation >= 0);
assert!(user.reputation <= MAX_REPUTATION);

// Decay verification
assert!(decayed_rep <= current_rep);

// Activity verification
assert!(reputation_change > 0 ⟹ quest_completed(user, quest));
```

---

### I5: Submission Workflow Invariant

**Statement:** Each submission follows a defined approval workflow with proper state transitions and validations.

**Workflow State Machine:**

```
┌──────────────────────────────────────────┐
│        Submission States                  │
└──────────────────────────────────────────┘

  Submitted → [Evaluating] → Approved ──→ Rewarded
                  ↓
             Rejected ──→ Refundable

State Rules:
- Submitted: Initial state when user submits quest
- Evaluating: Reviewer is assessing submission
- Approved: Submission meets all requirements
- Rejected: Submission does not meet requirements
- Rewarded: Allocated reward is released
- Refundable: User receives refund for rejected submission
```

**Verification Rules:**

```rust
// Each submission must satisfy:
match submission.status {
    SubmissionStatus::Submitted => {
        assert!(submission.created_at <= now());
        assert!(submission.quest_exists());
    },
    SubmissionStatus::Approved => {
        assert!(submission.evidence.len() > 0);
        assert!(submission.reviewer != Address::zero());
        assert!(submission.approval_time > submission.created_at);
    },
    SubmissionStatus::Rejected => {
        assert!(submission.rejection_reason.len() > 0 || submission.has_reason());
    },
    SubmissionStatus::Rewarded => {
        assert!(submission.is_approved());
        assert!(submission.reward_transferred);
    },
}
```

---

### I6: Escrow Safety Invariant

**Statement:** Escrowed funds are held securely and released only when all conditions are met.

**Escrow Rules:**

```
Escrowed_Funds = Sum of all active escrow amounts
Contract_Balance ≥ Escrowed_Funds (always true)

For each escrow:
1. release_time must be in the future upon creation
2. Funds locked until release_time
3. Early release only with payer + recipient approval
4. Expired escrows can be reclaimed by payer
```

**Verification Invariants:**

```rust
// Escrow amount verification
assert!(escrow.amount > 0);
assert!(escrow.amount <= contract.available_balance());

// Release condition verification
if escrow.is_released {
    assert!(now() >= escrow.release_time || escrow.early_released);
}

// Fund tracking
assert!(contract.escrow_total <= contract.balance);
```

**Fund Transfer Safety:**

```
When releasing escrow:
1. Check: release_time condition met
2. Check: recipient address valid
3. Update: escrow.released = true
4. Transfer: funds to recipient
5. Verify: recipient received funds
```

---

### I7: Badge Assignment Invariant

**Statement:** Badges are only assigned according to defined rules and cannot be duplicated or revoked arbitrarily.

**Badge Rules:**

```
Badge Assignment Rules:
- Each badge type has strict assignment criteria
- Users cannot have duplicate badges of the same type
- Badge metadata is immutable after assignment
- Badge revocation requires SuperAdmin + valid reason

Badge Types:
- Achievement: Earned through quest completion
- Milestone: Earned at reputation thresholds
- Special: Awarded by BadgeAdmin for special events
- Moderator: Assigned to community moderators
```

**Verification Invariants:**

```rust
// No duplicate badges
let user_badges = get_user_badges(&env, &user);
for badge_type in unique_types {
    assert!(count_badges_of_type(user_badges, badge_type) <= 1);
}

// Badge metadata consistency
for badge in user_badges {
    assert!(badge.assigned_at <= now());
    assert!(badge_type_exists(badge.badge_type));
}
```

---

### I8: Oracle Data Invariant

**Statement:** Oracle data is fresh, validated, and within acceptable bounds.

**Oracle Rules:**

```
Oracle Data Requirements:
1. Data Must Be Fresh:
   - Maximum age: 1 hour (configurable)
   - Each data point has timestamp
   - Stale data is marked and rejected

2. Data Validation:
   - Multiple sources required for critical decisions
   - Prices must be within 5% of median
   - Outliers are flagged and excluded

3. Bounds Checking:
   - Minimum price: > 0
   - Maximum price: < MAX_SAFE_INTEGER
   - Price change limits: max 50% per update
```

**Verification Invariants:**

```rust
// Data freshness
assert!(now() - oracle_data.timestamp <= MAX_AGE);

// Price bounds
assert!(price > 0);
assert!(price < MAX_SAFE_PRICE);

// Multi-source aggregation
assert!(price_sources.len() >= MIN_SOURCES);
assert!(price_variance <= MAX_VARIANCE_PCT);
```

---

### I9: Storage Consistency Invariant

**Statement:** Storage operations maintain consistency across all data structures and never leave storage in an invalid state.

**Storage Consistency Rules:**

```
1. Atomic Operations:
   - All related updates happen together or not at all
   - No partial updates across unrelated operations

2. Index Consistency:
   - All indices point to valid data
   - No dangling references
   - Indices are contiguous (no gaps)

3. Referential Integrity:
   - Foreign key relationships are maintained
   - All referenced entities exist
   - Cascading updates are consistent
```

**Verification Properties:**

```rust
// Consistency check after operations
for (index, data) in storage.iter() {
    assert!(index_valid(index));
    assert!(data_valid(data));
    assert!(references_exist(data));
}

// No orphaned data
assert!(all_quests_have_creator_accounts());
assert!(all_submissions_reference_valid_quests());
assert!(all_escrows_reference_valid_users());
```

---

### I10: Access Control Invariant

**Statement:** Role-based access control is enforced consistently throughout the contract.

**RBAC Rules:**

```
Role Hierarchy:
SuperAdmin (root)
├── Can assign/revoke all roles
├── Can pause/unpause contract
├── Can authorize upgrades
└── Implicit permissions for all other roles

BadgeAdmin
├── Can manage badge types
├── Can award badges
└── Can view badge data

OracleAdmin
├── Can update oracle configuration
├── Can set price feeds
└── Can view oracle data

StatsAdmin
├── Can update statistics
├── Can view metrics
└── Cannot modify core contract state

Pauser
├── Can pause contract
├── Can unpause contract
└── Cannot modify any state when paused

Regular Users
├── Can create and submit quests
├── Can view public data
└── Cannot access admin functions
```

**Verification Invariants:**

```rust
// Role-based access check
if function_requires_role(Role::SuperAdmin) {
    assert!(user_has_role(caller, Role::SuperAdmin)?);
}

// No privilege escalation
for user in all_users {
    assert!(user.roles_consistent_with_assignments());
}

// Role cannot be self-revoked
assert!(revoke_prevents_self_revoke());
```

---

## Property-Based Invariants

### P1: Idempotency Property

**Invariant:** Calling a read-only function multiple times returns the same result.

```rust
// For all read-only functions:
let result1 = get_user_stats(&env, &user);
let result2 = get_user_stats(&env, &user);
assert_eq!(result1, result2);
```

---

### P2: Causality Property

**Invariant:** Operations respect chronological ordering.

```rust
// Later operations cannot affect earlier state
let state1 = get_contract_state(&env);
execute_operation(&env, op1);
let state2 = get_contract_state(&env);
// state2 reflects impact of op1
assert!(can_reverse_to_state1_or_advance_to_state2());
```

---

### P3: Determinism Property

**Invariant:** Given the same input state and operations, the result is always the same.

```rust
// Deterministic execution
let result1 = execute_scenario(&env, input_state, operations);
let result2 = execute_scenario(&env, input_state, operations);
assert_eq!(result1, result2);
```

---

### P4: Fairness Property

**Invariant:** No participant can be arbitrarily disadvantaged without cause.

```rust
// Rewards are distributed fairly
// Reputation is accumulated consistently
// Disputes are resolved objectively
```

---

## Cross-Module Invariants

### CM1: Quest-Submission Coupling

**Invariant:** All submissions must reference valid, existing quests.

```rust
for submission in all_submissions {
    let quest = get_quest(&env, submission.quest_id);
    assert!(quest.exists());
    assert!(quest.status == QuestStatus::Active);
}
```

---

### CM2: Reputation-Badge Coupling

**Invariant:** Badge assignments must align with reputation thresholds.

```rust
for badge in user_badges {
    let reputation = get_user_reputation(&env, &user);
    assert!(reputation >= badge.required_reputation);
}
```

---

### CM3: Fund-Escrow Coupling

**Invariant:** Total escrowed funds never exceed contract balance.

```rust
let total_escrow = sum(all_escrows.iter().map(|e| e.amount));
let contract_balance = get_contract_balance(&env);
assert!(total_escrow <= contract_balance);
```

---

## Invariant Violation Scenarios

### Scenario 1: Unauthorized Access

**Violation:** User without role successfully calls admin function

**Prevention:**

- All admin functions must check roles
- Role checks must occur before state mutation

---

### Scenario 2: Fund Disappearance

**Violation:** Funds leave contract without visible recipient

**Prevention:**

- All transfers tracked
- Fund conservation verified after operations

---

### Scenario 3: Quest State Corruption

**Violation:** Quest exists in invalid state combination

**Prevention:**

- State machine enforced at update points
- State consistency checked after modifications

---

### Scenario 4: Reputation Manipulation

**Violation:** User gains reputation without valid activity

**Prevention:**

- Reputation changes only on valid quest events
- Change history tracked and auditable

---

### Scenario 5: Submission Approval Bypass

**Violation:** Submission approved without proper review

**Prevention:**

- Approval requires reviewer specification
- Evidence must be present
- Audit trail maintained

---

## Testing Invariant Compliance

### Unit Test Template

```rust
#[test]
fn test_invariant_<NAME>() {
    let env = Env::default();
    setup_contract(&env, &admin);

    // Record initial state
    let initial_state = capture_state(&env);

    // Execute operation
    execute_operation(&env, &operation);

    // Verify invariant holds
    assert!(verify_invariant(&env, &initial_state));
}
```

### Property Test Template

```rust
proptest! {
    #[test]
    fn prop_invariant_<NAME>(inputs in strategy()) {
        let env = Env::default();
        setup_contract(&env, &admin);

        for input in inputs {
            execute_operation(&env, &input);
            assert!(verify_invariant(&env));
        }
    }
}
```

---

## Revision History

| Date       | Version | Changes                          |
| ---------- | ------- | -------------------------------- |
| 2026-05-30 | 1.0     | Initial invariants documentation |

---

**Document Classification:** Public - Audit Preparation
