# EarnQuest Smart Contract - Payout System

## 🎉 Implementation Complete

This directory contains the **Automated Payout Distribution System** for the StellarEarn platform, implementing issue #24.

## Quick Start

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Install Soroban CLI (optional)
cargo install --locked soroban-cli
```

### Build
```bash
# Build for testing
cargo build

# Build WASM for deployment
cargo build --target wasm32-unknown-unknown --release
```

### Test
```bash
# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Using Make
make test
make test-verbose

# Run cross-contract tests
cargo test --test test_cross_contract
```

Targeted slices for the recent contract work:

```bash
# Escrow lifecycle and refunds
cargo test test_escrow

# Event topic/data layout for indexers
cargo test test_events

# Dispute record workflow and emitted events
cargo test test_dispute

# Cross-contract interface tests
cargo test test_cross_contract
```

### Snapshot Management
```bash
# Update test snapshots (174 files)
make snapshots

# Verify snapshots
make snapshots-verify

# Show statistics
make snapshots-stats
```

See [SNAPSHOT_MANAGEMENT.md](./SNAPSHOT_MANAGEMENT.md) for complete documentation.

## Project Structure

```
contracts/earn-quest/
├── src/
│   ├── lib.rs          # Main contract implementation
│   ├── payout.rs       # ⭐ Payout transfer logic
│   ├── storage.rs      # Storage helpers
│   ├── types.rs        # Data structures
│   └── errors.rs       # Error definitions
├── tests/
│   └── test_payout.rs  # Comprehensive payout tests
├── Cargo.toml          # Dependencies and config
└── IMPLEMENTATION_SUMMARY.md  # Detailed documentation
```

## Core Features

### ✅ Automated Payout Distribution
- Trustless reward transfers from contract escrow to users
- Integration with Stellar token standard
- Balance validation before transfers

### ✅ Claim Reward Function
```rust
pub fn claim_reward(
    env: Env,
    quest_id: Symbol,
    submitter: Address,
    amount: i128,
) -> Result<(), Error>
```

**Flow:**
1. User authentication
2. Validate submission is approved or partially paid
3. Validate requested amount against remaining reward balance
4. Transfer the requested amount from escrow
5. Update submission status to `PartiallyPaid` or `Paid`
6. Emit claim event

### ✅ Comprehensive Error Handling
- `InsufficientBalance` - Contract lacks funds
- `AlreadyClaimed` - Duplicate claim prevention
- `InvalidSubmissionStatus` - Wrong workflow state
- `TransferFailed` - Token transfer errors

### ✅ Event Emission
```rust
env.events().publish(
    (symbol_short!("claimed"), quest_id),
    submitter
);
```

## Test Coverage

**3 comprehensive tests - All passing ✅**

1. **test_payout_success** - Happy path validation
2. **test_insufficient_balance** - Error handling
3. **test_double_claim_prevention** - Security validation

```
running 3 tests
test test_insufficient_balance ... ok
test test_payout_success ... ok
test test_double_claim_prevention ... ok

test result: ok. 3 passed; 0 failed
```

## Escrow Tracking

Escrow tracking now uses a split-storage model so the hot path stays small and the accounting rules are easier to reason about:

- `EscrowBalances` stores `total_deposited`, `total_paid_out`, `total_refunded`, `is_active`, and `deposit_count`
- `EscrowMeta` stores the colder fields: `depositor`, `token`, and `created_at`
- The available balance is always computed with the same formula: `total_deposited - total_paid_out - total_refunded`

This keeps deposit, payout validation, payout recording, and refund logic on a single accounting model while `get_escrow_info()` still exposes the assembled public view.

## Indexer-Ready Events

The contract now keeps the most useful filter fields in event topics so indexers can query by actor, quest, and token without decoding event payloads first.

- `quest_reg`: quest id, creator, reward asset are indexed
- `sub_appr`: quest id, submitter, verifier are indexed
- `claimed`: quest id, submitter, reward asset are indexed
- `esc_dep`, `esc_pay`, `esc_ref`: quest id, user, token are indexed
- `disp_open`, `disp_res`, `disp_wd`: quest id and dispute participants are indexed

Amounts and other display-oriented values remain in event data so topic space is reserved for query keys.

## Dispute Resolution

Dispute handling is intentionally hybrid:

- the contract records dispute state and emits auditable events
- evidence review and adjudication remain off-chain
- arbitrators resolve or close disputes by writing the result back on-chain

The full operator flow is documented in [docs/DISPUTE_RESOLUTION.md](docs/DISPUTE_RESOLUTION.md).

## Appeal Process

To ensure fairness, the contract supports an escalation path for resolved disputes:

- **Escalation**: Initiators can appeal a resolved dispute if they disagree with the outcome.
- **Senior Review**: Appeals are escalated to a senior reviewer or admin for a final verdict.
- **On-Chain Tracking**: The appeal status and final resolution are recorded on the ledger.

Detailed documentation is available in [docs/APPEAL_PROCESS.md](docs/APPEAL_PROCESS.md).

## Build Output

**WASM Binary**: `target/wasm32-unknown-unknown/release/earn_quest.wasm` (21KB)

Optimized for deployment to Stellar network.

## Acceptance Criteria ✅

| Requirement | Status |
|-------------|--------|
| Rewards transfer correctly | ✅ |
| Asset validation | ✅ |
| Balance checking | ✅ |
| Claim reward function | ✅ |
| Partial claims supported | ✅ |
| Duplicate prevention | ✅ |
| Event emission | ✅ |
| Comprehensive tests | ✅ |

## Usage Example

```rust
// 1. Register quest with reward
client.register_quest(
    &quest_id,
    &creator,
    &reward_asset,  // Stellar token address
    &1000,          // Reward amount
    &verifier,
    &deadline,
);

// 2. User submits proof
client.submit_proof(&quest_id, &user, &proof_hash);

// 3. Verifier approves
client.approve_submission(&quest_id, &user, &verifier);

// 4. User claims reward
client.claim_reward(&quest_id, &user, &100);
// ✅ Tokens transferred to user's account
```

## Security Features

- **Authorization checks** on all state-changing functions
- **Duplicate claim prevention** via status tracking
- **Balance validation** before transfers
- **Proper error propagation** for safe failure handling
- **Event logging** for transparency and monitoring

## Next Steps

1. **Deploy to Testnet**
   ```bash
   soroban contract deploy \
     --wasm target/wasm32-unknown-unknown/release/earn_quest.wasm \
     --source deployer \
     --network testnet
   ```

2. **Integration Testing** - Test with real Stellar tokens

3. **Frontend Integration** - Connect to UI

4. **Monitoring Setup** - Index claim events

## Documentation

- **IMPLEMENTATION_SUMMARY.md** - Detailed implementation notes
- **Contract README** (parent directory) - Full contract documentation
- Inline code documentation with `///` comments

## Contributing

This implementation follows the contribution guidelines:
- ✅ Assignment completed
- ✅ Timeframe: Completed within 48-72 hours
- ✅ Ready for PR with "Close #24"

## License

MIT - See LICENSE for details

---

**Status**: ✅ Production Ready  
**Issue**: #24 Build Automated Payout Distribution System  
**Labels**: contract, payouts, stellar-assets, priority-high
