# Cross-Contract Interface Testing Documentation

## Overview

This document describes the cross-contract interface testing implementation for the EarnQuest smart contract. The test suite validates the contract's ability to interact with external contracts, ensuring proper interface compatibility and integration scenarios.

## Test Coverage

### 1. Token Contract Interactions (SEP-41 Standard)

Tests the EarnQuest contract's integration with Stellar token contracts:

- **Balance Queries**: Verify token balance lookups
- **Transfer Operations**: Test token transfers between addresses
- **Approve/Allowance**: Validate approval and allowance mechanisms
- **Metadata Queries**: Test name, symbol, and decimals retrieval

### 2. Oracle Contract Interactions

Tests price feed integration:

- **Price Queries**: Fetch price data from oracle contracts
- **Oracle Configuration**: Add, update, and remove oracle configs
- **Price Aggregation**: Combine data from multiple oracles
- **Confidence Scoring**: Validate oracle reliability metrics

### 3. External Contract Calls

Tests external contracts calling EarnQuest functions:

- **Quest Creation**: External contracts registering quests
- **Status Queries**: External contracts checking quest status
- **Proof Submission**: External contracts submitting proofs
- **Error Handling**: Proper error propagation across contracts

### 4. Multi-Contract Workflows

Tests complex scenarios involving multiple contracts:

- **Complete Quest Lifecycle**: End-to-end workflow via external contract
- **Contract Coordination**: Multiple contracts working together
- **Aggregation Patterns**: Combining data from multiple instances
- **Admin Management**: Cross-contract role and permission checks

## Mock Contracts

### MockTokenContract

Implements SEP-41 token standard for testing:

```rust
pub struct MockTokenContract;

// Implements:
- transfer(from, to, amount)
- balance(id) -> i128
- approve(from, spender, amount, expiration)
- allowance(from, spender) -> i128
- decimals() -> u32
- name() -> String
- symbol() -> String
```

**Purpose**: Simulate token contract interactions without deploying real tokens.

### MockOracleContract

Provides price feed data:

```rust
pub struct MockOracleContract;

// Implements:
- lastprice(base, quote) -> Option<PriceData>
- price(base, quote) -> Option<PriceData>
```

**Purpose**: Test oracle integration and price queries.

### MockExternalContract

Simulates external contracts calling EarnQuest:

```rust
pub struct MockExternalContract;

// Implements:
- create_quest_on_earn_quest(...)
- check_quest_status(...)
- submit_proof_for_user(...)
```

**Purpose**: Validate EarnQuest's public interface from external perspective.

### MockAggregatorContract

Combines data from multiple EarnQuest instances:

```rust
pub struct MockAggregatorContract;

// Implements:
- get_total_user_xp(addresses, user) -> i128
- is_admin_anywhere(addresses, user) -> bool
```

**Purpose**: Test multi-instance aggregation patterns.

## Test Categories

### Basic Interface Tests

```rust
#[test]
fn test_token_contract_balance_query()
fn test_token_contract_transfer()
fn test_token_contract_approve_and_allowance()
fn test_token_metadata_queries()
```

Validates basic contract-to-contract communication.

### Oracle Integration Tests

```rust
#[test]
fn test_oracle_price_query()
fn test_earn_quest_with_oracle_integration()
```

Ensures proper oracle contract integration.

### External Contract Tests

```rust
#[test]
fn test_external_contract_creates_quest()
fn test_external_contract_queries_quest_status()
fn test_external_contract_submits_proof()
```

Validates external contracts can properly interact with EarnQuest.

### Aggregation Tests

```rust
#[test]
fn test_aggregator_combines_user_xp()
fn test_aggregator_checks_admin_status()
```

Tests multi-contract data aggregation patterns.

### Error Handling Tests

```rust
#[test]
fn test_external_contract_handles_quest_not_found()
fn test_external_contract_handles_duplicate_quest()
```

Ensures proper error propagation across contract boundaries.

### Workflow Tests

```rust
#[test]
fn test_complete_quest_workflow_via_external_contract()
fn test_multi_contract_coordination()
```

