# Emergency Pause Mechanism - Operational Guide

## Overview

The Emergency Pause Mechanism provides a circuit breaker for the Earn Quest smart contract, enabling rapid response to security vulnerabilities and protecting user funds during incidents. The system implements defense-in-depth with multi-signature requirements, timelocks, and grace periods.

## Architecture

### Components

1. **Pausable Module** (`src/pausable.rs`)
   - Core pause state management
   - Timelock enforcement
   - Multi-signature aggregation
   - Grace period tracking

2. **Storage Layer** (`src/storage.rs`)
   - Persistent pause state
   - Event emission infrastructure
   - Signer tracking

3. **Error Handling** (`src/errors.rs`)
   - `ContractPaused`: Contract is in paused state
   - `InvalidPauseState`: Pause state transition invalid
   - `AlreadySigned`: Signer has already signed
   - `EmergencyWindowClosed`: Grace period expired
   - `WithdrawalBlocked`: Cannot withdraw (non-emergency)

### State Machine

```
NOT_PAUSED
    ↓
PENDING (waiting for signatures + timelock)
    ↓
PAUSED (grace period active - emergency withdrawals allowed)
    ↓
GRACE_PERIOD_EXPIRED (withdrawals no longer allowed)
    ↓
UNPAUSED (admin resumes operations)
```

## Configuration Parameters

### Required Signatures
- **Default**: 2 signatures
- **Configurable**: Yes (admin-only)
- **Purpose**: Prevents single point of failure in pause mechanism
- **Recommendation**: Set to N-of-M multisig where M = trusted signers

### Timelock Delay
- **Default**: 3600 seconds (1 hour)
- **Configurable**: Yes (admin-only)
- **Purpose**: Prevents immediate pause, allows verification window
- **Recommendation**: 1-3 hours for security incidents

### Grace Period
- **Default**: 7200 seconds (2 hours)
- **Configurable**: Yes (admin-only)
- **Purpose**: Allows users emergency withdrawals after pause
- **Recommendation**: 2-24 hours depending on incident severity

## Operational Procedures

### Normal Operations

#### Initialize Pause Configuration (Setup)

```
Function: initialize_pause(admin, timelock_delay, required_signatures, grace_period)

Steps:
1. Admin calls initialize_pause with parameters:
   - timelock_delay: 3600 (seconds)
   - required_signatures: 2
   - grace_period: 7200 (seconds)
2. Configuration stored in persistent storage
3. System ready for emergency response

Requirements:
- Admin authentication required
- Contract must be initialized first
- Can be called only once per contract lifetime
- Or use update_pause_config after initialization
```

### Emergency Response Workflow

#### Step 1: Identify Vulnerability (Incident Detection)

**Trigger Points:**
- Security audit findings
- Anomalous contract behavior detected
- Exploit attempt observed
- Network-level attack signals

**Actions:**
- Alert on-call security team
- Initiate incident response protocol
- Begin pause request process

---

#### Step 2: Request Pause (Multi-Sig Activation)

**Function**: `request_pause(requester, reason)`

```
Call Sequence:
1. First authorized signer requests pause
   - requester: Signer address (must authenticate)
   - reason: Symbol describing vulnerability (e.g., "integer_overflow")
   
   → System records signer, activates timelock
   
2. Second authorized signer requests pause
   - Same parameters, different signer address
   
   → System receives 2nd signature, pause activated
   → Events emitted: PauseStateChanged
   → Timelock timer begins countdown

TimelineExample:
├─ 00:00 - First signature: request_pause() called
├─ 00:01 - Second signature: request_pause() called
├─ 00:02 - Pause state: PENDING (during timelock)
├─ 01:00 - Timelock expires, pause becomes active
│         Contract operations blocked
└─ 03:00 - Grace period expires, emergency withdrawals locked

Blocked Operations (during pause):
- register_quest() ❌ ContractPaused
- submit_proof() ❌ ContractPaused
- approve_submission() ❌ ContractPaused
- register_quest() ❌ ContractPaused
```

