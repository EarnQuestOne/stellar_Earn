# EarnQuest Contract - Threat Model & Risk Analysis

**Version:** 1.0  
**Date:** May 30, 2026

## Executive Summary

This document provides a comprehensive threat model and risk analysis for the EarnQuest contract. It identifies potential attack vectors, assesses their severity, and outlines mitigation strategies.

## Threat Classification Framework

### Severity Levels

- **Critical (C):** Could lead to fund loss, privilege escalation, or total contract compromise
- **High (H):** Could lead to significant fund loss or data corruption
- **Medium (M):** Could lead to limited fund loss or service disruption
- **Low (L):** Minor impact on functionality or user experience
- **Informational (I):** No direct security impact; best practice improvement

### Impact Categories

- **Confidentiality:** Unauthorized access to private data
- **Integrity:** Unauthorized modification of data or state
- **Availability:** Service disruption or resource exhaustion
- **Financial:** Direct loss of funds or value

## Threat Model: STRIDE Analysis

### 1. Spoofing Identity - [HIGH]

**Threat:** Attacker impersonates legitimate user or contract

**Attack Vectors:**

- Forge caller address in cross-contract calls
- Replay old signatures
- Impersonate admin roles

**Likelihood:** Medium  
**Impact:** High - Could lead to unauthorized operations

**Mitigation:**

- Soroban's built-in `require_auth()` validates caller identity
- Signatures are blockchain-verified, replay not possible
- Role checks prevent privilege escalation
- Address validation on all operations

**Verification:**

```rust
// Every sensitive function uses require_auth()
caller.require_auth();
admin::require_role(&env, &caller, required_role)?;
```

---

### 2. Tampering with Data - [CRITICAL]

**Threat:** Attacker modifies contract state, storage, or persistent data

**Attack Vectors:**

- Direct storage manipulation (not possible in Soroban)
- Incorrect state transitions
- Corrupted data structures in events
- Batch operation partial failures

**Likelihood:** Low  
**Impact:** Critical - Could corrupt entire contract

**Mitigation:**

- Soroban provides immutable storage
- State transitions validated before execution
- Atomic operations prevent partial updates
- Comprehensive validation on all data

**Verification:**

```rust
// State consistency checks
assert!(quest.status_valid());
assert!(no_gaps_in_indices());
assert!(referential_integrity_maintained());
```

---

### 3. Repudiation - [MEDIUM]

**Threat:** User denies performing or authorizing an action

**Attack Vectors:**

- Claims not to have authorized submission
- Denies quest creation
- Disputes reputation changes

**Likelihood:** Medium  
**Impact:** Medium - Could lead to disputes but not fund loss

**Mitigation:**

- All actions logged in events with caller
- Blockchain provides immutable audit trail
- require_auth() proves authorization
- Event emissions cannot be forged

**Verification:**

```rust
// Event emissions provide proof
env.events.publish((
    Symbol::new(&env, "submission_approved"),
    (submission_id, user_address, timestamp),
));
```

---

### 4. Information Disclosure - [MEDIUM]

**Threat:** Attacker gains unauthorized access to sensitive information

**Attack Vectors:**

- Query private user data
- Extract oracle price history
- Access unreleased submission details
- View admin configuration

**Likelihood:** Medium  
**Impact:** Medium - Privacy concerns

**Mitigation:**

- Role-based access to sensitive functions
- Private data fields hidden from public queries
- Rate limiting on queries
- Admin functions marked as restricted

**Verification:**

```rust
// Sensitive data requires authorization
pub fn get_user_data(env: Env, user: Address) -> Result<UserData, Error> {
    caller.require_auth();  // Caller must authorize
    require_role(&env, &caller, Role::Admin)?;  // Role check
    Ok(user_data)
}
```

---

### 5. Denial of Service - [HIGH]

**Threat:** Resource exhaustion or service disruption

**Attack Vectors:**

- Large batch operations consuming gas
- Unbounded loop iterations
- Storage exhaustion
- Contract pause abuse
- Infinite loops in validation

**Likelihood:** Medium  
**Impact:** High - Service disruption

**Mitigation:**

- Batch operation size limits enforced
- Loop iterations bounded
- Gas metering by Soroban environment
- Only SuperAdmin can pause contract
- Input validation limits string/array sizes
- Pagination for list operations

**Verification:**

```rust
// Size limits enforced
assert!(batch_size <= MAX_BATCH_SIZE);
assert!(string_length <= MAX_STRING_LENGTH);
assert!(array_size <= MAX_ARRAY_SIZE);
```

---

### 6. Elevation of Privilege - [CRITICAL]

**Threat:** Attacker gains higher-privilege roles

**Attack Vectors:**

