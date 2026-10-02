# EarnQuest Contract - Third-Party Audit Specification

**Version:** 1.0  
**Date:** May 30, 2026  
**Contract Name:** EarnQuest  
**Language:** Rust (Soroban)  
**Chain:** Stellar Network

## Executive Summary

This document serves as the comprehensive specification for third-party security audits of the EarnQuest contract. The EarnQuest contract is a sophisticated quest and reward management system built on the Soroban platform for the Stellar Network. It implements complex state management, role-based access control, escrow mechanisms, reputation tracking, and cross-contract interactions.

## Contract Overview

### Purpose

The EarnQuest contract provides a decentralized quest creation and completion framework with:

- Quest management (creation, modification, completion)
- User submission tracking and approval
- Reputation and badge systems
- Escrow-based payout mechanisms
- Oracle integration for real-world data feeds
- Dispute resolution capabilities
- Role-based access control

### Key Features

1. **Quest Management**
   - Create quests with metadata and requirements
   - Track quest status (active, completed, cancelled)
   - Support for quest categories and difficulty levels
   - Configurable reward mechanisms

2. **User Submissions**
   - Track user quest submissions
   - Submission approval workflow
   - Reputation impact tracking
   - Batch processing capabilities

3. **Reputation System**
   - Dynamic reputation accumulation
   - Badge system with multiple types
   - Reputation decay mechanisms
   - User tier classifications

4. **Escrow & Payouts**
   - Secure fund escrow mechanism
   - Time-locked releases
   - Batch payout processing
   - Partial refund support

5. **Dispute Resolution**
   - Create and manage disputes
   - Multiple resolution pathways
   - Appeal mechanisms
   - Dispute history tracking

6. **Role-Based Access Control**
   - SuperAdmin role
   - BadgeAdmin role
   - OracleAdmin role
   - StatsAdmin role
   - Pauser role

7. **Oracle Integration**
   - Price feed aggregation
   - Multi-source data validation
   - Real-time oracle updates
   - Fallback mechanisms

## Architecture Overview

### Module Structure

```
src/
├── lib.rs              # Main contract entry point
├── admin.rs            # Role management
├── types.rs            # Core data types
├── storage.rs          # Storage layer
├── errors.rs           # Error definitions
├── quest.rs            # Quest management logic
├── submission.rs       # Submission handling
├── reputation.rs       # Reputation and badge logic
├── escrow.rs           # Escrow mechanism
├── payout.rs           # Payout logic
├── dispute.rs          # Dispute resolution
├── events.rs           # Event definitions
├── oracle.rs           # Oracle integration
├── security.rs         # Security utilities
├── validation.rs       # Input validation
├── init.rs             # Contract initialization
├── token.rs            # Token interactions
└── [test modules]      # Test coverage
```

### Core Data Structures

#### Quest

```rust
pub struct Quest {
    pub id: u32,
    pub creator: Address,
    pub title: String,
    pub description: String,
    pub reward_amount: i128,
    pub status: QuestStatus,
    pub requirements: Vec<String>,
    pub created_at: u64,
    pub updated_at: u64,
    pub metadata: QuestMetadata,
}
```

#### UserCore

```rust
pub struct UserCore {
    pub address: Address,
    pub reputation: i128,
    pub badges: Vec<Badge>,
    pub quest_completed: u32,
    pub quest_failed: u32,
    pub is_active: bool,
}
```

#### Submission

```rust
pub struct Submission {
    pub id: u32,
    pub quest_id: u32,
    pub user: Address,
    pub status: SubmissionStatus,
    pub submitted_at: u64,
    pub evidence: Vec<String>,
}
```

#### EscrowInfo

```rust
pub struct EscrowInfo {
    pub id: u32,
    pub payer: Address,
    pub recipient: Address,
    pub amount: i128,
    pub release_time: u64,
    pub released: bool,
}
```

## Security Architecture

### Access Control

The contract implements a hierarchical role-based access control system:

1. **SuperAdmin**
   - Contract initialization
   - Role management
   - Pause/unpause functionality
   - Contract upgrades

2. **BadgeAdmin**
   - Badge type management
   - Badge assignments