**Monitoring During Pause:**

```soroban
// Check pause status
is_paused() → true/false

// Check remaining signatures needed
get_remaining_pause_signatures() → u32 (e.g., 0 if fully signed)

// Check who has signed
get_pause_signers() → Vec<Address>

// Check timelock countdown
get_pause_timelock_remaining() → u64 (seconds)

// Check grace period countdown
get_grace_period_remaining() → u64 (seconds)
```

---

#### Step 3: User Emergency Withdrawal (Protected Withdrawal)

**Function**: `emergency_withdraw(quest_id, creator)`

```
Timing: Available from pause activation until grace period expires

Steps:
1. Creator calls emergency_withdraw
   - quest_id: ID of quest with escrowed funds
   - creator: Creator's address (must authenticate)

2. System checks:
   √ Contract is paused
   √ Grace period still active (current_time < pause_time + grace_period)
   ✓ Withdrawal allowed

3. Funds returned to creator from escrow

4. Event emitted: EmergencyWithdrawalEvent
   - user: Creator address
   - amount: Returned amount
   - quest_id: Quest identifier
   - timestamp: Withdrawal time

Withdrawal Eligibility Matrix:
┌─────────────────────────────────────────────────┐
│ Contract State    │ Withdrawal Allowed? │ Type   │
├─────────────────────────────────────────────────┤
│ Normal            │ YES                 │ Normal │
│ Paused (in grace)  │ YES                 │ Emerg. │
│ Paused (expired)   │ NO                  │ ─      │
│ Unpaused          │ YES                 │ Normal │
└─────────────────────────────────────────────────┘
```

**Grace Period Countdown:**

```
Pause Timestamp: T
Grace Period: 7200 seconds

Timeline:
T + 0:00    - Pause active, grace period begins
T + 0:30    - get_grace_period_remaining() → 7170 seconds
T + 1:00    - get_grace_period_remaining() → 7140 seconds
T + 3600:00 - get_grace_period_remaining() → 3600 seconds
T + 7180:00 - get_grace_period_remaining() → 20 seconds
T + 7200:00 - get_grace_period_remaining() → 0 seconds
             - emergency_withdraw() fails: EmergencyWindowClosed
```

---

#### Step 4: Vulnerability Remediation (Investigation & Fix)

**Parallel to emergency actions:**

1. **Security Analysis** (0-2 hours)
   - Analyze vulnerability details
   - Assess impact scope
   - Determine fix requirements

2. **Fix Development** (2-6 hours)
   - Implement security patch
   - Code review for regression
   - Prepare new WASM binary

3. **Testing** (1-4 hours)
   - Local environment testing
   - Testnet deployment
   - Scenario verification

4. **Deployment Preparation**
   - Generate new WASM hash
   - Prepare upgrade transaction
   - Brief on-call team

---

#### Step 5: Unpause Contract (Resume Operations)

**Function**: `unpause_contract(admin)`

```
Prerequisites:
✓ Vulnerability fixed and verified
✓ WASM updated (optional but recommended)
✓ System readiness confirmed

Steps:
1. Admin calls unpause_contract
   - admin: Admin address (must authenticate)

2. System actions:
   - Reset pause state
   - Clear signer list
   - Clear pause reason
   - Block timestamp cleared

3. Normal operations resume immediately:
   - New quests can be created
   - Submissions can be processed
   - Approvals can be executed

4. Event emitted: ContractResumed
   - timestamp: Unpause time
   - pause_duration: Total pause duration
   - users_affected: Count of emergency withdrawals

Post-Unpause Verification:
├─ is_paused() returns false ✓
├─ register_quest() succeeds ✓
├─ submit_proof() succeeds ✓
├─ approve_submission() succeeds ✓
└─ get_grace_period_remaining() returns 0 ✓
```

---

### Recovery Workflow (Post-Incident)

#### Phase 1: Operational (Immediately)

