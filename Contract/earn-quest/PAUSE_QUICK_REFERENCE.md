# Emergency Pause Mechanism - Quick Reference Guide

## Overview

The Emergency Pause Mechanism provides circuit-breaker functionality for the Earn Quest contract with:
- ✓ Multi-signature requirement
- ✓ Timelock before activation  
- ✓ Grace period for emergency withdrawals
- ✓ Complete event audit trail
- ✓ Admin override capability

---

## Quick Start

### Initialize Pause System (One-Time Setup)

```rust
// Admin initializes pause with 1-hour timelock, 2 required signatures, 2-hour grace
initialize_pause(
    admin,
    3600,    // timelock_delay (seconds)
    2,       // required_signatures
    7200     // grace_period (seconds)
)?
```

### Check Pause Status

```rust
// Is contract paused?
let paused = is_paused()?;

// Get detailed pause state
let state = get_pause_state()?;
println!("Paused: {}", state.is_paused);
println!("Reason: {:?}", state.pause_reason);
println!("Grace period remaining: {}", get_grace_period_remaining()?);
```

### Request Pause (Multi-Sig Activation)

```rust
// Signer 1 requests pause
request_pause(signer1, Some(Symbol::new(env, "security_vulnerability")))?;

// Signer 2 requests pause  
request_pause(signer2, Some(Symbol::new(env, "security_vulnerability")))?;

// After timelock expires → pause becomes active
// Now sensitive operations are blocked
```

### Emergency Withdrawal (During Grace Period)

```rust
// User withdraws escrowed funds during pause grace period
let amount = emergency_withdraw(quest_id, creator_address)?;
println!("Withdrew: {} stroops", amount);

// After grace period expires → withdrawals fail with EmergencyWindowClosed
```

### Resume Operations (Admin Only)

```rust
// Admin immediately unpauses contract
unpause_contract(admin)?;

// Normal operations resume immediately
register_quest(...)?;  // Now works again
```

---

## Function Reference

### Configuration

| Function | Parameters | Returns | Auth |
|----------|----------|---------|------|
| `initialize_pause` | `admin, timelock_delay, required_signatures, grace_period` | `Result<(), Error>` | Admin |
| `update_pause_config` | `admin, delay?, sigs?, grace?` | `Result<(), Error>` | Admin |

### Pause Control

| Function | Parameters | Returns | Auth |
|----------|----------|---------|------|
| `request_pause` | `requester, reason?` | `Result<(), Error>` | Signer |
| `cancel_pause_request` | `admin` | `Result<(), Error>` | Admin |
| `unpause_contract` | `admin` | `Result<(), Error>` | Admin |

### Status Queries

| Function | Returns | Notes |
|----------|---------|-------|
| `is_paused` | `Result<bool, Error>` | Respects timelock |
| `get_pause_state` | `Result<PauseState, Error>` | Full state snapshot |
| `get_remaining_pause_signatures` | `Result<u32, Error>` | Signatures still needed |
| `get_pause_signers` | `Result<Vec<Address>, Error>` | Current signers |
| `get_pause_timelock_remaining` | `Result<u64, Error>` | Seconds until active |
| `get_grace_period_remaining` | `Result<u64, Error>` | Seconds until withdrawals locked |

### Emergency Operations

| Function | Parameters | Returns | Notes |
|----------|----------|---------|-------|
| `emergency_withdraw` | `quest_id, creator` | `Result<i128, Error>` | Grace period only |

---

## Error Codes

| Code | Name | When |
|------|------|------|
| 32 | `ContractPaused` | Sensitive operation attempted while paused |
| 33 | `InvalidPauseState` | Invalid state transition (e.g., unpause when not paused) |
| 34 | `AlreadySigned` | Same signer requested pause twice |
| 35 | `EmergencyWindowClosed` | Grace period expired for withdrawal |
| 36 | `WithdrawalBlocked` | Withdrawal not allowed in current state |
| 37 | `InsufficientSignatures` | Not enough signatures for pause activation |

---

## Events

### Pause Activated
```
Topic: ("pause", "state_changed")
Data: { is_paused: true, reason: Some(...), timestamp: ... }
```

### Contract Resumed
```
Topic: ("pause", "contract_resumed")  
Data: { timestamp: ... }
```

### Emergency Withdrawal
```
Topic: ("emergency", "withdrawal")
Data: { user: ..., amount: ..., quest_id: ..., timestamp: ... }
```

---

## Common Workflows

### Incident Response

```
Step 1: Detect vulnerability
  └─ Alert security team

Step 2: Request pause (multi-sig)
  ├─ Signer 1: request_pause(signer1, reason)
  ├─ Signer 2: request_pause(signer2, reason)
  └─ System waits for timelock expiration

Step 3: Grace period active
  └─ Users can emergency_withdraw if needed

Step 4: Fix vulnerability
  └─ Deploy patched contract

Step 5: Resume operations
  └─ Admin: unpause_contract(admin)
```

### False Alarm Handling

```
Step 1: Unauthorized signer requests pause
  └─ cancel_pause_request(admin)  // Clears signers

Step 2: System ready for new pause request
  └─ Verify no actual vulnerability exists
```

### Configuration Update

```
// Change timelock from 1 hour to 2 hours
update_pause_config(
    admin,
    Some(7200),    // New timelock
    None,          // Keep signatures unchanged
    None           // Keep grace period unchanged
)?
```

---

## Integration Examples

### Blocking Sensitive Functions