- Forge role assignments
- Role check bypasses
- Self-role-granting
- Role inheritance exploitation
- SuperAdmin compromise

**Likelihood:** Low  
**Impact:** Critical - Complete contract control

**Mitigation:**

- Role assignments require SuperAdmin
- Role checks cannot be bypassed
- Cannot self-grant admin roles
- Role revocation adds safeguards
- SuperAdmin is protected role

**Verification:**

```rust
// Role grants require SuperAdmin
pub fn grant_role(env: Env, admin: Address, user: Address, role: Role) {
    require_role(&env, &admin, Role::SuperAdmin)?;
    storage::grant_role(&env, &user, &role);
}

// Cannot self-grant
assert!(caller != user_to_grant || has_current_role);
```

---

## Specific Threat Scenarios

### Scenario 1: Fund Theft via Escrow [CRITICAL]

**Threat:** Attacker releases escrow without authorization or prematurely

**Attack Path:**

1. Attacker creates escrow
2. Attacker calls release_escrow before time
3. Funds are stolen

**Prevention:**

- Release time enforced by timestamp check
- require_auth() validates caller
- Only authorized parties can release
- Refund protection for inadvertent release

**Code Review Focus:**

```rust
pub fn release_escrow(env: Env, escrow_id: u32, caller: Address) {
    caller.require_auth();

    let escrow = get_escrow(&env, escrow_id)?;
    assert!(escrow.release_time <= now());  // ← CRITICAL CHECK
    assert!(caller == escrow.recipient || caller_is_admin);  // ← AUTHORIZATION

    // Transfer funds
    transfer_funds(&env, escrow.recipient, escrow.amount)?;
    mark_released(&env, escrow_id);
}
```

---

### Scenario 2: Reputation Manipulation [HIGH]

**Threat:** User gains undeserved reputation through exploitation

**Attack Path:**

1. User completes quest multiple times
2. Each completion grants same reputation
3. User achieves high reputation artificially

**Prevention:**

- Reputation awards require actual quest completion
- Completion validation before reputation change
- History tracking prevents duplicates
- Moderator review of suspicious patterns

**Verification:**

```rust
pub fn award_quest_completion(env: Env, user: Address, quest_id: u32) {
    // Verify quest was actually completed
    let submission = get_submission(&env, user, quest_id)?;
    assert!(submission.status == SubmissionStatus::Approved);
    assert!(submission.reward_transferred);

    // Award reputation
    increase_reputation(&env, &user, QUEST_REWARD_REP);
}
```

---

### Scenario 3: Submission Approval Bypass [HIGH]

**Threat:** Attacker gets reward without submitting legitimate work

**Attack Path:**

1. Attacker calls approve_submission directly
2. No actual submission exists
3. Reward is transferred

**Prevention:**

- Submission must exist before approval
- Evidence must be present
- Approver must be authorized
- Approval requires valid state transition

**Verification:**

```rust
pub fn approve_submission(env: Env, submission_id: u32, reviewer: Address) {
    require_role(&env, &reviewer, Role::BadgeAdmin)?;

    let submission = get_submission(&env, submission_id)?;
    assert!(submission.status == SubmissionStatus::Submitted);  // ← STATE CHECK
    assert!(submission.evidence.len() > 0);  // ← EVIDENCE CHECK

    transfer_reward(&env, submission.user, submission.reward)?;
    update_submission_status(&env, submission_id, SubmissionStatus::Approved);
}
```

---

### Scenario 4: Oracle Data Manipulation [HIGH]

**Threat:** Attacker manipulates oracle data for financial gain

**Attack Path:**

1. Attacker provides false price data
2. Contract uses data in calculations
3. Wrong rewards distributed

**Prevention:**

- Multiple oracle sources required
- Data freshness validation
- Bounds checking on prices
- Outlier detection
- Fallback mechanisms

**Verification:**

```rust
pub fn get_aggregated_price(env: Env, asset: String) -> Result<i128, Error> {
    let sources = get_price_sources(&env, &asset)?;
    assert!(sources.len() >= MIN_PRICE_SOURCES);  // ← REQUIRE MULTIPLE SOURCES

    let mut prices = Vec::new();
    for source in sources {
        let (price, timestamp) = fetch_price(&env, source)?;
        assert!(now() - timestamp <= MAX_PRICE_AGE);  // ← FRESHNESS CHECK
        assert!(price > 0 && price < MAX_SAFE_PRICE);  // ← BOUNDS CHECK
        prices.push(price);
    }

    let median = calculate_median(prices);
    verify_variance(prices, median)?;  // ← OUTLIER DETECTION
    Ok(median)
}
```

---

