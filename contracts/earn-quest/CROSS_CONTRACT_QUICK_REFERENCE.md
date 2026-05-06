# Cross-Contract Testing - Quick Reference

## Run Tests

```bash
# All cross-contract tests
cargo test test_cross_contract

# Specific categories
cargo test test_token_contract      # Token interactions
cargo test test_oracle              # Oracle integration
cargo test test_external_contract   # External calls
cargo test test_aggregator          # Multi-instance
cargo test workflow                 # Complete workflows

# With output
cargo test test_cross_contract -- --nocapture
```

## Mock Contracts

| Contract | Purpose | Key Methods |
|----------|---------|-------------|
| MockTokenContract | SEP-41 token | transfer, balance, approve |
| MockOracleContract | Price feeds | lastprice, price |
| MockExternalContract | External caller | create_quest, check_status |
| MockAggregatorContract | Multi-instance | get_total_xp, is_admin |

## Test Categories

### Token Tests (4 tests)
- Balance queries
- Transfers
- Approve/allowance
- Metadata

### Oracle Tests (2 tests)
- Price queries
- Integration with EarnQuest

### External Contract Tests (3 tests)
- Quest creation
- Status queries
- Proof submission

### Aggregation Tests (2 tests)
- XP aggregation
- Admin status checks

### Error Handling Tests (2 tests)
- Quest not found
- Duplicate quest

### Workflow Tests (2 tests)
- Complete quest lifecycle
- Multi-contract coordination

### Performance Tests (2 tests)
- Call overhead
- Batch operations

## Common Patterns

### Setup
```rust
let env = Env::default();
env.mock_all_auths();

let (addr, client) = setup_earn_quest(&env);
let token = setup_mock_token(&env);
let admin = Address::generate(&env);

client.initialize(&admin);
```

### External Contract Call
```rust
let external = setup_external_contract(&env);
let external_client = MockExternalContractClient::new(&env, &external);

external_client.create_quest_on_earn_quest(
    &earn_quest_addr,
    &quest_id,
    &creator,
    &reward_asset,
    &amount,
    &verifier,
    &deadline,
);
```

### Multi-Instance Aggregation
```rust
let (addr1, client1) = setup_earn_quest(&env);
let (addr2, client2) = setup_earn_quest(&env);

let mut addresses = Vec::new(&env);
addresses.push_back(addr1);
addresses.push_back(addr2);

let total = aggregator.get_total_user_xp(&addresses, &user);
```

## Test Results

Total: **17 comprehensive tests**

Coverage:
- ✅ Token contract interactions
- ✅ Oracle integration
- ✅ External contract calls
- ✅ Multi-contract workflows
- ✅ Error handling
- ✅ Interface compatibility
- ✅ Performance validation

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Auth errors | Add `env.mock_all_auths()` |
| Contract not found | Register contract first |
| Type mismatch | Check mock interface matches |
| Snapshot mismatch | Run `make snapshots` |

## Documentation

- Full Guide: [CROSS_CONTRACT_TESTING.md](./CROSS_CONTRACT_TESTING.md)
- Main README: [README.md](./README.md)
- Test File: [tests/test_cross_contract.rs](./tests/test_cross_contract.rs)