```rust
// In register_quest
pub fn register_quest(env: Env, ...) -> Result<(), Error> {
    pausable::require_not_paused(&env)?;  // ← Add this check
    
    // ... rest of function
    quest::create_quest(&env, ...)
}

// In submit_proof
pub fn submit_proof(env: Env, ...) -> Result<(), Error> {
    pausable::require_not_paused(&env)?;  // ← Add this check
    
    // ... rest of function
    submission::submit_proof(&env, ...)
}

// In approve_submission
pub fn approve_submission(env: Env, ...) -> Result<(), Error> {
    pausable::require_not_paused(&env)?;  // ← Add this check
    
    // ... rest of function
}
```

### Monitoring Integration

```rust
// In your monitoring system
pub fn check_pause_status(env: &Env) {
    match get_pause_state(env) {
        Ok(state) => {
            if state.is_paused {
                println!("⚠️  Contract is paused!");
                println!("Reason: {:?}", state.pause_reason);
                println!("Grace period remaining: {} seconds", 
                         get_grace_period_remaining(env)?);
            }
        }
        Err(_) => println!("Pause system not initialized")
    }
}
```

---

## Testing

### Test Helper Setup

```rust
#[test]
fn test_pause_workflow() {
    let env = Env::default();
    let admin = Address::random(&env);
    let signer1 = Address::random(&env);
    let signer2 = Address::random(&env);
    
    // Initialize pause
    EarnQuestContract::initialize_pause(&env, admin, 300, 2, 3600)?;
    
    // Verify not paused initially
    assert!(!EarnQuestContract::is_paused(&env)?);
    
    // Request pause
    EarnQuestContract::request_pause(&env, signer1, None)?;
    EarnQuestContract::request_pause(&env, signer2, None)?;
    
    // Verify pause pending (waiting for timelock)
    assert_eq!(EarnQuestContract::get_remaining_pause_signatures(&env)?, 0);
    
    // Advance time past timelock...
    // Verify pause active
    assert!(EarnQuestContract::is_paused(&env)?);
    
    // Unpause
    EarnQuestContract::unpause_contract(&env, admin)?;
    assert!(!EarnQuestContract::is_paused(&env)?);
}
```

---

## Best Practices

### Configuration

**Conservative** (Maximum Safety):
```rust
initialize_pause(admin, 3600, 3, 14400)  // 1hr, 3-of-5, 4hr grace
```

**Balanced** (Recommended):
```rust
initialize_pause(admin, 1800, 2, 7200)   // 30min, 2-of-3, 2hr grace
```

**Responsive** (Speed Priority):
```rust
initialize_pause(admin, 600, 2, 3600)    // 10min, 2-of-3, 1hr grace
```

### Monitoring

```
Critical Alerts:
  ✓ Pause request received (log signer, reason)
  ✓ Pause activated (prepare recovery)
  ✓ Grace period ending soon (5min warning)

Warning Alerts:
  ⚠ Pause >1 hour (escalate if no resolution)
  ⚠ Multiple pause requests (possible attack)

Metrics:
  📊 Time from detection to pause (goal: <5 min)
  📊 Emergency withdrawals count
  📊 Total pause duration
```

### Security

- **Keep admin keys secure** (use multisig)
- **Verify signers operational** (backup signers recommended)
- **Test pause mechanism** (quarterly in testnet)
- **Document incident response** (keep runbooks current)
- **Monitor event logs** (audit all pause events)

---

## Troubleshooting

### Problem: Pause Won't Activate

**Causes**:
- Not enough signatures received
- Timelock hasn't expired yet
- Invalid pause state

**Solution**:
```rust
// Check remaining signatures
get_remaining_pause_signatures()?  // Should return 0

// Check timelock countdown
get_pause_timelock_remaining()?    // Should return 0

// Check current signers
get_pause_signers()?               // Should have required count
```

### Problem: Can't Unpause

**Causes**:
- Using non-admin address
- Invalid authentication
- State corruption

**Solution**:
```rust
// Verify auth from correct admin
admin.require_auth();

// Check current pause state
get_pause_state()?

// Verify no state inconsistency
// If stuck, escalate to engineering team
```

### Problem: Emergency Withdrawal Fails

**Causes**:
- Grace period expired
- Contract not paused
- Invalid quest_id

**Solution**:
```rust
// Check grace period remaining
get_grace_period_remaining()?      // Must be > 0

// Verify contract is paused
is_paused()?                       // Must return true

// Verify quest exists and has escrow
get_escrow_balance(quest_id)?      // Must be > 0
```

---

## Deployment Timeline

| Stage | Action | Duration |
|-------|--------|----------|
| 1. Review | Code & security review | 2-3 days |
| 2. Test | Integration & scenario testing | 1 day |
| 3. Train | Team operational training | 4 hours |
| 4. Deploy | Testnet deployment | 2 hours |
| 5. Verify | Integration verification | 2 hours |
| 6. Monitor | Enhanced monitoring setup | 1 hour |
| 7. Prod | Production deployment | 1 hour |

---

## Further Reading

- **EMERGENCY_PROCEDURES.md**: Complete operational guide
- **PAUSE_IMPLEMENTATION_SUMMARY.md**: Technical implementation details
- **pausable.rs**: Comprehensive code documentation
- **tests/test_pause.rs**: Test scenario specifications

---

**Quick Reference Version**: 1.0  
**Last Updated**: 2026-03-24  
**For Questions**: See EMERGENCY_PROCEDURES.md or code comments