### Scenario 5: Storage Inconsistency [CRITICAL]

**Threat:** Contract state becomes corrupted or inconsistent

**Attack Path:**

1. Batch operation fails partially
2. Some state updates complete, others fail
3. Invariants violated

**Prevention:**

- Atomic operations
- State validation before commits
- Rollback capabilities
- Consistency checks

**Verification:**

```rust
// Atomic batch operations
pub fn batch_approve_submissions(env: Env, submission_ids: Vec<u32>) {
    // Validate all before any updates
    let mut submissions = Vec::new();
    for id in &submission_ids {
        let sub = get_submission(&env, id)?;
        assert!(sub.status == SubmissionStatus::Submitted);
        submissions.push(sub);
    }

    // Update all atomically
    for submission in submissions {
        update_submission_status(&env, submission.id, SubmissionStatus::Approved);
        transfer_reward(&env, submission.user, submission.reward)?;
    }
}
```

---

## Vulnerability Categories

### Access Control Vulnerabilities

| Vulnerability                | Risk     | Likelihood | Mitigation                 |
| ---------------------------- | -------- | ---------- | -------------------------- |
| Missing authorization checks | Critical | Medium     | Audit all public functions |
| Role bypass                  | Critical | Low        | Central role verification  |
| Insufficient role separation | High     | Low        | Role hierarchy enforcement |
| Cross-role permission creep  | Medium   | Medium     | Minimal role permissions   |

### Math & Precision Vulnerabilities

| Vulnerability     | Risk     | Likelihood | Mitigation                |
| ----------------- | -------- | ---------- | ------------------------- |
| Integer overflow  | Critical | Low        | Safe math operations      |
| Rounding errors   | High     | Medium     | Consistent rounding rules |
| Loss of precision | High     | Medium     | Exact decimal handling    |
| Division by zero  | High     | Low        | Input validation          |

### State Management Vulnerabilities

| Vulnerability       | Risk     | Likelihood | Mitigation            |
| ------------------- | -------- | ---------- | --------------------- |
| Inconsistent state  | Critical | Medium     | Atomic operations     |
| Stale data          | High     | Medium     | Cache invalidation    |
| Race conditions     | Critical | Low        | Soroban guarantees    |
| Uninitialized state | Critical | Medium     | Initialization checks |

### Oracle Vulnerabilities

| Vulnerability      | Risk     | Likelihood | Mitigation           |
| ------------------ | -------- | ---------- | -------------------- |
| Stale price data   | High     | High       | Timestamp validation |
| Price manipulation | Critical | Medium     | Multiple sources     |
| Fallback failure   | High     | Medium     | Fallback mechanisms  |
| Extreme values     | High     | Medium     | Bounds checking      |

### Cross-Contract Vulnerabilities

| Vulnerability           | Risk     | Likelihood | Mitigation             |
| ----------------------- | -------- | ---------- | ---------------------- |
| Reentrancy              | Critical | Low        | Soroban guards         |
| Return value errors     | High     | Medium     | Return verification    |
| External revert         | Medium   | Medium     | Error handling         |
| Malicious external code | Critical | Low        | Minimal external calls |

---

## Risk Assessment Matrix

```
           Low         Medium          High
Critical   C1          C2, C3         C4, C5, C6
High       H1          H2, H3         H4, H5
Medium     M1          M2             M3
Low        L1          L2             L3
```

**Critical Controls:**

- C1: Fund conservation (escrow mechanism)
- C2: Role-based access control
- C3: State consistency
- C4: Authorization enforcement
- C5: Submission validation
- C6: Oracle data validation

---

## Security Testing Requirements

### 1. Fuzz Testing

```
Test: Random input fuzzing
Target: All external functions
Goal: Find crashes or invalid states
Coverage: 10,000+ iterations per function
```

### 2. Property Testing

```
Test: Invariant-based property testing
Properties: Fund conservation, reputation correctness, state validity
Duration: 1000+ random scenarios
```

### 3. Adversarial Testing

```
Test: Simulated attack scenarios
Scenarios: All described threat scenarios
Coverage: 100% of identified threats
```

---

## Monitoring & Incident Response

### Post-Deployment Monitoring

1. **Event Log Monitoring**
   - Unexpected admin operations
   - Large value transfers
   - Permission changes

2. **State Consistency Checks**
   - Escrow amount validation
   - Fund conservation checks
   - Reputation consistency

3. **Performance Monitoring**
   - Gas usage anomalies
   - Function call latencies
   - Error rate increases

---

## Revision History

| Date       | Version | Changes              |
| ---------- | ------- | -------------------- |
| 2026-05-30 | 1.0     | Initial threat model |

---

**Document Classification:** Public - Audit Preparation