```
1. Monitor for new vulnerabilities
2. Watch for user complaints
3. Process emergency withdrawal requests
4. Prepare communication to stakeholders
```

#### Phase 2: Analysis (Within 24 hours)

```
1. Root cause analysis
   - What was the vulnerability?
   - How was it introduced?
   - Who was affected?

2. Impact assessment
   - Number of users affected
   - Amount of funds at risk
   - Duration of exposure

3. Timeline reconstruction
   - Detection to pause: X seconds
   - Pause to recovery: Y seconds
   - Total incident duration: X + Y
```

#### Phase 3: Prevention (Within 1 week)

```
1. Fix verification
   - Confirm patch prevents vulnerability
   - Verify no regressions introduced

2. Process improvement
   - Update security checks
   - Enhance monitoring
   - Adjust pause configuration if needed

3. Communication
   - Post-incident report to users
   - Document lessons learned
   - Update operational runbooks
```

---

## Scenario Walkthroughs

### Scenario 1: Critical Vulnerability Discovery

```
Timeline: Vulnerability discovered in submission validation

00:00 - Security audit discovers integer overflow in reward calculation
        → Amount: 50 SOL affected across 3 active quests
        → Impact: Potential double-payment exploitation
        
00:05 - Security team initiates incident protocol
        → Alert on-call signers
        → Begin pause request preparation

00:10 - First signer calls request_pause("integer_overflow")
        → Event: PauseStateChanged {
            is_paused: false,
            reason: Some("integer_overflow"),
            timestamp: 1234567890
          }
        → Timer: Timelock begins (3600 second countdown)

00:12 - Second signer calls request_pause("integer_overflow")
        → System receives 2/2 required signatures
        → Pause activated (but not yet effective due to timelock)

01:00 - Timelock expires, pause becomes effective
        → get_is_paused() → true
        → All sensitive operations blocked

01:15 - Users emergency_withdraw from affected quests
        → 3 creators each withdraw their escrow
        → Event: EmergencyWithdrawal {
            user: 0x1234...,
            amount: 50000000000,  // stroops
            quest_id: quest_1,
            timestamp: 1234568890
          }

02:00 - Development team deploys fix to testnet
        → Verified integer overflow prevention
        → Confirmed no regressions

02:30 - Admin calls unpause_contract()
        → System resumes normal operations
        → Pause state cleared
        → Signers list cleared

03:00 - New quests created with fixed logic
        → Monitoring confirms correct behavior

48:00 - Post-incident report completed
        → Root cause: Missing bounds check
        → Fix: Added SafeMath for all arithmetic
        → Improvement: Added automated overflow detection
```

### Scenario 2: False Alarm

```
Timeline: Pause requested but vulnerability unconfirmed

14:30 - Security alert triggered by anomalous transaction
        → Pattern matches known attack signature

14:35 - First signer requests pause("possible_exploit_attempt")
        → Timelock begins

14:37 - Investigation reveals normal user behavior
        → Large transactions from whale account
        → No actual vulnerability found

14:38 - Admin decides to cancel pending pause
        → Calls cancel_pause_request()
        → Signers list cleared
        → No pause activated

14:39 - System ready for second pause request if needed
        → No operational impact
        → Users unaware of alert

Case Benefit: Timelock prevented false alarm impact
```

### Scenario 3: Extended Incident

```
Timeline: Complex vulnerability requiring extended downtime

Day 1:
00:00 - Denial of service attack detected
        → Request pause with "dos_attack"
        → Timelock: 1 hour
        → Pause activates

Day 1:
02:00 - Users emergency withdraw over 6 hours
        → 156 withdrawals totaling 500,000 SOL
        → All completed within grace period

Day 2:
10:00 - Development identifies root cause
        → Unbounded loop in quest creation
        → Patch implemented

Day 3:
14:00 - Testnet verification complete
        → Upgrade approved

Day 3:
15:00 - Admin unpauses contract
        → 39-hour downtime completed
        → System recovered

Key Metrics:
├─ Detection to pause: 5 minutes
├─ Total downtime: 39 hours
├─ Funds protected: 500,000 SOL
├─ Users affected: 156
└─ Emergency withdrawals: 100% success rate
```

