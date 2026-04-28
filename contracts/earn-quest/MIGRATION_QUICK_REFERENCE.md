# Migration Testing - Quick Reference

## Run Tests

```bash
# All migration tests
cargo test test_migration

# Specific categories
cargo test test_contract_initialization    # Initialization
cargo test test_admin_can_authorize        # Authorization
cargo test test_quest_data_persists        # State persistence
cargo test test_function_signatures        # Compatibility
cargo test test_migration_with_active      # Scenarios
cargo test test_full_migration_workflow    # Complete workflow

# With output
cargo test test_migration -- --nocapture

# Manual checklists (ignored by default)
cargo test testnet_deployment_checklist -- --ignored
cargo test mainnet_migration_checklist -- --ignored
```

## Test Categories

| Category | Tests | Purpose |
|----------|-------|---------|
| Initialization | 3 | Contract setup |
| Authorization | 3 | Upgrade permissions |
| State Persistence | 6 | Data preservation |
| Compatibility | 2 | Backward compatibility |
| Migration Scenarios | 3 | Real-world cases |
| Rollback | 1 | Recovery |
| Security | 2 | Upgrade security |
| Edge Cases | 4 | Boundary conditions |
| **Total** | **24** | **Comprehensive coverage** |

## Quick Test Commands

```bash
# Run all
cargo test test_migration

# Initialization
cargo test test_contract_initialization
cargo test test_cannot_initialize_twice
cargo test test_version_tracking

# Authorization
cargo test test_admin_can_authorize_upgrade
cargo test test_non_admin_cannot_authorize_upgrade
cargo test test_super_admin_role_required

# State Persistence
cargo test test_quest_data_persists
cargo test test_user_stats_persist
cargo test test_admin_roles_persist
cargo test test_submission_data_persists
cargo test test_platform_stats_persist
cargo test test_migration_preserves_escrow

# Compatibility
cargo test test_function_signatures_remain_compatible
cargo test test_storage_schema_compatibility

# Scenarios
cargo test test_migration_with_active_quests
cargo test test_migration_with_pending_submissions

# Security
cargo test test_upgrade_requires_authentication
cargo test test_no_unauthorized_state_changes

# Edge Cases
cargo test test_migration_with_empty_state
cargo test test_migration_with_maximum_data
cargo test test_migration_preserves_paused_state

# Full Workflow
cargo test test_full_migration_workflow
```

## Upgrade Authorization

```rust
// Required conditions:
1. Caller has SuperAdmin role
2. Caller is contract admin
3. Both must be true
```

## State Persistence Checklist

✅ Quest data  
✅ User stats and badges  
✅ Admin roles  
✅ Submissions  
✅ Platform stats  
✅ Escrow balances  

## Deployment Checklist

### Testnet
```bash
1. cargo build --target wasm32-unknown-unknown --release
2. cargo test
3. soroban contract deploy --network testnet
4. Test basic operations
5. Monitor for 24 hours
```

### Mainnet
```bash
1. All testnet tests passing
2. Security audit complete
3. Backup current state
4. Deploy to mainnet
5. Verify critical functions
6. Monitor continuously
```

## Common Patterns

### Test Setup
```rust
let env = Env::default();
env.mock_all_auths();
let (contract_id, client, admin) = setup_initialized_contract(&env);
```

### Simulate Upgrade
```rust
// Create state
client.register_quest(...);

// Simulate upgrade
let client_after = EarnQuestContractClient::new(&env, &contract_id);

// Verify persistence
let quest = client_after.get_quest(&quest_id);
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Init fails | Check not already initialized |
| Auth fails | Verify SuperAdmin role |
| State lost | Check storage key consistency |
| Test timeout | Reduce data volume |

## Test Results

Expected: **24/24 tests passing**

Coverage:
- ✅ Initialization
- ✅ Authorization
- ✅ State persistence
- ✅ Backward compatibility
- ✅ Migration scenarios
- ✅ Security
- ✅ Edge cases

## Documentation

- Full Guide: [MIGRATION_TESTING.md](./MIGRATION_TESTING.md)
- Main README: [README.md](./README.md)
- Test File: [tests/test_migration.rs](./tests/test_migration.rs)

## Key Points

1. **Always test on testnet first**
2. **Backup state before upgrade**
3. **Verify all data persists**
4. **Monitor after deployment**
5. **Have rollback plan ready**