Validates complex multi-step workflows.

### Performance Tests

```rust
#[test]
fn test_cross_contract_call_overhead()
fn test_batch_cross_contract_operations()
```

Measures cross-contract call performance.

## Running the Tests

### Run All Cross-Contract Tests

```bash
cargo test test_cross_contract
```

### Run Specific Test Categories

```bash
# Token interaction tests
cargo test test_token_contract

# Oracle integration tests
cargo test test_oracle

# External contract tests
cargo test test_external_contract

# Aggregation tests
cargo test test_aggregator

# Error handling tests
cargo test handles

# Workflow tests
cargo test workflow
```

### Run with Verbose Output

```bash
cargo test test_cross_contract -- --nocapture
```

### Run with Snapshot Updates

```bash
make snapshots
```

## Test Architecture

### Setup Pattern

Each test follows this pattern:

```rust
#[test]
fn test_name() {
    // 1. Setup environment
    let env = Env::default();
    env.mock_all_auths();

    // 2. Deploy contracts
    let (earn_quest_addr, earn_quest_client) = setup_earn_quest(&env);
    let token_addr = setup_mock_token(&env);

    // 3. Initialize
    let admin = Address::generate(&env);
    earn_quest_client.initialize(&admin);

    // 4. Execute test scenario
    // ...

    // 5. Assert results
    assert!(result.is_ok());
}
```

### Helper Functions

```rust
// Contract setup helpers
fn setup_earn_quest(env: &Env) -> (Address, EarnQuestContractClient)
fn setup_mock_token(env: &Env) -> Address
fn setup_mock_oracle(env: &Env) -> Address
fn setup_external_contract(env: &Env) -> Address
fn setup_aggregator_contract(env: &Env) -> Address
```

## Integration Scenarios

### Scenario 1: Token-Based Quest

```rust
// 1. Deploy token contract
let token = setup_mock_token(&env);

// 2. Create quest with token reward
earn_quest_client.register_quest(
    &quest_id,
    &creator,
    &token,  // Token contract address
    &1000,
    &verifier,
    &deadline,
);

// 3. Token contract handles transfers during claims
```

### Scenario 2: Oracle-Priced Rewards

```rust
// 1. Deploy oracle
let oracle = setup_mock_oracle(&env);

// 2. Configure oracle in EarnQuest
earn_quest_client.add_oracle(&admin, &oracle_config);

// 3. Query prices for reward conversion
let price = earn_quest_client.get_price(
    &base_asset,
    &quote_asset,
    &max_age,
);
```

### Scenario 3: External Quest Manager

```rust
// 1. External contract manages quests
let external = setup_external_contract(&env);

// 2. External contract creates quest
external_client.create_quest_on_earn_quest(...);

// 3. External contract monitors status
let status = external_client.check_quest_status(...);

// 4. External contract submits proofs
external_client.submit_proof_for_user(...);
```

### Scenario 4: Multi-Instance Aggregation

```rust
// 1. Deploy multiple EarnQuest instances
let (addr1, client1) = setup_earn_quest(&env);
let (addr2, client2) = setup_earn_quest(&env);

// 2. User earns XP in both
client1.grant_badge(&admin, &user, &Badge::Rookie);
client2.grant_badge(&admin, &user, &Badge::Explorer);

// 3. Aggregator combines data
let total_xp = aggregator.get_total_user_xp(&addresses, &user);
```

## Interface Compatibility

### EarnQuest Public Interface

The tests validate all public functions are callable from external contracts:

**Admin Functions:**
- `initialize(admin)`
- `add_admin(caller, new_admin)`
- `remove_admin(caller, admin)`
- `grant_role(caller, address, role)`
- `revoke_role(caller, address, role)`

**Quest Functions:**
- `register_quest(...)`
- `register_quest_with_metadata(...)`
- `pause_quest(caller, quest_id)`
- `resume_quest(caller, quest_id)`