3. **OracleAdmin**
   - Oracle configuration updates
   - Price feed management

4. **StatsAdmin**
   - Batch statistics updates
   - Performance tracking

5. **Pauser**
   - Emergency pause functionality

### Security Mechanisms

1. **Input Validation**
   - Strict type checking
   - Amount boundaries verification
   - Address validation
   - String length limits

2. **Reentrancy Protection**
   - State updates before external calls
   - Atomic operations
   - Cross-contract call safety

3. **State Integrity**
   - Consistent data structure updates
   - Idempotent operations where applicable
   - Atomic batching for related updates

4. **Authorization Checks**
   - Function-level admin checks
   - Role-based permission verification
   - Address authentication

## Audit Focus Areas

### 1. Authorization & Access Control

**Critical Questions:**

- Are all sensitive functions properly protected with role checks?
- Can unauthorized users access or modify restricted data?
- Are role checks performed before state modifications?
- Are there any permission bypass vulnerabilities?

**Review Points:**

- All public functions must verify caller permissions
- Role checks must occur before any state changes
- SuperAdmin role must be properly initialized
- Role grant/revoke operations must be secure

### 2. State Management & Storage

**Critical Questions:**

- Are storage operations atomic and consistent?
- Can storage be left in an inconsistent state?
- Are there race conditions in state updates?
- Is data properly initialized before access?

**Review Points:**

- Storage data structures are properly defined
- No uninitialized state access
- Batch operations maintain consistency
- Storage updates are idempotent

### 3. Fund Safety & Escrow

**Critical Questions:**

- Can funds be trapped or lost in escrow?
- Are release conditions properly enforced?
- Can funds be released prematurely?
- Are refunds properly handled?

**Review Points:**

- Escrow amounts match fund transfers
- Release time constraints are enforced
- Refund logic is correct
- No fund loss scenarios exist

### 4. Math & Precision

**Critical Questions:**

- Are there integer overflow/underflow issues?
- Are reputation calculations correct?
- Are reward distributions accurate?
- Are percentages calculated correctly?

**Review Points:**

- All arithmetic operations are safe
- Boundary conditions are handled
- Rounding is consistent
- Large number operations are correct

### 5. Oracle Integration

**Critical Questions:**

- What happens if oracle data is stale?
- Can oracle be exploited to manipulate data?
- Are there fallback mechanisms?
- Is price feed aggregation secure?

**Review Points:**

- Oracle data freshness is validated
- Multiple price sources are aggregated
- Fallback logic is implemented
- Data bounds are enforced

### 6. Cross-Contract Interactions

**Critical Questions:**

- Are external calls safe?
- Can external contracts exploit this contract?
- Are there reentrancy risks?
- Are return values validated?

**Review Points:**

- External call return values are checked
- State updates occur before external calls
- No recursive call vulnerabilities
- Token transfers are validated

### 7. Business Logic

**Critical Questions:**

- Do quests work as intended?
- Can reputation be exploited?
- Are disputes fairly resolved?
- Are payouts calculated correctly?

**Review Points:**

- Quest lifecycle is consistent
- Reputation accumulation is fair
- Dispute process is fair
- Payout calculations are accurate

### 8. Input Validation

**Critical Questions:**

- Are all inputs properly validated?
- Can boundary values cause issues?
- Are string lengths limited?
- Are special characters handled?

**Review Points:**

- All external inputs are validated
- Boundary checks are implemented
- String lengths are limited
- Array sizes are bounded

### 9. Error Handling

**Critical Questions:**

- Are errors properly propagated?
- Can errors be silently ignored?
- Is error context sufficient?
- Are error codes distinct?

**Review Points:**

- All error paths are handled
- Error codes are distinct
- Error messages are informative
- Recovery paths are clear

### 10. Concurrency & Race Conditions

**Critical Questions:**

- Can operations race and cause issues?
- Are atomic operations properly used?
- Can state become inconsistent?
- Are batch operations safe?

**Review Points:**

- Atomic operations are used correctly
- State updates are consistent
- No TOCTOU vulnerabilities
- Batch operations are atomic

## Contract Invariants

### Fundamental Invariants