---

## Management Commands

### Check Status

```soroban
// Current pause state
get_pause_state() 
→ {
    is_paused: true,
    pause_timestamp: 1234567890,
    timelock_delay: 3600,
    pause_signers: [0xabc..., 0xdef...],
    required_signatures: 2,
    last_pause_time: 1234567890,
    grace_period: 7200,
    pause_reason: Some("security_incident")
  }

// Is paused now?
is_paused() → true

// How many more signatures?
get_remaining_pause_signatures() → 0

// How long until timelock expires?
get_pause_timelock_remaining() → 1800  // 30 minutes

// How long until grace period expires?
get_grace_period_remaining() → 4200  // 70 minutes

// Who has signed?
get_pause_signers() → [0xabc..., 0xdef...]
```

### Configuration Management

```soroban
// Update pause parameters
update_pause_config(
    admin,
    Some(7200),  // New timelock: 2 hours
    Some(3),     // New requirement: 3 signatures
    Some(14400)  // New grace period: 4 hours
)

// Effects:
// - Future pause requests use new parameters
// - Active pause respects original parameters
// - Signers reset if pause not yet activated
```

### Emergency Actions

```soroban
// Request pause (any authorized signer)
request_pause(requester, Some("vulnerability_description"))

// Cancel pending pause (admin only)
cancel_pause_request(admin)

// Resume operations (admin only)
unpause_contract(admin)

// Emergency fund withdrawal (users only, during grace period)
emergency_withdraw(quest_id, creator)
```

---

## Event Audit Trail

All pause-related operations emit events for off-chain monitoring:

### PauseStateChanged Event
```
Topic: ("pause", "state_changed")
Data: {
    is_paused: true,
    reason: Some("security_incident"),
    timestamp: 1234567890
}
```

### ContractResumed Event
```
Topic: ("pause", "contract_resumed")
Data: {
    timestamp: 1234571490
}
```

### EmergencyWithdrawal Event
```
Topic: ("emergency", "withdrawal")
Data: {
    user: 0xabc...,
    amount: 50000000000,
    quest_id: quest_1,
    timestamp: 1234568890
}
```

---

## Security Considerations

### Attack Prevention

| Attack | Prevention | Implemented |
|--------|-----------|---------|
| Unauthorized pause | Multi-sig + auth required | ✓ |
| Sudden pause | Timelock delay | ✓ |
| Stuck pause | Admin override available | ✓ |
| Lost funds | Grace period for withdrawal | ✓ |
| Abuse of pause | Event audit trail | ✓ |

### Trust Assumptions

1. **Admin Authority**
   - Trusted to perform critical operations
   - Can unpause without multi-sig
   - Should be multi-sig in production

2. **Signer Availability**
   - Required signers must be operational
   - Recommend N-of-M multisig setup
   - Backup signers recommended

3. **Timeliness**
   - Assume continuous monitoring
   - Alert systems operational
   - Response team available 24/7

### Configuration Recommendations

**Conservative Setup (Maximum Protection):**
```
Timelock Delay: 3600 seconds (1 hour)
Required Signatures: 3 of 5
Grace Period: 14400 seconds (4 hours)
```

**Responsive Setup (Speed Priority):**
```
Timelock Delay: 600 seconds (10 minutes)
Required Signatures: 2 of 3
Grace Period: 7200 seconds (2 hours)
```

**Balanced Setup (Recommended):**
```
Timelock Delay: 1800 seconds (30 minutes)
Required Signatures: 2 of 3
Grace Period: 7200 seconds (2 hours)
```

---

## Monitoring & Alerts

### Critical Alerts

```
1. Pause request received
   → Log signer address and reason
   → Notify security team

2. Timelock expiring soon (within 5 minutes)
   → Confirm no false alarm
   → Prepare recovery team

3. Grace period expiring soon (within 1 hour)
   → Encourage final emergency withdrawals
   → Prepare unpause transaction

4. Pause state inconsistency
   → Check ledger state
   → Alert engineering team
```