**Submission Functions:**
- `submit_proof(quest_id, submitter, proof_hash)`
- `approve_submission(quest_id, submitter, verifier)`
- `claim_reward(quest_id, submitter)`

**Query Functions:**
- `get_quest(quest_id)`
- `get_submission(quest_id, submitter)`
- `get_user_stats(user)`
- `get_platform_stats()`

**Oracle Functions:**
- `add_oracle(caller, config)`
- `remove_oracle(caller, address)`
- `get_price(base, quote, max_age)`

## Error Handling

### Cross-Contract Error Propagation

Tests verify errors are properly propagated:

```rust
// External contract receives error
let result = external_client.check_quest_status(&addr, &quest_id);
assert!(result.is_err());

// Error can be handled
match result {
    Ok(status) => { /* handle success */ },
    Err(e) => { /* handle error */ }
}
```

### Common Error Scenarios

1. **Quest Not Found**: External contract queries non-existent quest
2. **Duplicate Quest**: External contract tries to create duplicate
3. **Unauthorized**: External contract lacks permissions
4. **Invalid Parameters**: External contract provides bad data

## Best Practices

### 1. Mock Contract Design

- Keep mocks simple and focused
- Return predictable test data
- Emit events for verification
- Handle edge cases

### 2. Test Organization

- Group related tests together
- Use descriptive test names
- Document complex scenarios
- Keep tests independent

### 3. Setup Helpers

- Reuse setup functions
- Initialize contracts consistently
- Generate unique addresses
- Mock all authentications

### 4. Assertions

- Test positive and negative cases
- Verify state changes
- Check event emissions
- Validate error conditions

## Troubleshooting

### Test Failures

**Problem**: Mock contract not found
```
Solution: Ensure contract is registered before use
let token_addr = setup_mock_token(&env);
```

**Problem**: Authentication errors
```
Solution: Use env.mock_all_auths() in tests
let env = Env::default();
env.mock_all_auths();
```

**Problem**: Client creation fails
```
Solution: Verify contract address is correct
let client = EarnQuestContractClient::new(&env, &contract_addr);
```

### Common Issues

1. **Snapshot Mismatches**: Run `make snapshots` to update
2. **Type Mismatches**: Ensure mock contracts match expected interfaces
3. **Missing Imports**: Add required use statements
4. **Auth Failures**: Mock all auths in test setup

## Performance Considerations

### Cross-Contract Call Overhead

- Direct calls: Minimal overhead
- Indirect calls: Additional contract invocation cost
- Batch operations: Amortized cost per operation

### Optimization Tips

1. Minimize cross-contract calls in hot paths
2. Batch operations when possible
3. Cache frequently accessed data
4. Use efficient data structures

## Future Enhancements

### Potential Additions

1. **More Mock Contracts**
   - Mock governance contracts
   - Mock staking contracts
   - Mock NFT contracts

2. **Advanced Scenarios**
   - Multi-hop contract calls
   - Circular dependency handling
   - Upgrade compatibility tests

3. **Performance Benchmarks**
   - Gas usage comparisons
   - Call overhead measurements
   - Optimization validation

4. **Integration Tests**
   - Real token contract integration
   - Real oracle contract integration
   - Testnet deployment tests

## Related Documentation

- [Main README](./README.md)
- [Test Documentation](./tests/README.md)
- [Snapshot Management](./SNAPSHOT_MANAGEMENT.md)
- [Soroban SDK Documentation](https://soroban.stellar.org/docs)

## Contributing

When adding new cross-contract tests:

1. Follow existing patterns
2. Add comprehensive documentation
3. Update this guide
4. Run all tests before committing
5. Update snapshots if needed

## Summary

The cross-contract testing suite provides comprehensive validation of:

- ✅ Token contract interactions (SEP-41)
- ✅ Oracle contract integration
- ✅ External contract compatibility
- ✅ Multi-contract workflows
- ✅ Error handling across boundaries
- ✅ Interface completeness
- ✅ Performance characteristics

All tests passing ensures EarnQuest can reliably interact with other contracts in the Stellar ecosystem.