1. **Authorization Invariant**
   - Only users with appropriate roles can perform sensitive operations
   - Role membership cannot be forged or spoofed
   - SuperAdmin role is uniquely powerful and must be protected

2. **Fund Conservation Invariant**
   - Total contract funds = sum of all user balances + escrow amounts + reserves
   - Funds cannot be created or destroyed
   - All fund movements must be traced

3. **Reputation Invariant**
   - User reputation changes only through valid quest interactions
   - Reputation cannot be negative (clamped to 0 or 1)
   - Badge assignments are consistent with reputation

4. **Quest State Invariant**
   - Each quest has a valid status (active, completed, cancelled)
   - Active quests must have associated reward pool
   - Completed quests cannot accept new submissions

5. **Submission Workflow Invariant**
   - Submissions follow defined state transitions
   - Only valid submissions can be approved
   - Approved submissions must transfer rewards

6. **Escrow Invariant**
   - Escrowed funds are always held by the contract
   - Release conditions are enforced
   - Escrowed amounts match reserved funds

7. **Oracle Data Invariant**
   - Oracle data is timestamped and versioned
   - Stale data is marked or rejected
   - Multiple sources are required for critical decisions

## Specification Details

### Function Categories

#### Initialization Functions

- `initialize()` - Contract initialization (must be called once)
- `get_version()` - Contract version retrieval

#### Admin Functions

- `grant_role()` - Grant roles to users
- `revoke_role()` - Revoke roles from users
- `pause()` - Pause contract operations
- `unpause()` - Resume contract operations
- `authorize_upgrade()` - Authorize contract upgrade

#### Quest Management

- `create_quest()` - Create new quest
- `update_quest_status()` - Update quest status
- `get_quest()` - Retrieve quest details
- `list_quests()` - List active quests

#### Submission Handling

- `submit_quest()` - Submit quest completion
- `approve_submission()` - Approve quest submission
- `reject_submission()` - Reject quest submission
- `get_submission()` - Retrieve submission details

#### Reputation & Badges

- `get_reputation()` - Get user reputation
- `award_badge()` - Award badge to user
- `get_user_badges()` - Get user badges
- `list_badge_types()` - List available badge types

#### Escrow & Payouts

- `create_escrow()` - Create escrow
- `release_escrow()` - Release escrowed funds
- `get_escrow()` - Get escrow details
- `batch_payout()` - Batch payout processing

#### Dispute Resolution

- `create_dispute()` - Create dispute
- `resolve_dispute()` - Resolve dispute
- `appeal_dispute()` - Appeal dispute decision
- `get_dispute()` - Get dispute details

#### Oracle Functions

- `update_oracle_config()` - Update oracle configuration
- `get_price()` - Get aggregated price
- `get_oracle_config()` - Get oracle configuration

## Testing Requirements

### Unit Tests

- Individual function correctness
- Error conditions
- Boundary values
- Role-based access control

### Integration Tests

- Multi-function workflows
- State consistency across operations
- Cross-contract interactions
- Batch operation atomicity

### Property Tests

- Invariant preservation
- State machine properties
- Fuzzing with random inputs

### Security Tests

- Authorization bypass attempts
- Fund manipulation attempts
- Data corruption attempts
- Oracle manipulation attempts

## Deployment Requirements

- Soroban SDK version 21.7.4 or compatible
- Rust edition 2021
- LTO enabled for optimization
- Symbol stripping for size
- Deterministic builds

## Documentation Files

- `AUDIT_SPEC.md` - This specification (high-level overview)
- `INVARIANTS.md` - Detailed invariants documentation
- `THREAT_MODEL.md` - Threat model and risk analysis
- `AUDIT_CHECKLIST.md` - Audit checklist for reviewers
- `AUDIT_TESTS.rs` - Audit-specific test suite
- `SECURITY.md` - Security considerations

## Contact & Support

For audit-related questions or clarifications, please refer to:

1. Function documentation in source code
2. Test files for usage examples
3. Integration guides for cross-contract interactions

## Revision History

| Date       | Version | Changes                     |
| ---------- | ------- | --------------------------- |
| 2026-05-30 | 1.0     | Initial audit specification |

---

**Document Classification:** Public - Audit Preparation