### Metrics to Track

- Time to detect vulnerability (TDD)
- Time to pause activation (TTR)
- Number of emergency withdrawals
- Total withdrawn during grace period
- Time to unpause
- Total incident duration

---

## Rollback Procedures

### If Unable to Unpause

```
Scenario: Unpause transaction fails

Resolution Steps:
1. Check admin authentication
   → Verify admin key is valid
   → Confirm authentication works

2. Check pause state
   → get_pause_state() to verify can unpause
   → Check for InvalidPauseState error

3. Manual override:
   → Admin requests unpause again with fresh auth
   → Verify ledger state synchronized

4. If still stuck:
   → Deploy new contract version with reset capability
   → Execute data migration
```

### If Pause Prevents Critical Recovery

```
Scenario: Critical data migration blocked by pause

Resolution:
1. Unpause contract first
2. Resume pending data migrations
3. Complete recovery operations
4. Re-pause if still responding to vulnerability
```

---

## Testing the Pause Mechanism

### Simulation Test Suite

Each scenario from this document should be tested:

```
✓ test_pause_initialization
✓ test_pause_timelock_mechanism
✓ test_pause_multi_signature_requirement
✓ test_pause_blocks_operations
✓ test_emergency_withdrawal_during_grace_period
✓ test_unpause_resumes_operations
✓ test_cancel_pending_pause
✓ test_duplicate_signer_prevention
✓ test_pause_with_reason
✓ test_grace_period_countdown
✓ test_pause_configuration_update
✓ test_pause_authorization_check
✓ test_pause_event_emission
✓ test_emergency_withdrawal_event
✓ test_pause_with_active_quests
✓ test_pause_signers_tracking
✓ test_pause_state_not_initialized
✓ test_invalid_pause_state_transitions
✓ test_emergency_window_closed
✓ test_complete_emergency_scenario
```

---

## Emergency Contact & Escalation

### Support Tiers

**Tier 1: Initial Detection (15 min response)**
- On-call security engineer
- Initiates incident response
- Alerts Tier 2

**Tier 2: Pause Decision (5 min response)**
- Security lead + engineering lead
- Authorizes pause request
- Activates multisig signers

**Tier 3: Recovery & Mitigation (immediate)**
- Development team
- Security audit team
- Infrastructure team

### Communication Channels

- Primary: Encrypted chat (Slack/Discord)
- Backup: Phone conference bridge
- Updates: Status page + Twitter notification

---

## Appendix: Function Reference

### pause::initialize_pause_state
Initialize pause mechanism with configuration

### pause::request_pause
Request pause activation (multi-sig component)

### pause::cancel_pause_request
Cancel pending pause request (admin)

### pause::unpause_contract
Immediately resume normal operations (admin)

### pause::is_contract_paused
Check if contract is currently paused

### pause::require_not_paused
Macro/function for pause enforcement in sensitive functions

### pause::is_withdrawal_allowed
Check if emergency withdrawal grace period active

### pause::emergency_withdraw
Perform emergency escrowed fund withdrawal

### pause::get_pause_state
Retrieve full pause state information

### pause::get_remaining_signatures
Get count of additional signatures needed

### pause::get_pause_signers
List addresses that have signed for pause

### pause::get_timelock_remaining
Get seconds until pause becomes effective

### pause::get_grace_period_remaining
Get seconds of emergency withdrawal window remaining

### pause::update_pause_config
Modify pause configuration parameters (admin)

---

## Version History

- **v1.0** (Launch): Initial pause mechanism with multi-sig, timelock, grace period
- Future: Rate-limit pause requests, emergency committee replacement, pause recovery escrow

---

**Document Version**: 1.0  
**Last Updated**: 2026-03-24  
**Status**: Active  
**Audience**: Developers, Security Team, Operations
